# Návod na zprovoznění a testování propojení s Pohodou

Tato příručka tě krok za krokem provede nasazením a otestováním propojení e-shopu s účetním systémem Pohoda přes FTP server.

---

## Krok 1: Inicializace databáze v Supabase
1. Přihlas se do svého **Supabase Dashboardu** projektu.
2. Přejdi do sekce **SQL Editor** a vytvoř novou dotazovací kartu (**New Query**).
3. Zkopíruj a spusť obsah souboru [pohoda_setup.sql](file:///Users/ondrejzeman/Documents/Documents - Ondřej’s MacBook Air/Alvion/AntiGravity IDE/NORTHVALE/supabase/pohoda_setup.sql).
   - Tím se vytvoří logovací tabulka `pohoda_sync_log` a nastaví RLS bezpečnostní pravidla.

---

## Krok 2: Konfigurace a nasazení Edge Function
1. Otevři terminál ve svém projektu a nastav tajné proměnné prostředí (secrets) pro Supabase:
   ```bash
   supabase secrets set FTP_HOST="tvoj_ftp_host.cz" FTP_PORT="21" FTP_USER="tvoj_ftp_uzivatel" FTP_PASS="tvoje_ftp_heslo" POHODA_ICO="12345678"
   ```
   *Poznámka: IČO musí odpovídat účetní jednotce v Pohodě.*

2. Nasaď novou Edge Function do Supabase:
   ```bash
   supabase functions deploy pohoda-connector
   ```

---

## Krok 3: Nastavení na straně POHODY (IT technik)
Tento krok provádí tvůj IT technik na Windows Serveru / počítači, kde běží Pohoda.

### A. Příprava složek na FTP
Na FTP serveru vytvořte tři složky:
- `/pohoda/import/` (sem e-shop odkládá objednávky v XML)
- `/pohoda/export/` (sem Pohoda odkládá zásoby v XML)
- `/pohoda/archive/` (sem e-shop ukládá zpracované soubory zásob)

### B. Konfigurační XML soubor pro import (import_objednavky.xml)
Vytvořte na disku (např. `C:\PohodaXML\import_objednavky.xml`) konfigurační XML, které říká Pohodě, že má stáhnout soubory z FTP a naimportovat je:
```xml
<?xml version="1.0" encoding="Windows-1250"?>
<config xmlns="http://www.stormware.cz/schema/version_2/config.xsd">
  <ftp>
    <server>ftp.tvoj_ftp_host.cz</server>
    <port>21</port>
    <username>tvoj_ftp_uzivatel</username>
    <password>tvoje_ftp_heslo</password>
    <passiveMode>true</passiveMode>
    <download>
      <sourceDir>/pohoda/import</sourceDir>
      <targetDir>C:\PohodaXML\stazene_objednavky</targetDir>
      <deleteSource>true</deleteSource>
    </download>
  </ftp>
  <import>
    <inputDir>C:\PohodaXML\stazene_objednavky</inputDir>
    <outputDir>C:\PohodaXML\vysledky_importu</outputDir>
  </import>
</config>
```

### C. Konfigurační XML soubor pro export (export_zasob.xml)
Vytvořte na disku (např. `C:\PohodaXML\export_zasob.xml`) konfigurační XML pro odeslání zásob z Pohody na FTP:
```xml
<?xml version="1.0" encoding="Windows-1250"?>
<config xmlns="http://www.stormware.cz/schema/version_2/config.xsd">
  <export>
    <agenda>stock</agenda>
    <outputFile>C:\PohodaXML\zasoby.xml</outputFile>
  </export>
  <ftp>
    <server>ftp.tvoj_ftp_host.cz</server>
    <port>21</port>
    <username>tvoj_ftp_uzivatel</username>
    <password>tvoje_ftp_heslo</password>
    <passiveMode>true</passiveMode>
    <upload>
      <sourceFile>C:\PohodaXML\zasoby.xml</sourceFile>
      <targetDir>/pohoda/export</targetDir>
    </upload>
  </ftp>
</config>
```

### D. Spouštěcí dávkový soubor (.bat) pro Windows Plánovač
Vytvořte spouštěcí skript (např. `C:\PohodaXML\pohoda_sync.bat`), který bude volat Pohodu. Windows Plánovač (Task Scheduler) by měl tento `.bat` soubor spouštět každých 10 minut:
```batch
@echo off
echo Spoustim import objednavek z e-shopu do Pohody...
"C:\Program Files (x86)\Stormware\Pohoda\StwPh.exe" /XML "ServisniEshopUser" "HesloServisni" "C:\PohodaXML\import_objednavky.xml"

echo Spoustim export stavu zasob z Pohody na FTP...
"C:\Program Files (x86)\Stormware\Pohoda\StwPh.exe" /XML "ServisniEshopUser" "HesloServisni" "C:\PohodaXML\export_zasob.xml"
echo Hotovo.
```

---

## Krok 4: Automatické spouštění na straně E-shopu (Cron)
Aby e-shop pravidelně kontroloval, zda Pohoda nenahrála nový stav skladu:

1. Použij bezplatnou službu typu **EasyCron** (nebo GitHub Actions / Netlify Scheduled Functions).
2. Nastav periodický GET požadavek (každých 10 minut) na adresu:
   `https://[id-tveho-projektu].supabase.co/functions/v1/pohoda-connector?action=import-stock`
3. V hlavičkách požadavku pošli autorizační token tvého Supabase projektu:
   - Hlavička: `Authorization`
   - Hodnota: `Bearer [TVŮJ_ANON_NEBO_SERVICE_ROLE_KEY]`

---

## Krok 5: Manuální testování
1. Přihlas se do administrace e-shopu na stránku **Synchronizace**.
2. Klikni na **Test FTP**. V konzoli pod tlačítkem bys měl vidět úspěšné připojení a seznam složek/souborů na FTP.
3. V Pohodě u libovolného produktu (např. s kódem `TEST123`) uprav stav skladu na `42` ks a ulož.
4. Spusť ručně v Pohodě export zásob (nebo počkej na spuštění plánovače). Na FTP se objeví soubor `/pohoda/export/zasoby.xml`.
5. V administraci e-shopu klikni na **Synch Sklad nyní**.
6. Ověř, že v konzoli vidíš úspěšný zápis, a že produkt `TEST123` má na e-shopu nyní skladem `42` ks.
7. Všechny kroky se zaznamenávají v reálném čase do tabulky `pohoda_sync_log`, kterou vidíš přímo pod panelem v adminu.
