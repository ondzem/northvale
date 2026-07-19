import { useTranslation } from '../../context/LanguageContext';

export default function BuylistTab({ buylists, approveBuylist }) {
  const { lang } = useTranslation();

  const getStatusText = (status) => {
    if (lang === 'CZ') return status;
    if (status === 'Schváleno - Vyplaceno') return 'Approved - Paid';
    if (status === 'Čeká na odeslání') return 'Pending dispatch';
    return status;
  };

  return (
    <div style={styles.glassPanel} className="glass-panel">
      <h2 style={styles.sectionHeading}>
        {lang === 'CZ' ? 'Správa podaných výkupů' : 'Manage Submitted Buylists'}
      </h2>
      <p style={styles.desc}>
        {lang === 'CZ'
          ? 'Zde vidíte všechny výkupy, které uživatelé naklikali na webu. Fyzicky zkontrolujte stav doručených karet a kliknutím na schválit potvrdíte vyplacení částky na bankovní účet uživatele.'
          : 'Here you can view all card buybacks submitted by users. Physically check the condition of cards received, then click approve to confirm the payout to the user\'s bank account.'}
      </p>

      {buylists.length === 0 ? (
        <p style={styles.emptyText}>{lang === 'CZ' ? 'Žádné nevyřízené výkupy.' : 'No pending buybacks.'}</p>
      ) : (
        <div style={styles.list}>
          {buylists.map(bl => (
            <div key={bl.id} style={styles.itemCard} className="glass-card">
              <div style={styles.itemHeader}>
                <div>
                  <span style={styles.itemId}>{lang === 'CZ' ? 'Výkup' : 'Buylist'} {bl.id}</span>
                  <span style={styles.itemDate}>{lang === 'CZ' ? 'Podáno:' : 'Submitted:'} {bl.date}</span>
                </div>
                <span 
                  style={{
                    ...styles.statusBadge,
                    backgroundColor: bl.status === 'Schváleno - Vyplaceno' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(253, 189, 22, 0.15)',
                    color: bl.status === 'Schváleno - Vyplaceno' ? 'var(--color-green)' : 'var(--color-gold)'
                  }}
                >
                  {getStatusText(bl.status)}
                </span>
              </div>

              <div style={styles.itemBody}>
                <div style={styles.productsList}>
                  {bl.items && bl.items.map((it, idx) => (
                    <div key={idx} style={styles.prodRow}>
                      <span>● {it.name} ({it.condition} - {it.lang})</span>
                      <span>{it.quantity}x {it.price.toLocaleString(lang === 'CZ' ? 'cs-CZ' : 'en-US')} {lang === 'CZ' ? 'Kč' : 'CZK'}</span>
                    </div>
                  ))}
                  {bl.bulk && bl.bulk.map((bk, idx) => (
                    <div key={idx} style={styles.prodRow}>
                      <span>● Bulk: {bk.type}</span>
                      <span>{bk.count} {lang === 'CZ' ? 'ks' : 'pcs'} (á {bk.price.toLocaleString(lang === 'CZ' ? 'cs-CZ' : 'en-US')} {lang === 'CZ' ? 'Kč' : 'CZK'})</span>
                    </div>
                  ))}
                </div>

                <div style={styles.approvalRow}>
                  <div style={styles.payoutDetail}>
                    <span>{lang === 'CZ' ? 'Způsob:' : 'Method:'} <strong>{lang === 'CZ' ? 'Na bankovní účet' : 'Bank transfer'}</strong></span>
                    <span style={styles.totalVal}>
                      {lang === 'CZ' ? 'Částka k vyplacení:' : 'Payout Amount:'} {bl.totalPayout.toLocaleString(lang === 'CZ' ? 'cs-CZ' : 'en-US')} {lang === 'CZ' ? 'Kč' : 'CZK'}
                    </span>
                  </div>
                  
                  {bl.status === 'Čeká na odeslání' && (
                    <button 
                      className="btn btn-success"
                      onClick={() => approveBuylist(bl.id)}
                    >
                      {lang === 'CZ' ? 'Schválit výkup a vyplatit' : 'Approve Buylist & Disburse'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  glassPanel: {
    padding: '30px',
    textAlign: 'left',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
  },
  sectionHeading: {
    fontSize: '18px',
    fontWeight: '800',
    margin: 0,
    fontFamily: 'var(--font-heading)',
    color: 'var(--text-main)',
  },
  desc: {
    fontSize: '13px',
    color: 'var(--text-muted)',
    lineHeight: '1.5',
    margin: 0,
  },
  emptyText: {
    fontSize: '13px',
    color: 'var(--text-muted)',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    width: '100%',
  },
  itemCard: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid var(--border-light)',
    borderRadius: 'var(--radius-md)',
  },
  itemHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    paddingBottom: '10px',
  },
  itemId: {
    fontSize: '14px',
    fontWeight: '700',
    display: 'block',
    color: 'var(--text-main)',
  },
  itemDate: {
    fontSize: '11px',
    color: 'var(--text-muted)',
  },
  statusBadge: {
    fontSize: '10px',
    fontWeight: '800',
    padding: '3px 8px',
    borderRadius: '2px',
  },
  itemBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  productsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  prodRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '13px',
    color: 'var(--text-muted)',
  },
  approvalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTop: '1px solid rgba(255,255,255,0.04)',
    paddingTop: '16px',
    flexWrap: 'wrap',
    gap: '12px',
  },
  payoutDetail: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '4px',
    fontSize: '13px',
    color: 'var(--text-muted)',
  },
  totalVal: {
    fontSize: '15px',
    fontWeight: '800',
    color: 'var(--color-gold)',
  }
};
