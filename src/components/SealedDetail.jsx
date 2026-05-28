import React, { useState } from 'react';

export default function SealedDetail({ productId, products, addToCart, setSelectedProductId, setActivePage }) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const product = products.find(p => p.id === productId);

  if (!product) {
    return (
      <div style={styles.errorContainer} className="glass-panel">
        <h3>Produkt nebyl nalezen</h3>
        <button className="btn btn-primary" onClick={() => setActivePage('sealed-catalog')}>
          Zpět do katalogu
        </button>
      </div>
    );
  }

  // Get related products from same game
  const relatedProducts = products
    .filter(p => p.game === product.game && p.id !== product.id)
    .slice(0, 4);

  const handleRelatedClick = (relatedId) => {
    setSelectedProductId(relatedId);
    setSelectedImageIndex(0);
    // Stay on sealed detail page
  };

  return (
    <div style={styles.container} className="container fade-in">
      <h1 className="sr-only">{product.name} - Detail produktu - NORTHVALE</h1>

      <div style={styles.layout}>
        {/* Left Column: Image Gallery */}
        <div style={styles.leftCol}>
          <div style={styles.mainImageWrapper} className="glass-panel">
            {product.image ? (
              <img src={product.image} alt={product.name} style={styles.mainImage} />
            ) : (
              <div style={styles.placeholderImg}>
                <span style={{ fontSize: '96px' }}>{product.imagePlaceholderEmoji || '📦'}</span>
              </div>
            )}
          </div>
          {/* Thumbnails */}
          <div style={styles.thumbnailsRow}>
            <div 
              style={{
                ...styles.thumbnail,
                borderColor: selectedImageIndex === 0 ? 'var(--color-gold)' : 'rgba(63, 63, 70, 0.4)'
              }}
              onClick={() => setSelectedImageIndex(0)}
              className="glass-card"
            >
              {product.image ? (
                <img src={product.image} alt="" style={styles.thumbnailImg} />
              ) : (
                <span style={{ fontSize: '20px' }}>{product.imagePlaceholderEmoji || '📦'}</span>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Title, Price, Buy Action */}
        <div style={styles.rightCol} className="glass-panel">
          <div style={styles.metaRow}>
            <span style={styles.gameLabel}>{product.game}</span>
            {product.preorder && <span style={styles.preorderTag}>PŘEDOBJEDNÁVKA</span>}
            {product.investment && <span style={styles.investTag}>INVESTIČNÍ</span>}
          </div>

          <h2 style={styles.productName}>{product.name}</h2>
          
          <div style={styles.priceContainer}>
            <span style={styles.priceLabel}>Cena s DPH</span>
            <span style={styles.priceValue}>{product.price.toLocaleString()} Kč</span>
          </div>

          <div style={styles.stockStatus}>
            {product.stock > 0 ? (
              <div style={styles.inStock}>
                <span style={styles.statusDotGreen}>●</span>
                <div>
                  <span style={styles.statusText}>Skladem ({product.stock} ks)</span>
                  <span style={styles.deliveryText}>Můžeme odeslat zítra</span>
                </div>
              </div>
            ) : (
              <div style={styles.outOfStock}>
                <span style={styles.statusDotGold}>●</span>
                <div>
                  <span style={styles.statusText}>Na objednávku</span>
                  <span style={styles.deliveryText}>Doručení do 5-7 pracovních dnů</span>
                </div>
              </div>
            )}
          </div>

          {/* Sběratelský standard balení info */}
          <div style={styles.packagingInfo} className="glass-card">
            <h4 style={styles.packagingTitle}>🛡️ Sběratelský standard balení</h4>
            <p style={styles.packagingText}>
              Boxy expedujeme v pevných krabicích s bohatou vrstvou bublinkové fólie a papírové výplně. Rohy krabic jsou plně chráněny proti otlučení během přepravy.
            </p>
          </div>

          <button 
            className="btn btn-primary" 
            style={styles.buyBtn}
            disabled={product.stock === 0}
            onClick={() => addToCart(product, product)}
          >
            Přidat do košíku
          </button>
        </div>
      </div>

      {/* Bottom Layout: Contents description */}
      <section style={styles.descriptionSection} className="glass-panel">
        <h3 style={styles.descHeading}>Popis produktu a obsah balení</h3>
        <p style={styles.descText}>{product.desc}</p>
        
        {product.type === 'sealed' && product.game === 'Pokémon' && (
          <div style={styles.contentsList}>
            <h4 style={styles.contentsHeading}>Co obvykle najdete uvnitř:</h4>
            <ul style={styles.list}>
              <li>Originálně zapečetěné booster balíčky od The Pokémon Company.</li>
              <li>Každý booster obsahuje 10 náhodně namíchaných karet a kód pro online verzi hry.</li>
              <li>U Elite Trainer Boxů navíc herní doplňky (kostky, žetony, obaly a promo kartu).</li>
            </ul>
          </div>
        )}
      </section>

      {/* Recommended Related Products */}
      {relatedProducts.length > 0 && (
        <section style={styles.relatedSection}>
          <h3 style={styles.relatedHeading}>Mohlo by Vás zajímat</h3>
          <div className="grid grid-cols-4">
            {relatedProducts.map(rel => (
              <div 
                key={rel.id} 
                className="product-card" 
                style={styles.card}
                onClick={() => handleRelatedClick(rel.id)}
              >
                <div style={styles.relImgBox}>
                  {rel.image ? (
                    <img src={rel.image} alt={rel.name} style={styles.relImg} />
                  ) : (
                    <span style={{ fontSize: '32px' }}>{rel.imagePlaceholderEmoji || '📦'}</span>
                  )}
                </div>
                <div style={styles.relDetails}>
                  <h4 style={styles.relName}>{rel.name}</h4>
                  <span style={styles.relPrice}>{rel.price.toLocaleString()} Kč</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

const styles = {
  container: {
    paddingTop: '20px',
    paddingBottom: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '32px',
  },
  errorContainer: {
    padding: '40px',
    textAlign: 'center',
  },
  layout: {
    display: 'flex',
    gap: '32px',
    flexWrap: 'wrap',
  },
  leftCol: {
    flex: '1.2 1 400px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  mainImageWrapper: {
    height: '420px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(9, 9, 11, 0.4)',
    padding: '30px',
  },
  mainImage: {
    maxHeight: '100%',
    maxWidth: '100%',
    objectFit: 'contain',
  },
  placeholderImg: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 'var(--radius-lg)',
  },
  thumbnailsRow: {
    display: 'flex',
    gap: '12px',
  },
  thumbnail: {
    width: '64px',
    height: '64px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    padding: '6px',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  thumbnailImg: {
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain',
  },
  rightCol: {
    flex: '1 1 320px',
    padding: '30px',
    textAlign: 'left',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    alignSelf: 'flex-start',
  },
  metaRow: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  gameLabel: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  preorderTag: {
    fontSize: '9px',
    fontWeight: '800',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    color: 'var(--color-gold)',
    padding: '2px 6px',
    borderRadius: '2px',
  },
  investTag: {
    fontSize: '9px',
    fontWeight: '800',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    color: 'var(--color-green)',
    padding: '2px 6px',
    borderRadius: '2px',
  },
  productName: {
    fontSize: '22px',
    fontWeight: '800',
    lineHeight: '1.3',
    margin: 0,
    fontFamily: 'var(--font-heading)',
  },
  priceContainer: {
    borderTop: '1px solid rgba(255,255,255,0.06)',
    paddingTop: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  priceLabel: {
    fontSize: '11px',
    color: 'var(--text-muted)',
  },
  priceValue: {
    fontSize: '28px',
    fontWeight: '800',
    color: 'var(--color-gold)',
  },
  stockStatus: {
    display: 'flex',
    alignItems: 'center',
  },
  inStock: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
  },
  outOfStock: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
  },
  statusDotGreen: {
    color: 'var(--color-green)',
    fontSize: '20px',
  },
  statusDotGold: {
    color: 'var(--color-gold)',
    fontSize: '20px',
  },
  statusText: {
    fontSize: '14px',
    fontWeight: '700',
    display: 'block',
  },
  deliveryText: {
    fontSize: '11px',
    color: 'var(--text-muted)',
  },
  packagingInfo: {
    padding: '12px 16px',
    backgroundColor: 'rgba(255,255,255,0.01)',
  },
  packagingTitle: {
    fontSize: '12px',
    fontWeight: '700',
    margin: '0 0 6px',
  },
  packagingText: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    margin: 0,
    lineHeight: '1.4',
  },
  buyBtn: {
    width: '100%',
    padding: '12px',
    marginTop: '10px',
  },
  descriptionSection: {
    padding: '30px',
    textAlign: 'left',
  },
  descHeading: {
    fontSize: '18px',
    fontWeight: '700',
    marginBottom: '14px',
    fontFamily: 'var(--font-heading)',
  },
  descText: {
    fontSize: '14px',
    color: 'var(--text-muted)',
    lineHeight: '1.6',
    margin: 0,
  },
  contentsList: {
    marginTop: '20px',
    borderTop: '1px solid rgba(255,255,255,0.04)',
    paddingTop: '20px',
  },
  contentsHeading: {
    fontSize: '13px',
    fontWeight: '700',
    margin: '0 0 10px',
  },
  list: {
    fontSize: '13px',
    color: 'var(--text-muted)',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    paddingLeft: '20px',
    margin: 0,
  },
  relatedSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  relatedHeading: {
    fontSize: '20px',
    fontWeight: '700',
    textAlign: 'left',
    margin: 0,
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    textAlign: 'left',
    padding: '16px',
  },
  relImgBox: {
    height: '140px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(9, 9, 11, 0.4)',
    padding: '10px',
    borderRadius: 'var(--radius-md)',
  },
  relImg: {
    maxHeight: '100%',
    maxWidth: '100%',
    objectFit: 'contain',
  },
  relDetails: {
    marginTop: '10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  relName: {
    fontSize: '12px',
    fontWeight: '700',
    margin: 0,
    lineHeight: '1.4',
    minHeight: '34px',
  },
  relPrice: {
    fontSize: '13px',
    fontWeight: '800',
    color: 'var(--color-gold)',
  }
};
