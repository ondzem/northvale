# Bezpečnostní audit NORTHVALE — 4. 8. 2026

Prošel jsem všechny stránky, komponenty a všech 14 serverových funkcí.
**Opraveno rovnou v kódu: 11 nálezů.** Zbývá vám udělat 3 věci, které z kódu udělat nejdou.

---

## OPRAVENO

### 1. Kdokoli mohl objednat cokoli za 1 Kč — KRITICKÉ
Server přebíral ceny položek i celkovou částku z prohlížeče a nijak je neověřoval.
Stačilo v prohlížeči upravit požadavek a objednat zboží za libovolnou cenu.

Přidal jsem do `finalize-order` funkci `verifyOrderPricing`, která objednávku přepočítá
z cen v databázi — včetně ověření slevového kódu (platnost, počet použití) a přepočtu
dopravy podle vlastního ceníku. Když je klientská částka nižší než serverová o víc
než 1 Kč, objednávka se odmítne a incident se zaloguje do `pohoda-orders/security/`.

### 2. Platební brána podepisovala částku z prohlížeče — KRITICKÉ
`gp-webpay/sign` podepsal jakoukoli částku, kterou dostal. Šlo tedy zaplatit 1 Kč
za zboží v jakékoli hodnotě, i kdyby objednávka byla uložená správně.

Nově si funkce načte objednávku ze serveru a použije částku z ní. Prohlížeči se
už nevěří vůbec.

### 3. Kdokoli mohl rozeslat newsletter vaším jménem — KRITICKÉ
`send-newsletter` neměla žádnou autorizaci. S veřejným klíčem, který má každý
návštěvník ve zdrojáku webu, šlo rozeslat e-mail celé databázi odběratelů
a číst historii kampaní. Riziko: rozesílání spamu z vaší domény, vyčerpání
kreditu v Brevu, zablokování domény.

Zamčeno na administrátora.

### 4. Kdokoli mohl posílat e-maily z vaší domény — KRITICKÉ
`send-order-email` neměla autorizaci. Šlo poslat komukoli falešné „potvrzení
objednávky" z `info@northvaletcg.eu` — ideální nástroj pro podvodný e-mail
na vaše zákazníky.

Zamčeno na interní volání nebo administrátora.

### 5. Kdokoli mohl vystavit fakturu a přepsat existující — VYSOKÉ
`generate-invoice-pdf` neměla autorizaci a ukládá s přepisem. Šlo tedy podstrčit
libovolné PDF pod číslo skutečné faktury.

Zamčeno na interní volání nebo administrátora.

### 6. Kdokoli mohl přenastavit číselnou řadu faktur — KRITICKÉ
Akce `reset-invoice-counter` a `save-daily-deal-config` ve `finalize-order`
byly bez ochrany. Přenastavením čítače by další objednávky dostaly čísla
existujících objednávek a **přepsaly by je**.

Zamčeno na administrátora.

### 7. HTML injection do e-mailů — STŘEDNÍ
Kontaktní formulář, formulář pro odstoupení od smlouvy a notifikace o recenzích
vkládaly text od návštěvníka přímo do HTML e-mailu bez ošetření. Útočník tak mohl
do e-mailu, který čte váš tým, propašovat vlastní odkazy vypadající jako od obchodu.
Zároveň nikde nebyl limit délky — dalo se posílat obří zprávy.

Ve všech čtyřech veřejných funkcích se teď vstup escapuje a ořezává na rozumnou délku,
u e-mailů se kontroluje formát.

### 8. Falešné dvoufaktorové ověření — VYSOKÉ
V nastavení účtu byl „testovací režim" 2FA: použil pevný, veřejně známý klíč
(`JBSWY3DPEHPK3PXP` je ukázkový klíč z dokumentace) a jako platný přijal **jakýkoli**
šestimístný kód. Přesto pak do profilu zapsal `two_factor_enabled = true`.
Zákazník viděl, že má účet chráněný, a přitom neměl vůbec nic.

Testovací režim odstraněn. 2FA se ověřuje výhradně proti Supabase.

### 9.–11. Drobnosti
- `check-deal-expiry` (cron) šla spustit kýmkoli → zamčeno.
- `subscribe-newsletter` nekontrolovala formát e-mailu → doplněno.
- Sdílený modul `_shared/auth.ts` nově rozpozná service klíč i ve starém formátu JWT.
  Kvůli tomu dřív administrátorské volání končilo chybou 401.

---

## CO MUSÍTE UDĚLAT VY

### A) Spustit bezpečnostní test — udělejte to jako první

```bash
node scripts/test-security.mjs
```

Chová se jako útočník: použije **jen veřejný klíč ze zdrojáku vašeho webu**
a zkouší číst i měnit data. Nic nemaže.

Ověřuje mimo jiné, jestli si kdokoli může přečíst:
- **profily zákazníků** (jména, telefony, adresy, historie objednávek)
- **tabulku `withdrawals`** — a v ní **čísla bankovních účtů** z formuláře pro odstoupení od smlouvy
- e-maily odběratelů newsletteru, zprávy z kontaktního formuláře, slevové kódy

a jestli si může měnit ceny produktů, vyrábět slevové kódy na 100 %,
povýšit se na administrátora nebo si přidat kredit.

**Tohle z kódu zjistit nejde** — závisí to na nastavení RLS přímo v Supabase.
Váš web zapisuje do databáze rovnou z prohlížeče, takže pokud RLS chybí,
je celá databáze otevřená. Test to zjistí za pár sekund.

Chcete-li ověřit i to, že přihlášený zákazník nevidí cizí data:

```bash
TEST_LOGIN_EMAIL="testovaci@ucet.cz" TEST_LOGIN_PASSWORD="heslo" node scripts/test-security.mjs
```

### B) Nasadit opravené serverové funkce

```bash
supabase functions deploy finalize-order --project-ref bfxzhggjpiyqfolqpxzz
supabase functions deploy gp-webpay --project-ref bfxzhggjpiyqfolqpxzz
supabase functions deploy generate-invoice-pdf --project-ref bfxzhggjpiyqfolqpxzz
supabase functions deploy send-order-email --project-ref bfxzhggjpiyqfolqpxzz
supabase functions deploy send-newsletter --project-ref bfxzhggjpiyqfolqpxzz
supabase functions deploy send-contact-email --project-ref bfxzhggjpiyqfolqpxzz
supabase functions deploy send-withdrawal-email --project-ref bfxzhggjpiyqfolqpxzz
supabase functions deploy send-support-notification --project-ref bfxzhggjpiyqfolqpxzz
supabase functions deploy subscribe-newsletter --project-ref bfxzhggjpiyqfolqpxzz
supabase functions deploy check-deal-expiry --project-ref bfxzhggjpiyqfolqpxzz
```

Potom spusťte oba testy — musí projít:

```bash
SUPABASE_SERVICE_ROLE_KEY="..." node scripts/test-order-flow.mjs
node scripts/test-security.mjs
```

### C) Zkontrolovat privátní klíč k platební bráně

V repozitáři leží `gpwebpay-pvk.key` a `GPE_production_public_key/gpe.signing_prod.pem`
a **oba jsou zacommitované v gitu.**

Klíč je naštěstí zašifrovaný heslem (`BEGIN ENCRYPTED PRIVATE KEY`), takže samotný
soubor bez hesla nestačí. Heslo jsem v repozitáři nikde nenašel — to je dobře.

Přesto:

1. **Ověřte, jestli je repozitář `github.com/ondzem/northvale` veřejný.** Pokud ano,
   klíč vyměňte u GP webpay a starý zneplatněte.
2. Ať tak či tak, klíč z repozitáře odstraňte a přidejte do `.gitignore`.
   Odstranění jen v novém commitu nestačí — zůstává v historii.

---

## ZBYTEČNOSTI (nespěchá, jen na vědomí)

- **Vypnuté sekce se pořád posílají návštěvníkům.** `showGrading`, `showBuylist`,
  `showSlabs` a `showCalendar` jsou vypnuté, ale komponenty (`GradingPortal`,
  `BuylistPortal`, `TcgCalendarPage`, `GradingGuide` — dohromady ~1 900 řádků)
  se stále načítají do prohlížeče každého návštěvníka. Šlo by je načítat až
  na vyžádání a zrychlit tím web.
- **Dvoufaktorové ověření není vynucené.** Přihlášení heslem vytvoří platnou relaci
  ještě předtím, než se zobrazí výzva k 2FA. Skutečné vynucení se dělá pravidly
  v databázi (AAL v RLS). Dokud to není nastavené, je 2FA spíš doplněk.
- **Objednávky nemají vlastní databázovou tabulku.** Žijí jako JSON soubory v úložišti
  a jako kopie v profilu zákazníka. Funguje to, ale je to křehké a při stovkách
  objednávek pomalé. Až bude čas, stojí za zvážení převod do tabulky `orders`.
- **`console.log` s e-maily zákazníků** v `OrdersTab.jsx` (řádky 727, 1021) —
  vypisuje se do konzole prohlížeče. Drobnost, ale zbytečné.
