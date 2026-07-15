# Účetní systém Pohoda – Režim spánku & Obnovení

V tomto projektu je napojení na účetní systém **Pohoda** (přes FTP XML) dočasně uvedeno do **režimu spánku**, aby e-shop mohl fungovat plně autonomně.

---

## 💤 Aktuální stav (Režim spánku)
* V souboru [.env.local](file:///Users/ondrejzeman/Documents/Documents - Ondřej’s MacBook Air/Alvion/AntiGravity IDE/NORTHVALE/.env.local) je nastaveno:
  `VITE_ENABLE_POHODA_SYNC=false`
* V [App.jsx](file:///Users/ondrejzeman/Documents/Documents - Ondřej’s MacBook Air/Alvion/AntiGravity IDE/NORTHVALE/src/App.jsx) je přeskočeno volání Edge funkce `pohoda-connector`.
* V [SyncTab.jsx](file:///Users/ondrejzeman/Documents/Documents - Ondřej’s MacBook Air/Alvion/AntiGravity IDE/NORTHVALE/src/components/admin/SyncTab.jsx) se zobrazuje panel s popisem, že Pohoda je v režimu spánku (Mimo provoz).

---

## ⚡ Jak obnovit napojení na Pohodu
Pokud uživatel požádá o **„obnovení Pohody“** (nebo „obnov pohodů“, „napojit zpět na Pohodu“ apod.), postupuj podle těchto kroků:

### Krok 1: Aktivace v konfiguraci
V souboru [.env.local](file:///Users/ondrejzeman/Documents/Documents - Ondřej’s MacBook Air/Alvion/AntiGravity IDE/NORTHVALE/.env.local) změň hodnotu přepínače:
```env
VITE_ENABLE_POHODA_SYNC=true
```

### Krok 2: Oprava kompatibility Deno/Node streamů v Deno Edge funkci
Stávající kód pro FTP přenos v [ftp.ts](file:///Users/ondrejzeman/Documents/Documents - Ondřej’s MacBook Air/Alvion/AntiGravity IDE/NORTHVALE/supabase/functions/pohoda-connector/ftp.ts) selhával na chybě `source.once is not a function`. Knihovna `basic-ftp` vyžaduje Node.js streamy, ale v kódu se jí předávaly nativní Deno streamy. 

Proveď následující úpravy v [ftp.ts](file:///Users/ondrejzeman/Documents/Documents - Ondřej’s MacBook Air/Alvion/AntiGravity IDE/NORTHVALE/supabase/functions/pohoda-connector/ftp.ts):

1. **Importuj Node.js streamy na začátku souboru:**
   ```typescript
   import { Readable, Writable } from "node:stream";
   import { Buffer } from "node:buffer";
   ```
2. **Uprav funkci `uploadInvoiceXml` (nahrávání XML faktur):**
   Místo `new ReadableStream` použij Node.js kompatibilní `Readable.from`:
   ```typescript
   // Převedení ArrayBuffer data na Node.js Readable stream
   const nodeReadable = Readable.from(Buffer.from(data));
   await client.uploadFrom(nodeReadable, fileName);
   ```
3. **Uprav funkci `downloadStockXml` (stahování XML zásob):**
   Místo `new WritableStream` použij Node.js kompatibilní `Writable`:
   ```typescript
   const chunks: Uint8Array[] = [];
   const nodeWritable = new Writable({
     write(chunk, encoding, callback) {
       chunks.push(chunk);
       callback();
     }
   });
   await client.downloadTo(nodeWritable, fileName);
   ```

### Krok 3: Nasazení upravené Edge funkce
Nasaď opravenou funkci do Supabase:
```bash
npx supabase functions deploy pohoda-connector --project-ref bfxzhggjpiyqfolqpxzz
```

Tím bude napojení na Pohodu plně obnoveno a funkční!
