/**
 * Kontrola newsletteru před odesláním — běží v prohlížeči, nepotřebuje AI.
 *
 * Chytá hlavně rozbité odkazy (překlep v „https://“, v doméně, mezery),
 * prázdná tlačítka a chybějící anglické verze. Pravopis a gramatiku
 * řeší AI korektura (funkce check-newsletter).
 */

const OUR_DOMAIN = 'northvaletcg.eu';

/** Levenshteinova vzdálenost — kolik znaků je potřeba změnit. */
function distance(a, b) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return dp[a.length][b.length];
}

/**
 * Zkontroluje jeden odkaz. Vrací seznam problémů { severity, reason, suggestion }.
 * severity: 'error' = blokuje odeslání, 'info' = jen upozornění (opravíme automaticky).
 */
export function checkUrl(raw) {
  const v = typeof raw === 'string' ? raw.trim() : '';
  const problems = [];
  if (!v) return problems;
  if (/^(mailto:|tel:)/i.test(v) || v.includes('{{')) return problems;

  if (/\s/.test(v)) {
    problems.push({ severity: 'error', reason: 'Odkaz obsahuje mezeru.', suggestion: v.replace(/\s+/g, '') });
  }

  // Překlep ve schématu: „hte://“, „htps://“, „htttps://“, „https//“, „https:/“
  const hasProperScheme = /^https?:\/\/[^/]/i.test(v);
  const looksLikeScheme = /^[a-z]{2,8}:?\/{1,3}/i.test(v) || /^h[a-z]{1,6}:/i.test(v);
  if (!hasProperScheme && looksLikeScheme) {
    const rest = v.replace(/^[a-z]{1,8}:?\/*/i, '');
    problems.push({
      severity: 'error',
      reason: 'Překlep na začátku odkazu — musí začínat přesně „https://“.',
      suggestion: `https://${rest}`
    });
    return problems;
  }

  let host;
  try {
    host = new URL(hasProperScheme ? v : `https://${v.replace(/^\/+/, '')}`).hostname.toLowerCase();
  } catch {
    problems.push({ severity: 'error', reason: 'Tohle není platná webová adresa.', suggestion: '' });
    return problems;
  }

  if (!hasProperScheme && !v.startsWith('/')) {
    if (host.includes('.')) {
      problems.push({ severity: 'info', reason: 'Chybí „https://“ — při odeslání se doplní automaticky.', suggestion: `https://${v}` });
    } else {
      problems.push({ severity: 'error', reason: 'Odkaz nemá doménu (chybí např. „northvaletcg.eu“).', suggestion: `https://${OUR_DOMAIN}/${v}` });
      return problems;
    }
  }

  if (v.startsWith('/')) return problems; // cesta na našem webu, doplní se

  if (!/\.[a-z]{2,}$/i.test(host) || host.includes('..')) {
    problems.push({ severity: 'error', reason: `Doména „${host}“ nevypadá platně.`, suggestion: '' });
  }

  // Překlep v naší doméně: „nortvaletcg.eu“, „northvaletg.eu“, „northvaletcg.cz“
  const bare = host.replace(/^www\./, '');
  if (bare !== OUR_DOMAIN) {
    const d = distance(bare, OUR_DOMAIN);
    if (d > 0 && d <= 3) {
      problems.push({
        severity: 'error',
        reason: `Překlep v doméně „${host}“ — správně je „${OUR_DOMAIN}“.`,
        suggestion: v.replace(host, OUR_DOMAIN)
      });
    }
  }

  return problems;
}

/** Vytáhne odkazy z textového bloku (HTML <a href> i holé adresy v textu). */
function linksInText(text) {
  if (!text) return [];
  const found = [];
  for (const m of text.matchAll(/href\s*=\s*["']([^"']*)["']/gi)) found.push(m[1]);
  const plain = text.replace(/<[^>]+>/g, ' ');
  for (const m of plain.matchAll(/\b(?:h[a-z]{1,6}:\/*|www\.)[^\s<>"')]+/gi)) found.push(m[0]);
  return found;
}

/** Najde zdvojená slova („a a“, „the the“). */
function doubledWords(text) {
  if (!text) return [];
  const plain = text.replace(/<[^>]+>/g, ' ');
  const hits = [];
  for (const m of plain.matchAll(/(?<!\p{L})(\p{L}+)\s+\1(?!\p{L})/giu)) hits.push(m[0]);
  return hits;
}

/**
 * Projde celý newsletter.
 * @returns {{ issues: Array<{severity, where, found, suggestion, reason}>, links: Array<{where, url}> }}
 */
export function runNewsletterChecks({ subject, subjectEN, blocks }) {
  const issues = [];
  const links = [];
  const add = (severity, where, found, reason, suggestion = '') =>
    issues.push({ severity, where, found, reason, suggestion, source: 'local' });

  const checkLink = (where, url) => {
    if (!url || !url.trim()) return;
    links.push({ where, url: url.trim() });
    for (const p of checkUrl(url)) add(p.severity, where, url, p.reason, p.suggestion);
  };

  if (!subject?.trim()) add('error', 'Předmět CZ', '', 'Předmět e-mailu je prázdný.');
  if (!subjectEN?.trim()) add('warning', 'Předmět EN', '', 'Anglický předmět je prázdný — EN odběratelé dostanou český.');

  (blocks || []).forEach((b, i) => {
    const n = `Blok ${i + 1}`;
    if (b.type === 'text') {
      if (b.content?.trim() && !b.contentEN?.trim()) {
        add('warning', `${n} – text EN`, '', 'Chybí anglický text — EN odběratelům tenhle blok vůbec nepřijde.');
      }
      linksInText(b.content).forEach(u => checkLink(`${n} – odkaz v textu CZ`, u));
      linksInText(b.contentEN).forEach(u => checkLink(`${n} – odkaz v textu EN`, u));
      doubledWords(b.content).forEach(w => add('warning', `${n} – text CZ`, w, 'Zdvojené slovo.', w.split(/\s+/)[0]));
      doubledWords(b.contentEN).forEach(w => add('warning', `${n} – text EN`, w, 'Zdvojené slovo.', w.split(/\s+/)[0]));
    } else if (b.type === 'image') {
      checkLink(`${n} – odkaz obrázku CZ`, b.linkUrl);
      checkLink(`${n} – odkaz obrázku EN`, b.linkUrlEN);
      if (b.content && !b.contentEN) {
        add('warning', `${n} – obrázek EN`, '', 'Chybí anglický obrázek — EN odběratelům tenhle blok nepřijde.');
      }
    } else if (b.type === 'button') {
      if (!b.url?.trim()) add('error', `${n} – tlačítko CZ`, b.text || '', 'Tlačítko nemá odkaz — v e-mailu se vůbec nezobrazí.');
      if (!b.text?.trim()) add('error', `${n} – tlačítko CZ`, '', 'Tlačítko nemá text — v e-mailu se vůbec nezobrazí.');
      if (!b.urlEN?.trim() || !b.textEN?.trim()) {
        add('warning', `${n} – tlačítko EN`, b.textEN || '', 'Anglické tlačítko nemá text nebo odkaz — EN odběratelům chybí.');
      }
      checkLink(`${n} – odkaz tlačítka CZ`, b.url);
      checkLink(`${n} – odkaz tlačítka EN`, b.urlEN);
    }
  });

  return { issues, links };
}
