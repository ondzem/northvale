# PROMPT PRO ANTIGRAVITY IDE — kolo 3

> Zkopíruj text od čáry níže.

---

V souboru `src/components/CheckoutFlow.jsx` uprav zobrazení náhledu produktu v souhrnu objednávky na pokladně tak, aby byl obrázek na průhledném pozadí bez kontejneru.

**1) CSS třída `.pof-li-thumb` (cca řádek 1357).** Aktuálně:

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
```

**2) Komponenta `<CartItemImage>` (cca řádek 2211).** Změň `objectFit` z `'cover'` na `'contain'` a přidej `maxWidth: '100%'` / `maxHeight: '100%'`, aby se obrázek nedeformoval ani neořezával:

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

**3)** Projdi zbytek CSS v tomto souboru a ověř, že žádné pravidlo (např. `.pof-line-item` nebo `.pof-li-thumb img`) nepřidává zpět pozadí, rámeček ani `border-radius` u tohoto náhledu. Pokud ano, u náhledu obrázku je zruš.

**4)** Nic jiného neměň. Po úpravě spusť `npm run build` a ověř, že projekt projde bez chyb.
