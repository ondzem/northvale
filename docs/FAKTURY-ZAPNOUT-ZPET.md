# Jak zapnout automatické faktury zpátky

**Vypnuto:** 19. 8. 2026
**Důvod:** eshop nebyl propojený s účetnictvím provozovatele a doklady si
nesedávaly. Faktury proto zatím vystavuje provozovatel sám a posílá je
tlačítkem „Odeslat fakturu" u objednávky v administraci.

**Nic nebylo smazáno.** Celý fakturační systém v kódu zůstal, jen se nespouští.
Zapnutí = přepnout dvě hodnoty na `true` a nasadit.

---

## Zapnutí ve třech krocích

### 1. Přepnout vypínač na serveru

Soubor: `supabase/functions/_shared/features.ts`

```
export const AUTO_INVOICES = false;   ->   true
```

### 2. Přepnout vypínač na webu

Soubor: `src/config.js` (uvnitř `FEATURE_FLAGS`)

```
autoInvoices: false,   ->   true
```

> Obě hodnoty musí být stejné. Kdyby se rozešly, web nabízí faktury,
> které server nevyrábí (nebo naopak).

### 3. Nasadit

```bash
supabase functions deploy finalize-order send-order-email
```

Web se nasadí sám po `git push` (Vercel).

---

## Co se tím zapne zpátky

| Kde | Co se vrátí |
|---|---|
| `finalize-order` | zavolá se `generate-invoice-pdf`, vznikne PDF faktura |
| `send-order-email` | faktura v příloze + tlačítko „Stáhnout fakturu" v e-mailu |
| `send-order-email` | samostatný e-mail „Faktura – daňový doklad" u plateb kartou |
| `UserPortal` (Můj účet) | tlačítko „Stáhnout fakturu (PDF)" u objednávek |
| `OrderConfirmation` | text „daňový doklad byl zaslán na e-mail" |
| `OrdersTab` (admin) | nouzové tlačítko „Vygenerovat fakturu" u chybných objednávek |

## Co zůstane i po zapnutí

Tlačítko **„Odeslat fakturu"** v administraci zůstane funkční pořád — hodí se
na dodatečné faktury, opravné doklady a podobně. Nijak nekoliduje s automatikou.

---

## Ruční odesílání — kde co je

| Soubor | K čemu |
|---|---|
| `supabase/functions/send-invoice-email/index.ts` | odeslání faktury e-mailem (jen admin, přílohu neukládá) |
| `src/components/admin/SendInvoiceModal.jsx` | okno pro nahrání souboru a odeslání |
| `supabase/functions/_shared/email-template.ts` | společný vzhled e-mailů |

Podporované formáty: PDF, ISDOC, ISDOCX, XML, ZIP, PNG, JPG, WEBP, HEIC,
DOC, DOCX, ODT, TXT, CSV. Max. 5 souborů, 5 MB každý, 8 MB dohromady.
Odeslání se zapíše do objednávky jako `invoice_sent_at`.

---

## Nejrychlejší cesta

V Claude Code napiš: **`/faktury-zpet`**

Příkaz je uložený v `.claude/commands/faktury-zpet.md` a udělá kroky 1–3 sám.
