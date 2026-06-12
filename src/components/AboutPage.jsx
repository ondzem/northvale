import { useEffect } from 'react';
import { FEATURE_FLAGS } from '../config';

export default function AboutPage({ setActivePage }) {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Determine text based on FEATURE_FLAGS.showSlabs
  const showSlabs = FEATURE_FLAGS.showSlabs;
  const paragraph3Text = showSlabs
    ? "To bychom chtěli změnit. Chceme vám nabízet velké množství produktů, ohodnocených karet a příslušenství — se zaměřením na kvalitu a dostupnost zboží."
    : "To bychom chtěli změnit. Chceme vám nabízet velké množství produktů a příslušenství — se zaměřením na kvalitu a dostupnost zboží.";

  return (
    <div className="container fade-in">
      {/* Breadcrumbs */}
      <nav className="breadcrumbs-nav" aria-label="Drobečková navigace" style={{ marginBottom: '24px', paddingTop: '20px' }}>
        <span className="breadcrumb-item" onClick={() => setActivePage('home')}>Domů</span>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-item active">O nás</span>
      </nav>

      <section className="ab-section">
        {/* Main Grid */}
        <div className="abf-grid">
          <aside className="abf-aside">
            <div className="nv-eyebrow">Příběh Northvale</div>
            <h1 className="abf-title">
              Od sběratelů,<br />pro sběratele.
            </h1>
          </aside>
          
          <div className="abf-story">
            <p className="abf-lead">
              Po dlouhých letech sbírání Pokémonů a různých dalších karetních her jsme se rozhodli posunout tento koníček o level výš.
            </p>
            <p>
              Nevíme o jediném sběrateli, nadšenci nebo hráči, který by nebyl alespoň trochu zklamaný z toho, že si chce koupit nějaký TCG produkt a ten je nedostupný. Pokud ho sežene, tak je jeho cena vyšší než přípustná.
            </p>
            <p>
              {paragraph3Text}
            </p>
          </div>
        </div>

        {/* Image Banner */}
        <div className="abf-image-banner-container">
          <img 
            src="/o nas northvale.webp" 
            alt="Tým Northvale" 
            className="abf-image-banner" 
          />
        </div>

        {/* Values list */}
        <div className="abf-values">
          <div className="abf-value">
            <span className="abf-value-num">01</span>
            <h3 className="abf-value-title">100% garance pravosti</h3>
            <p className="abf-value-text">
              Všechny produkty nakupujeme výhradně z oficiální distribuce. Padělky u nás nemají šanci.
            </p>
          </div>

          <div className="abf-value">
            <span className="abf-value-num">02</span>
            <h3 className="abf-value-title">Sběratelské balení</h3>
            <p className="abf-value-text">
              Sami víme, jak bolí poškozené rohy booster boxů. Zásilky balíme do pevných krabic a tlustých vrstev bublinkové fólie.
            </p>
          </div>

          <div className="abf-value">
            <span className="abf-value-num">03</span>
            <h3 className="abf-value-title">Osobní přístup</h3>
            <p className="abf-value-text">
              Nejsme jen bezejmenný e-shop. Jsme součástí komunity. Rádi poradíme s výběrem.
            </p>
          </div>
        </div>

        {/* Quote Section */}
        <figure className="abf-quote">
          <blockquote>
            „ Chceme, aby nákup karet nebyl jen transakce, ale radost. Od chvíle, kdy kliknete na objednat, až po chvíli, kdy s nadšením rozbalujete balíček. “
          </blockquote>
          <figcaption>— Tým Northvale</figcaption>
        </figure>

        {/* CTA Section */}
        <div className="abf-cta-row">
          <span 
            className="nv-link"
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
            Prohlédnout produkty <span className="nv-link-arrow">→</span>
          </span>
        </div>
      </section>
    </div>
  );
}
