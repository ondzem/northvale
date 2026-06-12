import { useState, useEffect } from 'react';
import { FEATURE_FLAGS } from '../config';
import { useTranslation } from '../context/LanguageContext';

export default function ContactPage({ setActivePage }) {
  const { lang, t } = useTranslation();
  const [openAccordion, setOpenAccordion] = useState(null);
  const [contactSubmitted, setContactSubmitted] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const rawFaqData = lang === 'CZ' ? [
    {
      category: 'Doprava a doručení',
      questions: [
        {
          q: 'Jaké jsou způsoby dopravy a kolik stojí?',
          a: 'Nabízíme Zásilkovnu (79 Kč na výdejní místo), GLS (99 Kč doručení na adresu) a DPD (109 Kč doručení na adresu). Osobní odběr je zdarma na adrese Bratří Čapků 1095, Holice (případně dle domluvy v Pardubicích). Při nákupu nad 2 000 Kč máte dopravu zcela zdarma.'
        },
        {
          q: 'Jak balíte kusové karty (Singles)?',
          a: 'Držíme se striktního sběratelského standardu: Karta jde do penny sleeve hlavou dolů, připevní se vytahovací páska (pull-tab), vloží se do toploaderu, ten jde do uzavíratelného team bagu, a ten se zafixuje v kartonovém sendviči (nepoužíváme izolepu na toploaderu). Nakonec vše vložíme do bublinkové obálky.'
        },
        {
          q: 'Kdy obdržím svou objednávku?',
          a: 'Zásilky odesíláme do 24 hodin od zaplacení (v pracovní dny). Doručení obvykle trvá 24-48 hodin od expedice.'
        }
      ]
    },
    {
      category: 'Výkup karet (Buylist)',
      questions: [
        {
          q: 'Jak funguje výkup karet?',
          a: 'Karty naklikáte do výkupního košíku v našem portálu, zvolíte stav a jazyk a odešlete. Následně karty zabalíte a zašlete na naši adresu nebo odevzdáte osobně. Jakmile karty zkontrolujeme (do 48h od přijetí), vyplatíme Vám peníze přímo na Váš bankovní účet.'
        }
      ]
    },
    {
      category: 'Platby a reklamace',
      questions: [
        {
          q: 'Jaké platební metody podporujete?',
          a: 'Můžete platit platební kartou online přes zabezpečenou platební bránu ComGate, nebo klasickým bankovním převodem.'
        },
        {
          q: 'Jak mohu zboží reklamovat?',
          a: 'Pokud se zásilka poškodila během přepravy nebo neodpovídá deklarovaný stav karty, kontaktujte nás e-mailem. Reklamace vyřizujeme obratem v souladu se zákonem.'
        }
      ]
    }
  ] : [
    {
      category: 'Shipping & Delivery',
      questions: [
        {
          q: 'What shipping methods do you offer and how much do they cost?',
          a: 'We offer Packeta (79 CZK to pick-up points), GLS (99 CZK home delivery), and DPD (109 CZK home delivery). Local pickup is free at Bratří Čapků 1095, Holice (or by agreement in Pardubice). We offer free shipping on all orders over 2,000 CZK.'
        },
        {
          q: 'How do you package single cards (Singles)?',
          a: 'We adhere strictly to collector-grade standards: each card is placed upside down in a penny sleeve, a pull-tab is attached, it is inserted into a toploader, placed inside a sealable team bag, and secured between cardboard layers (we never apply adhesive tape directly to the toploader). Finally, it is shipped in a bubble mailer.'
        },
        {
          q: 'When will I receive my order?',
          a: 'We dispatch orders within 24 hours of payment (on business days). Delivery typically takes 24–48 hours after dispatch.'
        }
      ]
    },
    {
      category: 'Card Buylist',
      questions: [
        {
          q: 'How does the card buyback process work?',
          a: 'Simply add your singles to the buylist cart in our portal, specify their condition and language, and submit. Then, pack the cards securely and send them to our address or drop them off in person. Once verified (usually within 48 hours), your payment will be sent directly to your bank account.'
        }
      ]
    },
    {
      category: 'Payments & Claims',
      questions: [
        {
          q: 'What payment methods do you accept?',
          a: 'You can pay online by card via the secure ComGate payment gateway, or via standard bank transfer.'
        },
        {
          q: 'How do I file a claim or return items?',
          a: 'If your package is damaged during shipping or the card condition does not match its description, please contact us by email. We resolve all complaints promptly in compliance with consumer protection laws.'
        }
      ]
    }
  ];

  const faqData = rawFaqData.filter(cat => {
    if (cat.category.toLowerCase().includes('výkup') || cat.category.toLowerCase().includes('buylist')) {
      return FEATURE_FLAGS.showBuylist;
    }
    return true;
  });

  const toggleAccordion = (index) => {
    setOpenAccordion(openAccordion === index ? null : index);
  };

  const handleContactSubmit = (e) => {
    e.preventDefault();
    setContactSubmitted(true);
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
                ? 'Dotaz k objednávce, produktům nebo doručení? Odpovídáme zpravidla do 24 hodin.' 
                : 'Have questions about orders, products or delivery? We usually reply within 24 hours.'}
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
                    ? 'Děkujeme za Váš dotaz. Naše podpora Vám odpoví na zadaný e-mail co nejdříve (obvykle do 24 hodin).' 
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
                  <input type="text" required placeholder={lang === 'CZ' ? 'Jan Novák' : 'John Doe'} />
                </label>

                <label className="ktf-field">
                  <span>{t('ContactPage.formEmail')}</span>
                  <input type="email" required placeholder="name@example.com" />
                </label>

                <label className="ktf-field">
                  <span>
                    {lang === 'CZ' ? 'Telefonní číslo' : 'Phone Number'} <em>· {lang === 'CZ' ? 'nepovinné' : 'optional'}</em>
                  </span>
                  <input type="tel" placeholder={lang === 'CZ' ? 'Např. +420 123 456 789' : 'e.g., +44 20 7946 0958'} />
                </label>

                <label className="ktf-field">
                  <span>{t('ContactPage.formMessage')}</span>
                  <textarea required rows="4" placeholder={lang === 'CZ' ? 'Sem napište váš dotaz…' : 'Write your question here...'} />
                </label>

                <button type="submit" className="ktf-submit">
                  {t('ContactPage.formBtn')} <span className="nv-link-arrow">→</span>
                </button>
              </form>
            )}
          </div>
        </div>

        {/* FAQ Section */}
        <div className="ktf-faq">
          <div className="ktf-faq-head">
            <div className="nv-eyebrow">{lang === 'CZ' ? 'Časté otázky' : 'Common Questions'}</div>
            <h3 className="ktf-faq-title">{lang === 'CZ' ? 'Nejčastější dotazy' : 'Frequently Asked Questions'}</h3>
          </div>

          <div className="ktf-faq-body">
            {faqData.map((cat, catIdx) => (
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
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
