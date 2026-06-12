
import { FEATURE_FLAGS } from '../config';
import { useTranslation } from '../context/LanguageContext';

export default function UserPortal({ user, setActivePage, onLogout }) {
  const { lang, t } = useTranslation();

  const getGradingStepIndex = (status) => {
    const steps = ['Příprava', 'Odesláno do USA', 'Zpracování', 'Nagradováno', 'Na cestě zpět', 'Připraveno'];
    const stepsEN = ['Preparation', 'Sent to USA', 'Processing', 'Graded', 'On way back', 'Ready'];
    
    const idx = steps.indexOf(status);
    if (idx !== -1) return idx;
    return stepsEN.indexOf(status);
  };

  const gradingSteps = lang === 'CZ'
    ? ['Příprava', 'Odesláno do USA', 'Zpracování', 'Nagradováno', 'Na cestě zpět', 'Připraveno']
    : ['Preparation', 'Sent to USA', 'Processing', 'Graded', 'On way back', 'Ready'];

  return (
    <div style={styles.container} className="container fade-in">
      <h1 className="sr-only">
        {lang === 'CZ' ? 'Můj uživatelský účet a zůstatky - NORTHVALE' : 'My Account & Submissions - NORTHVALE'}
      </h1>

      <div style={styles.layout}>
        {/* Left Column: Account Details & History */}
        <div style={{ ...styles.leftCol, flex: FEATURE_FLAGS.showGrading ? '1.8 1 500px' : '1 1 100%' }}>
          {/* User profile card */}
          <div style={styles.profileCard} className="glass-panel">
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              {user.avatar && (
                <img 
                  src={user.avatar} 
                  alt="Avatar" 
                  style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--color-gold)' }} 
                />
              )}
              <div style={styles.profileInfo}>
                <span style={styles.profileLabel}>{lang === 'CZ' ? 'Přihlášen jako' : 'Logged in as'}</span>
                <span style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)', display: 'block' }}>{user.name || user.email.split('@')[0]}</span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{user.email || (lang === 'CZ' ? 'sběratel@northvaletcg.eu' : 'collector@northvaletcg.eu')}</span>
              </div>
            </div>
            <button className="btn btn-secondary" style={styles.logoutBtn} onClick={onLogout}>
              {t('UserPortal.logoutBtn')}
            </button>
          </div>

          {/* Order history */}
          <div style={styles.section} className="glass-panel">
            <h3 style={styles.sectionHeading}>{t('UserPortal.orderHistory')}</h3>
            {user.orderHistory.length === 0 ? (
              <p style={styles.emptyText}>{t('UserPortal.noOrders')}</p>
            ) : (
              <div style={styles.list}>
                {user.orderHistory.map(order => (
                  <div key={order.id} style={styles.orderItem} className="glass-card">
                    <div style={styles.orderHeader}>
                      <div>
                        <span style={styles.orderId}>{lang === 'CZ' ? 'Objednávka' : 'Order'} #{order.id}</span>
                        <span style={styles.orderDate}>{order.date}</span>
                      </div>
                      <span style={styles.orderTotal}>{order.finalTotal.toLocaleString(lang === 'CZ' ? 'cs-CZ' : 'en-US')} Kč</span>
                    </div>

                    <div style={styles.orderBody}>
                      <div style={styles.orderProducts}>
                        {order.items.map((it, idx) => (
                          <span key={idx} style={styles.orderProdName}>
                            {it.quantity}x {it.name} ({it.price.toLocaleString(lang === 'CZ' ? 'cs-CZ' : 'en-US')} Kč)
                          </span>
                        ))}
                      </div>
                      <div style={styles.orderActions}>
                        <a 
                          href="#invoice-download" 
                          onClick={(e) => { e.preventDefault(); alert(lang === 'CZ' ? 'Simulované stažení faktury z ERP Pohoda.' : 'Simulated invoice download from ERP Pohoda.'); }}
                          style={styles.invoiceLink}
                        >
                          📄 {lang === 'CZ' ? 'Stáhnout fakturu (ERP Pohoda)' : 'Download Invoice (ERP Pohoda)'}
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Grading Submissions (1/3 width) */}
        {FEATURE_FLAGS.showGrading && (
          <div style={styles.rightCol} className="glass-panel">
            <h3 style={styles.sectionHeading}>{t('UserPortal.gradingHistory')}</h3>
            <p style={styles.desc}>
              {lang === 'CZ' 
                ? 'Sledujte aktuální stav svých odeslaných karet do PSA, Beckett nebo TAG.' 
                : 'Track the status of your submissions shipped to PSA, Beckett, or TAG.'}
            </p>

            {user.gradingSubmissions.length === 0 ? (
              <div style={styles.emptyGrading} className="glass-card">
                <span style={{ fontSize: '32px' }}>🔬</span>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
                  {t('UserPortal.noGrading')}
                </p>
                <button 
                  className="btn btn-secondary" 
                  style={{ marginTop: '8px', fontSize: '12px' }}
                  onClick={() => setActivePage('grading')}
                >
                  {lang === 'CZ' ? 'Vytvořit zakázku' : 'Create Submission'}
                </button>
              </div>
            ) : (
              <div style={styles.gradingList}>
                {user.gradingSubmissions.map(sub => {
                  const currentStepIdx = getGradingStepIndex(sub.status);
                  
                  // Translate status if in English mode
                  let displayStatus = sub.status;
                  if (lang === 'EN') {
                    const statusMapping = {
                      'Příprava': 'Preparation',
                      'Odesláno do USA': 'Sent to USA',
                      'Zpracování': 'Processing',
                      'Nagradováno': 'Graded',
                      'Na cestě zpět': 'On way back',
                      'Připraveno': 'Ready'
                    };
                    displayStatus = statusMapping[sub.status] || sub.status;
                  }

                  return (
                    <div key={sub.id} style={styles.gradingItem} className="glass-card">
                      <div style={styles.gradingItemHeader}>
                        <div>
                          <span style={styles.gradingId}>{lang === 'CZ' ? 'Zakázka' : 'Submission'} {sub.id}</span>
                          <span style={styles.gradingMeta}>{sub.company} - {sub.cardCount} {lang === 'CZ' ? 'karet' : 'cards'}</span>
                        </div>
                        <span style={styles.gradingStatusBadge}>{displayStatus}</span>
                      </div>

                      {/* Stepper Timeline */}
                      <div style={styles.timeline}>
                        {gradingSteps.map((stepName, sIdx) => {
                          const isCompleted = sIdx <= currentStepIdx;
                          const isActive = sIdx === currentStepIdx;

                          return (
                            <div key={sIdx} style={styles.timelineStep}>
                              <div style={styles.timelineDotWrapper}>
                                <div 
                                  style={{
                                    ...styles.timelineDot,
                                    backgroundColor: isActive ? 'var(--color-gold)' : isCompleted ? 'var(--color-green)' : 'rgba(255,255,255,0.06)'
                                  }}
                                />
                                {sIdx < gradingSteps.length - 1 && (
                                  <div 
                                    style={{
                                      ...styles.timelineLine,
                                      backgroundColor: sIdx < currentStepIdx ? 'var(--color-green)' : 'rgba(255,255,255,0.04)'
                                    }}
                                  />
                                )}
                              </div>
                              <span 
                                style={{
                                  ...styles.timelineLabel,
                                  color: isActive ? 'var(--color-gold)' : isCompleted ? 'var(--text-main)' : 'var(--text-muted)',
                                  fontWeight: isActive ? '700' : 'normal'
                                }}
                              >
                                {stepName}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
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
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  profileCard: {
    padding: '20px 30px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '24px',
    flexWrap: 'wrap',
    textAlign: 'left',
    border: '1px solid rgba(255, 255, 255, 0.08)',
  },
  profileInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  profileLabel: {
    fontSize: '11px',
    fontWeight: '700',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  profileEmail: {
    fontSize: '18px',
    fontWeight: '700',
    color: 'var(--text-main)',
  },
  logoutBtn: {
    padding: '8px 16px',
    fontSize: '13px',
  },
  creditCard: {
    padding: '30px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '24px',
    flexWrap: 'wrap',
    textAlign: 'left',
    backgroundColor: 'rgba(245, 158, 11, 0.03)',
    border: '1px solid rgba(245, 158, 11, 0.2)',
  },
  creditInfo: {
    flex: '1 1 300px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  creditTitle: {
    fontSize: '13px',
    fontWeight: '700',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
  },
  creditValue: {
    fontSize: '32px',
    fontWeight: '800',
    color: 'var(--color-gold)',
    fontFamily: 'var(--font-heading)',
  },
  creditDesc: {
    fontSize: '13px',
    color: 'var(--text-muted)',
    lineHeight: '1.5',
    margin: 0,
  },
  creditActions: {
    display: 'flex',
    alignItems: 'center',
  },
  section: {
    padding: '24px',
    textAlign: 'left',
  },
  sectionHeading: {
    fontSize: '16px',
    fontWeight: '800',
    margin: '0 0 16px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    paddingBottom: '10px',
    fontFamily: 'var(--font-heading)',
  },
  emptyText: {
    fontSize: '13px',
    color: 'var(--text-muted)',
    margin: 0,
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  listItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 20px',
  },
  trMeta: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '4px',
  },
  trDesc: {
    fontSize: '13px',
    fontWeight: '700',
  },
  trDate: {
    fontSize: '11px',
    color: 'var(--text-muted)',
  },
  trAmount: {
    fontSize: '14px',
    fontWeight: '800',
  },
  orderItem: {
    padding: '16px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  orderHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    paddingBottom: '8px',
  },
  orderId: {
    fontSize: '13px',
    fontWeight: '700',
    display: 'block',
  },
  orderDate: {
    fontSize: '11px',
    color: 'var(--text-muted)',
  },
  orderTotal: {
    fontSize: '14px',
    fontWeight: '800',
    color: 'var(--color-gold)',
  },
  orderBody: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
    gap: '12px',
  },
  orderProducts: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '4px',
  },
  orderProdName: {
    fontSize: '12px',
    color: 'var(--text-muted)',
  },
  orderActions: {
    display: 'flex',
  },
  invoiceLink: {
    fontSize: '12px',
    color: 'var(--color-gold)',
    fontWeight: '600',
    textDecoration: 'underline',
  },
  rightCol: {
    flex: '1 1 320px',
    padding: '24px',
    textAlign: 'left',
    alignSelf: 'flex-start',
  },
  desc: {
    fontSize: '13px',
    color: 'var(--text-muted)',
    lineHeight: '1.4',
    margin: '0 0 16px',
  },
  emptyGrading: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    textAlign: 'center',
  },
  gradingList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  gradingItem: {
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  gradingItemHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    paddingBottom: '8px',
  },
  gradingId: {
    fontSize: '13px',
    fontWeight: '700',
    display: 'block',
  },
  gradingMeta: {
    fontSize: '11px',
    color: 'var(--text-muted)',
  },
  gradingStatusBadge: {
    fontSize: '9px',
    fontWeight: '800',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    color: 'var(--color-gold)',
    padding: '2px 8px',
    borderRadius: '2px',
  },
  timeline: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    paddingLeft: '10px',
  },
  timelineStep: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  timelineDotWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    zIndex: 2,
  },
  timelineLine: {
    position: 'absolute',
    top: '10px',
    left: '4px',
    width: '2px',
    height: '24px',
    zIndex: 1,
  },
  timelineLabel: {
    fontSize: '12px',
  }
};
