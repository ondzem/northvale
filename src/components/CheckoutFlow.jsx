import { useState } from 'react';
import { useTranslation } from '../context/LanguageContext';

export default function CheckoutFlow({ cart, submitOrder, setActivePage }) {
  const { lang, t } = useTranslation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [zip, setZip] = useState('');
  const [shipping, setShipping] = useState('zasilkovna');
  const [payment, setPayment] = useState('card');
  const creditApplied = 0;
  
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

  const finalTotal = Math.max(0, cartSubtotal + shippingCost - isicDiscount);

  const handleApplyIsic = () => {
    if (isicNumber.trim().toUpperCase().startsWith('S')) {
      setIsicApplied(true);
      alert(lang === 'CZ' 
        ? 'ISIC karta byla úspěšně ověřena. Byla uplatněna sleva 5% na Vaši objednávku!'
        : 'ISIC card verified successfully. 5% discount has been applied to your order!'
      );
    } else {
      alert(lang === 'CZ'
        ? 'Neplatné číslo ISIC karty. Číslo musí začínat písmenem S (např. S1234567890).'
        : 'Invalid ISIC card number. The number must start with S (e.g., S1234567890).'
      );
    }
  };

  const handlePlaceOrder = (e) => {
    e.preventDefault();
    if (cart.length === 0) {
      alert(t('Cart.empty'));
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
      shippingMethod: shipping === 'zasilkovna' 
        ? (lang === 'CZ' ? 'Zásilkovna' : 'Packeta (Zásilkovna)') 
        : shipping === 'pardubice' 
          ? (lang === 'CZ' ? 'Osobní odběr Pardubice' : 'Local Pickup Pardubice') 
          : (lang === 'CZ' ? 'Česká pošta' : 'Czech Post'),
      date: new Date().toLocaleDateString(lang === 'CZ' ? 'cs-CZ' : 'en-US'),
      invoiceUrl: '#'
    };

    // Make sure we subtract the credit correctly
    submitOrder(order, creditApplied);
    alert(lang === 'CZ'
      ? `Děkujeme za Váš nákup! Objednávka #${order.id} byla úspěšně vytvořena a uložena do Vašeho profilu.`
      : `Thank you for your purchase! Order #${order.id} was successfully created and saved to your profile.`
    );
    setActivePage('profile');
  };

  return (
    <div style={styles.container} className="container fade-in">
      <h1 className="sr-only">
        {lang === 'CZ' ? 'Pokladna a dokončení objednávky - NORTHVALE' : 'Checkout & Purchase - NORTHVALE'}
      </h1>

      {cart.length === 0 ? (
        <div style={styles.emptyCart} className="glass-panel">
          <span style={{ fontSize: '48px' }}>🛒</span>
          <h3>{t('Cart.empty')}</h3>
          <button className="btn btn-primary" onClick={() => setActivePage('singles-catalog')}>
            {t('common.backToCatalog')}
          </button>
        </div>
      ) : (
        <div style={styles.layout}>
          {/* Left Column: Form */}
          <form style={styles.leftCol} onSubmit={handlePlaceOrder} className="glass-panel">
            <h2 style={styles.sectionHeading}>{lang === 'CZ' ? 'Osobní údaje' : 'Personal Information'}</h2>
            
            <div style={styles.formGrid}>
              <div style={styles.field}>
                <label style={styles.label}>{lang === 'CZ' ? 'Jméno a příjmení:' : 'Full Name:'}</label>
                <input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder={lang === 'CZ' ? 'Jan Novák' : 'John Doe'} style={styles.input} />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>{t('Checkout.email')}:</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" style={styles.input} />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>{t('Checkout.phone')}:</label>
                <input type="tel" required value={phone} onChange={e => setPhone(e.target.value)} placeholder={lang === 'CZ' ? '+420 123 456 789' : '+44 20 7946 0958'} style={styles.input} />
              </div>
            </div>

            <h2 style={{ ...styles.sectionHeading, marginTop: '24px' }}>{lang === 'CZ' ? 'Adresa doručení' : 'Shipping Address'}</h2>
            <div style={styles.formGrid}>
              <div style={{ ...styles.field, gridColumn: 'span 2' }}>
                <label style={styles.label}>{lang === 'CZ' ? 'Ulice a číslo popisné:' : 'Street & house number:'}</label>
                <input type="text" required value={street} onChange={e => setStreet(e.target.value)} placeholder={lang === 'CZ' ? 'Bratří Čapků 1095' : '10 Downing Street'} style={styles.input} />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>{lang === 'CZ' ? 'Město:' : 'City:'}</label>
                <input type="text" required value={city} onChange={e => setCity(e.target.value)} placeholder={lang === 'CZ' ? 'Holice' : 'London'} style={styles.input} />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>{lang === 'CZ' ? 'PSČ:' : 'ZIP / Postal Code:'}</label>
                <input type="text" required value={zip} onChange={e => setZip(e.target.value)} placeholder={lang === 'CZ' ? '534 01' : 'SW1A 2AA'} style={styles.input} />
              </div>
            </div>

            <h2 style={{ ...styles.sectionHeading, marginTop: '24px' }}>{t('Checkout.shippingMethod')}</h2>
            <div style={styles.optionsList}>
              <label style={styles.optionRow} className="glass-card">
                <input type="radio" name="shipping" checked={shipping === 'zasilkovna'} onChange={() => setShipping('zasilkovna')} style={styles.radio} />
                <div style={styles.optionInfo}>
                  <span style={styles.optionName}>
                    {lang === 'CZ' ? 'Zásilkovna - Výdejní místo / Z-BOX' : 'Packeta - Pickup Point / Z-BOX'}
                  </span>
                  <span style={styles.optionDesc}>
                    {lang === 'CZ' ? 'Doručení do 24-48h na Vámi vybrané místo.' : 'Delivery within 24-48h to your selected location.'}
                  </span>
                </div>
                <span style={styles.optionPrice}>{cartSubtotal > 2000 ? t('Cart.free') : (lang === 'CZ' ? '79 Kč' : '79 CZK')}</span>
              </label>

              <label style={styles.optionRow} className="glass-card">
                <input type="radio" name="shipping" checked={shipping === 'pardubice'} onChange={() => setShipping('pardubice')} style={styles.radio} />
                <div style={styles.optionInfo}>
                  <span style={styles.optionName}>
                    {lang === 'CZ' ? 'Osobní odběr Pardubice (Coffee & Cards)' : 'Local Pickup Pardubice (Coffee & Cards)'}
                  </span>
                  <span style={styles.optionDesc}>
                    {lang === 'CZ' ? 'Vyzvednutí zdarma v kavárně v centru města. Slevový kód na kávu.' : 'Pickup for free in the café in the city center. Free coffee voucher included.'}
                  </span>
                </div>
                <span style={styles.optionPrice}>{t('Cart.free')}</span>
              </label>

              <label style={styles.optionRow} className="glass-card">
                <input type="radio" name="shipping" checked={shipping === 'posta-doporucene'} onChange={() => setShipping('posta-doporucene')} style={styles.radio} />
                <div style={styles.optionInfo}>
                  <span style={styles.optionName}>
                    {lang === 'CZ' ? 'Česká pošta - Doporučené psaní' : 'Czech Post - Registered Mail'}
                  </span>
                  <span style={styles.optionDesc}>
                    {lang === 'CZ' ? 'Pojištěno do 880 Kč. Pouze pro menší zásilky.' : 'Insured up to 880 CZK. Available for light card shipments only.'}
                  </span>
                </div>
                <span style={styles.optionPrice}>{cartSubtotal > 2000 ? t('Cart.free') : (lang === 'CZ' ? '85 Kč' : '85 CZK')}</span>
              </label>

              <label style={styles.optionRow} className="glass-card">
                <input type="radio" name="shipping" checked={shipping === 'posta-cenne'} onChange={() => setShipping('posta-cenne')} style={styles.radio} />
                <div style={styles.optionInfo}>
                  <span style={styles.optionName}>
                    {lang === 'CZ' ? 'Česká pošta - Cenné psaní' : 'Czech Post - Insured Letter'}
                  </span>
                  <span style={styles.optionDesc}>
                    {lang === 'CZ' 
                      ? 'Speciální bezpečnostní obálka, plné pojištění hodnoty karet (doporučeno pro drahé kusovky).' 
                      : 'Special secure bubble envelop with full valuation insurance (highly recommended for high-end singles).'}
                  </span>
                </div>
                <span style={styles.optionPrice}>{lang === 'CZ' ? '110 Kč' : '110 CZK'}</span>
              </label>
            </div>

            <h2 style={{ ...styles.sectionHeading, marginTop: '24px' }}>{t('Checkout.paymentMethod')}</h2>
            <div style={styles.optionsList}>
              <label style={styles.optionRow} className="glass-card">
                <input type="radio" name="payment" checked={payment === 'card'} onChange={() => setPayment('card')} style={styles.radio} />
                <div style={styles.optionInfo}>
                  <span style={styles.optionName}>{lang === 'CZ' ? 'Platební karta online' : 'Online Credit/Debit Card'}</span>
                  <span style={styles.optionDesc}>{lang === 'CZ' ? 'Okamžitá platba přes bránu.' : 'Instant secure payment via gateway.'}</span>
                </div>
              </label>
              <label style={styles.optionRow} className="glass-card">
                <input type="radio" name="payment" checked={payment === 'transfer'} onChange={() => setPayment('transfer')} style={styles.radio} />
                <div style={styles.optionInfo}>
                  <span style={styles.optionName}>{lang === 'CZ' ? 'Bankovní převod' : 'Bank Transfer'}</span>
                  <span style={styles.optionDesc}>
                    {lang === 'CZ' 
                      ? 'Platební údaje obdržíte v e-mailu. Expedujeme po připsání platby.' 
                      : 'Payment coordinates will be sent by email. We ship immediately after transfer clears.'}
                  </span>
                </div>
              </label>
            </div>

            <button type="submit" className="btn btn-success" style={styles.submitBtn}>
              {lang === 'CZ' ? 'Objednat a zaplatit' : 'Place Order & Pay'} ({finalTotal.toLocaleString(lang === 'CZ' ? 'cs-CZ' : 'en-US')} {lang === 'CZ' ? 'Kč' : 'CZK'})
            </button>
          </form>

          {/* Right Column */}
          <div style={styles.rightCol}>
            <div style={styles.summaryBox} className="glass-panel">
              <h3 style={styles.summaryTitle}>{lang === 'CZ' ? 'Vaše objednávka' : 'Your Order Summary'}</h3>
              
              <div style={styles.itemsList}>
                {cart.map((item, idx) => (
                  <div key={idx} style={styles.itemRow}>
                    <div style={styles.itemMeta}>
                      <span style={styles.itemName}>{item.name || (item.product && item.product.name)}</span>
                      {item.condition && (
                        <span style={styles.itemVariant}>
                          {lang === 'CZ' ? 'Stav' : 'Condition'}: {item.condition} | {item.lang} | {item.foil ? 'Foil' : 'Non-Foil'}
                        </span>
                      )}
                    </div>
                    <span style={styles.itemPrice}>{item.quantity}x {item.price.toLocaleString(lang === 'CZ' ? 'cs-CZ' : 'en-US')} {lang === 'CZ' ? 'Kč' : 'CZK'}</span>
                  </div>
                ))}
              </div>

              {/* Student ISIC Discount code */}
              <div style={styles.creditApplySection} className="glass-card">
                <h4 style={styles.creditHeading}>{lang === 'CZ' ? 'ISIC Studentská sleva (5%)' : 'ISIC Student Discount (5%)'}</h4>
                <p style={styles.creditDesc}>
                  {lang === 'CZ' 
                    ? 'Zadejte číslo ISIC karty pro uplatnění slevy 5% na nákup.' 
                    : 'Enter your ISIC card number to claim your 5% checkout discount.'}
                </p>
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
                    {isicApplied ? 'OK' : (lang === 'CZ' ? 'Ověřit' : 'Verify')}
                  </button>
                </div>
              </div>

              <div style={styles.totalsRow}>
                <div style={styles.totalDetail}>
                  <span>{t('Cart.subtotal')}:</span>
                  <span>{cartSubtotal.toLocaleString(lang === 'CZ' ? 'cs-CZ' : 'en-US')} {lang === 'CZ' ? 'Kč' : 'CZK'}</span>
                </div>
                <div style={styles.totalDetail}>
                  <span>{t('Cart.shipping')}:</span>
                  <span>{shippingCost === 0 ? t('Cart.free') : `${shippingCost} ${lang === 'CZ' ? 'Kč' : 'CZK'}`}</span>
                </div>
                {isicApplied && (
                  <div style={{ ...styles.totalDetail, color: 'var(--color-green)' }}>
                    <span>{lang === 'CZ' ? 'ISIC Sleva (5%):' : 'ISIC Discount (5%):'}</span>
                    <span>-{isicDiscount.toLocaleString(lang === 'CZ' ? 'cs-CZ' : 'en-US')} {lang === 'CZ' ? 'Kč' : 'CZK'}</span>
                  </div>
                )}
                <div style={styles.finalTotalRow}>
                  <span>{lang === 'CZ' ? 'Celkem:' : 'Total due:'}</span>
                  <span style={{ color: 'var(--color-gold)' }}>{finalTotal.toLocaleString(lang === 'CZ' ? 'cs-CZ' : 'en-US')} {lang === 'CZ' ? 'Kč' : 'CZK'}</span>
                </div>
              </div>
            </div>

            <div style={styles.badgeBox} className="glass-panel">
              <div style={styles.badgeHeader}>
                <span style={{ fontSize: '28px' }}>🛡️</span>
                <h4 style={styles.badgeTitle}>
                  {lang === 'CZ' ? 'GARANCE SBĚRATELSKÉHO BALENÍ' : 'COLLECTOR-GRADE PACKAGING'}
                </h4>
              </div>
              <p style={styles.badgeText}>
                {lang === 'CZ'
                  ? 'Garantujeme, že Vaše sealed produkty i kusové karty zabalíme bezpečně podle nejvyšších sběratelských standardů. Žádná lepící páska na toploaderu, žádné promáčklé rohy ETB boxů.'
                  : 'We guarantee that all sealed products and single cards are packaged safely using high-end collector criteria. No adhesive tapes on card toploaders, no dented corners on ETB displays.'}
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
