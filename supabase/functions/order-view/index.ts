/**
 * Objednávka bez přihlášení — stránka /objednavka/<číslo>/?k=<klíč>.
 *
 * POST { id, k } → zákaznický přehled objednávky (jen pro platný klíč z e-mailu).
 * Neplatný klíč i neexistující objednávka vrací stejné 404, aby nešlo
 * zkoušet, která čísla objednávek existují. Vrací jen to, co zákazník
 * potřebuje vidět — žádná interní pole (sklad, user_id, Pohoda…).
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { normalizeOrder } from "../_shared/order-schema.ts";
import { orderAccessKey, safeEqual } from "../_shared/order-link.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const NOT_FOUND = { error: "not_found" };

function trackingFor(o: any) {
  const gls = String(o.gls_parcel_number || "").trim();
  const dpd = String(o.dpd_parcel_number || "").trim();
  if (gls) return { carrier: "GLS", number: gls, url: `https://gls-group.com/CZ/cs/sledovani-zasilek/?match=${encodeURIComponent(gls)}` };
  if (dpd) return { carrier: "DPD", number: dpd, url: `https://tracking.dpd.de/status/cs_CZ/parcel/${encodeURIComponent(dpd)}` };
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const id = String(body?.id || "").trim();
    const k = String(body?.k || "").trim().toLowerCase();
    if (!/^[A-Za-z0-9-]{1,40}$/.test(id) || !/^[0-9a-f]{32}$/.test(k)) return json(NOT_FOUND, 404);

    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    let file = (await supabase.storage.from("pohoda-orders").download(`order_${id}.json`)).data;
    if (!file) file = (await supabase.storage.from("pohoda-orders").download(`processed/order_${id}.json`)).data;
    if (!file) return json(NOT_FOUND, 404);

    const raw = JSON.parse(await file.text());
    const o = normalizeOrder({ ...(raw.order || raw), items: raw.items || raw.order?.items || raw.items });

    const expected = await orderAccessKey(o.id || id, o.customer_email);
    if (!expected || !safeEqual(expected, k)) return json(NOT_FOUND, 404);

    const pickup = o.pickup_point_details || null;
    return json({
      order: {
        id: String(o.id || id),
        createdAt: o.created_at || null,
        customerName: o.customer_name || "",
        paymentMethod: o.payment_method || "",
        paymentStatus: o.payment_status || "",
        fulfillmentStatus: o.fulfillment_status || "pending",
        shippingMethod: o.shipping_method || "",
        pickupPoint: pickup ? {
          name: pickup.name || "",
          street: pickup.street || "",
          city: pickup.city || "",
          zip: pickup.zip || "",
        } : null,
        address: { street: o.customer_street || "", city: o.customer_city || "", zip: o.customer_zip || "" },
        items: (o.items || []).map((it: any) => ({
          name: it.name,
          productId: it.product_id || null,
          quantity: it.quantity,
          price: it.price,
        })),
        subtotal: Number(o.subtotal) || 0,
        discountCode: o.discount_code || null,
        discountAmount: Number(o.discount_amount) || 0,
        shippingCost: Number(o.shipping_cost) || 0,
        paymentSurcharge: Number(o.payment_surcharge) || 0,
        creditApplied: Number(o.credit_applied) || 0,
        finalTotal: Number(o.final_total) || 0,
        tracking: trackingFor(raw.order || raw),
      },
    });
  } catch (err) {
    console.error("[order-view] chyba:", err);
    return json({ error: "server_error" }, 500);
  }
});
