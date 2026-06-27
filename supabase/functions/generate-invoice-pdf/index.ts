import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { PDFDocument, rgb } from "https://esm.sh/pdf-lib@1.17.1";
import fontkit from "https://esm.sh/@pdf-lib/fontkit@1.1.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Global cache for fonts to avoid downloading them on every function call (hot starts)
let regularFontBytes: ArrayBuffer | null = null;
let boldFontBytes: ArrayBuffer | null = null;

async function loadFonts() {
  if (!regularFontBytes) {
    console.log("Fetching Roboto-Regular font...");
    const res = await fetch("https://github.com/googlefonts/roboto-2/raw/main/src/hinted/Roboto-Regular.ttf");
    if (!res.ok) throw new Error("Failed to fetch Roboto-Regular font");
    regularFontBytes = await res.arrayBuffer();
  }
  if (!boldFontBytes) {
    console.log("Fetching Roboto-Bold font...");
    const res = await fetch("https://github.com/googlefonts/roboto-2/raw/main/src/hinted/Roboto-Bold.ttf");
    if (!res.ok) throw new Error("Failed to fetch Roboto-Bold font");
    boldFontBytes = await res.arrayBuffer();
  }
  return {
    regular: regularFontBytes,
    bold: boldFontBytes
  };
}

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

    // 2. Load custom Roboto fonts from cache or fetch them
    const fonts = await loadFonts();
    const regularFont = await pdfDoc.embedFont(fonts.regular);
    const boldFont = await pdfDoc.embedFont(fonts.bold);

    // 3. Create a page (A4: 595.28 x 841.89)
    const page = pdfDoc.addPage([595.28, 841.89]);
    const { width, height } = page.getSize();

    // Define colors
    const cCharcoal = rgb(0.12, 0.12, 0.12);
    const cGrey = rgb(0.5, 0.5, 0.5);
    const cBorder = rgb(0.9, 0.9, 0.9);
    const cGreen = rgb(0.15, 0.45, 0.17);

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

    // Header Lines (Minimalist anchors)
    page.drawLine({ start: { x: 45, y: 800 }, end: { x: 65, y: 800 }, thickness: 2, color: cCharcoal });
    page.drawLine({ start: { x: 320, y: 800 }, end: { x: 550, y: 800 }, thickness: 2, color: cCharcoal });

    // Header Title & Number on Right
    drawText("Faktura - daňový doklad", 320, 778, 14, boldFont, cCharcoal);
    drawText(String(order.id), 320, 760, 14, boldFont, cGrey);

    // Supplier & Customer Headers (Shifted down for elegant header space, keeping other spacing constant)
    drawText("DODAVATEL", 45, 705, 7, boldFont, cGrey);
    drawText("ODBĚRATEL", 320, 705, 7, boldFont, cGrey);

    // Supplier Details
    drawText("NORTHVALE s.r.o.", 45, 688, 10, boldFont, cCharcoal);
    drawText("Bratří Čapků 1095", 45, 674, 9, regularFont, cCharcoal);
    drawText("534 01 Holice", 45, 660, 9, regularFont, cCharcoal);
    drawText("Česká republika", 45, 646, 9, regularFont, cCharcoal);

    // Customer Details
    const customerNameLine = order.companyName ? order.companyName : order.customerName;
    drawText(customerNameLine, 320, 688, 10, boldFont, cCharcoal);

    let custY = 674;
    if (order.companyName && order.customerName) {
      drawText(`Jméno: ${order.customerName}`, 320, custY, 9, regularFont, cCharcoal);
      custY -= 14;
    }
    drawText(order.shippingStreet || "", 320, custY, 9, regularFont, cCharcoal);
    custY -= 14;
    drawText(`${order.shippingCity || ""}, ${order.shippingZip || ""}`, 320, custY, 9, regularFont, cCharcoal);

    // IDs Section
    let idY = 615;
    drawText("IČO", 45, idY, 8, regularFont, cGrey);
    drawTextRight("29618142", 240, idY, 8, regularFont, cCharcoal);
    drawText("IČO", 320, idY, 8, regularFont, cGrey);
    drawTextRight(order.ico || "—", 550, idY, 8, regularFont, cCharcoal);

    idY -= 14;
    drawText("DIČ", 45, idY, 8, regularFont, cGrey);
    drawTextRight("CZ29618142", 240, idY, 8, regularFont, cCharcoal);
    drawText("DIČ", 320, idY, 8, regularFont, cGrey);
    drawTextRight(order.dic || "—", 550, idY, 8, regularFont, cCharcoal);

    // Bank & Dates Section
    let dateY = 565;
    drawText("Bankovní účet", 45, dateY, 8, regularFont, cGrey);
    drawTextRight("123456789/0100", 240, dateY, 8, regularFont, cCharcoal);
    drawText("Datum vystavení", 320, dateY, 8, regularFont, cGrey);
    drawTextRight(order.date || new Date().toLocaleDateString("cs-CZ"), 550, dateY, 8, regularFont, cCharcoal);

    dateY -= 14;
    drawText("Variabilní symbol", 45, dateY, 8, regularFont, cGrey);
    drawTextRight(String(order.id), 240, dateY, 8, regularFont, cCharcoal);
    drawText("Datum splatnosti", 320, dateY, 8, regularFont, cGrey);
    drawTextRight(order.date || new Date().toLocaleDateString("cs-CZ"), 550, dateY, 8, regularFont, cCharcoal);

    dateY -= 14;
    drawText("Způsob platby", 45, dateY, 8, regularFont, cGrey);
    const pm = order.paymentMethod || "online platba";
    const displayPm = pm.includes("GP webpay") ? "Karta (GP webpay)" : pm;
    drawTextRight(displayPm, 240, dateY, 8, regularFont, cCharcoal);

    // Table Divider Line
    const tableDividerY = 510;
    page.drawLine({ start: { x: 45, y: tableDividerY }, end: { x: 550, y: tableDividerY }, thickness: 0.5, color: cGrey });
    drawTextRight("CENA", 550, tableDividerY + 5, 7, boldFont, cGrey);

    // Table Rows
    let currentY = tableDividerY - 20;
    const formatKcs = (val: number | string) => `${parseFloat(String(val)).toLocaleString("cs-CZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Kč`;

    const itemRows = order.items || [];
    itemRows.forEach((item: any) => {
      const nameText = item.name || item.productName || "";
      const descText = `${nameText} (${item.quantity} ks)`;
      const totalVal = parseFloat(item.price || "0") * parseInt(item.quantity || "1");

      // Wrap item description if too long (max width 380 points)
      const maxDescWidth = 380;
      const words = descText.split(" ");
      let currentLine = "";
      const descLines: string[] = [];
      for (const word of words) {
        if (regularFont.widthOfTextAtSize(currentLine + " " + word, 9) > maxDescWidth) {
          descLines.push(currentLine.trim());
          currentLine = word;
        } else {
          currentLine += " " + word;
        }
      }
      if (currentLine) {
        descLines.push(currentLine.trim());
      }

      descLines.forEach((line, lineIdx) => {
        drawText(line, 45, currentY - (lineIdx * 12), 9, regularFont, cCharcoal);
      });

      drawTextRight(formatKcs(totalVal), 550, currentY, 9, regularFont, cCharcoal);

      const rowHeight = descLines.length > 1 ? 12 * descLines.length + 8 : 20;
      currentY -= rowHeight;

      // Draw thin separator line
      page.drawLine({ start: { x: 45, y: currentY + 10 }, end: { x: 550, y: currentY + 10 }, thickness: 0.2, color: cBorder });
    });

    // Draw Shipping Cost
    if (order.shippingCost !== undefined) {
      const shipVal = parseFloat(order.shippingCost || "0");
      const shipName = `Doprava - ${order.shippingMethod || "Osobní odběr"} (1 ks)`;
      drawText(shipName, 45, currentY, 9, regularFont, cCharcoal);
      drawTextRight(formatKcs(shipVal), 550, currentY, 9, regularFont, cCharcoal);
      currentY -= 20;
      page.drawLine({ start: { x: 45, y: currentY + 10 }, end: { x: 550, y: currentY + 10 }, thickness: 0.2, color: cBorder });
    }

    // Draw Payment Surcharge if exists
    if (order.paymentSurcharge && parseFloat(order.paymentSurcharge) > 0) {
      const surVal = parseFloat(order.paymentSurcharge);
      drawText("Dobírkový příplatek (1 ks)", 45, currentY, 9, regularFont, cCharcoal);
      drawTextRight(formatKcs(surVal), 550, currentY, 9, regularFont, cCharcoal);
      currentY -= 20;
      page.drawLine({ start: { x: 45, y: currentY + 10 }, end: { x: 550, y: currentY + 10 }, thickness: 0.2, color: cBorder });
    }

    // Summary line
    currentY += 5;
    page.drawLine({ start: { x: 300, y: currentY }, end: { x: 550, y: currentY }, thickness: 1.5, color: cCharcoal });

    const items = order.items || [];
    let hasNoVatItems = false;
    let regularSubtotal = 0;
    let noVatSubtotal = 0;

    items.forEach((item: any) => {
      const price = parseFloat(item.price || "0");
      const qty = parseInt(item.quantity || "1");
      const val = price * qty;
      if (item.no_vat === true) {
        hasNoVatItems = true;
        noVatSubtotal += val;
      } else {
        regularSubtotal += val;
      }
    });

    const shippingCost = parseFloat(order.shippingCost || "0");
    const paymentSurcharge = parseFloat(order.paymentSurcharge || "0");
    regularSubtotal += shippingCost + paymentSurcharge;

    const total = parseFloat(order.finalTotal || "0");

    let totalPaidRegular = total;
    let totalPaidNoVat = 0;
    const totalBeforeCredit = regularSubtotal + noVatSubtotal;

    if (totalBeforeCredit > 0) {
      const ratioRegular = regularSubtotal / totalBeforeCredit;
      totalPaidRegular = total * ratioRegular;
      totalPaidNoVat = total * (1 - ratioRegular);
    }

    const vatRate = 0.21;
    const base21 = totalPaidRegular / (1 + vatRate);
    const vat21 = totalPaidRegular - base21;

    // Grand Total on Right
    drawTextRight(formatKcs(total), 550, currentY - 20, 14, boldFont, cCharcoal);
    // Paid Status Text directly below Grand Total
    drawTextRight("UHRAZENO", 550, currentY - 35, 10, boldFont, cGreen);

    // VAT Table on Left
    let vatY = currentY - 15;
    drawText("Rozpis DPH", 45, vatY, 8, boldFont, cGrey);
    vatY -= 14;
    drawText("Sazba", 45, vatY, 7, boldFont, cGrey);
    drawTextRight("Základ", 120, vatY, 7, boldFont, cGrey);
    drawTextRight("DPH", 185, vatY, 7, boldFont, cGrey);
    drawTextRight("Celkem", 250, vatY, 7, boldFont, cGrey);

    page.drawLine({ start: { x: 45, y: vatY - 3 }, end: { x: 250, y: vatY - 3 }, thickness: 0.5, color: cBorder });
    vatY -= 12;

    // Render 21% standard row
    drawText("21%", 45, vatY, 8, regularFont, cCharcoal);
    drawTextRight(formatKcs(base21), 120, vatY, 8, regularFont, cCharcoal);
    drawTextRight(formatKcs(vat21), 185, vatY, 8, regularFont, cCharcoal);
    drawTextRight(formatKcs(totalPaidRegular), 250, vatY, 8, boldFont, cCharcoal);

    // Render § 90 margin scheme row if exists
    if (hasNoVatItems) {
      vatY -= 14;
      drawText("§ 90", 45, vatY, 8, regularFont, cCharcoal);
      drawTextRight(formatKcs(totalPaidNoVat), 120, vatY, 8, regularFont, cCharcoal);
      drawTextRight(formatKcs(0), 185, vatY, 8, regularFont, cCharcoal);
      drawTextRight(formatKcs(totalPaidNoVat), 250, vatY, 8, boldFont, cCharcoal);

      vatY -= 16;
      drawText("Uplatněn zvláštní režim podle § 90 zákona o DPH - použité zboží.", 45, vatY, 7, regularFont, cGrey);
    }

    // Notes Box (if notes exist)
    let notesY = vatY - 25;
    if (order.notes && order.notes.trim()) {
      drawText("Poznámka", 45, notesY, 8, boldFont, cGrey);
      notesY -= 12;

      const noteWords = order.notes.split(" ");
      let currentLine = "";
      const lines: string[] = [];
      for (const word of noteWords) {
        if (regularFont.widthOfTextAtSize(currentLine + " " + word, 8) > 220) {
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
        drawText(lineText, 45, notesY, 8, regularFont, cGrey);
        notesY -= 11;
      });
    }

    // Footer - register details
    drawTextCenter(
      "Společnost zapsaná v obchodním rejstříku u Krajského soudu v Hradci Králové, oddíl C, vložka 29618142.",
      width / 2,
      40,
      7,
      regularFont,
      cGrey
    );

    // Save PDF
    const pdfBytes = await pdfDoc.save();
    const fileName = `invoice_${order.id}.pdf`;

    try {
      await supabase.storage.createBucket("invoices", { public: true });
    } catch (_bErr) {
      // Ignore if exists
    }

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
