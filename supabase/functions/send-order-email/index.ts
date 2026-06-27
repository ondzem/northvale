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

    // Calculations for Czech VAT (21% standard rate)
    const vatRate = 0.21;
    const total = parseFloat(order.finalTotal || order.totalPrice || '0');
    const base = total / (1 + vatRate);
    const vat = total - base;

    let itemsRows = "";
    items.forEach((item: any) => {
      const itemTotal = parseFloat(item.price) * parseInt(item.quantity);
      itemsRows += `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: left; font-size: 13px; color: #333;">${item.name}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center; font-size: 13px; color: #333;">${item.quantity} ks</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right; font-size: 13px; color: #333;">${parseFloat(item.price).toLocaleString('cs-CZ')} Kč</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center; font-size: 13px; color: #333;">21%</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right; font-size: 13px; font-weight: bold; color: #111;">${itemTotal.toLocaleString('cs-CZ')} Kč</td>
        </tr>
      `;
    });

    if (order.shippingCost && parseFloat(order.shippingCost) > 0) {
      itemsRows += `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: left; font-size: 13px; color: #333;">${order.shippingMethod || 'Doprava'}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center; font-size: 13px; color: #333;">1 ks</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right; font-size: 13px; color: #333;">${parseFloat(order.shippingCost).toLocaleString('cs-CZ')} Kč</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center; font-size: 13px; color: #333;">21%</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right; font-size: 13px; font-weight: bold; color: #111;">${parseFloat(order.shippingCost).toLocaleString('cs-CZ')} Kč</td>
        </tr>
      `;
    }

    if (order.paymentSurcharge && parseFloat(order.paymentSurcharge) > 0) {
      itemsRows += `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: left; font-size: 13px; color: #333;">Dobírkový příplatek</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center; font-size: 13px; color: #333;">1 ks</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right; font-size: 13px; color: #333;">${parseFloat(order.paymentSurcharge).toLocaleString('cs-CZ')} Kč</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center; font-size: 13px; color: #333;">21%</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right; font-size: 13px; font-weight: bold; color: #111;">${parseFloat(order.paymentSurcharge).toLocaleString('cs-CZ')} Kč</td>
        </tr>
      `;
    }

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

    // 1. Customer Order Confirmation Content
    const htmlConfirmContent = `
      <div style="font-family: 'Inter', sans-serif; max-width: 650px; margin: 0 auto; padding: 25px; border: 1px solid #eaeaea; border-radius: 8px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 25px;">
          <h2 style="color: #fdbd16; font-size: 26px; font-weight: 800; margin: 0;">NORTHVALE TCG</h2>
          <p style="font-size: 13px; color: #888; margin: 5px 0 0 0;">Potvrzení objednávky #${order.id}</p>
        </div>

        <p style="font-size: 14px; color: #333; line-height: 1.5;">
          Dobrý den,<br/><br/>
          děkujeme za Váš nákup na NORTHVALE TCG. Vaši objednávku jsme v pořádku přijali a níže naleznete její shrnutí. V příloze tohoto e-mailu naleznete také oficiální daňový doklad (fakturu v PDF).
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

        <div style="text-align: center; margin-top: 25px; border-top: 1px solid #eee; padding-top: 20px;">
          <p style="font-size: 11px; color: #888;">
            Tento e-mail byl odeslán automaticky. V případě jakýchkoli dotazů nás kontaktujte na <a href="mailto:info@northvaletcg.eu" style="color: #fdbd16;">info@northvaletcg.eu</a>.
          </p>
        </div>
      </div>
    `;

    // 2. Customer Tax Invoice Content
    const htmlInvoiceContent = `
      <div style="font-family: 'Inter', sans-serif; max-width: 650px; margin: 0 auto; padding: 25px; border: 1px solid #eaeaea; border-radius: 8px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 25px;">
          <h2 style="color: #fdbd16; font-size: 26px; font-weight: 800; margin: 0;">NORTHVALE TCG</h2>
          <p style="font-size: 13px; color: #888; margin: 5px 0 0 0;">Faktura / Daňový doklad k objednávce #${order.id}</p>
        </div>

        <div style="background-color: #fcfbfa; padding: 15px 20px; border-left: 4px solid #fdbd16; border-radius: 4px; margin-bottom: 20px;">
          <h3 style="margin: 0 0 5px 0; font-size: 15px; color: #111;">Faktura byla vystavena a uhrazena</h3>
          <p style="margin: 0; font-size: 13px; color: #555; line-height: 1.5;">
            Vaše platba přes platební bránu proběhla úspěšně. V příloze tohoto e-mailu naleznete oficiální daňový doklad ve formátu PDF.
          </p>
        </div>

        <!-- Invoice Details Header Summary -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr>
            <td style="padding: 8px 0; font-size: 12px; color: #777; text-transform: uppercase;">Dodavatel</td>
            <td style="padding: 8px 0; font-size: 12px; color: #777; text-transform: uppercase; text-align: right;">Odběratel</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; vertical-align: top; font-size: 13px; line-height: 1.5; color: #333;">
              <strong>NORTHVALE s.r.o.</strong><br/>
              Bratří Čapků 1095<br/>
              534 01 Holice<br/>
              IČO: 29618142<br/>
              DIČ: CZ29618142
            </td>
            <td style="padding: 4px 0; vertical-align: top; font-size: 13px; line-height: 1.5; color: #333; text-align: right;">
              <strong>${order.customerName}</strong><br/>
              ${order.shippingStreet || ''}<br/>
              ${order.shippingCity || ''}, ${order.shippingZip || ''}<br/>
              ${order.ico ? `IČO: ${order.ico}<br/>` : ''}
              ${order.dic ? `DIČ: ${order.dic}<br/>` : ''}
              Tel: ${order.customerPhone || '—'}
            </td>
          </tr>
        </table>

        <!-- Dates -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 12px; background-color: #f9f9f9; padding: 10px; border-radius: 4px;">
          <tr>
            <td style="padding: 8px; color: #555;"><strong>Datum vystavení / DUZP:</strong> ${order.date || new Date().toLocaleDateString('cs-CZ')}</td>
            <td style="padding: 8px; color: #555; text-align: right;"><strong>Forma úhrady:</strong> ${order.paymentMethod}</td>
          </tr>
        </table>

        <div style="background-color: #fafafa; border: 1px solid #eee; padding: 15px; border-radius: 6px; text-align: center; margin-bottom: 20px;">
          <span style="font-size: 12px; color: #666;">Celková uhrazená částka:</span><br/>
          <strong style="font-size: 20px; color: #2e7d32; display: block; margin-top: 5px;">${total.toLocaleString('cs-CZ')} Kč</strong>
          <span style="font-size: 11px; color: #2e7d32; font-weight: bold; display: block; margin-top: 4px;">🟢 Uhrazeno</span>
        </div>

        <div style="text-align: center; margin-top: 25px; border-top: 1px solid #eee; padding-top: 20px;">
          <p style="font-size: 11px; color: #888;">
            Kompletní rozpis položek a kalkulaci DPH naleznete v přiloženém PDF souboru.
          </p>
        </div>
      </div>
    `;

    // 3. Admin Notification Content
    const recipientEmail = Deno.env.get("BREVO_RECIPIENT_EMAIL") || "info@northvaletcg.eu";
    const htmlAdminAlertContent = `
      <div style="font-family: 'Inter', sans-serif; max-width: 650px; margin: 0 auto; padding: 25px; border: 1px solid #eaeaea; border-radius: 8px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 25px;">
          <h2 style="color: #2e7d32; font-size: 24px; font-weight: 800; margin: 0;">🚀 NOVÁ OBJEDNÁVKA</h2>
          <p style="font-size: 14px; color: #555; margin: 5px 0 0 0;">Objednávka #${order.id} byla uhrazena a vytvořena.</p>
        </div>

        <h4 style="font-size: 14px; text-transform: uppercase; color: #777; margin: 20px 0 10px 0; border-bottom: 1px solid #eee; padding-bottom: 5px;">Údaje zákazníka:</h4>
        <p style="font-size: 13.5px; color: #333; line-height: 1.5; margin: 0 0 16px 0;">
          <strong>Jméno:</strong> ${order.customerName}<br/>
          <strong>E-mail:</strong> ${order.customerEmail}<br/>
          <strong>Telefon:</strong> ${order.customerPhone || '—'}<br/>
          <strong>Adresa:</strong> ${order.shippingStreet || '—'}, ${order.shippingCity || '—'}, ${order.shippingZip || '—'}<br/>
          <strong>Způsob dopravy:</strong> ${order.shippingMethod}<br/>
          <strong>Poznámka:</strong> ${order.notes || '—'}
        </p>

        <h4 style="font-size: 14px; text-transform: uppercase; color: #777; margin: 20px 0 10px 0; border-bottom: 1px solid #eee; padding-bottom: 5px;">Položky objednávky:</h4>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
          <thead>
            <tr style="background-color: #f5f5f7;">
              <th style="padding: 8px; text-align: left; font-size: 11px; text-transform: uppercase; color: #555; font-weight: bold;">Položka</th>
              <th style="padding: 8px; text-align: center; font-size: 11px; text-transform: uppercase; color: #555; font-weight: bold; width: 60px;">Množství</th>
              <th style="padding: 8px; text-align: right; font-size: 11px; text-transform: uppercase; color: #555; font-weight: bold; width: 110px;">Celkem</th>
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

    // 1. Send Order Confirmation Email
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

    // 2. Send Invoice Email
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
        subject: `[NORTHVALE] Faktura k objednávce #${order.id}`,
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
