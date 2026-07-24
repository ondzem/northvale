# Bulletproof SEO — roadmapa northvaletcg.eu (19. 7. 2026)

Technický základ je hotový (Ahrefs Health Score 98). Tahle roadmapa pokrývá zbytek: viditelnost, obsah a autoritu. U každého kroku je uvedeno, KDO ho dělá — **[ONDRA]** = ruční krok mimo kód, **[AGENT]** = zadání pro AntiGravity.

---

## FÁZE 0 — Udělej dnes (cca 1 hodina, vše [ONDRA])

- [ ] **Google Search Console** (search.google.com/search-console): ověř doménu northvaletcg.eu (DNS záznam) → Sitemaps → odešli `https://northvaletcg.eu/sitemap.xml`. Nejdůležitější krok celé roadmapy.
- [ ] **Bing Webmaster Tools** (bing.com/webmasters): přihlas se a použij „Import from Google Search Console" — 2 minuty. Bing = viditelnost v ChatGPT search.
- [ ] **Google Business Profile** (business.google.com): založ profil (osobní odběr, Holice) — jméno, adresa, otevírací doba, kategorie „Obchod se sběratelskými předměty", odkaz na web. Pomáhá lokálnímu vyhledávání i důvěryhodnosti pro AI.
- [ ] **Firmy.cz**: bezplatný zápis firmy. Konzistentní údaje (název, adresa, telefon) stejné jako na webu.

## FÁZE 1 — Před spuštěním prodeje ([AGENT] + rozhodnutí [ONDRA])

- [ ] [ONDRA] Rozhodni provozovatele: Alvion s.r.o. vs. NORTHVALE s.r.o. → [AGENT] sjednotí patičku, VOP, GDPR, faktury, e-maily.
- [ ] [AGENT] Bezpečnostní opravy z `AUDIT-eshop-kompletnost-pro-antigravity.md`, sekce A (falešná platební brána, veřejné faktury, čísla objednávek, serverová finalizace). Bez toho nespouštět prodej.
- [ ] [AGENT] GA4 e-commerce eventy (view_item, add_to_cart, begin_checkout, purchase) — audit sekce C1. Bez nich neuvidíš, co funguje.
- [ ] [AGENT] Produktové feedy: Google Merchant XML, Heureka.cz, Zboží.cz — audit sekce C2. → [ONDRA] pak registrace v Google Merchant Center, Heureka a Zboží.cz administraci.
- [ ] [ONDRA] Vypni předregistraci (config.js) v den startu → [AGENT] přegeneruje prerender a sitemap.

## FÁZE 2 — První měsíc po spuštění

- [ ] [ONDRA] **Heureka Ověřeno zákazníky**: aktivuj dotazníky spokojenosti; cíl = badge do 3 měsíců. Paralelně žádej spokojené zákazníky o Google recenze (odkaz z Business Profile).
- [ ] [AGENT] Recenzní hvězdičky: až bude pár recenzí, doplnit `aggregateRating` do Product JSON-LD.
- [ ] [AGENT] IndexNow ping po každém deployi (volitelné, zrychluje Bing).
- [ ] [ONDRA] GSC → Pokrytí/Indexování: jednou týdně zkontroluj, že se stránky indexují a nepřibývají chyby.
- [ ] Obsah: 2 články dle plánu v `SEO-MAX-plan-pro-antigravity.md` sekce E + [AGENT] stránka **„Kalendář vydání TCG setů 2026"** (nejsilnější dlouhodobý traffic magnet — aktualizovat při každém oznámení nového setu).

## FÁZE 3 — Měsíční rutina (odsud dál se vyhrává)

**Obsah (2 články/měsíc, střídej):**
kusovkové/produktové články při vydání setu („Nejdražší karty edice X") ↔ evergreen návody („PSA vs. Beckett", „Jak skladovat sbírku", „Lorcana pro začátečníky"). Každý článek: 2–4 interní odkazy na produkty/kategorie.

**Autorita — backlinky (bez tohohle DR zůstane 0):** cíl 2–3 nové odkazující domény měsíčně.
- Pošli produkt/spolupráci 1 českému TCG YouTuberovi či streamerovi měsíčně (unboxing, recenze).
- Buď aktivní v CZ/SK Pokémon a Lorcana skupinách (FB, Discord) — ne spam, ale užitečné odpovědi s občasným odkazem na svůj návod.
- Stánek/partnerství na akcích typu TCG Expo → zmínky na webech akcí.
- Nabídni hostující článek herním webům/blogům (téma: grading, padělky).
- Až pojedou turnaje: každý turnaj = stránka na webu + zápis do herních kalendářů.

**Měření (1× měsíčně, 30 minut):**
| Metrika | Kde | Cíl po 3 měsících | Cíl po 12 měsících |
|---|---|---|---|
| Indexované stránky | GSC → Indexování | vše důležité | roste s obsahem |
| Zobrazení (impressions) | GSC → Výkon | první stovky/den | tisíce/den |
| Kliknutí z vyhledávání | GSC → Výkon | desítky/měsíc | stovky–tisíce/měsíc |
| Referring domains | Ahrefs Site Explorer | 10+ | 50+ |
| Domain Rating | Ahrefs | 5+ | 20+ |
| Health Score | Ahrefs Site Audit (New crawl 1×/měsíc) | 95+ držet | 95+ držet |
| AI viditelnost | ručně: zeptej se ChatGPT/Perplexity „kde koupit pokémon karty ČR" | zmínka občas | pravidelná zmínka |

---

**Shrnutí jednou větou:** Technika je hotová a stačí ji hlídat; bulletproof z toho udělá GSC/Bing (dnes), feedy + měření (před startem), a pak disciplína — 2 články a 2–3 backlinky měsíčně. SEO není stav, ale rutina; kdo ji u konkurence vydrží dýl, vyhrává.
