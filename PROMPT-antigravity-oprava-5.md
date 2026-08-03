# PROMPT PRO ANTIGRAVITY IDE — kolo 5

> Zkopíruj text od čáry níže.

---

Automatický test objednávkového procesu (`scripts/test-order-flow.mjs`) odhalil dvě chyby. Oprav obě.

Pravidla: každý krok = jeden commit, na konci `npm run build`. Nic nedeployuj — deploy udělám sám.

---

## CHYBA 1 (kritická) — u objednávky bankovním převodem nevznikne faktura

**Důkaz z testu:** objednávka `260100016` (převod, bez § 90 zboží) se vytvořila správně, ale soubor `invoices/invoice_260100016.pdf` nevznikl ani po 24 sekundách.

`finalize-order` v akci `create` volá `generate-invoice-pdf` (řádky ~338–349) a chybu jen zaloguje do `console.error`, takže se navenek nic neprojeví — objednávka se tváří jako v pořádku, ale zákazník nedostane daňový doklad.

**Postup:**

1. **Zjisti skutečnou příčinu.** Otevři v Supabase logy edge funkce `generate-invoice-pdf` (Dashboard → Edge Functions → generate-invoice-pdf → Logs) a najdi chybu z posledního běhu. Nejpravděpodobnější kandidát je načítání fontů:

   ```ts
   regularFontBytes = await Deno.readFile(new URL("./Roboto-Regular.ttf", import.meta.url));
   ```

   Soubory `Roboto-Regular.ttf` a `Roboto-Bold.ttf` musí být nasazené spolu s funkcí. Ověř, že tam skutečně jsou. Pokud ne, nasaď je jako statické soubory funkce.

2. **Ať se chyba nikdy nespolkne.** V `finalize-order` v akci `create` i `mark_paid` uprav volání `generate-invoice-pdf` tak, aby:
   - přečetlo odpověď (`const r = await fetch(...); const t = await r.text();`)
   - při `!r.ok` zapsalo do storage soubor `errors/invoice_<orderId>.txt` s HTTP kódem a tělem odpovědi
   - a do JSONu objednávky přidalo příznak `invoice_error: "<popis>"`

   Stejně ošetři i `send-order-email`. Chci, aby se v administraci dalo poznat, že faktura nebo e-mail selhaly.

3. **Přidej do administrace viditelný signál.** V `src/components/admin/OrdersTab.jsx` u objednávky, která má `invoice_error` nebo které chybí faktura, zobraz červený štítek „Faktura se nevygenerovala" a tlačítko pro ruční vygenerování (`generate-invoice-pdf` s `overwrite: true`).

4. **Záloha při selhání fontů.** V `generate-invoice-pdf` obal načtení fontů do `try/catch`. Když se lokální TTF nepodaří načíst, použij vestavěný font pdf-lib (`StandardFonts.Helvetica`) místo toho, aby celá funkce spadla. Faktura bude mít horší diakritiku, ale **vznikne** — to je pořád lepší než žádná.

---

## CHYBA 2 — opakované uložení objednávky odečte sklad podruhé

**Důkaz z testu:** stejná objednávka byla uložena dvakrát přes `finalize-order` `action: 'create'` se stejným `orderId`. Sklad klesl `44 → 42`, tedy odečet proběhl dvakrát.

**Příčina:** ochrana `stock_applied` v `applyStockAndDiscount` kontroluje příznak na objektu, který přišel **v požadavku**, ne na tom, co je uložené ve storage. Při druhém volání dorazí čerstvá objednávka bez příznaku a odečet proběhne znovu.

**Oprava** v `supabase/functions/finalize-order/index.ts`, akce `create`:

Objednávka se ze storage už načítá kvůli kontrole existence (řádky ~184–196). Využij to — načtený obsah si ulož do proměnné a použij ho takto:

```ts
let existingStored = null;
try {
  const { data: existingFile } = await supabase.storage.from("pohoda-orders").download(filename);
  if (existingFile) {
    existingStored = JSON.parse(await existingFile.text());
    if (!normalizedOrderData.items || normalizedOrderData.items.length === 0) {
      return new Response(JSON.stringify({ error: "Order already exists" }), { status: 409, headers: ... });
    }
  }
} catch (_e) {}

// Sklad se odečítá jen tehdy, když u TÉTO objednávky ještě nikdy odečten nebyl.
const alreadyApplied = existingStored?.order?.stock_applied === true;
if (alreadyApplied) {
  normalizedOrderData.stock_applied = true;
} else if (!reserveOnly) {
  await applyStockAndDiscount(supabase, normalizedOrderData);
} else {
  normalizedOrderData.stock_applied = false;
}
```

Stejnou kontrolu doplň i do akce `mark_paid` — tam se objednávka ze storage načítá už teď, takže stačí, aby se `stock_applied` z uloženého JSONu propsal do `normalizedPaidOrder` (`normalizeOrder` klíč zachovává, ověř to).

---

## OVĚŘENÍ

Po opravě a nasazení spustím znovu `scripts/test-order-flow.mjs`. Musí projít zejména:

- `[3. Faktura (PDF)] Faktura PDF byla vygenerována a uložena`
- `[3. Faktura (PDF)] Nezaplacená faktura je označena NEUHRAZENO`
- `[13. Ochrana proti dvojímu odečtu skladu] Opakované uložení stejné objednávky neodečte sklad podruhé`

Nic jiného v tom skriptu neupravuj — je to měřidlo, ne kód k opravě.

## Co NEDĚLEJ

- Neměň `scripts/test-order-flow.mjs`.
- Nezakládej tabulku `orders`.
- Nesahej na `pohoda-connector`, `gls-labels`, `dpd-labels`.
