import { useState, useEffect } from 'react';
import { FEATURE_FLAGS } from '../config';
import { useTranslation } from '../context/LanguageContext';
import { fetchFaqData } from '../services/faq';

export default function FaqPage({ setActivePage }) {
  const { lang, t } = useTranslation();
  const [openAccordion, setOpenAccordion] = useState(null);
  const [faqData, setFaqData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
    const loadFaq = async () => {
      setLoading(true);
      const data = await fetchFaqData();
      setFaqData(data);
      setLoading(false);
    };
    loadFaq();
  }, []);

  // Filter and map the database items to match display structure
  const faqDataFiltered = faqData
    .map(cat => ({
      category: lang === 'CZ' ? cat.name_cz : cat.name_en,
      questions: (cat.questions || []).map(q => ({
        q: lang === 'CZ' ? q.question_cz : q.question_en,
        a: lang === 'CZ' ? q.answer_cz : q.answer_en
      }))
    }))
    .filter(cat => {
      if (cat.category.toLowerCase().includes('výkup') || cat.category.toLowerCase().includes('buylist')) {
        return FEATURE_FLAGS.showBuylist;
      }
      return true;
    });

  const toggleAccordion = (index) => {
    setOpenAccordion(openAccordion === index ? null : index);
  };

  return (
    <div className="container fade-in">
      <h1 className="sr-only">{lang === 'CZ' ? 'Nejčastější dotazy (FAQ) - NORTHVALE' : 'Frequently Asked Questions (FAQ) - NORTHVALE'}</h1>

      {/* Breadcrumbs */}
      <nav className="breadcrumbs-nav" aria-label={lang === 'CZ' ? 'Drobečková navigace' : 'Breadcrumbs'} style={{ marginBottom: '24px', paddingTop: '20px' }}>
        <span className="breadcrumb-item" onClick={() => setActivePage('home')}>{t('common.home')}</span>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-item active">{lang === 'CZ' ? 'Nejčastější dotazy (FAQ)' : 'FAQ'}</span>
      </nav>

      <section className="kt-section" style={{ paddingTop: '40px' }}>
        <div className="ktf-faq" style={{ marginTop: 0, paddingTop: 0, borderTop: 'none' }}>
          <div className="ktf-faq-head">
            <div className="nv-eyebrow">{lang === 'CZ' ? 'Časté otázky' : 'Common Questions'}</div>
            <h2 className="ktf-faq-title">{lang === 'CZ' ? 'Nejčastější dotazy' : 'Frequently Asked Questions'}</h2>
          </div>
          <div className="ktf-faq-body">
            {loading ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center', padding: '40px 0' }}>
                {lang === 'CZ' ? 'Načítání témat...' : 'Loading topics...'}
              </p>
            ) : faqDataFiltered.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center', padding: '40px 0' }}>
                {lang === 'CZ' ? 'Žádné dotazy nebyly nalezeny.' : 'No questions found.'}
              </p>
            ) : (
              faqDataFiltered.map((cat, catIdx) => (
                <div key={catIdx} className="ktf-faq-group">
                  <div className="ktf-faq-group-label">{cat.category}</div>
                  <div className="ktf-faq-list">
                    {cat.questions.map((item, qIdx) => {
                      const globalIdx = `${catIdx}-${qIdx}`;
                      const isOpen = openAccordion === globalIdx;

                      return (
                        <div key={qIdx} className="ktf-qa">
                          <button 
                            type="button" 
                            className="ktf-q" 
                            onClick={() => toggleAccordion(globalIdx)}
                            aria-expanded={isOpen}
                          >
                            <span>{item.q}</span>
                            <span className="ktf-q-icon">{isOpen ? '−' : '+'}</span>
                          </button>
                          {isOpen && (
                            <div className="ktf-a">
                              <p style={{ margin: 0 }}>{item.a}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
