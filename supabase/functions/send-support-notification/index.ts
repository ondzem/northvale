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

    const { type, productName, authorName, text, rating, productId } = await req.json();

    if (!type || !productName || !authorName || !text) {
      return new Response(JSON.stringify({ error: "Missing required fields (type, productName, authorName, text)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let subject = "";
    let headerText = "";
    let detailsHtml = "";

    if (type === "review") {
      subject = `[Nová recenze] ${productName} - ${rating}★ od ${authorName}`;
      headerText = "Byla přidána nová recenze k produktu";
      detailsHtml = `
        <tr>
          <td style="padding: 8px 0; font-weight: bold; width: 150px;">Hodnocení:</td>
          <td style="padding: 8px 0; color: #fdbd16; font-size: 16px;">${"★".repeat(rating || 5)}${"☆".repeat(5 - (rating || 5))} (${rating}/5)</td>
        </tr>
      `;
    } else if (type === "reply") {
      subject = `[Nová odpověď v diskuzi] ${productName} od ${authorName}`;
      headerText = "Byla přidána odpověď v diskuzi u produktu";
    } else {
      subject = `[Nový dotaz v diskuzi] ${productName} od ${authorName}`;
      headerText = "Byl přidán nový dotaz k produktu";
    }

    // Build email HTML payload
    const htmlContent = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 5px;">
        <h2 style="color: #fdbd16; border-bottom: 2px solid #fdbd16; padding-bottom: 10px; margin-top: 0;">${headerText}</h2>
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 14.5px;">
          <tr>
            <td style="padding: 8px 0; font-weight: bold; width: 150px;">Produkt:</td>
            <td style="padding: 8px 0;"><strong>${productName}</strong> (ID: ${productId || '—'})</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">Autor:</td>
            <td style="padding: 8px 0;">${authorName}</td>
          </tr>
          ${detailsHtml}
        </table>
        <div style="margin-top: 20px; padding: 15px; background-color: #f9f9f9; border-left: 4px solid #fdbd16; border-radius: 4px;">
          <h4 style="margin-top: 0; margin-bottom: 8px; color: #333;">Obsah zprávy:</h4>
          <p style="margin: 0; white-space: pre-wrap; line-height: 1.5; color: #555;">${text}</p>
        </div>
        <p style="font-size: 11px; color: #888; margin-top: 30px; border-top: 1px solid #eaeaea; padding-top: 10px;">
          Tento e-mail byl odeslán automaticky z backendu e-shopu NORTHVALE.
        </p>
      </div>
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
