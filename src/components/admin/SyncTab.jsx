import { useState, useEffect } from 'react';
import { useTranslation } from '../../context/LanguageContext';
import { supabase } from '../../supabase';

export default function SyncTab() {
  const { lang } = useTranslation();
  
  // Cardmarket state
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

  // Pohoda state
  const [pohodaLogs, setPohodaLogs] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  // Načtení reálných logů z databáze
  const fetchPohodaLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('pohoda_sync_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setPohodaLogs(data || []);
    } catch (err) {
      console.error('Error fetching Pohoda logs:', err);
    }
  };

  useEffect(() => {
    fetchPohodaLogs();
    
    // Zapneme realtime odběr pro nové logy
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'pohoda_sync_log' },
        () => {
          fetchPohodaLogs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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

  // Volání Edge Function pro import zásob
  const handlePohodaSync = async () => {
    setIsSyncing(true);
    setMessage({ text: '', type: '' });
    try {
      const { data, error } = await supabase.functions.invoke('pohoda-connector', {
        body: { action: 'import-stock' }
      });

      if (error) throw error;

      if (data?.success) {
        const summary = data.summary;
        const msg = lang === 'CZ'
          ? `Sklad úspěšně synchronizován. Zpracováno ${summary.totalItems} položek (Aktualizováno: ${summary.updatedProducts} produktů, ${summary.updatedVariants} variant).`
          : `Stock sync successful. Processed ${summary.totalItems} items (Updated: ${summary.updatedProducts} products, ${summary.updatedVariants} variants).`;
        setMessage({ text: msg, type: 'success' });
      } else {
        throw new Error(data?.error || 'Unknown sync error');
      }
    } catch (err) {
      const errMsg = err.message || String(err);
      setMessage({
        text: lang === 'CZ' ? `Synchronizace selhala: ${errMsg}` : `Sync failed: ${errMsg}`,
        type: 'error'
      });
    } finally {
      setIsSyncing(false);
      fetchPohodaLogs();
    }
  };

  // Volání Edge Function pro test FTP
  const handlePohodaTest = async () => {
    setIsTesting(true);
    setMessage({ text: '', type: '' });
    try {
      const { data, error } = await supabase.functions.invoke('pohoda-connector', {
        body: { action: 'test-connection' }
      });

      if (error) throw error;

      if (data?.success) {
        setMessage({
          text: lang === 'CZ' ? 'Připojení k FTP serveru je plně funkční!' : 'Connection to FTP server is fully operational!',
          type: 'success'
        });
      } else {
        throw new Error(data?.error || 'Connection failed');
      }
    } catch (err) {
      const errMsg = err.message || String(err);
      setMessage({
        text: lang === 'CZ' ? `Chyba připojení k FTP: ${errMsg}` : `FTP connection error: ${errMsg}`,
        type: 'error'
      });
    } finally {
      setIsTesting(false);
      fetchPohodaLogs();
    }
  };

  return (
    <div style={styles.container}>
      
      {/* POHODA PANEL */}
      {import.meta.env.VITE_ENABLE_POHODA_SYNC === 'true' ? (
        <div style={styles.glassPanel}>
          <div style={styles.logsHeader}>
            <h2 style={styles.sectionHeading}>
              {lang === 'CZ' ? 'Účetnictví POHODA (FTP)' : 'POHODA Accounting (FTP)'}
            </h2>
            <div style={styles.btnGroup}>
              <button 
                className="btn btn-secondary" 
                style={styles.testBtn} 
                onClick={handlePohodaTest}
                disabled={isTesting || isSyncing}
              >
                {isTesting ? (lang === 'CZ' ? 'Testuji...' : 'Testing...') : (lang === 'CZ' ? 'Test FTP' : 'Test FTP')}
              </button>
              <button 
                className="btn btn-primary" 
                style={styles.syncBtn} 
                onClick={handlePohodaSync}
                disabled={isSyncing || isTesting}
              >
                {isSyncing ? (lang === 'CZ' ? 'Synchronizuji...' : 'Syncing...') : (lang === 'CZ' ? 'Synch Sklad nyní' : 'Sync Stock Now')}
              </button>
            </div>
          </div>
          
          <p style={styles.desc}>
            {lang === 'CZ'
              ? 'Načítá aktuální stav zásob a ceny z FTP serveru (/pohoda/export/zasoby.xml) vyexportované z Pohody a páruje je podle SKU.'
              : 'Fetches current stock levels and prices from the FTP server (/pohoda/export/zasoby.xml) exported from Pohoda, pairing by SKU.'}
          </p>

          {message.text && (
            <div style={{
              ...styles.alert,
              backgroundColor: message.type === 'success' ? 'rgba(46, 204, 113, 0.15)' : 'rgba(231, 76, 60, 0.15)',
              borderColor: message.type === 'success' ? '#2ecc71' : '#e74c3c',
              color: message.type === 'success' ? '#2ecc71' : '#e74c3c'
            }}>
              {message.text}
            </div>
          )}

          <div style={styles.logsConsole}>
            {pohodaLogs.length === 0 ? (
              <div style={styles.logEmpty}>
                {lang === 'CZ' ? 'Žádné záznamy o synchronizaci v logu.' : 'No sync records found in the log.'}
              </div>
            ) : (
              pohodaLogs.map(log => {
                const logTime = new Date(log.created_at).toLocaleTimeString();
                const logDate = new Date(log.created_at).toLocaleDateString();
                const isError = log.status === 'ERROR';
                const isWarning = log.status === 'WARNING';
                return (
                  <div key={log.id} style={styles.logRow}>
                    <span style={styles.logTime}>[{logDate} {logTime}]</span>
                    <span style={{
                      ...styles.logStatus,
                      color: isError ? '#e74c3c' : isWarning ? '#f1c40f' : '#2ecc71'
                    }}>
                      [{log.direction}][{log.status}]
                    </span>
                    <span style={styles.logEvent}>{log.message}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        <div style={styles.glassPanel}>
          <div style={styles.logsHeader}>
            <h2 style={styles.sectionHeading}>
              {lang === 'CZ' ? 'Účetnictví POHODA (Režim spánku)' : 'POHODA Accounting (Sleep Mode)'}
            </h2>
            <span style={{
              fontSize: '11px',
              fontWeight: '700',
              color: '#8a8a93',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              padding: '4px 10px',
              borderRadius: '12px',
              border: '1px solid var(--border)'
            }}>
              {lang === 'CZ' ? 'Mimo provoz' : 'Offline'}
            </span>
          </div>
          <p style={styles.desc}>
            {lang === 'CZ'
              ? 'Propojení na Pohodu je aktuálně vypnuté, e-shop běží v samostatném režimu. Reaktivaci lze provést změnou konfigurace.'
              : 'Pohoda connection is currently disabled; the e-shop is running in standalone mode. It can be re-enabled via configuration.'}
          </p>
        </div>
      )}

      {/* CARDMARKET PANEL */}
      <div style={styles.glassPanel}>
        <div style={styles.logsHeader}>
          <h2 style={styles.sectionHeading}>
            {lang === 'CZ' ? 'Cardmarket Synchronizace (API)' : 'Cardmarket Sync (API)'}
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

    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    width: '100%'
  },
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
  btnGroup: {
    display: 'flex',
    gap: '8px',
  },
  testBtn: {
    padding: '6px 14px',
    fontSize: '12px',
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
  alert: {
    padding: '12px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid',
    fontSize: '12px',
    fontWeight: '500',
  },
  logsConsole: {
    backgroundColor: 'var(--bg-page)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    padding: '16px',
    height: '250px',
    overflowY: 'auto',
    fontFamily: 'monospace',
    fontSize: '11px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  logRow: {
    display: 'flex',
    flexDirection: 'row',
    gap: '8px',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
  },
  logTime: {
    color: 'var(--color-gold)',
    fontWeight: '700',
    whiteSpace: 'nowrap'
  },
  logStatus: {
    fontWeight: '700',
    whiteSpace: 'nowrap'
  },
  logEvent: {
    color: 'var(--text-main)',
    textAlign: 'left',
    flex: '1',
    minWidth: '200px'
  },
  logEmpty: {
    color: 'var(--text-muted)',
    textAlign: 'center',
    padding: '40px 0',
  }
};

