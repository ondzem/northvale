/**
 * Údaje produktu pro Google (strukturovaná data a og:image).
 * Stejná pravidla jako scripts/prerender.js — drž je v souladu.
 */
import { FREE_SHIPPING_THRESHOLD, SHIPPING_OPTIONS } from '../config';

const SITE = 'https://northvaletcg.eu';

/**
 * Obrázky produktů jsou v DB jako base64. Při buildu je generate-feeds.js uloží
 * do /product-images/<id>.<přípona> — Googlu dáváme odkaz na ten soubor.
 */
export function productImageUrl(product) {
  const img = product?.image;
  // V cache katalogu se base64 kvůli velikosti vynechává — zbyde jen příznak.
  // Admin ukládá obrázky jako webp, build je proto zapisuje jako <id>.webp.
  if (!img) return product?.has_image_data ? `${SITE}/product-images/${product.id}.webp` : null;
  const m = img.match(/^data:image\/([a-zA-Z0-9+]+);base64,/);
  if (m) return `${SITE}/product-images/${product.id}.${m[1] === 'jpeg' ? 'jpg' : m[1]}`;
  if (img.startsWith('data:')) return null;
  return img.startsWith('/') ? `${SITE}${img}` : img;
}

/** Doprava a vrácení do Offer (záznamy obchodníka v Google). */
export function offerShippingAndReturns(price) {
  const paid = (SHIPPING_OPTIONS || []).map(o => Number(o.price)).filter(n => n > 0);
  const cheapest = paid.length ? Math.min(...paid) : 79;
  return {
    shippingDetails: {
      '@type': 'OfferShippingDetails',
      shippingRate: { '@type': 'MonetaryAmount', value: Number(price) >= FREE_SHIPPING_THRESHOLD ? 0 : cheapest, currency: 'CZK' },
      shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'CZ' },
      deliveryTime: {
        '@type': 'ShippingDeliveryTime',
        handlingTime: { '@type': 'QuantitativeValue', minValue: 0, maxValue: 2, unitCode: 'DAY' },
        transitTime: { '@type': 'QuantitativeValue', minValue: 1, maxValue: 2, unitCode: 'DAY' }
      }
    },
    hasMerchantReturnPolicy: {
      '@type': 'MerchantReturnPolicy',
      applicableCountry: 'CZ',
      returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
      merchantReturnDays: 14,
      returnMethod: 'https://schema.org/ReturnByMail',
      returnFees: 'https://schema.org/ReturnFeesCustomerResponsibility'
    }
  };
}
