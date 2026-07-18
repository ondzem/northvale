import { useState } from 'react';
import { FEATURE_FLAGS } from '../config';
import { useTranslation } from '../context/LanguageContext';
import { subscribeToNewsletter } from '../services/newsletter';

export default function Footer({ setActivePage, activePage }) {
  const { lang, t } = useTranslation();
  const hasMiddleColumn = FEATURE_FLAGS.showBuylist || FEATURE_FLAGS.showGrading;
  const gridClassName = `container footer-grid ${hasMiddleColumn ? 'has-five-cols' : 'has-four-cols'}`;

  // Newsletter states
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterSubmitting, setNewsletterSubmitting] = useState(false);
  const [newsletterSuccess, setNewsletterSuccess] = useState(false);
  const [newsletterError, setNewsletterError] = useState(null);

  const handleNewsletterSubmit = async (e) => {
    e.preventDefault();
    setNewsletterSubmitting(true);
    setNewsletterError(null);
    try {
      await subscribeToNewsletter(newsletterEmail, lang);
      setNewsletterSuccess(true);
      setNewsletterEmail('');
    } catch (err) {
      console.error('Newsletter error:', err);
      setNewsletterError(lang === 'CZ' ? 'Nepodařilo se přihlásit k odběru. Zkuste to prosím znovu.' : 'Failed to subscribe. Please try again.');
    } finally {
      setNewsletterSubmitting(false);
    }
  };

  return (
    <footer className="main-footer">
      {FEATURE_FLAGS.showNewsletter && activePage !== 'admin' && (
        <section className="newsletter-section-wrapper">
          <div className="container newsletter-section">
            <div className="newsletter-content">
              <div className="newsletter-eyebrow">NEWSLETTER • 028</div>
              <h2 className="newsletter-heading">
                {lang === 'CZ' 
                  ? (FEATURE_FLAGS.showBuylist ? 'Nové edice & výkupy jako první.' : 'Nové edice & akce jako první.') 
                  : (FEATURE_FLAGS.showBuylist ? 'New expansions & buylists first.' : 'New expansions & deals first.')}
              </h2>
            </div>
            <form className="newsletter-form" onSubmit={handleNewsletterSubmit}>
              {newsletterSuccess ? (
                <div style={{ color: 'var(--color-gold)', fontSize: '14.5px', fontWeight: '700', padding: '10px 0', textAlign: 'left' }}>
                  ✓ {lang === 'CZ' ? 'Děkujeme za přihlášení! Zkontrolujte prosím svůj e-mail pro potvrzení odběru.' : 'Thank you for subscribing! Please check your email to confirm.'}
                </div>
              ) : (
                <>
                  <div className="newsletter-input-group">
                    <label className="newsletter-input-label">{lang === 'CZ' ? 'VÁŠ E-MAIL' : 'YOUR EMAIL'}</label>
                    <input 
                      type="email" 
                      required 
                      placeholder="jmeno@example.com" 
                      className="newsletter-underline-input" 
                      value={newsletterEmail}
                      onChange={(e) => setNewsletterEmail(e.target.value)}
                      disabled={newsletterSubmitting}
                    />
                    {newsletterError && (
                      <span style={{ color: '#ff4d4f', fontSize: '11px', marginTop: '4px', textAlign: 'left', display: 'block' }}>
                        ⚠️ {newsletterError}
                      </span>
                    )}
                  </div>
                  <button className="newsletter-submit-btn" type="submit" disabled={newsletterSubmitting}>
                    {newsletterSubmitting 
                      ? (lang === 'CZ' ? 'Přihlašování...' : 'Subscribing...') 
                      : (lang === 'CZ' ? 'ODEBÍRAT' : 'SUBSCRIBE')
                    } &rarr;
                  </button>
                </>
              )}
            </form>
          </div>
        </section>
      )}
      <div className={gridClassName}>
        {/* Column 1: About */}
        <div className="footer-column footer-col-about">
          <img 
            src="/logo s popisem.webp" 
            alt="Northvale TCG Logo" 
            title="Northvale TCG" 
            className="footer-logo" 
            width="168"
            height="84"
            onClick={() => setActivePage('home')} 
          />
          <p className="footer-desc">
            {lang === 'CZ' 
              ? 'TCG e-shop od sběratelů pro sběratele. Nakupte originální karetní produkty se 100% garancí pravosti a špičkovým sběratelským balením.'
              : 'TCG shop run by collectors for collectors. Purchase authentic card products with 100% guaranteed authenticity and premium collector packaging.'
            }
          </p>
          <div className="footer-socials">
            <a href="https://www.instagram.com/northvaletcg/?utm_source=ig_web_button_share_sheet" target="_blank" rel="noopener noreferrer" className="footer-social-link">
              <img src="/instagram.png" alt="Instagram" className="footer-social-icon" width="16" height="16" />
            </a>
            <a href="https://www.facebook.com/share/18yajuq6N1/?mibextid=wwXIfr" target="_blank" rel="noopener noreferrer" className="footer-social-link">
              <img src="/facebook.png" alt="Facebook" className="footer-social-icon" width="16" height="16" />
            </a>
          </div>
        </div>

        {/* Column: About the company */}
        <div className="footer-column footer-col-company">
          <h4 className="footer-heading">{lang === 'CZ' ? 'O společnosti' : 'Company'}</h4>
          <ul className="footer-list">
            <li>
              <a 
                href="/about" 
                className="footer-link" 
                onClick={(e) => {
                  e.preventDefault();
                  setActivePage('about');
                }}
              >
                {t('Navbar.aboutUs')}
              </a>
            </li>
            <li>
              <a 
                href="/support" 
                className="footer-link" 
                onClick={(e) => {
                  e.preventDefault();
                  setActivePage('support');
                }}
              >
                {t('Navbar.contact')}
              </a>
            </li>
            <li>
              <a 
                href="/blog" 
                className="footer-link" 
                onClick={(e) => {
                  e.preventDefault();
                  setActivePage('blog');
                }}
              >
                Blog
              </a>
            </li>
            <li>
              <a 
                href="/faq" 
                className="footer-link" 
                onClick={(e) => {
                  e.preventDefault();
                  setActivePage('faq');
                }}
              >
                {t('Footer.faq')}
              </a>
            </li>
            <li>
              <a 
                href="/" 
                className="footer-link" 
                onClick={(e) => {
                  e.preventDefault();
                  setActivePage('home');
                  setTimeout(() => {
                    const element = document.getElementById('popular-categories');
                    if (element) {
                      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                  }, 100);
                }}
              >
                {lang === 'CZ' ? 'Nabízené produkty' : 'Our Products'}
              </a>
            </li>
          </ul>
        </div>

        {/* Column 2: Purchasing Info */}
        <div className="footer-column footer-col-purchase">
          <h4 className="footer-heading">{t('Footer.customerService')}</h4>
          <ul className="footer-list">
            <li>
              <a 
                href="#"
                className="footer-link" 
                onClick={(e) => {
                  e.preventDefault();
                  window.dispatchEvent(new Event('open-cookie-settings'));
                }}
              >
                {t('Footer.cookies')}
              </a>
            </li>
            <li>
              <a 
                href="/gdpr-vop?tab=doprava" 
                className="footer-link" 
                onClick={(e) => {
                  e.preventDefault();
                  setActivePage('gdpr-vop', 'doprava');
                }}
              >
                {lang === 'CZ' ? 'Doprava a osobní odběr' : 'Shipping & Pickup'}
              </a>
            </li>
            <li>
              <a 
                href="/gdpr-vop?tab=vop" 
                className="footer-link" 
                onClick={(e) => {
                  e.preventDefault();
                  setActivePage('gdpr-vop', 'vop');
                }}
              >
                {t('Footer.terms')}
              </a>
            </li>
            <li>
              <a 
                href="/gdpr-vop?tab=gdpr" 
                className="footer-link" 
                onClick={(e) => {
                  e.preventDefault();
                  setActivePage('gdpr-vop', 'gdpr');
                }}
              >
                {t('Footer.privacy')}
              </a>
            </li>
            <li>
              <a 
                href="/gdpr-vop?tab=odstoupeni" 
                className="footer-link" 
                onClick={(e) => {
                  e.preventDefault();
                  setActivePage('gdpr-vop', 'odstoupeni');
                }}
              >
                {lang === 'CZ' ? 'Odstoupení od smlouvy' : 'Order Withdrawal'}
              </a>
            </li>
            <li>
              <a 
                href="https://rmp.dpdgroup.com/015/northvale" 
                target="_blank" 
                rel="noopener noreferrer"
                className="footer-link"
              >
                {lang === 'CZ' ? 'Vrácení zboží (DPD)' : 'Return Goods (DPD)'}
              </a>
            </li>
          </ul>
        </div>

        {/* Column 3: Customer Services */}
        {hasMiddleColumn && (
          <div className="footer-column footer-col-services">
            <h4 className="footer-heading">{lang === 'CZ' ? 'Pro zákazníky' : 'Customer Service'}</h4>
            <ul className="footer-list">
              {FEATURE_FLAGS.showBuylist && (
                <li>
                  <a 
                    href="/buylist" 
                    className="footer-link" 
                    onClick={(e) => {
                      e.preventDefault();
                      setActivePage('buylist');
                    }}
                  >
                    {lang === 'CZ' ? 'Výkup karet (Buylist)' : 'Card Buylist'}
                  </a>
                </li>
              )}
              {FEATURE_FLAGS.showGrading && (
                <li>
                  <a 
                    href="/grading" 
                    className="footer-link" 
                    onClick={(e) => {
                      e.preventDefault();
                      setActivePage('grading');
                    }}
                  >
                    {lang === 'CZ' ? 'Grading servis' : 'Grading Service'}
                  </a>
                </li>
              )}
              {FEATURE_FLAGS.showGrading && (
                <li>
                  <a 
                    href="/grading-guide" 
                    className="footer-link" 
                    onClick={(e) => {
                      e.preventDefault();
                      setActivePage('grading-guide');
                    }}
                  >
                    {t('Navbar.gradingGuide')}
                  </a>
                </li>
              )}
            </ul>
          </div>
        )}

        {/* Column 4: Contacts */}
        <div className="footer-column footer-col-contacts">
          <h4 className="footer-heading">{lang === 'CZ' ? 'Kontakty' : 'Contacts'}</h4>
          
          <div className="footer-contact-row">
            <span className="contact-key">{lang === 'CZ' ? 'IČO' : 'Company ID'}</span>
            <span className="contact-value">29618142</span>
          </div>

          <div className="footer-contact-row">
            <span className="contact-key">{lang === 'CZ' ? 'DIČ' : 'VAT ID'}</span>
            <span className="contact-value">CZ29618142</span>
          </div>
          
          <div className="footer-contact-row">
            <span className="contact-key">E-mail</span>
            <span className="contact-value">info@northvaletcg.eu</span>
          </div>

          <div className="footer-contact-row">
            <span className="contact-key">{lang === 'CZ' ? 'Telefon' : 'Phone'}</span>
            <span className="contact-value">+420 739 666 779</span>
          </div>
          
          <div className="footer-contact-row">
            <span className="contact-key">{lang === 'CZ' ? 'Odběr' : 'Pickup'}</span>
            <span className="contact-value">Pardubice / Holice</span>
          </div>
        </div>
      </div>

      <div className="footer-payment-mobile footer-payment-info" style={{
        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
        paddingTop: '20px',
        paddingBottom: '20px',
        marginTop: '30px',
        textAlign: 'center'
      }}>
        <div className="container" style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <img src="/comgate-logos.png" alt={lang === 'CZ' ? 'Platební metody' : 'Payment Methods'} width="272" height="35" style={{ maxHeight: '35px', opacity: 0.8 }} />
        </div>
      </div>

      <div className="footer-bottom">
        <div className="container footer-bottom-content">
          <span>&copy; {new Date().getFullYear()} NORTHVALE s.r.o.</span>
          <img src="/comgate-logos.png" alt={lang === 'CZ' ? 'Platební metody' : 'Payment Methods'} className="footer-payment-desktop" width="218" height="28" style={{ maxHeight: '28px', opacity: 0.8 }} />
          <span>{lang === 'CZ' ? 'Vytvořil' : 'Created by'} <a href="https://ozeman.cz" target="_blank" rel="noopener noreferrer" className="credits-link">ozeman.cz</a></span>
        </div>
      </div>
    </footer>
  );
}
