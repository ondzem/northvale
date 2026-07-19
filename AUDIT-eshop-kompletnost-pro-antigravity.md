# Hloubkový audit e-shopu Northvale TCG — kompletnost pro spuštění (19. 7. 2026)

Cíl dokumentu: copy-paste zadání pro AntiGravity. Audit se nedíval na styl kódu, ale na to, jestli e-shop má vše, co profesionální e-shop potřebuje k fungování a získávání zákazníků. Každý bod má soubor a konkrétní instrukci.

**Celkový verdikt:** Základ je nadstandardně kompletní (právní dokumenty, checkout, e-maily, admin, Pohoda — viz sekce F). Před spuštěním je ale potřeba vyřešit 4 kritické body v sekci A (bezpečnost plateb a dat) a doplnit marketingovou vrstvu v sekci C, bez které e-shop nebude aktivně přivádět zákazníky.

---

## A. KRITICKÉ — opravit před spuštěním

### A1. Odstranit falešnou platební bránu (simulátor) z produkce
**Soubor:** `src/components/CheckoutFlow.jsx` (řádky ~669–692).
Když selže edge funkce `gp-webpay/sign`, kód spadne do „ComGate/GP Webpay simulátoru": zákazník zadá **skutečné číslo karty, expiraci a CVV do falešného formuláře** a objednávka se označí `paymentStatus: 'paid'`, ačkoli žádná platba neproběhla.
Důsledky: (1) neuhrazené objednávky vedené jako zaplacené, (2) sběr karetních dat mimo platební bránu = vážný problém vůči PCI DSS a důvěře.
**Instrukce:** Simulátor (`isGatewayOpen`, `handleGatewayPay`, stavy `cardNumber/cardExpiry/cardCvv` a celý modal) z produkčního buildu odstranit. Při selhání `sign` zobrazit chybu „Platba kartou je dočasně nedostupná" a nabídnout bankovní převod / dobírku. Stejný simulátor je i v `src/backup-preorder-investment/` — složka je záloha, ideálně ji vyřadit z buildu.

### A2. Faktury jsou ve veřejném storage bucketu — únik osobních údajů
**Soubor:** `src/components/admin/OrdersTab.jsx` (řádky ~1139, ~2117) — URL tvaru `.../storage/v1/object/public/invoices/invoice_{orderId}.pdf`.
Bucket `invoices` je public a ID objednávek jsou hádatelné (viz A3), takže **kdokoli může stáhnout faktury cizích zákazníků** (jméno, adresa, telefon, e-mail) prostým zkoušením URL. To je GDPR incident čekající na spuštění.
**Instrukce:** Přepnout bucket `invoices` (a případně bucket s order JSONy) na private. Přístup řešit přes `createSignedUrl` (admin i zákaznický portál) nebo přes edge funkci ověřující vlastníka objednávky.

### A3. Číslování objednávek: náhodné 4 číslice = kolize
**Soubory:** `src/components/CheckoutFlow.jsx` (řádky ~606 a ~703 — generuje se dokonce dvakrát nezávisle).
`'100' + Math.floor(1000 + Math.random() * 9000)` dává jen 9 000 možných čísel — statisticky první kolize kolem ~110. objednávky. Číslo se používá jako variabilní symbol, číslo faktury, orderNumber pro GP webpay i Pohodu → kolize rozbije párování plateb a účetnictví.
**Instrukce:** Zavést serverovou sekvenční řadu (Postgres sequence / tabulka čítačů přes edge funkci), formát např. `2026xxxxx`. Klient si číslo nesmí generovat sám.

### A4. Finalizaci objednávky přesunout na server (teď běží z prohlížeče přes anon key)
**Soubor:** `src/App.jsx`, funkce `submitOrder` (řádek ~1310 dál).
Odečty skladu (`products.stock`, `variants`, `daily_deal`) a zápis historie objednávek dělá klient přímo přes anon key. Aby to fungovalo, musí RLS povolovat public UPDATE na `products` → **kdokoli s anon klíčem (je v JS bundlu) může přepsat sklad a ceny v DB**. Navíc když zákazník zavře okno po platbě, sklad se neodečte a e-maily neodejdou.
**Instrukce:** Vytvořit jednu edge funkci `finalize-order` (service role), která atomicky: ověří platbu, odečte sklad, uloží objednávku, zavolá fakturu + e-maily + Pohodu. Klient posílá jen data objednávky. Poté RLS na `products`/`daily_deal`/`profiles` utáhnout na read-only pro anon. Dlouhodoběji zvážit řádnou tabulku `orders` místo JSONů ve storage (admin OrdersTab dnes čte listing přes `save-order-json`).

### A5. Připomínka: `preRegistrationActive: true`
**Soubor:** `src/config.js`. Web teď běží v předregistračním režimu. Před ostrým startem přepnout na `false` (a rozhodnout flagy `showGrading/showBuylist/showSlabs/showTestimonials`).

---

## B. NESOULAD obsahu vs. skutečných funkcí

### B1. VOP slibují doručení do celé EU — checkout to neumí
**Soubory:** `src/components/GdprVop.jsx` (sekce „2. DORUČENÍ DO ZAHRANIČÍ (EU)", ~ř. 410) vs. `CheckoutFlow.jsx`.
VOP: „Zboží doručujeme do všech členských států EU… cena se zobrazí v košíku." Checkout ale nemá výběr země, PSČ validuje česky, telefon defaultuje +420, ceny jen v Kč, Pohoda export má `billingCountry: 'CZ'` natvrdo.
**Instrukce (vybrat jedno):**
- a) Doplnit výběr země (minimálně **Slovensko** — pro TCG trh přirozená a velká expanze: GLS/DPD SK ceník, EUR přepočet nebo platba v Kč kartou), nebo
- b) upravit VOP a stránku Doprava na „doručujeme po ČR" (příp. ČR+SK), aby text nesliboval, co checkout neumí. Právně je slib v VOP závazný.

### B2. Zastaralá meta description „Zásilkovna a PPL"
**Soubor:** `src/App.jsx` (~ř. 865): meta pro dopravu zmiňuje „přes Zásilkovnu a PPL" — reálně jezdí DPD/GLS/osobní odběr. Opravit text. Zároveň v `CheckoutFlow.jsx` zbývá mrtvá větev `shipping === 'zasilkovna'` (ř. ~58) — vyčistit, ať se neplete.

---

## C. MARKETING & AKVIZICE — největší mezera vůči cíli „e-shop, který aktivně přivádí zákazníky"

### C1. GA4 e-commerce eventy úplně chybí (nejvyšší priorita v této sekci)
V celém `src/` je jediné volání `gtag` (consent update v `CookieConsent.jsx`). Chybí `view_item`, `add_to_cart`, `begin_checkout`, `add_shipping_info`, `add_payment_info`, `purchase`.
Bez toho: žádné měření konverzí, žádný funnel, nelze spustit Google Ads/PMax s konverzním cílem, žádná remarketingová publika.
**Instrukce:** Implementovat standardní GA4 ecommerce eventy (dataLayer) do ProductCard/SealedDetail (view_item, add_to_cart), Cart (view_cart, remove_from_cart), CheckoutFlow (begin_checkout, add_shipping_info, add_payment_info) a OrderConfirmation (purchase s transaction_id = číslo objednávky, value, items). Respektovat existující Consent Mode.

### C2. Produktové feedy — pro český trh klíčový akviziční kanál, chybí úplně
Žádný Google Merchant XML, žádný Heureka.cz feed, žádný Zboží.cz feed.
**Instrukce:** Edge funkce (nebo build skript s cron přegenerováním) generující z tabulky `products`: (1) Google Merchant feed → Google Shopping/PMax, (2) Heureka XML, (3) Zboží.cz XML. Sběratelské TCG produkty mají na Heurece/Zboží silné vyhledávání a nízkou konkurenci.

### C3. Retargeting pixely
Je jen GA4. Zvážit Meta Pixel (IG/FB je pro TCG komunitu hlavní kanál — účty už v patičce jsou) a Sklik retargeting. Načítat podmíněně po souhlasu — CMP s Consent Mode V2 už je hotová, takže jde jen o napojení.

### C4. Recenze a důvěra
`showTestimonials: false` a neexistují produktové recenze. Po spuštění: zapojit **Heureka Ověřeno zákazníky** (dotazník po nákupu) + Google Reviews, badge do patičky/checkout. Zvyšuje konverzi víc než cokoli jiného v této sekci. Volitelně jednoduché produktové recenze (hvězdičky) → pak jde do Product JSON-LD doplnit `aggregateRating` (hvězdičky ve výsledcích Googlu).

### C5. Opuštěný košík
Košík se ukládá (localStorage/profil), ale nikdo opuštěné košíky nevymáhá. Brevo (už používané na e-maily) umí automatizaci — stačí posílat event „cart updated" s e-mailem, jakmile je znám. Standardně +5–10 % dokončených objednávek.

---

## D. SEO — technická doladění (základ je dobrý)

### D1. Sociální náhledy nefungují kvůli client-side renderingu
OG tagy, title, description i JSON-LD se vkládají JavaScriptem (`App.jsx` SEO efekt). Facebook/WhatsApp/Discord crawler JS nespouští → **sdílený odkaz na produkt nebo článek ukáže jen generický popis z index.html, bez obrázku produktu**. Pro shop žijící z IG/FB komunity znatelná ztráta.
**Instrukce:** Nejlevnější řešení: prerender statických rout + produktů při buildu (např. `vite-plugin-prerender`), nebo edge middleware (Cloudflare Worker / Netlify Edge), který pro bot User-Agenty vloží správné OG tagy podle URL. Google indexaci CSR zvládá, ale pomaleji a méně spolehlivě — prerender pomůže i tam.

### D2. Drobnosti
- `FaqPage.jsx`: doplnit `FAQPage` JSON-LD schema (šance na rozbalené výsledky v Googlu).
- Product JSON-LD (`App.jsx` ~1008): doplnit `brand` (Pokémon/Lorcana…), `sku`, u variant `AggregateOffer`.
- `BlogPosting` schema má natvrdo `datePublished: 2026-06-18` pro všechny články — brát reálné datum z `blogData.js`.
- Sitemap se generuje jen při `npm run build` — nový produkt bez deploye v sitemap chybí. Přegenerovávat cronem (edge funkce) nebo při uložení produktu v adminu.
- EN mutace je jen klientský přepínač bez vlastních URL — Google indexuje jen CZ. Pokud je EN důležitá (EU expanze z B1), řešit `?lang=en` / `/en/` + hreflang; jinak neřešit.

---

## E. NICE-TO-HAVE (po spuštění)

- **Sledování objednávky pro hosty**: guest checkout funguje, ale host nemá kam se podívat na stav (jen e-maily). Stránka „stav objednávky" (číslo objednávky + e-mail) by snížila dotazy na podporu.
- **Dárkové poukazy** — u sběratelských her silná vánoční mechanika (homepage recenze o dárcích už na to naráží).
- **Věrnostní program** — Store Credit infrastruktura už existuje, stačí pravidlo (např. 1 % z nákupu jako kredit).
- **Live chat / Messenger widget** na podporu předprodejních dotazů.
- ESLint hlásí drobnosti v `alert(msg, 'error')` voláních (druhý argument window.alert nic nedělá) — vizuálně to funguje, ale zvážit jednotné použití existujícího `showToast`.

---

## F. CO JE HOTOVÉ DOBŘE (neměnit, jen pro kontext)

Právní balík je kompletní a nadstandardní: VOP vč. specifik sběratelského zboží (shrink wrap, snížení hodnoty), GDPR, reklamační řád s ČOI/ADR/ODR, odstoupení od smlouvy s formulářem a e-mailem, VOP v příloze potvrzovacího e-mailu, IČO/DIČ v patičce. Cookie lišta s Google Consent Mode V2. Checkout: host i účet, firma (IČO/DIČ), DPD/GLS výdejní místa s mapou, osobní odběr, karta (GP webpay produkční URL), převod s QR platbou, dobírka, slevové kódy, store credit, validace skladu v košíku. E-maily přes Brevo: potvrzení s fakturou PDF, tracking e-maily při expedici, admin notifikace, double opt-in newsletter. Admin: produkty, objednávky vč. GLS/DPD štítků, kategorie, slevy, FAQ, homepage editor, newsletter, Pohoda sync. K tomu watchdog dostupnosti/ceny, oblíbené, vyhledávání s napovídáním, blog se 6 SEO články, sitemap + robots + llms.txt, favicony, preload LCP. Solidní práce.

---

### Doporučené pořadí pro AntiGravity
1. A1 (falešná brána) → 2. A2 (private faktury) → 3. A3+A4 (čísla objednávek + serverová finalizace, souvisí spolu) → 4. B1 (rozhodnout ČR/EU a srovnat VOP s checkoutem) → 5. C1 (GA4 eventy) → 6. D1 (OG prerender) → 7. C2 (feedy) → 8. zbytek C/D/E.
