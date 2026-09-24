/**
 * Oprava odkazů v e-mailech před odesláním přes Brevo.
 *
 * Proč: Brevo každý odkaz přebalí do sledovacího přesměrování. Když odkaz
 * nemá doménu (např. admin napíše „northvaletcg.eu/akce“ bez https://,
 * „/produkty“ nebo prázdné pole), Brevo po kliknutí ukáže 404
 * „invalid URL: host missing“. Tady se každý odkaz dotáhne na plnou adresu.
 */

const SITE = 'https://northvaletcg.eu';

/** Vrátí plnou adresu s https:// — nebo původní hodnotu, pokud je v pořádku. */
export function normalizeHref(raw: unknown): string {
  let v = typeof raw === 'string' ? raw.trim() : '';
  if (!v) return SITE;

  // Brevo proměnné ({{ unsubscribe }}, {{ mirror }}) a speciální schémata nechat být.
  if (v.includes('{{')) return v;
  if (/^(mailto:|tel:|sms:|#)/i.test(v)) return v;
  if (/^https?:\/\/[^/\s]+\.[^/\s]+/i.test(v)) return v;

  // Rozbité schéma: „https:/web.cz“, „http//web.cz“, „https://“ bez domény.
  v = v.replace(/^https?:?\/*/i, '');
  if (v.startsWith('//')) v = v.slice(2);
  if (!v) return SITE;

  // Cesta na našem webu: „/akce“ nebo „akce“ bez tečky.
  if (v.startsWith('/')) return SITE + v;
  const host = v.split(/[/?#]/)[0];
  if (!host.includes('.')) return `${SITE}/${v}`;

  return `https://${v}`;
}

/** Projde hotové HTML a opraví všechna href. Pokrývá i odkazy vložené do textu. */
export function fixEmailLinks(html: string): string {
  if (!html) return html;
  return html.replace(/(<a\b[^>]*?\shref\s*=\s*)(["'])(.*?)\2/gi,
    (_m, pre, q, href) => `${pre}${q}${normalizeHref(href)}${q}`);
}
