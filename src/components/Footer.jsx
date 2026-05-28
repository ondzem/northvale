import React from 'react';

export default function Footer({ setActivePage }) {
  return (
    <footer style={styles.footer}>
      <div className="container" style={styles.footerGrid}>
        {/* Column 1: About */}
        <div style={styles.column}>
          <div style={styles.logoRow} onClick={() => setActivePage('home')}>
            <img src="/Northvale Logo.webp" alt="NORTHVALE TCG" style={styles.logoImg} />
          </div>
          <p style={styles.aboutText}>
            Váš spolehlivý partner ve světě sběratelských karetních her. Nabízíme sealed produkty, kusové karty i profesionální zprostředkování gradingu v USA. Zakládáme si na sběratelském standardu balení a férových cenách.
          </p>
        </div>

        {/* Column 2: Purchasing Info */}
        <div style={styles.column}>
          <h4 style={styles.heading}>Vše o nákupu</h4>
          <ul style={styles.list}>
            <li style={styles.listItem} onClick={() => setActivePage('support')}>Centrum podpory</li>
            <li style={styles.listItem} onClick={() => setActivePage('support')}>FAQ</li>
            <li style={styles.listItem} onClick={() => setActivePage('community')}>Doprava a osobní odběr</li>
            <li style={styles.listItem} onClick={() => setActivePage('support')}>Obchodní podmínky</li>
          </ul>
        </div>

        {/* Column 3: Customer Services */}
        <div style={styles.column}>
          <h4 style={styles.heading}>Pro zákazníky</h4>
          <ul style={styles.list}>
            <li style={styles.listItem} onClick={() => setActivePage('buylist')}>Výkup karet (Buylist)</li>
            <li style={styles.listItem} onClick={() => setActivePage('grading')}>Grading servis</li>
            <li style={styles.listItem} onClick={() => setActivePage('grading-guide')}>Průvodce stavy karet</li>
            <li style={styles.listItem} onClick={() => setActivePage('profile')}>Zůstatek Store Kreditu</li>
          </ul>
        </div>

        {/* Column 4: Contacts & Socials */}
        <div style={styles.column}>
          <h4 style={styles.heading}>Kontakty</h4>
          <p style={styles.contactDetail}>
            <strong>E-mail:</strong> info@northvaletcg.eu<br />
            <strong>Odběrné místo:</strong> Coffee & Cards, Pardubice
          </p>
          <div style={styles.socialsRow}>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" style={styles.socialLink}>
              <img src="/instagram.png" alt="Instagram" style={styles.socialIcon} />
            </a>
            <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer" style={styles.socialLink}>
              <img src="/tik-tok.png" alt="TikTok" style={styles.socialIcon} />
            </a>
            <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" style={styles.socialLink}>
              <img src="/youtube.png" alt="YouTube" style={styles.socialIcon} />
            </a>
          </div>
        </div>
      </div>

      <div style={styles.bottomBar}>
        <div className="container" style={styles.bottomBarContent}>
          <span style={styles.copyText}>&copy; 2026 NORTHVALE TCG. Všechna práva vyhrazena. Používáme výhradně krátké spojovníky.</span>
          <span style={styles.designerText}>Navrženo pro sběratele a turnajové hráče.</span>
        </div>
      </div>
    </footer>
  );
}

const styles = {
  footer: {
    backgroundColor: 'var(--bg-secondary)',
    borderTop: '1px solid var(--border)',
    paddingTop: '60px',
    marginTop: 'auto',
  },
  footerGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '40px',
    paddingBottom: '40px',
  },
  column: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  logoRow: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '20px',
    cursor: 'pointer',
  },
  logoImg: {
    height: '36px',
    width: 'auto',
    objectFit: 'contain',
  },
  aboutText: {
    color: 'var(--text-muted)',
    fontSize: '13px',
    lineHeight: '1.6',
    textAlign: 'left',
  },
  heading: {
    fontFamily: 'var(--font-heading)',
    fontWeight: '700',
    fontSize: '16px',
    marginBottom: '20px',
    color: 'var(--text-main)',
  },
  list: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    alignItems: 'flex-start',
  },
  listItem: {
    fontSize: '13px',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    transition: 'color 0.2s',
    '&:hover': {
      color: 'var(--color-gold)',
    }
  },
  contactDetail: {
    color: 'var(--text-muted)',
    fontSize: '13px',
    lineHeight: '1.6',
    textAlign: 'left',
    marginBottom: '20px',
  },
  socialsRow: {
    display: 'flex',
    gap: '12px',
  },
  socialLink: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    transition: 'all 0.2s',
    '&:hover': {
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
      borderColor: 'var(--color-gold)',
    }
  },
  socialIcon: {
    width: '18px',
    height: '18px',
    filter: 'invert(0.9)',
  },
  bottomBar: {
    borderTop: '1px solid rgba(255, 255, 255, 0.04)',
    padding: '20px 0',
    backgroundColor: 'var(--bg-page)',
  },
  bottomBarContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '12px',
    fontSize: '12px',
    color: 'var(--text-muted)',
  },
  copyText: {
    textAlign: 'left',
  },
  designerText: {
    textAlign: 'right',
  }
};
