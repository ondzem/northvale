import React from 'react';
import { useTranslation } from '../context/LanguageContext';

export default function OrderConfirmation({ order, setActivePage }) {
  const { lang } = useTranslation();

  if (!order) {
    return (
      <div className="order-confirm-wrapper" style={{ padding: '80px 24px', textAlign: 'center' }}>
        <div className="order-confirm-card">
          <h2>{lang === 'CZ' ? 'Objednávka nenalezena' : 'Order Not Found'}</h2>
          <p>{lang === 'CZ' ? 'Nebyly nalezeny žádné podrobnosti o objednávce.' : 'No order details were found.'}</p>
          <button className="nv-btn nv-btn-primary" style={{ marginTop: '20px' }} onClick={() => setActivePage('home')}>
            {lang === 'CZ' ? 'Zpět do obchodu' : 'Back to Shop'}
          </button>
        </div>
      </div>
    );
  }

  const isPersonalPickup = order.shippingMethod && (
    order.shippingMethod.includes('Osobní') || 
    order.shippingMethod.includes('Local Pickup') ||
    order.shippingMethod.includes('Pardubice')
  );

  return (
    <div className="order-confirm-wrapper">
      <div className="order-confirm-card">
        {/* Animated Checkmark Icon */}
        <div className="success-checkmark-container">
          <div className="success-checkmark">
            <div className="check-icon">
              <span className="icon-line line-tip"></span>
              <span className="icon-line line-long"></span>
              <div className="icon-circle"></div>
              <div className="icon-fix"></div>
            </div>
          </div>
        </div>

        <h1 className="confirm-title">{lang === 'CZ' ? 'Děkujeme za objednávku!' : 'Thank you for your order!'}</h1>
        <p className="confirm-order-id">
          {lang === 'CZ' ? 'Číslo objednávky:' : 'Order ID:'} <strong>#{order.id}</strong>
        </p>

        {/* Dynamic Delivery/Pickup Information Box */}
        <div className="instructions-box">
          {isPersonalPickup ? (
            <>
              <h3>📍 {lang === 'CZ' ? 'Pokyny k osobnímu odběru' : 'Personal Pickup Instructions'}</h3>
              <p className="pickup-address">
                <strong>NORTHVALE s.r.o.</strong><br />
                Bratří Čapků 1095, 534 01 Holice
              </p>
              <p className="pickup-note">
                {lang === 'CZ'
                  ? 'Zboží pro Vás začínáme připravovat. Jakmile bude objednávka připravena k vyzvednutí, zašleme Vám potvrzovací e-mail a SMS.'
                  : 'We are preparing your items. As soon as your order is ready for collection, we will send you a confirmation email and SMS.'}
              </p>
            </>
          ) : (
            <>
              <h3>📦 {lang === 'CZ' ? 'Doručení zásilky' : 'Shipping Information'}</h3>
              <p>
                {lang === 'CZ' ? 'Způsob doručení:' : 'Shipping Method:'} <strong>{order.shippingMethod}</strong>
              </p>
              <p className="pickup-note">
                {lang === 'CZ'
                  ? 'Vaše platba byla úspěšně přijata. Objednávku zpracujeme a předáme dopravci v nejbližším možném termínu. Sledujte prosím svůj e-mail pro sledovací číslo zásilky.'
                  : 'Your payment was successfully received. We will process your order and hand it over to the carrier as soon as possible. Please check your email for the shipment tracking number.'}
              </p>
            </>
          )}
        </div>

        {/* Order Summary Box */}
        <div className="confirm-order-summary">
          <h4>{lang === 'CZ' ? 'Přehled objednávky' : 'Order Summary'}</h4>
          <div className="summary-items-list">
            {order.items && order.items.map((item, index) => (
              <div className="summary-item-row" key={index}>
                <span>{item.name} <span className="item-qty">({item.quantity}x)</span></span>
                <span>{(item.price * item.quantity).toLocaleString()} Kč</span>
              </div>
            ))}
          </div>

          <hr className="summary-divider" />

          {order.shippingCost > 0 && (
            <div className="summary-cost-row">
              <span>{lang === 'CZ' ? 'Dopravné:' : 'Shipping:'}</span>
              <span>{order.shippingCost.toLocaleString()} Kč</span>
            </div>
          )}

          {order.paymentSurcharge > 0 && (
            <div className="summary-cost-row">
              <span>{lang === 'CZ' ? 'Příplatek:' : 'Surcharge:'}</span>
              <span>{order.paymentSurcharge.toLocaleString()} Kč</span>
            </div>
          )}

          {order.creditApplied > 0 && (
            <div className="summary-cost-row credit-row">
              <span>{lang === 'CZ' ? 'Uplatněný kredit:' : 'Credit Applied:'}</span>
              <span>-{order.creditApplied.toLocaleString()} Kč</span>
            </div>
          )}

          <div className="summary-total-row">
            <span>{lang === 'CZ' ? 'Celkem zaplaceno:' : 'Total Paid:'}</span>
            <span className="total-amount">{order.finalTotal.toLocaleString()} Kč</span>
          </div>
        </div>

        <p className="email-disclaimer">
          {lang === 'CZ' 
            ? 'Potvrzení objednávky a daňový doklad (faktura) Vám byly zaslány na e-mail.' 
            : 'Order confirmation and tax invoice have been sent to your email.'}
        </p>

        {/* Action Buttons */}
        <div className="confirm-actions">
          <button className="nv-btn nv-btn-primary" onClick={() => setActivePage('home')}>
            {lang === 'CZ' ? 'Pokračovat v nákupu' : 'Continue Shopping'}
          </button>
          <button className="nv-btn" onClick={() => setActivePage('profile')}>
            {lang === 'CZ' ? 'Zobrazit mé objednávky' : 'View My Orders'}
          </button>
        </div>
      </div>

      <style>{`
        .order-confirm-wrapper {
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 60px 24px;
          min-height: 70vh;
          background: radial-gradient(circle at top, rgba(253, 189, 22, 0.05) 0%, transparent 60%);
        }
        .order-confirm-card {
          width: 100%;
          max-width: 580px;
          background: rgba(24, 24, 28, 0.7);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 40px;
          text-align: center;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        }
        .confirm-title {
          font-size: 26px;
          font-weight: 800;
          color: #fff;
          margin: 24px 0 8px 0;
          font-family: 'Outfit', sans-serif;
        }
        .confirm-order-id {
          font-size: 15px;
          color: #8a8a92;
          margin-bottom: 32px;
        }
        .confirm-order-id strong {
          color: var(--nv-gold, #fdbd16);
          font-size: 16px;
        }
        .instructions-box {
          background: rgba(253, 189, 22, 0.05);
          border: 1px solid rgba(253, 189, 22, 0.15);
          border-radius: 8px;
          padding: 24px;
          text-align: left;
          margin-bottom: 32px;
        }
        .instructions-box h3 {
          margin: 0 0 12px 0;
          font-size: 16px;
          color: var(--nv-gold, #fdbd16);
          font-weight: 700;
        }
        .pickup-address {
          font-size: 15px;
          line-height: 1.5;
          color: #fff;
          margin: 0 0 12px 0;
        }
        .pickup-note {
          font-size: 13.5px;
          line-height: 1.6;
          color: #b5b5be;
          margin: 0;
        }
        .confirm-order-summary {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.04);
          border-radius: 8px;
          padding: 24px;
          text-align: left;
          margin-bottom: 24px;
        }
        .confirm-order-summary h4 {
          margin: 0 0 16px 0;
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #8a8a92;
          font-weight: 700;
        }
        .summary-items-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .summary-item-row {
          display: flex;
          justify-content: space-between;
          font-size: 14px;
          color: #fff;
        }
        .item-qty {
          color: #8a8a92;
          font-size: 13px;
          margin-left: 4px;
        }
        .summary-divider {
          border: 0;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          margin: 16px 0;
        }
        .summary-cost-row {
          display: flex;
          justify-content: space-between;
          font-size: 13.5px;
          color: #8a8a92;
          margin-bottom: 8px;
        }
        .credit-row {
          color: #4caf50;
        }
        .summary-total-row {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-top: 16px;
          font-weight: 700;
        }
        .summary-total-row span:first-child {
          font-size: 15px;
          color: #fff;
        }
        .total-amount {
          font-size: 22px;
          color: var(--nv-gold, #fdbd16);
        }
        .email-disclaimer {
          font-size: 13px;
          color: #8a8a92;
          margin-bottom: 32px;
        }
        .confirm-actions {
          display: flex;
          gap: 16px;
          justify-content: center;
        }
        .nv-btn {
          padding: 12px 24px;
          border-radius: 6px;
          font-size: 14.5px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          background: rgba(255, 255, 255, 0.05);
          color: #fff;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .nv-btn:hover {
          background: rgba(255, 255, 255, 0.1);
        }
        .nv-btn-primary {
          background: var(--nv-gold, #fdbd16);
          color: #111;
          border: none;
        }
        .nv-btn-primary:hover {
          background: #e0a50b;
        }

        /* Success Checkmark Animation */
        .success-checkmark-container {
          display: flex;
          justify-content: center;
          margin-bottom: 20px;
        }
        .success-checkmark {
          width: 80px;
          height: 80px;
        }
        .success-checkmark .check-icon {
          width: 80px;
          height: 80px;
          position: relative;
          border-radius: 50%;
          box-sizing: content-box;
          border: 4px solid #4caf50;
        }
        .success-checkmark .check-icon::before {
          top: 3px;
          left: -2px;
          width: 30px;
          transform-origin: 100% 50%;
          border-radius: 100px 0 0 100px;
        }
        .success-checkmark .check-icon::after {
          top: 0;
          left: 30px;
          width: 60px;
          transform-origin: 0 50%;
          border-radius: 0 100px 100px 0;
          position: absolute;
        }
        .success-checkmark .check-icon .icon-circle {
          top: -4px;
          left: -4px;
          z-index: 10;
          width: 80px;
          height: 80px;
          border-radius: 50%;
          position: absolute;
          box-sizing: content-box;
          border: 4px solid rgba(76, 175, 80, 0.5);
        }
        .success-checkmark .check-icon .icon-fix {
          top: 8px;
          width: 5px;
          left: 26px;
          z-index: 1;
          height: 85px;
          position: absolute;
          transform: rotate(-45deg);
        }
        .success-checkmark .check-icon .icon-line {
          height: 5px;
          background-color: #4caf50;
          display: block;
          border-radius: 2px;
          position: absolute;
          z-index: 10;
        }
        .success-checkmark .check-icon .icon-line.line-tip {
          top: 46px;
          left: 14px;
          width: 25px;
          transform: rotate(45deg);
          animation: icon-line-tip 0.75s;
        }
        .success-checkmark .check-icon .icon-line.line-long {
          top: 38px;
          right: 8px;
          width: 47px;
          transform: rotate(-45deg);
          animation: icon-line-long 0.75s;
        }
        @keyframes icon-line-tip {
          0% {
            width: 0;
            left: 1px;
            top: 19px;
          }
          54% {
            width: 0;
            left: 1px;
            top: 19px;
          }
          70% {
            width: 50px;
            left: -8px;
            top: 37px;
          }
          84% {
            width: 17px;
            left: 21px;
            top: 48px;
          }
          100% {
            width: 25px;
            left: 14px;
            top: 46px;
          }
        }
        @keyframes icon-line-long {
          0% {
            width: 0;
            right: 46px;
            top: 54px;
          }
          65% {
            width: 0;
            right: 46px;
            top: 54px;
          }
          84% {
            width: 55px;
            right: 0px;
            top: 35px;
          }
          100% {
            width: 47px;
            right: 8px;
            top: 38px;
          }
        }
      `}</style>
    </div>
  );
}
