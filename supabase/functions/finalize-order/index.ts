import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";
import { normalizeOrder, normalizeItems, slimOrderForHistory, ORDER_HISTORY_LIMIT } from "../_shared/order-schema.ts";
import { getAuthContext, requireAdmin } from "../_shared/auth.ts";
import { AUTO_INVOICES } from "../_shared/features.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Helpers for Base64 and ArrayBuffer conversion
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64.replace(/\s/g, ""));
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// Convert PEM format key to clean DER buffer
function pemToDerBuffer(pem: string, type: "private" | "public"): ArrayBuffer {
  const header = type === "private" ? "-----BEGIN PRIVATE KEY-----" : "-----BEGIN PUBLIC KEY-----";
  const footer = type === "private" ? "-----END PRIVATE KEY-----" : "-----END PUBLIC KEY-----";
  
  const cleanPem = pem
    .replace(header, "")
    .replace(footer, "")
    .replace(/\s/g, "");
  return base64ToArrayBuffer(cleanPem);
}

async function getNextInvoiceNumber(supabase: any): Promise<string> {
  try {
    const { data, error } = await supabase.rpc("next_order_number");
    if (!error && data !== null && data !== undefined) {
      return String(data);
    }
    if (error) {
      console.error("rpc next_order_number error:", error);
    }
  } catch (err) {
    console.error("Error in getNextInvoiceNumber RPC:", err);
  }
  
  // Fallback to storage sequence if RPC is not yet migrated
  const START_NUMBER = 260100010;
  const fileName = "invoice_counter.json";
  try {
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("pohoda-orders")
      .download(fileName);

    let currentNum = START_NUMBER;
    if (!downloadError && fileData) {
      const text = await fileData.text();
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed.next_number === "number" && !isNaN(parsed.next_number)) {
        currentNum = Math.max(START_NUMBER, parsed.next_number);
      }
    }

    const nextNum = currentNum + 1;
    const encoder = new TextEncoder();
    const saveBytes = encoder.encode(JSON.stringify({ next_number: nextNum }, null, 2));

    await supabase.storage
      .from("pohoda-orders")
      .upload(fileName, saveBytes, { contentType: "application/json", upsert: true });

    return String(currentNum);
  } catch (err) {
    console.error("Error in fallback getNextInvoiceNumber:", err);
    return String(START_NUMBER);
  }
}

/**
 * Ceník dopravy a dobírkového příplatku — MUSÍ odpovídat výpočtu v src/components/CheckoutFlow.jsx a src/config.js (COD_SURCHARGE).
 * Při změně částky příplatku je potřeba upravit obě místa — tady i v src/config.js.
 * Klient posílá jen název dopravy, cenu si dopočítá server.
 */
function serverShippingCost(shippingMethod: string, subtotalAfterDiscount: number, cartSubtotal: number): number {
  const m = String(shippingMethod || '').toLowerCase();

  const isPersonal = m.includes('osobní') || m.includes('personal') || m.includes('škrba') || m.includes('skrba');
  if (isPersonal) return 0;

  // Doprava zdarma od 1750 Kč
  if (cartSubtotal >= 1750 || subtotalAfterDiscount >= 1750) return 0;

  const isPickup = m.includes('výdejní') || m.includes('pickup');
  if (m.includes('dpd')) return isPickup ? 79 : 109;
  if (m.includes('gls')) return isPickup ? 89 : 129;
  return 109;
}

/**
 * BEZPEČNOST — ověření cen na serveru.
 *
 * Klient posílá ceny položek i celkovou částku. Bez této kontroly si může
 * kdokoli upravit požadavek a objednat zboží za 1 Kč. Přepočítáme objednávku
 * z cen v databázi a nižší částku než serverovou odmítneme.
 *
 * Vrací { ok: true } nebo { ok: false, reason, expected, received }.
 */
async function verifyOrderPricing(supabase: any, orderData: any): Promise<any> {
  try {
    const items = orderData.items || [];
    if (!items.length) return { ok: true, skipped: 'no-items' };

    let serverSubtotal = 0;
    let verifiedItems = 0;

    for (const item of items) {
      const qty = Math.max(1, Number(item.quantity) || 1);
      const prodId = item.product_id || item.id;
      const clientPrice = Number(item.price) || 0;

      if (!prodId) {
        serverSubtotal += clientPrice * qty;
        continue;
      }

      // Položka denní nabídky — cena je v tabulce daily_deal
      if (prodId === 'deal-of-the-day' || item.product?.isDailyDeal) {
        const slotId = item.product?.dealSlotId || 'active-deal';
        const { data: deal } = await supabase
          .from('daily_deal')
          .select('deal_price, price')
          .eq('id', slotId)
          .maybeSingle();
        const dealPrice = Number(deal?.deal_price ?? deal?.price);
        if (deal && !isNaN(dealPrice) && dealPrice > 0) {
          serverSubtotal += dealPrice * qty;
          verifiedItems++;
        } else {
          serverSubtotal += clientPrice * qty;
        }
        continue;
      }

      const { data: prod } = await supabase
        .from('products')
        .select('price, variants')
        .eq('id', prodId)
        .maybeSingle();

      if (!prod) {
        // Produkt v katalogu není (smazaný) — cenu ověřit nelze, necháme klientskou
        serverSubtotal += clientPrice * qty;
        continue;
      }

      // Varianta (singles) — cena může být na variantě
      let serverPrice: number | null = null;
      if (item.id && item.id !== prodId && Array.isArray(prod.variants)) {
        const variant = prod.variants.find((v: any) => String(v.id) === String(item.id));
        const vPrice = Number(variant?.price);
        if (variant && !isNaN(vPrice) && vPrice > 0) serverPrice = vPrice;
      }
      if (serverPrice === null) {
        const pPrice = Number(prod.price);
        if (!isNaN(pPrice) && pPrice > 0) serverPrice = pPrice;
      }

      if (serverPrice === null) {
        serverSubtotal += clientPrice * qty;
      } else {
        serverSubtotal += serverPrice * qty;
        verifiedItems++;
      }
    }

    // Nepodařilo se ověřit ani jednu položku — nemá smysl blokovat objednávku
    if (verifiedItems === 0) return { ok: true, skipped: 'no-verifiable-items' };

    // Sleva — ověřit proti databázi, ne věřit klientovi
    let serverDiscount = 0;
    if (orderData.discount_code) {
      const cleanCode = String(orderData.discount_code).trim().toUpperCase();
      const { data: code } = await supabase
        .from('discount_codes')
        .select('discount_type, discount_value, discount_percent, is_active, active, valid_from, valid_until, max_uses, used_count')
        .eq('code', cleanCode)
        .maybeSingle();

      if (code) {
        const today = new Date().toISOString().slice(0, 10);
        const isActive = (code.is_active !== false) && (code.active !== false);
        const fromOk = !code.valid_from || String(code.valid_from).slice(0, 10) <= today;
        const untilOk = !code.valid_until || String(code.valid_until).slice(0, 10) >= today;
        const usesOk = code.max_uses === null || code.max_uses === undefined || code.max_uses === ''
          || Number(code.used_count || 0) < Number(code.max_uses);

        if (isActive && fromOk && untilOk && usesOk) {
          const type = code.discount_type || 'percent';
          const val = Number(code.discount_value ?? code.discount_percent ?? 0);
          serverDiscount = type === 'percent'
            ? Math.round((serverSubtotal * val) / 100)
            : val;
          serverDiscount = Math.min(serverSubtotal, Math.max(0, serverDiscount));
        }
      }
    }

    const afterDiscount = Math.max(0, serverSubtotal - serverDiscount);
    const serverShipping = serverShippingCost(orderData.shipping_method, afterDiscount, serverSubtotal);

    // Příplatek za dobírku si počítá server sám — klientovi se nevěří.
    // MUSÍ odpovídat výpočtu v src/components/CheckoutFlow.jsx a hodnotě
    // COD_SURCHARGE v src/config.js.
    const pm = String(orderData.payment_method || '').toLowerCase();
    const sm = String(orderData.shipping_method || '').toLowerCase();
    const isCod = pm.includes('dobírk') || pm.includes('dobirk') || pm.includes('cash on delivery') || pm.includes('cod');
    const isPersonalPickup = sm.includes('osobní') || sm.includes('personal') || sm.includes('škrba') || sm.includes('skrba');
    const surcharge = (isCod && !isPersonalPickup) ? 29 : 0;

    // Kredit může být nejvýše zůstatek na účtu zákazníka
    let credit = Math.max(0, Number(orderData.credit_applied) || 0);
    if (credit > 0 && orderData.user_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('store_credit')
        .eq('id', orderData.user_id)
        .maybeSingle();
      credit = Math.min(credit, Math.max(0, Number(profile?.store_credit) || 0));
    } else if (credit > 0) {
      credit = 0; // nepřihlášený zákazník kredit uplatnit nemůže
    }

    const expected = Math.max(0, afterDiscount + serverShipping + surcharge - credit);
    const received = Number(orderData.final_total) || 0;

    // Tolerance 1 Kč na zaokrouhlení. Vyšší částka od klienta nevadí.
    if (received < expected - 1) {
      return { ok: false, reason: 'price-mismatch', expected, received };
    }

    return { ok: true, expected, received };
  } catch (err) {
    console.error('verifyOrderPricing failed, order allowed through:', err);
    return { ok: true, skipped: 'verification-error' };
  }
}

/**
 * IDEMPOTENCE — ochrana proti duplicitním objednávkám.
 *
 * Zámek v prohlížeči neochrání před dvěma záložkami, retry po timeoutu ani
 * před znovuodesláním z jiného zařízení. Klíč počítáme z obsahu objednávky
 * (e-mail + položky + částka). Marker ve storage drží 15 minut; přijde-li
 * ve stejném okně druhá identická objednávka, vrátíme tu původní.
 */
async function orderIdempotencyKey(orderData: any): Promise<string> {
  const items = (orderData.items || [])
    .map((i: any) => `${i.product_id || i.id}:${i.quantity}:${i.price}`)
    .sort()
    .join('|');
  const canonical = [
    String(orderData.customer_email || '').trim().toLowerCase(),
    items,
    String(orderData.final_total ?? ''),
    String(orderData.shipping_method || ''),
    String(orderData.payment_method || '')
  ].join('#');

  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32);
}

// Klíč z checkoutu (client_ref) je unikátní pro jeden logický nákup — drží
// dlouho. Obsahový otisk je jen záchrana pro staré klienty bez client_ref;
// drží krátce, aby neodmítl zákazníka, který si legitimně objedná totéž znovu.
const IDEMPOTENCY_REF_WINDOW_MS = 15 * 60 * 1000;
const IDEMPOTENCY_CONTENT_WINDOW_MS = 2 * 60 * 1000;

async function findRecentDuplicate(supabase: any, key: string, windowMs: number): Promise<string | null> {
  try {
    const { data } = await supabase.storage.from("pohoda-orders").download(`idem/${key}.json`);
    if (!data) return null;
    const parsed = JSON.parse(await data.text());
    if (!parsed?.order_id || !parsed?.at) return null;
    if (Date.now() - Number(parsed.at) > windowMs) return null;
    return String(parsed.order_id);
  } catch (_e) {
    return null;
  }
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

async function markIdempotencyKey(supabase: any, key: string, orderId: string) {
  try {
    const bytes = new TextEncoder().encode(JSON.stringify({ order_id: orderId, at: Date.now() }));
    await supabase.storage
      .from("pohoda-orders")
      .upload(`idem/${key}.json`, bytes, { contentType: "application/json", upsert: true });
  } catch (err) {
    console.error("Failed to write idempotency marker:", err);
  }
}

/**
 * Atomický odečet/vrácení skladu přes DB funkci (migrace adjust_stock).
 * Čtení+zápis ve dvou krocích umí při souběhu dvou objednávek jeden
 * odečet ztratit. Když RPC ještě není nasazené, vrací false a volající
 * použije původní (neatomickou) cestu.
 */
async function adjustStockAtomic(supabase: any, productId: string, delta: number): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc("adjust_stock", { p_product_id: productId, p_delta: delta });
    return !error && data === true;
  } catch (_e) {
    return false;
  }
}

async function adjustDealStockAtomic(supabase: any, slotId: string, delta: number): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc("adjust_daily_deal_stock", { p_slot_id: slotId, p_delta: delta });
    return !error && data === true;
  } catch (_e) {
    return false;
  }
}

async function applyStockAndDiscount(supabase: any, orderData: any) {
  if (orderData.stock_applied === true) {
    return;
  }

  // 1. Decrement Stock safely on server (wrapped per item in try/catch)
  for (const item of (orderData.items || [])) {
    try {
      const prodId = item.product_id || item.id;
      if (!prodId) continue;

      // Decrement daily deal stock if applicable
      if (item.product?.isDailyDeal) {
        const slotId = item.product.dealSlotId || 'active-deal';
        if (!(await adjustDealStockAtomic(supabase, slotId, -item.quantity))) {
          const { data: dbDeal } = await supabase
            .from('daily_deal')
            .select('stock')
            .eq('id', slotId)
            .maybeSingle();
          if (dbDeal) {
            const newDealStock = Math.max(0, (dbDeal.stock || 0) - item.quantity);
            await supabase
              .from('daily_deal')
              .update({ stock: newDealStock })
              .eq('id', slotId);
          }
        }
      }

      // Decrement main product stock
      if (prodId !== 'deal-of-the-day') {
        if (item.id && item.id !== prodId) {
          const { data: dbProd } = await supabase
            .from('products')
            .select('variants')
            .eq('id', prodId)
            .maybeSingle();
          if (dbProd && dbProd.variants) {
            const updatedVariants = dbProd.variants.map((v: any) => {
              if (v.id === item.id) {
                return { ...v, stock: Math.max(0, (v.stock || 0) - item.quantity) };
              }
              return v;
            });
            await supabase
              .from('products')
              .update({ variants: updatedVariants })
              .eq('id', prodId);
          }
        } else if (!(await adjustStockAtomic(supabase, prodId, -item.quantity))) {
          const { data: dbProd } = await supabase
            .from('products')
            .select('stock, on_order')
            .eq('id', prodId)
            .maybeSingle();
          // Zboží na objednávku (a produkty se stock NULL) sklad nevede —
          // nesmí se mu tady zapsat 0, jinak by se tvářilo jako vyprodané.
          if (dbProd && !dbProd.on_order && dbProd.stock !== null && dbProd.stock !== undefined) {
            const newStock = Math.max(0, (dbProd.stock || 0) - item.quantity);
            await supabase
              .from('products')
              .update({ stock: newStock })
              .eq('id', prodId);
          }
        }
      }
    } catch (stockErr) {
      console.error(`Stock deduction error for item ${item.product_id || item.name}:`, stockErr);
    }
  }

  // Increment discount_codes usage count if discountCode is present
  if (orderData.discount_code) {
    try {
      const cleanCode = String(orderData.discount_code).trim().toUpperCase();
      const { data: dbItem } = await supabase
        .from('discount_codes')
        .select('id, used_count, max_uses, is_active, active')
        .eq('code', cleanCode)
        .maybeSingle();

      if (dbItem) {
        const newUsedCount = Number(dbItem.used_count || 0) + 1;
        const maxUsesNum = dbItem.max_uses !== null && dbItem.max_uses !== undefined && dbItem.max_uses !== '' ? Number(dbItem.max_uses) : null;
        const isExhausted = maxUsesNum !== null ? (newUsedCount >= maxUsesNum) : false;

        const updatePayload: any = { used_count: newUsedCount };
        if (isExhausted) {
          updatePayload.is_active = false;
          updatePayload.active = false;
        }

        await supabase
          .from('discount_codes')
          .update(updatePayload)
          .eq('id', dbItem.id);
      }
    } catch (discErr) {
      console.error('Failed to increment discount code usage in finalize-order:', discErr);
    }
  }

  orderData.stock_applied = true;
}

async function triggerPostOrderActions(supabase: any, supabaseUrl: string, supabaseServiceKey: string, orderData: any, isMarkPaid = false) {
  // Fakturu vystavuje provozovatel ručně ze svého účetnictví a posílá ji
  // tlačítkem „Odeslat fakturu“ v adminu (funkce send-invoice-email).
  // Viz _shared/features.ts.
  if (AUTO_INVOICES && !orderData.has_no_vat) {
    try {
      const r = await fetch(`${supabaseUrl}/functions/v1/generate-invoice-pdf`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${supabaseServiceKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ order: orderData, overwrite: isMarkPaid })
      });
      const t = await r.text();
      if (!r.ok) {
        const errDesc = `generate-invoice-pdf HTTP ${r.status}: ${t}`;
        console.error(errDesc);
        orderData.invoice_error = errDesc;
        const errBytes = new TextEncoder().encode(errDesc);
        await supabase.storage
          .from("pohoda-orders")
          .upload(`errors/invoice_${orderData.id}.txt`, errBytes, { contentType: "text/plain", upsert: true });
      }
    } catch (pdfFetchErr: any) {
      const errDesc = `generate-invoice-pdf fetch error: ${pdfFetchErr?.message || String(pdfFetchErr)}`;
      console.error(errDesc);
      orderData.invoice_error = errDesc;
      try {
        const errBytes = new TextEncoder().encode(errDesc);
        await supabase.storage
          .from("pohoda-orders")
          .upload(`errors/invoice_${orderData.id}.txt`, errBytes, { contentType: "text/plain", upsert: true });
      } catch (_e) {}
    }
  }

  try {
    const r = await fetch(`${supabaseUrl}/functions/v1/send-order-email`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${supabaseServiceKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ order: orderData, items: orderData.items })
    });
    const t = await r.text();
    if (!r.ok) {
      const errDesc = `send-order-email HTTP ${r.status}: ${t}`;
      console.error(errDesc);
      orderData.email_error = errDesc;
      const errBytes = new TextEncoder().encode(errDesc);
      await supabase.storage
        .from("pohoda-orders")
        .upload(`errors/email_${orderData.id}.txt`, errBytes, { contentType: "text/plain", upsert: true });
    }
  } catch (emailFetchErr: any) {
    const errDesc = `send-order-email fetch error: ${emailFetchErr?.message || String(emailFetchErr)}`;
    console.error(errDesc);
    orderData.email_error = errDesc;
    try {
      const errBytes = new TextEncoder().encode(errDesc);
      await supabase.storage
        .from("pohoda-orders")
        .upload(`errors/email_${orderData.id}.txt`, errBytes, { contentType: "text/plain", upsert: true });
    } catch (_e) {}
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { action = "create", orderId, orderDetails, reserveOnly = false, supersedes = null } = body;

    // Ensure pohoda-orders bucket is private
    try {
      await supabase.storage.createBucket("pohoda-orders", { public: false });
    } catch (_bErr) {}
    try {
      await supabase.storage.updateBucket("pohoda-orders", { public: false });
    } catch (_uErr) {}

    // BEZPEČNOST: akce, které mění nastavení obchodu, smí volat jen administrátor.
    // Bez toho může kdokoli s veřejným anon klíčem přenastavit číselnou řadu faktur
    // (a způsobit přepsání existujících objednávek) nebo změnit denní nabídku.
    if (action === "reset-invoice-counter" || action === "save-daily-deal-config") {
      const authCtx = await getAuthContext(req, supabase, supabaseServiceKey);
      const denied = requireAdmin(authCtx, corsHeaders);
      if (denied) return denied;
    }

    // Action: Reset Invoice Counter
    if (action === "reset-invoice-counter") {
      const startNum = body.startNumber || 260100010;
      const encoder = new TextEncoder();
      const saveBytes = encoder.encode(JSON.stringify({ next_number: startNum }, null, 2));
      await supabase.storage
        .from("pohoda-orders")
        .upload("invoice_counter.json", saveBytes, { contentType: "application/json", upsert: true });
      return new Response(JSON.stringify({ success: true, message: `Invoice counter set to ${startNum}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: Save Daily Deal Config
    if (action === "save-daily-deal-config") {
      const slotId = body.slotId || "active-deal";
      const configData = body.config || {};
      const encoder = new TextEncoder();
      let existingConfig: Record<string, any> = {};
      try {
        const { data: file } = await supabase.storage.from("pohoda-orders").download("daily_deals_config.json");
        if (file) {
          existingConfig = JSON.parse(await file.text());
        }
      } catch (_e) {}
      existingConfig[slotId] = { ...(existingConfig[slotId] || {}), ...configData };
      const saveBytes = encoder.encode(JSON.stringify(existingConfig, null, 2));
      await supabase.storage
        .from("pohoda-orders")
        .upload("daily_deals_config.json", saveBytes, { contentType: "application/json", upsert: true });
      return new Response(JSON.stringify({ success: true, config: existingConfig }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: Get Daily Deal Config
    if (action === "get-daily-deal-config") {
      try {
        const { data: file } = await supabase.storage.from("pohoda-orders").download("daily_deals_config.json");
        if (file) {
          const text = await file.text();
          return new Response(JSON.stringify({ success: true, config: JSON.parse(text) }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } catch (_e) {}
      return new Response(JSON.stringify({ success: true, config: {} }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action 0: Get Reserved Order ID
    if (action === "get-order-id") {
      const seqData = await getNextInvoiceNumber(supabase);
      return new Response(JSON.stringify({ success: true, orderId: seqData }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action 1: Create Order
    if (action === "create") {
      if (!orderDetails) {
        return new Response(JSON.stringify({ error: "Missing orderDetails." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Generate sequence number or use passed orderId
      let generatedOrderId = orderId || orderDetails.id;

      // Bez explicitního čísla jde o novou objednávku od zákazníka — zkontrolovat,
      // jestli tu samou právě neposlal podruhé (dvojklik, dvě záložky, retry).
      let idemKey: string | null = null;
      if (!generatedOrderId) {
        const probe = normalizeOrder({ ...orderDetails, id: "probe" });
        const clientRef = String(orderDetails.client_ref || orderDetails.clientRef || body.clientRef || "").trim();
        let idemWindow: number;
        if (clientRef) {
          // Unikátní klíč jednoho nákupu z checkoutu — dedup jen skutečné
          // opakované odeslání (dvojklik, retry po timeoutu), ne nový nákup.
          idemKey = "ref-" + await sha256Hex(clientRef + "#" + String(probe.customer_email || "").trim().toLowerCase());
          idemWindow = IDEMPOTENCY_REF_WINDOW_MS;
        } else {
          idemKey = await orderIdempotencyKey(probe);
          idemWindow = IDEMPOTENCY_CONTENT_WINDOW_MS;
        }

        const duplicateId = await findRecentDuplicate(supabase, idemKey, idemWindow);
        if (duplicateId) {
          console.warn(`[IDEMPOTENCE] Duplicitní objednávka zachycena, vracím ${duplicateId}`);
          try {
            const { data: dupFile } = await supabase.storage
              .from("pohoda-orders")
              .download(`order_${duplicateId}.json`);
            if (dupFile) {
              const dupObj = JSON.parse(await dupFile.text());
              return new Response(JSON.stringify({
                success: true,
                duplicate: true,
                orderId: duplicateId,
                order: dupObj.order || dupObj
              }), {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              });
            }
          } catch (_dupErr) {}
        }

        generatedOrderId = await getNextInvoiceNumber(supabase);
        await markIdempotencyKey(supabase, idemKey, generatedOrderId);
      }

      const rawOrderObj = {
        ...orderDetails,
        id: generatedOrderId,
        created_at: orderDetails.created_at || new Date().toISOString()
      };

      const normalizedOrderData = normalizeOrder(rawOrderObj);

      // Check if order already exists in storage for overwrite protection & stock deduction status
      const filename = `order_${generatedOrderId}.json`;
      let existingStored: any = null;
      try {
        const { data: existingFile } = await supabase.storage
          .from("pohoda-orders")
          .download(filename);
        if (existingFile) {
          const text = await existingFile.text();
          existingStored = JSON.parse(text);
          if (!normalizedOrderData.items || normalizedOrderData.items.length === 0) {
            return new Response(JSON.stringify({ error: "Order already exists" }), {
              status: 409,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }
      } catch (_eExist) {}

      // BEZPEČNOST: přepočítat ceny z databáze. Klient posílá ceny i celkovou
      // částku ve svém požadavku — bez této kontroly lze objednat cokoli za 1 Kč.
      const priceCheck = await verifyOrderPricing(supabase, normalizedOrderData);
      if (!priceCheck.ok) {
        console.error(
          `[SECURITY] Odmítnuta objednávka ${generatedOrderId}: klient poslal ${priceCheck.received} Kč, ` +
          `server spočítal ${priceCheck.expected} Kč. E-mail: ${normalizedOrderData.customer_email}`
        );
        try {
          const logBytes = new TextEncoder().encode(JSON.stringify({
            at: new Date().toISOString(),
            order_id: generatedOrderId,
            customer_email: normalizedOrderData.customer_email,
            expected: priceCheck.expected,
            received: priceCheck.received,
            items: normalizedOrderData.items
          }, null, 2));
          await supabase.storage
            .from("pohoda-orders")
            .upload(`security/price_mismatch_${generatedOrderId}_${Date.now()}.json`, logBytes, {
              contentType: "application/json", upsert: true
            });
        } catch (_logErr) {}

        return new Response(JSON.stringify({
          error: "Cena objednávky neodpovídá aktuálnímu ceníku. Obnovte prosím stránku a zkuste to znovu.",
          code: "PRICE_MISMATCH"
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // CHYBA 2 FIX: Sklad se odečítá jen tehdy, když u TÉTO objednávky ještě nikdy odečten nebyl.
      const alreadyApplied = existingStored?.order?.stock_applied === true || existingStored?.stock_applied === true;
      if (alreadyApplied) {
        normalizedOrderData.stock_applied = true;
      } else if (!reserveOnly) {
        await applyStockAndDiscount(supabase, normalizedOrderData);
      } else {
        normalizedOrderData.stock_applied = false;
      }

      // Trigger invoice generation and email immediately if not card payment
      const isCardPayment = String(normalizedOrderData.payment_method || '').toLowerCase().includes('kart')
        || String(normalizedOrderData.payment_method || '').toLowerCase().includes('card')
        || String(normalizedOrderData.payment_method || '').toLowerCase().includes('webpay');

      if (!isCardPayment) {
        await triggerPostOrderActions(supabase, supabaseUrl, supabaseServiceKey, normalizedOrderData, false);
      }

      // 2. Save canonical order json to storage (including any invoice_error / email_error flags)
      const encoder = new TextEncoder();
      const storageData = {
        order: normalizedOrderData,
        items: normalizedOrderData.items,
        created_at: normalizedOrderData.created_at
      };

      const fileBytes = encoder.encode(JSON.stringify(storageData, null, 2));
      const { error: uploadError } = await supabase.storage
        .from("pohoda-orders")
        .upload(filename, fileBytes, {
          contentType: "application/json",
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Zrušit opuštěný pokus o platbu kartou pro ten samý košík.
      // Zákazník zkusil kartu, nedoplatil a dokončil objednávku převodem nebo
      // dobírkou — původní záznam je k ničemu a v adminu jen mate.
      //
      // Maže se jen tehdy, když je jisté, že o nic nepřijdeme: jiné číslo,
      // nezaplacená, sklad neodepsaný a stejný zákazník.
      if (supersedes && String(supersedes) !== String(generatedOrderId)) {
        try {
          const staleName = `order_${supersedes}.json`;
          const { data: staleFile } = await supabase.storage
            .from("pohoda-orders")
            .download(staleName);

          if (staleFile) {
            const staleObj = JSON.parse(await staleFile.text());
            const stale = staleObj.order || staleObj;

            const isUnpaid = String(stale.payment_status || "").toLowerCase() !== "paid";
            const stockUntouched = stale.stock_applied !== true && staleObj.stock_applied !== true;
            const sameCustomer = String(stale.customer_email || "").trim().toLowerCase()
              === String(normalizedOrderData.customer_email || "").trim().toLowerCase();

            if (isUnpaid && stockUntouched && sameCustomer) {
              await supabase.storage.from("pohoda-orders").remove([staleName]);
              console.log(`[SUPERSEDE] Zrušen opuštěný pokus ${supersedes}, nahrazen ${generatedOrderId}`);
            } else {
              console.warn(
                `[SUPERSEDE] ${supersedes} ponechán — unpaid:${isUnpaid} stockUntouched:${stockUntouched} sameCustomer:${sameCustomer}`
              );
            }
          }
        } catch (supersedeErr) {
          console.error("Nepodařilo se zrušit opuštěnou objednávku:", supersedeErr);
        }
      }

      // 3. Update profiles table if logged in
      if (normalizedOrderData.user_id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("order_history, store_credit")
          .eq("id", normalizedOrderData.user_id)
          .maybeSingle();

        if (profile) {
          const history = profile.order_history || [];
          const updatedHistory = [slimOrderForHistory(normalizedOrderData), ...history.filter((h: any) => h.id !== normalizedOrderData.id)].slice(0, ORDER_HISTORY_LIMIT);
          const newCredit = Math.max(0, (profile.store_credit || 0) - (normalizedOrderData.credit_applied || 0));

          await supabase
            .from("profiles")
            .update({
              order_history: updatedHistory,
              store_credit: newCredit
            })
            .eq("id", normalizedOrderData.user_id);
        }
      }

      // 5. Trigger Heureka "Ověřeno zákazníky" if enabled
      const heurekaOzEnabled = Deno.env.get("HEUREKA_OZ_ENABLED");
      if (heurekaOzEnabled !== "false" && normalizedOrderData.customer_email) {
        const heurekaOzKey = Deno.env.get("HEUREKA_OZ_KEY");
        if (heurekaOzKey) {
          try {
            const productItemIds = (normalizedOrderData.items || []).map((item: any) => item.product_id || item.id);
            const response = await fetch("https://api.heureka.cz/shop-certification/v2/order/log", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                apiKey: heurekaOzKey,
                email: normalizedOrderData.customer_email,
                orderId: String(normalizedOrderData.id),
                productItemIds,
              }),
            });
            console.log(`Heureka OZ response status: ${response.status}`);
          } catch (heurekaErr) {
            console.error("Failed to trigger Heureka OZ:", heurekaErr);
          }
        }
      }

      return new Response(JSON.stringify({ success: true, orderId: normalizedOrderData.id, order: normalizedOrderData }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action 2: Mark Paid (GP Webpay success callback)
    if (action === "mark_paid") {
      if (!orderId) {
        return new Response(JSON.stringify({ error: "Missing orderId." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { gpWebpayParams } = body;
      if (!gpWebpayParams) {
        return new Response(JSON.stringify({ error: "Missing GP Webpay payment verification parameters." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify GP Webpay signature
      const gpePublicKeyPem = Deno.env.get("GP_WEBPAY_GPE_PUBLIC_KEY");
      if (!gpePublicKeyPem) {
        throw new Error("Missing GP_WEBPAY_GPE_PUBLIC_KEY environment variable.");
      }

      const { 
        MERCHANTNUMBER, 
        OPERATION, 
        ORDERNUMBER, 
        MERORDERNUM, 
        PRCODE, 
        SRCODE, 
        RESULTTEXT, 
        DIGEST 
      } = gpWebpayParams;

      if (!ORDERNUMBER || !PRCODE || !DIGEST || String(ORDERNUMBER) !== String(orderId)) {
        return new Response(JSON.stringify({ error: "Invalid payment parameters or order ID mismatch." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Reconstruct signature verification string (strict order)
      let verifyString = `${OPERATION}|${ORDERNUMBER}`;
      if (MERORDERNUM) {
        verifyString += `|${MERORDERNUM}`;
      }
      verifyString += `|${PRCODE}|${SRCODE}`;
      if (RESULTTEXT) {
        verifyString += `|${RESULTTEXT}`;
      }

      // Import GPE Public Key
      const publicKeyDer = pemToDerBuffer(gpePublicKeyPem, "public");
      const publicKey = await crypto.subtle.importKey(
        "spki",
        publicKeyDer,
        {
          name: "RSASSA-PKCS1-v1_5",
          hash: "SHA-1",
        },
        false,
        ["verify"]
      );

      // Verify the signature
      const encoder = new TextEncoder();
      const isVerified = await crypto.subtle.verify(
        "RSASSA-PKCS1-v1_5",
        publicKey,
        base64ToArrayBuffer(DIGEST),
        encoder.encode(verifyString)
      );

      if (!isVerified || String(PRCODE) !== "0") {
        return new Response(JSON.stringify({ error: "GP Webpay payment verification failed or declined." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fetch the order from storage
      const filename = `order_${orderId}.json`;
      const { data: fileData, error: downloadError } = await supabase.storage
        .from("pohoda-orders")
        .download(filename);

      if (downloadError || !fileData) {
        throw new Error(downloadError?.message || `Failed to download order ${orderId} JSON.`);
      }

      const text = await fileData.text();
      const storageObj = JSON.parse(text);
      const existingOrder = storageObj.order || storageObj;

      // Reconstruct & normalize order details with paid status while preserving all fields
      const updatedOrderObj = {
        ...existingOrder,
        id: orderId,
        payment_status: 'paid',
        paymentStatus: 'paid',
        platba: 'uhrazeno',
        stock_applied: existingOrder.stock_applied === true || storageObj.stock_applied === true,
        items: storageObj.items || existingOrder.items || []
      };

      const normalizedPaidOrder = normalizeOrder(updatedOrderObj);

      // Apply stock deduction and discount code increment on payment confirmation
      await applyStockAndDiscount(supabase, normalizedPaidOrder);

      // Trigger invoice generation and email
      await triggerPostOrderActions(supabase, supabaseUrl, supabaseServiceKey, normalizedPaidOrder, true);

      // Save updated order back to storage
      const storageData = {
        order: normalizedPaidOrder,
        items: normalizedPaidOrder.items,
        created_at: normalizedPaidOrder.created_at
      };

      const saveBytes = encoder.encode(JSON.stringify(storageData, null, 2));
      await supabase.storage
        .from("pohoda-orders")
        .upload(filename, saveBytes, { contentType: "application/json", upsert: true });

      // Update order status inside profiles if user_id is present
      if (normalizedPaidOrder.user_id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("order_history")
          .eq("id", normalizedPaidOrder.user_id)
          .maybeSingle();

        if (profile) {
          const history = profile.order_history || [];
          const updatedHistory = history.map((o: any) => {
            if (String(o.id) === String(orderId)) {
              return { ...o, payment_status: "paid", paymentStatus: "paid", platba: "uhrazeno" };
            }
            return o;
          });

          if (!updatedHistory.some((h: any) => String(h.id) === String(orderId))) {
            updatedHistory.unshift(slimOrderForHistory(normalizedPaidOrder));
          }

          await supabase
            .from("profiles")
            .update({ order_history: updatedHistory.slice(0, ORDER_HISTORY_LIMIT) })
            .eq("id", normalizedPaidOrder.user_id);
        }
      }

      return new Response(JSON.stringify({ success: true, message: `Order ${orderId} marked as paid successfully.`, order: normalizedPaidOrder }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
