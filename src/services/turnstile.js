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

/**
 * Nejdelší doba, po kterou se vůbec čeká na ověření — včetně času, kdy
 * uživatel klikal na „nejsem robot“. Po jejím vypršení pokračujeme bez tokenu.
 */
const HARD_LIMIT_MS = 30000;

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

    // POZOR: kontejner NESMÍ být schovaný mimo obrazovku.
    // V režimu „interaction-only“ je widget neviditelný jen do chvíle, než
    // Cloudflare vyhodnotí návštěvníka jako podezřelého (např. dvakrát špatné
    // heslo) — pak chce zaškrtnutí „nejsem robot“. Když je prvek mimo
    // obrazovku, nemá se kde zobrazit, uživatel nemá co potvrdit a přihlášení
    // skončí chybou „no captcha_token found“.
    //
    // Proto sedí dole uprostřed obrazovky: dokud není potřeba, má nulovou
    // velikost a není vidět; jakmile je potřeba, vyskočí nad obsah.
    const holder = document.createElement('div');
    holder.style.cssText = [
      'position:fixed',
      'left:50%',
      'bottom:24px',
      'transform:translateX(-50%)',
      'z-index:2147483000',
      'display:flex',
      'justify-content:center'
    ].join(';');
    document.body.appendChild(holder);

    let widgetRef = { id: null };
    const cleanup = () => {
      try { if (widgetRef.id !== null) turnstile.remove(widgetRef.id); } catch { /* widget už je pryč */ }
      try { holder.remove(); } catch { /* kontejner už je pryč */ }
    };

    const token = await new Promise((resolve) => {
      let timer = null;
      let hardTimer = null;
      const done = (value) => {
        if (timer) clearTimeout(timer);
        if (hardTimer) clearTimeout(hardTimer);
        // Uklidit až po dokončení — dřív ne. Kdyby se widget odstranil podle
        // pevného časovače, zmizel by uživateli zaškrtávátko pod rukama.
        setTimeout(cleanup, 150);
        resolve(value);
      };
      const arm = (ms) => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => done(null), ms);
      };
      arm(timeoutMs);

      // Tvrdý strop. Kdyby se widget zasekl (nedostupná doména, výpadek),
      // nesmí tlačítko zůstat zamčené donekonečna — raději pustíme dál bez
      // tokenu, než abychom zákazníkovi zablokovali přihlášení či objednávku.
      hardTimer = setTimeout(() => done(null), HARD_LIMIT_MS);

      try {
        widgetRef.id = turnstile.render(holder, {
          sitekey: TURNSTILE_SITE_KEY,
          appearance: 'interaction-only',
          callback: (t) => done(t),
          // Cloudflare se chystá zobrazit zaškrtávátko — od téhle chvíle čekáme
          // na člověka, ne na stroj, takže původních pár vteřin nestačí.
          'before-interactive-callback': () => arm(HARD_LIMIT_MS),
          'error-callback': () => done(null),
          'timeout-callback': () => done(null)
        });
      } catch (err) {
        console.warn('Turnstile render failed:', err);
        done(null);
      }

    });

    return token || null;
  } catch (err) {
    console.warn('Turnstile nedostupný, pokračuji bez tokenu:', err);
    return null;
  }
}
