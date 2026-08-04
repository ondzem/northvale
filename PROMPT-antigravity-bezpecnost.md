# PROMPT PRO ANTIGRAVITY IDE — nasazení a ověření bezpečnostních oprav

> Zkopíruj celý text od čáry níže.

---

V repozitáři jsou hotové bezpečnostní opravy, které je potřeba nasadit a ověřit.
**Kód neupravuj**, dokud tě k tomu výslovně nevyzvu v kroku 5. Tvoje práce je nasadit,
spustit testy a poslat mi výsledky.

---

## KROK 1 — Sestavení webu

```bash
npm run build
```

Musí projít bez chyby. Pokud selže, **zastav se a pošli mi celý výpis chyby.**
Neopravuj to sám.

---

## KROK 2 — Nasazení serverových funkcí

Změnilo se deset edge funkcí a přibyl sdílený modul `supabase/functions/_shared/auth.ts`.
Nasaď je všechny:

```bash
npx supabase functions deploy finalize-order gp-webpay generate-invoice-pdf send-order-email send-newsletter send-contact-email send-withdrawal-email send-support-notification subscribe-newsletter check-deal-expiry --project-ref bfxzhggjpiyqfolqpxzz
```

Ověř ve výpisu, že se u každé funkce nahrál i soubor `_shared/auth.ts`.
Pokud se nenahrál, funkce spadnou. **Pošli mi celý výpis.**

---

## KROK 3 — Bezpečnostní test

```bash
node scripts/test-security.mjs
```

Tenhle skript se chová jako útočník: použije **jen veřejný anon klíč**, který má každý
návštěvník ve zdrojovém kódu webu, a zkouší se dostat k datům a měnit je. Nic nemaže.

**Pošli mi celý výstup, i když projde.** Zvlášť mě zajímá:

- sekce **„1. Čtení databáze bez přihlášení"** — jestli jde zvenku číst tabulky
  `profiles`, `withdrawals`, `contact_messages`, `newsletter_subscribers`, `discount_codes`
- sekce **„2. Změna dat bez přihlášení"** — jestli jde měnit ceny, vyrábět slevové kódy,
  povýšit se na administrátora nebo si přidat kredit
- sekce **„3. Úložiště"** — jestli jsou faktury veřejně stažitelné

**Pokud test najde díry: NEOPRAVUJ NIC SÁM.** Jen mi pošli výstup. Většina těch věcí
se řeší nastavením RLS přímo v Supabase, ne v kódu, a špatně napsaná politika by
rozbila web.

---

## KROK 4 — Test objednávkového procesu

Ověř, že bezpečnostní opravy nerozbily normální nákup.

Service role klíč (`SUPABASE_SERVICE_ROLE_KEY`) NEMÁŠ a mít nebudeš.
**Pokud ho v prostředí nenajdeš, zastav se a napiš mi, ať test spustím sám** —
nesnaž se ho nikde dohledávat, generovat ani obcházet.

Když ho k dispozici máš:

```bash
SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY" node scripts/test-order-flow.mjs
```

Musí projít všech ~80 kontrol. Zvlášť sleduj:

- `[2.] Objednávka bankovním převodem` — nesmí selhat na nové kontrole cen
- `[3.] Faktura PDF byla vygenerována a uložena`
- `[7.] Načtení seznamu objednávek pro administraci`
- `[12.] Rezervace před platbou kartou`

Pokud něco selže, **pošli mi výstup a nic neopravuj.**

---

## KROK 5 — Kontrola privátního klíče k platební bráně

V repozitáři jsou zacommitované soubory `gpwebpay-pvk.key`
a `GPE_production_public_key/gpe.signing_prod.pem`.

Zjisti a napiš mi:

1. Je repozitář `github.com/ondzem/northvale` veřejný, nebo soukromý?
   ```bash
   npx gh repo view ondzem/northvale --json visibility 2>/dev/null || echo "gh CLI neni k dispozici"
   ```
   Pokud `gh` není nainstalované, jen mi to napiš — ověřím si to sám.

2. Ve kterých commitech se ty soubory objevují?
   ```bash
   git log --oneline -- gpwebpay-pvk.key "GPE_production_public_key/gpe.signing_prod.pem"
   ```

3. Prohledej repozitář, jestli někde není uložené heslo k tomu klíči:
   ```bash
   grep -rniE "passphrase|pvk.*hesl|key.*passw" --include="*.md" --include="*.js" --include="*.ts" --include="*.jsx" --include="*.json" --include="*.txt" . | grep -v node_modules
   ```

**Soubory zatím NEMAŽ a historii gitu nepřepisuj.** Rozhodnu o tom až podle výsledku —
přepsání historie je nevratná operace a nechci ji dělat naslepo.

---

## KROK 6 — Souhrn

Napiš mi na závěr krátký přehled:

- Prošel build? (ano/ne)
- Nasadilo se všech 10 funkcí? (ano/ne, u kterých byl problém)
- Kolik děr našel bezpečnostní test a jaké
- Kolik kontrol prošlo v testu objednávek
- Je repozitář veřejný?

Piš stručně a bez příkras. Když něco selhalo, napiš to rovnou — nechci slyšet,
že „vše proběhlo úspěšně", pokud to není pravda.

---

## CO NEDĚLAT

- Neupravuj `scripts/test-security.mjs` ani `scripts/test-order-flow.mjs` —
  to jsou měřidla, ne kód k opravě. Když test hlásí chybu, chyba je jinde.
- Neměň nastavení RLS ani žádné politiky v Supabase.
- Nemaž ani nepřepisuj nic v gitu.
- Neopravuj nálezy z bezpečnostního testu na vlastní pěst.
- Když si nejsi jistý, zastav se a zeptej se.
