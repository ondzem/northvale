import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { PDFDocument, rgb } from "https://esm.sh/pdf-lib@1.17.1";
import fontkit from "https://esm.sh/@pdf-lib/fontkit@1.1.1";

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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { order } = await req.json();
    if (!order || !order.id) {
      return new Response(JSON.stringify({ error: "Missing order details." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Create a PDF Document and register fontkit
    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);

    // 2. Load custom Roboto fonts for Czech characters support
    const regularFontUrl = new URL("./Roboto-Regular.ttf", import.meta.url);
    const boldFontUrl = new URL("./Roboto-Bold.ttf", import.meta.url);
    const regularFontBytes = await Deno.readFile(regularFontUrl);
    const boldFontBytes = await Deno.readFile(boldFontUrl);

    const regularFont = await pdfDoc.embedFont(regularFontBytes);
    const boldFont = await pdfDoc.embedFont(boldFontBytes);

    // 3. Create a page (A4: 595.28 x 841.89)
    const page = pdfDoc.addPage([595.28, 841.89]);
    const { width, height } = page.getSize();

    // Define colors
    const cCharcoal = rgb(0.1, 0.1, 0.1);
    const cGrey = rgb(0.4, 0.4, 0.4);
    const cLightGrey = rgb(0.96, 0.96, 0.97);
    const cBorder = rgb(0.9, 0.9, 0.9);
    const cBrandYellow = rgb(0.99, 0.74, 0.09);
    const cGreen = rgb(0.18, 0.49, 0.20); // paid green

    // Helper functions for drawing text
    const drawText = (text: string, x: number, y: number, size: number, font = regularFont, color = cCharcoal) => {
      page.drawText(text, { x, y, size, font, color });
    };

    const drawTextRight = (text: string, rightX: number, y: number, size: number, font = regularFont, color = cCharcoal) => {
      const textWidth = font.widthOfTextAtSize(text, size);
      page.drawText(text, { x: rightX - textWidth, y, size, font, color });
    };

    const drawTextCenter = (text: string, centerX: number, y: number, size: number, font = regularFont, color = cCharcoal) => {
      const textWidth = font.widthOfTextAtSize(text, size);
      page.drawText(text, { x: centerX - (textWidth / 2), y, size, font, color });
    };

    // Draw Header
    drawText("NORTHVALE TCG", 40, 780, 22, boldFont, cBrandYellow);
    drawText("info@northvaletcg.eu", 40, 765, 9, regularFont, cGrey);
    drawText("www.northvaletcg.cz", 40, 752, 9, regularFont, cGrey);

    drawTextRight("FAKTURA - DAŇOVÝ DOKLAD", 555, 780, 16, boldFont, cCharcoal);
    drawTextRight(`Číslo dokladu (VS): ${order.id}`, 555, 762, 11, regularFont, cCharcoal);

    // Decorative line below header
    page.drawLine({
      start: { x: 40, y: 742 },
      end: { x: 555, y: 742 },
      thickness: 2,
      color: cBrandYellow,
    });

    // Supplier & Customer Section
    // Supplier Box
    drawText("DODAVATEL:", 40, 715, 10, boldFont, cGrey);
    drawText("NORTHVALE s.r.o.", 40, 698, 12, boldFont, cCharcoal);
    drawText("Bratří Čapků 1095", 40, 683, 10, regularFont, cCharcoal);
    drawText("534 01 Holice", 40, 668, 10, regularFont, cCharcoal);
    drawText("Česká republika", 40, 653, 10, regularFont, cCharcoal);
    drawText("IČO: 29618142", 40, 633, 10, regularFont, cCharcoal);
    drawText("DIČ: CZ29618142", 40, 618, 10, regularFont, cCharcoal);
    drawText("Spisová značka: C 29618142", 40, 598, 8, regularFont, cGrey);
    drawText("zapsáno u KOS v Hradci Králové", 40, 588, 8, regularFont, cGrey);

    // Customer Box
    drawText("ODBĚRATEL:", 320, 715, 10, boldFont, cGrey);
    const customerLine1 = order.companyName ? order.companyName : order.customerName;
    drawText(customerLine1, 320, 698, 12, boldFont, cCharcoal);
    
    let custY = 683;
    if (order.companyName && order.customerName) {
      drawText(`Jméno: ${order.customerName}`, 320, custY, 10, regularFont, cCharcoal);
      custY -= 15;
    }
    
    drawText(order.shippingStreet || "", 320, custY, 10, regularFont, cCharcoal);
    custY -= 15;
    drawText(`${order.shippingCity || ""}, ${order.shippingZip || ""}`, 320, custY, 10, regularFont, cCharcoal);
    custY -= 20;

    if (order.ico) {
      drawText(`IČO: ${order.ico}`, 320, custY, 10, regularFont, cCharcoal);
      custY -= 15;
    }
    if (order.dic) {
      drawText(`DIČ: ${order.dic}`, 320, custY, 10, regularFont, cCharcoal);
      custY -= 15;
    }
    drawText(`E-mail: ${order.customerEmail || "—"}`, 320, custY, 10, regularFont, cCharcoal);
    custY -= 15;
    drawText(`Tel: ${order.customerPhone || "—"}`, 320, custY, 10, regularFont, cCharcoal);

    // Divider
    page.drawLine({
      start: { x: 40, y: 565 },
      end: { x: 555, y: 565 },
      thickness: 1,
      color: cBorder,
    });

    // Metadata Grey Box
    page.drawRectangle({
      x: 40,
      y: 505,
      width: 515,
      height: 50,
      color: cLightGrey,
      borderColor: cBorder,
      borderWidth: 1,
    });

    // Metadata Text
    drawText("Variabilní symbol:", 55, 538, 9, boldFont, cGrey);
    drawText(String(order.id), 150, 538, 9, regularFont, cCharcoal);
    drawText("Konstantní symbol:", 55, 520, 9, boldFont, cGrey);
    drawText("0308", 150, 520, 9, regularFont, cCharcoal);

    drawText("Datum vystavení / DUZP:", 240, 538, 9, boldFont, cGrey);
    drawText(order.date || new Date().toLocaleDateString("cs-CZ"), 365, 538, 9, regularFont, cCharcoal);
    drawText("Forma úhrady:", 240, 520, 9, boldFont, cGrey);
    drawText(order.paymentMethod || "online platba", 365, 520, 9, regularFont, cCharcoal);

    drawText("Způsob dopravy:", 445, 538, 9, boldFont, cGrey);
    const shipMethod = order.shippingMethod || "Osobní odběr Holice";
    const displayShip = shipMethod.length > 18 ? shipMethod.substring(0, 18) + "..." : shipMethod;
    drawText(displayShip, 445, 520, 9, regularFont, cCharcoal);

    // Table Header
    const tableHeaderY = 482;
    drawText("Položka", 45, tableHeaderY, 9, boldFont, cGrey);
    drawTextCenter("Množství", 330, tableHeaderY, 9, boldFont, cGrey);
    drawTextRight("Cena / ks", 410, tableHeaderY, 9, boldFont, cGrey);
    drawTextCenter("Sazba DPH", 465, tableHeaderY, 9, boldFont, cGrey);
    drawTextRight("Celkem", 550, tableHeaderY, 9, boldFont, cGrey);

    page.drawLine({
      start: { x: 40, y: 472 },
      end: { x: 555, y: 472 },
      thickness: 1,
      color: cCharcoal,
    });

    // Table Rows
    let currentY = 455;
    const itemRows = order.items || [];
    
    // Helper to format currency
    const formatKcs = (val: number | string) => `${parseFloat(String(val)).toFixed(2)} Kč`;

    itemRows.forEach((item: any) => {
      const nameText = item.name || item.productName || "";
      const truncatedName = nameText.length > 40 ? nameText.substring(0, 40) + "..." : nameText;
      const qtyText = `${item.quantity} ks`;
      const priceVal = parseFloat(item.price || "0");
      const totalVal = priceVal * parseInt(item.quantity || "1");

      drawText(truncatedName, 45, currentY, 9, regularFont, cCharcoal);
      drawTextCenter(qtyText, 330, currentY, 9, regularFont, cCharcoal);
      drawTextRight(formatKcs(priceVal), 410, currentY, 9, regularFont, cCharcoal);
      drawTextCenter("21%", 465, currentY, 9, regularFont, cCharcoal);
      drawTextRight(formatKcs(totalVal), 550, currentY, 9, boldFont, cCharcoal);

      currentY -= 20;
    });

    // Draw Shipping cost if exists
    if (order.shippingCost !== undefined) {
      const shipVal = parseFloat(order.shippingCost || "0");
      drawText(`Doprava - ${order.shippingMethod || "Osobní odběr"}`, 45, currentY, 9, regularFont, cCharcoal);
      drawTextCenter("1 ks", 330, currentY, 9, regularFont, cCharcoal);
      drawTextRight(formatKcs(shipVal), 410, currentY, 9, regularFont, cCharcoal);
      drawTextCenter("21%", 465, currentY, 9, regularFont, cCharcoal);
      drawTextRight(formatKcs(shipVal), 550, currentY, 9, boldFont, cCharcoal);
      currentY -= 20;
    }

    // Draw Payment surcharge if exists > 0
    if (order.paymentSurcharge && parseFloat(order.paymentSurcharge) > 0) {
      const surVal = parseFloat(order.paymentSurcharge);
      drawText("Dobírkový příplatek", 45, currentY, 9, regularFont, cCharcoal);
      drawTextCenter("1 ks", 330, currentY, 9, regularFont, cCharcoal);
      drawTextRight(formatKcs(surVal), 410, currentY, 9, regularFont, cCharcoal);
      drawTextCenter("21%", 465, currentY, 9, regularFont, cCharcoal);
      drawTextRight(formatKcs(surVal), 550, currentY, 9, boldFont, cCharcoal);
      currentY -= 20;
    }

    // Draw bottom border of table
    page.drawLine({
      start: { x: 40, y: currentY + 10 },
      end: { x: 555, y: currentY + 10 },
      thickness: 1,
      color: cBorder,
    });

    currentY -= 15;

    // Grand Totals and VAT calculation
    const total = parseFloat(order.finalTotal || "0");
    const vatRate = 0.21;
    const base = total / (1 + vatRate);
    const vat = total - base;

    // Draw VAT Summary Table
    drawText("Rozpis DPH:", 45, currentY, 10, boldFont, cGrey);
    currentY -= 15;
    
    // VAT table headers
    drawText("Sazba", 45, currentY, 8, boldFont, cGrey);
    drawTextRight("Základ", 130, currentY, 8, boldFont, cGrey);
    drawTextRight("DPH", 200, currentY, 8, boldFont, cGrey);
    drawTextRight("Celkem s DPH", 290, currentY, 8, boldFont, cGrey);

    page.drawLine({
      start: { x: 45, y: currentY - 4 },
      end: { x: 290, y: currentY - 4 },
      thickness: 0.5,
      color: cBorder,
    });

    currentY -= 15;
    drawText("21%", 45, currentY, 9, regularFont, cCharcoal);
    drawTextRight(formatKcs(base), 130, currentY, 9, regularFont, cCharcoal);
    drawTextRight(formatKcs(vat), 200, currentY, 9, regularFont, cCharcoal);
    drawTextRight(formatKcs(total), 290, currentY, 9, boldFont, cCharcoal);

    // Draw Grand Total Box on the Right side
    const totalBoxY = currentY - 10;
    page.drawRectangle({
      x: 340,
      y: totalBoxY - 20,
      width: 215,
      height: 60,
      color: cLightGrey,
      borderColor: cBorder,
      borderWidth: 1,
    });

    drawText("CELKEM K ÚHRADĚ:", 355, totalBoxY + 22, 10, boldFont, cCharcoal);
    drawTextRight(formatKcs(total), 540, totalBoxY + 22, 12, boldFont, cCharcoal);
    drawText("🟢 UHRAZENO", 355, totalBoxY + 3, 10, boldFont, cGreen);

    currentY -= 50;

    // Notes Box (if notes exist)
    if (order.notes && order.notes.trim()) {
      drawText("Poznámka:", 45, currentY, 9, boldFont, cGrey);
      currentY -= 15;
      
      const noteWords = order.notes.split(" ");
      let currentLine = "";
      const lines: string[] = [];
      for (const word of noteWords) {
        if (regularFont.widthOfTextAtSize(currentLine + " " + word, 8) > 280) {
          lines.push(currentLine.trim());
          currentLine = word;
        } else {
          currentLine += " " + word;
        }
      }
      if (currentLine) {
        lines.push(currentLine.trim());
      }

      lines.forEach((lineText) => {
        drawText(lineText, 45, currentY, 8, regularFont, cCharcoal);
        currentY -= 12;
      });
    }

    // Footer
    drawTextCenter("Děkujeme za Váš nákup na NORTHVALE TCG!", width / 2, 45, 10, boldFont, cCharcoal);
    drawTextCenter("V případě jakýchkoli dotazů nás kontaktujte na info@northvaletcg.eu", width / 2, 30, 8, regularFont, cGrey);

    // Save PDF
    const pdfBytes = await pdfDoc.save();
    const fileName = `invoice_${order.id}.pdf`;

    // Try to create the bucket if not exists
    try {
      await supabase.storage.createBucket("invoices", { public: true });
    } catch (_bErr) {
      // Ignore if exists
    }

    // Upload the structured invoice PDF file
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("invoices")
      .upload(fileName, pdfBytes, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      throw uploadError;
    }

    return new Response(JSON.stringify({ success: true, path: uploadData.path }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message || String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
