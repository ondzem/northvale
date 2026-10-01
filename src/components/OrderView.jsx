import { useEffect, useState } from 'react';
import { useTranslation } from '../context/LanguageContext';
import { supabase } from '../supabase';
import { paymentAdjustmentLabel } from '../config';
import { estimateDeliveryDate, formatDeliveryDate } from '../services/deliveryEstimate';
import { ORDER_PAGE_CSS } from './orderPageStyles';

/**
 * Stav objednávky bez přihlášení — /objednavka/<číslo>/?k=<klíč z e-mailu>.
 * Vzhled vychází ze stránky „Děkujeme za objednávku“ (sdílené ORDER_PAGE_CSS).
 */
export default function OrderView({ orderId, setActivePage }) {
  const { lang } = useTranslation();
  const cz = lang === 'CZ';
  const [accessKey] = useState(() => {
    try { return new URLSearchParams(window.location.search).get('k') || ''; } catch { return ''; }
  });
  const [state, setState] = useState({ loading: true, order: null });

  // Stránka s osobním odkazem nepatří do vyhledávačů
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!orderId || !accessKey) { setState({ loading: false, order: null }); return; }
      try {
        const { data, error } = await supabase.functions.invoke('order-view', { body: { id: orderId, k: accessKey } });
        if (cancelled) return;
        setState({ loading: false, order: !error && data?.order ? data.order : null });
      } catch {
        if (!cancelled) setState({ loading: false, order: null });
      }
    })();
    return () => { cancelled = true; };
  }, [orderId, accessKey]);

  useEffect(() => {
    if (state.order) document.title = `${cz ? 'Stav objednávky' : 'Order status'} #${state.order.id} | Northvale TCG`;
  }, [state.order, cz]);

  const kc = (n) => `${Number(n || 0).toLocaleString('cs-CZ')} Kč`;

  if (state.loading) {
    return (
      <div className="order-confirm-wrapper">
        <div className="order-confirm-card">
          <span className="pr-spinner ov-loading" aria-hidden="true" />
          <p className="ocf-num" style={{ marginTop: '18px' }}>{cz ? 'Načítám objednávku…' : 'Loading your order…'}</p>
        </div>
        <style>{ORDER_PAGE_CSS + OV_CSS}</style>
      </div>
    );
  }

  if (!state.order) {
    return (
      <div className="order-confirm-wrapper">
        <div className="order-confirm-card">
          <h1 className="ocf-title">{cz ? 'Odkaz není platný' : 'Invalid link'}</h1>
          <p className="ocf-email" style={{ maxWidth: '440px' }}>
            {cz
              ? 'Odkaz na objednávku je neplatný nebo neúplný. Otevřete ho prosím znovu přímo z e-mailu, případně se přihlaste a objednávku najdete v sekci Moje objednávky.'
              : 'This order link is invalid or incomplete. Please open it again from the e-mail, or sign in and check My Orders.'}
          </p>
          <div className="ocf-actions">
            <button type="button" className="ocf-btn-primary" onClick={() => setActivePage('profile')}>{cz ? 'Moje objednávky' : 'My Orders'}</button>
            <button type="button" className="ocf-btn-ghost" onClick={() => setActivePage('faq')}>{cz ? 'Časté dotazy' : 'FAQ'}</button>
          </div>
        </div>
        <style>{ORDER_PAGE_CSS + OV_CSS}</style>
      </div>
    );
  }

  const o = state.order;
  const pm = (o.paymentMethod || '').toLowerCase();
  const isTransfer = pm.includes('převod') || pm.includes('transfer');
  const isCod = pm.includes('dobírk') || pm.includes('cash on delivery');
  const isPaid = String(o.paymentStatus).toLowerCase() === 'paid';
  const sm = (o.shippingMethod || '').toLowerCase();
  const isPickup = sm.includes('osobní') || sm.includes('personal');
  const fs = String(o.fulfillmentStatus || 'pending').toLowerCase();
  const isCancelled = fs === 'cancelled';
  const isDelivered = fs === 'completed';
  const isShipped = fs === 'shipped' || isDelivered;
  const paymentDone = isPaid || isCod;

  const steps = [
    { key: 'received', label: cz ? 'Přijata' : 'Received', done: true },
    { key: 'paid', label: isCod ? (cz ? 'Dobírka' : 'Cash on delivery') : (cz ? 'Zaplacena' : 'Paid'), done: paymentDone },
    { key: 'shipped', label: isPickup ? (cz ? 'K vyzvednutí' : 'Ready') : (cz ? 'Odeslána' : 'Shipped'), done: isShipped },
    { key: 'delivered', label: isPickup ? (cz ? 'Vyzvednuta' : 'Picked up') : (cz ? 'Doručena' : 'Delivered'), done: isDelivered },
  ];
  const currentIndex = isCancelled ? -1 : steps.findIndex(s => !s.done);

  const headline = isCancelled ? (cz ? 'Objednávka byla stornována' : 'Order cancelled')
    : isDelivered ? (cz ? (isPickup ? 'Objednávka byla vyzvednuta' : 'Objednávka byla doručena') : 'Order delivered')
    : isShipped ? (isPickup ? (cz ? 'Připraveno k vyzvednutí' : 'Ready for pickup') : (cz ? 'Objednávka je na cestě' : 'On its way'))
    : (!paymentDone && isTransfer) ? (cz ? 'Čekáme na Vaši platbu' : 'Awaiting your payment')
    : !paymentDone ? (cz ? 'Platba zatím neproběhla' : 'Payment not completed')
    : (cz ? 'Objednávku připravujeme' : 'Preparing your order');

  const note = isCancelled
    ? (cz ? 'Objednávka byla zrušena. Pokud jste už platili, peníze Vám vrátíme. S dotazy se nám ozvěte na info@northvaletcg.eu.' : 'This order was cancelled. If you already paid, we will refund you.')
    : isDelivered ? (cz ? 'Děkujeme za nákup! Pokud by bylo cokoli v nepořádku, ozvěte se nám.' : 'Thank you for your purchase!')
    : isShipped
      ? (isPickup
        ? (cz ? 'Zboží je připravené v prodejně ELEKTROOBCHOD Škrba, Bratří Čapků 1095, Holice. Otevírací doba Po–Pá 7:00–12:00 a 13:00–16:00.' : 'Your order is ready for pickup in Holice.')
        : (cz ? 'Zásilku jsme předali dopravci. Dopravce Vás bude informovat SMS a e-mailem o přesném doručení.' : 'We handed your parcel to the carrier.'))
    : (!paymentDone && isTransfer)
      ? (cz ? 'Jakmile platba dorazí na náš účet, objednávku zabalíme a odešleme. Platební údaje najdete níže.' : 'Once your payment arrives, we will pack and ship your order.')
    : !paymentDone
      ? (cz ? 'Platba kartou nebyla dokončena. Pokud chcete objednávku dokončit, napište nám prosím na info@northvaletcg.eu.' : 'Card payment was not completed.')
      : null;

  const created = o.createdAt ? new Date(o.createdAt) : null;
  const showEta = !isCancelled && !isShipped && paymentDone;
  const placeLine = isPickup
    ? 'ELEKTROOBCHOD Škrba, Bratří Čapků 1095, 534 01 Holice'
    : o.pickupPoint?.name
      ? [o.pickupPoint.name, [o.pickupPoint.street, [o.pickupPoint.zip, o.pickupPoint.city].filter(Boolean).join(' ')].filter(Boolean).join(', ')].filter(Boolean).join(' — ')
      : [o.address?.street, [o.address?.zip, o.address?.city].filter(Boolean).join(' ')].filter(Boolean).join(', ');

  return (
    <div className="order-confirm-wrapper">
      <div className="order-confirm-card">
        <div className="ov-eyebrow">{cz ? 'Stav objednávky' : 'Order status'}</div>
        <h1 className="ocf-title">{headline}</h1>
        <p className="ocf-num">
          {cz ? 'Číslo objednávky:' : 'Order ID:'} <span className="ocf-gold-text">#{o.id}</span>
          {created && !isNaN(created) && <span className="ov-date"> · {cz ? 'vytvořena' : 'placed'} {created.toLocaleDateString('cs-CZ')}</span>}
        </p>

        {/* Průběh objednávky */}
        {!isCancelled ? (
          <ol className="ov-steps" aria-label={cz ? 'Průběh objednávky' : 'Order progress'}>
            {steps.map((s, i) => (
              <li key={s.key} className={`ov-step ${s.done ? 'is-done' : ''} ${i === currentIndex ? 'is-current' : ''}`}>
                <span className="ov-dot" aria-hidden="true">
                  {s.done && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  )}
                </span>
                <span className="ov-step-label">{s.label}</span>
              </li>
            ))}
          </ol>
        ) : (
          <div className="ov-cancelled">{cz ? 'Stornováno' : 'Cancelled'}</div>
        )}

        {/* Doručení */}
        <div className="ocf-ship">
          <div className="ocf-ship-head">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
            <span>{isPickup ? (cz ? 'Osobní odběr' : 'Personal pickup') : (cz ? 'Doručení zásilky' : 'Delivery')}</span>
          </div>
          <p className="ocf-ship-method">
            {cz ? 'Způsob doručení: ' : 'Delivery method: '}<strong>{o.shippingMethod}</strong>
          </p>
          {placeLine && <p className="ov-place">{placeLine}</p>}
          {note && <p className="ocf-ship-note">{note}</p>}
          {showEta && (
            <p className="ov-eta">
              <span>
                {isPickup ? (cz ? 'K vyzvednutí obvykle do ' : 'Ready for pickup usually by ') : (cz ? 'U vás obvykle do ' : 'Usually delivered by ')}
                <strong>{formatDeliveryDate(estimateDeliveryDate(new Date(), { personalPickup: isPickup }), lang)}</strong>
              </span>
            </p>
          )}
          {o.tracking && (
            <a className="ocf-btn-ghost ov-track" href={o.tracking.url} target="_blank" rel="noopener noreferrer">
              {cz ? `Sledovat zásilku ${o.tracking.carrier}` : `Track ${o.tracking.carrier} parcel`} · {o.tracking.number}
            </a>
          )}
        </div>

        {/* Platba převodem — jen dokud nedorazila */}
        {isTransfer && !isPaid && !isCancelled && (
          <div className="ov-pay">
            <div className="ov-pay-text">
              <div className="ocf-ship-head" style={{ marginBottom: '14px' }}>
                <span>{cz ? 'Pokyny k platbě převodem' : 'Bank transfer details'}</span>
              </div>
              <table className="ov-pay-table">
                <tbody>
                  <tr><td>{cz ? 'Číslo účtu' : 'Account'}</td><td>1854161005/2700</td></tr>
                  <tr><td>{cz ? 'Částka k úhradě' : 'Amount'}</td><td className="ov-gold">{kc(o.finalTotal)}</td></tr>
                  <tr><td>{cz ? 'Variabilní symbol' : 'Variable symbol'}</td><td>{o.id}</td></tr>
                </tbody>
              </table>
            </div>
            <div className="ov-qr">
              <img
                src={`https://api.paylibo.com/paylibo/generator/czech/image?accountNumber=1854161005&bankCode=2700&amount=${o.finalTotal}&currency=CZK&vs=${o.id}&size=150`}
                alt={cz ? 'QR kód pro platbu' : 'Payment QR code'}
                width="150" height="150"
              />
              <span>{cz ? 'Platba přes QR kód' : 'Pay via QR code'}</span>
            </div>
          </div>
        )}

        {/* Přehled objednávky — stejně jako na potvrzení */}
        <div className="ocf-summary">
          <div className="ocf-summary-label">{cz ? 'Přehled objednávky' : 'Order summary'}</div>
          {o.items.map((item, i) => (
            <div className="ocf-irow" key={i}>
              <span className="ocf-iname">
                {item.name}
                <span className="ocf-iqty"> ({item.quantity}×)</span>
              </span>
              <span className="ocf-iprice">{kc(item.price * item.quantity)}</span>
            </div>
          ))}
          {o.discountAmount > 0 && (
            <div className="ocf-srow" style={{ color: '#10B981' }}>
              <span>{cz ? 'Sleva' : 'Discount'}{o.discountCode ? ` (${o.discountCode})` : ''}:</span>
              <span>−{kc(o.discountAmount)}</span>
            </div>
          )}
          <div className="ocf-srow">
            <span>{cz ? 'Doprava:' : 'Shipping:'}</span>
            <span>{o.shippingCost > 0 ? kc(o.shippingCost) : (cz ? 'Zdarma' : 'Free')}</span>
          </div>
          {o.paymentSurcharge !== 0 && (
            <div className="ocf-srow" style={o.paymentSurcharge < 0 ? { color: '#10B981' } : undefined}>
              <span>{paymentAdjustmentLabel(o.paymentSurcharge, lang)}:</span>
              <span>{o.paymentSurcharge < 0 ? '−' : ''}{kc(Math.abs(o.paymentSurcharge))}</span>
            </div>
          )}
          {o.creditApplied > 0 && (
            <div className="ocf-srow" style={{ color: '#10B981' }}>
              <span>{cz ? 'Uplatněný kredit:' : 'Credit applied:'}</span>
              <span>−{kc(o.creditApplied)}</span>
            </div>
          )}
          <div className="ocf-total">
            <span>
              {isTransfer && !isPaid ? (cz ? 'Celkem k úhradě:' : 'Total to pay:')
                : isCod ? (cz ? 'Celkem k úhradě při převzetí:' : 'Payable on delivery:')
                : (cz ? 'Celkem:' : 'Total:')}
            </span>
            <span className="ocf-total-val">
              {Number(o.finalTotal).toLocaleString('cs-CZ')} <span style={{ fontSize: '18px', fontWeight: '700' }}>Kč</span>
            </span>
          </div>
          <p className="ov-pm">{cz ? 'Způsob platby:' : 'Payment:'} {o.paymentMethod}</p>
        </div>

        <p className="ocf-email">
          {cz ? <>Máte účet? Všechny objednávky najdete v sekci <button type="button" className="ov-link" onClick={() => setActivePage('profile')}>Moje objednávky</button>.</>
            : <>Have an account? See all orders in <button type="button" className="ov-link" onClick={() => setActivePage('profile')}>My Orders</button>.</>}
          <br />
          {cz ? <>Nevíte si s něčím rady? Nejčastější dotazy najdete <button type="button" className="ov-link" onClick={() => setActivePage('faq')}>zde</button>.</>
            : <>Need help? See our <button type="button" className="ov-link" onClick={() => setActivePage('faq')}>FAQ</button>.</>}
        </p>

        <div className="ocf-actions">
          <button type="button" className="ocf-btn-primary" onClick={() => setActivePage('home')}>{cz ? 'Pokračovat v nákupu' : 'Continue shopping'}</button>
          <a className="ocf-btn-ghost" href="mailto:info@northvaletcg.eu" style={{ textDecoration: 'none' }}>{cz ? 'Napsat nám' : 'Contact us'}</a>
        </div>
      </div>
      <style>{ORDER_PAGE_CSS + OV_CSS}</style>
    </div>
  );
}

// Doplňky jen pro stránku stavu objednávky (zbytek sdílí s potvrzením)
const OV_CSS = `
  .ov-loading { width: 28px; height: 28px; }
  .ov-eyebrow {
    font-size: 12px; font-weight: 600; letter-spacing: 0.18em; text-transform: uppercase;
    color: #FDBD16; margin-bottom: 14px;
  }
  .ov-date { color: #8A8A92; }
  .ov-steps {
    list-style: none; margin: 0 0 40px; padding: 0; width: 100%;
    display: grid; grid-template-columns: repeat(4, 1fr);
  }
  .ov-step { position: relative; display: flex; flex-direction: column; align-items: center; gap: 10px; }
  .ov-step + .ov-step::before {
    content: ''; position: absolute; top: 12px; right: 50%; width: 100%; height: 2px;
    background: rgba(240, 240, 240, 0.1); z-index: 0;
  }
  .ov-step.is-done + .ov-step::before { background: #FDBD16; }
  .ov-dot {
    position: relative; z-index: 1; width: 26px; height: 26px; border-radius: 50%;
    display: inline-flex; align-items: center; justify-content: center;
    background: #18181C; border: 2px solid rgb(80, 80, 90); color: #1A1407; box-sizing: border-box;
  }
  .ov-dot svg { width: 13px; height: 13px; }
  .ov-step.is-done .ov-dot { background: #FDBD16; border-color: #FDBD16; }
  .ov-step.is-current .ov-dot { border-color: #FDBD16; box-shadow: 0 0 0 5px rgba(253, 189, 22, 0.14); }
  .ov-step-label { font-size: 12.5px; font-weight: 600; color: #50505A; }
  .ov-step.is-done .ov-step-label, .ov-step.is-current .ov-step-label { color: #F0F0F0; }
  .ov-cancelled {
    margin: 0 0 36px; padding: 8px 16px; border-radius: 999px; font-size: 13px; font-weight: 700;
    color: #f87171; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3);
  }
  .ov-place { font-size: 14.5px; color: #F0F0F0; margin: -6px 0 14px; line-height: 1.5; }
  .ov-eta {
    display: flex; align-items: center; gap: 8px; margin: 14px 0 0; font-size: 14px; color: #8A8A92;
  }
  .ov-eta::before {
    content: ''; width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0;
    background: #10B981; box-shadow: 0 0 6px rgba(16, 185, 129, 0.6);
  }
  .ov-eta strong { color: #10B981; font-weight: 600; }
  .ov-track { margin-top: 18px; display: inline-flex; text-decoration: none; height: 44px; font-size: 13.5px; }
  .ov-pay {
    width: 100%; display: flex; flex-wrap: wrap; gap: 24px; align-items: center; text-align: left;
    padding-bottom: 32px; margin-bottom: 32px; border-bottom: 1px solid rgba(240, 240, 240, 0.07);
  }
  .ov-pay-text { flex: 1 1 280px; }
  .ov-pay-table { width: 100%; font-size: 14px; border-collapse: collapse; color: #F0F0F0; }
  .ov-pay-table td { padding: 9px 0; border-bottom: 1px solid rgba(240, 240, 240, 0.05); }
  .ov-pay-table td:first-child { color: #8A8A92; }
  .ov-pay-table td:last-child { text-align: right; font-weight: 700; font-variant-numeric: tabular-nums; }
  .ov-gold { color: #FDBD16; }
  .ov-qr { flex: 0 0 150px; margin: 0 auto; display: flex; flex-direction: column; align-items: center; gap: 8px; }
  .ov-qr img { width: 150px; height: 150px; background: #fff; padding: 6px; border-radius: 4px; box-sizing: content-box; }
  .ov-qr span { font-size: 11px; color: #8A8A92; font-weight: 500; }
  .ov-pm { font-size: 13px; color: #8A8A92; margin: 14px 0 0; text-align: right; }
  .ov-link {
    background: none; border: none; padding: 0; font: inherit; color: #FDBD16; font-weight: 600;
    text-decoration: underline; text-underline-offset: 3px; cursor: pointer;
  }
  @media (max-width: 480px) {
    .ov-step-label { font-size: 11px; }
    .ov-track { width: 100%; justify-content: center; }
  }
`;
