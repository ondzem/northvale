// Supabase Edge Function to handle newsletter subscription
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
    const brevoListIdStr = Deno.env.get("BREVO_NEWSLETTER_LIST_ID") || "2"; // Default list ID is 2
    const brevoListId = parseInt(brevoListIdStr, 10);

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

    // 2. Save subscriber in local database (or update if already exists)
    const { data: dbData, error: dbError } = await supabase
      .from("newsletter_subscribers")
      .upsert(
        { email, unsubscribed: false, confirmed: true }, // We auto-confirm if direct, or we can toggle based on config
        { onConflict: "email" }
      )
      .select();

    if (dbError) {
      console.error("Database upsert error:", dbError.message);
      // We continue anyway, because adding to Brevo is the primary action
    }

    // 3. Call Brevo API to add the contact to the list
    const response = await fetch("https://api.brevo.com/v3/contacts", {
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

    // Brevo returns 201 (Created) or 204 (No Content - updated). If contact already exists in list, it might return 204 or 400 if already in list depending on settings
    if (!response.ok) {
      const errorText = await response.text();
      // If the error is simply "Contact already exists", we don't throw an error to the user
      if (errorText.includes("CONTACT_EXIST") || errorText.includes("already_exist")) {
        return new Response(JSON.stringify({ success: true, message: "Already subscribed" }), {
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
