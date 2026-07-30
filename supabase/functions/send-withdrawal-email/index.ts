// Supabase Edge Function to send email confirmation for order withdrawals via Brevo API
// Deploy via Supabase CLI: supabase functions deploy send-withdrawal-email

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function wrapInHtmlDocument(innerContent: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <style>
    :root {
      color-scheme: light;
      supported-color-schemes: light;
    }
    body {
      background-color: #f5f6f8 !important;
      margin: 0;
      padding: 0;
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
  </style>
</head>
<body style="background-color: #f5f6f8; margin: 0; padding: 0;">
  ${innerContent}
</body>
</html>`;
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Load configuration
    const brevoApiKey = Deno.env.get("BREVO_API_KEY");
    const senderEmail = Deno.env.get("BREVO_SENDER_EMAIL") || "info@northvaletcg.eu";
    const senderName = Deno.env.get("BREVO_SENDER_NAME") || "NORTHVALE TCG";
    const recipientEmail = Deno.env.get("BREVO_RECIPIENT_EMAIL") || "info@northvaletcg.eu";

    if (!brevoApiKey) {
      throw new Error("Missing BREVO_API_KEY environment variable in Supabase dashboard.");
    }

    const { orderNumber, email, bankAccount, returnType, partialItemsText, refundMethod, lang, fullName } = await req.json();

    if (!orderNumber || !email || !refundMethod || !returnType) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isCzech = lang === "CZ";

    const refundMethodLabel = refundMethod === "bank" 
      ? (isCzech ? `Bankovní převod (na účet: ${bankAccount || '—'})` : `Bank Transfer (to account: ${bankAccount || '—'})`)
      : (isCzech ? "Původní platební karta (přes GP webpay)" : "Original payment card (via GP webpay)");

    const returnTypeLabel = returnType === "celou"
      ? (isCzech ? "Celá objednávka" : "Entire order")
      : (isCzech ? `Část objednávky (položky: ${partialItemsText || '—'})` : `Partial return (items: ${partialItemsText || '—'})`);

    // 1. Customer Confirmation Email HTML (White card theme matching send-order-email)
    const customerHtmlInner = `
      <div style="background-color: #f5f6f8; padding: 40px 10px; font-family: 'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; min-height: 100%;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e1e4e8; border-radius: 12px; padding: 40px 30px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); color: #222222;">
          
          <!-- Logo Header -->
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #fdbd16; font-size: 26px; font-weight: 800; margin: 0; letter-spacing: 2px; text-transform: uppercase;">NORTHVALE</h1>
            <p style="color: #8a8a92; font-size: 11px; text-transform: uppercase; letter-spacing: 4px; margin: 3px 0 0 0;">Trading Card Games</p>
          </div>
          
          <div style="text-align: center; margin-bottom: 24px; font-size: 54px;">
            📄
          </div>

          <!-- Header Title -->
          <div style="text-align: center; margin-bottom: 30px;">
            <h2 style="color: #111111; font-size: 24px; font-weight: 800; margin: 0; letter-spacing: -0.5px;">${isCzech ? "Potvrzení o odstoupení od smlouvy" : "Order Withdrawal Confirmation"}</h2>
            <p style="font-size: 14px; color: #888888; margin: 8px 0 0 0;">${isCzech ? "Číslo objednávky:" : "Order Number:"} <strong style="color: #fdbd16;">#${orderNumber}</strong></p>
          </div>

          <p style="font-size: 14.5px; color: #222222; line-height: 1.6; margin: 0 0 24px 0;">
            ${isCzech 
              ? `Vážený/á <strong>${fullName || 'zákazníku'}</strong>,<br/><br/>potvrzujeme přijetí Vašeho elektronického oznámení o odstoupení od kupní smlouvy pro objednávku <strong>#${orderNumber}</strong>. Níže naleznete rekapitulaci zadaných údajů:` 
              : `Dear <strong>${fullName || 'Customer'}</strong>,<br/><br/>we confirm receipt of your electronic request to withdraw from the purchase agreement for order <strong>#${orderNumber}</strong>. Here is a summary of the details you submitted:`}
          </p>

          <div style="background-color: #fdfdfd; border: 1px solid #e1e4e8; border-left: 4px solid #fdbd16; padding: 20px; margin-bottom: 24px; border-radius: 8px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 13.5px; line-height: 1.6;">
              <tr style="border-bottom: 1px solid #f0f0f0;">
                <td style="padding: 8px 0; font-weight: bold; color: #666666;">${isCzech ? "Jméno a příjmení" : "Name"}:</td>
                <td style="padding: 8px 0; text-align: right; color: #111111; font-weight: 600;">${fullName || '—'}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f0f0f0;">
                <td style="padding: 8px 0; font-weight: bold; color: #666666;">${isCzech ? "Číslo objednávky" : "Order Number"}:</td>
                <td style="padding: 8px 0; text-align: right; color: #fdbd16; font-weight: bold;">#${orderNumber}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f0f0f0;">
                <td style="padding: 8px 0; font-weight: bold; color: #666666;">${isCzech ? "E-mailová adresa" : "Email"}:</td>
                <td style="padding: 8px 0; text-align: right; color: #111111;">${email}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f0f0f0;">
                <td style="padding: 8px 0; font-weight: bold; color: #666666;">${isCzech ? "Rozsah vrácení" : "Scope of Return"}:</td>
                <td style="padding: 8px 0; text-align: right; color: #111111;">${returnTypeLabel}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #666666;">${isCzech ? "Způsob vrácení peněz" : "Refund Method"}:</td>
                <td style="padding: 8px 0; text-align: right; color: #111111; font-weight: 600;">${refundMethodLabel}</td>
              </tr>
            </table>
          </div>

          <div style="background-color: #f8f9fa; border: 1px solid #e1e4e8; border-radius: 8px; padding: 22px; margin-bottom: 24px;">
            <h4 style="margin: 0 0 12px 0; color: #111111; font-size: 14px; font-weight: 700;">${isCzech ? "Co dělat nyní? (Následující kroky)" : "What to do next?"}</h4>
            <ol style="margin: 0; padding-left: 20px; color: #444444; font-size: 13.5px; line-height: 1.7;">
              <li style="margin-bottom: 10px;">
                <strong>${isCzech ? "Bezpečně zabalte vrácené produkty." : "Pack the returned products securely."}</strong><br/>
                ${isCzech 
                  ? "Doporučujeme pro kusové karty použít soft sleeve a toploader a pro balené produkty pevnou krabici s výplní." 
                  : "For singles, use soft sleeves and toploaders; for boxed products, use a sturdy box with filler."}
              </li>
              <li style="margin-bottom: 10px;">
                <strong>${isCzech ? "Odešlete zboží k nám." : "Ship the goods to us."}</strong><br/>
                ${isCzech ? "Zboží odešlete bez zbytečného odkladu (nejpozději do 14 dnů) na adresu:" : "Ship without delay (within 14 days) to:"}<br/>
                <div style="background-color: #ffffff; border: 1px solid #e1e4e8; padding: 10px 14px; border-radius: 6px; margin-top: 6px; font-weight: 600; color: #111111; font-size: 13px; line-height: 1.5;">
                  NORTHVALE s.r.o.<br/>
                  Bratří Čapků 1095<br/>
                  534 01 Holice, Česká republika
                </div>
              </li>
              <li>
                <strong>${isCzech ? "Kontrola a vrácení prostředků." : "Inspection and Payout."}</strong><br/>
                ${isCzech 
                  ? "Jakmile balíček převezmeme, zkontrolujeme stav zboží. Do 14 dnů od převzetí Vám vrátíme peníze zvolenou metodou." 
                  : "Once received, we will inspect the items and refund your money within 14 days."}
              </li>
            </ol>
          </div>

          <!-- Footer Details -->
          <div style="text-align: center; border-top: 1px solid #e1e4e8; padding-top: 24px; margin-top: 30px;">
            <p style="font-size: 11px; color: #999999; margin: 0; line-height: 1.5;">
              NORTHVALE s.r.o., Bratří Čapků 1095, 534 01 Holice | IČO: 29618142, DIČ: CZ29618142<br/>
              Společnost zapsaná u Krajského soudu v Hradci Králové, oddíl C, vložka 56872.
            </p>
          </div>
        </div>
      </div>
    `;

    // 2. Admin Notification Email HTML
    const adminHtmlInner = `
      <div style="background-color: #f5f6f8; padding: 40px 10px; font-family: 'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; min-height: 100%;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e1e4e8; border-radius: 12px; padding: 40px 30px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); color: #222222;">
          
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #fdbd16; font-size: 26px; font-weight: 800; margin: 0; letter-spacing: 2px; text-transform: uppercase;">NORTHVALE Admin</h1>
            <p style="color: #8a8a92; font-size: 11px; text-transform: uppercase; letter-spacing: 4px; margin: 3px 0 0 0;">Odstoupení od smlouvy</p>
          </div>

          <div style="text-align: center; margin-bottom: 30px;">
            <h2 style="color: #dc2626; font-size: 24px; font-weight: 800; margin: 0; letter-spacing: -0.5px;">↩️ Žádost o odstoupení</h2>
            <p style="font-size: 14px; color: #888888; margin: 8px 0 0 0;">Číslo objednávky: <strong style="color: #fdbd16;">#${orderNumber}</strong></p>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 13.5px; line-height: 1.6;">
            <tr style="border-bottom: 1px solid #e1e4e8;">
              <td style="padding: 10px 0; font-weight: bold; width: 150px; color: #666666;">Jméno zákazníka:</td>
              <td style="padding: 10px 0; color: #111111; font-weight: 600;">${fullName || '—'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e1e4e8;">
              <td style="padding: 10px 0; font-weight: bold; width: 150px; color: #666666;">Číslo objednávky:</td>
              <td style="padding: 10px 0; color: #fdbd16; font-weight: bold;">#${orderNumber}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e1e4e8;">
              <td style="padding: 10px 0; font-weight: bold; color: #666666;">E-mail zákazníka:</td>
              <td style="padding: 10px 0;"><a href="mailto:${email}" style="color: #fdbd16; font-weight: bold;">${email}</a></td>
            </tr>
            <tr style="border-bottom: 1px solid #e1e4e8;">
              <td style="padding: 10px 0; font-weight: bold; color: #666666;">Rozsah vrácení:</td>
              <td style="padding: 10px 0; color: #111111;">${returnTypeLabel}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; font-weight: bold; color: #666666;">Způsob vrácení peněz:</td>
              <td style="padding: 10px 0; color: #111111; font-weight: 600;">${refundMethodLabel}</td>
            </tr>
          </table>

          <div style="text-align: center; border-top: 1px solid #e1e4e8; padding-top: 24px; margin-top: 30px;">
            <p style="font-size: 11px; color: #999999; margin: 0;">Automatické oznámení z e-shopu NORTHVALE TCG</p>
          </div>
        </div>
      </div>
    `;

    // 3. Dispatch Email to Customer
    await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": brevoApiKey,
        "content-type": "application/json",
        "accept": "application/json"
      },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: [{ email: email, name: fullName || email }],
        subject: isCzech ? `Potvrzení přijetí: Odstoupení od smlouvy k objednávce #${orderNumber}` : `Receipt Confirmation: Order Withdrawal #${orderNumber}`,
        htmlContent: wrapInHtmlDocument(customerHtmlInner)
      })
    });

    // 4. Dispatch Email to Admin
    await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": brevoApiKey,
        "content-type": "application/json",
        "accept": "application/json"
      },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: [{ email: recipientEmail, name: "NORTHVALE Administrace" }],
        replyTo: { email: email, name: fullName || email },
        subject: `[Odstoupení] Nová žádost - Objednávka #${orderNumber}`,
        htmlContent: wrapInHtmlDocument(adminHtmlInner)
      })
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
