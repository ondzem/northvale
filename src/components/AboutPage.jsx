import { useEffect } from 'react';

export default function AboutPage({ setActivePage }) {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div style={styles.container} className="container fade-in">
      {/* Breadcrumbs */}
      <nav className="breadcrumbs-nav" aria-label="Drobečková navigace" style={styles.breadcrumbs}>
        <span className="breadcrumb-item" onClick={() => setActivePage('home')}>Domů</span>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-item active">O nás</span>
      </nav>

      <div style={styles.headerArea}>
        <span className="testimonials-eyebrow" style={styles.eyebrow}>Příběh Northvale</span>
        <h1 style={styles.title}>Chcete vědět náš příběh?</h1>
      </div>

      {/* Centered Main Story Container */}
      <div style={styles.mainCard}>
        <h2 style={styles.sectionHeading}>Náš příběh</h2>
        <p style={{ ...styles.paragraph, fontSize: '17px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '24px' }}>
          Vítej na eshopu Northvale.
        </p>
        <p style={styles.paragraph}>
          Po dlouhých letech sbírání Pokémonů a různých dalších karetních her jsem se rozhodl posunout tento koníček o level výš.
        </p>
        <p style={styles.paragraph}>
          V poslední době nevím o jediném sběrateli, nadšenci nebo hráči, který by nebyl alespoň trochu zklamaný z toho, že si chce koupit nějaký TCG produkt a ten je nedostupný. Pokud ho sežene, tak je jeho cena vyšší než přípustná.
        </p>
        <p style={styles.paragraph}>
          To bychom chtěli změnit a chtěli bychom Vám nabízet velké množství produktů, ohodnocených karet a příslušenství.
        </p>
        <p style={styles.paragraph}>
          Zaměřujeme se hlavně na kvalitu výrobků a dostupnost zboží.
        </p>
        <p style={styles.paragraph}>
          Máme v plánu se zaměřit i na zprostředkování gradingu karet nejen u společnosti PSA, ale i dalších jako je Beckett, TAG, CGC a jiné.
        </p>

        <h3 style={styles.subHeading}>Naše hodnoty</h3>
        <div style={styles.valuesList}>
          <div style={styles.valueItem}>
            <strong style={styles.valueTitle}>100% Garance pravosti</strong>
            <span style={styles.valueText}>Všechny produkty nakupujeme výhradně z oficiální distribuce. Padělky u nás nemají šanci.</span>
          </div>

          <div style={styles.valueItem}>
            <strong style={styles.valueTitle}>Sběratelské balení</strong>
            <span style={styles.valueText}>Sami víme, jak bolí poškozené rohy booster boxů nebo poškrábané karty. Zásilky balíme do pevných krabic a tlustých vrstev bublinkové fólie.</span>
          </div>

          <div style={styles.valueItem}>
            <strong style={styles.valueTitle}>Osobní přístup</strong>
            <span style={styles.valueText}>Nejsme jen bezejmenný e-shop. Jsme součástí komunity. Rádi poradíme s výběrem.</span>
          </div>
        </div>

        {/* Motto / Quote */}
        <div style={styles.quoteCard}>
          <p style={styles.quoteText}>
            „Chceme, aby nákup karet nebyl jen transakce, ale radost. Od chvíle, kdy kliknete na objednat, až po chvíli, kdy s nadšením rozbalujete balíček.“
          </p>
          <span style={styles.quoteAuthor}>— Tým Northvale</span>
        </div>

        {/* Action Button */}
        <div style={styles.actionArea}>
          <button
            className="btn btn-primary"
            style={styles.actionBtn}
            onClick={() => {
              setActivePage('home');
              setTimeout(() => {
                const element = document.getElementById('popular-categories');
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              }, 100);
            }}
          >
            Prohlédnout produkty &rarr;
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    paddingTop: '20px',
    paddingBottom: '80px',
  },
  breadcrumbs: {
    marginBottom: '24px',
  },
  headerArea: {
    textAlign: 'center',
    marginBottom: '40px',
    maxWidth: '800px',
    marginLeft: 'auto',
    marginRight: 'auto',
  },
  eyebrow: {
    display: 'inline-block',
    fontSize: '11px',
    fontWeight: '700',
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    color: 'var(--color-gold)',
    marginBottom: '12px',
  },
  title: {
    fontSize: '44px',
    fontWeight: '800',
    color: 'var(--text-main)',
    margin: '0 0 16px 0',
    fontFamily: 'var(--font-heading)',
    letterSpacing: '-1px',
  },
  subtitle: {
    fontSize: '16px',
    lineHeight: '1.6',
    color: 'var(--text-muted)',
    margin: 0,
  },
  mainCard: {
    maxWidth: '100%',
    marginLeft: 'auto',
    marginRight: 'auto',
    padding: '40px',
    boxSizing: 'border-box',
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    textAlign: 'left',
  },
  sectionHeading: {
    fontSize: '22px',
    fontWeight: '800',
    color: 'var(--text-main)',
    fontFamily: 'var(--font-heading)',
    marginTop: 0,
    marginBottom: '20px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    paddingBottom: '12px',
  },
  subHeading: {
    fontSize: '18px',
    fontWeight: '700',
    color: 'var(--text-main)',
    fontFamily: 'var(--font-heading)',
    marginTop: '36px',
    marginBottom: '24px',
  },
  paragraph: {
    fontSize: '15px',
    lineHeight: '1.7',
    color: 'var(--text-muted)',
    marginBottom: '20px',
  },
  valuesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    marginTop: '20px',
    marginBottom: '36px',
  },
  valueItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    borderLeft: '2px solid var(--color-gold)',
    paddingLeft: '16px',
  },
  valueTitle: {
    fontSize: '15px',
    fontWeight: '700',
    color: 'var(--text-main)',
  },
  valueText: {
    fontSize: '13.5px',
    lineHeight: '1.5',
    color: 'var(--text-muted)',
  },
  quoteCard: {
    marginTop: '36px',
    padding: '24px',
    borderLeft: '2px solid var(--color-gold)',
    backgroundColor: 'rgba(253, 189, 22, 0.015)',
    borderRadius: '0 var(--radius-md) var(--radius-md) 0',
    borderTop: '1px solid rgba(255, 255, 255, 0.02)',
    borderRight: '1px solid rgba(255, 255, 255, 0.02)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.02)',
  },
  quoteText: {
    fontSize: '14px',
    lineHeight: '1.6',
    fontStyle: 'italic',
    color: 'var(--text-muted)',
    margin: '0 0 12px 0',
  },
  quoteAuthor: {
    fontSize: '12.5px',
    fontWeight: '600',
    color: 'var(--text-main)',
  },
  actionArea: {
    marginTop: '40px',
    display: 'flex',
    justifyContent: 'center',
  },
  actionBtn: {
    padding: '14px 36px',
    fontSize: '14px',
    fontWeight: '700',
  },
};
