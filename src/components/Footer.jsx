
export default function Footer({ setActivePage }) {
  return (
    <footer className="main-footer">
      <div className="container footer-grid">
        {/* Column 1: About */}
        <div className="footer-column">
          <img 
            src="/Northvale Logo.webp" 
            alt="NORTHVALE TCG" 
            className="footer-logo" 
            onClick={() => setActivePage('home')} 
          />
          <p className="footer-desc">
            Váš spolehlivý partner ve světě sběratelských karetních her. Sealed produkty, kusové karty i profesionální zprostředkování gradingu v USA.
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

        {/* Column 2: Purchasing Info */}
        <div className="footer-column">
          <h4 className="footer-heading">Vše o nákupu</h4>
          <ul className="footer-list">
            <li className="footer-link" onClick={() => setActivePage('support')}>Centrum podpory</li>
            <li className="footer-link" onClick={() => setActivePage('support')}>FAQ</li>
            <li className="footer-link" onClick={() => setActivePage('gdpr-vop', 'doprava')}>Doprava a osobní odběr</li>
            <li className="footer-link" onClick={() => setActivePage('gdpr-vop', 'vop')}>Obchodní podmínky (VOP)</li>
            <li className="footer-link" onClick={() => setActivePage('gdpr-vop', 'gdpr')}>Ochrana osobních údajů (GDPR)</li>
          </ul>
        </div>

        {/* Column 3: Customer Services */}
        <div className="footer-column">
          <h4 className="footer-heading">Pro zákazníky</h4>
          <ul className="footer-list">
            <li className="footer-link" onClick={() => setActivePage('buylist')}>Výkup karet (Buylist)</li>
            <li className="footer-link" onClick={() => setActivePage('grading')}>Grading servis</li>
            <li className="footer-link" onClick={() => setActivePage('grading-guide')}>Průvodce stavy karet</li>
          </ul>
        </div>

        {/* Column 4: Contacts */}
        <div className="footer-column">
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

      <div className="footer-bottom">
        <div className="container footer-bottom-content">
          <span>&copy; {new Date().getFullYear()} NORTHVALE s.r.o.</span>
          <span>Vytvořil <a href="https://ozeman.cz" target="_blank" rel="noopener noreferrer" className="credits-link">ozeman.cz</a></span>
        </div>
      </div>
    </footer>
  );
}
