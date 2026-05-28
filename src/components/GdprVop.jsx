import { useState } from 'react';

export default function GdprVop({ setActivePage }) {
  const [activeTab, setActiveTab] = useState('vop');

  return (
    <div className="container fade-in" style={{ paddingTop: '20px', paddingBottom: '60px', textAlign: 'left' }}>
      <h1 className="sr-only">Obchodní podmínky a Ochrana osobních údajů - NORTHVALE</h1>

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
            onClick={() => setActiveTab('vop')}
            className={`btn ${activeTab === 'vop' ? 'btn-primary' : 'btn-secondary'}`}
            style={{
              width: '100%',
              padding: '14px',
              fontWeight: '800',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '13px'
            }}
          >
            <span>📄</span> Všeobecné obchodní podmínky (VOP)
          </button>
          <button
            onClick={() => setActiveTab('gdpr')}
            className={`btn ${activeTab === 'gdpr' ? 'btn-primary' : 'btn-secondary'}`}
            style={{
              width: '100%',
              padding: '14px',
              fontWeight: '800',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '13px'
            }}
          >
            <span>🔒</span> Ochrana osobních údajů (GDPR)
          </button>

          <div className="glass-panel" style={{ padding: '20px', fontSize: '12px', color: 'var(--text-muted)', marginTop: '20px', lineHeight: '1.5' }}>
            <strong>Potřebujete poradit?</strong><br />
            Máte-li jakékoliv dotazy k našim podmínkám, kontaktujte nás na <span style={{ color: 'var(--color-gold)' }}>info@northvaletcg.eu</span> nebo navštivte naši partnerskou pobočku Coffee & Cards v Pardubicích.
          </div>
        </aside>

        {/* Right Side: Document Content Display */}
        <main className="glass-panel" style={{
          flex: '3 1 500px',
          padding: '40px',
          boxSizing: 'border-box',
          lineHeight: '1.6'
        }}>
          {activeTab === 'vop' ? (
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: '800', margin: '0 0 20px 0', color: 'var(--text-main)', fontFamily: 'var(--font-heading)' }}>
                Všeobecné obchodní podmínky (VOP)
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '24px' }}>Poslední aktualizace: 28. května 2026</p>

              <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>1. Úvodní ustanovení</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Tyto všeobecné obchodní podmínky (dále jen „obchodní podmínky“) obchodní společnosti NORTHVALE TCG (dále jen „prodávající“) upravují vzájemná práva a povinnosti smluvních stran vzniklé v souvislosti nebo na základě kupní smlouvy uzavírané mezi prodávajícím a jinou fyzickou či právnickou osobou (dále jen „kupující“) prostřednictvím internetového obchodu prodávajícího.
              </p>

              <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>2. Uživatelský účet a Store Kredit</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Na základě registrace kupujícího provedené na webové stránce může kupující přistupovat do svého uživatelského rozhraní. Zde může provádět objednávky, sledovat stav svého gradingu a spravovat svůj <strong>Store Kredit</strong>. Store Kredit je virtuální peněženka, kterou lze plnit prostřednictvím výkupu karet (Buylist). Při volbě vyplacení výkupu ve Store Kreditu získává kupující automatický bonus +25 % k výkupní hodnotě. Store Kredit není směnitelný za reálné peněžní prostředky.
              </p>

              <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>3. Kupní smlouva a objednávka</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Veškerá prezentace zboží umístěná v katalogu obchodu (kusové karty, zapečetěné boxy, příslušenství) je informativního charakteru a prodávající není povinen uzavřít kupní smlouvu ohledně tohoto zboží. Smluvní vztah mezi prodávajícím a kupujícím vzniká doručením přijetí objednávky (akceptací), jež je prodávajícím zasláno kupujícímu elektronickou poštou na adresu kupujícího.
              </p>

              <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>4. Cena zboží a Platební podmínky</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Ceny zboží jsou uvedeny včetně daně z přidané hodnoty. Kupující může platit online platební kartou, bankovním převodem, nebo uplatněním svého Store Kreditu v pokladně. U objednávek kusových karet garantujeme bezpečné sběratelské balení (penny sleeve, toploader, team bag a kartonový sendvič bez použití izolepy přímo na toploaderu).
              </p>

              <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>5. Odstoupení od smlouvy a Reklamace</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Kupující má v souladu s ustanovením § 1829 odst. 1 občanského zákoníku právo odstoupit od kupní smlouvy, a to do čtrnácti (14) dnů od převzetí zboží. Vzhledem k povaze kusových karet (Singles) musí být vrácené karty ve stejném deklarovaném stavu (např. Near Mint), v jakém byly odeslány. Jakékoliv poškození karty způsobené nevhodným zacházením kupujícího ruší právo na vrácení plné částky.
              </p>
            </div>
          ) : (
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: '800', margin: '0 0 20px 0', color: 'var(--text-main)', fontFamily: 'var(--font-heading)' }}>
                Ochrana osobních údajů (GDPR)
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '24px' }}>Poslední aktualizace: 28. května 2026</p>

              <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>1. Základní ustanovení</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Správcem osobních údajů podle čl. 4 bod 7 nařízení Evropského parlamentu a Rady (EU) 2016/679 o ochraně fyzických osob v souvislosti se zpracováním osobních údajů a o volném pohybu těchto údajů (dále jen „GDPR“) je provozovatel internetového obchodu NORTHVALE TCG.
              </p>

              <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>2. Zdroje a kategorie zpracovávaných osobních údajů</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Správce zpracovává osobní údaje, které jste mu poskytl/a nebo osobní údaje, které správce získal na základě plnění Vaší objednávky:
                <br />• Jméno a příjmení
                <br />• E-mailová adresa
                <br />• Telefonní číslo
                <br />• Fakturační a doručovací adresa
              </p>

              <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>3. Zákonný důvod a účel zpracování osobních údajů</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Zákonným důvodem zpracování osobních údajů je plnění smlouvy mezi Vámi a správcem podle čl. 6 odst. 1 písm. b) GDPR a oprávněný zájem správce na poskytování přímého marketingu (zejména pro zasílání obchodních sdělení a newsletterů) podle čl. 6 odst. 1 písm. f) GDPR.
              </p>

              <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>4. Doba uchovávání údajů</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Správce uchovává osobní údaje po dobu nezbytnou k výkonu práv a povinností vyplývajících ze smluvního vztahu mezi Vámi a správcem a uplatňování nároků z těchto smluvních vztahů (po dobu 15 let od ukončení smluvního vztahu).
              </p>

              <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-gold)', margin: '20px 0 10px 0' }}>5. Příjemci osobních údajů (subdodavatelé správce)</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Příjemci osobních údajů jsou osoby podílející se na dodání zboží a realizaci plateb na základě smlouvy (např. Zásilkovna, Česká pošta, DPD, platební brána) a zajišťující služby provozu e-shopu a marketingu. Osobní data kupujících jsou bezpečně šifrována a nejsou předávána třetím stranám pro reklamní účely.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
