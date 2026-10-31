import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from '../../context/LanguageContext';
import { supabase } from '../../supabase';
import { getDiscountCodeStatus, formatCzechDate } from '../../services/discountService';
import { fetchCategoriesFromDB } from '../../services/categories';

export default function DiscountCodesTab({ showToast }) {
  const { lang } = useTranslation();
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  // Advanced Form states
  const [newCode, setNewCode] = useState('');
  const [newDiscountType, setNewDiscountType] = useState('percent'); // 'percent' | 'fixed'
  const [newDiscountValue, setNewDiscountValue] = useState('');
  const [newValidFrom, setNewValidFrom] = useState('');
  const [newValidUntil, setNewValidUntil] = useState('');
  const [newMaxUses, setNewMaxUses] = useState('');
  // Rozsah kódu: 'all' | 'products' | 'categories'
  const [newScope, setNewScope] = useState('all');
  const [newScopeIds, setNewScopeIds] = useState([]);
  const [scopeSearch, setScopeSearch] = useState('');
  const [allProducts, setAllProducts] = useState([]);
  const [allCategories, setAllCategories] = useState([]);

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

  useEffect(() => {
    supabase.from('products').select('id, name').order('name')
      .then(({ data }) => setAllProducts(data || []));
    fetchCategoriesFromDB().then(data => setAllCategories(data || []));
  }, []);

  const categoryPath = (cat) => {
    const names = [];
    for (let c = cat, guard = 0; c && guard < 6; guard++) {
      names.unshift(lang === 'CZ' ? c.name_cz : c.name_en);
      c = allCategories.find(x => x.id === c.parent_id);
    }
    return names.join(' › ');
  };

  // Vybraná kategorie zahrnuje i své podkategorie — produkty mají jen tu nejnižší.
  const withDescendants = (ids) => {
    const result = new Set(ids);
    for (let grew = true; grew;) {
      grew = false;
      for (const c of allCategories) {
        if (c.parent_id && result.has(c.parent_id) && !result.has(c.id)) {
          result.add(c.id);
          grew = true;
        }
      }
    }
    return [...result];
  };

  const scopeOptions = (newScope === 'products'
    ? allProducts.map(p => ({ id: p.id, label: p.name }))
    : allCategories.map(c => ({ id: c.id, label: categoryPath(c) })).sort((a, b) => a.label.localeCompare(b.label, 'cs'))
  ).filter(o => o.label.toLowerCase().includes(scopeSearch.trim().toLowerCase()));

  const toggleScopeId = (id) => {
    setNewScopeIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  const scopeLabel = (c) => {
    if (c.scope === 'products') {
      const n = (c.scope_products || []).length;
      return lang === 'CZ' ? `Vybrané produkty (${n})` : `Selected products (${n})`;
    }
    if (c.scope === 'categories') {
      const ids = c.scope_categories || [];
      return allCategories.filter(x => ids.includes(x.id) && !ids.includes(x.parent_id)).map(categoryPath).join(', ');
    }
    return lang === 'CZ' ? 'Celý košík' : 'Whole cart';
  };

  const validityLabel = (c) => {
    if (c.valid_from && c.valid_until) return `${formatCzechDate(c.valid_from)} – ${formatCzechDate(c.valid_until)}`;
    if (c.valid_from) return `${lang === 'CZ' ? 'od' : 'from'} ${formatCzechDate(c.valid_from)}`;
    if (c.valid_until) return `${lang === 'CZ' ? 'do' : 'until'} ${formatCzechDate(c.valid_until)}`;
    return lang === 'CZ' ? 'Bez omezení' : 'No limit';
  };

  const usageLabel = (c) => {
    const limited = c.max_uses !== null && c.max_uses !== undefined && c.max_uses !== '';
    return limited ? `${c.used_count || 0} / ${c.max_uses}` : `${c.used_count || 0}×`;
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

    if (newScope !== 'all' && newScopeIds.length === 0) {
      showToast(lang === 'CZ' ? 'Vyberte aspoň jeden produkt nebo kategorii.' : 'Select at least one product or category.', 'error');
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
        scope: newScope,
        scope_products: newScope === 'products' ? newScopeIds : [],
        scope_categories: newScope === 'categories' ? withDescendants(newScopeIds) : [],
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
      setNewScope('all');
      setNewScopeIds([]);
      setScopeSearch('');
      setFormOpen(false);
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

  const cz = lang === 'CZ';

  return (
    <div className="dct">
      <style>{DCT_CSS}</style>

      <div className="dct-head">
        <div>
          <h3 className="dct-title">{cz ? 'Slevové kódy' : 'Discount Codes'}</h3>
          <p className="dct-sub">
            {cz ? `${codes.length} ${codes.length === 1 ? 'kód' : codes.length > 1 && codes.length < 5 ? 'kódy' : 'kódů'} celkem` : `${codes.length} codes in total`}
          </p>
        </div>
        <button type="button" className="btn btn-primary dct-new" onClick={() => setFormOpen(true)}>
          {cz ? 'Nový kód' : 'New code'}
        </button>
      </div>

      {loading ? (
        <p className="dct-empty">{cz ? 'Načítání kódů…' : 'Loading codes…'}</p>
      ) : codes.length === 0 ? (
        <p className="dct-empty">{cz ? 'Zatím žádné slevové kódy.' : 'No discount codes yet.'}</p>
      ) : (
        <ul className="dct-list">
          {codes.map(c => {
            const statusInfo = getDiscountCodeStatus(c, lang);
            const isActive = c.is_active !== undefined ? c.is_active : c.active;
            const value = c.discount_type === 'fixed'
              ? `${c.discount_value || 0} Kč`
              : `${c.discount_value || c.discount_percent || 0} %`;
            return (
              <li className="dct-row" key={c.id}>
                <div className="dct-main">
                  <div className="dct-code">{c.code}</div>
                  <dl className="dct-meta">
                    <div><dt>{cz ? 'Platí na' : 'Applies to'}</dt><dd>{scopeLabel(c)}</dd></div>
                    <div><dt>{cz ? 'Platnost' : 'Valid'}</dt><dd>{validityLabel(c)}</dd></div>
                    <div><dt>{cz ? 'Použito' : 'Used'}</dt><dd>{usageLabel(c)}</dd></div>
                  </dl>
                </div>
                <div className="dct-value">{value}</div>
                <div className="dct-actions">
                  <button
                    type="button"
                    className="dct-status"
                    style={{ backgroundColor: statusInfo.bg, color: statusInfo.color }}
                    onClick={() => handleToggleActive(c.id, isActive)}
                    title={cz ? 'Kliknutím změníte aktivitu' : 'Click to toggle activity'}
                  >
                    {statusInfo.label}
                  </button>
                  <button
                    type="button"
                    className="dct-delete"
                    onClick={() => requestDeleteCode(c.id, c.code)}
                    aria-label={cz ? `Smazat kód ${c.code}` : `Delete code ${c.code}`}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v5M14 11v5" />
                    </svg>
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {formOpen && createPortal(
        <div className="dct-overlay">
          <form className="dct-modal" onSubmit={handleAddCode}>
            <div className="dct-modal-head">
              <h3 className="dct-title">{cz ? 'Nový slevový kód' : 'New discount code'}</h3>
              <button type="button" className="dct-close" onClick={() => setFormOpen(false)} aria-label={cz ? 'Zavřít' : 'Close'}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
            </div>

            <div className="dct-modal-body">
              <section className="dct-section">
                <h4>{cz ? 'Sleva' : 'Discount'}</h4>
                <label className="dct-field dct-full">
                  <span>{cz ? 'Název kódu' : 'Code name'}</span>
                  <input
                    type="text"
                    required
                    className="dct-input"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                    placeholder={cz ? 'např. LETO2026' : 'e.g. SUMMER2026'}
                  />
                </label>
                <label className="dct-field">
                  <span>{cz ? 'Typ slevy' : 'Discount type'}</span>
                  <select className="dct-input" value={newDiscountType} onChange={(e) => setNewDiscountType(e.target.value)}>
                    <option value="percent">{cz ? 'Procenta' : 'Percent'}</option>
                    <option value="fixed">{cz ? 'Pevná částka' : 'Fixed amount'}</option>
                  </select>
                </label>
                <label className="dct-field">
                  <span>{newDiscountType === 'percent' ? (cz ? 'Výše slevy (%)' : 'Amount (%)') : (cz ? 'Výše slevy (Kč)' : 'Amount (CZK)')}</span>
                  <input
                    type="number"
                    required
                    min="1"
                    step="any"
                    className="dct-input"
                    value={newDiscountValue}
                    onChange={(e) => setNewDiscountValue(e.target.value)}
                    placeholder={newDiscountType === 'percent' ? '10' : '200'}
                  />
                </label>
              </section>

              <section className="dct-section">
                <h4>{cz ? 'Platnost' : 'Validity'}</h4>
                <label className="dct-field">
                  <span>{cz ? 'Platí od' : 'Valid from'}</span>
                  <input type="date" className="dct-input" value={newValidFrom} onChange={(e) => setNewValidFrom(e.target.value)} />
                </label>
                <label className="dct-field">
                  <span>{cz ? 'Platí do' : 'Valid until'}</span>
                  <input type="date" className="dct-input" value={newValidUntil} onChange={(e) => setNewValidUntil(e.target.value)} />
                </label>
                <label className="dct-field dct-full">
                  <span>{cz ? 'Maximální počet použití' : 'Maximum uses'}</span>
                  <input
                    type="number"
                    min="1"
                    className="dct-input"
                    value={newMaxUses}
                    onChange={(e) => setNewMaxUses(e.target.value)}
                    placeholder={cz ? 'Neomezeně' : 'Unlimited'}
                  />
                  <small>{cz ? 'Hodnota 1 znamená jednorázový kód.' : 'A value of 1 makes the code single-use.'}</small>
                </label>
              </section>

              <section className="dct-section">
                <h4>{cz ? 'Na co kód platí' : 'What the code applies to'}</h4>
                <label className="dct-field dct-full">
                  <span>{cz ? 'Platí na' : 'Applies to'}</span>
                  <select
                    className="dct-input"
                    value={newScope}
                    onChange={(e) => { setNewScope(e.target.value); setNewScopeIds([]); setScopeSearch(''); }}
                  >
                    <option value="all">{cz ? 'Celý košík' : 'Whole cart'}</option>
                    <option value="products">{cz ? 'Vybrané produkty' : 'Selected products'}</option>
                    <option value="categories">{cz ? 'Vybrané kategorie' : 'Selected categories'}</option>
                  </select>
                </label>

                {newScope !== 'all' && (
                  <div className="dct-field dct-full">
                    <input
                      type="text"
                      className="dct-input"
                      value={scopeSearch}
                      onChange={(e) => setScopeSearch(e.target.value)}
                      placeholder={cz ? 'Hledat…' : 'Search…'}
                      aria-label={cz ? 'Hledat' : 'Search'}
                    />
                    <div className="dct-picker">
                      {scopeOptions.length === 0 && <p className="dct-picker-empty">{cz ? 'Nic nenalezeno.' : 'Nothing found.'}</p>}
                      {scopeOptions.map(o => (
                        <label key={o.id}>
                          <input type="checkbox" checked={newScopeIds.includes(o.id)} onChange={() => toggleScopeId(o.id)} />
                          <span>{o.label}</span>
                        </label>
                      ))}
                    </div>
                    <small>{cz ? `Vybráno: ${newScopeIds.length}` : `Selected: ${newScopeIds.length}`}</small>
                  </div>
                )}
              </section>
            </div>

            <div className="dct-modal-foot">
              <button type="button" className="btn btn-secondary" onClick={() => setFormOpen(false)}>{cz ? 'Zrušit' : 'Cancel'}</button>
              <button type="submit" className="btn btn-primary" disabled={adding}>
                {adding ? (cz ? 'Vytvářím…' : 'Creating…') : (cz ? 'Vytvořit kód' : 'Create code')}
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}

      {deleteConfirm.isOpen && createPortal(
        <div className="dct-overlay">
          <div className="dct-modal dct-confirm">
            <div className="dct-modal-body">
              <h3 className="dct-title">{cz ? 'Smazat slevový kód?' : 'Delete discount code?'}</h3>
              <p className="dct-sub">
                {cz ? `Kód ${deleteConfirm.codeString} se trvale odstraní.` : `Code ${deleteConfirm.codeString} will be permanently removed.`}
              </p>
            </div>
            <div className="dct-modal-foot">
              <button type="button" className="btn btn-secondary" onClick={() => setDeleteConfirm({ isOpen: false, id: null, codeString: '' })}>
                {cz ? 'Zrušit' : 'Cancel'}
              </button>
              <button type="button" className="btn btn-primary dct-danger" onClick={executeDeleteCode}>
                {cz ? 'Smazat' : 'Delete'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

const DCT_CSS = `
  .dct { display: flex; flex-direction: column; gap: 20px; color: #fff; }
  .dct-head { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
  .dct-title { margin: 0; font-size: 18px; font-weight: 700; letter-spacing: -0.2px; color: #fff; }
  .dct-sub { margin: 4px 0 0; font-size: 13px; color: rgba(255,255,255,0.55); }
  .dct-new { flex-shrink: 0; }
  .dct-empty { margin: 0; padding: 40px 0; text-align: center; font-size: 14px; color: rgba(255,255,255,0.55); }

  .dct-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
  .dct-row { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; align-items: center; gap: 24px; padding: 18px 20px; background: var(--bg-secondary); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; }
  .dct-main { min-width: 0; }
  .dct-code { font-size: 15px; font-weight: 700; letter-spacing: 0.02em; color: var(--color-gold, #fdbd16); overflow-wrap: anywhere; }
  .dct-meta { display: grid; grid-template-columns: minmax(0, 1.6fr) minmax(0, 1.3fr) minmax(0, 0.6fr); gap: 12px 24px; margin: 12px 0 0; }
  .dct-meta > div { min-width: 0; }
  .dct-meta dt { font-size: 11px; color: rgba(255,255,255,0.45); margin-bottom: 2px; }
  .dct-meta dd { margin: 0; font-size: 13px; color: rgba(255,255,255,0.85); }
  .dct-value { min-width: 84px; text-align: right; font-size: 20px; font-weight: 700; color: #fff; white-space: nowrap; }
  .dct-actions { display: flex; align-items: center; gap: 8px; }
  .dct-status { min-width: 104px; border: 0; border-radius: 999px; padding: 6px 12px; font-size: 12px; font-weight: 600; font-family: inherit; cursor: pointer; white-space: nowrap; transition: opacity 0.2s; }
  .dct-status:hover { opacity: 0.8; }
  .dct-delete, .dct-close { display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 36px; padding: 0; background: transparent; border: 0; border-radius: 8px; color: rgba(255,255,255,0.5); cursor: pointer; transition: background-color 0.2s, color 0.2s; }
  .dct-delete:hover { background: rgba(239,68,68,0.12); color: #ef4444; }
  .dct-close:hover { background: rgba(255,255,255,0.06); color: #fff; }

  .dct-overlay { position: fixed; inset: 0; z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 24px; background: rgba(0,0,0,0.7); }
  .dct-modal { display: flex; flex-direction: column; width: 100%; max-width: 560px; max-height: 100%; background: var(--bg-secondary, #141416); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; overflow: hidden; color: #fff; font-family: var(--font-sans), system-ui, sans-serif; }
  .dct-confirm { max-width: 400px; }
  .dct-modal-head { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 20px 24px; border-bottom: 1px solid rgba(255,255,255,0.06); }
  .dct-modal-body { flex: 1 1 auto; min-height: 0; overflow-y: auto; padding: 24px; display: flex; flex-direction: column; gap: 28px; }
  .dct-confirm .dct-modal-body { gap: 0; }
  .dct-modal-foot { display: flex; justify-content: flex-end; gap: 10px; padding: 16px 24px; border-top: 1px solid rgba(255,255,255,0.06); }
  .dct-danger { background-color: #ef4444 !important; color: #fff !important; }

  .dct-section { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
  .dct-section h4 { grid-column: 1 / -1; margin: 0; font-size: 13px; font-weight: 600; color: var(--color-gold, #fdbd16); }
  .dct-field { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
  .dct-full { grid-column: 1 / -1; }
  .dct-field > span { font-size: 13px; color: rgba(255,255,255,0.7); }
  .dct-field small { font-size: 12px; color: rgba(255,255,255,0.5); }
  .dct-input { width: 100%; height: 44px; box-sizing: border-box; padding: 0 14px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #fff; font-size: 14px; font-family: inherit; outline: none; color-scheme: dark; transition: border-color 0.2s; }
  .dct-input:focus { border-color: var(--color-gold, #fdbd16); }
  .dct-input::placeholder { color: rgba(255,255,255,0.35); }
  select.dct-input { appearance: none; -webkit-appearance: none; padding-right: 36px; cursor: pointer; background: rgba(255,255,255,0.04) url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.5)' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>") no-repeat right 12px center; background-size: 14px; }
  select.dct-input option { background: #18181c; color: #fff; }
  .dct-picker { max-height: 208px; overflow-y: auto; padding: 4px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; }
  .dct-picker label { display: flex; align-items: center; gap: 10px; padding: 9px 10px; border-radius: 6px; font-size: 14px; color: rgba(255,255,255,0.85); cursor: pointer; }
  .dct-picker label:hover { background: rgba(255,255,255,0.05); }
  .dct-picker input { flex-shrink: 0; width: 16px; height: 16px; margin: 0; accent-color: var(--color-gold, #fdbd16); }
  .dct-picker-empty { margin: 0; padding: 12px; font-size: 13px; color: rgba(255,255,255,0.5); }

  @media (max-width: 640px) {
    .dct-row { grid-template-columns: minmax(0, 1fr) auto; gap: 14px 16px; padding: 16px; }
    .dct-main { grid-column: 1 / 2; }
    .dct-value { grid-column: 2; grid-row: 1; align-self: start; min-width: 0; font-size: 18px; }
    .dct-actions { grid-column: 1 / -1; justify-content: space-between; }
    .dct-meta { grid-template-columns: minmax(0, 1fr); gap: 8px; }
    .dct-overlay { padding: 0; align-items: stretch; }
    .dct-modal { max-width: none; border: 0; border-radius: 0; }
    .dct-confirm { margin: auto 16px; max-height: none; border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; }
    .dct-section { grid-template-columns: minmax(0, 1fr); }
    .dct-modal-foot .btn { flex: 1; }
  }
`;
