import { useState } from 'react';

export default function CheckoutFlow({ cart, user, submitOrder, setActivePage }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [zip, setZip] = useState('');
  const [shipping, setShipping] = useState('zasilkovna');
  const [payment, setPayment] = useState('card');
  const [creditApplied, setCreditApplied] = useState(0);
  
  // ISIC states
  const [isicNumber, setIsicNumber] = useState('');
  const [isicApplied, setIsicApplied] = useState(false);

  const cartSubtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  // Shipping cost
  let shippingCost = 79;
  if (shipping === 'posta-doporucene') shippingCost = 85;
  else if (shipping === 'posta-cenne') shippingCost = 110;
  else if (shipping === 'pardubice') shippingCost = 0;

  // Free shipping above 2000 CZK
  if (cartSubtotal > 2000 && shipping !== 'posta-cenne') {
    shippingCost = 0;
  }

  // ISIC 5% discount
  const isicDiscount = isicApplied ? Math.round(cartSubtotal * 0.05) : 0;

  // Handle store credit input limit
  const maxCreditToApply = Math.min(user.storeCredit, cartSubtotal + shippingCost - isicDiscount);

  const handleApplyCreditChange = (val) => {
    const amount = Math.min(maxCreditToApply, Math.max(0, parseInt(val) || 0));
    setCreditApplied(amount);
  };

  const finalTotal = Math.max(0, cartSubtotal + shippingCost - creditApplied - isicDiscount);

  const handleApplyIsic = () => {
    if (isicNumber.trim().toUpperCase().startsWith('S')) {
      setIsicApplied(true);
      alert('ISIC karta byla úspěšně ověřena. Byla uplatněna sleva 5% na Vaši objednávku!');
    } else {
      alert('Neplatné číslo ISIC karty. Číslo musí začínat písmenem S (např. S1234567890).');
    }
  };

  const handlePlaceOrder = (e) => {
    e.preventDefault();
    if (cart.length === 0) {
      alert('Váš košík je prázdný.');
      return;
    }

    const order = {
      id: '100' + Math.floor(1000 + Math.random() * 9000),
      items: cart.map(item => ({
        name: item.name || item.productName,
        price: item.price,
        quantity: item.quantity
      })),
      subtotal: cartSubtotal,
      shippingCost,
      creditApplied,
      isicApplied,
      isicDiscount,
      finalTotal,
      shippingMethod: shipping === 'zasilkovna' ? 'Zásilkovna' : shipping === 'pardubice' ? 'Osobní odběr Pardubice' : 'Česká pošta',
      date: new Date().toLocaleDateString(),
      invoiceUrl: '#'
    };

    // Make sure we subtract the credit correctly
    submitOrder(order, creditApplied);
    alert(`Děkujeme za Váš nákup! Objednávka #${order.id} byla úspěšně vytvořena a uložena do Vašeho profilu.`);
    setActivePage('profile');
  };

  return (
    <div style={styles.container} className="container fade-in">
      <h1 className="sr-only">Pokladna a dokončení objednávky - NORTHVALE</h1>

      {cart.length === 0 ? (
        <div style={styles.emptyCart} className="glass-panel">
          <span style={{ fontSize: '48px' }}>🛒</span>
          <h3>Váš košík je prázdný</h3>
          <button className="btn btn-primary" onClick={() => setActivePage('singles-catalog')}>
            Přejít do katalogu
          </button>
        </div>
      ) : (
        <div style={styles.layout}>
          {/* Left Column: Form */}
          <form style={styles.leftCol} onSubmit={handlePlaceOrder} className="glass-panel">
            <h2 style={styles.sectionHeading}>Doručovací údaje</h2>
            
            <div style={styles.formGrid}>
              <div style={styles.field}>
                <label style={styles.label}>Jméno a příjmení:</label>
                <input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="Jan Novák" style={styles.input} />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>E-mailová adresa:</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="novak@example.cz" style={styles.input} />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Telefonní číslo:</label>
                <input type="tel" required value={phone} onChange={e => setPhone(e.target.value)} placeholder="+420 123 456 789" style={styles.input} />
              </div>
            </div>

            <h2 style={{ ...styles.sectionHeading, marginTop: '24px' }}>Adresa doručení</h2>
            <div style={styles.formGrid}>
              <div style={{ ...styles.field, gridColumn: 'span 2' }}>
                <label style={styles.label}>Ulice a číslo popisné:</label>
                <input type="text" required value={street} onChange={e => setStreet(e.target.value)} placeholder="Zámecká 23" style={styles.input} />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Město:</label>
                <input type="text" required value={city} onChange={e => setCity(e.target.value)} placeholder="Pardubice" style={styles.input} />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>PSČ:</label>
                <input type="text" required value={zip} onChange={e => setZip(e.target.value)} placeholder="530 02" style={styles.input} />
              </div>
            </div>

            <h2 style={{ ...styles.sectionHeading, marginTop: '24px' }}>Způsob přepravy</h2>
            <div style={styles.optionsList}>
              <label style={styles.optionRow} className="glass-card">
                <input type="radio" name="shipping" checked={shipping === 'zasilkovna'} onChange={() => setShipping('zasilkovna')} style={styles.radio} />
                <div style={styles.optionInfo}>
                  <span style={styles.optionName}>Zásilkovna - Výdejní místo / Z-BOX</span>
                  <span style={styles.optionDesc}>Doručení do 24-48h na Vámi vybrané místo.</span>
                </div>
                <span style={styles.optionPrice}>{cartSubtotal > 2000 ? 'Zdarma' : '79 Kč'}</span>
              </label>

              <label style={styles.optionRow} className="glass-card">
                <input type="radio" name="shipping" checked={shipping === 'pardubice'} onChange={() => setShipping('pardubice')} style={styles.radio} />
                <div style={styles.optionInfo}>
                  <span style={styles.optionName}>Osobní odběr Pardubice (Coffee &amp; Cards)</span>
                  <span style={styles.optionDesc}>Vyzvednutí zdarma v kavárně v centru města. Slevový kód na kávu.</span>
                </div>
                <span style={styles.optionPrice}>Zdarma</span>
              </label>

              <label style={styles.optionRow} className="glass-card">
                <input type="radio" name="shipping" checked={shipping === 'posta-doporucene'} onChange={() => setShipping('posta-doporucene')} style={styles.radio} />
                <div style={styles.optionInfo}>
                  <span style={styles.optionName}>Česká pošta - Doporučené psaní</span>
                  <span style={styles.optionDesc}>Pojištěno do 880 Kč. Pouze pro menší zásilky.</span>
                </div>
                <span style={styles.optionPrice}>{cartSubtotal > 2000 ? 'Zdarma' : '85 Kč'}</span>
              </label>

              <label style={styles.optionRow} className="glass-card">
                <input type="radio" name="shipping" checked={shipping === 'posta-cenne'} onChange={() => setShipping('posta-cenne')} style={styles.radio} />
                <div style={styles.optionInfo}>
                  <span style={styles.optionName}>Česká pošta - Cenné psaní</span>
                  <span style={styles.optionDesc}>Speciální bezpečnostní obálka, plné pojištění hodnoty karet (doporučeno pro drahé kusovky).</span>
                </div>
                <span style={styles.optionPrice}>110 Kč</span>
              </label>
            </div>

            <h2 style={{ ...styles.sectionHeading, marginTop: '24px' }}>Způsob platby</h2>
            <div style={styles.optionsList}>
              <label style={styles.optionRow} className="glass-card">
                <input type="radio" name="payment" checked={payment === 'card'} onChange={() => setPayment('card')} style={styles.radio} />
                <div style={styles.optionInfo}>
                  <span style={styles.optionName}>Platební karta online</span>
                  <span style={styles.optionDesc}>Okamžitá platba přes bránu.</span>
                </div>
              </label>
              <label style={styles.optionRow} className="glass-card">
                <input type="radio" name="payment" checked={payment === 'transfer'} onChange={() => setPayment('transfer')} style={styles.radio} />
                <div style={styles.optionInfo}>
                  <span style={styles.optionName}>Bankovní převod</span>
                  <span style={styles.optionDesc}>Platební údaje obdržíte v e-mailu. Expedujeme po připsání platby.</span>
                </div>
              </label>
            </div>

            <button type="submit" className="btn btn-success" style={styles.submitBtn}>
              Objednat a zaplatit ({finalTotal.toLocaleString()} Kč)
            </button>
          </form>

          {/* Right Column */}
          <div style={styles.rightCol}>
            <div style={styles.summaryBox} className="glass-panel">
              <h3 style={styles.summaryTitle}>Vaše objednávka</h3>
              
              <div style={styles.itemsList}>
                {cart.map((item, idx) => (
                  <div key={idx} style={styles.itemRow}>
                    <div style={styles.itemMeta}>
                      <span style={styles.itemName}>{item.name || (item.product && item.product.name)}</span>
                      {item.condition && (
                        <span style={styles.itemVariant}>
                          Stav: {item.condition} | {item.lang} | {item.foil ? 'Foil' : 'Non-Foil'}
                        </span>
                      )}
                    </div>
                    <span style={styles.itemPrice}>{item.quantity}x {item.price.toLocaleString('cs-CZ')} Kč</span>
                  </div>
                ))}
              </div>

              {/* Student ISIC Discount code */}
              <div style={styles.creditApplySection} className="glass-card">
                <h4 style={styles.creditHeading}>ISIC Studentská sleva (5%)</h4>
                <p style={styles.creditDesc}>Zadejte číslo ISIC karty pro uplatnění slevy 5% na nákup.</p>
                <div style={styles.creditInputRow}>
                  <input 
                    type="text" 
                    placeholder="S1234567890..."
                    value={isicNumber} 
                    onChange={(e) => setIsicNumber(e.target.value)}
                    disabled={isicApplied}
                    style={styles.creditInput}
                  />
                  <button 
                    type="button"
                    className="btn btn-secondary"
                    disabled={isicApplied}
                    onClick={handleApplyIsic}
                    style={{ fontSize: '11px' }}
                  >
                    {isicApplied ? 'OK' : 'Ověřit'}
                  </button>
                </div>
              </div>

              {/* Store credit interaction */}
              {user.storeCredit > 0 && (
                <div style={styles.creditApplySection} className="glass-card">
                  <h4 style={styles.creditHeading}>Uplatnit Store Kredit</h4>
                  <p style={styles.creditDesc}>Máte k dispozici celkem <strong>{user.storeCredit} Kč</strong>.</p>
                  <div style={styles.creditInputRow}>
                    <input 
                      type="number" 
                      min="0" 
                      max={maxCreditToApply}
                      value={creditApplied} 
                      onChange={(e) => handleApplyCreditChange(e.target.value)}
                      style={styles.creditInput}
                    />
                    <span style={styles.creditUnit}>Kč</span>
                    <button 
                      type="button"
                      className="btn btn-secondary"
                      style={styles.maxCreditBtn}
                      onClick={() => setCreditApplied(maxCreditToApply)}
                    >
                      MAX
                    </button>
                  </div>
                </div>
              )}

              <div style={styles.totalsRow}>
                <div style={styles.totalDetail}>
                  <span>Mezisoučet:</span>
                  <span>{cartSubtotal.toLocaleString()} Kč</span>
                </div>
                <div style={styles.totalDetail}>
                  <span>Doprava:</span>
                  <span>{shippingCost === 0 ? 'Zdarma' : `${shippingCost} Kč`}</span>
                </div>
                {isicApplied && (
                  <div style={{ ...styles.totalDetail, color: 'var(--color-green)' }}>
                    <span>ISIC Sleva (5%):</span>
                    <span>-{isicDiscount.toLocaleString()} Kč</span>
                  </div>
                )}
                {creditApplied > 0 && (
                  <div style={{ ...styles.totalDetail, color: 'var(--color-green)' }}>
                    <span>Použitý Store Kredit:</span>
                    <span>-{creditApplied.toLocaleString()} Kč</span>
                  </div>
                )}
                <div style={styles.finalTotalRow}>
                  <span>Celkem:</span>
                  <span style={{ color: 'var(--color-gold)' }}>{finalTotal.toLocaleString()} Kč</span>
                </div>
              </div>
            </div>

            <div style={styles.badgeBox} className="glass-panel">
              <div style={styles.badgeHeader}>
                <span style={{ fontSize: '28px' }}>🛡️</span>
                <h4 style={styles.badgeTitle}>GARANCE SBĚRATELSKÉHO BALENÍ</h4>
              </div>
              <p style={styles.badgeText}>
                Garantujeme, že Vaše sealed produkty i kusové karty zabalíme bezpečně podle nejvyšších sběratelských standardů. Žádná lepící páska na toploaderu, žádné promáčklé rohy ETB boxů.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    paddingTop: '20px',
    paddingBottom: '20px',
  },
  emptyCart: {
    padding: '60px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
  },
  layout: {
    display: 'flex',
    gap: '32px',
    flexWrap: 'wrap',
  },
  leftCol: {
    flex: '1.8 1 500px',
    padding: '30px',
    textAlign: 'left',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  sectionHeading: {
    fontSize: '18px',
    fontWeight: '800',
    margin: 0,
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    paddingBottom: '10px',
    fontFamily: 'var(--font-heading)',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
    '@media (max-width: 600px)': {
      gridTemplateColumns: '1fr',
    }
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '12px',
    fontWeight: '700',
  },
  input: {
    backgroundColor: 'var(--bg-page)',
    border: '1px solid var(--border-light)',
    padding: '10px 14px',
    borderRadius: 'var(--radius-sm)',
    fontSize: '13px',
    color: 'var(--text-main)',
    outline: 'none',
  },
  optionsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  optionRow: {
    padding: '14px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    cursor: 'pointer',
  },
  radio: {
    cursor: 'pointer',
  },
  optionInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    flexGrow: 1,
    textAlign: 'left',
  },
  optionName: {
    fontSize: '13px',
    fontWeight: '700',
  },
  optionDesc: {
    fontSize: '11px',
    color: 'var(--text-muted)',
  },
  optionPrice: {
    fontSize: '13px',
    fontWeight: '700',
    color: 'var(--color-gold)',
  },
  submitBtn: {
    width: '100%',
    padding: '14px',
    marginTop: '20px',
  },
  rightCol: {
    flex: '1 1 320px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  summaryBox: {
    padding: '24px',
    textAlign: 'left',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  summaryTitle: {
    fontSize: '16px',
    fontWeight: '800',
    margin: 0,
    fontFamily: 'var(--font-heading)',
  },
  itemsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    paddingBottom: '16px',
  },
  itemRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '16px',
  },
  itemMeta: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '2px',
  },
  itemName: {
    fontSize: '13px',
    fontWeight: '700',
    lineHeight: '1.4',
  },
  itemVariant: {
    fontSize: '11px',
    color: 'var(--text-muted)',
  },
  itemPrice: {
    fontSize: '13px',
    fontWeight: '700',
    whiteSpace: 'nowrap',
  },
  creditApplySection: {
    padding: '16px',
    backgroundColor: 'rgba(255,255,255,0.01)',
  },
  creditHeading: {
    fontSize: '12px',
    fontWeight: '700',
    margin: '0 0 4px',
  },
  creditDesc: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    margin: '0 0 10px',
  },
  creditInputRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  creditInput: {
    backgroundColor: 'var(--bg-page)',
    border: '1px solid var(--border-light)',
    padding: '6px 10px',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-main)',
    width: '100px',
    outline: 'none',
    fontSize: '13px',
    fontWeight: '700',
  },
  creditUnit: {
    fontSize: '13px',
    color: 'var(--text-muted)',
    fontWeight: '600',
  },
  maxCreditBtn: {
    padding: '6px 10px',
    fontSize: '11px',
    marginLeft: 'auto',
  },
  totalsRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  totalDetail: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '13px',
    color: 'var(--text-muted)',
  },
  finalTotalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '16px',
    fontWeight: '800',
    color: 'var(--text-main)',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    paddingTop: '12px',
    marginTop: '6px',
  },
  badgeBox: {
    padding: '24px',
    textAlign: 'left',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    border: '1px solid rgba(245, 158, 11, 0.25)',
  },
  badgeHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  badgeTitle: {
    fontSize: '13px',
    fontWeight: '800',
    color: 'var(--color-gold)',
    margin: 0,
    letterSpacing: '0.5px',
    fontFamily: 'var(--font-heading)',
  },
  badgeText: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    lineHeight: '1.5',
    margin: 0,
  }
};
