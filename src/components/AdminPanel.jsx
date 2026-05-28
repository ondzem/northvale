import { useState } from 'react';

export default function AdminPanel({ buylists, approveBuylist }) {
  const [syncLogs, setSyncLogs] = useState([
    { id: '1', time: '13:02:15', event: 'Cardmarket Webhook: Prodej karty "Charizard ex (SIR)" na Cardmarketu (Order #849201).' },
    { id: '2', time: '13:02:16', event: 'Middleware: Snížen stav skladu karty "Charizard ex (SIR)" na e-shopu na 0 ks.' },
    { id: '3', time: '12:45:10', event: 'E-shop API: Dokončena objednávka #10042 na e-shopu.' },
    { id: '4', time: '12:45:12', event: 'Middleware: Odeslán API request na Cardmarket k vymazání listingu pro prodané zboží. Kód stavu 200 OK.' },
    { id: '5', time: '12:45:13', event: 'Middleware Rate Limiter: Požadavek zařazen do fronty. Využití limitu API: 14/150 volání/min.' }
  ]);

  const handleSimulateSync = () => {
    const timeStr = new Date().toLocaleTimeString();
    const newLog = {
      id: Math.random().toString(),
      time: timeStr,
      event: `Simulace: Provedena kontrola skladu a synchronizace s Cardmarket API. Všechny listingy souhlasí.`
    };
    setSyncLogs([newLog, ...syncLogs]);
  };

  return (
    <div style={styles.container} className="container fade-in">
      <h1 className="sr-only">Administrační rozhraní NORTHVALE</h1>

      <div style={styles.layout}>
        {/* Left Column: Buylist approval (2/3 width) */}
        <div style={styles.leftCol} className="glass-panel">
          <h2 style={styles.sectionHeading}>Správa podaných výkupů</h2>
          <p style={styles.desc}>
            Zde vidíte všechny výkupy, které uživatelé naklikali na webu. Fyzicky zkontrolujte stav doručených karet a kliknutím na schválit připíšete Store Kredit na účet uživatele.
          </p>

          {buylists.length === 0 ? (
            <p style={styles.emptyText}>Žádné nevyřízené výkupy.</p>
          ) : (
            <div style={styles.list}>
              {buylists.map(bl => (
                <div key={bl.id} style={styles.itemCard} className="glass-card">
                  <div style={styles.itemHeader}>
                    <div>
                      <span style={styles.itemId}>Výkup {bl.id}</span>
                      <span style={styles.itemDate}>Podáno: {bl.date}</span>
                    </div>
                    <span 
                      style={{
                        ...styles.statusBadge,
                        backgroundColor: bl.status === 'Schváleno - Vyplaceno' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                        color: bl.status === 'Schváleno - Vyplaceno' ? 'var(--color-green)' : 'var(--color-gold)'
                      }}
                    >
                      {bl.status}
                    </span>
                  </div>

                  <div style={styles.itemBody}>
                    <div style={styles.productsList}>
                      {bl.items && bl.items.map((it, idx) => (
                        <div key={idx} style={styles.prodRow}>
                          <span>● {it.name} ({it.condition} - {it.lang})</span>
                          <span>{it.quantity}x {it.price.toLocaleString('cs-CZ')} Kč</span>
                        </div>
                      ))}
                      {bl.bulk && bl.bulk.map((bk, idx) => (
                        <div key={idx} style={styles.prodRow}>
                          <span>● Bulk: {bk.type}</span>
                          <span>{bk.count} ks (á {bk.price.toLocaleString('cs-CZ')} Kč)</span>
                        </div>
                      ))}
                    </div>

                    <div style={styles.approvalRow}>
                      <div style={styles.payoutDetail}>
                        <span>Způsob: <strong>{bl.payoutMethod === 'credit' ? 'Store Kredit (+25% bonus)' : 'Na bankovní účet'}</strong></span>
                        <span style={styles.totalVal}>Částka k vyplacení: {bl.totalPayout.toLocaleString()} Kč</span>
                      </div>
                      
                      {bl.status === 'Čeká na odeslání' && (
                        <button 
                          className="btn btn-success"
                          onClick={() => approveBuylist(bl.id)}
                        >
                          Schválit výkup a vyplatit
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Cardmarket Middleware logs (1/3 width) */}
        <div style={styles.rightCol} className="glass-panel">
          <div style={styles.logsHeader}>
            <h3 style={styles.sectionHeading}>Cardmarket Synchronizace</h3>
            <button className="btn btn-secondary" style={styles.syncBtn} onClick={handleSimulateSync}>
              Synch nyní
            </button>
          </div>
          <p style={styles.desc}>
            Middleware provádí obousměrnou synchronizaci e-shopu a evropského tržiště Cardmarket k zamezení double-sellingu.
          </p>

          <div style={styles.logsConsole}>
            {syncLogs.map(log => (
              <div key={log.id} style={styles.logRow}>
                <span style={styles.logTime}>[{log.time}]</span>
                <span style={styles.logEvent}>{log.event}</span>
              </div>
            ))}
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
    padding: '30px',
    textAlign: 'left',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    alignSelf: 'flex-start',
  },
  sectionHeading: {
    fontSize: '18px',
    fontWeight: '800',
    margin: 0,
    fontFamily: 'var(--font-heading)',
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
  },
  totalVal: {
    fontSize: '15px',
    fontWeight: '800',
    color: 'var(--color-gold)',
  },
  rightCol: {
    flex: '1 1 320px',
    padding: '24px',
    textAlign: 'left',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    alignSelf: 'flex-start',
  },
  logsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  syncBtn: {
    padding: '4px 10px',
    fontSize: '11px',
  },
  logsConsole: {
    backgroundColor: 'var(--bg-page)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    padding: '16px',
    height: '300px',
    overflowY: 'auto',
    fontFamily: 'monospace',
    fontSize: '11px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  logRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    alignItems: 'flex-start',
  },
  logTime: {
    color: 'var(--color-gold)',
    fontWeight: '700',
  },
  logEvent: {
    color: 'var(--color-green)',
    textAlign: 'left',
  }
};
