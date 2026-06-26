import { useState, useEffect } from 'react';
import { useTranslation } from '../context/LanguageContext';
import { supabase } from '../supabase';

export default function GdprVop({ setActivePage, initialTab = 'vop' }) {
  const { lang, t } = useTranslation();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [prevInitialTab, setPrevInitialTab] = useState(initialTab);

  if (initialTab !== prevInitialTab) {
    setActiveTab(initialTab);
    setPrevInitialTab(initialTab);
  }

  // Form states for Odstoupení od smlouvy
  const [orderNumber, setOrderNumber] = useState('');
  const [email, setEmail] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [returnType, setReturnType] = useState('celou');
  const [partialItemsText, setPartialItemsText] = useState('');
  const [refundMethod, setRefundMethod] = useState('bank');
  const [errors, setErrors] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedData, setSubmittedData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    if (activeTab === 'doprava' && sessionStorage.getItem('scrollToPreorderInfo') === 'true') {
      let attempts = 0;
      const tryScroll = () => {
        const el = document.getElementById('preorder-info-section');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('highlight-section');
          sessionStorage.removeItem('scrollToPreorderInfo');
          setTimeout(() => el.classList.remove('highlight-section'), 2000);
        } else if (attempts < 10) {
          attempts++;
          setTimeout(tryScroll, 100);
        } else {
          sessionStorage.removeItem('scrollToPreorderInfo');
        }
      };
      
      const timer = setTimeout(tryScroll, 150);
      return () => clearTimeout(timer);
    }
  }, [activeTab]);

  const handleWithdrawalSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!orderNumber.trim()) {
      newErrors.orderNumber = t('GdprVop.errors.orderNumber');
    }
    if (!email.trim()) {
      newErrors.email = t('GdprVop.errors.emailRequired');
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = t('GdprVop.errors.emailInvalid');
    }
    if (refundMethod === 'bank' && !bankAccount.trim()) {
      newErrors.bankAccount = t('GdprVop.errors.bankAccount');
    }
    if (returnType === 'pouze' && !partialItemsText.trim()) {
      newErrors.partialItemsText = t('GdprVop.errors.partialItems');
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      if (!supabase.from) {
        throw new Error('Supabase client is not initialized');
      }

      // Save to database
      const { error: dbError } = await supabase
        .from('withdrawals')
        .insert([{
          order_number: orderNumber.trim(),
          email: email.trim(),
          bank_account: refundMethod === 'bank' ? bankAccount.trim() : null,
          return_type: returnType,
          partial_items_text: returnType === 'pouze' ? partialItemsText.trim() : null,
          refund_method: refundMethod,
          status: 'Čeká na zpracování'
        }]);

      if (dbError) throw dbError;

      // Trigger Edge Function to send email confirmation
      try {
        const { error: fnError } = await supabase.functions.invoke('send-withdrawal-email', {
          body: {
            orderNumber: orderNumber.trim(),
            email: email.trim(),
            bankAccount: refundMethod === 'bank' ? bankAccount.trim() : null,
            returnType: returnType,
            partialItemsText: returnType === 'pouze' ? partialItemsText.trim() : null,
            refundMethod: refundMethod,
            lang: lang
          }
        });
        if (fnError) console.warn('Edge Function email dispatch failed:', fnError);
      } catch (errFn) {
        console.warn('Edge Function email invoke failed:', errFn);
      }

      const now = new Date();
      const formattedDate = now.toLocaleDateString(lang === 'EN' ? 'en-US' : 'cs-CZ');
      const formattedTime = now.toLocaleTimeString(lang === 'EN' ? 'en-US' : 'cs-CZ', { hour: '2-digit', minute: '2-digit' });

      setSubmittedData({
        orderNumber,
        email,
        bankAccount: refundMethod === 'bank' ? bankAccount : '',
        returnType,
        partialItemsText,
        refundMethod,
        date: formattedDate,
        time: formattedTime
      });
      setIsSubmitted(true);
    } catch (err) {
      console.error('Error submitting withdrawal form:', err);
      setSubmitError(lang === 'CZ'
        ? 'Nepodařilo se odeslat odstoupení od smlouvy. Zkontrolujte prosím připojení nebo zda je vytvořena příslušná tabulka.'
        : 'Failed to submit withdrawal request. Please check your connection or database setup.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container fade-in" style={{ paddingTop: '20px', paddingBottom: '60px', textAlign: 'left' }}>
      <h1 className="sr-only">
        {lang === 'EN' 
          ? 'Documents, Terms of Service and Privacy Policy - NORTHVALE s.r.o.' 
          : 'Dokumenty, Obchodní podmínky a Ochrana osobních údajů - NORTHVALE s.r.o.'}
      </h1>

      {/* Breadcrumbs */}
      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px' }}>
        <span style={{ cursor: 'pointer' }} onClick={() => setActivePage('home')}>{t('common.home')}</span>
        <span> &raquo; </span>
        <span style={{ color: 'var(--color-gold)', fontWeight: '700' }}>{lang === 'EN' ? 'Documents' : 'Dokumenty'}</span>
      </div>

      <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        
        {/* Left Side: Document Selector Tabs */}
        <aside style={{
          flex: '1 1 250px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          position: 'sticky',
          top: '90px'
        }}>
          <button
            onClick={() => setActiveTab('doprava')}
            className={`btn ${activeTab === 'doprava' ? 'btn-primary' : ''}`}
            style={{
              width: '100%',
              padding: '14px',
              fontWeight: '800',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '13px',
              backgroundColor: activeTab === 'doprava' ? 'var(--color-gold)' : 'var(--bg-secondary)',
              color: activeTab === 'doprava' ? '#000' : 'var(--text-muted)',
              border: activeTab === 'doprava' ? '1px solid var(--color-gold)' : '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg> 
            {lang === 'EN' ? 'Shipping & Payment' : 'Doprava a platba'}
          </button>
          <button
            onClick={() => setActiveTab('vop')}
            className={`btn ${activeTab === 'vop' ? 'btn-primary' : ''}`}
            style={{
              width: '100%',
              padding: '14px',
              fontWeight: '800',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '13px',
              backgroundColor: activeTab === 'vop' ? 'var(--color-gold)' : 'var(--bg-secondary)',
              color: activeTab === 'vop' ? '#000' : 'var(--text-muted)',
              border: activeTab === 'vop' ? '1px solid var(--color-gold)' : '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg> 
            {t('Footer.terms')}
          </button>
          <button
            onClick={() => setActiveTab('gdpr')}
            className={`btn ${activeTab === 'gdpr' ? 'btn-primary' : ''}`}
            style={{
              width: '100%',
              padding: '14px',
              fontWeight: '800',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '13px',
              backgroundColor: activeTab === 'gdpr' ? 'var(--color-gold)' : 'var(--bg-secondary)',
              color: activeTab === 'gdpr' ? '#000' : 'var(--text-muted)',
              border: activeTab === 'gdpr' ? '1px solid var(--color-gold)' : '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg> 
            {t('Footer.privacy')}
          </button>
          <button
            onClick={() => setActiveTab('odstoupeni')}
            className={`btn ${activeTab === 'odstoupeni' ? 'btn-primary' : ''}`}
            style={{
              width: '100%',
              padding: '14px',
              fontWeight: '800',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '13px',
              backgroundColor: activeTab === 'odstoupeni' ? 'var(--color-gold)' : 'var(--bg-secondary)',
              color: activeTab === 'odstoupeni' ? '#000' : 'var(--text-muted)',
              border: activeTab === 'odstoupeni' ? '1px solid var(--color-gold)' : '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg> 
            {lang === 'EN' ? 'Order Withdrawal' : 'Odstoupení od smlouvy'}
          </button>

          <div style={{
            padding: '20px',
            fontSize: '12px',
            color: 'var(--text-muted)',
            marginTop: '20px',
            lineHeight: '1.5',
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)'
          }}>
            <strong>{t('GdprVop.advisorTitle')}</strong><br />
            {lang === 'EN' ? (
              <>If you have any questions regarding our terms, reach out at <a href="mailto:info@northvaletcg.eu" style={{ color: 'var(--color-gold)', textDecoration: 'none' }}>info@northvaletcg.eu</a> or call us at <a href="tel:+420739666779" style={{ color: 'var(--color-gold)', textDecoration: 'none' }}>+420 739 666 779</a>.</>
            ) : (
              <>Máte-li jakékoliv dotazy k našim podmínkám, kontaktujte nás na <a href="mailto:info@northvaletcg.eu" style={{ color: 'var(--color-gold)', textDecoration: 'none' }}>info@northvaletcg.eu</a> nebo na telefonu <a href="tel:+420739666779" style={{ color: 'var(--color-gold)', textDecoration: 'none' }}>+420 739 666 779</a>.</>
            )}
          </div>
        </aside>

        {/* Right Side: Document Content Display */}
        <main style={{
          flex: '3 1 500px',
          padding: '40px',
          boxSizing: 'border-box',
          lineHeight: '1.6',
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)'
        }}>
          {activeTab === 'doprava' && (
            lang === 'EN' ? (
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: '800', margin: '0 0 20px 0', color: 'var(--text-main)', fontFamily: 'var(--font-heading)' }}>
                  SHIPPING & PAYMENT
                </h2>
                <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', marginBottom: '24px' }}>
                  At the online store <strong>northvaletcg.eu</strong>, we pride ourselves on rapid delivery, secure payment methods, and above all, our completely uncompromising standard of collector packaging. We understand the value collectible cards hold for you, and we do everything possible to ensure they arrive in flawless condition.
                </p>
                
                <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--color-gold)', margin: '24px 0 12px 0' }}>1. DELIVERY METHODS AND PRICES (CZ)</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  We utilize reliable carriers to deliver your parcels. For orders with a value <strong>over 2,000 CZK</strong>, shipping is <strong>FREE</strong> (applicable for Packeta/Zásilkovna, GLS, and DPD).
                </p>
                <ul style={{ paddingLeft: '20px', fontSize: '13px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <li><strong>Packeta (Zásilkovna) – Pick-up Points and Z-BOXes:</strong> 79 CZK (Typically within 24–48 hours from dispatch. You can collect your package at any of thousands of pick-up points or self-service Z-BOXes open 24/7).</li>
                  <li><strong>GLS – Home Delivery:</strong> 99 CZK (Next business day from dispatch. Delivered by courier directly to your home or office).</li>
                  <li><strong>DPD – Home Delivery:</strong> 109 CZK (Next business day from dispatch. Convenient home delivery with options to adjust delivery times).</li>
                  <li><strong>Czech Post – Registered Letter (raw cards only):</strong> 79 CZK (2–3 business days from dispatch. Allowed exclusively for orders containing only raw single cards up to a total value of 1,000 CZK).</li>
                  <li><strong>Local Pick-up:</strong> FREE (Bratří Čapků 1095, 534 01 Holice, or by appointment at our pickup point in Pardubice).</li>
                </ul>

                <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--color-gold)', margin: '24px 0 12px 0' }}>2. COLLECTOR-GRADE PACKAGING STANDARD (Pack Safety)</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  The way collectible cards are packed determines their physical condition and future value. Our packaging standards are as follows:
                </p>
                <h4 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main)', margin: '16px 0 8px 0' }}>How we pack raw cards (Singles)</h4>
                <ol style={{ paddingLeft: '20px', fontSize: '13px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <li><strong>Penny Sleeve:</strong> Each raw card is first placed upside down into a thin protective sleeve to prevent it from sliding out during vibrations.</li>
                  <li><strong>Pull-Tab:</strong> We attach a pull-tab to the back of the sleeve. You can easily pull the card out of the toploader by pulling the tab, with zero risk of bending edges or corners.</li>
                  <li><strong>Toploader:</strong> The sleeved card is inserted into a rigid plastic sleeve (toploader) to prevent any mechanical damage.</li>
                  <li><strong>Cardboard Sandwich:</strong> The toploader is placed between two thick pieces of corrugated cardboard extending beyond its dimensions, secured with low-tack painter's tape (leaves no glue residue).</li>
                  <li><strong>Bubble Envelope:</strong> The entire cardboard sandwich is placed in a high-quality bubble mailer. The card is thus 100% protected against shocks.</li>
                </ol>
                <h4 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main)', margin: '16px 0 8px 0' }}>How we pack boxed products</h4>
                <ul style={{ paddingLeft: '20px', fontSize: '13px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <li>Displays, Booster Boxes, and Elite Trainer Boxes (ETBs) are packed exclusively in sturdy, new 5-layer cardboard boxes.</li>
                  <li>Products are wrapped in a thick layer of bubble wrap, and empty space in the box is filled with paper padding or air cushions.</li>
                  <li>Box corners are reinforced with packing tape. We guarantee that the original manufacturer's shrink wrap will arrive fully intact.</li>
                </ul>

                <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--color-gold)', margin: '24px 0 12px 0' }}>3. PAYMENT OPTIONS</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  We offer secure and rapid payment methods for immediate processing of your order:
                </p>
                <ul style={{ paddingLeft: '20px', fontSize: '13px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <li><strong>GP Webpay Payment Gateway (FREE):</strong> Fast payments via Visa, Mastercard, or instant online bank transfers. The gateway is operated by Global Payments s.r.o. All transactions are secure and encrypted.</li>
                  <li><strong>Standard Bank Transfer (FREE):</strong> After completing your order, you will receive an email with payment instructions (account number, variable symbol, and a QR code).</li>
                  <li><strong>Cash on Delivery (25 CZK surcharge):</strong> Pay in cash or by card directly to the courier upon receiving the parcel.</li>
                  <li><strong>Store Credit – Customer Balance (FREE):</strong> If you have a Store Credit balance on your user account (e.g., from buylist trade-ins), you can apply it as a discount on all or part of your purchase.</li>
                </ul>

                <div id="preorder-info-section" className="preorder-info-section-container" style={{
                  marginTop: '40px',
                  padding: '16px 12px 16px 16px',
                  borderRadius: 'var(--radius-md)',
                  borderLeft: '3px solid transparent',
                  transition: 'all 0.3s ease-in-out'
                }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--color-gold)', margin: '0 0 12px 0' }}>4. HOW DO PRE-ORDERS WORK?</h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                    Pre-orders allow you to reserve rare and limited edition products before they are officially released. We follow these transparent guidelines:
                  </p>
                  <ul style={{ paddingLeft: '20px', fontSize: '13px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <li><strong>Allocation Guarantee:</strong> By pre-ordering, you secure a piece of the distributor allocation. We guarantee the reservation of your purchased quantity from our confirmed deliveries.</li>
                    <li><strong>Price Guarantee:</strong> The price you pay at pre-order is final. Even if market value increases after release (common in TCG), you will not pay anything extra.</li>
                    <li><strong>Consolidated Shipping:</strong> If you purchase a pre-order item along with in-stock items, the entire order will ship together once the pre-ordered item is released. If you wish to receive in-stock items immediately, please place two separate orders.</li>
                    <li><strong>Expected Release Date:</strong> Expected release dates are based on publisher/distributor information. Rare release delays by the publisher may occur, in which case we will notify you immediately.</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: '800', margin: '0 0 20px 0', color: 'var(--text-main)', fontFamily: 'var(--font-heading)' }}>
                  DOPRAVA A PLATBA
                </h2>
                <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', marginBottom: '24px' }}>
                  Na e-shopu <strong>northvaletcg.eu</strong> si zakládáme na rychlém doručení, bezpečných platbách a především na absolutně nekompromisním standardu balení. Víme, jakou hodnotu pro vás mají sběratelské karty, a děláme vše pro to, aby dorazily v bezchybném stavu.
                </p>
                
                <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--color-gold)', margin: '24px 0 12px 0' }}>1. ZPŮSOBY A CENY DORUČENÍ (ČR)</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  Pro doručování zásilek využíváme spolehlivé dopravce. U objednávek s hodnotou <strong>nad 2 000 Kč</strong> je doprava <strong>ZDARMA</strong> (platí pro Zásilkovnu, GLS a DPD).
                </p>
                <ul style={{ paddingLeft: '20px', fontSize: '13px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <li><strong>Zásilkovna – Výdejní místa a Z-BOXy:</strong> 79 Kč (Obvykle do 24–48 hodin od expedice. Zásilku si můžete vyzvednout na kterémkoli z tisíců výdejních míst nebo v samoobslužných Z-BOXech otevřených 24/7).</li>
                  <li><strong>GLS – Doručení na adresu:</strong> 99 Kč (Do druhého pracovního dne od expedice. Doručení kurýrem přímo k vám domů nebo do zaměstnání).</li>
                  <li><strong>DPD – Doručení na adresu:</strong> 109 Kč (Do druhého pracovního dne od expedice. Komfortní doručení na adresu s možností změny termínu).</li>
                  <li><strong>Česká pošta – Doporučené psaní (pouze pro kusové karty):</strong> 79 Kč (2–3 pracovní dny od expedice. Povoleno výhradně pro objednávky obsahující pouze kusové karty do celkové hodnoty 1 000 Kč).</li>
                  <li><strong>Osobní odběr:</strong> ZDARMA (Bratří Čapků 1095, 534 01 Holice, případně dle domluvy na určeném odběrném místě v Pardubicích).</li>
                </ul>

                <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--color-gold)', margin: '24px 0 12px 0' }}>2. SBĚRATELSKÝ STANDARD BALENÍ (Pack Safety)</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  Způsob balení sběratelských karet rozhoduje o jejich stavu a budoucí hodnotě. Naše standardy balení jsou následující:
                </p>
                <h4 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main)', margin: '16px 0 8px 0' }}>Jak balíme kusové karty (Singles)</h4>
                <ol style={{ paddingLeft: '20px', fontSize: '13px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <li><strong>Penny Sleeve:</strong> Každou kusovou kartu nejprve vložíme do tenkého ochranného obalu hlavou dolů, aby se při otřesech nevysunula.</li>
                  <li><strong>Pull-Tab (Poutko):</strong> Na zadní stranu obalu nalepíme vytahovací poutko. Kartu z toploaderu snadno vytáhnete tahem za poutko bez rizika ohnutí hran.</li>
                  <li><strong>Toploader:</strong> Karta v obalu se zasune do pevného plastového pouzdra (toploaderu), které zabrání mechanickému poškození.</li>
                  <li><strong>Kartonový sendvič:</strong> Toploader vložíme mezi dva silné pláty vlnité lepenky přesahující rozměry toploaderu a zafixujeme papírovou malířskou páskou (nezanechává stopy lepidla).</li>
                  <li><strong>Bublinková obálka:</strong> Celý sendvič vložíme do kvalitní bublinkové obálky. Karta je tak 100% chráněna proti nárazům.</li>
                </ol>
                <h4 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main)', margin: '16px 0 8px 0' }}>Jak balíme balené produkty</h4>
                <ul style={{ paddingLeft: '20px', fontSize: '13px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <li>Displeje, Booster Boxy a Elite Trainer Boxy (ETB) balíme výhradně do pevných, nových pětivrstvých kartonových krabic.</li>
                  <li>Produkty obalujeme silnou vrstvou bublinkové fólie a zbylý prostor v krabici vyplňujeme papírovou střiží nebo vzduchovými polštářky.</li>
                  <li>Rohy krabic zpevňujeme lepicí páskou. Garantujeme, že originální smršťovací fólie (shrink wrap) s logem výrobce dorazí neporušená.</li>
                </ul>

                <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--color-gold)', margin: '24px 0 12px 0' }}>3. MOŽNOSTI PLATBY</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  Nabízíme bezpečné a rychlé platební metody pro okamžité vyřízení vaší objednávky:
                </p>
                <ul style={{ paddingLeft: '20px', fontSize: '13px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <li><strong>Platební brána GP Webpay (ZDARMA):</strong> Rychlá platba kartami Visa, Mastercard nebo zrychleným bankovním převodem. Provozovatelem platební brány je společnost Global Payments s.r.o. Veškeré transakce jsou zabezpečené a šifrované.</li>
                  <li><strong>Klasický bankovní převod (ZDARMA):</strong> Po dokončení objednávky obdržíte e-mail s podklady pro platbu (číslo účtu, variabilní symbol a QR kód).</li>
                  <li><strong>Platba na dobírku (Příplatek 25 Kč):</strong> Objednávku zaplatíte hotově nebo kartou přímo kurýrovi při převzetí zásilky.</li>
                  <li><strong>Store Credit – Zákaznický kredit (ZDARMA):</strong> Pokud máte na svém uživatelském účtu zůstatek Store Kreditu (např. z výkupu), můžete jej uplatnit jako slevu na celou objednávku nebo její část.</li>
                </ul>

                <div id="preorder-info-section" className="preorder-info-section-container" style={{
                  marginTop: '40px',
                  padding: '16px 12px 16px 16px',
                  borderRadius: 'var(--radius-md)',
                  borderLeft: '3px solid transparent',
                  transition: 'all 0.3s ease-in-out'
                }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--color-gold)', margin: '0 0 12px 0' }}>4. JAK FUNGUJÍ PŘEDOBJEDNÁVKY?</h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                    Předobjednávky vám umožňují zajistit si vzácné a limitované sběratelské edice ještě před jejich oficiálním vydáním. Fungují podle následujících přehledných pravidel:
                  </p>
                  <ul style={{ paddingLeft: '20px', fontSize: '13px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <li><strong>Garance alokace:</strong> Předobjednávkou si zajišťujete kus z budoucí alokace výrobce. Garantujeme vám rezervaci zakoupeného počtu kusů z našich potvrzených dodávek.</li>
                    <li><strong>Garance ceny:</strong> Cena, za kterou produkt předobjednáte, je konečná a pevná. Pokud se tržní cena po vydání zvýší (což je u sběratelských karet běžné), vy nic nedoplácíte.</li>
                    <li><strong>Společné odeslání zásilky (DŮLEŽITÉ):</strong> Pokud v rámci jedné objednávky zakoupíte předobjednávku i produkty, které jsou aktuálně skladem, celou zásilku odešleme společně, jakmile bude předobjednaný produkt naskladněn. Pokud si přejete skladové produkty obdržet ihned, vytvořte prosím dvě samostatné objednávky.</li>
                    <li><strong>Očekávané termíny vydání:</strong> Očekávané datum vydání uvádíme na základě oficiálních informací od výrobce/distributora. V případě nepředvídaného zpoždění ze strany výrobce vás budeme neprodleně informovat.</li>
                  </ul>
                </div>
              </div>
            )
          )}

          {activeTab === 'vop' && (
            lang === 'EN' ? (
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: '800', margin: '0 0 20px 0', color: 'var(--text-main)', fontFamily: 'var(--font-heading)' }}>
                  TERMS AND CONDITIONS
                </h2>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '24px' }}>
                  of the business company <strong>NORTHVALE s.r.o.</strong><br />
                  registered address: Bratří Čapků 1095, 534 01 Holice<br />
                  identification number (IČO): 29618142 | VAT ID (DIČ): CZ29618142<br />
                  registered in the Commercial Register maintained by the Regional Court in Hradec Králové, Section C, File 56872<br />
                  for the sale of goods via the online store at: <strong>northvaletcg.eu</strong>
                </p>
                <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.06)', margin: '20px 0' }} />

                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>1. INTRODUCTORY PROVISIONS</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  1.1. These Terms and Conditions (hereinafter referred to as the "Terms") of the business company NORTHVALE s.r.o., with registered office at Bratří Čapků 1095, 534 01 Holice, ID No.: 29618142, registered in the Commercial Register maintained by the Regional Court in Hradec Králové, Section C, File 56872 (hereinafter referred to as the "Seller") govern, in accordance with Section 1751(1) of Act No. 89/2012 Coll., the Civil Code, as amended (hereinafter referred to as the "Civil Code"), the mutual rights and obligations of the contracting parties arising in connection with or based on a purchase agreement (hereinafter referred to as the "Purchase Agreement") concluded between the Seller and another natural person (hereinafter referred to as the "Buyer") via the Seller's online store at northvaletcg.eu.
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  1.2. The Terms apply exclusively to cases where the person intending to purchase goods from the Seller acts as a consumer. A consumer is any natural person who concludes an agreement with a business entity outside the scope of their business or professional activity.
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  1.3. Provisions deviating from these Terms may be agreed upon in the Purchase Agreement. Such deviating provisions in the Purchase Agreement take precedence over the provisions of these Terms.
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  1.4. The provisions of the Terms are an integral part of the Purchase Agreement. The Purchase Agreement and the Terms are drawn up in the Czech language.
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  1.5. The Seller may modify or amend the wording of these Terms. This provision does not affect the rights and obligations that arose while a previous version of the Terms was in effect.
                </p>

                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>2. USER ACCOUNT AND STORE CREDIT</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  2.1. Upon the Buyer's registration on the website, the Buyer can access their user interface (user account), from which they can place orders for goods.
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  2.2. When registering and ordering goods, the Buyer must provide correct and truthful information and update it immediately in case of any changes.
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  2.3. Access to the user account is secured by a username and password. The Buyer is obliged to maintain confidentiality regarding their account credentials.
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  2.4. The Seller may cancel the user account, particularly if the Buyer has not used the account for more than 24 months, or if the Buyer breaches their obligations under the Purchase Agreement.
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  2.5. The Buyer acknowledges that the user account may not be available continuously due to necessary system maintenance.
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  2.6. <strong>Store Credit (Customer balance):</strong> A registered Buyer may hold a virtual credit balance (Store Credit). One credit unit corresponds to 1 CZK. Store Credit is non-transferable, can only be used as a discount on purchases, and cannot be exchanged for cash (except for payouts resulting from approved card buybacks).
                </p>

                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>3. CONCLUSION OF THE PURCHASE AGREEMENT</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  3.1. All presentations of goods in the online store interface are informative, and the Seller is not obliged to conclude a Purchase Agreement regarding these goods.
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  3.2. The online store interface contains information about the goods, including prices and withdrawal return costs. Prices include VAT.
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  3.3. Information regarding packaging and delivery costs applies within the territory of the Czech Republic.
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  3.4. To order goods, the Buyer completes the order form in the online store interface (selecting goods, payment method, and shipping method).
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  3.5. Before submitting the order, the Buyer is allowed to check and modify their entered details.
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  3.6. <strong>Completing the Order:</strong> The Buyer submits the order by clicking the button labeled <strong>"Place Order & Pay"</strong> (creating a binding obligation to pay). The Seller will confirm receipt of the order by email.
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  3.7. <strong>Conclusion of the Agreement:</strong> The contractual relationship is established upon the delivery of the order acceptance by the Seller (e.g., dispatch confirmation email).
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  3.8. The Buyer agrees to the use of distance communication means. Costs are borne by the Buyer.
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  3.9. Due to the volatile nature of TCG markets, the Seller reserves the right not to accept an order in the event of an obvious pricing error or if stock is sold out.
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  3.10. <strong>Order Cancellation by the Buyer:</strong> The Buyer has the right to cancel their order without any penalties at any time before the order is dispatched or handed over to the carrier. Order cancellation requests can be made by phone at +420 739 666 779 or via email at info@northvaletcg.eu.
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  3.11. <strong>Order Cancellation by the Seller:</strong> The Seller reserves the right to cancel an order (or part thereof) in the event of an obvious pricing error (due to system issues or data import failures), if the goods are no longer manufactured or supplied, or if the stock is permanently sold out. The Buyer will be notified immediately, and any payments already received will be returned within 14 days.
                </p>

                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>4. PRICE OF GOODS AND PAYMENT TERMS</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  4.1. The price of goods can be paid in cash upon personal pickup, cashless via the GP Webpay payment gateway, by standard bank transfer, on delivery (COD), or by applying Store Credit.
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  4.1.1. Cashless payments by card and instant bank transfers are processed via the secure GP Webpay gateway. Transmission of sensitive data is fully encrypted using SSL / TLS protocols.
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  4.2. Along with the purchase price, the Buyer must pay packaging and delivery costs.
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  4.3. The Seller does not require a deposit, except in cases defined in Article 4.6.
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  4.4. For cash or COD payments, the price is due upon receipt. For bank transfers, it is due within 5 business days. Gateway payments are due immediately.
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  4.5. For bank transfers, the Buyer must use the variable symbol (order number).
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  4.6. The Seller is entitled to require full payment before shipping the goods, especially for unverified orders.
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  4.7. Discounts cannot be combined. If a discount is shown, the reference original price is the lowest price offered in the past 30 days (in compliance with the Omnibus Directive).
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  4.8. A tax invoice (invoice) is issued after payment and sent electronically. The Seller is a VAT payer.
                </p>

                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>5. SHIPPING AND DELIVERY (Collector Standard)</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  5.1. Packaging standards:
                  <br />• <strong>Raw cards:</strong> Sleeve, toploader with Pull-Tab, cardboard sandwich, bubble envelope.
                  <br />• <strong>Boxed products:</strong> Sturdy boxes, thick bubble wrap, and fillers to prevent wrap tear or corner dents.
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  5.2. Delivery methods: Packeta, DPD, GLS, Czech Post, or personal pick-up in Pardubice or Holice.
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  5.3 - 5.5. The Buyer bears the risks of special transport and covers the costs of repeat delivery in case of failure to collect.
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  5.6. <strong>Parcel Inspection:</strong> Upon delivery, the Buyer must inspect the packaging. If there is damage (crushed box, torn wrapping), the Buyer must refuse delivery and file a damage report with the courier.
                </p>

                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>6. WITHDRAWAL FROM THE AGREEMENT</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  6.1. A consumer Buyer has the right to withdraw from the Purchase Agreement without stating a reason within fourteen (14) days of receiving the goods.
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  6.2. The withdrawal notice can be sent to the registered office address of NORTHVALE s.r.o., Bratří Čapků 1095, 534 01 Holice, or via email to info@northvaletcg.eu.
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  6.3. For swift processing, the Buyer is highly recommended to use our **online interactive form** available directly on our website under the <span style={{ color: 'var(--color-gold)', fontWeight: '700', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setActiveTab('odstoupeni')}>Order Withdrawal</span> tab. Using this form ensures immediate registration of the request and speeds up the refund process.
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  6.4. The Buyer must return the goods to the Seller within 14 days of withdrawal. The Buyer bears the direct costs of returning the goods (e.g. postage/shipping fees).
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  6.5. <strong>Refund Conditions:</strong> The Seller will refund all payments received from the Buyer (including shipping costs corresponding to the cheapest delivery method offered) within 14 days of receiving the withdrawal notice. The refund will be processed using the same payment method as the original transaction (including refunding to the payment card if paid via the GP Webpay gateway) or by bank transfer to the account specified by the Buyer. The Seller is not obliged to refund the money before the returned goods are received or before the Buyer provides proof of dispatch.
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  6.6. <strong>Important notice for collectors:</strong> Opening or damaging the original protective shrink wrap of boxed products (Booster Boxes, ETBs, Boosters) dramatically reduces their collectible and investment value. The Seller will claim compensation for the reduction in value (pursuant to Section 1833 of the Czech Civil Code), which may amount to 30% to 50% of the purchase price and will be deducted from the refund. For Singles, cards must not show any signs of wear, scratches, or binder ring dents.
                </p>

                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>7. RIGHTS FROM DEFECTIVE PERFORMANCE (Complaints)</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  7.1 - 7.2. The Seller guarantees that the goods are free of defects upon receipt (description, quality, quantity match).
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  7.3 - 7.4. The statutory warranty period is 2 years. If a defect appears within the first year, it is assumed to have existed upon receipt.
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  7.5 - 7.6. The Buyer can request a replacement or repair. For significant or repeated defects, they may claim a discount or withdraw from the agreement.
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  7.7. Warranty claims must be sent to the registered office: NORTHVALE s.r.o., Bratří Čapků 1095, 534 01 Holice.
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  7.8. Claims must be processed within thirty (30) days, unless agreed otherwise.
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  7.9. The warranty does not cover normal wear and tear, damage from improper handling (e.g., bent card corners or ring dents), or mechanical damage caused after receipt.
                </p>

                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>8. OUT-OF-COURT DISPUTE RESOLUTION (ADR)</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  8.1. Complaints are handled via email at info@northvaletcg.eu.
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  8.2. The Czech Trade Inspection Authority (Česká obchodní inspekce), with its registered office at Štěpánská 567/15, 120 00 Prague 2, ID: 000 20 869, main website: <a href="https://www.coi.cz" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-gold)', textDecoration: 'underline' }}>www.coi.cz</a>, online dispute resolution (ADR) form website: <a href="https://adr.coi.cz/cs" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-gold)', textDecoration: 'underline' }}>https://adr.coi.cz/cs</a>, is authorized for the out-of-court resolution of consumer disputes arising from the Purchase Agreement. The online dispute resolution platform located at <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-gold)', textDecoration: 'underline' }}>https://ec.europa.eu/consumers/odr</a> can be used to resolve disputes between the Seller and the Buyer.
                </p>

                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>9. FINAL PROVISIONS</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  9.1. The contractual relationship is governed by Czech law.
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  9.2. The invalidity of one provision does not affect the validity of the others.
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  9.3. Agreements are archived in electronic form.
                </p>

                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '20px' }}>In Holice, on June 26, 2026</p>
              </div>
            ) : (
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: '800', margin: '0 0 20px 0', color: 'var(--text-main)', fontFamily: 'var(--font-heading)' }}>
                  VŠEOBECNÉ OBCHODNÍ PODMÍNKY
                </h2>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '24px' }}>
                  obchodní společnosti <strong>NORTHVALE s.r.o.</strong><br />
                  se sídlem: Bratří Čapků 1095, 534 01 Holice<br />
                  identifikační číslo (IČO): 29618142 | DIČ: CZ29618142<br />
                  zapsané v obchodním rejstříku vedeném Krajským soudem v Hradci Králové, oddíl C, vložka 56872<br />
                  pro prodej zboží prostřednictvím on-line obchodu na internetové adrese: <strong>northvaletcg.eu</strong>
                </p>
                <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.06)', margin: '20px 0' }} />

                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>1. ÚVODNÍ USTANOVENÍ</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  1.1. Tyto všeobecné obchodní podmínky (dále jen „obchodní podmínky“) obchodní společnosti NORTHVALE s.r.o., se sídlem Bratří Čapků 1095, 534 01 Holice, identifikační číslo: 29618142, zapsané v obchodním rejstříku vedeném Krajským soudem v Hradci Králové, oddíl C, vložka 56872 (dále jen „prodávající“) upravují v souladu s ustanovením § 1751 odst. 1 zákona č. 89/2012 Sb., občanský zákoník, ve znění pozdějších předpisů (dále jen „občanský zákoník“) vzájemná práva a povinnosti smluvních stran vzniklé v souvislosti nebo na základě kupní smlouvy (dále jen „kupní smlouva“) uzavírané mezi prodávajícím a jinou fyzickou osobou (dále jen „kupující“) prostřednictvím internetového obchodu prodávajícího na adrese northvaletcg.eu.
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  1.2. Obchodní podmínky se vztahují na případy, kdy osoba, která má v úmyslu nakoupit zboží od prodávajícího, je spotřebitelem. Spotřebitelem je každý člověk, který mimo rámec své podnikatelské činnosti uzavírá smlouvu s podnikatelem.
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  1.3. Ustanovení odchylná od obchodních podmínek je možné sjednat v kupní smlouvě. Odchylná ujednání v kupní smlouvě mají přednost před ustanoveními obchodních podmínek.
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  1.4. Tyto obchodní podmínky a kupní smlouva se vyhotovují v českém jazyce.
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  1.5. Znění obchodních podmínek může prodávající měnit či doplňovat. Tímto ustanovením nejsou dotčena práva a povinnosti vzniklá po dobu účinnosti předchozího znění.
                </p>

                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>2. UŽIVATELSKÝ ÚČET A STORE CREDIT</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  2.1. Na základě registrace kupujícího provedené na webové stránce může kupující přistupovat do svého uživatelského rozhraní (uživatelský účet), odkud může provádět objednávání zboží.
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  2.2. Při registraci a při objednávání zboží je kupující povinen uvádět správně a pravdivě všechny údaje a při jakékoliv změně je aktualizovat.
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  2.3. Přístup k uživatelskému účtu je zabezpečen uživatelským jménem a heslem. Kupující je povinen zachovávat mlčenlivost o přístupových údajích.
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  2.4. Prodávající může zrušit uživatelský účet, zejména v případě, kdy kupující svůj účet déle než 24 měsíců nevyužívá nebo poruší své povinnosti z kupní smlouvy.
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  2.5. Kupující bere na vědomí, že uživatelský účet nemusí být dostupný nepřetržitě s ohledem na nutnou údržbu.
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  2.6. <strong>Store Credit (Zákaznický kredit):</strong> Registrovaný kupující může disponovat virtuálním kreditem (Store Credit). 1 jednotka kreditu odpovídá hodnotě 1 Kč. Store Credit je nepřenosný, lze jej uplatnit jako slevu na nákup, a nelze jej směnit za hotovost (vyjma výplat z titulu schváleného výkupu).
                </p>

                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>3. UZAVŘENÍ KUPNÍ SMLOUVY</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  3.1. Veškerá prezentace zboží umístěná ve webovém rozhraní obchodu je informativního charakteru a prodávající není povinen uzavřít kupní smlouvu ohledně tohoto zboží.
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  3.2. Webové rozhraní obchodu obsahuje informace o zboží, včetně uvedení cen a nákladů za vrácení. Ceny jsou uvedeny včetně DPH.
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  3.3. Informace o nákladech spojených s balením a dodáním zboží platí v rámci České republiky.
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  3.4. Pro objednání zboží vyplní kupující objednávkový formulář ve webovém rozhraní (výběr zboží, způsob úhrady, doprava).
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  3.5. Před zasláním objednávky je kupujícímu umožněno zkontrolovat a měnit údaje.
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  3.6. <strong>Proces dokončení objednávky:</strong> Kupující odešle objednávku kliknutím na tlačítko označené <strong>„Objednat a zaplatit“</strong> (objednávka zavazující k platbě). Obdržení objednávky prodávající potvrdí elektronickou poštou.
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  3.7. <strong>Vznik kupní smlouvy:</strong> Smluvní vztah vzniká až doručením přijetí (akceptace) objednávky prodávajícím (např. potvrzení o expedici zboží).
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  3.8. Kupující souhlasí s použitím komunikačních prostředků na dálku. Náklady si hradí sám.
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  3.9. Vzhledem k povaze TCG si prodávající vyhrazuje právo neakceptovat objednávku v případě zjevné chyby v ceně či vyprodání skladových zásob.
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  3.10. <strong>Storno objednávky kupujícím:</strong> Kupující má právo zrušit (stornovat) svou objednávku bez jakýchkoliv sankcí až do okamžiku, kdy je objednávka expedována nebo předána dopravci. Zrušení objednávky lze provést telefonicky na čísle +420 739 666 779 nebo e-mailem na adrese info@northvaletcg.eu.
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  3.11. <strong>Storno objednávky prodávajícím:</strong> Prodávající je oprávněn zrušit objednávku (či její část) v případě zjevné chyby v ceně zboží (např. chybný import či systémová chyba), pokud se zboží již nevyrábí či nedodává, nebo pokud je skladová zásoba dlouhodobě vyprodaná. O stornu bude kupující bezodkladně informován a uhrazené finanční prostředky mu budou vráceny nejpozději do 14 dnů.
                </p>

                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>4. CENA ZBOŽÍ A PLATEBNÍ PODMÍNKY</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  4.1. Cenu zboží může kupující uhradit v hotovosti při osobním odběru, bezhotovostně přes platební bránu GP Webpay, převodem na bankovní účet, na dobírku, nebo uplatněním Store Kreditu.
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  4.1.1. Bezhotovostní platby platební kartou a zrychleným převodem jsou zabezpečeny platební bránou GP Webpay. Přenos citlivých dat a informací o platbách probíhá v šifrované podobě s využitím standardu SSL / TLS.
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  4.2. Společně s kupní cenou je kupující povinen zaplatit náklady spojené s balením a dodáním.
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  4.3. Prodávající nepožaduje zálohu, s výjimkou případů dle čl. 4.6.
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  4.4. Při platbě v hotovosti či dobírkou je cena splatná při převzetí. U bankovního převodu je splatná do 5 pracovních dnů. U platební brány GP Webpay ihned.
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  4.5. U bankovního převodu je kupující povinen uvést variabilní symbol (číslo objednávky).
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  4.6. Prodávající je oprávněn požadovat uhrazení celé kupní ceny předem, zejména u neověřených objednávek.
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  4.7. Slevy z ceny nelze kombinovat. Pokud je uváděna sleva, referenční původní cena je nejnižší cena za posledních 30 dnů (v souladu s Omnibus směrnicí).
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  4.8. Daňový doklad (faktura) je vystaven po uhrazení a zaslán elektronicky. Prodávající je plátcem DPH.
                </p>

                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>5. PŘEPRAVA A DODÁNÍ ZBOŽÍ (Sběratelský standard)</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  5.1. Standardy balení:
                  <br />• <strong>Kusové karty:</strong> Sleeve, toploader s Pull-Tab, kartonový sendvič, bublinková obálka.
                  <br />• <strong>Balené produkty:</strong> Pevné krabice, bublinková fólie, plnící materiál k zamezení poškození fólie a rohů.
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  5.2. Způsoby doručení: Zásilkovna, DPD, GLS, Česká pošta a osobní odběr v Pardubicích či Holicích.
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  5.3 - 5.5. Kupující nese riziko spojené se speciální dopravou a hradí náklady na opakované doručení při své chybě.
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  5.6. <strong>Kontrola zásilky:</strong> Při převzetí je kupující povinen zkontrolovat obal a v případě poškození (proražení krabice, poškozené rohy) zásilku nepřevzít a sepsat škodní protokol.
                </p>

                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>6. ODSTOUPENÍ OD SMLOUVY</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  6.1. Kupující spotřebitel má právo odstoupit od kupní smlouvy bez udání důvodu do čtrnácti (14) dnů od převzetí zboží.
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  6.2. Odstoupení od kupní smlouvy může kupující zaslat na adresu sídla společnosti NORTHVALE s.r.o., Bratří Čapků 1095, 534 01 Holice, nebo na e-mailovou adresu info@northvaletcg.eu.
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  6.3. Pro odstoupení doporučujeme využít **on-line interaktivní formulář** dostupný přímo na našem webu v záložce <span style={{ color: 'var(--color-gold)', fontWeight: '700', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setActiveTab('odstoupeni')}>Odstoupení od smlouvy</span>. Použitím tohoto formuláře dojde k okamžitému zaevidování vaší žádosti a zrychlení procesu vrácení peněz.
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  6.4. Kupující je povinen zaslat nebo předat zboží zpět prodávajícímu do 14 dnů od odstoupení od smlouvy. Kupující nese přímé náklady spojené s vrácením zboží (např. poštovné a balné).
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  6.5. <strong>Podmínky vrácení peněz:</strong> Prodávající vrátí kupujícímu bezodkladně, nejpozději však do 14 dnů od doručení odstoupení, všechny přijaté peněžní prostředky (včetně nákladů na doručení odpovídajících nejlevnějšímu nabízenému způsobu). Prostředky budou vráceny stejným způsobem, jakým byly přijaty (včetně zpětné transakce na platební kartu, pokud byla platba provedena platební kartou přes bránu GP Webpay), případně převodem na bankovní účet určený kupujícím. Prodávající není povinen vrátit prostředky dříve, než obdrží vrácené zboží nebo než kupující prokáže, že zboží odeslal.
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  6.6. <strong>Důležité upozornění:</strong> U balených produktů (Booster Boxy, ETB apod.) poškození nebo otevření smršťovací fólie (shrink wrap) dramaticky snižuje sběratelskou hodnotu. Prodávající uplatní nárok na snížení hodnoty zboží (§ 1833 občanského zákoníku), které může činit až 30–50 % z ceny zboží.
                </p>

                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>7. PRÁVA Z VADNÉHO PLNĚNÍ (Reklamace)</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  7.1 - 7.2. Prodávající odpovídá, že věc při převzetí nemá vady (odpovídá popisu, jakosti, množství).
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  7.3 - 7.4. Záruční doba je 2 roky. Projeví-li se vada během prvního roku, má se za to, že byla přítomna již při převzetí.
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  7.5 - 7.6. Kupující může požadovat dodání nové věci nebo opravu. Při závažné nebo opakované vadě má právo na slevu či odstoupení od smlouvy.
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  7.7. Reklamace se uplatňuje na adrese sídla: NORTHVALE s.r.o., Bratří Čapků 1095, 534 01 Holice.
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  7.8. Reklamace musí být vyřízena do třiceti (30) dnů, pokud se strany nedohodnou jinak.
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  7.9. Záruka se nevztahuje na opotřebení, vady z neodborného zacházení (např. ohnutí rohů karet - ring dent) nebo mechanické poškození po převzetí.
                </p>

                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>8. MIMOSOUDNÍ ŘEŠENÍ SPORŮ (ADR)</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  8.1. Stížnosti vyřizujeme přes e-mail info@northvaletcg.eu.
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  8.2. K mimosoudnímu řešení spotřebitelských sporů z kupní smlouvy je věcně příslušná Česká obchodní inspekce, se sídlem Štěpánská 567/15, 120 00 Praha 2, IČ: 000 20 869, internetové stránky: <a href="https://www.coi.cz" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-gold)', textDecoration: 'underline' }}>www.coi.cz</a>, formulář pro podání návrhu na zahájení mimosoudního řešení spotřebitelského sporu (ADR) je k dispozici na adrese: <a href="https://adr.coi.cz/cs" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-gold)', textDecoration: 'underline' }}>https://adr.coi.cz/cs</a>. Platformu pro řešení sporů on-line nacházející se na internetové adrese <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-gold)', textDecoration: 'underline' }}>https://ec.europa.eu/consumers/odr</a> je možné rovněž využít při řešení sporů mezi prodávajícím a kupujícím.
                </p>

                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>9. ZÁVĚREČNÁ USTANOVENÍ</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  9.1. Smluvní vztah se řídí českým právem.
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  9.2. Neplatnost jednoho ustanovení nemá vliv na platnost ostatních.
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  9.3. Kupní smlouvy jsou archivovány v elektronické podobě.
                </p>

                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '20px' }}>V Holicích, dne 26. června 2026</p>
              </div>
            )
          )}

          {activeTab === 'gdpr' && (
            lang === 'EN' ? (
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: '800', margin: '0 0 20px 0', color: 'var(--text-main)', fontFamily: 'var(--font-heading)' }}>
                  PRIVACY POLICY (GDPR)
                </h2>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '24px' }}>
                  of the business company <strong>NORTHVALE s.r.o.</strong><br />
                  registered office: Bratří Čapků 1095, 534 01 Holice<br />
                  identification number (IČO): 29618142 | VAT ID (DIČ): CZ29618142<br />
                  registered in the Commercial Register maintained by the Regional Court in Hradec Králové, Section C, File 56872<br />
                  for the operation of the online store at: <strong>northvaletcg.eu</strong>
                </p>
                <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.06)', margin: '20px 0' }} />

                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>1. INTRODUCTORY PROVISIONS</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  1.1. Personal data protection is our priority. This Privacy Policy details how NORTHVALE s.r.o. (hereinafter referred to as the "Controller" or "we") collects, processes, stores, and protects the personal data of visitors and customers (hereinafter referred to as the "Data Subject" or "you") of our online store northvaletcg.eu (hereinafter referred to as the "E-shop").
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  1.2. We process personal data in compliance with Regulation (EU) 2016/679 of the European Parliament and of the Council (hereinafter referred to as the "GDPR Regulation") and in accordance with applicable national legislation on personal data processing.
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  1.3. Controller contact details:
                  <br />• <strong>Delivery Address:</strong> NORTHVALE s.r.o., Bratří Čapků 1095, 534 01 Holice
                  <br />• <strong>Email:</strong> info@northvaletcg.eu
                  <br />• <strong>Phone:</strong> +420 739 666 779
                </p>

                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>2. CATEGORIES OF PERSONAL DATA PROCESSED</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  In connection with operating our E-shop, we process the following categories of personal data:
                  <br />• <strong>Identification Data:</strong> First name, last name, title, business ID, VAT ID.
                  <br />• <strong>Contact Data:</strong> Email address, phone number, shipping and billing address.
                  <br />• <strong>Payment & Transactional Data:</strong> Bank account number, payment status, and order history.
                  <br />• <strong>Account Data:</strong> Username, hashed password, Store Credit balance, and grading submission history (PSA/Beckett/TAG).
                  <br />• <strong>Network & Analytical Data:</strong> IP address, cookie files, and browsing behavior (Google Analytics, Microsoft Clarity).
                </p>

                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>3. PURPOSES AND LEGAL BASES FOR PROCESSING</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  <strong>A. Performance of a Purchase Agreement:</strong> Processing required to fulfill, dispatch, and process orders, payments, and warranty claims. Legal basis: Art. 6(1)(b) GDPR.
                  <br /><br />
                  <strong>B. Buylist Agreement (Card buybacks):</strong> Processing to evaluate card trade-ins, credit Store Credit, or execute bank transfers. Legal basis: Art. 6(1)(b) GDPR.
                  <br /><br />
                  <strong>C. Compliance with Legal Obligations (Accounting and Taxes):</strong> Retention of tax invoices and billing documents in accordance with Czech tax laws. Legal basis: Art. 6(1)(c) GDPR.
                  <br /><br />
                  <strong>D. Legitimate Interests (Direct marketing and security):</strong> Sending newsletters to existing customers (with an easy opt-out link), fraud prevention in card buybacks, and general IT security. Legal basis: Art. 6(1)(f) GDPR.
                  <br /><br />
                  <strong>E. Consent:</strong> Newsletter delivery to non-customers, and analytical/marketing cookies. Legal basis: Art. 6(1)(a) GDPR.
                </p>

                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>4. RECIPIENTS OF PERSONAL DATA (PROCESSORS)</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  We share your data with the following processor categories:
                  <br />• <strong>Carriers:</strong> Zásilkovna s.r.o. (Packeta), DPD CZ s.r.o., GLS Czech Republic s.r.o., Czech Post, s.p.
                  <br />• <strong>Payment Gateway:</strong> Global Payments s.r.o.
                  <br />• <strong>Analytics:</strong> Google Ireland Limited (Google Analytics), Microsoft Corporation (Microsoft Clarity).
                  <br />• <strong>IT & Accounting Services:</strong> Hosting providers, accounting software.
                  <br />• <strong>Grading Services (USA):</strong> Card submissions to PSA/BGS/TAG are made anonymously under our business accounts, without sharing your personal data.
                </p>

                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>5. DATA RETENTION PERIOD</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  • <strong>Agreements:</strong> For the duration of the agreement, warranty, and statute of limitations (typically 5 years total).
                  <br />• <strong>Accounting and Taxes:</strong> Invoices and billing files are retained for 10 years.
                  <br />• <strong>Marketing:</strong> For 3 years from your last purchase, or until you object/withdraw consent.
                  <br />• <strong>Cookies:</strong> Based on your browser settings (ranging from session to 2 years).
                </p>

                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>6. YOUR RIGHTS AS A DATA SUBJECT</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  You have the right to access, rectify, erase ('right to be forgotten'), restrict processing, request data portability, object to processing, and withdraw consent. You can file complaints with the supervisory authority:
                  <br />• <strong>Office for Personal Data Protection (ÚOOÚ)</strong>, Pplk. Sochora 27, 170 00 Prague 7 (uoou.cz).
                </p>

                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>7. PERSONAL DATA SECURITY</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  We declare that we have implemented appropriate technical and organizational measures to secure your data. Access is restricted to authorized personnel bound by confidentiality. All data transfers are encrypted via HTTPS (SSL/TLS).
                </p>

                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>8. FINAL PROVISIONS</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  By submitting an order or registering, you confirm you have read and accepted this Privacy Policy. We reserve the right to modify this policy unilaterally.
                </p>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '20px' }}>In Holice, on June 26, 2026</p>
              </div>
            ) : (
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: '800', margin: '0 0 20px 0', color: 'var(--text-main)', fontFamily: 'var(--font-heading)' }}>
                  ZÁSADY OCHRANY OSOBNÍCH ÚDAJŮ (GDPR)
                </h2>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '24px' }}>
                  obchodní společnosti <strong>NORTHVALE s.r.o.</strong><br />
                  se sídlem: Bratří Čapků 1095, 534 01 Holice<br />
                  identifikační číslo (IČO): 29618142 | DIČ: CZ29618142<br />
                  zapsané v obchodním rejstříku vedeném Krajským soudem v Hradci Králové, oddíl C, vložka 56872<br />
                  pro provoz on-line obchodu na internetové adrese: <strong>northvaletcg.eu</strong>
                </p>
                <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.06)', margin: '20px 0' }} />

                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>1. ÚVODNÍ USTANOVENÍ</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  1.1. Ochrana osobních údajů je pro nás prioritou. Tyto zásady ochrany osobních údajů podrobně popisují, jakým způsobem společnost NORTHVALE s.r.o. (dále jen „správce“ nebo „my“) shromažďuje, zpracovává, uchovává a chrání osobní údaje návštěvníků a zákazníků (dále jen „subjekt údajů“ nebo „vy“) našeho internetového obchodu northvaletcg.eu (dále jen „e-shop“).
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  1.2. Osobní údaje zpracováváme v souladu s Nařízením Evropského parlamentu (EU) 2016/679 (dále jen „nařízení GDPR“) a v souladu se zákonem č. 110/2019 Sb., o zpracování osobních údajů.
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  1.3. Kontaktní údaje správce:
                  <br />• <strong>Adresa pro doručování:</strong> NORTHVALE s.r.o., Bratří Čapků 1095, 534 01 Holice
                  <br />• <strong>E-mail:</strong> info@northvaletcg.eu
                  <br />• <strong>Telefon:</strong> +420 739 666 779
                </p>

                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>2. KATEGORIE ZPRACOVÁVANÝCH OSOBNÍCH ÚDAJŮ</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  V souvislosti s provozem našeho e-shopu zpracováváme následující kategorie osobních údajů:
                  <br />• <strong>Identifikační údaje:</strong> Jméno, příjmení, titul, IČO, DIČ.
                  <br />• <strong>Kontaktní údaje:</strong> E-mailová adresa, telefonní číslo, dodací a fakturační adresa.
                  <br />• <strong>Platební a transakční údaje:</strong> Číslo bankovního účtu, historie objednávek a plateb.
                  <br />• <strong>Údaje o vašem účtu:</strong> Uživatelské jméno, heslo (hašované), stav Store Kreditu a historie asistovaného gradingu (PSA/CGC).
                  <br />• <strong>Síťové a analytické údaje:</strong> IP adresa, soubory cookies, historie procházení (Google Analytics, Microsoft Clarity).
                </p>

                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>3. ÚČELY A PRÁVNÍ ZÁKLADY ZPRACOVÁVANÍ</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  <strong>A. Plnění kupní smlouvy:</strong> Zpracování pro vyřízení objednávky, expedici zboží, platby a reklamace. Právní základ: Čl. 6 odst. 1 písm. b) nařízení GDPR.
                  <br /><br />
                  <strong>B. Smlouva o výkupu karet (Buylist):</strong> Zpracování pro určení ceny výkupu, připsání Store Kreditu či bankovní převod. Právní základ: Čl. 6 odst. 1 písm. b) nařízení GDPR.
                  <br /><br />
                  <strong>C. Plnění právních povinností (Účetnictví a daně):</strong> Uchovávání daňových a účetních dokladů dle zákonů ČR. Právní základ: Čl. 6 odst. 1 písm. c) nařízení GDPR.
                  <br /><br />
                  <strong>D. Oprávněný zájem (Přímý marketing a bezpečnost):</strong> Zasílání newsletterů zákazníkům s možností odhlášení. Prevence podvodů při výkupu a IT bezpečnost. Právní základ: Čl. 6 odst. 1 písm. f) nařízení GDPR.
                  <br /><br />
                  <strong>E. Váš souhlas:</strong> Zasílání newsletterů neregistrovaným odběratelům, analytické cookies (Google Analytics, Microsoft Clarity). Právní základ: Čl. 6 odst. 1 písm. a) nařízení GDPR.
                </p>

                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>4. PŘÍJEMCI OSOBNÍCH ÚDAJŮ (ZPRACOVATELÉ)</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  Vaše data předáváme těmto kategoriím příjemců:
                  <br />• <strong>Dopravci:</strong> Zásilkovna s.r.o., DPD CZ s.r.o., GLS Czech Republic s.r.o., Česká pošta, s.p.
                  <br />• <strong>Platební brána:</strong> Global Payments s.r.o.
                  <br />• <strong>Analytické nástroje:</strong> Google Ireland Limited (Google Analytics), Microsoft Corporation (Microsoft Clarity).
                  <br />• <strong>IT a účetní služby:</strong> Webhosting a externí účetní software.
                  <br />• <strong>Gradingové autority (USA):</strong> Odeslání karet do USA u asistovaného gradingu probíhá anonymně pod naším partnerským účtem (bez vašich osobních dat).
                </p>

                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>5. DOBA UCHOVÁVÁNÍ OSOBNÍCH ÚDAJŮ</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  • <strong>Smlouvy:</strong> Po dobu trvání smluvního vztahu, záruky a promlčecí lhůty (celkem cca 5 let).
                  <br />• <strong>Účetnictví a daně:</strong> Doklady a faktury uchováváme po dobu 10 let.
                  <br />• <strong>Marketing:</strong> Po dobu 3 let od posledního nákupu nebo do odvolání souhlasu / námitky.
                  <br />• <strong>Cookies:</strong> Podle nastavení prohlížeče (od relace po 2 roky).
                </p>

                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>6. VAŠE PRÁVA JAKO SUBJEKTU ÚDAJŮ</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  Máte právo na přístup k údajům, opravu, výmaz („právo být zapomenut“), omezení zpracování, přenositelnost, vznést námitku a odvolat souhlas.
                  Stížnosti lze podat u dozorového úřadu:
                  <br />• <strong>Úřad pro ochranu osobních údajů (ÚOOÚ)</strong>, Pplk. Sochora 27, 170 00 Praha 7 (uoou.cz).
                </p>

                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>7. BEZPEČNOST OSOBNÍCH ÚDAJŮ</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  Prohlašujeme, že jsme přijali vhodná technická a organizační opatření k zabezpečení dat. Přístup mají pouze pověřené osoby vázané mlčenlivostí. Veškerý přenos dat probíhá šifrovaně pomocí HTTPS (SSL/TLS).
                </p>

                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>8. ZÁVĚREČNÁ USTANOVENÍ</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  Odesláním objednávky nebo registrací potvrzujete seznámení se s těmito zásadami ochrany osobních údajů a jejich přijetí. Tyto zásady jsme oprávněni jednostranně měnit.
                </p>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '20px' }}>V Holicích, dne 26. června 2026</p>
              </div>
            )
          )}

          {activeTab === 'odstoupeni' && (
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: '800', margin: '0 0 20px 0', color: 'var(--text-main)', fontFamily: 'var(--font-heading)' }}>
                {t('GdprVop.withdrawalTitle')}
              </h2>
              <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', marginBottom: '24px' }}>
                {t('GdprVop.withdrawalDesc')}
              </p>
              <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', marginBottom: '24px' }}>
                {t('GdprVop.withdrawalSubDesc')}
              </p>

              <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.06)', margin: '24px 0' }} />

              <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--color-gold)', margin: '24px 0 12px 0' }}>
                {t('GdprVop.withdrawalStepsTitle')}
              </h3>
              <ol style={{ paddingLeft: '20px', fontSize: '13px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
                <li>{t('GdprVop.withdrawalStep1')}</li>
                <li>{t('GdprVop.withdrawalStep2')}</li>
                <li>{t('GdprVop.withdrawalStep3')}</li>
                <li>{t('GdprVop.withdrawalStep4')}</li>
              </ol>

              <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.06)', margin: '24px 0' }} />

              <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--color-gold)', margin: '24px 0 12px 0' }}>
                {t('GdprVop.withdrawalFormTitle')}
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: '24px' }}>
                {t('GdprVop.withdrawalFormHelper')}
              </p>

              {isSubmitted ? (
                <div style={{
                  border: '1px solid var(--color-gold)',
                  backgroundColor: 'rgba(253, 189, 22, 0.02)',
                  padding: '24px',
                  borderRadius: 'var(--radius-lg)',
                  marginBottom: '24px',
                  boxSizing: 'border-box'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <span style={{ fontSize: '24px', color: 'var(--color-gold)' }}>✓</span>
                    <h4 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--color-gold)', margin: 0 }}>
                      {t('GdprVop.withdrawalSuccessTitle')}
                    </h4>
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.6', marginBottom: '20px' }}>
                    {t('GdprVop.withdrawalSuccessDesc')}
                  </p>

                  <table style={{ width: '100%', fontSize: '13px', color: 'var(--text-muted)', borderCollapse: 'collapse' }}>
                    <tbody>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <td style={{ padding: '10px 0', fontWeight: '700', color: 'var(--text-main)' }}>{t('GdprVop.orderNumberLabel')}</td>
                        <td style={{ padding: '10px 0', textAlign: 'right' }}>#{submittedData?.orderNumber}</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <td style={{ padding: '10px 0', fontWeight: '700', color: 'var(--text-main)' }}>{t('GdprVop.emailLabel')}</td>
                        <td style={{ padding: '10px 0', textAlign: 'right' }}>{submittedData?.email}</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <td style={{ padding: '10px 0', fontWeight: '700', color: 'var(--text-main)' }}>{t('GdprVop.bankAccountLabel')}</td>
                        <td style={{ padding: '10px 0', textAlign: 'right' }}>{submittedData?.bankAccount || '—'}</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <td style={{ padding: '10px 0', fontWeight: '700', color: 'var(--text-main)' }}>{t('GdprVop.withdrawnItems')}</td>
                        <td style={{ padding: '10px 0', textAlign: 'right' }}>
                          {submittedData?.returnType === 'celou' 
                            ? (lang === 'EN' ? 'Scope: Entire order' : 'Rozsah: Celá objednávka')
                            : `${lang === 'EN' ? 'Scope: Partial return' : 'Rozsah: Část objednávky'} (${submittedData?.partialItemsText})`}
                        </td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <td style={{ padding: '10px 0', fontWeight: '700', color: 'var(--text-main)' }}>{t('GdprVop.refundType')}</td>
                        <td style={{ padding: '10px 0', textAlign: 'right' }}>
                          {submittedData?.refundMethod === 'bank' 
                            ? t('GdprVop.refundMethodBank') 
                            : t('GdprVop.refundMethodCard')}
                        </td>
                      </tr>
                      <tr>
                        <td style={{ padding: '10px 0', fontWeight: '700', color: 'var(--text-main)' }}>{t('GdprVop.submittedOn')}</td>
                        <td style={{ padding: '10px 0', textAlign: 'right' }}>{submittedData?.date} {lang === 'EN' ? 'at' : 'o'} {submittedData?.time}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <form onSubmit={handleWithdrawalSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  
                  <div className="login-form-group">
                    <label className="login-form-label">{t('GdprVop.orderNumberLabel')} *</label>
                    <input
                      type="text"
                      className={`login-form-input ${errors.orderNumber ? 'input-error' : ''}`}
                      value={orderNumber}
                      onChange={(e) => setOrderNumber(e.target.value)}
                      placeholder="e.g. 1000123"
                    />
                    {errors.orderNumber && (
                      <p className="login-form-error-msg">{errors.orderNumber}</p>
                    )}
                  </div>

                  <div className="login-form-group">
                    <label className="login-form-label">{t('GdprVop.emailLabel')} *</label>
                    <input
                      type="email"
                      className={`login-form-input ${errors.email ? 'input-error' : ''}`}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. mail@example.com"
                    />
                    {errors.email && (
                      <p className="login-form-error-msg">{errors.email}</p>
                    )}
                  </div>

                  <div className="login-form-group">
                    <label className="login-form-label">
                      {t('GdprVop.bankAccountLabel')}{refundMethod === 'bank' ? ' *' : ''}
                    </label>
                    <input
                      type="text"
                      className={`login-form-input ${errors.bankAccount ? 'input-error' : ''}`}
                      value={bankAccount}
                      onChange={(e) => setBankAccount(e.target.value)}
                      placeholder="e.g. 123456789/0100"
                      disabled={refundMethod !== 'bank'}
                      style={{
                        opacity: refundMethod === 'bank' ? 1 : 0.5,
                        backgroundColor: refundMethod === 'bank' ? 'transparent' : 'rgba(255, 255, 255, 0.05)',
                        cursor: refundMethod === 'bank' ? 'text' : 'not-allowed'
                      }}
                    />
                    {errors.bankAccount && (
                      <p className="login-form-error-msg">{errors.bankAccount}</p>
                    )}
                  </div>

                  <div className="login-form-group">
                    <label className="login-form-label">{t('GdprVop.returnTypeLabel')} *</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-muted)' }}>
                        <input
                          type="radio"
                          name="returnType"
                          value="celou"
                          checked={returnType === 'celou'}
                          onChange={() => setReturnType('celou')}
                          style={{ cursor: 'pointer' }}
                        />
                        {t('GdprVop.returnTypeAll')}
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-muted)' }}>
                        <input
                          type="radio"
                          name="returnType"
                          value="pouze"
                          checked={returnType === 'pouze'}
                          onChange={() => setReturnType('pouze')}
                          style={{ cursor: 'pointer' }}
                        />
                        {t('GdprVop.returnTypePartial')}
                      </label>
                    </div>
                  </div>

                  {returnType === 'pouze' && (
                    <div className="login-form-group">
                      <textarea
                        className={`login-form-input ${errors.partialItemsText ? 'input-error' : ''}`}
                        style={{ height: '80px', padding: '12px', resize: 'vertical' }}
                        value={partialItemsText}
                        onChange={(e) => setPartialItemsText(e.target.value)}
                        placeholder={t('GdprVop.partialItemsPlaceholder')}
                      />
                      {errors.partialItemsText && (
                        <p className="login-form-error-msg">{errors.partialItemsText}</p>
                      )}
                    </div>
                  )}

                  <div className="login-form-group">
                    <label className="login-form-label">{t('GdprVop.refundMethodLabel')} *</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '6px' }}>
                      <label style={{
                        padding: '12px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        cursor: 'pointer',
                        border: refundMethod === 'bank' ? '1px solid var(--color-gold)' : '1px solid var(--border-light)',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: refundMethod === 'bank' ? 'rgba(253, 189, 22, 0.03)' : 'transparent',
                        transition: 'all 0.2s'
                      }}>
                        <input
                          type="radio"
                          name="refundMethod"
                          checked={refundMethod === 'bank'}
                          onChange={() => setRefundMethod('bank')}
                          style={{ cursor: 'pointer' }}
                        />
                        <div style={{ textAlign: 'left' }}>
                          <span style={{ fontSize: '13px', fontWeight: '700', display: 'block', color: 'var(--text-main)' }}>
                            {t('GdprVop.refundMethodBank')}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {lang === 'EN' ? 'Refund will be transferred to your bank account' : 'Standardní bankovní převod na zadaný účet'}
                          </span>
                        </div>
                      </label>

                      <label style={{
                        padding: '12px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        cursor: 'pointer',
                        border: refundMethod === 'gateway' ? '1px solid var(--color-gold)' : '1px solid var(--border-light)',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: refundMethod === 'gateway' ? 'rgba(253, 189, 22, 0.03)' : 'transparent',
                        transition: 'all 0.2s'
                      }}>
                        <input
                          type="radio"
                          name="refundMethod"
                          checked={refundMethod === 'gateway'}
                          onChange={() => setRefundMethod('gateway')}
                          style={{ cursor: 'pointer' }}
                        />
                        <div style={{ textAlign: 'left' }}>
                          <span style={{ fontSize: '13px', fontWeight: '700', display: 'block', color: 'var(--text-main)' }}>
                            {t('GdprVop.refundMethodCard')}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {lang === 'EN' 
                              ? 'Funds will be returned to the card used for the purchase' 
                              : 'Prostředky budou vráceny zpět na kartu, kterou byla provedena platba'}
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div style={{
                    border: '1px dashed rgba(253, 189, 22, 0.25)',
                    backgroundColor: 'rgba(253, 189, 22, 0.02)',
                    padding: '20px',
                    borderRadius: '8px',
                    fontSize: '12.5px',
                    color: 'var(--text-muted)',
                    lineHeight: '1.6'
                  }}>
                    <h4 style={{ fontSize: '13px', fontWeight: '800', color: 'var(--color-gold)', margin: '0 0 10px 0', letterSpacing: '0.5px' }}>
                      {lang === 'EN' ? 'IMPORTANT NOTICE FOR COLLECTORS AND INVESTORS:' : 'DŮLEŽITÉ UPOZORNĚNÍ PRO SBĚRATELE A INVESTORY:'}
                    </h4>
                    <p style={{ margin: '0 0 10px 0' }}>
                      {lang === 'EN' 
                        ? 'Please note that for products in original packaging (e.g., Booster Boxes, Elite Trainer Boxes, special gift sets, or individual Boosters), opening or breaking the manufacturer\'s original protective shrink wrap causes irreversible damage to its collectible and investment value.'
                        : 'Berte prosím na vědomí, že u originálně balených produktů (např. Booster Boxy, Elite Trainer Boxy, speciální dárkové sety, nebo jednotlivé Boostery) dochází porušením originální ochranné fólie (tzv. shrink wrap s logy výrobce) k nevratnému poškození sběratelské a investiční hodnoty.'}
                    </p>
                    <p style={{ margin: 0 }}>
                      {lang === 'EN'
                        ? 'The product immediately becomes opened and weighable (losing its original guarantee). If you return goods with a broken wrap seal, we will claim compensation for the reduction in value in accordance with Section 1833 of the Civil Code. This compensation may amount to 30% to 50% of the purchase price and will be deducted from the refund. For Singles (raw cards), the card\'s physical condition must remain entirely undamaged (e.g., free of surface scratches, bent corners, or pressure marks from ring binders).'
                        : 'Zboží se tímto okamžikem stává rozbaleným a zvážitelným (ztrácí záruku neotevřenosti). Pokud vrátíte zboží s porušenou fólií, budeme nuceni uplatnit nárok na náhradu snížení hodnoty zboží v souladu s § 1833 občanského zákoníku. Tato náhrada může činit 30 až 50 % z kupní ceny zboží a bude odečtena od vrácené částky. U kusových karet (Singles) nesmí dojít k poškození stavu karty (např. poškrábání, ohnutí rohů či otlačení od kroužkových alb).'}
                    </p>
                  </div>

                  {submitError && (
                    <div style={{
                      backgroundColor: 'rgba(239, 68, 68, 0.05)',
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                      padding: '12px 16px',
                      borderRadius: 'var(--radius-md)',
                      color: 'rgb(248, 113, 113)',
                      fontSize: '13px',
                      textAlign: 'left'
                    }}>
                      ⚠️ {submitError}
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      style={{ padding: '14px', width: '100%', fontWeight: '800', fontSize: '14px', cursor: 'pointer' }}
                      disabled={isSubmitting}
                    >
                      {isSubmitting
                        ? (lang === 'EN' ? 'Sending Request...' : 'Odesílání žádosti...')
                        : t('GdprVop.btnSubmitWithdrawal')}
                    </button>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center' }}>
                      {lang === 'EN'
                        ? '(Clicking this button submits your completed order withdrawal. This initiates the 14-day period to return the physical goods.)'
                        : '(Kliknutím na toto tlačítko odešlete vyplněné odstoupení od smlouvy prodávajícímu. Odesláním se zahajuje 14denní lhůta pro vrácení fyzického zboží.)'}
                    </span>
                  </div>
                </form>
              )}

              <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.06)', margin: '24px 0' }} />

              <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--color-gold)', margin: '24px 0 12px 0' }}>
                {lang === 'EN' ? 'What happens after you submit the form?' : 'Co se stane po kliknutí na tlačítko?'}
              </h3>
              <ol style={{ paddingLeft: '20px', fontSize: '13px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <li>
                  <strong>{lang === 'EN' ? 'Email Confirmation:' : 'Potvrzení do e-mailu:'}</strong>{' '}
                  {lang === 'EN'
                    ? 'Our system will immediately send you an automatic confirmation email with a timestamp.'
                    : 'Náš systém vám v souladu se zákonem okamžitě odešle automatické potvrzení o přijetí odstoupení s časovým razítkem.'}
                </li>
                <li>
                  <strong>{lang === 'EN' ? 'Return Shipping:' : 'Odeslání zboží prodejci:'}</strong>{' '}
                  {lang === 'EN'
                    ? 'Pack the products securely (for singles, we recommend using a penny sleeve and toploader; for boxed products, a sturdy box and bubble wrap) and ship them to our address: NORTHVALE s.r.o., Bratří Čapků 1095, 534 01 Holice.'
                    : 'Zboží bezpečně zabalte (pro kusové karty doporučujeme použít penny sleeve a toploader, pro originální balení pevnou kartonovou krabici a bublinkovou fólii, aby nedošlo k poškození během dopravy) a odešlete na naši adresu: NORTHVALE s.r.o., Bratří Čapků 1095, 534 01 Holice.'}
                </li>
                <li>
                  <strong>{lang === 'EN' ? 'Inspection & Payout:' : 'Kontrola a vrácení peněz:'}</strong>{' '}
                  {lang === 'EN'
                    ? 'Once received, we will inspect the cards or shrink wrap seal. We will process your refund via bank transfer or back to your card within 14 days of receiving the package (or receiving proof of shipment).'
                    : 'Jakmile zásilku převezmeme, zkontrolujeme stav karet či neporušenost fólií u balených produktů. Nejpozději do 14 dnů od převzetí vráceného zboží (nebo od okamžiku, kdy nám prokážete, že bylo zboží odesláno) vám vrátíme peníze na bankovní účet nebo zpět na platební kartu.'}
                </li>
              </ol>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
