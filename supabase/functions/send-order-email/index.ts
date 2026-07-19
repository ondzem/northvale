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

function wrapInHtmlDocument(innerContent: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <style>
    :root {
      color-scheme: light;
      supported-color-schemes: light;
    }
    body {
      background-color: #f5f6f8 !important;
      margin: 0;
      padding: 0;
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
  </style>
</head>
<body style="background-color: #f5f6f8; margin: 0; padding: 0;">
  ${innerContent}
</body>
</html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const brevoApiKey = Deno.env.get("BREVO_API_KEY");
    const senderEmail = Deno.env.get("BREVO_SENDER_EMAIL") || "info@northvaletcg.eu";
    const senderName = Deno.env.get("BREVO_SENDER_NAME") || "NORTHVALE TCG";
    const recipientEmail = Deno.env.get("BREVO_RECIPIENT_EMAIL") || "info@northvaletcg.eu";

    if (!brevoApiKey) {
      throw new Error("Missing BREVO_API_KEY environment variable.");
    }

    const body = await req.json();
    const { order, items, emailType, trackingNumber, carrier } = body;

    if (!order || !order.id || !order.customerEmail) {
      return new Response(JSON.stringify({ error: "Missing required order or customer details." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (emailType === "payment_received") {
      const htmlPaymentConfirmedContent = `
        <div style="background-color: #f5f6f8; padding: 40px 10px; font-family: 'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; min-height: 100%;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e1e4e8; border-radius: 12px; padding: 40px 30px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); color: #222222;">
            
            <!-- Logo Header -->
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #fdbd16; font-size: 26px; font-weight: 800; margin: 0; letter-spacing: 2px; text-transform: uppercase;">NORTHVALE</h1>
              <p style="color: #8a8a92; font-size: 11px; text-transform: uppercase; letter-spacing: 4px; margin: 3px 0 0 0;">Trading Card Games</p>
            </div>
            
            <div style="text-align: center; margin-bottom: 24px; font-size: 54px;">
              💳
            </div>

            <!-- Header Title -->
            <div style="text-align: center; margin-bottom: 30px;">
              <h2 style="color: #111111; font-size: 26px; font-weight: 800; margin: 0; letter-spacing: -0.5px;">Platba byla přijata!</h2>
              <p style="font-size: 14px; color: #888888; margin: 8px 0 0 0;">Číslo objednávky: <strong style="color: #fdbd16;">#${order.id}</strong></p>
            </div>

            <p style="font-size: 14.5px; color: #222222; line-height: 1.6; margin: 0 0 24px 0;">
              Dobrý den,<br/><br/>
              obdrželi jsme Vaši platbu bankovním převodem pro objednávku <strong>#${order.id}</strong>. 
              Objednávka je nyní označena jako uhrazená a začínáme ji pro Vás připravovat k odeslání.
            </p>

            <div style="background-color: #fdfdfd; border: 1px solid #e1e4e8; border-left: 4px solid #10b981; padding: 22px; margin-bottom: 24px; border-radius: 8px;">
              <p style="font-size: 14.5px; color: #111111; margin: 0; line-height: 1.6;">
                Celková částka: <strong>${parseFloat(order.finalTotal || order.totalPrice || '0').toLocaleString('cs-CZ')} Kč</strong><br/>
                Stav platby: <strong style="color: #10b981;">Uhrazeno (Bankovní převod)</strong>
              </p>
            </div>

            <p style="font-size: 14px; color: #666666; line-height: 1.6; margin: 0 0 24px 0;">
              Jakmile zásilku předáme dopravci, zašleme Vám další e-mail se sledovacím číslem.
            </p>

            <!-- Help / System Info -->
            <div style="border-top: 1px solid #e1e4e8; padding-top: 24px; margin-top: 30px; text-align: center;">
              <p style="font-size: 12px; color: #888888; margin: 0; line-height: 1.6;">
                Děkujeme za Váš nákup na NORTHVALE TCG. V případě dotazů nás kontaktujte na
                <a href="mailto:info@northvaletcg.eu" style="color: #fdbd16; text-decoration: underline; font-weight: bold;">info@northvaletcg.eu</a>.
              </p>
            </div>
          </div>
        </div>
      `;

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
          subject: `Platba přijata - Objednávka #${order.id}`,
          htmlContent: wrapInHtmlDocument(htmlPaymentConfirmedContent)
        })
      });

      return new Response(JSON.stringify({ success: true, message: "Payment confirmed email sent." }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (emailType === "expedited") {
      const activeCarrier = carrier || ((order.shippingMethod || "").toLowerCase().includes("gls") ? "GLS" : "DPD");
      const activeTrackingNo = trackingNumber || order.dpd_parcel_number || order.gls_parcel_number || "";
      const trackingUrl = activeCarrier === "GLS"
        ? `https://tracking.gls-group.eu/status/cs_CZ/parcel/${activeTrackingNo}`
        : `https://tracking.dpd.de/status/cs_CZ/parcel/${activeTrackingNo}`;

      const isCod = (order.paymentMethod || "").toLowerCase().includes("dobírk") || 
                    (order.paymentMethod || "").toLowerCase().includes("cod");
      const pickupDetails = order.pickupPointDetails || null;
      const isPickup = (order.shippingMethod || "").toLowerCase().includes("pickup") || 
                       (order.shippingMethod || "").toLowerCase().includes("výdej") || 
                       !!pickupDetails;

      const htmlExpeditedContent = `
        <div style="background-color: #f5f6f8; padding: 40px 10px; font-family: 'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; min-height: 100%;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e1e4e8; border-radius: 12px; padding: 40px 30px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); color: #222222;">
            
            <!-- Logo Header -->
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #fdbd16; font-size: 26px; font-weight: 800; margin: 0; letter-spacing: 2px; text-transform: uppercase;">NORTHVALE</h1>
              <p style="color: #8a8a92; font-size: 11px; text-transform: uppercase; letter-spacing: 4px; margin: 3px 0 0 0;">Trading Card Games</p>
            </div>
            
            <div style="text-align: center; margin-bottom: 24px; font-size: 54px;">
              📦
            </div>

            <!-- Header Title -->
            <div style="text-align: center; margin-bottom: 30px;">
              <h2 style="color: #111111; font-size: 26px; font-weight: 800; margin: 0; letter-spacing: -0.5px;">Vaše objednávka byla expedována!</h2>
              <p style="font-size: 14px; color: #888888; margin: 8px 0 0 0;">Číslo objednávky: <strong style="color: #fdbd16;">#${order.id}</strong></p>
            </div>

            <p style="font-size: 14.5px; color: #222222; line-height: 1.6; margin: 0 0 24px 0;">
              Dobrý den,<br/><br/>
              máme pro Vás skvělou zprávu! Vaši objednávku jsme zabalili a předali přepravní službě <strong>${activeCarrier}</strong>.
            </p>

            <!-- Tracking details container -->
            <div style="background-color: #fdfdfd; border: 1px solid #e1e4e8; border-left: 4px solid #fdbd16; padding: 22px; margin-bottom: 24px; border-radius: 8px;">
              <div style="color: #fdbd16; font-size: 12px; font-weight: 700; text-transform: uppercase; margin-bottom: 12px; letter-spacing: 0.05em;">
                🚚 Sledování zásilky
              </div>
              <p style="font-size: 14.5px; color: #111111; margin: 0 0 16px 0; line-height: 1.6;">
                Přepravce: <strong>${activeCarrier}</strong><br/>
                Číslo zásilky: <strong>${activeTrackingNo}</strong>
                ${isPickup && pickupDetails ? `<br/>Výdejní místo: <strong>${pickupDetails.name || 'Pickup Point'}</strong><br/>Adresa: <strong>${pickupDetails.street || ''}, ${pickupDetails.zip || ''} ${pickupDetails.city || ''}</strong>` : ''}
                ${isCod ? `<br/>Částka k úhradě (dobírka): <strong style="color: #fdbd16;">${(order.totalPrice || order.finalTotal || 0).toLocaleString()} Kč</strong>` : ''}
              </p>
              ${activeTrackingNo ? `
              <div style="text-align: left; margin-top: 10px;">
                <a href="${trackingUrl}" target="_blank" style="background-color: #fdbd16; color: #111111; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block; border: 1px solid #e2a80f; box-shadow: 0 2px 4px rgba(253, 189, 22, 0.15);">
                  Sledovat zásilku online ↗
                </a>
              </div>
              ` : ''}
            </div>

            <p style="font-size: 14px; color: #666666; line-height: 1.6; margin: 0 0 24px 0;">
              Zásilka by měla být doručena do 1-2 pracovních dnů. Přepravce Vás bude kontaktovat prostřednictvím SMS nebo e-mailu s podrobnějšími informacemi o čase doručení.
            </p>

            <!-- Help / System Info -->
            <div style="border-top: 1px solid #e1e4e8; padding-top: 24px; margin-top: 30px; text-align: center;">
              <p style="font-size: 12px; color: #888888; margin: 0; line-height: 1.6;">
                Děkujeme za Váš nákup na NORTHVALE TCG. V případě dotazů nás kontaktujte na
                <a href="mailto:info@northvaletcg.eu" style="color: #fdbd16; text-decoration: underline; font-weight: bold;">info@northvaletcg.eu</a>.
              </p>
            </div>
          </div>
        </div>
      `;

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
          subject: `Objednávka #${order.id} byla expedována`,
          htmlContent: wrapInHtmlDocument(htmlExpeditedContent)
        })
      });

      return new Response(JSON.stringify({ success: true, message: "Expedited email sent successfully." }), {
        status: 200,
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

    // Download universal Terms & Conditions and encode to base64
    let base64Terms = "";
    try {
      const { data: fileData, error: downloadError } = await supabase.storage
        .from("invoices")
        .download("UniverzalniObchodniPodminky.pdf");

      if (downloadError) {
        console.error("Error downloading Terms PDF:", downloadError);
      } else if (fileData) {
        const arrayBuffer = await fileData.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        base64Terms = base64Encode(uint8Array);
        console.log(`Successfully loaded and base64-encoded Terms PDF. Length: ${base64Terms.length}`);
      }
    } catch (storageErr) {
      console.error("Terms download failed:", storageErr);
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

    const isBankTransfer = pm.toLowerCase().includes("převod") || pm.toLowerCase().includes("transfer");

    // Download URL from Supabase Storage public bucket
    const downloadInvoiceUrl = `https://bfxzhggjpiyqfolqpxzz.supabase.co/storage/v1/object/public/invoices/invoice_${order.id}.pdf`;

    // 1. Customer Order Confirmation Email Content (Email-safe, responsive, transparent with dark text and checkmark)
    const htmlConfirmContent = `
      <div style="background-color: #f5f6f8; padding: 40px 10px; font-family: 'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; min-height: 100%;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e1e4e8; border-radius: 12px; padding: 40px 30px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); color: #222222;">
          
          <!-- Logo Header -->
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #fdbd16; font-size: 26px; font-weight: 800; margin: 0; letter-spacing: 2px; text-transform: uppercase;">NORTHVALE</h1>
            <p style="color: #8a8a92; font-size: 11px; text-transform: uppercase; letter-spacing: 4px; margin: 3px 0 0 0;">Trading Card Games</p>
          </div>
          
          <!-- Checkmark SVG -->
          <div style="text-align: center; margin-bottom: 24px;">
            <svg viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg" width="64" height="64" style="display: inline-block;">
              <circle cx="26" cy="26" r="23" stroke="#10B981" stroke-width="2.2" fill="none" />
              <path d="M16 27l7 7 14-15" stroke="#10B981" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none" />
            </svg>
          </div>

          <!-- Header -->
          <div style="text-align: center; margin-bottom: 30px;">
            <h2 style="color: #111111; font-size: 28px; font-weight: 800; margin: 0; letter-spacing: -0.5px;">Děkujeme za objednávku!</h2>
            <p style="font-size: 14px; color: #888888; margin: 8px 0 0 0;">Číslo objednávky: <strong style="color: #fdbd16;">#${order.id}</strong></p>
          </div>

          <p style="font-size: 14.5px; color: #222222; line-height: 1.6; margin: 0 0 24px 0;">
            Dobrý den,<br/><br/>
            děkujeme za Váš nákup na NORTHVALE TCG. Vaši objednávku jsme v pořádku přijali a níže naleznete její shrnutí. V samostatném e-mailu Vám zasíláme také daňový doklad (fakturu).
          </p>

          <!-- Shipping details container -->
          <div style="border-top: 1px solid #e1e4e8; border-bottom: 1px solid #e1e4e8; padding: 20px 0; margin-bottom: 24px;">
            <div style="color: #fdbd16; font-size: 12px; font-weight: 700; text-transform: uppercase; margin-bottom: 12px; letter-spacing: 0.05em;">
              ${isPersonalPickup ? '📍 Osobní odběr — Holice' : '📦 Doručení zásilky'}
            </div>
            <p style="font-size: 15px; color: #111111; margin: 0 0 8px 0;">
              Způsob doručení: <strong>${order.shippingMethod}</strong>
            </p>
            <p style="font-size: 13.5px; line-height: 1.5; color: #666666; margin: 0;">
              ${isPersonalPickup 
                ? 'Zboží pro Vás začínáme připravovat. Jakmile bude objednávka připravena k vyzvednutí na naší kontaktní adrese <strong>Bratří Čapků 1095, 534 01 Holice</strong>, zašleme Vám e-mail a SMS.'
                : isBankTransfer
                  ? 'Jakmile obdržíme Vaši platbu na náš účet, objednávku zpracujeme a předáme dopravci. O odeslání Vás budeme informovat.'
                  : 'Vaše platba byla úspěšně přijata. Objednávku zpracujeme a předáme dopravci v nejbližším možném termínu. Sledujte prosím svůj e-mail pro sledovací číslo zásilky.'
              }
            </p>
          </div>

          <!-- Bank transfer details container -->
          ${isBankTransfer ? `
          <div style="border-bottom: 1px solid #e1e4e8; padding-bottom: 24px; margin-bottom: 24px;">
            <div style="color: #fdbd16; font-size: 12px; font-weight: 700; text-transform: uppercase; margin-bottom: 12px; letter-spacing: 0.05em;">
              💰 Pokyny k platbě převodem
            </div>
            <p style="font-size: 14.5px; color: #222222; margin: 0 0 16px 0; line-height: 1.5;">
              Zvolili jste platbu bankovním převodem. Prosím zašlete celkovou částku na náš bankovní účet:
            </p>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
              <tr>
                <td style="padding: 8px 0; color: #666666; width: 130px; border-bottom: 1px solid #e1e4e8; font-size: 14px;">Číslo účtu:</td>
                <td style="padding: 8px 0; color: #111111; font-weight: bold; border-bottom: 1px solid #e1e4e8; font-size: 14px;">1854161005/2700</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666666; border-bottom: 1px solid #e1e4e8; font-size: 14px;">Částka k úhradě:</td>
                <td style="padding: 8px 0; color: #fdbd16; font-weight: bold; border-bottom: 1px solid #e1e4e8; font-family: monospace; font-size: 15px;">${total.toLocaleString('cs-CZ')} Kč</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666666; border-bottom: 1px solid #e1e4e8; font-size: 14px;">Variabilní symbol:</td>
                <td style="padding: 8px 0; color: #111111; font-weight: bold; border-bottom: 1px solid #e1e4e8; font-family: monospace; font-size: 15px;">${order.id}</td>
              </tr>
            </table>

            <div style="text-align: center; margin-top: 15px; padding: 15px; background: #ffffff; border-radius: 8px; border: 1px solid #e1e4e8; display: inline-block;">
              <img 
                src="https://api.paylibo.com/paylibo/generator/czech/image?accountNumber=1854161005&bankCode=2700&amount=${total}&currency=CZK&vs=${order.id}&size=160"
                alt="QR Kód pro platbu"
                width="160"
                height="160"
                style="display: block; margin: 0 auto 8px auto;"
              />
              <span style="font-size: 11px; color: #888888; font-weight: 500;">Naskenujte v bankovní aplikaci pro okamžitou platbu</span>
            </div>
          </div>
          ` : ''}

          <!-- Summary Label -->
          <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; color: #888888; margin-bottom: 14px; letter-spacing: 0.05em;">
            Přehled objednávky
          </div>

          <!-- Items Table -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 14px;">
            <tbody>
              ${items.map((item: any) => {
                const itemTotal = parseFloat(item.price) * parseInt(item.quantity);
                return `
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #e1e4e8; color: #222222; font-weight: 600;">
                      ${item.name} <span style="color: #888888; font-weight: 400; font-size: 12.5px;">(${item.quantity}x)</span>
                    </td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #e1e4e8; text-align: right; color: #222222; font-weight: 600; font-family: monospace;">
                      ${itemTotal.toLocaleString('cs-CZ')} Kč
                    </td>
                  </tr>
                `;
              }).join('')}

              ${order.shippingCost && parseFloat(order.shippingCost) > 0 ? `
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e1e4e8; color: #666666;">
                    Dopravné
                  </td>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e1e4e8; text-align: right; color: #666666; font-family: monospace;">
                    ${parseFloat(order.shippingCost).toLocaleString('cs-CZ')} Kč
                  </td>
                </tr>
              ` : ''}

              ${order.paymentSurcharge && parseFloat(order.paymentSurcharge) > 0 ? `
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e1e4e8; color: #666666;">
                    Dobírkový příplatek
                  </td>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e1e4e8; text-align: right; color: #666666; font-family: monospace;">
                    ${parseFloat(order.paymentSurcharge).toLocaleString('cs-CZ')} Kč
                  </td>
                </tr>
              ` : ''}

              ${order.creditApplied && parseFloat(order.creditApplied) > 0 ? `
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e1e4e8; color: #10B981;">
                    Uplatněný kredit
                  </td>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e1e4e8; text-align: right; color: #10B981; font-family: monospace;">
                    -${parseFloat(order.creditApplied).toLocaleString('cs-CZ')} Kč
                  </td>
                </tr>
              ` : ''}

              <tr>
                <td style="padding: 16px 0 0 0; color: #111111; font-weight: 700; font-size: 15px;">
                  Celkem zaplaceno
                </td>
                <td style="padding: 16px 0 0 0; text-align: right; color: #fdbd16; font-weight: 800; font-size: 22px; font-family: monospace;">
                  ${total.toLocaleString('cs-CZ')} Kč
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Help / System Info -->
          <div style="border-top: 1px solid #e1e4e8; padding-top: 24px; margin-top: 30px; text-align: center;">
            <p style="font-size: 12px; color: #888888; margin: 0; line-height: 1.6;">
              Tento e-mail byl odeslán automaticky. V případě jakýchkoli dotazů nás kontaktujte na
              <a href="mailto:info@northvaletcg.eu" style="color: #fdbd16; text-decoration: underline; font-weight: bold;">info@northvaletcg.eu</a>.
            </p>
          </div>
        </div>
      </div>
    `;

    // 2. Customer Tax Invoice Email Content (Fakturoid-style layout, fully transparent, minimal, no double details)
    const htmlInvoiceContent = `
      <div style="background-color: #f5f6f8; padding: 40px 10px; font-family: 'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; min-height: 100%;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e1e4e8; border-radius: 12px; padding: 40px 30px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); color: #222222;">
          
          <!-- Logo Header -->
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #fdbd16; font-size: 26px; font-weight: 800; margin: 0; letter-spacing: 2px; text-transform: uppercase;">NORTHVALE</h1>
            <p style="color: #8a8a92; font-size: 11px; text-transform: uppercase; letter-spacing: 4px; margin: 3px 0 0 0;">Trading Card Games</p>
          </div>

          <!-- Header -->
          <div style="text-align: center; margin-bottom: 30px;">
            <h2 style="color: #111111; font-size: 26px; font-weight: 800; margin: 0; letter-spacing: -0.5px;">Daňový doklad k objednávce</h2>
            <p style="font-size: 14px; color: #888888; margin: 8px 0 0 0;">Faktura č. <strong style="color: #fdbd16;">${order.id}</strong></p>
          </div>

          <p style="font-size: 14.5px; color: #222222; line-height: 1.6; margin: 0 0 20px 0;">
            Dobrý den,<br/><br/>
            Vaše platba proběhla úspěšně. V příloze tohoto e-mailu naleznete oficiální daňový doklad (fakturu) ve formátu PDF. Fakturu si můžete také kdykoliv stáhnout kliknutím na níže uvedené tlačítko.
          </p>

          <!-- Download Action Box -->
          <div style="background-color: #fdfdfd; border: 1px solid #e1e4e8; padding: 25px; text-align: center; margin: 25px 0; border-radius: 8px;">
            <span style="font-size: 13px; color: #666666; display: block; margin-bottom: 5px;">Doklad ke stažení:</span>
            <strong style="font-size: 16px; color: #111111; display: block; margin-bottom: 15px;">Faktura č. ${order.id}</strong>
            
            <a href="${downloadInvoiceUrl}" target="_blank" style="background-color: #fdbd16; color: #111111; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block; border: 1px solid #e2a80f; box-shadow: 0 2px 4px rgba(253, 189, 22, 0.15);">
              Stáhnout fakturu (PDF)
            </a>
          </div>

          <!-- Help / System Info list -->
          <div style="border-top: 1px solid #e1e4e8; padding-top: 24px; margin-bottom: 24px;">
            <ul style="padding-left: 20px; margin: 0; font-size: 12.5px; color: #666666; line-height: 1.7;">
              <li style="margin-bottom: 8px;">Pokud se Vám faktura v příloze nebo po kliknutí na tlačítko nezobrazila, zkuste to prosím o chvíli později. Může se stát, že dokument ještě plně neprošel celým naším systémem.</li>
              <li style="margin-bottom: 8px;">Doklad si prosím pečlivě uschovejte pro případné pozdější využití. Rádi bychom Vás současně ujistili, že plně akceptujeme elektronickou podobu daňového dokladu.</li>
              <li style="margin-bottom: 8px;">Věnujte prosím chvilku překontrolování všech uvedených údajů. Pokud by cokoliv nesouhlasilo, stačí nás kontaktovat na e-mailové adrese <a href="mailto:info@northvaletcg.eu" style="color: #fdbd16; font-weight: bold; text-decoration: underline;">info@northvaletcg.eu</a>.</li>
            </ul>
          </div>

          <!-- Footer Details -->
          <div style="text-align: center; border-top: 1px solid #e1e4e8; padding-top: 24px; margin-top: 30px;">
            <p style="font-size: 11px; color: #999999; margin: 0; line-height: 1.5;">
              NORTHVALE s.r.o., Bratří Čapků 1095, 534 01 Holice | IČO: 29618142, DIČ: CZ29618142<br/>
              Společnost zapsaná u Krajského soudu v Hradci Králové, oddíl C, vložka 56872.
            </p>
          </div>
        </div>
      </div>
    `;

    // 3. Admin Notification Content
    const htmlAdminAlertContent = `
      <div style="background-color: #f5f6f8; padding: 40px 10px; font-family: 'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; min-height: 100%;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e1e4e8; border-radius: 12px; padding: 40px 30px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); color: #222222;">
          
          <!-- Logo Header -->
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #fdbd16; font-size: 26px; font-weight: 800; margin: 0; letter-spacing: 2px; text-transform: uppercase;">NORTHVALE Admin</h1>
            <p style="color: #8a8a92; font-size: 11px; text-transform: uppercase; letter-spacing: 4px; margin: 3px 0 0 0;">Nová objednávka v systému</p>
          </div>

          <!-- Header -->
          <div style="text-align: center; margin-bottom: 30px;">
            <h2 style="color: #2e7d32; font-size: 26px; font-weight: 800; margin: 0; letter-spacing: -0.5px;">🚀 Nová objednávka</h2>
            <p style="font-size: 14px; color: #888888; margin: 8px 0 0 0;">Číslo objednávky: <strong style="color: #fdbd16;">#${order.id}</strong></p>
          </div>

          <h4 style="font-size: 12px; text-transform: uppercase; color: #888888; margin: 20px 0 10px 0; border-bottom: 1px solid #e1e4e8; padding-bottom: 5px;">Údaje zákazníka:</h4>
          <p style="font-size: 13.5px; color: #222222; line-height: 1.6; margin: 0 0 20px 0;">
            <strong>Jméno:</strong> ${order.customerName}<br/>
            <strong>E-mail:</strong> ${order.customerEmail}<br/>
            <strong>Telefon:</strong> ${order.customerPhone || '—'}<br/>
            <strong>Adresa:</strong> ${order.shippingStreet || '—'}, ${order.shippingCity || '—'}, ${order.shippingZip || '—'}<br/>
            <strong>Způsob dopravy:</strong> ${order.shippingMethod}<br/>
            <strong>Poznámka:</strong> ${order.notes || '—'}
          </p>

          <h4 style="font-size: 12px; text-transform: uppercase; color: #888888; margin: 20px 0 10px 0; border-bottom: 1px solid #e1e4e8; padding-bottom: 5px;">Položky objednávky:</h4>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 13.5px;">
            <thead>
              <tr style="background-color: #f8f9fa; text-align: left;">
                <th style="padding: 10px 8px; font-size: 11px; text-transform: uppercase; color: #666666; font-weight: bold; border-bottom: 1px solid #e1e4e8;">Položka</th>
                <th style="padding: 10px 8px; font-size: 11px; text-transform: uppercase; color: #666666; font-weight: bold; text-align: center; width: 60px; border-bottom: 1px solid #e1e4e8;">Množství</th>
                <th style="padding: 10px 8px; font-size: 11px; text-transform: uppercase; color: #666666; font-weight: bold; text-align: right; width: 110px; border-bottom: 1px solid #e1e4e8;">Celkem</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((item: any) => `
                <tr>
                  <td style="padding: 10px 8px; border-bottom: 1px solid #e1e4e8; color: #222222;">${item.name}</td>
                  <td style="padding: 10px 8px; border-bottom: 1px solid #e1e4e8; text-align: center; color: #222222;">${item.quantity} ks</td>
                  <td style="padding: 10px 8px; border-bottom: 1px solid #e1e4e8; text-align: right; font-weight: bold; color: #222222;">${(parseFloat(item.price) * parseInt(item.quantity)).toLocaleString('cs-CZ')} Kč</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div style="background-color: #fdfdfd; border: 1px solid #e1e4e8; padding: 15px; border-radius: 8px; text-align: right; margin-top: 20px;">
            <span style="font-size: 11px; color: #666666;">Celková cena k vyplacení / zaúčtování:</span><br/>
            <strong style="font-size: 20px; color: #2e7d32; display: block; margin-top: 3px;">${total.toLocaleString('cs-CZ')} Kč</strong>
          </div>
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

    // Construct terms attachment for the order confirmation email
    const confirmAttachments = base64Terms ? [
      {
        name: "obchodni_podminky.pdf",
        content: base64Terms
      }
    ] : [];

    // Custom Subject format for Tax Invoice
    const invoiceEmailSubject = `Faktura - daňový doklad č. ${order.id} ze dne ${orderDate}`;

    // 1. Send Order Confirmation Email to Customer
    const resConfirm = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": brevoApiKey,
        "content-type": "application/json",
        "accept": "application/json"
      },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: [{ email: order.customerEmail, name: order.customerName }],
        subject: `Potvrzení objednávky #${order.id}`,
        htmlContent: wrapInHtmlDocument(htmlConfirmContent),
        attachment: confirmAttachments.length > 0 ? confirmAttachments : undefined
      })
    });
    const txtConfirm = await resConfirm.text();
    console.log(`[send-order-email] Confirm email response status: ${resConfirm.status}, body: ${txtConfirm}`);

    // 2. Send Invoice Email to Customer (Custom Subject and Fakturoid-style layout)
    const resInvoice = await fetch("https://api.brevo.com/v3/smtp/email", {
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
        htmlContent: wrapInHtmlDocument(htmlInvoiceContent),
        attachment: attachments.length > 0 ? attachments : undefined
      })
    });
    const txtInvoice = await resInvoice.text();
    console.log(`[send-order-email] Invoice email response status: ${resInvoice.status}, body: ${txtInvoice}`);

    // 3. Send Admin Alert Email
    const resAdmin = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": brevoApiKey,
        "content-type": "application/json",
        "accept": "application/json"
      },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: [{ email: "objednavky@northvaletcg.eu", name: "NORTHVALE Admin" }],
        subject: `[NORTHVALE - ADMIN] Nová objednávka #${order.id}`,
        htmlContent: wrapInHtmlDocument(htmlAdminAlertContent),
        attachment: attachments.length > 0 ? attachments : undefined
      })
    });
    const txtAdmin = await resAdmin.text();
    console.log(`[send-order-email] Admin email response status: ${resAdmin.status}, body: ${txtAdmin}`);

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
