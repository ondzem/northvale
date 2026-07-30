// Supabase Edge Function to send email notification via Brevo API
// Deploy via Supabase CLI: supabase functions deploy send-contact-email

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
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const brevoApiKey = Deno.env.get("BREVO_API_KEY");
    const senderEmail = Deno.env.get("BREVO_SENDER_EMAIL") || "info@northvaletcg.eu";
    const senderName = Deno.env.get("BREVO_SENDER_NAME") || "NORTHVALE TCG";
    const recipientEmail = Deno.env.get("BREVO_RECIPIENT_EMAIL") || "info@northvaletcg.eu";

    if (!brevoApiKey) {
      throw new Error("Missing BREVO_API_KEY environment variable in Supabase dashboard.");
    }

    const { name, email, phone, message } = await req.json();

    if (!name || !email || !message) {
      return new Response(JSON.stringify({ error: "Missing required fields (name, email, message)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const innerHtml = `
      <div style="background-color: #f5f6f8; padding: 40px 10px; font-family: 'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; min-height: 100%;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e1e4e8; border-radius: 12px; padding: 40px 30px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); color: #222222;">
          
          <!-- Logo Header -->
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #fdbd16; font-size: 26px; font-weight: 800; margin: 0; letter-spacing: 2px; text-transform: uppercase;">NORTHVALE</h1>
            <p style="color: #8a8a92; font-size: 11px; text-transform: uppercase; letter-spacing: 4px; margin: 3px 0 0 0;">Trading Card Games</p>
          </div>
          
          <div style="text-align: center; margin-bottom: 24px; font-size: 54px;">
            ✉️
          </div>

          <!-- Header Title -->
          <div style="text-align: center; margin-bottom: 30px;">
            <h2 style="color: #111111; font-size: 24px; font-weight: 800; margin: 0; letter-spacing: -0.5px;">Nový kontaktní dotaz</h2>
            <p style="font-size: 14px; color: #888888; margin: 8px 0 0 0;">Zpráva od zákazníka: <strong style="color: #fdbd16;">${name}</strong></p>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13.5px; line-height: 1.6;">
            <tr style="border-bottom: 1px solid #e1e4e8;">
              <td style="padding: 10px 0; font-weight: bold; width: 120px; color: #666666;">Jméno:</td>
              <td style="padding: 10px 0; color: #111111; font-weight: 600;">${name}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e1e4e8;">
              <td style="padding: 10px 0; font-weight: bold; color: #666666;">E-mail:</td>
              <td style="padding: 10px 0;"><a href="mailto:${email}" style="color: #fdbd16; font-weight: bold;">${email}</a></td>
            </tr>
            <tr>
              <td style="padding: 10px 0; font-weight: bold; color: #666666;">Telefon:</td>
              <td style="padding: 10px 0; color: #111111;">${phone || '—'}</td>
            </tr>
          </table>

          <div style="background-color: #fdfdfd; border: 1px solid #e1e4e8; border-left: 4px solid #fdbd16; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
            <h4 style="margin: 0 0 10px 0; color: #111111; font-size: 14px; font-weight: 700;">Obsah zprávy:</h4>
            <p style="margin: 0; white-space: pre-wrap; font-size: 14px; color: #333333; line-height: 1.6;">${message}</p>
          </div>

          <div style="text-align: center; border-top: 1px solid #e1e4e8; padding-top: 24px; margin-top: 30px;">
            <p style="font-size: 11px; color: #999999; margin: 0;">Odesláno z kontaktního formuláře e-shopu NORTHVALE TCG</p>
          </div>
        </div>
      </div>
    `;

    const htmlContent = wrapInHtmlDocument(innerHtml);

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
            name: "NORTHVALE Podpora"
          }
        ],
        replyTo: {
          email: email,
          name: name
        },
        subject: `[Kontakt] Dotaz od: ${name}`,
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
