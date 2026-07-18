import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Helper function to normalize strings to plain ASCII (strip Czech diacritics)
function cleanAscii(str: string): string {
  return (str || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

// Helper function to split street address into Street and HouseNumber
function splitStreet(fullStreet: string) {
  const trimmed = (fullStreet || "").trim();
  const match = trimmed.match(/^(.+?)\s+(\d+[a-zA-Z0-9\/\-]*)$/);
  if (match) {
    return {
      streetName: match[1].trim(),
      houseNumber: match[2].trim()
    };
  }
  return {
    streetName: trimmed,
    houseNumber: ""
  };
}

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

    // 1. Authorize user (admin/superadmin check)
    let isAuthorized = false;
    let authDetail = "No token provided.";
    const authHeader = req.headers.get("Authorization");
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
      if (authError) {
        authDetail = `Auth Client error: ${authError.message}`;
      } else if (!user) {
        authDetail = "Valid session not found.";
      } else {
        if (user.email === "info@northvaletcg.eu") {
          isAuthorized = true;
        } else {
          const { data: profile, error: profileError } = await supabaseClient
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .maybeSingle();
            
          if (profileError) {
            authDetail = `Profile DB error: ${profileError.message}`;
          } else if (!profile) {
            authDetail = `Profile row missing for user ID ${user.id}`;
          } else if (profile.role !== "admin" && profile.role !== "superadmin") {
            authDetail = `Insufficient role: ${profile.role} (admin or superadmin required)`;
          } else {
            isAuthorized = true;
          }
        }
      }
    }

    if (!isAuthorized) {
      console.log(`[gls-labels] Auth failed: ${authDetail}`);
      return new Response(JSON.stringify({ error: `Unauthorized: ${authDetail}` }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action = "print", order, parcelIdList } = body;



    // Retrieve credentials securely from environment variables
    const username = Deno.env.get("GLS_USERNAME") || "";
    const password = Deno.env.get("GLS_PASSWORD") || "";
    const clientNumber = Deno.env.get("GLS_CLIENT_NUMBER") || "";
    const testMode = Deno.env.get("GLS_TEST_MODE") === "true";
    const defaultWeight = parseFloat(Deno.env.get("GLS_DEFAULT_WEIGHT") || "1.0");
    const typeOfPrinter = Deno.env.get("GLS_PRINTER_TYPE") || "Thermo";

    if (!username || !password || !clientNumber) {
      return new Response(JSON.stringify({ error: "GLS credentials are not configured in Supabase Secrets." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Hash password using SHA-512 into a JSON byte array
    const encoder = new TextEncoder();
    const passwordData = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest("SHA-512", passwordData);
    const hashBytes = new Uint8Array(hashBuffer);
    const passwordBytes = Array.from(hashBytes);

    const domain = testMode ? "api.test.mygls.cz" : "api.mygls.cz";

    // --- ACTION: LIST ---
    if (action === "list") {
      const today = new Date().toISOString().split('T')[0];
      const dateFrom = `/Date(${new Date(today + "T00:00:00Z").getTime()})/`;
      const dateTo = `/Date(${new Date(today + "T23:59:59Z").getTime()})/`;
      const clientNumInt = parseInt(clientNumber, 10);
      const glsApiUrl = `https://${domain}/ParcelService.svc/json/GetParcelList`;
      const glsRequestBody = {
        Username: username,
        Password: passwordBytes,
        ClientNumberList: [clientNumInt],
        PrintDateFrom: dateFrom,
        PrintDateTo: dateTo
      };
      const response = await fetch(glsApiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(glsRequestBody)
      });
      if (response.ok) {
        const resJson = await response.json();
        return new Response(JSON.stringify({ success: true, parcels: resJson.PrintDataInfoList || [] }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ success: false, error: "Failed to fetch parcel list" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- ACTION: DELETE ---
    if (action === "delete") {
      const idsToDelete = parcelIdList || (order?.id ? [] : null);
      let orderId = order?.id || "";

      // If parcelIdList is empty but we have an order, attempt to retrieve the stored parcel ID
      let orderJsonObj: any = null;
      if (orderId && (!idsToDelete || idsToDelete.length === 0)) {
        try {
          const { data: fileData } = await supabaseClient.storage
            .from("pohoda-orders")
            .download(`order_${orderId}.json`);
          if (fileData) {
            const text = await fileData.text();
            orderJsonObj = JSON.parse(text);
            const savedParcelId = orderJsonObj?.order?.gls_parcel_id;
            if (savedParcelId) {
              idsToDelete.push(parseInt(savedParcelId, 10));
            }
          }
        } catch (err) {
          console.warn("Could not find parcel ID in order JSON:", err.message);
        }
      }

      if (!idsToDelete || idsToDelete.length === 0) {
        return new Response(JSON.stringify({ error: "No parcel ID provided for deletion." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const clientNumInt = parseInt(clientNumber, 10);
      const glsApiUrl = `https://${domain}/ParcelService.svc/json/DeleteLabels`;
      const glsRequestBody = {
        Username: username,
        Password: passwordBytes,
        ClientNumberList: [clientNumInt],
        ParcelIdList: idsToDelete
      };

      const glsResponse = await fetch(glsApiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(glsRequestBody)
      });

      if (!glsResponse.ok) {
        const errText = await glsResponse.text();
        throw new Error(`GLS API returned HTTP ${glsResponse.status}: ${errText}`);
      }

      const resJson = await glsResponse.json();
      if (resJson.DeleteLabelsErrorList && resJson.DeleteLabelsErrorList.length > 0) {
        const firstErr = resJson.DeleteLabelsErrorList[0];
        return new Response(JSON.stringify({
          success: false,
          error: firstErr.ErrorDescription,
          errorCode: firstErr.ErrorCode
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Cleanup stored parcel numbers from JSON representation
      if (orderId) {
        try {
          const { data: fileData } = await supabaseClient.storage
            .from("pohoda-orders")
            .download(`order_${orderId}.json`);
          if (fileData) {
            const text = await fileData.text();
            orderJsonObj = JSON.parse(text);
          }
        } catch (_) {}

        if (orderJsonObj) {
          delete orderJsonObj.order.gls_parcel_number;
          delete orderJsonObj.order.gls_parcel_id;
          const updatedBytes = encoder.encode(JSON.stringify(orderJsonObj, null, 2));
          await supabaseClient.storage
            .from("pohoda-orders")
            .upload(`order_${orderId}.json`, updatedBytes, {
              contentType: "application/json",
              upsert: true
            });
        }
      }

      return new Response(JSON.stringify({ success: true, successfullyDeletedList: resJson.SuccessfullyDeletedList }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- ACTION: PRINT / GENERATE ---
    if (!order || !order.id) {
      return new Response(JSON.stringify({ error: "Missing required order parameters." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const clientNumInt = parseInt(clientNumber, 10);

    // 1. Try to load existing order from Storage
    let orderJsonObj: any = null;
    let savedParcelNo = "";
    let savedParcelId = "";
    try {
      const { data: fileData, error: downloadError } = await supabaseClient.storage
        .from("pohoda-orders")
        .download(`order_${order.id}.json`);
      if (downloadError) {
        console.warn(`[gls-labels] Storage download failed for order_${order.id}.json:`, downloadError.message);
      }
      if (fileData) {
        const text = await fileData.text();
        orderJsonObj = JSON.parse(text);
        savedParcelNo = orderJsonObj?.order?.gls_parcel_number || "";
        savedParcelId = orderJsonObj?.order?.gls_parcel_id || "";
      }
    } catch (err) {
      console.warn(`[gls-labels] Error parsing JSON for order_${order.id}.json:`, err.message);
    }

    // 2. Idempotence Check: if label is already generated, retrieve the PDF using GetPrintedLabels
    if (savedParcelNo && savedParcelId) {
      const glsApiUrl = `https://${domain}/ParcelService.svc/json/GetPrintedLabels`;
      const glsRequestBody = {
        Username: username,
        Password: passwordBytes,
        ParcelIdList: [parseInt(savedParcelId, 10)],
        PrintPosition: 1,
        TypeOfPrinter: typeOfPrinter
      };

      const glsResponse = await fetch(glsApiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(glsRequestBody)
      });

      if (glsResponse.ok) {
        const resJson = await glsResponse.json();
        if (resJson.Labels) {
          return new Response(JSON.stringify({
            success: true,
            pdfBase64: resJson.Labels,
            parcelNumber: savedParcelNo,
            parcelId: savedParcelId,
            reprinted: true
          }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    // 3. Split customer address into street name and house number
    const { streetName, houseNumber } = splitStreet(order.customer_street);

    // 4. Determine COD flag
    const isCod = (order.payment_method || "").toLowerCase().includes("dobírk") || 
                  (order.payment_method || "").toLowerCase().includes("cod");

    // 5. Determine Pickup point flag (ParcelShop)
    const pickupDetails = order.pickup_point_details || order.pickupPointDetails || orderJsonObj?.order?.pickup_point_details || null;
    const isPickup = (order.shipping_method || "").toLowerCase().includes("pickup") || 
                     (order.shipping_method || "").toLowerCase().includes("výdej") ||
                     !!pickupDetails;
    const parcelShopId = pickupDetails?.id || "";

    const serviceList: any[] = [];
    
    // Add FlexDeliveryService (FDS) for notifications (only for home delivery)
    if (!isPickup && order.customer_email) {
      serviceList.push({
        Code: "FDS",
        FDSParameter: { Value: order.customer_email }
      });
    }

    // Add PSD service if delivering to a ParcelShop / výdejní místo
    if (isPickup && parcelShopId) {
      serviceList.push({
        Code: "PSD",
        PSDParameter: { StringValue: parcelShopId }
      });
    }

    const parcel: any = {
      ClientNumber: clientNumInt,
      ClientReference: `${order.id}-${Date.now().toString().slice(-4)}`,
      Count: 1,
      Content: "Sběratelské karty",
      Weight: defaultWeight,
      PickupAddress: {
        Name: Deno.env.get("GLS_SENDER_NAME") || "NORTHVALE s.r.o.",
        Street: Deno.env.get("GLS_SENDER_STREET") || "Bratří Čapků",
        HouseNumber: Deno.env.get("GLS_SENDER_HOUSE_NO") || "1095",
        City: Deno.env.get("GLS_SENDER_CITY") || "Holice",
        ZipCode: (Deno.env.get("GLS_SENDER_ZIP") || "53401").replace(/\s+/g, ""),
        CountryIsoCode: "CZ",
        ContactName: Deno.env.get("GLS_SENDER_CONTACT") || "Ondřej Zeman",
        ContactPhone: Deno.env.get("GLS_SENDER_PHONE") || "+420739666779",
        ContactEmail: Deno.env.get("GLS_SENDER_EMAIL") || "info@northvaletcg.eu"
      },
      DeliveryAddress: {
        Name: order.customer_name,
        Street: streetName,
        HouseNumber: houseNumber,
        City: order.customer_city,
        ZipCode: (order.customer_zip || "").replace(/\s+/g, ""),
        CountryIsoCode: "CZ",
        ContactName: order.customer_name,
        ContactPhone: order.customer_phone,
        ContactEmail: order.customer_email
      },
      ServiceList: serviceList
    };

    if (isCod) {
      parcel.CODAmount = Math.round(parseFloat(order.total_price || "0"));
      parcel.CODReference = order.id.toString();
      parcel.CODCurrency = "CZK";
      serviceList.push({ Code: "COD" });
    }

    const glsRequestBody = {
      Username: username,
      Password: passwordBytes,
      ClientNumberList: [clientNumInt],
      ParcelList: [parcel],
      PrintPosition: 1,
      TypeOfPrinter: typeOfPrinter,
      WebshopEngine: "Custom"
    };

    if (action === "debug_print") {
      return new Response(JSON.stringify({ success: true, payload: glsRequestBody }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const glsApiUrl = `https://${domain}/ParcelService.svc/json/PrintLabels`;
    const glsResponse = await fetch(glsApiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(glsRequestBody)
    });

    if (!glsResponse.ok) {
      const errText = await glsResponse.text();
      throw new Error(`GLS API returned HTTP ${glsResponse.status}: ${errText}`);
    }

    const resJson = await glsResponse.json();

    // Check for inner error list
    if (resJson.PrintLabelsErrorList && resJson.PrintLabelsErrorList.length > 0) {
      const firstErr = resJson.PrintLabelsErrorList[0];
      return new Response(JSON.stringify({ 
        success: false, 
        error: firstErr.ErrorDescription,
        errorCode: firstErr.ErrorCode 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const newParcelNumber = resJson.PrintLabelsInfoList?.[0]?.ParcelNumber;
    const newParcelId = resJson.PrintLabelsInfoList?.[0]?.ParcelId;

    if (!newParcelNumber || !newParcelId) {
      return new Response(JSON.stringify({ success: false, error: "MyGLS did not return shipment details." }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Save parcel number to local storage JSON representation
    if (orderJsonObj) {
      console.log(`[gls-labels] Saving parcel metadata to order_${order.id}.json: parcelNumber=${newParcelNumber}, parcelId=${newParcelId}`);
      orderJsonObj.order.gls_parcel_number = newParcelNumber.toString();
      orderJsonObj.order.gls_parcel_id = newParcelId.toString();
      const updatedBytes = encoder.encode(JSON.stringify(orderJsonObj, null, 2));
      const { error: uploadError } = await supabaseClient.storage
        .from("pohoda-orders")
        .upload(`order_${order.id}.json`, updatedBytes, {
          contentType: "application/json",
          upsert: true
        });
      if (uploadError) {
        console.warn(`[gls-labels] Storage upload failed for order_${order.id}.json:`, uploadError.message);
      } else {
        console.log(`[gls-labels] Successfully saved parcel metadata to storage.`);
      }
    } else {
      console.warn(`[gls-labels] orderJsonObj is null! Skipping metadata save for order ${order.id}`);
    }

    return new Response(JSON.stringify({
      success: true,
      pdfBase64: resJson.Labels,
      parcelNumber: newParcelNumber,
      parcelId: newParcelId
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
