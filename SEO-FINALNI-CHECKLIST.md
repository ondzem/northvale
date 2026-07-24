# SEO — FINÁLNÍ CHECKLIST (uzavřeno 20. 7. 2026)

## ✅ HOTOVO — kompletní přehled (ověřeno Claudem v kódu i na živém webu)

**Technika webu:**
- ✅ Prerender celého webu (crawler vidí plný obsah), Ahrefs Health Score 98/100
- ✅ Titles, descriptions, canonicaly, interní odkazy, strukturovaná data (Organization, Product, BlogPosting, FAQ)
- ✅ robots.txt + llms.txt + sitemap.xml servírují správně, AI crawleři povoleni (GPTBot, ClaudeBot, Perplexity…)
- ✅ GA4 e-commerce měření (view_item → purchase), IndexNow, kalendář vydání, 8 blog článků
- ✅ Bezpečnost: serverová finalizace objednávek, privátní faktury, bez falešné brány
- ✅ Provozovatel sjednocen: NORTHVALE s.r.o., IČO 29618142

**Nástroje a účty:**
- ✅ Google Search Console — doména ověřena, sitemap odeslána
- ✅ Bing Webmaster — sitemap zpracována (36 URL), IndexNow aktivní
- ✅ Google Business Profile — ověřen, popis, kategorie Trading card store
- ✅ Firmy.cz — zápis založen (64 % stačí)
- ✅ Google Merchant — feed načten, doprava nastavena (79 Kč, 1–3 dny, jen ČR)
- ✅ Heureka — registrace, dopravy vyplněny, feed s výrobcem/EAN, **Ověřeno zákazníky AKTIVOVÁNO** (klíč v Supabase Secrets, HEUREKA_OZ_ENABLED=true)
- ✅ Zboží.cz — účet, opravený feed, ceny dopravy; provozovna čeká na auto-propojení s Firmy.cz

**➡️ VEŠKERÁ AKTIVNÍ SEO PRÁCE JE DOKONČENÁ. Dál už jen 4 kontroly podle kalendáře níže.**

---

## 📅 KALENDÁŘ KONTROL (jediné, co zbývá)

### ☐ Čtvrtek 23. 7. — 15 minut
1. GSC → Soubory Sitemap: stav „Úspěch"?
2. Merchant → Produkty: „Schváleno" (cíl 21/21)?
3. Heureka: zmizel banner „Dokončit registraci"? (jinak urgovat podpora@heureka.cz)
→ Cokoli nesedí: screenshot Claudovi.

### ☐ Pondělí 27. 7. — 5 minut
4. Zboží.cz → Provozovna: „Ověřena"? Pokud ne → e-mail na sklik@firma.seznam.cz:
   „Prosím o ruční propojení provozovny Northvale TCG (Zboží.cz) se zápisem NORTHVALE s.r.o., IČO 29618142 na Firmy.cz — web northvaletcg.eu."

### ☐ Pátek 1. 8. — DEN SPUŠTĚNÍ — 30 minut
5. AntiGravity: vypnout `preRegistrationActive` + přegenerovat prerender a sitemap
6. GSC + Bing: znovu odeslat sitemap; GSC → Kontrola URL → Požádat o indexaci (homepage, katalog)
7. Rozhodnutí klienta: dobít kredit na Zboží.cz (bez něj tam nabídky nejsou vidět)
8. Připravit recenzní odkaz z Google Business Profilu (posílat od 1. objednávky)

### ☐ Pondělí 10. 8. — první data — 15 minut
9. GSC → Výkon: nabíhají zobrazení/kliky?
10. Heureka: chodí dotazníky Ověřeno zákazníky?
11. Merchant: produkty vidět v Google Nákupech?

---

## 🗄️ Vědomě odloženo (neřešit, nehlodat)
Firmy.cz na 100 % · Heureka PPC kredit · EAN kódy (doplňovat průběžně v adminu) · DELIVERY tag ve feedu · Google Business fotky navíc · orphan drobnosti v Ahrefs (98/100 stačí)

## 🌱 Až bude chuť růst (volitelné, není údržba)
Měsíční rutina dle `SEO-BULLETPROOF-roadmap.md` (Fáze 3): 2 články + 2–3 backlinky + 1× Ahrefs crawl + pohled do GSC. Jde z velké části delegovat na AntiGravity jedním promptem měsíčně.
