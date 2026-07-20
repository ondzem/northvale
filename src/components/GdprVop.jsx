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
  const [fullName, setFullName] = useState('');
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

  // Sync address bar URL query param with activeTab
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('tab', activeTab);
    window.history.replaceState({}, '', url.toString());
  }, [activeTab]);

  const handleWithdrawalSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!fullName.trim()) {
      newErrors.fullName = t('GdprVop.errors.fullName');
    }
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

      // Trigger Edge Function to send email confirmation (with fullName)
      try {
        const { error: fnError } = await supabase.functions.invoke('send-withdrawal-email', {
          body: {
            fullName: fullName.trim(),
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
        fullName: fullName.trim(),
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

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    // Explicitly update parent state if any
    if (setActivePage) {
      setActivePage('gdpr-vop', tab);
    }
  };

  return (
    <div style={{
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '40px 20px',
      color: 'var(--text-main)',
      fontFamily: 'var(--font-sans)',
      boxSizing: 'border-box'
    }}>
      {/* Page Header */}
      <header style={{ marginBottom: '40px', textAlign: 'center' }}>
        <h1 style={{
          fontSize: '32px',
          fontWeight: '900',
          letterSpacing: '-0.5px',
          margin: '0 0 10px 0',
          color: 'var(--text-main)',
          fontFamily: 'var(--font-heading)'
        }}>
          {lang === 'EN' ? 'Legal Information & Purchase Terms' : 'Právní informace a obchodní podmínky'}
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0 }}>
          {lang === 'EN' 
            ? 'Complete terms of service, shipping rates, privacy rules, and order cancellations.'
            : 'Kompletní všeobecné obchodní podmínky, ceny přepravy, ochrana osobních údajů a formulář pro odstoupení.'}
        </p>
      </header>

      {/* Main Container: Sidebar + Content */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '30px',
        alignItems: 'flex-start'
      }}>
        {/* Left Side: Sidebar Navigation */}
        <aside style={{
          flex: '1 1 280px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          position: 'sticky',
          top: '100px'
        }}>
          {/* Navigation Buttons Box */}
          <nav style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '16px',
            boxSizing: 'border-box'
          }}>
            <button
              onClick={() => handleTabChange('doprava')}
              style={{
                display: 'block',
                width: '100%',
                padding: '12px 16px',
                textAlign: 'left',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                backgroundColor: activeTab === 'doprava' ? 'var(--color-gold)' : 'transparent',
                color: activeTab === 'doprava' ? '#000000' : 'var(--text-main)',
                fontSize: '13.5px',
                fontWeight: activeTab === 'doprava' ? '800' : '500',
                cursor: 'pointer',
                transition: 'all 0.2s',
                letterSpacing: '0.2px'
              }}
            >
              🚚 {lang === 'EN' ? 'Shipping & Payment' : 'Doprava a platba'}
            </button>
            <button
              onClick={() => handleTabChange('vop')}
              style={{
                display: 'block',
                width: '100%',
                padding: '12px 16px',
                textAlign: 'left',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                backgroundColor: activeTab === 'vop' ? 'var(--color-gold)' : 'transparent',
                color: activeTab === 'vop' ? '#000000' : 'var(--text-main)',
                fontSize: '13.5px',
                fontWeight: activeTab === 'vop' ? '800' : '500',
                cursor: 'pointer',
                transition: 'all 0.2s',
                letterSpacing: '0.2px'
              }}
            >
              📄 {lang === 'EN' ? 'Terms of Service (VOP)' : 'Obchodní podmínky (VOP)'}
            </button>
            <button
              onClick={() => handleTabChange('gdpr')}
              style={{
                display: 'block',
                width: '100%',
                padding: '12px 16px',
                textAlign: 'left',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                backgroundColor: activeTab === 'gdpr' ? 'var(--color-gold)' : 'transparent',
                color: activeTab === 'gdpr' ? '#000000' : 'var(--text-main)',
                fontSize: '13.5px',
                fontWeight: activeTab === 'gdpr' ? '800' : '500',
                cursor: 'pointer',
                transition: 'all 0.2s',
                letterSpacing: '0.2px'
              }}
            >
              🔒 {lang === 'EN' ? 'Privacy Policy (GDPR)' : 'Ochrana osobních údajů'}
            </button>
            <button
              onClick={() => handleTabChange('odstoupeni')}
              style={{
                display: 'block',
                width: '100%',
                padding: '12px 16px',
                textAlign: 'left',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                backgroundColor: activeTab === 'odstoupeni' ? 'var(--color-gold)' : 'transparent',
                color: activeTab === 'odstoupeni' ? '#000000' : 'var(--text-main)',
                fontSize: '13.5px',
                fontWeight: activeTab === 'odstoupeni' ? '800' : '500',
                cursor: 'pointer',
                transition: 'all 0.2s',
                letterSpacing: '0.2px'
              }}
            >
              🔄 {lang === 'EN' ? 'Order Withdrawal' : 'Odstoupení od smlouvy'}
            </button>
          </nav>

          {/* Quick Help Card */}
          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.01)',
            padding: '20px',
            fontSize: '12.5px',
            color: 'var(--text-muted)',
            lineHeight: '1.5',
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
                <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.06)', margin: '20px 0' }} />

                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>1. SHIPPING METHODS & RATES – CZECH REPUBLIC</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  For orders with a total value exceeding 2,000 CZK, shipping is completely FREE (applies to DPD and GLS services).
                  <br /><br />
                  • <strong>DPD – Pickup Point (DPD Pickup):</strong> 79 CZK. Pickup at any DPD parcel locker or store, usually within 1 business day of dispatch.
                  <br />• <strong>DPD – Home Delivery:</strong> 109 CZK. Courier delivery to your address within 1 business day of dispatch, with delivery time slot notifications.
                  <br />• <strong>GLS – Pickup Point (Parcel Shop):</strong> 89 CZK. Pickup at any GLS parcel locker or store, usually within 1 business day of dispatch.
                  <br />• <strong>GLS – Home Delivery:</strong> 129 CZK. Courier delivery to your address within 1 business day of dispatch.
                  <br />• <strong>Personal Pickup:</strong> FREE. Available at Bratří Čapků 1095, 534 01 Holice, or at our pickup location in Pardubice (by agreement).
                </p>

                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>2. INTERNATIONAL SHIPPING (SLOVAKIA AND EU)</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  Standard checkout and delivery through our e-shop are currently limited to the Czech Republic (using DPD, GLS, or personal pickup in Holice). Delivery to Slovakia and other European Union countries is currently in preparation. If you would like to ship goods to Slovakia or another EU country, we can arrange shipping individually by email agreement at <a href="mailto:info@northvaletcg.eu" style={{ color: 'var(--color-gold)', textDecoration: 'none' }}>info@northvaletcg.eu</a>.
                </p>

                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>3. COLLECTOR PACKAGING STANDARD (PACK SAFETY)</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  We are collectors ourselves and know that physical condition is everything. We package orders with maximum protection:
                  <br /><br />
                  • <strong>How we pack Singles (raw cards):</strong> Each card is first placed in a soft penny sleeve (head down to prevent slipping). We attach a paper pull-tab to the sleeve, insert it into a rigid plastic toploader, sandwich the toploader between two heavy double-wall cardboard slabs secured with residue-free painter's tape, and place the assembly in a bubble mailer.
                  <br />• <strong>How we pack Sealed Products (Booster Boxes, ETBs):</strong> Heavy items like booster displays and Elite Trainer Boxes are shipped exclusively in thick, brand-new 5-ply cardboard boxes. The products are wrapped in generous layers of bubble wrap, and empty space inside the box is filled with paper shavings or air pillows to ensure no movement during transit.
                </p>

                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>4. PAYMENT METHODS</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  We support several secure payment methods for your convenience:
                  <br /><br />
                  • <strong>GP webpay – Online Card Payment (FREE):</strong> Fast, secure payment with Visa or Mastercard or via bank portals. Transactions are processed via Global Payments s.r.o. payment gateway and are encrypted using SSL/TLS. We do not store or access your credit card details.
                  <br />• <strong>Bank Transfer (FREE):</strong> Pay directly from your bank account. Upon completing the checkout, you will receive an automatic email containing payment instructions, our bank account details, and a QR code. Payment is due within 5 business days.
                  <br />• <strong>Cash on Delivery (25 CZK surcharge):</strong> Pay in cash or by card directly to the courier upon receiving the parcel.
                  <br />• <strong>Store Credit – Customer Balance (FREE):</strong> If you have a Store Credit balance on your user account (e.g., from buylist trade-ins), you can apply it as a discount on all or part of your purchase.
                </p>

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

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Na e-shopu northvaletcg.eu si zakládáme na rychlém doručení, bezpečných platbách a především na nekompromisním standardu balení. Víme, jakou hodnotu pro vás sběratelské karty mají, a děláme vše pro to, aby dorazily v bezchybném stavu.
                </p>

                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>
                  1. ZPŮSOBY A CENY DORUČENÍ – ČESKÁ REPUBLIKA
                </h3>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  U objednávek v hodnotě nad 2 000 Kč je doprava ZDARMA (platí pro DPD a GLS).
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  DPD – výdejní místo (DPD Pickup): 79 Kč. Vyzvednutí na výdejním místě DPD, obvykle do druhého pracovního dne od expedice.
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  DPD – doručení na adresu: 109 Kč. Do druhého pracovního dne od expedice, s možností změny termínu doručení.
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  GLS – výdejní místo (Parcel Shop): 89 Kč. Vyzvednutí na výdejním místě GLS, obvykle do druhého pracovního dne od expedice.
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  GLS – doručení na adresu: 129 Kč. Do druhého pracovního dne od expedice, kurýrem domů nebo do zaměstnání.
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Osobní odběr: ZDARMA. Bratří Čapků 1095, 534 01 Holice, případně dle domluvy na určeném odběrném místě v Pardubicích.
                </p>

                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>
                  2. DORUČENÍ DO ZAHRANIČÍ (SLOVENSKO A EU)
                </h3>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Standardní doručení přes e-shop je aktuálně možné pouze v rámci České republiky (službami DPD, GLS a pro osobní odběr v Holicích). Doručení na Slovensko a do dalších zemí Evropské unie momentálně připravujeme. Pokud máte zájem o zaslání zboží na Slovensko nebo do jiné země EU, je možné doručení sjednat individuálně po předchozí domluvě e-mailem na <a href="mailto:info@northvaletcg.eu" style={{ color: 'var(--color-gold)', textDecoration: 'none' }}>info@northvaletcg.eu</a>.
                </p>

                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>
                  3. SBĚRATELSKÝ STANDARD BALENÍ (PACK SAFETY)
                </h3>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Jak balíme kusové karty (singles):
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Penny sleeve: každou kusovou kartu nejprve vložíme do tenkého ochranného obalu hlavou dolů, aby se při otřesech nevysunula.
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Pull-tab (poutko): na zadní stranu obalu nalepíme vytahovací poutko – kartu z toploaderu snadno vytáhnete bez rizika ohnutí hran.
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Toploader: karta v obalu se zasune do pevného plastového pouzdra, které zabrání mechanickému poškození.
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Kartonový sendvič: toploader vložíme mezi dva silné pláty vlnité lepenky přesahující rozměry toploaderu a zafixujeme papírovou malířskou páskou (nezanechává stopy lepidla).
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Bublinková obálka: celý sendvič vložíme do kvalitní bublinkové obálky. Karta je tak plně chráněna proti nárazům.
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Jak balíme balené produkty:
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Displeje, Booster Boxy a Elite Trainer Boxy (ETB) balíme výhradně do pevných, nových pětivrstvých kartonových krabic.
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Produkty obalujeme silnou vrstvou bublinkové fólie a zbylý prostor vyplňujeme papírovou střiží nebo vzduchovými polštářky.
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Rohy krabic zpevňujeme lepicí páskou. Děláme maximum pro to, aby originální smršťovací fólie (shrink wrap) s logem výrobce dorazila neporušená.
                </p>

                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>
                  4. MOŽNOSTI PLATBY
                </h3>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Platební brána GP webpay (zdarma): rychlá platba kartami Visa a Mastercard nebo zrychleným bankovním převodem. Provozovatelem platební brány je společnost Global Payments s.r.o. Veškeré transakce jsou zabezpečené a šifrované (SSL/TLS); k údajům o vaší kartě nemáme přístup.
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Klasický bankovní převod (zdarma): po dokončení objednávky obdržíte e-mail s podklady pro platbu (číslo účtu, variabilní symbol a QR kód). Kupní cena je splatná do 5 pracovních dnů.
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Platba na dobírku (příplatek 25 Kč): objednávku zaplatíte hotově nebo kartou přímo kurýrovi či ve výdejním místě při převzetí zásilky.
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Hotově nebo kartou při osobním odběru (zdarma).
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Store Credit – zákaznický kredit (zdarma): zůstatek Store Creditu na vašem uživatelském účtu (např. z výkupu) můžete uplatnit jako slevu na celou objednávku nebo její část.
                </p>

                <div id="preorder-info-section" className="preorder-info-section-container" style={{
                  marginTop: '40px',
                  padding: '16px 12px 16px 16px',
                  borderRadius: 'var(--radius-md)',
                  borderLeft: '3px solid transparent',
                  transition: 'all 0.3s ease-in-out'
                }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--color-gold)', margin: '0 0 12px 0' }}>5. JAK FUNGUJÍ PŘEDOBJEDNÁVKY?</h3>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Garance alokace: předobjednávkou si zajišťujete kus z budoucí alokace výrobce. Garantujeme rezervaci zakoupeného počtu kusů z našich potvrzených dodávek.
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Garance ceny: cena, za kterou produkt předobjednáte, je konečná a pevná. Pokud se tržní cena po vydání zvýší, nic nedoplácíte.
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Společné odeslání zásilky (důležité): pokud v rámci jedné objednávky zakoupíte předobjednávku i produkty skladem, celou zásilku odešleme společně, jakmile bude předobjednaný produkt naskladněn. Chcete-li skladové produkty obdržet ihned, vytvořte prosím dvě samostatné objednávky.
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Očekávané termíny vydání: očekávané datum vydání uvádíme na základě oficiálních informací výrobce/distributora. V případě zpoždění ze strany výrobce vás budeme neprodleně informovat a máte právo objednávku bezplatně zrušit.
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Odstoupení a storno: i u předobjednávek můžete objednávku kdykoli do expedice bezplatně stornovat a jako spotřebitel máte právo odstoupit od smlouvy do 14 dnů od převzetí zboží.
                </p>
                </div>

                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>
                  6. KONTROLA ZÁSILKY PŘI PŘEVZETÍ
                </h3>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Při převzetí zásilky doporučujeme zkontrolovat neporušenost obalu. V případě zjevného poškození (proražení krabice, poškozené rohy) doporučujeme zásilku nepřevzít, případně s dopravcem sepsat škodní protokol a neprodleně nás kontaktovat na info@northvaletcg.eu. Usnadní to vyřízení celé situace – vaše práva z vadného plnění tím ale nejsou podmíněna.
                </p>
              </div>
            )
          )}

          {activeTab === 'vop' && (
            lang === 'EN' ? (
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: '800', margin: '0 0 20px 0', color: 'var(--text-main)', fontFamily: 'var(--font-heading)' }}>
                  TERMS OF SERVICE (VOP)
                </h2>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '24px' }}>
                  of the business company <strong>NORTHVALE s.r.o.</strong><br />
                  registered office: Bratří Čapků 1095, 534 01 Holice<br />
                  identification number (IČO): 29618142 | VAT ID (DIČ): CZ29618142<br />
                  registered in the Commercial Register maintained by the Regional Court in Hradec Králové, Section C, File 56872<br />
                  for the sale of goods through the online store at: <strong>northvaletcg.eu</strong>
                </p>
                <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.06)', margin: '20px 0' }} />

                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>1. INTRODUCTORY PROVISIONS</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  1.1. These General Terms and Conditions (hereinafter referred to as the "Terms") of NORTHVALE s.r.o., registered office Bratří Čapků 1095, 534 01 Holice, IČ: 29618142, registered in the Commercial Register maintained by the Regional Court in Hradec Králové, Section C, File 56872 (hereinafter referred to as the "Seller") govern, in accordance with Section 1751(1) of Act No. 89/2012 Coll., Civil Code (hereinafter referred to as the "Civil Code"), the mutual rights and obligations of the contracting parties arising in connection with or on the basis of a purchase agreement (hereinafter referred to as the "Purchase Agreement") concluded between the Seller and another natural person (hereinafter referred to as the "Buyer") through the Seller's online store at northvaletcg.eu.
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  1.2. The Terms apply to cases where the person intending to purchase goods from the Seller is a consumer. A consumer is any individual who, outside of their business activities, enters into an agreement with an entrepreneur.
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  1.3. Provisions deviating from the Terms may be agreed upon in the Purchase Agreement. Such deviating agreements in the Purchase Agreement take precedence over the provisions of the Terms.
                </p>

                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>2. USER ACCOUNT AND STORE CREDIT</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  2.1. Upon registration on the website, the Buyer can access their user interface. From this interface, the Buyer can order goods, check order status, manage card trade-ins (buylist), and track their Store Credit balance.
                  <br /><br />
                  2.2. When registering and ordering goods, the Buyer is obliged to provide correct and truthful information. The Buyer is obliged to update this information in the user account immediately upon any change.
                  <br /><br />
                  2.3. Store Credit is a loyalty currency that the Buyer can earn by selling cards to the Seller (via the Buylist module) or through special promotional events. 1 Store Credit equals 1 CZK. Store Credit can be used as a payment discount on any future orders at northvaletcg.eu. Store Credit is non-refundable, non-transferable, and cannot be exchanged for cash.
                </p>

                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>3. CONCLUSION OF THE PURCHASE AGREEMENT</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  3.1. All presentation of goods on the E-shop is informative, and the Seller is not obliged to enter into a Purchase Agreement regarding this goods. Section 1732(2) of the Civil Code does not apply.
                  <br /><br />
                  3.2. To order goods, the Buyer fills out the order form in the checkout interface of the E-shop. The order form contains information about the ordered goods, payment methods, delivery details, and associated shipping costs.
                  <br /><br />
                  3.3. The contractual relationship between the Seller and the Buyer is established by the receipt of the order acceptance (confirmation), which is sent by the Seller to the Buyer's email address.
                </p>

                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>4. PRICE OF GOODS AND PAYMENT TERMS</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  4.1. The prices of goods are shown including value added tax (VAT) and all related statutory fees, excluding shipping and cash-on-delivery fees.
                  <br /><br />
                  4.2. In the case of payment by bank transfer, the purchase price is payable within 5 business days of the conclusion of the Purchase Agreement. The Buyer is obliged to pay the purchase price using the designated variable symbol (order number).
                </p>

                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>5. TRANSPORT AND DELIVERY OF GOODS</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  5.1. Costs of delivery are selected and confirmed by the Buyer during checkout. Detailed shipping prices are listed in the "Shipping & Payment" tab.
                  <br /><br />
                  5.2. If the Seller is obliged under the Purchase Agreement to deliver the goods to the place specified by the Buyer in the order, the Buyer is obliged to take over the goods upon delivery.
                </p>

                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>6. WITHDRAWAL FROM THE PURCHASE AGREEMENT</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  6.1. The Buyer has the right to withdraw from the Purchase Agreement within 14 days of receiving the goods, in accordance with Section 1829(1) of the Civil Code.
                  <br /><br />
                  6.2. Withdrawal from the Purchase Agreement can be submitted electronically using the form in the "Order Withdrawal" tab.
                  <br /><br />
                  6.3. <strong>Important notice for collectors:</strong> For products in original sealed packaging (e.g. Booster Boxes, Elite Trainer Boxes, booster packs), breaking or removing the protective shrink wrap wrap destroys the item's collectible value. The Seller will claim compensation for the reduction in value in accordance with Section 1833 of the Civil Code, which may amount to 30% to 50% of the purchase price and will be deducted from the refund.
                </p>

                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>7. RIGHTS FROM DEFECTIVE PERFORMANCE (Warranty claims)</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  7.1. The rights and obligations of the contracting parties regarding rights from defective performance are governed by the relevant binding statutory regulations (in particular Sections 1914 to 1925, Sections 2099 to 2117, and Sections 2161 to 2174 of the Civil Code).
                  <br /><br />
                  7.2. The warranty period for consumer goods is 24 months from receipt. Defective claims are resolved within 30 days. The warranty does not cover normal wear and tear, intentional damage, or improper storage (e.g. moisture damage to card stock).
                </p>

                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>8. OUT-OF-COURT DISPUTE RESOLUTION (ADR)</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  8.1. The Czech Trade Inspection (ČOI), with its registered office at Štěpánská 567/15, 120 00 Prague 2, IČ: 000 20 869, internet address: www.coi.cz, is competent for the out-of-court resolution of consumer disputes arising from the Purchase Agreement. The online dispute resolution platform at http://ec.europa.eu/consumers/odr can be used to resolve disputes.
                </p>

                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>9. FINAL PROVISIONS</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  9.1. If the relationship established by the Purchase Agreement contains an international element, the relationship is governed by Czech law.
                  <br /><br />
                  9.2. The invalidity of one provision does not affect the validity of the others.
                  <br /><br />
                  9.3. Agreements are archived in electronic form.
                </p>

                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '20px' }}>In Holice, on June 26, 2026</p>
              </div>
            ) : (
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: '800', margin: '0 0 20px 0', color: 'var(--text-main)', fontFamily: 'var(--font-heading)' }}>
                  VŠEOBECNÉ OBCHODNÍ PODMÍNKY
                </h2>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  obchodní společnosti NORTHVALE s.r.o.
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  se sídlem Bratří Čapků 1095, 534 01 Holice
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  IČO: 29618142 | DIČ: CZ29618142 (plátce DPH)
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  zapsané v obchodním rejstříku vedeném Krajským soudem v Hradci Králové, oddíl C, vložka 56872
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  e-mail: info@northvaletcg.eu | telefon: +420 739 666 779
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  pro prodej zboží prostřednictvím on-line obchodu umístěného na internetové adrese northvaletcg.eu
                </p>

                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>
                  1. ÚVODNÍ USTANOVENÍ
                </h3>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  1.1. Tyto všeobecné obchodní podmínky (dále jen „obchodní podmínky“) obchodní společnosti NORTHVALE s.r.o., se sídlem Bratří Čapků 1095, 534 01 Holice, IČO: 29618142, zapsané v obchodním rejstříku vedeném Krajským soudem v Hradci Králové, oddíl C, vložka 56872 (dále jen „prodávající“), upravují v souladu s ustanovením § 1751 odst. 1 zákona č. 89/2012 Sb., občanský zákoník, ve znění pozdějších předpisů (dále jen „občanský zákoník“), vzájemná práva a povinnosti smluvních stran vzniklé v souvislosti nebo na základě kupní smlouvy (dále jen „kupní smlouva“) uzavírané mezi prodávajícím a jinou osobou (dále jen „kupující“) prostřednictvím internetového obchodu prodávajícího na adrese northvaletcg.eu (dále jen „e-shop“).
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  1.2. Spotřebitelem je každý člověk, který mimo rámec své podnikatelské činnosti nebo mimo rámec samostatného výkonu svého povolání uzavírá smlouvu s prodávajícím. Ustanovení těchto obchodních podmínek a právních předpisů určená výhradně na ochranu spotřebitele (zejména čl. 6 – odstoupení od smlouvy bez udání důvodu a příslušná ustanovení čl. 7) se nepoužijí na kupujícího, který je podnikatelem a při objednávce jedná v rámci své podnikatelské činnosti (zejména uvede-li v objednávce své IČO).
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  1.3. Ustanovení odchylná od obchodních podmínek je možné sjednat v kupní smlouvě. Odchylná ujednání v kupní smlouvě mají přednost před ustanoveními obchodních podmínek.
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  1.4. Kupní smlouvu lze uzavřít v českém jazyce. Tyto obchodní podmínky jsou vyhotoveny v českém jazyce.
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  1.5. Znění obchodních podmínek může prodávající měnit či doplňovat. Tímto ustanovením nejsou dotčena práva a povinnosti vzniklá po dobu účinnosti předchozího znění obchodních podmínek. Pro konkrétní kupní smlouvu je rozhodné znění obchodních podmínek účinné ke dni odeslání objednávky.
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  1.6. Prodávající není ve vztahu ke kupujícímu vázán žádnými kodexy chování ve smyslu § 1820 odst. 1 písm. n) občanského zákoníku.
                </p>

                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>
                  2. UŽIVATELSKÝ ÚČET A STORE CREDIT
                </h3>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  2.1. Na základě registrace provedené na webové stránce může kupující přistupovat do svého uživatelského rozhraní (dále jen „uživatelský účet“), odkud může provádět objednávání zboží. Objednávat zboží lze i bez registrace přímo z webového rozhraní obchodu.
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  2.2. Při registraci a při objednávání zboží je kupující povinen uvádět správně a pravdivě všechny údaje a při jakékoliv jejich změně je aktualizovat.
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  2.3. Přístup k uživatelskému účtu je zabezpečen uživatelským jménem a heslem. Kupující je povinen zachovávat mlčenlivost ohledně informací nezbytných k přístupu do svého uživatelského účtu a není oprávněn umožnit jeho využívání třetím osobám.
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  2.4. Prodávající může zrušit uživatelský účet, a to zejména v případě, kdy kupující svůj uživatelský účet déle než 24 měsíců nevyužívá, či v případě, kdy kupující poruší své povinnosti z kupní smlouvy nebo těchto obchodních podmínek. Zrušením uživatelského účtu nezaniká nárok kupujícího na vyplacení nebo vyčerpání Store Creditu vzniklého z titulu schváleného výkupu.
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  2.5. Kupující bere na vědomí, že uživatelský účet nemusí být dostupný nepřetržitě, a to zejména s ohledem na nutnou údržbu hardwarového a softwarového vybavení.
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  2.6. Store Credit (zákaznický kredit): Registrovaný kupující může disponovat virtuálním kreditem (Store Credit). 1 jednotka kreditu odpovídá hodnotě 1 Kč. Store Credit je vázán na uživatelský účet, je nepřenosný, lze jej uplatnit jako slevu na nákup v e-shopu a nelze jej směnit za hotovost (s výjimkou výplat z titulu schváleného výkupu zboží prodávajícím). Store Credit není úročen.
                </p>

                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>
                  3. UZAVŘENÍ KUPNÍ SMLOUVY
                </h3>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  3.1. Veškerá prezentace zboží umístěná ve webovém rozhraní obchodu je informativního charakteru a prodávající není povinen uzavřít kupní smlouvu ohledně tohoto zboží. Ustanovení § 1732 odst. 2 občanského zákoníku se nepoužije.
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  3.2. Webové rozhraní obchodu obsahuje informace o zboží, a to včetně uvedení cen jednotlivého zboží. Ceny zboží jsou uvedeny včetně daně z přidané hodnoty a všech souvisejících poplatků. Ceny zboží zůstávají v platnosti po dobu, kdy jsou zobrazovány ve webovém rozhraní obchodu. Tímto ustanovením není omezena možnost prodávajícího uzavřít kupní smlouvu za individuálně sjednaných podmínek.
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  3.3. Náklady na balení a dodání zboží se liší podle zvoleného způsobu dopravy, způsobu platby a země doručení. Jejich konkrétní výše je kupujícímu vždy zobrazena v objednávkovém procesu před odesláním objednávky. Přehled způsobů dopravy a plateb je uveden v sekci „Doprava a platba“.
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  3.4. Pro objednání zboží vyplní kupující objednávkový formulář ve webovém rozhraní obchodu, který obsahuje zejména informace o objednávaném zboží, způsobu úhrady kupní ceny a požadovaném způsobu doručení (dále společně jen „objednávka“).
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  3.5. Před odesláním objednávky je kupujícímu umožněno zkontrolovat a měnit vstupní údaje, které do objednávky vložil, a to i s ohledem na možnost kupujícího zjišťovat a opravovat chyby vzniklé při zadávání dat do objednávky.
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  3.6. Kupující odešle objednávku prodávajícímu kliknutím na tlačítko označené „Objednat a zaplatit“. Kupující bere na vědomí, že odesláním objednávky se zavazuje k zaplacení kupní ceny (objednávka zavazující k platbě). Údaje uvedené v objednávce jsou prodávajícím považovány za správné. Prodávající neprodleně po obdržení objednávky toto obdržení kupujícímu potvrdí elektronickou poštou na adresu uvedenou v objednávce; součástí potvrzení je znění těchto obchodních podmínek.
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  3.7. Smluvní vztah mezi prodávajícím a kupujícím vzniká doručením přijetí objednávky (akceptací), jež je prodávajícím zasláno kupujícímu elektronickou poštou (např. potvrzení objednávky či potvrzení o expedici zboží).
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  3.8. Kupující souhlasí s použitím komunikačních prostředků na dálku při uzavírání kupní smlouvy. Náklady vzniklé kupujícímu při použití komunikačních prostředků na dálku v souvislosti s uzavřením kupní smlouvy (náklady na internetové připojení, náklady na telefonní hovory) si hradí kupující sám, přičemž tyto náklady se neliší od základní sazby.
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  3.9. Kupní smlouva včetně obchodních podmínek je archivována prodávajícím v elektronické podobě po dobu stanovenou právními předpisy a není přístupná třetím osobám. Kupujícímu je znění objednávky a obchodních podmínek zasláno e-mailem dle čl. 3.6.
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  3.10. Storno objednávky kupujícím: Kupující má právo zrušit (stornovat) svou objednávku bez jakýchkoliv sankcí až do okamžiku, kdy je objednávka expedována nebo předána dopravci, a to telefonicky na čísle +420 739 666 779 nebo e-mailem na adrese info@northvaletcg.eu. Tím není dotčeno právo spotřebitele odstoupit od smlouvy dle čl. 6.
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  3.11. Storno objednávky prodávajícím: Prodávající je oprávněn zrušit objednávku (či její část) v případě zjevné chyby v ceně zboží (např. chybný import dat či systémová chyba), pokud se zboží již nevyrábí či nedodává, nebo pokud je skladová zásoba vyprodaná. O stornu bude kupující bezodkladně informován a již uhrazené peněžní prostředky mu budou vráceny nejpozději do 14 dnů od zrušení objednávky, a to stejným způsobem, jakým byly uhrazeny.
                </p>

                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>
                  4. CENA ZBOŽÍ A PLATEBNÍ PODMÍNKY
                </h3>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  4.1. Cenu zboží a případné náklady spojené s dodáním zboží dle kupní smlouvy může kupující uhradit prodávajícímu následujícími způsoby: v hotovosti nebo kartou při osobním odběru; bezhotovostně prostřednictvím platební brány GP webpay (provozovatel Global Payments s.r.o.); bezhotovostně převodem na bankovní účet prodávajícího; na dobírku při převzetí zboží; uplatněním Store Creditu.
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  4.2. Platby platební kartou a zrychleným bankovním převodem jsou zabezpečeny platební bránou GP webpay. Přenos citlivých dat a informací o platbách probíhá v šifrované podobě s využitím standardu SSL/TLS. Prodávající nemá přístup k údajům o platební kartě kupujícího; tyto údaje zpracovává výhradně provozovatel platební brány.
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  4.3. Společně s kupní cenou je kupující povinen zaplatit prodávajícímu také náklady spojené s balením a dodáním zboží ve smluvené výši. Není-li uvedeno výslovně jinak, rozumí se dále kupní cenou i náklady spojené s dodáním zboží.
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  4.4. Prodávající nepožaduje od kupujícího zálohu či jinou obdobnou platbu, s výjimkou případů dle čl. 4.7. Tímto není dotčena povinnost uhradit kupní cenu předem u plateb dle čl. 4.5.
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  4.5. V případě platby v hotovosti či na dobírku je kupní cena splatná při převzetí zboží. V případě bezhotovostního převodu je kupní cena splatná do 5 pracovních dnů od uzavření kupní smlouvy; kupující je povinen uvést variabilní symbol platby (číslo objednávky) a závazek je splněn okamžikem připsání částky na účet prodávajícího. V případě platby přes platební bránu GP webpay je kupní cena splatná ihned po dokončení objednávky.
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  4.6. Případné slevy z ceny zboží poskytnuté prodávajícím kupujícímu nelze vzájemně kombinovat, není-li výslovně uvedeno jinak.
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  4.7. Prodávající je oprávněn, zejména v případě, že ze strany kupujícího nedojde k dodatečnému potvrzení objednávky, požadovat uhrazení celé kupní ceny ještě před odesláním zboží kupujícímu. Ustanovení § 2119 odst. 1 občanského zákoníku se nepoužije.
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  4.8. Informace o slevách: Je-li poskytována sleva z ceny zboží, je jako referenční cena uvedena nejnižší cena, za kterou prodávající zboží nabízel a prodával v období 30 dnů před poskytnutím slevy, v souladu s § 12a zákona č. 634/1992 Sb., o ochraně spotřebitele.
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  4.9. Je-li to v obchodním styku obvyklé nebo je-li tak stanoveno obecně závaznými právními předpisy, vystaví prodávající ohledně plateb prováděných na základě kupní smlouvy kupujícímu daňový doklad – fakturu. Prodávající je plátcem daně z přidané hodnoty. Daňový doklad vystaví prodávající kupujícímu po uhrazení ceny zboží a zašle jej v elektronické podobě na elektronickou adresu kupujícího, s čímž kupující souhlasí.
                </p>

                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>
                  5. PŘEPRAVA A DODÁNÍ ZBOŽÍ
                </h3>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  5.1. Zboží doručujeme do České republiky a do dalších členských států Evropské unie. Způsoby doručení: DPD (na výdejní místo nebo na adresu), GLS (na výdejní místo nebo na adresu) a osobní odběr na adrese Bratří Čapků 1095, 534 01 Holice, případně dle domluvy na určeném odběrném místě v Pardubicích. Aktuální ceny dopravy a dodací lhůty pro jednotlivé země jsou uvedeny v sekci „Doprava a platba“ a vždy se zobrazí v objednávkovém procesu před odesláním objednávky.
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  5.2. V případě, že je způsob dopravy smluven na základě zvláštního požadavku kupujícího, nese kupující riziko a případné dodatečné náklady spojené s tímto způsobem dopravy.
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  5.3. Je-li prodávající podle kupní smlouvy povinen dodat zboží na místo určené kupujícím v objednávce, je kupující povinen převzít zboží při dodání. Není-li ujednán čas dodání, dodá prodávající zboží bez zbytečného odkladu po uzavření smlouvy, nejpozději však do 30 dnů. To neplatí pro předobjednávky, u nichž je orientační termín dodání uveden u zboží (viz sekce „Doprava a platba“).
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  5.4. V případě, že je z důvodů na straně kupujícího nutno zboží doručovat opakovaně nebo jiným způsobem, než bylo uvedeno v objednávce, je kupující povinen uhradit náklady spojené s opakovaným doručováním zboží, resp. náklady spojené s jiným způsobem doručení.
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  5.5. Při převzetí zboží od přepravce doporučujeme kupujícímu zkontrolovat neporušenost obalů zboží a v případě jakýchkoliv závad (proražení krabice, poškozené rohy) toto neprodleně oznámit přepravci a sepsat s ním škodní protokol, případně zásilku nepřevzít. Nevyužití tohoto doporučení nemá vliv na práva kupujícího z vadného plnění.
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  5.6. Nebezpečí škody na zboží přechází na kupujícího, který je spotřebitelem, převzetím zboží. Na kupujícího, který je podnikatelem, přechází nebezpečí škody na zboží předáním zboží prvnímu dopravci pro přepravu do místa určení.
                </p>

                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>
                  6. ODSTOUPENÍ OD KUPNÍ SMLOUVY (POUZE SPOTŘEBITEL)
                </h3>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  6.1. Kupující, který je spotřebitelem, má právo odstoupit od kupní smlouvy bez udání důvodu ve lhůtě čtrnácti (14) dnů ode dne, kdy on nebo jím určená třetí osoba (odlišná od dopravce) převezme zboží. Je-li předmětem smlouvy několik druhů zboží nebo dodání několika částí, běží lhůta ode dne převzetí poslední dodávky zboží. Spotřebitel může od smlouvy odstoupit i kdykoliv před dodáním zboží.
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  6.2. Odstoupení od smlouvy může spotřebitel učinit kterýmkoli z těchto způsobů: (a) prostřednictvím on-line formuláře „Odstoupit od smlouvy“ dostupného na webu v záložce „Odstoupení od smlouvy“ – přijetí odstoupení potvrdíme neprodleně e-mailem; (b) e-mailem na adresu info@northvaletcg.eu; (c) písemně na adresu NORTHVALE s.r.o., Bratří Čapků 1095, 534 01 Holice. Spotřebitel může využít rovněž vzorový formulář pro odstoupení od smlouvy, jehož znění je uvedeno v záložce „Odstoupení od smlouvy“; není to však jeho povinností.
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  6.3. Lhůta pro odstoupení je zachována, pokud spotřebitel v jejím průběhu odešle prodávajícímu oznámení, že od smlouvy odstupuje.
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  6.4. Odstoupí-li spotřebitel od kupní smlouvy, zašle nebo předá prodávajícímu bez zbytečného odkladu, nejpozději do čtrnácti (14) dnů od odstoupení od smlouvy, zboží, které od něho obdržel. Přímé náklady spojené s vrácením zboží (zejména poštovné a balné) nese spotřebitel. Zásilky zaslané na dobírku nemůžeme z provozních důvodů přijmout; tím není dotčeno právo spotřebitele odstoupit od smlouvy.
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  6.5. Odstoupí-li spotřebitel od kupní smlouvy, vrátí mu prodávající bez zbytečného odkladu, nejpozději do čtrnácti (14) dnů od odstoupení od smlouvy, všechny peněžní prostředky včetně nákladů na dodání, které od něho na základě smlouvy přijal, a to stejným způsobem, jakým je přijal (v případě platby kartou zpětnou transakcí na platební kartu), případně jiným způsobem určeným spotřebitelem, pokud s tím spotřebitel souhlasí a nevzniknou mu tím další náklady. Jestliže spotřebitel zvolil jiný než nejlevnější způsob dodání zboží, který prodávající nabízí, vrátí prodávající spotřebiteli náklady na dodání zboží pouze ve výši odpovídající nejlevnějšímu nabízenému způsobu dodání zboží.
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  6.6. Prodávající není povinen vrátit přijaté peněžní prostředky spotřebiteli dříve, než obdrží vrácené zboží zpět, nebo než spotřebitel prokáže, že zboží prodávajícímu odeslal, podle toho, co nastane dříve.
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  6.7. Odpovědnost za snížení hodnoty zboží: Spotřebitel odpovídá prodávajícímu za snížení hodnoty zboží, které vzniklo v důsledku nakládání s tímto zbožím jinak, než je nutné k tomu, aby se seznámil s jeho povahou, vlastnostmi a funkčností (§ 1833 občanského zákoníku). Kupující bere na vědomí, že u originálně balených sběratelských produktů (např. Booster Boxy, Elite Trainer Boxy, dárkové sety) je nedílnou součástí hodnoty zboží neporušenost originální smršťovací fólie výrobce (shrink wrap); jejím porušením dochází k podstatnému snížení sběratelské hodnoty zboží. Výše náhrady se v takovém případě určuje individuálně podle skutečného snížení tržní hodnoty konkrétního zboží a může u těchto produktů dosáhnout až 30–50 % kupní ceny. Obdobně spotřebitel odpovídá za zhoršení stavu kusových karet (např. poškrábání, ohnutí rohů, otlačení). Nárok na náhradu je prodávající oprávněn jednostranně započíst proti nároku spotřebitele na vrácení kupní ceny.
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  6.8. Spotřebitel nemůže odstoupit od smluv uvedených v § 1837 občanského zákoníku, zejména od smlouvy o dodávce zboží vyrobeného podle požadavků spotřebitele nebo přizpůsobeného jeho osobním potřebám.
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  6.9. Právo odstoupit od smlouvy dle tohoto článku se vztahuje i na předobjednávky, přičemž lhůta 14 dnů běží od převzetí zboží.
                </p>

                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>
                  7. PRÁVA Z VADNÉHO PLNĚNÍ (REKLAMACE)
                </h3>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  7.1. Práva a povinnosti smluvních stran ohledně práv z vadného plnění se řídí příslušnými obecně závaznými právními předpisy, zejména § 1914 až 1925, § 2099 až 2117 a § 2161 až 2174b občanského zákoníku a zákonem č. 634/1992 Sb., o ochraně spotřebitele.
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  7.2. Prodávající odpovídá kupujícímu, že zboží při převzetí nemá vady. Zejména odpovídá za to, že zboží odpovídá ujednanému popisu, druhu a množství, jakosti a jiným ujednaným vlastnostem, je vhodné k účelu, pro který jej kupující požaduje a s nímž prodávající souhlasil, a je dodáno s ujednaným příslušenstvím a pokyny k použití.
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  7.3. Kupující, který je spotřebitelem, může vytknout vadu, která se na zboží projeví v době dvou (2) let od převzetí. Projeví-li se vada v průběhu jednoho (1) roku od převzetí, má se za to, že zboží bylo vadné již při převzetí, ledaže to povaha zboží nebo vady vylučuje.
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  7.4. Má-li zboží vadu, může kupující požadovat její odstranění. Podle své volby může požadovat dodání nového zboží bez vady nebo opravu zboží, ledaže je zvolený způsob odstranění vady nemožný nebo ve srovnání s druhým nepřiměřeně nákladný. Kupující může požadovat přiměřenou slevu nebo odstoupit od smlouvy, pokud prodávající vadu odmítl odstranit nebo ji neodstranil v přiměřené době, vada se projeví opakovaně, vada je podstatným porušením smlouvy, nebo je z prohlášení prodávajícího nebo z okolností zjevné, že vada nebude odstraněna v přiměřené době nebo bez značných obtíží pro kupujícího.
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  7.5. Práva z vadného plnění uplatňuje kupující u prodávajícího na adrese NORTHVALE s.r.o., Bratří Čapků 1095, 534 01 Holice, nebo e-mailem na info@northvaletcg.eu. Prodávající vydá kupujícímu při uplatnění reklamace písemné potvrzení, ve kterém uvede datum uplatnění reklamace, její obsah, požadovaný způsob vyřízení a kontaktní údaje kupujícího pro účely poskytnutí informace o vyřízení reklamace.
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  7.6. Reklamace včetně odstranění vady musí být vyřízena a kupující, který je spotřebitelem, o tom musí být informován nejpozději do třiceti (30) dnů ode dne uplatnění reklamace, pokud se prodávající s kupujícím nedohodne na delší lhůtě. Marné uplynutí této lhůty se považuje za podstatné porušení smlouvy a kupující má právo od kupní smlouvy odstoupit nebo požadovat přiměřenou slevu. O vyřízení reklamace vydá prodávající kupujícímu potvrzení obsahující datum a způsob vyřízení reklamace, včetně potvrzení o provedení opravy a době jejího trvání, případně písemné odůvodnění zamítnutí reklamace.
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  7.7. Právo z vadného plnění kupujícímu nenáleží, pokud vadu sám způsobil. Vadou zboží není opotřebení způsobené jeho obvyklým užíváním ani mechanické poškození vzniklé po přechodu nebezpečí škody na kupujícího (např. ohnutí rohů karet, poškrábání či otlačení od alb). Kupující bere na vědomí, že drobné výrobní odchylky dané technologií výrobce sběratelských karet (např. mírně odchylné centrování tisku), které nevybočují z běžného standardu výrobce, nepředstavují vadu zboží; tím nejsou dotčena práva kupujícího, pokud takové odchylky odporují ujednaným vlastnostem zboží (např. deklarovanému stavu kusové karty).
                </p>

                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>
                  8. RECENZE ZÁKAZNÍKŮ
                </h3>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  8.1. Recenze zboží zveřejněné v e-shopu nejsou prodávajícím ověřované. Prodávající neověřuje, zda recenze pochází od zákazníka, který zboží skutečně zakoupil či užil; recenzi může vložit kterýkoli návštěvník e-shopu.
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  8.2. Prodávající nezveřejňuje recenze, o nichž ví, že jsou nepravdivé, ani recenze upravené za účelem zkreslení jejich vyznění. Recenze mohou být odstraněny pouze z důvodů uvedených v čl. 9.
                </p>

                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>
                  9. OBSAH VYTVÁŘENÝ UŽIVATELI
                </h3>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  9.1. Umožňuje-li e-shop vkládání uživatelského obsahu (zejména recenzí a hodnocení), nesmí tento obsah být protiprávní, nepravdivý, urážlivý, vulgární, porušovat práva třetích osob (včetně práv autorských) ani mít povahu nevyžádané reklamy (spam).
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  9.2. Obsah porušující čl. 9.1 je prodávající oprávněn nezveřejnit nebo odstranit. O odstranění zveřejněného obsahu a jeho důvodech prodávající autora obsahu informuje, je-li to možné, a autor má možnost se proti tomuto rozhodnutí ohradit e-mailem.
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  9.3. Závadný obsah může kdokoli nahlásit na e-mailové adrese info@northvaletcg.eu. Tato adresa slouží současně jako kontaktní místo pro komunikaci s orgány veřejné moci a uživateli ve smyslu nařízení (EU) 2022/2065 o digitálních službách (DSA); komunikovat lze v českém a anglickém jazyce.
                </p>

                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>
                  10. MIMOSOUDNÍ ŘEŠENÍ SPOTŘEBITELSKÝCH SPORŮ
                </h3>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  10.1. Vyřizování stížností spotřebitelů zajišťuje prodávající prostřednictvím elektronické adresy info@northvaletcg.eu. Informaci o vyřízení stížnosti kupujícího zašle prodávající na elektronickou adresu kupujícího.
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  10.2. K mimosoudnímu řešení spotřebitelských sporů z kupní smlouvy je příslušná Česká obchodní inspekce, se sídlem Štěpánská 796/44, 110 00 Praha 1, IČO: 000 20 869, internetová adresa: www.coi.cz. Návrh na zahájení mimosoudního řešení spotřebitelského sporu (ADR) lze podat prostřednictvím formuláře dostupného na adrese adr.coi.cz.
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  10.3. Spotřebitelé s bydlištěm v jiném členském státě EU se mohou v případě přeshraničního sporu obrátit rovněž na Evropské spotřebitelské centrum ČR, se sídlem Štěpánská 796/44, 110 00 Praha 1, internetová adresa: evropskyspotrebitel.cz, které poskytuje bezplatnou pomoc při řešení přeshraničních spotřebitelských sporů.
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  10.4. Prodávající je oprávněn k prodeji zboží na základě živnostenského oprávnění. Živnostenskou kontrolu provádí v rámci své působnosti příslušný živnostenský úřad. Dozor nad oblastí ochrany osobních údajů vykonává Úřad pro ochranu osobních údajů. Česká obchodní inspekce vykonává ve vymezeném rozsahu mimo jiné dozor nad dodržováním zákona č. 634/1992 Sb., o ochraně spotřebitele.
                </p>

                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>
                  11. OCHRANA OSOBNÍCH ÚDAJŮ
                </h3>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  11.1. Informace o zpracování osobních údajů kupujícího, včetně informací o používání souborů cookies, jsou uvedeny v samostatném dokumentu „Zásady ochrany osobních údajů“ dostupném na webu prodávajícího v záložce „Ochrana osobních údajů“.
                </p>

                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>
                  12. ZÁVĚREČNÁ USTANOVENÍ
                </h3>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  12.1. Pokud vztah založený kupní smlouvou obsahuje mezinárodní (zahraniční) prvek, pak strany sjednávají, že vztah se řídí českým právem. Volbou českého práva není spotřebitel s obvyklým bydlištěm v jiném členském státě EU zbaven ochrany, kterou mu poskytují ustanovení právního řádu tohoto státu, od nichž se nelze smluvně odchýlit (čl. 6 odst. 2 nařízení Řím I).
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  12.2. Je-li některé ustanovení obchodních podmínek neplatné nebo neúčinné, nebo se takovým stane, namísto neplatných ustanovení nastoupí ustanovení, jehož smysl se neplatnému ustanovení co nejvíce přibližuje. Neplatností nebo neúčinností jednoho ustanovení není dotčena platnost ostatních ustanovení.
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  12.3. Přílohu obchodních podmínek tvoří vzorový formulář pro odstoupení od kupní smlouvy (dostupný v záložce „Odstoupení od smlouvy“).
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  12.4. Kontaktní údaje prodávajícího: adresa pro doručování NORTHVALE s.r.o., Bratří Čapků 1095, 534 01 Holice; e-mail: info@northvaletcg.eu; telefon: +420 739 666 779.
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Tyto obchodní podmínky nabývají účinnosti dne 2. 7. 2026.
                </p>
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
                  ZÁSADY OCHRANY OSOBNÍCH ÚDAJŮ
                </h2>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  obchodní společnosti NORTHVALE s.r.o.
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  se sídlem Bratří Čapků 1095, 534 01 Holice
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  IČO: 29618142 | DIČ: CZ29618142 (plátce DPH)
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  zapsané v obchodním rejstříku vedeném Krajským soudem v Hradci Králové, oddíl C, vložka 56872
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  e-mail: info@northvaletcg.eu | telefon: +420 739 666 779
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  pro provoz on-line obchodu na internetové adrese northvaletcg.eu
                </p>

                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>
                  1. ÚVODNÍ USTANOVENÍ
                </h3>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  1.1. Tyto zásady popisují, jakým způsobem společnost NORTHVALE s.r.o. (dále jen „správce“ nebo „my“) shromažďuje, zpracovává, uchovává a chrání osobní údaje návštěvníků a zákazníků (dále jen „subjekt údajů“ nebo „vy“) internetového obchodu northvaletcg.eu (dále jen „e-shop“).
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  1.2. Osobní údaje zpracováváme v souladu s nařízením Evropského parlamentu a Rady (EU) 2016/679 (obecné nařízení o ochraně osobních údajů, dále jen „GDPR“) a zákonem č. 110/2019 Sb., o zpracování osobních údajů.
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  1.3. Kontaktní údaje správce: NORTHVALE s.r.o., Bratří Čapků 1095, 534 01 Holice; e-mail: info@northvaletcg.eu; telefon: +420 739 666 779. Pověřenec pro ochranu osobních údajů nebyl jmenován, neboť správce nemá tuto povinnost.
                </p>

                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>
                  2. KATEGORIE ZPRACOVÁVANÝCH OSOBNÍCH ÚDAJŮ
                </h3>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Identifikační údaje: jméno, příjmení, titul, u podnikatelů název firmy, IČO a DIČ.
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Kontaktní a adresní údaje: e-mailová adresa, telefonní číslo, dodací a fakturační adresa.
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Platební a transakční údaje: číslo bankovního účtu, historie objednávek, plateb a výkupů. Údaje o platební kartě nezpracováváme – zpracovává je výhradně provozovatel platební brány GP webpay, společnost Global Payments s.r.o.
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Údaje o uživatelském účtu: uživatelské jméno, heslo (v zašifrované podobě), stav Store Creditu, uložené doručovací adresy, poznámky a historie asistovaného gradingu (PSA/CGC).
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Údaje z komunikace: obsah zpráv z kontaktního formuláře, e-mailové a telefonické komunikace, údaje z formuláře pro odstoupení od smlouvy (číslo objednávky, e-mail, číslo bankovního účtu pro vrácení peněz).
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Recenze a uživatelský obsah: text recenze a identifikace uživatele, který ji vložil.
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Síťové a analytické údaje: IP adresa, soubory cookies a obdobné technologie, údaje o chování na webu (Google Analytics, Microsoft Clarity).
                </p>

                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>
                  3. ÚČELY A PRÁVNÍ ZÁKLADY ZPRACOVÁNÍ
                </h3>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  A. Plnění smlouvy a jednání o ní (čl. 6 odst. 1 písm. b) GDPR): vyřízení objednávky, vedení uživatelského účtu a Store Creditu, expedice zboží, vyřízení plateb, reklamací a odstoupení od smlouvy; smlouvy o výkupu karet (buylist) včetně určení výkupní ceny a výplaty; zprostředkování asistovaného gradingu.
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  B. Plnění právních povinností (čl. 6 odst. 1 písm. c) GDPR): vedení účetnictví, uchovávání daňových dokladů, vyřizování práv subjektů údajů a práv spotřebitelů.
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  C. Oprávněný zájem správce (čl. 6 odst. 1 písm. f) GDPR): zasílání obchodních sdělení (newsletter) našim zákazníkům v souladu s § 7 odst. 3 zákona č. 480/2004 Sb., s možností kdykoli se bezplatně odhlásit v každém zaslaném sdělení; prevence podvodů (zejména při výkupu karet); zajištění bezpečnosti sítě a IT systémů; určení, výkon a obhajoba právních nároků; odpovědi na dotazy z kontaktního formuláře.
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  D. Souhlas (čl. 6 odst. 1 písm. a) GDPR): zasílání newsletteru osobám, které nejsou našimi zákazníky; ukládání analytických cookies a měření chování na webu (Google Analytics, Microsoft Clarity). Souhlas lze kdykoli odvolat, aniž je tím dotčena zákonnost zpracování před jeho odvoláním.
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Poskytnutí údajů nezbytných pro vyřízení objednávky je smluvním požadavkem; bez nich nelze objednávku vyřídit. Poskytnutí ostatních údajů je dobrovolné.
                </p>

                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>
                  4. PŘÍJEMCI OSOBNÍCH ÚDAJŮ
                </h3>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Osobní údaje předáváme pouze v nezbytném rozsahu těmto kategoriím příjemců:
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Dopravci: Direct Parcel Distribution CZ s.r.o. (DPD), GLS Czech Republic s.r.o.
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Provozovatel platební brány: Global Payments s.r.o. (GP webpay).
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Poskytovatelé analytických nástrojů: Google Ireland Limited (Google Analytics), Microsoft Ireland Operations Limited (Microsoft Clarity).
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Poskytovatelé IT služeb: webhosting a správa e-shopu.
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Poskytovatelé účetních služeb a účetního software.
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Gradingové autority (USA): karty zasílané k asistovanému gradingu jsou odesílány pod partnerským účtem správce bez předání vašich osobních údajů.
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Orgánům veřejné moci předáváme osobní údaje pouze na základě právní povinnosti.
                </p>

                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>
                  5. PŘEDÁVÁNÍ DO TŘETÍCH ZEMÍ
                </h3>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Osobní údaje zpracováváme primárně v EU/EHP. Při využití nástrojů Google Analytics a Microsoft Clarity může docházet k předání údajů do USA. Toto předání je založeno na rozhodnutí Evropské komise o odpovídající ochraně dle čl. 45 GDPR (rámec EU–USA pro ochranu údajů, Data Privacy Framework), jehož jsou společnosti Google LLC a Microsoft Corporation certifikovanými účastníky, případně na standardních smluvních doložkách dle čl. 46 GDPR.
                </p>

                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>
                  6. DOBA UCHOVÁVÁNÍ OSOBNÍCH ÚDAJŮ
                </h3>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Údaje související s kupní smlouvou a výkupem: po dobu trvání smluvního vztahu a dále po dobu trvání práv z vadného plnění a promlčecích lhůt, zpravidla 5 let od splnění smlouvy.
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Daňové doklady a účetní záznamy: po dobu stanovenou právními předpisy, u daňových dokladů 10 let.
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Uživatelský účet: po dobu existence účtu; účet nevyužívaný déle než 24 měsíců můžeme zrušit (viz obchodní podmínky).
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Marketing (newsletter): po dobu 3 let od posledního nákupu, resp. do odvolání souhlasu nebo podání námitky.
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Komunikace z kontaktního formuláře: po dobu nezbytnou k vyřízení dotazu, nejdéle 1 rok od ukončení komunikace.
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Recenze: po dobu jejich zveřejnění v e-shopu.
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Cookies: podle typu od ukončení relace po dobu nejdéle 2 let (podrobnosti v nastavení cookies).
                </p>

                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>
                  7. VAŠE PRÁVA
                </h3>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Máte právo na přístup ke svým osobním údajům, na jejich opravu či doplnění, na výmaz („právo být zapomenut“), na omezení zpracování, na přenositelnost údajů, právo vznést námitku proti zpracování založenému na oprávněném zájmu a právo kdykoli odvolat udělený souhlas. Proti zpracování pro účely přímého marketingu můžete vznést námitku kdykoli a my zpracování bez dalšího ukončíme.
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Svá práva můžete uplatnit e-mailem na info@northvaletcg.eu nebo písemně na adrese sídla správce. Žádosti vyřizujeme bezplatně, nejpozději do jednoho měsíce od obdržení; tuto lhůtu lze v odůvodněných případech prodloužit o další dva měsíce, o čemž bychom vás informovali.
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Máte rovněž právo podat stížnost u dozorového úřadu, kterým je Úřad pro ochranu osobních údajů, Pplk. Sochora 27, 170 00 Praha 7, www.uoou.gov.cz. Subjekty údajů z jiných členských států EU se mohou obrátit též na dozorový úřad ve státě svého bydliště.
                </p>

                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>
                  8. COOKIES
                </h3>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  8.1. E-shop používá soubory cookies a obdobné technologie. Technické (nezbytné) cookies, bez kterých web nemůže fungovat (např. obsah košíku, přihlášení, nastavení souhlasu), používáme na základě § 89 odst. 3 zákona č. 127/2005 Sb., o elektronických komunikacích, bez nutnosti souhlasu.
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  8.2. Analytické cookies (Google Analytics, Microsoft Clarity) používáme pouze s vaším souhlasem uděleným prostřednictvím cookie lišty. Souhlas můžete kdykoli odvolat nebo své preference změnit v nastavení cookies na webu. Neudělení souhlasu nemá vliv na možnost používat e-shop.
                </p>

                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>
                  9. AUTOMATIZOVANÉ ROZHODOVÁNÍ A PROFILOVÁNÍ
                </h3>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Neprovádíme automatizované individuální rozhodování ve smyslu čl. 22 GDPR, které by pro vás mělo právní nebo obdobně významné účinky.
                </p>

                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>
                  10. ZABEZPEČENÍ OSOBNÍCH ÚDAJŮ
                </h3>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Přijali jsme vhodná technická a organizační opatření k zabezpečení osobních údajů. Přístup k údajům mají pouze pověřené osoby vázané mlčenlivostí. Veškerý přenos dat mezi vaším prohlížečem a e-shopem probíhá šifrovaně (HTTPS, SSL/TLS); hesla ukládáme výhradně v zašifrované podobě.
                </p>

                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>
                  11. ZÁVĚREČNÁ USTANOVENÍ
                </h3>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Tyto zásady můžeme průběžně aktualizovat, zejména v návaznosti na změny právních předpisů nebo zpracovatelských operací; aktuální znění je vždy dostupné na této stránce. Tyto zásady jsou účinné ode dne 2. 7. 2026.
                </p>
              </div>
            )
          )}

          {activeTab === 'odstoupeni' && (
            <div>
              {lang === 'EN' ? (
                <div>
                  <h2 style={{ fontSize: '24px', fontWeight: '800', margin: '0 0 20px 0', color: 'var(--text-main)', fontFamily: 'var(--font-heading)' }}>
                    ORDER WITHDRAWAL (ONLINE FORM)
                  </h2>
                  <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                    As a consumer, you have the right to withdraw from a purchase agreement concluded on our e-shop within 14 days of receiving the parcel, without stating a reason.
                  </p>
                  <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', marginBottom: '24px' }}>
                    To simplify this process, we have prepared an online form. You can submit your withdrawal electronically on this page without printing any paper documents.
                  </p>

                  <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.06)', margin: '24px 0' }} />

                  <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--color-gold)', margin: '24px 0 12px 0' }}>
                    How to proceed with order withdrawal:
                  </h3>
                  <ol style={{ paddingLeft: '20px', fontSize: '13px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
                    <li>Fill in the online form below (enter name, order number, email address, and select a refund method).</li>
                    <li>Submit the form by clicking "Withdraw from Purchase".</li>
                    <li>You will immediately receive an email confirmation with your summary.</li>
                    <li>Ship the products back to our registered address within 14 days.</li>
                  </ol>

                  <div style={{
                    background: 'rgba(253, 189, 22, 0.05)',
                    border: '1px dashed rgba(253, 189, 22, 0.3)',
                    padding: '16px',
                    borderRadius: '6px',
                    marginBottom: '24px',
                    marginTop: '10px'
                  }}>
                    <p style={{ fontSize: '13px', fontWeight: 'bold', color: '#fff', marginBottom: '8px' }}>
                      📦 Return via DPD (Easiest way):
                    </p>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                      To easily generate a return label and ship the parcel back via DPD Pickup points, click the button below.
                    </p>
                    <a 
                      href="https://rmp.dpdgroup.com/015/northvale" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="nv-btn nv-btn-gold"
                      style={{
                        display: 'inline-flex',
                        textDecoration: 'none',
                        padding: '8px 16px',
                        fontSize: '12px',
                        fontWeight: '800',
                        borderRadius: '4px',
                        color: '#000',
                        background: 'var(--color-gold, #fdbd16)',
                      }}
                    >
                      Create DPD Return Label
                    </a>
                  </div>
                </div>
              ) : (
                <div>
                <h2 style={{ fontSize: '24px', fontWeight: '800', margin: '0 0 20px 0', color: 'var(--text-main)', fontFamily: 'var(--font-heading)' }}>
                  ODSTOUPENÍ OD SMLOUVY
                </h2>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Jako spotřebitel máte právo odstoupit od kupní smlouvy uzavřené v našem e-shopu northvaletcg.eu bez udání důvodu, a to ve lhůtě 14 dnů. Níže najdete kompletní poučení, elektronický formulář i vzorový formulář pro odstoupení.
                </p>

                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>
                  POUČENÍ O PRÁVU NA ODSTOUPENÍ OD SMLOUVY
                </h3>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Lhůta: Od smlouvy můžete odstoupit do 14 dnů ode dne, kdy vy nebo vámi určená třetí osoba (jiná než dopravce) převezmete zboží. Pokud je v jedné objednávce dodáváno více kusů zboží nebo je zboží dodáváno po částech, běží lhůta od převzetí poslední dodávky. Odstoupit můžete i kdykoli před dodáním zboží. Lhůta je zachována, pokud nám oznámení o odstoupení odešlete v její poslední den.
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Jak odstoupit: (a) nejrychleji prostřednictvím elektronického formuláře níže – přijetí odstoupení vám neprodleně potvrdíme e-mailem; (b) e-mailem na info@northvaletcg.eu; (c) písemně na adresu NORTHVALE s.r.o., Bratří Čapků 1095, 534 01 Holice. Můžete použít i vzorový formulář uvedený níže, není to však vaše povinnost.
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Vrácení zboží: Zboží nám zašlete nebo předejte bez zbytečného odkladu, nejpozději do 14 dnů od odstoupení, na adresu NORTHVALE s.r.o., Bratří Čapků 1095, 534 01 Holice. Přímé náklady na vrácení zboží (poštovné a balné) nesete vy. Zásilky na dobírku nepřebíráme.
                </p>

                <div style={{
                  background: 'rgba(253, 189, 22, 0.05)',
                  border: '1px dashed rgba(253, 189, 22, 0.3)',
                  padding: '16px',
                  borderRadius: '6px',
                  marginBottom: '20px',
                  marginTop: '10px'
                }}>
                  <p style={{ fontSize: '13px', fontWeight: 'bold', color: '#fff', marginBottom: '8px' }}>
                    📦 Vrácení přes DPD (nejjednodušší cesta):
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                    Pro snadné vygenerování štítku a odeslání zpět přes výdejní místa DPD Pickup klikněte na odkaz níže.
                  </p>
                  <a 
                    href="https://rmp.dpdgroup.com/015/northvale" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="nv-btn nv-btn-gold"
                    style={{
                      display: 'inline-flex',
                      textDecoration: 'none',
                      padding: '8px 16px',
                      fontSize: '12px',
                      fontWeight: '800',
                      borderRadius: '4px',
                      color: '#000',
                      background: 'var(--color-gold, #fdbd16)',
                    }}
                  >
                    Vytvořit vratku DPD
                  </a>
                </div>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Vrácení peněz: Všechny peněžní prostředky, které jsme od vás přijali, včetně nákladů na dodání (kromě dodatečných nákladů vzniklých volbou jiného než nejlevnějšího námi nabízeného způsobu dodání), vám vrátíme bez zbytečného odkladu, nejpozději do 14 dnů od odstoupení, a to stejným způsobem, jakým jsme je přijali – při platbě kartou zpětnou transakcí na kartu, jinak převodem na vámi určený bankovní účet. Peníze nejsme povinni vrátit dříve, než obdržíme vrácené zboží zpět, nebo než prokážete, že jste nám zboží odeslali.
                </p>

                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>
                  ELEKTRONICKÝ FORMULÁŘ PRO ODSTOUPENÍ
                </h3>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  (Tento formulář slouží pro rychlé elektronické odeslání oznámení o odstoupení od kupní smlouvy. Po odeslání vám náš systém okamžitě zašle automatické potvrzení o přijetí odstoupení s časovým razítkem.)
                </p>

                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>
                  JMÉNO A PŘÍJMENÍ *
                </h3>

                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>
                  ČÍSLO OBJEDNÁVKY *
                </h3>

                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>
                  E-MAILOVÁ ADRESA *
                </h3>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  ROZSAH VRÁCENÍ * – Chci vrátit celou objednávku / Chci vrátit pouze část objednávky (vyberte položky)
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  ZPŮSOB VRÁCENÍ PROSTŘEDKŮ * – Původní platební kartou (přes bránu GP webpay): prostředky budou vráceny zpět na kartu, kterou byla provedena platba / Bankovní převod: standardní převod na zadaný účet
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  ČÍSLO BANKOVNÍHO ÚČTU PRO VRÁCENÍ PENĚZ (vyplňte pouze při volbě vrácení bankovním převodem) *
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  [Tlačítko: ODSTOUPIT OD SMLOUVY]
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  (Kliknutím na tlačítko odešlete vyplněné oznámení o odstoupení od smlouvy prodávajícímu. Odesláním oznámení začíná běžet 14denní lhůta pro vrácení zboží.)
                </p>

                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>
                  CO SE STANE PO ODESLÁNÍ FORMULÁŘE?
                </h3>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Potvrzení do e-mailu: Systém vám v souladu se zákonem okamžitě odešle automatické potvrzení o přijetí odstoupení s časovým razítkem.
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Odeslání zboží: Zboží bezpečně zabalte (u kusových karet doporučujeme penny sleeve a toploader, u balených produktů pevnou kartonovou krabici a bublinkovou fólii) a odešlete na adresu NORTHVALE s.r.o., Bratří Čapků 1095, 534 01 Holice.
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Kontrola a vrácení peněz: Jakmile zásilku převezmeme, zkontrolujeme stav zboží. Nejpozději do 14 dnů od odstoupení (peníze však můžeme zadržet do doby, než vrácené zboží obdržíme nebo než prokážete jeho odeslání) vám vrátíme peníze zpět na kartu nebo na bankovní účet.
                </p>

                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>
                  UPOZORNĚNÍ PRO SBĚRATELE A INVESTORY (SNÍŽENÍ HODNOTY ZBOŽÍ)
                </h3>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  V souladu s § 1833 občanského zákoníku odpovídáte za snížení hodnoty zboží, které vzniklo v důsledku nakládání s ním jinak, než je nutné k seznámení se s jeho povahou, vlastnostmi a funkčností.
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  U originálně balených produktů (Booster Boxy, Elite Trainer Boxy, speciální dárkové sety, jednotlivé boostery) dochází porušením originální ochranné fólie výrobce (tzv. shrink wrap) k nevratnému snížení sběratelské a investiční hodnoty – zboží ztrácí garanci neotevřenosti. Pokud vrátíte zboží s porušenou fólií, uplatníme nárok na náhradu odpovídající skutečnému snížení hodnoty konkrétního zboží, která může činit až 30–50 % kupní ceny, a bude odečtena od vrácené částky. U kusových karet (singles) obdobně odpovídáte za zhoršení stavu karty (poškrábání, ohnutí rohů, otlačení od kroužkových alb apod.).
                </p>

                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>
                  VZOROVÝ FORMULÁŘ PRO ODSTOUPENÍ OD SMLOUVY
                </h3>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  (Vyplňte tento formulář a odešlete jej zpět pouze v případě, že chcete odstoupit od smlouvy písemně či e-mailem. Můžete využít i elektronický formulář výše.)
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Adresát: NORTHVALE s.r.o., Bratří Čapků 1095, 534 01 Holice, e-mail: info@northvaletcg.eu
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Oznamuji/oznamujeme (*), že tímto odstupuji/odstupujeme (*) od smlouvy o nákupu tohoto zboží (*):
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Datum objednání (*)/datum obdržení (*):
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Číslo objednávky:
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Jméno a příjmení spotřebitele/spotřebitelů:
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Adresa spotřebitele/spotřebitelů:
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Podpis spotřebitele/spotřebitelů (pouze pokud je tento formulář zasílán v listinné podobě):
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Datum:
                </p>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  (*) Nehodící se škrtněte nebo údaje doplňte.
                </p>
                </div>
              )}

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
                        <td style={{ padding: '10px 0', fontWeight: '700', color: 'var(--text-main)' }}>{t('GdprVop.fullNameLabel')}</td>
                        <td style={{ padding: '10px 0', textAlign: 'right' }}>{submittedData?.fullName}</td>
                      </tr>
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
                    <label className="login-form-label">{t('GdprVop.fullNameLabel')} *</label>
                    <input
                      type="text"
                      className={`login-form-input ${errors.fullName ? 'input-error' : ''}`}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder={lang === 'EN' ? "e.g. John Doe" : "např. Jan Novák"}
                    />
                    {errors.fullName && (
                      <p className="login-form-error-msg">{errors.fullName}</p>
                    )}
                  </div>

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
                      {lang === 'EN' ? "IMPORTANT NOTICE FOR COLLECTORS AND INVESTORS:" : "DŮLEŽITÉ UPOZORNĚNÍ PRO SBĚRATELE A INVESTORY:"}
                    </h4>
                    <p style={{ margin: '0 0 10px 0' }}>
                      {lang === 'EN' 
                        ? "Please note that for products in original packaging (e.g., Booster Boxes, Elite Trainer Boxes, special gift sets, or individual Boosters), opening or breaking the manufacturer's original protective shrink wrap causes irreversible damage to its collectible and investment value."
                        : "Berte prosím na vědomí, že u originálně balených produktů (např. Booster Boxy, Elite Trainer Boxy, speciální dárkové sety, nebo jednotlivé Boostery) dochází porušením originální ochranné fólie (tzv. shrink wrap s logy výrobce) k nevratnému poškození sběratelské a investiční hodnoty."}
                    </p>
                    <p style={{ margin: 0 }}>
                      {lang === 'EN'
                        ? "The product immediately becomes opened and weighable (losing its original guarantee). If you return goods with a broken wrap seal, we will claim compensation for the reduction in value in accordance with Section 1833 of the Civil Code. This compensation may amount to 30% to 50% of the purchase price and will be deducted from the refund. For Singles (raw cards), the card's physical condition must remain entirely undamaged (e.g., free of surface scratches, bent corners, or pressure marks from ring binders)."
                        : "Zboží se tímto okamžikem stává rozbaleným a zvážitelným (ztrácí záruku neotevřenosti). Pokud vrátíte zboží s porušenou fólií, budeme nuceni uplatnit nárok na náhradu snížení hodnoty zboží v souladu s § 1833 občanského zákoníku. Tato náhrada může činit 30 až 50 % z kupní ceny zboží a bude odečtena od vrácené částky. U kusových karet (Singles) nesmí dojít k poškození stavu karty (např. poškrábání, ohnutí rohů či otlačení od kroužkových alb)."}
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
                {lang === 'EN' ? 'What happens after you submit the form?' : 'Co se stane po odeslání formuláře?'}
              </h3>
              {lang === 'EN' ? (
                <ol style={{ paddingLeft: '20px', fontSize: '13px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <li>
                    <strong>Email Confirmation:</strong>{' '}
                    Our system will immediately send you an automatic confirmation email with a timestamp.
                  </li>
                  <li>
                    <strong>Return Shipping:</strong>{' '}
                    Pack the products securely (for singles, we recommend using a penny sleeve and toploader; for boxed products, a sturdy box and bubble wrap) and ship them to our address: NORTHVALE s.r.o., Bratří Čapků 1095, 534 01 Holice.
                  </li>
                  <li>
                    <strong>Inspection & Payout:</strong>{' '}
                    Once received, we will inspect the cards or shrink wrap seal. We will process your refund via bank transfer or back to your card within 14 days of receiving the package (or receiving proof of shipment).
                  </li>
                </ol>
              ) : (
                <ol style={{ paddingLeft: '20px', fontSize: '13px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <li>
                    <strong>Potvrzení do e-mailu:</strong>{' '}
                    Systém vám v souladu se zákonem okamžitě odešle automatické potvrzení o přijetí odstoupení s časovým razítkem.
                  </li>
                  <li>
                    <strong>Odeslání zboží:</strong>{' '}
                    Zboží bezpečně zabalte (u kusových karet doporučujeme penny sleeve a toploader, u balených produktů pevnou kartonovou krabici a bublinkovou fólii) a odešlete na adresu NORTHVALE s.r.o., Bratří Čapků 1095, 534 01 Holice.
                  </li>
                  <li>
                    <strong>Kontrola a vrácení peněz:</strong>{' '}
                    Jakmile zásilku převezmeme, zkontrolujeme stav zboží. Nejpozději do 14 dnů od odstoupení (peníze však můžeme zadržet do doby, než vrácené zboží obdržíme nebo než prokážete jeho odeslání) vám vrátíme peníze zpět na kartu nebo na bankovní účet.
                  </li>
                </ol>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
