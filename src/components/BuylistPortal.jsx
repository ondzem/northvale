import { useState } from 'react';
import { bulkRates } from '../mockData';

let buylistIdCounter = 0;
function generateUniqueId() {
  buylistIdCounter += 1;
  return `item-${Date.now()}-${buylistIdCounter}`;
}

function generateSubmissionId() {
  return `BL-${Math.floor(100000 + Math.random() * 900000)}`;
}

export default function BuylistPortal({ products, submitBuylist, setActivePage }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [buylistCart, setBuylistCart] = useState([]);
  const [bulkCounts, setBulkCounts] = useState(
    bulkRates.reduce((acc, rate) => ({ ...acc, [rate.id]: 0 }), {})
  );
  const payoutMethod = 'cash';

  // Get only single cards for searching
  const singleCards = products.filter(p => p.type === 'single');

  // Search filter
  const searchResults = searchQuery
    ? singleCards.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  const handleAddCard = (product) => {
    // Default to first variant's details
    const defaultVariant = product.variants ? product.variants[0] : { price: 100, condition: 'NM', lang: 'EN', foil: false };
    
    // Payout rate is generally 60% of our selling price for buylist
    const baseValue = Math.round(defaultVariant.price * 0.6);

    const newItem = {
      id: generateUniqueId(),
      product,
      condition: 'NM',
      lang: 'EN',
      foil: defaultVariant.foil,
      basePrice: baseValue,
      quantity: 1
    };

    setBuylistCart([...buylistCart, newItem]);
    setSearchQuery('');
  };

  const handleRemoveItem = (id) => {
    setBuylistCart(buylistCart.filter(item => item.id !== id));
  };

  const handleUpdateItem = (id, key, value) => {
    setBuylistCart(buylistCart.map(item => {
      if (item.id !== id) return item;
      
      let updated = { ...item, [key]: value };
      
      // Adjust price based on condition
      // NM = 100%, EX = 80%, GD = 60%, LP = 50%, PL = 30%, PO = 10%
      let multiplier = 1.0;
      if (key === 'condition') {
        if (value === 'EX') multiplier = 0.8;
        else if (value === 'GD') multiplier = 0.6;
        else if (value === 'LP') multiplier = 0.5;
        else if (value === 'PL') multiplier = 0.3;
        else if (value === 'PO') multiplier = 0.1;
        
        // Base price is 60% of our NM sales price
        const nmPrice = item.product.variants ? item.product.variants[0].price : item.product.price;
        updated.basePrice = Math.round(nmPrice * 0.6 * multiplier);
      }
      
      return updated;
    }));
  };

  const handleBulkCountChange = (rateId, val) => {
    const num = Math.max(0, parseInt(val) || 0);
    setBulkCounts({ ...bulkCounts, [rateId]: num });
  };

  // Calculate totals
  let singlesCashTotal = buylistCart.reduce((sum, item) => sum + (item.basePrice * item.quantity), 0);
  
  let bulkCashTotal = bulkRates.reduce((sum, rate) => {
    const count = bulkCounts[rate.id] || 0;
    return sum + (rate.cashRate * count);
  }, 0);

  const cashTotal = Math.round(singlesCashTotal + bulkCashTotal);
  const finalTotal = cashTotal;

  const handleSubmit = () => {
    if (buylistCart.length === 0 && Object.values(bulkCounts).every(v => v === 0)) {
      alert('Váš výkupní košík je prázdný.');
      return;
    }

    const submission = {
      id: generateSubmissionId(),
      items: buylistCart.map(item => ({
        name: item.product.name,
        condition: item.condition,
        lang: item.lang,
        price: item.basePrice,
        quantity: item.quantity
      })),
      bulk: bulkRates.map(rate => ({
        type: `${rate.game} - ${rate.type}`,
        count: bulkCounts[rate.id],
        price: rate.cashRate
      })).filter(b => b.count > 0),
      payoutMethod,
      totalPayout: finalTotal,
      status: 'Čeká na odeslání',
      date: new Date().toLocaleDateString()
    };

    submitBuylist(submission);
    alert(`Výkup ${submission.id} byl úspěšně zaevidován! Nyní jej můžete schválit v Admin panelu.`);
    
    // Clear cart and head to profile
    setBuylistCart([]);
    setBulkCounts(bulkRates.reduce((acc, rate) => ({ ...acc, [rate.id]: 0 }), {}));
    setActivePage('profile');
  };

  return (
    <div style={styles.container} className="container fade-in">
      <h1 className="sr-only">Výkupní portál TCG karet (Buylist) - NORTHVALE</h1>

      <div style={styles.layout}>
        {/* Left Column: Core Buylist Functionality */}
        <div style={styles.leftCol}>
          {/* Card search */}
          <div style={styles.section} className="glass-panel">
            <h3 style={styles.sectionTitle}>1. Přidat konkrétní kusové karty</h3>
            <p style={styles.desc}>Zadejte název karty, kterou nám chcete nabídnout k výkupu.</p>
            
            <div style={styles.searchWrapper}>
              <input 
                type="text" 
                placeholder="Vyhledat kartu k výkupu (např. Charizard)..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={styles.searchInput}
              />
              {searchResults.length > 0 && (
                <div style={styles.searchResultsDropdown} className="glass-panel">
                  {searchResults.map(card => (
                    <div key={card.id} style={styles.searchResultItem} onClick={() => handleAddCard(card)}>
                      <img src={card.image} alt="" style={styles.resultImg} />
                      <div style={styles.resultInfo}>
                        <span style={styles.resultName}>{card.name}</span>
                        <span style={styles.resultEd}>{card.edition}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Singles List */}
            {buylistCart.length > 0 && (
              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Karta</th>
                      <th style={styles.th}>Stav</th>
                      <th style={styles.th}>Jazyk</th>
                      <th style={styles.th}>Množství</th>
                      <th style={styles.th}>Nase cena</th>
                      <th style={{ ...styles.th, textAlign: 'right' }}>Odstranit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {buylistCart.map(item => (
                      <tr key={item.id} style={styles.tr}>
                        <td style={styles.td}>
                          <div style={styles.itemCell}>
                            <img src={item.product.image} alt="" style={styles.itemImg} />
                            <div>
                              <span style={styles.itemName}>{item.product.name}</span>
                              <span style={styles.itemEd}>{item.product.edition}</span>
                            </div>
                          </div>
                        </td>
                        <td style={styles.td}>
                          <select 
                            value={item.condition}
                            onChange={(e) => handleUpdateItem(item.id, 'condition', e.target.value)}
                            style={styles.select}
                          >
                            <option value="NM">NM (Near Mint)</option>
                            <option value="EX">EX (Excellent)</option>
                            <option value="GD">GD (Good)</option>
                            <option value="LP">LP (Light Played)</option>
                            <option value="PL">PL (Played)</option>
                            <option value="PO">PO (Poor)</option>
                          </select>
                        </td>
                        <td style={styles.td}>
                          <select 
                            value={item.lang}
                            onChange={(e) => handleUpdateItem(item.id, 'lang', e.target.value)}
                            style={styles.select}
                          >
                            <option value="EN">EN</option>
                            <option value="JP">JP</option>
                            <option value="CN">CN</option>
                          </select>
                        </td>
                        <td style={styles.td}>
                          <input 
                            type="number" 
                            min="1" 
                            value={item.quantity}
                            onChange={(e) => handleUpdateItem(item.id, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                            style={styles.numInput}
                          />
                        </td>
                        <td style={styles.tdPrice}>{item.basePrice.toLocaleString('cs-CZ')} Kč / ks</td>
                        <td style={{ ...styles.td, textAlign: 'right' }}>
                          <button style={styles.removeBtn} onClick={() => handleRemoveItem(item.id)}>&times;</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Bulk Rates Calculator */}
          <div style={styles.section} className="glass-panel">
            <h3 style={styles.sectionTitle}>2. Výkup bulků (Větší množství obyčejných karet)</h3>
            <p style={styles.desc}>Máte stovky či tisíce common/rare karet? Nabízíme výkup na kusy.</p>
            
            <div style={styles.bulkGrid}>
              {bulkRates.map(rate => (
                <div key={rate.id} style={styles.bulkRow} className="glass-card">
                  <div style={styles.bulkInfo}>
                    <span style={styles.bulkGame}>{rate.game}</span>
                    <span style={styles.bulkType}>{rate.type}</span>
                    <span style={styles.bulkRates}>
                      Cena: {rate.cashRate} Kč za kus
                    </span>
                  </div>
                  <div style={styles.bulkInputWrapper}>
                    <input 
                      type="number" 
                      min="0"
                      value={bulkCounts[rate.id]} 
                      onChange={(e) => handleBulkCountChange(rate.id, e.target.value)}
                      style={styles.bulkNumInput}
                    />
                    <span style={styles.bulkUnit}>ks</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Checkout/Summary Panel */}
        <div style={styles.rightCol} className="glass-panel">
          <h3 style={styles.summaryTitle}>Přehled výkupu</h3>

          {/* Payout method info */}
          <div style={styles.payoutChoice}>
            <h4 style={styles.choiceHeading}>Způsob výplaty:</h4>
            <div 
              style={{
                ...styles.choiceCard,
                borderColor: 'rgba(63, 63, 70, 0.4)',
                backgroundColor: 'transparent',
                cursor: 'default'
              }}
              className="glass-card"
            >
              <span style={styles.choiceTitle}>Bankovní převod</span>
              <span style={styles.choiceDesc}>Peníze zašleme přímo na Váš bankovní účet po fyzické kontrole karet.</span>
            </div>
          </div>

          {/* Pricing Summary */}
          <div style={styles.summaryPrices}>
            <div style={styles.summaryRow}>
              <span>Kusové karty:</span>
              <span>{singlesCashTotal.toLocaleString()} Kč</span>
            </div>
            <div style={styles.summaryRow}>
              <span>Bulk výkup:</span>
              <span>{bulkCashTotal.toLocaleString()} Kč</span>
            </div>
            
            <div style={styles.totalRow}>
              <span>Celková odhadovaná cena:</span>
              <span style={{ color: 'var(--color-gold)' }}>{finalTotal.toLocaleString()} Kč</span>
            </div>
          </div>

          {/* Warnings */}
          <div style={styles.infoBox} className="glass-card">
            <h4 style={styles.infoTitle}>📌 Důležité informace:</h4>
            <ul style={styles.infoList}>
              <li>Karty k výkupu nám zašlete poštou nebo odevzdejte osobně v kavárně v Pardubicích.</li>
              <li>Fyzickou kontrolu stavu a pravosti karet provedeme do 48 hodin od přijetí.</li>
              <li>Po schválení Vám ihned zašleme peníze na bankovní účet.</li>
            </ul>
          </div>

          <button 
            className="btn btn-primary" 
            style={styles.submitBtn}
            onClick={handleSubmit}
          >
            Odeslat výkup ke kontrole
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    paddingTop: '20px',
    paddingBottom: '20px',
  },
  layout: {
    display: 'flex',
    gap: '32px',
    flexWrap: 'wrap',
  },
  leftCol: {
    flex: '1.8 1 500px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  section: {
    padding: '24px',
    textAlign: 'left',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '800',
    margin: '0 0 6px',
    fontFamily: 'var(--font-heading)',
  },
  desc: {
    fontSize: '13px',
    color: 'var(--text-muted)',
    margin: '0 0 16px',
  },
  searchWrapper: {
    position: 'relative',
    marginBottom: '16px',
  },
  searchInput: {
    width: '100%',
    backgroundColor: 'var(--bg-page)',
    border: '1px solid var(--border-light)',
    padding: '10px 16px',
    borderRadius: 'var(--radius-md)',
    fontSize: '14px',
    color: 'var(--text-main)',
    outline: 'none',
  },
  searchResultsDropdown: {
    position: 'absolute',
    top: '46px',
    left: 0,
    width: '100%',
    maxHeight: '260px',
    overflowY: 'auto',
    zIndex: 100,
    boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
  },
  searchResultItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 16px',
    cursor: 'pointer',
    borderBottom: '1px solid rgba(255,255,255,0.03)',
    '&:hover': {
      backgroundColor: 'rgba(255,255,255,0.03)',
    }
  },
  resultImg: {
    height: '40px',
    width: 'auto',
    objectFit: 'contain',
  },
  resultInfo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  resultName: {
    fontSize: '13px',
    fontWeight: '700',
  },
  resultEd: {
    fontSize: '11px',
    color: 'var(--text-muted)',
  },
  tableWrapper: {
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
  },
  td: {
    padding: '12px 0',
  },
  itemCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  itemImg: {
    height: '40px',
    width: 'auto',
    objectFit: 'contain',
  },
  itemName: {
    fontSize: '13px',
    fontWeight: '700',
    display: 'block',
  },
  itemEd: {
    fontSize: '11px',
    color: 'var(--text-muted)',
  },
  select: {
    backgroundColor: 'var(--bg-page)',
    border: '1px solid var(--border-light)',
    padding: '4px 8px',
    borderRadius: 'var(--radius-sm)',
    fontSize: '12px',
    color: 'var(--text-main)',
    outline: 'none',
  },
  numInput: {
    width: '50px',
    backgroundColor: 'var(--bg-page)',
    border: '1px solid var(--border-light)',
    padding: '4px 6px',
    borderRadius: 'var(--radius-sm)',
    fontSize: '12px',
    color: 'var(--text-main)',
    outline: 'none',
    textAlign: 'center',
  },
  tdPrice: {
    fontWeight: '700',
    color: 'var(--color-gold)',
  },
  removeBtn: {
    fontSize: '18px',
    fontWeight: '700',
    color: 'var(--color-red)',
    padding: '0 8px',
  },
  bulkGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  bulkRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 20px',
    flexWrap: 'wrap',
    gap: '12px',
  },
  bulkInfo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '4px',
  },
  bulkGame: {
    fontSize: '10px',
    color: 'var(--color-gold)',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  bulkType: {
    fontSize: '14px',
    fontWeight: '700',
  },
  bulkRates: {
    fontSize: '11px',
    color: 'var(--text-muted)',
  },
  bulkInputWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  bulkNumInput: {
    width: '80px',
    backgroundColor: 'var(--bg-page)',
    border: '1px solid var(--border-light)',
    padding: '6px 10px',
    borderRadius: 'var(--radius-sm)',
    fontSize: '13px',
    color: 'var(--text-main)',
    outline: 'none',
    textAlign: 'center',
  },
  bulkUnit: {
    fontSize: '13px',
    color: 'var(--text-muted)',
    fontWeight: '600',
  },
  rightCol: {
    flex: '1 1 320px',
    padding: '30px',
    textAlign: 'left',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    alignSelf: 'flex-start',
  },
  summaryTitle: {
    fontSize: '18px',
    fontWeight: '800',
    margin: 0,
    fontFamily: 'var(--font-heading)',
  },
  payoutChoice: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  choiceHeading: {
    fontSize: '13px',
    fontWeight: '700',
    margin: 0,
  },
  choiceGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  choiceCard: {
    padding: '12px 16px',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  choiceTitle: {
    fontSize: '13px',
    fontWeight: '700',
  },
  choiceBonus: {
    fontSize: '10px',
    fontWeight: '800',
    color: 'var(--color-green)',
  },
  choiceDesc: {
    fontSize: '11px',
    color: 'var(--text-muted)',
  },
  summaryPrices: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    padding: '16px 0',
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '13px',
    color: 'var(--text-muted)',
  },
  totalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '15px',
    fontWeight: '800',
    color: 'var(--text-main)',
    marginTop: '6px',
  },
  infoBox: {
    padding: '16px',
    backgroundColor: 'rgba(255,255,255,0.01)',
  },
  infoTitle: {
    fontSize: '12px',
    fontWeight: '700',
    margin: '0 0 8px',
  },
  infoList: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    paddingLeft: '16px',
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    lineHeight: '1.4',
  },
  submitBtn: {
    width: '100%',
    padding: '12px',
  }
};
