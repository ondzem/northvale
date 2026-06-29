# Propojení e-shopu NORTHVALE s účetním systémem POHODA

> Praktický návod „co a jak udělat", napsaný na míru tvému projektu.
> Stav: POHODA **SQL/E1**, požadavek na **real-time** synchronizaci, Pohoda běží na **serveru zapnutém 24/7**.

---

## 1. Hlavní rozhodnutí (TL;DR)

Protože klient má **POHODA SQL/E1** a chceš **okamžitou** synchronizaci skladu, použiješ tzv. **POHODA mServer** — to je malý HTTP server, který je přímo součástí Pohody (v SQL/E1 zdarma). Tvůj e-shop mu přes internet posílá XML požadavky a Pohoda hned odpovídá.

Tři věci, které ti to zjednoduší život a ušetří peníze:

1. **Nemusíš kupovat pevnou IP adresu.** Místo toho použiješ **Cloudflare Tunnel** (zdarma) — bezpečně „vystrčí" mServer z lokálního počítače na internet pod tvojí doménou, bez otevírání portů na routeru.
2. **Nemusíš řešit FTP server na obrázky.** Obrázky produktů už spravuješ na straně e-shopu (Supabase/Netlify), takže přenos obrázků přes Pohodu (co zmiňoval technik) vůbec nepotřebuješ. FTP byl jen pro starší způsob „Obecný internetový obchod".
3. **Většinu kódu napíše Antigravity.** Na e-shopu už máš připravenou (prázdnou) složku `supabase/functions/pohoda-connector` — přesně tam to patří. Máš i hotové funkce pro faktury, platby (GP webpay), GLS a e-maily, takže Pohoda je poslední dílek.

Dvě roviny komunikace:

- **Z e-shopu DO Pohody (okamžitě):** zákazník zaplatí → e-shop pošle do Pohody XML fakturu (resp. výdejku) → Pohoda ji zaúčtuje a **sama odečte sklad**.
- **Z Pohody DO e-shopu (každých ~5 min / tlačítko):** klient přidá/změní zboží v Pohodě → e-shop si vyžádá seznam zásob (`listStockRequest`) → uloží produkty a stavy skladu do databáze.

---

## 2. Jak XML komunikace funguje (princip)

Pohoda komunikuje přes strukturované XML podle systému **požadavek → odpověď**:

- Obálka **`<dataPack>`** = jeden požadavek (obsahuje `version="2.0"`, `ico` firmy, `application`).
- Uvnitř jeden či více **`<dataPackItem>`** = jednotlivé operace (jedna faktura, jeden export skladu…).
- Každý záznam má vlastní jmenný prostor podle agendy: faktura `inv:`, sklad/zásoby `stk:` / `lStk:`, objednávka `ord:`, adresář `adr:`.
- Pohoda vrátí **`<responsePack>`** s `state="ok"` / `"error"` / `"warning"` a u chyb `<detail>` s `<code>` a `<message>`.

Podporované operace: **vytvoření, aktualizace, mazání** záznamů (přesně ty čtyři věci, co jsi chtěl — import, export, aktualizace, mazání). Tisk a e-maily neřešíš, ty už máš jinde.

Závazná „dokumentace polí" pro každou agendu = **XSD schémata** (odkaz dole). Podle nich Antigravity sestaví přesné XML.

---

## 3. Co si připravit (nástroje a ceny)

| Co | K čemu | Cena |
|---|---|---|
| **POHODA SQL/E1** | už máš (klient) — obsahuje mServer | 0 navíc |
| **Cloudflare účet + Cloudflare Tunnel** | bezpečně vystaví mServer na internet | **zdarma** |
| **Doména (Forpsi)** | nasměruješ subdoménu, např. `pohoda.tvojedomena.cz` | už máš |
| **Supabase Edge Functions + cron** | běh konektoru + plánovaná synchronizace | v rámci tvého plánu (free tier stačí) |
| **Netlify** | hosting webu | už máš |
| Pevná IP od poskytovatele | **NEPOTŘEBUJEŠ** (nahradí Cloudflare Tunnel) | — |
| FTP server | **NEPOTŘEBUJEŠ** (obrázky držíš na e-shopu) | — |

---

## 4. Část A — co se nastaví na straně POHODY (ty + technik/klient)

Tohle dělá člověk, který má přístup k serveru s Pohodou (klient nebo technik Pohody). Ty mu dáš tenhle seznam.

1. **Zapnout práva pro komunikaci** v Pohodě:
   - `Nastavení → Přístupová práva` → větev **Soubor / Datová komunikace** → povolit XML komunikaci.
   - Větev **Administrátorské funkce / POHODA mServer** → povolit.
2. **Založit servisního uživatele** v Pohodě (jen pro e-shop, vlastní jméno + silné heslo). Tyto údaje pak půjdou do e-shopu jako tajný klíč.
3. **Spustit a nastavit mServer** (`Soubor → mServer` / dle verze): zvolit **účetní jednotku** (firmu), **port** (standardně `444`), a nechat naslouchat. Zapnout **HTTPS**, pokud to verze nabízí.
4. **Zjistit IČO firmy** (účetní jednotky) — bude v každém XML požadavku.
5. **Vystavit mServer na internet přes Cloudflare Tunnel** (na tom serveru):
   - Založit účet na Cloudflare a přidat tam doménu (Forpsi doména, free plán) — nebo použít subdoménu.
   - Nainstalovat `cloudflared`, vytvořit „named tunnel" a namapovat veřejné `https://pohoda.tvojedomena.cz` → `http://localhost:444`.
   - Tím vznikne stabilní HTTPS adresa, kterou bude volat e-shop. Žádné porty na routeru se neotevírají.
6. **Test, že mServer žije:** v prohlížeči/přes curl otevřít `https://pohoda.tvojedomena.cz/status` → musí vrátit XML se `<status>idle</status>`.

> Pozn.: Pohoda na tom serveru musí **běžet a být přihlášená** v dané účetní jednotce, aby mServer odpovídal.

---

## 5. Část B — co se udělá na straně e-shopu (přes Antigravity)

Cílem je naplnit funkci `supabase/functions/pohoda-connector`. Bude umět:

1. **Sestavit XML** (`dataPack`) pro danou operaci a **odeslat** ji `POST`em na mServer:
   - URL: `https://pohoda.tvojedomena.cz/xml`
   - Hlavičky: `Content-Type: text/xml`, `STW-Authorization: Basic <base64(jmeno:heslo)>`, `STW-Application: NorthvaleEshop`
2. **Zpracovat odpověď** `responsePack` — rozpoznat `ok` / `error`, u chyby uložit `code` + `message` do logu.
3. **Real-time tok (objednávka → Pohoda):** napojit za úspěšnou platbu (na konec toku `gp-webpay`, vedle `generate-invoice-pdf` / `send-order-email`) — poslat do Pohody **vydanou fakturu se skladovými položkami**, čímž se v Pohodě **odečte sklad**.
4. **Tok import produktů (Pohoda → e-shop):** funkce, která pošle `listStockRequest`, dostane zpět seznam zásob a **upsertne** je do tabulky `products` (mapování na tvoje sloupce: `name`, `price`, `stock`, `code/id`, …).
5. **Plánování:** Supabase **cron** spustí import zásob každých ~5–10 min; do admin panelu přidat tlačítko **„Synchronizovat teď"** a tabulku **`pohoda_sync_log`** (čas, směr, ok/chyba, zpráva) — sedí to k tomu, co už máš v handover dokumentech zmíněné („logy synchronizace skladu").
6. **Tajné údaje** ulož do Supabase secrets (ne do kódu): `POHODA_URL`, `POHODA_USER`, `POHODA_PASS`, `POHODA_ICO`.

**Zdroj pravdy (důležité, ať v tom není bordel):**
- **Sklad a ceny** = master v **Pohodě** (klient tam zboží zakládá). E-shop si je stahuje.
- **Objednávky** vznikají na e-shopu a posílají se do Pohody jako faktury/výdejky.
- E-shop si po prodeji odečte sklad sám (rychlá odezva pro zákazníka), ale **pravdivý stav** vždy srovná pravidelný import z Pohody.

---

## 6. Hotový prompt pro Antigravity IDE (zkopíruj)

> Vlož do chatu v Antigravity. Klidně ho dej po částech (nejdřív krok 1–3, pak zbytek).

```text
Pracujeme v projektu NORTHVALE (React + Vite frontend, Supabase backend s Edge Functions v Denu/TypeScriptu, hosting Netlify). Budeme propojovat e-shop s účetním systémem POHODA SQL/E1 přes jeho mServer (HTTP API, formát XML, verze 2.0). Komunikace jde přes HTTPS na adresu uloženou v secretu POHODA_URL (endpoint /xml), autentizace hlavičkou STW-Authorization: Basic base64(POHODA_USER:POHODA_PASS), v každém dataPacku je ico=POHODA_ICO a application="NorthvaleEshop".

Cíl: naplnit funkci supabase/functions/pohoda-connector a napojit ji do existujícího toku.

Udělej tohle:

1) Edge Function `pohoda-connector` s pomocnými moduly:
   - buildDataPack(operace, payload) → sestaví validní XML <dataPack version="2.0" ico=... application="NorthvaleEshop">.
   - sendToPohoda(xml) → POST na POHODA_URL + "/xml" s hlavičkami Content-Type: text/xml a STW-Authorization (Basic). Vrátí raw odpověď.
   - parseResponse(xml) → vytáhne state (ok/error/warning) a u chyb code + message z <responsePack>/<responsePackItem>/<detail>.
   - Použij UTF-8; pokud by Pohoda hlásila problém s diakritikou, přepneme na Windows-1250.

2) Operace EXPORT ZÁSOB (Pohoda → e-shop):
   - Pošli požadavek listStockRequest (namespace lStk, list_stock.xsd).
   - Z odpovědi vyparsuj zásoby a UPSERTni je do tabulky `products` (mapuj na sloupce name, price, stock, a párovací klíč – navrhni sloupec pohoda_code/pohoda_id; nejdřív mi ukaž návrh mapování polí Pohoda→products a počkej na potvrzení).
   - Přidej Supabase cron (každých 10 min), který tuhle operaci spustí.

3) Operace ODEČET SKLADU PŘI OBJEDNÁVCE (e-shop → Pohoda, real-time):
   - Po ÚSPĚŠNÉ platbě (napoj za gp-webpay, vedle generate-invoice-pdf a send-order-email) pošli do Pohody vydanou fakturu (namespace inv, invoice.xsd) s položkami navázanými na skladové zásoby (přes pohoda_code/id), aby Pohoda automaticky odečetla sklad.
   - Nejdřív mi vygeneruj ukázkové XML jedné faktury a počkej na potvrzení, než to zapojíš do ostrého toku.

4) Logování a admin:
   - Vytvoř tabulku `pohoda_sync_log` (id, created_at, direction, operation, status, message, payload_excerpt).
   - Každé volání Pohody zaloguj.
   - Do admin panelu přidej tlačítko „Synchronizovat sklad teď" (zavolá export zásob) a jednoduchý výpis posledních 20 řádků z pohoda_sync_log.

5) Bezpečnost a konfigurace:
   - Žádné údaje natvrdo v kódu. Použij Supabase secrets: POHODA_URL, POHODA_USER, POHODA_PASS, POHODA_ICO.
   - Přidej ošetření chyb a timeoutů (Pohoda zpracovává požadavky synchronně, jeden po druhém).

6) Test:
   - Napiš malý testovací příkaz, který zavolá GET POHODA_URL + "/status" a vypíše stav mServeru, ať ověříme spojení dřív, než pošleme data.

Postupuj po krocích, u bodů 2 a 3 se mě nejdřív zeptej na potvrzení mapování/struktury. Respektuj strukturu schémat POHODA XML 2.0 (https://api.stormware.cz/pohoda/xsd-schema/).
```

---

## 7. Otázky/úkoly pro technika nebo klienta (Pohoda)

Pošli mu tohle, ať máš vše, co konektor potřebuje:

1. Potvrď variantu (SQL nebo E1) a verzi Pohody.
2. **IČO** účetní jednotky, se kterou se má pracovat.
3. Vytvoř v Pohodě **servisního uživatele** pro e-shop (jméno + heslo) a nastav mu práva **Datová komunikace** + **mServer**.
4. Spusť **mServer** na portu `444` a potvrď, že běží (`/status` vrací XML).
5. Můžeme mServer vystavit přes **Cloudflare Tunnel** na `https://pohoda.tvojedomena.cz`? (alternativa: HTTPS + přesměrování). Pomůžeš s instalací `cloudflared` na serveru?
6. Jak v Pohodě **párovat položky e-shopu se skladovými zásobami** — přes kód zásoby, EAN, nebo ID? (potřebuju jednotný klíč)
7. Má se sklad odečítat **vydanou fakturou**, nebo raději **výdejkou**? Co preferuje účetní?

---

## 8. Bezpečnost (krátce)

- mServer používá **Basic auth** — proto je nutné HTTPS (Cloudflare Tunnel ho dává automaticky). Nikdy ne čisté HTTP přes internet.
- Servisní uživatel ať má **jen nutná práva**.
- Údaje drž v **Supabase secrets**, ne v repozitáři.
- Volitelně omez přístup na endpoint přes Cloudflare (např. tajná hlavička ověřená Cloudflare Workerem).

---

## 9. Klíčové odkazy

- Popis struktury XML (dataPack / responsePack): https://api.stormware.cz/pohoda/popis-struktury-xml/
- XML import (operace create/update/delete): https://api.stormware.cz/pohoda/xml-import/
- XML export + filtrování: https://api.stormware.cz/pohoda/xml-export/
- **XSD schémata (závazná pole agend):** https://api.stormware.cz/pohoda/xsd-schema/
- Podporovaná data – Zásoby: https://api.stormware.cz/pohoda/xml-export-podporovana-data/sklady/zasoby/
- Podporovaná data – Faktury: https://api.stormware.cz/pohoda/xml-import-podporovana-data/faktury/faktury/
- **mServer – pro vývojáře** (HTTP, hlavičky, /status, /xml): https://www.stormware.cz/pohoda/xml/mserver/provyvojare/
- mServer – nastavení a spuštění: https://www.stormware.cz/pohoda/xml/mserver/nastaveni/ , https://www.stormware.cz/pohoda/xml/mserver/spusteni/
- Nastavení Obecného internetového obchodu (záložní/alternativní způsob, FTP, XSLT): https://www.stormware.cz/pohoda/xml/obecny-obchod/nastaveni/
- Cloudflare Tunnel (zdarma): https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/
