import { useTranslation } from '../context/LanguageContext';

export default function ErrorPage({ setActivePage }) {
  const { lang } = useTranslation();

  return (
    <div style={styles.container}>
      <div className="fade-in-scale" style={styles.card}>
        <div style={styles.iconContainer}>
          {/* Animated custom broken shield/card icon */}
          <svg 
            viewBox="0 0 24 24" 
            width="80" 
            height="80" 
            stroke="var(--color-gold)" 
            strokeWidth="1.5" 
            fill="none" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            style={styles.svg}
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>

        <h1 style={styles.heading}>404</h1>
        
        <h2 style={styles.subheading}>
          {lang === 'CZ' ? 'Stránka nenalezena' : 'Page Not Found'}
        </h2>
        
        <p style={styles.text}>
          {lang === 'CZ' 
            ? 'Je nám líto, ale požadovaná stránka neexistuje, byla přesunuta nebo je dočasně nedostupná.' 
            : 'Sorry, the page you are looking for does not exist, has been moved, or is temporarily unavailable.'}
        </p>

        <button 
          onClick={() => setActivePage('home')}
          className="btn btn-primary"
          style={styles.button}
        >
          {lang === 'CZ' ? 'Zpět na úvodní stránku' : 'Back to Homepage'}
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    padding: '40px 20px',
    background: 'var(--bg-page)',
    boxSizing: 'border-box'
  },
  card: {
    background: 'var(--bg-secondary)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 'var(--radius-lg)',
    padding: '48px 32px',
    maxWidth: '480px',
    width: '100%',
    textAlign: 'center',
    boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
    boxSizing: 'border-box'
  },
  iconContainer: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '24px',
    animation: 'pulse 3s infinite ease-in-out'
  },
  svg: {
    filter: 'drop-shadow(0 0 10px rgba(253, 189, 22, 0.25))'
  },
  heading: {
    fontSize: '72px',
    fontWeight: '800',
    fontFamily: 'var(--font-heading)',
    color: '#fff',
    margin: '0 0 8px 0',
    lineHeight: '1',
    letterSpacing: '-2px'
  },
  subheading: {
    fontSize: '22px',
    fontWeight: '700',
    fontFamily: 'var(--font-heading)',
    color: 'var(--color-gold)',
    margin: '0 0 16px 0'
  },
  text: {
    fontSize: '14.5px',
    color: 'var(--text-muted)',
    margin: '0 0 32px 0',
    lineHeight: '1.6'
  },
  button: {
    fontSize: '14px',
    padding: '12px 28px',
    fontWeight: 'bold',
    cursor: 'pointer',
    width: '100%'
  }
};
