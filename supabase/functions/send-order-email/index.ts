// Supabase Edge Function to send order confirmation email with full invoice via Brevo API
// Deploy via Supabase CLI: supabase functions deploy send-order-email

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
            Vaše platba přes platební bránu proběhla úspěšně. Níže naleznete kompletní daňový doklad.
          </p>
        </div>

        <!-- Invoice Details Header -->
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

        <!-- Items Table -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
          <thead>
            <tr style="background-color: #f5f5f7;">
              <th style="padding: 10px; text-align: left; font-size: 11px; text-transform: uppercase; color: #555; font-weight: bold;">Položka</th>
              <th style="padding: 10px; text-align: center; font-size: 11px; text-transform: uppercase; color: #555; font-weight: bold; width: 60px;">Množství</th>
              <th style="padding: 10px; text-align: right; font-size: 11px; text-transform: uppercase; color: #555; font-weight: bold; width: 90px;">Cena / ks</th>
              <th style="padding: 10px; text-align: center; font-size: 11px; text-transform: uppercase; color: #555; font-weight: bold; width: 60px;">Sazba</th>
              <th style="padding: 10px; text-align: right; font-size: 11px; text-transform: uppercase; color: #555; font-weight: bold; width: 110px;">Celkem</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>

        <!-- VAT Breakdown and Grand Total -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
          <tr>
            <td style="vertical-align: top; width: 60%;">
              <table style="width: 100%; font-size: 12px; color: #666; border-collapse: collapse;">
                <tr style="border-bottom: 1px solid #eee;">
                  <th style="text-align: left; padding: 4px 0;">Sazba</th>
                  <th style="text-align: right; padding: 4px 0;">Základ</th>
                  <th style="text-align: right; padding: 4px 0;">DPH</th>
                </tr>
                <tr>
                  <td style="padding: 4px 0;">21%</td>
                  <td style="text-align: right; padding: 4px 0;">${base.toFixed(2)} Kč</td>
                  <td style="text-align: right; padding: 4px 0;">${vat.toFixed(2)} Kč</td>
                </tr>
              </table>
            </td>
            <td style="vertical-align: top; width: 40%; text-align: right; padding-left: 20px;">
              <div style="background-color: #fafafa; border: 1px solid #eee; padding: 15px; border-radius: 6px; display: inline-block; width: 100%; box-sizing: border-box;">
                <span style="font-size: 12px; color: #666;">Celkem k úhradě</span><br/>
                <strong style="font-size: 20px; color: #2e7d32; display: block; margin-top: 5px;">${total.toLocaleString('cs-CZ')} Kč</strong>
                <span style="font-size: 11px; color: #2e7d32; font-weight: bold; display: block; margin-top: 4px;">🟢 Uhrazeno</span>
              </div>
            </td>
          </tr>
        </table>

        <div style="text-align: center; margin-top: 25px; border-top: 1px solid #eee; padding-top: 20px;">
          <a href="https://northvaletcg.eu/profil" style="display: inline-block; background-color: #fdbd16; color: #111; text-decoration: none; padding: 10px 20px; border-radius: 5px; font-weight: bold; font-size: 14px;">
            Zobrazit mou fakturu online
          </a>
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
        htmlContent: htmlConfirmContent
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
        htmlContent: htmlInvoiceContent
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
        htmlContent: htmlAdminAlertContent
      })
    });

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
