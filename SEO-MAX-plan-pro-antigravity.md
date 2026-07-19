# SEO-MAX plán — northvaletcg.eu (audit 19. 7. 2026)

Cíl: maximální viditelnost v Google/Seznam **a** v AI vyhledávání (ChatGPT, Perplexity, Google AI Overviews). Copy-paste zadání pro AntiGravity. Nálezy ověřeny čtením kódu i živého webu.

## ⚠️ INSTRUKCE PRO AGENTA (čti jako první)

1. **Pracuj po sekcích v pořadí ze sekce G** (A1 → A2 → B → C → D). Nedělej všechno najednou — dokonči sekci, ověř akceptační test, pak pokračuj.
2. **Bod neoznačuj jako hotový bez ověření.** U A1 a A2 jsou akceptační testy napsané přímo v textu (curl na živou doménu). U ostatních bodů ověř výsledek v lokálním buildu (`npm run build && npm run preview`).
3. **Neměň nic mimo rozsah bodu.** Žádné refaktoringy, přejmenovávání ani „vylepšení" okolního kódu. Design a vzhled webu zůstává beze změny.
4. **Sekce F a body D3, D5 a kroky 4 v sekci G nejsou pro tebe** — to jsou ruční kroky majitele (registrace nástrojů, Google Business Profile). Přeskoč je.
5. Pokud u A1 zjistíš, že problém není v repozitáři, ale v nastavení hostingu (dashboard), **zastav se a napiš přesný postup, co má majitel v administraci hostingu udělat** — nehádej a nedělej workaroundy v kódu.
6. Texty (titles, descriptions, popisy kategorií) piš česky, přirozeně, bez keyword stuffingu. Návrhy v B1 jsou závazné šablony.

**Shrnutí:** On-page základ v kódu je dobrý (H1 struktura, canonical, OG, JSON-LD, blog). Ale web má **2 kritické blokátory, kvůli kterým se do vyhledávačů nedostane skoro nic**: (1) sitemap/robots/llms.txt se na produkci vůbec neservírují, (2) celý obsah se renderuje jen JavaScriptem. Dokud se nevyřeší sekce A, nemá smysl ladit detaily.

---

## A. KRITICKÉ BLOKÁTORY — bez nich SEO nefunguje vůbec

### A1. robots.txt, sitemap.xml a llms.txt se na produkci neservírují (ověřeno živě 19. 7.)
`https://northvaletcg.eu/robots.txt`, `/sitemap.xml` i `/llms.txt` vrací **text/html — SPA index.html** místo souborů. Statické assety (favicon, obrázky) se přitom servírují správně → tyto tři soubory buď chybí v nasazeném buildu, nebo je polyká catch-all rewrite `/* → /index.html`.
Důsledek: Google nemůže načíst sitemap (v Search Console skončí chybou), AI crawleři nenajdou llms.txt. **Tohle bylo flagnuto už v auditu z 22. 6. („problém je nasazení") a stále to není opravené.**
**Instrukce:** Zjistit hosting (dle `public/_redirects` Netlify/CF Pages) a zajistit, že se `public/*` soubory dostanou do deploye a mají prioritu před rewritem. Po opravě ověřit: `curl -I https://northvaletcg.eu/sitemap.xml` musí vrátit `Content-Type: application/xml` (resp. text/plain pro robots/llms).

### A2. Client-side rendering = crawler vidí prázdnou stránku
Živý fetch homepage vrací jen `<title>` a jednu meta description — **žádný obsah, žádné produkty, žádné JSON-LD** (vše se vkládá až JS efektem v `App.jsx`). Google JS vyrenderuje, ale se zpožděním a nespolehlivě (druhá vlna indexace); Seznam.cz a sociální/AI crawleři (FB, WhatsApp, Perplexity, GPTBot) JS většinou nespouštějí → vidí prázdný web.
**Instrukce (podle náročnosti, stačí jedna):**
1. **Build-time prerender** statických rout (`/`, `/sealed-catalog`, `/blog`, všechny `/blog/*`, `/faq`, `/about`, `/gdpr-vop`, `/grading-guide`) — např. `vite-plugin-prerender` / vlastní puppeteer skript v `postbuild` (puppeteer-core už je v dependencies!). Produktové detaily prerenderovat z DB při buildu.
2. Nebo edge funkce/worker, která pro bot User-Agenty (Googlebot, SeznamBot, facebookexternalhit, GPTBot, ClaudeBot, PerplexityBot…) vrátí prerenderovanou verzi (Rendertron/prerender.io princip).
Akceptační test: `curl https://northvaletcg.eu/blog/jak-zacit-s-pokemon-kartami | grep "<h1"` vrátí obsah článku.

### A3. `preRegistrationActive: true` skrývá e-shop
Dokud flag běží, indexuje se jen předregistrační landing — katalog, blog a FAQ jsou pro návštěvníky nedostupné. Pro rychlý náběh indexace zvážit: blog + FAQ + informační stránky zpřístupnit už teď (obsah může sbírat pozice měsíce před startem prodeje), gate nechat jen na katalogu/košíku.

---

## B. ON-PAGE — klíčová slova (rychlé výhry, do 2 hodin)

### B1. Homepage title a description neobsahují hlavní klíčová slova
Teď: `<title>Northvale TCG</title>` + „Vstupte do prémiového e-shopu pro sběratele…" — chybí slova **pokémon karty, TCG, Lorcana**, na která lidé reálně hledají.
**Instrukce** (`index.html` + `App.jsx` case 'home'):
- Title: `Pokémon karty, Lorcana a One Piece TCG | Northvale TCG` (± 60 znaků)
- Description: `Originální Pokémon karty, Disney Lorcana a One Piece TCG produkty skladem. Booster boxy, ETB, kusovky i grading karet. Bezpečné sběratelské balení, doprava po ČR.` (± 160 znaků, obsahuje CTA a klíčová slova)

### B2. Šablony title pro katalog a produkty
Kontrola `App.jsx` (case 'sealed-catalog'/'sealed-detail'): zajistit vzor `"{Název produktu} | koupit online | Northvale TCG"` u produktů a `"Pokémon booster boxy a ETB | Northvale TCG"` u filtrovaných kategorií (game/type v canonical se už řeší — dobré). Do popisů produktů v adminu důsledně vyplňovat unikátní 2–3 věty (žádné duplicitní descriptions).

### B3. Alt texty obrázků
V komponentách je 56× `alt=""`. Dekorativní ikony OK, ale produktové a bannerové obrázky musí mít popisný alt s klíčovým slovem. Funkce `generateDefaultSEOImageMetadata` v `services/products.js` už existuje — použít ji všude, kde se renderuje produktový obrázek (ProductCard, SealedCatalog dlaždice, Homepage sekce).

### B4. Interní prolinkování blog → produkty
Blogové články (`blogData.js`) neobsahují odkazy na katalog/produkty. Do každého článku doplnit 2–4 kontextové odkazy („aktuální nabídku booster boxů najdete v [katalogu sealed produktů]") a naopak z produktových stránek linkovat na související články („Jak poznat falešné karty"). Interní odkazy jsou pro nový web nejlevnější ranking signál.

---

## C. STRUKTUROVANÁ DATA (rozšířit stávající základ v App.jsx)

1. **FAQPage schema** na `/faq` (otázky se načítají ze Supabase — generovat JSON-LD ze stejných dat). Šance na rozbalený výsledek + přímý zdroj pro AI odpovědi.
2. **Product schema doplnit:** `brand` (Pokémon/Disney Lorcana/One Piece), `sku`, `itemCondition`, `seller`, u variant `AggregateOffer` (lowPrice/highPrice). Po zavedení recenzí `aggregateRating` (hvězdičky v SERPu = vyšší CTR).
3. **BreadcrumbList** rozšířit i na produktové detaily a blog (teď jen sealed-catalog).
4. **BlogPosting**: brát skutečné `datePublished`/`dateModified` z `blogData.js` (teď natvrdo 2026-06-18 u všech), doplnit `author` a `wordCount`.
5. **Organization** doplnit `address`, `contactPoint`, `vatID` — pomáhá Knowledge Graphu i AI odpovědím na „northvale tcg recenze/kontakt".

---

## D. AI / AEO OPTIMALIZACE (ChatGPT, Perplexity, AI Overviews)

1. **llms.txt** — obsah už je výborný, ale neservíruje se (viz A1). Po opravě rozšířit o: přehled dopravy a cen, garance originality, výčet nabízených her, FAQ sekci. Přidat i `llms-full.txt` s delším textem.
2. **robots.txt: explicitně povolit AI crawlery** (GPTBot, ClaudeBot, Claude-Web, PerplexityBot, Google-Extended, Bytespider dle uvážení). Teď je implicitní allow-all — stačí nechat, ale nepřidávat nikdy plošný Disallow.
3. **Bing Webmaster Tools** — ChatGPT search čerpá z Bing indexu. Registrace + odeslání sitemap je pro AI viditelnost stejně důležité jako Google Search Console.
4. **Obsah psaný jako odpovědi:** každá kategorie (sealed, singles, slaby, grading) by měla mít 150–300 slov popisného textu pod produkty („Co je booster box a pro koho se hodí…") — přesně tyhle bloky AI vyhledávače citují. Teď jsou kategorie čistě produktový grid.
5. **Konzistentní entity:** stejný název, adresa a popis firmy na webu, Facebooku, Instagramu, Google Business Profile (založit! — i pro osobní odběr v Holicích) a Firmy.cz. AI si ověřuje existenci firmy napříč zdroji.

---

## E. KLÍČOVÁ SLOVA — mapa pro český trh (priorita pro obsah)

Konkurence: cardstore.cz, gengar.cz, toredo.cz, tcgkarty.cz, najada.games, cernyrytir.cz, fyft.cz, lazycards.cz + obsahový hráč poke-karty.cz. Na hlavu „pokémon karty" (vysoký objem, vysoká konkurence) nový web hned nedosáhne — strategie: long-tail + nové hry, kde konkurence spí.

| Klíčové slovo | Konkurence | Priorita | Kam cílit |
|---|---|---|---|
| pokémon karty | vysoká | dlouhodobě | homepage + kategorie |
| pokémon booster box / elite trainer box | střední | vysoká | kategorie s popisem (B2, D4) |
| kde koupit pokémon karty | střední | vysoká | existující blog ✓ — rozšířit, aktualizovat ročně |
| jak poznat falešné pokémon karty | nízká | vysoká | existující blog ✓ |
| lorcana karty / disney lorcana cz | nízká | **velmi vysoká** | vlastní kategorie stránka s textem |
| one piece karty / one piece tcg | nízká | **velmi vysoká** | vlastní kategorie stránka s textem |
| riftbound / league of legends tcg | minimální | **first-mover** | kategorie + článek „Co je Riftbound" |
| grading karet / psa grading cena | nízká–střední | vysoká | grading-guide ✓ + článek „Kolik stojí grading v ČR" |
| výkup pokémon karet | nízká | střední | buylist stránka (po zapnutí flagu) |
| obaly na karty / toploader / sleeves | střední | střední | kategorie příslušenství + blog ✓ |
| mystery box pokémon | střední | střední | zvážit produkt (konkurence to má, vysoká poptávka) |
| pokémon karty pro začátečníky | nízká | vysoká | existující blog ✓ |

**Obsahový plán (2 články/měsíc, pilíř → cluster):** pilíř „Pokémon TCG průvodce" + clustery (nové edice/set release kalendář — opakovaná sezónní návštěvnost!, „Nejdražší karty edice X", „Lorcana pro začátečníky", „PSA vs. Beckett", „Jak skladovat sbírku"). Release kalendář nových setů je dlouhodobě nejsilnější traffic magnet v TCG nice.

---

## F. MĚŘENÍ — nástroje, kterými si to „vypočítáš" (pro Ondru, ne pro AntiGravity)

Zdarma, v tomto pořadí:
1. **Google Search Console** — zaregistrovat doménu hned (i během předregistrace), odeslat sitemap (po opravě A1). Jediný zdroj pravdy o indexaci a dotazech. Totéž **Bing Webmaster Tools** (import z GSC na 2 kliky).
2. **PageSpeed Insights** (pagespeed.web.dev) — Core Web Vitals + SEO skóre; spouštět po každé větší změně. Totéž lokálně: Lighthouse v Chrome DevTools (záložka Lighthouse → SEO + Performance).
3. **Rich Results Test** (search.google.com/test/rich-results) + **validator.schema.org** — kontrola JSON-LD po úpravách ze sekce C.
4. **Screaming Frog SEO Spider** (zdarma do 500 URL) — crawlne web jako Googlebot; okamžitě odhalí chybějící titles, duplicitní descriptions, broken links a JS-rendering problém (režim JavaScript rendering zapnout).
5. **Ahrefs Webmaster Tools** (zdarma pro vlastní web) — backlinky + technický audit se skóre; případně česká Collabim/Marketing Miner na sledování pozic v Google.cz i Seznamu.
6. AI viditelnost: jednou měsíčně se ChatGPT/Perplexity zeptat „kde koupit pokémon karty v ČR", „nejlepší TCG e-shop Česko" a sledovat, jestli se Northvale objevuje v odpovědích (po opravě A1+A2 se začne).

---

## G. DOPORUČENÉ POŘADÍ

1. **A1** (deploy sitemap/robots/llms) — 30 minut práce, odblokuje vše
2. **A2** (prerender) — největší jednotlivý SEO dopad
3. **B1–B4** (titles, descriptions, alty, interní odkazy) — rychlé výhry
4. GSC + Bing Webmaster + Google Business Profile (Ondra, ne kód)
5. **C** (strukturovaná data) + **D4** (texty kategorií)
6. **E** obsahový plán — průběžně 2 články/měsíc
7. Po spuštění: feedy Heureka/Zboží/Google Merchant + recenze (viz předchozí audit, sekce C)

Pozn.: SEO audit navazuje na `AUDIT-eshop-kompletnost-pro-antigravity.md` — kritické body A1–A4 z něj platí dál a mají přednost.
