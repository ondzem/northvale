# Plán ze schůzky s klientem — srovnávač cen a slevové kódy

Stav k 31. 10. 2026: feedy a slevové kódy jsou hotové, čeká se na odpověď srovnávače. Reklamy a ostatní témata ze schůzky jsou vyřazené (dole).

## Co klient chce

Domluvil napůl spolupráci se začínajícím srovnávačem cen (jen Pokémon). Srovnávač nechce provizi, stačí mu 5% slevový kód pro své platící členy. Z toho plynou tři věci:

| # | Požadavek | Stav dnes | Práce |
|---|---|---|---|
| 1 | Srovnávač chce pravidelně dostávat ceny a nabídku (ptá se na API, nebo XML/JSON feed). Klient chce odpověď **co nejdřív**. | Feed je, ale **stárne** (viz níže) | Ano, priorita |
| 2 | Slevový kód jen na vybrané produkty nebo kategorii, pro občasnou akci („vzal jsem toho víc“). | Kód platí vždy na celý košík | Ano |
| 3 | 5% kód na celou objednávku, který se střídá, aby se nezneužíval. | Už jde: procento, platnost od–do, max. použití | Žádná, klient si je naklikne |

## 1. Feed pro srovnávač

Odpověď na otázku srovnávače: veřejné API nemáme a dávat ho nechceme, dostanou **XML feed na stálé adrese**, který si budou stahovat sami.

### Nalezený problém: feedy se neobnovují

Feedy (`heureka.xml`, `zbozi.xml`, `google.xml`) vznikají jen při nasazení webu (`prebuild` → `scripts/generate-feeds.js`). Automatické obnovování v repu není a poslední nasazení bylo 9. 10. Porovnání ostrého feedu s databází 30. 10.:

- **4 produkty** mají ve feedu jinou cenu (např. Vendetta Pre Rift Kit 949 vs. 859 Kč, 30th Celebration Premium Deck set 5 499 vs. 4 999 Kč).
- **4 produkty** jsou ve feedu skladem, ale jsou vyprodané; 1 je to naopak.
- **4 skutečné produkty** ve feedu vůbec nejsou (přidané 14.–22. 10.).

Týká se to i Heureky, Zboží a Googlu už teď: klient platí za prokliky na neaktuální nabídku. Stejně zastarává i cena ve strukturovaných datech produktových stránek a sitemapa.

### Řešení (hotovo 31. 10. 2026)

Nasazení webu 3× denně by stálo 1 350 kreditů Netlify měsíčně, proto feedy skládá Supabase:

- Edge funkce `product-feed` + cron každých 15 minut → bucket `feeds` (změněné feedy se přepíšou, `Last-Modified` je skutečné).
- `netlify/edge-functions/feeds.js` je vystavuje na stálých adresách `/feeds/*.xml` se správným typem XML. Párování na Heurece a Zboží se nemění.
- Obrázek nového produktu obslouží `product-feed/image/` (fallback v `public/_redirects`).
- `/feeds/srovnavac.xml`: jen Pokémon sealed, struktura jako Heureka feed + jazyk v `PARAM`, počet kusů a doprava. Zdroj v odkazu `utm_source=srovnavac`, po potvrzení názvu přejmenovat. FTP na Forpsi je jen pro Pohodu.
- Sitemapa a předgenerované stránky se dál obnovují při nasazení webu.

### Návrh odpovědi pro srovnávač (po spuštění)

> Veřejné API nenabízíme, ale máme XML feed s aktuálními cenami, dostupností a odkazy: `[adresa]`. Obnovuje se 3× denně, stahujte ho prosím maximálně v tomto intervalu.

## 2. Slevové kódy na produkty a kategorie

- **Admin (Slevové kódy):** nová volba „Platí na“: celý košík / vybrané produkty / kategorie, s výběrem produktů.
- **Databáze:** rozsah a seznam produktů nebo kategorií v `discount_codes`. Stávající kódy zůstanou na celý košík.
- **Výpočet:** sleva se počítá jen z platných položek. Musí sedět na třech místech: košík, pokladna a server (`finalize-order` → `verifyOrderPricing`), jinak objednávku zamítne kontrola ceny.
- **Košík bez platné položky:** jasná hláška „Kód platí jen na vybrané produkty“.
- **Doprava zdarma:** beze změny, počítá se z hodnoty zboží před slevou.
- **Test:** kód na jeden produkt, kategorii i celý košík, napříč dobírkou, převodem a kartou; částka v e-mailu a na stránce objednávky.

## 3. Střídání 5% kódu

Bez programování: klient si vytvoří 12 kódů dopředu s platností od–do na každý měsíc a posílá je srovnávači.

Doporučení: **měsíčně a ručně**. Týdenní automatické generování zmínil Ondřej jako možnost, ale má smysl jen tehdy, když srovnávač stihne kód na svém webu měnit každý týden. Stavět ho až na vyžádání.

## Otázky na klienta

1. Jak se srovnávač jmenuje a stačí mu Heureka formát feedu, nebo chce vlastní?
2. Má 5% kód platit i na zboží v akci a denní nabídku? Dnes sleva platí na vše v košíku.
3. Měsíční střídání stačí, nebo srovnávač chce týdně?
4. Odkaz ze srovnávače s `utm_source=<název>`, aby se objednávky z něj ukazovaly v Přehledu prodejů.

## Pořadí

1. Automatické obnovování feedů (opraví i Heureku a Zboží).
2. Odpověď srovnávači + případný vlastní feed.
3. Slevové kódy na produkty a kategorie.

## Vyřazeno ze schůzky

- **Reklamy:** Meta, Heureka PPC, Seznam, Google Ads, Merchant Center pod cizím e-mailem, kámoš na reklamy, reels.
- **Mimo e-shop:** mPohoda v mobilu a EET od nového roku (klient řeší s Martincem kvůli burze v únoru; Pohoda je u nás v režimu spánku), turnaje a spolupráce s hernou, sklad a nákup zboží, soukromé věci.
