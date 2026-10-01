/**
 * Odkaz na objednávku bez přihlášení.
 *
 * Každá objednávka má tajný klíč = HMAC-SHA256(číslo objednávky + e-mail)
 * podepsaný secretem ORDER_LINK_SECRET. Klíč nejde uhodnout ani odvodit
 * z čísla objednávky; v adrese nejsou žádné osobní údaje.
 *
 *   https://northvaletcg.eu/objednavka/260100217/?k=<32 hex znaků>
 *
 * Klíč vytváří send-order-email (tlačítko „Zobrazit objednávku“) a ověřuje
 * funkce order-view. Bez secretu se odkaz nevytvoří a e-mail funguje dál.
 */

const SITE = "https://northvaletcg.eu";

export async function orderAccessKey(orderId: unknown, email: unknown): Promise<string | null> {
  const secret = Deno.env.get("ORDER_LINK_SECRET");
  const id = String(orderId ?? "").trim();
  const mail = String(email ?? "").trim().toLowerCase();
  if (!secret || !id || !mail) return null;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(`${id}:${mail}`));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

/** Porovnání bez časového úniku (útočník nepozná, kolik znaků trefil). */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function orderViewUrl(orderId: unknown, email: unknown): Promise<string | null> {
  const k = await orderAccessKey(orderId, email);
  return k ? `${SITE}/objednavka/${encodeURIComponent(String(orderId))}/?k=${k}` : null;
}

/** Testovací adresy (testy objednávek, náhledy e-mailů) — nic se z nich neposílá obchodu ani Heurece. */
export function isTestEmail(email: unknown): boolean {
  const e = String(email ?? "").trim().toLowerCase();
  return e.includes("+nvtest") || e.endsWith("@example.com");
}

/**
 * Blok do zákaznických e-mailů objednávky: tlačítko „Zobrazit objednávku“,
 * odkaz na Moje objednávky a na časté dotazy. Styl jako ostatní prvky
 * e-mailů (zlaté tlačítko, šedý text 14 px, zlaté tučné odkazy).
 */
export function orderLinksBlockHtml(url: string | null): string {
  const button = url ? `
    <div style="text-align: center; margin: 28px 0 0 0;">
      <a href="${url}" target="_blank" style="background-color: #fdbd16; color: #111111; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block; border: 1px solid #e2a80f; box-shadow: 0 2px 4px rgba(253, 189, 22, 0.15);">
        Zobrazit objednávku
      </a>
      <p style="font-size: 13px; color: #666666; margin: 12px 0 0 0; line-height: 1.6;">
        Stav objednávky uvidíte kdykoli i bez přihlášení.<br/>
        Máte účet? Všechny objednávky najdete v sekci
        <a href="${SITE}/profile/" target="_blank" style="color: #fdbd16; text-decoration: underline; font-weight: bold;">Moje objednávky</a>.
      </p>
    </div>` : "";
  return `${button}
    <p style="font-size: 14px; color: #666666; margin: 24px 0 24px 0; line-height: 1.6; text-align: center;">
      Nevíte si s něčím rady? Nejčastější dotazy našich zákazníků najdete
      <a href="${SITE}/faq/" target="_blank" style="color: #fdbd16; text-decoration: underline; font-weight: bold;">zde</a>.
    </p>`;
}
