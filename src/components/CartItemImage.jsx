import { useState, useEffect } from 'react';
import { getProductImageCached, fetchProductImage } from '../services/products';

const FALLBACK = '/placeholder-product.webp';

export default function CartItemImage({ item, alt = '', className = '', style = {} }) {
  const productId = item?.product?.id || item?.productId || item?.product_id || item?.id || null;
  const direct = item?.product?.image || item?.image || '';
  const [src, setSrc] = useState(() => getProductImageCached(productId, direct) || '');
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);

    const cached = getProductImageCached(productId, direct);
    if (cached) {
      setSrc(cached);
      return;
    }
    if (!productId) {
      setFailed(true);
      return;
    }

    fetchProductImage(productId)
      .then(dbImage => {
        if (cancelled) return;
        if (dbImage) setSrc(dbImage);
        else setFailed(true);
      })
      .catch(err => {
        console.error('Nepodařilo se načíst obrázek produktu:', productId, err);
        if (!cancelled) setFailed(true);
      });

    return () => { cancelled = true; };
  }, [productId, direct]);

  // Dokud obrázek neznáme, zobraz prázdné průhledné místo — NIKDY ne zástupnou fotku.
  if (!src && !failed) {
    return <div className={className} style={{ ...style, background: 'transparent' }} aria-hidden="true" />;
  }

  return (
    <img
      src={src || FALLBACK}
      alt={alt || item?.name || item?.productName || ''}
      className={className}
      style={{ background: 'transparent', ...style }}
      loading="lazy"
      onError={() => { if (src !== FALLBACK) setSrc(FALLBACK); }}
    />
  );
}
