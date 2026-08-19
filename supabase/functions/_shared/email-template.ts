/**
 * Sdílená vizuální šablona zákaznických e-mailů NORTHVALE.
 *
 * Aby všechny e-maily z eshopu vypadaly stejně, berou hlavičku, patičku
 * i obal z jednoho místa. Dřív byla šablona zkopírovaná v send-order-email;
 * při přidání ručního odesílání faktur se vytáhla sem.
 */

/** Obal celého e-mailu — nutí světlý režim, aby se barvy nerozbily v tmavých klientech. */
export function wrapInHtmlDocument(innerContent: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <style>
    :root {
      color-scheme: light;
      supported-color-schemes: light;
    }
    body {
      background-color: #f5f6f8 !important;
      margin: 0;
      padding: 0;
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
  </style>
</head>
<body style="background-color: #f5f6f8; margin: 0; padding: 0;">
  ${innerContent}
</body>
</html>`;
}

/**
 * Vysází obsah do standardní karty s logem a patičkou.
 *
 * @param emoji     velký symbol nad nadpisem (např. "🧾")
 * @param title     hlavní nadpis
 * @param subtitle  řádek pod nadpisem (nepovinný, už jako HTML)
 * @param body      tělo zprávy (HTML)
 */
export function renderEmailCard(opts: {
  emoji: string;
  title: string;
  subtitle?: string;
  body: string;
}): string {
  const { emoji, title, subtitle, body } = opts;
  return `
    <div style="background-color: #f5f6f8; padding: 40px 10px; font-family: 'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; min-height: 100%;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e1e4e8; border-radius: 12px; padding: 40px 30px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); color: #222222;">

        <!-- Logo Header -->
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #fdbd16; font-size: 26px; font-weight: 800; margin: 0; letter-spacing: 2px; text-transform: uppercase;">NORTHVALE</h1>
          <p style="color: #8a8a92; font-size: 11px; text-transform: uppercase; letter-spacing: 4px; margin: 3px 0 0 0;">Trading Card Games</p>
        </div>

        <div style="text-align: center; margin-bottom: 24px; font-size: 54px;">
          ${emoji}
        </div>

        <!-- Header Title -->
        <div style="text-align: center; margin-bottom: 30px;">
          <h2 style="color: #111111; font-size: 26px; font-weight: 800; margin: 0; letter-spacing: -0.5px;">${title}</h2>
          ${subtitle ? `<p style="font-size: 14px; color: #888888; margin: 8px 0 0 0;">${subtitle}</p>` : ''}
        </div>

        ${body}

        <!-- Help / System Info -->
        <div style="border-top: 1px solid #e1e4e8; padding-top: 24px; margin-top: 30px; text-align: center;">
          <p style="font-size: 12px; color: #888888; margin: 0; line-height: 1.6;">
            Děkujeme za Váš nákup na NORTHVALE TCG. V případě dotazů nás kontaktujte na
            <a href="mailto:info@northvaletcg.eu" style="color: #fdbd16; text-decoration: underline; font-weight: bold;">info@northvaletcg.eu</a>.
          </p>
        </div>
      </div>
    </div>
  `;
}

/**
 * Věta, kterou zákazník vidí místo faktury, dokud se faktury vystavují ručně.
 * Držet na jednom místě, ať se formulace nerozejde napříč e-maily.
 */
export const INVOICE_FOLLOWS_NOTE =
  'Fakturu (daňový doklad) Vám zašleme dodatečně v samostatném e-mailu.';
