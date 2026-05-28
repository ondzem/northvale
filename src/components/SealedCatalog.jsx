import React, { useState, useEffect } from 'react';

export default function SealedCatalog({ products, addToCart, setSelectedProductId, setActivePage, filters, setFilters }) {
  const [selectedGame, setSelectedGame] = useState(filters.game || 'all');
  const [selectedLang, setSelectedLang] = useState(filters.lang || 'all');
  const [investmentOnly, setInvestmentOnly] = useState(filters.investment || false);

  // Sync state with incoming global filters
  useEffect(() => {
    if (filters.game) setSelectedGame(filters.game);
    if (filters.lang) setSelectedLang(filters.lang);
    if (filters.investment) setInvestmentOnly(filters.investment);
  }, [filters]);

  const sealedProducts = products.filter(p => p.type === 'sealed' || p.type === 'accessory');

  // Filter logic
  const filteredProducts = sealedProducts.filter(product => {
    if (selectedGame !== 'all' && product.game !== selectedGame) return false;
    if (selectedLang !== 'all' && product.lang !== selectedLang) return false;
    if (investmentOnly && !product.investment) return false;
    return true;
  });

  const handleCardClick = (product) => {
    setSelectedProductId(product.id);
    setActivePage('sealed-detail');
  };

  return (
    <div style={styles.container} className="container fade-in">
      <h1 className="sr-only">Katalog zapečetěných TCG produktů - NORTHVALE</h1>

      {/* Top Filter Bar */}
      <div style={styles.filterBar} className="glass-panel">
        <div style={styles.filterGroup}>
          <label style={styles.label}>Karetní hra:</label>
          <select 
            value={selectedGame} 
            onChange={(e) => setSelectedGame(e.target.value)} 
            style={styles.select}
          >
            <option value="all">Všechny hry</option>
            <option value="Pokémon">Pokémon TCG</option>
            <option value="Magic">Magic the Gathering</option>
            <option value="One Piece">One Piece TCG</option>
            <option value="Riftbound">Riftbound</option>
            <option value="Accessories">Příslušenství</option>
          </select>
        </div>

        <div style={styles.filterGroup}>
          <label style={styles.label}>Jazyk:</label>
          <select 
            value={selectedLang} 
            onChange={(e) => setSelectedLang(e.target.value)} 
            style={styles.select}
          >
            <option value="all">Všechny jazyky</option>
            <option value="EN">Angličtina (ENG)</option>
            <option value="JP">Japonština (JPN)</option>
            <option value="CN">Čínština (CHN)</option>
          </select>
        </div>

        <div style={styles.filterGroup}>
          <label style={styles.checkboxLabel}>
            <input 
              type="checkbox" 
              checked={investmentOnly} 
              onChange={(e) => setInvestmentOnly(e.target.checked)}
              style={styles.checkbox}
            />
            <span>Pouze investiční edice</span>
          </label>
        </div>

        <button 
          className="btn btn-secondary"
          onClick={() => {
            setSelectedGame('all');
            setSelectedLang('all');
            setInvestmentOnly(false);
            setFilters({});
          }}
          style={styles.resetBtn}
        >
          Resetovat filtry
        </button>
      </div>

      {investmentOnly && (
        <div style={styles.investmentHeader} className="glass-panel">
          <h3 style={styles.investTitle}>Sběratelské a investiční edice</h3>
          <p style={styles.investText}>
            V této sekci najdete produkty starších i moderních setů. Ty pak pečlivě prohlížíme a vybíráme ty v TOP stavech vhodných do sbírky.
          </p>
        </div>
      )}

      {/* Grid of Sealed products */}
      {filteredProducts.length === 0 ? (
        <div style={styles.noResults} className="glass-panel">
          <span style={{ fontSize: '48px' }}>📦</span>
          <h3>Nebyly nalezeny žádné sealed produkty</h3>
          <p>Zkuste změnit výběr filtrů.</p>
        </div>
      ) : (
        <div className="grid grid-cols-4">
          {filteredProducts.map(product => (
            <div 
              key={product.id} 
              className={`product-card ${product.investment ? 'rarity-gold' : ''}`}
              style={styles.card}
              onClick={() => handleCardClick(product)}
            >
              <div style={styles.imageBox}>
                {product.image ? (
                  <img src={product.image} alt={product.name} style={styles.productImg} />
                ) : (
                  <div style={styles.placeholderImg}>
                    <span style={{ fontSize: '48px' }}>{product.imagePlaceholderEmoji || '📦'}</span>
                  </div>
                )}
              </div>
              <div style={styles.details}>
                <div style={styles.metaRow}>
                  <span style={styles.gameLabel}>{product.game}</span>
                  {product.preorder && <span style={styles.preorderTag}>PŘEDOBJEDNÁVKA</span>}
                  {product.investment && <span style={styles.investTag}>INVESTIČNÍ</span>}
                </div>
                <h3 style={styles.productName}>{product.name}</h3>
                <div style={styles.footerRow}>
                  <span style={styles.stockLabel}>
                    {product.stock > 0 ? (
                      <span className="text-green">● Skladem ({product.stock} ks)</span>
                    ) : (
                      <span style={{ color: 'var(--color-gold)' }}>Na objednání</span>
                    )}
                  </span>
                  <span style={styles.priceLabel}>{product.price.toLocaleString()} Kč</span>
                </div>
              </div>
            </div>
          ))}
        </div>
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
    gap: '24px',
  },
  filterBar: {
    padding: '16px 24px',
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
    flexWrap: 'wrap',
    textAlign: 'left',
  },
  filterGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  label: {
    fontSize: '13px',
    fontWeight: '700',
    color: 'var(--text-main)',
  },
  select: {
    backgroundColor: 'var(--bg-page)',
    border: '1px solid var(--border-light)',
    padding: '6px 12px',
    borderRadius: 'var(--radius-sm)',
    fontSize: '13px',
    color: 'var(--text-main)',
    outline: 'none',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  checkbox: {
    cursor: 'pointer',
  },
  resetBtn: {
    padding: '6px 12px',
    fontSize: '12px',
    marginLeft: 'auto',
  },
  investmentHeader: {
    padding: '20px 24px',
    backgroundColor: 'rgba(245, 158, 11, 0.05)',
    borderLeft: '4px solid var(--color-gold)',
    borderRadius: 'var(--radius-md)',
    textAlign: 'left',
  },
  investTitle: {
    fontSize: '16px',
    fontWeight: '800',
    color: 'var(--color-gold)',
    margin: '0 0 6px',
  },
  investText: {
    fontSize: '13px',
    color: 'var(--text-muted)',
    margin: 0,
    lineHeight: '1.5',
  },
  noResults: {
    padding: '48px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    textAlign: 'center',
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    textAlign: 'left',
    height: '100%',
  },
  imageBox: {
    height: '220px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(9, 9, 11, 0.4)',
    padding: '24px',
  },
  productImg: {
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
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 'var(--radius-md)',
  },
  details: {
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    flexGrow: 1,
    borderTop: '1px solid rgba(63, 63, 70, 0.15)',
  },
  metaRow: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap',
  },
  gameLabel: {
    fontSize: '10px',
    color: 'var(--text-muted)',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  preorderTag: {
    fontSize: '8px',
    fontWeight: '800',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    color: 'var(--color-gold)',
    padding: '1px 5px',
    borderRadius: '2px',
  },
  investTag: {
    fontSize: '8px',
    fontWeight: '800',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    color: 'var(--color-green)',
    padding: '1px 5px',
    borderRadius: '2px',
  },
  productName: {
    fontSize: '14px',
    fontWeight: '700',
    margin: 0,
    lineHeight: '1.4',
    minHeight: '40px',
  },
  footerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'auto',
    paddingTop: '6px',
  },
  stockLabel: {
    fontSize: '11px',
    fontWeight: '600',
  },
  priceLabel: {
    fontSize: '15px',
    fontWeight: '800',
    color: 'var(--color-gold)',
  }
};
