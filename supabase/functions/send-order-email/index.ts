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
    const recipientEmail = Deno.env.get("BREVO_RECIPIENT_EMAIL") || "info@northvaletcg.eu";

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

    // Download URL from Supabase Storage public bucket
    const downloadInvoiceUrl = `https://bfxzhggjpiyqfolpxzz.supabase.co/storage/v1/object/public/invoices/invoice_${order.id}.pdf`;

    // 1. Customer Order Confirmation Email Content (Email-safe, responsive, transparent with dark text and checkmark)
    const htmlConfirmContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px 20px; background-color: transparent; color: #222222;">
        
        <!-- Checkmark SVG -->
        <div style="text-align: center; margin-bottom: 24px;">
          <svg viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg" width="64" height="64" style="display: inline-block;">
            <circle cx="26" cy="26" r="23" stroke="#10B981" stroke-width="2.2" fill="none" />
            <path d="M16 27l7 7 14-15" stroke="#10B981" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none" />
          </svg>
        </div>

        <!-- Header -->
        <div style="text-align: center; margin-bottom: 30px;">
          <h2 style="color: #111111; font-size: 28px; font-weight: 800; margin: 0; letter-spacing: -0.5px; font-family: sans-serif;">Děkujeme za objednávku!</h2>
          <p style="font-size: 14px; color: #888888; margin: 8px 0 0 0;">Číslo objednávky: <strong style="color: #fdbd16;">#${order.id}</strong></p>
        </div>

        <p style="font-size: 14.5px; color: #222222; line-height: 1.6; margin: 0 0 24px 0;">
          Dobrý den,<br/><br/>
          děkujeme za Váš nákup na NORTHVALE TCG. Vaši objednávku jsme v pořádku přijali a níže naleznete její shrnutí. V samostatném e-mailu Vám zasíláme také daňový doklad (fakturu).
        </p>

        <!-- Shipping details container -->
        <div style="border-top: 1px solid rgba(0,0,0,0.08); border-bottom: 1px solid rgba(0,0,0,0.08); padding: 20px 0; margin-bottom: 24px;">
          <div style="color: #fdbd16; font-size: 12px; font-weight: 700; text-transform: uppercase; margin-bottom: 12px; letter-spacing: 0.05em; font-family: sans-serif;">
            ${isPersonalPickup ? '📍 Osobní odběr — Holice' : '📦 Doručení zásilky'}
          </div>
          <p style="font-size: 15px; color: #111111; margin: 0 0 8px 0;">
            Způsob doručení: <strong>${order.shippingMethod}</strong>
          </p>
          <p style="font-size: 13.5px; line-height: 1.5; color: #666666; margin: 0;">
            ${isPersonalPickup 
              ? 'Zboží pro Vás začínáme připravovat. Jakmile bude objednávka připravena k vyzvednutí na naší kontaktní adrese <strong>Bratří Čapků 1095, 534 01 Holice</strong>, zašleme Vám e-mail a SMS.'
              : 'Vaše platba byla úspěšně přijata. Objednávku zpracujeme a předáme dopravci v nejbližším možném termínu. Sledujte prosím svůj e-mail pro sledovací číslo zásilky.'
            }
          </p>
        </div>

        <!-- Summary Label -->
        <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; color: #888888; margin-bottom: 14px; letter-spacing: 0.05em; font-family: sans-serif;">
          Přehled objednávky
        </div>

        <!-- Items Table -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 14px;">
          <tbody>
            ${items.map((item: any) => {
              const itemTotal = parseFloat(item.price) * parseInt(item.quantity);
              return `
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid rgba(0,0,0,0.04); color: #222222; font-weight: 600;">
                    ${item.name} <span style="color: #888888; font-weight: 400; font-size: 12.5px;">(${item.quantity}x)</span>
                  </td>
                  <td style="padding: 8px 0; border-bottom: 1px solid rgba(0,0,0,0.04); text-align: right; color: #222222; font-weight: 600; font-family: monospace;">
                    ${itemTotal.toLocaleString('cs-CZ')} Kč
                  </td>
                </tr>
              `;
            }).join('')}

            ${order.shippingCost && parseFloat(order.shippingCost) > 0 ? `
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid rgba(0,0,0,0.04); color: #666666;">
                  Dopravné
                </td>
                <td style="padding: 12px 0; border-bottom: 1px solid rgba(0,0,0,0.04); text-align: right; color: #666666; font-family: monospace;">
                  ${parseFloat(order.shippingCost).toLocaleString('cs-CZ')} Kč
                </td>
              </tr>
            ` : ''}

            ${order.paymentSurcharge && parseFloat(order.paymentSurcharge) > 0 ? `
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid rgba(0,0,0,0.04); color: #666666;">
                  Dobírkový příplatek
                </td>
                <td style="padding: 12px 0; border-bottom: 1px solid rgba(0,0,0,0.04); text-align: right; color: #666666; font-family: monospace;">
                  ${parseFloat(order.paymentSurcharge).toLocaleString('cs-CZ')} Kč
                </td>
              </tr>
            ` : ''}

            ${order.creditApplied && parseFloat(order.creditApplied) > 0 ? `
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid rgba(0,0,0,0.04); color: #10B981;">
                  Uplatněný kredit
                </td>
                <td style="padding: 12px 0; border-bottom: 1px solid rgba(0,0,0,0.04); text-align: right; color: #10B981; font-family: monospace;">
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
        <div style="border-top: 1px solid rgba(0,0,0,0.08); padding-top: 20px; margin-top: 20px; text-align: center;">
          <p style="font-size: 12px; color: #888888; margin: 0; line-height: 1.6;">
            Tento e-mail byl odeslán automaticky. V případě jakýchkoli dotazů nás kontaktujte na
            <a href="mailto:info@northvaletcg.eu" style="color: #fdbd16; text-decoration: underline; font-weight: bold;">info@northvaletcg.eu</a>.
          </p>
        </div>
      </div>
    `;

    // 2. Customer Tax Invoice Email Content (Fakturoid-style layout, fully transparent, minimal, no double details)
    const htmlInvoiceContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px 20px; background-color: transparent;">
        
        <!-- Header -->
        <div style="margin-bottom: 30px;">
          <h2 style="color: #111111; font-size: 24px; font-weight: 800; margin: 0; letter-spacing: -0.5px; font-family: sans-serif;">NORTHVALE TCG</h2>
          <p style="font-size: 12px; color: #888888; margin: 5px 0 0 0;">Faktura / Daňový doklad č. ${order.id}</p>
        </div>

        <p style="font-size: 14.5px; color: #222222; line-height: 1.6; margin: 0 0 20px 0;">
          Dobrý den,<br/><br/>
          Vaše platba přes platební bránu proběhla úspěšně. V příloze tohoto e-mailu naleznete oficiální daňový doklad (fakturu) ve formátu PDF. Fakturu si můžete také kdykoliv stáhnout kliknutím na níže uvedené tlačítko.
        </p>

        <!-- Download Action Box (Transparent Background) -->
        <div style="background-color: transparent; padding: 25px 0; text-align: center; margin: 25px 0;">
          <span style="font-size: 13px; color: #666666; display: block; margin-bottom: 5px;">Faktura / daňový doklad ke stažení:</span>
          <strong style="font-size: 18px; color: #111111; display: block; margin-bottom: 15px;">Faktura č. ${order.id}</strong>
          
          <a href="${downloadInvoiceUrl}" target="_blank" style="background-color: #fdbd16; color: #111111; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block; border: 1px solid #e2a80f; font-family: sans-serif;">
            Stáhnout fakturu (PDF)
          </a>
        </div>

        <!-- Help / System Info list (Fakturoid-style notes) -->
        <div style="border-top: 1px solid rgba(0,0,0,0.08); padding-top: 20px; margin-bottom: 20px;">
          <ul style="padding-left: 20px; margin: 0; font-size: 12.5px; color: #666666; line-height: 1.7;">
            <li style="margin-bottom: 8px;">Pokud se Vám faktura v příloze nebo po kliknutí na tlačítko nezobrazila, zkuste to prosím o chvíli později. Může se stát, že dokument ještě plně neprošel celým naším systémem.</li>
            <li style="margin-bottom: 8px;">Doklad si prosím pečlivě uschovejte pro případné pozdější využití. Rádi bychom Vás současně ujistili, že plně akceptujeme elektronickou podobu daňového dokladu.</li>
            <li style="margin-bottom: 8px;">Věnujte prosím chvilku překontrolování všech uvedených údajů. Pokud by cokoliv nesouhlasilo, stačí nás kontaktovat na e-mailové adrese <a href="mailto:info@northvaletcg.eu" style="color: #111111; font-weight: bold; text-decoration: underline;">info@northvaletcg.eu</a>.</li>
          </ul>
        </div>

        <!-- Footer Details -->
        <div style="text-align: center; border-top: 1px solid rgba(0,0,0,0.08); padding-top: 20px; margin-top: 30px;">
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

    // 1. Send Order Confirmation Email to Customer
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
