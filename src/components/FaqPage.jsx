import { useState, useEffect } from 'react';
import { FEATURE_FLAGS } from '../config';

export default function FaqPage({ setActivePage }) {
  const [openAccordion, setOpenAccordion] = useState(null);

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
          a: 'Karty naklikáte do výkupního košíku v našem portálu, zvolíte stav a jazyk a odešlete. Následně karty zabalíte a zašlete na naši adresu nebo odevzdáte osobně. Jakmile karty zkontrolujeme (do 48h od přijetí), vyplatíme Vám penísen přímo na Váš bankovní účet.'
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

  return (
    <div className="container fade-in">
      <h1 className="sr-only">Nejčastější dotazy (FAQ) - NORTHVALE</h1>

      {/* Breadcrumbs */}
      <nav className="breadcrumbs-nav" aria-label="Drobečková navigace" style={{ marginBottom: '24px', paddingTop: '20px' }}>
        <span className="breadcrumb-item" onClick={() => setActivePage('home')}>Domů</span>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-item active">Nejčastější dotazy (FAQ)</span>
      </nav>

      <section className="kt-section" style={{ paddingTop: '40px' }}>
        <div className="ktf-faq" style={{ marginTop: 0, paddingTop: 0, borderTop: 'none' }}>
          <div className="ktf-faq-head">
            <div className="nv-eyebrow">Časté otázky</div>
            <h2 className="ktf-faq-title">Nejčastější dotazy</h2>
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
