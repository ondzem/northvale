# Ochrana proti botům (Cloudflare Turnstile)

Zavedeno 14. 9. 2026.

## Proč Turnstile a ne Cloudflare WAF / Vercel

Nejzranitelnější místa (objednávky, formuláře) volá prohlížeč **přímo na
supabase.co**. Ochrana na úrovni webu — Cloudflare WAF i Vercel — sedí před
*webem*, takže by tato volání vůbec neviděla a bot by je obešel. Turnstile se
ověřuje až uvnitř serverové funkce, proto ho obejít nelze.

Turnstile je navíc zdarma bez limitu, pro návštěvníka většinou neviditelný
a na rozdíl od Google reCAPTCHA bez problémů s GDPR.

## Co je chráněné

| Místo | Ochrana |
|---|---|
| Dokončení objednávky (`finalize-order`, akce `create`) | Turnstile + honeypot |
| Kontaktní formulář | Turnstile + honeypot |
| Newsletter | Turnstile + honeypot |
| Dotazy a upozornění u produktu | Turnstile + honeypot |
| Odstoupení od smlouvy | Turnstile + honeypot |
| Registrace a přihlášení | zapíná se v Supabase (viz krok 3) |

**Proč zrovna objednávky:** u dobírky a převodu se sklad odečítá hned při
vytvoření objednávky. Bez ochrany by robot dokázal vynulovat zásoby — reálným
zákazníkům by svítilo „vyprodáno“ — a zahltit e-maily.

## Nastavení

### 1. Klíče z Cloudflare
`dash.cloudflare.com` → Turnstile → widget pro `northvaletcg.eu`.
Vzniknou dva klíče: **Site key** (veřejný, patří do webu) a **Secret key**
(tajný, patří výhradně na server).

Chceš-li testovat i lokálně, přidej do domén widgetu `localhost`.

### 2. Tajný klíč do Supabase
Dashboard → Project Settings → Edge Functions → Secrets:

```
TURNSTILE_SECRET_KEY = <secret key z Cloudflare>
TURNSTILE_MODE       = monitor
```

### 3. Ochrana přihlašování
Dashboard → Authentication → Settings → **Enable CAPTCHA protection**,
provider **Turnstile**, vložit stejný secret key.
Tím se zastaví hromadné zakládání účtů (obrana proti falešným recenzím —
recenze smí psát jen přihlášený uživatel).

### 4. Veřejný klíč do Vercelu (nepovinné)
`VITE_TURNSTILE_SITE_KEY = <site key>`.
Když se nenastaví, použije se hodnota zapsaná v `src/services/turnstile.js`.
Site key není tajný, je vidět ve zdrojáku webu — to je v pořádku.

## Režimy: nejdřív monitor, potom enforce

`TURNSTILE_MODE` řídí, co se stane při neúspěšném ověření:

- **`monitor`** (výchozí) — jen se zapíše do logu a požadavek projde.
- **`enforce`** — požadavek se odmítne.

**Začni v `monitor`.** Ostré blokování od první minuty by mohlo vyhazovat
skutečné zákazníky s přísným blokátorem a nikdo by si toho nevšiml — objednávky
by prostě tiše mizely.

Po pár dnech: Supabase → Edge Functions → Logs, hledej `Turnstile NEPROŠEL`.
- Jen ojedinělé záznamy → přepni na `enforce`.
- Hodně záznamů od skutečných lidí → nech `monitor` a ozvi se.

Honeypot odmítá roboty **vždy**, bez ohledu na režim.

## Když ochrana selže

Kód je psaný tak, aby raději pustil než vyhodil zákazníka:
- Výpadek Cloudflare nebo chyba sítě → požadavek projde (zapíše se do logu).
- Nenastavený `TURNSTILE_SECRET_KEY` → ověření se přeskakuje.
- Prohlížeč token nezíská → v režimu `monitor` projde.

## Kde to v kódu je

| Soubor | K čemu |
|---|---|
| `supabase/functions/_shared/turnstile.ts` | ověření, režimy, honeypot |
| `src/services/turnstile.js` | získání tokenu v prohlížeči |
