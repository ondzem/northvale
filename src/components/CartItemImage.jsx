import { useState, useEffect } from 'react';
import { getProductImageCached, fetchProductImage } from '../services/products';

const FALLBACK = '/Akce - NORTHVALE.webp';

export default function CartItemImage({ item, alt = '', className = '', style = {} }) {
  const productId = item?.product?.id || item?.productId || item?.product_id || item?.id || null;
  const initial = getProductImageCached(productId, item?.product?.image || item?.image || '');
  const [src, setSrc] = useState(initial || FALLBACK);

  useEffect(() => {
    let cancelled = false;
    const cached = getProductImageCached(productId, item?.product?.image || item?.image || '');
    if (cached) {
      setSrc(cached);
      return;
    }
    if (!productId) return;
    fetchProductImage(productId)
      .then(dbImage => { if (!cancelled && dbImage) setSrc(dbImage); })
      .catch(err => console.error('Nepodařilo se načíst obrázek produktu:', productId, err));
    return () => { cancelled = true; };
  }, [productId]);

  return (
    <img
      src={src}
      alt={alt || item?.name || item?.productName || ''}
      className={className}
      style={style}
      loading="lazy"
      onError={(e) => { if (e.target.src !== window.location.origin + FALLBACK) e.target.src = FALLBACK; }}
    />
  );
}
