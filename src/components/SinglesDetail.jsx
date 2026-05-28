import { useState } from 'react';

export default function SinglesDetail({ productId, products, addToCart, setSelectedProductId, setActivePage }) {
  const [showBackImage, setShowBackImage] = useState(false);
  const [zoomStyle, setZoomStyle] = useState({ display: 'none' });

  const product = products.find(p => p.id === productId);

  if (!product) {
    return (
      <div style={styles.errorContainer} className="glass-panel">
        <h3>Karta nebyla nalezena</h3>
        <button className="btn btn-primary" onClick={() => setActivePage('singles-catalog')}>
          Zpět do katalogu
        </button>
      </div>
    );
  }

  const activeImage = showBackImage ? (product.backImage || 'https://images.pokemontcg.io/unbroken_bonds/back.png') : product.image;

  // Custom Zoom Magnifier implementation
  const handleMouseMove = (e) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setZoomStyle({
      display: 'block',
      backgroundImage: `url(${activeImage})`,
      backgroundPosition: `${x}% ${y}%`,
      backgroundSize: `${width * 2.2}px ${height * 2.2}px` // 2.2x zoom
    });
  };

  const handleMouseLeave = () => {
    setZoomStyle({ display: 'none' });
  };

  const relatedSingles = products
    .filter(p => p.type === 'single' && p.id !== product.id)
    .slice(0, 4);

  return (
    <div style={styles.container} className="container fade-in">
      <h1 className="sr-only">{product.name} - Detail karty - NORTHVALE</h1>

      <div style={styles.layout}>
        {/* Left Column: Image with Magnifier */}
        <div style={styles.leftCol}>
          <div style={styles.imageSelector}>
            <button 
              style={{ ...styles.toggleImgBtn, borderBottomColor: !showBackImage ? 'var(--color-gold)' : 'transparent' }}
              onClick={() => setShowBackImage(false)}
            >
              Lícová strana (Front)
            </button>
            <button 
              style={{ ...styles.toggleImgBtn, borderBottomColor: showBackImage ? 'var(--color-gold)' : 'transparent' }}
              onClick={() => setShowBackImage(true)}
            >
              Rubová strana (Back)
            </button>
          </div>

          <div 
            style={styles.magnifierContainer} 
            className="glass-panel"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <img 
              src={activeImage} 
              alt={product.name} 
              style={styles.cardImage} 
            />
            {/* Magnifier Lens Overlay */}
            <div style={{ ...styles.magnifierLens, ...zoomStyle }} />
          </div>
          <span style={styles.magnifierTip}>Najetím myší na kartu aktivujete lupu pro detailní kontrolu hran.</span>
        </div>

        {/* Right Column: Title, Unified Variants Table */}
        <div style={styles.rightCol} className="glass-panel">
          <div style={styles.metaRow}>
            <span style={styles.editionBadge}>{product.edition}</span>
            {product.rarity && <span style={styles.rarityBadge}>{product.rarity}</span>}
          </div>

          <h2 style={styles.cardTitle}>{product.name}</h2>
          <p style={styles.desc}>{product.desc}</p>

          {/* Graded Slab specific metadata */}
          {product.type === 'slab' && (
            <div style={styles.slabMetadata} className="glass-card">
              <h4 style={styles.slabTitle}>🛡️ Certifikovaný slab</h4>
              <p style={styles.slabText}>
                <strong>Společnost:</strong> {product.company}<br />
                <strong>Výsledná známka:</strong> {product.grade} / 10<br />
                <strong>Certifikační číslo:</strong> {product.certNumber} (Ověřeno v databázi)
              </p>
            </div>
          )}

          {/* Sběratelský standard balení kusovek */}
          <div style={styles.packagingInfo} className="glass-card">
            <h4 style={styles.packagingTitle}>📦 Sběratelský standard balení singles</h4>
            <p style={styles.packagingText}>
              Penny Sleeve (karta hlavou dolů) + Vytahovací páska (Pull-Tab) + Pevný Toploader + Uzavíratelný celofánový Team Bag + Kartonový sendvič bez lepící pásky na toploaderu + Bublinková obálka.
            </p>
          </div>

          {/* Variants listing */}
          <div style={styles.tableWrapper}>
            <h3 style={styles.variantsHeading}>Dostupné varianty</h3>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Stav karty</th>
                  <th style={styles.th}>Jazyk</th>
                  <th style={styles.th}>Úprava</th>
                  <th style={styles.th}>Skladem</th>
                  <th style={styles.th}>Cena</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>Akce</th>
                </tr>
              </thead>
              <tbody>
                {product.variants ? (
                  product.variants.map(variant => (
                    <tr key={variant.id} style={styles.tr}>
                      <td style={styles.td}>
                        <span 
                          style={styles.conditionLabel} 
                          onClick={() => setActivePage('grading-guide')}
                          title="Zobrazit průvodce stavy"
                        >
                          {variant.condition}
                        </span>
                      </td>
                      <td style={styles.td}>{variant.lang}</td>
                      <td style={styles.td}>{variant.foil ? 'Foil (Třpytivá)' : 'Non-Foil (Matná)'}</td>
                      <td style={styles.td}>
                        <span style={{ color: variant.stock > 0 ? 'var(--color-green)' : 'var(--text-muted)' }}>
                          {variant.stock} ks
                        </span>
                      </td>
                      <td style={styles.tdPrice}>{variant.price.toLocaleString('cs-CZ')} Kč</td>
                      <td style={{ ...styles.td, textAlign: 'right' }}>
                        <button 
                          className="btn btn-primary"
                          style={styles.buyBtn}
                          disabled={variant.stock === 0}
                          onClick={() => addToCart(variant, product)}
                        >
                          Koupit
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  // If it's a slab or simple product
                  <tr style={styles.tr}>
                    <td style={styles.td}>
                      <span style={styles.conditionLabel}>NM</span>
                    </td>
                    <td style={styles.td}>EN</td>
                    <td style={styles.td}>Foil</td>
                    <td style={styles.td}>
                      <span style={{ color: product.stock > 0 ? 'var(--color-green)' : 'var(--text-muted)' }}>
                        {product.stock} ks
                      </span>
                    </td>
                    <td style={styles.tdPrice}>{product.price.toLocaleString('cs-CZ')} Kč</td>
                    <td style={{ ...styles.td, textAlign: 'right' }}>
                      <button 
                        className="btn btn-primary"
                        style={styles.buyBtn}
                        disabled={product.stock === 0}
                        onClick={() => addToCart(product, product)}
                      >
                        Koupit
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Recommended Related Singles */}
      {relatedSingles.length > 0 && (
        <section style={styles.relatedSection}>
          <h3 style={styles.relatedHeading}>Další kusové karty</h3>
          <div className="grid grid-cols-4">
            {relatedSingles.map(rel => (
              <div 
                key={rel.id} 
                className="product-card" 
                style={styles.card}
                onClick={() => { setSelectedProductId(rel.id); setShowBackImage(false); }}
              >
                <div style={styles.relImgBox}>
                  <img src={rel.image} alt={rel.name} style={styles.relImg} />
                </div>
                <div style={styles.relDetails}>
                  <h4 style={styles.relName}>{rel.name}</h4>
                  <span style={styles.relPrice}>{(rel.variants ? rel.variants[0].price : rel.price).toLocaleString('cs-CZ')} Kč</span>
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
    gap: '40px',
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
    alignItems: 'center',
  },
  imageSelector: {
    display: 'flex',
    gap: '16px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    width: '100%',
    justifyContent: 'center',
    paddingBottom: '8px',
  },
  toggleImgBtn: {
    fontSize: '13px',
    fontWeight: '700',
    color: 'var(--text-main)',
    padding: '6px 12px',
    borderBottom: '2px solid transparent',
    transition: 'border-color 0.2s',
  },
  magnifierContainer: {
    position: 'relative',
    width: '100%',
    maxWidth: '320px',
    height: '440px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(9, 9, 11, 0.4)',
    padding: '20px',
    cursor: 'crosshair',
    overflow: 'hidden',
  },
  cardImage: {
    maxHeight: '100%',
    maxWidth: '100%',
    objectFit: 'contain',
    zIndex: 1,
  },
  magnifierLens: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: 10,
    pointerEvents: 'none',
    backgroundRepeat: 'no-repeat',
    backgroundColor: 'rgba(9, 9, 11, 0.6)',
  },
  magnifierTip: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    textAlign: 'center',
  },
  rightCol: {
    flex: '1.5 1 400px',
    padding: '30px',
    textAlign: 'left',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  metaRow: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  editionBadge: {
    fontSize: '11px',
    color: 'var(--color-gold)',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  rarityBadge: {
    fontSize: '10px',
    fontWeight: '700',
    backgroundColor: 'rgba(255,255,255,0.06)',
    padding: '2px 8px',
    borderRadius: 'var(--radius-sm)',
  },
  cardTitle: {
    fontSize: '24px',
    fontWeight: '800',
    lineHeight: '1.3',
    margin: 0,
    fontFamily: 'var(--font-heading)',
  },
  desc: {
    fontSize: '14px',
    color: 'var(--text-muted)',
    lineHeight: '1.6',
    margin: 0,
  },
  slabMetadata: {
    padding: '12px 16px',
    backgroundColor: 'rgba(16, 185, 129, 0.03)',
    borderLeft: '4px solid var(--color-green)',
  },
  slabTitle: {
    fontSize: '12px',
    fontWeight: '700',
    color: 'var(--color-green)',
    margin: '0 0 6px',
  },
  slabText: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    margin: 0,
    lineHeight: '1.5',
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
  tableWrapper: {
    marginTop: '10px',
  },
  variantsHeading: {
    fontSize: '16px',
    fontWeight: '700',
    marginBottom: '12px',
    fontFamily: 'var(--font-heading)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '13px',
  },
  th: {
    textAlign: 'left',
    color: 'var(--text-muted)',
    fontWeight: '600',
    paddingBottom: '8px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  tr: {
    borderBottom: '1px solid rgba(255,255,255,0.03)',
    '&:last-child': {
      borderBottom: 'none',
    }
  },
  td: {
    padding: '12px 0',
  },
  conditionLabel: {
    fontSize: '11px',
    fontWeight: '800',
    backgroundColor: 'rgba(255,255,255,0.06)',
    padding: '2px 8px',
    borderRadius: '2px',
    cursor: 'pointer',
    color: 'var(--text-main)',
  },
  tdPrice: {
    padding: '12px 0',
    fontWeight: '700',
    color: 'var(--color-gold)',
  },
  buyBtn: {
    padding: '6px 16px',
    fontSize: '12px',
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
    height: '160px',
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
