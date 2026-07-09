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

  // 2. POST Request: Subscribes user and sends Double Opt-in confirmation email via Brevo
  try {
    const brevoApiKey = Deno.env.get("BREVO_API_KEY");
    const brevoListIdCZStr = Deno.env.get("BREVO_NEWSLETTER_LIST_ID") || "3";
    const brevoListIdENStr = Deno.env.get("BREVO_NEWSLETTER_LIST_ID_EN") || "4";
    const brevoTemplateIdCZStr = Deno.env.get("BREVO_NEWSLETTER_TEMPLATE_ID") || "1";
    const brevoTemplateIdENStr = Deno.env.get("BREVO_NEWSLETTER_TEMPLATE_ID_EN") || brevoTemplateIdCZStr;

    if (!brevoApiKey) {
      throw new Error("Missing BREVO_API_KEY environment variable in Supabase dashboard.");
    }

    const { email, lang = 'CZ' } = await req.json();

    if (!email) {
      return new Response(JSON.stringify({ error: "Missing required field (email)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine IDs based on language
    const brevoListId = lang === 'EN' ? parseInt(brevoListIdENStr, 10) : parseInt(brevoListIdCZStr, 10);
    const brevoTemplateId = lang === 'EN' ? parseInt(brevoTemplateIdENStr, 10) : parseInt(brevoTemplateIdCZStr, 10);

    // Initialize Supabase Client with service key (bypasses RLS to write to DB)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Save subscriber in local database with confirmed: false (Double Opt-in) and lang
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

    // Call Brevo Double Opt-in API endpoint with redirect URL pointing back to this function
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
