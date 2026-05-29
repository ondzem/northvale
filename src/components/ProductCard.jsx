import { useState, useEffect, useRef } from 'react';

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
      alt={alt}
      onLoad={handleLoad}
      className={`${className} ${fitClass} ${loaded ? 'loaded' : ''}`}
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
      className={`vf-card type-${product.type} ${stock === 0 ? 'out-of-stock' : ''}`}
      onClick={handleCardClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
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
      <div className="vf-art">
        <div className="card-art" style={{ borderRadius: '8px' }}>
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
            <div className="slab-badge-overlay">
              <span>{product.company}</span>
              <span>{product.grade}</span>
            </div>
          )}

          {/* Preorder & Investment Tags */}
          {product.preorder && (
            <span className="card-tag preorder-tag">
              PŘEDOBJEDNÁVKA
            </span>
          )}

          {product.investment && (
            <span className="card-tag invest-tag">
              INVESTIČNÍ
            </span>
          )}
        </div>
      </div>
      <div className="vf-shadow"></div>

      {/* Info Content Section - exact same layout and transparent style as on the homepage */}
      <div className="vf-info">
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
        <table className="card-specs-table">
          <tbody>
            {isSingle && (
              <>
                <tr>
                  <td>Rarita</td>
                  <td>{product.rarity || 'Secret Rare'}</td>
                </tr>
                <tr>
                  <td>Kód karty</td>
                  <td className="spec-gold">{getCardCode(product)}</td>
                </tr>
                <tr>
                  <td>Stav & Jazyk</td>
                  <td>
                    {hasVariants ? `${currentVariant.condition} - ${currentVariant.lang}` : 'NM - EN'}
                  </td>
                </tr>
                <tr>
                  <td>Úprava</td>
                  <td>
                    {hasVariants ? (currentVariant.foil ? 'Foil ✨' : 'Non-Foil ▱') : 'Foil ✨'}
                  </td>
                </tr>
              </>
            )}

            {product.type === 'slab' && (
              <>
                <tr>
                  <td>Certifikační firma</td>
                  <td>{product.company}</td>
                </tr>
                <tr>
                  <td>Výsledná známka</td>
                  <td className="spec-gold">{product.grade} / 10</td>
                </tr>
                <tr>
                  <td>Cert. číslo</td>
                  <td className="spec-monospace">#{product.certNumber}</td>
                </tr>
              </>
            )}

            {(product.type === 'sealed' || product.type === 'accessory') && (
              <>
                <tr>
                  <td>Edice / Set</td>
                  <td>{product.edition || 'Scarlet & Violet'}</td>
                </tr>
                <tr>
                  <td>Jazyk balení</td>
                  <td>
                    {product.lang === 'JP' ? 'Japonština (JP) 🇯🇵' : product.lang === 'EN' ? 'Angličtina (EN) 🇬🇧' : 'Všechny jazyky'}
                  </td>
                </tr>
                <tr>
                  <td>Kategorie</td>
                  <td style={{ textTransform: 'capitalize' }}>
                    {product.type === 'sealed' ? 'Zapečetěné' : 'Příslušenství'}
                  </td>
                </tr>
              </>
            )}
          </tbody>
        </table>


        {/* Add to Cart button footer block */}
        <div className="card-buy-container">
          <button 
            className="btn btn-primary do-kosiku-btn"
            disabled={stock === 0}
            onClick={handleBuyClick}
            style={{
              backgroundColor: isAdded ? 'var(--color-green)' : 'var(--color-gold)',
              cursor: stock > 0 ? 'pointer' : 'not-allowed',
              opacity: stock > 0 ? 1 : 0.4
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
