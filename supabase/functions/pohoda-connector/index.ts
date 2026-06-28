import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";
import { XMLParser } from "https://esm.sh/fast-xml-parser@4.3.6";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // 1. Authorize API key
  const url = new URL(req.url);
  const apiKey = url.searchParams.get("api_key");
  const expectedApiKey = Deno.env.get("POHODA_API_KEY");

  if (!apiKey || apiKey !== expectedApiKey) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const pathname = url.pathname;

  // Endpoint: GET /export-orders
  if (pathname.endsWith("/export-orders")) {
    try {
      let ordersData = [];
      const isTest = url.searchParams.get("test") === "true" || url.searchParams.get("sample") === "true";

      if (isTest) {
        ordersData = [{
          order: {
            id: "1004161",
            customerEmail: "ondra.zeman05@gmail.com",
            customerName: "Ondřej Zeman",
            customerPhone: "+420 777 538 858",
            shippingMethod: "Zásilkovna — Doručení na adresu",
            shippingStreet: "Farmářská 290",
            shippingCity: "Dolní Ředice",
            shippingZip: "533 75",
            finalTotal: 2579,
            totalPrice: 2579,
            paymentMethod: "GP webpay",
            shippingCost: 79,
            paymentSurcharge: 0,
            creditApplied: 0,
            date: "28. 6. 2026"
          },
          items: [
            {
              id: "charizard-ex-sv3",
              name: "Charizard ex (Special Illustration Rare) - S DPH 21%",
              quantity: 1,
              price: 1000,
              no_vat: false,
              product: {
                id: "charizard-ex-sv3"
              }
            },
            {
              id: "prod-used-001",
              name: "Pokémon TCG - Charizard VMAX (Shiny § 90) - BEZ DPH",
              quantity: 1,
              price: 1500,
              no_vat: true,
              product: {
                id: "prod-used-001"
              }
            }
          ]
        }];
      } else {
        // List files in the 'pohoda-orders' bucket
        const { data: files, error: listError } = await supabase.storage
          .from("pohoda-orders")
          .list("", { limit: 100 });

        if (listError) throw listError;

        const orderFiles = files?.filter(f => f.name.endsWith(".json")) || [];

        for (const file of orderFiles) {
          const { data: fileData, error: downloadError } = await supabase.storage
            .from("pohoda-orders")
            .download(file.name);

          if (downloadError) {
            console.error(`Error downloading ${file.name}:`, downloadError);
            continue;
          }

          const text = await fileData.text();
          const json = JSON.parse(text);
          ordersData.push(json);
        }
      }

      // Convert orders to XML
      let xml = `<?xml version="1.0" encoding="utf-8"?>\n`;
      xml += `<dat:dataPack id="Orders_${Date.now()}" version="2.0" application="eshop" note="Export objednávek do Pohody"\n`;
      xml += `              xmlns:dat="http://www.stormware.cz/schema/version_2/data.xsd"\n`;
      xml += `              xmlns:ord="http://www.stormware.cz/schema/version_2/order.xsd"\n`;
      xml += `              xmlns:typ="http://www.stormware.cz/schema/version_2/type.xsd">\n`;

      ordersData.forEach((od) => {
        const order = od.order;
        const items = od.items || [];
        const orderDate = order.date ? formatDateISO(order.date) : new Date().toISOString().split("T")[0];

        xml += `  <dat:dataPackItem id="Order_${order.id}" version="2.0">\n`;
        xml += `    <ord:order version="2.0">\n`;
        xml += `      <ord:orderHeader>\n`;
        xml += `        <ord:orderType>receivedOrder</ord:orderType>\n`;
        xml += `        <ord:numberOrder>${order.id}</ord:numberOrder>\n`;
        xml += `        <ord:date>${orderDate}</ord:date>\n`;
        xml += `        <ord:text>Objednávka z e-shopu č. ${order.id}</ord:text>\n`;
        xml += `        <ord:partnerIdentity>\n`;
        xml += `          <typ:address>\n`;
        xml += `            <typ:name>${escapeXml(order.customerName)}</typ:name>\n`;
        if (order.shippingCity) xml += `            <typ:city>${escapeXml(order.shippingCity)}</typ:city>\n`;
        if (order.shippingStreet) xml += `            <typ:street>${escapeXml(order.shippingStreet)}</typ:street>\n`;
        if (order.shippingZip) xml += `            <typ:zip>${escapeXml(order.shippingZip)}</typ:zip>\n`;
        if (order.customerEmail) xml += `            <typ:email>${escapeXml(order.customerEmail)}</typ:email>\n`;
        if (order.customerPhone) xml += `            <typ:phone>${escapeXml(order.customerPhone)}</typ:phone>\n`;
        xml += `          </typ:address>\n`;
        xml += `        </ord:partnerIdentity>\n`;
        xml += `        <ord:paymentType>\n`;
        xml += `          <typ:ids>${escapeXml(order.paymentMethod || "online platba")}</typ:ids>\n`;
        xml += `        </ord:paymentType>\n`;
        xml += `      </ord:orderHeader>\n`;
        xml += `      <ord:orderDetail>\n`;

        items.forEach((item: any) => {
          xml += `        <ord:orderItem>\n`;
          xml += `          <ord:text>${escapeXml(item.name)}</ord:text>\n`;
          xml += `          <ord:quantity>${item.quantity}</ord:quantity>\n`;
          xml += `          <ord:rateVAT>${item.no_vat ? 'none' : 'high'}</ord:rateVAT>\n`;
          xml += `          <ord:homeCurrency>\n`;
          xml += `            <typ:unitPrice>${item.price}</typ:unitPrice>\n`;
          xml += `          </ord:homeCurrency>\n`;
          
          // Map product ID to Pohoda stock codes
          const code = item.product?.id || item.id;
          if (code) {
            xml += `          <ord:stockItem>\n`;
            xml += `            <typ:stockItem>\n`;
            xml += `              <typ:ids>${escapeXml(code)}</typ:ids>\n`;
            xml += `            </typ:stockItem>\n`;
            xml += `          </ord:stockItem>\n`;
          }
          xml += `        </ord:orderItem>\n`;
        });

        // Add shipping item if shippingCost is > 0
        if (order.shippingCost > 0) {
          xml += `        <ord:orderItem>\n`;
          xml += `          <ord:text>Doprava - ${escapeXml(order.shippingMethod)}</ord:text>\n`;
          xml += `          <ord:quantity>1</ord:quantity>\n`;
          xml += `          <ord:rateVAT>high</ord:rateVAT>\n`;
          xml += `          <ord:homeCurrency>\n`;
          xml += `            <typ:unitPrice>${order.shippingCost}</typ:unitPrice>\n`;
          xml += `          </ord:homeCurrency>\n`;
          xml += `        </ord:orderItem>\n`;
        }

        // Add payment surcharge item if surcharge is > 0
        if (order.paymentSurcharge > 0) {
          xml += `        <ord:orderItem>\n`;
          xml += `          <ord:text>Poplatek za platbu - ${escapeXml(order.paymentMethod)}</ord:text>\n`;
          xml += `          <ord:quantity>1</ord:quantity>\n`;
          xml += `          <ord:rateVAT>high</ord:rateVAT>\n`;
          xml += `          <ord:homeCurrency>\n`;
          xml += `            <typ:unitPrice>${order.paymentSurcharge}</typ:unitPrice>\n`;
          xml += `          </ord:homeCurrency>\n`;
          xml += `        </ord:orderItem>\n`;
        }

        xml += `      </ord:orderDetail>\n`;
        xml += `    </ord:order>\n`;
        xml += `  </dat:dataPackItem>\n`;
      });

      xml += `</dat:dataPack>\n`;

      return new Response(xml, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/xml; charset=utf-8",
        },
      });
    } catch (err) {
      console.error(err);
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  // Endpoint: POST /import-response (Confirm receipt of imported orders)
  if (req.method === "POST" && pathname.endsWith("/import-response")) {
    try {
      const xmlText = await req.text();
      const parser = new XMLParser({ ignoreAttributes: false });
      const jsonObj = parser.parse(xmlText);

      // Extract response Pack Items
      const responsePack = jsonObj["rsp:responsePack"] || jsonObj["responsePack"];
      if (responsePack) {
        const items = responsePack["rsp:responsePackItem"] || responsePack["responsePackItem"] || [];
        const itemsList = Array.isArray(items) ? items : [items];

        for (const item of itemsList) {
          const idAttribute = item["@_id"] || item["id"];
          const stateAttribute = item["@_state"] || item["state"];

          // If successfully imported to Pohoda, move the file to processed folder
          if (idAttribute && stateAttribute === "ok") {
            const orderId = idAttribute.replace("Order_", "");
            const sourceFile = `order_${orderId}.json`;
            const destFile = `processed/order_${orderId}.json`;

            // Download
            const { data: fileData, error: downloadError } = await supabase.storage
              .from("pohoda-orders")
              .download(sourceFile);

            if (!downloadError && fileData) {
              // Upload to processed
              const arrayBuffer = await fileData.arrayBuffer();
              const { error: uploadError } = await supabase.storage
                .from("pohoda-orders")
                .upload(destFile, new Uint8Array(arrayBuffer), { 
                  contentType: "application/json",
                  upsert: true 
                });

              if (!uploadError) {
                // Delete original
                await supabase.storage
                  .from("pohoda-orders")
                  .remove([sourceFile]);
                console.log(`Moved order_${orderId}.json to processed folder.`);
              }
            }
          }
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (err) {
      console.error(err);
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  // Endpoint: POST /import-stock (Pohoda odesílá zásoby)
  if (req.method === "POST" && pathname.endsWith("/import-stock")) {
    try {
      const xmlText = await req.text();
      const parser = new XMLParser({ ignoreAttributes: false });
      const jsonObj = parser.parse(xmlText);

      // Extract stock list from dataPack
      const dataPack = jsonObj["dat:dataPack"] || jsonObj["dataPack"];
      if (!dataPack) {
        throw new Error("Missing dataPack container in XML");
      }

      const items = dataPack["dat:dataPackItem"] || dataPack["dataPackItem"] || [];
      const itemsList = Array.isArray(items) ? items : [items];

      let updatedCount = 0;

      for (const item of itemsList) {
        const stock = item["stk:stock"] || item["stock"];
        if (!stock) continue;

        const header = stock["stk:stockHeader"] || stock["stockHeader"];
        if (!header) continue;

        const code = header["stk:code"] || header["code"];
        const sellingPrice = header["stk:sellingPrice"] || header["sellingPrice"];
        const stockCount = header["stk:count"] || header["count"];

        if (code) {
          const updateData: any = {};
          if (sellingPrice !== undefined) updateData.price = Number(sellingPrice);
          if (stockCount !== undefined) updateData.stock = Number(stockCount);

          if (Object.keys(updateData).length > 0) {
            const { error: updateError } = await supabase
              .from("products")
              .update(updateData)
              .eq("id", code);

            if (!updateError) {
              updatedCount++;
            } else {
              console.error(`Error updating product ${code}:`, updateError);
            }
          }
        }
      }

      return new Response(JSON.stringify({ success: true, updated: updatedCount }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (err) {
      console.error(err);
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  // Fallback
  return new Response("Not found", { status: 404 });
});

function escapeXml(unsafe: string): string {
  if (!unsafe) return "";
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<": return "&lt;";
      case ">": return "&gt;";
      case "&": return "&amp;";
      case "'": return "&apos;";
      case "\"": return "&quot;";
      default: return c;
    }
  });
}

function formatDateISO(dateStr: string): string {
  try {
    const parts = dateStr.split(".").map(p => p.trim());
    if (parts.length === 3) {
      const day = parts[0].padStart(2, "0");
      const month = parts[1].padStart(2, "0");
      const year = parts[2];
      return `${year}-${month}-${day}`;
    }
  } catch (_) {}
  return dateStr;
}
