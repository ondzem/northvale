import { useState, useEffect } from 'react';
import { FEATURE_FLAGS } from '../config';
import { useTranslation } from '../context/LanguageContext';

export default function FaqPage({ setActivePage }) {
  const { lang, t } = useTranslation();
  const [openAccordion, setOpenAccordion] = useState(null);

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
