/**
 * Ověření Cloudflare Turnstile — ochrana proti botům.
 *
 * Proč zrovna Turnstile: děravé endpointy volá prohlížeč PŘÍMO na supabase.co,
 * takže ochrana na úrovni webu (Cloudflare WAF, Vercel) by je neviděla.
 * Tohle se ověřuje až tady ve funkci, takže se to obejít nedá.
 *
 * Nastavení: tajný klíč jako secret TURNSTILE_SECRET_KEY v Supabase.
 * Dokud secret není nastavený, ověření se PŘESKAKUJE a jen se zaloguje varování —
 * aby zapnutí ochrany neshodilo eshop dřív, než je klíč na místě.
 */

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/**
 * Režim ochrany — secret TURNSTILE_MODE v Supabase.
 *
 *   monitor (výchozí) — neúspěšné ověření se JEN zaloguje a požadavek projde.
 *                       Bezpečný start: pár dní se koukneme do logů, jestli
 *                       ochrana neodmítá skutečné zákazníky.
 *   enforce           — neúspěšné ověření požadavek odmítne. Zapnout až potom,
 *                       co logy potvrdí, že reální lidé procházejí.
 *
 * Proč takhle: kdyby ostré blokování vyhazovalo zákazníky s přísným
 * blokátorem, přicházeli bychom o objednávky a nikdo by si toho nevšiml.
 */
function isEnforcing(): boolean {
  return (Deno.env.get('TURNSTILE_MODE') || 'monitor').toLowerCase() === 'enforce';
}

/**
 * Rozhodne, zda požadavek pustit dál.
 * Vrací true = pustit, false = odmítnout.
 */
export function shouldAllow(result: TurnstileResult, label: string): boolean {
  if (result.ok) return true;
  if (!isEnforcing()) {
    console.warn(`[${label}] Turnstile NEPROŠEL (${result.reason}) — režim monitor, požadavek propuštěn.`);
    return true;
  }
  console.warn(`[${label}] Turnstile NEPROŠEL (${result.reason}) — režim enforce, požadavek odmítnut.`);
  return false;
}

export interface TurnstileResult {
  ok: boolean;
  /** true = ochrana není nakonfigurovaná, požadavek prošel bez ověření */
  skipped: boolean;
  reason?: string;
}

export async function verifyTurnstile(token: unknown, remoteIp?: string | null): Promise<TurnstileResult> {
  const secret = Deno.env.get('TURNSTILE_SECRET_KEY');

  if (!secret) {
    console.warn('[turnstile] TURNSTILE_SECRET_KEY není nastavený — ověření přeskočeno.');
    return { ok: true, skipped: true };
  }

  const t = typeof token === 'string' ? token.trim() : '';
  if (!t) return { ok: false, skipped: false, reason: 'missing-token' };

  try {
    const form = new URLSearchParams();
    form.set('secret', secret);
    form.set('response', t);
    if (remoteIp) form.set('remoteip', remoteIp);

    const res = await fetch(VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString()
    });

    if (!res.ok) {
      // Výpadek Cloudflare nesmí shodit objednávky — pustíme dál a zalogujeme.
      console.error(`[turnstile] siteverify HTTP ${res.status} — požadavek propuštěn.`);
      return { ok: true, skipped: true, reason: `http-${res.status}` };
    }

    const data = await res.json();
    if (data?.success === true) {
      return { ok: true, skipped: false };
    }

    const codes = Array.isArray(data?.['error-codes']) ? data['error-codes'].join(',') : 'unknown';
    return { ok: false, skipped: false, reason: codes };
  } catch (err) {
    console.error('[turnstile] ověření selhalo, požadavek propuštěn:', err);
    return { ok: true, skipped: true, reason: 'network-error' };
  }
}

/** Vrátí IP volajícího z hlaviček, které Supabase předává. */
export function callerIp(req: Request): string | null {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('cf-connecting-ip') || null;
}

/**
 * Honeypot — skryté pole, které člověk nikdy nevyplní, ale robot ano.
 * Zdarma a chytí velkou část jednoduchých botů ještě před Turnstilem.
 */
export function isHoneypotFilled(body: any): boolean {
  const v = body?.website ?? body?.honeypot ?? body?._gotcha;
  return typeof v === 'string' && v.trim().length > 0;
}
