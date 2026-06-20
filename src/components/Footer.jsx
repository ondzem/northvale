
import { FEATURE_FLAGS } from '../config';
import { useTranslation } from '../context/LanguageContext';

export default function Footer({ setActivePage }) {
  const { lang, t } = useTranslation();
  const hasMiddleColumn = FEATURE_FLAGS.showBuylist || FEATURE_FLAGS.showGrading;
  const gridClassName = `container footer-grid ${hasMiddleColumn ? 'has-five-cols' : 'has-four-cols'}`;

  return (
    <footer className="main-footer">
      <div className={gridClassName}>
        {/* Column 1: About */}
        <div className="footer-column footer-col-about">
          <img 
            src="/logo s popisem.webp" 
            alt="NORTHVALE TCG" 
            className="footer-logo" 
            onClick={() => setActivePage('home')} 
          />
          <p className="footer-desc">
            {lang === 'CZ' 
              ? 'TCG e-shop od sběratelů pro sběratele. Nakupte originální karetní produkty se 100% garancí pravosti a špičkovým sběratelským balením.'
              : 'TCG shop run by collectors for collectors. Purchase authentic card products with 100% guaranteed authenticity and premium collector packaging.'
            }
          </p>
          <div className="footer-socials">
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="footer-social-link">
              <img src="/instagram.png" alt="Instagram" className="footer-social-icon" />
            </a>
            <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer" className="footer-social-link">
              <img src="/tik-tok.png" alt="TikTok" className="footer-social-icon" />
            </a>
            <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="footer-social-link">
              <img src="/youtube.png" alt="YouTube" className="footer-social-icon" />
            </a>
          </div>
        </div>

        {/* Column: About the company */}
        <div className="footer-column footer-col-company">
          <h4 className="footer-heading">{lang === 'CZ' ? 'O společnosti' : 'Company'}</h4>
          <ul className="footer-list">
            <li className="footer-link" onClick={() => setActivePage('about')}>{t('Navbar.aboutUs')}</li>
            <li className="footer-link" onClick={() => setActivePage('support')}>{t('Navbar.contact')}</li>
            <li className="footer-link" onClick={() => setActivePage('faq')}>{t('Footer.faq')}</li>
            <li className="footer-link" onClick={() => {
              setActivePage('home');
              setTimeout(() => {
                const element = document.getElementById('popular-categories');
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
              }, 100);
            }}>
              {lang === 'CZ' ? 'Nabízené produkty' : 'Our Products'}
            </li>
          </ul>
        </div>

        {/* Column 2: Purchasing Info */}
        <div className="footer-column footer-col-purchase">
          <h4 className="footer-heading">{t('Footer.customerService')}</h4>
          <ul className="footer-list">
            <li className="footer-link" onClick={() => window.dispatchEvent(new Event('open-cookie-settings'))}>{t('Footer.cookies')}</li>
            <li className="footer-link" onClick={() => setActivePage('gdpr-vop', 'doprava')}>{lang === 'CZ' ? 'Doprava a osobní odběr' : 'Shipping & Pickup'}</li>
            <li className="footer-link" onClick={() => setActivePage('gdpr-vop', 'vop')}>{t('Footer.terms')}</li>
            <li className="footer-link" onClick={() => setActivePage('gdpr-vop', 'gdpr')}>{t('Footer.privacy')}</li>
            <li className="footer-link" onClick={() => setActivePage('gdpr-vop', 'odstoupeni')}>{lang === 'CZ' ? 'Odstoupení od smlouvy' : 'Order Withdrawal'}</li>
          </ul>
        </div>

        {/* Column 3: Customer Services */}
        {hasMiddleColumn && (
          <div className="footer-column footer-col-services">
            <h4 className="footer-heading">{lang === 'CZ' ? 'Pro zákazníky' : 'Customer Service'}</h4>
            <ul className="footer-list">
              {FEATURE_FLAGS.showBuylist && (
                <li className="footer-link" onClick={() => setActivePage('buylist')}>{lang === 'CZ' ? 'Výkup karet (Buylist)' : 'Card Buylist'}</li>
              )}
              {FEATURE_FLAGS.showGrading && (
                <li className="footer-link" onClick={() => setActivePage('grading')}>{lang === 'CZ' ? 'Grading servis' : 'Grading Service'}</li>
              )}
              {FEATURE_FLAGS.showGrading && (
                <li className="footer-link" onClick={() => setActivePage('grading-guide')}>{t('Navbar.gradingGuide')}</li>
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
          <img src="/comgate-logos.png" alt={lang === 'CZ' ? 'Platební metody' : 'Payment Methods'} style={{ maxHeight: '35px', opacity: 0.8 }} />
        </div>
      </div>

      <div className="footer-bottom">
        <div className="container footer-bottom-content">
          <span>&copy; {new Date().getFullYear()} NORTHVALE s.r.o.</span>
          <img src="/comgate-logos.png" alt={lang === 'CZ' ? 'Platební metody' : 'Payment Methods'} className="footer-payment-desktop" style={{ maxHeight: '28px', opacity: 0.8 }} />
          <span>{lang === 'CZ' ? 'Vytvořil' : 'Created by'} <a href="https://ozeman.cz" target="_blank" rel="noopener noreferrer" className="credits-link">ozeman.cz</a></span>
        </div>
      </div>
    </footer>
  );
}
