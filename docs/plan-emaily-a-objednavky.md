# Plán: automatická odpověď + objednávka bez přihlášení

Stav (1. 10. 2026): body 1 a 2 HOTOVÉ a nasazené. Bod 3 (rozcestník) zrušen — v e-mailech je jen odkaz na /faq. Storno zatím ne.

## 1. Automatická odpověď „Vaši zprávu jsme přijali“

Cíl: zákazník hned ví, že je v pořadí. Obyčejný e-mail bez grafiky, jako by psal člověk.

Text (návrh):
> Dobrý den,
> děkujeme za Vaši zprávu. Máme ji a ozveme se Vám zpravidla do 24 hodin
> v pracovní dny. Pokud se Vaše zpráva týká objednávky, uveďte prosím
> v odpovědi její číslo, urychlí to vyřízení.
> S pozdravem
> Tým NORTHVALE TCG
> info@northvaletcg.eu · +420 739 666 779

Dvě cesty, kudy zprávy chodí:

| Odkud | Jak udělat | Kdo |
|---|---|---|
| Formulář na webu (Kontakt) | Funkce `send-contact-email` hned pošle zákazníkovi výše uvedený text přes Brevo jako čistý text (bez šablony). Plně pod kontrolou. | já |
| E-mail přímo na info@ (Forpsi) | Ve webmailu Forpsi zapnout „Automatická odpověď“ s tímto textem. Pozor: Forpsi odpovídá na každou příchozí zprávu — i na odpovědi zákazníků v rozjeté konverzaci a na systémové e-maily. Doporučení: zapnout jen s omezením „1× na odesílatele za X dní“, pokud ho Forpsi nabízí; jinak jen formulář. | klient / ty |

Kdy NEodpovídat: odpovědi na naše e-maily o objednávce (Re:), e-maily od dopravců, Heureky, platební brány, Brevo, robotů (noreply).

## 2. Objednávka bez přihlášení (bezpečný odkaz)

Cíl: v každém e-mailu o objednávce tlačítko „Zobrazit objednávku“, které otevře stav objednávky bez přihlašování.

Jak to funguje:
1. Server ke každé objednávce vytvoří tajný klíč (podpis z čísla objednávky + e-mailu, nedá se uhodnout).
2. E-maily (potvrzení, platba přijata, odesláno) dostanou tlačítko
   `northvaletcg.eu/objednavka/260100217?k=…tajný-klíč…`
3. Stránka ukáže jen tuhle jednu objednávku: stav (přijata / zaplacena / odeslána), položky, cenu, doručení, sledování zásilky, později fakturu a tlačítko storna.
4. Pod tlačítkem v e-mailu: „Máte účet? Všechny objednávky najdete v sekci Moje objednávky.“
5. Bez platného klíče stránka nic neukáže. Odkaz neobsahuje e-mail ani jiné osobní údaje v adrese.

Kde v e-mailech: hned pod shrnutím objednávky, zlaté tlačítko „Zobrazit objednávku“.

Navazuje: storno objednávky (tlačítko na téže stránce, dokud není odesláno) — viz bod 4 z dřívějška.

## 3. Zákaznický servis (rozcestník)

Inspirace: sanitino.cz/zakaznicky-servis („S čím vám můžeme pomoci?“ + dlaždice).

Návrh: stávající stránku Kontakt (`/support/`) předělat na „Zákaznický servis“ — nic nového nepsat, jen přehledně rozcestit, co už máme:

| Dlaždice | Kam vede | Stav |
|---|---|---|
| Moje objednávka | Moje objednávky (později odkaz bez přihlášení z bodu 2) | máme |
| Doprava a platba | `/gdpr-vop/?tab=doprava` | máme |
| Vrácení zboží | `/gdpr-vop/?tab=odstoupeni` (formulář odstoupení) | máme |
| Reklamace | sekce reklamací z VOP (případně krátký postup) | doplnit text |
| Časté dotazy | FAQ akordeon na stejné stránce (odroluje) | máme |
| Napište nám | kontaktní formulář + telefon + e-mail (odroluje) | máme |

Do všech e-mailů k objednávce: „Nevíte si s něčím rady? Zákaznický servis najdete zde.“ → `/support/`.

## Pořadí stavby (až dáš pokyn)
1. Automatická odpověď na formulář (bod 1)
2. Odkaz na objednávku bez přihlášení + tlačítko v e-mailech (bod 2)
3. Zákaznický servis — dlaždice (bod 3) + odkaz v e-mailech
4. Storno objednávky na stránce z bodu 2
