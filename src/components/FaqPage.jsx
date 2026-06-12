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

  return (
    <div style={styles.container} className="container fade-in">
      <h1 className="sr-only">FAQ - Často kladené dotazy - NORTHVALE</h1>

      {/* Breadcrumbs */}
      <nav className="breadcrumbs-nav" aria-label="Drobečková navigace" style={styles.breadcrumbs}>
        <span className="breadcrumb-item" onClick={() => setActivePage('home')}>Domů</span>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-item active">FAQ</span>
      </nav>

      <div style={styles.headerArea}>
        <span className="testimonials-eyebrow" style={styles.eyebrow}>Často kladené otázky</span>
        <h1 style={styles.title}>FAQ</h1>
        <p style={styles.subtitle}>
          Rychlé odpovědi na nejčastější dotazy ohledně nákupu, dopravy, plateb a dalších služeb.
        </p>
      </div>

      {/* Full-width Category Containers */}
      <div style={styles.faqList}>
        {faqData.map((cat, catIdx) => (
          <div key={catIdx} style={styles.categoryCard}>
            <h2 style={styles.categoryTitle}>{cat.category}</h2>
            
            <div style={styles.accordionList}>
              {cat.questions.map((item, qIdx) => {
                const globalIdx = `${catIdx}-${qIdx}`;
                const isOpen = openAccordion === globalIdx;

                return (
                  <div key={qIdx} style={styles.accordionItem}>
                    <button 
                      style={styles.accordionHeader} 
                      onClick={() => toggleAccordion(globalIdx)}
                    >
                      <span style={styles.accordionQuestion}>{item.q}</span>
                      <span style={{ 
                        ...styles.accordionArrow,
                        transform: isOpen ? 'rotate(180deg)' : 'rotate(0)' 
                      }}>&darr;</span>
                    </button>
                    
                    {isOpen && (
                      <div style={styles.accordionBody}>
                        <p style={styles.accordionAnswer}>{item.a}</p>
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
  );
}

const styles = {
  container: {
    paddingTop: '20px',
    paddingBottom: '80px',
  },
  breadcrumbs: {
    marginBottom: '24px',
    textAlign: 'left',
  },
  headerArea: {
    textAlign: 'center',
    marginBottom: '40px',
    maxWidth: '800px',
    marginLeft: 'auto',
    marginRight: 'auto',
  },
  eyebrow: {
    display: 'inline-block',
    fontSize: '11px',
    fontWeight: '700',
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    color: 'var(--color-gold)',
    marginBottom: '12px',
  },
  title: {
    fontSize: '44px',
    fontWeight: '800',
    color: 'var(--text-main)',
    margin: '0 0 16px 0',
    fontFamily: 'var(--font-heading)',
    letterSpacing: '-1px',
  },
  subtitle: {
    fontSize: '16px',
    lineHeight: '1.6',
    color: 'var(--text-muted)',
    margin: 0,
  },
  faqList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '32px',
    width: '100%',
    boxSizing: 'border-box',
  },
  categoryCard: {
    boxSizing: 'border-box',
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    padding: '40px',
    textAlign: 'left',
    width: '100%',
  },
  categoryTitle: {
    fontSize: '20px',
    fontWeight: '800',
    color: 'var(--text-main)',
    fontFamily: 'var(--font-heading)',
    marginTop: 0,
    marginBottom: '24px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    paddingBottom: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  accordionList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  accordionItem: {
    overflow: 'hidden',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'rgba(255, 255, 255, 0.005)',
  },
  accordionHeader: {
    width: '100%',
    padding: '18px 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    textAlign: 'left',
    gap: '16px',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
  },
  accordionQuestion: {
    fontSize: '15px',
    fontWeight: '700',
    color: 'var(--text-main)',
  },
  accordionArrow: {
    fontSize: '14px',
    fontWeight: '800',
    color: 'var(--color-gold)',
    transition: 'transform 0.2s',
  },
  accordionBody: {
    padding: '0 24px 20px',
    borderTop: '1px solid var(--border)',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  accordionAnswer: {
    fontSize: '14px',
    color: 'var(--text-muted)',
    lineHeight: '1.65',
    margin: '12px 0 0',
  },
};
