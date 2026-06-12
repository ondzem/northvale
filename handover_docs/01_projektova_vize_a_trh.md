# 1. Projektová Vize, Cílový Trh a Logistika (NORTHVALE TCG)

Tento dokument popisuje pozadí vzniku e-shopu NORTHVALE, lokální scénu, cílové skupiny a přepravní standardy. Slouží jako strategické zadání pro vývojáře.

---

## Brand Profile a Příběh

*   **Název společnosti:** NORTHVALE TCG
*   **Doména:** northvaletcg.eu (primárně pro český a slovenský trh)
*   **Motto:** Sběratelský standard doručení a férové ceny.
*   **Základní poslání:** Odstranit zklamání z nedostupnosti karetních produktů (TCG) a bojovat proti předraženým spekulativním prodejům. Nabídnout spolehlivé místo pro nákup sealed produktů, jednotlivých kusových karet, bezpečné dopravy a zprostředkování gradingu v USA.

---

## Tři Hlavní Zákaznické Persony

Úspěch e-shopu závisí na oslovení tří odlišných skupin zákazníků:

### Persona A: Rodič a Laický Nakupující
*   **Profil:** Hledá dárek pro dítě (k narozeninám, k Vánocům). Nerozumí herním edicím, slangovým výrazům ani mechanismům. Bojí se nákupu padělaných karet (které jsou na tržištích běžné).
*   **Nákupní chování:** Vyšší průměrná hodnota objednávky (dárkové sety), ale nízká frekvence.
*   **Potřebné funkce na webu:**
    *   Dárkový průvodce (rozdělení podle rozpočtu: Dárek do 500 Kč, Dárek do 1000 Kč).
    *   Speciální předpřipravené balíčky (Custom Bundles) vytvořené e-shopem (obsahující album, obaly a originální karty dohromady).
    *   Jasné ujištění o 100% originalitě produktů z oficiální distribuce.

### Persona B: Sběratel a Investor (Collector)
*   **Profil:** Kupuje cenné sealed produkty (booster boxy, speciální edice) k dlouhodobému uchování nebo kusové karty do sbírky. Vyžaduje bezchybný stav rohů a hran.
*   **Nákupní chování:** Velmi vysoká hodnota objednávek, střední frekvence.
*   **Potřebné funkce na webu:**
    *   Garance sběratelského balení (vyznačeno v košíku).
    *   Klasická fotogalerie s detailním zobrazením (zoom) lícové i rubové strany pro cenné kusové karty (nad 1000 Kč).
    *   Zprostředkování gradingu (PSA, Beckett, CGC, TAG) s pre-grading kontrolou.

### Persona C: Turnajový Hráč (Player)
*   **Profil:** Hledá konkrétní kusové karty pro sestavení herního balíčku na nadcházející turnaj. Nechce kupovat sealed boostery, protože je to pro něj neekonomické.
*   **Nákupní chování:** Nižší až střední hodnota objednávek, ale vysoká týdenní frekvence.
*   **Potřebné funkce na webu:**
    *   Garance rychlého odeslání (při objednávce do středy doručení do pátku na víkendový turnaj).
    *   Decklist Importer (vložení textového seznamu karet a hromadné přidání do košíku).
    *   Buylist (výkupní systém s možností Store Kreditu s 25% bonusem na další nákup).

---

## Analýza České Konkurence

*   **Najada Games (Praha):** Technologický lídr, plně funkční buylist s 25% bonusem na kredit. Soustředí se na Magic: The Gathering. Pokémon singles nemají dostatečně pokryté.
*   **Veselý Drak:** Největší prodejce sealed produktů a doplňků. Velmi silné SEO (magazíny), ale zcela chybí prodej a výkup kusových karet.
*   **Černý Rytíř (Praha):** Dlouhá historie a velký sklad MTG singles. Web je však zastaralý, neresponzivní pro mobilní telefony a má nepřehledné vyhledávání.
*   **FYFT (Praha):** Dobrá komunitní základna, video marketing. Zaměřují se na více koníčků, chybí jim hloubka sortimentu a singles databáze.
*   **Paldea.cz, ShadowBall, Alola:** Menší Pokémon obchody nabízející výkupy singles. Výkupy u nich však nefungují plně automatizovaně na webu (zákazník musí posílat tabulky v Excelu nebo fotky).
*   **Cardstore, Pokemarket:** Známí skvělým balením a přidáváním samolepek či bonbónů do balíčku.

---

## Strategie pro Pardubický Kraj (Lokální dominance)

Pardubický kraj má silnou TCG komunitu soustředěnou kolem dvou heren: **Tolarie** (Zámecká 23 - zaměřená na MTG) a **Wombat Games** (Sladkovského 505 - zaměřená na Pokémon ligu). Ani jedna z těchto heren neprodává ani nevykupuje Pokémon singles online.

### Akční plán pro NORTHVALE v Pardubicích:
1.  **Monopol na Pokémon Singles:** Stát se výhradním lokálním zdrojem kusových karet pro hráče Pokémon TCG z Pardubic a okolí.
2.  **Odběrné místo zdarma:** Pro levné kusovky (v hodnotě jednotek a desítek korun) je poštovné 79 Kč překážkou. NORTHVALE zřídí bezplatné odběrné místo formou partnerství s lokální kavárnou (např. Coffee & Cards v centru) nebo formou samoobslužné schránky na kód.
3.  **Lokální výkup:** Možnost naklikat výkup online a karty odevzdat osobně v Pardubicích k fyzické kontrole bez placení poštovného.
4.  **Cílení na studenty:** Spolupráce se studentskými spolky na Univerzitě Pardubice (UPCE), slevy pro studenty s ISIC kartou a propagace na kolejích v Polabinách.
5.  **Sponzorování turnajů:** Místo konkurování hernám bude NORTHVALE dodávat ceny na turnaje v Tolarii a Wombatu (např. obaly Dragon Shield s logem e-shopu) výměnou za reklamu.

---

## Logistika a Standard Balení

Způsob balení karet určuje zákaznickou loajalitu. Špatně zabalená zásilka vede k poškození karet a reklamacím.

### Sběratelský standard balení kusových karet (Singles):
1.  **Penny Sleeve:** Karta se vloží do tenkého plastového obalu **hlavou dolů** (spodním okrajem napřed). Tím se zabrání vyklouznutí a kontaktu s lepicí páskou.
2.  **Pull-Tab (Vytahovací páska):** Na zadní stranu penny sleeve se nalepí vyčnívající malý štítek. Zákazník tak kartu snadno vytáhne z pevného toploaderu bez ohnutí rohů.
3.  **Toploader:** Karta se vloží do pevného PVC toploaderu.
4.  **Team Bag:** Toploader s kartou se vloží do uzavíratelného celofánového sáčku, který chrání před vlhkostí a prachem.
5.  **Kartonový sendvič:** Sáček se vloží mezi dva pevné kusy vlnitého kartonu (rozměrově větší než toploader) a zajistí se papírovou malířskou páskou. **Použití klasické izolepy na toploaderu je zakázáno**, protože zanechává lepidlo.
6.  **Bublinková obálka:** Celý sendvič se vloží do bublinkové obálky a odešle.

### Logistika sealed produktů (Booster boxy, ETB):
*   Zásadně se používají pevné kartonové krabice s bohatou vrstvou bublinkové fólie a papírovou výplní. Rohy krabic produktů musí být plně chráněny, protože promáčknutí fólie nebo rohu snižuje sběratelskou hodnotu o 20-30 %.

### Přepravní tarify pro ČR:
*   **Česká pošta - Obyčejné psaní (~30 Kč):** Bez sledování a pojištění. Pouze pro objednávky do 150 Kč na riziko kupujícího.
*   **Česká pošta - Doporučené psaní (~75-85 Kč):** Sledování zásilky, pojištění do 880 Kč.
*   **Česká pošta - Cenné psaní (~90-110 Kč):** Speciální bezpečnostní obálka, plné pojištění na deklarovanou hodnotu (pro drahé karty).
*   **Zásilkovna - Výdejní místo / Z-BOX (~79 Kč):** Nejpopulárnější volba s doručením do 24-48 hodin, pojištění do 5000 Kč.
*   **Doprava zdarma:** Při nákupu nad 2000 Kč.
*   **Dodavatelé materiálu:** Radbal (radbal.cz - krabice a obálky), B2B Blackfire (velkoobchodní ceny toploaderů a obalů).
