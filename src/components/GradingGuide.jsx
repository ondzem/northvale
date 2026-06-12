import { FEATURE_FLAGS } from '../config';

export default function GradingGuide({ setActivePage }) {
  const standards = [
    {
      condition: 'Near Mint (NM)',
      desc: 'Karta ve špičkovém stavu, téměř k nerozeznání od čerstvě vytažené z balíčku.',
      corners: 'Bez opotřebení nebo pouze jeden nepatrný bílý bod (micro-whitening).',
      edges: 'Ostré, čisté, bez stop ošoupání.',
      surface: 'Čistý bez škrábanců, otisků prstů či ztráty lesku.'
    },
    {
      condition: 'Excellent (EX)',
      desc: 'Velmi zachovalá karta s drobnými známkami manipulace, stále vhodná do sbírky.',
      corners: 'Drobné bílé tečky v rozích (maximálně 2-3 body).',
      edges: 'Velmi jemné ošoupání na jedné straně.',
      surface: 'Mohou se vyskytnout jemné mikro-škrábance viditelné pouze pod přímým světlem.'
    },
    {
      condition: 'Good (GD)',
      desc: 'Viditelně hraná karta, ale bez ohybů či vážného poškození.',
      corners: 'Zřetelné opotřebení (whitening) na více rozích.',
      edges: 'Mírné ošoupání po celém obvodu karty.',
      surface: 'Drobné škrábance a slabé znečištění.'
    },
    {
      condition: 'Light Played (LP)',
      desc: 'Karta s výrazným opotřebením způsobeným častějším hraním bez obalů.',
      corners: 'Výrazné zaoblení a roztřepení rohů.',
      edges: 'Silné a souvislé opotřebení hran (bílé okraje).',
      surface: 'Matný povrch s četnými škrábanci, drobné otlačeniny.'
    },
    {
      condition: 'Played (PL)',
      desc: 'Karta ve špatném stavu s těžkým opotřebením.',
      corners: 'Těžké opotřebení, rohy mohou být částečně ohnuté.',
      edges: 'Silně ošoupané a roztřepené hrany.',
      surface: 'Výrazné škrábance, špína, drobný ohyb (crease) nezasahující celou kartu.'
    },
    {
      condition: 'Poor (PO)',
      desc: 'Extrémně poškozená karta, nevhodná do sbírky, hratelná pouze v neprůhledných obalech.',
      corners: 'Roztřepené a zničené rohy.',
      edges: 'Těžce poškozené, potrhané nebo roztřepené hrany.',
      surface: 'Hluboké ohyby přes celou kartu, popsaná, pomalovaná nebo poškozená vodou.'
    }
  ];

  return (
    <div style={styles.container} className="container fade-in">
      <h1 className="sr-only">Průvodce stavy a grading standardy karet - NORTHVALE</h1>

      <div style={styles.headerRow}>
        <h2 style={styles.heading}>Průvodce stavy TCG karet</h2>
        <p style={styles.subtext}>
          Při výkupu i prodeji kusových karet se držíme přísných evropských standardů. Zde naleznete přehledný popis, podle kterého hodnotíme opotřebení hran, rohů a povrchu.
        </p>
      </div>

      <div style={styles.tableWrapper} className="glass-panel">
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Stav karty</th>
              <th style={styles.th}>Obecný popis</th>
              <th style={styles.th}>Rohy</th>
              <th style={styles.th}>Hrany</th>
              <th style={styles.th}>Povrch</th>
            </tr>
          </thead>
          <tbody>
            {standards.map((st, idx) => (
              <tr key={idx} style={styles.tr}>
                <td style={styles.tdCond}>
                  <span style={styles.condBadge}>{st.condition}</span>
                </td>
                <td style={styles.tdDesc}>{st.desc}</td>
                <td style={styles.tdDetail}>{st.corners}</td>
                <td style={styles.tdDetail}>{st.edges}</td>
                <td style={styles.tdDetail}>{st.surface}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(FEATURE_FLAGS.showGrading || FEATURE_FLAGS.showBuylist) && (
        <div style={styles.bottomCard} className="glass-panel">
          {FEATURE_FLAGS.showGrading ? (
            <>
              <h3 style={styles.bottomHeading}>Potřebujete ohodnotit Své karty profesionálně?</h3>
              <p style={styles.bottomText}>
                Pokud chcete mít jistotu a ochránit sběratelskou hodnotu Svých karet natrvalo, doporučujeme naši zprostředkovatelskou službu gradingu v USA (PSA, Beckett, TAG). Vaše karty před odesláním důkladně zkontrolujeme.
              </p>
            </>
          ) : (
            <>
              <h3 style={styles.bottomHeading}>Chcete nám prodat Své karty?</h3>
              <p style={styles.bottomText}>
                Nabídněte nám své přebytečné kusové karty nebo celou sbírku a získejte peníze na bankovní účet nebo store credit.
              </p>
            </>
          )}
          <div style={styles.btnRow}>
            {FEATURE_FLAGS.showGrading && (
              <button className="btn btn-primary" onClick={() => setActivePage('grading')}>
                Přejít na objednávku gradingu
              </button>
            )}
            {FEATURE_FLAGS.showBuylist && (
              <button className="btn btn-secondary" onClick={() => setActivePage('buylist')}>
                Přejít na výkup karet (Buylist)
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    paddingTop: '20px',
    paddingBottom: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '32px',
    textAlign: 'left',
  },
  headerRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  heading: {
    fontSize: '22px',
    fontWeight: '800',
    margin: 0,
    fontFamily: 'var(--font-heading)',
  },
  subtext: {
    fontSize: '14px',
    color: 'var(--text-muted)',
    lineHeight: '1.5',
    margin: 0,
    maxWidth: '700px',
  },
  tableWrapper: {
    overflowX: 'auto',
    padding: '24px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '13px',
  },
  th: {
    textAlign: 'left',
    color: 'var(--text-main)',
    fontWeight: '700',
    paddingBottom: '12px',
    borderBottom: '2px solid rgba(255,255,255,0.06)',
    textTransform: 'uppercase',
    fontSize: '12px',
    letterSpacing: '0.5px',
  },
  tr: {
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    '&:last-child': {
      borderBottom: 'none',
    }
  },
  tdCond: {
    padding: '16px 0',
    verticalAlign: 'top',
    paddingRight: '20px',
  },
  condBadge: {
    fontSize: '11px',
    fontWeight: '800',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    color: 'var(--color-gold)',
    padding: '4px 10px',
    borderRadius: 'var(--radius-sm)',
    whiteSpace: 'nowrap',
  },
  tdDesc: {
    padding: '16px 0',
    verticalAlign: 'top',
    color: 'var(--text-main)',
    fontWeight: '600',
    paddingRight: '20px',
    minWidth: '180px',
    lineHeight: '1.4',
  },
  tdDetail: {
    padding: '16px 0',
    verticalAlign: 'top',
    color: 'var(--text-muted)',
    paddingRight: '20px',
    minWidth: '150px',
    lineHeight: '1.4',
  },
  bottomCard: {
    padding: '30px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  bottomHeading: {
    fontSize: '18px',
    fontWeight: '800',
    margin: 0,
  },
  bottomText: {
    fontSize: '14px',
    color: 'var(--text-muted)',
    lineHeight: '1.6',
    margin: 0,
    maxWidth: '800px',
  },
  btnRow: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    marginTop: '6px',
  }
};
