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

async function uploadBase64Image(supabase: any, base64Content: string): Promise<string> {
  const matches = base64Content.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.*)$/);
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

  const { data, error } = await supabase.storage
    .from('newsletter-banners')
    .upload(fileName, arrayBuffer, {
      contentType: contentType,
      upsert: true
    });

  if (error) {
    throw new Error(`Storage upload error: ${error.message}`);
  }

  const { data: { publicUrl } } = supabase.storage
    .from('newsletter-banners')
    .getPublicUrl(fileName);

  return publicUrl;
}

function compileHtml(subject: string, blocksHtml: string, isEnglish: boolean): string {
  const unsubscribeText = isEnglish ? "Unsubscribe" : "Odhlásit se z odběru";
  const emailFooterInfo = isEnglish 
    ? "This email was sent based on newsletter subscription on our website northvaletcg.eu." 
    : "Tento e-mail byl odeslán na základě přihlášení k odběru newsletteru na našem webu northvaletcg.eu.";
  const copyrightText = isEnglish
    ? "NORTHVALE s.r.o. | All rights reserved."
    : "NORTHVALE s.r.o. | Všechna práva vyhrazena.";

  return `<!DOCTYPE html>
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
      max-width: 660px;
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
      padding: 0;
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
          <div class="container" style="max-width: 660px; width: 100%; background-color: #131316; border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 12px; overflow: hidden; text-align: left;">
            
            <!-- Header Logo -->
            <div class="header" style="padding: 24px; text-align: center; border-bottom: 1px solid rgba(255, 255, 255, 0.06); background-color: #131316;">
              <a href="https://northvaletcg.eu" target="_blank" style="text-decoration: none; display: inline-block;">
                <img src="https://northvaletcg.eu/logo%20s%20popisem.webp" alt="NORTHVALE" style="max-height: 65px; margin: 0 auto; display: block; border: 0;" />
              </a>
            </div>
            
            <!-- Email Body Blocks -->
            <div class="content" style="padding: 0;">
              ${blocksHtml}
            </div>
            
            <!-- Footer -->
            <div class="footer" style="padding: 28px 24px; text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.06); font-size: 11px; color: #8a8a93; background-color: #0b0b0c; line-height: 1.6; font-family: sans-serif;">
              <p style="margin: 0 0 6px 0; color: #fff; font-weight: bold;">${copyrightText}</p>
              <p style="margin: 0 0 16px 0;">E-mail: <a href="mailto:info@northvaletcg.eu" style="color: #E2BA5E; text-decoration: none;">info@northvaletcg.eu</a> | Tel: +420 739 666 779</p>
              <p style="margin: 0 0 12px 0; font-size: 10px; color: #6e6e73;">
                ${emailFooterInfo}
              </p>
              <p style="margin: 16px 0 0 0;">
                <a href="{{ unsubscribe }}" style="color: #55555c; text-decoration: underline; font-size: 11px; font-weight: normal; display: inline-block; font-family: sans-serif;">${unsubscribeText}</a>
              </p>
            </div>

          </div>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`;
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const brevoApiKey = Deno.env.get("BREVO_API_KEY");
    const senderEmail = Deno.env.get("BREVO_SENDER_EMAIL") || "info@northvaletcg.eu";
    const senderName = Deno.env.get("BREVO_SENDER_NAME") || "NORTHVALE";
    const brevoListIdCZ = parseInt(Deno.env.get("BREVO_NEWSLETTER_LIST_ID") || "3", 10);
    const brevoListIdEN = parseInt(Deno.env.get("BREVO_NEWSLETTER_LIST_ID_EN") || "4", 10);

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!brevoApiKey) {
      throw new Error("Missing BREVO_API_KEY environment variable in Supabase dashboard.");
    }

    // Initialize Supabase Client with service key (bypasses RLS to write to storage)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. GET Request: Fetch history of sent campaigns OR details of a single campaign
    if (req.method === "GET") {
      const url = new URL(req.url);
      const campaignId = url.searchParams.get("id");

      if (campaignId) {
        const response = await fetch(`https://api.brevo.com/v3/emailCampaigns/${campaignId}`, {
          method: "GET",
          headers: {
            "api-key": brevoApiKey,
            "accept": "application/json"
          }
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Brevo API GET Campaign details error: ${errorText}`);
        }

        const data = await response.json();
        return new Response(JSON.stringify(data), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

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

    // 2. POST Request: Create and send a new custom campaign OR clone and send an existing one
    if (req.method === "POST") {
      const body = await req.json();
      const { cloneCampaignId } = body;

      if (cloneCampaignId) {
        // Step A: Fetch original campaign from Brevo
        const originalResponse = await fetch(`https://api.brevo.com/v3/emailCampaigns/${cloneCampaignId}`, {
          method: "GET",
          headers: {
            "api-key": brevoApiKey,
            "accept": "application/json"
          }
        });

        if (!originalResponse.ok) {
          const errorText = await originalResponse.text();
          throw new Error(`Brevo API GET original campaign error: ${errorText}`);
        }

        const originalData = await originalResponse.json();

        // Step B: Create a new campaign with same content
        const newCampaignName = `${originalData.name} (Resent ${new Date().toLocaleDateString()})`;
        const createResponse = await fetch("https://api.brevo.com/v3/emailCampaigns", {
          method: "POST",
          headers: {
            "api-key": brevoApiKey,
            "content-type": "application/json",
            "accept": "application/json"
          },
          body: JSON.stringify({
            sender: {
              name: originalData.sender?.name || senderName,
              email: originalData.sender?.email || senderEmail
            },
            name: newCampaignName,
            subject: originalData.subject,
            htmlContent: originalData.htmlContent,
            recipients: {
              listIds: originalData.recipients?.listIds || [brevoListIdCZ]
            }
          })
        });

        if (!createResponse.ok) {
          const errorText = await createResponse.text();
          throw new Error(`Failed to create cloned campaign. Brevo responded: ${errorText}`);
        }

        const newCampaignData = await createResponse.json();
        const newCampaignId = newCampaignData.id;

        if (newCampaignId) {
          const sendResponse = await fetch(`https://api.brevo.com/v3/emailCampaigns/${newCampaignId}/sendNow`, {
            method: "POST",
            headers: {
              "api-key": brevoApiKey,
              "content-type": "application/json",
              "accept": "application/json"
            }
          });
          if (!sendResponse.ok) {
            const errorText = await sendResponse.text();
            throw new Error(`Cloned campaign created (${newCampaignId}) but sendNow failed: ${errorText}`);
          }
        }

        return new Response(JSON.stringify({ success: true, campaignIds: [newCampaignId] }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { campaignName, subject, subjectEN, blocks } = body;

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

      // Step B: Iterate over blocks, upload base64 images (for both CZ and EN versions)
      const processedBlocks = [];
      for (const block of blocks) {
        let contentUrl = block.content;
        let contentENUrl = block.contentEN;

        if (block.type === 'image') {
          if (block.content && block.content.startsWith('data:image/')) {
            try {
              contentUrl = await uploadBase64Image(supabase, block.content);
            } catch (err) {
              console.error("Failed to upload CZ image:", err);
            }
          }
          if (block.contentEN && block.contentEN.startsWith('data:image/')) {
            try {
              contentENUrl = await uploadBase64Image(supabase, block.contentEN);
            } catch (err) {
              console.error("Failed to upload EN image:", err);
            }
          }
        }

        processedBlocks.push({
          ...block,
          content: contentUrl,
          contentEN: contentENUrl || contentUrl
        });
      }

      // Step C: Compile blocks into HTML structures for CZ
      let blocksHtmlCZ = "";
      for (const block of processedBlocks) {
        if (block.type === 'text') {
          const formattedContent = block.content.includes('<') && block.content.includes('>')
            ? block.content 
            : block.content.replace(/\n/g, '<br />');
          blocksHtmlCZ += `
            <div class="block-text" style="font-size: 16px; line-height: 1.6; color: #d1d1d6; padding: 20px 30px 10px 30px; font-family: sans-serif; word-break: break-word;">
              ${formattedContent}
            </div>
          `;
        } else if (block.type === 'image') {
          const imgTag = `<img src="${block.content}" alt="Banner" style="width: 100%; max-width: 100%; height: auto; display: block; border: 0;" />`;
          const wrappedImg = block.linkUrl
            ? `<a href="${block.linkUrl}" target="_blank" style="display: block; text-decoration: none; border: 0;">${imgTag}</a>`
            : imgTag;
          blocksHtmlCZ += `
            <div class="block-image" style="padding: 0 0 16px 0; margin: 0; overflow: hidden;">
              ${wrappedImg}
            </div>
          `;
        } else if (block.type === 'button') {
          blocksHtmlCZ += `
            <div class="block-button" style="text-align: center; padding: 12px 30px 20px 30px;">
              <a href="${block.url}" class="btn" target="_blank" style="display: inline-block; background-color: #E2BA5E; color: #0b0b0c !important; padding: 13px 32px; border-radius: 6px; font-weight: bold; text-decoration: none; text-transform: uppercase; font-size: 13px; letter-spacing: 0.5px; font-family: sans-serif;">
                ${block.text}
              </a>
            </div>
          `;
        }
      }

      // Step C2: Compile blocks into HTML structures for EN
      let blocksHtmlEN = "";
      for (const block of processedBlocks) {
        if (block.type === 'text') {
          const rawContent = block.contentEN || block.content;
          const formattedContent = rawContent.includes('<') && rawContent.includes('>')
            ? rawContent 
            : rawContent.replace(/\n/g, '<br />');
          blocksHtmlEN += `
            <div class="block-text" style="font-size: 16px; line-height: 1.6; color: #d1d1d6; padding: 20px 30px 10px 30px; font-family: sans-serif; word-break: break-word;">
              ${formattedContent}
            </div>
          `;
        } else if (block.type === 'image') {
          const imgUrl = block.contentEN || block.content;
          const targetLink = block.linkUrlEN || block.linkUrl;
          const imgTag = `<img src="${imgUrl}" alt="Banner" style="width: 100%; max-width: 100%; height: auto; display: block; border: 0;" />`;
          const wrappedImg = targetLink
            ? `<a href="${targetLink}" target="_blank" style="display: block; text-decoration: none; border: 0;">${imgTag}</a>`
            : imgTag;
          blocksHtmlEN += `
            <div class="block-image" style="padding: 0 0 16px 0; margin: 0; overflow: hidden;">
              ${wrappedImg}
            </div>
          `;
        } else if (block.type === 'button') {
          const btnText = block.textEN || block.text;
          const btnUrl = block.urlEN || block.url;
          blocksHtmlEN += `
            <div class="block-button" style="text-align: center; padding: 12px 30px 20px 30px;">
              <a href="${btnUrl}" class="btn" target="_blank" style="display: inline-block; background-color: #E2BA5E; color: #0b0b0c !important; padding: 13px 32px; border-radius: 6px; font-weight: bold; text-decoration: none; text-transform: uppercase; font-size: 13px; letter-spacing: 0.5px; font-family: sans-serif;">
                ${btnText}
              </a>
            </div>
          `;
        }
      }

      // Step D: Wrap compiled blocks in layouts
      const compiledHtmlCZ = compileHtml(subject, blocksHtmlCZ, false);
      const compiledHtmlEN = compileHtml(subjectEN || subject, blocksHtmlEN, true);

      const sentCampaignIds = [];

      // Step E1: Create and send Czech email campaign
      const createCZResponse = await fetch("https://api.brevo.com/v3/emailCampaigns", {
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
          name: `${campaignName} [CZ]`,
          subject: subject,
          htmlContent: compiledHtmlCZ,
          recipients: {
            listIds: [brevoListIdCZ]
          }
        })
      });

      if (!createCZResponse.ok) {
        const errorText = await createCZResponse.text();
        throw new Error(`Failed to create Czech campaign. Brevo responded: ${errorText}`);
      }

      const campaignCZData = await createCZResponse.json();
      const campaignCZId = campaignCZData.id;

      if (campaignCZId) {
        const sendCZResponse = await fetch(`https://api.brevo.com/v3/emailCampaigns/${campaignCZId}/sendNow`, {
          method: "POST",
          headers: {
            "api-key": brevoApiKey,
            "content-type": "application/json",
            "accept": "application/json"
          }
        });
        if (sendCZResponse.ok) {
          sentCampaignIds.push(campaignCZId);
        } else {
          console.error(`Czech campaign created (${campaignCZId}) but sendNow failed:`, await sendCZResponse.text());
        }
      }

      // Step E2: Create and send English email campaign (only if EN list ID is different and valid)
      if (brevoListIdEN !== brevoListIdCZ && !isNaN(brevoListIdEN)) {
        const createENResponse = await fetch("https://api.brevo.com/v3/emailCampaigns", {
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
            name: `${campaignName} [EN]`,
            subject: subjectEN || subject,
            htmlContent: compiledHtmlEN,
            recipients: {
              listIds: [brevoListIdEN]
            }
          })
        });

        if (createENResponse.ok) {
          const campaignENData = await createENResponse.json();
          const campaignENId = campaignENData.id;
          if (campaignENId) {
            const sendENResponse = await fetch(`https://api.brevo.com/v3/emailCampaigns/${campaignENId}/sendNow`, {
              method: "POST",
              headers: {
                "api-key": brevoApiKey,
                "content-type": "application/json",
                "accept": "application/json"
              }
            });
            if (sendENResponse.ok) {
              sentCampaignIds.push(campaignENId);
            } else {
              console.error(`English campaign created (${campaignENId}) but sendNow failed:`, await sendENResponse.text());
            }
          }
        } else {
          console.error("Failed to create English campaign. Brevo responded:", await createENResponse.text());
        }
      }

      return new Response(JSON.stringify({ success: true, campaignIds: sentCampaignIds }), {
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
