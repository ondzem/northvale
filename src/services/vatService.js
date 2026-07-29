import { VAT_CONFIG, calculatePriceExVat, calculateVatAmount } from '../config';

/**
 * Service to manage and verify Czech VAT rates.
 * Conforms to Czech Tax Law (Zákon č. 235/2004 Sb. o dani z přidané hodnoty).
 */
export function getProductVatRate(product) {
  if (!product) return VAT_CONFIG.STANDARD_RATE;
  if (product.no_vat || product.noVat) return 0;
  return VAT_CONFIG.STANDARD_RATE;
}

export function formatVatLabel(vatRate) {
  if (vatRate === 0) return '0% (Bez DPH)';
  return `${Math.round(vatRate * 100)}%`;
}

export function getProductExVatPrice(product) {
  if (!product || !product.price) return 0;
  if (product.no_vat || product.noVat) return Number(product.price);
  return calculatePriceExVat(product.price, VAT_CONFIG.STANDARD_RATE);
}

export function getProductVatAmount(product) {
  if (!product || !product.price) return 0;
  if (product.no_vat || product.noVat) return 0;
  return calculateVatAmount(product.price, VAT_CONFIG.STANDARD_RATE);
}
