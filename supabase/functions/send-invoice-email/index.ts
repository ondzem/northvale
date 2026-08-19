// Ruční odeslání faktury zákazníkovi z administrace.
//
// Proč to existuje: eshop zatím nevystavuje faktury automaticky (viz
// _shared/features.ts → AUTO_INVOICES). Fakturu vystavuje provozovatel ve svém
// účetním systému a odsud ji pošle zákazníkovi — ale ve firemní šabloně, aby
// e-mail vypadal stejně jako ostatní zprávy z eshopu.
//
// Soubor se nikam neukládá: projde jen touto funkcí do e-mailu.
//
// Nasazení: supabase functions deploy send-invoice-email

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { getAuthContext, requireAdmin, isValidEmail, safeField } from "../_shared/auth.ts";
import { wrapInHtmlDocument, renderEmailCard } from "../_shared/email-template.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/**
 * Povolené formáty faktur. Kromě PDF i ISDOC (český standard elektronické
 * faktury, umí ho Pohoda i většina účetních programů), obecné XML a skeny.
 */
const ALLOWED_EXTENSIONS = [
  "pdf",
  "isdoc", "isdocx",   // český standard e-faktury
  "xml",               // obecný XML export z účetnictví
  "zip",               // účetní programy často balí fakturu + přílohy
  "png", "jpg", "jpeg", "webp", "heic",  // sken nebo fotka
  "doc", "docx", "odt",
  "txt", "csv"
];

const MAX_FILES = 5;
const MAX_FILE_BYTES = 5 * 1024 * 1024;   // 5 MB na soubor
const MAX_TOTAL_BYTES = 8 * 1024 * 1024;  // 8 MB celkem (limit poštovních serverů)

/** Odhad velikosti z délky base64 řetězce (bez dekódování celého souboru). */
function base64Bytes(content: string): number {
  const clean = String(content || "").replace(/\s/g, "");
  const padding = (clean.match(/=+$/) || [""])[0].length;
  return Math.max(0, Math.floor((clean.length * 3) / 4) - padding);
}

function fileExtension(name: string): string {
  const parts = String(name || "").toLowerCase().split(".");
  return parts.length > 1 ? parts.pop()! : "";
}

/** Zabrání vložení cizí cesty do názvu přílohy. */
function safeFileName(name: string): string {
  return String(name || "faktura")
    .replace(/[\/\\]/g, "_")
    .replace(/[^\w.\- ]/g, "_")
    .slice(0, 120);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Odeslat fakturu smí jen administrátor.
    const ctx = await getAuthContext(req, supabase, serviceKey);
    const denied = requireAdmin(ctx, corsHeaders);
    if (denied) return denied;

    const brevoApiKey = Deno.env.get("BREVO_API_KEY");
    if (!brevoApiKey) throw new Error("Missing BREVO_API_KEY environment variable.");
    const senderEmail = Deno.env.get("BREVO_SENDER_EMAIL") || "info@northvaletcg.eu";
    const senderName = Deno.env.get("BREVO_SENDER_NAME") || "NORTHVALE TCG";

    const body = await req.json();
    const orderId = String(body?.orderId || "").trim();
    const recipient = String(body?.email || "").trim();
    const customerName = String(body?.name || "").trim();
    const note = String(body?.note || "").trim();
    const attachments = Array.isArray(body?.attachments) ? body.attachments : [];

    // --- Validace vstupu -----------------------------------------------
    if (!isValidEmail(recipient)) {
      return new Response(JSON.stringify({ error: "Neplatná e-mailová adresa příjemce." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (attachments.length === 0) {
      return new Response(JSON.stringify({ error: "Nebyl přiložen žádný soubor s fakturou." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (attachments.length > MAX_FILES) {
      return new Response(JSON.stringify({ error: `Najednou lze poslat nejvýše ${MAX_FILES} souborů.` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    let totalBytes = 0;
    const brevoAttachments: Array<{ name: string; content: string }> = [];

    for (const att of attachments) {
      const rawName = String(att?.name || "").trim();
      const content = String(att?.content || "").replace(/\s/g, "");
      const ext = fileExtension(rawName);

      if (!rawName || !content) {
        return new Response(JSON.stringify({ error: "Některá příloha je poškozená nebo prázdná." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        return new Response(JSON.stringify({
          error: `Formát „.${ext}“ není podporovaný. Povolené formáty: ${ALLOWED_EXTENSIONS.join(", ")}.`
        }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const size = base64Bytes(content);
      if (size > MAX_FILE_BYTES) {
        return new Response(JSON.stringify({
          error: `Soubor „${rawName}“ je příliš velký (max. 5 MB na soubor).`
        }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      totalBytes += size;
      if (totalBytes > MAX_TOTAL_BYTES) {
        return new Response(JSON.stringify({
          error: "Přílohy dohromady přesahují 8 MB. Pošlete je prosím ve dvou e-mailech."
        }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      brevoAttachments.push({ name: safeFileName(rawName), content });
    }

    // --- Sestavení e-mailu ---------------------------------------------
    // Pozn.: vše, co pochází z formuláře, se escapuje — do těla e-mailu se nesmí
    // dostat cizí HTML.
    const safeName = safeField(customerName, 120);
    const safeOrderId = safeField(orderId, 40);
    const greeting = safeName ? `Dobrý den, ${safeName},` : "Dobrý den,";

    const introText = safeOrderId
      ? `v příloze tohoto e-mailu Vám zasíláme fakturu (daňový doklad) k Vaší objednávce <strong>#${safeOrderId}</strong>.`
      : "v příloze tohoto e-mailu Vám zasíláme fakturu (daňový doklad) k Vašemu nákupu.";

    const fileList = brevoAttachments
      .map(a => `<li style="margin-bottom: 4px;">${safeField(a.name, 120)}</li>`)
      .join("");

    const emailBody = `
      <p style="font-size: 14.5px; color: #222222; line-height: 1.6; margin: 0 0 24px 0;">
        ${greeting}<br/><br/>
        ${introText}
      </p>

      <div style="background-color: #fdfdfd; border: 1px solid #e1e4e8; border-left: 4px solid #fdbd16; padding: 22px; margin-bottom: 24px; border-radius: 8px;">
        <div style="color: #666666; font-size: 12px; font-weight: 600; text-transform: uppercase; margin-bottom: 10px;">
          Přiložené dokumenty
        </div>
        <ul style="font-size: 14px; color: #111111; margin: 0; padding-left: 20px; line-height: 1.6;">
          ${fileList}
        </ul>
      </div>

      ${note ? `
      <p style="font-size: 14.5px; color: #222222; line-height: 1.6; margin: 0 0 24px 0;">
        ${safeField(note, 1500).replace(/\n/g, "<br/>")}
      </p>` : ""}

      <p style="font-size: 14px; color: #666666; line-height: 1.6; margin: 0 0 24px 0;">
        Doklad si prosím uschovejte. Pokud by cokoli na faktuře nesedělo, dejte nám vědět a rádi to opravíme.
      </p>
    `;

    const html = wrapInHtmlDocument(renderEmailCard({
      emoji: "🧾",
      title: "Faktura k Vaší objednávce",
      subtitle: safeOrderId ? `Číslo objednávky: <strong style="color: #fdbd16;">#${safeOrderId}</strong>` : undefined,
      body: emailBody
    }));

    const subject = safeOrderId
      ? `Faktura k objednávce #${safeOrderId} — NORTHVALE TCG`
      : "Faktura — NORTHVALE TCG";

    // --- Odeslání přes Brevo -------------------------------------------
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": brevoApiKey,
        "content-type": "application/json",
        "accept": "application/json"
      },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: [{ email: recipient, name: customerName || recipient }],
        subject,
        htmlContent: html,
        attachment: brevoAttachments
      })
    });

    const responseText = await res.text();
    if (!res.ok) {
      console.error(`[send-invoice-email] Brevo HTTP ${res.status}: ${responseText}`);
      return new Response(JSON.stringify({
        error: "E-mail se nepodařilo odeslat. Zkuste to prosím znovu.",
        detail: responseText.slice(0, 300)
      }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // --- Poznámka do objednávky, aby se faktura neposlala dvakrát -------
    // Selhání zápisu nesmí shodit už odeslaný e-mail — jen se zaloguje.
    let sentAt = new Date().toISOString();
    if (orderId) {
      try {
        const fileName = `order_${orderId}.json`;
        const { data: file } = await supabase.storage.from("pohoda-orders").download(fileName);
        if (file) {
          const jsonObj = JSON.parse(await file.text());
          const target = jsonObj.order ? jsonObj.order : jsonObj;
          target.invoice_sent_at = sentAt;
          target.invoice_sent_to = recipient;
          const bytes = new TextEncoder().encode(JSON.stringify(jsonObj, null, 2));
          await supabase.storage
            .from("pohoda-orders")
            .upload(fileName, bytes, { contentType: "application/json", upsert: true });
        }
      } catch (markErr) {
        console.error("[send-invoice-email] Nepodařilo se označit objednávku jako odeslanou:", markErr);
      }
    }

    return new Response(JSON.stringify({ success: true, sentTo: recipient, sentAt }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err: any) {
    console.error("[send-invoice-email] Unexpected error:", err);
    return new Response(JSON.stringify({ error: err?.message || "Neznámá chyba." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
