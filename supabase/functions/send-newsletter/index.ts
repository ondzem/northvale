// Supabase Edge Function to create and send custom newsletter campaigns via Brevo Campaigns API
// Deploy via: npx supabase functions deploy send-newsletter --project-ref bfxzhggjpiyqfolqpxzz

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

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
    const brevoListId = parseInt(Deno.env.get("BREVO_NEWSLETTER_LIST_ID") || "3", 10);

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!brevoApiKey) {
      throw new Error("Missing BREVO_API_KEY environment variable in Supabase dashboard.");
    }

    // Initialize Supabase Client with service key (bypasses RLS to write to storage)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    // 2. POST Request: Create and send a new custom campaign
    if (req.method === "POST") {
      const { campaignName, subject, blocks } = await req.json();

      if (!campaignName || !subject || !blocks || !Array.isArray(blocks)) {
        return new Response(JSON.stringify({ error: "Missing required fields (campaignName, subject, blocks)" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Step A: Ensure the newsletter-banners bucket exists
      // We ignore error in case it already exists
      await supabase.storage.createBucket('newsletter-banners', {
        public: true,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
      });

      // Step B: Iterate over blocks, upload any base64 images to Supabase Storage
      const processedBlocks = [];
      for (const block of blocks) {
        if (block.type === 'image' && block.content && block.content.startsWith('data:image/')) {
          try {
            // Extract content type and base64 payload
            const matches = block.content.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.*)$/);
            if (!matches || matches.length < 3) {
              throw new Error("Invalid base64 image structure.");
            }

            const contentType = matches[1];
            const base64Data = matches[2];
            const arrayBuffer = decode(base64Data);

            // Determine file extension
            let extension = "jpg";
            if (contentType.includes("png")) extension = "png";
            else if (contentType.includes("webp")) extension = "webp";
            else if (contentType.includes("gif")) extension = "gif";

            const fileName = `banner-${Date.now()}-${Math.floor(Math.random() * 10000)}.${extension}`;

            // Upload image to Supabase Storage
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('newsletter-banners')
              .upload(fileName, arrayBuffer, {
                contentType: contentType,
                upsert: true
              });

            if (uploadError) {
              throw new Error(`Storage upload error: ${uploadError.message}`);
            }

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
              .from('newsletter-banners')
              .getPublicUrl(fileName);

            processedBlocks.push({
              ...block,
              content: publicUrl
            });
            console.log(`Uploaded image to storage: ${publicUrl}`);

          } catch (imgErr) {
            console.error("Failed to process block image:", imgErr);
            // Fallback: keep block as is or use placeholder
            processedBlocks.push(block);
          }
        } else {
          processedBlocks.push(block);
        }
      }

      // Step C: Compile blocks into HTML structures
      let blocksHtml = "";
      for (const block of processedBlocks) {
        if (block.type === 'text') {
          // Replace newlines with <br> in text content, unless it already contains HTML elements
          const formattedContent = block.content.includes('<') && block.content.includes('>')
            ? block.content 
            : block.content.replace(/\n/g, '<br />');
          blocksHtml += `
            <div class="block-text" style="font-size: 16px; line-height: 1.6; color: #d1d1d6; margin-bottom: 24px; font-family: sans-serif;">
              ${formattedContent}
            </div>
          `;
        } else if (block.type === 'image') {
          blocksHtml += `
            <div class="block-image" style="margin-bottom: 24px; border-radius: 8px; overflow: hidden; border: 1px solid rgba(255,255,255,0.06);">
              <img src="${block.content}" alt="Banner" style="width: 100%; max-width: 100%; height: auto; display: block; border: 0;" />
            </div>
          `;
        } else if (block.type === 'button') {
          blocksHtml += `
            <div class="block-button" style="text-align: center; margin-bottom: 28px;">
              <a href="${block.url}" class="btn" target="_blank" style="display: inline-block; background-color: #E2BA5E; color: #0b0b0c !important; padding: 13px 32px; border-radius: 6px; font-weight: bold; text-decoration: none; text-transform: uppercase; font-size: 13px; letter-spacing: 0.5px; font-family: sans-serif;">
                ${block.text}
              </a>
            </div>
          `;
        }
      }

      // Step D: Wrap compiled blocks in a responsive layout matching Northvale TCG branding
      const compiledHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #0b0b0c;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #ffffff;
      -webkit-font-smoothing: antialiased;
    }
    table {
      border-collapse: collapse;
    }
    img {
      display: block;
      max-width: 100%;
      height: auto;
      border: 0;
    }
    .wrapper {
      width: 100%;
      background-color: #0b0b0c;
      padding: 40px 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #131316;
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px;
      overflow: hidden;
    }
    .header {
      padding: 30px;
      text-align: center;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      background-color: #131316;
    }
    .content {
      padding: 40px 30px;
    }
    .footer {
      padding: 30px;
      text-align: center;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      font-size: 11px;
      color: #8a8a93;
      background-color: #0b0b0c;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="wrapper" style="width: 100%; background-color: #0b0b0c; padding: 40px 0;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td align="center">
          <div class="container" style="max-width: 600px; width: 100%; background-color: #131316; border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 12px; overflow: hidden; text-align: left;">
            
            <!-- Header Logo -->
            <div class="header" style="padding: 24px; text-align: center; border-bottom: 1px solid rgba(255, 255, 255, 0.06); background-color: #131316;">
              <a href="https://northvaletcg.eu" target="_blank" style="text-decoration: none; display: inline-block;">
                <img src="https://northvaletcg.eu/logo%20s%20popisem.webp" alt="NORTHVALE" style="max-height: 40px; margin: 0 auto; display: block; border: 0;" />
              </a>
            </div>
            
            <!-- Email Body Blocks -->
            <div class="content" style="padding: 32px 24px;">
              ${blocksHtml}
            </div>
            
            <!-- Footer -->
            <div class="footer" style="padding: 28px 24px; text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.06); font-size: 11px; color: #8a8a93; background-color: #0b0b0c; line-height: 1.6; font-family: sans-serif;">
              <p style="margin: 0 0 6px 0; color: #fff; font-weight: bold;">NORTHVALE s.r.o. | Všechna práva vyhrazena.</p>
              <p style="margin: 0 0 16px 0;">E-mail: <a href="mailto:info@northvaletcg.eu" style="color: #E2BA5E; text-decoration: none;">info@northvaletcg.eu</a> | Tel: +420 739 666 779</p>
              <p style="margin: 0 0 12px 0; font-size: 10px; color: #6e6e73;">
                Tento e-mail byl odeslán na základě přihlášení k odběru newsletteru na našem webu northvaletcg.eu.
              </p>
              <p style="margin: 0;">
                <a href="{{ unsubscribe }}" style="color: #ff4d4f; text-decoration: underline; font-weight: bold;">Odhlásit se z odběru</a>
              </p>
            </div>

          </div>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`;

      // Step E: Call Brevo API to create the classical email campaign with htmlContent
      const createResponse = await fetch("https://api.brevo.com/v3/emailCampaigns", {
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
          name: campaignName,
          subject: subject,
          htmlContent: compiledHtml,
          recipients: {
            listIds: [brevoListId]
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

      // Step F: Send the campaign immediately
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
