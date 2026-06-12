import { useState } from 'react';

export default function Cart({ cart, setCart, setActivePage }) {
  const [showPromoInput, setShowPromoInput] = useState(false);
  const [promoCode, setPromoCode] = useState('');

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  const updateQuantity = (itemId, delta) => {
    setCart(prev => prev.map(item => {
      if (item.id === itemId) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : item;
      }
      return item;
    }));
  };

  const removeItem = (itemId) => {
    setCart(prev => prev.filter(item => item.id !== itemId));
  };

  const freeShippingThreshold = 2000;
  const isFreeShipping = subtotal >= freeShippingThreshold;
  const remainingForFreeShipping = freeShippingThreshold - subtotal;

  return (
    <div className="container fade-in">
      <h1 className="sr-only">Nákupní košík - NORTHVALE</h1>

      {/* Breadcrumbs */}
      <nav className="breadcrumbs-nav" aria-label="Drobečková navigace" style={{ marginBottom: '24px', paddingTop: '20px' }}>
        <span className="breadcrumb-item" onClick={() => setActivePage('home')}>Domů</span>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-item active">Nákupní košík</span>
      </nav>

      <section className="cart-section" style={{ textAlign: 'left' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '800', margin: '0 0 24px 0', fontFamily: 'var(--font-heading)' }}>
          Nákupní košík
        </h2>

        {cart.length === 0 ? (
          <div className="glass-panel" style={{ padding: '60px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', textAlign: 'center' }}>
            <span style={{ fontSize: '56px' }}>🛒</span>
            <h3 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>Váš nákupní košík je prázdný</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>Zatím jste do košíku nepřidali žádné produkty.</p>
            <button 
              className="btn btn-primary" 
              onClick={() => setActivePage('singles-catalog')}
              style={{ marginTop: '10px' }}
            >
              Prohlížet nabídku karet
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
            
            {/* Left Column: Cart Items List */}
            <div style={{ flex: '2 1 500px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {cart.map((item) => {
                const itemTotal = item.price * item.quantity;
                
                return (
                  <div 
                    key={item.id} 
                    className="glass-panel" 
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '20px',
                      padding: '20px',
                      flexWrap: 'wrap',
                      position: 'relative'
                    }}
                  >
                    {/* Product Image */}
                    <div style={{
                      width: '70px',
                      height: '90px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: 'rgba(9, 9, 11, 0.4)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '6px'
                    }}>
                      <img 
                        src={item.product?.image || item.image || '/Akce - NORTHVALE.webp'} 
                        alt={item.name} 
                        style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
                      />
                    </div>

                    {/* Product Info */}
                    <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '10px', color: 'var(--color-gold)', fontWeight: '800', textTransform: 'uppercase' }}>
                        {item.product?.edition || item.product?.game || 'NORTHVALE'}
                      </span>
                      <h3 style={{ fontSize: '14px', fontWeight: '800', margin: 0, color: 'var(--text-main)' }}>
                        {item.productName || item.name.split(' (')[0]}
                      </h3>
                      
                      {/* Variant tags */}
                      {item.condition && (
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                          <span style={{ fontSize: '9px', fontWeight: '800', backgroundColor: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: '3px' }}>
                            Stav: {item.condition}
                          </span>
                          <span style={{ fontSize: '9px', fontWeight: '800', backgroundColor: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: '3px' }}>
                            Jazyk: {item.lang}
                          </span>
                          <span style={{ fontSize: '9px', fontWeight: '800', backgroundColor: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: '3px' }}>
                            {item.foil ? 'Foil ✨' : 'Non-Foil ▱'}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Quantity Controls */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <button 
                        onClick={() => updateQuantity(item.id, -1)}
                        style={{
                          backgroundColor: 'rgba(255,255,255,0.04)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          color: 'var(--text-main)',
                          borderRadius: '50%',
                          width: '28px',
                          height: '28px',
                          cursor: 'pointer',
                          fontWeight: '800',
                          fontSize: '14px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        -
                      </button>
                      <span style={{ fontSize: '14px', fontWeight: '800', minWidth: '20px', textAlign: 'center' }}>
                        {item.quantity}
                      </span>
                      <button 
                        onClick={() => updateQuantity(item.id, 1)}
                        style={{
                          backgroundColor: 'rgba(255,255,255,0.04)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          color: 'var(--text-main)',
                          borderRadius: '50%',
                          width: '28px',
                          height: '28px',
                          cursor: 'pointer',
                          fontWeight: '800',
                          fontSize: '14px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        +
                      </button>
                    </div>

                    {/* Price info */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: '100px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {item.price.toLocaleString()} Kč / ks
                      </span>
                      <span style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)' }}>
                        {itemTotal.toLocaleString()} Kč
                      </span>
                    </div>

                    {/* Remove Button */}
                    <button 
                      onClick={() => removeItem(item.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--color-red, #ff4a5a)',
                        fontSize: '18px',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="Odebrat z košíku"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Right Column: Order Summary */}
            <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Free Shipping Alert banner */}
              <div 
                className="glass-card" 
                style={{ 
                  padding: '16px 20px', 
                  borderLeft: `4px solid ${isFreeShipping ? 'var(--color-green)' : 'var(--color-gold)'}`,
                  fontSize: '12px',
                  lineHeight: '1.4'
                }}
              >
                {isFreeShipping ? (
                  <span style={{ color: 'var(--color-green)', fontWeight: '700' }}>
                    🎉 Máte nárok na DOPRAVU ZDARMA!
                  </span>
                ) : (
                  <span>
                    Nakupte ještě za <strong>{remainingForFreeShipping.toLocaleString()} Kč</strong> pro <strong>DOPRAVU ZDARMA</strong> (uplatňuje se pro Zásilkovnu a Českou poštu).
                  </span>
                )}
              </div>

              {/* Summary details */}
              <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '800', margin: 0, fontFamily: 'var(--font-heading)' }}>
                  Shrnutí košíku
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-muted)' }}>
                    <span>Mezisoučet ({cart.reduce((s,i) => s + i.quantity, 0)} ks):</span>
                    <span style={{ color: 'var(--text-main)', fontWeight: '700' }}>{subtotal.toLocaleString()} Kč</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-muted)' }}>
                    <span>Doprava:</span>
                    <span>{isFreeShipping ? 'Zdarma' : 'od 79 Kč'}</span>
                  </div>
                </div>                {/* Totals Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontSize: '15px', fontWeight: '700' }}>Celkem za zboží:</span>
                  <span style={{ fontSize: '22px', fontWeight: '800', color: 'var(--color-gold)' }}>
                    {subtotal.toLocaleString()} Kč
                  </span>
                </div>

                {/* Promo / Discount Code Block */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Máš dárkový nebo slevový kód?</span>
                    <button 
                      onClick={() => setShowPromoInput(!showPromoInput)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--color-gold)',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        padding: '4px 0',
                        textDecoration: 'underline'
                      }}
                    >
                      {showPromoInput ? 'Skrýt' : 'Zadat kód'}
                    </button>
                  </div>

                  {showPromoInput && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                      <input 
                        type="text" 
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value)}
                        placeholder="Napiš kód..."
                        style={{
                          flexGrow: 1,
                          backgroundColor: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: 'var(--radius-md)',
                          color: '#fff',
                          padding: '8px 12px',
                          fontSize: '13px',
                          fontFamily: 'var(--font-main)'
                        }}
                      />
                      <button 
                        className="btn btn-primary"
                        onClick={() => alert(`Zadali jste kód: ${promoCode}`)}
                        style={{
                          padding: '8px 16px',
                          fontSize: '12px',
                          fontWeight: '800',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        Ověřit
                      </button>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                  <button 
                    className="btn btn-primary"
                    onClick={() => setActivePage('checkout')}
                    style={{ width: '100%', padding: '12px', fontWeight: '800' }}
                  >
                    Pokračovat k pokladně &rarr;
                  </button>
                  <button 
                    className="btn btn-secondary"
                    onClick={() => setActivePage('singles-catalog')}
                    style={{ width: '100%', padding: '10px' }}
                  >
                    Zpět do katalogu
                  </button>
                </div>
              </div>

              {/* Kontakt help banner */}
              <div className="glass-panel" style={{ padding: '20px', fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.6', display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
                <strong style={{ color: 'var(--text-main)', fontSize: '13px' }}>📞 Nevíš si s něčím rady? Stačí se ozvat.</strong>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '4px' }}>
                  <a href="tel:+420739666779" className="link-hover" style={{ color: 'var(--color-gold)', textDecoration: 'none', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>+420 739 666 779</span>
                  </a>
                  <a href="mailto:info@northvaletcg.eu" className="link-hover" style={{ color: 'var(--color-gold)', textDecoration: 'none', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>info@northvaletcg.eu</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
