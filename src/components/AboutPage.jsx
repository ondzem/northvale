import { useEffect } from 'react';
import { FEATURE_FLAGS } from '../config';
import { useTranslation } from '../context/LanguageContext';

export default function AboutPage({ setActivePage }) {
  const { lang, t } = useTranslation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Determine text based on FEATURE_FLAGS.showSlabs
  const showSlabs = FEATURE_FLAGS.showSlabs;
  const paragraph3Text = showSlabs
    ? t('AboutPage.NVStoryP2Slabs') || t('AboutPage.storyP2Slabs')
    : t('AboutPage.NVStoryP2NoSlabs') || t('AboutPage.storyP2NoSlabs');

  return (
    <div className="container fade-in">
      {/* Breadcrumbs */}
      <nav className="breadcrumbs-nav" aria-label={lang === 'CZ' ? 'Drobečková navigace' : 'Breadcrumbs'} style={{ marginBottom: '24px', paddingTop: '20px' }}>
        <span className="breadcrumb-item" onClick={() => setActivePage('home')}>{t('common.home')}</span>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-item active">{t('Navbar.aboutUs')}</span>
      </nav>

      <section className="ab-section">
        {/* Main Grid */}
        <div className="abf-grid">
          <aside className="abf-aside">
            <div className="nv-eyebrow">{t('AboutPage.storyEyebrow')}</div>
            <h1 className="abf-title" style={{ whiteSpace: 'pre-line' }}>
              {t('AboutPage.storyTitle')}
            </h1>
          </aside>
          
          <div className="abf-story">
            <p className="abf-lead">
              {t('AboutPage.storyLead')}
            </p>
            <p>
              {t('AboutPage.storyP1')}
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
            alt={lang === 'CZ' ? 'Tým Northvale' : 'Northvale Team'} 
            className="abf-image-banner" 
          />
        </div>

        {/* Values list */}
        <div className="abf-values">
          <div className="abf-value">
            <span className="abf-value-num">01</span>
            <h3 className="abf-value-title">{t('AboutPage.value1Title')}</h3>
            <p className="abf-value-text">
              {t('AboutPage.value1Desc')}
            </p>
          </div>

          <div className="abf-value">
            <span className="abf-value-num">02</span>
            <h3 className="abf-value-title">{t('AboutPage.value2Title')}</h3>
            <p className="abf-value-text">
              {t('AboutPage.value2Desc')}
            </p>
          </div>

          <div className="abf-value">
            <span className="abf-value-num">03</span>
            <h3 className="abf-value-title">{t('AboutPage.value3Title')}</h3>
            <p className="abf-value-text">
              {t('AboutPage.value3Desc')}
            </p>
          </div>
        </div>

        {/* Quote Section */}
        <figure className="abf-quote">
          <blockquote>
            {t('AboutPage.quote')}
          </blockquote>
          <figcaption>— {t('AboutPage.quoteAuthor')}</figcaption>
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
            {t('AboutPage.cta')} <span className="nv-link-arrow">→</span>
          </span>
        </div>
      </section>
    </div>
  );
}
