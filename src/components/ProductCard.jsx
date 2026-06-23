import { useState, useEffect, useRef } from 'react';
import { useTranslation } from '../context/LanguageContext';

const ProductImage = ({ src, alt, className = '' }) => {
  const [aspectRatio, setAspectRatio] = useState(1.0);
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    if (imgRef.current && imgRef.current.complete) {
      setLoaded(true);
      const { naturalWidth, naturalHeight } = imgRef.current;
      if (naturalWidth && naturalHeight) {
        setAspectRatio(naturalWidth / naturalHeight);
      }
    }
  }, [src]);

  const handleLoad = (e) => {
    const { naturalWidth, naturalHeight } = e.target;
    if (naturalWidth && naturalHeight) {
      setAspectRatio(naturalWidth / naturalHeight);
    }
    setLoaded(true);
  };

  const fitClass = aspectRatio >= 1.1 ? 'ca-fit-contain' : 'ca-fit-cover';

  return (
    <img
      ref={imgRef}
      src={src}
      alt={alt || 'Northvale TCG produkt'}
      width="240"
      height="336"
      onLoad={handleLoad}
      className={`${className} ${fitClass} ${loaded ? 'loaded' : ''}`}
    />
  );
};

const getCardThemeClass = (product) => {
  const name = (product?.name || '').toLowerCase();
  if (name.includes('charizard')) return 'ca-base-charizard';
  if (name.includes('pikachu')) return 'ca-base-pikachu';
  if (name.includes('umbreon')) return 'ca-base-umbreon';
  if (name.includes('giratina')) return 'ca-base-giratina';
  if (name.includes('rayquaza')) return 'ca-base-rayquaza';
  
  const themes = ['ca-base-charizard', 'ca-base-pikachu', 'ca-base-umbreon', 'ca-base-giratina', 'ca-base-rayquaza'];
  const code = (product?.id || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return themes[code % themes.length];
};

export const getCardCode = (product) => {
  const name = product?.name || '';
  const id = product?.id || '';
  const match = name.match(/(\d+\/\d+)/);
  if (match) return match[1];
  
  // Custom parsing for codes
  if (id.includes('charizard')) return 'SV3-223';
  if (id.includes('pikachu')) return 'SWSH4-188';
  if (id.includes('umbreon')) return 'SWSH7-215';
  if (id.includes('giratina')) return 'SWSH11-186';
  if (id.includes('rayquaza')) return 'SWSH7-218';
  
  const shortName = name.substring(0, 3).toUpperCase() || 'PRE';
  const hash = Math.abs(id.split('').reduce((a, b) => a + b.charCodeAt(0), 0));
  return `${shortName}-${hash % 250 + 1}`;
};

export default function ProductCard({ product, addToCart, setSelectedProductId, setActivePage }) {
  const { lang, t } = useTranslation();
  const selectedVariantIndex = 0;
  const [isAdded, setIsAdded] = useState(false);
  const [isFavorite, setIsFavorite] = useState(() => {
    try {
      const saved = localStorage.getItem(`fav-${product.id}`);
      return saved === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const handleFavsChange = () => {
      try {
        const saved = localStorage.getItem(`fav-${product.id}`);
        setIsFavorite(saved === 'true');
      } catch {
        setIsFavorite(false);
      }
    };
    window.addEventListener('local-favorites-changed', handleFavsChange);
    return () => window.removeEventListener('local-favorites-changed', handleFavsChange);
  }, [product.id]);

  const isSingle = product.type === 'single';
  const hasVariants = isSingle && product.variants && product.variants.length > 0;
  const currentVariant = hasVariants ? product.variants[selectedVariantIndex] : null;

  // Determine pricing and stock
  const price = (hasVariants ? currentVariant?.price : product.price) ?? 0;
  const stock = (hasVariants ? currentVariant?.stock : product.stock) ?? 0;
  const originalPrice = product.originalPrice || null;

  const handleCardClick = () => {
    setSelectedProductId(product.id);
    if (product.type === 'single' || product.type === 'slab') {
      setActivePage('singles-detail');
    } else {
      setActivePage('sealed-detail');
    }
  };

  const handleBuyClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const variant = hasVariants ? currentVariant : product;
    addToCart(variant, product);
    setIsAdded(true);
    setTimeout(() => {
      setIsAdded(false);
    }, 1500);
  };

  const handleFavoriteClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const nextVal = !isFavorite;
    setIsFavorite(nextVal);
    try {
      localStorage.setItem(`fav-${product.id}`, String(nextVal));
      window.dispatchEvent(new Event('local-favorites-changed'));
    } catch (err) {
      console.error(err);
    }
  };

  const cardUrl = product.type === 'single' || product.type === 'slab' 
    ? `/singles-detail/${product.id}` 
    : `/sealed-detail/${product.id}`;

  return (
    <a 
      href={cardUrl}
      className={`vf-card type-${product.type} ${(stock === 0 && !product.preorder) ? 'out-of-stock' : ''}`}
      onClick={(e) => {
        if (e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
          e.preventDefault();
          handleCardClick();
        }
      }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        cursor: 'pointer',
        textAlign: 'left'
      }}
    >
      {/* Holographic Art Box */}
      <div className="vf-art">
        <div className="card-art" style={{ borderRadius: '8px' }}>
          {/* Card Theme Gradient Base */}
          <div className={`ca-base ${getCardThemeClass(product)}`}></div>
          
          {/* Holographic Reflections */}
          <div className="ca-holo"></div>
          <div className="ca-shine"></div>
          <div className="ca-grain"></div>

          {/* Actual Card Image */}
          <ProductImage src={product.image} alt={product.name || 'Northvale TCG produkt'} className="ca-card-img" />

          {/* Slab Label Overlay if it is a graded slab */}
          {product.type === 'slab' && (
            <div className="slab-badge-overlay">
              <span>{product.company}</span>
              <span>{product.grade}</span>
            </div>
          )}

          {/* Preorder & Investment Tags */}
          {product.preorder && (
            <span className="card-tag preorder-tag">
              {t('ProductCard.preorder')}
            </span>
          )}

          {product.investment && (
            <span className="card-tag invest-tag">
              {t('ProductCard.investment')}
            </span>
          )}
        </div>
      </div>

      <div className="vf-info">
        {/* Card Title - Using homepage styling */}
        <div className="vf-name">
          {product.name.split(' (')[0]}
        </div>

        {/* Horizontal rule */}
        <div className="vf-rule"></div>

        {/* Meta row containing Stock (Left) and Price (Right) */}
        <div className="vf-meta" style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="vf-stock" style={{ fontSize: '10px' }}>
            {stock > 0 ? (
              <>
                <span className="vf-dot"></span>
                {t('ProductCard.inStock')} ({stock} {t('ProductCard.pcs')})
              </>
            ) : product.preorder ? (
              <>
                <span className="vf-dot" style={{ backgroundColor: 'var(--color-gold)', boxShadow: '0 0 8px rgba(253, 189, 22, 0.6)' }}></span>
                {t('ProductCard.onOrder')}
              </>
            ) : (
              <>
                <span className="vf-dot" style={{ backgroundColor: 'var(--text-muted)', boxShadow: 'none' }}></span>
                {t('ProductCard.outOfStock')}
              </>
            )}
          </span>
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            {originalPrice && (
              <span style={{ fontSize: '10px', color: 'var(--color-red)', textDecoration: 'line-through', marginBottom: '2px' }}>
                {originalPrice.toLocaleString(lang === 'CZ' ? 'cs-CZ' : 'en-US')} {lang === 'CZ' ? 'Kč' : 'CZK'}
              </span>
            )}
            <span className="vf-price" style={{ fontSize: '15px' }}>{price.toLocaleString(lang === 'CZ' ? 'cs-CZ' : 'en-US')} {lang === 'CZ' ? 'Kč' : 'CZK'}</span>
          </div>
        </div>

        {/* Add to Cart and Favorite footer block */}
        <div className="card-buy-container" style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
          <button 
            className={`card-favorite-btn ${isFavorite ? 'active' : ''}`}
            onClick={handleFavoriteClick}
            aria-label={t('ProductCard.addToFavs')}
          >
            <svg 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill={isFavorite ? 'currentColor' : 'none'} 
              stroke="currentColor" 
              strokeWidth="2.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
          </button>

          <button 
            className="btn btn-primary do-kosiku-btn"
            disabled={stock === 0 && !product.preorder}
            onClick={handleBuyClick}
            style={{
              flexGrow: 1,
              backgroundColor: isAdded ? 'var(--color-green)' : 'var(--color-gold)',
              cursor: (stock > 0 || product.preorder) ? 'pointer' : 'not-allowed',
              opacity: (stock > 0 || product.preorder) ? 1 : 0.4
            }}
          >
            <svg 
              width="14" 
              height="14" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              {isAdded ? (
                <polyline points="20 6 9 17 4 12"></polyline>
              ) : (
                <>
                  <circle cx="9" cy="21" r="1"></circle>
                  <circle cx="20" cy="21" r="1"></circle>
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                </>
              )}
            </svg>
            {isAdded ? t('ProductCard.added') : (product.preorder ? (lang === 'CZ' ? 'Předobjednat' : 'Pre-order') : t('ProductCard.addToCart'))}
          </button>
        </div>
      </div>
    </a>
  );
}
