# 6. Šablony Produktů, Popisů a Parametrů (NORTHVALE TCG)

Tento dokument slouží jako šablona (template) parametrů a popisků pro administraci e-shopu NORTHVALE. Umožňuje majiteli e-shopu jednoduše naklikat vlastnosti u každého nově přidávaného produktu podle kategorií.

---

## OBSAH
1.  **Kusové karty (Singles) - Pokémon, Lorcana, One Piece, MTG**
2.  **Ohodnocené karty (Slabs)**
3.  **Zapečetěné produkty (Sealed) - Boxy, ETB, Boostery (Pokémon, Lorcana, Riftbound, One Piece, MTG)**
4.  **Příslušenství (Obaly, krabičky, alba)**
5.  **Akrylové boxy**
6.  **Vzorové šablony popisků (Description Templates)**

---

## 1. Kusové karty (Singles)
Tato sada parametrů slouží pro jednotlivé vybalené karty určené pro hráče a sběratele.

### Technické parametry (Výběrová pole a vstupy):
*   **Název karty (Card Name):** *Textový vstup* (např. Charizard ex)
*   **Číslo karty (Card Number):** *Textový vstup* (např. 223/197)
*   **Edice / Sada (Set):** *Rozbalovací menu* (např. Obsidian Flames, Disney Lorcana: Rise of the Floodborn)
*   **Zkratka edice (Set Code):** *Textový vstup* (např. OBF, OP-05)
*   **Rarita (Rarity):** *Rozbalovací menu*
    *   *Pokémon:* Common, Uncommon, Rare, Double Rare, Ultra Rare, Special Illustration Rare (SIR), Hyper Rare (Gold).
    *   *Lorcana:* Common, Uncommon, Rare, Super Rare, Legendary, Enchanted.
    *   *One Piece:* Common, Uncommon, Rare, Super Rare, Secret Rare, Leader, Alternate Art.
*   **Jazyk (Language):** *Výběr* (EN - angličtina, JP - japonština, CN - čínština)
*   **Provedení (Finish):** *Výběr* (Non-Foil - matná, Foil - lesklá, Reverse Holo, Textured - plastická)
*   **Stav karty (Condition):** *Rozbalovací menu* (NM - Near Mint, EX - Excellent, GD - Good, LP - Light Played, PL - Played, PO - Poor)
*   **Typ / Element / Barva:** *Výběr*
    *   *Pokémon:* Fire, Water, Grass, Lightning, Psychic, Fighting, Darkness, Metal, Dragon, Colorless, Trainer.
    *   *Lorcana (Inkoust):* Amber, Amethyst, Emerald, Ruby, Sapphire, Steel.
    *   *One Piece:* Red, Green, Blue, Purple, Black, Yellow.
*   **Vývojové stádium (Pokémon):** *Výběr* (Basic, Stage 1, Stage 2, ex, VSTAR, VMAX)
*   **Ilustrátor (Illustrator):** *Textový vstup* (např. Mitsuhiro Arita)
*   **Rok vydání (Year):** *Číselný vstup* (např. 2023)

---

## 2. Ohodnocené karty (Slabs)
Karty certifikované nezávislou autoritou a uzavřené v plastovém pouzdře.

### Technické parametry:
*   *Obsahuje všechny parametry z "Kusových karet" výše plus tyto specifické:*
*   **Gradingová společnost (Grading Company):** *Výběr* (PSA, Beckett - BGS, CGC, TAG)
*   **Výsledná známka (Grade):** *Rozbalovací menu* (1 až 10)
*   **Označení známky (Grade Label):** *Textový vstup* (např. Gem Mint, Pristine, Excellent)
*   **Certifikační číslo (Cert Number):** *Textový vstup* (pro ověření v online registru)
*   **Sub-známky (Subgrades):** *Čtyři číselné vstupy* (pouze pro Beckett/CGC):
    *   *Centering (Vycentrování):* (např. 9.5)
    *   *Corners (Rohy):* (např. 10)
    *   *Edges (Hrany):* (např. 9.5)
    *   *Surface (Povrch):* (např. 10)
*   **Podpis (Autograph):** *Výběr* (Ano - certifikovaný podpis / Ne)

---

## 3. Zapečetěné produkty (Sealed Product)
Originální továrně zabalené zboží (Pokémon, Lorcana, Riftbound, One Piece, MTG).

### Technické parametry:
*   **Název produktu:** *Textový vstup* (např. Pokémon TCG: Scarlet & Violet - Booster Box)
*   **Typ balení (Product Type):** *Rozbalovací menu* (Booster Box, Elite Trainer Box - ETB, Illumineer's Trove, Booster Bundle, Single Booster, Tin, Starter / Trial Deck, Premium Collection)
*   **Přiřazená edice (Set Name):** *Rozbalovací menu* (např. Paldean Fates, First Chapter)
*   **Jazyk (Language):** *Výběr* (Anglický - EN, Japonský - JP, Čínský - CN)
*   **Počet boosterů v balení (Booster Count):** *Číselný vstup* (např. 36, 8, 1)
*   **Rok vydání (Year):** *Číselný vstup*
*   **Stav sealed fólie:** *Výběr* (100% stav bez poškození, Lehce natržená fólie - sleva, Poškozená krabice - sleva)
*   **Hmotnost (Weighted):** *Výběr* (Neváženo - u novějších sad, Weighted Light, Weighted Heavy - u vintage boosterů)

---

## 4. Příslušenství (Accessories)
Obaly, alba a krabičky na ochranu karet.

### Technické parametry:
*   **Název doplňku:** *Textový vstup* (např. Dragon Shield Matte Black)
*   **Typ příslušenství:** *Rozbalovací menu* (Obaly na karty, Alba a pořadače, Krabičky na balíčky, Herní podložky, Kostky a žetony)
*   **Výrobce / Značka:** *Rozbalovací menu* (Dragon Shield, Ultimate Guard, Gamegenic, Ultra PRO, KMC)
*   **Velikost / Rozměr obalu:** *Výběr* (Standard Size - Pokémon/MTG/Lorcana, Japanese Size - Yu-Gi-Oh/Vanguard, Inner / Perfect Fit)
*   **Počet kusů v balení:** *Číselný vstup* (např. 100 obalů, 20 stránek v albu)
*   **Materiál / Povrch:** *Výběr* (Matný - Matte, Lesklý - Glossy, Koženka - Leatherette, Nekyselý plast - Acid-free)
*   **Barva:** *Textový vstup* (např. Černá, Průhledná)

---

## 5. Akrylové boxy
Prémiová ochrana investičních boxů.

### Technické parametry:
*   **Název boxu:** *Textový vstup* (např. Akrylový case pro Pokémon Booster Box)
*   **Kompatibilita:** *Výběr* (Pokémon Booster Box, Pokémon ETB, Lorcana Trove, One Piece Booster Box)
*   **Tloušťka akrylu:** *Číselný vstup* (např. 4 mm, 5 mm)
*   **UV Ochrana:** *Výběr* (Ano - 99 % ochrana, Ne)
*   **Typ zavírání:** *Výběr* (Magnetické víko - extra silné neodymové magnety, Šroubovací víko, Nasouvací systém)
*   **Vnitřní rozměry (Š x V x H):** *Textový vstup* (např. 142 x 125 x 78 mm)
*   **Vnější rozměry (Š x V x H):** *Textový vstup*

---

## 6. Vzorové Šablony Popisků (Description Templates)

Majitel e-shopu může tyto předpřipravené šablony zkopírovat a doplnit o konkrétní názvy edic a karet.

### Šablona A: Kusová karta (Single Card)
> **[Jméno karty]** ze sady **[Jméno edice]** je skvělým přírůstkem do Vaší sbírky i herního balíčku. Tato karta je v provedení **[Foil/Non-Foil]** a pochází z oficiální distribuce.
> 
> *   **Stav karty:** Karta je v našem skladu pečlivě uchovávána a odpovídá stavu **[Stav karty, např. Near Mint]**.
> *   **Bezpečné doručení:** Kartu Vám odešleme v penny sleeve obalu hlavou dolů, pevném toploaderu s vytahovacím poutkem a zajistíme ji mezi dva silné kartony papírovou malířskou páskou. Žádné zbytky lepidla na plastech.

### Šablona B: Ohodnocená karta (Slab)
> Investiční a sběratelská karta **[Jméno karty]** ze sady **[Jméno edice]** ohodnocená prestižní společností **[Gradingová společnost, např. PSA]** s výslednou známkou **[Známka, např. 10 (Gem Mint)]**.
> 
> *   **Certifikace:** Pravost a kvalitu této karty si můžete ověřit v oficiálním registru pod číslem **[Certifikační číslo]**.
> *   **Ochrana:** Plastové pouzdro (slab) chrání kartu před prachem, vlhkostí a mechanickým poškozením. Zásilku balíme do silné vrstvy bublinkové fólie a pevné kartonové krabice.

### Šablona C: Zapečetěný produkt (Sealed - např. Booster Box / ETB)
> Originální zapečetěné balení **[Jméno produktu]** ze sady **[Jméno edice]** v anglickém jazyce. Ideální produkt pro sběratele, hráče i jako dlouhodobá investice.
> 
> *   **Stav balení:** Produkt je chráněn originální neporušenou smršťovací fólií (shrink wrap) s logy výrobce.
> *   **Obsah balení:** 
>     *   [Počet boosterů] booster balíčků sady [Jméno edice]
>     *   [Pokud se jedná o ETB: Promo karta, kostky, obaly na karty...]
> *   **Sběratelský standard odeslání:** Produkty balíme do pevných kartonových krabic s papírovou a bublinkovou výplní tak, aby rohy krabice zůstaly při přepravě netknuté.
