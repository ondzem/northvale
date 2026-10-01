import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from '../../context/LanguageContext';
import { supabase } from '../../supabase';
import { HOW_FOUND_OPTIONS } from '../../services/howFound';

/**
 * Přehled prodejů po měsících — podklad pro případovou studii.
 * Počítá ze stejných dat jako záložka Objednávky (save-order-json),
 * takže čísla sedí s tím, co admin vidí v seznamu.
 */

const MONTHS_CZ = ['leden', 'únor', 'březen', 'duben', 'květen', 'červen', 'červenec', 'srpen', 'září', 'říjen', 'listopad', 'prosinec'];
const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const kc = (n) => `${Math.round(n).toLocaleString('cs-CZ')} Kč`;

function isTestOrder(o) {
  const email = String(o.customer_email || o.customerEmail || '').toLowerCase();
  return String(o.id || '').toUpperCase().startsWith('TEST') || email.includes('+nvtest') || email.endsWith('@example.com');
}

function isCancelled(o) {
  const st = String(o.fulfillment_status || o.fulfillmentStatus || o.stav || '').toLowerCase();
  return st === 'cancelled' || st === 'stornováno' || st === 'zrušeno';
}

function isUnfinishedCard(o) {
  const pm = String(o.payment_method || o.paymentMethod || '').toLowerCase();
  const isCard = pm.includes('kart') || pm.includes('card') || pm.includes('webpay');
  const st = String(o.payment_status || o.paymentStatus || o.platba || '').toLowerCase();
  return isCard && st !== 'paid' && st !== 'uhrazeno';
}

function orderTotal(o, items) {
  const explicit = parseFloat(o.final_total || o.finalTotal || 0);
  if (explicit > 0) return explicit;
  const sub = (items || []).reduce((s, it) => s + (parseFloat(it.quantity || 1) * parseFloat(it.price || 0)), 0);
  return Math.max(0, sub
    + parseFloat(o.shipping_cost || o.shippingCost || 0)
    + parseFloat(o.payment_surcharge || o.paymentSurcharge || 0)
    - parseFloat(o.discount_amount || o.discountAmount || 0));
}

function howFoundLabel(raw, cz) {
  if (!raw) return null;
  const key = String(raw).split(':')[0].trim();
  const opt = HOW_FOUND_OPTIONS.find(x => x.key === key);
  return opt ? (cz ? opt.cz : opt.en) : String(raw);
}

function trafficLabel(o, cz) {
  if (!Object.prototype.hasOwnProperty.call(o, 'traffic_source')) {
    return cz ? 'Před spuštěním měření' : 'Before tracking started';
  }
  return o.traffic_source || (cz ? 'Přímo / neznámý' : 'Direct / unknown');
}

function countBy(list, fn) {
  const map = new Map();
  for (const x of list) {
    const k = fn(x);
    if (k) map.set(k, (map.get(k) || 0) + 1);
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

const CSS = `
  .ast { display: flex; flex-direction: column; gap: 20px; color: #fff; }
  .ast-bar { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; justify-content: space-between; }
  .ast-bar select { appearance: none; -webkit-appearance: none; background: rgba(24,24,28,0.98) url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.5)' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>") no-repeat right 12px center; background-size: 14px; border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; padding: 10px 36px 10px 14px; color: #fff; font-size: 14px; outline: none; cursor: pointer; }
  .ast-actions { display: flex; gap: 8px; }
  .ast-btn { background: transparent; border: 1px solid rgba(255,255,255,0.15); border-radius: 4px; color: #fff; padding: 10px 14px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all .2s; display: inline-flex; align-items: center; font-family: inherit; }
  .ast-btn:hover:not(:disabled) { border-color: var(--nv-gold, #fdbd16); color: var(--nv-gold, #fdbd16); }
  .ast-btn:disabled { opacity: .5; cursor: default; }
  .ast-kpis { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; }
  .ast-card { background: var(--bg-secondary); border: 1px solid rgba(255,255,255,0.05); border-radius: var(--radius-lg); padding: 20px; display: flex; flex-direction: column; gap: 4px; min-width: 0; }
  .ast-label { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted); }
  .ast-num { font-size: 26px; font-weight: 800; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .ast-sub { font-size: 12.5px; color: var(--text-muted); }
  .ast-panel { background: var(--bg-secondary); border: 1px solid rgba(255,255,255,0.05); border-radius: var(--radius-lg); padding: 24px; min-width: 0; }
  .ast-panel h3 { font-size: 15px; font-weight: 700; margin: 0 0 4px; }
  .ast-panel .ast-sub { margin: 0 0 16px; }
  .ast-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .ast-table { width: 100%; border-collapse: collapse; font-size: 14px; }
  .ast-table th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted); font-weight: 600; padding: 0 12px 10px 0; border-bottom: 1px solid rgba(255,255,255,0.08); }
  .ast-table td { padding: 12px 12px 12px 0; border-bottom: 1px solid rgba(255,255,255,0.05); white-space: nowrap; }
  .ast-table th:not(:first-child), .ast-table td:not(:first-child) { text-align: right; }
  .ast-table tr:last-child td { border-bottom: 0; }
  .ast-month { text-transform: capitalize; }
  .ast-src { display: flex; flex-direction: column; gap: 12px; }
  .ast-src-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 4px 12px; font-size: 14px; }
  .ast-src-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .ast-src-val { color: var(--text-muted); font-variant-numeric: tabular-nums; }
  .ast-src-track { grid-column: 1 / -1; height: 6px; border-radius: 999px; background: rgba(255,255,255,0.06); overflow: hidden; }
  .ast-src-fill { height: 100%; border-radius: 999px; background: #fdbd16; }
  .ast-empty { color: var(--text-muted); font-size: 14px; margin: 0; }
  .ast-note { font-size: 12.5px; color: var(--text-muted); line-height: 1.6; margin: 0; }
  @media (max-width: 1100px) { .ast-kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  @media (max-width: 768px) {
    .ast-cols { grid-template-columns: 1fr; }
    .ast-panel { padding: 18px; overflow-x: auto; }
    .ast-num { font-size: 22px; }
    .ast-bar select { width: 100%; }
    .ast-actions { width: 100%; }
    .ast-actions .ast-btn { flex: 1; justify-content: center; }
  }
`;

function SourceList({ rows, total, emptyText }) {
  if (!rows.length) return <p className="ast-empty">{emptyText}</p>;
  return (
    <div className="ast-src">
      {rows.map(([name, count]) => {
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        return (
          <div className="ast-src-row" key={name}>
            <span className="ast-src-name" title={name}>{name}</span>
            <span className="ast-src-val">{count} · {pct} %</span>
            <div className="ast-src-track"><div className="ast-src-fill" style={{ width: `${pct}%` }} /></div>
          </div>
        );
      })}
    </div>
  );
}

export default function StatsTab({ showToast }) {
  const { lang } = useTranslation();
  const cz = lang === 'CZ';
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('all');

  // Načtení mimo komponentu stavu — stav se nastavuje až v .then (pravidlo hooks).
  const fetchOrders = () =>
    supabase.functions.invoke(`save-order-json?withDetails=true&t=${Date.now()}`, { method: 'GET' })
      .then(({ data, error }) => {
        if (error) throw error;
        return (data?.orders || []).map(jsonObj => {
          const o = jsonObj.order || jsonObj;
          const items = Array.isArray(jsonObj.items) ? jsonObj.items : (o.items || []);
          const created = new Date(o.created_at || jsonObj.created_at || 0);
          return { o, items, created, total: orderTotal(o, items) };
        }).filter(x => !isNaN(x.created.getTime()) && x.created.getFullYear() > 2000);
      })
      .then(list => setOrders(list))
      .catch(err => {
        console.error('Přehled: načtení objednávek selhalo', err);
        showToast?.(cz ? 'Nepodařilo se načíst objednávky.' : 'Failed to load orders.', 'error');
      })
      .finally(() => setLoading(false));

  const reload = () => { setLoading(true); fetchOrders(); };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchOrders(); }, []);

  const counted = useMemo(
    () => orders.filter(x => !isTestOrder(x.o) && !isCancelled(x.o) && !isUnfinishedCard(x.o)),
    [orders]
  );

  const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  const monthName = (key) => {
    const [y, m] = key.split('-').map(Number);
    return `${(cz ? MONTHS_CZ : MONTHS_EN)[m - 1]} ${y}`;
  };

  const months = useMemo(() => {
    const map = new Map();
    for (const x of counted) {
      const k = monthKey(x.created);
      const row = map.get(k) || { key: k, count: 0, revenue: 0 };
      row.count += 1;
      row.revenue += x.total;
      map.set(k, row);
    }
    return [...map.values()].sort((a, b) => b.key.localeCompare(a.key));
  }, [counted]);

  const inPeriod = useMemo(
    () => (period === 'all' ? counted : counted.filter(x => monthKey(x.created) === period)),
    [counted, period]
  );

  const revenue = inPeriod.reduce((s, x) => s + x.total, 0);
  const answered = inPeriod.filter(x => x.o.how_found);
  const howFoundRows = countBy(answered, x => howFoundLabel(x.o.how_found, cz));
  const trafficRows = countBy(inPeriod, x => trafficLabel(x.o, cz));

  const exportCsv = () => {
    const head = cz ? ['Měsíc', 'Objednávky', 'Tržby (Kč)', 'Průměrná objednávka (Kč)'] : ['Month', 'Orders', 'Revenue (CZK)', 'Average order (CZK)'];
    const lines = [head, ...[...months].reverse().map(m => [m.key, m.count, Math.round(m.revenue), Math.round(m.revenue / m.count)])];
    const csv = '﻿' + lines.map(l => l.join(';')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `northvale-prehled-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="ast">
      <style>{CSS}</style>

      <div className="ast-bar">
        <select value={period} onChange={e => setPeriod(e.target.value)} aria-label={cz ? 'Období' : 'Period'}>
          <option value="all">{cz ? 'Celé období' : 'All time'}</option>
          {months.map(m => <option key={m.key} value={m.key}>{monthName(m.key)}</option>)}
        </select>
        <div className="ast-actions">
          <button type="button" className="ast-btn" onClick={exportCsv} disabled={!months.length}>
            {cz ? 'Export po měsících (CSV)' : 'Export by month (CSV)'}
          </button>
          <button type="button" className="ast-btn" onClick={reload} disabled={loading}>
            {loading ? (cz ? 'Načítám…' : 'Loading…') : (cz ? 'Načíst znovu' : 'Refresh')}
          </button>
        </div>
      </div>

      <div className="ast-kpis">
        <div className="ast-card">
          <span className="ast-label">{cz ? 'Objednávky' : 'Orders'}</span>
          <span className="ast-num">{loading ? '…' : inPeriod.length}</span>
        </div>
        <div className="ast-card">
          <span className="ast-label">{cz ? 'Tržby' : 'Revenue'}</span>
          <span className="ast-num">{loading ? '…' : kc(revenue)}</span>
          <span className="ast-sub">{cz ? 's DPH, včetně dopravy' : 'incl. VAT and shipping'}</span>
        </div>
        <div className="ast-card">
          <span className="ast-label">{cz ? 'Průměrná objednávka' : 'Average order'}</span>
          <span className="ast-num">{loading ? '…' : (inPeriod.length ? kc(revenue / inPeriod.length) : '—')}</span>
        </div>
        <div className="ast-card">
          <span className="ast-label">{cz ? 'Odpovědi na dotazník' : 'Survey answers'}</span>
          <span className="ast-num">{loading ? '…' : answered.length}</span>
          <span className="ast-sub">
            {inPeriod.length ? `${Math.round((answered.length / inPeriod.length) * 100)} % ${cz ? 'objednávek' : 'of orders'}` : '—'}
          </span>
        </div>
      </div>

      <div className="ast-cols">
        <div className="ast-panel">
          <h3>{cz ? 'Jak se o nás dozvěděli' : 'How they heard about us'}</h3>
          <p className="ast-sub">{cz ? 'Odpověď zákazníka po nákupu' : 'Customer answer after purchase'}</p>
          <SourceList rows={howFoundRows} total={answered.length} emptyText={cz ? 'Zatím žádné odpovědi.' : 'No answers yet.'} />
        </div>
        <div className="ast-panel">
          <h3>{cz ? 'Odkud přišli na web' : 'Where visitors came from'}</h3>
          <p className="ast-sub">{cz ? 'Zjištěno automaticky při návštěvě, ze které nakoupili' : 'Detected automatically from the visit that converted'}</p>
          <SourceList rows={trafficRows} total={inPeriod.length} emptyText={cz ? 'Žádné objednávky v tomto období.' : 'No orders in this period.'} />
        </div>
      </div>

      <div className="ast-panel">
        <h3>{cz ? 'Po měsících' : 'By month'}</h3>
        <p className="ast-sub">{cz ? 'Nejnovější nahoře' : 'Newest first'}</p>
        {months.length ? (
          <table className="ast-table">
            <thead>
              <tr>
                <th>{cz ? 'Měsíc' : 'Month'}</th>
                <th>{cz ? 'Objednávky' : 'Orders'}</th>
                <th>{cz ? 'Tržby' : 'Revenue'}</th>
                <th>{cz ? 'Průměr' : 'Average'}</th>
              </tr>
            </thead>
            <tbody>
              {months.map(m => (
                <tr key={m.key}>
                  <td className="ast-month">{monthName(m.key)}</td>
                  <td>{m.count}</td>
                  <td>{kc(m.revenue)}</td>
                  <td>{kc(m.revenue / m.count)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="ast-empty">{loading ? (cz ? 'Načítám…' : 'Loading…') : (cz ? 'Zatím žádné objednávky.' : 'No orders yet.')}</p>
        )}
      </div>

      <p className="ast-note">
        {cz
          ? 'Nepočítají se stornované objednávky, nedokončené platby kartou a testovací objednávky. Zdroje se ukládají od 1. 10. 2026 — starší objednávky jsou vedené jako „Před spuštěním měření“.'
          : 'Cancelled orders, unfinished card payments and test orders are excluded. Sources are recorded since 1 Oct 2026 — older orders show as “Before tracking started”.'}
      </p>
    </div>
  );
}
