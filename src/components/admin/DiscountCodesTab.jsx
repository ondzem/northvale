import { useState, useEffect } from 'react';
import { useTranslation } from '../../context/LanguageContext';
import { supabase } from '../../supabase';

export default function DiscountCodesTab({ showToast }) {
  const { lang } = useTranslation();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  // Form states
  const [newCode, setNewCode] = useState('');
  const [newPercent, setNewPercent] = useState('');

  useEffect(() => {
    loadCodes();
  }, []);

  const loadCodes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('discount_codes')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setCodes(data || []);
    } catch (err) {
      console.error(err);
      showToast(lang === 'CZ' ? 'Chyba při načítání slevových kódů.' : 'Error loading discount codes.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCode = async (e) => {
    e.preventDefault();
    if (!newCode.trim()) return;
    
    const pct = parseInt(newPercent, 10);
    if (isNaN(pct) || pct <= 0 || pct > 100) {
      showToast(lang === 'CZ' ? 'Sleva musí být v rozmezí 1% až 100%.' : 'Discount must be between 1% and 100%.', 'error');
      return;
    }

    const formattedCode = newCode.trim().toUpperCase();
    setAdding(true);

    try {
      const { error } = await supabase
        .from('discount_codes')
        .insert({
          code: formattedCode,
          discount_percent: pct,
          active: true
        });

      if (error) throw error;

      showToast(lang === 'CZ' ? 'Slevový kód byl úspěšně vytvořen.' : 'Discount code was successfully created.', 'success');
      setNewCode('');
      setNewPercent('');
      loadCodes();
    } catch (err) {
      console.error(err);
      showToast(lang === 'CZ' ? `Chyba při vytváření kódu: ${err.message}` : `Error creating code: ${err.message}`, 'error');
    } finally {
      setAdding(false);
    }
  };

  const handleToggleActive = async (id, currentStatus) => {
    try {
      const { error } = await supabase
        .from('discount_codes')
        .update({ active: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      showToast(lang === 'CZ' ? 'Stav slevového kódu byl změněn.' : 'Discount code status changed.', 'success');
      loadCodes();
    } catch (err) {
      console.error(err);
      showToast(lang === 'CZ' ? 'Nepodařilo se změnit stav kódu.' : 'Failed to update code status.', 'error');
    }
  };

  const handleDeleteCode = async (id, codeString) => {
    const confirmed = window.confirm(
      lang === 'CZ' 
        ? `Opravdu chcete smazat slevový kód "${codeString}"?` 
        : `Are you sure you want to delete discount code "${codeString}"?`
    );
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('discount_codes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      showToast(lang === 'CZ' ? 'Slevový kód byl smazán.' : 'Discount code was deleted.', 'success');
      loadCodes();
    } catch (err) {
      console.error(err);
      showToast(lang === 'CZ' ? 'Nepodařilo se smazat slevový kód.' : 'Failed to delete discount code.', 'error');
    }
  };

  return (
    <div style={{ ...styles.ctfShell, flexDirection: isMobile ? 'column' : 'row' }}>
      {/* List / Management Panel */}
      <section style={{ flex: isMobile ? 'none' : '1.4 1 0', width: isMobile ? '100%' : undefined, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(255,255,255,0.06)', padding: '20px', minWidth: isMobile ? '100%' : '320px' }}>
        <h3 style={styles.sectionHeading}>
          {lang === 'CZ' ? 'Seznam slevových kódů' : 'Discount Codes List'}
        </h3>
        
        {loading ? (
          <p style={styles.textMuted}>{lang === 'CZ' ? 'Načítání kódů...' : 'Loading codes...'}</p>
        ) : codes.length === 0 ? (
          <p style={styles.emptyText}>{lang === 'CZ' ? 'Žádné slevové kódy nebyly nalezeny.' : 'No discount codes found.'}</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.thRow}>
                  <th style={styles.th}>{lang === 'CZ' ? 'Kód' : 'Code'}</th>
                  <th style={styles.thAlignRight}>{lang === 'CZ' ? 'Výše slevy' : 'Discount'}</th>
                  <th style={styles.thCenter}>{lang === 'CZ' ? 'Aktivní' : 'Active'}</th>
                  {!isMobile && <th style={styles.thCenter}>{lang === 'CZ' ? 'Datum vytvoření' : 'Created At'}</th>}
                  <th style={styles.thAction}></th>
                </tr>
              </thead>
              <tbody>
                {codes.map(c => (
                  <tr key={c.id} style={styles.tbRow}>
                    <td style={styles.tdCode}>{c.code}</td>
                    <td style={styles.tdAlignRight}>{c.discount_percent} %</td>
                    <td style={styles.tdCenter}>
                      <button
                        type="button"
                        onClick={() => handleToggleActive(c.id, c.active)}
                        style={{
                          ...styles.badge,
                          backgroundColor: c.active ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: c.active ? '#10b981' : '#ef4444',
                        }}
                      >
                        {c.active ? (lang === 'CZ' ? 'Aktivní' : 'Active') : (lang === 'CZ' ? 'Neaktivní' : 'Inactive')}
                      </button>
                    </td>
                    {!isMobile && (
                      <td style={styles.tdCenter}>
                        {new Date(c.created_at).toLocaleDateString(lang === 'CZ' ? 'cs-CZ' : 'en-US')}
                      </td>
                    )}
                    <td style={styles.tdAction}>
                      <button
                        type="button"
                        onClick={() => handleDeleteCode(c.id, c.code)}
                        style={styles.deleteBtn}
                        title={lang === 'CZ' ? 'Smazat kód' : 'Delete Code'}
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Add New Code Panel */}
      <section style={{ flex: isMobile ? 'none' : '0.8 1 0', width: isMobile ? '100%' : undefined, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(255,255,255,0.06)', padding: '20px', minWidth: isMobile ? '100%' : '260px' }}>
        <h3 style={styles.sectionHeading}>
          {lang === 'CZ' ? 'Vytvořit nový slevový kód' : 'Create New Discount Code'}
        </h3>
        
        <form onSubmit={handleAddCode} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>
              {lang === 'CZ' ? 'Název kódu' : 'Discount Code'}
            </label>
            <input
              type="text"
              required
              className="ctf-input"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              placeholder="např. VITEJTE10"
              style={styles.input}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>
              {lang === 'CZ' ? 'Sleva v %' : 'Discount in %'}
            </label>
            <input
              type="number"
              required
              min="1"
              max="100"
              className="ctf-input"
              value={newPercent}
              onChange={(e) => setNewPercent(e.target.value)}
              placeholder="např. 10"
              style={styles.input}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={adding}
            style={{ width: '100%', padding: '10px', fontWeight: 'bold', marginTop: '12px' }}
          >
            {adding ? (lang === 'CZ' ? 'Vytváření...' : 'Creating...') : (lang === 'CZ' ? '✓ Vytvořit kód' : '✓ Create Code')}
          </button>
        </form>
      </section>
    </div>
  );
}

const styles = {
  ctfShell: {
    display: 'flex',
    gap: '24px',
    flexDirection: 'row',
    textAlign: 'left',
    width: '100%',
    boxSizing: 'border-box',
    flexWrap: 'wrap'
  },
  sectionHeading: {
    margin: '0 0 16px 0',
    fontSize: '15px',
    fontWeight: '700',
    color: 'var(--color-gold)',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    paddingBottom: '10px'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  label: {
    fontSize: '10px',
    fontWeight: '800',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '8px 12px',
    fontSize: '13px'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '12px',
    color: '#d1d1d6'
  },
  thRow: {
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.01)'
  },
  th: {
    padding: '10px 8px',
    textAlign: 'left',
    color: 'var(--text-muted)',
    fontWeight: '700'
  },
  thAlignRight: {
    padding: '10px 8px',
    textAlign: 'right',
    color: 'var(--text-muted)',
    fontWeight: '700'
  },
  thCenter: {
    padding: '10px 8px',
    textAlign: 'center',
    color: 'var(--text-muted)',
    fontWeight: '700'
  },
  thAction: {
    padding: '10px 8px',
    width: '40px'
  },
  tbRow: {
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    transition: 'background-color 0.2s'
  },
  tdCode: {
    padding: '12px 8px',
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'monospace',
    letterSpacing: '0.5px'
  },
  tdAlignRight: {
    padding: '12px 8px',
    textAlign: 'right',
    fontWeight: 'bold',
    color: 'var(--color-gold)'
  },
  tdCenter: {
    padding: '12px 8px',
    textAlign: 'center'
  },
  tdAction: {
    padding: '12px 8px',
    textAlign: 'center'
  },
  badge: {
    border: 'none',
    borderRadius: '4px',
    padding: '4px 8px',
    fontSize: '10px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'opacity 0.2s'
  },
  deleteBtn: {
    background: 'none',
    border: 'none',
    color: '#ef4444',
    cursor: 'pointer',
    fontSize: '14px',
    padding: '4px'
  },
  emptyText: {
    fontSize: '13px',
    color: 'var(--text-muted)',
    fontStyle: 'italic',
    padding: '16px 0'
  },
  textMuted: {
    color: 'var(--text-muted)',
    fontSize: '13px'
  }
};
