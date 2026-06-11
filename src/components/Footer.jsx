
export default function Footer({ setActivePage }) {
  return (
    <footer className="main-footer">
      <div className="container footer-grid">
        {/* Column 1: About */}
        <div className="footer-column">
          <img 
            src="/logo s popisem.webp" 
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
            <li className="footer-link" onClick={() => setActivePage('gdpr-vop', 'odstoupeni')}>Odstoupení od smlouvy</li>
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
        <div className="footer-column" style={{ minWidth: '220px' }}>
          <h4 className="footer-heading">Kontakty</h4>
          
          <div className="footer-contact-row">
            <span className="contact-key">Provozovatel</span>
            <span className="contact-value" style={{ fontWeight: '700' }}>NORTHVALE s.r.o.</span>
          </div>

          <div className="footer-contact-row">
            <span className="contact-key">Sídlo</span>
            <span className="contact-value">Bratří Čapků 1095, 534 01 Holice</span>
          </div>

          <div className="footer-contact-row">
            <span className="contact-key">Zápis v OR</span>
            <span className="contact-value">KS Hradec Králové, oddíl C, vložka 56872</span>
          </div>

          <div className="footer-contact-row">
            <span className="contact-key">IČO / DIČ</span>
            <span className="contact-value">29618142 / CZ29618142</span>
          </div>
          
          <div className="footer-contact-row">
            <span className="contact-key">E-mail</span>
            <span className="contact-value"><a href="mailto:info@northvaletcg.eu" style={{ color: 'inherit', textDecoration: 'none' }}>info@northvaletcg.eu</a></span>
          </div>

          <div className="footer-contact-row">
            <span className="contact-key">Telefon</span>
            <span className="contact-value"><a href="tel:+420739666779" style={{ color: 'inherit', textDecoration: 'none' }}>+420 739 666 779</a></span>
          </div>
        </div>
      </div>

      <div className="footer-payment-info" style={{
        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
        paddingTop: '20px',
        paddingBottom: '20px',
        marginTop: '30px'
      }}>
        <div className="container" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Zabezpečené platby kartou přes platební bránu. Šifrovaný přenos dat SSL / TLS.
          </span>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {/* Visa */}
            <svg viewBox="0 0 24 15" width="38" height="24" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', padding: '4px', borderRadius: '4px', color: '#fff' }} fill="currentColor">
              <path d="M10 2.2h2.2l-1.4 8.6H8.6L10 2.2zm7.6 0c-.5-.2-1.2-.4-1.9-.4-2 0-3.4 1-3.4 2.5 0 1.1 1 1.7 1.8 2.1.8.4 1.1.6 1.1 1 0 .5-.7.8-1.3.8-.9 0-1.4-.1-2.2-.5l-.3-.1-.3 1.9c.5.2 1.5.4 2.4.4 2.1 0 3.5-1 3.5-2.6 0-1-.6-1.8-2-2.5-.8-.4-1.3-.7-1.3-1.1 0-.4.4-.8 1.3-.8.7 0 1.3.2 1.7.4l.2.1.3-1.9zm4.2 0H20c-.6 0-1.1.3-1.3.9l-3.7 7.7h2.3l.5-1.3h2.8l.3 1.3h2L21.8 2.2zm-2 5.5l.8-2.3.5 2.3h-1.3zM4.7 2.2l-2.2 6L2 3.8C1.8 2.8 1 2.4.2 2.2v.1h3.7l.8 5.9L1.9 2.2H0l2.7 8.6h2.3l3.7-8.6H4.7z"/>
            </svg>
            {/* Mastercard */}
            <svg viewBox="0 0 24 15" width="38" height="24" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', padding: '4px', borderRadius: '4px', color: '#fff' }} fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="9" cy="7.5" r="5"/>
              <circle cx="15" cy="7.5" r="5"/>
              <path d="M12 4.5a3.5 3.5 0 0 1 0 6 3.5 3.5 0 0 1 0-6" fill="currentColor"/>
            </svg>
            {/* Apple Pay */}
            <svg viewBox="0 0 24 15" width="38" height="24" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', padding: '4px', borderRadius: '4px', color: '#fff' }} fill="currentColor">
              <path d="M17.2 4.6c.1 0 .2.1.2.2v4.8c0 .1-.1.2-.2.2h-3.4c-.1 0-.2-.1-.2-.2V4.8c0-.1.1-.2.2-.2h3.4m0-.8h-3.4c-.6 0-1.1.5-1.1 1.1v4.8c0 .6.5 1.1 1.1 1.1h3.4c.6 0 1.1-.5 1.1-1.1V4.9c0-.6-.5-1.1-1.1-1.1z"/>
              <path d="M9.8 4.2c.4-.5.7-1.1.6-1.7-.5 0-1.1.3-1.4.8-.3.4-.6 1-.5 1.6.6.1 1-.2 1.3-.7zM10.7 6c-.3-.2-.7-.4-1.2-.4-.8 0-1.5.5-1.8.5-.3 0-.9-.4-1.4-.4-.7 0-1.4.4-1.7.9-1 1.6-.3 3.9.6 5.1.4.6.9 1.2 1.6 1.2.6 0 .9-.4 1.6-.4.7 0 1 .4 1.6.4.7 0 1.1-.6 1.6-1.2.5-.7.7-1.4.7-1.5-.1 0-1.3-.5-1.3-1.9 0-1.2 1-1.8 1-1.8-.6-.9-1.5-1-1.8-1z"/>
            </svg>
            {/* Google Pay */}
            <svg viewBox="0 0 24 15" width="38" height="24" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', padding: '4px', borderRadius: '4px', color: '#fff' }}>
              <text x="2" y="11" fontFamily="sans-serif" fontWeight="900" fontSize="10" fill="currentColor">G</text>
              <text x="11" y="11" fontFamily="sans-serif" fontWeight="900" fontSize="10" fill="var(--color-gold)">Pay</text>
            </svg>
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
