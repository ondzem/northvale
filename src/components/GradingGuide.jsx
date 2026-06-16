import { FEATURE_FLAGS } from '../config';
import { useTranslation } from '../context/LanguageContext';

export default function GradingGuide({ setActivePage }) {
  const { lang } = useTranslation();

  const standards = lang === 'CZ' ? [
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
  ] : [
    {
      condition: 'Near Mint (NM)',
      desc: 'Card is in pristine condition, virtually indistinguishable from freshly pack-pulled.',
      corners: 'Sharp with zero wear, or at most one tiny white speck (micro-whitening).',
      edges: 'Sharp and clean, without any signs of friction or silvering.',
      surface: 'Clean with no scratches, fingerprints, cloudiness, or loss of gloss.'
    },
    {
      condition: 'Excellent (EX)',
      desc: 'Well-preserved card with minor signs of handling, still excellent for collectors.',
      corners: 'Minor white specks on corners (maximum 2–3 specks).',
      edges: 'Very light silvering/whitening along one edge.',
      surface: 'May have fine hairline scratches visible only under direct light.'
    },
    {
      condition: 'Good (GD)',
      desc: 'Visibly played card, but without bends or severe mechanical damage.',
      corners: 'Clear whitening on multiple corners.',
      edges: 'Moderate wear/whitening along the perimeter.',
      surface: 'Minor scratches and slight cloudiness or minor surface grime.'
    },
    {
      condition: 'Light Played (LP)',
      desc: 'Card with significant wear caused by unsleeved play.',
      corners: 'Visible corner wear, slightly rounded or frayed.',
      edges: 'Heavier, continuous whitening along multiple edges.',
      surface: 'Friction wear, loss of original sheen, multiple fine scratches or small dents.'
    },
    {
      condition: 'Played (PL)',
      desc: 'Card in poor shape with heavy wear from play and handling.',
      corners: 'Heavy wear, corners may show slight creases or severe fraying.',
      edges: 'Severely worn and frayed edges.',
      surface: 'Major scratches, surface dirt, or minor creases that do not affect card structural integrity.'
    },
    {
      condition: 'Poor (PO)',
      desc: 'Extremely damaged card, unsuitable for collections, playable only in opaque sleeves.',
      corners: 'Severely frayed, split, or destroyed corners.',
      edges: 'Severely damaged, torn, or frayed edges.',
      surface: 'Deep creases running across the card, written on, inked, or damaged by water.'
    }
  ];

  return (
    <div style={styles.container} className="container fade-in">
      <h1 className="sr-only">
        {lang === 'CZ' 
          ? 'Průvodce stavy a grading standardy karet - NORTHVALE' 
          : 'Card Condition Guide & Grading Standards - NORTHVALE'}
      </h1>

      <div style={styles.headerRow}>
        <h2 style={styles.heading}>
          {lang === 'CZ' ? 'Průvodce stavy TCG karet' : 'TCG Card Condition Guide'}
        </h2>
        <p style={styles.subtext}>
          {lang === 'CZ'
            ? 'Při výkupu i prodeji kusových karet se držíme přísných evropských standardů. Zde naleznete přehledný popis, podle kterého hodnotíme opotřebení hran, rohů a povrchu.'
            : 'When buying and selling single cards, we adhere strictly to premium grading standards. Here is a detailed description of how we evaluate wear on corners, edges, and card surfaces.'}
        </p>
      </div>

      <div style={styles.tableWrapper} className="glass-panel">
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>{lang === 'CZ' ? 'Stav karty' : 'Card Condition'}</th>
              <th style={styles.th}>{lang === 'CZ' ? 'Obecný popis' : 'Overview'}</th>
              <th style={styles.th}>{lang === 'CZ' ? 'Rohy' : 'Corners'}</th>
              <th style={styles.th}>{lang === 'CZ' ? 'Hrany' : 'Edges'}</th>
              <th style={styles.th}>{lang === 'CZ' ? 'Povrch' : 'Surface'}</th>
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
              <h3 style={styles.bottomHeading}>
                {lang === 'CZ' ? 'Potřebujete ohodnotit své karty profesionálně?' : 'Do you need your cards professionally graded?'}
              </h3>
              <p style={styles.bottomText}>
                {lang === 'CZ'
                  ? 'Pokud chcete mít jistotu a ochránit sběratelskou hodnotu svých karet natrvalo, doporučujeme naši zprostředkovatelskou službu gradingu v USA (PSA, Beckett, TAG). Vaše karty před odesláním důkladně zkontrolujeme.'
                  : 'If you want to protect the collectible value of your cards permanently, we recommend our grading submission service to the USA (PSA, Beckett, TAG). We inspect your cards thoroughly before dispatch.'}
              </p>
            </>
          ) : (
            <>
              <h3 style={styles.bottomHeading}>
                {lang === 'CZ' ? 'Chcete nám prodat své karty?' : 'Want to sell your cards to us?'}
              </h3>
              <p style={styles.bottomText}>
                {lang === 'CZ'
                  ? 'Nabídněte nám své přebytečné kusové karty nebo celou sbírku a získejte peníze na bankovní účet nebo store credit.'
                  : 'Offer us your spare singles or your entire collection and receive payouts directly to your bank account or as Store Credit.'}
              </p>
            </>
          )}
          <div style={styles.btnRow}>
            {FEATURE_FLAGS.showGrading && (
              <button className="btn btn-primary" onClick={() => setActivePage('grading')}>
                {lang === 'CZ' ? 'Přejít na objednávku gradingu' : 'Go to Grading Submission'}
              </button>
            )}
            {FEATURE_FLAGS.showBuylist && (
              <button className="btn btn-secondary" onClick={() => setActivePage('buylist')}>
                {lang === 'CZ' ? 'Přejít na výkup karet (Buylist)' : 'Go to Card Buylist'}
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
    backgroundColor: 'rgba(253, 189, 22, 0.15)',
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
