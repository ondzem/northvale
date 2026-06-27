// Supabase Edge Function to send order confirmation email with full invoice via Brevo API
// Deploy via Supabase CLI: supabase functions deploy send-order-email

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const brevoApiKey = Deno.env.get("BREVO_API_KEY");
    const senderEmail = Deno.env.get("BREVO_SENDER_EMAIL") || "info@northvaletcg.eu";
    const senderName = Deno.env.get("BREVO_SENDER_NAME") || "NORTHVALE TCG";

    if (!brevoApiKey) {
      throw new Error("Missing BREVO_API_KEY environment variable.");
    }

    const { order, items } = await req.json();

    if (!order || !order.id || !order.customerEmail) {
      return new Response(JSON.stringify({ error: "Missing required order or customer details." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Set up Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Download generated PDF invoice from Storage and encode to base64
    let base64Invoice = "";
    try {
      const fileName = `invoice_${order.id}.pdf`;
      const { data: fileData, error: downloadError } = await supabase.storage
        .from("invoices")
        .download(fileName);

      if (downloadError) {
        console.error(`Error downloading invoice ${fileName}:`, downloadError);
      } else if (fileData) {
        const arrayBuffer = await fileData.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        base64Invoice = base64Encode(uint8Array);
        console.log(`Successfully loaded and base64-encoded invoice. Length: ${base64Invoice.length}`);
      }
    } catch (storageErr) {
      console.error("Storage download or encode failed:", storageErr);
    }

    // Calculations for values
    const total = parseFloat(order.finalTotal || order.totalPrice || '0');
    const orderDate = order.date || new Date().toLocaleDateString('cs-CZ');
    const pm = order.paymentMethod || "online platba";
    const displayPm = pm.includes("GP webpay") ? "Karta (GP webpay)" : pm;

    const isPersonalPickup = order.shippingMethod && (
      order.shippingMethod.includes('Osobní') || 
      order.shippingMethod.includes('Local Pickup') || 
      order.shippingMethod.includes('Pardubice') ||
      order.shippingMethod.includes('Holice')
    );

    const deliveryInstructions = isPersonalPickup 
      ? `
        <div style="background-color: #fcfbfa; padding: 15px 20px; border-left: 4px solid #fdbd16; border-radius: 4px; margin-bottom: 20px;">
          <h3 style="margin: 0 0 5px 0; font-size: 15px; color: #111;">📍 Osobní odběr Holice</h3>
          <p style="margin: 0; font-size: 13px; color: #555; line-height: 1.5;">
            Zboží pro Vás začínáme připravovat. Jakmile bude objednávka připravena k vyzvednutí na naší kontaktní adrese <strong>Bratří Čapků 1095, 534 01 Holice</strong>, zašleme Vám e-mail a SMS.
          </p>
        </div>
      `
      : `
        <div style="background-color: #fcfbfa; padding: 15px 20px; border-left: 4px solid #fdbd16; border-radius: 4px; margin-bottom: 20px;">
          <h3 style="margin: 0 0 5px 0; font-size: 15px; color: #111;">📦 Doručení zásilky</h3>
          <p style="margin: 0; font-size: 13px; color: #555; line-height: 1.5;">
            Zásilku odešleme přes <strong>${order.shippingMethod}</strong> v nejbližším možném termínu. Sledujte prosím svůj e-mail pro sledovací číslo balíku.
          </p>
        </div>
      `;

    // Download URL from Supabase Storage public bucket
    const downloadInvoiceUrl = `https://bfxzhggjpiyqfolpxzz.supabase.co/storage/v1/object/public/invoices/invoice_${order.id}.pdf`;

    // A. Dynamic parser for the custom "A _ Floating _ Minimal.html" template (Order Confirmation)
    let htmlConfirmContent = "";
    try {
      const templateRes = await fetch("https://bfxzhggjpiyqfolqpxzz.supabase.co/storage/v1/object/public/invoices/A_Floating_Minimal.html");
      if (templateRes.ok) {
        let htmlTemplate = await templateRes.text();

        // 1. Remove the emf-brand logo/heading block from the top left
        htmlTemplate = htmlTemplate.replace(/<div class="emf-brand"[\s\S]*?<\/div>\s*(?=<div class="emf-meta")/, "");

        // 2. Set the custom order ID in the header metadata
        htmlTemplate = htmlTemplate.replace(/<span class="emf-order">[\s\S]*?<\/span>/, `<span class="emf-order">#${order.id}</span>`);

        // 3. Inject custom delivery/pickup headers and body texts
        const pickupTitle = isPersonalPickup ? "Osobní odběr — Holice" : "Doručení zásilky";
        const pickupText = isPersonalPickup 
          ? `Zboží pro Vás začínáme připravovat. Jakmile bude objednávka připravena k vyzvednutí na naší kontaktní adrese <strong>Bratří Čapků 1095, 534 01 Holice</strong>, zašleme Vám e-mail a SMS.`
          : `Zásilku odešleme přes <strong>${order.shippingMethod}</strong> v nejbližším možném termínu. Sledujte prosím svůj e-mail pro sledovací číslo balíku.`;
        
        // Replace pickup block details
        htmlTemplate = htmlTemplate.replace(/<div class="emf-pickup-head">[\s\S]*?<\/div>/, `<div class="emf-pickup-head">${pickupTitle}</div>`);
        htmlTemplate = htmlTemplate.replace(/<p class="emf-pickup-text">[\s\S]*?<\/p>/, `<p class="emf-pickup-text">${pickupText}</p>`);

        // 4. Inject dynamic item rows
        let rowsHtml = "<tbody>";
        items.forEach((item: any) => {
          const itemTotal = parseFloat(item.price) * parseInt(item.quantity);
          rowsHtml += `
            <tr>
              <td class="emf-iname">${item.name}</td>
              <td class="emf-iqty r">${item.quantity} ks</td>
              <td class="emf-itotal r">${itemTotal.toLocaleString('cs-CZ')} Kč</td>
            </tr>
          `;
        });

        if (order.shippingCost && parseFloat(order.shippingCost) > 0) {
          rowsHtml += `
            <tr>
              <td class="emf-iname">Doprava - ${order.shippingMethod || 'Doprava'}</td>
              <td class="emf-iqty r">1 ks</td>
              <td class="emf-itotal r">${parseFloat(order.shippingCost).toLocaleString('cs-CZ')} Kč</td>
            </tr>
          `;
        }

        if (order.paymentSurcharge && parseFloat(order.paymentSurcharge) > 0) {
          rowsHtml += `
            <tr>
              <td class="emf-iname">Dobírkový příplatek</td>
              <td class="emf-iqty r">1 ks</td>
              <td class="emf-itotal r">${parseFloat(order.paymentSurcharge).toLocaleString('cs-CZ')} Kč</td>
            </tr>
          `;
        }
        rowsHtml += "</tbody>";
        htmlTemplate = htmlTemplate.replace(/<tbody>[\s\S]*?<\/tbody>/, rowsHtml);

        // 5. Update grand total value
        htmlTemplate = htmlTemplate.replace(/<span class="emf-grand-val">[\s\S]*?<\/span>/, `<span class="emf-grand-val">${total.toLocaleString('cs-CZ')} Kč</span>`);

        // 6. Fix contact link email address
        htmlTemplate = htmlTemplate.replace(/<a href="#">[\s\S]*?<\/a>/, `<a href="mailto:info@northvaletcg.eu" style="color: #FDBD16; text-decoration: underline;">info@northvaletcg.eu</a>`);

        htmlConfirmContent = htmlTemplate;
      } else {
        console.error("Failed to load template file, falling back to simple template.", templateRes.status);
      }
    } catch (templateErr) {
      console.error("Template parse failed, using fallback:", templateErr);
    }

    // Fallback confirmation layout if loading failed or returned empty
    if (!htmlConfirmContent) {
      htmlConfirmContent = `
        <div style="font-family: 'Inter', sans-serif; max-width: 650px; margin: 0 auto; padding: 25px; border: 1px solid #eaeaea; border-radius: 8px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 25px;">
            <h2 style="color: #fdbd16; font-size: 26px; font-weight: 800; margin: 0;">NORTHVALE TCG</h2>
            <p style="font-size: 13px; color: #888; margin: 5px 0 0 0;">Potvrzení objednávky #${order.id}</p>
          </div>

          <p style="font-size: 14px; color: #333; line-height: 1.5;">
            Dobrý den,<br/><br/>
            děkujeme za Váš nákup na NORTHVALE TCG. Vaši objednávku jsme v pořádku přijali a níže naleznete její shrnutí. V samostatném e-mailu Vám zasíláme také daňový doklad (fakturu).
          </p>

          ${deliveryInstructions}

          <h4 style="font-size: 14px; text-transform: uppercase; color: #777; margin: 25px 0 10px 0; border-bottom: 1px solid #eee; padding-bottom: 5px;">Položky objednávky:</h4>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
            <thead>
              <tr style="background-color: #f5f5f7;">
                <th style="padding: 10px; text-align: left; font-size: 11px; text-transform: uppercase; color: #555; font-weight: bold;">Položka</th>
                <th style="padding: 10px; text-align: center; font-size: 11px; text-transform: uppercase; color: #555; font-weight: bold; width: 60px;">Množství</th>
                <th style="padding: 10px; text-align: right; font-size: 11px; text-transform: uppercase; color: #555; font-weight: bold; width: 110px;">Celkem</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((item: any) => `
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #eee; font-size: 13px; color: #333;">${item.name}</td>
                  <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center; font-size: 13px; color: #333;">${item.quantity} ks</td>
                  <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right; font-size: 13px; font-weight: bold; color: #111;">${(parseFloat(item.price) * parseInt(item.quantity)).toLocaleString('cs-CZ')} Kč</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div style="background-color: #fafafa; border: 1px solid #eee; padding: 15px; border-radius: 6px; text-align: right;">
            <span style="font-size: 12px; color: #666;">Celkem zaplaceno:</span><br/>
            <strong style="font-size: 20px; color: #2e7d32; display: block; margin-top: 5px;">${total.toLocaleString('cs-CZ')} Kč</strong>
          </div>
        </div>
      `;
    }

    // 2. Customer Tax Invoice Email Content (Fakturoid-style layout with download button and guidelines)
    const htmlInvoiceContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px 20px; background-color: #ffffff;">
        
        <!-- Header -->
        <div style="margin-bottom: 30px;">
          <h2 style="color: #111111; font-size: 24px; font-weight: 800; margin: 0; letter-spacing: -0.5px;">NORTHVALE TCG</h2>
          <p style="font-size: 12px; color: #888888; margin: 5px 0 0 0;">Faktura / Daňový doklad č. ${order.id}</p>
        </div>

        <p style="font-size: 14.5px; color: #222222; line-height: 1.6; margin: 0 0 20px 0;">
          Dobrý den,<br/><br/>
          Vaše platba přes platební bránu proběhla úspěšně. V příloze tohoto e-mailu naleznete oficiální daňový doklad (fakturu) ve formátu PDF. Fakturu si můžete také kdykoliv stáhnout kliknutím na níže uvedené tlačítko.
        </p>

        <!-- Download Action Box -->
        <div style="background-color: #fafafa; border: 1px solid #f0f0f0; border-radius: 6px; padding: 25px; text-align: center; margin: 25px 0;">
          <span style="font-size: 13px; color: #666666;">Faktura / daňový doklad ke stažení:</span>
          <strong style="font-size: 18px; color: #111111; display: block; margin: 5px 0 15px 0;">Faktura č. ${order.id}</strong>
          
          <a href="${downloadInvoiceUrl}" target="_blank" style="background-color: #fdbd16; color: #111111; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block; border: 1px solid #e2a80f;">
            Stáhnout fakturu (PDF)
          </a>
        </div>

        <!-- Supplier & Customer Address Details -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr>
            <td style="padding: 8px 0; font-size: 12px; color: #777777; text-transform: uppercase;">Dodavatel</td>
            <td style="padding: 8px 0; font-size: 12px; color: #777777; text-transform: uppercase; text-align: right;">Odběratel</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; vertical-align: top; font-size: 13px; line-height: 1.5; color: #333333;">
              <strong>NORTHVALE s.r.o.</strong><br/>
              Bratří Čapků 1095<br/>
              534 01 Holice<br/>
              IČO: 29618142<br/>
              DIČ: CZ29618142
            </td>
            <td style="padding: 4px 0; vertical-align: top; font-size: 13px; line-height: 1.5; color: #333333; text-align: right;">
              <strong>${order.customerName}</strong><br/>
              ${order.shippingStreet || ''}<br/>
              ${order.shippingCity || ''}, ${order.shippingZip || ''}<br/>
              ${order.ico ? `IČO: ${order.ico}<br/>` : ''}
              ${order.dic ? `DIČ: ${order.dic}<br/>` : ''}
              Tel: ${order.customerPhone || '—'}
            </td>
          </tr>
        </table>

        <!-- Dates Table -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 12px; background-color: #f9f9f9; padding: 10px; border-radius: 4px;">
          <tr>
            <td style="padding: 8px; color: #555555;"><strong>Datum vystavení / DUZP:</strong> ${orderDate}</td>
            <td style="padding: 8px; color: #555555; text-align: right;"><strong>Forma úhrady:</strong> ${displayPm}</td>
          </tr>
        </table>

        <!-- Amount Box -->
        <div style="background-color: #fafafa; border: 1px solid #eee; padding: 15px; border-radius: 6px; text-align: center; margin-bottom: 20px;">
          <span style="font-size: 12px; color: #666666;">Celková uhrazená částka:</span><br/>
          <strong style="font-size: 20px; color: #157517; display: block; margin-top: 5px;">${total.toLocaleString('cs-CZ')} Kč</strong>
          <span style="font-size: 11px; color: #157517; font-weight: bold; display: block; margin-top: 4px;">Uhrazeno</span>
        </div>

        <!-- Help / System Info list (Fakturoid-style notes) -->
        <div style="border-top: 1px solid #f0f0f0; padding-top: 20px; margin-bottom: 20px;">
          <ul style="padding-left: 20px; margin: 0; font-size: 12.5px; color: #666666; line-height: 1.7;">
            <li style="margin-bottom: 8px;">Pokud se Vám faktura v příloze nebo po kliknutí na tlačítko nezobrazila, zkuste to prosím o chvíli později. Může se stát, že dokument ještě plně neprošel celým naším systémem.</li>
            <li style="margin-bottom: 8px;">Doklad si prosím pečlivě uschovejte pro případné pozdější využití. Rádi bychom Vás současně ujistili, že plně akceptujeme elektronickou podobu daňového dokladu.</li>
            <li style="margin-bottom: 8px;">Věnujte prosím chvilku překontrolování všech uvedených údajů. Pokud by cokoliv nesouhlasilo, stačí nás kontaktovat na e-mailové adrese <a href="mailto:info@northvaletcg.eu" style="color: #111111; font-weight: bold; text-decoration: underline;">info@northvaletcg.eu</a>.</li>
          </ul>
        </div>

        <!-- Footer Details -->
        <div style="text-align: center; border-top: 1px solid #f0f0f0; padding-top: 20px; margin-top: 30px;">
          <p style="font-size: 11px; color: #999999; margin: 0; line-height: 1.5;">
            NORTHVALE s.r.o., Bratří Čapků 1095, 534 01 Holice | IČO: 29618142, DIČ: CZ29618142<br/>
            Společnost zapsaná u Krajského soudu v Hradci Králové, oddíl C, vložka 29618142.
          </p>
        </div>
      </div>
    `;

    // 3. Admin Notification Content
    const htmlAdminAlertContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #eaeaea; border-radius: 8px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 25px;">
          <h2 style="color: #2e7d32; font-size: 24px; font-weight: 800; margin: 0;">🚀 NOVÁ OBJEDNÁVKA</h2>
          <p style="font-size: 14px; color: #555; margin: 5px 0 0 0;">Objednávka #${order.id} byla vytvořena a uhrazena.</p>
        </div>

        <h4 style="font-size: 12px; text-transform: uppercase; color: #777; margin: 20px 0 10px 0; border-bottom: 1px solid #eee; padding-bottom: 5px;">Údaje zákazníka:</h4>
        <p style="font-size: 13px; color: #333; line-height: 1.5; margin: 0 0 16px 0;">
          <strong>Jméno:</strong> ${order.customerName}<br/>
          <strong>E-mail:</strong> ${order.customerEmail}<br/>
          <strong>Telefon:</strong> ${order.customerPhone || '—'}<br/>
          <strong>Adresa:</strong> ${order.shippingStreet || '—'}, ${order.shippingCity || '—'}, ${order.shippingZip || '—'}<br/>
          <strong>Způsob dopravy:</strong> ${order.shippingMethod}<br/>
          <strong>Poznámka:</strong> ${order.notes || '—'}
        </p>

        <h4 style="font-size: 12px; text-transform: uppercase; color: #777; margin: 20px 0 10px 0; border-bottom: 1px solid #eee; padding-bottom: 5px;">Položky objednávky:</h4>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
          <thead>
            <tr style="background-color: #f5f5f7; text-align: left;">
              <th style="padding: 8px; font-size: 11px; text-transform: uppercase; color: #555; font-weight: bold;">Položka</th>
              <th style="padding: 8px; font-size: 11px; text-transform: uppercase; color: #555; font-weight: bold; text-align: center; width: 60px;">Množství</th>
              <th style="padding: 8px; font-size: 11px; text-transform: uppercase; color: #555; font-weight: bold; text-align: right; width: 110px;">Celkem</th>
            </tr>
          </thead>
          <tbody>
            ${items.map((item: any) => `
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee; font-size: 12px; color: #333;">${item.name}</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center; font-size: 12px; color: #333;">${item.quantity} ks</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right; font-size: 12px; font-weight: bold; color: #111;">${(parseFloat(item.price) * parseInt(item.quantity)).toLocaleString('cs-CZ')} Kč</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div style="background-color: #f8f9fa; border: 1px solid #eee; padding: 15px; border-radius: 6px; text-align: right;">
          <span style="font-size: 11px; color: #666;">Celková cena:</span><br/>
          <strong style="font-size: 18px; color: #2e7d32; display: block; margin-top: 3px;">${total.toLocaleString('cs-CZ')} Kč</strong>
        </div>
      </div>
    `;

    // Construct attachment object if base64Invoice is available
    const attachments = base64Invoice ? [
      {
        name: `faktura_${order.id}.pdf`,
        content: base64Invoice
      }
    ] : [];

    // Custom Subject format for Tax Invoice
    const invoiceEmailSubject = `Faktura - daňový doklad č. ${order.id} ze dne ${orderDate}`;

    // 1. Send Order Confirmation Email to Customer (Using the parsed Floating Minimal HTML template)
    await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": brevoApiKey,
        "content-type": "application/json",
        "accept": "application/json"
      },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: [{ email: order.customerEmail, name: order.customerName }],
        subject: `[NORTHVALE] Potvrzení objednávky #${order.id}`,
        htmlContent: htmlConfirmContent,
        attachment: attachments.length > 0 ? attachments : undefined
      })
    });

    // 2. Send Invoice Email to Customer (Custom Subject and Fakturoid-style layout)
    await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": brevoApiKey,
        "content-type": "application/json",
        "accept": "application/json"
      },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: [{ email: order.customerEmail, name: order.customerName }],
        subject: invoiceEmailSubject,
        htmlContent: htmlInvoiceContent,
        attachment: attachments.length > 0 ? attachments : undefined
      })
    });

    // 3. Send Admin Alert Email
    await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": brevoApiKey,
        "content-type": "application/json",
        "accept": "application/json"
      },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: [{ email: recipientEmail, name: "NORTHVALE Admin" }],
        subject: `[NORTHVALE - ADMIN] Nová objednávka #${order.id}`,
        htmlContent: htmlAdminAlertContent,
        attachment: attachments.length > 0 ? attachments : undefined
      })
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Error in send-order-email:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
