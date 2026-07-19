import { useEffect } from 'react';
import { useTranslation } from '../context/LanguageContext';
import calendarData from '../data/tcgCalendar2026.json';

export default function TcgCalendarPage({ setActivePage }) {
  const { lang } = useTranslation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // JSON-LD ItemList construction
  const jsonLdData = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": lang === 'CZ' ? "Kalendář vydání TCG setů 2026" : "TCG Release Calendar 2026",
    "description": lang === 'CZ' 
      ? "Přehled nadcházejících setů pro Pokémon, Lorcana, One Piece a Riftbound."
      : "Upcoming set releases for Pokémon, Lorcana, One Piece, and Riftbound.",
    "itemListElement": calendarData.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "item": {
        "@type": "Event",
        "name": item.name,
        "startDate": item.releaseDate.split('. ').reverse().join('-'), // format to YYYY-MM-DD
        "description": `${item.game} TCG set release. Stav předobjednávek: ${item.preorderStatus}.`,
        "location": {
          "@type": "Place",
          "name": "Northvale TCG",
          "address": "Bratří Čapků 1095, 534 01 Holice"
        }
      }
    }))
  };

  const getStatusBadgeClass = (status) => {
    if (!status) return 'status-badge-pending';
    const s = status.toLowerCase();
    if (s === 'spuštěno' || s === 'open' || s === 'active') return 'status-badge-active';
    if (s === 'připravuje se' || s === 'coming soon' || s === 'upcoming') return 'status-badge-pending';
    if (s === 'dokončeno' || s === 'completed' || s === 'closed') return 'status-badge-completed';
    return 'status-badge-pending';
  };

  const getGameBadgeClass = (game) => {
    if (!game) return 'game-badge-other';
    const g = game.toLowerCase();
    if (g.includes('pokémon') || g.includes('pokemon')) return 'game-badge-pokemon';
    if (g.includes('lorcana')) return 'game-badge-lorcana';
    if (g.includes('one piece') || g.includes('one-piece')) return 'game-badge-onepiece';
    if (g.includes('riftbound')) return 'game-badge-riftbound';
    return 'game-badge-other';
  };

  return (
    <div className="container fade-in">
      {/* JSON-LD Script tag inside the component body for SEO & static prerendering */}
      <script 
        type="application/ld+json" 
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdData) }} 
      />

      {/* Breadcrumbs */}
      <nav className="breadcrumbs-nav" aria-label={lang === 'CZ' ? 'Drobečková navigace' : 'Breadcrumbs'} style={{ marginBottom: '24px', paddingTop: '20px' }}>
        <span className="breadcrumb-item" onClick={() => setActivePage('home')}>
          {lang === 'CZ' ? 'Domů' : 'Home'}
        </span>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-item active">
          {lang === 'CZ' ? 'Kalendář vydání 2026' : 'Release Calendar 2026'}
        </span>
      </nav>

      <section className="calendar-section">
        <header className="calendar-header">
          <div className="nv-eyebrow">TCG RELEASES • 2026</div>
          <h1 className="calendar-title">
            {lang === 'CZ' 
              ? 'Kalendář vydání TCG setů 2026' 
              : 'TCG Set Release Calendar 2026'}
          </h1>
          <p className="calendar-subtitle">
            {lang === 'CZ'
              ? 'Sledujte plánované novinky a start předobjednávek pro karetní hry Pokémon, Disney Lorcana, One Piece a Riftbound.'
              : 'Track upcoming expansions and preorder starts for Pokémon, Disney Lorcana, One Piece, and Riftbound card games.'}
          </p>
        </header>

        <div className="glass-panel calendar-table-container">
          <table className="calendar-table">
            <thead>
              <tr>
                <th>{lang === 'CZ' ? 'Název setu / produktu' : 'Expansion / Product Name'}</th>
                <th>{lang === 'CZ' ? 'Hra' : 'Game'}</th>
                <th>{lang === 'CZ' ? 'Datum vydání' : 'Release Date'}</th>
                <th>{lang === 'CZ' ? 'Stav předobjednávek' : 'Preorder Status'}</th>
              </tr>
            </thead>
            <tbody>
              {calendarData.map((item) => (
                <tr key={item.id}>
                  <td className="calendar-item-name">
                    <strong>{item.name}</strong>
                  </td>
                  <td>
                    <span className={`game-badge ${getGameBadgeClass(item.game)}`}>
                      {item.game}
                    </span>
                  </td>
                  <td className="calendar-item-date">
                    {item.releaseDate}
                  </td>
                  <td>
                    <span className={`status-badge ${getStatusBadgeClass(item.preorderStatus)}`}>
                      {item.preorderStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="calendar-info-banner glass-panel">
          <span className="info-banner-icon">ℹ️</span>
          <p>
            {lang === 'CZ'
              ? 'Data vydání se mohou změnit ze strany výrobců. Předobjednávky obvykle spouštíme několik týdnů až měsíců před oficiálním datem vydání setu. Pro zaslání upozornění se přihlaste k našemu newsletteru níže v patičce.'
              : 'Release dates are subject to change by manufacturers. Preorders typically launch several weeks or months before the official release. Subscribe to our newsletter below to receive immediate notifications.'}
          </p>
        </div>
      </section>
    </div>
  );
}
