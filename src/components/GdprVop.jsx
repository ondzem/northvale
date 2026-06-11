import { useState } from 'react';

export default function GdprVop({ setActivePage, initialTab = 'vop' }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [prevInitialTab, setPrevInitialTab] = useState(initialTab);

  if (initialTab !== prevInitialTab) {
    setActiveTab(initialTab);
    setPrevInitialTab(initialTab);
  }

  // Form states for Odstoupení od smlouvy
  const [orderNumber, setOrderNumber] = useState('');
  const [email, setEmail] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [returnType, setReturnType] = useState('celou');
  const [partialItemsText, setPartialItemsText] = useState('');
  const [refundMethod, setRefundMethod] = useState('bank');
  const [errors, setErrors] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedData, setSubmittedData] = useState(null);

  const handleWithdrawalSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!orderNumber.trim()) {
      newErrors.orderNumber = 'Číslo objednávky je povinné.';
    }
    if (!email.trim()) {
      newErrors.email = 'E-mailová adresa je povinná.';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Zadejte platnou e-mailovou adresu.';
    }
    if (!bankAccount.trim()) {
      newErrors.bankAccount = 'Číslo bankovního účtu je povinné.';
    }
    if (returnType === 'pouze' && !partialItemsText.trim()) {
      newErrors.partialItemsText = 'Vyberte nebo vypište zboží k vrácení.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    const now = new Date();
    const formattedDate = now.toLocaleDateString('cs-CZ');
    const formattedTime = now.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });

    setSubmittedData({
      orderNumber,
      email,
      bankAccount,
      returnType,
      partialItemsText,
      refundMethod,
      date: formattedDate,
      time: formattedTime
    });
    setIsSubmitted(true);
  };

  return (
    <div className="container fade-in" style={{ paddingTop: '20px', paddingBottom: '60px', textAlign: 'left' }}>
      <h1 className="sr-only">Dokumenty, Obchodní podmínky a Ochrana osobních údajů - NORTHVALE s.r.o.</h1>

      {/* Breadcrumbs */}
      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px' }}>
        <span style={{ cursor: 'pointer' }} onClick={() => setActivePage('home')}>Domů</span>
        <span> &raquo; </span>
        <span style={{ color: 'var(--color-gold)', fontWeight: '700' }}>Dokumenty</span>
      </div>

      <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        
        {/* Left Side: Document Selector Tabs */}
        <aside style={{
          flex: '1 1 250px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          position: 'sticky',
          top: '90px'
        }}>
          <button
            onClick={() => setActiveTab('doprava')}
            className={`btn ${activeTab === 'doprava' ? 'btn-primary' : ''}`}
            style={{
              width: '100%',
              padding: '14px',
              fontWeight: '800',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '13px',
              backgroundColor: activeTab === 'doprava' ? 'var(--color-gold)' : 'var(--bg-secondary)',
              color: activeTab === 'doprava' ? '#000' : 'var(--text-muted)',
              border: activeTab === 'doprava' ? '1px solid var(--color-gold)' : '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg> Doprava a platba
          </button>
          <button
            onClick={() => setActiveTab('vop')}
            className={`btn ${activeTab === 'vop' ? 'btn-primary' : ''}`}
            style={{
              width: '100%',
              padding: '14px',
              fontWeight: '800',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '13px',
              backgroundColor: activeTab === 'vop' ? 'var(--color-gold)' : 'var(--bg-secondary)',
              color: activeTab === 'vop' ? '#000' : 'var(--text-muted)',
              border: activeTab === 'vop' ? '1px solid var(--color-gold)' : '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg> Obchodní podmínky (VOP)
          </button>
          <button
            onClick={() => setActiveTab('gdpr')}
            className={`btn ${activeTab === 'gdpr' ? 'btn-primary' : ''}`}
            style={{
              width: '100%',
              padding: '14px',
              fontWeight: '800',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '13px',
              backgroundColor: activeTab === 'gdpr' ? 'var(--color-gold)' : 'var(--bg-secondary)',
              color: activeTab === 'gdpr' ? '#000' : 'var(--text-muted)',
              border: activeTab === 'gdpr' ? '1px solid var(--color-gold)' : '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg> Ochrana údajů (GDPR)
          </button>
          <button
            onClick={() => setActiveTab('odstoupeni')}
            className={`btn ${activeTab === 'odstoupeni' ? 'btn-primary' : ''}`}
            style={{
              width: '100%',
              padding: '14px',
              fontWeight: '800',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '13px',
              backgroundColor: activeTab === 'odstoupeni' ? 'var(--color-gold)' : 'var(--bg-secondary)',
              color: activeTab === 'odstoupeni' ? '#000' : 'var(--text-muted)',
              border: activeTab === 'odstoupeni' ? '1px solid var(--color-gold)' : '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg> Odstoupení od smlouvy
          </button>

          <div style={{
            padding: '20px',
            fontSize: '12px',
            color: 'var(--text-muted)',
            marginTop: '20px',
            lineHeight: '1.5',
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)'
          }}>
            <strong>Potřebujete poradit?</strong><br />
            Máte-li jakékoliv dotazy k našim podmínkám, kontaktujte nás na <a href="mailto:info@northvaletcg.eu" style={{ color: 'var(--color-gold)', textDecoration: 'none' }}>info@northvaletcg.eu</a> nebo na telefonu <a href="tel:+420739666779" style={{ color: 'var(--color-gold)', textDecoration: 'none' }}>+420 739 666 779</a>.
          </div>
        </aside>

        {/* Right Side: Document Content Display */}
        <main style={{
          flex: '3 1 500px',
          padding: '40px',
          boxSizing: 'border-box',
          lineHeight: '1.6',
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)'
        }}>
          {activeTab === 'doprava' && (
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: '800', margin: '0 0 20px 0', color: 'var(--text-main)', fontFamily: 'var(--font-heading)' }}>
                DOPRAVA A PLATBA
              </h2>
              <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', marginBottom: '24px' }}>
                Na e-shopu <strong>northvaletcg.eu</strong> si zakládáme na rychlém doručení, bezpečných platbách a především na absolutně nekompromisním standardu balení. Víme, jakou hodnotu pro vás mají sběratelské karty, a děláme vše pro to, aby dorazily v bezchybném stavu.
              </p>
              
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--color-gold)', margin: '24px 0 12px 0' }}>1. ZPŮSOBY A CENY DORUČENÍ (ČR)</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Pro doručování zásilek využíváme spolehlivé dopravce. U objednávek s hodnotou <strong>nad 2 000 Kč</strong> je doprava <strong>ZDARMA</strong> (platí pro Zásilkovnu, GLS a DPD).
              </p>
              <ul style={{ paddingLeft: '20px', fontSize: '13px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <li><strong>Zásilkovna – Výdejní místa a Z-BOXy:</strong> 79 Kč (Obvykle do 24–48 hodin od expedice. Zásilku si můžete vyzvednout na kterémkoli z tisíců výdejních míst nebo v samoobslužných Z-BOXech otevřených 24/7).</li>
                <li><strong>GLS – Doručení na adresu:</strong> 99 Kč (Do druhého pracovního dne od expedice. Doručení kurýrem přímo k vám domů nebo do zaměstnání).</li>
                <li><strong>DPD – Doručení na adresu:</strong> 109 Kč (Do druhého pracovního dne od expedice. Komfortní doručení na adresu s možností změny termínu).</li>
                <li><strong>Česká pošta – Doporučené psaní (pouze pro kusové karty):</strong> 79 Kč (2–3 pracovní dny od expedice. Povoleno výhradně pro objednávky obsahující pouze kusové karty do celkové hodnoty 1 000 Kč).</li>
                <li><strong>Osobní odběr:</strong> ZDARMA (Bratří Čapků 1095, 534 01 Holice, případně dle domluvy na určeném odběrném místě v Pardubicích).</li>
              </ul>

              <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--color-gold)', margin: '24px 0 12px 0' }}>2. SBĚRATELSKÝ STANDARD BALENÍ (Pack Safety)</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Způsob balení sběratelských karet rozhoduje o jejich stavu a budoucí hodnotě. Naše standardy balení jsou následující:
              </p>
              <h4 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main)', margin: '16px 0 8px 0' }}>Jak balíme kusové karty (Singles)</h4>
              <ol style={{ paddingLeft: '20px', fontSize: '13px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <li><strong>Penny Sleeve:</strong> Každou kusovou kartu nejprve vložíme do tenkého ochranného obalu hlavou dolů, aby se při otřesech nevysunula.</li>
                <li><strong>Pull-Tab (Poutko):</strong> Na zadní stranu obalu nalepíme vytahovací poutko. Kartu z toploaderu snadno vytáhnete tahem za poutko bez rizika ohnutí hran.</li>
                <li><strong>Toploader:</strong> Karta v obalu se zasune do pevného plastového pouzdra (toploaderu), které zabrání mechanickému poškození.</li>
                <li><strong>Kartonový sendvič:</strong> Toploader vložíme mezi dva silné pláty vlnité lepenky přesahující rozměry toploaderu a zafixujeme papírovou malířskou páskou (nezanechává stopy lepidla).</li>
                <li><strong>Bublinková obálka:</strong> Celý sendvič vložíme do kvalitní bublinkové obálky. Karta je tak 100% chráněna proti nárazům.</li>
              </ol>
              <h4 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main)', margin: '16px 0 8px 0' }}>Jak balíme zapečetěné produkty (Sealed Product)</h4>
              <ul style={{ paddingLeft: '20px', fontSize: '13px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <li>Displeje, Booster Boxy a Elite Trainer Boxy (ETB) balíme výhradně do pevných, nových pětivrstvých kartonových krabic.</li>
                <li>Produkty obalujeme silnou vrstvou bublinkové fólie a zbylý prostor v krabici vyplňujeme papírovou střiží nebo vzduchovými polštářky.</li>
                <li>Rohy krabic zpevňujeme lepicí páskou. Garantujeme, že originální smršťovací fólie (shrink wrap) s logem výrobce dorazí neporušená.</li>
              </ul>

              <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--color-gold)', margin: '24px 0 12px 0' }}>3. MOŽNOSTI PLATBY</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Nabízíme bezpečné a rychlé platební metody pro okamžité vyřízení vaší objednávky:
              </p>
              <ul style={{ paddingLeft: '20px', fontSize: '13px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <li><strong>Platební brána ComGate (ZDARMA):</strong> Rychlá platba kartami Visa, Mastercard nebo zrychleným bankovním převodem. Provozovatelem platební brány je společnost ComGate Payments, a.s. Veškeré transakce jsou zabezpečené a šifrované.</li>
                <li><strong>Klasický bankovní převod (ZDARMA):</strong> Po dokončení objednávky obdržíte e-mail s podklady pro platbu (číslo účtu, variabilní symbol a QR kód).</li>
                <li><strong>Platba na dobírku (Příplatek 25 Kč):</strong> Objednávku zaplatíte hotově nebo kartou přímo kurýrovi při převzetí zásilky.</li>
                <li><strong>Store Credit – Zákaznický kredit (ZDARMA):</strong> Pokud máte na svém uživatelském účtu zůstatek Store Kreditu (např. z výkupu), můžete jej uplatnit jako slevu na celou objednávku nebo její část.</li>
              </ul>
            </div>
          )}

          {activeTab === 'vop' && (
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: '800', margin: '0 0 20px 0', color: 'var(--text-main)', fontFamily: 'var(--font-heading)' }}>
                VŠEOBECNÉ OBCHODNÍ PODMÍNKY
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '24px' }}>
                obchodní společnosti <strong>NORTHVALE s.r.o.</strong><br />
                se sídlem: Bratří Čapků 1095, 534 01 Holice<br />
                identifikační číslo (IČO): 29618142 | DIČ: CZ29618142<br />
                zapsané v obchodním rejstříku vedeném Krajským soudem v Hradci Králové, oddíl C, vložka 56872<br />
                pro prodej zboží prostřednictvím on-line obchodu na internetové adrese: <strong>northvaletcg.eu</strong>
              </p>
              <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.06)', margin: '20px 0' }} />

              <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>1. ÚVODNÍ USTANOVENÍ</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                1.1. Tyto všeobecné obchodní podmínky (dále jen „obchodní podmínky“) obchodní společnosti NORTHVALE s.r.o., se sídlem Bratří Čapků 1095, 534 01 Holice, identifikační číslo: 29618142, zapsané v obchodním rejstříku vedeném Krajským soudem v Hradci Králové, oddíl C, vložka 56872 (dále jen „prodávající“) upravují v souladu s ustanovením § 1751 odst. 1 zákona č. 89/2012 Sb., občanský zákoník, ve znění pozdějších předpisů (dále jen „občanský zákoník“) vzájemná práva a povinnosti smluvních stran vzniklé v souvislosti nebo na základě kupní smlouvy (dále jen „kupní smlouva“) uzavírané mezi prodávajícím a jinou fyzickou osobou (dále jen „kupující“) prostřednictvím internetového obchodu prodávajícího na adrese northvaletcg.eu.
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                1.2. Obchodní podmínky se vztahují na případy, kdy osoba, která má v úmyslu nakoupit zboží od prodávajícího, je spotřebitelem. Spotřebitelem je každý člověk, který mimo rámec své podnikatelské činnosti uzavírá smlouvu s podnikatelem.
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                1.3. Ustanovení odchylná od obchodních podmínek je možné sjednat v kupní smlouvě. Odchylná ujednání v kupní smlouvě mají přednost před ustanoveními obchodních podmínek.
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                1.4. Ustanovení obchodních podmínek jsou nedílnou součástí kupní smlouvy. Kupní smlouva a obchodní podmínky jsou vyhotoveny v českém jazyce.
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                1.5. Znění obchodních podmínek může prodávající měnit či doplňovat. Tímto ustanovením nejsou dotčena práva a povinnosti vzniklá po dobu účinnosti předchozího znění.
              </p>

              <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>2. UŽIVATELSKÝ ÚČET A STORE CREDIT</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                2.1. Na základě registrace kupujícího provedené na webové stránce může kupující přistupovat do svého uživatelského rozhraní (uživatelský účet), odkud může provádět objednávání zboží.
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                2.2. Při registraci a při objednávání zboží je kupující povinen uvádět správně a pravdivě všechny údaje a při jakékoliv změně je aktualizovat.
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                2.3. Přístup k uživatelskému účtu je zabezpečen uživatelským jménem a heslem. Kupující je povinen zachovávat mlčenlivost o přístupových údajích.
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                2.4. Prodávající může zrušit uživatelský účet, zejména v případě, kdy kupující svůj účet déle než 24 měsíců nevyužívá nebo poruší své povinnosti z kupní smlouvy.
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                2.5. Kupující bere na vědomí, že uživatelský účet nemusí být dostupný nepřetržitě s ohledem na nutnou údržbu.
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                2.6. <strong>Store Credit (Zákaznický kredit):</strong> Registrovaný kupující může disponovat virtuálním kreditem (Store Credit). 1 jednotka kreditu odpovídá hodnotě 1 Kč. Store Credit je nepřenosný, lze jej uplatnit jako slevu na nákup, a nelze jej směnit za hotovost (vyjma výplat z titulu schváleného výkupu).
              </p>

              <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>3. UZAVŘENÍ KUPNÍ SMLOUVY</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                3.1. Veškerá prezentace zboží umístěná ve webovém rozhraní obchodu je informativního charakteru a prodávající není povinen uzavřít kupní smlouvu ohledně tohoto zboží.
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                3.2. Webové rozhraní obchodu obsahuje informace o zboží, včetně uvedení cen a nákladů za vrácení. Ceny jsou uvedeny včetně DPH.
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                3.3. Informace o nákladech spojených s balením a dodáním zboží platí v rámci České republiky.
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                3.4. Pro objednání zboží vyplní kupující objednávkový formulář ve webovém rozhraní (výběr zboží, způsob úhrady, doprava).
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                3.5. Před zasláním objednávky je kupujícímu umožněno zkontrolovat a měnit údaje.
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                3.6. <strong>Proces dokončení objednávky:</strong> Kupující odešle objednávku kliknutím na tlačítko označené <strong>„Objednat a zaplatit“</strong> (objednávka zavazující k platbě). Obdržení objednávky prodávající potvrdí elektronickou poštou.
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                3.7. <strong>Vznik kupní smlouvy:</strong> Smluvní vztah vzniká až doručením přijetí (akceptace) objednávky prodávajícím (např. potvrzení o expedici zboží).
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                3.8. Kupující souhlasí s použitím komunikačních prostředků na dálku. Náklady si hradí sám.
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                3.9. Vzhledem k povaze TCG si prodávající vyhrazuje právo neakceptovat objednávku v případě zjevné chyby v ceně či vyprodání skladových zásob.
              </p>

              <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>4. CENA ZBOŽÍ A PLATEBNÍ PODMÍNKY</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                4.1. Cenu zboží může kupující uhradit v hotovosti při osobním odběru, bezhotovostně přes platební bránu ComGate, převodem na bankovní účet, na dobírku, nebo uplatněním Store Kreditu.
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                4.1.1. Bezhotovostní platby platební kartou a zrychleným převodem jsou zabezpečeny platební bránou ComGate. Přenos citlivých dat a informací o platbách probíhá v šifrované podobě s využitím standardu SSL / TLS.
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                4.2. Společně s kupní cenou je kupující povinen zaplatit náklady spojené s balením a dodáním.
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                4.3. Prodávající nepožaduje zálohu, s výjimkou případů dle čl. 4.6.
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                4.4. Při platbě v hotovosti či dobírkou je cena splatná při převzetí. U bankovního převodu je splatná do 5 pracovních dnů. U platební brány ComGate ihned.
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                4.5. U bankovního převodu je kupující povinen uvést variabilní symbol (číslo objednávky).
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                4.6. Prodávající je oprávněn požadovat uhrazení celé kupní ceny předem, zejména u neověřených objednávek.
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                4.7. Slevy z ceny nelze kombinovat. Pokud je uváděna sleva, referenční původní cena je nejnižší cena za posledních 30 dnů (v souladu s Omnibus směrnicí).
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                4.8. Daňový doklad (faktura) je vystaven po uhrazení a zaslán elektronicky. Prodávající je plátcem DPH.
              </p>

              <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>5. PŘEPRAVA A DODÁNÍ ZBOŽÍ (Sběratelský standard)</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                5.1. Standardy balení:
                <br />• <strong>Kusové karty:</strong> Sleeve, toploader s Pull-Tab, kartonový sendvič, bublinková obálka.
                <br />• <strong>Zapečetěné produkty:</strong> Pevné krabice, bublinková fólie, plnící materiál k zamezení poškození fólie a rohů.
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                5.2. Způsoby doručení: Zásilkovna, DPD, GLS, Česká pošta a osobní odběr v Pardubicích či Holicích.
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                5.3 - 5.5. Kupující nese riziko spojené se speciální dopravou a hradí náklady na opakované doručení při své chybě.
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                5.6. <strong>Kontrola zásilky:</strong> Při převzetí je kupující povinen zkontrolovat obal a v případě poškození (proražení krabice, poškozené rohy) zásilku nepřevzít a sepsat škodní protokol.
              </p>

              <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>6. ODSTOUPENÍ OD SMLOUVY</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                6.1. Kupující spotřebitel má právo odstoupit od kupní smlouvy bez udání důvodu do čtrnácti (14) dnů od převzetí zboží.
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                6.2 - 6.3. Odstoupení lze provést jakýmkoli prohlášením zaslaným na adresu NORTHVALE s.r.o., Bratří Čapků 1095, 534 01 Holice, nebo na e-mail info@northvaletcg.eu.
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                6.4. Zboží mustí být vráceno nejpozději do 14 dnů od odstoupení. Kupující nese náklady na vrácení zboží.
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                6.5. Peněžní prostředky vrátí prodávající do 14 dnů od doručení odstoupení, nikoli však dříve, než obdrží vrácené zboží nebo důkaz o odeslání.
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                6.6. <strong>Důležité upozornění:</strong> U sealed produktů (Booster Boxy, ETB apod.) poškození nebo otevření smršťovací fólie (shrink wrap) dramaticky snižuje sběratelskou hodnotu. Prodávající uplatní nárok na snížení hodnoty zboží (§ 1833 občanského zákoníku), které může činit až 30–50 % z ceny zboží.
              </p>

              <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>7. PRÁVA Z VADNÉHO PLNĚNÍ (Reklamace)</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                7.1 - 7.2. Prodávající odpovídá, že věc při převzetí nemá vady (odpovídá popisu, jakosti, množství).
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                7.3 - 7.4. Záruční doba je 2 roky. Projeví-li se vada během prvního roku, má se za to, že byla přítomna již při převzetí.
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                7.5 - 7.6. Kupující může požadovat dodání nové věci nebo opravu. Při závažné nebo opakované vadě má právo na slevu či odstoupení od smlouvy.
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                7.7. Reklamace se uplatňuje na adrese sídla: NORTHVALE s.r.o., Bratří Čapků 1095, 534 01 Holice.
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                7.8. Reklamace musí být vyřízena do třiceti (30) dnů, pokud se strany nedohodnou jinak.
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                7.9. Záruka se nevztahuje na opotřebení, vady z neodborného zacházení (např. ohnutí rohů karet - ring dent) nebo mechanické poškození po převzetí.
              </p>

              <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>8. MIMOSOUDNÍ ŘEŠENÍ SPORŮ (ADR)</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                8.1. Stížnosti vyřizujeme přes e-mail info@northvaletcg.eu.
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                8.2. K mimosoudnímu řešení spotřebitelských sporů je příslušná Česká obchodní inspekce (Štěpánská 15, Praha 2, coi.cz). K řešení sporů online lze využít evropskou platformu ODR (ec.europa.eu/consumers/odr).
              </p>

              <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>9. ZÁVĚREČNÁ USTANOVENÍ</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                9.1. Smluvní vztah se řídí českým právem.
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                9.2. Neplatnost jednoho ustanovení nemá vliv na platnost ostatních.
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                9.3. Kupní smlouvy jsou archivovány v elektronické podobě.
              </p>

              <h4 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-main)', margin: '24px 0 12px 0' }}>
                Příloha č. 1: Vzorový formulář pro odstoupení od smlouvy
              </h4>
              <div style={{
                border: '1px dashed rgba(255, 255, 255, 0.1)',
                padding: '20px',
                borderRadius: '8px',
                fontSize: '13px',
                color: 'var(--text-muted)',
                lineHeight: '1.8',
                backgroundColor: 'rgba(255, 255, 255, 0.005)'
              }}>
                <strong>Oznámení o odstoupení od kupní smlouvy</strong><br /><br />
                <strong>Adresát:</strong><br />
                NORTHVALE s.r.o.<br />
                Bratří Čapků 1095, 534 01 Holice<br />
                E-mail: info@northvaletcg.eu<br /><br />
                Tímto oznamuji/oznamujeme (*), že odstupuji/odstupujeme (*) od smlouvy o nákupu tohoto zboží (*):<br /><br />
                • Datum objednání zboží / datum obdržení zboží:<br />
                • Číslo objednávky / číslo daňového dokladu:<br />
                • Jméno a příjmení kupujícího/spotřebitele:<br />
                • Adresa kupujícího/spotřebitele:<br />
                • Podpis kupujícího/spotřebitele (pouze pokud je zasíláno v listinné podobě):<br />
                • Datum:<br /><br />
                <span style={{ fontSize: '11px' }}>(*) Nehodící se škrtněte nebo doplňte.</span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '20px' }}>V Holicích, dne 9. června 2026</p>
            </div>
          )}

          {activeTab === 'gdpr' && (
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: '800', margin: '0 0 20px 0', color: 'var(--text-main)', fontFamily: 'var(--font-heading)' }}>
                ZÁSADY OCHRANY OSOBNÍCH ÚDAJŮ (GDPR)
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '24px' }}>
                obchodní společnosti <strong>NORTHVALE s.r.o.</strong><br />
                se sídlem: Bratří Čapků 1095, 534 01 Holice<br />
                identifikační číslo (IČO): 29618142 | DIČ: CZ29618142<br />
                zapsané v obchodním rejstříku vedeném Krajským soudem v Hradci Králové, oddíl C, vložka 56872<br />
                pro provoz on-line obchodu na internetové adrese: <strong>northvaletcg.eu</strong>
              </p>
              <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.06)', margin: '20px 0' }} />

              <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>1. ÚVODNÍ USTANOVENÍ</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                1.1. Ochrana osobních údajů je pro nás prioritou. Tyto zásady ochrany osobních údajů podrobně popisují, jakým způsobem společnost NORTHVALE s.r.o. (dále jen „správce“ nebo „my“) shromažďuje, zpracovává, uchovává a chrání osobní údaje návštěvníků a zákazníků (dále jen „subjekt údajů“ nebo „vy“) našeho internetového obchodu northvaletcg.eu (dále jen „e-shop“).
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                1.2. Osobní údaje zpracováváme v souladu s Nařízením Evropského parlamentu (EU) 2016/679 (dále jen „nařízení GDPR“) a v souladu se zákonem č. 110/2019 Sb., o zpracování osobních údajů.
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                1.3. Kontaktní údaje správce:
                <br />• <strong>Adresa pro doručování:</strong> NORTHVALE s.r.o., Bratří Čapků 1095, 534 01 Holice
                <br />• <strong>E-mail:</strong> info@northvaletcg.eu
                <br />• <strong>Telefon:</strong> +420 739 666 779
              </p>

              <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>2. KATEGORIE ZPRACOVÁVANÝCH OSOBNÍCH ÚDAJŮ</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                V souvislosti s provozem našeho e-shopu zpracováváme následující kategorie osobních údajů:
                <br />• <strong>Identifikační údaje:</strong> Jméno, příjmení, titul, IČO, DIČ.
                <br />• <strong>Kontaktní údaje:</strong> E-mailová adresa, telefonní číslo, dodací a fakturační adresa.
                <br />• <strong>Platební a transakční údaje:</strong> Číslo bankovního účtu, historie objednávek a plateb.
                <br />• <strong>Údaje o vašem účtu:</strong> Uživatelské jméno, heslo (hašované), stav Store Kreditu a historie asistovaného gradingu (PSA/CGC).
                <br />• <strong>Síťové a analytické údaje:</strong> IP adresa, soubory cookies, historie procházení (Google Analytics, Microsoft Clarity).
              </p>

              <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>3. ÚČELY A PRÁVNÍ ZÁKLADY ZPRACOVÁVANÍ</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                <strong>A. Plnění kupní smlouvy:</strong> Zpracování pro vyřízení objednávky, expedici zboží, platby a reklamace. Právní základ: Čl. 6 odst. 1 písm. b) nařízení GDPR.
                <br /><br />
                <strong>B. Smlouva o výkupu karet (Buylist):</strong> Zpracování pro určení ceny výkupu, připsání Store Kreditu či bankovní převod. Právní základ: Čl. 6 odst. 1 písm. b) nařízení GDPR.
                <br /><br />
                <strong>C. Plnění právních povinností (Účetnictví a daně):</strong> Uchovávání daňových a účetních dokladů dle zákonů ČR. Právní základ: Čl. 6 odst. 1 písm. c) nařízení GDPR.
                <br /><br />
                <strong>D. Oprávněný zájem (Přímý marketing a bezpečnost):</strong> Zasílání newsletterů zákazníkům s možností odhlášení. Prevence podvodů při výkupu a IT bezpečnost. Právní základ: Čl. 6 odst. 1 písm. f) nařízení GDPR.
                <br /><br />
                <strong>E. Váš souhlas:</strong> Zasílání newsletterů neregistrovaným odběratelům, analytické cookies (Google Analytics, Microsoft Clarity). Právní základ: Čl. 6 odst. 1 písm. a) nařízení GDPR.
              </p>

              <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>4. PŘÍJEMCI OSOBNÍCH ÚDAJŮ (ZPRACOVATELÉ)</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Vaše data předáváme těmto kategoriím příjemců:
                <br />• <strong>Dopravci:</strong> Zásilkovna s.r.o., DPD CZ s.r.o., GLS Czech Republic s.r.o., Česká pošta, s.p.
                <br />• <strong>Platební brána:</strong> ComGate Payments, a.s.
                <br />• <strong>Analytické nástroje:</strong> Google Ireland Limited (Google Analytics), Microsoft Corporation (Microsoft Clarity).
                <br />• <strong>IT a účetní služby:</strong> Webhosting a externí účetní software (Pohoda).
                <br />• <strong>Gradingové autority (USA):</strong> Odeslání karet do USA u asistovaného gradingu probíhá anonymně pod naším partnerským účtem (bez vašich osobních dat).
              </p>

              <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>5. DOBA UCHOVÁVÁNÍ OSOBNÍCH ÚDAJŮ</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                • <strong>Smlouvy:</strong> Po dobu trvání smluvního vztahu, záruky a promlčecí lhůty (celkem cca 5 let).
                <br />• <strong>Účetnictví a daně:</strong> Doklady a faktury uchováváme po dobu 10 let.
                <br />• <strong>Marketing:</strong> Po dobu 3 let od posledního nákupu nebo do odvolání souhlasu / námitky.
                <br />• <strong>Cookies:</strong> Podle nastavení prohlížeče (od relace po 2 roky).
              </p>

              <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>6. VAŠE PRÁVA JAKO SUBJEKTU ÚDAJŮ</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Máte právo na přístup k údajům, opravu, výmaz („právo být zapomenut“), omezení zpracování, přenositelnost, vznést námitku a odvolat souhlas.
                Stížnosti lze podat u dozorového úřadu:
                <br />• <strong>Úřad pro ochranu osobních údajů (ÚOOÚ)</strong>, Pplk. Sochora 27, 170 00 Praha 7 (uoou.cz).
              </p>

              <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>7. BEZPEČNOST OSOBNÍCH ÚDAJŮ</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Prohlašujeme, že jsme přijali vhodná technická a organizační opatření k zabezpečení dat. Přístup mají pouze pověřené osoby vázané mlčenlivostí. Veškerý přenos dat probíhá šifrovaně pomocí HTTPS (SSL/TLS).
              </p>

              <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>8. ZÁVĚREČNÁ USTANOVENÍ</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Odesláním objednávky nebo registrací potvrzujete seznámení se s těmito zásadami ochrany osobních údajů a jejich přijetí. Tyto zásady jsme oprávněni jednostranně měnit.
              </p>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '20px' }}>V Holicích, dne 9. června 2026</p>
            </div>
          )}

          {activeTab === 'odstoupeni' && (
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: '800', margin: '0 0 20px 0', color: 'var(--text-main)', fontFamily: 'var(--font-heading)' }}>
                ODSTOUPENÍ OD SMLOUVY (ONLINE FORMULÁŘ)
              </h2>
              <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', marginBottom: '24px' }}>
                Jako spotřebitel máte právo odstoupit od kupní smlouvy uzavřené na našem e-shopu <strong>northvaletcg.eu</strong> bez udání důvodu, a to do <strong>14 dnů</strong> od převzetí zboží.
              </p>
              <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', marginBottom: '24px' }}>
                V souladu s novou legislativou platnou od 19. června 2026 (tzv. tlačítková novela 2.0) jsme pro vás proces odstoupení maximálně zjednodušili. Nyní již nemusíte tisknout, ručně vyplňovat a posílat papírové formuláře. Vše vyřídíte elektronicky přímo na této stránce.
              </p>

              <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.06)', margin: '24px 0' }} />

              <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--color-gold)', margin: '24px 0 12px 0' }}>Jak postupovat pro odstoupení od smlouvy:</h3>
              <ol style={{ paddingLeft: '20px', fontSize: '13px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
                <li><strong>Vyplňte elektronický formulář níže</strong> (zadejte číslo objednávky, váš e-mail a vyberte zboží, které chcete vrátit).</li>
                <li><strong>Odešlete formulář</strong> kliknutím na tlačítko <strong>„Odstoupit od smlouvy“</strong>.</li>
                <li><strong>Ihned obdržíte e-mail s potvrzením</strong> o přijetí vašeho odstoupení, které obsahuje přesné datum, čas a rekapitulaci vráceného zboží.</li>
                <li><strong>Zboží odešlete</strong> bez zbytečného odkladu (nejpozději do 14 dnů od odeslání formuláře) na naši adresu: <br /><strong>NORTHVALE s.r.o., Bratří Čapků 1095, 534 01 Holice</strong>.</li>
              </ol>

              <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.06)', margin: '24px 0' }} />

              <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--color-gold)', margin: '24px 0 12px 0' }}>
                ELEKTRONICKÝ FORMULÁŘ PRO ODSTOUPENÍ
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: '24px' }}>
                (Tento formulář slouží pro rychlé a plně elektronické odeslání oznámení o odstoupení od kupní smlouvy)
              </p>

              {isSubmitted ? (
                <div style={{
                  border: '1px solid var(--color-gold)',
                  backgroundColor: 'rgba(245, 158, 11, 0.02)',
                  padding: '24px',
                  borderRadius: 'var(--radius-lg)',
                  marginBottom: '24px',
                  boxSizing: 'border-box'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <span style={{ fontSize: '24px', color: 'var(--color-gold)' }}>✓</span>
                    <h4 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--color-gold)', margin: 0 }}>
                      Odstoupení bylo úspěšně odesláno!
                    </h4>
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.6', marginBottom: '20px' }}>
                    Vaše oznámení o odstoupení k objednávce <strong>#{submittedData.orderNumber}</strong> bylo zaregistrováno dne <strong>{submittedData.date} v {submittedData.time}</strong>. Potvrzující e-mail byl odeslán na adresu <strong>{submittedData.email}</strong>.
                  </p>

                  <div style={{
                    backgroundColor: 'var(--bg-page)',
                    border: '1px solid var(--border-light)',
                    padding: '16px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '13px',
                    lineHeight: '1.6',
                    marginBottom: '20px'
                  }}>
                    <div style={{ fontWeight: '700', marginBottom: '8px', color: 'var(--text-main)' }}>Rekapitulace oznámení:</div>
                    <div><strong>Číslo objednávky:</strong> {submittedData.orderNumber}</div>
                    <div><strong>E-mail:</strong> {submittedData.email}</div>
                    <div><strong>Číslo bankovního účtu:</strong> {submittedData.bankAccount}</div>
                    <div><strong>Vrácené zboží:</strong> {submittedData.returnType === 'celou' ? 'Celá objednávka' : `Pouze vybrané zboží: ${submittedData.partialItemsText}`}</div>
                    <div><strong>Způsob vrácení peněz:</strong> {submittedData.refundMethod === 'bank' ? 'Převod na bankovní účet' : 'Store Credit'}</div>
                  </div>

                  <button
                    onClick={() => {
                      setIsSubmitted(false);
                      setOrderNumber('');
                      setEmail('');
                      setBankAccount('');
                      setReturnType('celou');
                      setPartialItemsText('');
                      setRefundMethod('bank');
                      setErrors({});
                    }}
                    className="btn btn-secondary"
                    style={{ padding: '10px 20px', fontSize: '12px', fontWeight: '800', cursor: 'pointer' }}
                  >
                    Odeslat další oznámení
                  </button>
                </div>
              ) : (
                <form onSubmit={handleWithdrawalSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '24px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', backgroundColor: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--border-light)', padding: '24px', borderRadius: 'var(--radius-lg)' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: '800', margin: '0 0 4px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '8px', color: 'var(--text-main)', fontFamily: 'var(--font-heading)' }}>1. Identifikace nákupu</h4>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '12px', fontWeight: '700' }}>Číslo objednávky:</label>
                        <input
                          type="text"
                          value={orderNumber}
                          onChange={(e) => setOrderNumber(e.target.value)}
                          placeholder="např. 20260001"
                          style={{
                            backgroundColor: 'var(--bg-page)',
                            border: errors.orderNumber ? '1px solid #ef4444' : '1px solid var(--border-light)',
                            padding: '10px 14px',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '13px',
                            color: 'var(--text-main)',
                            outline: 'none'
                          }}
                        />
                        {errors.orderNumber && <span style={{ color: '#ef4444', fontSize: '11px', marginTop: '2px' }}>{errors.orderNumber}</span>}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '12px', fontWeight: '700' }}>E-mailová adresa (použitá při objednávce):</label>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="např. jan.novak@email.cz"
                          style={{
                            backgroundColor: 'var(--bg-page)',
                            border: errors.email ? '1px solid #ef4444' : '1px solid var(--border-light)',
                            padding: '10px 14px',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '13px',
                            color: 'var(--text-main)',
                            outline: 'none'
                          }}
                        />
                        {errors.email && <span style={{ color: '#ef4444', fontSize: '11px', marginTop: '2px' }}>{errors.email}</span>}
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '700' }}>Číslo bankovního účtu pro vrácení peněz:</label>
                      <input
                        type="text"
                        value={bankAccount}
                        onChange={(e) => setBankAccount(e.target.value)}
                        placeholder="např. 123456789 / 0100"
                        style={{
                          backgroundColor: 'var(--bg-page)',
                          border: errors.bankAccount ? '1px solid #ef4444' : '1px solid var(--border-light)',
                          padding: '10px 14px',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '13px',
                          color: 'var(--text-main)',
                          outline: 'none'
                        }}
                      />
                      {errors.bankAccount && <span style={{ color: '#ef4444', fontSize: '11px', marginTop: '2px' }}>{errors.bankAccount}</span>}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', backgroundColor: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--border-light)', padding: '24px', borderRadius: 'var(--radius-lg)' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: '800', margin: '0 0 4px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '8px', color: 'var(--text-main)', fontFamily: 'var(--font-heading)' }}>2. Výběr zboží k vrácení</h4>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <label style={{
                        padding: '12px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        cursor: 'pointer',
                        border: returnType === 'celou' ? '1px solid var(--color-gold)' : '1px solid var(--border-light)',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: returnType === 'celou' ? 'rgba(245, 158, 11, 0.03)' : 'transparent',
                        transition: 'all 0.2s'
                      }}>
                        <input
                          type="radio"
                          name="returnType"
                          checked={returnType === 'celou'}
                          onChange={() => setReturnType('celou')}
                          style={{ cursor: 'pointer' }}
                        />
                        <div style={{ textAlign: 'left' }}>
                          <span style={{ fontSize: '13px', fontWeight: '700', display: 'block', color: 'var(--text-main)' }}>Celou objednávku</span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Všechno zboží z objednávky</span>
                        </div>
                      </label>

                      <label style={{
                        padding: '12px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        cursor: 'pointer',
                        border: returnType === 'pouze' ? '1px solid var(--color-gold)' : '1px solid var(--border-light)',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: returnType === 'pouze' ? 'rgba(245, 158, 11, 0.03)' : 'transparent',
                        transition: 'all 0.2s'
                      }}>
                        <input
                          type="radio"
                          name="returnType"
                          checked={returnType === 'pouze'}
                          onChange={() => setReturnType('pouze')}
                          style={{ cursor: 'pointer' }}
                        />
                        <div style={{ textAlign: 'left' }}>
                          <span style={{ fontSize: '13px', fontWeight: '700', display: 'block', color: 'var(--text-main)' }}>Pouze vybrané zboží z objednávky</span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Specifikujte konkrétní produkty níže</span>
                        </div>
                      </label>
                    </div>

                    {returnType === 'pouze' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                        <label style={{ fontSize: '12px', fontWeight: '700' }}>Vypište názvy produktů a počet kusů:</label>
                        <textarea
                          value={partialItemsText}
                          onChange={(e) => setPartialItemsText(e.target.value)}
                          placeholder="např. 2x Pokémon Scarlet & Violet Booster Pack"
                          style={{
                            width: '100%',
                            minHeight: '80px',
                            backgroundColor: 'var(--bg-page)',
                            border: errors.partialItemsText ? '1px solid #ef4444' : '1px solid var(--border-light)',
                            padding: '10px 14px',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '13px',
                            color: 'var(--text-main)',
                            outline: 'none',
                            resize: 'vertical',
                            fontFamily: 'inherit'
                          }}
                        />
                        {errors.partialItemsText && <span style={{ color: '#ef4444', fontSize: '11px', marginTop: '2px' }}>{errors.partialItemsText}</span>}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', backgroundColor: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--border-light)', padding: '24px', borderRadius: 'var(--radius-lg)' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: '800', margin: '0 0 4px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '8px', color: 'var(--text-main)', fontFamily: 'var(--font-heading)' }}>3. Způsob vrácení peněžních prostředků</h4>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <label style={{
                        padding: '12px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        cursor: 'pointer',
                        border: refundMethod === 'bank' ? '1px solid var(--color-gold)' : '1px solid var(--border-light)',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: refundMethod === 'bank' ? 'rgba(245, 158, 11, 0.03)' : 'transparent',
                        transition: 'all 0.2s'
                      }}>
                        <input
                          type="radio"
                          name="refundMethod"
                          checked={refundMethod === 'bank'}
                          onChange={() => setRefundMethod('bank')}
                          style={{ cursor: 'pointer' }}
                        />
                        <div style={{ textAlign: 'left' }}>
                          <span style={{ fontSize: '13px', fontWeight: '700', display: 'block', color: 'var(--text-main)' }}>Převodem na bankovní účet</span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Standardní možnost vrácení peněz</span>
                        </div>
                      </label>

                      <label style={{
                        padding: '12px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        cursor: 'pointer',
                        border: refundMethod === 'credit' ? '1px solid var(--color-gold)' : '1px solid var(--border-light)',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: refundMethod === 'credit' ? 'rgba(245, 158, 11, 0.03)' : 'transparent',
                        transition: 'all 0.2s'
                      }}>
                        <input
                          type="radio"
                          name="refundMethod"
                          checked={refundMethod === 'credit'}
                          onChange={() => setRefundMethod('credit')}
                          style={{ cursor: 'pointer' }}
                        />
                        <div style={{ textAlign: 'left' }}>
                          <span style={{ fontSize: '13px', fontWeight: '700', display: 'block', color: 'var(--text-main)' }}>Formou Store Kreditu na můj uživatelský účet</span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Pro registrované zákazníky; připíše se ihned po kontrole karet a lze využít na další nákupy</span>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div style={{
                    border: '1px dashed rgba(245, 158, 11, 0.25)',
                    backgroundColor: 'rgba(245, 158, 11, 0.02)',
                    padding: '20px',
                    borderRadius: '8px',
                    fontSize: '12.5px',
                    color: 'var(--text-muted)',
                    lineHeight: '1.6'
                  }}>
                    <h4 style={{ fontSize: '13px', fontWeight: '800', color: 'var(--color-gold)', margin: '0 0 10px 0', letterSpacing: '0.5px' }}>
                      DŮLEŽITÉ UPOZORNĚNÍ PRO SBĚRATELE A INVESTORY:
                    </h4>
                    <p style={{ margin: '0 0 10px 0' }}>
                      Berte prosím na vědomí, že u <strong>zapečetěných produktů</strong> (např. Booster Boxy, Elite Trainer Boxy, speciální dárkové sety, nebo jednotlivé Boostery) dochází porušením originální ochranné fólie (tzv. shrink wrap s logy výrobce) k nevratnému poškození sběratelské a investiční hodnoty.
                    </p>
                    <p style={{ margin: 0 }}>
                      Zboží se tímto okamžikem stává rozbaleným a zvážitelným (ztrácí záruku neotevřenosti). Pokud vrátíte zboží s porušenou fólií, budeme nuceni uplatnit nárok na náhradu snížení hodnoty zboží v souladu s § 1833 občanského zákoníku. Tato náhrada může činit <strong>30 až 50 % z kupní ceny zboží</strong> a bude odečtena od vrácené částky. U kusových karet (Singles) nesmí dojít k poškození stavu karty (např. poškrábání, ohnutí rohů či otlačení od kroužkových alb).
                    </p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                    <button type="submit" className="btn btn-primary" style={{ padding: '14px', width: '100%', fontWeight: '800', fontSize: '14px', cursor: 'pointer' }}>
                      ODSTOUPIT OD SMLOUVY
                    </button>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center' }}>
                      (Kliknutím na toto tlačítko odešlete vyplněné odstoupení od smlouvy prodávajícímu. Odesláním se zahajuje 14denní lhůta pro vrácení fyzického zboží.)
                    </span>
                  </div>
                </form>
              )}

              <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.06)', margin: '24px 0' }} />

              <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--color-gold)', margin: '24px 0 12px 0' }}>Co se stane po kliknutí na tlačítko?</h3>
              <ol style={{ paddingLeft: '20px', fontSize: '13px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <li><strong>Potvrzení do e-mailu:</strong> Náš systém vám v souladu se zákonem okamžitě odešle automatické potvrzení o přijetí odstoupení s časovým razítkem.</li>
                <li><strong>Odeslání zboží prodejci:</strong> Zboží bezpečně zabalte (pro kusové karty doporučujeme použít penny sleeve a toploader, pro zapečetěné krabice pevnou kartonovou krabici a bublinkovou fólii, aby nedošlo k poškození během dopravy) a odešlete na naši adresu: <strong>NORTHVALE s.r.o., Bratří Čapků 1095, 534 01 Holice</strong>.</li>
                <li><strong>Kontrola a vrácení peněz:</strong> Jakmile zásilku převezmeme, zkontrolujeme stav karet či neporušenost fólií u sealed produktů. Nejpozději do 14 dnů od převzetí vráceného zboží (nebo od okamžiku, kdy nám prokážete, že bylo zboží odesláno) vám vrátíme peníze na bankovní účet nebo připíšeme Store Credit.</li>
              </ol>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
