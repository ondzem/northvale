# PROMPT PRO ANTIGRAVITY IDE — kolo 4: obrázky v košíku a na pokladně

> Zkopíruj text od čáry níže.

---

Oprav zobrazování obrázků produktů v košíku (`src/components/Cart.jsx`) a v souhrnu objednávky na pokladně (`src/components/CheckoutFlow.jsx`). Jsou dva nezávislé problémy — průhlednost a mizející fotka po refreshi. Řeš oba.

Pravidla: každý krok = jeden commit, po každém kroku vypiš změněné soubory, na konci spusť `npm run build`. Nic nedeployuj.

---

## PROBLÉM A — obrázek není na průhledném pozadí

Samotné soubory transparentní jsou (admin je ukládá jako WebP s alfa kanálem, `ProductsTab.jsx` řádek ~1495 dělá `clearRect`). Průhlednost zabíjí **CSS kontejneru**, ne obrázek.

### A1) Košík — `src/index.css`, řádek ~5960

```css
.ckf-thumb {
  width: 72px;
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(32, 32, 52, 0.3);   /* ← tmavý box za obrázkem */
  border: 1px solid rgba(255, 255, 255, 0.08);  /* ← rámeček */
  border-radius: var(--radius-sm);
  padding: 6px;
  overflow: hidden;
  position: relative;
}
```

Uprav na:

```css
.ckf-thumb {
  width: 72px;
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 0;
  padding: 0;
  overflow: visible;
  position: relative;
}

.ckf-thumb img {
  max-height: 100%;
  max-width: 100%;
  width: auto;
  height: auto;
  object-fit: contain;
  background: transparent;
}
```

### A2) Pokladna — `src/components/CheckoutFlow.jsx`, řádek ~1357

```css
.pof-li-thumb {
  width: 48px;
  height: 67px;
  flex-shrink: 0;
  border-radius: 4px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.3);
  position: relative;
}
```

Uprav na:

```css
.pof-li-thumb {
  width: 48px;
  height: 67px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 0;
  overflow: visible;
  position: relative;
}
.pof-li-thumb img {
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  object-fit: contain;
  background: transparent;
}
```

### A3) `objectFit: 'cover'` ořezává obrázek

V `CheckoutFlow.jsx` na řádku ~2214 má `<CartItemImage>` inline styl `objectFit: 'cover'`. To obrázek **ořízne**, aby vyplnil rámeček 48×67 — proto na pokladně vypadá jako jiná fotka než v košíku. Změň inline styl na:

```jsx
style={{
  width: 'auto',
  height: '100%',
  maxWidth: '100%',
  maxHeight: '100%',
  objectFit: 'contain',
  background: 'transparent'
}}
```

V `Cart.jsx` na řádku ~250 nahraď pevné `width: '72px', height: '100px'` za `maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto', objectFit: 'contain'`.

---

## PROBLÉM B — po refreshi se ukáže úplně jiná (zástupná) fotka

### Příčina

Tři věci na sebe navazují:

1. `src/services/products.js`, řádky **4–16**: při každém načtení modulu (tedy při **každém refreshi**) se z localStorage **smažou všechny klíče `nv-img-*`, `nv-back-img-*`, `fav-img-*`**. Cache obrázků je po refreshi vždy prázdná.
2. `src/App.jsx`, ukládání košíku: z `item.product` se před uložením odstraňuje `image`, `back_image`, `backImage`, `additional_images`. Po refreshi tedy položka košíku obrázek neobsahuje.
3. `src/components/CartItemImage.jsx`, řádek 9: `useState(initial || FALLBACK)` — když je cache prázdná a položka obrázek nemá, komponenta **okamžitě nastaví zástupný obrázek `/Akce - NORTHVALE.webp`** a teprve pak se asynchronně dotahuje ten správný. Uživatel vidí zástupnou fotku. Když `products.image` v databázi zrovna prázdný je (fotka je jen v `back_image` nebo `additional_images`), zástupná fotka tam **zůstane natrvalo**.

Navíc `onError` na řádku 32 porovnává `e.target.src !== window.location.origin + FALLBACK`. Cesta obsahuje mezery, prohlížeč je v `src` zakóduje na `%20`, takže se porovnání **nikdy neshoduje** a handler se může spouštět dokola.

### Oprava

**B1) `src/services/products.js` — doplň zálohu obrázku.**

Ve funkci `fetchProductImage` (řádek ~693) se dotazuje jen sloupec `image`. Rozšiř dotaz a přidej řetěz záloh:

```js
const { data, error } = await supabase
  .from('products')
  .select('image, back_image, additional_images')
  .eq('id', productId)
  .maybeSingle();

const resolved = data?.image
  || data?.back_image
  || (Array.isArray(data?.additional_images) ? data.additional_images.find(Boolean) : null)
  || null;
```

a dál pracuj s `resolved` místo `data.image`. Pozor: `.single()` vyhodí chybu při 0 řádcích — proto `.maybeSingle()`.

**B2) `src/components/CartItemImage.jsx` — přepiš celou komponentu:**

```jsx
import { useState, useEffect } from 'react';
import { getProductImageCached, fetchProductImage } from '../services/products';

const FALLBACK = '/Akce - NORTHVALE.webp';

export default function CartItemImage({ item, alt = '', className = '', style = {} }) {
  const productId = item?.product?.id || item?.productId || item?.product_id || item?.id || null;
  const direct = item?.product?.image || item?.image || '';
  const [src, setSrc] = useState(() => getProductImageCached(productId, direct) || '');
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);

    const cached = getProductImageCached(productId, direct);
    if (cached) {
      setSrc(cached);
      return;
    }
    if (!productId) {
      setFailed(true);
      return;
    }

    fetchProductImage(productId)
      .then(dbImage => {
        if (cancelled) return;
        if (dbImage) setSrc(dbImage);
        else setFailed(true);
      })
      .catch(err => {
        console.error('Nepodařilo se načíst obrázek produktu:', productId, err);
        if (!cancelled) setFailed(true);
      });

    return () => { cancelled = true; };
  }, [productId, direct]);

  // Dokud obrázek neznáme, zobraz prázdné průhledné místo — NIKDY ne zástupnou fotku.
  if (!src && !failed) {
    return <div className={className} style={{ ...style, background: 'transparent' }} aria-hidden="true" />;
  }

  return (
    <img
      src={src || FALLBACK}
      alt={alt || item?.name || item?.productName || ''}
      className={className}
      style={{ background: 'transparent', ...style }}
      loading="lazy"
      onError={() => { if (src !== FALLBACK) setSrc(FALLBACK); }}
    />
  );
}
```

Klíčová změna: zástupný obrázek se použije **až když je jisté, že produkt fotku nemá**, ne jako výchozí stav. Tím zmizí i problikávání.

**B3) `src/services/products.js` — nemaž cache při každém refreshi.**

Blok na řádcích 4–16 maže celou cache obrázků při každém startu aplikace. Byl tam kvůli zaplnění localStorage, ale způsobuje, že se po každém refreshi všechny obrázky tahají znovu z databáze (base64, stovky kB na produkt).

Nahraď plošné mazání úklidem podle stáří — smaž jen klíče starší než 24 hodin:

```js
try {
  const now = Date.now();
  const MAX_AGE = 24 * 60 * 60 * 1000;
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k) continue;
    if (k.startsWith('nv-img-') && !k.startsWith('nv-img-time-')) {
      const t = Number(localStorage.getItem(`nv-img-time-${k.replace('nv-img-', '')}`) || 0);
      if (!t || (now - t) > MAX_AGE) keysToRemove.push(k);
    }
  }
  keysToRemove.forEach(k => {
    localStorage.removeItem(k);
    localStorage.removeItem(`nv-img-time-${k.replace('nv-img-', '')}`);
  });
} catch (e) {
  console.warn('LocalStorage image cleanup error:', e);
}
```

**B4) Přejmenuj zástupný soubor.** `public/Akce - NORTHVALE.webp` má v názvu mezery, což komplikuje porovnávání URL. Zkopíruj ho na `public/placeholder-product.webp` a v `CartItemImage.jsx` používej `const FALLBACK = '/placeholder-product.webp';`. Původní soubor **nemaž** — může být odkazovaný jinde.

---

## PROBLÉM C (volitelné, ale doporučuji) — obrázky patří do Supabase Storage, ne do databáze

Aktuálně jsou fotky uložené jako base64 `data:` řetězce ve sloupci `products.image`. Důsledky: každý produkt zabírá stovky kB v DB řádku, obrázky nejdou cachovat prohlížečem, localStorage přetéká a celá tahle kaskáda problémů z toho vzniká.

**Nedělej to teď automaticky.** Místo toho mi napiš do `scratch/plan-obrazky-do-storage.md` návrh migrace:

1. Nový veřejný Supabase Storage bucket `product-images`.
2. Skript, který projde `products`, každý base64 `image` / `back_image` / `additional_images` dekóduje, nahraje jako soubor `<product_id>.webp` a do nových sloupců `image_url`, `back_image_url`, `additional_image_urls` uloží veřejnou URL.
3. Úprava čtecí vrstvy tak, aby preferovala `image_url` a na base64 padala jen jako záloha (kvůli zpětné kompatibilitě).
4. Úprava admin uploadu, aby nové fotky rovnou nahrával do Storage.
5. Odhad, kolik to ušetří a co všechno by se muselo otestovat.

Plán jen napiš, neimplementuj ho. Rozhodnu se potom.

---

## OVĚŘENÍ

Spusť `npm run build`. Potom otestuj a zapiš PASS/FAIL do `scratch/verify-obrazky.md`:

1. Vlož produkt do košíku → v košíku i na pokladně je **stejná** fotka, bez tmavého rámečku a bez pozadí za produktem.
2. **Obnov stránku (F5)** → fotka zůstane stejná, neobjeví se zástupný obrázek.
3. Zavři a znovu otevři prohlížeč, otevři košík → fotka se načte správně.
4. Produkt, který má prázdný `image`, ale vyplněný `back_image` → zobrazí se `back_image`, ne zástupný obrázek.
5. Neexistující / smazaný produkt v košíku → zobrazí se zástupný obrázek, žádná chyba v konzoli.
6. Konzole prohlížeče při průchodu košík → pokladna: žádná chyba, žádné opakované volání `onError`.
