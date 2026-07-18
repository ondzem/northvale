// Supabase Edge Function to handle newsletter subscription via Brevo Double Opt-in
// Deploy via: npx supabase functions deploy subscribe-newsletter --project-ref bfxzhggjpiyqfolqpxzz

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
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

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  // 1. GET Request: Handles redirection from the Double Opt-in confirmation link to confirm in DB
  if (req.method === "GET") {
    try {
      const url = new URL(req.url);
      const action = url.searchParams.get("action");
      const email = url.searchParams.get("email");
      const lang = url.searchParams.get("lang") || "CZ";

      if (action === "confirm" && email) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const { error } = await supabase
          .from("newsletter_subscribers")
          .update({ confirmed: true })
          .eq("email", email);

        if (error) {
          console.error("Failed to confirm subscriber in database:", error.message);
        }
      }

      // Redirect user back to the home page with confirmed parameter to show the popup
      const redirectTarget = lang.toUpperCase() === "EN"
        ? "https://northvaletcg.eu?confirmed=true&lang=en"
        : "https://northvaletcg.eu?confirmed=true";

      return Response.redirect(redirectTarget, 302);
    } catch (err) {
      console.error("GET confirm handler error:", err);
      return Response.redirect("https://northvaletcg.eu", 302);
    }
  }

  // 2. POST Request: Subscribes user and sends confirmation (or Double Opt-in if newsletter)
  try {
    const brevoApiKey = Deno.env.get("BREVO_API_KEY");
    const brevoListIdCZStr = Deno.env.get("BREVO_NEWSLETTER_LIST_ID") || "3";
    const brevoListIdENStr = Deno.env.get("BREVO_NEWSLETTER_LIST_ID_EN") || "4";
    const brevoTemplateIdCZStr = Deno.env.get("BREVO_NEWSLETTER_TEMPLATE_ID") || "1";
    const brevoTemplateIdENStr = Deno.env.get("BREVO_NEWSLETTER_TEMPLATE_ID_EN") || brevoTemplateIdCZStr;
    const senderEmail = Deno.env.get("BREVO_SENDER_EMAIL") || "info@northvaletcg.eu";
    const senderName = Deno.env.get("BREVO_SENDER_NAME") || "NORTHVALE TCG";

    if (!brevoApiKey) {
      throw new Error("Missing BREVO_API_KEY environment variable in Supabase dashboard.");
    }

    const { email, lang = 'CZ', isPreRegistration = false } = await req.json();

    if (!email) {
      return new Response(JSON.stringify({ error: "Missing required field (email)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Pre-registration scenario (Direct confirmation + custom HTML coupon email)
    if (isPreRegistration) {
      const { data: dbData, error: dbError } = await supabase
        .from("newsletter_subscribers")
        .upsert(
          { email, unsubscribed: false, confirmed: true, lang, source: 'preregistration' },
          { onConflict: "email" }
        )
        .select();

      if (dbError) {
        console.error("Database upsert error:", dbError.message);
      }

      // Build beautiful dynamic HTML transactional email for pre-registrations
      const htmlContent = `
        <div style="background-color: #f5f6f8; padding: 40px 10px; font-family: 'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; min-height: 100%; text-align: center;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e1e4e8; border-radius: 12px; padding: 40px 30px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); color: #222222;">
            
            <!-- Logo Header -->
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #fdbd16; font-size: 26px; font-weight: 800; margin: 0; letter-spacing: 2px; text-transform: uppercase;">NORTHVALE</h1>
              <p style="color: #8a8a92; font-size: 11px; text-transform: uppercase; letter-spacing: 4px; margin: 3px 0 0 0;">Trading Card Games</p>
            </div>
            
            <hr style="border: 0; border-top: 1px solid #e1e4e8; margin: 30px 0;" />
            
            <!-- Main Greeting -->
            <h2 style="color: #111111; font-size: 20px; margin-bottom: 20px; font-weight: 600; text-align: center;">
              ${lang === 'EN' ? 'Welcome to the Pre-registration!' : 'Vítejte v předregistraci!'}
            </h2>
            
            <p style="color: #222222; font-size: 15px; line-height: 1.6; margin-bottom: 30px; text-align: left;">
              ${lang === 'EN' 
                ? 'Thank you for building a new TCG world with us! Your pre-registration has been successfully recorded. We are working hard to bring you the best experience, and we plan to officially launch the e-shop on <strong>August 1st</strong>.' 
                : 'Děkujeme, že s námi stavíte nový TCG svět! Vaše předregistrace byla úspěšně zaznamenána. Na spuštění e-shopu usilovně pracujeme a oficiálně startujeme již <strong>1. srpna</strong>.'}
            </p>
            
            <!-- Coupon Box -->
            <div style="background-color: #fdfdfd; border: 1px solid #fdbd16; padding: 25px; border-radius: 8px; margin: 30px 0; text-align: center; box-shadow: 0 4px 15px rgba(253, 189, 22, 0.05);">
              <p style="color: #fdbd16; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 10px 0; font-weight: bold;">
                ${lang === 'EN' ? 'Your 5% Discount Code' : 'Váš slevový kód na 5%'}
              </p>
              <div style="font-size: 32px; font-weight: bold; color: #111111; letter-spacing: 4px; margin: 10px 0; font-family: monospace;">
                NORTHVALE5
              </div>
              <p style="color: #8a8a92; font-size: 11px; margin: 10px 0 0 0;">
                ${lang === 'EN' ? 'Valid for your first purchase starting August 1st.' : 'Platný pro Váš první nákup od 1. srpna.'}
              </p>
            </div>
            
            <p style="color: #222222; font-size: 14px; line-height: 1.6; margin-bottom: 35px; text-align: left;">
              ${lang === 'EN'
                ? 'We will send you a notification as soon as the doors open. In the meantime, you can follow us on our social networks.'
                : 'Jakmile e-shop otevře své brány, pošleme Vám upozornění. Mezitím nás můžete sledovat na našich sociálních sítích.'}
            </p>
            
            <hr style="border: 0; border-top: 1px solid #e1e4e8; margin: 30px 0;" />
            
            <!-- Footer -->
            <p style="color: #8a8a92; font-size: 11px; line-height: 1.5; margin: 0; text-align: center;">
              ${lang === 'EN'
                ? 'This email was sent automatically based on your pre-registration at northvaletcg.eu.'
                : 'Tento e-mail byl odeslán automaticky na základě Vaší předregistrace na webu northvaletcg.eu.'}
              <br />
              © 2026 NORTHVALE. All rights reserved.
            </p>
          </div>
        </div>
      `;

      // Call Brevo transactional email SMTP endpoint directly
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
              email: email
            }
          ],
          subject: lang === 'EN' ? "Welcome to NORTHVALE Pre-registration!" : "Vítejte v předregistraci NORTHVALE!",
          htmlContent: wrapInHtmlDocument(htmlContent)
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Brevo SMTP API responded with error status ${response.status}: ${errorText}`);
      }

      // Also subscribe the email to the Brevo newsletter list directly since GDPR consent was given
      try {
        const brevoListId = lang === 'EN' ? parseInt(brevoListIdENStr, 10) : parseInt(brevoListIdCZStr, 10);
        console.log(`[subscribe-newsletter] Pre-registration subscribing email ${email} to Brevo list ${brevoListId}...`);
        const contactResponse = await fetch("https://api.brevo.com/v3/contacts", {
          method: "POST",
          headers: {
            "api-key": brevoApiKey,
            "content-type": "application/json",
            "accept": "application/json"
          },
          body: JSON.stringify({
            email: email,
            listIds: [brevoListId],
            updateEnabled: true
          })
        });
        
        if (!contactResponse.ok) {
          const contactErrText = await contactResponse.text();
          console.error(`[subscribe-newsletter] Failed to sync pre-registered contact to Brevo newsletter list: ${contactErrText}`);
        } else {
          console.log(`[subscribe-newsletter] Successfully synced pre-registered contact to Brevo newsletter list.`);
        }
      } catch (contactErr) {
        console.error(`[subscribe-newsletter] Error syncing contact to Brevo:`, contactErr);
      }

      return new Response(JSON.stringify({ success: true, message: lang === 'EN' ? 'Successfully registered!' : 'Úspěšně předregistrováno!' }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Default scenario: Newsletter Double Opt-in Flow
    const brevoListId = lang === 'EN' ? parseInt(brevoListIdENStr, 10) : parseInt(brevoListIdCZStr, 10);
    const brevoTemplateId = lang === 'EN' ? parseInt(brevoTemplateIdENStr, 10) : parseInt(brevoTemplateIdCZStr, 10);

    const { data: dbData, error: dbError } = await supabase
      .from("newsletter_subscribers")
      .upsert(
        { email, unsubscribed: false, confirmed: false, lang },
        { onConflict: "email" }
      )
      .select();

    if (dbError) {
      console.error("Database upsert error:", dbError.message);
    }

    const redirectUrl = lang === 'EN' 
      ? `https://bfxzhggjpiyqfolqpxzz.supabase.co/functions/v1/subscribe-newsletter?action=confirm&email=${encodeURIComponent(email)}&lang=en` 
      : `https://bfxzhggjpiyqfolqpxzz.supabase.co/functions/v1/subscribe-newsletter?action=confirm&email=${encodeURIComponent(email)}`;

    // Update/Sync Double Opt-in template in Brevo to match the new unified light style
    try {
      console.log(`[subscribe-newsletter] Updating Brevo template ID ${brevoTemplateId}...`);
      const updateTemplateRes = await fetch(`https://api.brevo.com/v3/smtp/templates/${brevoTemplateId}`, {
        method: "PUT",
        headers: {
          "api-key": brevoApiKey,
          "content-type": "application/json",
          "accept": "application/json"
        },
        body: JSON.stringify({
          htmlContent: wrapInHtmlDocument(`
            <div style="background-color: #f5f6f8; padding: 40px 10px; font-family: 'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; min-height: 100%; text-align: center;">
              <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e1e4e8; border-radius: 12px; padding: 40px 30px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); color: #222222;">
                
                <!-- Logo Header -->
                <div style="text-align: center; margin-bottom: 30px;">
                  <h1 style="color: #fdbd16; font-size: 26px; font-weight: 800; margin: 0; letter-spacing: 2px; text-transform: uppercase;">NORTHVALE</h1>
                  <p style="color: #8a8a92; font-size: 11px; text-transform: uppercase; letter-spacing: 4px; margin: 3px 0 0 0;">Trading Card Games</p>
                </div>
                
                <hr style="border: 0; border-top: 1px solid #e1e4e8; margin: 30px 0;" />
                
                <!-- Main Greeting -->
                <h2 style="color: #111111; font-size: 20px; margin-bottom: 20px; font-weight: 600; text-align: center;">
                  ${lang === 'EN' ? 'Confirm newsletter subscription' : 'Potvrzení přihlášení k newsletteru'}
                </h2>
                
                <p style="color: #222222; font-size: 15px; line-height: 1.6; margin-bottom: 30px; text-align: left;">
                  ${lang === 'EN'
                    ? 'Hello,<br/><br/>thank you for your interest in the NORTHVALE TCG newsletter. To complete your subscription and receive updates and exclusive offers, please confirm your email address by clicking the button below.'
                    : 'Dobrý den,<br/><br/>děkujeme za Váš zájem o newsletter NORTHVALE TCG. Abychom dokončili Vaše přihlášení a mohli Vám posílat novinky a exkluzivní nabídky, potvrďte prosím svou e-mailovou adresu kliknutím na tlačítko níže.'}
                </p>
                
                <!-- Action Button -->
                <div style="margin: 30px 0; text-align: center;">
                  <a href="{{ doubleoptin }}" target="_blank" style="background-color: #fdbd16; color: #111111; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 15px; display: inline-block; border: 1px solid #e2a80f; box-shadow: 0 2px 4px rgba(253, 189, 22, 0.15);">
                    ${lang === 'EN' ? 'Confirm subscription' : 'Potvrdit přihlášení k odběru'}
                  </a>
                </div>
                
                <p style="color: #666666; font-size: 13px; line-height: 1.6; margin-bottom: 35px; text-align: left;">
                  ${lang === 'EN'
                    ? 'If the button above does not work, copy and paste the following link into your browser:'
                    : 'Pokud na tlačítko nelze kliknout, zkopírujte následující odkaz do Vašeho prohlížeče:'}<br/>
                  <span style="word-break: break-all; color: #fdbd16;">{{ doubleoptin }}</span>
                </p>
                
                <hr style="border: 0; border-top: 1px solid #e1e4e8; margin: 30px 0;" />
                
                <!-- Footer -->
                <p style="color: #8a8a92; font-size: 11px; line-height: 1.5; margin: 0; text-align: center;">
                  ${lang === 'EN'
                    ? 'This email was sent automatically based on your request on northvaletcg.eu. If you did not make this request, you can safely ignore this email.'
                    : 'Tento e-mail byl odeslán automaticky na základě Vašeho požadavku o přihlášení na webu northvaletcg.eu. Pokud jste o přihlášení nežádali, můžete tento e-mail bez obav ignorovat.'}
                  <br />
                  © 2026 NORTHVALE. ${lang === 'EN' ? 'All rights reserved.' : 'Všechna práva vyhrazena.'}
                </p>
              </div>
            </div>
          `)
        })
      });
      console.log(`[subscribe-newsletter] Update template ID ${brevoTemplateId} status: ${updateTemplateRes.status}`);
      if (!updateTemplateRes.ok) {
        console.error(`[subscribe-newsletter] Failed to update template: ${await updateTemplateRes.text()}`);
      }
    } catch (err) {
      console.error(`[subscribe-newsletter] Error updating template ID ${brevoTemplateId}:`, err);
    }

    const response = await fetch("https://api.brevo.com/v3/contacts/doubleOptinConfirmation", {
      method: "POST",
      headers: {
        "api-key": brevoApiKey,
        "content-type": "application/json",
        "accept": "application/json"
      },
      body: JSON.stringify({
        email: email,
        includeListIds: [brevoListId],
        templateId: brevoTemplateId,
        redirectionUrl: redirectUrl
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      if (errorText.includes("CONTACT_EXIST") || errorText.includes("already_exist")) {
        return new Response(JSON.stringify({ success: true, message: "Already pending or subscribed" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`Brevo API responded with error status ${response.status}: ${errorText}`);
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
