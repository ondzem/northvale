/**
 * Sdílená autorizace pro NORTHVALE edge funkce.
 *
 * POZOR: Supabase "verify_jwt" NENÍ ochrana. Anon klíč je platný JWT a je veřejně
 * dostupný v JS bundlu webu, takže se s ním dá zavolat jakákoli edge funkce.
 * Každá funkce, která dělá něco citlivého, si musí volajícího ověřit sama.
 */

export interface AuthContext {
  /** Přihlášený uživatel (null u service role nebo nepřihlášeného volání) */
  user: any | null;
  /** Volání zevnitř (jiná edge funkce se service klíčem) */
  isServiceRole: boolean;
  /** Uživatel s profiles.role = 'admin' */
  isAdmin: boolean;
  /** Byl v hlavičce vůbec nějaký token? */
  hasToken: boolean;
}

/** Dekóduje payload JWT bez ověření podpisu — jen ke zjištění claimu `role`. */
function decodeJwtPayload(token: string): Record<string, any> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    return JSON.parse(atob(padded));
  } catch (_e) {
    return null;
  }
}

/**
 * Zjistí, kdo volá. Rozpozná service role jak u starých JWT klíčů
 * (claim role=service_role), tak u nových klíčů typu sb_secret_… (shoda s env).
 */
export async function getAuthContext(
  req: Request,
  supabase: any,
  serviceKey: string
): Promise<AuthContext> {
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    return { user: null, isServiceRole: false, isAdmin: false, hasToken: false };
  }

  // 1) Service role — přímá shoda s env klíčem
  if (serviceKey && token === serviceKey) {
    return { user: null, isServiceRole: true, isAdmin: true, hasToken: true };
  }

  // 2) Service role — starý formát JWT s claimem role=service_role
  const payload = decodeJwtPayload(token);
  if (payload?.role === 'service_role') {
    return { user: null, isServiceRole: true, isAdmin: true, hasToken: true };
  }

  // 3) Anon klíč se za autorizaci NEPOVAŽUJE
  if (payload?.role === 'anon') {
    return { user: null, isServiceRole: false, isAdmin: false, hasToken: true };
  }

  // 4) Přihlášený uživatel
  try {
    const { data } = await supabase.auth.getUser(token);
    const user = data?.user || null;
    if (!user) {
      return { user: null, isServiceRole: false, isAdmin: false, hasToken: true };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    return {
      user,
      isServiceRole: false,
      isAdmin: profile?.role === 'admin',
      hasToken: true
    };
  } catch (_e) {
    return { user: null, isServiceRole: false, isAdmin: false, hasToken: true };
  }
}

export function jsonResponse(body: unknown, status: number, corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

/**
 * Vrátí Response, pokud volající NENÍ admin ani service role. Jinak null.
 *
 * Použití:
 *   const denied = requireAdmin(ctx, corsHeaders);
 *   if (denied) return denied;
 */
export function requireAdmin(ctx: AuthContext, corsHeaders: Record<string, string>) {
  if (ctx.isServiceRole || ctx.isAdmin) return null;
  if (!ctx.user) {
    return jsonResponse({ error: 'Unauthorized. Authentication required.' }, 401, corsHeaders);
  }
  return jsonResponse({ error: 'Forbidden. Admin access required.' }, 403, corsHeaders);
}

/** Vrátí Response, pokud volající není service role (interní volání). Jinak null. */
export function requireServiceRole(ctx: AuthContext, corsHeaders: Record<string, string>) {
  if (ctx.isServiceRole) return null;
  return jsonResponse({ error: 'Forbidden. Internal call only.' }, 403, corsHeaders);
}

/** Jednoduchá validace e-mailu pro veřejné formuláře. */
export function isValidEmail(email: unknown): boolean {
  if (typeof email !== 'string') return false;
  const e = email.trim();
  if (e.length < 5 || e.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
}

/** Ořízne a omezí délku textu z veřejného formuláře (ochrana proti zahlcení). */
export function clampText(value: unknown, maxLength: number): string {
  return String(value ?? '').trim().slice(0, maxLength);
}

/**
 * Escapuje HTML znaky. POVINNÉ pro cokoli, co od návštěvníka vkládáme
 * do těla e-mailu — jinak si může do zprávy propašovat vlastní odkazy
 * a tvářit se jako obchod (phishing na vlastní tým i na zákazníky).
 */
export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Escapovaný a délkově omezený text pro vložení do e-mailu. */
export function safeField(value: unknown, maxLength = 500): string {
  return escapeHtml(clampText(value, maxLength));
}
