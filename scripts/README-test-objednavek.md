# Jak spustit test objednávkového procesu

## 1. Sežeňte service role klíč

Supabase → váš projekt → **Project Settings** → **API** → sekce **Project API keys** → klíč `service_role`.

Je to klíč s plnými právy. Nikdy ho nedávejte do frontendu, do `.env.local` ani do gitu — použijte ho jen v příkazu níže.

## 2. Spusťte

V terminálu ve složce projektu:

```bash
SUPABASE_SERVICE_ROLE_KEY="sem_vlozte_service_role_klic" node scripts/test-order-flow.mjs
```

Chcete si i reálně nechat poslat testovací e-maily:

```bash
SUPABASE_SERVICE_ROLE_KEY="..." TEST_EMAIL="vas@email.cz" node scripts/test-order-flow.mjs
```

Chcete si testovací objednávky prohlédnout v administraci (skript je pak nesmaže):

```bash
SUPABASE_SERVICE_ROLE_KEY="..." KEEP_DATA=1 node scripts/test-order-flow.mjs
```

Test trvá zhruba minutu a půl.

## 3. Doporučení — nainstalujte `pdftotext`

Bez něj skript ověří jen to, že faktura vznikla, ale nepodívá se **dovnitř**. S ním zkontroluje, že na faktuře je jméno zákazníka, adresa, sleva, rozpis DPH a správné razítko UHRAZENO / NEUHRAZENO.

- macOS: `brew install poppler`
- Linux: `sudo apt install poppler-utils`

## Co skript otestuje

| # | Oblast | Co ověřuje |
|---|---|---|
| 1 | Čísla objednávek | 6 souběžných objednávek dostane 6 různých čísel (dřív se přepisovaly) |
| 2 | Objednávka převodem | uloží se do storage i do profilu zákazníka, správné `user_id`, stav, částka, sleva, položky; sklad se odečte přesně jednou |
| 3 | Faktura PDF | vznikne, je platná, obsahuje jméno, adresu, slevu, rozpis DPH, razítko NEUHRAZENO |
| 4 | Bezpečnost platby | podvržený podpis, chybějící podpis i nesouhlasící číslo objednávky jsou odmítnuty; objednávka zůstane nezaplacená |
| 5 | Bezpečnost dat | bez přihlášení nejde vypsat objednávky; anon klíč ani běžný zákazník nemůže objednávky přepisovat ani mazat |
| 6 | Účet zákazníka | zákazník vidí svou objednávku se správným stavem a částkou a **nevidí cizí** |
| 7 | Administrace | objednávka je v seznamu včetně stavu, kontaktů a položek; funguje stránkování |
| 8 | Potvrzení platby | stav se změní na uhrazeno, promítne se do účtu zákazníka, faktura se přegeneruje a má UHRAZENO |
| 9 | Dobírka | správný stav a dobírkový příplatek, funguje i pro nepřihlášeného |
| 10 | Zboží § 90 | objednávka je označena bez DPH a automatická faktura se **negeneruje** |
| 11 | Odolnost | objednávka projde, i když produkt mezitím zmizel z katalogu |
| 12 | Rezervace před kartou | sklad ani slevový kód se před zaplacením nestrhnou |
| 13 | Dvojí odečet | opakované uložení téže objednávky neodečte sklad podruhé |
| 14 | E-maily | všechny tři typy e-mailů projdou přes Brevo (s `TEST_EMAIL` je i dostanete) |
| 15 | Vrácení skladu | smazání objednávky v administraci vrátí zboží na sklad |

## Co skript neotestuje

- **Průchod platební bránou** (3D Secure, skutečné stržení peněz). To umí jen člověk s kartou.
- **Vzhled** e-mailů a faktury. Skript ověří obsah, ne jak to vypadá.
- **Chování v prohlížeči** — obrázky v košíku, tlačítka, přesměrování po platbě.

## Jak číst výsledek

Na konci dostanete souhrn. Když je něco červeně, je pod tím napsáno co konkrétně selhalo a s jakou hodnotou — to můžete rovnou poslat do AntiGravity jako zadání k opravě.

Skript po sobě vždy uklidí: smaže testovací objednávky, faktury, produkty, slevový kód i testovacího uživatele. V administraci ani v databázi po něm nic nezůstane (pokud nespustíte s `KEEP_DATA=1`).
