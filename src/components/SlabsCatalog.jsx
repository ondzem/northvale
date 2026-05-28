import React, { useState, useEffect } from 'react';

export default function SlabsCatalog({ products, addToCart, setSelectedProductId, setActivePage, filters, setFilters }) {
  const [selectedCompany, setSelectedCompany] = useState(filters.company || 'all');
  const [selectedGrade, setSelectedGrade] = useState('all');

  useEffect(() => {
    if (filters.company) setSelectedCompany(filters.company);
  }, [filters]);

  const slabs = products.filter(p => p.type === 'slab');

  const companies = ['PSA', 'Beckett', 'CGC', 'TAG'];
  const grades = [10, 9.5, 9, 8.5, 8, 7, 6, 5, 4, 3, 2, 1];

  // Filter logic
  const filteredSlabs = slabs.filter(product => {
    if (selectedCompany !== 'all' && product.company !== selectedCompany) return false;
    if (selectedGrade !== 'all' && product.grade !== Number(selectedGrade)) return false;
    return true;
  });

  const handleCardClick = (productId) => {
    setSelectedProductId(productId);
    setActivePage('singles-detail'); // Unified Product Page handles slabs detail as well
  };

  return (
    <div style={styles.container} className="container fade-in">
      <h1 className="sr-only">Katalog ohodnocených TCG karet (Slabs) - NORTHVALE</h1>

      {/* Filters Bar */}
      <div style={styles.filterBar} className="glass-panel">
        <div style={styles.filterGroup}>
          <label style={styles.label}>Certifikační firma:</label>
          <select 
            value={selectedCompany} 
            onChange={(e) => setSelectedCompany(e.target.value)} 
            style={styles.select}
          >
            <option value="all">Všechny firmy</option>
            {companies.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div style={styles.filterGroup}>
          <label style={styles.label}>Výsledná známka:</label>
          <select 
            value={selectedGrade} 
            onChange={(e) => setSelectedGrade(e.target.value)} 
            style={styles.select}
          >
            <option value="all">Všechny známky</option>
            {grades.map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>

        <button 
          className="btn btn-secondary"
          onClick={() => {
            setSelectedCompany('all');
            setSelectedGrade('all');
            setFilters({});
          }}
          style={styles.resetBtn}
        >
          Resetovat filtry
        </button>
      </div>

      {/* Grid of Graded Slabs */}
      {filteredSlabs.length === 0 ? (
        <div style={styles.noResults} className="glass-panel">
          <span style={{ fontSize: '48px' }}>💎</span>
          <h3>Nebyly nalezeny žádné ohodnocené karty</h3>
          <p>Zkuste změnit nastavení filtrů.</p>
        </div>
      ) : (
        <div className="grid grid-cols-4">
          {filteredSlabs.map(product => (
            <div 
              key={product.id} 
              className="product-card rarity-gold"
              style={styles.card}
              onClick={() => handleCardClick(product.id)}
            >
              <div style={styles.imageBox}>
                <div style={styles.slabLabelPreview}>
                  <div style={styles.slabCompany}>{product.company}</div>
                  <div style={styles.slabGrade}>{product.grade}</div>
                </div>
                <img src={product.image} alt={product.name} style={styles.productImg} />
              </div>
              
              <div style={styles.details}>
                <div style={styles.metaRow}>
                  <span style={styles.editionLabel}>{product.edition}</span>
                  <span style={styles.certLabel}>Cert: #{product.certNumber}</span>
                </div>
                
                <h3 style={styles.productName}>{product.name}</h3>
                
                <div style={styles.footerRow}>
                  <span style={styles.stockLabel} className="text-green">
                    ● Ověřeno (Skladem)
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
  resetBtn: {
    padding: '6px 12px',
    fontSize: '12px',
    marginLeft: 'auto',
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
    height: '260px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(9, 9, 11, 0.4)',
    padding: '16px',
    position: 'relative',
    gap: '8px',
  },
  slabLabelPreview: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    backgroundColor: '#fff',
    color: '#000',
    padding: '4px 10px',
    borderRadius: 'var(--radius-sm)',
    fontSize: '11px',
    fontWeight: '800',
    fontFamily: 'var(--font-heading)',
    borderLeft: '4px solid var(--color-gold)',
  },
  slabCompany: {
    letterSpacing: '1px',
  },
  slabGrade: {
    backgroundColor: '#000',
    color: '#fff',
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '10px',
  },
  productImg: {
    maxHeight: '190px',
    maxWidth: '100%',
    objectFit: 'contain',
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
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  editionLabel: {
    fontSize: '10px',
    color: 'var(--color-gold)',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  certLabel: {
    fontSize: '10px',
    color: 'var(--text-muted)',
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
