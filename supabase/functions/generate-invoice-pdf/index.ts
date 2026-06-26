import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { order } = await req.json();
    if (!order || !order.id) {
      return new Response(JSON.stringify({ error: "Missing order details." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create a structured text representation of the tax invoice document
    const invoiceText = `
============================================================
           FAKTURA - DAŇOVÝ DOKLAD # ${order.id}
============================================================

DODAVATEL:
NORTHVALE s.r.o.
Bratří Čapků 1095, 534 01 Holice
Česká republika
IČO: 29618142
DIČ: CZ29618142

ODBĚRATEL:
${order.companyName ? `${order.companyName}\nJméno: ` : ""}${order.customerName}
${order.shippingStreet || ""}
${order.shippingCity || ""}, ${order.shippingZip || ""}
IČO: ${order.ico || "—"}
DIČ: ${order.dic || "—"}
E-mail: ${order.customerEmail || "—"}
Tel: ${order.customerPhone || "—"}
Poznámka: ${order.notes || "—"}

------------------------------------------------------------
Variabilní symbol: ${order.id}
Konstantní symbol: 0308
Datum vystavení / DUZP: ${order.date || new Date().toLocaleDateString("cs-CZ")}
Forma úhrady:   ${order.paymentMethod || "online platba"}
Způsob dopravy:  ${order.shippingMethod || "GLS"}
------------------------------------------------------------

POLOŽKY DOKLADU:
${(order.items || [])
  .map(
    (item: any, idx: number) =>
      `${idx + 1}. ${item.name || item.productName}
         ${item.quantity} ks x ${parseFloat(item.price).toFixed(2)} Kč   Sazba: 21%   Celkem: ${(
        parseFloat(item.price) * parseInt(item.quantity)
      ).toFixed(2)} Kč`
  )
  .join("\n")}

Doprava a balné:  ${parseFloat(order.shippingCost || "0").toFixed(2)} Kč
Dobírkový příplatek: ${parseFloat(order.paymentSurcharge || "0").toFixed(2)} Kč
------------------------------------------------------------
Celkem bez DPH (21%):  ${(parseFloat(order.finalTotal || "0") / 1.21).toFixed(2)} Kč
DPH 21% celkem:         ${(parseFloat(order.finalTotal || "0") - parseFloat(order.finalTotal || "0") / 1.21).toFixed(2)} Kč
CELKEM K ÚHRADĚ:        ${parseFloat(order.finalTotal || "0").toFixed(2)} Kč
============================================================
Děkujeme za Váš nákup na NORTHVALE TCG!
`;

    const fileData = new TextEncoder().encode(invoiceText);
    const fileName = `invoice_${order.id}.txt`;

    // Try to create the bucket if not exists
    try {
      await supabase.storage.createBucket("invoices", { public: true });
    } catch (_bErr) {
      // Ignore if exists
    }

    // Upload the structured invoice text file
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("invoices")
      .upload(fileName, fileData, {
        contentType: "text/plain;charset=utf-8",
        upsert: true,
      });

    if (uploadError) {
      throw uploadError;
    }

    return new Response(JSON.stringify({ success: true, path: uploadData.path }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message || String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
