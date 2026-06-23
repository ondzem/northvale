// Supabase Edge Function for Stormware Pohoda XML Integration
// Serves Deno runtime natively.
// Deploy via Supabase CLI: supabase functions deploy pohoda-connector

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function escapeXml(unsafe: string): string {
  if (!unsafe) return "";
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.pathname.split("/").pop(); // "import-stock" or "export-order"

    // Optional API Key security verification if POHODA_API_KEY environment variable is defined
    const apiKeyParam = url.searchParams.get("api_key");
    const expectedApiKey = Deno.env.get("POHODA_API_KEY");
    if (expectedApiKey && apiKeyParam !== expectedApiKey) {
      return new Response(JSON.stringify({ error: "Unauthorized: Invalid or missing api_key query parameter." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ACTION 1: Import stock lists from Pohoda XML
    if (action === "import-stock") {
      const xmlText = await req.text();
      
      // Fast, lightweight Regex parsing to extract <stockHeader> blocks without external XML libraries
      const stockHeaderRegex = /<stockHeader>([\s\S]*?)<\/stockHeader>/g;
      let match;
      const productsToUpsert = [];

      while ((match = stockHeaderRegex.exec(xmlText)) !== null) {
        const content = match[1];
        const code = content.match(/<codeElement>(.*?)<\/codeElement>/)?.[1];
        const name = content.match(/<name>(.*?)<\/name>/)?.[1];
        const price = content.match(/<sellingPrice>(.*?)<\/sellingPrice>/)?.[1];
        const count = content.match(/<count>(.*?)<\/count>/)?.[1];
        const desc = content.match(/<descriptionHtml><!\[CDATA\[([\s\S]*?)\]\]><\/descriptionHtml>/)?.[1] 
                   || content.match(/<descriptionHtml>(.*?)<\/descriptionHtml>/)?.[1];

        if (code) {
          const sku = code.trim();
          productsToUpsert.push({
            id: sku,
            name: name ? name.trim() : sku,
            price: price ? parseFloat(price) : null,
            stock: count ? parseInt(count, 10) : 0,
            description: desc ? desc.trim() : null,
            updated_at: new Date().toISOString()
          });
        }
      }

      if (productsToUpsert.length === 0) {
        return new Response(JSON.stringify({ success: false, message: "No valid stock items found in XML." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Upsert products to database, on conflict matching key is 'id' (SKU)
      const { data, error } = await supabase
        .from("products")
        .upsert(productsToUpsert, { onConflict: "id" });

      if (error) {
        throw error;
      }

      return new Response(JSON.stringify({ 
        success: true, 
        message: `Successfully processed ${productsToUpsert.length} products from XML.`,
        processedCount: productsToUpsert.length
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ACTION 2: Export order details to Pohoda receivedOrder XML
    if (action === "export-order") {
      const body = await req.json();
      const { order, items } = body;

      if (!order || !order.id || !items || !Array.isArray(items)) {
        return new Response(JSON.stringify({ error: "Missing required order or items structure." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let itemsXml = "";
      items.forEach((item) => {
        itemsXml += `
        <ord:orderItem>
          <ord:stockItem>
            <store>
              <ids>Sklad-Karty</ids>
            </store>
            <stockName>${escapeXml(item.name)}</stockName>
            <code>${escapeXml(item.product_id || item.id)}</code>
          </ord:stockItem>
          <ord:quantity>${item.quantity}</ord:quantity>
          <ord:delivered>${item.quantity}</ord:delivered>
          <ord:unitPrice>${item.price}</ord:unitPrice>
        </ord:orderItem>`;
      });

      // Add shipping fee line item if applicable
      if (order.shipping_cost && parseFloat(order.shipping_cost) > 0) {
        itemsXml += `
        <ord:orderItem>
          <ord:text>${escapeXml(order.shipping_method || 'Doprava')}</ord:text>
          <ord:quantity>1</ord:quantity>
          <ord:delivered>1</ord:delivered>
          <ord:unitPrice>${order.shipping_cost}</ord:unitPrice>
        </ord:orderItem>`;
      }

      // Add payment surcharge line item if applicable (e.g. COD fee)
      if (order.payment_surcharge && parseFloat(order.payment_surcharge) > 0) {
        itemsXml += `
        <ord:orderItem>
          <ord:text>Dobírkový příplatek</ord:text>
          <ord:quantity>1</ord:quantity>
          <ord:delivered>1</ord:delivered>
          <ord:unitPrice>${order.payment_surcharge}</ord:unitPrice>
        </ord:orderItem>`;
      }

      const orderXml = `<?xml version="1.0" encoding="Windows-1250"?>
<dat:dataPack id="OBJ-${order.id}" version="2.0" note="Objednavka z eshopu"
              xmlns:dat="http://www.stormware.cz/schema/version_2/data.xsd"
              xmlns:ord="http://www.stormware.cz/schema/version_2/order.xsd"
              xmlns:typ="http://www.stormware.cz/schema/version_2/type.xsd">
  <dat:dataPackItem id="IMP-${order.id}" version="2.0">
    <ord:order version="2.0">
      <ord:orderHeader>
        <ord:orderType>receivedOrder</ord:orderType>
        <ord:number>
          <ids>${order.id}</ids>
        </ord:number>
        <ord:date>${new Date(order.created_at || Date.now()).toISOString().split('T')[0]}</ord:date>
        <ord:text>Objednavka e-shop c. ${order.id}</ord:text>
        <ord:partnerIdentity>
          <typ:address>
            <typ:name>${escapeXml(order.customer_name)}</typ:name>
            <typ:city>${escapeXml(order.customer_city)}</typ:city>
            <typ:street>${escapeXml(order.customer_street)}</typ:street>
            <typ:zip>${escapeXml(order.customer_zip)}</typ:zip>
            <typ:email>${escapeXml(order.customer_email)}</typ:email>
            <typ:phone>${escapeXml(order.customer_phone)}</typ:phone>
          </typ:address>
        </ord:partnerIdentity>
        ${order.carrier ? `
        <ord:carrier>
          <ids>${escapeXml(order.carrier)}</ids>
        </ord:carrier>
        ` : ''}
        <ord:paymentType>
          <ids>${escapeXml(order.payment_method || 'platba kartou')}</ids>
        </ord:paymentType>
      </ord:orderHeader>
      <ord:orderDetail>${itemsXml}
      </ord:orderDetail>
    </ord:order>
  </dat:dataPackItem>
</dat:dataPack>`;

      // Try to save to Supabase Storage Bucket 'pohoda-orders'
      try {
        const encoder = new TextEncoder();
        const fileData = encoder.encode(orderXml);
        await supabase.storage
          .from("pohoda-orders")
          .upload(`order_${order.id}.xml`, fileData, {
            contentType: "application/xml",
            upsert: true
          });
      } catch (storageErr) {
        console.warn("Storage upload failed, returning response only:", storageErr.message);
      }

      return new Response(orderXml, {
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/xml; charset=windows-1250",
          "Content-Disposition": `attachment; filename="order_${order.id}.xml"`
        },
      });
    }

    // ACTION 3: Generate GLS shipping label via REST API
    if (action === "generate-gls-label") {
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

      // Clean street and house number
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

      try {
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

      } catch (apiErr) {
        console.error("GLS REST API call failed:", apiErr);
        return new Response(JSON.stringify({ success: false, error: apiErr.message }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ error: "Endpoint not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
