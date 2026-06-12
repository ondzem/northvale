
import { FEATURE_FLAGS } from '../config';

export default function Footer({ setActivePage }) {
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
            Váš spolehlivý partner ve světě sběratelských karetních her. Sealed produkty, kusové karty{FEATURE_FLAGS.showGrading ? ' i profesionální zprostředkování gradingu v USA' : ''}.
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
          <h4 className="footer-heading">O společnosti</h4>
          <ul className="footer-list">
            <li className="footer-link" onClick={() => setActivePage('about')}>O nás</li>
            <li className="footer-link" onClick={() => setActivePage('support')}>Kontakt</li>
            <li className="footer-link" onClick={() => {
              setActivePage('home');
              setTimeout(() => {
                const element = document.getElementById('popular-categories');
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              }, 100);
            }}>
              Nabízené produkty
            </li>
          </ul>
        </div>

        {/* Column 2: Purchasing Info */}
        <div className="footer-column footer-col-purchase">
          <h4 className="footer-heading">Vše o nákupu</h4>
          <ul className="footer-list">
            <li className="footer-link" onClick={() => {
              setActivePage('support');
              setTimeout(() => {
                const element = document.getElementById('faq-section');
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              }, 100);
            }}>FAQ</li>
            <li className="footer-link" onClick={() => setActivePage('gdpr-vop', 'doprava')}>Doprava a osobní odběr</li>
            <li className="footer-link" onClick={() => setActivePage('gdpr-vop', 'vop')}>Obchodní podmínky (VOP)</li>
            <li className="footer-link" onClick={() => setActivePage('gdpr-vop', 'gdpr')}>Ochrana osobních údajů (GDPR)</li>
            <li className="footer-link" onClick={() => setActivePage('gdpr-vop', 'odstoupeni')}>Odstoupení od smlouvy</li>
          </ul>
        </div>

        {/* Column 3: Customer Services */}
        {hasMiddleColumn && (
          <div className="footer-column footer-col-services">
            <h4 className="footer-heading">Pro zákazníky</h4>
            <ul className="footer-list">
              {FEATURE_FLAGS.showBuylist && (
                <li className="footer-link" onClick={() => setActivePage('buylist')}>Výkup karet (Buylist)</li>
              )}
              {FEATURE_FLAGS.showGrading && (
                <li className="footer-link" onClick={() => setActivePage('grading')}>Grading servis</li>
              )}
              {FEATURE_FLAGS.showGrading && (
                <li className="footer-link" onClick={() => setActivePage('grading-guide')}>Průvodce stavy karet</li>
              )}
            </ul>
          </div>
        )}

        {/* Column 4: Contacts */}
        <div className="footer-column footer-col-contacts">
          <h4 className="footer-heading">Kontakty</h4>
          
          <div className="footer-contact-row">
            <span className="contact-key">IČO</span>
            <span className="contact-value">29618142</span>
          </div>
          
          <div className="footer-contact-row">
            <span className="contact-key">E-mail</span>
            <span className="contact-value">info@northvaletcg.eu</span>
          </div>

          <div className="footer-contact-row">
            <span className="contact-key">Telefon</span>
            <span className="contact-value">+420 739 666 779</span>
          </div>
          
          <div className="footer-contact-row">
            <span className="contact-key">Odběr</span>
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
          <img src="/comgate-logos.png" alt="Platební metody ComGate" style={{ maxHeight: '35px', opacity: 0.8 }} />
        </div>
      </div>

      <div className="footer-bottom">
        <div className="container footer-bottom-content">
          <span>&copy; {new Date().getFullYear()} NORTHVALE s.r.o.</span>
          <img src="/comgate-logos.png" alt="Platební metody ComGate" className="footer-payment-desktop" style={{ maxHeight: '28px', opacity: 0.8 }} />
          <span>Vytvořil <a href="https://ozeman.cz" target="_blank" rel="noopener noreferrer" className="credits-link">ozeman.cz</a></span>
        </div>
      </div>
    </footer>
  );
}
