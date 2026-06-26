# Northvale TCG - Deployment & Produkční Checklist

Tento dokument slouží jako technický návod pro přechod e-shopu a fakturačního systému z lokálního testovacího režimu do ostrého produkčního provozu.

---

## 1. Nasazení Supabase Edge Functions

> [!NOTE]
> **Úspěšně provedeno:** Všechny Edge funkce byly již úspěšně nasazeny do Vašeho živého projektu `bfxzhggjpiyqfolqpxzz` na dálku. Nemusíte spouštět žádné příkazy pro nasazení.
>
> * Nasazené funkce: `save-order-json`, `generate-invoice-pdf`, `send-order-email`, `gls-labels`.

---

## 2. Nastavení produkčních klíčů a proměnných (Secrets)

Edge funkce vyžadují přístup k API klíčům. Nastavte je v produkčním prostředí Supabase pomocí CLI:

```bash
# Nastavení API klíče pro Brevo (mailing)
supabase secrets set BREVO_API_KEY="xkeysib-..." --project-ref <VASE_PROJECT_ID>
supabase secrets set BREVO_SENDER_EMAIL="info@northvaletcg.eu" --project-ref <VASE_PROJECT_ID>
supabase secrets set BREVO_SENDER_NAME="NORTHVALE TCG" --project-ref <VASE_PROJECT_ID>
```

---

## 3. Nastavení Storage Bucketů v Supabase

Ujistěte se, že v Supabase Storage existují následující buckety s povoleným veřejným/neveřejným přístupem dle potřeby:

1. **`pohoda-orders`**:
   - Používá se pro ukládání order JSON/XML souborů.
   - Nastavte přístupová práva (RLS) tak, aby do něj mohl zapisovat pouze `service_role` (Edge Functions) a číst jej mohl administrátor.
2. **`invoices`**:
   - Zde se ukládají vygenerované daňové doklady (`invoice_${orderId}.txt`).
   - Stejně jako výše, přístup k zápisu by měla mít pouze `service_role` a číst administrátor nebo ověřený zákazník.

---

## 4. Plná automatizace: Odpojení od klientského prohlížeče

V testovacím/vývojovém režimu se volání Edge funkcí (odečtení skladu, nahrání faktury, odeslání mailu) spouští přímo z React kódu po odeslání objednávky na frontendu:
```javascript
// Aktuální chování v App.jsx
await supabase.functions.invoke('generate-invoice-pdf', { ... });
await supabase.functions.invoke('send-order-email', { ... });
```
### Doporučený produkční přístup (Database Webhooks):
Aby byl proces **100% spolehlivý** (např. pokud zákazník zavře okno prohlížeče před dokončením požadavku, nebo při platbě přes platební bránu GP Webpay na pozadí):

1. **Zápis do DB:** Frontend pouze uloží novou objednávku do tabulky `orders` se stavem `pending` (čeká) nebo `paid` (zaplaceno kartou).
2. **Spouštěč (Trigger):** V Supabase Dashboardu nastavte **Database Webhook**:
   - *Kdy:* Při vložení řádku do tabulky `orders` (nebo při změně stavu na `paid`).
   - *Akce:* Zavolat HTTP Edge funkci `generate-invoice-pdf` a následně `send-order-email`.
3. **Výhoda:** Všechny procesy (odečtení skladu, tvorba PDF, emailing) proběhnou bezpečně na serveru nezávisle na prohlížeči uživatele.

---

## 5. Platební brána a Měnové kurzy (GP Webpay)

Při zprovoznění platební brány GP Webpay:
* Ujistěte se, že GP Webpay má správně nastavenou **Callback URL** (návratovou URL) odkazující na vaši Supabase Edge funkci `gp-webpay`.
* Webhook z GP Webpay musí po úspěšném ověření podpisu platby nastavit stav objednávky v databázi na `paid` (zaplaceno).
* Pro automatickou konverzi do EUR:
  - Do databázového schématu doporučujeme přidat tabulku `exchange_rates` s denním cron triggerem v Supabase, který každou noc dotáže API ČNB (`https://www.cnb.cz/cs/financni-trhy/devizovy-trh/kurzy-devizoveho-trhu/kurzy-devizoveho-trhu/denni_kurz.txt`) a uloží aktuální kurz EUR/CZK s připočteným 1.5% bufferem pro pokrytí transakčních poplatků brány.

---

## 6. Integrace Dopravců (GLS / DPD)

Pro generování reálných štítků a expedici:
* V [OrdersTab.jsx](file:///Users/ondrejzeman/Documents/Documents - Ondřej’s MacBook Air/Alvion/AntiGravity IDE/NORTHVALE/src/components/admin/OrdersTab.jsx) administrátor zadává heslo pro přístup k MyGLS API.
* V produkčním nasazení doporučujeme toto heslo uložit bezpečně jako tajnou proměnnou (secret) v Supabase (`GLS_PASSWORD`) namísto ukládání do prohlížeče administrátora (`localStorage`), aby bylo chráněno před zneužitím.
