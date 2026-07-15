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
    errorSubmit: "Nepodařilo se dokončit registraci. Zkuste to prosím znovu.",
    submitting: "Registruji...",
    footer: "© 2026 NORTHVALE. Všechna práva vyhrazena."
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
    errorSubmit: "Failed to submit registration. Please try again.",
    submitting: "Submitting...",
    footer: "© 2026 NORTHVALE. All rights reserved."
  }
};

export default function PreRegistrationLanding({ onOpenLogin }) {
  const { lang, setLang } = useTranslation();
  const [email, setEmail] = useState('');
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
                {errorMessage && <span className="pr-error-text">{errorMessage}</span>}
              </div>

              <button type="submit" className="pr-submit-btn" disabled={isSubmitting}>
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
