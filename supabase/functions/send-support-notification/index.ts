// Supabase Edge Function to send email notification to support@northvaletcg.eu via Brevo API
// Deploy via Supabase CLI: supabase functions deploy send-support-notification

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
    const brevoApiKey = Deno.env.get("BREVO_API_KEY");
    const senderEmail = Deno.env.get("BREVO_SENDER_EMAIL") || "info@northvaletcg.eu";
    const senderName = Deno.env.get("BREVO_SENDER_NAME") || "NORTHVALE TCG";
    const recipientEmail = "support@northvaletcg.eu";

    if (!brevoApiKey) {
      throw new Error("Missing BREVO_API_KEY environment variable in Supabase dashboard.");
    }

    const { type, productName, authorName, authorEmail, text, rating, productId, productUrl } = await req.json();

    if (!type || !productName || !authorName || !text) {
      return new Response(JSON.stringify({ error: "Missing required fields (type, productName, authorName, text)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let subject = "";
    let headerText = "";
    let eventName = "";
    let detailsHtml = "";

    if (type === "review") {
      subject = `⭐ [HODNOCENÍ] Nová recenze k produktu: ${productName}`;
      headerText = "Byla přidána nová recenze";
      eventName = "Nové hodnocení (recenze)";
      detailsHtml = `
        <tr>
          <td style="padding: 10px 0; font-weight: bold; width: 140px; color: #8a8a92; border-bottom: 1px solid rgba(255,255,255,0.08);">Hodnocení:</td>
          <td style="padding: 10px 0; color: #fdbd16; font-size: 16px; border-bottom: 1px solid rgba(255,255,255,0.08); font-weight: bold;">
            ${"★".repeat(rating || 5)}${"☆".repeat(5 - (rating || 5))} (${rating}/5)
          </td>
        </tr>
      `;
    } else if (type === "reply") {
      subject = `💬 [DISKUSE - ODPOVĚĎ] Odpověď u produktu: ${productName}`;
      headerText = "Byla přidána odpověď v diskuzi";
      eventName = "Odpověď na dotaz";
    } else {
      subject = `❓ [DISKUSE - DOTAZ] Nový dotaz u produktu: ${productName}`;
      headerText = "Byl přidán nový dotaz k produktu";
      eventName = "Nový dotaz v diskuzi";
    }

    // Build email HTML payload with Northvale TCG dark premium aesthetic
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${subject}</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #0E0E11; color: #E4E4E7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 40px auto; background-color: #141419; border: 1px solid rgba(253, 189, 22, 0.15); border-radius: 12px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.6);">
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #1C1C22 0%, #111115 100%); padding: 32px 40px; text-align: center; border-bottom: 1px solid rgba(253, 189, 22, 0.1);">
              <div style="font-size: 11px; font-weight: 700; color: #fdbd16; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 6px;">UPOZORNĚNÍ PRO PODPORU</div>
              <h1 style="color: #FFFFFF; font-size: 24px; font-weight: 800; margin: 0; letter-spacing: -0.5px;">${headerText}</h1>
            </td>
          </tr>
          
          <!-- Content Body -->
          <tr>
            <td style="padding: 40px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 14px; line-height: 1.5;">
                <tr>
                  <td style="padding: 10px 0; font-weight: bold; width: 140px; color: #8a8a92; border-bottom: 1px solid rgba(255,255,255,0.08);">Typ akce:</td>
                  <td style="padding: 10px 0; color: #FFFFFF; font-weight: 600; border-bottom: 1px solid rgba(255,255,255,0.08);">${eventName}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; font-weight: bold; width: 140px; color: #8a8a92; border-bottom: 1px solid rgba(255,255,255,0.08);">Produkt:</td>
                  <td style="padding: 10px 0; color: #fdbd16; font-weight: bold; border-bottom: 1px solid rgba(255,255,255,0.08);">${productName}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; font-weight: bold; color: #8a8a92; border-bottom: 1px solid rgba(255,255,255,0.08);">Autor:</td>
                  <td style="padding: 10px 0; color: #FFFFFF; border-bottom: 1px solid rgba(255,255,255,0.08);">${authorName}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; font-weight: bold; color: #8a8a92; border-bottom: 1px solid rgba(255,255,255,0.08);">E-mail autora:</td>
                  <td style="padding: 10px 0; color: #FFFFFF; border-bottom: 1px solid rgba(255,255,255,0.08);">${authorEmail || "Neuveden"}</td>
                </tr>
                ${detailsHtml}
              </table>
              
              <!-- Message Textbox -->
              <div style="margin-top: 30px; padding: 20px; background-color: #1C1C22; border-left: 4px solid #fdbd16; border-radius: 6px; box-shadow: inset 0 2px 4px rgba(0,0,0,0.2);">
                <div style="font-size: 11px; font-weight: 700; color: #8a8a92; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px;">TEXT ZPRÁVY:</div>
                <div style="color: #E4E4E7; font-size: 14.5px; line-height: 1.6; white-space: pre-wrap;">${text}</div>
              </div>
              
              <!-- Action Button -->
              ${productUrl ? `
              <div style="margin-top: 35px; text-align: center;">
                <a href="${productUrl}" target="_blank" style="display: inline-block; background-color: #fdbd16; color: #000000; font-weight: 800; font-size: 13.5px; text-decoration: none; padding: 14px 28px; border-radius: 6px; box-shadow: 0 4px 14px rgba(253, 189, 22, 0.25); transition: transform 0.2s;">
                  Zobrazit produkt na e-shopu
                </a>
              </div>
              ` : ''}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #111115; padding: 24px 40px; text-align: center; border-top: 1px solid rgba(255,255,255,0.05); font-size: 11px; color: #52525B;">
              Tento e-mail byl automaticky vygenerován z backendu systému NORTHVALE.<br>
              Prosíme, neodpovídejte přímo na tento e-mail.
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    // Call Brevo transactional email API
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
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
            name: "NORTHVALE Support"
          }
        ],
        subject: subject,
        htmlContent: htmlContent
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Brevo API responded with error status ${response.status}: ${errorText}`);
    }

    const responseData = await response.json();

    return new Response(JSON.stringify({ success: true, messageId: responseData.messageId }), {
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
