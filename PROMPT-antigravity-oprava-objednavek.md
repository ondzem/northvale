# PROMPT PRO ANTIGRAVITY IDE

> Zkopíruj celý text níže (od čáry) do AntiGravity IDE jako jeden prompt.

---

Jsi senior full-stack vývojář. Pracuješ v repozitáři NORTHVALE (React 19 + Vite + Supabase Edge Functions v Deno). Máš opravit objednávkový proces od košíku po e-mail. **Neděláš přepis architektury.** Objednávky zůstávají uložené jako JSON v Storage bucketu `pohoda-orders` + kopie v `profiles.order_history`. Opravuješ pouze konzistenci, bezpečnost a konkrétní chyby vyjmenované níže.

## Závazná pravidla

1. **Nepřejmenovávej existující klíče ani nemaž zpětnou kompatibilitu.** Kde přidáváš nový klíč, přidej ho VEDLE starého a při čtení podporuj oba.
2. Každý krok proveď jako samostatný commit s popisem `fix(orders): …`.
3. Po každém kroku vypiš, které soubory jsi změnil a proč.
4. Nic nedeployuj. Jen změň kód a na konci vypiš seznam příkazů k deployi.
5. Pokud narazíš na nejasnost, **zastav se a zeptej se** — nevymýšlej si.

---

## KROK 1 — Jednotný tvar objednávky (základ všeho ostatního)

Vytvoř nový soubor `supabase/functions/_shared/order-schema.ts` s funkcí:

```ts
export function normalizeOrder(input: any): Record<string, any>
```

Funkce vezme jakýkoli tvar objednávky (camelCase i snake_case) a vrátí **jeden kanonický objekt**, který obsahuje POVINNĚ vždy tyto klíče (i když prázdné):

```
id, created_at, date,
user_id,
customer_name, customer_email, customer_phone,
customer_street, customer_city, customer_zip,
is_company, company_name, ico, dic,
payment_method, payment_status, fulfillment_status,
shipping_method, carrier, shipping_cost, payment_surcharge,
subtotal, discount_code, discount_amount, credit_applied, final_total,
has_no_vat, notes, pickup_point_details
```

Pravidla:
- `payment_status` ∈ `'awaiting_payment' | 'paid' | 'cod'` — jiné hodnoty se mapují (`'uhrazeno'`→`paid`, `'neuhrazeno'`→`awaiting_payment`, `'dobírka'`→`cod`).
- `fulfillment_status` ∈ `'pending' | 'shipped' | 'completed' | 'cancelled'` (`'vyřízeno'`→`completed`, `'odesláno'`→`shipped`, `'stornováno'`→`cancelled`).
- `has_no_vat` = true, pokud kterákoli položka má `no_vat`/`noVat`, nebo pokud to říká sám objekt.
- Zachovej **navíc** i všechny existující extra klíče, které v inputu byly (např. `dpd_parcel_number`, `gls_parcel_id`, `platba`, `stav`) — nesmíš je zahodit.
- Pro zpětnou kompatibilitu zapisuj vedle sebe i `paymentStatus`, `platba`, `fulfillmentStatus`, `fulfillment_status`, `stav` se stejnou hodnotou.

Přidej druhou funkci `normalizeItems(items)`, která u každé položky zaručí `{ name, product_id, variant_id, quantity, price, no_vat }`.

**Tuto funkci pak použij ve VŠECH místech, kde se objednávka zapisuje do storage.** Žádný jiný zápis do `order_*.json` nesmí zůstat.

---

## KROK 2 — `supabase/functions/finalize-order/index.ts`

### 2.1 Přestaň zahazovat data
V akci `create` (cca řádek 259) nahraď ruční whitelist `storageData` voláním `normalizeOrder(order)` + `normalizeItems(order.items)`. Do storage se musí dostat zejména **`user_id`, `payment_status`, `fulfillment_status`, `date`, `has_no_vat`**, které tam dnes chybí.

### 2.2 Oprav pád při neexistujícím produktu
Řádky ~212–222: `.single()` vrací `null`, ale kód čte `dbProd.stock` bez kontroly. Změň na `.maybeSingle()` a **celé odečítání skladu obal do `try/catch` per položku**. Selhání skladu **nesmí nikdy shodit vytvoření objednávky** — jen zaloguj `console.error`.

### 2.3 Atomické číslo objednávky (odstraň duplicitní ID)
`getNextInvoiceNumber()` je race condition — dva souběžné nákupy dostanou stejné číslo a druhý JSON přepíše první.

Vytvoř SQL migraci `supabase/migrations/<timestamp>_order_counter.sql`:

```sql
create table if not exists public.order_counter (
  id text primary key,
  next_number bigint not null
);

insert into public.order_counter (id, next_number)
values ('invoice', 260100010)
on conflict (id) do nothing;

create or replace function public.next_order_number()
returns bigint
language plpgsql
security definer
as $$
declare n bigint;
begin
  update public.order_counter
     set next_number = next_number + 1
   where id = 'invoice'
  returning next_number - 1 into n;
  return n;
end;
$$;

revoke all on function public.next_order_number() from public, anon, authenticated;
```

`getNextInvoiceNumber()` přepiš na `supabase.rpc('next_order_number')`. Při startu jednorázově načti aktuální hodnotu z `invoice_counter.json` a nastav jí `order_counter.next_number`, aby řada navázala. Soubor `invoice_counter.json` po migraci už nepoužívej k inkrementaci (můžeš ho nechat ležet).

### 2.4 Ochrana proti přepsání existující objednávky
Před `upload(...)` v akci `create` zkontroluj, jestli `order_<id>.json` už existuje. Pokud ano **a nová objednávka má prázdné `items`**, zápis **odmítni** a vrať `409` s chybou `"Order already exists"`. To zablokuje zničení objednávky při refreshi (viz KROK 4).

### 2.5 Zapoj `mark_paid` a ověřuj platbu na serveru
Akce `mark_paid` (řádky 407–575) je dnes mrtvý kód. Uprav ji tak, aby:
- ověřila podpis GP webpay (to už umí — nech beze změny),
- načetla `order_<id>.json`,
- doplnila do něj `payment_status: 'paid'` (přes `normalizeOrder`) a **uložila zpět**,
- teprve pak spustila `generate-invoice-pdf` a `send-order-email`,
- při rekonstrukci objednávky **doplnila chybějící pole**: `discount_code`, `discount_amount`, `credit_applied`, `subtotal`, `is_company`, `company_name`, `ico`, `dic`, `pickup_point_details`, `has_no_vat` (dnes se ztrácejí),
- brala `user_id` ze storage JSONu (po kroku 2.1 tam už bude) a aktualizovala `profiles.order_history`.

### 2.6 Oprav mrtvou podmínku u e-mailů
Řádek ~335: `order.paymentMethod !== "card" && order.paymentMethod !== "online platba"` nikdy nezachytí reálné hodnoty `"Online platební karta"` / `"Online Credit/Debit Card"`.

Nahraď kontrolou nad normalizovaným stavem:
```ts
const isCardPayment = normalized.payment_method.toLowerCase().includes('kart')
  || normalized.payment_method.toLowerCase().includes('card')
  || normalized.payment_method.toLowerCase().includes('webpay');
```
a e-maily + fakturu v akci `create` posílej **jen pro nekartové platby**. U karty to obstará `mark_paid`.

---

## KROK 3 — `supabase/functions/save-order-json/index.ts` (bezpečnost)

### 3.1 Zavři veřejný únik zákaznických dat
GET s `?customerEmail=` je dnes bez autentizace a používá `itemEmail.includes(queryEmail)`, takže `?customerEmail=a` vrátí objednávky všech zákazníků.

Oprav takto:
- **Vyžaduj platný JWT.** Ověř `supabase.auth.getUser(token)`. Bez platného uživatele vrať `401`.
- **Ignoruj `customerEmail` z query úplně** a filtruj vždy podle e-mailu z ověřeného tokenu (`user.email`).
- Porovnávej **jen přesnou shodou** (`===` po `toLowerCase().trim()`), nikdy `includes`.

### 3.2 Zabezpeč POST
Dnes `if (!authHeader && req.method !== "POST")` nechává POST úplně otevřený → kdokoli přepíše libovolnou objednávku.

Vyžaduj u POSTu platný JWT a povol ho pouze pokud:
- volající má `profiles.role = 'admin'`, **nebo**
- volání přišlo se `SUPABASE_SERVICE_ROLE_KEY` (interní volání z jiné edge funkce).

### 3.3 Oprav DELETE
Kontrola role je uvnitř `if (user)`. Při neplatném tokenu je `user === null`, blok se přeskočí a mazání proběhne.

Přepiš na: `if (!user) return 401;` a teprve potom `if (profile?.role !== 'admin') return 403;`.

### 3.4 Stránkování seznamu
`list("", { limit: 100 })` → administrace vidí max 100 objednávek. Uděl smyčku přes `offset` po 1000 a vrať všechny soubory. Totéž u větve `customerEmail` (dnes `limit: 200`).

### 3.5 Sjednoť zápis
POST musí ukládat přes `normalizeOrder` z KROKu 1, ne přes vlastní `normalizedOrder`. Zachovej ale `...order` spread, aby se nestratily extra klíče (`dpd_parcel_number` atd.).

---

## KROK 4 — `src/components/CheckoutFlow.jsx`

### 4.1 Doplň `userId` do kartové objednávky
V callbackovém handleru (objekt `order` cca řádek 400–435) **chybí `userId`**. Kvůli tomu se kartové objednávky nikdy nezapíšou do `profiles.order_history` a v účtu je zákazník nevidí.

Přidej:
```js
userId: user?.id || null,
paymentStatus: 'paid',
fulfillmentStatus: 'pending',
hasNoVat: orderItems.some(i => !!(i.no_vat || i.product?.no_vat)),
```
Zároveň ulož `userId` i do `pending-order-data` (řádek ~874) a při obnově z něj čti přednostně.

### 4.2 Ochrana proti dvojímu zpracování callbacku
`callbackProcessedRef` je `useRef` — po refreshi se resetuje a celý callback proběhne znovu s prázdným košíkem, což přepíše správnou objednávku prázdnou.

Nahraď to trvalým zámkem v `sessionStorage` **plus** `localStorage`:
```js
const lockKey = `gp-callback-${orderNumber}`;
if (localStorage.getItem(lockKey)) return;
localStorage.setItem(lockKey, Date.now().toString());
```
A **odmítni pokračovat, pokud `pending-order-data` chybí nebo má prázdný `cart`** — v tom případě zobraz zprávu „Platba proběhla, objednávku dokončujeme" a zavolej `finalize-order` s `action: 'mark_paid'` (ta si data načte ze serveru), místo `create`.

### 4.3 Volej `mark_paid`, ne `create`
V `submitOrder` volání (řádek ~437) předáváš `gpWebpayParams`, ale `App.jsx` je zahazuje. Uprav tok tak, aby se u karty volalo:
1. `finalize-order` `action: 'create'` **před** redirectem na platební bránu (objednávka se stavem `awaiting_payment`, sklad se ještě neodečítá),
2. `finalize-order` `action: 'mark_paid'` s `gpWebpayParams` po návratu.

Tím zmizí P0-1 (server platbu skutečně ověří), P0-2 (refresh už nemá co přepsat) i P0-4 (data jsou na serveru, ne v localStorage).

Pokud tato změna toku vypadá rizikově, **zastav se a zeptej se mě, než ji uděláš.**

---

## KROK 5 — `src/App.jsx`

V `submitOrder` (řádek 1594) přestaň ignorovat `options.gpWebpayParams`. Když je `options.isCardPaid === true`, volej `finalize-order` s `action: 'mark_paid'`, `orderId` a `gpWebpayParams`. Akci `create` použij pouze pro převod a dobírku.

---

## KROK 6 — `supabase/functions/generate-invoice-pdf/index.ts`

### 6.1 Přijmi oba tvary dat
Hned na začátku prožeň vstup přes `normalizeOrder` a čti výhradně kanonické klíče. **Dnes funkce spadne na `TypeError`, když jí admin pošle snake_case objekt** (`OrdersTab.jsx:736`) — proto po potvrzení platby u převodu faktura vůbec nevznikne.

Navíc ošetři `drawText(undefined)` — udělej wrapper `safeText(v)` vracející `String(v ?? '')`.

### 6.2 Použij lokální fonty
Řádky 16–32 stahují Roboto z `github.com/googlefonts/roboto-2/raw/...` při každém cold startu, přestože `Roboto-Regular.ttf` a `Roboto-Bold.ttf` **leží přímo ve složce funkce**. Načti je přes `Deno.readFile(new URL('./Roboto-Regular.ttf', import.meta.url))` a fetch úplně smaž.

### 6.3 „UHRAZENO" jen když je uhrazeno
Řádek ~264 tiskne `UHRAZENO` natvrdo. Rozliš podle `payment_status`:
- `paid` → `UHRAZENO` (zeleně)
- `cod` → `K ÚHRADĚ PŘI PŘEVZETÍ`
- `awaiting_payment` → `NEUHRAZENO` (červeně) + `Datum splatnosti` = datum vystavení **+ 14 dní**

### 6.4 Doplň kredit a nepřepisuj hotové faktury
- Přidej řádek `Uplatněný kredit` se zápornou částkou, pokud `credit_applied > 0` — dnes chybí a součet nesedí.
- Přidej do vstupu volitelný parametr `overwrite` (default `false`). Když faktura už ve storage existuje a `overwrite !== true`, **negeneruj znovu** a vrať existující cestu. Tím zabráníš tomu, aby kliknutí na „Stáhnout fakturu" v účtu přepsalo správnou fakturu verzí bez slevy a bez § 90.

---

## KROK 7 — `src/components/UserPortal.jsx`

### 7.1 Priorita zdrojů při slučování
Řádky 290–298: storage záznam dnes přebíjí `profiles.order_history`, přestože storage (do KROKu 2.1) nemá stav platby. Změň slučování na **merge po klíčích**, kde vyhrává neprázdná hodnota, a `payment_status` / `fulfillment_status` ber z toho zdroje, který je má vyplněné.

### 7.2 Nenabízej fakturu tam, kde neexistuje
Záložka „Faktury" (řádek ~1512) i tlačítko u objednávky (řádek ~1498) nabízejí PDF u nezaplacených převodů. Zobrazuj tlačítko **jen když `payment_status === 'paid'` nebo `cod`**. Jinak vypiš „Faktura bude vystavena po uhrazení".

### 7.3 Negeneruj fakturu z klienta
Řádek 329 — odstraň fallback, který volá `generate-invoice-pdf` s ochuzeným objektem. Když signed URL selže, zobraz chybu a nabídni kontakt. (S KROKem 6.4 je to už neškodné, ale je to zbytečná díra.)

### 7.4 `save-order-json` volej bez `customerEmail`
Po KROKu 3.1 už se e-mail bere z tokenu. Uprav volání na řádku 170 tak, aby posílalo jen `?t=`, a ověř, že `supabase.functions.invoke` přiloží access token přihlášeného uživatele.

---

## KROK 8 — `src/components/admin/OrdersTab.jsx`

### 8.1 Posílej faktuře správný tvar
Řádek ~736: `generate-invoice-pdf` dostává snake_case `updatedRaw.order`. Po KROKu 6.1 to sice projde, ale i tak předávej **kompletní objekt včetně `items`, `discount_code`, `discount_amount`, `credit_applied`, `has_no_vat`** — dnes se položky vůbec neposílají a faktura by byla prázdná.

### 8.2 Čti stav přes jeden helper
Řádky 2104, 2337, 2348, 2402 čtou stav pěti různými způsoby. Vytvoř lokální helpery `getPaymentStatus(order)` a `getFulfillmentStatus(order)` používající stejnou mapovací logiku jako `normalizeOrder`, a nahraď jimi všechna místa.

### 8.3 Načítej seznam efektivně
Řádek 217 dělá jedno volání edge funkce **na každou objednávku** (až 100 requestů na jedno otevření). Přidej do `save-order-json` GET parametr `?withDetails=true`, který vrátí seznam **včetně obsahu** v jedné odpovědi (batchově, po 50), a v adminu použij jej.

---

## KROK 9 — Ověření (povinné, neodfláknout)

Po dokončení napiš do `scratch/verify-order-flow.md` výsledky těchto testů a **spusť je proti staging projektu, ne produkci**:

1. Objednávka převodem jako **přihlášený** uživatel → zkontroluj: `order_*.json` obsahuje `user_id` a `payment_status: 'awaiting_payment'`; objednávka je v `profiles.order_history`; v účtu se zobrazí; v adminu se zobrazí jako neuhrazená; přišel potvrzovací e-mail; faktura **nevznikla**.
2. Admin klikne „Potvrdit platbu" → faktura se vygeneruje s korektním jménem a adresou; e-mail „Platba přijata" má PDF přílohu; v účtu se stav změní na „Uhrazeno".
3. Objednávka dobírkou jako **nepřihlášený** → objednávka existuje ve storage, e-mail dorazil, v adminu je vidět.
4. Objednávka kartou → po návratu z brány je stav `paid`, faktura existuje, e-maily dorazily, objednávka je v účtu; **pak stránku obnov (F5)** a ověř, že se objednávka nezduplikovala ani nepřepsala.
5. Dvě objednávky spuštěné současně → **různá čísla objednávek**.
6. Objednávka s produktem, který mezitím smažeš z `products` → objednávka se i tak vytvoří (jen se zaloguje chyba skladu).
7. `curl` na `save-order-json?customerEmail=a` bez tokenu → musí vrátit **401**.
8. `curl` POST na `save-order-json` bez tokenu → musí vrátit **401**.
9. Objednávka se slevovým kódem → sleva je na faktuře, `used_count` se zvýšil o 1 (ne o 2).
10. Objednávka s položkou `no_vat` → na faktuře je řádek `§ 90` a v e-mailu odpovídající upozornění.

Ke každému bodu napiš **PASS/FAIL** a u FAIL konkrétní příčinu. Nepiš „mělo by fungovat" — otestuj to.

---

## Co NEDĚLEJ

- Nezakládej tabulku `orders` a nemigruj do ní data. To je samostatná fáze, kterou zadám později.
- Neměň design ani texty e-mailů.
- Nesahej na `pohoda-connector`, `gls-labels`, `dpd-labels`, `send-newsletter`.
- Neměň routing v `App.jsx` kromě toho, co je v KROKu 5.
- Nepřidávej nové npm závislosti.
