import { useState } from 'react';
import { useTranslation } from '../context/LanguageContext';

export default function CheckoutFlow({ cart, user, submitOrder, setActivePage }) {
  const { lang, t } = useTranslation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [zip, setZip] = useState('');
  const [shipping, setShipping] = useState('zasilkovna');
  const [payment, setPayment] = useState('card');
  
  // Store Credit applied state
  const [creditInput, setCreditInput] = useState('');
  const [appliedCredit, setAppliedCredit] = useState(0);



  // ComGate Payment Gateway Simulator States
  const [isGatewayOpen, setIsGatewayOpen] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  const cartSubtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  // Shipping cost
  let shippingCost = 79;
  if (shipping === 'zasilkovna') shippingCost = 79;
  else if (shipping === 'gls') shippingCost = 99;
  else if (shipping === 'dpd') shippingCost = 109;
  else if (shipping === 'posta-doporucene') shippingCost = 85;
  else if (shipping === 'posta-cenne') shippingCost = 110;
  else if (shipping === 'pardubice') shippingCost = 0;

  // Free shipping above 2000 CZK for Zásilkovna, GLS, DPD
  if (cartSubtotal > 2000 && (shipping === 'zasilkovna' || shipping === 'gls' || shipping === 'dpd')) {
    shippingCost = 0;
  }

  // Payment surcharge for Cash on Delivery (Dobírka)
  const paymentSurcharge = payment === 'cod' ? 25 : 0;

  // Store Credit capping calculations
  const totalBeforeCredit = Math.max(0, cartSubtotal + shippingCost + paymentSurcharge);
  const actualAppliedCredit = Math.min(appliedCredit, totalBeforeCredit);
  const finalTotal = Math.max(0, totalBeforeCredit - actualAppliedCredit);



  const handlePlaceOrder = (e) => {
    e.preventDefault();
    if (cart.length === 0) {
      alert(t('Cart.empty'));
      return;
    }

    if (payment === 'card') {
      setIsGatewayOpen(true);
    } else {
      finalizeOrder();
    }
  };

  const handleGatewayPay = (e) => {
    e.preventDefault();
    if (!cardNumber || !cardExpiry || !cardCvv) {
      alert(lang === 'CZ' ? 'Vyplňte prosím všechny údaje platební karty.' : 'Please fill in all credit card details.');
      return;
    }
    
    setIsPaying(true);
    setTimeout(() => {
      setIsPaying(false);
      setIsGatewayOpen(false);
      finalizeOrder();
    }, 1500);
  };

  const finalizeOrder = () => {
    const orderId = '100' + Math.floor(1000 + Math.random() * 9000);
    const order = {
      id: orderId,
      items: cart.map(item => ({
        name: item.name || item.productName,
        price: item.price,
        quantity: item.quantity
      })),
      subtotal: cartSubtotal,
      shippingCost,
      paymentSurcharge,
      creditApplied: actualAppliedCredit,
      isicApplied: false,
      isicDiscount: 0,
      finalTotal,
      shippingMethod: shipping === 'zasilkovna' 
        ? (lang === 'CZ' ? 'Zásilkovna - Výdejní místo / Z-BOX' : 'Packeta - Pickup Point / Z-BOX') 
        : shipping === 'gls'
          ? (lang === 'CZ' ? 'GLS - Doručení na adresu' : 'GLS - Home Delivery')
          : shipping === 'dpd'
            ? (lang === 'CZ' ? 'DPD - Doručení na adresu' : 'DPD - Home Delivery')
            : shipping === 'pardubice' 
              ? (lang === 'CZ' ? 'Osobní odběr Pardubice' : 'Local Pickup Pardubice') 
              : shipping === 'posta-cenne'
                ? (lang === 'CZ' ? 'Česká pošta - Cenné psaní' : 'Czech Post - Insured Letter')
                : (lang === 'CZ' ? 'Česká pošta - Doporučené psaní' : 'Czech Post - Registered Mail'),
      paymentMethod: payment === 'card'
        ? (lang === 'CZ' ? 'Online platební karta' : 'Online Credit/Debit Card')
        : payment === 'transfer'
          ? (lang === 'CZ' ? 'Bankovní převod' : 'Bank Transfer')
          : (lang === 'CZ' ? 'Dobírka' : 'Cash on Delivery'),
      date: new Date().toLocaleDateString(lang === 'CZ' ? 'cs-CZ' : 'en-US'),
      invoiceUrl: '#'
    };

    submitOrder(order, actualAppliedCredit);
    alert(lang === 'CZ'
      ? `Děkujeme za Váš nákup! Objednávka #${order.id} byla úspěšně vytvořena a uložena do Vašeho profilu.`
      : `Thank you for your purchase! Order #${order.id} was successfully created and saved to your profile.`
    );
    setActivePage('profile');
  };

  return (
    <div className="fade-in">
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .spinner-loader {
          animation: spin 1s linear infinite;
        }

        /* Redesign classes from template */
        .__om-t {
          color: rgb(138, 138, 146);
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 2.42px;
          text-transform: uppercase;
          font-family: var(--font-sans), system-ui, sans-serif;
        }

        .po-section {
          background-color: rgb(24, 24, 28);
          color: rgb(240, 240, 240);
          padding: 36px 64px 56px 64px;
        }
        @media (max-width: 640px) {
          .po-section {
            padding-top: 24px;
          }
        }

        .pof-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 52px;
        }

        /* Prevent global text style overriding styled elements */
        .nv-link span,
        .pof-step-num span,
        .pof-isic-row button span,
        .pof-submit span,
        .pof-price span,
        .pof-field span span {
          color: inherit;
          font-family: inherit;
          font-size: inherit;
          font-weight: inherit;
          letter-spacing: inherit;
          text-transform: inherit;
        }
        .nv-eyebrow {
          color: rgb(138, 138, 146);
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 2.42px;
          margin-bottom: 10px;
          text-transform: uppercase;
        }

        .nv-link {
          font-size: 13px;
          font-weight: 500;
          text-transform: uppercase;
          color: rgb(253, 189, 22);
          letter-spacing: 1.04px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: opacity 0.2s;
          cursor: pointer;
          background: transparent;
          border: none;
          padding: 0 0 4px 0;
        }
        .nv-link:hover {
          opacity: 0.85;
        }
        .nv-link-arrow {
          font-size: 13px;
          font-weight: 500;
          transition: transform 0.2s;
        }
        .nv-link:hover .nv-link-arrow {
          transform: translateX(4px);
        }

        .pof-grid {
          display: grid;
          grid-template-columns: 1.4fr 1fr;
          gap: 60px;
          align-items: start;
        }
        @media (max-width: 1024px) {
          .pof-grid {
            grid-template-columns: 1fr;
            gap: 40px;
          }
        }

        .pof-form {
          display: flex;
          flex-direction: column;
          gap: 48px;
        }

        .pof-aside {
          display: flex;
          flex-direction: column;
          gap: 24px;
          position: sticky;
          top: 24px;
        }

        .pof-step {
          display: flex;
          flex-direction: column;
        }
        .pof-step-head {
          display: flex;
          align-items: baseline;
          gap: 8px;
          margin-bottom: 26px;
        }
        .pof-step-num {
          font-size: 12px;
          font-weight: 500;
          color: rgb(253, 189, 22);
          letter-spacing: 1.2px;
        }
        .pof-step-head h3 {
          font-size: 15px;
          font-weight: 600;
          text-transform: uppercase;
          margin: 0;
          letter-spacing: 0px;
          color: rgb(240, 240, 240);
        }

        .pof-2col {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }
        @media (max-width: 600px) {
          .pof-2col {
            grid-template-columns: 1fr;
            gap: 0;
          }
        }
        .pof-field {
          display: flex;
          flex-direction: column;
          margin-bottom: 24px;
          border-bottom: 1px solid rgba(240, 240, 240, 0.12);
          padding-bottom: 13px;
          box-sizing: border-box;
        }
        .pof-field span {
          display: block;
          margin-bottom: 10px;
          font-family: var(--font-sans), system-ui, sans-serif;
          font-size: 11px;
          font-weight: 500;
          color: rgb(138, 138, 146);
          letter-spacing: 2.42px;
          text-transform: uppercase;
        }
        .pof-field input {
          background: transparent;
          border: none;
          outline: none;
          padding: 0;
          margin: 0;
          font-family: var(--font-sans), system-ui, sans-serif;
          font-size: 16px;
          color: rgb(240, 240, 240);
          font-weight: 400;
          width: 100%;
          height: 19.5px;
        }
        .pof-field input::placeholder {
          color: rgba(240, 240, 240, 0.25);
        }
        .pof-field input:-webkit-autofill,
        .pof-field input:-webkit-autofill:hover, 
        .pof-field input:-webkit-autofill:focus, 
        .pof-field input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 1000px rgb(24, 24, 28) inset !important;
          -webkit-text-fill-color: rgb(240, 240, 240) !important;
          transition: background-color 5000s ease-in-out 0s;
        }

        .pof-radios {
          display: flex;
          flex-direction: column;
          border-top: none;
        }
        .pof-radio {
          display: flex;
          align-items: flex-start;
          padding: 18px 0;
          border: none;
          border-top: 1px solid rgba(240, 240, 240, 0.07);
          background: transparent;
          cursor: pointer;
          width: 100%;
          text-align: left;
          color: inherit;
          transition: opacity 0.18s ease;
        }
        .pof-radio:hover {
          opacity: 0.8;
        }

        .pof-radio-dot {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          border: 1.5px solid rgb(80, 80, 90);
          margin-right: 16px;
          margin-top: 2px;
          flex-shrink: 0;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          position: relative;
          box-sizing: border-box;
          transition: border-color 0.18s ease;
          background-color: transparent;
        }
        .pof-radio.is-active .pof-radio-dot {
          border-color: rgb(253, 189, 22);
        }
        .pof-radio.is-active .pof-radio-dot::after {
          content: '';
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: rgb(253, 189, 22);
        }

        .pof-radio-body {
          flex-grow: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .pof-radio-name {
          font-size: 15px;
          font-weight: 600;
          color: rgb(240, 240, 240);
          letter-spacing: -0.075px;
        }
        .pof-radio-desc {
          font-size: 13px;
          color: rgb(138, 138, 146);
          line-height: 1.4;
        }
        .pof-price {
          font-size: 14px;
          font-weight: 600;
          color: rgb(240, 240, 240);
          margin-left: auto;
          flex-shrink: 0;
        }
        .pof-price.is-free {
          color: rgb(253, 189, 22);
        }

        .pof-summary {
          display: flex;
          flex-direction: column;
          gap: 20px;
          background: transparent;
          border: none;
          padding: 0;
        }
        .pof-summary-title {
          margin: 0 0 22px 0;
          padding-bottom: 12px;
          border-bottom: 1px solid rgba(240, 240, 240, 0.07);
        }
        .pof-summary-title .__om-t {
          color: rgb(138, 138, 146);
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 1.92px;
          text-transform: uppercase;
        }

        .pof-line-item {
          display: grid;
          grid-template-columns: 48px 1fr auto;
          gap: 16px;
          align-items: center;
          padding-bottom: 22px;
          border-bottom: 1px solid rgba(240, 240, 240, 0.07);
        }
        .pof-li-thumb {
          width: 48px;
          height: 67px;
          flex-shrink: 0;
          border-radius: 4px;
          overflow: hidden;
          background: rgba(0, 0, 0, 0.3);
          position: relative;
        }
        .pof-li-name {
          font-size: 14px;
          font-weight: 600;
          color: rgb(240, 240, 240);
          line-height: 1.4;
        }
        .pof-li-variant {
          font-size: 11px;
          color: rgb(138, 138, 146);
          margin-top: 2px;
        }
        .pof-li-price {
          font-size: 14px;
          font-weight: 600;
          color: rgb(253, 189, 22);
          white-space: nowrap;
          text-align: right;
        }
        .pof-li-price .__om-t {
          color: rgb(138, 138, 146);
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 1.5px;
        }

        .pof-isic {
          padding: 20px 0;
          border-bottom: 1px solid rgba(240, 240, 240, 0.07);
        }
        .pof-isic-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        .pof-isic-head .__om-t {
          color: rgb(138, 138, 146);
          font-size: 13px;
          font-weight: 500;
          letter-spacing: 1px;
          text-transform: uppercase;
        }
        .pof-isic-pct {
          color: rgb(253, 189, 22);
          font-weight: 700;
        }
        .pof-isic-row {
          display: flex;
          align-items: center;
          border-bottom: 1px solid rgba(240, 240, 240, 0.12);
          padding-bottom: 8px;
          height: 28px;
          box-sizing: border-box;
        }
        .pof-isic-row input {
          flex-grow: 1;
          background: transparent;
          border: none;
          outline: none;
          font-size: 14px;
          color: rgb(240, 240, 240);
          padding: 0;
          margin: 0;
        }
        .pof-isic-row input::placeholder {
          color: rgba(240, 240, 240, 0.25);
        }
        .pof-isic-row button {
          background: transparent;
          border: none;
          color: rgb(253, 189, 22);
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1.04px;
          cursor: pointer;
          transition: opacity 0.2s;
          padding: 1px 6px;
        }
        .pof-isic-row button:hover {
          opacity: 0.85;
        }
        .pof-isic-row button:disabled {
          color: rgb(138, 138, 146);
          cursor: not-allowed;
        }

        .pof-srows {
          display: flex;
          flex-direction: column;
          padding: 16px 0 4px 0;
          gap: 0;
        }
        .pof-srow {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          font-size: 14px;
          color: rgb(138, 138, 146);
          padding: 7px 0;
        }
        .pof-sdots {
          flex-grow: 1;
          border-bottom: 1px dotted rgba(240, 240, 240, 0.12);
          margin: 0 10px;
          position: relative;
          top: -3px;
        }
        .pof-srow span:last-child {
          color: rgb(240, 240, 240);
          font-weight: 500;
        }
        .pof-srow span:last-child .__om-t {
          color: rgb(138, 138, 146);
          font-size: 11px;
          font-weight: 500;
        }

        .pof-total {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-top: 6px;
          padding: 18px 0 22px 0;
        }
        .pof-total span:first-child {
          font-size: 13px;
          font-weight: 600;
          text-transform: uppercase;
          color: rgb(138, 138, 146);
          letter-spacing: 1px;
        }
        .pof-total-val {
          font-size: 30px;
          font-weight: 700;
          color: rgb(253, 189, 22);
          letter-spacing: -0.6px;
        }
        .pof-total-val .__om-t {
          color: rgb(138, 138, 146);
          font-size: 11px;
          font-weight: 500;
        }

        .pof-submit {
          width: 100%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: 49.5px;
          background: rgb(253, 189, 22);
          color: rgb(26, 20, 7);
          font-size: 13px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 1.04px;
          border: none;
          border-radius: 0;
          cursor: pointer;
          transition: opacity 0.2s;
        }
        .pof-submit:hover {
          opacity: 0.9;
        }
        .pof-submit .__om-t {
          color: rgb(26, 20, 7);
        }



        /* Card Art CSS Simulation from template */
        .card-art {
          display: block;
          height: 67px;
          width: 48px;
          position: relative;
          overflow: hidden;
          border-radius: 5px;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.5);
        }
        .ca-base {
          display: block;
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-image: radial-gradient(120% 80% at 28% 18%, rgb(138, 90, 204) 0%, rgba(0, 0, 0, 0) 55%), radial-gradient(110% 100% at 78% 88%, rgb(212, 161, 74) 0%, rgba(0, 0, 0, 0) 50%), radial-gradient(80% 80% at 50% 60%, rgb(74, 26, 110) 0%, rgba(0, 0, 0, 0) 60%), linear-gradient(135deg, rgb(26, 10, 46) 0%, rgb(74, 26, 110) 60%, rgb(26, 10, 46) 100%);
        }
        .ca-holo {
          display: block;
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-image: conic-gradient(from 200deg, rgba(255, 255, 255, 0) 0deg, rgba(255, 255, 255, 0.12) 60deg, rgba(255, 255, 255, 0) 120deg, rgba(255, 255, 255, 0.08) 200deg, rgba(255, 255, 255, 0) 280deg, rgba(255, 255, 255, 0.1) 340deg, rgba(255, 255, 255, 0) 360deg);
        }
        .ca-shine {
          display: block;
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-image: linear-gradient(160deg, rgba(255, 255, 255, 0.22) 0%, rgba(0, 0, 0, 0) 30%, rgba(0, 0, 0, 0) 70%, rgba(255, 255, 255, 0.1) 100%);
          opacity: 0.6;
        }
        .ca-grain {
          display: block;
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          opacity: 0.35;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
        }
        .ca-frame {
          display: block;
          position: absolute;
          top: 4px;
          left: 3px;
          right: 3px;
          bottom: 4px;
          border: 1.5px solid rgba(255, 255, 255, 0.18);
          border-radius: 2px;
        }
        .ca-inner-frame {
          display: block;
          position: absolute;
          top: 9px;
          left: 4px;
          right: 4px;
          bottom: 20px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 1px;
          background-image: linear-gradient(rgba(0, 0, 0, 0.25), rgba(0, 0, 0, 0.05));
          box-shadow: inset 0 0 24px rgba(0, 0, 0, 0.35);
        }

        /* ComGate Simulator Modal Styles */
        .co-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .co-modal-content {
          width: 90%;
          max-width: 400px;
          border-radius: 0;
          padding: 28px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
          position: relative;
          background: rgba(24, 24, 28, 0.98);
          border: 1px solid rgba(240, 240, 240, 0.07);
        }
        .co-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid rgba(240, 240, 240, 0.07);
          padding-bottom: 12px;
          margin-bottom: 16px;
        }
        .co-modal-close-btn {
          background: none;
          border: none;
          color: rgb(138, 138, 146);
          cursor: pointer;
          font-size: 16px;
          padding: 4px;
          line-height: 1;
          transition: color 0.2s;
        }
        .co-modal-close-btn:hover {
          color: rgb(240, 240, 240);
        }
        .co-loader-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 0;
        }
        .co-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(253, 189, 22, 0.1);
          border-top: 3px solid rgb(253, 189, 22);
          border-radius: 50%;
        }
      `}</style>

      <h1 className="sr-only">
        {lang === 'CZ' ? 'Pokladna a dokončení objednávky - NORTHVALE' : 'Checkout & Purchase - NORTHVALE'}
      </h1>

      <div className="container" style={{ marginBottom: '24px', paddingTop: '20px' }}>
        <nav className="breadcrumbs-nav" aria-label={lang === 'CZ' ? 'Drobečková navigace' : 'Breadcrumbs'} style={{ margin: 0, padding: 0 }}>
          <span className="breadcrumb-item" onClick={() => setActivePage('home')}>{t('common.home')}</span>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-item" onClick={() => setActivePage('cart')}>{t('Cart.title')}</span>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-item active">{lang === 'CZ' ? 'Pokladna' : 'Checkout'}</span>
        </nav>
      </div>

      <div className="container nv-section v-floating po-section">
        {cart.length === 0 ? (
          <div style={{ padding: '60px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }} className="glass-panel">
            <span style={{ fontSize: '48px' }}>🛒</span>
            <h3>{t('Cart.empty')}</h3>
            <button className="btn btn-primary" onClick={() => setActivePage('singles-catalog')}>
              {t('common.backToCatalog')}
            </button>
          </div>
        ) : (
        <form onSubmit={handlePlaceOrder}>
          <header className="ckf-head">
            <div className="title-group">
              <div className="nv-eyebrow">
                {lang === 'CZ' ? 'Krok 2 ze 3 - Doprava a platba' : 'Step 2 of 3 - Shipping & Payment'}
              </div>
              <h2 className="ckf-title">
                {lang === 'CZ' ? 'Pokladna' : 'Checkout'}
              </h2>
            </div>
            <span 
              className="nv-link" 
              onClick={() => setActivePage('cart')}
              style={{ cursor: 'pointer' }}
            >
              {lang === 'CZ' ? 'Zpět do košíku' : 'Back to Cart'} <span className="nv-link-arrow">→</span>
            </span>
          </header>

          <div className="pof-grid">
            {/* Left Column: Form Steps */}
            <div className="pof-form">
              {/* Step 1: Osobní údaje */}
              <section className="pof-step">
                <div className="pof-step-head">
                  <span className="pof-step-num"><span className="__om-t">01</span></span>
                  <h3><span className="__om-t">{lang === 'CZ' ? 'Osobní údaje' : 'Personal Information'}</span></h3>
                </div>
                <div className="pof-2col">
                  <label className="pof-field">
                    <span><span className="__om-t">{lang === 'CZ' ? 'Jméno a příjmení' : 'Full Name'}</span></span>
                    <input 
                      type="text" 
                      required 
                      value={name} 
                      onChange={e => setName(e.target.value)} 
                      placeholder="Jan Novák"
                      autoComplete="name"
                    />
                  </label>
                  <label className="pof-field">
                    <span><span className="__om-t">{lang === 'CZ' ? 'E-mail' : 'Email'}</span></span>
                    <input 
                      type="email" 
                      required 
                      value={email} 
                      onChange={e => setEmail(e.target.value)} 
                      placeholder="jan@example.cz"
                      autoComplete="email"
                    />
                  </label>
                </div>
                <label className="pof-field">
                  <span><span className="__om-t">{lang === 'CZ' ? 'Telefon' : 'Phone'}</span></span>
                  <input 
                    type="tel" 
                    required 
                    value={phone} 
                    onChange={e => setPhone(e.target.value)} 
                    placeholder={lang === 'CZ' ? '+420 123 456 789' : '+44 20 7946 0958'}
                    autoComplete="tel"
                  />
                </label>
              </section>

              {/* Step 2: Adresa doručení */}
              <section className="pof-step">
                <div className="pof-step-head">
                  <span className="pof-step-num"><span className="__om-t">02</span></span>
                  <h3><span className="__om-t">{lang === 'CZ' ? 'Adresa doručení' : 'Shipping Address'}</span></h3>
                </div>
                <label className="pof-field">
                  <span><span className="__om-t">{lang === 'CZ' ? 'Ulice a číslo popisné' : 'Street & house number'}</span></span>
                  <input 
                    type="text" 
                    required 
                    value={street} 
                    onChange={e => setStreet(e.target.value)} 
                    placeholder={lang === 'CZ' ? 'Bratří Čapků 1095' : '10 Downing Street'}
                    autoComplete="address-line1"
                  />
                </label>
                <div className="pof-2col">
                  <label className="pof-field">
                    <span><span className="__om-t">{lang === 'CZ' ? 'Město' : 'City'}</span></span>
                    <input 
                      type="text" 
                      required 
                      value={city} 
                      onChange={e => setCity(e.target.value)} 
                      placeholder={lang === 'CZ' ? 'Holice' : 'London'}
                      autoComplete="address-level2"
                    />
                  </label>
                  <label className="pof-field">
                    <span><span className="__om-t">{lang === 'CZ' ? 'PSČ' : 'ZIP / Postal Code'}</span></span>
                    <input 
                      type="text" 
                      required 
                      value={zip} 
                      onChange={e => setZip(e.target.value)} 
                      placeholder={lang === 'CZ' ? '534 01' : 'SW1A 2AA'}
                      autoComplete="postal-code"
                    />
                  </label>
                </div>
              </section>

              {/* Step 3: Způsob dopravy */}
              <section className="pof-step">
                <div className="pof-step-head">
                  <span className="pof-step-num"><span className="__om-t">03</span></span>
                  <h3><span className="__om-t">{lang === 'CZ' ? 'Způsob dopravy' : 'Shipping Method'}</span></h3>
                </div>
                <div className="pof-radios">
                  <button 
                    type="button"
                    className={`pof-radio ${shipping === 'zasilkovna' ? 'is-active' : ''}`} 
                    onClick={() => setShipping('zasilkovna')}
                  >
                    <span className="pof-radio-dot" aria-hidden="true"></span>
                    <span className="pof-radio-body">
                      <span className="pof-radio-name">
                        {lang === 'CZ' ? 'Zásilkovna - Výdejní místo / Z-BOX' : 'Packeta - Pickup Point / Z-BOX'}
                      </span>
                      <span className="pof-radio-desc">
                        {lang === 'CZ' ? 'Doručení do 24-48 h na Vámi vybrané místo.' : 'Delivery within 24-48 h to your selected location.'}
                      </span>
                    </span>
                    <span className={`pof-price ${cartSubtotal > 2000 ? 'is-free' : ''}`}>
                      {cartSubtotal > 2000 ? (lang === 'CZ' ? 'Zdarma' : 'Free') : (lang === 'CZ' ? '79 Kč' : '79 CZK')}
                    </span>
                  </button>

                  <button 
                    type="button"
                    className={`pof-radio ${shipping === 'gls' ? 'is-active' : ''}`} 
                    onClick={() => setShipping('gls')}
                  >
                    <span className="pof-radio-dot" aria-hidden="true"></span>
                    <span className="pof-radio-body">
                      <span className="pof-radio-name">
                        {lang === 'CZ' ? 'GLS - Doručení na adresu' : 'GLS - Home Delivery'}
                      </span>
                      <span className="pof-radio-desc">
                        {lang === 'CZ' ? 'Spolehlivé doručení kurýrem přímo k Vám domů.' : 'Reliable delivery by courier directly to your home.'}
                      </span>
                    </span>
                    <span className={`pof-price ${cartSubtotal > 2000 ? 'is-free' : ''}`}>
                      {cartSubtotal > 2000 ? (lang === 'CZ' ? 'Zdarma' : 'Free') : (lang === 'CZ' ? '99 Kč' : '99 CZK')}
                    </span>
                  </button>

                  <button 
                    type="button"
                    className={`pof-radio ${shipping === 'dpd' ? 'is-active' : ''}`} 
                    onClick={() => setShipping('dpd')}
                  >
                    <span className="pof-radio-dot" aria-hidden="true"></span>
                    <span className="pof-radio-body">
                      <span className="pof-radio-name">
                        {lang === 'CZ' ? 'DPD - Doručení na adresu' : 'DPD - Home Delivery'}
                      </span>
                      <span className="pof-radio-desc">
                        {lang === 'CZ' ? 'Komfortní doručení na adresu s možností změny termínu online.' : 'Comfortable home delivery with online schedule changes.'}
                      </span>
                    </span>
                    <span className={`pof-price ${cartSubtotal > 2000 ? 'is-free' : ''}`}>
                      {cartSubtotal > 2000 ? (lang === 'CZ' ? 'Zdarma' : 'Free') : (lang === 'CZ' ? '109 Kč' : '109 CZK')}
                    </span>
                  </button>

                  <button 
                    type="button"
                    className={`pof-radio ${shipping === 'pardubice' ? 'is-active' : ''}`} 
                    onClick={() => setShipping('pardubice')}
                  >
                    <span className="pof-radio-dot" aria-hidden="true"></span>
                    <span className="pof-radio-body">
                      <span className="pof-radio-name">
                        {lang === 'CZ' ? 'Osobní odběr Pardubice (Coffee & Cards)' : 'Local Pickup Pardubice (Coffee & Cards)'}
                      </span>
                      <span className="pof-radio-desc">
                        {lang === 'CZ' ? 'Vyzvednutí zdarma v kavárně v centru. Slevový kód na kávu.' : 'Pickup for free in the café in the city center. Free coffee voucher included.'}
                      </span>
                    </span>
                    <span className="pof-price is-free">{lang === 'CZ' ? 'Zdarma' : 'Free'}</span>
                  </button>

                  <button 
                    type="button"
                    className={`pof-radio ${shipping === 'posta-doporucene' ? 'is-active' : ''}`} 
                    onClick={() => setShipping('posta-doporucene')}
                  >
                    <span className="pof-radio-dot" aria-hidden="true"></span>
                    <span className="pof-radio-body">
                      <span className="pof-radio-name">
                        {lang === 'CZ' ? 'Česká pošta - Doporučené psaní' : 'Czech Post - Registered Mail'}
                      </span>
                      <span className="pof-radio-desc">
                        {lang === 'CZ' ? 'Pojištěno do 880 Kč. Pouze pro menší zásilky.' : 'Insured up to 880 CZK. Available for light card shipments only.'}
                      </span>
                    </span>
                    <span className="pof-price is-free">{lang === 'CZ' ? 'Zdarma' : 'Free'}</span>
                  </button>

                  <button 
                    type="button"
                    className={`pof-radio ${shipping === 'posta-cenne' ? 'is-active' : ''}`} 
                    onClick={() => setShipping('posta-cenne')}
                  >
                    <span className="pof-radio-dot" aria-hidden="true"></span>
                    <span className="pof-radio-body">
                      <span className="pof-radio-name">
                        {lang === 'CZ' ? 'Česká pošta - Cenné psaní' : 'Czech Post - Insured Letter'}
                      </span>
                      <span className="pof-radio-desc">
                        {lang === 'CZ' 
                          ? 'Bezpečnostní obálka, plné pojištění (doporučeno pro drahé kusovky).' 
                          : 'Special secure bubble envelope with full valuation insurance (highly recommended for high-end singles).'}
                      </span>
                    </span>
                    <span className="pof-price">{lang === 'CZ' ? '110 Kč' : '110 CZK'}</span>
                  </button>
                </div>
              </section>

              {/* Step 4: Způsob platby */}
              <section className="pof-step">
                <div className="pof-step-head">
                  <span className="pof-step-num"><span className="__om-t">04</span></span>
                  <h3><span className="__om-t">{lang === 'CZ' ? 'Způsob platby' : 'Payment Method'}</span></h3>
                </div>
                <div className="pof-radios">
                  <button 
                    type="button"
                    className={`pof-radio ${payment === 'card' ? 'is-active' : ''}`} 
                    onClick={() => setPayment('card')}
                  >
                    <span className="pof-radio-dot" aria-hidden="true"></span>
                    <span className="pof-radio-body">
                      <span className="pof-radio-name">{lang === 'CZ' ? 'Platební karta online' : 'Online Credit/Debit Card'}</span>
                      <span className="pof-radio-desc">{lang === 'CZ' ? 'Okamžitá platba přes bránu.' : 'Instant secure payment via gateway.'}</span>
                    </span>
                  </button>

                  <button 
                    type="button"
                    className={`pof-radio ${payment === 'transfer' ? 'is-active' : ''}`} 
                    onClick={() => setPayment('transfer')}
                  >
                    <span className="pof-radio-dot" aria-hidden="true"></span>
                    <span className="pof-radio-body">
                      <span className="pof-radio-name">{lang === 'CZ' ? 'Bankovní převod' : 'Bank Transfer'}</span>
                      <span className="pof-radio-desc">
                        {lang === 'CZ' 
                          ? 'Platební údaje obdržíte v e-mailu. Expedujeme po připsání platby.' 
                          : 'Payment coordinates will be sent by email. We ship immediately after transfer clears.'}
                      </span>
                    </span>
                  </button>

                  <button 
                    type="button"
                    className={`pof-radio ${payment === 'cod' ? 'is-active' : ''}`} 
                    onClick={() => setPayment('cod')}
                  >
                    <span className="pof-radio-dot" aria-hidden="true"></span>
                    <span className="pof-radio-body">
                      <span className="pof-radio-name">{lang === 'CZ' ? 'Dobírka (Platba při převzetí)' : 'Cash on Delivery'}</span>
                      <span className="pof-radio-desc">
                        {lang === 'CZ' 
                          ? 'Platíte v hotovosti nebo kartou kurýrovi při doručení. Příplatek 25 Kč.' 
                          : 'Pay in cash or by credit card directly to the courier. +25 CZK surcharge.'}
                      </span>
                    </span>
                  </button>
                </div>
              </section>
            </div>

            {/* Right Column: Sticky Sidebar */}
            <aside className="pof-aside">
              <div className="pof-summary">
                <h3 className="pof-summary-title">
                  <span className="__om-t">{lang === 'CZ' ? 'Vaše objednávka' : 'Your Order Summary'}</span>
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {cart.map((item, idx) => (
                    <div key={idx} className="pof-line-item">
                      <div className="pof-li-thumb">
                        <div className="card-art">
                          <div className="ca-base"></div>
                          <div className="ca-holo"></div>
                          <div className="ca-shine"></div>
                          <div className="ca-grain"></div>
                          <div className="ca-frame"></div>
                          <div className="ca-inner-frame"></div>
                        </div>
                      </div>
                      <div className="pof-li-name">
                        <div>{item.name || (item.product && item.product.name)}</div>
                        {item.condition && (
                          <div className="pof-li-variant">
                            {lang === 'CZ' ? 'Stav' : 'Condition'}: {item.condition} | {item.lang} | {item.foil ? 'Foil' : 'Non-Foil'}
                          </div>
                        )}
                      </div>
                      <div className="pof-li-price">
                        {item.quantity}<span className="__om-t">x </span>{item.price.toLocaleString(lang === 'CZ' ? 'cs-CZ' : 'en-US')} <span className="__om-t">{lang === 'CZ' ? 'Kč' : 'CZK'}</span>
                      </div>
                    </div>
                  ))}
                </div>



                {/* Store Credit Redemption */}
                {user && user.storeCredit > 0 && (
                  <div className="pof-isic">
                    <div className="pof-isic-head">
                      <span className="__om-t">{lang === 'CZ' ? 'Uplatnit Store Kredit' : 'Redeem Store Credit'}</span>
                      <span className="pof-isic-pct">
                        {lang === 'CZ' 
                          ? `K dispozici: ${user.storeCredit.toLocaleString('cs-CZ')} Kč` 
                          : `Available: ${user.storeCredit.toLocaleString('en-US')} CZK`}
                      </span>
                    </div>
                    <div className="pof-isic-row">
                      <input 
                        type="number" 
                        min="0"
                        max={user.storeCredit}
                        placeholder={lang === 'CZ' ? `Max. ${user.storeCredit}` : `Max. ${user.storeCredit}`}
                        value={creditInput} 
                        onChange={(e) => setCreditInput(e.target.value)}
                        disabled={appliedCredit > 0}
                      />
                      {appliedCredit > 0 ? (
                        <button 
                          type="button"
                          onClick={() => {
                            setAppliedCredit(0);
                            setCreditInput('');
                          }}
                        >
                          <span className="__om-t">{lang === 'CZ' ? 'Zrušit' : 'Cancel'}</span>
                        </button>
                      ) : (
                        <button 
                          type="button"
                          onClick={() => {
                            const val = Math.max(0, parseInt(creditInput) || 0);
                            if (val > user.storeCredit) {
                              alert(lang === 'CZ' ? 'Nemáte dostatek kreditu.' : 'You do not have enough store credit.');
                              return;
                            }
                            const maxPossibleCredit = Math.max(0, cartSubtotal + shippingCost + paymentSurcharge - isicDiscount);
                            const finalApplied = Math.min(val, maxPossibleCredit);
                            setAppliedCredit(finalApplied);
                            setCreditInput(finalApplied.toString());
                          }}
                        >
                          <span className="__om-t">{lang === 'CZ' ? 'Uplatnit' : 'Apply'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Totals Summary */}
                <div className="pof-srows">
                  <div className="pof-srow">
                    <span><span className="__om-t">{lang === 'CZ' ? 'Mezisoučet' : 'Subtotal'}</span></span>
                    <span className="pof-sdots"></span>
                    <span>{cartSubtotal.toLocaleString(lang === 'CZ' ? 'cs-CZ' : 'en-US')} <span className="__om-t">{lang === 'CZ' ? 'Kč' : 'CZK'}</span></span>
                  </div>
                  <div className="pof-srow">
                    <span><span className="__om-t">{lang === 'CZ' ? 'Doprava' : 'Shipping'}</span></span>
                    <span className="pof-sdots"></span>
                    <span>{shippingCost === 0 ? (lang === 'CZ' ? 'Zdarma' : 'Free') : `${shippingCost} ${lang === 'CZ' ? 'Kč' : 'CZK'}`}</span>
                  </div>
                  {paymentSurcharge > 0 && (
                    <div className="pof-srow">
                      <span><span className="__om-t">{lang === 'CZ' ? 'Dobírkový příplatek' : 'COD Surcharge'}</span></span>
                      <span className="pof-sdots"></span>
                      <span>{paymentSurcharge} <span className="__om-t">{lang === 'CZ' ? 'Kč' : 'CZK'}</span></span>
                    </div>
                  )}

                  {actualAppliedCredit > 0 && (
                    <div className="pof-srow" style={{ color: 'var(--nv-green)' }}>
                      <span><span className="__om-t">{lang === 'CZ' ? 'Uplatněný kredit' : 'Store Credit applied'}</span></span>
                      <span className="pof-sdots"></span>
                      <span>-{actualAppliedCredit.toLocaleString(lang === 'CZ' ? 'cs-CZ' : 'en-US')} <span className="__om-t">{lang === 'CZ' ? 'Kč' : 'CZK'}</span></span>
                    </div>
                  )}
                </div>

                <div className="pof-total">
                  <span><span className="__om-t">{lang === 'CZ' ? 'Celkem' : 'Total due'}</span></span>
                  <span className="pof-total-val">{finalTotal.toLocaleString(lang === 'CZ' ? 'cs-CZ' : 'en-US')} <span className="__om-t">{lang === 'CZ' ? 'Kč' : 'CZK'}</span></span>
                </div>

                <button type="submit" className="pof-submit">
                  <span className="__om-t">{lang === 'CZ' ? 'Objednat a zaplatit' : 'Place Order & Pay'} </span>
                  <span><span className="__om-t">→</span></span>
                </button>
              </div>

              {/* Help & Contact Section */}
              <div className="ckf-help" style={{ marginTop: '24px' }}>
                <span>{t('Cart.help') || (lang === 'CZ' ? 'Nevíte si rady?' : 'Need help?')}</span>
                <a href="tel:+420739666779">+420 739 666 779</a>
                <span style={{ opacity: 0.4 }}>/</span>
                <a href="mailto:info@northvaletcg.eu">info@northvaletcg.eu</a>
              </div>
            </aside>
          </div>
        </form>
      )}

      {/* ComGate Payment Gateway Simulator Modal */}
      {isGatewayOpen && (
        <div className="co-modal-overlay" style={{ zIndex: 9999 }}>
          <div className="co-modal-content">
            <div className="co-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>💳</span>
                <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--color-gold)' }}>
                  {lang === 'CZ' ? 'Zabezpečená platba ComGate' : 'Secure ComGate Payment'}
                </span>
              </div>
              <button 
                type="button" 
                onClick={() => setIsGatewayOpen(false)} 
                disabled={isPaying}
                className="co-modal-close-btn"
              >
                ✕
              </button>
            </div>

            {isPaying ? (
              <div className="co-loader-container">
                <div className="spinner-loader co-spinner"></div>
                <p style={{ marginTop: '16px', fontSize: '14px', fontWeight: '600' }}>
                  {lang === 'CZ' ? 'Zpracování platby, prosím vyčkejte...' : 'Processing payment, please wait...'}
                </p>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {lang === 'CZ' ? 'Komunikace s bankou...' : 'Communicating with the bank...'}
                </p>
              </div>
            ) : (
              <form onSubmit={handleGatewayPay} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{lang === 'CZ' ? 'ČÁSTKA K ÚHRADĚ' : 'AMOUNT TO PAY'}</div>
                  <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-main)' }}>
                    {finalTotal.toLocaleString(lang === 'CZ' ? 'cs-CZ' : 'en-US')} {lang === 'CZ' ? 'Kč' : 'CZK'}
                  </div>
                </div>

                <div className="pof-field" style={{ marginBottom: '16px' }}>
                  <span>{lang === 'CZ' ? 'Číslo platební karty' : 'Card Number'}</span>
                  <input 
                    type="text" 
                    required 
                    placeholder="4111 2222 3333 4444"
                    maxLength="19"
                    value={cardNumber}
                    onChange={(e) => {
                      let v = e.target.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
                      let matches = v.match(/\d{4,16}/g);
                      let match = matches && matches[0] || '';
                      let parts = [];
                      for (let i = 0, len = match.length; i < len; i += 4) {
                        parts.push(match.substring(i, i + 4));
                      }
                      if (parts.length > 0) {
                        setCardNumber(parts.join(' '));
                      } else {
                        setCardNumber(v);
                      }
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '16px' }}>
                  <div className="pof-field" style={{ flex: 1, marginBottom: '16px' }}>
                    <span>{lang === 'CZ' ? 'Platnost (MM/RR)' : 'Expiry (MM/YY)'}</span>
                    <input 
                      type="text" 
                      required 
                      placeholder="12/28"
                      maxLength="5"
                      value={cardExpiry}
                      onChange={(e) => {
                        let v = e.target.value.replace('/', '').replace(/[^0-9]/gi, '');
                        if (v.length >= 2) {
                          setCardExpiry(v.substring(0, 2) + '/' + v.substring(2, 4));
                        } else {
                          setCardExpiry(v);
                        }
                      }}
                    />
                  </div>
                  <div className="pof-field" style={{ flex: 1, marginBottom: '16px' }}>
                    <span>CVV / CVC</span>
                    <input 
                      type="password" 
                      required 
                      placeholder="123"
                      maxLength="3"
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value.replace(/[^0-9]/gi, ''))}
                    />
                  </div>
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '8px' }}>
                  {lang === 'CZ' ? 'Zaplatit bezpečně' : 'Pay Securely'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

