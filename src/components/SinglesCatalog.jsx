import React, { useState } from 'react';

export default function SinglesCatalog({ products, addToCart, setSelectedProductId, setActivePage, filters, setFilters, searchQuery, setSearchQuery }) {
  const [selectedEditions, setSelectedEditions] = useState(filters.edition ? [filters.edition] : []);
  const [selectedConditions, setSelectedConditions] = useState([]);
  const [selectedLangs, setSelectedLangs] = useState(filters.lang ? [filters.lang] : []);
  const [foilFilter, setFoilFilter] = useState('all');
  const [priceRange, setPriceRange] = useState(25000);
  
  // Decklist Importer states
  const [showImporter, setShowImporter] = useState(false);
  const [decklistText, setDecklistText] = useState('');
  
  // Button micro-animation state
  const [addedItems, setAddedItems] = useState({}); // item/variant id -> boolean

  // Get only singles
  const singles = products.filter(p => p.type === 'single');

  // Available filters options
  const editions = Array.from(new Set(singles.map(s => s.edition)));
  const conditions = ['NM', 'EX', 'GD', 'LP', 'PL', 'PO'];
  const langs = ['EN', 'JP', 'CN'];

  // Toggle helpers
  const handleEditionToggle = (edition) => {
    setSelectedEditions(prev => 
      prev.includes(edition) ? prev.filter(e => e !== edition) : [...prev, edition]
    );
  };

  const handleConditionToggle = (cond) => {
    setSelectedConditions(prev => 
      prev.includes(cond) ? prev.filter(c => c !== cond) : [...prev, cond]
    );
  };

  const handleLangToggle = (lang) => {
    setSelectedLangs(prev => 
      prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]
    );
  };

  // Filter logic
  const filteredSingles = singles.filter(product => {
    if (searchQuery && !product.name.toLowerCase().includes(searchQuery.toLowerCase()) && !product.edition.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    if (selectedEditions.length > 0 && !selectedEditions.includes(product.edition)) {
      return false;
    }

    const matchingVariants = product.variants.filter(variant => {
      if (selectedConditions.length > 0 && !selectedConditions.includes(variant.condition)) {
        return false;
      }
      if (selectedLangs.length > 0 && !selectedLangs.includes(variant.lang)) {
        return false;
      }
      if (foilFilter === 'foil' && !variant.foil) return false;
      if (foilFilter === 'non-foil' && variant.foil) return false;
      if (variant.price > priceRange) return false;
      return true;
    });

    return matchingVariants.length > 0;
  });

  const handleCardClick = (productId) => {
    setSelectedProductId(productId);
    setActivePage('singles-detail');
  };

  const handleBuyClick = (variant, card) => {
    addToCart(variant, card);
    setAddedItems(prev => ({ ...prev, [variant.id]: true }));
    setTimeout(() => {
      setAddedItems(prev => ({ ...prev, [variant.id]: false }));
    }, 1500);
  };

  // Parse and import decklist
  const handleImportDecklist = () => {
    if (!decklistText.trim()) return;
    const lines = decklistText.split('\n');
    let importCount = 0;
    
    lines.forEach(line => {
      // Matches: "4 Charizard" or "1 Pikachu" or just "Charizard" (defaults to 1)
      const match = line.trim().match(/^(\d+)?\s*(.+)$/);
      if (match) {
        const qty = match[1] ? parseInt(match[1]) : 1;
        const cardQuery = match[2].trim();
        
        // Search our singles for a name match
        const card = singles.find(p => p.name.toLowerCase().includes(cardQuery.toLowerCase()));
        if (card) {
          const defaultVariant = card.variants[0]; // NM EN foil or default
          for (let i = 0; i < qty; i++) {
            addToCart(defaultVariant, card);
          }
          importCount += qty;
        }
      }
    });

    if (importCount > 0) {
      alert(`Import úspěšný! Do košíku bylo přidáno ${importCount} karet podle Vašeho seznamu.`);
      setDecklistText('');
      setShowImporter(false);
    } else {
      alert('Nebyly nalezeny žádné odpovídající karty. Zkontrolujte prosím názvy v seznamu.');
    }
  };

  return (
    <div style={styles.container} className="container fade-in">
      <h1 className="sr-only">Katalog kusových TCG karet - NORTHVALE</h1>

      {/* Decklist Importer Toggle */}
      <div style={styles.importerToggleBar}>
        <button 
          className="btn btn-secondary" 
          onClick={() => setShowImporter(!showImporter)}
          style={styles.importerToggleBtn}
        >
          {showImporter ? '✕ Zavřít importér' : '📥 Importovat Decklist (pro turnajové hráče)'}
        </button>
      </div>

      {/* Decklist Importer Box */}
      {showImporter && (
        <div style={styles.importerBox} className="glass-panel">
          <h3 style={styles.importerTitle}>Decklist Importer</h3>
          <p style={styles.importerDesc}>
            Vložte seznam karet (každou kartu na nový řádek ve formátu: <code>množství název</code>, např. <code>4 Charizard</code>). Automaticky vyhledáme a přidáme nejlepší dostupné varianty do košíku.
          </p>
          <textarea
            rows="5"
            placeholder="Příklad:&#10;4 Charizard ex&#10;2 Pikachu VMAX"
            value={decklistText}
            onChange={(e) => setDecklistText(e.target.value)}
            style={styles.importerTextarea}
          />
          <button className="btn btn-primary" onClick={handleImportDecklist} style={{ marginTop: '12px' }}>
            Importovat do košíku
          </button>
        </div>
      )}

      <div style={styles.layout}>
        {/* Left Sidebar Filters */}
        <aside style={styles.sidebar} className="glass-panel">
          <h3 style={styles.sidebarHeading}>Filtry</h3>

          <div style={styles.filterSection}>
            <h4 style={styles.filterTitle}>Vyhledat v kategorii</h4>
            <input 
              type="text" 
              placeholder="Název karty..." 
              value={searchQuery || ''} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              style={styles.searchInput}
            />
          </div>

          <div style={styles.filterSection}>
            <h4 style={styles.filterTitle}>Edice / Set</h4>
            <div style={styles.checkboxList}>
              {editions.map(ed => (
                <label key={ed} style={styles.checkboxLabel}>
                  <input 
                    type="checkbox" 
                    checked={selectedEditions.includes(ed)} 
                    onChange={() => handleEditionToggle(ed)}
                    style={styles.checkbox}
                  />
                  <span>{ed}</span>
                </label>
              ))}
            </div>
          </div>

          <div style={styles.filterSection}>
            <h4 style={styles.filterTitle}>Stav karty</h4>
            <div style={styles.checkboxList}>
              {conditions.map(cond => (
                <label key={cond} style={styles.checkboxLabel}>
                  <input 
                    type="checkbox" 
                    checked={selectedConditions.includes(cond)} 
                    onChange={() => handleConditionToggle(cond)}
                    style={styles.checkbox}
                  />
                  <span style={styles.conditionText}>{cond}</span>
                </label>
              ))}
            </div>
            <span style={styles.guideLink} onClick={() => setActivePage('grading-guide')}>Průvodce stavy karet</span>
          </div>

          <div style={styles.filterSection}>
            <h4 style={styles.filterTitle}>Jazyk</h4>
            <div style={styles.checkboxList}>
              {langs.map(lang => (
                <label key={lang} style={styles.checkboxLabel}>
                  <input 
                    type="checkbox" 
                    checked={selectedLangs.includes(lang)} 
                    onChange={() => handleLangToggle(lang)}
                    style={styles.checkbox}
                  />
                  <span>{lang === 'EN' ? 'Angličtina (EN)' : lang === 'JP' ? 'Japonština (JP)' : 'Čínština (CHN)'}</span>
                </label>
              ))}
            </div>
          </div>

          <div style={styles.filterSection}>
            <h4 style={styles.filterTitle}>Provedení</h4>
            <select 
              value={foilFilter} 
              onChange={(e) => setFoilFilter(e.target.value)} 
              style={styles.selectInput}
            >
              <option value="all">Všechny úpravy</option>
              <option value="foil">Pouze Foil (Třpytivé)</option>
              <option value="non-foil">Pouze Non-Foil (Matné)</option>
            </select>
          </div>

          <div style={styles.filterSection}>
            <h4 style={styles.filterTitle}>Maximální cena</h4>
            <div style={styles.priceRow}>
              <input 
                type="range" 
                min="0" 
                max="25000" 
                step="100"
                value={priceRange} 
                onChange={(e) => setPriceRange(Number(e.target.value))} 
                style={styles.rangeInput}
              />
              <span style={styles.priceDisplay}>{priceRange.toLocaleString()} Kč</span>
            </div>
          </div>

          <button 
            className="btn btn-secondary" 
            style={styles.clearBtn}
            onClick={() => {
              setSelectedEditions([]);
              setSelectedConditions([]);
              setSelectedLangs([]);
              setFoilFilter('all');
              setPriceRange(25000);
              setSearchQuery('');
              setFilters({});
            }}
          >
            Smazat filtry
          </button>
        </aside>

        {/* Right Product Listing */}
        <main style={styles.mainContent}>
          <div style={styles.resultsBar}>
            <h2 style={styles.resultsHeading}>Kusové karty ({filteredSingles.length})</h2>
            {searchQuery && (
              <span style={styles.queryTag}>
                Vyhledávání: "{searchQuery}" <button style={styles.tagCloseBtn} onClick={() => setSearchQuery('')}>&times;</button>
              </span>
            )}
          </div>

          {filteredSingles.length === 0 ? (
            <div style={styles.noResults} className="glass-panel">
              <span style={{ fontSize: '48px' }}>🔍</span>
              <h3>Nebyly nalezeny žádné karty</h3>
              <p>Zkuste změnit nastavení filtrů nebo vyhledávaný výraz.</p>
            </div>
          ) : (
            <div style={styles.cardList}>
              {filteredSingles.map(card => {
                const activeVariants = card.variants.filter(v => {
                  if (selectedConditions.length > 0 && !selectedConditions.includes(v.condition)) return false;
                  if (selectedLangs.length > 0 && !selectedLangs.includes(v.lang)) return false;
                  if (foilFilter === 'foil' && !v.foil) return false;
                  if (foilFilter === 'non-foil' && v.foil) return false;
                  if (v.price > priceRange) return false;
                  return true;
                });

                return (
                  <div key={card.id} style={styles.cardRow} className="glass-card">
                    <div style={styles.cardRowImgContainer} onClick={() => handleCardClick(card.id)}>
                      <img src={card.image} alt={card.name} style={styles.cardRowImg} />
                    </div>
                    <div style={styles.cardRowDetails}>
                      <span style={styles.editionBadge}>{card.edition}</span>
                      <h3 style={styles.cardRowName} onClick={() => handleCardClick(card.id)}>{card.name}</h3>
                      <p style={styles.rarityLabel}>{card.rarity}</p>
                      
                      <div style={styles.variantsContainer}>
                        <table style={styles.table}>
                          <thead>
                            <tr>
                              <th style={styles.th}>Stav</th>
                              <th style={styles.th}>Jazyk</th>
                              <th style={styles.th}>Úprava</th>
                              <th style={styles.th}>Skladem</th>
                              <th style={styles.th}>Cena</th>
                              <th style={{ ...styles.th, textAlign: 'right' }}>Akce</th>
                            </tr>
                          </thead>
                          <tbody>
                            {activeVariants.map(variant => {
                              const isAdded = addedItems[variant.id];
                              
                              return (
                                <tr key={variant.id} style={styles.tr}>
                                  <td style={styles.td}>
                                    <span 
                                      style={styles.conditionBadge} 
                                      onClick={() => setActivePage('grading-guide')}
                                      title="Zobrazit průvodce stavy"
                                    >
                                      {variant.condition}
                                    </span>
                                  </td>
                                  <td style={styles.td}>{variant.lang}</td>
                                  <td style={styles.td}>{variant.foil ? 'Foil' : 'Non-Foil'}</td>
                                  <td style={styles.td}>
                                    <span style={{ color: variant.stock > 0 ? 'var(--color-green)' : 'var(--text-muted)' }}>
                                      {variant.stock} ks
                                    </span>
                                  </td>
                                  <td style={styles.tdPrice}>{variant.price.toLocaleString('cs-CZ')} Kč</td>
                                  <td style={{ ...styles.td, textAlign: 'right' }}>
                                    <button 
                                      className="btn"
                                      style={{
                                        ...styles.buyBtn,
                                        backgroundColor: isAdded ? 'var(--color-green)' : 'var(--color-gold)',
                                        color: '#000',
                                        transform: isAdded ? 'scale(0.94)' : 'scale(1)',
                                        transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)'
                                      }}
                                      disabled={variant.stock === 0}
                                      onClick={() => handleBuyClick(variant, card)}
                                    >
                                      {isAdded ? '✓ Přidáno' : 'Do košíku'}
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

const styles = {
  container: {
    paddingTop: '20px',
    paddingBottom: '20px',
  },
  importerToggleBar: {
    display: 'flex',
    justifyContent: 'flex-start',
    marginBottom: '20px',
  },
  importerToggleBtn: {
    fontSize: '13px',
  },
  importerBox: {
    padding: '24px',
    textAlign: 'left',
    marginBottom: '24px',
  },
  importerTitle: {
    fontSize: '16px',
    fontWeight: '800',
    margin: '0 0 6px',
  },
  importerDesc: {
    fontSize: '13px',
    color: 'var(--text-muted)',
    margin: '0 0 12px',
    lineHeight: '1.4',
  },
  importerTextarea: {
    width: '100%',
    backgroundColor: 'var(--bg-page)',
    border: '1px solid var(--border-light)',
    padding: '12px',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-main)',
    fontSize: '13px',
    fontFamily: 'monospace',
    outline: 'none',
    resize: 'vertical',
  },
  layout: {
    display: 'flex',
    gap: '24px',
    flexWrap: 'wrap',
  },
  sidebar: {
    flex: '1 1 280px',
    padding: '24px',
    alignSelf: 'flex-start',
    textAlign: 'left',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  sidebarHeading: {
    fontSize: '18px',
    fontWeight: '800',
    margin: 0,
    borderBottom: '1px solid var(--border)',
    paddingBottom: '12px',
  },
  filterSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  filterTitle: {
    fontSize: '13px',
    fontWeight: '700',
    color: 'var(--text-main)',
    margin: 0,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  searchInput: {
    backgroundColor: 'var(--bg-page)',
    border: '1px solid var(--border-light)',
    padding: '8px 12px',
    borderRadius: 'var(--radius-sm)',
    fontSize: '13px',
    color: 'var(--text-main)',
    outline: 'none',
  },
  checkboxList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    maxHeight: '160px',
    overflowY: 'auto',
    paddingRight: '6px',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    color: 'var(--text-muted)',
    cursor: 'pointer',
  },
  checkbox: {
    cursor: 'pointer',
  },
  conditionText: {
    fontWeight: '700',
    color: 'var(--text-main)',
  },
  guideLink: {
    fontSize: '11px',
    color: 'var(--color-gold)',
    cursor: 'pointer',
    marginTop: '4px',
    fontWeight: '600',
    textDecoration: 'underline',
  },
  selectInput: {
    backgroundColor: 'var(--bg-page)',
    border: '1px solid var(--border-light)',
    padding: '8px 12px',
    borderRadius: 'var(--radius-sm)',
    fontSize: '13px',
    color: 'var(--text-main)',
    outline: 'none',
  },
  priceRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  rangeInput: {
    width: '100%',
    cursor: 'pointer',
  },
  priceDisplay: {
    fontSize: '13px',
    fontWeight: '700',
    color: 'var(--color-gold)',
    textAlign: 'right',
  },
  clearBtn: {
    width: '100%',
    marginTop: '10px',
  },
  mainContent: {
    flex: '3 1 600px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  resultsBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '12px',
  },
  resultsHeading: {
    fontSize: '20px',
    fontWeight: '700',
    margin: 0,
  },
  queryTag: {
    fontSize: '12px',
    backgroundColor: 'var(--bg-surface-alt)',
    padding: '4px 10px',
    borderRadius: 'var(--radius-sm)',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  tagCloseBtn: {
    fontWeight: '700',
    fontSize: '14px',
    color: 'var(--color-gold)',
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
  cardList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  cardRow: {
    display: 'flex',
    gap: '24px',
    padding: '20px',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    textAlign: 'left',
  },
  cardRowImgContainer: {
    width: '130px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(9, 9, 11, 0.4)',
    padding: '8px',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
  },
  cardRowImg: {
    maxWidth: '100%',
    maxHeight: '180px',
    objectFit: 'contain',
  },
  cardRowDetails: {
    flex: '1 1 300px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  editionBadge: {
    fontSize: '10px',
    color: 'var(--color-gold)',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  cardRowName: {
    fontSize: '16px',
    fontWeight: '800',
    margin: 0,
    cursor: 'pointer',
    '&:hover': {
      color: 'var(--color-gold)',
    }
  },
  rarityLabel: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    margin: 0,
  },
  variantsContainer: {
    marginTop: '12px',
    overflowX: 'auto',
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
    padding: '10px 0',
  },
  conditionBadge: {
    fontSize: '10px',
    fontWeight: '800',
    backgroundColor: 'rgba(255,255,255,0.06)',
    padding: '2px 6px',
    borderRadius: '2px',
    cursor: 'pointer',
    color: 'var(--text-main)',
  },
  tdPrice: {
    padding: '10px 0',
    fontWeight: '700',
    color: 'var(--color-gold)',
  },
  buyBtn: {
    padding: '6px 12px',
    fontSize: '12px',
    fontWeight: '700',
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    cursor: 'pointer',
  }
};
