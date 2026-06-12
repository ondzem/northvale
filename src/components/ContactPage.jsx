import { useState, useEffect } from 'react';
import { FEATURE_FLAGS } from '../config';

export default function ContactPage({ setActivePage }) {
  const [openAccordion, setOpenAccordion] = useState(null);
  const [contactSubmitted, setContactSubmitted] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const rawFaqData = [
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
  ];

  const faqData = rawFaqData.filter(cat => {
    if (cat.category.includes('Výkup') && !FEATURE_FLAGS.showBuylist) return false;
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
      <h1 className="sr-only">Kontakt a nejčastější dotazy - NORTHVALE</h1>

      {/* Breadcrumbs */}
      <nav className="breadcrumbs-nav" aria-label="Drobečková navigace" style={{ marginBottom: '24px', paddingTop: '20px' }}>
        <span className="breadcrumb-item" onClick={() => setActivePage('home')}>Domů</span>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-item active">Kontakt</span>
      </nav>

      <section className="kt-section">
        {/* Main Grid */}
        <div className="ktf-grid">
          {/* Left info column */}
          <div className="ktf-left">
            <div className="nv-eyebrow">Spojte se s námi</div>
            <h2 className="ktf-title">Kontakt</h2>
            <p className="ktf-sub">
              Dotaz k objednávce, produktům nebo doručení? Odpovídáme zpravidla do 24 hodin.
            </p>

            <dl className="ktf-info">
              <div className="ktf-info-row">
                <dt>E-mail</dt>
                <dd>
                  <a href="mailto:info@northvaletcg.eu">info@northvaletcg.eu</a>
                </dd>
              </div>

              <div className="ktf-info-row">
                <dt>Telefon</dt>
                <dd>
                  <a href="tel:+420739666779">+420 739 666 779</a>
                </dd>
              </div>

              <div className="ktf-info-row">
                <dt>Provozovatel</dt>
                <dd>
                  NORTHVALE s.r.o.
                  <span className="ktf-info-sub">IČO 29618142 · DIČ CZ29618142</span>
                </dd>
              </div>

              <div className="ktf-info-row">
                <dt>Sídlo</dt>
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
                  Zpráva byla úspěšně odeslána!
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '13.5px', lineHeight: '1.6', marginBottom: '24px', maxWidth: '380px' }}>
                  Děkujeme za Váš dotaz. Naše podpora Vám odpoví na zadaný e-mail co nejdříve (obvykle do 24 hodin).
                </p>
                <button className="btn btn-secondary" onClick={() => setContactSubmitted(false)}>
                  Odeslat novou zprávu
                </button>
              </div>
            ) : (
              <form className="ktf-form" onSubmit={handleContactSubmit}>
                <label className="ktf-field">
                  <span>Jméno a příjmení</span>
                  <input type="text" required placeholder="Jan Novák" />
                </label>

                <label className="ktf-field">
                  <span>E-mailová adresa</span>
                  <input type="email" required placeholder="novak@example.cz" />
                </label>

                <label className="ktf-field">
                  <span>
                    Telefonní číslo <em>· nepovinné</em>
                  </span>
                  <input type="tel" placeholder="Např. +420 123 456 789" />
                </label>

                <label className="ktf-field">
                  <span>Vaše zpráva</span>
                  <textarea required rows="4" placeholder="Sem napište váš dotaz…" />
                </label>

                <button type="submit" className="ktf-submit">
                  Odeslat zprávu <span className="nv-link-arrow">→</span>
                </button>
              </form>
            )}
          </div>
        </div>

        {/* FAQ Section */}
        <div className="ktf-faq">
          <div className="ktf-faq-head">
            <div className="nv-eyebrow">Časté otázky</div>
            <h3 className="ktf-faq-title">Nejčastější dotazy</h3>
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
