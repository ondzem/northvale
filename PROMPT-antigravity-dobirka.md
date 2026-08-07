# PROMPT PRO ANTIGRAVITY IDE — dobírkový příplatek 29 Kč

> Zkopíruj celý text od čáry níže.

---

Zaveď do e-shopu dobírkový příplatek **29 Kč**. Dnes se nikde nepočítá — v pokladně je
natvrdo nula, takže zákazník za dobírku nic neplatí.

**Dobrá zpráva:** zobrazení příplatku už je hotové skoro všude (souhrn objednávky,
potvrzovací e-mail, faktura PDF, účet zákazníka, administrace, XML do POHODY).
Všechna ta místa čtou pole `paymentSurcharge` / `payment_surcharge` a zobrazí ho,
jakmile je větší než nula. **Nic z toho neupravuj.** Chybí jen samotný výpočet
na dvou místech a úprava právních textů.

Pravidla: každý krok = jeden commit, po každém kroku vypiš změněné soubory,
na konci spusť `npm run build`. Nic nedeployuj. Když si nejsi jistý, zastav se a zeptej se.

---

## PRAVIDLA PŘÍPLATKU

- Dobírka u DPD a GLS → **+29 Kč**
- Osobní odběr → **0 Kč** (platí se na místě, ve VOP je uvedeno jako zdarma)
- Příplatek se **nikdy neruší** dopravou zdarma nad 1 750 Kč — je to poplatek za platbu, ne za dopravu
- Do prahu pro dopravu zdarma se příplatek **nezapočítává**

---

## KROK 1 — Centrální konstanta

Do `src/config.js` přidej vedle `VAT_CONFIG`:

```js
/**
 * Příplatek za platbu na dobírku (v Kč).
 * MUSÍ souhlasit s obchodními podmínkami v src/components/GdprVop.jsx.
 * Neúčtuje se u osobního odběru — tam se platí přímo v prodejně.
 */
export const COD_SURCHARGE = 29;

/** Hranice pro dopravu zdarma (v Kč). Příplatek za dobírku se jí neruší. */
export const FREE_SHIPPING_THRESHOLD = 1750;
```

---

## KROK 2 — Výpočet v pokladně

Soubor `src/components/CheckoutFlow.jsx`.

**2a)** Do importů nahoře přidej `COD_SURCHARGE`:

```js
import { FEATURE_FLAGS, COD_SURCHARGE } from '../config';
```

(Zkontroluj, jak přesně je `FEATURE_FLAGS` importovaný, a jen doplň druhý název.
Pokud se `config` v tomto souboru zatím neimportuje, přidej nový import.)

**2b)** Na řádku ~127 je:

```js
  // Payment surcharge for Cash on Delivery (Dobírka)
  const paymentSurcharge = 0;
```

Nahraď:

```js
  // Příplatek za dobírku. U osobního odběru se neúčtuje — platí se v prodejně.
  // Dopravou zdarma se neruší, je to poplatek za způsob platby.
  const paymentSurcharge = (payment === 'cod' && !isPersonalShipping) ? COD_SURCHARGE : 0;
```

Proměnná `isPersonalShipping` je definovaná o pár řádků výš (~110), takže je k dispozici.
`paymentSurcharge` se hned pod tím používá ve výpočtu `totalBeforeCredit`, takže se
příplatek automaticky promítne do celkové částky, do maximálního uplatnitelného kreditu
i do souhrnu objednávky.

**2c) Osobní odběr nesmí zůstat s dobírkou.** Když si zákazník zvolí dobírku a potom
přepne na osobní odběr, zůstane `payment === 'cod'` bez příplatku a v objednávce
bude nesmyslná kombinace „osobní odběr + dobírka".

Přidej k ostatním `useEffect` v komponentě:

```js
  // U osobního odběru nedává dobírka smysl — platí se přímo v prodejně.
  useEffect(() => {
    if (isPersonalShipping && payment === 'cod') {
      setPayment('card');
    }
  }, [isPersonalShipping, payment]);
```

**2d) Skryj dobírku u osobního odběru.** Na řádku ~2151 je tlačítko s volbou Dobírka.
Obal ho podmínkou, ať se u osobního odběru vůbec nenabízí:

```jsx
{!isPersonalShipping && (
  <button ...volba Dobírka... >
    ...
  </button>
)}
```

**2e) Ukaž cenu u volby.** V tom samém tlačítku uprav název a popis, aby zákazník
věděl, kolik zaplatí, ještě než klikne:

- Název (CZ): `Dobírka` → `Dobírka (+${COD_SURCHARGE} Kč)`
- Název (EN): `Cash on Delivery` → `Cash on Delivery (+${COD_SURCHARGE} CZK)`
- Popis nech beze změny.

Použij konstantu, ne natvrdo napsané číslo.

---

## KROK 3 — Výpočet na serveru (bezpečnost)

Soubor `supabase/functions/finalize-order/index.ts`, funkce `verifyOrderPricing`
(cca řádek 211). Je tam:

```ts
    // Dobírkový příplatek přebíráme od klienta, ale omezený, ať nejde zneužít
    const surcharge = Math.min(200, Math.max(0, Number(orderData.payment_surcharge) || 0));
```

Tohle nestačí — zákazník může poslat nulu a příplatek si tím odpustit.
Server si ho musí spočítat sám, stejně jako počítá dopravu. Nahraď:

```ts
    // Příplatek za dobírku si počítá server sám — klientovi se nevěří.
    // MUSÍ odpovídat výpočtu v src/components/CheckoutFlow.jsx a hodnotě
    // COD_SURCHARGE v src/config.js.
    const pm = String(orderData.payment_method || '').toLowerCase();
    const sm = String(orderData.shipping_method || '').toLowerCase();
    const isCod = pm.includes('dobírk') || pm.includes('dobirk') || pm.includes('cash on delivery') || pm.includes('cod');
    const isPersonalPickup = sm.includes('osobní') || sm.includes('personal') || sm.includes('škrba') || sm.includes('skrba');
    const surcharge = (isCod && !isPersonalPickup) ? 29 : 0;
```

Do komentáře nad funkcí `serverShippingCost` (cca řádek 82) připiš poznámku, že
při změně částky příplatku je potřeba upravit **obě** místa — tady i `src/config.js`.

---

## KROK 4 — Obchodní podmínky (právní část)

Ve VOP je uvedeno 25 Kč. Účtovat 29 Kč a mít v podmínkách 25 Kč nejde.

**4a)** `src/components/GdprVop.jsx`, řádek ~476 (česká verze):

```
Platba na dobírku (příplatek 25 Kč): objednávku zaplatíte hotově nebo kartou přímo kurýrovi či ve výdejním místě při převzetí zásilky.
```
→ změň `25 Kč` na `29 Kč`

**4b)** `src/components/GdprVop.jsx`, řádek ~347 (anglická verze):

```
<strong>Cash on Delivery (25 CZK surcharge):</strong>
```
→ změň `25 CZK` na `29 CZK`

**4c)** Prohledej celý `src/` na další zmínky a oprav je také:

```bash
grep -rn "25 Kč\|25 CZK\|příplatek 25" src/
```

**4d)** Zkontroluj, jestli o dobírce není zmínka i ve FAQ. FAQ se načítá z databáze
(tabulka `faq_items`), takže to v kódu nenajdeš. Vypiš mi dotaz, kterým si to ověřím
v administraci, a napiš mi, jestli jsi v kódu našel nějaké další místo s částkou.

---

## KROK 5 — Test

V `scripts/test-order-flow.mjs` má test dobírky (funkce `testCodOrder`, cca řádek 660)
natvrdo `paymentSurcharge: 49` a `finalTotal: 358`. Uprav na skutečné hodnoty:

- `paymentSurcharge: 29`
- `finalTotal: 338` (200 zboží + 109 doprava + 29 dobírka)

A přidej do stejné funkce novou kontrolu, že si server příplatek doopravdy počítá sám —
pošli objednávku s dobírkou, ale s `paymentSurcharge: 0` a `finalTotal: 309`, a ověř,
že ji server **odmítne** s chybou `PRICE_MISMATCH`:

```js
  // Server si musí příplatek spočítat sám — nesmí věřit nule od klienta
  const cheat = await callFn('finalize-order', {
    body: {
      action: 'create',
      orderDetails: baseOrder({
        paymentMethod: 'Dobírka',
        paymentStatus: 'cod',
        paymentSurcharge: 0,
        finalTotal: 309,
        userId: null
      })
    }
  });
  check('Dobírku bez příplatku server odmítne', cheat.status >= 400,
    `HTTP ${cheat.status} — pokud projde, jde si příplatek odpustit`);
  if (cheat.json?.orderId) createdOrderIds.push(cheat.json.orderId);
```

---

## KROK 6 — Ověření

```bash
npm run build
```

Musí projít. Potom mi napiš:

1. Které soubory jsi změnil.
2. Jestli jsi našel další místa s částkou 25 Kč mimo `GdprVop.jsx`.
3. Připomeň mi, co musím udělat ručně (nasazení funkce `finalize-order`,
   aktualizace `.docx` souborů, kontrola FAQ v administraci).

---

## CO NEDĚLAT

- **Neupravuj zobrazení příplatku** v `OrderConfirmation.jsx`, `UserPortal.jsx`,
  `admin/OrdersTab.jsx`, `admin/InvoiceTemplate.jsx`, `send-order-email/index.ts`
  ani `generate-invoice-pdf/index.ts`. Všechna tato místa už příplatek zobrazují
  správně, jakmile je nenulový. Ověřil jsem to.
- Neměň `_shared/order-schema.ts` — normalizaci příplatku už umí.
- Neměň hranici dopravy zdarma (1 750 Kč).
- Nemaž a neupravuj `.docx` soubory v kořeni projektu — ty upravím sám ve Wordu.
- Nic nenasazuj na Supabase ani na produkci.
