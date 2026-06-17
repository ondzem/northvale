import { useState } from 'react';
import { useTranslation } from '../../context/LanguageContext';

export default function SyncTab() {
  const { lang } = useTranslation();
  const [syncLogs, setSyncLogs] = useState(() => {
    if (lang === 'CZ') {
      return [
        { id: '1', time: '13:02:15', event: 'Cardmarket Webhook: Prodej karty "Charizard ex (SIR)" na Cardmarketu (Order #849201).' },
        { id: '2', time: '13:02:16', event: 'Middleware: Snížen stav skladu karty "Charizard ex (SIR)" na e-shopu na 0 ks.' },
        { id: '3', time: '12:45:10', event: 'E-shop API: Dokončena objednávka #10042 na e-shopu.' },
        { id: '4', time: '12:45:12', event: 'Middleware: Odeslán API request na Cardmarket k vymazání listingu pro prodané zboží. Kód stavu 200 OK.' },
        { id: '5', time: '12:45:13', event: 'Middleware Rate Limiter: Požadavek zařazen do fronty. Využití limitu API: 14/150 volání/min.' }
      ];
    } else {
      return [
        { id: '1', time: '13:02:15', event: 'Cardmarket Webhook: Sale of card "Charizard ex (SIR)" on Cardmarket (Order #849201).' },
        { id: '2', time: '13:02:16', event: 'Middleware: Stock level for card "Charizard ex (SIR)" on the e-shop reduced to 0 pcs.' },
        { id: '3', time: '12:45:10', event: 'E-shop API: Order #10042 completed on the e-shop.' },
        { id: '4', time: '12:45:12', event: 'Middleware: API request sent to Cardmarket to remove listing for sold goods. Status code 200 OK.' },
        { id: '5', time: '12:45:13', event: 'Middleware Rate Limiter: Request queued. API limit usage: 14/150 calls/min.' }
      ];
    }
  });

  const handleSimulateSync = () => {
    const timeStr = new Date().toLocaleTimeString();
    const newLog = {
      id: Math.random().toString(),
      time: timeStr,
      event: lang === 'CZ'
        ? `Simulace: Provedena kontrola skladu a synchronizace s Cardmarket API. Všechny listingy souhlasí.`
        : `Simulation: Stock check and synchronization with Cardmarket API completed. All listings match.`
    };
    setSyncLogs([newLog, ...syncLogs]);
  };

  return (
    <div style={styles.glassPanel}>
      <div style={styles.logsHeader}>
        <h2 style={styles.sectionHeading}>
          {lang === 'CZ' ? 'Cardmarket Synchronizace' : 'Cardmarket Sync'}
        </h2>
        <button className="btn btn-secondary" style={styles.syncBtn} onClick={handleSimulateSync}>
          {lang === 'CZ' ? 'Synch nyní' : 'Sync Now'}
        </button>
      </div>
      <p style={styles.desc}>
        {lang === 'CZ'
          ? 'Middleware provádí obousměrnou synchronizaci e-shopu a evropského tržiště Cardmarket k zamezení double-sellingu.'
          : 'Middleware performs bi-directional synchronization between the e-shop and the Cardmarket marketplace to prevent double-selling.'}
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
  logsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  sectionHeading: {
    fontSize: '18px',
    fontWeight: '800',
    margin: 0,
    fontFamily: 'var(--font-heading)',
    color: 'var(--text-main)',
  },
  syncBtn: {
    padding: '6px 14px',
    fontSize: '12px',
  },
  desc: {
    fontSize: '13px',
    color: 'var(--text-muted)',
    lineHeight: '1.5',
    margin: 0,
  },
  logsConsole: {
    backgroundColor: 'var(--bg-page)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    padding: '16px',
    height: '350px',
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
