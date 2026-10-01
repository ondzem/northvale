# Měření výsledků e-shopu — rozcestník

Cíl: po 90 dnech (30. 12. 2026) mít čísla pro případovou studii — **kolik e-shop vydělal a odkud zákazníci přišli** — a umět je kdykoli porovnat s výchozím stavem.

## Soubory v téhle složce

| Soubor | Co v něm je |
|---|---|
| [2026-10-01-vychozi-stav.md](2026-10-01-vychozi-stav.md) | Výchozí stav k 1. 10. 2026 (objednávky, Google, co se měří) |
| [sablona-kontroly.md](sablona-kontroly.md) | Šablona — zkopíruj ji při každé kontrole jako `RRRR-MM-DD-kontrola.md` |
| `data/` | Surová data ke každé kontrole (exporty ze Search Console, CSV z adminu) |

## Kdy se vracet

| Datum | Co udělat |
|---|---|
| **30. 10. 2026** | 1. kontrola (měsíc) — podle šablony |
| **30. 12. 2026** | 2. kontrola (90 dní) — čísla do případové studie, návratnost, doporučení od klienta |
| **1. 4. 2027** | 3. kontrola (půl roku) — dlouhodobý trend |

## Napojené nástroje — co měří a kde to najdeš

| Nástroj | Co měří | Kde |
|---|---|---|
| **Admin → Přehled prodejů** | Objednávky, tržby, průměrná objednávka, jak se o nás dozvěděli, odkud přišli. **Hlavní zdroj čísel do studie** — počítá všechny objednávky. | northvaletcg.eu/admin → Přehled prodejů (export CSV vpravo nahoře) |
| **Google Search Console** | Jak web vidí Google: prokliky, zobrazení, pozice, hledané fráze | search.google.com/search-console → vlastnost northvaletcg.eu → Výkon → Exportovat → CSV |
| **Google Analytics 4** | Návštěvnost a nákupní cesta (produkt → košík → pokladna → nákup), poptávky. Jen lidé se souhlasem s cookies. | analytics.google.com → účet SUNRISE… → vlastnost **Northvale** (měřicí ID `G-6TDQCGWYTQ`) |
| **Zdroj u objednávky** (`traffic_source`) | Odkud zákazník přišel na web v návštěvě, ve které nakoupil (Google, Instagram, utm odkaz…) | Automaticky v objednávce, souhrn v Přehledu prodejů |
| **Dotazník po nákupu** (`how_found`) | „Jak jste se o nás dozvěděli?“ — nepovinná odpověď zákazníka | Potvrzení objednávky + stránka objednávky z e-mailu; souhrn v Přehledu prodejů |
| **Poptávky v GA4** | `formular_odeslan`, `klik_telefon`, `klik_email` | GA4 → Přehledy → Zapojení → Události; podrobně v [../mereni-poptavek.md](../mereni-poptavek.md) |
| **Heureka Ověřeno zákazníky** | Hodnocení obchodu od zákazníků (dotazník po nákupu, jde odmítnout v pokladně) | Heureka administrace obchodu |
| **Feedy Heureka / Zboží / Google** | Produkty ve srovnávačích a Google Shopping | `northvaletcg.eu/feeds/heureka.xml`, `zbozi.xml`, `google.xml` — **URL neměnit** (párování trvá ~4 pracovní dny) |
| **Brevo** | Newsletter: počet odběratelů, otevření, prokliky | app.brevo.com → Kampaně / Kontakty |
| **Hlídací pes** | Kolik lidí čeká na naskladnění / slevu (zájem o zboží) | Admin → Správa produktů (počty u produktů) |

### Co kde NEhledat
- **Tržby v GA4 nejsou úplné** — chybí lidé, kteří odmítli cookies. Do studie vždy tržby z Přehledu prodejů.
- **GA4 nákupy začínají 1. 10. 2026.** Dřív se posílaly ve formátu, který web bez GTM nepředal — data před tímto dnem v GA4 nejsou chyba klienta ani webu.
- **Zdroj u objednávky a dotazník** fungují od 1. 10. 2026. Starší objednávky jsou v Přehledu jako „Před spuštěním měření“.

## Jak udělat kontrolu (cca 15 minut)

1. Zkopíruj [sablona-kontroly.md](sablona-kontroly.md) jako `RRRR-MM-DD-kontrola.md`.
2. **Admin → Přehled prodejů:** opiš čísla za celé období a za poslední měsíc, stáhni CSV do `data/RRRR-MM-DD-admin/`.
3. **Search Console → Výkon:** období „Posledních 28 dní“, Exportovat → CSV (zip). Zip pošli Claudovi, rozbalí ho do `data/` a doplní srovnání.
4. **GA4 → Přehledy → Zpeněžení → Nákupy v e-commerce:** počet nákupů a tržby (jen pro kontrolu trendu).
5. Doplň do souboru, co se v mezidobí dělo (akce, nové kategorie, výpadky) — stačí pár řádků.

## Omezení, která patří do studie
- Klient před spuštěním e-shopu **neprodával** — výchozí tržby jsou 0 Kč, celý obrat je tedy přírůstek díky webu.
- Souběžné aktivity (sociální sítě, akce) se systematicky nezapisují — při vyhodnocení je potřeba počítat s tím, že část zákazníků přišla přes ně (ukáže to dotazník a zdroj u objednávky).
- Souhlas klienta s použitím anonymizovaných výsledků: **máme**.
