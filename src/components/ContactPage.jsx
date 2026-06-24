import { useState, useEffect } from 'react';
import { FEATURE_FLAGS } from '../config';
import { useTranslation } from '../context/LanguageContext';
import { supabase } from '../supabase';
import { fetchFaqData } from '../services/faq';

export default function ContactPage({ setActivePage }) {
  const { lang, t } = useTranslation();
  const [openAccordion, setOpenAccordion] = useState(null);
  const [contactSubmitted, setContactSubmitted] = useState(false);

  // Form states
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // FAQ state
  const [faqData, setFaqData] = useState([]);
  const [loadingFaq, setLoadingFaq] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
    const loadFaq = async () => {
      setLoadingFaq(true);
      try {
        const data = await fetchFaqData();
        setFaqData(data);
      } catch (err) {
        console.error('Failed to load FAQ in ContactPage:', err);
      } finally {
        setLoadingFaq(false);
      }
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
      const catName = cat.category || '';
      if (catName.toLowerCase().includes('výkup') || catName.toLowerCase().includes('buylist')) {
        return FEATURE_FLAGS.showBuylist;
      }
      return true;
    });

  const toggleAccordion = (index) => {
    setOpenAccordion(openAccordion === index ? null : index);
  };

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      if (!supabase.from) {
        throw new Error('Supabase client is not initialized');
      }

      // 1. Save to database for archiving
      const { error: dbError } = await supabase
        .from('contact_messages')
        .insert([{
          name: formName,
          email: formEmail,
          phone: formPhone || null,
          message: formMessage
        }]);

      if (dbError) throw dbError;

      // 2. Trigger Edge Function to send email notification via Brevo
      try {
        const { error: fnError } = await supabase.functions.invoke('send-contact-email', {
          body: {
            name: formName,
            email: formEmail,
            phone: formPhone || null,
            message: formMessage
          }
        });
        if (fnError) console.warn('Edge Function email dispatch failed:', fnError);
      } catch (errFn) {
        console.warn('Edge Function email invoke failed:', errFn);
      }

      setContactSubmitted(true);
      setFormName('');
      setFormEmail('');
      setFormPhone('');
      setFormMessage('');
    } catch (err) {
      console.error('Error submitting contact form:', err);
      setSubmitError(lang === 'CZ'
        ? 'Nepodařilo se odeslat zprávu. Zkontrolujte prosím připojení nebo zda je vytvořena příslušná tabulka.'
        : 'Failed to send message. Please check your connection or database setup.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container fade-in">
      <h1 className="sr-only">{lang === 'CZ' ? 'Kontakt a nejčastější dotazy - NORTHVALE' : 'Contact and Frequently Asked Questions - NORTHVALE'}</h1>

      {/* Breadcrumbs */}
      <nav className="breadcrumbs-nav" aria-label={lang === 'CZ' ? 'Drobečková navigace' : 'Breadcrumbs'} style={{ marginBottom: '24px', paddingTop: '20px' }}>
        <span className="breadcrumb-item" onClick={() => setActivePage('home')}>{t('common.home')}</span>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-item active">{t('Navbar.contact')}</span>
      </nav>

      <section className="kt-section">
        {/* Main Grid */}
        <div className="ktf-grid">
          {/* Left info column */}
          <div className="ktf-left">
            <div className="nv-eyebrow">{lang === 'CZ' ? 'Spojte se s námi' : 'Get in touch'}</div>
            <h2 className="ktf-title">{t('Navbar.contact')}</h2>
            <p className="ktf-sub">
              {lang === 'CZ'
                ? 'Dotaz k objednávce, produktům nebo doručení? Odpovídáme zpravidla do 48 hodin.'
                : 'Have questions about orders, products or delivery? We usually reply within 48 hours.'}
            </p>

            <dl className="ktf-info">
              <div className="ktf-info-row">
                <dt>{t('ContactPage.email')}</dt>
                <dd>
                  <a href="mailto:info@northvaletcg.eu">info@northvaletcg.eu</a>
                </dd>
              </div>

              <div className="ktf-info-row">
                <dt>{t('ContactPage.phone')}</dt>
                <dd>
                  <a href="tel:+420739666779">+420 739 666 779</a>
                </dd>
              </div>

              <div className="ktf-info-row">
                <dt>{lang === 'CZ' ? 'Provozovatel' : 'Operator'}</dt>
                <dd>
                  NORTHVALE s.r.o.
                  <span className="ktf-info-sub">{lang === 'CZ' ? 'IČO' : 'ID'} 29618142 · {lang === 'CZ' ? 'DIČ' : 'VAT'} CZ29618142</span>
                </dd>
              </div>

              <div className="ktf-info-row">
                <dt>{lang === 'CZ' ? 'Sídlo' : 'Registered Office'}</dt>
                <dd>
                  Bratří Čapků 1095
                  <span className="ktf-info-sub">534 01 Holice</span>
                </dd>
              </div>
            </dl>
          </div>

          {/* Right form/success column */}
          <div className="ktf-right">
            {contactSubmitted ? (
              <div className="ktf-success">
                <span style={{ fontSize: '48px', color: 'var(--color-gold)', display: 'block', marginBottom: '16px' }}>✉️</span>
                <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-main)', margin: '0 0 8px 0' }}>
                  {t('ContactPage.formSuccess')}
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '13.5px', lineHeight: '1.6', marginBottom: '24px', maxWidth: '380px' }}>
                  {lang === 'CZ'
                    ? 'Děkujeme za Váš dotaz. Naše podpora Vám odpoví na zadaný e-mail co nejdříve (obvykle do 48 hodin).'
                    : 'Thank you for your message. Our support team will reply to your email as soon as possible (usually within 24 hours).'}
                </p>
                <button className="btn btn-secondary" onClick={() => setContactSubmitted(false)}>
                  {lang === 'CZ' ? 'Odeslat novou zprávu' : 'Send another message'}
                </button>
              </div>
            ) : (
              <form className="ktf-form" onSubmit={handleContactSubmit}>
                <label className="ktf-field">
                  <span>{t('ContactPage.formName')}</span>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder={lang === 'CZ' ? 'Jan Novák' : 'John Doe'}
                  />
                </label>

                <label className="ktf-field">
                  <span>{t('ContactPage.formEmail')}</span>
                  <input
                    type="email"
                    required
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="name@example.com"
                  />
                </label>

                <label className="ktf-field">
                  <span>
                    {lang === 'CZ' ? 'Telefonní číslo' : 'Phone Number'} <em>· {lang === 'CZ' ? 'nepovinné' : 'optional'}</em>
                  </span>
                  <input
                    type="tel"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder={lang === 'CZ' ? 'Např. +420 123 456 789' : 'e.g., +44 20 7946 0958'}
                  />
                </label>

                <label className="ktf-field">
                  <span>{t('ContactPage.formMessage')}</span>
                  <textarea
                    required
                    rows="4"
                    value={formMessage}
                    onChange={(e) => setFormMessage(e.target.value)}
                    placeholder={lang === 'CZ' ? 'Sem napište váš dotaz…' : 'Write your question here...'}
                  />
                </label>

                {submitError && (
                  <div style={{ color: '#ff4d4f', fontSize: '13px', marginTop: '-4px', marginBottom: '8px', textAlign: 'left' }}>
                    ⚠️ {submitError}
                  </div>
                )}

                <button type="submit" className="ktf-submit" disabled={isSubmitting}>
                  {isSubmitting
                    ? (lang === 'CZ' ? 'Odesílání...' : 'Sending...')
                    : t('ContactPage.formBtn')
                  } <span className="nv-link-arrow">→</span>
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Interactive Map Section */}
        <div className="ktf-map-section">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div className="nv-eyebrow">
              {lang === 'CZ' ? 'Kde nás najdete' : 'Where to find us'}
            </div>
            <h3 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-main)', margin: 0, fontFamily: 'var(--font-heading)' }}>
              {lang === 'CZ' ? 'Sídlo a výdejní místo' : 'Office & Pickup Point'}
            </h3>
          </div>
          <div className="ktf-map-container">
            <iframe 
              src="https://maps.google.com/maps?q=Brat%C5%99%C3%AD%20%C4%8Capk%C5%AF%201095,%20534%2001%20Holice&t=&z=15&ie=UTF8&iwloc=&output=embed"
              width="100%" 
              height="100%" 
              className="ktf-map-iframe"
              allowFullScreen="" 
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title={lang === 'CZ' ? 'Mapa sídla NORTHVALE' : 'NORTHVALE Location Map'}
            ></iframe>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="ktf-faq">
          <div className="ktf-faq-head">
            <div className="nv-eyebrow">{lang === 'CZ' ? 'Časté otázky' : 'Common Questions'}</div>
            <h3 className="ktf-faq-title">{lang === 'CZ' ? 'Nejčastější dotazy' : 'Frequently Asked Questions'}</h3>
          </div>

          <div className="ktf-faq-body">
            {loadingFaq ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '13.5px', padding: '16px 0', fontStyle: 'italic', textAlign: 'left' }}>
                {lang === 'CZ' ? 'Načítání nejčastějších dotazů...' : 'Loading frequently asked questions...'}
              </p>
            ) : faqDataFiltered.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '13.5px', padding: '16px 0', fontStyle: 'italic', textAlign: 'left' }}>
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
