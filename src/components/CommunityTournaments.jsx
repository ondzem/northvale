
import { FEATURE_FLAGS } from '../config';
import { useTranslation } from '../context/LanguageContext';

export default function CommunityTournaments() {
  const { lang, t } = useTranslation();

  const events = lang === 'CZ' ? [
    { day: 'Úterý', time: '17:00', game: 'Disney Lorcana', format: 'Constructed League', location: 'Wombat Games (Sladkovského 505)' },
    { day: 'Středa', time: '16:30', game: 'Pokémon TCG', format: 'Standard Junior League', location: 'Wombat Games (Sladkovského 505)' },
    { day: 'Čtvrtek', time: '17:30', game: 'One Piece Card Game', format: 'Constructed Tournament', location: 'Wombat Games (Sladkovského 505)' },
    { day: 'Pátek', time: '17:00', game: 'Disney Lorcana', format: 'Draft - Shimmering Skies', location: 'Wombat Games (Sladkovského 505)' },
    { day: 'Sobota', time: '10:00', game: 'Pokémon TCG', format: 'Standard Premier Challenge', location: 'Wombat Games (Sladkovského 505)' }
  ] : [
    { day: 'Tuesday', time: '17:00', game: 'Disney Lorcana', format: 'Constructed League', location: 'Wombat Games (Sladkovského 505)' },
    { day: 'Wednesday', time: '16:30', game: 'Pokémon TCG', format: 'Standard Junior League', location: 'Wombat Games (Sladkovského 505)' },
    { day: 'Thursday', time: '17:30', game: 'One Piece Card Game', format: 'Constructed Tournament', location: 'Wombat Games (Sladkovského 505)' },
    { day: 'Friday', time: '17:00', game: 'Disney Lorcana', format: 'Draft - Shimmering Skies', location: 'Wombat Games (Sladkovského 505)' },
    { day: 'Saturday', time: '10:00', game: 'Pokémon TCG', format: 'Standard Premier Challenge', location: 'Wombat Games (Sladkovského 505)' }
  ];

  return (
    <div style={styles.container} className="container fade-in">
      <h1 className="sr-only">
        {lang === 'CZ' ? 'Komunitní turnaje a osobní odběr Pardubice - NORTHVALE' : 'Community Tournaments & Pardubice Local Pickup - NORTHVALE'}
      </h1>

      {/* Pardubice Local Plan */}
      <section style={styles.localSection} className="glass-panel">
        <div style={styles.localInfo}>
          <span style={styles.badge}>
            {lang === 'CZ' ? 'LOKÁLNÍ DOMINANCE PARDUBICE' : 'LOCAL PARADUBICE PRESENCE'}
          </span>
          <h2 style={styles.heading}>
            {lang === 'CZ' ? 'Osobní odběr zdarma v Coffee & Cards' : 'Free Local Pickup at Coffee & Cards'}
          </h2>
          <p style={styles.text}>
            {lang === 'CZ' 
              ? 'Pro malé objednávky kusových karet je poštovné 79 Kč zbytečnou překážkou. Proto jsme pro Vás zřídili bezplatné odběrné místo v kavárně Coffee & Cards přímo v centru Pardubic.' 
              : 'For small orders of singles, paying 79 CZK for shipping can be an unnecessary barrier. That is why we have established a free pickup spot at Coffee & Cards café right in the center of Pardubice.'}
          </p>
          <ul style={styles.perksList}>
            <li>
              <strong>{lang === 'CZ' ? 'Doprava zdarma:' : 'Free shipping:'}</strong>{' '}
              {lang === 'CZ' ? 'Žádné poštovné pro jakoukoliv objednávku kusovek.' : 'Zero delivery fees on any order of raw single cards.'}
            </li>
            <li>
              <strong>{lang === 'CZ' ? 'Kávový bonus:' : 'Coffee bonus:'}</strong>{' '}
              {lang === 'CZ' ? 'Ke každému vyzvednutému balíčku dostanete 10% slevu na výběrovou kávu.' : 'Receive a 10% discount voucher on specialty coffee with every pickup.'}
            </li>
            {FEATURE_FLAGS.showBuylist && (
              <li>
                <strong>{lang === 'CZ' ? 'Fyzický výkup:' : 'In-person buybacks:'}</strong>{' '}
                {lang === 'CZ' 
                  ? 'Naklikejte výkup karet online a odevzdejte karty k fyzické kontrole přímo na kavárně bez placení poštovného.' 
                  : 'Submit your cards online via our buylist and drop them off directly at the café without any shipping fees.'}
              </li>
            )}
          </ul>
          <div style={styles.addressBox} className="glass-card">
            <strong>{lang === 'CZ' ? 'Adresa odběrného místa:' : 'Pickup Point Address:'}</strong><br />
            Coffee &amp; Cards, Sladkovského 512, Pardubice<br />
            {lang === 'CZ' ? 'Otevřeno každý den: 9:00 - 20:00' : 'Open daily: 9:00 AM - 8:00 PM'}
          </div>
        </div>

        {/* Visual SVG Map Placeholder */}
        <div style={styles.mapContainer} className="glass-card">
          <svg viewBox="0 0 300 200" style={styles.svgMap}>
            {/* Simple stylized street map grid */}
            <rect x="0" y="0" width="300" height="200" fill="var(--bg-surface)" />
            <line x1="20" y1="50" x2="280" y2="50" stroke="var(--border-light)" strokeWidth="8" />
            <line x1="20" y1="120" x2="280" y2="120" stroke="var(--border-light)" strokeWidth="8" />
            <line x1="100" y1="20" x2="100" y2="180" stroke="var(--border-light)" strokeWidth="8" />
            <line x1="220" y1="20" x2="220" y2="180" stroke="var(--border-light)" strokeWidth="8" />
            
            {/* River Elbe */}
            <path d="M 10 180 Q 80 150 150 170 T 290 190" fill="none" stroke="#2563eb" strokeWidth="12" opacity="0.3" />
            
            {/* Points of interest */}
            <text x="25" y="42" fill="var(--text-muted)" fontSize="8">Zámecká (Tolarie)</text>
            <circle cx="100" cy="50" r="6" fill="var(--text-muted)" />
            
            <text x="125" y="112" fill="var(--text-muted)" fontSize="8">Sladkovského (Wombat)</text>
            <circle cx="220" cy="120" r="6" fill="var(--text-muted)" />
            
            {/* Our Pickup Point */}
            <circle cx="180" cy="90" r="10" fill="var(--color-gold)" opacity="0.4" />
            <circle cx="180" cy="90" r="5" fill="var(--color-gold)" />
            <text x="140" y="78" fill="var(--color-gold)" fontSize="10" fontWeight="800">Coffee &amp; Cards</text>
            <text x="160" y="106" fill="var(--text-main)" fontSize="7" fontWeight="600">
              {lang === 'CZ' ? 'Odběrné místo' : 'Pickup Point'}
            </text>
          </svg>
        </div>
      </section>

      {/* UPCE student discount */}
      <section style={styles.studentSection} className="glass-panel">
        <div style={styles.studentText}>
          <h3 style={styles.studentHeading}>
            {lang === 'CZ' ? 'Sleva 5% pro studenty UPCE s ISIC kartou' : '5% Student Discount for UPCE Students with ISIC'}
          </h3>
          <p style={styles.studentDesc}>
            {lang === 'CZ' 
              ? 'Studujete na Univerzitě Pardubice a bydlíte na kolejích v Polabinách? Zadejte v pokladně číslo své platné ISIC karty a získejte okamžitou slevu na veškerý sortiment kusovek i doplňků.' 
              : 'Are you studying at the University of Pardubice and living in the Polabiny campus? Enter your valid ISIC number at checkout and get an instant discount on all singles and accessories.'}
          </p>
        </div>
        <div style={styles.isicPlaceholder} className="glass-card">
          <span style={{ fontSize: '32px' }}>🪪</span>
          <span style={{ fontSize: '12px', fontWeight: '700' }}>ISIC STUDENT</span>
        </div>
      </section>

      {/* Tournament Calendar */}
      <section style={styles.calendarSection}>
        <h2 style={styles.sectionHeading}>
          {lang === 'CZ' ? 'Kalendář podporovaných turnajů' : 'Calendar of Supported Tournaments'}
        </h2>
        <p style={styles.sectionSub}>
          {lang === 'CZ' 
            ? 'Místo vlastního konkurování lokálním hernám raději podporujeme místní komunitu. Dodáváme ceny (obaly Dragon Shield a boostery) na turnaje v Tolarii i Wombat Games.' 
            : 'Rather than competing with local game stores, we choose to support the local TCG community. We supply prize pools (Dragon Shield sleeves and booster packs) for events at Tolarie and Wombat Games.'}
        </p>

        <div style={styles.calendarTableWrapper} className="glass-panel">
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>{lang === 'CZ' ? 'Den' : 'Day'}</th>
                <th style={styles.th}>{lang === 'CZ' ? 'Čas' : 'Time'}</th>
                <th style={styles.th}>{lang === 'CZ' ? 'Hra' : 'Game'}</th>
                <th style={styles.th}>{lang === 'CZ' ? 'Formát' : 'Format'}</th>
                <th style={styles.th}>{lang === 'CZ' ? 'Kde se hraje' : 'Location'}</th>
              </tr>
            </thead>
            <tbody>
              {events.map((ev, idx) => (
                <tr key={idx} style={styles.tr}>
                  <td style={styles.tdDay}>{ev.day}</td>
                  <td style={styles.td}>{ev.time}</td>
                  <td style={styles.tdGame}>{ev.game}</td>
                  <td style={styles.tdFormat}>{ev.format}</td>
                  <td style={styles.tdLoc}>{ev.location}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

const styles = {
  container: {
    paddingTop: '20px',
    paddingBottom: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '40px',
    textAlign: 'left',
  },
  localSection: {
    display: 'flex',
    padding: '30px',
    gap: '30px',
    flexWrap: 'wrap',
  },
  localInfo: {
    flex: '1.5 1 400px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '12px',
  },
  badge: {
    fontSize: '9px',
    fontWeight: '800',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    color: 'var(--color-gold)',
    padding: '3px 8px',
    borderRadius: 'var(--radius-sm)',
    letterSpacing: '0.5px',
  },
  heading: {
    fontSize: '22px',
    fontWeight: '800',
    margin: 0,
    fontFamily: 'var(--font-heading)',
  },
  text: {
    fontSize: '14px',
    color: 'var(--text-muted)',
    lineHeight: '1.6',
    margin: 0,
  },
  perksList: {
    fontSize: '13px',
    color: 'var(--text-muted)',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    paddingLeft: '20px',
    margin: '8px 0',
  },
  addressBox: {
    padding: '12px 16px',
    backgroundColor: 'rgba(255,255,255,0.01)',
    fontSize: '13px',
    lineHeight: '1.5',
    alignSelf: 'stretch',
  },
  mapContainer: {
    flex: '1 1 250px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
    backgroundColor: 'rgba(9, 9, 11, 0.4)',
    minHeight: '200px',
  },
  svgMap: {
    width: '100%',
    height: '100%',
    borderRadius: 'var(--radius-md)',
  },
  studentSection: {
    display: 'flex',
    padding: '24px 30px',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '24px',
    flexWrap: 'wrap',
    backgroundColor: 'rgba(16, 185, 129, 0.03)',
    borderLeft: '4px solid var(--color-green)',
  },
  studentText: {
    flex: '2 1 400px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  studentHeading: {
    fontSize: '16px',
    fontWeight: '800',
    color: 'var(--color-green)',
    margin: 0,
    fontFamily: 'var(--font-heading)',
  },
  studentDesc: {
    fontSize: '13px',
    color: 'var(--text-muted)',
    margin: 0,
    lineHeight: '1.5',
  },
  isicPlaceholder: {
    width: '140px',
    height: '80px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 'var(--radius-md)',
  },
  calendarSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  sectionHeading: {
    fontSize: '20px',
    fontWeight: '700',
    margin: 0,
    fontFamily: 'var(--font-heading)',
  },
  sectionSub: {
    fontSize: '14px',
    color: 'var(--text-muted)',
    margin: 0,
  },
  calendarTableWrapper: {
    padding: '24px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '13px',
  },
  th: {
    textAlign: 'left',
    color: 'var(--text-main)',
    fontWeight: '700',
    paddingBottom: '10px',
    borderBottom: '2px solid rgba(255,255,255,0.06)',
  },
  tr: {
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    '&:last-child': {
      borderBottom: 'none',
    }
  },
  td: {
    padding: '12px 0',
  },
  tdDay: {
    padding: '12px 0',
    fontWeight: '700',
    color: 'var(--text-main)',
  },
  tdGame: {
    padding: '12px 0',
    fontWeight: '600',
    color: 'var(--color-gold)',
  },
  tdFormat: {
    padding: '12px 0',
    color: 'var(--text-main)',
  },
  tdLoc: {
    padding: '12px 0',
    color: 'var(--text-muted)',
  }
};
