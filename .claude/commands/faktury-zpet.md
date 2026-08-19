---
description: Zapne zpátky automatické vystavování faktur (vypnuto 19.8.2026)
---

Uživatel chce zapnout zpátky automatické faktury, které byly 19. 8. 2026 dočasně
vypnuté (eshop nebyl propojený s účetnictvím provozovatele).

**Nic nebylo smazáno — je to jen vypínač.** Postupuj takto:

1. Přečti `docs/FAKTURY-ZAPNOUT-ZPET.md` — je tam celý kontext.

2. Než začneš, zeptej se uživatele **jednou jedinou otázkou**, jestli už je
   účetnictví propojené / vyřešené. Pokud řekne že ne, upozorni ho, že se vrátí
   ten původní problém (eshop bude vyrábět doklady, které nesedí s účetnictvím),
   a nech ho rozhodnout.

3. Po odsouhlasení přepni obě hodnoty na `true`:
   - `supabase/functions/_shared/features.ts` → `AUTO_INVOICES`
   - `src/config.js` → `FEATURE_FLAGS.autoInvoices`

   Musí být stejné. Zkontroluj, že jsou.

4. Ověř build (`npm run build`) a nasaď:
   `supabase functions deploy finalize-order send-order-email`

5. Commitni a pushni. Pak uživateli **stručně, lidsky a bez technického balastu**
   napiš, co se zákazníkovi zase začne posílat.

Tlačítko „Odeslat fakturu" v administraci nech být — funguje dál a hodí se na
dodatečné a opravné faktury.
