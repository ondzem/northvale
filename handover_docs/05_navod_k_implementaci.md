# 5. Krok za Krokem Návod k Implementaci pro Antigravity IDE

Tento dokument slouží jako detailní instrukce a postup vývoje pro agenta v **Antigravity IDE**. Popisuje, jak postupně postavit a zprovoznit e-shop od základních stylů až po finální testování.

---

## Doporučený Postup Vývoje (Sekvenční)

Vývoj by měl probíhat v následujících pěti krocích, aby se předešlo chybám v závislostech a stylech:

```
[ Krok 1: CSS Základy ] ──> [ Krok 2: Globální Prvky ] ──> [ Krok 3: Homepage ]
                                                                 │
[ Krok 5: Verifikace ] <── [ Krok 4: Speciální Moduly ] <────────┘
```

---

## Detailní Popis Kroků

### Krok 1: CSS Základy a Design Tokens
1.  **Soubor:** `src/index.css` a `src/App.css`.
2.  **Úkol:** Definovat barevné proměnné pro světlý a tmavý motiv pod selektory `:root` a `html.dark-theme` (viz dokument `03_design_system_a_ux_ui.md`).
3.  **Nastavení písem:** Importovat písma `Outfit` a `Inter` z Google Fonts a nastavit je jako výchozí pro nadpisy a tělo dokumentu.
4.  **Pomocné třídy:** Vytvořit třídu `.sr-only` pro skrytí nadpisů `<h1>` (přístupných pro vyhledávače, ale neviditelných na obrazovce).

### Krok 2: Globální Prvky (Hlavička a Patička)
1.  **Úkol:** Vytvořit komponentu pro dvojitou hlavičku (Navbar) a patičku (Footer).
2.  **Dropdowny:** Implementovat funkčnost rozbalovacích menu pro všech 7 hlavních kategorií pomocí CSS hoveru (vhodné pro desktop) nebo jednoduchého React stavu (vhodné pro mobilní zobrazení).
3.  **Vyhledávání:** Přidat ikonu lupy `🔍` na pravou stranu vyhledávacího vstupu.
4.  **Logo:** Připravit čtvercový box jako placeholder pro budoucí logo e-shopu.

### Krok 3: Sestavení Úvodní Stránky (Homepage)
1.  **Slideshow:** Sestavit karusel hlavních bannerů se šipkami na okrajích a 5 tečkami dole.
2.  **Akce dne:** Vytvořit widget s velkým zobrazením ceny, tlačítkem "Do košíku" a šedými boxy pro odpočet času (hodiny, minuty, sekundy).
3.  **USP bar:** Rozvrhnout 4 výhodné boxy pod hero sekcí.
4.  **Příběh zakladatele:** Vytvořit rozvržení textové bubliny s šedým pozadím, na kterou navazuje trojúhelníkový ukazatel ukazující na fotografii zakladatelů vpravo.
5.  **Produktové karty:** Vytvořit čistý design karet bez hvězdiček a košíků (pouze obrázek, název, dostupnost a cena). Přidat CSS transformaci pro mírné zvětšení a záři (glow) na hoveru.
6.  **Newsletter:** Vytvořit jednořádkový přihlašovací panel na konci stránky.

### Krok 4: Implementace Speciálních Modulů a Ostatních Stránek
1.  **Výkupní portál (Buylist):** 
    *   Vytvořit tabulku s vyhledáváním a kalkulačkou karet.
    *   Přidat přepínač výplaty na účet (standardní cena) a Store Kredit (připočtení 25 % k celkové ceně výkupu).
2.  **Grading formulář:**
    *   Sestavit tříkrokový stepper pro odeslání karet (výběr PSA/Beckett/TAG/CGC -> doplňkové služby -> shrnutí).
3.  **Katalog singles:**
    *   Vytvořit levý filtrovací panel se zaškrtávacími poli pro stav karet (NM-PO), edice a foilové varianty.
4.  **Detail kusovky (Unified Product Page):**
    *   Vytvořit tabulkové zobrazení variant, kde si uživatel na jedné stránce vybírá stav, jazyk a foil úpravu konkrétní karty.

### Krok 5: Verifikace a Výstupní Kontrola
Před dokončením vývoje je nutné provést důkladnou kontrolu kódu.

*   **Pravidlo Single H1:** Zkontrolujte v kódu každé podstránky, že se na ní nachází právě jeden nadpis `<h1>` (u podstránek skrytý pomocí třídy `.sr-only`).
*   **Kontrola textů (Copywriting):**
    *   Vyhledejte v kódu slova jako *revoluční*, *robustní*, *klíčový*, *optimalizovat* atd. Pokud je najdete, nahraďte je podle pravidel v dokumentu `03_design_system_a_ux_ui.md`.
    *   Ověřte, že všechna oslovení zákazníka v češtině (Vám, Váš, Vás atd.) mají velká počáteční písmena.
    *   Zkontrolujte, že v textech nejsou dlouhé pomlčky `–` nebo `—`, ale pouze standardní krátké spojovníky `-`.
*   **Vite Sestavení:** Spusťte příkaz pro sestavení projektu:
    ```bash
    npm run build
    ```
    Sestavení musí proběhnout úspěšně, bez jakýchkoliv chyb či varování v konzoli.

---

## Jak Spustit Vývojový Server a Sestavení

Pro lokální testování a spuštění projektu použijte standardní npm příkazy:

1.  **Instalace závislostí (pokud chybí složka node_modules):**
    ```bash
    npm install
    ```
2.  **Spuštění lokálního vývojového serveru:**
    ```bash
    npm run dev
    ```
    *Vývojový server standardně běží na adrese `http://localhost:5173`.*
3.  **Sestavení produkčního balíčku (verifikace kódu):**
    ```bash
    npm run build
    ```
