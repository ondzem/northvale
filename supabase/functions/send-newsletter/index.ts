// Supabase Edge Function to create and send newsletter campaigns via Brevo API
// Deploy via: npx supabase functions deploy send-newsletter --project-ref bfxzhggjpiyqfolqpxzz

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const brevoApiKey = Deno.env.get("BREVO_API_KEY");
    const senderEmail = Deno.env.get("BREVO_SENDER_EMAIL") || "info@northvaletcg.eu";
    const senderName = Deno.env.get("BREVO_SENDER_NAME") || "NORTHVALE";
    const brevoListId = parseInt(Deno.env.get("BREVO_NEWSLETTER_LIST_ID") || "2", 10);
    const brevoTemplateId = parseInt(Deno.env.get("BREVO_NEWSLETTER_TEMPLATE_ID") || "1", 10);

    if (!brevoApiKey) {
      throw new Error("Missing BREVO_API_KEY environment variable in Supabase dashboard.");
    }

    // 1. GET Request: Fetch history of sent campaigns
    if (req.method === "GET") {
      const response = await fetch("https://api.brevo.com/v3/emailCampaigns?type=classic&limit=10", {
        method: "GET",
        headers: {
          "api-key": brevoApiKey,
          "accept": "application/json"
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Brevo API GET Campaigns error: ${errorText}`);
      }

      const data = await response.json();
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. POST Request: Create and send a new campaign
    if (req.method === "POST") {
      const { campaignName, subject, bannerUrl, content, buttonText, buttonUrl } = await req.json();

      if (!campaignName || !subject || !content) {
        return new Response(JSON.stringify({ error: "Missing required fields (campaignName, subject, content)" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Step A: Create the email campaign
      const createResponse = await fetch("https://api.brevo.com/v3/emailCampaigns", {
        method: "POST",
        headers: {
          "api-key": brevoApiKey,
          "content-type": "application/json",
          "accept": "application/json"
        },
        body: JSON.stringify({
          tag: "newsletter",
          sender: {
            name: senderName,
            email: senderEmail
          },
          name: campaignName,
          subject: subject,
          templateId: brevoTemplateId,
          recipients: {
            listIds: [brevoListId]
          },
          params: {
            BANNER_URL: bannerUrl || "",
            TEXT_ZPRAVY: content,
            TEXT_TLACITKA: buttonText || "Prohlížet nabídku",
            ODKAZ_TLACITKA: buttonUrl || "https://northvaletcg.eu"
          }
        })
      });

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        throw new Error(`Failed to create Brevo campaign. Brevo responded: ${errorText}`);
      }

      const campaignData = await createResponse.json();
      const campaignId = campaignData.id;

      if (!campaignId) {
        throw new Error("Brevo did not return a campaign ID after campaign creation.");
      }

      // Step B: Send the campaign immediately
      const sendResponse = await fetch(`https://api.brevo.com/v3/emailCampaigns/${campaignId}/sendNow`, {
        method: "POST",
        headers: {
          "api-key": brevoApiKey,
          "content-type": "application/json",
          "accept": "application/json"
        }
      });

      if (!sendResponse.ok) {
        const errorText = await sendResponse.text();
        throw new Error(`Created campaign ${campaignId} but failed to send. Brevo responded: ${errorText}`);
      }

      return new Response(JSON.stringify({ success: true, campaignId }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
