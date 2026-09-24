/**
 * Výsledek kontroly newsletteru v potvrzovacím okně před odesláním.
 *
 * - Chyby v odkazech (kontrola v prohlížeči) odeslání ZABLOKUJÍ.
 * - Nálezy AI korektury a upozornění vyžadují zaškrtnutí „prošel jsem to“,
 *   protože AI se může splést a admin musí mít poslední slovo.
 */

const COLORS = {
  error: { bg: 'rgba(239,68,68,0.10)', border: 'rgba(239,68,68,0.45)', text: '#fca5a5', label: 'Chyba' },
  warning: { bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.45)', text: '#fcd34d', label: 'Zkontroluj' },
  info: { bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.12)', text: 'rgba(255,255,255,0.65)', label: 'Info' }
};

const box = {
  textAlign: 'left',
  borderRadius: '8px',
  padding: '10px 12px',
  fontSize: '12.5px',
  lineHeight: 1.5,
  marginBottom: '8px',
  wordBreak: 'break-word'
};

function Issue({ issue }) {
  const c = COLORS[issue.severity] || COLORS.info;
  return (
    <div style={{ ...box, background: c.bg, border: `1px solid ${c.border}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginBottom: '4px' }}>
        <strong style={{ color: c.text }}>{c.label} · {issue.where}</strong>
        <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px', whiteSpace: 'nowrap' }}>
          {issue.source === 'ai' ? 'AI korektura' : 'kontrola odkazů'}
        </span>
      </div>
      <div style={{ color: 'rgba(255,255,255,0.85)' }}>{issue.reason}</div>
      {issue.found && (
        <div style={{ marginTop: '4px', color: 'rgba(255,255,255,0.6)' }}>
          Nalezeno: <code style={{ color: '#fca5a5' }}>{issue.found}</code>
        </div>
      )}
      {issue.suggestion && issue.suggestion !== issue.found && (
        <div style={{ color: 'rgba(255,255,255,0.6)' }}>
          Správně: <code style={{ color: '#86efac' }}>{issue.suggestion}</code>
        </div>
      )}
    </div>
  );
}

export default function NewsletterCheckPanel({ state, blockingCount, needsAck, ack, onAck }) {
  if (!state) return null;

  if (state.loading) {
    return (
      <div style={{ ...box, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.75)', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span className="pr-spinner" aria-hidden="true" />
        Kontroluji pravopis, texty a odkazy… (pár vteřin)
      </div>
    );
  }

  const order = { error: 0, warning: 1, info: 2 };
  const issues = [...(state.issues || [])].sort((a, b) => (order[a.severity] ?? 3) - (order[b.severity] ?? 3));
  const clean = issues.filter(i => i.severity !== 'info').length === 0;

  return (
    <div style={{ marginBottom: '16px' }}>
      {blockingCount > 0 && (
        <div style={{ ...box, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.6)', color: '#fecaca', fontWeight: 600 }}>
          Našel jsem {blockingCount} {blockingCount === 1 ? 'rozbitý odkaz' : 'chyby v odkazech'}. Newsletter nejde odeslat, dokud je neopravíš.
        </div>
      )}

      {!state.aiAvailable && (
        <div style={{ ...box, background: COLORS.warning.bg, border: `1px solid ${COLORS.warning.border}`, color: COLORS.warning.text }}>
          AI korektura pravopisu není zapnutá. Texty si prosím přečti ručně.
        </div>
      )}
      {state.aiAvailable && state.aiFailed && (
        <div style={{ ...box, background: COLORS.warning.bg, border: `1px solid ${COLORS.warning.border}`, color: COLORS.warning.text }}>
          AI korektura teď neproběhla (výpadek). Texty si prosím přečti ručně, nebo to zkus za chvíli znovu.
        </div>
      )}

      {clean && state.aiAvailable && !state.aiFailed && (
        <div style={{ ...box, background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.45)', color: '#6ee7b7' }}>
          ✓ Pravopis, texty i odkazy vypadají v pořádku.
        </div>
      )}

      {issues.map((issue, i) => <Issue key={i} issue={issue} />)}

      {state.links?.length > 0 && (
        <details style={{ ...box, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.75)' }}>
          <summary style={{ cursor: 'pointer', fontWeight: 600 }}>
            Proklikni si odkazy ({state.links.length}) — ověř, že vedou, kam mají
          </summary>
          <ul style={{ margin: '8px 0 0 0', paddingLeft: '18px' }}>
            {state.links.map((l, i) => (
              <li key={i} style={{ marginBottom: '4px' }}>
                <span style={{ color: 'rgba(255,255,255,0.5)' }}>{l.where}: </span>
                <a href={/^https?:\/\//i.test(l.url) ? l.url : `https://${l.url.replace(/^\/+/, 'northvaletcg.eu/')}`}
                   target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-gold, #fdbd16)' }}>
                  {l.url}
                </a>
              </li>
            ))}
          </ul>
        </details>
      )}

      {needsAck && blockingCount === 0 && (
        <label style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', textAlign: 'left', fontSize: '13px', color: '#fff', marginTop: '10px', cursor: 'pointer' }}>
          <input type="checkbox" checked={ack} onChange={(e) => onAck(e.target.checked)} style={{ marginTop: '3px' }} />
          <span>Všechna upozornění jsem prošel a texty i odkazy jsem zkontroloval.</span>
        </label>
      )}
    </div>
  );
}
