import { useState, useEffect } from 'react';
import { useTranslation } from '../context/LanguageContext';
import { supabase } from '../supabase';
import { getProductImageCached } from '../services/products';
export default function Cart({ cart, setCart, setActivePage, appliedDiscount, setAppliedDiscount, alert }) {
  const { lang, t } = useTranslation();
  const [promoCode, setPromoCode] = useState(appliedDiscount ? appliedDiscount.code : '');
  const [promoLoading, setPromoLoading] = useState(false);

  useEffect(() => {
    try {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ ecommerce: null });
      window.dataLayer.push({
        event: 'view_cart',
        ecommerce: {
          currency: 'CZK',
          value: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
          items: cart.map(item => ({
            item_id: item.id,
            item_name: item.name,
            price: item.price,
            quantity: item.quantity
          }))
        }
      });
    } catch (gaErr) {
      console.error('GA4 view_cart failed:', gaErr);
    }
  }, []);

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    setPromoLoading(true);
    try {
      const codeClean = promoCode.trim().toUpperCase();
      const { data, error } = await supabase
        .from('discount_codes')
        .select('*')
        .eq('code', codeClean)
        .eq('active', true)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setAppliedDiscount(data);
        if (alert) {
          alert(
            lang === 'CZ' 
              ? `Slevový kód "${data.code}" (${data.discount_percent}%) byl úspěšně uplatněn.` 
              : `Discount code "${data.code}" (${data.discount_percent}%) has been successfully applied.`,
            'success'
          );
        }
      } else {
        if (alert) {
          alert(
            lang === 'CZ' 
              ? 'Zadaný slevový kód je neplatný nebo neexistuje.' 
              : 'The entered discount code is invalid or does not exist.',
            'error'
          );
        }
      }
    } catch (err) {
      console.error(err);
      if (alert) {
        alert(
          lang === 'CZ' 
            ? 'Chyba při ověřování slevového kódu.' 
            : 'Error validating discount code.',
          'error'
        );
      }
    } finally {
      setPromoLoading(false);
    }
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const discountAmount = appliedDiscount 
    ? Math.round(subtotal * (appliedDiscount.discount_percent / 100)) 
    : 0;
  const finalTotal = Math.max(0, subtotal - discountAmount);
  
  const updateQuantity = (itemId, delta) => {
    const item = cart.find(i => i.id === itemId);
    if (item) {
      try {
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({ ecommerce: null });
        window.dataLayer.push({
          event: delta > 0 ? 'add_to_cart' : 'remove_from_cart',
          ecommerce: {
            currency: 'CZK',
            value: item.price * Math.abs(delta),
            items: [
              {
                item_id: item.id,
                item_name: item.name,
                price: item.price,
                quantity: Math.abs(delta)
              }
            ]
          }
        });
      } catch (gaErr) {
        console.error('GA4 cart quantity update event failed:', gaErr);
      }
    }

    setCart(prev => {
      const updated = prev.map(item => {
        if (item.id === itemId) {
          return { ...item, quantity: item.quantity + delta };
        }
        return item;
      });
      return updated.filter(item => item.quantity > 0);
    });
  };

  const removeItem = (itemId) => {
    const item = cart.find(i => i.id === itemId);
    if (item) {
      try {
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({ ecommerce: null });
        window.dataLayer.push({
          event: 'remove_from_cart',
          ecommerce: {
            currency: 'CZK',
            value: item.price * item.quantity,
            items: [
              {
                item_id: item.id,
                item_name: item.name,
                price: item.price,
                quantity: item.quantity
              }
            ]
          }
        });
      } catch (gaErr) {
        console.error('GA4 cart remove item event failed:', gaErr);
      }
    }
    setCart(prev => prev.filter(item => item.id !== itemId));
  };

  const freeShippingThreshold = 2000;
  const isFreeShipping = finalTotal >= freeShippingThreshold;
  const remainingForFreeShipping = Math.max(0, freeShippingThreshold - finalTotal);
  const shippingPercent = Math.min(100, Math.round((finalTotal / freeShippingThreshold) * 100));

  return (
    <div className="container fade-in">
      <h1 className="sr-only">{t('Cart.title')} - NORTHVALE</h1>

      {/* Breadcrumbs */}
      <nav className="breadcrumbs-nav" aria-label={lang === 'CZ' ? 'Drobečková navigace' : 'Breadcrumbs'} style={{ marginBottom: '24px', paddingTop: '20px' }}>
        <span className="breadcrumb-item" onClick={() => setActivePage('home')}>{t('common.home')}</span>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-item active">{t('Cart.title')}</span>
      </nav>

      <section className="cart-section" style={{ textAlign: 'left' }}>
        {cart.length === 0 ? (
          <div>
            <header className="ckf-head">
              <div className="title-group">
                <div className="nv-eyebrow">{lang === 'CZ' ? 'Váš výběr' : 'Your selection'}</div>
                <h2 className="ckf-title">{lang === 'CZ' ? 'Košík' : 'Cart'}</h2>
              </div>
            </header>
            
            <div 
              style={{ 
                padding: '60px', 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '16px', 
                textAlign: 'center',
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid transparent',
                boxShadow: '0 24px 50px rgba(0, 0, 0, 0.45)',
                boxSizing: 'border-box'
              }}
            >
              <span style={{ fontSize: '56px' }}>🛒</span>
              <h3 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>{t('Cart.empty')}</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
                {lang === 'CZ' ? 'Zatím jste do košíku nepřidali žádné produkty.' : 'You have not added any products to your cart yet.'}
              </p>
              <button 
                className="btn btn-primary" 
                onClick={() => {
                  setActivePage('home');
                  setTimeout(() => {
                    const element = document.getElementById('popular-categories');
                    if (element) {
                      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                  }, 100);
                }}
                style={{ marginTop: '10px' }}
              >
                {lang === 'CZ' ? 'Prohlížet nabídku karet' : 'Browse products'}
              </button>
            </div>
          </div>
        ) : (
          <div>
            <header className="ckf-head">
              <div className="title-group">
                <div className="nv-eyebrow">{lang === 'CZ' ? 'Váš výběr' : 'Your selection'}</div>
                <h2 className="ckf-title">{lang === 'CZ' ? 'Košík' : 'Cart'}</h2>
              </div>
              <span 
                className="nv-link" 
                onClick={() => {
                  setActivePage('home');
                  setTimeout(() => {
                    const element = document.getElementById('popular-categories');
                    if (element) {
                      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                  }, 100);
                }} 
                style={{ cursor: 'pointer' }}
              >
                {t('common.backToCatalog') || 'Zpět do katalogu'} <span className="nv-link-arrow">→</span>
              </span>
            </header>

            <div className="ckf-grid">
              {/* Left Column: Cart Items List */}
              <div className="ckf-items">
                {cart.map((item) => {
                  return (
                    <div key={item.id} className="ckf-item">
                      {/* Product Image Wrapper */}
                      <div className="ckf-thumb">
                        <img 
                          src={getProductImageCached(item.product?.id || item.id, item.product?.image || item.image || '/Akce - NORTHVALE.webp')} 
                          alt={item.name || 'Northvale TCG produkt'} 
                          width="72"
                          height="100"
                        />
                      </div>

                      {/* Product Info */}
                      <div className="ckf-item-info">
                        <div className="ckf-item-set">
                          {item.product?.edition || item.product?.game || (lang === 'CZ' ? 'Příslušenství' : 'Accessories')}
                        </div>
                        <h3 className="ckf-item-name">
                          {item.productName || item.name.split(' (')[0]}
                          {/* Preorder item label hidden for now
                          {(item.product?.preorder || item.preorder) && (
                            <span style={{ fontSize: '9px', fontWeight: '800', backgroundColor: 'rgba(253, 189, 22, 0.12)', color: 'var(--nv-gold, #fdbd16)', padding: '2px 6px', borderRadius: '3px', marginLeft: '8px', display: 'inline-block', verticalAlign: 'middle', textTransform: 'uppercase', border: '1px solid rgba(253, 189, 22, 0.2)' }}>
                              {lang === 'CZ' ? 'Předobjednávka' : 'Pre-order'}
                            </span>
                          )}
                          */}
                        </h3>
                        
                        {/* Variant tags */}
                        {item.condition && (
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px', marginBottom: '8px' }}>
                            <span style={{ fontSize: '9px', fontWeight: '800', backgroundColor: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: '3px' }}>
                              {lang === 'CZ' ? `Stav: ${item.condition}` : `Condition: ${item.condition}`}
                            </span>
                            <span style={{ fontSize: '9px', fontWeight: '800', backgroundColor: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: '3px' }}>
                              {t('common.language')}: {item.lang}
                            </span>
                            <span style={{ fontSize: '9px', fontWeight: '800', backgroundColor: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: '3px' }}>
                              {item.foil ? 'Foil ✨' : 'Non-Foil ▱'}
                            </span>
                          </div>
                        )}
                        
                        <button type="button" className="ckf-remove" onClick={() => removeItem(item.id)}>
                          {t('Cart.remove')}
                        </button>
                      </div>

                      {/* Quantity Controls */}
                      <div className="ckf-qty">
                        <button type="button" aria-label={lang === 'CZ' ? 'Snížit' : 'Decrease'} onClick={() => updateQuantity(item.id, -1)}>
                          −
                        </button>
                        <span>{item.quantity}</span>
                        <button type="button" aria-label={lang === 'CZ' ? 'Zvýšit' : 'Increase'} onClick={() => updateQuantity(item.id, 1)}>
                          +
                        </button>
                      </div>

                      {/* Price info */}
                      <div className="ckf-item-price">
                        <span className="ckf-item-total">
                          {(item.price * item.quantity).toLocaleString(lang === 'CZ' ? 'cs-CZ' : 'en-US')} {lang === 'CZ' ? 'Kč' : 'CZK'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Right Column: Order Summary */}
              <aside className="ckf-summary">
                {/* Preorder order warning hidden for now
                {cart.some(item => item.product?.preorder || item.preorder) && (
                  <div style={{
                    background: 'rgba(253, 189, 22, 0.02)',
                    border: '1px solid rgba(253, 189, 22, 0.15)',
                    borderRadius: '8px',
                    padding: '12px',
                    marginBottom: '16px',
                    fontSize: '11px',
                    lineHeight: '1.4',
                    color: 'rgba(255,255,255,0.7)',
                    display: 'flex',
                    gap: '8px',
                    boxSizing: 'border-box'
                  }}>
                    <span style={{ fontSize: '14px', color: 'var(--nv-gold, #fdbd16)' }}>⚠️</span>
                    <div>
                      {lang === 'CZ'
                        ? 'Košík obsahuje předobjednávku. Celá vaše zásilka bude odeslána společně, jakmile vyjdou všechny předobjednané produkty. Pokud chcete skladové zboží doručit ihned, vytvořte prosím dvě samostatné objednávky.'
                        : 'Your cart contains a pre-order. The entire order will ship together once all pre-ordered items are in stock. If you wish to receive in-stock items immediately, please split them into two separate orders.'}
                    </div>
                  </div>
                )}
                */}

                {/* Free Shipping Alert banner */}
                <div className="nv-eyebrow" style={{ marginBottom: '8px' }}>{t('Cart.summary') || 'Shrnutí'}</div>
                <div className="ckf-ship">
                  <div className="ckf-ship-row">
                    {isFreeShipping ? (
                      <span><strong>{t('common.freeShippingMet')}</strong></span>
                    ) : (
                      <span>
                        {t('common.freeShippingAlert')} <strong>{remainingForFreeShipping.toLocaleString(lang === 'CZ' ? 'cs-CZ' : 'en-US')} {lang === 'CZ' ? 'Kč' : 'CZK'}</strong>
                      </span>
                    )}
                    <span className="ckf-ship-pct">{shippingPercent}%</span>
                  </div>
                  <div className="ckf-ship-track">
                    <div className="ckf-ship-fill" style={{ width: `${shippingPercent}%` }}></div>
                  </div>
                  <div className="ckf-ship-note">
                    {t('common.shippingThresholdNote')}
                  </div>
                </div>

                {/* Summary rows */}
                <div className="ckf-srows">
                  <div className="ckf-srow">
                    <span>{t('Cart.subtotal')} ({cart.reduce((s, i) => s + i.quantity, 0)} {t('common.pcs')})</span>
                    <span className="ckf-sdots"></span>
                    <span>{subtotal.toLocaleString(lang === 'CZ' ? 'cs-CZ' : 'en-US')} {lang === 'CZ' ? 'Kč' : 'CZK'}</span>
                  </div>

                  {appliedDiscount && (
                    <div className="ckf-srow" style={{ color: 'var(--color-gold)' }}>
                      <span>{lang === 'CZ' ? `Sleva (${appliedDiscount.code})` : `Discount (${appliedDiscount.code})`}</span>
                      <span className="ckf-sdots"></span>
                      <span>-{discountAmount.toLocaleString(lang === 'CZ' ? 'cs-CZ' : 'en-US')} {lang === 'CZ' ? 'Kč' : 'CZK'}</span>
                    </div>
                  )}

                  <div className="ckf-srow">
                    <span>{t('Cart.shipping')}</span>
                    <span className="ckf-sdots"></span>
                    <span>{isFreeShipping ? t('Cart.free') : (lang === 'CZ' ? 'od 79 Kč' : 'from 79 CZK')}</span>
                  </div>
                </div>

                {/* Totals Row */}
                <div className="ckf-total">
                  <span>{t('Cart.total')}</span>
                  <span className="ckf-total-val">
                    {finalTotal.toLocaleString(lang === 'CZ' ? 'cs-CZ' : 'en-US')} {lang === 'CZ' ? 'Kč' : 'CZK'}
                  </span>
                </div>

                {/* Promo / Discount Code Block */}
                <div className="ckf-promo">
                  <input 
                    type="text" 
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    placeholder={t('Cart.promoPlaceholder')}
                    disabled={!!appliedDiscount || promoLoading}
                  />
                  {appliedDiscount ? (
                    <button 
                      type="button" 
                      onClick={() => {
                        setAppliedDiscount(null);
                        setPromoCode('');
                      }}
                      style={{ background: '#ef4444', color: '#fff' }}
                    >
                      {lang === 'CZ' ? 'Odebrat' : 'Remove'}
                    </button>
                  ) : (
                    <button 
                      type="button" 
                      onClick={handleApplyPromo}
                      disabled={promoLoading}
                    >
                      {promoLoading ? (lang === 'CZ' ? 'Ověřování...' : 'Verifying...') : t('Cart.promoBtn')}
                    </button>
                  )}
                </div>

                {/* Action Button */}
                <button 
                  type="button"
                  className="ckf-checkout"
                  onClick={() => setActivePage('checkout')}
                >
                  <span>{t('Cart.checkout')}</span>
                  <span>→</span>
                </button>

                {/* Kontakt help banner */}
                <div className="ckf-help">
                  <span>{t('Cart.help')}</span>
                  <a href="tel:+420739666779">+420 739 666 779</a>
                  <span style={{ opacity: 0.4 }}>/</span>
                  <a href="mailto:info@northvaletcg.eu">info@northvaletcg.eu</a>
                </div>
              </aside>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
