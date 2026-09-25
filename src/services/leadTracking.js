/**
 * Měření poptávek — jediné místo, přes které web posílá události do GA4.
 *
 * Měříme jen tři okamžiky, kdy se z návštěvníka stane poptávka:
 *   formular_odeslan  — úspěšně odeslaný formulář (param: formular, tema)
 *   klik_telefon      — klik na tel: odkaz        (param: misto)
 *   klik_email        — klik na mailto: odkaz     (param: misto)
 *
 * Nikdy sem neposílej jméno, e-mail, telefon ani text zprávy.
 * Bez souhlasu s analytickými cookies se neodešle nic — souhlas se čte při
 * každé události, takže odvolání platí okamžitě, bez obnovení stránky.
 */

const CONSENT_KEY = 'northvale-cookie-consent';
const PREFS_KEY = 'northvale-cookie-preferences';
const SOURCE_KEY = 'nv-zdroj-navstevy';
const OWN_HOSTS = ['northvaletcg.eu', 'www.northvaletcg.eu', 'localhost', '127.0.0.1'];

function hasAnalyticsConsent() {
  try {
    if (localStorage.getItem(CONSENT_KEY) !== 'true') return false;
    return JSON.parse(localStorage.getItem(PREFS_KEY) || '{}').analytics === true;
  } catch {
    return false;
  }
}

/** Pošle událost do GA4. Když analytika chybí nebo není souhlas, neudělá nic. */
export function trackLead(eventName, params = {}) {
  try {
    if (!hasAnalyticsConsent() || typeof window.gtag !== 'function') return;
    window.gtag('event', eventName, params);
  } catch {
    // měření nesmí nikdy rozbít web
  }
}

/* ------------------------------------------------------------------ */
/* Kliky na telefon a e-mail — jeden posluchač pro celý web            */
/* ------------------------------------------------------------------ */

/** Určí, kde na stránce odkaz byl — podle toho, v čem je vnořený. */
function linkPlacement(link) {
  if (link.closest('[data-misto]')) return link.closest('[data-misto]').getAttribute('data-misto');
  if (link.closest('footer, .main-footer')) return 'paticka';
  if (link.closest('.ktf-info')) return 'stranka_kontakt';
  if (link.closest('.ckf-help')) {
    return window.location.pathname.startsWith('/checkout') ? 'pokladna' : 'kosik';
  }
  if (link.closest('header, .main-navbar')) return 'hlavicka';
  return 'text_stranky';
}

let listening = false;

/** Zapne měření kliků na tel:/mailto: odkazy kdekoli na webu (i v obsahu z administrace). */
export function initContactClickTracking() {
  if (listening || typeof document === 'undefined') return;
  listening = true;
  document.addEventListener('click', (e) => {
    const link = e.target?.closest?.('a[href^="tel:"], a[href^="mailto:"]');
    if (!link) return;
    const isPhone = link.getAttribute('href').toLowerCase().startsWith('tel:');
    trackLead(isPhone ? 'klik_telefon' : 'klik_email', { misto: linkPlacement(link) });
  }, { capture: true });
}

/* ------------------------------------------------------------------ */
/* Odkud návštěvník přišel — první dotyk, jen na dobu návštěvy          */
/* ------------------------------------------------------------------ */

// Převodník technických zdrojů na lidské názvy. Klíč = část domény nebo utm_source.
const SOURCE_NAMES = [
  [/(^|\.)facebook\.com$|^fb$|^facebook$/, 'Facebook'],
  [/(^|\.)instagram\.com$|^ig$|^instagram$/, 'Instagram'],
  [/(^|\.)tiktok\.com$|^tiktok$/, 'TikTok'],
  [/(^|\.)youtube\.com$|^youtu\.be$|^youtube$/, 'YouTube'],
  [/(^|\.)(x|twitter)\.com$|^t\.co$|^twitter$|^x$/, 'X (Twitter)'],
  [/(^|\.)reddit\.com$|^reddit$/, 'Reddit'],
  [/(^|\.)discord(app)?\.com$|^discord$/, 'Discord'],
  [/^email\.seznam\.cz$/, 'Seznam e-mail'],
  [/(^|\.)seznam\.cz$|^seznam$/, 'Seznam'],
  [/(^|\.)google\.[a-z.]+$|^google$/, 'Google'],
  [/(^|\.)bing\.com$|^bing$/, 'Bing'],
  [/(^|\.)duckduckgo\.com$/, 'DuckDuckGo'],
  [/(^|\.)(chatgpt\.com|chat\.openai\.com)$|^chatgpt$/, 'ChatGPT'],
  [/(^|\.)perplexity\.ai$|^perplexity$/, 'Perplexity'],
  [/^gemini\.google\.com$|^gemini$/, 'Gemini'],
  [/(^|\.)claude\.ai$|^claude$/, 'Claude'],
  [/(^|\.)copilot\.microsoft\.com$|^copilot$/, 'Copilot'],
  [/(^|\.)heureka\.(cz|sk)$|^heureka$/, 'Heureka'],
  [/(^|\.)zbozi\.cz$|^zbozi$/, 'Zboží.cz'],
  [/(^|\.)cardmarket\.com$|^cardmarket$/, 'Cardmarket'],
  [/^(newsletter|brevo|sendinblue|email|e-mail)$|sendibm\d*\.com$/, 'Newsletter'],
  [/^qr(_?kod)?$/, 'QR kód'],
  [/^(letak|leták|flyer)$/, 'Leták']
];

function humanSource(raw) {
  const key = String(raw || '').trim().toLowerCase();
  if (!key) return '';
  const hit = SOURCE_NAMES.find(([re]) => re.test(key));
  return hit ? hit[1] : key;
}

function detectSource() {
  const params = new URLSearchParams(window.location.search);
  const utm = params.get('utm_source');
  if (utm) {
    const campaign = params.get('utm_campaign');
    const name = humanSource(utm);
    return campaign ? `${name} (${campaign})` : name;
  }
  if (params.get('gclid')) return 'Google Ads';
  if (params.get('fbclid')) return 'Facebook';

  if (document.referrer) {
    try {
      const host = new URL(document.referrer).hostname.toLowerCase();
      if (!OWN_HOSTS.includes(host)) return humanSource(host);
    } catch { /* neplatný referrer */ }
  }
  return ''; // přímá návštěva — v e-mailu se řádek nezobrazí
}

/**
 * Zjistí zdroj při vstupu na web. Musí běžet PŘED vykreslením aplikace,
 * protože aplikace při startu přepisuje adresu a utm parametry by zmizely.
 * Platí první dotyk — při dalším proklikávání se zdroj nepřepisuje.
 */
export function captureVisitSource() {
  try {
    if (sessionStorage.getItem(SOURCE_KEY) !== null) return;
    sessionStorage.setItem(SOURCE_KEY, detectSource().slice(0, 120));
  } catch {
    // soukromé okno / blokované úložiště — formulář se odešle i bez zdroje
  }
}

/** Zdroj aktuální návštěvy pro formulář, nebo prázdný řetězec. */
export function getVisitSource() {
  try {
    return (sessionStorage.getItem(SOURCE_KEY) || '').slice(0, 120);
  } catch {
    return '';
  }
}
