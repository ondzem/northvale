# PROMPT PRO ANTIGRAVITY IDE — kolo 2 (oprava regresí + obrázky)

> Zkopíruj celý text od čáry níže do AntiGravity IDE jako jeden prompt.

---

V předchozím kole jsi upravoval objednávkový proces (commity `fcd5516` až `173bc77`). Většina věcí je hotová správně, ale **v `src/components/CheckoutFlow.jsx` jsi zavedl tři chyby, kvůli kterým platba kartou vůbec nefunguje**, a zbývá pár nedodělků. Navíc je potřeba opravit nenačítání obrázků produktů v košíku a na pokladně.

Pravidla: nepřepisuj architekturu, každý krok = jeden commit `fix(orders): …`, po každém kroku vypiš změněné soubory. Nic nedeployuj. Když je něco nejasné, zastav se a zeptej se.

---

## KROK 1 — `src/components/CheckoutFlow.jsx`, callback z GP webpay (KRITICKÉ)

Blok `handleCallback` (cca řádky 300–375) je rozbitý. Tři konkrétní chyby:

**1a) Volání neexistující proměnné.** V `catch` bloku je `callbackProcessedRef.current = false;`, ale `const callbackProcessedRef = useRef(false)` jsi smazal. Při jakékoli chybě to hodí `ReferenceError`.

**1b) Volání neexistující funkce.** Na řádku ~350 je `showToast?.(...)`. Komponenta žádný prop `showToast` nemá — jmenuje se `alert` (viz signatura na řádku 7). `?.` proti nedeklarovanému identifikátoru nepomůže, `ReferenceError` nastane tak jako tak.

**1c) Úspěšná platba nedělá vůbec nic.** Podmínka je:
```js
const orderItems = pending.cart || cart || [];
if (!pendingStr || orderItems.length === 0) { ...dokončení objednávky... }
```
Tedy objednávka se dokončí **jen když chybí lokální data**. V běžném případě (data v localStorage jsou, košík není prázdný) se neprovede nic: žádné `submitOrder`, žádná navigace, košík se nevyprázdní, `pending-order-data` zůstane. Uživatel skončí navěky na obrazovce „ověřuji platbu" a objednávka zůstane na serveru ve stavu `awaiting_payment`.

**Přepiš celý blok takto:**

```js
if (!orderNumber || !prCode || !digest) return;

const lockKey = `gp-callback-${orderNumber}`;
if (localStorage.getItem(lockKey)) {
  window.history.replaceState({}, document.title, window.location.pathname);
  return;
}
localStorage.setItem(lockKey, Date.now().toString());

const gpWebpayParams = { MERCHANTNUMBER: merchantNumber, OPERATION: operation, ORDERNUMBER: orderNumber, MERORDERNUM: merOrderNum, PRCODE: prCode, SRCODE: srCode, RESULTTEXT: resultText, DIGEST: digest };

// Platba zamítnuta -> objednávku nechat v awaiting_payment, uvolnit zámek, informovat
if (String(prCode) !== '0') {
  localStorage.removeItem(lockKey);
  alert(lang === 'CZ'
    ? 'Platba nebyla dokončena. Zvolte prosím jiný způsob platby nebo to zkuste znovu.'
    : 'Payment was not completed. Please choose another payment method or try again.', 'error');
  window.history.replaceState({}, document.title, window.location.pathname);
  return;
}

setIsVerifying(true);
try {
  let pending = {};
  try { pending = JSON.parse(localStorage.getItem('pending-order-data') || '{}'); } catch (_e) {}

  // VŽDY jdeme přes server. Server si objednávku načte ze storage,
  // ověří podpis GP webpay a označí ji jako uhrazenou.
  await submitOrder(
    { id: orderNumber, userId: pending.userId || user?.id || null },
    0,
    { isCardPaid: true, orderId: orderNumber, gpWebpayParams }
  );

  localStorage.removeItem('pending-order-data');
  setActivePage('order-confirmation');
} catch (err) {
  console.error('Verifikace platby selhala:', err);
  localStorage.removeItem(lockKey);
  alert(lang === 'CZ'
    ? 'Nepodařilo se ověřit platbu přes GP webpay. Kontaktujte nás prosím na info@northvaletcg.eu.'
    : 'Could not verify payment via GP webpay. Please contact us at info@northvaletcg.eu.', 'error');
} finally {
  setIsVerifying(false);
  window.history.replaceState({}, document.title, window.location.pathname);
}
```

Pozn.: lokální `pending.cart` už k ničemu nepotřebujeme — objednávka je na serveru vytvořená ještě před redirectem na bránu. Nespoléhej na něj.

**1d)** Vyprázdnění košíku po úspěchu obstarává `submitOrder` v `App.jsx` — ověř, že ve větvi `isCardPaid` volá `setCart([])` a `setAppliedDiscount(null)`. Pokud ne, doplň to.

**1e)** Zámky `gp-callback-*` v localStorage se nikdy nemažou. Přidej při startu `CheckoutFlow` úklid klíčů starších než 24 hodin.

---

## KROK 2 — Sklad a slevový kód se strhávají před zaplacením

Protože se teď u karty volá `finalize-order` `action: 'create'` **před** redirectem na bránu, `create` odečte sklad (řádky ~199–259) a zvýší `used_count` slevového kódu (~262–290) **ještě než zákazník zaplatí**. Když platbu nedokončí, zboží zůstane blokované a kód spotřebovaný.

V `supabase/functions/finalize-order/index.ts`:

1. Do akce `create` přidej z body volitelný příznak `reserveOnly` (boolean). Když je `true`, **přeskoč odečet skladu i inkrement slevového kódu** a objednávku jen ulož se stavem `awaiting_payment`.
2. V akci `mark_paid` naopak odečet skladu a inkrement slevového kódu **proveď** — vytáhni tu logiku z `create` do sdílené funkce `applyStockAndDiscount(supabase, normalizedOrder)` a volej ji z obou míst.
3. Do JSONu objednávky zapisuj příznak `stock_applied: true` v okamžiku, kdy se sklad odečte, a v `applyStockAndDiscount` na začátku zkontroluj — pokud už je `true`, nedělej nic. Zamezí to dvojímu odečtu.
4. V `src/components/CheckoutFlow.jsx` v předredirectovém volání `create` (cca řádek 746) přidej do body `reserveOnly: true`.

---

## KROK 3 — Faktura po potvrzení platby zůstane označená „NEUHRAZENO"

`generate-invoice-pdf` má teď správně guard, který existující fakturu nepřegeneruje. Jenže u bankovního převodu se faktura vytvoří už při založení objednávky se stavem `NEUHRAZENO`, a `src/components/admin/OrdersTab.jsx` na řádku ~795 (`executeConfirmPayment`) volá:

```js
await supabase.functions.invoke('generate-invoice-pdf', { body: { order: updatedRaw.order } });
```

bez `overwrite`. Vrátí se cached PDF s razítkem NEUHRAZENO a to zákazník dostane e-mailem jako doklad o zaplacení.

Oprav na:
```js
body: { order: { ...updatedRaw.order, items: updatedRaw.items || updatedRaw.order.items || [] }, overwrite: true }
```

Projdi soubor a ověř, že **všude, kde se generuje faktura po změně stavu objednávky**, je `overwrite: true`. Naopak tam, kde jde jen o zobrazení už existující faktury, `overwrite` nepředávej.

---

## KROK 4 — Chybějící `no_vat` u kartových objednávek

V předredirectovém objektu `order` v `CheckoutFlow.jsx` (cca řádky 687–695) mapované položky **nemají `no_vat`** a objednávka nemá `hasNoVat`. U zboží v režimu § 90 se tak vygeneruje faktura s DPH 21 %.

Doplň do mapování položek `no_vat: !!(item.no_vat || item.product?.no_vat)` a k objednávce `hasNoVat: cart.some(item => !!(item.no_vat || item.product?.no_vat))` — stejně, jak to už je ve funkci `finalizeOrder` pro převod a dobírku.

---

## KROK 5 — Obrázky produktů se nenačítají v košíku ani na pokladně

**Příčina:** obrázky jsou v DB uložené jako base64 `data:` řetězce ve sloupci `products.image`. Funkce `cleanProductsForCache` v `src/services/products.js` (řádek ~113) je před uložením do cache **maže** (`clean.image = ''`), takže objekt `product` uložený v položce košíku obrázek neobsahuje. Košík se navíc serializuje do `localStorage` pod klíčem `northvale-cart`, takže po refreshi je obrázek pryč definitivně.

Košík i pokladna pak volají:
```js
getProductImageCached(item.product?.id || item.id, item.product?.image || item.image || '/Akce - NORTHVALE.webp')
```
`getProductImageCached` (products.js, řádek 797) je **synchronní a čte pouze localStorage / paměťovou cache — nikdy nic nedotahuje z databáze**. Když klíč `nv-img-<id>` v localStorage není (studená cache, jiné zařízení, vyčištěné úložiště, nebo vypadl kvůli limitu localStorage — base64 obrázky jsou velké), vrátí se fallback `/Akce - NORTHVALE.webp`. Proto se ukazuje špatná fotka.

`ProductCard.jsx` to dělá správně (řádky 26–40): synchronní cache pro okamžité vykreslení + **asynchronní `fetchProductImage(productId)`** v `useEffect`, který doplní obrázek z DB.

**Oprava:**

1. Vytvoř sdílenou komponentu `src/components/CartItemImage.jsx`:

```jsx
import { useState, useEffect } from 'react';
import { getProductImageCached, fetchProductImage } from '../services/products';

const FALLBACK = '/Akce - NORTHVALE.webp';

export default function CartItemImage({ item, alt = '', className = '', style = {} }) {
  const productId = item?.product?.id || item?.product_id || item?.id || null;
  const initial = getProductImageCached(productId, item?.product?.image || item?.image || '');
  const [src, setSrc] = useState(initial || FALLBACK);

  useEffect(() => {
    let cancelled = false;
    const cached = getProductImageCached(productId, item?.product?.image || item?.image || '');
    if (cached) {
      setSrc(cached);
      return;
    }
    if (!productId) return;
    fetchProductImage(productId)
      .then(dbImage => { if (!cancelled && dbImage) setSrc(dbImage); })
      .catch(err => console.error('Nepodařilo se načíst obrázek produktu:', productId, err));
    return () => { cancelled = true; };
  }, [productId]);

  return (
    <img
      src={src}
      alt={alt || item?.name || item?.productName || ''}
      className={className}
      style={style}
      loading="lazy"
      onError={(e) => { if (e.target.src !== window.location.origin + FALLBACK) e.target.src = FALLBACK; }}
    />
  );
}
```

2. Nahraď jí `<img>` na těchto dvou místech a **zachovej beze změny stávající `className` a `style`**, ať se nerozbije layout:
   - `src/components/Cart.jsx`, řádek ~248
   - `src/components/CheckoutFlow.jsx`, řádek ~2200

3. Projdi projekt na další výskyty `getProductImageCached` a použij komponentu i tam, kde se vykresluje obrázek položky objednávky/košíku (např. `Favorites.jsx`, `OrderConfirmation.jsx`, `UserPortal.jsx`), pokud tam takový `<img>` je.

4. **Nespoléhej na to, že `item.product` má obrázek.** Pro jistoty přidej do `App.jsx` v místě, kde se položka přidává do košíku (cca řádek 1572), do objektu položky i `productId: product.id`, aby se dal obrázek dohledat i po restore košíku z localStorage, kdy `item.product` může být ořezaný. `CartItemImage` pak čti `item.product?.id || item.productId || item.product_id || item.id`.

5. Zkontroluj `localStorage.setItem('northvale-cart', ...)` v `App.jsx` (řádek 726) — není v `try/catch`. Když `product` obsahuje base64 obrázek, může to spadnout na `QuotaExceededError` a **celý košík se pak neuloží**. Obal to do `try/catch` a před uložením z `item.product` odstraň klíče `image`, `back_image`, `backImage` a `additional_images`.

---

## KROK 6 — Drobnosti

**6a)** `supabase/functions/save-order-json/index.ts`, DELETE větev: obnova skladu teď čte `normalized.items`, ale u starších objednávek jsou položky jen v `jsonObj.items`, ne v `jsonObj.order.items`. Změň na `normalizeItems(jsonObj.items || normalized.items || [])`, jinak se u starých objednávek sklad nevrátí.

**6b)** Tamtéž, větev `withDetails=true`: stahuje všechny soubory objednávek sériově v jednom requestu. Při stovkách objednávek to překročí timeout edge funkce. Přidej paralelizaci po 10 souborech (`Promise.all` nad chunky) a volitelné parametry `?limit=` a `?offset=` s výchozím limitem 200. V `OrdersTab.jsx` pak načítej po stránkách.

**6c)** `supabase/functions/save-order-json/index.ts`, POST větev: `history.filter((h) => h.id !== normalizedOrder.id)` porovnává bez převodu na řetězec. Změň na `String(h.id) !== String(normalizedOrder.id)`.

**6d)** `supabase/functions/_shared/order-schema.ts`, řádek ~85: když se dopravce nedá odvodit, defaultuje se na `'DPD'`. Původní chování bylo `'Osobní odběr'`. Změň fallback na `'Osobní odběr'`, ať se do POHODY neposílá špatný dopravce.

---

## KROK 7 — Ověření (povinné)

Spusť `npm run build` a ujisti se, že projekt projde bez chyb. Potom otestuj a do `scratch/verify-order-flow-2.md` zapiš PASS/FAIL ke každému bodu:

1. Karta, přihlášený uživatel: objednávka projde, po návratu z brány se zobrazí potvrzení, košík je prázdný, v účtu je stav **Uhrazeno**, přišel e-mail s fakturou, faktura má správné jméno a adresu.
2. Karta, **zamítnutá platba** (PRCODE ≠ 0): zobrazí se hláška, objednávka zůstane `awaiting_payment`, sklad se **neodečetl**, slevový kód se **nespotřeboval**.
3. Karta, po úspěchu **obnov stránku (F5)**: nevznikne duplicita, nic se nepřepíše, žádná chyba v konzoli.
4. Bankovní převod: faktura při založení má **NEUHRAZENO** a splatnost +14 dní. Po kliknutí na „Potvrdit platbu" v adminu má **nová** faktura **UHRAZENO** a přijde e-mailem jako příloha.
5. Dobírka: na faktuře je **K ÚHRADĚ PŘI PŘEVZETÍ**.
6. Objednávka se zbožím v režimu § 90 přes kartu: na faktuře je řádek § 90, ne 21 % DPH.
7. Obrázky: vlož zboží do košíku, **vyčisti localStorage kromě `northvale-cart`**, obnov stránku — v košíku i na pokladně se načte správná fotka produktu, ne zástupný obrázek.
8. Obrázky u variant (singles): v košíku se ukazuje fotka nadřazeného produktu, ne fallback.
9. Konzole prohlížeče při celém průchodu košík → platba → potvrzení: **žádný `ReferenceError` ani `undefined`**.

U každého FAIL napiš konkrétní příčinu. Netvrď, že něco funguje, když jsi to nespustil.

---

## Co NEDĚLEJ

- Nezakládej tabulku `orders`, nemigruj data.
- Neměň design ani texty e-mailů a faktur nad rámec zadaného.
- Nesahej na `pohoda-connector`, `gls-labels`, `dpd-labels`, `send-newsletter`.
- Nepřidávej npm závislosti.
- Neměň `_shared/order-schema.ts` nad rámec bodu 6d.
