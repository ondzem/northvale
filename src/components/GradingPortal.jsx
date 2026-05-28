import React, { useState } from 'react';

export default function GradingPortal({ submitGrading, user, setActivePage }) {
  const [step, setStep] = useState(1);
  const [company, setCompany] = useState('PSA');
  const [cardCount, setCardCount] = useState(1);
  const [services, setServices] = useState({
    preGrading: true,
    cleaning: false
  });
  const [declaredValue, setDeclaredValue] = useState(5000); // CZK

  // Calculations
  const basePricePerCard = company === 'PSA' ? 590 : company === 'Beckett' ? 690 : 490;
  const preGradingPrice = services.preGrading ? 90 : 0;
  const cleaningPrice = services.cleaning ? 150 : 0;
  
  const pricePerCard = basePricePerCard + preGradingPrice + cleaningPrice;
  const subtotal = pricePerCard * cardCount;
  
  // Insurance fee (0.5% of declared value)
  const insuranceFee = Math.max(50, Math.round(declaredValue * 0.005));
  const finalTotal = subtotal + insuranceFee;

  const handleServiceToggle = (key) => {
    setServices(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleNextStep = () => {
    if (step < 3) setStep(step + 1);
  };

  const handlePrevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = () => {
    const submission = {
      id: 'GR-' + Math.floor(100000 + Math.random() * 900000),
      company,
      cardCount,
      price: finalTotal,
      declaredValue,
      status: 'Příprava', // Preparation -> Sent to USA -> Processing -> Graded -> On way back -> Ready
      date: new Date().toLocaleDateString()
    };

    submitGrading(submission);
    alert(`Vaše zakázka ${submission.id} byla úspěšně vytvořena! Její stav můžete odteď sledovat v uživatelském portálu.`);
    
    // Clear and head to user portal
    setStep(1);
    setCardCount(1);
    setServices({ preGrading: true, cleaning: false });
    setDeclaredValue(5000);
    setActivePage('profile');
  };

  return (
    <div style={styles.container} className="container fade-in">
      <h1 className="sr-only">Grading servis a zprostředkování - NORTHVALE</h1>

      <div style={styles.layout}>
        {/* Left Column: The 3-Step Stepper */}
        <div style={styles.leftCol} className="glass-panel">
          
          {/* Stepper Header */}
          <div style={styles.stepperHeader}>
            <div style={{ ...styles.stepIndicator, backgroundColor: step >= 1 ? 'var(--color-gold)' : 'var(--bg-surface-alt)' }}>1</div>
            <div style={{ ...styles.stepLine, backgroundColor: step >= 2 ? 'var(--color-gold)' : 'rgba(255,255,255,0.06)' }} />
            <div style={{ ...styles.stepIndicator, backgroundColor: step >= 2 ? 'var(--color-gold)' : 'var(--bg-surface-alt)' }}>2</div>
            <div style={{ ...styles.stepLine, backgroundColor: step >= 3 ? 'var(--color-gold)' : 'rgba(255,255,255,0.06)' }} />
            <div style={{ ...styles.stepIndicator, backgroundColor: step >= 3 ? 'var(--color-gold)' : 'var(--bg-surface-alt)' }}>3</div>
          </div>

          <div style={styles.stepTitleWrapper}>
            <span style={styles.stepSub}>KROK {step} Z 3</span>
            <h2 style={styles.stepTitle}>
              {step === 1 && 'Volba gradingové firmy'}
              {step === 2 && 'Doplňkové služby'}
              {step === 3 && 'Pojištění a rekapitulace'}
            </h2>
          </div>

          {/* Step 1 Content */}
          {step === 1 && (
            <div style={styles.stepContent}>
              <p style={styles.descText}>Vyberte si asociaci, u které chcete nechat Své karty ohodnotit, a zadejte počet karet.</p>
              
              <div style={styles.selectionGrid}>
                <div 
                  style={{
                    ...styles.selectionCard,
                    borderColor: company === 'PSA' ? 'var(--color-gold)' : 'rgba(63, 63, 70, 0.4)',
                    backgroundColor: company === 'PSA' ? 'rgba(245, 158, 11, 0.04)' : 'transparent'
                  }}
                  onClick={() => setCompany('PSA')}
                  className="glass-card"
                >
                  <span style={styles.companyName}>PSA</span>
                  <span style={styles.companyDesc}>Professional Sports Authenticator. Nejpopulárnější sběratelská asociace. Vyšší likvidita.</span>
                  <span style={styles.companyPrice}>od 590 Kč / karta</span>
                </div>

                <div 
                  style={{
                    ...styles.selectionCard,
                    borderColor: company === 'Beckett' ? 'var(--color-gold)' : 'rgba(63, 63, 70, 0.4)',
                    backgroundColor: company === 'Beckett' ? 'rgba(245, 158, 11, 0.04)' : 'transparent'
                  }}
                  onClick={() => setCompany('Beckett')}
                  className="glass-card"
                >
                  <span style={styles.companyName}>Beckett (BGS)</span>
                  <span style={styles.companyDesc}>Prémiový vzhled pouzdra s možností sub-grades. Ceněno u špičkových stavů (Black Label).</span>
                  <span style={styles.companyPrice}>od 690 Kč / karta</span>
                </div>

                <div 
                  style={{
                    ...styles.selectionCard,
                    borderColor: company === 'TAG' ? 'var(--color-gold)' : 'rgba(63, 63, 70, 0.4)',
                    backgroundColor: company === 'TAG' ? 'rgba(245, 158, 11, 0.04)' : 'transparent'
                  }}
                  onClick={() => setCompany('TAG')}
                  className="glass-card"
                >
                  <span style={styles.companyName}>TAG</span>
                  <span style={styles.companyDesc}>Moderní digitální hodnocení pomocí laserové a optické analýzy. Transparentní report.</span>
                  <span style={styles.companyPrice}>od 490 Kč / karta</span>
                </div>
              </div>

              <div style={styles.inputWrapper}>
                <label style={styles.inputLabel}>Počet karet k odeslání:</label>
                <input 
                  type="number" 
                  min="1" 
                  max="100"
                  value={cardCount}
                  onChange={(e) => setCardCount(Math.max(1, parseInt(e.target.value) || 1))}
                  style={styles.numberInput}
                />
              </div>
            </div>
          )}

          {/* Step 2 Content */}
          {step === 2 && (
            <div style={styles.stepContent}>
              <p style={styles.descText}>Zvyšte šance na dobrou známku. Nabízíme profesionální kontrolu a vyčištění karet před odesláním do USA.</p>

              <div style={styles.servicesList}>
                <label style={styles.serviceRow} className="glass-card">
                  <input 
                    type="checkbox" 
                    checked={services.preGrading} 
                    onChange={() => handleServiceToggle('preGrading')}
                    style={styles.checkbox}
                  />
                  <div style={styles.serviceInfo}>
                    <span style={styles.serviceName}>Pre-grading kontrola (+90 Kč / karta)</span>
                    <span style={styles.serviceDesc}>
                      Naši specialisté prozkoumají povrch, centrování a rohy pod mikroskopem. Pokud hrozí známka nižší než 9, budeme Vás kontaktovat a doporučíme stažení karty ze zakázky.
                    </span>
                  </div>
                </label>

                <label style={styles.serviceRow} className="glass-card">
                  <input 
                    type="checkbox" 
                    checked={services.cleaning} 
                    onChange={() => handleServiceToggle('cleaning')}
                    style={styles.checkbox}
                  />
                  <div style={styles.serviceInfo}>
                    <span style={styles.serviceName}>Profesionální čištění karet (+150 Kč / karta)</span>
                    <span style={styles.serviceDesc}>
                      Bezpečné odstranění otisků prstů, prachu a drobných nečistot z povrchu karty speciálním šetrným roztokem.
                    </span>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Step 3 Content */}
          {step === 3 && (
            <div style={styles.stepContent}>
              <p style={styles.descText}>Zadejte odhadovanou tržní hodnotu Vašich karet. Na tuto částku budou karty pojištěny během přepravy do USA a zpět.</p>

              <div style={styles.inputWrapper}>
                <label style={styles.inputLabel}>Celková pojistná hodnota zásilky (Kč):</label>
                <input 
                  type="number" 
                  min="1000" 
                  step="1000"
                  value={declaredValue}
                  onChange={(e) => setDeclaredValue(Math.max(1000, parseInt(e.target.value) || 1000))}
                  style={styles.largeInput}
                />
                <span style={styles.inputSub}>
                  Poplatek za plné pojištění a logistiku činí 0.5% z deklarované hodnoty (minimálně 50 Kč).
                </span>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div style={styles.btnRow}>
            {step > 1 && (
              <button className="btn btn-secondary" onClick={handlePrevStep}>Zpět</button>
            )}
            {step < 3 ? (
              <button className="btn btn-primary" style={styles.nextBtn} onClick={handleNextStep}>Pokračovat</button>
            ) : (
              <button className="btn btn-success" style={styles.nextBtn} onClick={handleSubmit}>Odeslat zakázku</button>
            )}
          </div>
        </div>

        {/* Right Column: Pricing Summary & Packaging Guide */}
        <div style={styles.rightCol}>
          {/* Summary */}
          <div style={styles.summaryBox} className="glass-panel">
            <h3 style={styles.summaryTitle}>Cena služeb</h3>
            <div style={styles.summaryList}>
              <div style={styles.summaryRow}>
                <span>Zvolená firma:</span>
                <span>{company}</span>
              </div>
              <div style={styles.summaryRow}>
                <span>Počet karet:</span>
                <span>{cardCount} ks</span>
              </div>
              <div style={styles.summaryRow}>
                <span>Základní cena:</span>
                <span>{(basePricePerCard * cardCount).toLocaleString()} Kč</span>
              </div>
              {services.preGrading && (
                <div style={styles.summaryRow}>
                  <span>Pre-grading kontrola:</span>
                  <span>{(preGradingPrice * cardCount).toLocaleString()} Kč</span>
                </div>
              )}
              {services.cleaning && (
                <div style={styles.summaryRow}>
                  <span>Profesionální čištění:</span>
                  <span>{(cleaningPrice * cardCount).toLocaleString()} Kč</span>
                </div>
              )}
              <div style={styles.summaryRow}>
                <span>Pojištění zásilky:</span>
                <span>{insuranceFee.toLocaleString()} Kč</span>
              </div>
              <div style={styles.totalRow}>
                <span>Celkem k úhradě:</span>
                <span style={{ color: 'var(--color-gold)' }}>{finalTotal.toLocaleString()} Kč</span>
              </div>
            </div>
          </div>

          {/* Packaging Guide */}
          <div style={styles.guideBox} className="glass-panel">
            <h3 style={styles.guideTitle}>📦 Návod na bezpečné zabalení</h3>
            <p style={styles.guideDesc}>Abyste předešli poškození karet při přepravě k nám, postupujte podle tohoto postupu:</p>
            <ol style={styles.guideList}>
              <li>
                <strong>Penny Sleeve:</strong> Vložte kartu do měkkého penny obalu <strong>hlavou dolů</strong>.
              </li>
              <li>
                <strong>Vytahovací páska (Pull-Tab):</strong> Na zadní stranu penny sleeve nalepte kousek post-it papírku nebo pásky vyčnívající ven.
              </li>
              <li>
                <strong>Card Saver 1:</strong> Vložte kartu do polotuhého plastového pouzdra Card Saver 1. Nepoužívejte toploadery pro odesílání do gradingových firem (vyžadují Card Savery).
              </li>
              <li>
                <strong>Kartonový sendvič:</strong> Zabalte Card Savery s kartami mezi dva pevné kartony a zajistěte malířskou páskou (ne izolepou!).
              </li>
            </ol>
          </div>
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
    flex: '1.8 1 500px',
    padding: '32px',
    textAlign: 'left',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    alignSelf: 'flex-start',
  },
  stepperHeader: {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    paddingBottom: '20px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  stepIndicator: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#000',
    fontSize: '13px',
    fontWeight: '800',
  },
  stepLine: {
    flexGrow: 1,
    height: '2px',
    margin: '0 16px',
  },
  stepTitleWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  stepSub: {
    fontSize: '11px',
    color: 'var(--color-gold)',
    fontWeight: '800',
    letterSpacing: '0.5px',
  },
  stepTitle: {
    fontSize: '20px',
    fontWeight: '800',
    margin: 0,
    fontFamily: 'var(--font-heading)',
  },
  stepContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  descText: {
    fontSize: '14px',
    color: 'var(--text-muted)',
    lineHeight: '1.5',
    margin: 0,
  },
  selectionGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
  },
  selectionCard: {
    padding: '20px',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    textAlign: 'left',
  },
  companyName: {
    fontSize: '16px',
    fontWeight: '800',
  },
  companyDesc: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    lineHeight: '1.4',
  },
  companyPrice: {
    fontSize: '13px',
    fontWeight: '700',
    color: 'var(--color-gold)',
    marginTop: 'auto',
    paddingTop: '8px',
  },
  inputWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    maxWidth: '300px',
  },
  inputLabel: {
    fontSize: '13px',
    fontWeight: '700',
  },
  numberInput: {
    backgroundColor: 'var(--bg-page)',
    border: '1px solid var(--border-light)',
    padding: '10px 16px',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-main)',
    fontSize: '14px',
    outline: 'none',
  },
  largeInput: {
    backgroundColor: 'var(--bg-page)',
    border: '1px solid var(--border-light)',
    padding: '10px 16px',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-main)',
    fontSize: '18px',
    fontWeight: '700',
    outline: 'none',
  },
  inputSub: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    lineHeight: '1.4',
  },
  servicesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  serviceRow: {
    padding: '16px 20px',
    display: 'flex',
    gap: '16px',
    alignItems: 'flex-start',
    cursor: 'pointer',
  },
  checkbox: {
    marginTop: '4px',
    cursor: 'pointer',
  },
  serviceInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    textAlign: 'left',
  },
  serviceName: {
    fontSize: '14px',
    fontWeight: '700',
  },
  serviceDesc: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    lineHeight: '1.4',
  },
  btnRow: {
    display: 'flex',
    gap: '12px',
    marginTop: '20px',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    paddingTop: '20px',
  },
  nextBtn: {
    marginLeft: 'auto',
    minWidth: '120px',
  },
  rightCol: {
    flex: '1 1 320px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  summaryBox: {
    padding: '24px',
    textAlign: 'left',
  },
  summaryTitle: {
    fontSize: '16px',
    fontWeight: '800',
    margin: '0 0 16px',
    fontFamily: 'var(--font-heading)',
  },
  summaryList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '13px',
    color: 'var(--text-muted)',
  },
  totalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '15px',
    fontWeight: '800',
    color: 'var(--text-main)',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    paddingTop: '12px',
    marginTop: '6px',
  },
  guideBox: {
    padding: '24px',
    textAlign: 'left',
  },
  guideTitle: {
    fontSize: '16px',
    fontWeight: '800',
    margin: '0 0 10px',
    fontFamily: 'var(--font-heading)',
  },
  guideDesc: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    lineHeight: '1.4',
    marginBottom: '14px',
  },
  guideList: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    paddingLeft: '20px',
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    lineHeight: '1.5',
  }
};
