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
 * Příplatek za platbu na dobírku (v Kč).
 * MUSÍ souhlasit s obchodními podmínkami v src/components/GdprVop.jsx.
 * Neúčtuje se u osobního odběru — tam se platí přímo v prodejně.
 */
export const COD_SURCHARGE = 29;

/** Hranice pro dopravu zdarma (v Kč). Příplatek za dobírku se jí neruší. */
export const FREE_SHIPPING_THRESHOLD = 1750;

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
