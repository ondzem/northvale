import { useState, useEffect } from 'react';
import { FEATURE_FLAGS } from '../config';

export default function ContactPage({ setActivePage }) {
  const [openAccordion, setOpenAccordion] = useState(null);
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 850);

  useEffect(() => {
    window.scrollTo(0, 0);
    const handleResize = () => setIsMobile(window.innerWidth <= 850);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
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
    <div style={styles.container} className="container fade-in">
      <h1 className="sr-only">Kontakt a FAQ - NORTHVALE</h1>

      {/* Breadcrumbs */}
      <nav className="breadcrumbs-nav" aria-label="Drobečková navigace" style={styles.breadcrumbs}>
        <span className="breadcrumb-item" onClick={() => setActivePage('home')}>Domů</span>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-item active">Kontakt</span>
      </nav>

      <div style={styles.headerArea}>
        <span className="testimonials-eyebrow" style={styles.eyebrow}>Spojte se s námi</span>
        <h1 style={styles.title}>Kontakt</h1>
        <p style={styles.subtitle}>
          Máte jakýkoliv dotaz ohledně objednávky, produktů nebo doručení? Neváhejte nám napsat.
        </p>
      </div>

      {/* Main Grid: Contact Form (Left) & Contact Details (Right) */}
      <div style={{
        ...styles.grid,
        gridTemplateColumns: isMobile ? '1fr' : '1.2fr 0.8fr'
      }}>
        {/* Contact Form Column */}
        <div style={styles.formContainer}>
          <h2 style={styles.sectionTitle}>Napište nám</h2>
          
          {contactSubmitted ? (
            <div style={styles.successForm}>
              <span style={{ fontSize: '48px', color: 'var(--color-gold)' }}>✉️</span>
              <h3 style={{ fontSize: '18px', fontWeight: '850', color: 'var(--text-main)', margin: '12px 0 8px 0' }}>
                Zpráva byla úspěšně odeslána!
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '13.5px', lineHeight: '1.6', marginBottom: '24px' }}>
                Děkujeme za Váš dotaz. Naše podpora Vám odpoví na zadaný e-mail co nejdříve (obvykle do 2 hodin).
              </p>
              <button className="btn btn-secondary" onClick={() => setContactSubmitted(false)}>
                Odeslat novou zprávu
              </button>
            </div>
          ) : (
            <form style={styles.form} onSubmit={handleContactSubmit}>
              <p style={styles.formDesc}>
                Vyplňte prosím níže uvedený formulář a my se Vám ozveme co nejdříve zpět.
              </p>
              
              <div style={styles.formField}>
                <label style={styles.formLabel}>Jméno a příjmení:</label>
                <input type="text" required placeholder="Jan Novák" style={styles.formInput} />
              </div>

              <div style={styles.formField}>
                <label style={styles.formLabel}>E-mailová adresa:</label>
                <input type="email" required placeholder="novak@example.cz" style={styles.formInput} />
              </div>

              <div style={styles.formField}>
                <label style={styles.formLabel}>Předmět / Číslo objednávky (nepovinné):</label>
                <input type="text" placeholder="Např. dotaz k objednávce #12345" style={styles.formInput} />
              </div>

              <div style={styles.formField}>
                <label style={styles.formLabel}>Vaše zpráva:</label>
                <textarea required rows="5" placeholder="Sem napište Váš dotaz..." style={styles.formTextarea} />
              </div>

              <button className="btn btn-primary" type="submit" style={styles.submitBtn}>
                Odeslat zprávu
              </button>
            </form>
          )}
        </div>

        {/* Contact Info Column */}
        <div style={styles.infoContainer}>
          <h2 style={styles.sectionTitle}>Kontaktní údaje</h2>
          
          <div style={styles.infoCard}>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>E-mailová adresa</span>
              <a href="mailto:info@northvaletcg.eu" style={styles.infoValueLink}>info@northvaletcg.eu</a>
            </div>
            
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Telefonní číslo</span>
              <a href="tel:+420739666779" style={styles.infoValueLink}>+420 739 666 779</a>
            </div>

            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Provozovatel</span>
              <span style={styles.infoValueText}>
                <strong>NORTHVALE s.r.o.</strong><br />
                IČO: 29618142 | DIČ: CZ29618142
              </span>
            </div>

            <div style={{ ...styles.infoRow, borderBottom: 'none', paddingBottom: 0 }}>
              <span style={styles.infoLabel}>Sídlo společnosti</span>
              <span style={styles.infoValueText}>
                Bratří Čapků 1095<br />
                534 01 Holice
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom FAQ Section */}
      <section id="faq-section" style={styles.faqSection}>
        <div style={styles.faqHeader}>
          <span className="testimonials-eyebrow" style={styles.eyebrow}>Často kladené otázky</span>
          <h2 style={styles.faqTitle}>Nejčastější dotazy (FAQ)</h2>
        </div>

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
      </section>
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
  grid: {
    display: 'grid',
    gap: '32px',
    alignItems: 'start',
  },
  formContainer: {
    boxSizing: 'border-box',
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    padding: '40px',
    textAlign: 'left',
  },
  infoContainer: {
    boxSizing: 'border-box',
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    padding: '40px',
    textAlign: 'left',
  },
  sectionTitle: {
    fontSize: '22px',
    fontWeight: '800',
    color: 'var(--text-main)',
    fontFamily: 'var(--font-heading)',
    marginTop: 0,
    marginBottom: '24px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    paddingBottom: '12px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  formDesc: {
    fontSize: '14px',
    color: 'var(--text-muted)',
    lineHeight: '1.5',
    margin: '0 0 8px 0',
  },
  formField: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  formLabel: {
    fontSize: '13px',
    fontWeight: '700',
    color: 'var(--text-main)',
  },
  formInput: {
    backgroundColor: 'var(--bg-page)',
    border: '1px solid var(--border)',
    padding: '12px 16px',
    borderRadius: 'var(--radius-md)',
    fontSize: '14px',
    color: 'var(--text-main)',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  formTextarea: {
    backgroundColor: 'var(--bg-page)',
    border: '1px solid var(--border)',
    padding: '12px 16px',
    borderRadius: 'var(--radius-md)',
    fontSize: '14px',
    color: 'var(--text-main)',
    outline: 'none',
    resize: 'vertical',
    transition: 'border-color 0.2s',
  },
  submitBtn: {
    width: '100%',
    padding: '14px',
    fontSize: '14px',
    fontWeight: '700',
    marginTop: '10px',
  },
  successForm: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    padding: '30px 0',
  },
  infoCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  infoRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
    paddingBottom: '16px',
  },
  infoLabel: {
    fontSize: '11px',
    fontWeight: '750',
    textTransform: 'uppercase',
    color: 'var(--text-muted)',
    letterSpacing: '0.5px',
  },
  infoValueLink: {
    fontSize: '15px',
    fontWeight: '700',
    color: 'var(--text-main)',
    textDecoration: 'none',
    wordBreak: 'break-all',
  },
  infoValueText: {
    fontSize: '14px',
    lineHeight: '1.6',
    color: 'var(--text-main)',
  },
  faqSection: {
    marginTop: '64px',
    textAlign: 'left',
  },
  faqHeader: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  faqTitle: {
    fontSize: '32px',
    fontWeight: '800',
    color: 'var(--text-main)',
    margin: '0 0 16px 0',
    fontFamily: 'var(--font-heading)',
    letterSpacing: '-0.5px',
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
