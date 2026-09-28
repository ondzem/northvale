import { useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * Okno „Hlídací pes“ na detailu produktu.
 * Vzhled: výběr jako v pokladně (zlatá tečka, tenké linky), nadpisy sekcí
 * jako v okně „Možnosti doručení“. Stav drží SealedDetail.
 */
export default function WatchdogModal({
  lang = 'CZ',
  productName,
  currentPrice,
  productAvailable,
  type, onTypeChange,
  priceLimit, onPriceLimitChange,
  email, onEmailChange,
  consent, onConsentChange,
  submitting,
  onSubmit,
  onClose
}) {
  const cz = lang === 'CZ';

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const priceText = Number(currentPrice || 0).toLocaleString(cz ? 'cs-CZ' : 'en-US');
  const options = [
    {
      id: 'stock',
      name: cz ? 'Bude znovu skladem' : 'Back in stock',
      desc: productAvailable
        ? (cz ? 'Produkt je teď skladem — můžete ho rovnou objednat.' : 'This product is in stock right now.')
        : (cz ? 'Pošleme e-mail, jakmile produkt naskladníme.' : 'We will e-mail you as soon as it is back.'),
      disabled: productAvailable
    },
    {
      id: 'sale',
      name: cz ? 'Bude v akci' : 'Goes on sale',
      desc: cz ? 'Dáme vědět, až bude produkt v akci se slevou.' : 'We will let you know when it is on sale.'
    },
    {
      id: 'price',
      name: cz ? 'Cena klesne pod' : 'Price drops below',
      desc: cz ? `Aktuální cena je ${priceText} Kč.` : `Current price is ${priceText} CZK.`
    }
  ];

  return createPortal(
    <div className="product-modal-overlay" onClick={onClose}>
      <div className="product-modal-container wdg" role="dialog" aria-modal="true" aria-labelledby="wdg-title" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="product-modal-close" onClick={onClose} aria-label={cz ? 'Zavřít' : 'Close'}>✕</button>

        <div className="wdg-head">
          <h3 className="product-modal-title wdg-title" id="wdg-title">{cz ? 'Hlídací pes' : 'Watchdog'}</h3>
          <p className="wdg-product">{productName}</p>
        </div>

        <form onSubmit={onSubmit} noValidate={false}>
          <h4 className="dmo-heading">{cz ? 'Upozornit mě, když' : 'Notify me when'}</h4>
          <div className="wdg-options" role="radiogroup">
            {options.map((o) => {
              const active = type === o.id;
              return (
                <div key={o.id} className={`wdg-option ${active ? 'is-active' : ''} ${o.disabled ? 'is-disabled' : ''}`}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={active}
                    disabled={o.disabled}
                    className="wdg-option-btn"
                    onClick={() => onTypeChange(o.id)}
                  >
                    <span className="wdg-dot" aria-hidden="true" />
                    <span className="wdg-option-body">
                      <span className="wdg-option-name">{o.name}</span>
                      <span className="wdg-option-desc">{o.desc}</span>
                    </span>
                  </button>
                  {o.id === 'price' && active && (
                    <label className="wdg-price">
                      <input
                        type="number"
                        min="1"
                        step="1"
                        required
                        autoFocus
                        className="login-form-input"
                        value={priceLimit}
                        onChange={(e) => onPriceLimitChange(e.target.value)}
                        placeholder={cz ? 'Např. 1 999' : 'e.g. 1999'}
                        aria-label={cz ? 'Cenový limit' : 'Price limit'}
                      />
                      <span>{cz ? 'Kč' : 'CZK'}</span>
                    </label>
                  )}
                </div>
              );
            })}
          </div>

          <h4 className="dmo-heading wdg-email-label">
            <label htmlFor="wdg-email">{cz ? 'E-mail pro upozornění' : 'E-mail for the alert'}</label>
          </h4>
          <input
            id="wdg-email"
            type="email"
            required
            autoComplete="email"
            className="login-form-input wdg-email"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            placeholder="jmeno@example.com"
          />

          <label className="wdg-consent">
            <input type="checkbox" required checked={consent} onChange={(e) => onConsentChange(e.target.checked)} />
            <span>
              {cz
                ? 'Souhlasím, že mi na tento e-mail pošlete jedno upozornění k tomuto produktu. Hlídání můžete kdykoli zrušit odkazem v e-mailu.'
                : 'I agree to receive one alert about this product at this e-mail. I can cancel it anytime via the link in the e-mail.'}
            </span>
          </label>

          {/* Honeypot proti botům — člověk ho nevidí */}
          <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="wdg-hp" />

          <button type="submit" className="login-submit-btn wdg-submit" disabled={submitting}>
            {submitting
              ? <><span className="pr-spinner" aria-hidden="true" /> {cz ? 'Ukládám…' : 'Saving…'}</>
              : (cz ? 'Hlídat produkt' : 'Watch product')}
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
}
