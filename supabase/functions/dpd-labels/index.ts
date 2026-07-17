import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed. Use POST." }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { order } = body;

    if (!order || !order.id) {
      return new Response(
        JSON.stringify({ error: "Missing required order parameters." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Retrieve credentials securely from environment variables (no body fallbacks to prevent injection)
    const apiKey = Deno.env.get("DPD_API_KEY") || "";
    const customerIdent = Deno.env.get("DPD_CUSTOMER_IDENT") || "";
    const senderIt4emId = Deno.env.get("DPD_SENDER_ADDRESS_ID") || "";
    const testMode = Deno.env.get("DPD_TEST_MODE") === "true";

    if (!apiKey || !customerIdent || !senderIt4emId) {
      return new Response(
        JSON.stringify({ error: "DPD credentials are not configured in Supabase Secrets." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const baseUrl = testMode
      ? "https://geoapi-test.dpd.cz"
      : "https://geoapi.dpd.cz";

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Enforce JWT Auth and check role: admin or superadmin
    let isAuthorized = false;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
      if (!authError && user) {
        const { data: profile } = await supabaseClient
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();
          
        if (profile && (profile.role === "admin" || profile.role === "superadmin")) {
          isAuthorized = true;
        }
      }
    }

    if (!isAuthorized) {
      return new Response(JSON.stringify({ error: "Unauthorized: Insufficient permissions." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const defaultWeightEnv = Deno.env.get("DPD_DEFAULT_WEIGHT");
    const defaultWeight = defaultWeightEnv ? parseInt(defaultWeightEnv, 10) : 1000;

    // 1. Load order JSON from Storage to check if it already has a parcel number
    let orderJsonObj: any = null;
    let parcelNo = "";
    try {
      const { data: fileData, error: downloadError } = await supabaseClient.storage
        .from("pohoda-orders")
        .download(`order_${order.id}.json`);
      if (fileData) {
        const text = await fileData.text();
        orderJsonObj = JSON.parse(text);
        parcelNo = orderJsonObj?.order?.dpd_parcel_number || "";
      }
    } catch (err) {
      console.warn("Could not load existing order JSON from storage:", err.message);
    }

    if (body.clearParcelNumber) {
      console.log(`Clearing parcel number for order ${order.id} as requested.`);
      if (orderJsonObj?.order) {
        delete orderJsonObj.order.dpd_parcel_number;
        const encoder = new TextEncoder();
        const updatedBytes = encoder.encode(JSON.stringify(orderJsonObj, null, 2));
        await supabaseClient.storage
          .from("pohoda-orders")
          .upload(`order_${order.id}.json`, updatedBytes, {
            contentType: "application/json",
            upsert: true
          });
      }
      return new Response(JSON.stringify({ success: true, message: "Parcel number cleared successfully." }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const isCod = (order.payment_method || "").toLowerCase().includes("dobírk") || 
                  (order.payment_method || "").toLowerCase().includes("cod");

    let debugPayload: any = null;

    if (parcelNo) {
      console.log(`Order ${order.id} already has shipment: ${parcelNo}. Re-fetching existing label.`);
    } else {
      // 2. Map DPD Pickup Point details correctly if applicable
      const pickupDetails = order.pickup_point_details || orderJsonObj?.order?.pickup_point_details || null;
      const isPickup = (order.shipping_method || "").toLowerCase().includes("pickup") || 
                       (order.shipping_method || "").toLowerCase().includes("výdej") ||
                       !!pickupDetails;

      const receiverAddress = (isPickup && pickupDetails) ? {
        street: pickupDetails.street || "",
        postalCode: (pickupDetails.zip || "").replace(/\s+/g, ""),
        city: pickupDetails.city || "",
        country: {
          isoAlpha2: (pickupDetails.country || "CZ").toUpperCase()
        }
      } : {
        street: order.customer_street || "",
        postalCode: (order.customer_zip || "").replace(/\s+/g, ""),
        city: order.customer_city || "",
        country: {
          isoAlpha2: "CZ"
        }
      };

      const receiverParcelShopId = (isPickup && pickupDetails) ? (pickupDetails.id || "") : undefined;

      // 3. Create Shipment
      const shipmentPayload = [
        {
          customer: {
            dsw: customerIdent.toString().trim()
          },
          shipmentType: "Standard",
          sender: {
            it4emId: parseInt(senderIt4emId, 10)
          },
          receiver: {
            info: {
              name1: order.customer_name || "",
              contact: {
                phone: order.customer_phone || "",
                email: order.customer_email || ""
              }
            },
            address: receiverAddress
          },
          references: {
            ref1: order.id.toString(),
            reference1: order.id.toString()
          },
          shipmentReferences: [
            order.id.toString()
          ],
          parcels: [
            {
              weightGrams: defaultWeight, // Configurable default weight (TODO: in the future, sum product weights dynamically from DB records)
              references: {
                ref1: order.id.toString(),
                reference1: order.id.toString()
              },
              mpsReferences: [
                order.id.toString()
              ]
            }
          ],
          services: {
            notification: true,
            ...(isPickup && receiverParcelShopId ? {
              pickupPoint: receiverParcelShopId
            } : {}),
            ...(isCod ? {
              cashOnDelivery: {
                amountCents: Math.round(parseFloat(order.total_price || "0") * 100),
                currency: "CZK",
                payment: "CashOrCard",
                variableSymbol: order.id.toString()
              }
            } : {})
          }
        }
      ];
      debugPayload = shipmentPayload;

      let createShipmentRes;
      let responseText = "";
      let shipmentSuccess = false;

      try {
        console.log("Creating DPD shipment at:", `${baseUrl}/v1/shipments`);
        // console.log("Shipment Request Payload:", JSON.stringify(shipmentPayload, null, 2));

        createShipmentRes = await fetch(`${baseUrl}/v1/shipments`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey.trim()
          },
          body: JSON.stringify(shipmentPayload)
        });

        responseText = await createShipmentRes.text();
        console.log("DPD Create Shipment Response Status:", createShipmentRes.status);
        // console.log("DPD Create Shipment Response Body:", responseText);

        if (createShipmentRes.ok) {
          const shipmentResponse = JSON.parse(responseText);
          parcelNo = shipmentResponse?.[0]?.parcels?.[0]?.parcelNumbers?.main;
          if (parcelNo) {
            shipmentSuccess = true;
          }
        }
      } catch (fetchErr) {
        console.warn("DPD API connection or parsing failed:", fetchErr.message);
      }

      if (!shipmentSuccess) {
        if (testMode && !body.bypassMock) {
          console.log("DPD testMode active: Falling back to mock shipment data.");
          parcelNo = `MOCK-${order.id.toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`;
          shipmentSuccess = true;
        } else {
          const errText = responseText || "Connection failed";
          let parsedErr = errText;
          try {
            const jsonErr = JSON.parse(errText);
            if (jsonErr.errors && Array.isArray(jsonErr.errors)) {
              parsedErr = jsonErr.errors.map((e: any) => `${e.field || ''}: ${e.error || e.message || ''}`).join(' | ');
            } else if (jsonErr.message) {
              parsedErr = jsonErr.message;
              if (jsonErr.details) {
                parsedErr += ` (${typeof jsonErr.details === 'object' ? JSON.stringify(jsonErr.details) : jsonErr.details})`;
              }
            } else {
              parsedErr = JSON.stringify(jsonErr);
            }
          } catch (_) {}
          throw new Error(`DPD Create Shipment failed: ${parsedErr}`);
        }
      }

      // Save parcel number to local storage JSON representation
      if (orderJsonObj) {
        orderJsonObj.order.dpd_parcel_number = parcelNo;
        const encoder = new TextEncoder();
        const updatedBytes = encoder.encode(JSON.stringify(orderJsonObj, null, 2));
        const { error: uploadError } = await supabaseClient.storage
          .from("pohoda-orders")
          .upload(`order_${order.id}.json`, updatedBytes, {
            contentType: "application/json",
            upsert: true
          });
        if (uploadError) {
          console.error("Failed to update order JSON with parcel number:", uploadError);
        } else {
          console.log(`Saved parcel number ${parcelNo} to order_${order.id}.json`);
        }
      }
    }

    // 4. Print/Download Label
    const printPayload = {
      printType: "PDF",
      printProperties: {
        pageSize: "A6",
        labelsPerPage: 1
      }
    };

    let pdfBase64 = "";
    let labelSuccess = false;

    if (!parcelNo.startsWith("MOCK-")) {
      try {
        console.log(`Fetching DPD PDF label for parcel: ${parcelNo}`);
        // console.log("DPD Print Label Request Payload:", JSON.stringify(printPayload, null, 2));

        const printRes = await fetch(`${baseUrl}/v1/parcels/${parcelNo}/labels`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey.trim()
          },
          body: JSON.stringify(printPayload)
        });

        const contentType = printRes.headers.get("content-type") || "";
        console.log("DPD Print Label Response Status:", printRes.status);
        console.log("DPD Print Label Response Content-Type:", contentType);

        if (contentType.includes("application/json")) {
          const printJsonText = await printRes.text();
          console.log("DPD Print Label Response (JSON):", printJsonText.substring(0, 500) + "...");
          
          if (printRes.ok) {
            const printJson = JSON.parse(printJsonText);
            pdfBase64 = printJson.label || printJson.pdf || printJson.data || "";
            if (pdfBase64) labelSuccess = true;
          } else {
            console.warn("DPD API rejected label printing, status:", printRes.status);
          }
        } else {
          if (printRes.ok) {
            const arrayBuffer = await printRes.arrayBuffer();
            console.log("DPD Print Label Response (Binary PDF), size:", arrayBuffer.byteLength);
            const bytes = new Uint8Array(arrayBuffer);
            let binary = "";
            const len = bytes.byteLength;
            for (let i = 0; i < len; i++) {
              binary += String.fromCharCode(bytes[i]);
            }
            pdfBase64 = btoa(binary);
            if (pdfBase64) labelSuccess = true;
          }
        }
      } catch (printErr) {
        console.warn("DPD API print connection failed:", printErr.message);
      }
    }

    if (!labelSuccess) {
      if (testMode && !body.bypassMock) {
        console.log("DPD testMode active: Falling back to mock base64 PDF label.");
        pdfBase64 = "JVBERi0xLjQKMSAwIG9iagogIDw8IC9UeXBlIC9DYXRhbG9nCiAgICAgL1BhZ2VzIDIgMCBSCiAgPj4KZW5kb2JqCjIgMCBvYmoKICA8PCAvVHlwZSAvUGFnZXMKICAgICAvS2lkcyBbIDMgMCBSIF0KICAgICAvQ291bnQgMQogID4+CmVuZG9iagozIDAgb2JqCiAgPDwgL1R5cGUgL1BhZ2UKICAgICAvUGFyZW50IDIgMCBSCiAgICAgL01lZGlhQm94IFsgMCAwIDU5NSA4NDIgXQogICAgIC9SZXNvdXJjZXMgPDw+PgogICAgIC9Db250ZW50cyA0IDAgUgogID4+CmVuZG9iago0IDAgb2JqCiAgPDwgL0xlbmd0aCAwID4+CnN0cmVhbQplbmRzdHJlYW0KZW5kb2JqCnRyYWlsZXIKICA8PCAvU2l6ZSA1CiAgICAgL1Jvb3QgMSAwIFIKICA+PgpqWFJlZgolaU9GCg==";
      } else {
        throw new Error(`DPD Print Label failed: unable to fetch from server for parcel ${parcelNo}`);
      }
    }

    console.log("Label printed successfully.");
    return new Response(
      JSON.stringify({
        success: true,
        parcelNumber: parcelNo,
        pdfBase64: pdfBase64,
        debugPayload: debugPayload || "cached/idempotent"
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("DPD API Error:", error.message);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
