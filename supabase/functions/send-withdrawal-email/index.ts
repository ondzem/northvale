// Supabase Edge Function to send email confirmation for order withdrawals via Brevo API
// Deploy via Supabase CLI: supabase functions deploy send-withdrawal-email

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

    // 1. Construct Customer Confirmation Email HTML
    const refundMethodLabel = refundMethod === "bank" 
      ? (isCzech ? `Bankovní převod (na účet: ${bankAccount || '—'})` : `Bank Transfer (to account: ${bankAccount || '—'})`)
      : (isCzech ? "Původní platební karta (přes GP webpay)" : "Original payment card (via GP webpay)");

    const returnTypeLabel = returnType === "celou"
      ? (isCzech ? "Celá objednávka" : "Entire order")
      : (isCzech ? `Část objednávky (položky: ${partialItemsText || '—'})` : `Partial return (items: ${partialItemsText || '—'})`);

    const customerHtmlContent = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 5px; color: #333333;">
         <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #fdbd16; margin: 0;">NORTHVALE</h2>
          <p style="font-size: 14px; color: #666; margin: 5px 0 0 0;">${isCzech ? "Potvrzení o odstoupení od smlouvy" : "Order Withdrawal Confirmation"}</p>
        </div>
        
        <p style="font-size: 15px; line-height: 1.5;">
          ${isCzech 
            ? `Vážený/á ${fullName || 'zákazníku'},<br><br>potvrzujeme přijetí Vašeho elektronického oznámení o odstoupení od kupní smlouvy. Níže naleznete rekapitulaci zadaných údajů:` 
            : `Dear ${fullName || 'Customer'},<br><br>we confirm receipt of your electronic request to withdraw from the purchase agreement. Here is a summary of the details you submitted:`}
        </p>

        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
          <tr style="border-bottom: 1px solid #eaeaea;">
            <td style="padding: 10px 0; font-weight: bold; color: #555;">${isCzech ? "Jméno a příjmení" : "Name and Surname"}:</td>
            <td style="padding: 10px 0; text-align: right;">${fullName || '—'}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eaeaea;">
            <td style="padding: 10px 0; font-weight: bold; color: #555;">${isCzech ? "Číslo objednávky" : "Order Number"}:</td>
            <td style="padding: 10px 0; text-align: right;">#${orderNumber}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eaeaea;">
            <td style="padding: 10px 0; font-weight: bold; color: #555;">${isCzech ? "E-mailová adresa" : "Email Address"}:</td>
            <td style="padding: 10px 0; text-align: right;">${email}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eaeaea;">
            <td style="padding: 10px 0; font-weight: bold; color: #555;">${isCzech ? "Rozsah vrácení" : "Scope of Return"}:</td>
            <td style="padding: 10px 0; text-align: right;">${returnTypeLabel}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eaeaea;">
            <td style="padding: 10px 0; font-weight: bold; color: #555;">${isCzech ? "Způsob vrácení peněz" : "Refund Method"}:</td>
            <td style="padding: 10px 0; text-align: right;">${refundMethodLabel}</td>
          </tr>
        </table>

        <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #fdbd16; border-radius: 4px; margin-bottom: 20px; font-size: 13.5px; line-height: 1.5;">
          <h4 style="margin: 0 0 8px 0; color: #222;">${isCzech ? "Co dělat nyní? (Následující kroky)" : "What to do next? (Required steps)"}</h4>
          <ol style="margin: 0; padding-left: 20px; color: #555;">
            <li style="margin-bottom: 8px;">
              <strong>${isCzech ? "Bezpečně zabalte vrácené produkty." : "Pack the returned products securely."}</strong><br>
              ${isCzech 
                ? "Doporučujeme pro kusové karty použít soft sleeve a toploader (sendvičové balení) a pro balené produkty pevnou krabici s výplní, aby nedošlo k poškození." 
                : "For singles, we recommend using a soft sleeve and toploader; for boxed products, a sturdy cardboard box with filler to prevent physical damage during transit."}
            </li>
            <li style="margin-bottom: 8px;">
              <strong>${isCzech ? "Odešlete zboží k nám." : "Ship the goods back to us."}</strong><br>
              ${isCzech ? "Zboží odešlete bez zbytečného odkladu (nejpozději do 14 dnů) na adresu:" : "Ship the products without delay (no later than 14 days) to the following address:"}<br>
              <span style="display: block; font-family: monospace; padding: 8px 0; font-weight: bold; color: #222;">
                NORTHVALE s.r.o.<br>
                Bratří Čapků 1095<br>
                534 01 Holice<br>
                Czech Republic
              </span>
            </li>
            <li>
              <strong>${isCzech ? "Kontrola a vrácení prostředků." : "Inspection and Payout."}</strong><br>
              ${isCzech 
                ? "Jakmile balíček převezmeme, zkontrolujeme stav karet a neporušenost fólií u balených produktů. Do 14 dnů od převzetí Vám vrátíme peníze zvolenou metodou." 
                : "Once received, we will inspect the condition of the cards and original packaging. We will return your money via the selected method within 14 days of receipt."}
            </li>
          </ol>
        </div>

        <p style="font-size: 11px; color: #888; margin-top: 30px; border-top: 1px solid #eaeaea; padding-top: 10px; text-align: center;">
          ${isCzech 
            ? "Tento e-mail byl odeslán automaticky z internetového obchodu northvaletcg.eu." 
            : "This email was sent automatically from the northvaletcg.eu e-shop."}
        </p>
      </div>
    `;

    // 2. Construct Admin Notification Email HTML
    const adminHtmlContent = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 5px;">
        <h2 style="color: #fdbd16; border-bottom: 2px solid #fdbd16; padding-bottom: 10px; margin-top: 0;">Nové odstoupení od smlouvy</h2>
        <p style="font-size: 14.5px;">Zákazník odeslal online formulář pro odstoupení od kupní smlouvy:</p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 14px;">
          <tr>
            <td style="padding: 8px 0; font-weight: bold; width: 150px;">Jméno zákazníka:</td>
            <td style="padding: 8px 0;">${fullName || '—'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; width: 150px;">Číslo objednávky:</td>
            <td style="padding: 8px 0;">#${orderNumber}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">E-mail zákazníka:</td>
            <td style="padding: 8px 0;"><a href="mailto:${email}">${email}</a></td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">Rozsah vrácení:</td>
            <td style="padding: 8px 0;">${returnTypeLabel}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">Způsob vrácení peněz:</td>
            <td style="padding: 8px 0;">${refundMethodLabel}</td>
          </tr>
        </table>
        <p style="font-size: 11px; color: #888; margin-top: 30px; border-top: 1px solid #eaeaea; padding-top: 10px;">
          Tento e-mail byl odeslán automaticky z backendu e-shopu NORTHVALE.
        </p>
      </div>
    `;

    // 3. Dispatch Email to Customer
    const customerResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": brevoApiKey,
        "content-type": "application/json",
        "accept": "application/json"
      },
      body: JSON.stringify({
        sender: {
          name: senderName,
          email: senderEmail
        },
        to: [
          {
            email: email,
            name: email
          }
        ],
        subject: isCzech 
          ? `Potvrzení přijetí: Odstoupení od smlouvy k objednávce #${orderNumber}`
          : `Receipt Confirmation: Order Withdrawal #${orderNumber}`,
        htmlContent: customerHtmlContent
      })
    });

    if (!customerResponse.ok) {
      const errorText = await customerResponse.text();
      console.error(`Brevo Customer Email API responded with error: ${errorText}`);
    }

    // 4. Dispatch Email to Admin
    const adminResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": brevoApiKey,
        "content-type": "application/json",
        "accept": "application/json"
      },
      body: JSON.stringify({
        sender: {
          name: senderName,
          email: senderEmail
        },
        to: [
          {
            email: recipientEmail,
            name: "NORTHVALE Administrace"
          }
        ],
        replyTo: {
          email: email,
          name: email
        },
        subject: `[Odstoupení] Nová žádost - Objednávka #${orderNumber}`,
        htmlContent: adminHtmlContent
      })
    });

    if (!adminResponse.ok) {
      const errorText = await adminResponse.text();
      console.error(`Brevo Admin Email API responded with error: ${errorText}`);
    }

    return new Response(JSON.stringify({ success: true }), {
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
