# AUDIT — objednávkový proces NORTHVALE (košík → platba → e-mail → účet → administrace)

Datum: 3. 8. 2026
Rozsah: `Cart.jsx` → `CheckoutFlow.jsx` → `gp-webpay` → `finalize-order` → Storage JSON → `profiles.order_history` → `generate-invoice-pdf` → `send-order-email` → `UserPortal.jsx` / `admin/OrdersTab.jsx`

---

## 0. Jak systém dnes reálně funguje

**Neexistuje žádná tabulka `orders`.** Objednávka žije na dvou místech současně:

1. **Storage bucket `pohoda-orders`**, soubor `order_<ID>.json` — zdroj pravdy pro administraci
2. **`profiles.order_history`** (JSONB pole) — zdroj pravdy pro účet zákazníka

Tyto dva zápisy dělají **tři různé funkce s třemi různými tvary dat**:

| Zapisuje | Tvar klíčů | Co uloží |
|---|---|---|
| `finalize-order` (`create`) | snake_case, **whitelist** | zahodí `userId`, `paymentStatus`, `fulfillmentStatus`, `date`, `hasNoVat` |
| `save-order-json` (POST) | `...order` spread + normalizace | uloží všechno, camelCase i snake_case zamíchané |
| `OrdersTab` (admin akce) | camelCase i snake_case | `paymentStatus` + `platba`, `fulfillment_status` + `stav` |

**Tohle je kořen 80 % problémů.** Každá komponenta čte jiné klíče a data, která jedna cesta zapíše, druhá nevidí.

---

## P0 — KRITICKÉ (peníze / ztráta objednávek / bezpečnost)

### P0-1. Platba kartou se serverem vůbec neověřuje — lze objednat zdarma
`CheckoutFlow.jsx:437` předá `gpWebpayParams` do `submitOrder`. `App.jsx:1594` je **nikdy nepoužije**. Volá se `finalize-order` s `action: 'create'` a `paymentStatus: 'paid'`.

Akce `mark_paid` ve `finalize-order` (řádky 407–575), která podpis GP webpay ověřuje, **není nikdy zavolána — je to mrtvý kód.**

Ověření podpisu se dnes děje jen v prohlížeči (`gp-webpay/verify`), a server výsledku slepě věří. Kdokoli může poslat POST na `finalize-order` s anon klíčem a vytvořit uhrazenou objednávku bez zaplacení.

### P0-2. Refresh stránky po platbě zničí objednávku
`CheckoutFlow.jsx:300` — `callbackProcessedRef` je `useRef`, ten se při remountu resetuje. Když zákazník po platbě obnoví stránku (nebo se vrátí zpět) dřív, než proběhne `history.replaceState`:
- `gp-webpay/verify` projde znovu (podpis je pořád platný)
- `pending-order-data` už je smazané → `orderItems = cart`, který je prázdný
- vytvoří se objednávka se stejným ID a **prázdnou položkou**
- `upsert: true` ve `finalize-order:304` **přepíše původní JSON**

→ Objednávka je nenávratně zničená, zákazník má strženo.

### P0-3. Souběžné objednávky dostanou stejné číslo a přepíšou se
`finalize-order:33 getNextInvoiceNumber()` je čtení → +1 → zápis do `invoice_counter.json`. Bez zámku, bez atomicity.

Dva zákazníci v týž okamžik → stejné `orderId` → druhý `upload(upsert: true)` **smaže prvního**.

### P0-4. `pending-order-data` jen v localStorage → ztracená zaplacená objednávka
`CheckoutFlow.jsx:874`. Košík, ceny, slevy a fakturační údaje existují během platby **pouze v localStorage prohlížeče**.

Když se zákazník vrátí z 3D Secure v jiném prohlížeči / jiné kartě / Safari smaže storage (ITP) / vyprší session → **objednávka se nevytvoří vůbec**, přestože platba proběhla. Žádný server o ní neví.

### P0-5. Objednávka spadne na 500, když produkt v DB neexistuje
`finalize-order:212-217`:
```ts
const { data: dbProd } = await supabase.from('products').select('stock').eq('id', prodId).single();
const newStock = Math.max(0, (dbProd.stock || 0) - item.quantity);   // dbProd může být null
```
`.single()` vrátí `null` při 0 řádcích → `dbProd.stock` hodí TypeError → celý `create` skončí 500 → **objednávka se nevytvoří, i když je zaplacená kartou.** Stačí, že jste produkt smazal nebo mu změnil ID.

### P0-6. Únik osobních údajů všech zákazníků — bez přihlášení
`save-order-json/index.ts:27` — GET s `?customerEmail=` **nemá žádnou autentizaci** a matchuje takto:
```ts
if (itemEmail === queryEmail || (queryEmail && itemEmail.includes(queryEmail)))
```
`?customerEmail=a` vrátí prakticky **všechny objednávky** — jména, adresy, telefony, IČO, částky. GDPR incident.

### P0-7. Zápis a mazání objednávek bez oprávnění
- POST na `save-order-json` **nemá autorizaci vůbec** (`if (!authHeader && req.method !== "POST")`) → kdokoli může přepsat nebo podvrhnout jakoukoli objednávku.
- DELETE: kontrola role je uvnitř `if (user)`. Když je token neplatný, `user` je `null`, blok se přeskočí a **smazání proběhne**. Stačí libovolný `Bearer` řetězec.

---

## P1 — VYSOKÉ (přesně ty věci, které vás štvou)

### P1-1. „Moje objednávky" ukazují všechno jako nezaplacené
`finalize-order:259` skládá `storageData` z pevného whitelistu, ve kterém **`paymentStatus` ani `fulfillmentStatus` nejsou**.

`UserPortal.jsx:183` čte `o.payment_status || o.paymentStatus || o.platba || 'awaiting_payment'` → vždy spadne na default.

Navíc `UserPortal.jsx:290-298` dává **prioritu storage záznamu** před `profiles.order_history`, takže i když by profil měl správný stav, přepíše ho ten prázdný ze storage.

→ **Zaplacená karta se v účtu tváří jako „Čeká na platbu".**

### P1-2. Kartové objednávky se nikdy nedostanou do profilu zákazníka
Objekt objednávky v callbacku (`CheckoutFlow.jsx:400-435`) **nemá `userId`**. Má ho jen předredirectová verze (řádek 812), která se zahazuje, a `finalizeOrder` (řádek 970).

`finalize-order:312` zapisuje do `profiles` jen `if (order.userId)` → **u karty se nezapíše nikdy.**

### P1-3. Administrace ukazuje maximálně 100 objednávek
`save-order-json:216` → `list("", { limit: 100 })`. Bez stránkování, bez `processed/` složky. Jakmile máte 101. objednávku, starší z administrace mizí.

Řazení je `sortBy: name desc` nad řetězcem — tedy lexikografické, ne číselné/časové.

### P1-4. Administrace ukazuje zaplacené objednávky jako nezaplacené
`OrdersTab.jsx:2104` čte `details?.rawJson?.order?.paymentStatus` (camelCase). `finalize-order` tento klíč **nikdy nezapisuje** (viz P1-1). Nová objednávka je v adminu vždy „neuhrazeno", i platba kartou.

### P1-5. Faktura po potvrzení platby v adminu je prázdná / se nevygeneruje
`OrdersTab.jsx:736` volá `generate-invoice-pdf` s `updatedRaw.order`, což je **snake_case** objekt (`customer_name`, `customer_street`, `company_name`…).

`generate-invoice-pdf:105` očekává camelCase:
```ts
const customerNameLine = order.companyName ? order.companyName : order.customerName;  // undefined
drawText(customerNameLine, 320, 688, ...);   // pdf-lib hodí TypeError
```
→ Funkce spadne na 500. Faktura se nevygeneruje. Následný e-mail „Platba přijata" pak nemá přílohu a odkaz „Stáhnout fakturu" vede na 404.

**Tohle je přesně ten rozbitý flow s fakturami u převodů.**

### P1-6. Kliknutí na „Stáhnout fakturu" v účtu může přepsat správnou fakturu špatnou
`UserPortal.jsx:329` při chybějícím PDF volá `generate-invoice-pdf` s namapovaným objektem, kde položky mají jen `{name, quantity, price}` — **bez `no_vat`**, a chybí `discountCode`, `discountAmount`, `notes`, `date`.

`generate-invoice-pdf` ukládá s `upsert: true` → **přepíše korektní fakturu verzí bez slevy a bez režimu § 90.**

### P1-7. Na faktuře je vždy „UHRAZENO"
`generate-invoice-pdf:264` vypisuje `UHRAZENO` natvrdo, bez ohledu na stav platby. U bankovního převodu se faktura generuje hned při vytvoření objednávky (`finalize-order:343`) → zákazník dostane fakturu označenou jako uhrazená dřív, než zaplatí. Účetně vadné.

Navíc `Datum splatnosti` = `Datum vystavení` (řádek 142) — u převodu chybí splatnost.

### P1-8. Fonty faktury se stahují z GitHubu při každém cold startu
`generate-invoice-pdf:19` fetchuje `github.com/googlefonts/roboto-2/raw/...`, přestože `Roboto-Regular.ttf` a `Roboto-Bold.ttf` **leží přímo ve složce funkce a nepoužívají se**. Když GitHub odpoví 404 / rate-limit / timeout → generování faktur přestane fungovat. Vysvětluje nahodilé výpadky.

### P1-9. Mrtvá podmínka blokující e-maily
`finalize-order:335`:
```ts
if (order.paymentMethod !== "card" && order.paymentMethod !== "online platba")
```
Frontend posílá `"Online platební karta"` / `"Online Credit/Debit Card"`. Podmínka tedy **nikdy nezachytí kartu** — e-maily se posílají náhodou, ne záměrně. Jakmile někdo sjednotí názvy plateb, e-maily u karet přestanou chodit.

---

## P2 — STŘEDNÍ

| # | Problém | Kde |
|---|---|---|
| P2-1 | Sklad a `used_count` slevového kódu se odečítají i u nezaplacených objednávek; při stornu platby se nevrací | `finalize-order:169, 227` |
| P2-2 | Rezervované číslo objednávky se spálí, i když zákazník platbu nedokončí → díry v číselné řadě faktur | `CheckoutFlow.jsx:843` |
| P2-3 | Načtení objednávek v účtu stáhne až 400 souborů ze storage na jedno otevření stránky → pomalé, hrozí timeout | `save-order-json:28-88` |
| P2-4 | Administrace dělá 100 samostatných volání edge funkce na jedno načtení seznamu | `OrdersTab.jsx:217` |
| P2-5 | Odkaz na fakturu v e-mailu míří na `/object/public/invoices/...`, ale bucket je zakládán jako `public: false` → 404 kdykoli selže signed URL | `send-order-email:129`, `generate-invoice-pdf:352` |
| P2-6 | `creditApplied` (kredit v obchodě) se na faktuře nikde nezobrazuje → součet nesedí | `generate-invoice-pdf` |
| P2-7 | DPH počítáno paušálně 21 % pro vše kromě `no_vat`; žádná podpora 12 % | `generate-invoice-pdf:263` |
| P2-8 | `mark_paid` (pokud by se zapnul) rekonstruuje objednávku bez `discountCode`, `discountAmount`, `creditApplied`, `isCompany`, `ico`, `dic`, `pickupPointDetails` | `finalize-order:500-523` |
| P2-9 | `order-confirmation` nemá vlastní URL — po refreshi zákazník skončí na homepage a ztratí potvrzení | `App.jsx:145` |
| P2-10 | `alert()` po platbě je volán se 3 argumenty, ale `showToast` bere 2 — třetí se ignoruje | `CheckoutFlow.jsx:451` |
| P2-11 | Záložka „Faktury" v účtu nabízí PDF i u objednávek, které fakturu nemají a mít nemají (nezaplacený převod) | `UserPortal.jsx:1512` |
| P2-12 | Storage JSON neobsahuje `date` → admin i účet zobrazují datum z `created_at`, jinak než e-mail a faktura | `finalize-order:259` |

---

## Shrnutí — proč to působí „nestabilně"

Nejde o jednu chybu. Jde o to, že **objednávka nemá jedno místo, kde žije, a nemá jeden tvar.** Tři zapisovací cesty s odlišnými klíči a čtyři čtecí cesty s odlišnými fallbacky. Každá úprava na jednom místě rozbije jiné, protože nic to nedrží pohromadě — žádné schéma, žádná validace, žádná transakce.

Doporučené pořadí:

1. **Fáze 1 (nutná, bez přestavby):** sjednotit tvar dat, doplnit `userId` a `paymentStatus`, opravit ověření platby serverem, zavřít bezpečnostní díry, opravit generování faktur, stránkování v adminu.
2. **Fáze 2 (až bude Fáze 1 stabilní):** zavést skutečnou tabulku `orders` v Postgresu a storage JSON nechat jen jako export pro POHODU.

Prompt pro AntiGravity IDE, který řeší Fázi 1, je v souboru `PROMPT-antigravity-oprava-objednavek.md`.
