// Supabase Edge Function for GLS Shipping Label Generation
// Deploy via Supabase CLI: supabase functions deploy gls-labels

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight request
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
    const { username, password, clientNumber, testMode, typeOfPrinter, order } = body;

    if (!username || !password || !clientNumber || !order || !order.id) {
      return new Response(JSON.stringify({ error: "Missing required parameters for GLS label generation." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Hash password using SHA-512
    const encoder = new TextEncoder();
    const passwordData = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest("SHA-512", passwordData);
    const hashBytes = new Uint8Array(hashBuffer);
    
    // Convert SHA-512 hash bytes to Base64 string for WCF serialization
    const base64Password = btoa(String.fromCharCode(...hashBytes));

    // Parse payment method to check for Cash on Delivery (dobírka)
    const isCod = (order.payment_method || "").toLowerCase().includes("dobírk") || 
                  (order.payment_method || "").toLowerCase().includes("cod");

    const serviceList = [];
    if (isCod) {
      serviceList.push({ Code: "COD" });
    }
    if (order.customer_email) {
      serviceList.push({
        Code: "FDS",
        FDSParameter: { Value: order.customer_email }
      });
    }
    if (order.customer_phone) {
      serviceList.push({
        Code: "FSS",
        FSSParameter: { Value: order.customer_phone }
      });
    }

    const clientNumInt = parseInt(clientNumber, 10);
    const street = order.customer_street || "";

    const glsRequestBody = {
      Username: username,
      Password: base64Password,
      ClientNumberList: [clientNumInt],
      ParcelList: [
        {
          ClientNumber: clientNumInt,
          ClientReference: order.id,
          CODAmount: isCod ? parseFloat(order.total_price || "0") : 0,
          CODReference: isCod ? order.id : "",
          CODCurrency: "CZK",
          DeliveryAddress: {
            Name: order.customer_name,
            Street: street,
            City: order.customer_city,
            ZipCode: (order.customer_zip || "").replace(/\s+/g, ""),
            CountryIsoCode: "CZ",
            ContactName: order.customer_name,
            ContactPhone: order.customer_phone,
            ContactEmail: order.customer_email
          },
          ServiceList: serviceList
        }
      ],
      PrintPosition: 1,
      TypeOfPrinter: typeOfPrinter || "Thermo"
    };

    const domain = testMode ? "api.test.mygls.cz" : "api.mygls.cz";
    const glsApiUrl = `https://${domain}/ParcelService.svc/json/PrintLabels`;

    const glsResponse = await fetch(glsApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(glsRequestBody)
    });

    if (!glsResponse.ok) {
      const errText = await glsResponse.text();
      throw new Error(`GLS API returned HTTP ${glsResponse.status}: ${errText}`);
    }

    const resJson = await glsResponse.json();

    // Check for REST errors
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

    return new Response(JSON.stringify({
      success: true,
      pdfBase64: resJson.Labels,
      parcelNumber: resJson.PrintLabelsInfoList?.[0]?.ParcelNumber,
      parcelId: resJson.PrintLabelsInfoList?.[0]?.ParcelId
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
