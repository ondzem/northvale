// Supabase Edge Function to monitor daily deal expiration and send warning emails via Brevo
// Deploy via Supabase CLI: supabase functions deploy check-deal-expiry

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

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
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const brevoApiKey = Deno.env.get("BREVO_API_KEY");
    const senderEmail = Deno.env.get("BREVO_SENDER_EMAIL") || "info@northvaletcg.eu";
    const senderName = Deno.env.get("BREVO_SENDER_NAME") || "NORTHVALE";
    const recipientEmail = "info@northvaletcg.eu";

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration variables in Edge Function environment.");
    }

    if (!brevoApiKey) {
      throw new Error("Missing BREVO_API_KEY environment variable in Edge Function environment.");
    }

    // Initialize Supabase Client with Service Role Key to bypass RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all active deals
    const { data: deals, error: dbError } = await supabase
      .from("daily_deal")
      .select("*");

    if (dbError) {
      throw new Error(`Database error while fetching deals: ${dbError.message}`);
    }

    if (!deals || deals.length === 0) {
      return new Response(JSON.stringify({ message: "No deals found in database." }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = Date.now();

    // Filter deals that expire in the future
    const futureDeals = deals.filter((d: any) => d.ends_at && new Date(d.ends_at).getTime() > now);

    if (futureDeals.length === 0) {
      return new Response(JSON.stringify({ message: "All deals are already expired. No action needed." }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Sort future deals by ends_at ascending. The final deal in queue is the last one in this list.
    const sortedFutureDeals = [...futureDeals].sort(
      (a: any, b: any) => new Date(a.ends_at).getTime() - new Date(b.ends_at).getTime()
    );

    const lastDeal = sortedFutureDeals[sortedFutureDeals.length - 1];
    const lastDealExpiry = new Date(lastDeal.ends_at).getTime();
    const timeRemainingMs = lastDealExpiry - now;

    // Check if the final deal is within 1 hour of expiration (3600000 ms) and not yet notified
    // We allow a buffer: trigger if it is within 65 minutes to prevent missing the window (since cron runs every 15 mins)
    const isWithinOneHour = timeRemainingMs <= 65 * 60 * 1000 && timeRemainingMs > 0;
    const isAlreadyNotified = lastDeal.expiry_notified === true;

    console.log(`Checking final deal "${lastDeal.name}" (ID: ${lastDeal.id}):`);
    console.log(`- Expiry: ${lastDeal.ends_at}`);
    console.log(`- Time remaining: ${Math.round(timeRemainingMs / 60000)} mins`);
    console.log(`- Within notification window: ${isWithinOneHour}`);
    console.log(`- Already notified: ${isAlreadyNotified}`);

    if (isWithinOneHour && !isAlreadyNotified) {
      // Format time remaining for email
      const expiryFormatted = new Date(lastDeal.ends_at).toLocaleString("cs-CZ", {
        timeZone: "Europe/Prague",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      });

      const subject = `⏰ [UPOZORNĚNÍ] Akce dne brzy vyprší!`;
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
                <div style="font-size: 11px; font-weight: 700; color: #fdbd16; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 6px;">SYSTÉMOVÉ UPOZORNĚNÍ</div>
                <h1 style="color: #FFFFFF; font-size: 24px; font-weight: 800; margin: 0; letter-spacing: -0.5px;">Akce dne brzy skončí</h1>
              </td>
            </tr>
            
            <!-- Content Body -->
            <tr>
              <td style="padding: 40px;">
                <p style="font-size: 15px; line-height: 1.6; color: #E4E4E7; margin: 0 0 20px 0;">
                  Ahoj administrátore,
                </p>
                <p style="font-size: 14.5px; line-height: 1.6; color: #A1A1AA; margin: 0 0 24px 0;">
                  Upozorňujeme tě, že za méně než hodinu vyprší **poslední naplánovaná Akce dne** na e-shopu NORTHVALE. V řadě aktuálně není žádná další připravená akce.
                </p>
                
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 14px; line-height: 1.5; margin-bottom: 30px;">
                  <tr>
                    <td style="padding: 10px 0; font-weight: bold; width: 140px; color: #8a8a92; border-bottom: 1px solid rgba(255,255,255,0.08);">Akce:</td>
                    <td style="padding: 10px 0; color: #FFFFFF; font-weight: 600; border-bottom: 1px solid rgba(255,255,255,0.08);">${lastDeal.name}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; font-weight: bold; color: #8a8a92; border-bottom: 1px solid rgba(255,255,255,0.08);">Akční cena:</td>
                    <td style="padding: 10px 0; color: #fdbd16; font-weight: bold; border-bottom: 1px solid rgba(255,255,255,0.08);">${lastDeal.price} Kč</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; font-weight: bold; color: #8a8a92; border-bottom: 1px solid rgba(255,255,255,0.08);">Čas ukončení:</td>
                    <td style="padding: 10px 0; color: #FFFFFF; border-bottom: 1px solid rgba(255,255,255,0.08);">${expiryFormatted}</td>
                  </tr>
                </table>
                
                <p style="font-size: 14px; line-height: 1.6; color: #A1A1AA; margin: 0 0 30px 0;">
                  Aby e-shop nezůstal bez aktivního marketingového panelu a odpočtu, doporučujeme co nejdříve přejít do administrace a přidat další akce dne (můžeš naplánovat až 3 po sobě).
                </p>
                
                <!-- Action Button -->
                <div style="text-align: center;">
                  <a href="https://northvaletcg.eu/admin" target="_blank" style="display: inline-block; background-color: #fdbd16; color: #000000; font-weight: 800; font-size: 13.5px; text-decoration: none; padding: 14px 28px; border-radius: 6px; box-shadow: 0 4px 14px rgba(253, 189, 22, 0.25);">
                    Přejít do Administrace
                  </a>
                </div>
              </td>
            </tr>
            
            <!-- Footer -->
            <tr>
              <td style="background-color: #111115; padding: 24px 40px; text-align: center; border-top: 1px solid rgba(255,255,255,0.05); font-size: 11px; color: #52525B;">
                Tento e-mail byl automaticky vygenerován systémem NORTHVALE.<br>
                Prosíme, neodpovídejte přímo na tento e-mail.
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;

      // Call Brevo transactional email API
      const mailResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
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
              name: "NORTHVALE Administrátor"
            }
          ],
          subject: subject,
          htmlContent: htmlContent
        })
      });

      if (!mailResponse.ok) {
        const mailError = await mailResponse.text();
        throw new Error(`Brevo API responded with error status ${mailResponse.status}: ${mailError}`);
      }

      // Mark this deal as notified in database
      const { error: updateError } = await supabase
        .from("daily_deal")
        .update({ expiry_notified: true })
        .eq("id", lastDeal.id);

      if (updateError) {
        console.error(`Failed to update expiry_notified status: ${updateError.message}`);
      } else {
        console.log(`Successfully marked deal "${lastDeal.name}" as notified.`);
      }

      return new Response(JSON.stringify({ success: true, message: "Email notification dispatched successfully." }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ message: "Final deal is not within notification window or already notified." }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error(`Error in check-deal-expiry: ${error.message}`);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
