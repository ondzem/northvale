import { useState, useMemo, useRef } from 'react';
import { updateProductEans, isValidEan } from '../../services/products';

/**
 * Hromadné doplnění čárových kódů (EAN).
 *
 * Bez EAN nespáruje Heureka ani Zboží.cz produkt se svým katalogem, takže se
 * v jejich vyhledávání nezobrazí. EAN nelze odvodit ani vygenerovat — je to
 * číslo pod čárovým kódem na krabici. Tohle okno jen šetří klikání:
 * vyexportuje tabulku, přijme ji zpět vyplněnou a zapíše VÝHRADNĚ sloupec EAN.
 */

const escapeCsv = (v) => {
  const s = String(v ?? '');
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Rozparsuje CSV (oddělovač , nebo ;) i prostý text „id<tab>ean“. */
function parseRows(text) {
  const lines = String(text || '').split(/\r?\n/).filter(l => l.trim());
  if (lines.length === 0) return [];

  const delimiter = lines[0].includes(';') ? ';' : (lines[0].includes('\t') ? '\t' : ',');

  const splitLine = (line) => {
    const out = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === delimiter && !inQuotes) {
        out.push(cur); cur = '';
      } else cur += ch;
    }
    out.push(cur);
    return out.map(s => s.trim());
  };

  const rows = lines.map(splitLine);
  const header = rows[0].map(h => h.toLowerCase());
  const idIdx = header.findIndex(h => h === 'id' || h === 'kod' || h === 'kód');
  const eanIdx = header.findIndex(h => h === 'ean' || h.includes('čárov') || h.includes('carov'));

  // Bez hlavičky: bereme první sloupec jako id a poslední jako EAN
  const body = (idIdx >= 0 && eanIdx >= 0) ? rows.slice(1) : rows;
  const iId = idIdx >= 0 ? idIdx : 0;
  const iEan = eanIdx >= 0 ? eanIdx : (rows[0].length - 1);

  return body
    .map(cols => ({ id: (cols[iId] || '').trim(), ean: (cols[iEan] || '').replace(/\s|-/g, '').trim() }))
    .filter(r => r.id);
}

export default function BulkEanModal({ products, lang = 'CZ', showToast, onClose, onSaved }) {
  const cz = lang === 'CZ';
  const [pasted, setPasted] = useState('');
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  const byId = useMemo(() => {
    const m = {};
    products.forEach(p => { m[p.id] = p; });
    return m;
  }, [products]);

  // Rozbor vloženého obsahu — co se doplní, co se změní, kde je chyba
  const analysis = useMemo(() => {
    const rows = parseRows(pasted);
    const toSave = [];
    const invalid = [];
    const unknown = [];
    let unchanged = 0;

    for (const row of rows) {
      const product = byId[row.id];
      if (!product) { unknown.push(row.id); continue; }
      if (!row.ean) { unchanged++; continue; }
      if (!isValidEan(row.ean)) { invalid.push({ id: row.id, ean: row.ean }); continue; }
      const current = String(product.ean || '').trim();
      if (current === row.ean) { unchanged++; continue; }
      toSave.push({ id: row.id, ean: row.ean, name: product.name });
    }
    return { rows, toSave, invalid, unknown, unchanged };
  }, [pasted, byId]);

  const handleDownload = () => {
    const header = ['id', 'nazev', 'ean'];
    const lines = [header.join(',')];
    products.forEach(p => {
      lines.push([escapeCsv(p.id), escapeCsv(p.name), escapeCsv(p.ean || '')].join(','));
    });
    // BOM kvůli diakritice v Excelu
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'northvale-ean.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPasted(String(reader.result || ''));
    reader.readAsText(file, 'utf-8');
  };

  const handleSave = async () => {
    if (saving || analysis.toSave.length === 0) return;
    setSaving(true);
    try {
      const { updated, failed } = await updateProductEans(analysis.toSave);
      if (failed.length > 0) {
        showToast?.(cz
          ? `Doplněno ${updated}, nepodařilo se ${failed.length}. Zkontrolujte oprávnění.`
          : `Saved ${updated}, failed ${failed.length}.`, 'warning');
      } else {
        showToast?.(cz ? `Doplněno ${updated} čárových kódů.` : `${updated} barcodes saved.`, 'success');
      }
      onSaved?.();
      if (failed.length === 0) onClose?.();
    } catch (err) {
      showToast?.(cz ? `Chyba při ukládání: ${err.message}` : `Save error: ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const box = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '12px 14px' };

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
      onClick={(e) => { if (e.target === e.currentTarget && !saving) onClose?.(); }}
    >
      <div style={{ background: '#15161a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', width: '100%', maxWidth: '620px', maxHeight: '90vh', overflowY: 'auto', padding: '26px' }}>
        <h3 style={{ margin: '0 0 6px 0', color: '#fff', fontSize: '18px', fontWeight: 800 }}>
          🏷️ {cz ? 'Hromadné doplnění čárových kódů (EAN)' : 'Bulk EAN fill'}
        </h3>
        <p style={{ margin: '0 0 20px 0', color: '#8a8a92', fontSize: '12.5px', lineHeight: 1.6 }}>
          {cz
            ? 'EAN je číslo pod čárovým kódem na krabici. Bez něj Heureka ani Zboží.cz produkt nespárují. Zapíše se výhradně EAN — ostatních údajů se to nedotkne.'
            : 'The EAN is the number under the barcode on the box. Only the EAN column is written; nothing else is touched.'}
        </p>

        {/* Krok 1 */}
        <div style={{ ...box, marginBottom: '14px' }}>
          <div style={{ color: '#fff', fontSize: '13px', fontWeight: 700, marginBottom: '8px' }}>
            {cz ? '1. Stáhněte tabulku' : '1. Download the sheet'}
          </div>
          <p style={{ color: '#8a8a92', fontSize: '12px', margin: '0 0 10px 0', lineHeight: 1.55 }}>
            {cz
              ? 'Otevřete v Excelu, do sloupce „ean“ dopište čísla z krabic (nebo z ceníku dodavatele) a soubor uložte.'
              : 'Open in Excel, fill the "ean" column, save.'}
          </p>
          <button onClick={handleDownload} style={{ padding: '9px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.14)', background: 'transparent', color: '#f0f0f0', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer' }}>
            ⬇ {cz ? `Stáhnout tabulku (${products.length} produktů)` : `Download (${products.length} products)`}
          </button>
        </div>

        {/* Krok 2 */}
        <div style={{ ...box, marginBottom: '14px' }}>
          <div style={{ color: '#fff', fontSize: '13px', fontWeight: 700, marginBottom: '8px' }}>
            {cz ? '2. Nahrajte vyplněnou tabulku' : '2. Upload the filled sheet'}
          </div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
            <button onClick={() => fileRef.current?.click()} disabled={saving} style={{ padding: '9px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.14)', background: 'transparent', color: '#f0f0f0', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer' }}>
              📄 {cz ? 'Vybrat soubor' : 'Choose file'}
            </button>
            <input ref={fileRef} type="file" accept=".csv,.txt" style={{ display: 'none' }} onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = ''; }} />
          </div>
          <textarea
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            disabled={saving}
            placeholder={cz ? '…nebo sem rovnou vložte obsah tabulky (Ctrl+V)' : '…or paste the sheet content here'}
            style={{ width: '100%', minHeight: '90px', boxSizing: 'border-box', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(0,0,0,0.25)', color: '#f0f0f0', fontSize: '12px', fontFamily: 'monospace', resize: 'vertical' }}
          />
        </div>

        {/* Krok 3 — kontrola */}
        {pasted.trim() && (
          <div style={{ ...box, marginBottom: '20px' }}>
            <div style={{ color: '#fff', fontSize: '13px', fontWeight: 700, marginBottom: '10px' }}>
              {cz ? '3. Kontrola před uložením' : '3. Review'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12.5px' }}>
              <div style={{ color: 'var(--color-green, #10b981)' }}>
                ✓ {cz ? `Doplní se: ${analysis.toSave.length}` : `Will save: ${analysis.toSave.length}`}
              </div>
              {analysis.unchanged > 0 && (
                <div style={{ color: '#8a8a92' }}>
                  · {cz ? `Beze změny: ${analysis.unchanged}` : `Unchanged: ${analysis.unchanged}`}
                </div>
              )}
              {analysis.invalid.length > 0 && (
                <div style={{ color: '#ef4444' }}>
                  ✗ {cz ? `Neplatný kód (překlep?): ${analysis.invalid.length}` : `Invalid: ${analysis.invalid.length}`}
                  <div style={{ color: '#8a8a92', fontSize: '11.5px', marginTop: '4px', lineHeight: 1.5 }}>
                    {analysis.invalid.slice(0, 5).map(x => `${x.id}: ${x.ean}`).join(' · ')}
                    {analysis.invalid.length > 5 ? ' …' : ''}
                  </div>
                </div>
              )}
              {analysis.unknown.length > 0 && (
                <div style={{ color: 'var(--color-gold, #fdbd16)' }}>
                  ⚠ {cz ? `Neznámé ID (přeskočí se): ${analysis.unknown.length}` : `Unknown ids skipped: ${analysis.unknown.length}`}
                </div>
              )}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button onClick={() => !saving && onClose?.()} disabled={saving} style={{ padding: '10px 18px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.14)', background: 'transparent', color: '#8a8a92', fontSize: '13px', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}>
            {cz ? 'Zavřít' : 'Close'}
          </button>
          <button
            onClick={handleSave}
            disabled={saving || analysis.toSave.length === 0}
            style={{ padding: '10px 22px', borderRadius: '8px', border: 'none', background: (saving || analysis.toSave.length === 0) ? 'rgba(253,189,22,0.35)' : '#fdbd16', color: '#111', fontSize: '13px', fontWeight: 800, cursor: (saving || analysis.toSave.length === 0) ? 'not-allowed' : 'pointer' }}
          >
            {saving ? (cz ? 'Ukládám…' : 'Saving…') : (cz ? `Doplnit ${analysis.toSave.length} kódů` : `Save ${analysis.toSave.length}`)}
          </button>
        </div>
      </div>
    </div>
  );
}
