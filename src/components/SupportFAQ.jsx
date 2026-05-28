import { useState } from 'react';

export default function SupportFAQ() {
  const [openAccordion, setOpenAccordion] = useState(null);
  const [contactSubmitted, setContactSubmitted] = useState(false);

  const faqData = [
    {
      category: 'Doprava a doručení',
      questions: [
        {
          q: 'Jaké jsou způsoby dopravy a kolik stojí?',
          a: 'Nabízíme Zásilkovnu (79 Kč na výdejní místo), Českou poštu (Doporučené psaní za 75-85 Kč, Cenné psaní pro drahé karty za 90-110 Kč) a osobní odběr v kavárně Coffee & Cards v Pardubicích zdarma. Při nákupu nad 2000 Kč máte dopravu zcela zdarma.'
        },
        {
          q: 'Jak balíte kusové karty (Singles)?',
          a: 'Držíme se striktního sběratelského standardu: Karta jde do penny sleeve hlavou dolů, připevní se vytahovací páska (pull-tab), vloží se do toploaderu, ten jde do uzavíratelného team bagu, a ten se zafixuje v kartonovém sendviči (nepoužíváme izolepu na toploaderu). Nakonec vše vložíme do bublinkové obálky.'
        },
        {
          q: 'Kdy obdržím svou objednávku?',
          a: 'Zásilky odesíláme do 24 hodin od zaplacení (v pracovní dny). Zásilkovna obvykle doručuje do 24-48 hodin, takže při objednání do středy můžete mít karty bezpečně doma na víkendový turnaj.'
        }
      ]
    },
    {
      category: 'Výkup karet (Buylist)',
      questions: [
        {
          q: 'Jak funguje výkup karet?',
          a: 'Karty naklikáte do výkupního košíku v našem portálu, zvolíte stav a jazyk a odešlete. Následně karty zabalíte a zašlete na naši adresu nebo odevzdáte v Pardubicích. Jakmile karty zkontrolujeme (do 48h od přijetí), vyplatíme Vám peníze nebo připíšeme kredit.'
        },
        {
          q: 'Co je to Store Kredit a jaký je bonus?',
          a: 'Store Kredit je virtuální zůstatek na Vašem uživatelském účtu. Pokud zvolíte výplatu výkupu ve Store Kreditu, navýšíme celkovou částku o 25% bonus. Tento kredit pak můžete uplatnit v pokladně na nákup jakéhokoliv dalšího zboží.'
        }
      ]
    },
    {
      category: 'Platby a reklamace',
      questions: [
        {
          q: 'Jaké platební metody podporujete?',
          a: 'Můžete platit platební kartou online přes zabezpečenou platební bránu, klasickým bankovním převodem, nebo uplatnit Svůj Store Kredit získaný z výkupů.'
        },
        {
          q: 'Jak mohu zboží reklamovat?',
          a: 'Pokud se zásilka poškodila během přepravy (což se díky našemu balení stává výjimečně) nebo neodpovídá deklarovaný stav karty, kontaktujte nás e-mailem. Reklamace vyřizujeme obratem v souladu se zákonem.'
        }
      ]
    }
  ];

  const toggleAccordion = (index) => {
    setOpenAccordion(openAccordion === index ? null : index);
  };

  const handleContactSubmit = (e) => {
    e.preventDefault();
    setContactSubmitted(true);
  };

  return (
    <div style={styles.container} className="container fade-in">
      <h1 className="sr-only">Centrum podpory, FAQ a kontakty - NORTHVALE</h1>

      <div style={styles.layout}>
        {/* Left Column: FAQ Accordion */}
        <div style={styles.leftCol}>
          <h2 style={styles.sectionHeading}>Často kladené dotazy</h2>
          
          <div style={styles.faqWrapper}>
            {faqData.map((cat, catIdx) => (
              <div key={catIdx} style={styles.catGroup}>
                <h3 style={styles.catHeading}>{cat.category}</h3>
                
                <div style={styles.accordionList}>
                  {cat.questions.map((item, qIdx) => {
                    const globalIdx = `${catIdx}-${qIdx}`;
                    const isOpen = openAccordion === globalIdx;

                    return (
                      <div key={qIdx} style={styles.accordionItem} className="glass-card">
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

        {/* Right Column: Contact Form */}
        <div style={styles.rightCol} className="glass-panel">
          <h2 style={styles.sectionHeading}>Napište nám</h2>
          
          {contactSubmitted ? (
            <div style={styles.successForm}>
              <span style={{ fontSize: '48px' }}>✉️</span>
              <h3>Zpráva byla úspěšně odeslána!</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                Děkujeme za Váš dotaz. Naši specialisté Vám odpoví na zadaný e-mail co nejdříve (obvykle do 2 hodin).
              </p>
              <button className="btn btn-secondary" onClick={() => setContactSubmitted(false)}>
                Odeslat novou zprávu
              </button>
            </div>
          ) : (
            <form style={styles.form} onSubmit={handleContactSubmit}>
              <p style={styles.formDesc}>Máte dotaz k objednávce, výkupu nebo gradingu? Napište nám přes formulář níže.</p>
              
              <div style={styles.formField}>
                <label style={styles.formLabel}>Jméno a příjmení:</label>
                <input type="text" required placeholder="Jan Novák" style={styles.formInput} />
              </div>

              <div style={styles.formField}>
                <label style={styles.formLabel}>E-mailová adresa:</label>
                <input type="email" required placeholder="novak@example.cz" style={styles.formInput} />
              </div>

              <div style={styles.formField}>
                <label style={styles.formLabel}>Vaše zpráva:</label>
                <textarea required rows="5" placeholder="Sem napište Váš dotaz..." style={styles.formTextarea} />
              </div>

              <button className="btn btn-primary" type="submit" style={styles.submitBtn}>
                Odeslat dotaz
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    paddingTop: '20px',
    paddingBottom: '20px',
  },
  layout: {
    display: 'flex',
    gap: '32px',
    flexWrap: 'wrap',
  },
  leftCol: {
    flex: '1.5 1 450px',
    textAlign: 'left',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  sectionHeading: {
    fontSize: '22px',
    fontWeight: '800',
    margin: 0,
    fontFamily: 'var(--font-heading)',
  },
  faqWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  catGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  catHeading: {
    fontSize: '15px',
    fontWeight: '700',
    color: 'var(--color-gold)',
    margin: 0,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  accordionList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  accordionItem: {
    overflow: 'hidden',
  },
  accordionHeader: {
    width: '100%',
    padding: '16px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    textAlign: 'left',
    gap: '16px',
    backgroundColor: 'rgba(255,255,255,0.01)',
  },
  accordionQuestion: {
    fontSize: '14px',
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
    padding: '0 20px 20px',
    borderTop: '1px solid rgba(255,255,255,0.03)',
    backgroundColor: 'rgba(9,9,11,0.2)',
  },
  accordionAnswer: {
    fontSize: '13px',
    color: 'var(--text-muted)',
    lineHeight: '1.6',
    margin: '12px 0 0',
  },
  rightCol: {
    flex: '1 1 320px',
    padding: '30px',
    textAlign: 'left',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    alignSelf: 'flex-start',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  formDesc: {
    fontSize: '13px',
    color: 'var(--text-muted)',
    lineHeight: '1.5',
    margin: 0,
  },
  formField: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  formLabel: {
    fontSize: '12px',
    fontWeight: '700',
  },
  formInput: {
    backgroundColor: 'var(--bg-page)',
    border: '1px solid var(--border-light)',
    padding: '10px 14px',
    borderRadius: 'var(--radius-sm)',
    fontSize: '13px',
    color: 'var(--text-main)',
    outline: 'none',
  },
  formTextarea: {
    backgroundColor: 'var(--bg-page)',
    border: '1px solid var(--border-light)',
    padding: '10px 14px',
    borderRadius: 'var(--radius-sm)',
    fontSize: '13px',
    color: 'var(--text-main)',
    outline: 'none',
    resize: 'vertical',
  },
  submitBtn: {
    width: '100%',
    padding: '12px',
    marginTop: '6px',
  },
  successForm: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    textAlign: 'center',
    padding: '20px 0',
  }
};
