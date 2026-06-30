import React from 'react';
import { useTranslation } from '../context/LanguageContext';

export default function OrderConfirmation({ order, setActivePage }) {
  const { lang } = useTranslation();

  if (!order) {
    return (
      <div className="order-confirm-wrapper" style={{ padding: '80px 24px', textAlign: 'center', background: '#18181C', minHeight: '80vh', color: '#F0F0F0' }}>
        <div className="order-confirm-card" style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h2>{lang === 'CZ' ? 'Objednávka nenalezena' : 'Order Not Found'}</h2>
          <p style={{ color: '#8A8A92', marginTop: '10px' }}>{lang === 'CZ' ? 'Nebyly nalezeny žádné podrobnosti o objednávce.' : 'No order details were found.'}</p>
          <button className="ocf-btn-primary" style={{ marginTop: '20px' }} onClick={() => setActivePage('home')}>
            {lang === 'CZ' ? 'Zpět do obchodu' : 'Back to Shop'}
          </button>
        </div>
      </div>
    );
  }

  const isPersonalPickup = order.shippingMethod && (
    order.shippingMethod.includes('Osobní') || 
    order.shippingMethod.includes('Local Pickup') ||
    order.shippingMethod.includes('Pardubice') ||
    order.shippingMethod.includes('Holice')
  );

  const isBankTransfer = order.paymentMethod && (
    order.paymentMethod.toLowerCase().includes('převod') ||
    order.paymentMethod.toLowerCase().includes('transfer')
  );

  return (
    <div className="order-confirm-wrapper">
      <div className="order-confirm-card">
        {/* Checkmark Icon */}
        <div className="ocf-check">
          <svg viewBox="0 0 52 52" fill="none" aria-hidden="true" width="84" height="84">
            <circle className="ocf-check-ring" cx="26" cy="26" r="23" stroke="#10B981" strokeWidth="2.2" fill="none" />
            <path className="ocf-check-tick" d="M16 27l7 7 14-15" stroke="#10B981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
        </div>

        {/* Title */}
        <h1 className="ocf-title">
          {lang === 'CZ' ? 'Děkujeme za objednávku!' : 'Thank you for your order!'}
        </h1>

        {/* Order Number */}
        <p className="ocf-num">
          {lang === 'CZ' ? 'Číslo objednávky: ' : 'Order ID: '}
          <span className="ocf-gold-text">#{order.id}</span>
        </p>

        {/* Shipping details container */}
        <div className="ocf-ship">
          <div className="ocf-ship-head">
            {isPersonalPickup ? (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <span>{lang === 'CZ' ? 'Osobní odběr — Holice' : 'Personal Pickup — Holice'}</span>
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                  <line x1="12" y1="22.08" x2="12" y2="12" />
                </svg>
                <span>{lang === 'CZ' ? 'Doručení zásilky' : 'Shipping Delivery'}</span>
              </>
            )}
          </div>
          
          <p className="ocf-ship-method">
            {lang === 'CZ' ? 'Způsob doručení: ' : 'Delivery Method: '}
            <strong>{order.shippingMethod}</strong>
          </p>

          <p className="ocf-ship-note">
            {isPersonalPickup ? (
              lang === 'CZ' 
                ? 'Zboží pro Vás začínáme připravovat. Jakmile bude objednávka připravena k vyzvednutí na naší kontaktní adrese Bratří Čapků 1095, 534 01 Holice, zašleme Vám e-mail a SMS.'
                : 'We are preparing your items. As soon as your order is ready for pickup at our contact address Bratří Čapků 1095, 534 01 Holice, we will send you an email and SMS.'
            ) : isBankTransfer ? (
              lang === 'CZ'
                ? 'Objednávku jsme úspěšně přijali a nyní čeká na zaplacení. Jakmile obdržíme Vaši platbu na náš účet, zboží okamžitě zabalíme a předáme dopravci.'
                : 'Your order has been successfully received and is now pending payment. Once the payment is cleared on our account, we will immediately pack and ship your items.'
            ) : (
              lang === 'CZ'
                ? 'Vaše platba byla úspěšně přijata. Objednávku zpracujeme a předáme dopravci v nejbližším možném termínu. Sledujte prosím svůj e-mail pro sledovací číslo zásilky.'
                : 'Your payment was successfully received. We will process your order and hand it over to the carrier as soon as possible. Please check your email for the shipment tracking number.'
            )}
          </p>
        </div>

        {/* Bank transfer payment box */}
        {isBankTransfer && (
          <div style={{
            width: '100%',
            background: 'transparent',
            border: 'none',
            borderRadius: '0',
            padding: '0',
            marginBottom: '36px',
            textAlign: 'left',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '24px',
            alignItems: 'center'
          }}>
            <div style={{ flex: '1 1 300px' }}>
              <div style={{ color: 'var(--nv-gold, #fdbd16)', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', marginBottom: '14px', letterSpacing: '0.05em', fontFamily: 'Outfit, sans-serif' }}>
                💰 {lang === 'CZ' ? 'Pokyny k platbě převodem' : 'Bank Transfer Instructions'}
              </div>
              <p style={{ fontSize: '14px', color: '#8A8A92', margin: '0 0 16px 0', lineHeight: '1.5' }}>
                {lang === 'CZ' 
                  ? 'Zašlete prosím celkovou částku na náš účet. Jako variabilní symbol použijte číslo objednávky.' 
                  : 'Please send the total amount to our account. Use the Order ID as the variable symbol.'}
              </p>
              
              <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'collapse', color: '#F0F0F0' }}>
                <tbody>
                  <tr style={{ borderBottom: '1px solid rgba(240, 240, 240, 0.05)' }}>
                    <td style={{ padding: '8px 0', color: '#8A8A92' }}>{lang === 'CZ' ? 'Číslo účtu:' : 'Account Number:'}</td>
                    <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 'bold' }}>1854161005/2700</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(240, 240, 240, 0.05)' }}>
                    <td style={{ padding: '8px 0', color: '#8A8A92' }}>{lang === 'CZ' ? 'Částka k úhradě:' : 'Amount to Pay:'}</td>
                    <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 'bold', color: 'var(--nv-gold, #fdbd16)', fontFamily: 'monospace', fontSize: '16px' }}>{order.finalTotal.toLocaleString('cs-CZ')} Kč</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(240, 240, 240, 0.05)' }}>
                    <td style={{ padding: '8px 0', color: '#8A8A92' }}>{lang === 'CZ' ? 'Variabilní symbol:' : 'Variable Symbol:'}</td>
                    <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 'bold', fontFamily: 'monospace', fontSize: '16px' }}>{order.id}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style={{ flex: '0 0 150px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <img 
                src={`https://api.paylibo.com/paylibo/generator/czech/image?accountNumber=1854161005&bankCode=2700&amount=${order.finalTotal}&currency=CZK&vs=${order.id}&size=150`}
                alt="QR Code"
                style={{ width: '150px', height: '150px', background: '#fff', padding: '6px', borderRadius: '4px', border: 'none' }}
              />
              <span style={{ fontSize: '11px', color: '#8A8A92', fontWeight: '500' }}>
                {lang === 'CZ' ? 'Platba přes QR kód' : 'Pay via QR Code'}
              </span>
            </div>
          </div>
        )}

        {/* Order Summary */}
        <div className="ocf-summary">
          <div className="ocf-summary-label">
            {lang === 'CZ' ? 'Přehled objednávky' : 'Order Summary'}
          </div>

          {order.items && order.items.map((item, index) => (
            <div className="ocf-irow" key={index}>
              <span className="ocf-iname">
                {item.name}
                <span className="ocf-iqty"> ({item.quantity}×)</span>
              </span>
              <span className="ocf-iprice">{(item.price * item.quantity).toLocaleString('cs-CZ')} Kč</span>
            </div>
          ))}

          {order.shippingCost > 0 && (
            <div className="ocf-srow">
              <span>{lang === 'CZ' ? 'Dopravné:' : 'Shipping:'}</span>
              <span>{order.shippingCost.toLocaleString('cs-CZ')} Kč</span>
            </div>
          )}

          {order.paymentSurcharge > 0 && (
            <div className="ocf-srow">
              <span>{lang === 'CZ' ? 'Dobírkový příplatek:' : 'Cash on Delivery Surcharge:'}</span>
              <span>{order.paymentSurcharge.toLocaleString('cs-CZ')} Kč</span>
            </div>
          )}

          {order.creditApplied > 0 && (
            <div className="ocf-srow" style={{ color: '#10B981' }}>
              <span>{lang === 'CZ' ? 'Uplatněný kredit:' : 'Credit Applied:'}</span>
              <span>-{order.creditApplied.toLocaleString('cs-CZ')} Kč</span>
            </div>
          )}

          <div className="ocf-total">
            <span>{lang === 'CZ' ? 'Celkem zaplaceno:' : 'Total Paid:'}</span>
            <span className="ocf-total-val">
              {order.finalTotal.toLocaleString('cs-CZ')} <span style={{ fontSize: '18px', fontWeight: '700' }}>Kč</span>
            </span>
          </div>
        </div>

        {/* Disclaimer */}
        <p className="ocf-email">
          {lang === 'CZ' 
            ? 'Potvrzení objednávky a daňový doklad (faktura) Vám byly zaslány na e-mail.' 
            : 'Order confirmation and tax invoice have been sent to your email.'}
        </p>

        {/* Actions */}
        <div className="ocf-actions">
          <button type="button" className="ocf-btn-primary" onClick={() => setActivePage('home')}>
            {lang === 'CZ' ? 'Pokračovat v nákupu' : 'Continue Shopping'}
          </button>
          <button type="button" className="ocf-btn-ghost" onClick={() => setActivePage('profile')}>
            {lang === 'CZ' ? 'Zobrazit mé objednávky' : 'View My Orders'}
          </button>
        </div>
      </div>

      <style>{`
        .order-confirm-wrapper {
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 64px 24px;
          min-height: 80vh;
          background-color: #18181C;
          font-family: "Inter Tight", system-ui, sans-serif;
          color: #F0F0F0;
        }

        .order-confirm-card {
          width: 100%;
          max-width: 600px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .ocf-check {
          width: 84px;
          height: 84px;
          margin-bottom: 28px;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .ocf-check-ring {
          stroke-dasharray: 150;
          stroke-dashoffset: 150;
          animation: ring-draw 0.6s ease-out forwards;
        }

        .ocf-check-tick {
          stroke-dasharray: 50;
          stroke-dashoffset: 50;
          animation: checkmark-draw 0.4s ease-out 0.4s forwards;
        }

        @keyframes ring-draw {
          to {
            stroke-dashoffset: 0;
          }
        }

        @keyframes checkmark-draw {
          to {
            stroke-dashoffset: 0;
          }
        }

        .ocf-title {
          font-size: 38px;
          font-weight: 800;
          color: #F0F0F0;
          margin: 0 0 14px 0;
          line-height: 1.2;
          font-family: "Outfit", "Inter Tight", sans-serif;
        }

        .ocf-num {
          font-size: 16px;
          color: #8A8A92;
          margin: 0 0 44px 0;
        }

        .ocf-gold-text {
          color: #FDBD16;
          font-weight: 700;
          margin-left: 4px;
        }

        .ocf-ship {
          width: 100%;
          border-top: 1px solid rgba(240, 240, 240, 0.07);
          border-bottom: 1px solid rgba(240, 240, 240, 0.07);
          padding: 24px 0;
          margin-bottom: 36px;
          text-align: left;
        }

        .ocf-ship-head {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #FDBD16;
          font-size: 13px;
          font-weight: 700;
          text-transform: uppercase;
          margin-bottom: 18px;
          letter-spacing: 0.05em;
        }

        .ocf-ship-method {
          font-size: 17px;
          color: #F0F0F0;
          margin: 0 0 14px 0;
        }

        .ocf-ship-note {
          font-size: 14.5px;
          line-height: 1.6;
          color: #8A8A92;
          margin: 0;
        }

        .ocf-summary {
          width: 100%;
          text-align: left;
          margin-bottom: 32px;
        }

        .ocf-summary-label {
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          color: #50505A;
          margin-bottom: 18px;
          letter-spacing: 0.05em;
        }

        .ocf-irow {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          padding: 4px 0 18px 0;
          font-size: 16px;
          color: #F0F0F0;
        }

        .ocf-iname {
          font-weight: 600;
        }

        .ocf-iqty {
          color: #50505A;
          font-size: 14px;
          font-weight: 400;
        }

        .ocf-iprice {
          font-weight: 600;
          font-variant-numeric: tabular-nums;
        }

        .ocf-srow {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          padding: 16px 0;
          border-top: 1px solid rgba(240, 240, 240, 0.07);
          font-size: 15px;
          color: #8A8A92;
        }

        .ocf-total {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          padding: 16px 0 0 0;
          border-top: 1px solid rgba(240, 240, 240, 0.07);
          font-size: 16px;
          color: #F0F0F0;
          font-weight: 700;
        }

        .ocf-total-val {
          font-size: 26px;
          font-weight: 800;
          color: #FDBD16;
          font-variant-numeric: tabular-nums;
        }

        .ocf-email {
          font-size: 13.5px;
          line-height: 1.6;
          color: #8A8A92;
          margin: 0 0 28px 0;
          text-align: center;
        }

        .ocf-actions {
          display: flex;
          gap: 16px;
          justify-content: center;
          width: 100%;
        }

        .ocf-btn-primary {
          background-color: #FDBD16;
          color: #1A1407;
          border: none;
          height: 49px;
          border-radius: 11px;
          font-size: 14px;
          font-weight: 700;
          padding: 0 30px;
          cursor: pointer;
          transition: background-color 0.16s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .ocf-btn-primary:hover {
          background-color: #E2A80F;
        }

        .ocf-btn-ghost {
          background-color: transparent;
          color: #F0F0F0;
          border: 1px solid rgba(240, 240, 240, 0.12);
          height: 49px;
          border-radius: 11px;
          font-size: 14px;
          font-weight: 600;
          padding: 0 30px;
          cursor: pointer;
          transition: border-color 0.16s ease, background-color 0.16s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .ocf-btn-ghost:hover {
          border-color: rgba(240, 240, 240, 0.3);
          background-color: rgba(255, 255, 255, 0.02);
        }

        @media (max-width: 480px) {
          .ocf-title {
            font-size: 32px;
          }
          .ocf-actions {
            flex-direction: column;
            gap: 12px;
          }
          .ocf-btn-primary, .ocf-btn-ghost {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
