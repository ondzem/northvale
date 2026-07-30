import { useState, useEffect } from 'react';
import { useTranslation } from '../../context/LanguageContext';
import { supabase } from '../../supabase';
import { getDiscountCodeStatus, formatCzechDate } from '../../services/discountService';

export default function DiscountCodesTab({ showToast }) {
  const { lang } = useTranslation();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [isSmallScreen, setIsSmallScreen] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
      setIsSmallScreen(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  // Advanced Form states
  const [newCode, setNewCode] = useState('');
  const [newDiscountType, setNewDiscountType] = useState('percent'); // 'percent' | 'fixed'
  const [newDiscountValue, setNewDiscountValue] = useState('');
  const [newValidFrom, setNewValidFrom] = useState('');
  const [newValidUntil, setNewValidUntil] = useState('');
  const [newMaxUses, setNewMaxUses] = useState('');

  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, id: null, codeString: '' });

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

    const val = parseFloat(newDiscountValue);
    if (isNaN(val) || val <= 0) {
      showToast(lang === 'CZ' ? 'Hodnota slevy musí být větší než 0.' : 'Discount value must be greater than 0.', 'error');
      return;
    }

    if (newDiscountType === 'percent' && val > 100) {
      showToast(lang === 'CZ' ? 'Procentuální sleva nemůže být vyšší než 100%.' : 'Percentage discount cannot exceed 100%.', 'error');
      return;
    }

    // Validate date range if both provided
    if (newValidFrom && newValidUntil && newValidFrom > newValidUntil) {
      showToast(lang === 'CZ' ? 'Datum konce platnosti musí být po datumu začátku.' : 'End date must be after start date.', 'error');
      return;
    }

    const formattedCode = newCode.trim().toUpperCase();
    const parsedMaxUses = newMaxUses !== '' ? parseInt(newMaxUses, 10) : null;

    setAdding(true);

    try {
      const payload = {
        code: formattedCode,
        discount_type: newDiscountType,
        discount_value: val,
        discount_percent: newDiscountType === 'percent' ? val : null,
        valid_from: newValidFrom || null,
        valid_until: newValidUntil || null,
        max_uses: parsedMaxUses,
        used_count: 0,
        is_active: true,
        active: true
      };

      const { error } = await supabase
        .from('discount_codes')
        .insert(payload);

      if (error) throw error;

      showToast(lang === 'CZ' ? 'Slevový kód byl úspěšně vytvořen.' : 'Discount code was successfully created.', 'success');
      setNewCode('');
      setNewDiscountType('percent');
      setNewDiscountValue('');
      setNewValidFrom('');
      setNewValidUntil('');
      setNewMaxUses('');
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
      const newStatus = !currentStatus;
      const { error } = await supabase
        .from('discount_codes')
        .update({
          is_active: newStatus,
          active: newStatus
        })
        .eq('id', id);

      if (error) throw error;

      showToast(lang === 'CZ' ? 'Stav slevového kódu byl změněn.' : 'Discount code status changed.', 'success');
      loadCodes();
    } catch (err) {
      console.error(err);
      showToast(lang === 'CZ' ? 'Nepodařilo se změnit stav kódu.' : 'Failed to update code status.', 'error');
    }
  };

  const requestDeleteCode = (id, codeString) => {
    setDeleteConfirm({ isOpen: true, id, codeString });
  };

  const executeDeleteCode = async () => {
    const { id } = deleteConfirm;
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from('discount_codes')
        .delete()
        .eq('id', id)
        .select();

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error('No rows deleted. Check Row Level Security (RLS) policies.');
      }

      showToast(lang === 'CZ' ? 'Slevový kód byl smazán.' : 'Discount code was deleted.', 'success');
      loadCodes();
    } catch (err) {
      console.error('Delete discount code error:', err);
      showToast(lang === 'CZ' ? 'Nepodařilo se smazat slevový kód. Ověřte svá administrátorská práva.' : 'Failed to delete discount code. Verify your administrator permissions.', 'error');
    } finally {
      setDeleteConfirm({ isOpen: false, id: null, codeString: '' });
    }
  };

  return (
    <div style={{ ...styles.ctfShell, flexDirection: isMobile ? 'column' : 'row' }}>
      {/* List / Management Panel */}
      <section style={{ 
        flex: isMobile ? 'none' : '1.4 1 0', 
        width: isMobile ? '100%' : undefined, 
        background: 'var(--bg-secondary, #141418)', 
        borderRadius: '16px', 
        border: '1px solid rgba(255,255,255,0.08)', 
        padding: isMobile ? '16px' : '24px', 
        minWidth: isMobile ? '100%' : '320px',
        boxShadow: '0 12px 32px rgba(0,0,0,0.3)',
        boxSizing: 'border-box'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <h3 style={styles.sectionHeading}>
              {lang === 'CZ' ? 'Seznam slevových kódů' : 'Discount Codes List'}
            </h3>
            <div style={styles.subtitle}>
              {lang === 'CZ' ? 'Přehled všech vytvořených kódů, jejich stavu a čerpání' : 'Overview of all created codes, status and usage'}
            </div>
          </div>
          <span style={styles.totalBadge}>
            {codes.length} {lang === 'CZ' ? (codes.length === 1 ? 'kód' : codes.length < 5 ? 'kódy' : 'kódů') : 'codes'}
          </span>
        </div>
        
        {loading ? (
          <p style={styles.textMuted}>{lang === 'CZ' ? 'Načítání kódů...' : 'Loading codes...'}</p>
        ) : codes.length === 0 ? (
          <p style={styles.emptyText}>{lang === 'CZ' ? 'Žádné slevové kódy nebyly nalezeny.' : 'No discount codes found.'}</p>
        ) : isSmallScreen ? (
          /* Mobile / Small Screen Card Layout */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {codes.map(c => {
              const statusInfo = getDiscountCodeStatus(c, lang);
              const displayValue = c.discount_type === 'fixed'
                ? `${c.discount_value || 0} Kč`
                : `${c.discount_value || c.discount_percent || 0} %`;
              const maxUsesDisplay = c.max_uses !== null && c.max_uses !== undefined && c.max_uses !== ''
                ? `${c.used_count || 0} / ${c.max_uses}`
                : `${c.used_count || 0} / ∞`;
              const validFromText = c.valid_from ? formatCzechDate(c.valid_from) : '—';
              const validUntilText = c.valid_until ? formatCzechDate(c.valid_until) : '—';
              const isActive = c.is_active !== undefined ? c.is_active : c.active;

              return (
                <div 
                  key={c.id} 
                  style={{
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '12px',
                    padding: '14px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '16px', fontWeight: '800', color: 'var(--color-gold, #fdbd16)', letterSpacing: '0.5px' }}>
                      {c.code}
                    </span>
                    <span style={{ fontSize: '15px', fontWeight: '700', color: '#ffffff' }}>
                      {displayValue}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => handleToggleActive(c.id, isActive)}
                      style={{
                        ...styles.badge,
                        backgroundColor: statusInfo.bg,
                        color: statusInfo.color,
                        cursor: 'pointer'
                      }}
                      title={lang === 'CZ' ? 'Kliknutím změníte aktivitu' : 'Click to toggle activity'}
                    >
                      {statusInfo.label}
                    </button>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>
                      {lang === 'CZ' ? 'Čerpání: ' : 'Usage: '}
                      <strong style={{ color: 'var(--color-gold, #fdbd16)' }}>{maxUsesDisplay}</strong>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>
                      📅 {c.valid_from || c.valid_until ? `${validFromText} ➔ ${validUntilText}` : (lang === 'CZ' ? 'Neomezená platnost' : 'Unlimited validity')}
                    </span>
                    <button
                      type="button"
                      onClick={() => requestDeleteCode(c.id, c.code)}
                      style={styles.deleteBtn}
                      title={lang === 'CZ' ? 'Smazat kód' : 'Delete Code'}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Desktop / Tablet Table Layout */
          <div style={{ overflowX: 'auto', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.thRow}>
                  <th style={styles.th}>{lang === 'CZ' ? 'Kód' : 'Code'}</th>
                  <th style={styles.thAlignRight}>{lang === 'CZ' ? 'Sleva' : 'Discount'}</th>
                  <th style={styles.thCenter}>{lang === 'CZ' ? 'Stav platnosti' : 'Status'}</th>
                  <th style={styles.thCenter}>{lang === 'CZ' ? 'Čerpání' : 'Usage'}</th>
                  <th style={styles.thCenter}>{lang === 'CZ' ? 'Platnost (Od – Do)' : 'Validity Period'}</th>
                  <th style={styles.thAction}></th>
                </tr>
              </thead>
              <tbody>
                {codes.map(c => {
                  const statusInfo = getDiscountCodeStatus(c, lang);
                  const displayValue = c.discount_type === 'fixed'
                    ? `${c.discount_value || 0} Kč`
                    : `${c.discount_value || c.discount_percent || 0} %`;
                  const maxUsesDisplay = c.max_uses !== null && c.max_uses !== undefined && c.max_uses !== ''
                    ? `${c.used_count || 0} / ${c.max_uses}`
                    : `${c.used_count || 0} / ∞`;
                  const validFromText = c.valid_from ? formatCzechDate(c.valid_from) : '—';
                  const validUntilText = c.valid_until ? formatCzechDate(c.valid_until) : '—';
                  const isActive = c.is_active !== undefined ? c.is_active : c.active;

                  return (
                    <tr key={c.id} style={styles.tbRow}>
                      <td style={styles.tdCode}>{c.code}</td>
                      <td style={styles.tdAlignRight}>{displayValue}</td>
                      <td style={styles.tdCenter}>
                        <button
                          type="button"
                          onClick={() => handleToggleActive(c.id, isActive)}
                          style={{
                            ...styles.badge,
                            backgroundColor: statusInfo.bg,
                            color: statusInfo.color,
                            cursor: 'pointer'
                          }}
                          title={lang === 'CZ' ? 'Kliknutím změníte aktivitu' : 'Click to toggle activity'}
                        >
                          {statusInfo.label}
                        </button>
                      </td>
                      <td style={styles.tdCenter}>
                        <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--color-gold, #fdbd16)' }}>
                          {maxUsesDisplay}
                        </span>
                      </td>
                      <td style={styles.tdCenter}>
                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)' }}>
                          {c.valid_from || c.valid_until ? `${validFromText} ➔ ${validUntilText}` : (lang === 'CZ' ? 'Neomezeně' : 'Unlimited')}
                        </span>
                      </td>
                      <td style={styles.tdAction}>
                        <button
                          type="button"
                          onClick={() => requestDeleteCode(c.id, c.code)}
                          style={styles.deleteBtn}
                          title={lang === 'CZ' ? 'Smazat kód' : 'Delete Code'}
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Add New Code Panel - Modern Luxury Grouped Layout */}
      <section style={{ 
        flex: isMobile ? 'none' : '1 1 0', 
        width: isMobile ? '100%' : undefined, 
        background: 'var(--bg-secondary, #141418)', 
        borderRadius: '16px', 
        border: '1px solid rgba(255,255,255,0.08)', 
        padding: isMobile ? '16px' : '24px', 
        minWidth: isMobile ? '100%' : '320px',
        boxShadow: '0 12px 32px rgba(0,0,0,0.3)'
      }}>
        <div style={{ marginBottom: '20px' }}>
          <h3 style={styles.sectionHeading}>
            {lang === 'CZ' ? 'Vytvořit slevový kód' : 'Create Discount Code'}
          </h3>
          <div style={styles.subtitle}>
            {lang === 'CZ' ? 'Konfigurace hodnoty, platnosti a kapacitního limitu' : 'Configure value, validity date range and usage capacity limit'}
          </div>
        </div>
        
        <form onSubmit={handleAddCode} style={styles.form}>
          {/* GROUP 1: Code Name & Discount Amount */}
          <div style={styles.cardGroup}>
            <div style={styles.groupHeading}>
              <span style={styles.groupIcon}>📌</span>
              <span>{lang === 'CZ' ? '1. Základní nastavení' : '1. Basic Settings'}</span>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>
                {lang === 'CZ' ? 'Název slevového kódu' : 'Discount Code Name'}
              </label>
              <input
                type="text"
                required
                className="ctf-input"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                placeholder="např. LETO2026 nebo SLEVA100"
                style={styles.input}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '12px' }}>
              <div style={{ ...styles.field, flex: 1 }}>
                <label style={styles.label}>
                  {lang === 'CZ' ? 'Typ slevy' : 'Discount Type'}
                </label>
                <select
                  className="ctf-input"
                  value={newDiscountType}
                  onChange={(e) => setNewDiscountType(e.target.value)}
                  style={styles.selectInput}
                >
                  <option value="percent">% Procentuální sleva</option>
                  <option value="fixed">Kč Pevná částka</option>
                </select>
              </div>

              <div style={{ ...styles.field, flex: 1 }}>
                <label style={styles.label}>
                  {lang === 'CZ' ? (newDiscountType === 'percent' ? 'Výše slevy (%)' : 'Výše slevy (Kč)') : (newDiscountType === 'percent' ? 'Discount (%)' : 'Discount (CZK)')}
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  step="any"
                  className="ctf-input"
                  value={newDiscountValue}
                  onChange={(e) => setNewDiscountValue(e.target.value)}
                  placeholder={newDiscountType === 'percent' ? '10' : '200'}
                  style={styles.input}
                />
              </div>
            </div>
          </div>

          {/* GROUP 2: Date Range Limits */}
          <div style={styles.cardGroup}>
            <div style={styles.groupHeading}>
              <span style={styles.groupIcon}>📅</span>
              <span>{lang === 'CZ' ? '2. Časové rozmezí platnosti (Volitelné)' : '2. Validity Date Range (Optional)'}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '12px' }}>
              <div style={{ ...styles.field, flex: 1 }}>
                <label style={styles.label}>
                  {lang === 'CZ' ? 'Platí OD dátumu' : 'Valid FROM date'}
                </label>
                <input
                  type="date"
                  className="ctf-input"
                  value={newValidFrom}
                  onChange={(e) => setNewValidFrom(e.target.value)}
                  style={styles.dateInput}
                />
              </div>

              <div style={{ ...styles.field, flex: 1 }}>
                <label style={styles.label}>
                  {lang === 'CZ' ? 'Platí DO dátumu' : 'Valid UNTIL date'}
                </label>
                <input
                  type="date"
                  className="ctf-input"
                  value={newValidUntil}
                  onChange={(e) => setNewValidUntil(e.target.value)}
                  style={styles.dateInput}
                />
              </div>
            </div>
          </div>

          {/* GROUP 3: Usage Capacity Limit */}
          <div style={styles.cardGroup}>
            <div style={styles.groupHeading}>
              <span style={styles.groupIcon}>🔢</span>
              <span>{lang === 'CZ' ? '3. Limit počtu použití (Volitelné)' : '3. Usage Capacity Limit (Optional)'}</span>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>
                {lang === 'CZ' ? 'Max. počet použití celkem' : 'Max usage capacity limit'}
              </label>
              <input
                type="number"
                min="1"
                className="ctf-input"
                value={newMaxUses}
                onChange={(e) => setNewMaxUses(e.target.value)}
                placeholder={lang === 'CZ' ? 'Nechte prázdné pro neomezený kód' : 'Leave empty for unlimited code'}
                style={styles.input}
              />
              <div style={styles.tipBox}>
                <span>💡</span>
                <span>
                  {lang === 'CZ'
                    ? 'Zadejte "1" pro jednorázový slevový kód s automatickým blokováním po 1 použití.'
                    : 'Enter "1" for a single-use promo code with device redemption protection.'}
                </span>
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={adding}
            style={styles.submitBtn}
          >
            {adding ? (lang === 'CZ' ? 'Vytváření...' : 'Creating...') : (lang === 'CZ' ? '✓ Vytvořit slevový kód' : '✓ Create Discount Code')}
          </button>
        </form>
      </section>

      {/* Delete Confirmation Modal */}
      {deleteConfirm.isOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: 'var(--bg-secondary, #141416)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '380px',
            width: '90%',
            boxShadow: '0 20px 50px rgba(0,0,0,0.6)'
          }}>
            <h4 style={{ fontSize: '16px', fontWeight: 'bold', color: '#fff', margin: '0 0 10px 0' }}>
              {lang === 'CZ' ? 'Smazat slevový kód?' : 'Delete Discount Code?'}
            </h4>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', margin: '0 0 20px 0', lineHeight: '1.5' }}>
              {lang === 'CZ'
                ? `Opravdu chcete smazat slevový kód "${deleteConfirm.codeString}"?`
                : `Are you sure you want to delete discount code "${deleteConfirm.codeString}"?`}
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '6px 12px', fontSize: '12px' }}
                onClick={() => setDeleteConfirm({ isOpen: false, id: null, codeString: '' })}
              >
                {lang === 'CZ' ? 'Zrušit' : 'Cancel'}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ background: '#ef4444', color: '#fff', padding: '6px 12px', fontSize: '12px' }}
                onClick={executeDeleteCode}
              >
                {lang === 'CZ' ? 'Smazat' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  ctfShell: {
    display: 'flex',
    gap: '24px',
    width: '100%',
    boxSizing: 'border-box'
  },
  sectionHeading: {
    fontSize: '18px',
    fontWeight: '800',
    color: 'var(--text-main, #ffffff)',
    margin: 0,
    letterSpacing: '-0.3px'
  },
  subtitle: {
    fontSize: '12px',
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: '4px'
  },
  totalBadge: {
    fontSize: '11px',
    fontWeight: '700',
    padding: '4px 10px',
    borderRadius: '12px',
    background: 'rgba(253, 189, 22, 0.1)',
    color: 'var(--color-gold, #fdbd16)',
    border: '1px solid rgba(253, 189, 22, 0.25)'
  },
  textMuted: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: '14px'
  },
  emptyText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: '14px',
    fontStyle: 'italic'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '13px'
  },
  thRow: {
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(0,0,0,0.2)'
  },
  th: {
    textAlign: 'left',
    padding: '12px 10px',
    color: 'rgba(255,255,255,0.65)',
    fontWeight: '700',
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  thAlignRight: {
    textAlign: 'right',
    padding: '12px 10px',
    color: 'rgba(255,255,255,0.65)',
    fontWeight: '700',
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  thCenter: {
    textAlign: 'center',
    padding: '12px 10px',
    color: 'rgba(255,255,255,0.65)',
    fontWeight: '700',
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  thAction: {
    width: '40px',
    padding: '12px 10px'
  },
  tbRow: {
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    transition: 'background 0.2s'
  },
  tdCode: {
    padding: '12px 10px',
    fontWeight: '800',
    color: 'var(--color-gold, #fdbd16)',
    letterSpacing: '0.5px',
    fontSize: '14px'
  },
  tdAlignRight: {
    padding: '12px 10px',
    textAlign: 'right',
    fontWeight: '700',
    color: '#ffffff'
  },
  tdCenter: {
    padding: '12px 10px',
    textAlign: 'center'
  },
  tdAction: {
    padding: '12px 10px',
    textAlign: 'right'
  },
  badge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '700',
    border: 'none',
    outline: 'none'
  },
  deleteBtn: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '15px',
    opacity: 0.7,
    transition: 'opacity 0.2s',
    padding: '4px'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  cardGroup: {
    background: 'rgba(0, 0, 0, 0.25)',
    border: '1px solid rgba(255, 255, 255, 0.07)',
    borderRadius: '12px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  groupHeading: {
    fontSize: '13px',
    fontWeight: '700',
    color: 'var(--color-gold, #fdbd16)',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '2px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  groupIcon: {
    fontSize: '14px'
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  label: {
    fontSize: '12px',
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.85)'
  },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '10px 14px',
    borderRadius: '8px',
    background: 'rgba(10, 10, 14, 0.6)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    color: '#ffffff',
    fontSize: '13px',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    colorScheme: 'dark'
  },
  selectInput: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '10px 14px',
    borderRadius: '8px',
    background: 'rgba(10, 10, 14, 0.85) url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23fdbd16\' stroke-width=\'2.5\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'%3E%3C/polyline%3E%3C/svg%3E") no-repeat right 12px center',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    color: '#ffffff',
    fontSize: '13px',
    outline: 'none',
    appearance: 'none',
    WebkitAppearance: 'none',
    MozAppearance: 'none',
    cursor: 'pointer',
    colorScheme: 'dark'
  },
  dateInput: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '10px 14px',
    borderRadius: '8px',
    background: 'rgba(10, 10, 14, 0.6)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    color: '#ffffff',
    fontSize: '13px',
    outline: 'none',
    cursor: 'pointer',
    colorScheme: 'dark'
  },
  tipBox: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
    padding: '8px 12px',
    borderRadius: '6px',
    background: 'rgba(253, 189, 22, 0.06)',
    border: '1px solid rgba(253, 189, 22, 0.15)',
    fontSize: '11px',
    color: 'rgba(255, 255, 255, 0.65)',
    lineHeight: '1.4',
    marginTop: '2px'
  },
  submitBtn: {
    width: '100%',
    padding: '14px',
    fontWeight: '800',
    fontSize: '14px',
    borderRadius: '10px',
    letterSpacing: '0.3px',
    boxShadow: '0 6px 20px rgba(253, 189, 22, 0.25)',
    transition: 'transform 0.15s, box-shadow 0.15s'
  }
};
