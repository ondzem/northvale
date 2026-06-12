# 4. Specifikace Stránek, Databáze a API Integrací (NORTHVALE TCG)

Tento dokument definuje strukturu všech 14 stránek e-shopu NORTHVALE, databázové schéma a technologická propojení s externími systémy (Cardmarket, Scryfall, Pokémon TCG API, Shoptet).

---

## 1. Detailní Rozvržení 14 Stránek

### 1. Úvodní stránka (Homepage)
*   **Sekce:**
    *   *Dvojitá hlavička (Navbar):* Horní řádek (Logo, vyhledávání, Výkup odkaz, Oblíbené, Můj účet, Košík), spodní řádek (7 kategorií s dropdowny, jazyková vlajka).
    *   *Hero sekce:* Široký slideshow banner (60 % šířky) s šipkami a 5 tečkami, vedle něj (40 % šířky) widget "Akce dne" s odpočtem času (timer boxy: hod, min, sek) a tlačítkem "Do košíku".
    *   *USP bar:* Čtyři vodorovné boxy (Doprava zdarma, Rychlé doručení, 100% Bezpečnost, Bezpečné platby).
    *   *Příběh zakladatelů:* Textová bublina s trojúhelníkovým ukazatelem ukazujícím na fotku na pravé straně.
    *   *Kategoriální kachlíky:* 7 tlačítek pro rychlý přechod do kategorií (Pokémon, MTG, One Piece, Riftbound, Příslušenství, Ohodnocené karty, Grading).
    *   *Mřížky produktů (Novinky, Předobjednávky, Ohodnocené, Příslušenství):* 4 sloupce, čistý design bez tlačítek a hvězdiček. Pouze obrázek, název, dostupnost a cena.
    *   *Grading banner:* Široký středový banner s výzvou a tlačítkem.
    *   *Testimonials (Reference):* 4 karty se slovním hodnocením a 5 hvězdičkami (zlatými).
    *   *Newsletter:* Vodorovný panel s textem a formulářem pro přihlášení.
    *   *Patička:* 4 sloupce (O společnosti, Vše o nákupu, Pro zákazníky, kontakty a sociální sítě).

### 2. Katalog kusovek (Singles Catalog)
*   **Rozvržení:** Levý sloupec (filtry podle edice, stavu NM-PO, foil/non-foil, jazyka, barvy, ceny), pravý sloupec (tabulkový výpis karet s možností rychlého vložení vybrané varianty do košíku).

### 3. Katalog zapečetěných produktů (Sealed Catalog)
*   **Rozvržení:** Horní kategoriální filtry, pod nimi 4-sloupcový grid s velkými produktovými fotografiemi booster boxů, ETB a dárkových sad.

### 4. Katalog ohodnocených karet (Slabs Catalog)
*   **Rozvržení:** Filtry podle gradingové firmy (PSA, BGS, CGC, TAG) a známky (1-10). Grid certifikovaných slabů s velkými náhledy karet v pouzdrech.

### 5. Detail sealed boxu (Sealed Detail)
*   **Rozvržení:** Levá část (fotogalerie krabice), pravá část (název, cena, skladová dostupnost, tlačítko Koupit), spodní část (rozpis obsahu balení a doporučené související produkty).

### 6. Detail kusovky / Slabu (Singles Detail)
*   **Rozvržení:** Slučuje všechny dostupné varianty karty pod jeden detail (Unified Product Page). Obsahuje fotogalerii (líc/rub s zoomem) a přehlednou tabulku s variantami (foil, stav, jazyk, cena, sklad, tlačítko Koupit).

### 7. Výkup karet (Buylist Portal)
*   **Rozvržení:** Vyhledávací řádek pro nacenění kusovek, košík výkupu se selektorem stavu a jazyka, pod ním kalkulačka bulku na váhu/kusy a volba výplaty (účet vs. Store Kredit s +25% bonusem).

### 8. Grading Servis (Grading Portal)
*   **Rozvržení:** Tříkrokový formulář (1. Volba firmy a počtu karet, 2. Výběr doplňkových služeb jako pre-grading a čištění, 3. Pojistná hodnota a shrnutí). Sekce s návodem na bezpečné zabalení karet do Card Saveru 1.

### 9. Průvodce stavy (Grading Guide)
*   **Rozvržení:** Vizuální porovnávací tabulka standardů opotřebení hran, rohů a povrchu pro stavy Near Mint (NM), Excellent (EX), Good (GD), Light Played (LP), Played (PL) a Poor (PO).

### 10. Komunita a Turnaje
*   **Rozvržení:** Adresa a mapa odběrného místa (Coffee & Cards Pardubice), týdenní herní kalendář turnajů a fotogalerie z komunitních setkání.

### 11. Centrum podpory (Support FAQ)
*   **Rozvržení:** FAQ akordeony rozdělené podle témat (Doprava, Výkup, Platby, Reklamace) a kontaktní formulář.

### 12. Pokladna (Checkout Flow)
*   **Rozvržení:** Rozdělení na 2/3 (formulář dopravy, platby, fakturačních údajů a zadání Store Kreditu) a 1/3 (fixní rekapitulace objednávky s logem Garance bezpečného sběratelského balení).

### 13. Můj účet (User Portal)
*   **Rozvržení:** Zůstatek Store Kreditu a historie transakcí, přehled objednávek s možností stažení faktur (propojení s ERP Pohoda) a živý stepper sledování gradingových zakázek v USA (Příprava -> Odesláno do USA -> Zpracování -> Nagradováno -> Na cestě zpět -> Připraveno).

### 14. Administrace (Admin Panel)
*   **Rozvržení:** Interní přehled nevyřízených výkupů s tlačítky pro bulk schválení a logy synchronizace skladu.

---

## 2. Navržené Databázové Schéma

Systém vyžaduje relační databázi (např. PostgreSQL) s následujícími tabulkami:

```
[ users ] ──< [ orders ] ──< [ order_items ] >── [ product_variants ] >── [ products ]
    │                                                     ▲
    └───< [ grading_submissions ]                         │
    │                                                     │
    └───< [ buylist_items ] ──────────────────────────────┘
```

1.  **`users`:** ID, e-mail, hash hesla, zůstatek Store Kreditu (CZK), věrnostní body, úroveň slevy.
2.  **`products`:** ID, název karty/produktu, popis, typ (sealed, single, slab, accessory), obrázek líc, obrázek rub, stav (aktivní/draft).
3.  **`product_variants`:** ID, product_id (cizí klíč), stav (NM, EX, GD, LP, PL, PO), jazyk (EN, JP, CN), foil (boolean), cena, stav skladu.
4.  **`slabs_metadata`:** ID, product_id (cizí klíč), certifikační firma (PSA, BGS, CGC, TAG), výsledná známka (1-10), certifikační číslo.
5.  **`grading_submissions`:** ID, user_id (cizí klíč), firma, počet karet, stav (V přípravě -> Odesláno -> Zpracování -> Nagradováno -> Na cestě zpět -> Připraveno), cena služby, pojištěná hodnota.
6.  **`orders`:** ID, user_id (cizí klíč), celková cena, stav platby, stav dopravy, metoda přepravy, číslo zásilky (tracking number).
7.  **`order_items`:** ID, order_id (cizí klíč), variant_id (cizí klíč), množství, cena za kus.
8.  **`buylist_items`:** ID, user_id (cizí klíč), variant_id (cizí klíč), nabízená cena, stav výkupu (Čeká na odeslání -> Přijato -> Zkontrolováno -> Schváleno -> Vyplaceno).
9.  **`bulk_rates`:** ID, hra (Pokémon, MTG, Lorcana), kategorie (Common, Rare, atd.), výkupní cena v hotovosti, výkupní cena v kreditu.

---

## 3. Integrace API a Importy Metadat

Pro snadné naplnění katalogu a automatizaci se používají externí API rozhraní:

*   **Magic: The Gathering (Scryfall API):**
    *   *Využití:* Bezplatné API pro import karet. Při zadání názvu karty vyhledá middleware Scryfall databázi a stáhne parametry (edice, barva, manová náročnost, vzácnost, standardní obrázek lícové strany).
*   **Pokémon TCG API (pokemontcg.io / tcgdex.net):**
    *   *Využití:* Stahování kompletních checklistů edic, typů Pokémonů (Fire, Water atd.), čísel karet a vysoké kvality obrázků.
*   **Zásilkovna API (Packeta):**
    *   *Využití:* Widget pro výběr výdejních míst a samoobslužných Z-BOXů přímo na mapě v pokladně. Odesílání dat o zásilkách do systému Zásilkovny pro tisk štítků.

---

## 4. Prevence Double-sellingu (Cardmarket Synchronizace)

Klíčovým technologickým rizikem TCG obchodu prodávajícího cenné kusovky je prodej stejné karty ve stejný okamžik na vlastním e-shopu a na evropském tržišti Cardmarket.

### Architektura Middleware Můstku (Single Source of Truth):
*   **Princip:** Server běžící na pozadí (NodeJS / Python) spojuje REST API e-shopu (např. Shoptet API) s REST API Cardmarketu.
*   **Nákup na Cardmarketu:** Cardmarket odesílá webhook při každé objednávce. Middleware zachytí webhook, zjistí ID prodané karty a do 2 sekund odešle API požadavek na e-shop, který sníží stav skladu této karty na 0 (nebo ji zneaktivní).
*   **Nákup na e-shopu:** V okamžiku dokončení objednávky na e-shopu odešle systém požadavek na middleware, který okamžitě přes endpoint `/stock` smaže příslušný listing z Cardmarketu.
*   **Řízení limitů (Rate Limits):** Cardmarket API omezuje počet požadavků za minutu. Middleware musí řadit požadavky do fronty (queue mechanismus) nebo využít specializované platformy jako **TCG PowerTools** či **Storefront Pro (TCGSync)** k odbavení synchronizace.
