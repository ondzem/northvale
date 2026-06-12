# 3. Design Systém, UX/UI a Copywriting Standardy (NORTHVALE TCG)

Tento dokument definuje vizuální pravidla, barevné tokeny, interaktivní prvky a komunikační manuál pro e-shop NORTHVALE. Všechny implementace musí tato pravidla bezvýhradně dodržovat.

---

## 1. Barevné Tokeny (Sleek Dark Mode)

Web je navržen v moderním tmavém motivu s luxusními akcenty. Níže jsou uvedeny přesné barvy pro CSS proměnné:

*   **Pozadí stránky (Page Background):** `#09090b` (černo-šedá)
*   **Povrchy karet a panelů (Surface Background):** `#18181b` (tmavě šedá)
*   **Alternativní povrchy (Surface Alt):** `#27272a` (středně šedá)
*   **Hlavní barva textu (Text Main):** `#f4f4f5` (bílo-šedá pro skvělou čitelnost)
*   **Tlumený text (Text Muted):** `#a1a1aa` (šedá pro popisy a pomocné texty)
*   **Rámečky a předěly (Borders):** `#27272a` (kontrastní šedá)
*   **Světlejší rámečky (Borders Light):** `#3f3f46`
*   **Zlatý akcent (Gold / Primary CTA):** `#f59e0b` (výstražná zlatá pro tlačítka, ceny a vzácné stavy)
*   **Tmavší zlatá (Gold Hover):** `#d97706`
*   **Zelený akcent (Emerald Green / Success):** `#10b981` (smaragdově zelená pro skladovou dostupnost a výkupní bonusy)
*   **Tmavší zelená (Green Hover):** `#059669`

---

## 2. Vizuální Styl (Vibe & Estetika)

*   **Glassmorphismus (Efekt skla):** Hlavní panely, košík a produktové karty nepoužívají ploché neprůhledné barvy. Využívají poloprůhledné pozadí s rozostřením obsahu pod nimi:
    ```css
    background: rgba(24, 24, 27, 0.8);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(63, 63, 70, 0.4);
    ```
*   **Zaoblení rohů (Radius):**
    *   `--radius-lg: 12px` (pro hlavní panely, sekci příběhu a modální okna)
    *   `--radius-md: 8px` (pro produktové karty, vstupy a tlačítka)
    *   `--radius-sm: 4px` (pro malé štítky a timer boxy)
*   **Světelná záře (Glow):** Vzácné karty a speciální investiční produkty mají při najetí myší na kartu aktivován vnější stínovaný glow efekt odpovídající barvě jejich rarity (např. zlatý nebo zelený stín).

---

## 3. Typografie (Google Fonts)

*   **Nadpisy (H1, H2, H3):** Písmo `Outfit` (importované z Google Fonts). Outfit dodává nadpisům moderní, technologický a čistý vzhled.
*   **Běžný text a rozhraní:** Písmo `Inter`. Zajišťuje dokonalou čitelnost parametrů, cen a tabulek i při malých velikostech na mobilních zařízeních.
*   **Import v HTML:**
    ```html
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@600;700;800&display=swap" rel="stylesheet">
    ```

---

## 4. Chování a Mikroanimace (UX)

*   **3D Tilt efekt u karet:** Při najetí ukazatele myši na produktovou kartu (hover) se karta plynule naklání podle pozice kurzoru (tilt efekt). To imituje odlesk reálné metalické (foil) karty ve sběratelském pořadači.
*   **Hover zoom a glow:** Karta se při najetí myší zvětší o 2 % (`transform: scale(1.02)`) s plynulým přechodem (`transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1)`) a aktivuje se stínovaný glow efekt na okraji.
*   **Animace košíku:** Tlačítko "Do košíku" po kliknutí změní stav na zelené zatržítko "Přidáno" s plynulým smrštěním a roztažením.
*   **Přechody stránek:** Navigace mezi záložkami v aplikaci nepůsobí trhaně, nýbrž využívá plynulé zatmívání a roztmívání obsahu (fade-in / fade-out).

---

## 5. Standard Galerie Produktů

Sběratelé a investoři vyžadují klasické, přehledné zobrazení bez zbytečných prvků:
*   **Centrování na tmavém pozadí:** Fotografie karty (lícová a rubová strana) se zobrazuje na tmavě šedém pozadí, které dává vyniknout hranám karty.
*   **Přiblížení (Zoom):** Klasický hover zoom (lupa) nebo kliknutí na detail obrázku, které otevře fotografii ve vysokém rozlišení. To umožňuje zákazníkovi zkontrolovat opotřebení hran (whitening) a povrchu.

---

## 6. Copywriting a Komunikační Pravidla (Striktní)

Tón komunikace (Tone of Voice) musí být odborný, přímý a přátelský. Komunita sběratelů je citlivá na umělý marketingový tón.

### Pravidlo A: Povinné Vykání s Velkým Písmenem
Veškerá komunikace směřovaná k zákazníkovi v přímé řeči musí používat velké počáteční písmeno u osobních a přivlastňovacích zájmen:
*   *Správně:* **Vám, Váš, Vás, Vašich, Vámi, Vaší, Vašim, Vašemu, Vašeho**.
*   *Příklad:* „Pojistíme přepravu Vašich karet.“ / „Zašleme Vám cenovou nabídku.“

### Pravidlo B: Zákaz AI Výrazů a Klišé
Je přísně zakázáno používat prázdné korporátní fráze.
*   **Nepoužívat:** *revoluční, robustní, klíčový, optimalizovat, efektivní, ekosystém, bezproblémový, široká škála, nabízí možnost, prostřednictvím*.
*   **Ekvivalenty:**
    *   Namísto *revoluční / robustní* píšeme: **moderní, spolehlivý, propracovaný**.
    *   Namísto *ekosystém / optimalizovat* píšeme: **prostředí / vyladit, vylepšit**.
    *   Namísto *prostřednictvím / nabízí možnost* píšeme: **pomocí, přes / umožňuje, dovoluje**.
    *   Namísto *bezproblémový* píšeme: **hladký, plynulý**.

### Pravidlo C: Pouze Krátké Spojovníky
V textech se nepoužívají dlouhé pomlčky `–` (en-dash) ani `—` (em-dash). Používejte výhradně standardní krátký spojovník `-`.
*   *Správně:* „Doručení do 24h - Zásilkovna.“
*   *Nesprávně:* „Doručení do 24h – Zásilkovna.“

### Pravidlo D: Single H1 nadpis pro SEO
Každá stránka na webu musí mít z technických a SEO důvodů právě jeden nadpis `<h1>`. Pokud nadpis na stránce vizuálně ruší čistotu wireframu, skryje se pro běžné uživatele pomocí CSS třídy `.sr-only` (vizuálně skryté, ale přístupné pro vyhledávače a čtečky):
```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}
```
 Nadpisy sekcí na stránkách (např. "Novinky", "Předobjednávky") se označují jako `<h2>` a podnadpisy jako `<h3>`.
