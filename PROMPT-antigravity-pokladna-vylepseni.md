# PROMPT PRO ANTIGRAVITY IDE — našeptávač adres + zapamatování údajů v pokladně

> Zkopíruj celý text od čáry níže.

---

Přidej do pokladny (`src/components/CheckoutFlow.jsx`) dvě funkce, které zákazníkovi
ušetří vyplňování. Obojí musí fungovat i pro nepřihlášené zákazníky.

Pravidla: každou funkci uděláš jako samostatný commit, po každém kroku vypíšeš změněné
soubory, na konci spustíš `npm run build`. Nic nenasazuj. Když si nejsi jistý,
zastav se a zeptej se — nevymýšlej si.

---

# FUNKCE 1 — Našeptávač adres

Zákazník napíše `Hudso` a vybere si z nabídky `Hudsonova 280, Praha 4`. Tím se mu
vyplní ulice s číslem, město i PSČ najednou.

## 1.1 Proč přes serverovou funkci a ne přímo z prohlížeče

Použijeme **Mapy.com REST API** (Seznam) — má nejlepší data pro české adresy včetně PSČ
a čísel popisných, zvládá i zahraniční adresy. Zdarma je 250 000 dotazů měsíčně,
což je pro nás mnohonásobně víc, než kdy spotřebujeme.

API klíč **nesmí skončit v kódu webu** — každý návštěvník by si ho mohl vytáhnout
a čerpat z něj. Proto uděláme malou serverovou funkci, která dotaz přepošle
a klíč si nechá u sebe.

## 1.2 Nová edge funkce `supabase/functions/address-suggest/index.ts`

Vytvoř ji podle vzoru ostatních funkcí v projektu (CORS hlavičky, `serve`, OPTIONS větev).

Chování:

- Přijímá `GET` s parametry `?q=<dotaz>&lang=cs|en&country=cz`
- Klíč čte z `Deno.env.get("MAPY_API_KEY")`. Když chybí, vrať `503`
  a jasnou hlášku, ať je poznat, že jen není nastavený klíč.
- **Validace vstupu** (stejně jako u ostatních veřejných funkcí, které jsme zabezpečovali):
  - `q` ořízni na 120 znaků, při délce pod 2 znaky vrať prázdný seznam bez volání API
  - `lang` povol jen `cs` a `en`, jinak `cs`
  - `country` povol jen dvoupísmenné kódy, jinak `cz`
- Zavolá Mapy.com Suggest API a vrátí **zjednodušený seznam**, ne surovou odpověď:

```ts
{ suggestions: [
  { label: "Hudsonova 280/6, Praha 4", street: "Hudsonova 280/6", city: "Praha 4", zip: "14200", country: "Česko" }
] }
```

- Omez počet výsledků na 6.
- Funkce je **veřejná** (potřebuje ji i nepřihlášený zákazník) — autorizaci nepřidávej,
  ale ošetři chyby tak, aby se ven nedostal text chyby od Mapy.com.

**Přesné názvy parametrů a strukturu odpovědi si najdi v oficiální dokumentaci:**
https://developer.mapy.com/rest-api-mapy-cz/ — sekce Suggest.
Zajímá tě zejména `regionalStructure` v odpovědi, odtud se dá vytáhnout město a PSČ.
**Neháduj názvy polí** — když si nebudeš jistý, zastav se a napiš mi, co v dokumentaci vidíš.

## 1.3 Nová komponenta `src/components/AddressAutocomplete.jsx`

Řízený input s rozbalovací nabídkou. Požadavky:

- Props: `value`, `onChange(text)`, `onSelect({ street, city, zip, country })`, `placeholder`,
  `lang`, `id`, `autoComplete`, `hasError`
- **Debounce 250 ms** — neposílat dotaz při každém písmenu
- Zrušit předchozí požadavek při novém (`AbortController`), ať se nepřepisují výsledky
- Nabídka se otevře od 2 znaků
- **Ovládání klávesnicí:** šipka dolů/nahoru pro pohyb, Enter pro výběr, Esc pro zavření
- Kliknutí mimo nabídku ji zavře
- **Zákazník musí být schopen adresu napsat i ručně** — z nabídky si vybírat nemusí,
  nikdy ho k výběru nenuť a nikdy mu nepřepisuj, co napsal, dokud si sám nevybere
- Když API selže nebo klíč není nastavený, komponenta se chová jako obyčejný input
  a **nic zákazníkovi nehlásí** — nesmí to zablokovat objednávku
- Přístupnost: `role="listbox"`, `role="option"`, `aria-expanded`, `aria-activedescendant`
- Vzhled převezmi z okolních polí (třída `pof-field`, stejné barvy a rámečky).
  Nabídku umísti absolutně pod input, `z-index` dostatečně vysoko, ať ji nepřekryje
  souhrn objednávky.

## 1.4 Zapojení v `CheckoutFlow.jsx`

Nahraď `<input id="input-street">` (cca řádek 1893) komponentou `<AddressAutocomplete>`.
Pole **Město** a **PSČ** nech tak, jak jsou — jen se doplní při výběru z nabídky.

Při výběru:

```js
onSelect={({ street: s, city: c, zip: z }) => {
  if (s) setStreet(s);
  if (c) setCity(c);
  if (z) setZip(z);
  setFormErrors(prev => ({ ...prev, street: null, city: null, zip: null }));
}}
```

**Pozor na formát PSČ.** Ve `finalizeOrder` se PSČ formátuje jako `534 01`
(`cleanedZip.slice(0,3) + ' ' + slice(3)`). Z API může přijít `14200` i `142 00`.
V komponentě PSČ **normalizuj na tvar bez mezery** a formátování nech na stávající logice,
ať se nestane, že vznikne `142 00 ` nebo `1420 0`.

## 1.5 Co musím udělat já

Napiš mi na konci, že si musím:
1. Založit projekt na https://developer.mapy.com/account/projects a vytvořit API klíč
2. Nastavit ho v Supabase: Dashboard → Edge Functions → Secrets → `MAPY_API_KEY`
3. Nasadit funkci: `supabase functions deploy address-suggest --project-ref bfxzhggjpiyqfolqpxzz`

---

# FUNKCE 2 — Zapamatování rozepsané objednávky

Zákazník vyplní údaje, vzpomene si na další zboží, odejde do katalogu a vrátí se —
a musí vyplňovat znovu. To spravíme.

## 2.1 Co ukládat

Do `localStorage` pod klíč `northvale-checkout-draft`:

```
name, email, phone, street, city, zip,
isCompany, companyName, ico, dic,
shipping, pickupPoint, pickupPointDetails, payment, notes
```

**Neukládej** `creditInput`, `appliedCredit` ani `promoInput` — kredit a slevový kód
se ověřují proti databázi a stará hodnota by mohla mást.

Struktura: `{ savedAt: <timestamp>, data: { …pole… } }`

## 2.2 Ukládání

- Ukládej **s debounce 500 ms**, ne při každém stisku klávesy
- Celé v `try/catch` — když je localStorage plný nebo zakázaný, jen to tiše přeskoč
  (v `App.jsx` u ukládání košíku je to udělané stejně, drž se toho vzoru)

## 2.3 Obnovení — tady pozor, je to jediné riziko celé úpravy

V komponentě už je `useEffect` závislý na `[user]` (cca řádek 202), který předvyplňuje
formulář z profilu přihlášeného uživatele. `user` se načítá asynchronně, takže **doběhne
až po obnovení konceptu a přepsal by ho** hodnotami z profilu.

Vyřeš to takto:

1. Koncept obnov **v inicializaci stavů** (`useState(() => …)`), ne v `useEffect`.
   Tím je tam dřív, než cokoli jiného doběhne.
2. Uprav stávající `useEffect [user]` tak, aby **vyplňoval jen prázdná pole**:

```js
if (user.billingStreet && !street) setStreet(user.billingStreet);
```

a totéž u všech ostatních polí. Co si zákazník napsal sám, se nesmí přepsat.

3. Koncept starší než **7 dní** zahoď a klíč smaž.

## 2.4 Vymazání konceptu

Smaž `northvale-checkout-draft`:

- po úspěšném dokončení objednávky (v `App.jsx` ve funkci `submitOrder`, na stejném
  místě, kde se volá `setCart([])` — v obou větvích, kartové i nekartové)
- při odhlášení (v `App.jsx` tam, kde se maže `northvale-cart`, cca řádek 456)

## 2.5 Ať zákazník ví, co se stalo

Když se koncept obnoví a je v něm aspoň vyplněné jméno nebo e-mail, zobraz nad formulářem
nenápadnou lištu:

> Vyplnili jsme za vás údaje z rozepsané objednávky. **Vymazat**

Tlačítko *Vymazat* smaže koncept a vyprázdní pole. Bez toho zákazník nemá jak se
cizích nebo starých údajů zbavit — třeba na sdíleném počítači.

---

# OVĚŘENÍ

Spusť `npm run build` — musí projít.

Potom otestuj a napiš mi PASS/FAIL:

**Našeptávač**
1. Napsat `Hudso` → objeví se nabídka do 1 sekundy
2. Vybrat položku → vyplní se ulice, město i PSČ
3. Objednávku dokončit → v e-mailu a na faktuře sedí adresa i PSČ
4. Adresu napsat **celou ručně bez výběru z nabídky** → objednávka projde normálně
5. Dočasně smazat `MAPY_API_KEY` → pole funguje jako obyčejný input, nikde žádná chyba
6. Ovládání klávesnicí: šipky, Enter, Esc

**Zapamatování**
7. Vyplnit údaje → odejít do katalogu → přidat zboží → zpět do pokladny → údaje jsou vyplněné
8. Totéž s obnovením stránky (F5)
9. Přihlášený zákazník: přepsat adresu z profilu na jinou → odejít → vrátit se →
   je tam ta **přepsaná**, ne ta z profilu
10. Dokončit objednávku → nová objednávka má prázdný formulář
11. Odhlásit se → formulář je prázdný
12. Kliknout na *Vymazat* → pole se vyprázdní

---

# CO NEDĚLAT

- Neměň výpočet cen, dopravy ani dobírkového příplatku.
- Neměň nic v `supabase/functions/finalize-order/`.
- Nesahej na `pending-order-data` ani `northvale-cart` — to jsou jiné mechanismy.
- Neukládej koncept na server, jen do prohlížeče zákazníka.
- Nepřidávej npm balíčky. Našeptávač napiš ručně, žádná knihovna.
- Nenuť zákazníka vybrat si z nabídky. Ruční vyplnění musí vždy projít.
