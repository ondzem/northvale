/**
 * Cloudflare Turnstile — ochrana formulářů a objednávek proti botům.
 *
 * Používá se neviditelný režim: návštěvník obvykle nic neklikne, widget se
 * ověří na pozadí. Jen u podezřelého provozu Cloudflare zobrazí zaškrtávátko.
 *
 * Veřejný klíč (site key) je určený k zobrazení v prohlížeči — není tajný.
 * Tajný klíč žije výhradně na serveru jako secret TURNSTILE_SECRET_KEY.
 */

export const TURNSTILE_SITE_KEY =
  import.meta.env.VITE_TURNSTILE_SITE_KEY || '0x4AAAAAAEz6RBGVuH4JasKw';

const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

let scriptPromise = null;

/** Načte skript Turnstile (jen jednou za celou návštěvu). */
function loadScript() {
  if (typeof window === 'undefined') return Promise.reject(new Error('no-window'));
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${SCRIPT_URL}"]`);
    const el = existing || document.createElement('script');
    if (!existing) {
      el.src = SCRIPT_URL;
      el.async = true;
      el.defer = true;
    }
    el.addEventListener('load', () => resolve(window.turnstile));
    el.addEventListener('error', () => {
      scriptPromise = null;
      reject(new Error('turnstile-script-failed'));
    });
    if (!existing) document.head.appendChild(el);
  });

  return scriptPromise;
}

/**
 * Získá ověřovací token.
 *
 * Vrací `null`, když se ověření nepovede (blokovaný skript, výpadek sítě).
 * Server je na to připravený a objednávku kvůli tomu neodmítne — cílem je
 * zastavit roboty, ne vyhodit zákazníka s přísným firewallem.
 *
 * @param {number} timeoutMs jak dlouho čekat, než to vzdáme
 * @returns {Promise<string|null>}
 */
export async function getTurnstileToken(timeoutMs = 8000) {
  try {
    const turnstile = await loadScript();
    if (!turnstile) return null;

    // Neviditelný kontejner mimo obrazovku — widget nemá nic vykreslovat,
    // dokud Cloudflare nevyhodnotí, že návštěvník je podezřelý.
    const holder = document.createElement('div');
    holder.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:300px;height:65px;';
    document.body.appendChild(holder);

    const token = await new Promise((resolve) => {
      const done = (value) => {
        clearTimeout(timer);
        resolve(value);
      };
      const timer = setTimeout(() => done(null), timeoutMs);

      let widgetId = null;
      try {
        widgetId = turnstile.render(holder, {
          sitekey: TURNSTILE_SITE_KEY,
          appearance: 'interaction-only',
          callback: (t) => done(t),
          'error-callback': () => done(null),
          'timeout-callback': () => done(null)
        });
      } catch (err) {
        console.warn('Turnstile render failed:', err);
        done(null);
      }

      // Po dokončení widget uklidíme, ať se nehromadí při opakovaných pokusech.
      const cleanup = () => {
        try { if (widgetId !== null) turnstile.remove(widgetId); } catch { /* widget už je pryč */ }
        try { holder.remove(); } catch { /* kontejner už je pryč */ }
      };
      setTimeout(cleanup, timeoutMs + 500);
    });

    return token || null;
  } catch (err) {
    console.warn('Turnstile nedostupný, pokračuji bez tokenu:', err);
    return null;
  }
}
