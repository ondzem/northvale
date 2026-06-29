/**
 * Pomocná funkce pro bezpečné ošetření textu do XML (XML Escaping)
 */
function escapeXml(unsafe: string | null | undefined): string {
  if (!unsafe) return "";
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

interface OrderItem {
  sku: string;        // Kód produktu párovaný s Pohodou
  name: string;       // Název produktu
  quantity: number;   // Množství
  price: number;      // Cena za kus s DPH (nebo bez DPH)
  vatRate?: number;   // Sazba DPH v procentech (např. 21)
}

interface OrderPayload {
  orderNumber: string; // Číslo objednávky / Variabilní symbol
  createdDate: string;  // Formát YYYY-MM-DD
  dueDate?: string;     // Formát YYYY-MM-DD
  email: string;
  phone?: string;
  billingName: string;  // Jméno a příjmení / Název firmy
  billingStreet: string;
  billingCity: string;
  billingZip: string;
  billingCountry?: string; // např. CZ, SK
  paymentMethod: string;  // převod, karta, dobírka
  totalAmount: number;
  items: OrderItem[];
}

/**
 * Sestaví validní XML faktury pro Pohodu 2.0
 */
export function buildInvoiceXml(order: OrderPayload, companyIco: string): string {
  const ico = companyIco.trim();
  const dateCreated = order.createdDate;
  const dateDue = order.dueDate || dateCreated; // pokud není, splatnost je ihned
  const paymentType = order.paymentMethod.toLowerCase() === "karta" ? "karta" : "převod";

  let itemsXml = "";
  for (const item of order.items) {
    // Rozhodnutí o sazbě DPH pro Pohodu (standardně 'high' pro 21 %, 'low' pro 15/12 %, 'none' pro 0 % / bez DPH)
    let vatRateType = "high";
    if (item.vatRate === 0) {
      vatRateType = "none";
    } else if (item.vatRate && item.vatRate < 21) {
      vatRateType = "low";
    }

    itemsXml += `
      <inv:invoiceItem>
        <inv:text>${escapeXml(item.name)}</inv:text>
        <inv:quantity>${item.quantity}</inv:quantity>
        <inv:unit>ks</inv:unit>
        <inv:payVAT>yes</inv:payVAT>
        <inv:rateVAT>${vatRateType}</inv:rateVAT>
        <inv:homeCurrency>
          <typ:unitPrice>${item.price.toFixed(2)}</typ:unitPrice>
        </inv:homeCurrency>
        <inv:code>${escapeXml(item.sku)}</inv:code>
      </inv:invoiceItem>`;
  }

  // Celé XML zabalíme do obálky datapacku verze 2.0
  const xml = `<?xml version="1.0" encoding="utf-8"?>
<dat:dataPack version="2.0" id="${escapeXml(order.orderNumber)}" ico="${escapeXml(ico)}" application="NorthvaleEshop" note="Export objednávky z e-shopu" xmlns:dat="http://www.stormware.cz/schema/version_2/data.xsd" xmlns:inv="http://www.stormware.cz/schema/version_2/invoice.xsd" xmlns:typ="http://www.stormware.cz/schema/version_2/type.xsd">
  <dat:dataPackItem version="2.0" id="${escapeXml(order.orderNumber)}">
    <inv:invoice version="2.0">
      <inv:invoiceHeader>
        <inv:invoiceType>issuedInvoice</inv:invoiceType>
        <inv:number>
          <typ:numberRequested>${escapeXml(order.orderNumber)}</typ:numberRequested>
        </inv:number>
        <inv:date>${dateCreated}</inv:date>
        <inv:dateTax>${dateCreated}</inv:dateTax>
        <inv:dateDue>${dateDue}</inv:dateDue>
        <inv:text>Faktura za objednávku č. ${escapeXml(order.orderNumber)}</inv:text>
        <inv:partnerIdentity>
          <typ:address>
            <typ:name>${escapeXml(order.billingName)}</typ:name>
            <typ:city>${escapeXml(order.billingCity)}</typ:city>
            <typ:street>${escapeXml(order.billingStreet)}</typ:street>
            <typ:zip>${escapeXml(order.billingZip)}</typ:zip>
            <typ:country>
              <typ:ids>${escapeXml(order.billingCountry || "CZ")}</typ:ids>
            </typ:country>
            <typ:phone>${escapeXml(order.phone)}</typ:phone>
            <typ:email>${escapeXml(order.email)}</typ:email>
          </typ:address>
        </inv:partnerIdentity>
        <inv:paymentType>
          <typ:paymentType>${escapeXml(paymentType)}</typ:paymentType>
        </inv:paymentType>
        <inv:note>Importováno z e-shopu Northvale TCG. Variabilní symbol: ${escapeXml(order.orderNumber)}.</inv:note>
        <inv:intNote>Tento doklad byl vygenerován automaticky.</inv:intNote>
      </inv:invoiceHeader>
      <inv:invoiceDetail>
        ${itemsXml}
      </inv:invoiceDetail>
    </inv:invoice>
  </dat:dataPackItem>
</dat:dataPack>`;

  return xml;
}
