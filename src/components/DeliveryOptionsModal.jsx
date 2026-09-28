import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  SHIPPING_OPTIONS,
  FREE_SHIPPING_THRESHOLD,
  COD_SURCHARGE,
  TRANSFER_DISCOUNT
} from '../config';

/**
 * Okno „Možnosti doručení“ na detailu produktu.
 * Zákazník vidí způsoby dopravy s cenami, kolik mu s tímto produktem
 * zbývá do dopravy zdarma a poplatky za platbu — bez opuštění produktu.
 */
export default function DeliveryOptionsModal({ price = 0, deliveryTime, isOnOrder, lang = 'CZ', onClose, onOpenTerms }) {
  // Zavření klávesou Esc
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const cz = lang === 'CZ';
  const L = cz ? 'CZ' : 'EN';
  const kc = (n) => `${Number(n).toLocaleString(cz ? 'cs-CZ' : 'en-US')} ${cz ? 'Kč' : 'CZK'}`;

  const isFree = price >= FREE_SHIPPING_THRESHOLD;
  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - price);
  const progress = Math.min(100, Math.round((price / FREE_SHIPPING_THRESHOLD) * 100));

  const payments = [
    { name: cz ? 'Platba kartou (platební brána)' : 'Card payment (gateway)', fee: cz ? 'Zdarma' : 'Free', tone: 'free' },
    { name: cz ? 'QR kód / bankovní převod' : 'QR code / bank transfer', fee: `−${kc(TRANSFER_DISCOUNT)}`, tone: 'free' },
    { name: cz ? 'Dobírka' : 'Cash on delivery', fee: `+${kc(COD_SURCHARGE)}`, tone: 'fee',
      note: cz ? 'Neplatí pro osobní odběr.' : 'Not available for personal pickup.' }
  ];

  // Do <body>, aby okno nepřekryla lepkavá horní lišta (viz SealedDetail).
  return createPortal(
    <div className="product-modal-overlay" onClick={onClose}>
      <div
        className="product-modal-container dmo"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dmo-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="product-modal-close" onClick={onClose} aria-label={cz ? 'Zavřít' : 'Close'}>✕</button>
        <h3 className="product-modal-title" id="dmo-title">{cz ? 'Možnosti doručení' : 'Delivery options'}</h3>

        {/* Doprava zdarma — vztaženo k tomuto produktu */}
        <div className={`dmo-free ${isFree ? 'is-met' : ''}`}>
          {isFree ? (
            <p><strong>{cz ? 'S tímto produktem máte dopravu zdarma.' : 'This product qualifies for free shipping.'}</strong></p>
          ) : (
            <p>
              {cz ? 'Doprava zdarma od ' : 'Free shipping from '}<strong>{kc(FREE_SHIPPING_THRESHOLD)}</strong>
              {cz ? ' — s tímto produktem zbývá ' : ' — with this product you need '}<strong>{kc(remaining)}</strong>
              {cz ? '.' : ' more.'}
            </p>
          )}
          <div className="dmo-bar" aria-hidden="true"><span style={{ width: `${progress}%` }} /></div>
          <p className="dmo-sub">{cz ? 'Platí pro DPD a GLS.' : 'Applies to DPD and GLS.'}</p>
        </div>

        <p className="dmo-dispatch">
          {isOnOrder
            ? (cz
              ? <>Zboží na objednávku — odešleme {deliveryTime ? <>obvykle do <strong>{deliveryTime}</strong></> : 'po naskladnění'} od zaplacení.</>
              : <>Made to order — usually ships {deliveryTime ? <>within <strong>{deliveryTime}</strong></> : 'once in stock'} after payment.</>)
            : (cz ? <>Skladem zboží <strong>odesíláme do 48 hodin</strong> v pracovní dny.</> : <>In-stock items <strong>ship within 48 hours</strong> on business days.</>)}
        </p>

        <h4 className="dmo-heading">{cz ? 'Doprava' : 'Shipping'}</h4>
        <ul className="dmo-list">
          {SHIPPING_OPTIONS.map((o) => {
            const free = o.price === 0 || (o.carrier && isFree);
            return (
              <li key={o.id} className="dmo-row">
                <div className="dmo-row-text">
                  <span className="dmo-row-name">{o.name[L]}</span>
                  <span className="dmo-row-desc">{o.desc[L]}</span>
                </div>
                <span className={`dmo-price ${free ? 'is-free' : ''}`}>
                  {free ? (cz ? 'Zdarma' : 'Free') : kc(o.price)}
                  {free && o.price > 0 && <s>{kc(o.price)}</s>}
                </span>
              </li>
            );
          })}
        </ul>

        <h4 className="dmo-heading">{cz ? 'Platba' : 'Payment'}</h4>
        <ul className="dmo-list">
          {payments.map((p) => (
            <li key={p.name} className="dmo-row">
              <div className="dmo-row-text">
                <span className="dmo-row-name">{p.name}</span>
                {p.note && <span className="dmo-row-desc">{p.note}</span>}
              </div>
              <span className={`dmo-price ${p.tone === 'free' ? 'is-free' : ''}`}>{p.fee}</span>
            </li>
          ))}
        </ul>

        <p className="dmo-foot">
          {cz ? 'Doručujeme po celé České republice.' : 'We deliver across the Czech Republic.'}{' '}
          <button type="button" className="dmo-link" onClick={onOpenTerms}>
            {cz ? 'Kompletní podmínky dopravy a platby →' : 'Full shipping & payment terms →'}
          </button>
        </p>
      </div>
    </div>
  , document.body);
}
