// Supabase Edge Function to handle newsletter subscription via Brevo Double Opt-in
// Deploy via: npx supabase functions deploy subscribe-newsletter --project-ref bfxzhggjpiyqfolqpxzz

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

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
          { email, unsubscribed: false, confirmed: true, lang },
          { onConflict: "email" }
        )
        .select();

      if (dbError) {
        console.error("Database upsert error:", dbError.message);
      }

      // Build beautiful dynamic HTML transactional email for pre-registrations
      const htmlContent = `
        <div style="background-color: #0b0b0b; padding: 40px 20px; font-family: 'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #ffffff; text-align: center; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid rgba(253, 189, 22, 0.15); box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
          <!-- Logo Header -->
          <div style="margin-bottom: 30px;">
            <h1 style="color: #FDBD16; font-size: 28px; letter-spacing: 2px; margin: 0; text-transform: uppercase; font-weight: 800;">NORTHVALE</h1>
            <p style="color: #8a8a92; font-size: 12px; text-transform: uppercase; letter-spacing: 4px; margin: 5px 0 0 0;">Trading Card Games</p>
          </div>
          
          <hr style="border: 0; border-top: 1px solid rgba(253, 189, 22, 0.15); margin: 30px 0;" />
          
          <!-- Main Greeting -->
          <h2 style="color: #ffffff; font-size: 20px; margin-bottom: 20px; font-weight: 600;">
            ${lang === 'EN' ? 'Welcome to the Pre-registration!' : 'Vítejte v předregistraci!'}
          </h2>
          
          <p style="color: #d1d1d6; font-size: 15px; line-height: 1.6; margin-bottom: 30px; text-align: left;">
            ${lang === 'EN' 
              ? 'Thank you for building a new TCG world with us! Your pre-registration has been successfully recorded. We are working hard to bring you the best experience, and we plan to officially launch the e-shop on <strong>August 1st</strong>.' 
              : 'Děkujeme, že s námi stavíte nový TCG svět! Vaše předregistrace byla úspěšně zaznamenána. Na spuštění e-shopu usilovně pracujeme a oficiálně startujeme již <strong>1. srpna</strong>.'}
          </p>
          
          <!-- Coupon Box -->
          <div style="background: linear-gradient(135deg, #161618 0%, #1c1c1f 100%); border: 1px solid #FDBD16; padding: 25px; border-radius: 8px; margin: 30px 0; text-align: center; box-shadow: 0 4px 15px rgba(253, 189, 22, 0.1);">
            <p style="color: #FDBD16; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 10px 0; font-weight: bold;">
              ${lang === 'EN' ? 'Your 5% Discount Code' : 'Váš slevový kód na 5%'}
            </p>
            <div style="font-size: 32px; font-weight: bold; color: #ffffff; letter-spacing: 4px; margin: 10px 0; font-family: monospace;">
              NORTHVALE5
            </div>
            <p style="color: #8a8a92; font-size: 11px; margin: 10px 0 0 0;">
              ${lang === 'EN' ? 'Valid for your first purchase starting August 1st.' : 'Platný pro Váš první nákup od 1. srpna.'}
            </p>
          </div>
          
          <p style="color: #d1d1d6; font-size: 14px; line-height: 1.6; margin-bottom: 35px; text-align: left;">
            ${lang === 'EN'
              ? 'We will send you a notification as soon as the doors open. In the meantime, you can follow us on our social networks.'
              : 'Jakmile e-shop otevře své brány, pošleme Vám upozornění. Mezitím nás můžete sledovat na našich sociálních sítích.'}
          </p>
          
          <hr style="border: 0; border-top: 1px solid rgba(253, 189, 22, 0.15); margin: 30px 0;" />
          
          <!-- Footer -->
          <p style="color: #8a8a92; font-size: 11px; line-height: 1.5; margin: 0;">
            ${lang === 'EN'
              ? 'This email was sent automatically based on your pre-registration at northvaletcg.eu.'
              : 'Tento e-mail byl odeslán automaticky na základě Vaší předregistrace na webu northvaletcg.eu.'}
            <br />
            © 2026 NORTHVALE. All rights reserved.
          </p>
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
          htmlContent: htmlContent
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Brevo SMTP API responded with error status ${response.status}: ${errorText}`);
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
