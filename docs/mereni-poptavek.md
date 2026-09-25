# Měření poptávek — NORTHVALE

Web měří tři okamžiky, kdy se návštěvník ozve, a ke zprávě z kontaktního
formuláře připojí, odkud přišel. Všechno běží přes GA4 (`G-6TDQCGWYTQ`)
a **jen se souhlasem s analytickými cookies**.

Kód: `src/services/leadTracking.js` (jedna funkce `trackLead`, jeden posluchač
na kliky, zachycení zdroje), spouští se v `src/main.jsx`.

## 1. Co se měří

| Co člověk udělá | Událost v GA4 | Podrobnost |
|---|---|---|
| Odešle kontaktní formulář (zpráva se uloží) | `formular_odeslan` | `formular: kontakt`, `tema: obecny_dotaz` |
| Přihlásí se k newsletteru v patičce | `formular_odeslan` | `formular: newsletter_paticka`, `tema: newsletter` |
| Přihlásí se přes předregistraci | `formular_odeslan` | `formular: newsletter_predregistrace`, `tema: newsletter` |
| Klikne na telefon | `klik_telefon` | `misto: paticka / hlavicka / stranka_kontakt / kosik / pokladna / text_stranky` |
| Klikne na e-mail | `klik_email` | `misto:` stejné hodnoty jako u telefonu |

Do GA4 nikdy nejde jméno, e-mail, telefon ani text zprávy.

**Odkud přišel:** v e-mailu „Nový kontaktní dotaz“ je řádek **Přišel z:**
(např. „Instagram (bio)“, „Google“, „ChatGPT“). Když je návštěva přímá, řádek
chybí. Platí první vstup na web, web si ho pamatuje jen do zavření prohlížeče.

## 2. Ruční nastavení v GA4 (jednou, cca 10 minut)

1. analytics.google.com → vlevo dole **Správce** (ozubené kolo) → vlastnost NORTHVALE.
2. **Zobrazení dat → Klíčové události → Nová klíčová událost** → napiš `formular_odeslan` → Uložit.
3. Totéž pro `klik_telefon` a `klik_email`.
4. U každé klíčové události nech **Způsob počítání: Jednou za událost**. Nepřepínej na „jednou za relaci“, jinak dva formuláře od jednoho člověka splynou.
5. **Zobrazení dat → Vlastní definice → Vytvořit vlastní dimenzi**, třikrát:
   - Název `Formulář`, rozsah **Událost**, parametr `formular`
   - Název `Téma`, rozsah **Událost**, parametr `tema`
   - Název `Místo kontaktu`, rozsah **Událost**, parametr `misto`
6. Parametr musí být napsaný přesně takhle: malými písmeny, bez diakritiky. Jinak dimenze zůstane prázdná.
7. Data v dimenzích se objeví až od chvíle, kdy je vytvoříš. Starší události se zpětně nedoplní.

**Čísla budou nižší než skutečnost.** Lidé, kteří odmítli cookies, se nepočítají. To je v pořádku, jde o trend a srovnání zdrojů.

## 3. Jak si to ověřit (3 kroky)

1. Na webu přijmi cookies (nebo v patičce → nastavení cookies zapni Analytické).
2. V GA4 otevři **Přehledy → V reálném čase**. Na webu klikni na telefon v patičce a odešli testovací zprávu z Kontaktu.
3. Do minuty uvidíš v kartě „Počet událostí“ `klik_telefon` a `formular_odeslan`. V e-mailu s dotazem se zobrazí řádek „Přišel z“, pokud jsi na web přišel přes odkaz s `utm_source`.

## 4. Hotové odkazy se zdrojem

Bez těchhle odkazů přijdou všichni jako přímá návštěva. Stačí je zkopírovat.

| Kam | Odkaz |
|---|---|
| Instagram — odkaz v bio | `https://northvaletcg.eu/?utm_source=instagram&utm_medium=social&utm_campaign=bio` |
| Instagram — příběhy / příspěvky | `https://northvaletcg.eu/?utm_source=instagram&utm_medium=social&utm_campaign=pribeh` |
| Facebook — stránka (tlačítko / info) | `https://northvaletcg.eu/?utm_source=facebook&utm_medium=social&utm_campaign=profil` |
| Facebook — příspěvky | `https://northvaletcg.eu/?utm_source=facebook&utm_medium=social&utm_campaign=prispevek` |
| TikTok — profil | `https://northvaletcg.eu/?utm_source=tiktok&utm_medium=social&utm_campaign=bio` |
| Discord / komunita | `https://northvaletcg.eu/?utm_source=discord&utm_medium=social&utm_campaign=komunita` |
| Google — firemní profil (Mapy) | `https://northvaletcg.eu/?utm_source=google&utm_medium=organic&utm_campaign=firemni_profil` |
| Podpis v e-mailu | `https://northvaletcg.eu/?utm_source=email&utm_medium=podpis&utm_campaign=podpis` |
| QR kód na letáku / v balíčku | `https://northvaletcg.eu/?utm_source=qr&utm_medium=offline&utm_campaign=letak` |
| QR kód na stánku / turnaji | `https://northvaletcg.eu/?utm_source=qr&utm_medium=offline&utm_campaign=turnaj` |

**Newsletter (Brevo):** v kampani zapni *Google Analytics tracking*. Brevo pak
k odkazům doplní `utm_source` samo. Nic ručně nepřepisuj.

**Heureka, Zboží.cz, Google Merchant — NEMĚNIT.** Odkazy v produktových feedech
nechte bez utm. Změna URL ve feedu rozpáruje produkty a párování trvá znovu
kolem 4 pracovních dnů. Tyhle zdroje GA4 pozná samo podle domény.
