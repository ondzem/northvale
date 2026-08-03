import { useState, useEffect } from 'react';
import { getProductImageCached, fetchProductImage } from '../services/products';

const FALLBACK = '/placeholder-product.webp';

export default function CartItemImage({ item, alt = '', className = '', style = {} }) {
  const candidateIds = [
    item?.product?.id,
    item?.productId,
    item?.product_id,
    item?.id
  ].filter(Boolean);

  const direct = item?.product?.image || item?.image || item?.productImage || '';

  // Synchronously find any cached image in memory or localStorage
  const getCachedImage = () => {
    if (direct && typeof direct === 'string' && direct.length > 5) {
      return direct;
    }
    for (const id of candidateIds) {
      const cached = getProductImageCached(id, '');
      if (cached) return cached;
    }
    return '';
  };

  const [src, setSrc] = useState(() => getCachedImage());
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);

    const initial = getCachedImage();
    if (initial) {
      setSrc(initial);
      return;
    }

    if (candidateIds.length === 0) {
      setFailed(true);
      return;
    }

    // Try fetching from DB for candidate IDs sequentially
    async function resolveFromDB() {
      for (const id of candidateIds) {
        try {
          const dbImg = await fetchProductImage(id);
          if (cancelled) return;
          if (dbImg) {
            setSrc(dbImg);
            return;
          }
        } catch (_err) {}
      }
      if (!cancelled) setFailed(true);
    }

    resolveFromDB();

    return () => { cancelled = true; };
  }, [candidateIds.join(','), direct]);

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
      onError={() => {
        if (src && src !== FALLBACK) {
          setSrc(FALLBACK);
        }
      }}
    />
  );
}
