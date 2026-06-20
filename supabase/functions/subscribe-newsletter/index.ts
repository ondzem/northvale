// Supabase Edge Function to handle newsletter subscription via Brevo Double Opt-in
// Deploy via: npx supabase functions deploy subscribe-newsletter --project-ref bfxzhggjpiyqfolqpxzz

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const brevoListIdCZStr = Deno.env.get("BREVO_NEWSLETTER_LIST_ID") || "3";
    const brevoListIdENStr = Deno.env.get("BREVO_NEWSLETTER_LIST_ID_EN") || "4";
    const brevoTemplateIdCZStr = Deno.env.get("BREVO_NEWSLETTER_TEMPLATE_ID") || "1";
    const brevoTemplateIdENStr = Deno.env.get("BREVO_NEWSLETTER_TEMPLATE_ID_EN") || brevoTemplateIdCZStr;

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

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

    // 1. Initialize Supabase Client with service key (bypasses RLS to write to DB)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 2. Save subscriber in local database with confirmed: false (Double Opt-in) and lang
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

    // 3. Call Brevo Double Opt-in API endpoint
    const redirectUrl = lang === 'EN' 
      ? "https://northvaletcg.eu?confirmed=true&lang=en" 
      : "https://northvaletcg.eu?confirmed=true";

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
