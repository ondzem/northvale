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
        <h1 style={styles.title}>O nás</h1>
      </div>

      {/* Centered Main Story Container */}
      <div style={styles.mainCard}>
        <h2 style={styles.sectionHeading}>Náš příběh</h2>
        <p style={styles.paragraph}>
          Myšlenka založit **Northvale** se zrodila po letech aktivního sbírání a hraní sběratelských karetních her, zejména Pokémonů, Disney Lorcana a One Piece. Jako sběratelé a hráči jsme se neustále potýkali s obtížnou dostupností nových edic a neúměrně vysokými cenami na našem trhu. Rozhodli jsme se proto proměnit náš koníček v poslání.
        </p>
        <p style={styles.paragraph}>
          Naším cílem bylo vytvořit místo, kde sběratelé i investoři najdou vše potřebné pod jednou střechou, s garancí 100% pravosti a za férové ceny. Zakládáme si na tom, aby každá karta, kterou u nás zakoupíte, byla skladována a doručena s tou nejvyšší péčí.
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
