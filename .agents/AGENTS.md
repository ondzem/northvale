# 🤖 Pravidla & Návody pro AI Asistenta (NORTHVALE)

Tento soubor slouží jako hlavní manuál a sada nezpochybnitelných pravidel pro AI asistenta v tomto projektu. AI čte tento soubor automaticky na začátku každé konverzace.

---

## 💬 1. Pravidla pro komunikaci & Vývoj
* **Stručnost & Věcnost:** Odpovídat vždy stručně, věcně a přímo k věci. Bez zbytečných omáček, rekapitulací a zdlouhavých popisů kroků. Uvádět pouze podstatné informace.
* **Testování:** Každá nová funkce nebo oprava musí být důkladně ověřena (build/test/funkčnost) před nahlášením dokončení.
* **Správa GitHubu:** Nahrávat na GitHub pouze na explicitní žádost uživatele (pokud uživatel řekne "nenahrávej na github", změny zůstávají pouze lokálně).

---

## 💤 2. Účetní systém Pohoda – Režim spánku & Návod na obnovení

Napojení na účetní systém **Pohoda** (přes FTP XML) je dočasně uvedeno do **režimu spánku**, aby e-shop mohl fungovat plně autonomně.

### Aktuální stav:
* V souboru [.env.local](file:///Users/ondrejzeman/Documents/Documents - Ondřej’s MacBook Air/Alvion/AntiGravity IDE/NORTHVALE/.env.local) je nastaveno `VITE_ENABLE_POHODA_SYNC=false`.
* V [App.jsx](file:///Users/ondrejzeman/Documents/Documents - Ondřej’s MacBook Air/Alvion/AntiGravity IDE/NORTHVALE/src/App.jsx) se přesakuje volání Edge funkce `pohoda-connector`.
* V [SyncTab.jsx](file:///Users/ondrejzeman/Documents/Documents - Ondřej’s MacBook Air/Alvion/AntiGravity IDE/NORTHVALE/src/components/admin/SyncTab.jsx) se zobrazuje panel s popisem spánkového režimu.

### Jak obnovit napojení na Pohodu (při žádosti uživatele):
1. **Aktivace v konfiguraci:** V [.env.local](file:///Users/ondrejzeman/Documents/Documents - Ondřej’s MacBook Air/Alvion/AntiGravity IDE/NORTHVALE/.env.local) změň `VITE_ENABLE_POHODA_SYNC=true`.
2. **Oprava Deno/Node streamů v Edge funkci:** V [ftp.ts](file:///Users/ondrejzeman/Documents/Documents - Ondřej’s MacBook Air/Alvion/AntiGravity IDE/NORTHVALE/supabase/functions/pohoda-connector/ftp.ts):
   * Importovat `Readable, Writable` z `"node:stream"` a `Buffer` z `"node:buffer"`.
   * V `uploadInvoiceXml` použít `Readable.from(Buffer.from(data))`.
   * V `downloadStockXml` použít `new Writable(...)`.
3. **Nasazení Edge funkce:** `npx supabase functions deploy pohoda-connector --project-ref bfxzhggjpiyqfolqpxzz`

---

## 📦 3. Předobjednávky (Pre-orders) – Režim spánku & Návod na obnovení

Sekce a prvky pro **předobjednávky** jsou dočasně uvedeny do **režimu spánku**, aby se při spuštění webu zobrazovaly pouze produkty skladem.

### Aktuálně skryté části a jejich umístění:
1. **Sekce na Úvodní stránce:**
   * Soubor: [Homepage.jsx](file:///Users/ondrejzeman/Documents/Documents - Ondřej’s MacBook Air/Alvion/AntiGravity IDE/NORTHVALE/src/components/Homepage.jsx)
   * Značka: `{/* SLEEP MODE: PREORDERS SECTION ... */}`
   * Popis: Sekce "Předobjednávky / Připravované edice" (L1568-1648) je zabalena v JSX komentáři `{/* ... */}`.

2. **CMS správce v Administraci:**
   * Soubor: [HomepageTab.jsx](file:///Users/ondrejzeman/Documents/Documents - Ondřej’s MacBook Air/Alvion/AntiGravity IDE/NORTHVALE/src/components/admin/HomepageTab.jsx)
   * Značka: `{/* SLEEP MODE: PREORDERS CMS SECTION ... */}`
   * Popis: Harmonika "Správa sekce Předobjednávky" (L2033-2060) je zabalena v JSX komentáři `{/* ... */}`.

3. **Informační blok v Obchodních podmínkách (VOP):**
   * Soubor: [GdprVop.jsx](file:///Users/ondrejzeman/Documents/Documents - Ondřej’s MacBook Air/Alvion/AntiGravity IDE/NORTHVALE/src/components/GdprVop.jsx)
   * Značka: `{/* SLEEP MODE: PREORDERS INFO SECTION ... */}`
   * Popis: Blok "5. JAK FUNGUJÍ PŘEDOBJEDNÁVKY?" (L485-512) je zabalen v JSX komentáři `{/* ... */}`.

4. **Katalogový filtr skladovosti:**
   * Soubor: [SealedCatalog.jsx](file:///Users/ondrejzeman/Documents/Documents - Ondřej’s MacBook Air/Alvion/AntiGravity IDE/NORTHVALE/src/components/SealedCatalog.jsx)
   * Značka: `{/* { id: 'preorder', name: 'Možnost předobjednávky' } */}`
   * Popis: Položka filtru "Možnost předobjednávky" v bočním panelu filtrace je zakomentována v poli `list` v `renderStockFilter` (L1303).

5. **Odznáčky na kartách produktů a v detailu / košíku:**
   * Soubory: [ProductCard.jsx](file:///Users/ondrejzeman/Documents/Documents - Ondřej’s MacBook Air/Alvion/AntiGravity IDE/NORTHVALE/src/components/ProductCard.jsx), [Cart.jsx](file:///Users/ondrejzeman/Documents/Documents - Ondřej’s MacBook Air/Alvion/AntiGravity IDE/NORTHVALE/src/components/Cart.jsx), [CheckoutFlow.jsx](file:///Users/ondrejzeman/Documents/Documents - Ondřej’s MacBook Air/Alvion/AntiGravity IDE/NORTHVALE/src/components/CheckoutFlow.jsx), [SealedDetail.jsx](file:///Users/ondrejzeman/Documents/Documents - Ondřej’s MacBook Air/Alvion/AntiGravity IDE/NORTHVALE/src/components/SealedDetail.jsx)
   * Popis: Bleskové štítky a upozornění na předobjednané zboží v košíku a detailu jsou zakomentovány značkou `{/* Preorder ... hidden for now */}`.

### Jak obnovit Předobjednávky (při žádosti uživatele „obnov/spusť předobjednávky“):
1. Otevřít [Homepage.jsx](file:///Users/ondrejzeman/Documents/Documents - Ondřej’s MacBook Air/Alvion/AntiGravity IDE/NORTHVALE/src/components/Homepage.jsx) a odkomentovat blok kolem `{/* SLEEP MODE: PREORDERS SECTION */}`.
2. Otevřít [HomepageTab.jsx](file:///Users/ondrejzeman/Documents/Documents - Ondřej’s MacBook Air/Alvion/AntiGravity IDE/NORTHVALE/src/components/admin/HomepageTab.jsx) a odkomentovat blok kolem `{/* SLEEP MODE: PREORDERS CMS SECTION */}`.
3. Otevřít [GdprVop.jsx](file:///Users/ondrejzeman/Documents/Documents - Ondřej’s MacBook Air/Alvion/AntiGravity IDE/NORTHVALE/src/components/GdprVop.jsx) a odkomentovat blok kolem `{/* SLEEP MODE: PREORDERS INFO SECTION */}`.
4. Otevřít [SealedCatalog.jsx](file:///Users/ondrejzeman/Documents/Documents - Ondřej’s MacBook Air/Alvion/AntiGravity IDE/NORTHVALE/src/components/SealedCatalog.jsx) a odkomentovat `{ id: 'preorder' }` v `renderStockFilter`.
5. Odkomentovat odznáčky a varování v [ProductCard.jsx](file:///Users/ondrejzeman/Documents/Documents - Ondřej’s MacBook Air/Alvion/AntiGravity IDE/NORTHVALE/src/components/ProductCard.jsx), [Cart.jsx](file:///Users/ondrejzeman/Documents/Documents - Ondřej’s MacBook Air/Alvion/AntiGravity IDE/NORTHVALE/src/components/Cart.jsx), [CheckoutFlow.jsx](file:///Users/ondrejzeman/Documents/Documents - Ondřej’s MacBook Air/Alvion/AntiGravity IDE/NORTHVALE/src/components/CheckoutFlow.jsx) a [SealedDetail.jsx](file:///Users/ondrejzeman/Documents/Documents - Ondřej’s MacBook Air/Alvion/AntiGravity IDE/NORTHVALE/src/components/SealedDetail.jsx).