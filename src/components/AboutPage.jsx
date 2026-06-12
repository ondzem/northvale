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
        <p style={styles.subtitle}>
          Od sběratelské vášně až k budování spolehlivého partnerství pro TCG komunitu v České republice.
        </p>
      </div>

      <div style={styles.grid}>
        {/* Left column: Story */}
        <div style={styles.storyCol} className="glass-panel">
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
              <span style={styles.valueIcon}>🏆</span>
              <div>
                <strong style={styles.valueTitle}>100% Garance pravosti</strong>
                <span style={styles.valueText}>Všechny produkty nakupujeme výhradně z oficiální distribuce. Padělky u nás nemají šanci.</span>
              </div>
            </div>
            <div style={styles.valueItem}>
              <span style={styles.valueIcon}>📦</span>
              <div>
                <strong style={styles.valueTitle}>Sběratelské balení</strong>
                <span style={styles.valueText}>Sami víme, jak bolí poškozené rohy booster boxů nebo poškrábané karty. Zásilky balíme do pevných krabic a tlustých vrstev bublinkové fólie.</span>
              </div>
            </div>
            <div style={styles.valueItem}>
              <span style={styles.valueIcon}>💬</span>
              <div>
                <strong style={styles.valueTitle}>Osobní přístup</strong>
                <span style={styles.valueText}>Nejsme jen bezejmenný e-shop. Jsme součástí komunity. Rádi poradíme s výběrem nebo se potkáme na turnaji.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right column: Info card */}
        <div style={styles.infoCol} className="glass-panel">
          <h2 style={styles.sectionHeading}>Fakta o Northvale</h2>
          
          <div style={styles.factCard} className="glass-card">
            <div style={styles.factRow}>
              <span style={styles.factLabel}>Provozovatel</span>
              <span style={styles.factValue}>NORTHVALE s.r.o.</span>
            </div>
            <div style={styles.factRow}>
              <span style={styles.factLabel}>Sídlo společnosti</span>
              <span style={styles.factValue}>Bratří Čapků 1095, Holice 534 01</span>
            </div>
            <div style={styles.factRow}>
              <span style={styles.factLabel}>Identifikační číslo (IČO)</span>
              <span style={styles.factValue}>29618142</span>
            </div>
            <div style={styles.factRow}>
              <span style={styles.factLabel}>E-mail</span>
              <span style={styles.factValue}>info@northvaletcg.eu</span>
            </div>
            <div style={styles.factRow}>
              <span style={styles.factLabel}>Telefon</span>
              <span style={styles.factValue}>+420 739 666 779</span>
            </div>
          </div>

          <div style={styles.quoteCard}>
            <p style={styles.quoteText}>
              „Chceme, aby nákup karet nebyl jen transakce, ale radost. Od chvíle, kdy kliknete na objednat, až po chvíli, kdy s nadšením rozbalujete balíček.“
            </p>
            <span style={styles.quoteAuthor}>— Tým Northvale</span>
          </div>

          <button 
            className="btn btn-primary" 
            style={styles.actionBtn}
            onClick={() => setActivePage('sealed-catalog')}
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
    marginBottom: '48px',
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
  grid: {
    display: 'grid',
    gridTemplateColumns: '1.8fr 1.2fr',
    gap: '32px',
    alignItems: 'start',
  },
  storyCol: {
    padding: '32px',
    borderRadius: 'var(--radius-lg)',
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
    marginTop: '32px',
    marginBottom: '20px',
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
    gap: '24px',
    marginTop: '20px',
  },
  valueItem: {
    display: 'flex',
    gap: '16px',
    alignItems: 'flex-start',
  },
  valueIcon: {
    fontSize: '24px',
    lineHeight: 1,
    padding: '8px',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 'var(--radius-md)',
  },
  valueTitle: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '700',
    color: 'var(--text-main)',
    marginBottom: '4px',
  },
  valueText: {
    fontSize: '13px',
    lineHeight: '1.5',
    color: 'var(--text-muted)',
  },
  infoCol: {
    padding: '32px',
    borderRadius: 'var(--radius-lg)',
  },
  factCard: {
    padding: '20px',
    borderRadius: 'var(--radius-md)',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  factRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
    paddingBottom: '12px',
  },
  factLabel: {
    fontSize: '10px',
    fontWeight: '700',
    textTransform: 'uppercase',
    color: 'var(--text-muted)',
    letterSpacing: '0.5px',
  },
  factValue: {
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--text-main)',
  },
  quoteCard: {
    marginTop: '24px',
    padding: '20px',
    borderLeft: '2px solid var(--color-gold)',
    backgroundColor: 'rgba(253, 189, 22, 0.02)',
    borderRadius: '0 var(--radius-md) var(--radius-md) 0',
  },
  quoteText: {
    fontSize: '13px',
    lineHeight: '1.6',
    fontStyle: 'italic',
    color: 'var(--text-muted)',
    margin: '0 0 8px 0',
  },
  quoteAuthor: {
    fontSize: '12px',
    fontWeight: '600',
    color: 'var(--text-main)',
  },
  actionBtn: {
    marginTop: '28px',
    width: '100%',
  },
};

// CSS media overrides for responsive design are handled via App.css if needed,
// but we also align our elements structurally.
