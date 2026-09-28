/**
 * Hlídací pes u produktů.
 *
 *   POST {action:"subscribe"}  — zákazník si nastaví hlídání (veřejné, chráněno Turnstile + honeypot)
 *   GET  ?action=unsubscribe&token=…  — odkaz „zrušit hlídání“ z e-mailu
 *   POST {action:"run"}        — kontrola všech hlídání a rozeslání e-mailů;
 *                                volá pg_cron každých 15 min (hlavička x-cron-secret)
 *                                nebo admin. {dryRun:true} jen vrátí, co by se odeslalo.
 *
 * Hlídání se splní, jen když se produkt dá opravdu koupit (je skladem / na objednávku):
 *   stock — produkt je znovu skladem
 *   sale  — produkt je v akci (aktivní „akce“ z tabulky daily_deal)
 *   price — aktuální cena ≤ zákazníkův limit
 * Každé hlídání pošle jediný e-mail a pak skončí (notified_at).
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyTurnstile, callerIp, isHoneypotFilled, shouldAllow } from "../_shared/turnstile.ts";
import { getAuthContext, isValidEmail, escapeHtml } from "../_shared/auth.ts";
import { wrapInHtmlDocument, renderEmailCard } from "../_shared/email-template.ts";

const SITE = "https://northvaletcg.eu";
const FN_URL = "https://bfxzhggjpiyqfolqpxzz.supabase.co/functions/v1/product-watchdog";
const MAX_EMAILS_PER_RUN = 200;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const kc = (n: number) => `${Math.round(n).toLocaleString("cs-CZ")} Kč`;
const productUrl = (id: string) => `${SITE}/sealed-detail/${encodeURIComponent(id)}/`;
const unsubscribeUrl = (token: string) => `${FN_URL}?action=unsubscribe&token=${token}`;

/** Dá se produkt koupit? (skladem, některá varianta skladem, nebo zboží na objednávku) */
function isAvailable(p: any): boolean {
  if (!p) return false;
  if (p.on_order) return true;
  if (Array.isArray(p.variants) && p.variants.length > 0 && p.type === "single") {
    return p.variants.some((v: any) => Number(v?.stock || 0) > 0);
  }
  return Number(p.stock || 0) > 0;
}

/** Aktivní akce podle produktu: { product_id: { price, original_price } } */
async function loadActiveDeals(supabase: any): Promise<Record<string, { price: number; original: number }>> {
  const { data: deals } = await supabase.from("daily_deal").select("id, product_id, price, original_price, ends_at");
  let config: Record<string, any> = {};
  try {
    const { data: file } = await supabase.storage.from("pohoda-orders").download("daily_deals_config.json");
    if (file) config = JSON.parse(await file.text());
  } catch (_e) { /* bez konfigurace platí jen ends_at */ }

  const now = Date.now();
  const out: Record<string, { price: number; original: number }> = {};
  for (const d of deals || []) {
    if (!d.product_id) continue;
    const starts = config[d.id]?.starts_at ? new Date(config[d.id].starts_at).getTime() : 0;
    const endsRaw = config[d.id]?.ends_at || d.ends_at;
    const ends = endsRaw ? new Date(endsRaw).getTime() : 0;
    if (starts && now < starts) continue;
    if (ends && now > ends) continue;
    const price = Number(d.price), original = Number(d.original_price);
    if (!(price > 0) || !(original > price)) continue;
    out[d.product_id] = { price, original };
  }
  return out;
}

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const apiKey = Deno.env.get("BREVO_API_KEY");
  if (!apiKey) { console.error("[product-watchdog] chybí BREVO_API_KEY"); return false; }
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": apiKey, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      sender: {
        name: Deno.env.get("BREVO_SENDER_NAME") || "NORTHVALE TCG",
        email: Deno.env.get("BREVO_SENDER_EMAIL") || "info@northvaletcg.eu",
      },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  });
  if (!res.ok) console.error(`[product-watchdog] Brevo ${res.status}: ${await res.text()}`);
  return res.ok;
}

const WHAT: Record<string, { cz: string; en: string }> = {
  stock: { cz: "až bude znovu skladem", en: "when it is back in stock" },
  sale: { cz: "až bude v akci", en: "when it goes on sale" },
  price: { cz: "až cena klesne pod Váš limit", en: "when the price drops below your limit" },
};

/*
 * Vzhled e-mailů je sjednocený s ostatními e-maily e-shopu (send-order-email):
 * sdílená karta renderEmailCard, oslovení „Dobrý den,“, údaje v šedém boxu
 * s barevným proužkem a zlaté tlačítko se stejným stylem.
 */
const P = 'font-size: 14.5px; color: #222222; line-height: 1.6; margin: 0 0 24px 0;';
const P_MUTED = 'font-size: 14px; color: #666666; line-height: 1.6; margin: 0 0 24px 0;';

function button(url: string, label: string) {
  return `<div style="text-align: center; margin: 0 0 24px 0;">
    <a href="${url}" target="_blank" style="background-color: #fdbd16; color: #111111; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block; border: 1px solid #e2a80f; box-shadow: 0 2px 4px rgba(253, 189, 22, 0.15);">${label}</a>
  </div>`;
}

/** Box s produktem — stejný jako box „Daňový doklad“ v e-mailu objednávky (zlatý proužek nahoře). */
function productBox(label: string, name: string, detail: string) {
  return `<div style="background-color: #fdfdfd; border: 1px solid #e1e4e8; border-top: 4px solid #fdbd16; padding: 22px; margin-bottom: 24px; border-radius: 8px; text-align: center;">
    <div style="color: #666666; font-size: 12px; font-weight: 600; text-transform: uppercase; margin-bottom: 6px;">${label}</div>
    <div style="font-size: 17px; font-weight: 800; color: #111111; margin-bottom: 8px;">${name}</div>
    <div style="font-size: 14px; color: #444444; line-height: 1.5;">${detail}</div>
  </div>`;
}

/** Patička zákaznických e-mailů: kontakt jako všude + zrušení hlídání. */
function customerFooter(token: string | null, cz: boolean) {
  const contact = cz
    ? `V případě dotazů nás kontaktujte na <a href="mailto:info@northvaletcg.eu" style="color: #fdbd16; text-decoration: underline; font-weight: bold;">info@northvaletcg.eu</a>.`
    : `If you have any questions, contact us at <a href="mailto:info@northvaletcg.eu" style="color: #fdbd16; text-decoration: underline; font-weight: bold;">info@northvaletcg.eu</a>.`;
  if (!token) return contact;
  return `${contact}<br/>${cz ? "Hlídání už nechcete?" : "No longer interested?"}
    <a href="${unsubscribeUrl(token)}" style="color: #888888; text-decoration: underline;">${cz ? "Zrušit hlídání" : "Cancel watchdog"}</a>`;
}

function confirmationEmail(w: any, product: any) {
  const cz = w.lang !== "EN";
  const name = escapeHtml(product.name);
  const what = (cz ? WHAT[w.type].cz : WHAT[w.type].en)
    + (w.type === "price" ? ` (${kc(w.price_limit)})` : "");
  const body = `
    <p style="${P}">
      ${cz ? "Dobrý den," : "Hello,"}<br/><br/>
      ${cz
        ? `děkujeme za Váš zájem. Produkt <strong>${name}</strong> pro Vás hlídáme a ozveme se e-mailem, jakmile nastane, co jste si nastavili.`
        : `thank you for your interest. We are watching <strong>${name}</strong> for you and will e-mail you as soon as your condition is met.`}
    </p>
    ${productBox(cz ? "Hlídáme produkt" : "Watching product", name, `${cz ? "Upozorníme Vás" : "We will notify you"} <strong>${what}</strong>.`)}
    ${button(productUrl(product.id), cz ? "Zobrazit produkt" : "View product")}
    <p style="${P_MUTED}">
      ${cz
        ? "Upozornění pošleme jen jednou — tím hlídání skončí. Pokud o produkt už nemáte zájem, můžete hlídání kdykoli zrušit odkazem níže."
        : "We send the alert only once — then the watchdog ends. You can cancel it anytime using the link below."}
    </p>`;
  return wrapInHtmlDocument(renderEmailCard({
    emoji: "🔔",
    title: cz ? "Hlídání je nastavené" : "Watchdog is set",
    subtitle: name,
    body,
    footer: customerFooter(w.unsubscribe_token, cz),
  }));
}

function triggeredEmail(w: any, product: any, deal: { price: number; original: number } | undefined) {
  const cz = w.lang !== "EN";
  const name = escapeHtml(product.name);
  const price = deal ? deal.price : Number(product.price || 0);
  const title = w.type === "stock"
    ? (cz ? "Je zase skladem!" : "Back in stock!")
    : w.type === "sale" ? (cz ? "Produkt je v akci!" : "Now on sale!")
    : (cz ? "Cena klesla!" : "Price dropped!");
  const intro = w.type === "stock"
    ? (cz ? `máme dobrou zprávu — produkt <strong>${name}</strong>, který jste si hlídali, je znovu skladem.` : `good news — <strong>${name}</strong>, which you were watching, is back in stock.`)
    : w.type === "sale"
    ? (cz ? `produkt <strong>${name}</strong>, který jste si hlídali, je právě v akci.` : `<strong>${name}</strong>, which you were watching, is now on sale.`)
    : (cz ? `cena produktu <strong>${name}</strong>, který jste si hlídali, klesla pod Váš limit ${kc(w.price_limit)}.` : `the price of <strong>${name}</strong> dropped below your limit of ${kc(w.price_limit)}.`);
  const priceHtml = deal
    ? `<span style="text-decoration: line-through; color: #999999;">${kc(deal.original)}</span> <strong>${kc(deal.price)}</strong>`
    : `<strong>${kc(price)}</strong>`;
  const body = `
    <p style="${P}">
      ${cz ? "Dobrý den," : "Hello,"}<br/><br/>
      ${intro}
    </p>
    <div style="background-color: #fdfdfd; border: 1px solid #e1e4e8; border-left: 4px solid #10b981; padding: 22px; margin-bottom: 24px; border-radius: 8px;">
      <p style="font-size: 14.5px; color: #111111; margin: 0; line-height: 1.6;">
        ${cz ? "Produkt" : "Product"}: <strong>${name}</strong><br/>
        ${cz ? "Cena" : "Price"}: ${priceHtml}<br/>
        ${cz ? "Dostupnost" : "Availability"}: <strong style="color: #10b981;">${product.on_order ? (cz ? "Na objednávku" : "Made to order") : (cz ? "Skladem" : "In stock")}</strong>
      </p>
    </div>
    ${button(productUrl(product.id), cz ? "Koupit nyní" : "Buy now")}
    <p style="${P_MUTED}">
      ${cz
        ? "Zásoby bývají omezené, doporučujeme neotálet. Tímto e-mailem hlídání skončilo — chcete-li produkt hlídat znovu, nastavte si ho na stránce produktu."
        : "Stock is often limited, so don't wait too long. This watchdog has now ended — you can set a new one on the product page."}
    </p>`;
  return {
    subject: `${title} ${product.name}`,
    html: wrapInHtmlDocument(renderEmailCard({
      emoji: w.type === "stock" ? "📦" : "🏷️",
      title,
      subtitle: name,
      body,
      footer: customerFooter(null, cz),
    })),
  };
}

function adminEmail(w: any, product: any, counts: { total: number; stock: number; sale: number; price: number }) {
  const what = WHAT[w.type].cz + (w.type === "price" ? ` (${kc(w.price_limit)})` : "");
  const row = (label: string, value: string, last = false) => `<tr${last ? "" : ' style="border-bottom: 1px solid #e1e4e8;"'}>
      <td style="padding: 10px 0; font-weight: bold; width: 170px; color: #666666;">${label}</td>
      <td style="padding: 10px 0; color: #111111;">${value}</td>
    </tr>`;
  const body = `
    <p style="${P}">
      Dobrý den,<br/><br/>
      zákazník si právě nastavil hlídání produktu <strong>${escapeHtml(product.name)}</strong> — ${what}.
    </p>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13.5px; line-height: 1.6;">
      ${row("Celkem hlídá", `<strong style="color: #fdbd16; font-size: 16px;">${counts.total}×</strong>`)}
      ${row("Až bude skladem", String(counts.stock))}
      ${row("Až bude v akci", String(counts.sale))}
      ${row("Cenový limit", String(counts.price), true)}
    </table>
    ${button(productUrl(product.id), "Zobrazit produkt")}
    <p style="${P_MUTED}">Přehled všech hlídaných produktů najdete v Administraci → Produkty → tlačítko „Hlídané“.</p>`;
  return wrapInHtmlDocument(renderEmailCard({
    emoji: "🔔",
    title: "Nový hlídací pes",
    subtitle: escapeHtml(product.name),
    body,
    footer: "Tento e-mail byl automaticky vygenerován systémem NORTHVALE.",
  }));
}

function htmlPage(title: string, text: string) {
  return new Response(`<!doctype html><html lang="cs"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} | NORTHVALE TCG</title></head>
<body style="margin:0;background:#18181C;color:#F0F0F0;font-family:Inter,-apple-system,Segoe UI,Roboto,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;">
<div style="max-width:440px;width:100%;background:#222228;border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:32px;text-align:center;">
<div style="color:#FDBD16;font-weight:800;letter-spacing:2px;margin-bottom:18px;">NORTHVALE</div>
<h1 style="font-size:20px;margin:0 0 10px;">${title}</h1>
<p style="color:#888896;font-size:14px;line-height:1.6;margin:0 0 22px;">${text}</p>
<a href="${SITE}" style="display:inline-block;background:#FDBD16;color:#111;font-weight:700;text-decoration:none;padding:12px 26px;border-radius:8px;">Zpět do obchodu</a>
</div></body></html>`, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    // ── Zrušení hlídání z odkazu v e-mailu ──────────────────────────────
    if (req.method === "GET") {
      const url = new URL(req.url);
      if (url.searchParams.get("action") !== "unsubscribe") return json({ error: "Unknown action" }, 400);
      const token = url.searchParams.get("token") || "";
      if (!/^[0-9a-f-]{36}$/i.test(token)) return htmlPage("Neplatný odkaz", "Odkaz pro zrušení hlídání není platný.");
      await supabase.from("product_watchdogs")
        .update({ cancelled_at: new Date().toISOString() })
        .eq("unsubscribe_token", token)
        .is("cancelled_at", null);
      return htmlPage("Hlídání je zrušené", "Už Vám k tomuto produktu nebudeme posílat upozornění.");
    }

    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
    const body = await req.json().catch(() => ({}));
    const action = body?.action;

    // ── Nastavení hlídání ────────────────────────────────────────────────
    if (action === "subscribe") {
      if (isHoneypotFilled(body)) return json({ error: "Požadavek se nepodařilo ověřit." }, 400);
      const turnstile = await verifyTurnstile(body.turnstileToken, callerIp(req));
      if (!shouldAllow(turnstile, "product-watchdog")) return json({ error: "Ověření se nezdařilo. Obnovte prosím stránku." }, 403);

      const email = String(body.email || "").trim().toLowerCase();
      const type = String(body.type || "");
      const productId = String(body.productId || "").trim();
      const lang = body.lang === "EN" ? "EN" : "CZ";
      const priceLimit = type === "price" ? Number(body.priceLimit) : null;

      if (!isValidEmail(email)) return json({ error: lang === "CZ" ? "Zadejte prosím platný e-mail." : "Please enter a valid e-mail." }, 400);
      if (!["stock", "sale", "price"].includes(type)) return json({ error: "Neplatný typ hlídání." }, 400);
      if (type === "price" && !(priceLimit! > 0)) return json({ error: lang === "CZ" ? "Zadejte prosím cenový limit." : "Please enter a price limit." }, 400);
      if (!productId || productId.length > 200) return json({ error: "Neplatný produkt." }, 400);

      const { data: product } = await supabase.from("products")
        .select("id, name, price, stock, variants, type, on_order").eq("id", productId).maybeSingle();
      if (!product) return json({ error: "Produkt nebyl nalezen." }, 404);

      if (type === "stock" && isAvailable(product)) {
        return json({ error: lang === "CZ" ? "Tento produkt je právě skladem — můžete ho rovnou objednat." : "This product is in stock right now." }, 400);
      }
      if (type === "price" && isAvailable(product) && Number(product.price) <= priceLimit!) {
        return json({ error: lang === "CZ" ? "Produkt už teď stojí méně než Váš limit." : "The price is already below your limit." }, 400);
      }

      // Ochrana proti zahlcení: nejvýš 20 aktivních hlídání na e-mail
      const { count } = await supabase.from("product_watchdogs")
        .select("id", { count: "exact", head: true })
        .eq("email", email).is("notified_at", null).is("cancelled_at", null);
      if ((count || 0) >= 20) return json({ error: lang === "CZ" ? "Máte nastaveno příliš mnoho hlídání." : "Too many active watchdogs." }, 429);

      let userId: string | null = null;
      try {
        const ctx = await getAuthContext(req, supabase, serviceKey);
        userId = ctx.user?.id || null;
      } catch (_e) { /* nepřihlášený zákazník */ }

      const { data: inserted, error: insErr } = await supabase.from("product_watchdogs")
        .insert({ product_id: productId, email, type, price_limit: priceLimit, lang, user_id: userId })
        .select("*").maybeSingle();

      if (insErr) {
        // 23505 = už hlídá totéž — pro zákazníka je to úspěch, jen nic neposíláme znovu
        if ((insErr as any).code === "23505") return json({ success: true, already: true });
        throw insErr;
      }

      // Potvrzení zákazníkovi + upozornění obchodu (s počtem zájemců)
      const { data: active } = await supabase.from("product_watchdogs")
        .select("type").eq("product_id", productId).is("notified_at", null).is("cancelled_at", null);
      const counts = {
        total: active?.length || 0,
        stock: active?.filter((a: any) => a.type === "stock").length || 0,
        sale: active?.filter((a: any) => a.type === "sale").length || 0,
        price: active?.filter((a: any) => a.type === "price").length || 0,
      };
      await sendEmail(email, lang === "CZ" ? `Hlídání nastaveno: ${product.name}` : `Watchdog set: ${product.name}`, confirmationEmail(inserted, product));
      const shopEmail = Deno.env.get("BREVO_RECIPIENT_EMAIL") || "info@northvaletcg.eu";
      await sendEmail(shopEmail, `[Hlídací pes] ${product.name} — hlídá ${counts.total}×`, adminEmail(inserted, product, counts));

      return json({ success: true, total: counts.total });
    }

    // ── Kontrola a rozeslání ─────────────────────────────────────────────
    if (action === "run") {
      const cronSecret = Deno.env.get("WATCHDOG_CRON_SECRET") || "";
      const fromCron = cronSecret && req.headers.get("x-cron-secret") === cronSecret;
      if (!fromCron) {
        const ctx = await getAuthContext(req, supabase, serviceKey);
        if (!ctx.isAdmin) return json({ error: "Forbidden" }, 403);
      }
      const dryRun = body.dryRun === true;

      const { data: pending } = await supabase.from("product_watchdogs")
        .select("*").is("notified_at", null).is("cancelled_at", null)
        .order("created_at", { ascending: true }).limit(2000);
      if (!pending?.length) return json({ success: true, checked: 0, sent: 0 });

      const productIds = [...new Set(pending.map((w: any) => w.product_id))];
      const { data: products } = await supabase.from("products")
        .select("id, name, price, stock, variants, type, on_order").in("id", productIds);
      const byId: Record<string, any> = Object.fromEntries((products || []).map((p: any) => [p.id, p]));
      const deals = await loadActiveDeals(supabase);

      const due: any[] = [];
      for (const w of pending) {
        const p = byId[w.product_id];
        if (!p || !isAvailable(p)) continue;
        const deal = deals[p.id];
        const effective = deal ? deal.price : Number(p.price || 0);
        if (w.type === "stock"
          || (w.type === "sale" && deal)
          || (w.type === "price" && effective > 0 && effective <= Number(w.price_limit))) {
          due.push({ w, p, deal });
        }
      }

      if (dryRun) {
        return json({ success: true, dryRun: true, checked: pending.length, due: due.map(d => ({ product: d.p.id, type: d.w.type })) });
      }

      let sent = 0;
      for (const { w, p, deal } of due.slice(0, MAX_EMAILS_PER_RUN)) {
        const mail = triggeredEmail(w, p, deal);
        if (await sendEmail(w.email, mail.subject, mail.html)) {
          await supabase.from("product_watchdogs").update({ notified_at: new Date().toISOString() }).eq("id", w.id);
          sent++;
        }
      }
      console.log(`[product-watchdog] zkontrolováno ${pending.length}, splněno ${due.length}, odesláno ${sent}`);
      return json({ success: true, checked: pending.length, due: due.length, sent });
    }

    // ── Náhled e-mailů (jen admin / cron secret) ─────────────────────────
    if (action === "preview") {
      const cronSecret = Deno.env.get("WATCHDOG_CRON_SECRET") || "";
      const fromCron = cronSecret && req.headers.get("x-cron-secret") === cronSecret;
      if (!fromCron) {
        const ctx = await getAuthContext(req, supabase, serviceKey);
        if (!ctx.isAdmin) return json({ error: "Forbidden" }, 403);
      }
      const to = String(body.to || "").trim().toLowerCase();
      if (!isValidEmail(to)) return json({ error: "Neplatný e-mail" }, 400);
      const { data: product } = await supabase.from("products")
        .select("id, name, price, stock, variants, type, on_order").eq("id", String(body.productId || "")).maybeSingle();
      if (!product) return json({ error: "Produkt nenalezen" }, 404);
      const sample = { type: "stock", lang: "CZ", price_limit: null, unsubscribe_token: "00000000-0000-0000-0000-000000000000" };
      const trig = triggeredEmail(sample, product, undefined);
      const results = {
        potvrzeni: await sendEmail(to, `[NÁHLED] Hlídání nastaveno: ${product.name}`, confirmationEmail(sample, product)),
        skladem: await sendEmail(to, `[NÁHLED] ${trig.subject}`, trig.html),
        obchod: await sendEmail(to, `[NÁHLED] [Hlídací pes] ${product.name} — hlídá 3×`, adminEmail(sample, product, { total: 3, stock: 2, sale: 1, price: 0 })),
      };
      return json({ success: true, results });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    console.error("[product-watchdog] chyba:", err);
    return json({ error: "Hlídání se nepodařilo uložit. Zkuste to prosím znovu." }, 500);
  }
});
