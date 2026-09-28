export const FEATURE_FLAGS = {
  showGrading: false,
  showBuylist: false,
  showSlabs: false,
  showTestimonials: false, // Set to true to show "Co o nás říkají" testimonials on homepage
  showNewsletter: true,   // Set to true to show newsletter forms on storefront pages
  preRegistrationActive: false, // OFFICIALLY LAUNCHED: Storefront is live for all public visitors
  showCalendar: false,    // Set to true to enable and show TCG Release Calendar 2026
  // Automatické faktury. Dočasně vypnuto — fakturu vystavuje provozovatel ručně
  // ve svém účetnictví a posílá ji tlačítkem „Odeslat fakturu“ u objednávky
  // v administraci. Když je false, zákazník fakturu nikde na webu nevidí.
  // Musí odpovídat AUTO_INVOICES v supabase/functions/_shared/features.ts.
  autoInvoices: false,
};

/**
 * Centralized VAT configuration for Czech Republic (Zákon o DPH č. 235/2004 Sb.)
 */
export const VAT_CONFIG = {
  STANDARD_RATE: 0.21, // 21% Základní sazba DPH v ČR
  REDUCED_RATE: 0.12,  // 12% Snížená sazba DPH v ČR
  COUNTRY_CODE: 'CZ',
};

/**
 * Ceník plateb (v Kč). MUSÍ souhlasit s:
 *   - supabase/functions/finalize-order/index.ts (serverPaymentAdjustment) — server
 *     cenu přepočítává a nižší částku odmítne,
 *   - obchodními podmínkami v src/components/GdprVop.jsx.
 *
 * Platební brána 0 Kč · QR kód / bankovní převod −20 Kč · dobírka +39 Kč.
 * Dobírka se neúčtuje u osobního odběru — tam se platí přímo v prodejně.
 */
export const COD_SURCHARGE = 39;
export const TRANSFER_DISCOUNT = 20;

/**
 * Úprava ceny podle způsobu platby: kladná = příplatek, záporná = sleva.
 * Ukládá se do objednávky jako paymentSurcharge (se znaménkem).
 */
export function paymentAdjustment(payment, isPersonalShipping) {
  if (payment === 'cod') return isPersonalShipping ? 0 : COD_SURCHARGE;
  if (payment === 'transfer') return -TRANSFER_DISCOUNT;
  return 0;
}

/**
 * Popisek řádku s úpravou ceny za platbu (příplatek za dobírku / sleva za převod).
 * Používá se v souhrnu objednávky, potvrzení, účtu zákazníka i fakturách.
 */
export function paymentAdjustmentLabel(amount, lang = 'CZ') {
  if (amount < 0) return lang === 'CZ' ? 'Sleva za platbu převodem / QR kódem' : 'Bank transfer / QR payment discount';
  return lang === 'CZ' ? 'Příplatek za dobírku' : 'Cash on delivery surcharge';
}

/** Hranice pro dopravu zdarma (v Kč, včetně — „od 3 500 Kč“). Platí pro DPD a GLS. */
export const FREE_SHIPPING_THRESHOLD = 3500;

/**
 * Způsoby doručení pro zobrazení zákazníkovi (okno „Možnosti doručení“ na produktu).
 * Ceny MUSÍ odpovídat výpočtu v src/components/CheckoutFlow.jsx,
 * supabase/functions/finalize-order/index.ts (serverShippingCost)
 * a textu „Doprava a doručení“ v src/components/GdprVop.jsx.
 */
export const SHIPPING_OPTIONS = [
  { id: 'dpd-pickup', carrier: 'DPD', price: 79,
    name: { CZ: 'DPD – výdejní místo', EN: 'DPD – pickup point' },
    desc: { CZ: 'Výdejní místo nebo box DPD. Obvykle do druhého pracovního dne od odeslání.', EN: 'DPD pickup point or locker. Usually by the second business day after dispatch.' } },
  { id: 'dpd-address', carrier: 'DPD', price: 109,
    name: { CZ: 'DPD – doručení na adresu', EN: 'DPD – home delivery' },
    desc: { CZ: 'Kurýrem na Vaši adresu, s možností změnit termín doručení.', EN: 'Courier to your address, with the option to reschedule delivery.' } },
  { id: 'gls-pickup', carrier: 'GLS', price: 89,
    name: { CZ: 'GLS – výdejní místo', EN: 'GLS – pickup point' },
    desc: { CZ: 'Výdejní místo nebo box GLS (Parcel Shop). Obvykle do druhého pracovního dne od odeslání.', EN: 'GLS Parcel Shop or locker. Usually by the second business day after dispatch.' } },
  { id: 'gls-address', carrier: 'GLS', price: 129,
    name: { CZ: 'GLS – doručení na adresu', EN: 'GLS – home delivery' },
    desc: { CZ: 'Kurýrem domů nebo do zaměstnání.', EN: 'Courier to your home or workplace.' } },
  { id: 'personal', carrier: null, price: 0,
    name: { CZ: 'Osobní odběr – Holice', EN: 'Personal pickup – Holice' },
    desc: { CZ: 'ELEKTROOBCHOD Škrba, Bratří Čapků 1095, Holice. Po–Pá 7:00–12:00 a 13:00–16:00.', EN: 'ELEKTROOBCHOD Škrba, Bratří Čapků 1095, Holice. Mon–Fri 7:00–12:00 and 13:00–16:00.' } }
];

/**
 * Calculates price without VAT using official CZ VAT coefficient.
 * Formula: Price / (1 + vatRate)
 */
export function calculatePriceExVat(priceWithVat, vatRate = VAT_CONFIG.STANDARD_RATE) {
  if (!priceWithVat || isNaN(priceWithVat)) return 0;
  return Math.round(Number(priceWithVat) / (1 + vatRate));
}

/**
 * Calculates the exact VAT amount from price with VAT.
 */
export function calculateVatAmount(priceWithVat, vatRate = VAT_CONFIG.STANDARD_RATE) {
  if (!priceWithVat || isNaN(priceWithVat)) return 0;
  return Math.round(Number(priceWithVat) - calculatePriceExVat(priceWithVat, vatRate));
}
