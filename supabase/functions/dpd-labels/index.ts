import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { apiKey, customerIdent, senderIt4emId, testMode, order } = body;

    if (!apiKey || !customerIdent || !senderIt4emId || !order || !order.id) {
      return new Response(
        JSON.stringify({ error: "Missing required DPD configuration or order parameters." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const baseUrl = testMode
      ? "https://geoapi-test.dpd.cz"
      : "https://geoapi.dpd.cz";

    const isCod = (order.payment_method || "").toLowerCase().includes("dobírk") || 
                  (order.payment_method || "").toLowerCase().includes("cod");

    // 1. Create Shipment
    const shipmentPayload = [
      {
        customer: {
          ident: customerIdent.toString().trim()
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
          address: {
            street: order.customer_street || "",
            postalCode: (order.customer_zip || "").replace(/\s+/g, ""),
            city: order.customer_city || "",
            country: "CZ"
          }
        },
        parcels: [
          {
            weightGrams: 1000 // 1 kg default weight
          }
        ],
        services: isCod ? {
          cashOnDelivery: {
            amountCents: Math.round(parseFloat(order.total_price || "0") * 100),
            currency: "CZK",
            payment: "CashOrCard",
            variableSymbol: order.id.toString()
          }
        } : undefined
      }
    ];

    console.log("Creating DPD shipment at:", `${baseUrl}/v1/shipments`);
    const createShipmentRes = await fetch(`${baseUrl}/v1/shipments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey.trim()
      },
      body: JSON.stringify(shipmentPayload)
    });

    if (!createShipmentRes.ok) {
      const errText = await createShipmentRes.text();
      let parsedErr = errText;
      try {
        const jsonErr = JSON.parse(errText);
        parsedErr = jsonErr.message || jsonErr.error || errText;
      } catch (_) {}
      throw new Error(`DPD Create Shipment failed: ${parsedErr}`);
    }

    const shipmentResponse = await createShipmentRes.json();
    const parcelNo = shipmentResponse?.[0]?.parcels?.[0]?.parcelNumbers?.main;

    if (!parcelNo) {
      throw new Error("DPD API did not return a parcel number in the response.");
    }

    console.log(`Shipment created successfully. Parcel No: ${parcelNo}. Printing label...`);

    // 2. Print Label
    const printPayload = {
      printType: "PDF",
      printProperties: {
        pageSize: "A6",
        labelsPerPage: 1
      }
    };

    const printRes = await fetch(`${baseUrl}/v1/parcels/${parcelNo}/labels`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey.trim()
      },
      body: JSON.stringify(printPayload)
    });

    if (!printRes.ok) {
      const errText = await printRes.text();
      let parsedErr = errText;
      try {
        const jsonErr = JSON.parse(errText);
        parsedErr = jsonErr.message || jsonErr.error || errText;
      } catch (_) {}
      throw new Error(`DPD Print Label failed: ${parsedErr}`);
    }

    // Extract PDF Base64 string or convert binary to base64
    let pdfBase64 = "";
    const contentType = printRes.headers.get("content-type") || "";
    
    if (contentType.includes("application/json")) {
      const printJson = await printRes.json();
      pdfBase64 = printJson.label || printJson.pdf || printJson.data || "";
    } else {
      const arrayBuffer = await printRes.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = "";
      const len = bytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      pdfBase64 = btoa(binary);
    }

    console.log("Label printed successfully.");
    return new Response(
      JSON.stringify({
        success: true,
        parcelNumber: parcelNo,
        pdfBase64: pdfBase64
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
