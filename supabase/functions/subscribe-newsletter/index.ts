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
    const brevoListIdStr = Deno.env.get("BREVO_NEWSLETTER_LIST_ID") || "3";
    const brevoListId = parseInt(brevoListIdStr, 10);
    const brevoTemplateIdStr = Deno.env.get("BREVO_NEWSLETTER_TEMPLATE_ID") || "1";
    const brevoTemplateId = parseInt(brevoTemplateIdStr, 10);

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!brevoApiKey) {
      throw new Error("Missing BREVO_API_KEY environment variable in Supabase dashboard.");
    }

    const { email } = await req.json();

    if (!email) {
      return new Response(JSON.stringify({ error: "Missing required field (email)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Initialize Supabase Client with service key (bypasses RLS to write to DB)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 2. Save subscriber in local database with confirmed: false (Double Opt-in)
    const { data: dbData, error: dbError } = await supabase
      .from("newsletter_subscribers")
      .upsert(
        { email, unsubscribed: false, confirmed: false },
        { onConflict: "email" }
      )
      .select();

    if (dbError) {
      console.error("Database upsert error:", dbError.message);
      // We continue anyway, because adding to Brevo is the primary action
    }

    // 3. Call Brevo Double Opt-in API endpoint
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
        redirectionUrl: "https://northvaletcg.eu?confirmed=true"
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      // If the contact already exists or is pending confirmation, Brevo might return an error.
      // If it's a "contact already exists" warning, we can ignore or return success.
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
