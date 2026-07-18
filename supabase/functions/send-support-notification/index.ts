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
          <td style="padding: 10px 0; font-weight: bold; width: 140px; color: #8a8a92; border-bottom: 1px solid #e1e4e8;">Hodnocení:</td>
          <td style="padding: 10px 0; color: #fdbd16; font-size: 16px; border-bottom: 1px solid #e1e4e8; font-weight: bold;">
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

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          body {
            background-color: #f5f6f8 !important;
            margin: 0;
            padding: 0;
            -webkit-text-size-adjust: 100%;
            -ms-text-size-adjust: 100%;
          }
        </style>
      </head>
      <body style="background-color: #f5f6f8; margin: 0; padding: 0; font-family: 'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #222222;">
        <div style="background-color: #f5f6f8; padding: 40px 10px; min-height: 100%; text-align: center;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e1e4e8; border-radius: 12px; padding: 40px 30px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); color: #222222; text-align: left;">
            
            <!-- Logo Header -->
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #fdbd16; font-size: 26px; font-weight: 800; margin: 0; letter-spacing: 2px; text-transform: uppercase;">NORTHVALE</h1>
              <p style="color: #8a8a92; font-size: 11px; text-transform: uppercase; letter-spacing: 4px; margin: 3px 0 0 0;">Trading Card Games</p>
            </div>
            
            <hr style="border: 0; border-top: 1px solid #e1e4e8; margin: 25px 0;" />
            
            <!-- Header Text -->
            <h2 style="color: #111111; font-size: 20px; margin-bottom: 20px; font-weight: 600; text-align: center;">
              ${headerText}
            </h2>
            
            <!-- Table of Details -->
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 14px; line-height: 1.6; border-collapse: collapse; margin-bottom: 25px;">
              <tr>
                <td style="padding: 10px 0; font-weight: bold; width: 140px; color: #8a8a92; border-bottom: 1px solid #e1e4e8;">Typ akce:</td>
                <td style="padding: 10px 0; color: #111111; font-weight: 600; border-bottom: 1px solid #e1e4e8;">${eventName}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; font-weight: bold; width: 140px; color: #8a8a92; border-bottom: 1px solid #e1e4e8;">Produkt:</td>
                <td style="padding: 10px 0; color: #e2a80f; font-weight: bold; border-bottom: 1px solid #e1e4e8;">${productName}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; font-weight: bold; color: #8a8a92; border-bottom: 1px solid #e1e4e8;">Autor:</td>
                <td style="padding: 10px 0; color: #111111; border-bottom: 1px solid #e1e4e8;">${authorName}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; font-weight: bold; color: #8a8a92; border-bottom: 1px solid #e1e4e8;">E-mail autora:</td>
                <td style="padding: 10px 0; color: #111111; border-bottom: 1px solid #e1e4e8;">${authorEmail || "Neuveden"}</td>
              </tr>
              ${detailsHtml}
            </table>
            
            <!-- Message Textbox -->
            <div style="margin-top: 25px; padding: 20px; background-color: #fdfdfd; border: 1px solid #fdbd16; border-radius: 8px; box-shadow: 0 4px 15px rgba(253, 189, 22, 0.05);">
              <div style="font-size: 11px; font-weight: bold; color: #8a8a92; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Text zprávy:</div>
              <div style="color: #222222; font-size: 14.5px; line-height: 1.6; white-space: pre-wrap;">${text}</div>
            </div>
            
            <!-- Action Button -->
            ${productUrl ? `
            <div style="margin-top: 30px; text-align: center;">
              <a href="${productUrl}" target="_blank" style="background-color: #fdbd16; color: #111111; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block; border: 1px solid #e2a80f; box-shadow: 0 2px 4px rgba(253, 189, 22, 0.15);">
                Zobrazit produkt na e-shopu
              </a>
            </div>
            ` : ''}
            
            <hr style="border: 0; border-top: 1px solid #e1e4e8; margin: 30px 0;" />
            
            <!-- Footer -->
            <p style="color: #8a8a92; font-size: 11px; line-height: 1.6; margin: 0; text-align: center;">
              Tento e-mail byl automaticky vygenerován z backendu systému NORTHVALE.<br>
              Prosíme, neodpovídejte přímo na tento e-mail.
            </p>
          </div>
        </div>
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
