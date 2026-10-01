# Výchozí stav — 1. 10. 2026

Začátek 90denního měření. Všechno ostatní se porovnává s tímhle.

## 1. Prodeje před webem

Klient před spuštěním e-shopu **neprodával** → výchozí tržby **0 Kč**. Každá koruna z e-shopu je přírůstek.

## 2. Objednávky od spuštění e-shopu (11. 8. – 30. 9. 2026)

Počítáno ze všech objednávek ve storage (bez testovacích, storen a nedokončených plateb kartou — stejná pravidla jako Admin → Přehled prodejů).

| Období | Objednávky | Tržby (s DPH, vč. dopravy) | Průměrná objednávka |
|---|---:|---:|---:|
| Srpen 2026 (od 11. 8., neúplný měsíc) | 7 | 27 737 Kč | 3 962 Kč |
| Září 2026 | 17 | 96 903 Kč | 5 700 Kč |
| **Celkem** | **24** | **124 640 Kč** | **5 193 Kč** |

- Zákazníků: **23** (1 nakoupil opakovaně).
- Platby: dobírka 12×, karta 7×, převod 5×.
- Odkud přišli: **neznámo** — zdroj a dotazník se ukládají až od 1. 10. 2026.

## 3. Google — Search Console (1.–28. 9. 2026, posledních 28 dní)

Surová data: [data/2026-10-01-search-console/](data/2026-10-01-search-console/)

| Ukazatel | Hodnota |
|---|---:|
| Prokliky z Googlu | **125** |
| Zobrazení ve výsledcích | **2 302** |
| CTR | 5,4 % |
| Průměrná pozice (vážená zobrazeními) | 6,2 |
| Počet různých hledaných frází | 175 |

- Trend uvnitř září: 1. polovina 53 prokliků / 984 zobrazení → 2. polovina **72 / 1 318** (roste).
- Zařízení: mobil 92 prokliků, počítač 33, tablet 0.
- Země: Česko 118 prokliků, Slovensko 2.
- Produktové úryvky (cena, dostupnost ve výsledcích): 32 prokliků z 374 zobrazení; záznamy obchodníka 16 / 97.

### Nejsilnější stránky

| Stránka | Prokliky | Zobrazení | Pozice |
|---|---:|---:|---:|
| Blog: Kolik stojí grading karet (PSA vs Beckett) | 59 | 1 630 | 5,9 |
| Úvodní stránka | 38 | 196 | 5,8 |
| Mid-Autumn Festival Gift Box | 6 | 50 | 2,9 |
| O nás | 3 | 37 | 3,6 |
| Destined Rivals Booster Bundle | 2 | 72 | 9,7 |
| Pokémon GO Elite Trainer Box | 2 | 30 | 17,7 |
| Winterspell Booster Box | 2 | 15 | 2,9 |

**Poznatek:** jeden článek na blogu přináší **47 % všech prokliků z Googlu**. Obsah (návody, ceny) funguje lépe než samotné produktové stránky.

### Pozice sledovaných frází (průměr za 28 dní ze Search Console)

Tyhle fráze porovnávej při každé kontrole.

| Fráze | Pozice | Zobrazení | Prokliky |
|---|---:|---:|---:|
| northvale | 1,7 | 19 | 12 |
| lorcana booster box | 1,7 | 6 | 1 |
| lorcana winterspell booster box | 3 | 5 | 2 |
| psa grading cena | 6,1 | 21 | 1 |
| psa hodnocení karet cena | 6,6 | 74 | 5 |
| pokemon go etb | 8,9 | 15 | 0 |
| pokemon store | 9,4 | 15 | 0 |
| grading karet | 9,8 | 21 | 0 |
| destined rivals booster bundle | 10,1 | 32 | 1 |
| pokémon eshop | 49,5 | 2 | 1 |

Obecné obchodní fráze („pokémon karty“, „pokémon karty eshop“, „tcg obchod“) v datech **nejsou** = Google web na ně zatím neukazuje vůbec nebo velmi zřídka.

### Ruční kontrola v Googlu (1. 10. 2026, bez přihlášení, CZ)

| Fráze | Northvale | Kdo je v top 10 |
|---|---|---|
| pokémon karty eshop | není v top 10 | Gengar, Veselý drak, Blacklotus, Pokemon4U, Pompo, ShadowBall, Kuma, Cardstore, Smarty, Heureka |

Další fráze se ručně nekontrolovaly — při příští kontrole stačí porovnat tabulku ze Search Console výš (je přesnější než jedno vyhledání, protože jde o průměr za 28 dní).

## 4. Google Analytics 4

- Nákupy v GA4: **0** — nákupní události začaly fungovat až 1. 10. 2026 (dřív se kvůli chybě neodesílaly).
- `purchase` je klíčová událost (výchozí nastavení GA4, ověřeno 1. 10. 2026).
- Poptávky (`formular_odeslan`, `klik_telefon`, `klik_email`) se měří od 25. 9. 2026.

## 5. Co se od tohoto dne měří nově

- Zdroj návštěvy u každé objednávky.
- Dotazník „Jak jste se o nás dozvěděli?“ po nákupu.
- Celá nákupní cesta v GA4 (produkt → košík → pokladna → nákup).
- Měsíční souhrn v Admin → Přehled prodejů.
