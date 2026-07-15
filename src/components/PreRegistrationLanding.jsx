import { useState } from 'react';
import { subscribeToNewsletter } from '../services/newsletter';
import { useTranslation } from '../context/LanguageContext';

const translations = {
  CZ: {
    title: "Připravujeme pro Vás nový TCG svět",
    desc: "Na spuštění nového e-shopu NORTHVALE usilovně pracujeme. Oficiálně otevíráme již 1. srpna!",
    benefit: "Zadejte svůj e-mail a získejte 5% slevu na Váš první nákup.",
    placeholder: "Zadejte Váš e-mail...",
    button: "Chci slevu a info",
    successTitle: "Předregistrace úspěšná!",
    successDesc: "Děkujeme za Váš zájem! Potvrzovací e-mail se slevovým kódem byl odeslán na adresu",
    successCoupon: "Váš slevový kód na 5%:",
    successNote: "Tento kód je platný pro Váš první nákup od 1. srpna.",
    errorEmail: "Zadejte prosím platnou e-mailovou adresu.",
    errorGdpr: "Pro předregistraci je nutné udělit souhlas se zpracováním osobních údajů.",
    errorSubmit: "Nepodařilo se dokončit registraci. Zkuste to prosím znovu.",
    submitting: "Registruji...",
    footer: "© 2026 NORTHVALE. Všechna práva vyhrazena.",
    gdprModalTitle: "Zpracování osobních údajů",
    gdprModalClose: "Rozumím a zavřít",
    gdprModalBody: `
      <p style="margin-top: 0;">Vaše soukromí je pro nás klíčové. Níže naleznete stručné a srozumitelné informace o tom, jak nakládáme s Vaším e-mailem v souladu s nařízením GDPR:</p>
      <h4 style="color:#FDBD16; margin: 15px 0 5px 0; font-size:14px;">1. Správce osobních údajů</h4>
      <p style="margin: 0 0 10px 0;">Správcem Vašich osobních údajů je <strong>Ondřej Zeman</strong>, se sídlem v České republice, IČO 29618142, DIČ CZ29618142 (dále jen „Správce“). Kontakt: <a href="mailto:info@northvaletcg.eu" style="color:#FDBD16;">info@northvaletcg.eu</a>.</p>
      <h4 style="color:#FDBD16; margin: 15px 0 5px 0; font-size:14px;">2. Účel a právní základ zpracování</h4>
      <p style="margin: 0 0 10px 0;">Zadáním e-mailu a zaškrtnutím políčka udělujete souhlas se zpracováním Vaší e-mailové adresy za účelem <strong>předregistrace do nového e-shopu NORTHVALE, odeslání 5% slevového kódu</strong> a informování o oficiálním otevření webu dne 1. srpna. Právním základem je Váš dobrovolný souhlas (čl. 6 odst. 1 písm. a) GDPR).</p>
      <h4 style="color:#FDBD16; margin: 15px 0 5px 0; font-size:14px;">3. Doba uchování</h4>
      <p style="margin: 0 0 10px 0;">Vaši e-mailovou adresu budeme uchovávat po dobu nezbytnou k vyřízení předregistrace a následně nejdéle po dobu 3 let pro zasílání novinek z našeho TCG e-shopu, nebo dokud svůj souhlas neodvoláte.</p>
      <h4 style="color:#FDBD16; margin: 15px 0 5px 0; font-size:14px;">4. Vaše práva</h4>
      <p style="margin: 0 0 10px 0;">Svůj souhlas můžete <strong>kdykoliv bezplatně odvolat</strong> kliknutím na odkaz pro odhlášení v obdrženém e-mailu nebo zasláním zprávy na e-mail <a href="mailto:info@northvaletcg.eu" style="color:#FDBD16;">info@northvaletcg.eu</a>. Máte právo požadovat přístup k Vašim údajům, jejich opravu, výmaz, omezení zpracování a podání stížnosti u Úřadu pro ochranu osobních údajů (ÚOOÚ).</p>
    `
  },
  EN: {
    title: "Preparing a New TCG World For You",
    desc: "We are working hard to build the new NORTHVALE e-shop. Officially launching on August 1st!",
    benefit: "Enter your email to receive a 5% discount code for your first purchase.",
    placeholder: "Enter your email...",
    button: "Pre-register Now",
    successTitle: "Pre-registration Complete!",
    successDesc: "Thank you! A confirmation email with your code has been sent to",
    successCoupon: "Your 5% discount code:",
    successNote: "This code is valid for your first purchase starting August 1st.",
    errorEmail: "Please enter a valid email address.",
    errorGdpr: "You must agree to the processing of personal data to pre-register.",
    errorSubmit: "Failed to submit registration. Please try again.",
    submitting: "Submitting...",
    footer: "© 2026 NORTHVALE. All rights reserved.",
    gdprModalTitle: "Personal Data Processing",
    gdprModalClose: "I understand and close",
    gdprModalBody: `
      <p style="margin-top: 0;">Your privacy is our priority. Below you can find concise and clear information about how we process your email address under GDPR guidelines:</p>
      <h4 style="color:#FDBD16; margin: 15px 0 5px 0; font-size:14px;">1. Data Controller</h4>
      <p style="margin: 0 0 10px 0;">The controller of your personal data is <strong>Ondřej Zeman</strong>, based in the Czech Republic, Reg. No. 29618142, VAT ID CZ29618142 (hereinafter "Controller"). Contact: <a href="mailto:info@northvaletcg.eu" style="color:#FDBD16;">info@northvaletcg.eu</a>.</p>
      <h4 style="color:#FDBD16; margin: 15px 0 5px 0; font-size:14px;">2. Purpose and Legal Basis</h4>
      <p style="margin: 0 0 10px 0;">By entering your email and checking the box, you give consent to process your email address to <strong>pre-register you for the new NORTHVALE e-shop, send you a 5% discount code</strong>, and notify you about the official launch on August 1st. The legal basis is your voluntary consent (Art. 6 (1) (a) GDPR).</p>
      <h4 style="color:#FDBD16; margin: 15px 0 5px 0; font-size:14px;">3. Storage Period</h4>
      <p style="margin: 0 0 10px 0;">We store your email address for the duration of the pre-registration, and up to 3 years max for sending card game news, or until you withdraw your consent.</p>
      <h4 style="color:#FDBD16; margin: 15px 0 5px 0; font-size:14px;">4. Your Rights</h4>
      <p style="margin: 0 0 10px 0;">You can <strong>withdraw your consent at any time</strong> for free by clicking the unsubscribe link in any email received, or by messaging <a href="mailto:info@northvaletcg.eu" style="color:#FDBD16;">info@northvaletcg.eu</a>. You have the right to request access, correction, deletion, restriction of processing, and to lodge a complaint with the Office for Personal Data Protection.</p>
    `
  }
};

export default function PreRegistrationLanding({ onOpenLogin }) {
  const { lang, setLang } = useTranslation();
  const [email, setEmail] = useState('');
  const [gdprChecked, setGdprChecked] = useState(false);
  const [showGdprModal, setShowGdprModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [clickCount, setClickCount] = useState(0);

  const t = translations[lang] || translations.CZ;

  // Secret clicks count to open admin login modal
  const handleSecretClick = () => {
    const nextCount = clickCount + 1;
    if (nextCount >= 5) {
      onOpenLogin();
      setClickCount(0);
    } else {
      setClickCount(nextCount);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setErrorMessage(t.errorEmail);
      return;
    }

    if (!gdprChecked) {
      setErrorMessage(t.errorGdpr);
      return;
    }

    setIsSubmitting(true);
    try {
      // Pass isPreRegistration = true to register directly and trigger the discount code email
      await subscribeToNewsletter(trimmedEmail, lang, true);
      setRegisteredEmail(trimmedEmail);
      setSuccess(true);
      setEmail('');
    } catch (err) {
      console.error('Pre-registration submit error:', err);
      setErrorMessage(err.message || t.errorSubmit);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="pr-landing-wrapper">
      {/* Background glow elements for rich luxury aesthetics */}
      <div className="pr-glow-one"></div>
      <div className="pr-glow-two"></div>

      {/* Language Switcher */}
      <div className="pr-lang-switch">
        <button 
          onClick={() => setLang('CZ')} 
          className={lang === 'CZ' ? 'pr-lang-btn active' : 'pr-lang-btn'}
        >
          CZ
        </button>
        <button 
          onClick={() => setLang('EN')} 
          className={lang === 'EN' ? 'pr-lang-btn active' : 'pr-lang-btn'}
        >
          EN
        </button>
      </div>

      <div className="pr-content-card">
        {/* Brand Logo & Name */}
        <div className="pr-logo-section">
          <img src="/Northvale Logo.webp" alt="NORTHVALE Logo" className="pr-logo-img" />
          <h1 className="pr-brand-name">NORTHVALE</h1>
          <p className="pr-brand-sub">Trading Card Games</p>
        </div>

        {!success ? (
          <div className="pr-form-box">
            <h2 className="pr-title">{t.title}</h2>
            <p className="pr-desc">{t.desc}</p>
            <div className="pr-benefit-badge">
              <span className="pr-gift-icon">🎁</span>
              <span>{t.benefit}</span>
            </div>

            <form onSubmit={handleSubmit} className="pr-form">
              <div className="pr-input-group">
                <input 
                  type="email" 
                  className="pr-input" 
                  placeholder={t.placeholder}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>

              {/* GDPR checkbox with popup link */}
              <div className="pr-gdpr-container">
                <label className="pr-gdpr-label">
                  <input 
                    type="checkbox" 
                    className="pr-gdpr-checkbox"
                    checked={gdprChecked}
                    onChange={(e) => setGdprChecked(e.target.checked)}
                    disabled={isSubmitting}
                  />
                  <span className="pr-gdpr-text">
                    {lang === 'CZ' ? (
                      <>Souhlasím se <a href="#" onClick={(e) => { e.preventDefault(); setShowGdprModal(true); }} className="pr-gdpr-link">zpracováním osobních údajů</a>.</>
                    ) : (
                      <>I agree to the <a href="#" onClick={(e) => { e.preventDefault(); setShowGdprModal(true); }} className="pr-gdpr-link">processing of personal data</a>.</>
                    )}
                  </span>
                </label>
              </div>

              {errorMessage && <span className="pr-error-text" style={{ marginTop: '-4px' }}>{errorMessage}</span>}

              <button type="submit" className="pr-submit-btn" disabled={isSubmitting} style={{ marginTop: '4px' }}>
                {isSubmitting ? (
                  <span className="pr-spinner"></span>
                ) : (
                  t.button
                )}
              </button>
            </form>
          </div>
        ) : (
          <div className="pr-success-box">
            <div className="pr-success-icon-badge">✓</div>
            <h2 className="pr-success-title">{t.successTitle}</h2>
            <p className="pr-success-desc">
              {t.successDesc} <strong style={{ color: '#FDBD16' }}>{registeredEmail}</strong>.
            </p>
            
            <div className="pr-coupon-card">
              <p className="pr-coupon-label">{t.successCoupon}</p>
              <div className="pr-coupon-code">NORTHVALE5</div>
              <p className="pr-coupon-note">{t.successNote}</p>
            </div>
          </div>
        )}

        {/* Footer with copyright and copyright click counter */}
        <footer className="pr-footer">
          <span 
            className="pr-footer-text" 
            onClick={handleSecretClick}
            style={{ cursor: 'default', userSelect: 'none' }}
          >
            {t.footer}
          </span>
        </footer>
      </div>

      {/* GDPR Modal Popup */}
      {showGdprModal && (
        <div className="pr-modal-overlay" onClick={() => setShowGdprModal(false)}>
          <div className="pr-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="pr-modal-header">
              <h3 className="pr-modal-title">{t.gdprModalTitle}</h3>
              <button className="pr-modal-close-x" onClick={() => setShowGdprModal(false)}>&times;</button>
            </div>
            <div className="pr-modal-body" dangerouslySetInnerHTML={{ __html: t.gdprModalBody }}></div>
            <div className="pr-modal-footer">
              <button className="pr-modal-btn" onClick={() => setShowGdprModal(false)}>
                {t.gdprModalClose}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Secret trigger: a small 4px transparent square in the absolute bottom-right corner */}
      <div 
        onClick={onOpenLogin}
        style={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          width: '8px',
          height: '8px',
          background: 'transparent',
          cursor: 'default',
          zIndex: 99999
        }}
        title="Admin Bypass"
      />
    </div>
  );
}
