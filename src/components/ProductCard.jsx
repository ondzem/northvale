import { useState } from 'react';

const ProductImage = ({ src, alt, className = '' }) => {
  const [aspectRatio, setAspectRatio] = useState(1.0);
  const [loaded, setLoaded] = useState(false);

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
      src={src}
      alt={alt}
      onLoad={handleLoad}
      className={`${className} ${fitClass} ${loaded ? 'loaded' : ''}`}
      style={{
        maxWidth: '100%',
        maxHeight: '100%',
        objectFit: aspectRatio >= 1.1 ? 'contain' : 'contain',
        transition: 'all 0.3s ease',
      }}
    />
  );
};

const getCardThemeClass = (product) => {
  const name = (product.name || '').toLowerCase();
  if (name.includes('charizard')) return 'ca-base-charizard';
  if (name.includes('pikachu')) return 'ca-base-pikachu';
  if (name.includes('umbreon')) return 'ca-base-umbreon';
  if (name.includes('giratina')) return 'ca-base-giratina';
  if (name.includes('rayquaza')) return 'ca-base-rayquaza';
  
  const themes = ['ca-base-charizard', 'ca-base-pikachu', 'ca-base-umbreon', 'ca-base-giratina', 'ca-base-rayquaza'];
  const code = (product.id || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return themes[code % themes.length];
};

const getCardCode = (product) => {
  const match = product.name.match(/(\d+\/\d+)/);
  if (match) return match[1];
  
  // Custom parsing for codes
  if (product.id.includes('charizard')) return 'SV3-223';
  if (product.id.includes('pikachu')) return 'SWSH4-188';
  if (product.id.includes('umbreon')) return 'SWSH7-215';
  if (product.id.includes('giratina')) return 'SWSH11-186';
  if (product.id.includes('rayquaza')) return 'SWSH7-218';
  
  const shortName = product.name.substring(0, 3).toUpperCase();
  const hash = Math.abs(product.id.split('').reduce((a, b) => a + b.charCodeAt(0), 0));
  return `${shortName}-${hash % 250 + 1}`;
};

export default function ProductCard({ product, addToCart, setSelectedProductId, setActivePage }) {
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const [isAdded, setIsAdded] = useState(false);
  const [isFavorite, setIsFavorite] = useState(() => {
    try {
      const saved = localStorage.getItem(`fav-${product.id}`);
      return saved === 'true';
    } catch {
      return false;
    }
  });

  const isSingle = product.type === 'single';
  const hasVariants = isSingle && product.variants && product.variants.length > 0;
  const currentVariant = hasVariants ? product.variants[selectedVariantIndex] : null;

  // Determine pricing and stock
  const price = hasVariants ? currentVariant.price : product.price;
  const stock = hasVariants ? currentVariant.stock : product.stock;
  const originalPrice = product.originalPrice || null;

  const handleCardClick = () => {
    setSelectedProductId(product.id);
    if (product.type === 'single') {
      setActivePage('singles-detail');
    } else {
      setActivePage('sealed-detail');
    }
  };

  const handleBuyClick = (e) => {
    e.stopPropagation();
    const variant = hasVariants ? currentVariant : product;
    addToCart(variant, product);
    setIsAdded(true);
    setTimeout(() => {
      setIsAdded(false);
    }, 1500);
  };

  const handleFavoriteClick = (e) => {
    e.stopPropagation();
    const nextVal = !isFavorite;
    setIsFavorite(nextVal);
    try {
      localStorage.setItem(`fav-${product.id}`, String(nextVal));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div 
      className={`vf-card type-${product.type} premium-catalog-card ${stock === 0 ? 'out-of-stock' : ''}`}
      onClick={handleCardClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        position: 'relative',
        cursor: 'pointer',
        textAlign: 'left'
      }}
    >
      {/* Favorite Heart Button */}
      <button 
        className={`card-favorite-btn ${isFavorite ? 'active' : ''}`}
        onClick={handleFavoriteClick}
        aria-label="Přidat do oblíbených"
        style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          zIndex: 30,
          background: 'rgba(0, 0, 0, 0.4)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '50%',
          width: '32px',
          height: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          color: isFavorite ? '#ff4a5a' : '#fff'
        }}
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

      {/* Holographic Art Box */}
      <div className="vf-art" style={{ position: 'relative', height: '200px', width: '100%' }}>
        <div className="card-art" style={{ height: '100%', borderRadius: '8px' }}>
          {/* Card Theme Gradient Base */}
          <div className={`ca-base ${getCardThemeClass(product)}`}></div>
          
          {/* Holographic Reflections */}
          <div className="ca-holo"></div>
          <div className="ca-shine"></div>
          <div className="ca-grain"></div>

          {/* Actual Card Image */}
          <ProductImage src={product.image} alt={product.name} className="ca-card-img" />

          {/* Slab Label Overlay if it is a graded slab */}
          {product.type === 'slab' && (
            <div className="slab-badge-overlay" style={{
              position: 'absolute',
              top: '8px',
              left: '8px',
              backgroundColor: '#fff',
              color: '#000',
              padding: '2px 8px',
              borderRadius: '3px',
              fontWeight: '800',
              fontSize: '10px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
              borderLeft: '3px solid var(--color-gold)',
              fontFamily: 'var(--font-heading)',
              zIndex: 10,
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <span>{product.company}</span>
              <span style={{
                backgroundColor: '#000',
                color: '#fff',
                borderRadius: '50%',
                width: '14px',
                height: '14px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '8px'
              }}>{product.grade}</span>
            </div>
          )}

          {/* Preorder & Investment Tags */}
          {product.preorder && (
            <span className="card-tag preorder-tag" style={{
              position: 'absolute',
              bottom: '8px',
              left: '8px',
              fontSize: '8px',
              fontWeight: '800',
              backgroundColor: 'rgba(245, 158, 11, 0.9)',
              color: '#000',
              padding: '2px 6px',
              borderRadius: '2px',
              zIndex: 10
            }}>
              PŘEDOBJEDNÁVKA
            </span>
          )}

          {product.investment && (
            <span className="card-tag invest-tag" style={{
              position: 'absolute',
              bottom: '8px',
              left: '8px',
              fontSize: '8px',
              fontWeight: '800',
              backgroundColor: 'rgba(16, 185, 129, 0.9)',
              color: '#000',
              padding: '2px 6px',
              borderRadius: '2px',
              zIndex: 10
            }}>
              INVESTIČNÍ
            </span>
          )}
        </div>
      </div>
      <div className="vf-shadow"></div>

      {/* Info Content Section - now using the exact same class and style rules as the homepage card */}
      <div 
        className="vf-info"
        style={{
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          flexGrow: 1,
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          backgroundColor: 'rgba(19, 19, 22, 0.6)',
          borderRadius: '0 0 8px 8px',
          marginTop: '0px',
          boxSizing: 'border-box'
        }}
      >
        {/* Edition/Series */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{
            fontSize: '9px',
            color: 'var(--color-gold)',
            fontWeight: '800',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            {product.edition || product.game}
          </span>
          <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
            {product.game}
          </span>
        </div>

        {/* Card Title - Using homepage styling */}
        <div className="vf-name" style={{ whiteSpace: 'normal', minHeight: '38px', fontSize: '14px', fontWeight: '700', marginBottom: '8px', lineHeight: '1.4' }}>
          {product.name.split(' (')[0]}
        </div>

        {/* Horizontal rule */}
        <div className="vf-rule" style={{ marginBottom: '8px' }}></div>

        {/* Meta row containing Stock (Left) and Price (Right) */}
        <div className="vf-meta" style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="vf-stock" style={{ fontSize: '10px' }}>
            {stock > 0 ? (
              <>
                <span className="vf-dot"></span>
                Skladem ({stock} ks)
              </>
            ) : product.preorder ? (
              <>
                <span className="vf-dot" style={{ backgroundColor: 'var(--color-gold)', boxShadow: '0 0 8px rgba(253, 189, 22, 0.6)' }}></span>
                Na objednání
              </>
            ) : (
              <>
                <span className="vf-dot" style={{ backgroundColor: 'var(--text-muted)', boxShadow: 'none' }}></span>
                Vyprodáno
              </>
            )}
          </span>
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            {originalPrice && (
              <span style={{ fontSize: '10px', color: 'var(--color-red)', textDecoration: 'line-through', marginBottom: '2px' }}>
                {originalPrice.toLocaleString()} Kč
              </span>
            )}
            <span className="vf-price" style={{ fontSize: '15px' }}>{price.toLocaleString('cs-CZ')} Kč</span>
          </div>
        </div>

        {/* Dynamic Specifications Table */}
        <table className="card-specs-table" style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse', marginBottom: '12px' }}>
          <tbody>
            {isSingle && (
              <>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                  <td style={{ padding: '4px 0', color: 'var(--text-muted)' }}>Rarita</td>
                  <td style={{ padding: '4px 0', textAlign: 'right', fontWeight: '600' }}>{product.rarity || 'Secret Rare'}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                  <td style={{ padding: '4px 0', color: 'var(--text-muted)' }}>Kód karty</td>
                  <td style={{ padding: '4px 0', textAlign: 'right', fontWeight: '700', color: 'var(--color-gold)' }}>{getCardCode(product)}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                  <td style={{ padding: '4px 0', color: 'var(--text-muted)' }}>Stav & Jazyk</td>
                  <td style={{ padding: '4px 0', textAlign: 'right', fontWeight: '600' }}>
                    {hasVariants ? `${currentVariant.condition} - ${currentVariant.lang}` : 'NM - EN'}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '4px 0', color: 'var(--text-muted)' }}>Úprava</td>
                  <td style={{ padding: '4px 0', textAlign: 'right', fontWeight: '600' }}>
                    {hasVariants ? (currentVariant.foil ? 'Foil ✨' : 'Non-Foil ▱') : 'Foil ✨'}
                  </td>
                </tr>
              </>
            )}

            {product.type === 'slab' && (
              <>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                  <td style={{ padding: '4px 0', color: 'var(--text-muted)' }}>Certifikační firma</td>
                  <td style={{ padding: '4px 0', textAlign: 'right', fontWeight: '600' }}>{product.company}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                  <td style={{ padding: '4px 0', color: 'var(--text-muted)' }}>Výsledná známka</td>
                  <td style={{ padding: '4px 0', textAlign: 'right', fontWeight: '700', color: 'var(--color-gold)' }}>{product.grade} / 10</td>
                </tr>
                <tr>
                  <td style={{ padding: '4px 0', color: 'var(--text-muted)' }}>Cert. číslo</td>
                  <td style={{ padding: '4px 0', textAlign: 'right', fontWeight: '600', fontFamily: 'monospace' }}>#{product.certNumber}</td>
                </tr>
              </>
            )}

            {(product.type === 'sealed' || product.type === 'accessory') && (
              <>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                  <td style={{ padding: '4px 0', color: 'var(--text-muted)' }}>Edice / Set</td>
                  <td style={{ padding: '4px 0', textAlign: 'right', fontWeight: '600' }}>{product.edition || 'Scarlet & Violet'}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                  <td style={{ padding: '4px 0', color: 'var(--text-muted)' }}>Jazyk balení</td>
                  <td style={{ padding: '4px 0', textAlign: 'right', fontWeight: '600' }}>
                    {product.lang === 'JP' ? 'Japonština (JP) 🇯🇵' : product.lang === 'EN' ? 'Angličtina (EN) 🇬🇧' : 'Všechny jazyky'}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '4px 0', color: 'var(--text-muted)' }}>Kategorie</td>
                  <td style={{ padding: '4px 0', textAlign: 'right', fontWeight: '600', textTransform: 'capitalize' }}>
                    {product.type === 'sealed' ? 'Zapečetěné' : 'Příslušenství'}
                  </td>
                </tr>
              </>
            )}
          </tbody>
        </table>

        {/* Variant Selector Toggles (Singles Only) */}
        {hasVariants && product.variants.length > 1 && (
          <div 
            className="variant-pill-selector" 
            onClick={(e) => e.stopPropagation()} 
            style={{ 
              display: 'flex', 
              gap: '6px', 
              flexWrap: 'wrap', 
              marginBottom: '14px',
              padding: '2px 0'
            }}
          >
            {product.variants.map((v, idx) => (
              <button
                key={v.id}
                onClick={() => setSelectedVariantIndex(idx)}
                style={{
                  backgroundColor: selectedVariantIndex === idx ? 'var(--color-gold)' : 'rgba(255, 255, 255, 0.04)',
                  color: selectedVariantIndex === idx ? '#000' : 'var(--text-main)',
                  border: selectedVariantIndex === idx ? '1px solid var(--color-gold)' : '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '4px',
                  padding: '3px 8px',
                  fontSize: '9px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {v.condition} - {v.lang}
              </button>
            ))}
          </div>
        )}

        {/* Add to Cart button footer block */}
        <div style={{ marginTop: 'auto', paddingTop: '10px' }}>
          <button 
            className="btn btn-primary do-kosiku-btn"
            disabled={stock === 0}
            onClick={handleBuyClick}
            style={{
              width: '100%',
              backgroundColor: isAdded ? 'var(--color-green)' : 'var(--color-gold)',
              color: '#000',
              fontWeight: '800',
              padding: '8px 12px',
              borderRadius: 'var(--radius-md)',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              border: 'none',
              cursor: stock > 0 ? 'pointer' : 'not-allowed',
              opacity: stock > 0 ? 1 : 0.4,
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 12px rgba(253, 189, 22, 0.1)'
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
            {isAdded ? 'Přidáno' : 'Do košíku'}
          </button>
        </div>
      </div>
    </div>
  );
}
