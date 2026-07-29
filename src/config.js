export const FEATURE_FLAGS = {
  showGrading: false,
  showBuylist: false,
  showSlabs: false,
  showTestimonials: false, // Set to true to show "Co o nás říkají" testimonials on homepage
  showNewsletter: true,   // Set to true to show newsletter forms on storefront pages
  preRegistrationActive: true, // If true, redirects normal users to pre-registration landing page
  showCalendar: false,    // Set to true to enable and show TCG Release Calendar 2026
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
