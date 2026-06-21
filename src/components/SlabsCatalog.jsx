import { useState, useEffect } from 'react';
import ProductCard from './ProductCard';
import { useTranslation } from '../context/LanguageContext';
import DealOfTheDay from './DealOfTheDay';

const subSubcategoriesConfig = {
  'PSA': {
    title: 'PSA Graded Slabs',
    desc: {
      CZ: 'PSA (Professional Sports Authenticator) je největší a nejdůvěryhodnější nezávislá gradingová společnost na světě. Karty ohodnocené známkou PSA 10 Gem Mint představují absolutní stavový vrchol a jsou vysoce vyhledávaným sběratelským i investičním artiklem s maximální likviditou.',
      EN: 'PSA (Professional Sports Authenticator) is the largest and most trusted third-party grading company in the world. Cards graded PSA 10 Gem Mint represent the absolute peak condition and are a highly sought-after collectible and investment asset with maximum liquidity.'
    },
    subsubcats: [
      { id: 'all', name: { CZ: 'Všechny PSA Slabs', EN: 'All PSA Slabs' }, icon: '💎' },
      { id: 'Grade 10 Gem Mint', name: 'PSA 10 Gem Mint', icon: '🏆' },
      { id: 'Grade 9.5 Mint', name: 'PSA 9.5 Mint', icon: '🌟' }
    ]
  },
  'Beckett': {
    title: 'Beckett (BGS) Graded Slabs',
    desc: {
      CZ: 'Beckett Grading Services (BGS) je proslulý svými extrémně přísnými standardy a detailními dílčími známkami (Subgrades) za centrování, rohy, hrany a povrch. Zlatý štítek BGS 9.5 nebo BGS 10 je symbolem prvotřídního stavu karty.',
      EN: 'Beckett Grading Services (BGS) is renowned for its extremely strict standards and detailed subgrades for centering, corners, edges, and surface. A golden label BGS 9.5 or BGS 10 is a symbol of a card in pristine condition.'
    },
    subsubcats: [
      { id: 'all', name: { CZ: 'Všechny Beckett Slabs', EN: 'All Beckett Slabs' }, icon: '💎' },
      { id: 'Grade 10 Gem Mint', name: 'BGS 10 Gem Mint', icon: '🏆' },
      { id: 'Grade 9.5 Mint', name: 'BGS 9.5 Mint', icon: '🌟' }
    ]
  },
  'TAG': {
    title: 'TAG Graded Slabs',
    desc: {
      CZ: 'TAG (Technical Assessment Group) přináší revoluci do gradingu pomocí plně automatizované laserové a počítačové analýzy. Odstraňuje lidský faktor a poskytuje stoprocentně konzistentní hodnocení doprovázené detailním digitálním reportem stavu karty.',
      EN: 'TAG (Technical Assessment Group) revolutionizes grading with fully automated laser and computer analysis. It eliminates human bias and provides 100% consistent grading accompanied by a detailed digital report of the card\'s condition.'
    },
    subsubcats: [
      { id: 'all', name: { CZ: 'Všechny TAG Slabs', EN: 'All TAG Slabs' }, icon: '💎' },
      { id: 'Grade 10 Gem Mint', name: 'TAG 10 Gem Mint', icon: '🏆' },
      { id: 'Grade 9.5 Mint', name: 'TAG 9.5 Mint', icon: '🌟' }
    ]
  },
  'CGC': {
    title: 'CGC Graded Slabs',
    desc: {
      CZ: 'CGC Cards je přední gradingová autorita specializující se na sběratelské karetní hry. Nabízí moderní, křišťálově čistá pouzdra s vynikající optikou, která nechají vyniknout barvám a detailům vaší karty.',
      EN: 'CGC Cards is a leading grading authority specializing in trading card games. It offers modern, crystal-clear cases with excellent optics that make the colors and details of your card stand out.'
    },
    subsubcats: [
      { id: 'all', name: { CZ: 'Všechny CGC Slabs', EN: 'All CGC Slabs' }, icon: '💎' },
      { id: 'Grade 10 Gem Mint', name: 'CGC 10 Gem Mint', icon: '🏆' },
      { id: 'Grade 9.5 Mint', name: 'CGC 9.5 Mint', icon: '🌟' }
    ]
  }
};


function ChevronIcon() {
  return (
    <span className="chevron-icon" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width="10" 
        height="10" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="3" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      >
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
    </span>
  );
}

export default function SlabsCatalog({ products, addToCart, setSelectedProductId, setActivePage, filters, setFilters, searchQuery, setSearchQuery }) {
  const { lang, t } = useTranslation();
  const [selectedCompanies, setSelectedCompanies] = useState(filters.company ? [filters.company] : []);
  const [onlyGrade10, setOnlyGrade10] = useState(false);
  const [grade95AndAbove, setGrade95AndAbove] = useState(false);
  const [grade9AndAbove, setGrade9AndAbove] = useState(false);
  const [selectedLangs, setSelectedLangs] = useState([]);
  const [priceRange, setPriceRange] = useState(45000);

  const [activeSubcategory, setActiveSubcategory] = useState(filters.company || 'all');
  const [activeSubsubcategory, setActiveSubsubcategory] = useState(filters.subsubcat || 'all');

  // Collapsible sections state
  const [expandedSections, setExpandedSections] = useState({
    search: true,
    grading: true,
    grade: false,
    lang: false,
    price: true
  });

  const toggleSection = (sec) => {
    setExpandedSections(prev => ({ ...prev, [sec]: !prev[sec] }));
  };

  // Prev filters sync
  const [prevFilters, setPrevFilters] = useState(filters);
  if (filters !== prevFilters) {
    setPrevFilters(filters);
    if (filters.company) {
      setSelectedCompanies([filters.company]);
      setActiveSubcategory(filters.company);
    } else {
      setSelectedCompanies([]);
      setActiveSubcategory('all');
    }
    setActiveSubsubcategory(filters.subsubcat || 'all');
  }

  // Expandable description state
  const [isDescExpanded, setIsDescExpanded] = useState(false);

  // Sorting
  const [sortBy, setSortBy] = useState('top');

  // Mobile filters sidebar
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  useEffect(() => {
    if (mobileFiltersOpen) {
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
    } else {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    }
    return () => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    };
  }, [mobileFiltersOpen]);

  // Base list of slabs
  const slabs = products.filter(p => p.type === 'slab');
  const baseSlabs = slabs; // All slabs represent the base set here since slabs are relatively fewer

  const companies = ['PSA', 'Beckett', 'CGC', 'TAG'];
  const languages = [
    { code: 'EN', name: lang === 'CZ' ? 'Angličtina (EN) 🇬🇧' : 'English (EN) 🇬🇧' },
    { code: 'JP', name: lang === 'CZ' ? 'Japonština (JP) 🇯🇵' : 'Japanese (JP) 🇯🇵' },
    { code: 'CN', name: lang === 'CZ' ? 'Čínština (CN) 🇨🇳' : 'Chinese (CN) 🇨🇳' }
  ];

  // Helper mappings
  const getSlabLang = (p) => {
    const nameLower = p.name.toLowerCase();
    if (nameLower.includes('chinese') || nameLower.includes('cn')) return 'CN';
    if (nameLower.includes('japanese') || nameLower.includes('jp')) return 'JP';
    return 'EN';
  };

  // Counts helpers
  const getCompanyCount = (comp) => {
    return baseSlabs.filter(p => p.company === comp).length;
  };

  const getGradeRangeCount = (range) => {
    if (range === '10') return baseSlabs.filter(p => p.grade === 10).length;
    if (range === '9.5+') return baseSlabs.filter(p => p.grade >= 9.5).length;
    if (range === '9+') return baseSlabs.filter(p => p.grade >= 9).length;
    return 0;
  };

  const getLangCount = (langCode) => {
    return baseSlabs.filter(p => getSlabLang(p) === langCode).length;
  };

  // Filter logic
  const filteredSlabs = slabs.filter(product => {
    // Search query filter
    if (searchQuery && 
        !product.name.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !(product.edition && product.edition.toLowerCase().includes(searchQuery.toLowerCase()))) {
      return false;
    }

    // Certifying Company Filter (sidebar checkboxes or top active subcategory)
    if (selectedCompanies.length > 0 && !selectedCompanies.includes(product.company)) return false;

    // Active subcategory (Company) sync
    if (activeSubcategory !== 'all' && product.company !== activeSubcategory) return false;

    // Subsubcategory (Grade Score Category) Filter
    if (activeSubsubcategory !== 'all' && product.subsubcategory !== activeSubsubcategory) return false;

    // Grade ranges filter
    if (onlyGrade10 || grade95AndAbove || grade9AndAbove) {
      let matchesAny = false;
      if (onlyGrade10 && product.grade === 10) matchesAny = true;
      if (grade95AndAbove && product.grade >= 9.5) matchesAny = true;
      if (grade9AndAbove && product.grade >= 9) matchesAny = true;
      if (!matchesAny) return false;
    }

    // Language filter
    if (selectedLangs.length > 0 && !selectedLangs.includes(getSlabLang(product))) return false;

    // Price Filter
    if (product.price > priceRange) return false;

    return true;
  });

  // Sort logic
  const sortedSlabs = [...filteredSlabs].sort((a, b) => {
    if (sortBy === 'expensive') return b.price - a.price;
    if (sortBy === 'cheap') return a.price - b.price;
    if (sortBy === 'new') return b.id.localeCompare(a.id); // mock sort
    return 0; // Default: top
  });

  const subcategories = [
    { id: 'all', name: lang === 'CZ' ? 'Všechny Slabs' : 'All Slabs', icon: <img src="/Ohodnoceni karet.webp" alt="" className="subcategory-img" /> },
    { id: 'PSA', name: 'PSA Slabs', icon: <img src="https://images.pokemontcg.io/sv3/223.png" alt="" className="subcategory-img" /> },
    { id: 'Beckett', name: 'Beckett Slabs', icon: <img src="https://images.pokemontcg.io/swsh4/188.png" alt="" className="subcategory-img" /> },
    { id: 'TAG', name: 'TAG Slabs', icon: <img src="https://images.pokemontcg.io/swsh7/215.png" alt="" className="subcategory-img" /> },
    { id: 'CGC', name: 'CGC Slabs', icon: <img src="https://images.pokemontcg.io/swsh11/186.png" alt="" className="subcategory-img" /> }
  ];

  const getSubSubcatName = (cat, subcat) => {
    const entry = subSubcategoriesConfig[cat]?.subsubcats?.find(s => s.id === subcat);
    if (!entry) return subcat;
    return typeof entry.name === 'object' ? entry.name[lang] : entry.name;
  };

  return (
    <div className="container fade-in" style={{ paddingTop: '20px', paddingBottom: '40px' }}>
      <h1 className="sr-only">{lang === 'CZ' ? 'Katalog ohodnocených TCG karet (Slabs) - NORTHVALE' : 'Catalog of Graded TCG Cards (Slabs) - NORTHVALE'}</h1>

      {/* Breadcrumbs Navigation */}
      {(selectedCompanies.length > 0 || activeSubcategory !== 'all') && (
        <nav className="breadcrumbs-nav" aria-label={lang === 'CZ' ? 'Drobečková navigace' : 'Breadcrumbs'}>
          <span className="breadcrumb-item" onClick={() => setActivePage('home')}>{t('common.home')}</span>
          
          {activeSubcategory !== 'all' && (
            <>
              <span className="breadcrumb-separator">/</span>
              {activeSubsubcategory === 'all' ? (
                <span className="breadcrumb-item active">
                  {subcategories.find(s => s.id === activeSubcategory)?.name || activeSubcategory}
                </span>
              ) : (
                <span 
                  className="breadcrumb-item" 
                  onClick={() => { 
                    setActiveSubsubcategory('all'); 
                    setFilters(prev => ({ ...prev, subsubcat: undefined })); 
                  }}
                >
                  {subcategories.find(s => s.id === activeSubcategory)?.name || activeSubcategory}
                </span>
              )}
            </>
          )}

          {activeSubsubcategory !== 'all' && (
            <>
              <span className="breadcrumb-separator">/</span>
              <span className="breadcrumb-item active">
                {getSubSubcatName(activeSubcategory, activeSubsubcategory)}
              </span>
            </>
          )}
        </nav>
      )}

      {/* Main Split Layout */}
      <div className="catalog-split-container">
        
        {/* LEFT COLUMN: Sidebar Filters & Deal of the Day */}
        <aside className={`catalog-sidebar ${mobileFiltersOpen ? 'mobile-open' : ''}`}>

          {/* Mobile Sidebar Close Button */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="catalog-sidebar-title">{lang === 'CZ' ? 'Filtry a akce' : 'Filters & Actions'}</h3>
            <button 
              className="mobile-only-close-btn"
              onClick={() => setMobileFiltersOpen(false)}
            >
              ✕
            </button>
          </div>

          {/* Deal of the Day Sidebar Widget */}
          <DealOfTheDay 
            products={products}
            addToCart={addToCart}
            setSelectedProductId={setSelectedProductId}
            setActivePage={setActivePage}
          />

          {/* Filter: {lang === 'CZ' ? 'Gradingová firma' : 'Grading Company'} */}
          <div className="sidebar-filter-section">
            <h4 className={`sidebar-filter-title collapsible ${expandedSections.grading ? 'active' : ''}`} onClick={() => toggleSection('grading')}>
              {lang === 'CZ' ? 'Gradingová firma' : 'Grading Company'}
              <ChevronIcon />
            </h4>
            {expandedSections.grading && (
              <div className="sidebar-checkbox-list">
                {companies.map(comp => {
                  const count = getCompanyCount(comp);
                  const isDisabled = count === 0;
                  return (
                    <label key={comp} className={`sidebar-checkbox-label ${isDisabled ? 'disabled' : ''}`}>
                      <input
                        type="checkbox"
                        checked={selectedCompanies.includes(comp)}
                        onChange={() => {
                          setSelectedCompanies(prev => {
                            const next = prev.includes(comp) ? prev.filter(c => c !== comp) : [...prev, comp];
                            if (next.length === 1) {
                              setActiveSubcategory(next[0]);
                            } else {
                              setActiveSubcategory('all');
                            }
                            return next;
                          });
                        }}
                        disabled={isDisabled}
                        className="sidebar-checkbox"
                      />
                      <span>{comp}</span>
                      <span className="filter-badge">{count}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Filter: Search within category */}
          <div className="sidebar-filter-section">
            <h4 className={`sidebar-filter-title collapsible ${expandedSections.search ? 'active' : ''}`} onClick={() => toggleSection('search')}>
              {lang === 'CZ' ? 'Hledat název karty' : 'Search Card Name'}
              <ChevronIcon />
            </h4>
            {expandedSections.search && (
              <input 
                type="text" 
                placeholder={lang === 'CZ' ? 'Zadejte název...' : 'Search by name...'} 
                value={searchQuery || ''} 
                onChange={(e) => setSearchQuery(e.target.value)} 
                className="sidebar-search-input"
              />
            )}
          </div>

          {/* Filter: {lang === 'CZ' ? 'Výsledná známka' : 'Grade'} */}
          <div className="sidebar-filter-section">
            <h4 className={`sidebar-filter-title collapsible ${expandedSections.grade ? 'active' : ''}`} onClick={() => toggleSection('grade')}>
              {lang === 'CZ' ? 'Výsledná známka' : 'Grade'}
              <ChevronIcon />
            </h4>
            {expandedSections.grade && (
              <div className="sidebar-checkbox-list">
                {[
                  { id: '10', label: lang === 'CZ' ? 'Pouze známka 10 🏆' : 'Grade 10 only 🏆', checked: onlyGrade10, setter: setOnlyGrade10 },
                  { id: '9.5+', label: lang === 'CZ' ? 'Známka 9.5 a vyšší 🌟' : 'Grade 9.5 & above 🌟', checked: grade95AndAbove, setter: setGrade95AndAbove },
                  { id: '9+', label: lang === 'CZ' ? 'Známka 9 a vyšší ✨' : 'Grade 9 & above ✨', checked: grade9AndAbove, setter: setGrade9AndAbove }
                ].map(gr => {
                  const count = getGradeRangeCount(gr.id);
                  const isDisabled = count === 0;
                  return (
                    <label key={gr.id} className={`sidebar-checkbox-label ${isDisabled ? 'disabled' : ''}`}>
                      <input
                        type="checkbox"
                        checked={gr.checked}
                        onChange={() => gr.setter(!gr.checked)}
                        disabled={isDisabled}
                        className="sidebar-checkbox"
                      />
                      <span>{gr.label}</span>
                      <span className="filter-badge">{count}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Filter: Jazyk karty */}
          <div className="sidebar-filter-section">
            <h4 className={`sidebar-filter-title collapsible ${expandedSections.lang ? 'active' : ''}`} onClick={() => toggleSection('lang')}>
              {lang === 'CZ' ? 'Jazyk karty' : 'Card Language'}
              <ChevronIcon />
            </h4>
            {expandedSections.lang && (
              <div className="sidebar-checkbox-list">
                {languages.map(lang => {
                  const count = getLangCount(lang.code);
                  const isDisabled = count === 0;
                  return (
                    <label key={lang.code} className={`sidebar-checkbox-label ${isDisabled ? 'disabled' : ''}`}>
                      <input
                        type="checkbox"
                        checked={selectedLangs.includes(lang.code)}
                        onChange={() => {
                          setSelectedLangs(prev =>
                            prev.includes(lang.code) ? prev.filter(l => l !== lang.code) : [...prev, lang.code]
                          );
                        }}
                        disabled={isDisabled}
                        className="sidebar-checkbox"
                      />
                      <span>{lang.name}</span>
                      <span className="filter-badge">{count}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Filter: Price Range slider */}
          <div className="sidebar-filter-section">
            <h4 className={`sidebar-filter-title collapsible ${expandedSections.price ? 'active' : ''}`} onClick={() => toggleSection('price')}>
              {lang === 'CZ' ? 'Maximální cena' : 'Max Price'}
              <ChevronIcon />
            </h4>
            {expandedSections.price && (
              <div className="sidebar-range-box">
                <input 
                  type="range" 
                  min="0" 
                  max="45000" 
                  step="500"
                  value={priceRange} 
                  onChange={(e) => setPriceRange(Number(e.target.value))} 
                  className="sidebar-range-input"
                />
                <span className="sidebar-range-value">{priceRange.toLocaleString()} {lang === 'CZ' ? 'Kč' : 'CZK'}</span>
              </div>
            )}
          </div>

          {/* Clear Filters Button */}
          <button 
            className="btn btn-secondary sidebar-reset-btn"
            onClick={() => {
              setSelectedCompanies([]);
              setOnlyGrade10(false);
              setGrade95AndAbove(false);
              setGrade9AndAbove(false);
              setSelectedLangs([]);
              setPriceRange(45000);
              setActiveSubcategory('all');
              setActiveSubsubcategory('all');
              setExpandedSections({
                search: true,
                grading: true,
                grade: false,
                lang: false,
                price: true
              });
              setSearchQuery('');
              setFilters({});
              setMobileFiltersOpen(false);
            }}
          >
            {lang === 'CZ' ? 'Smazat filtry' : 'Clear Filters'}
          </button>
        </aside>

        {/* RIGHT COLUMN: Headers, Subcategories, Toolbar & Products Grid */}
        <main className="catalog-main">
          
          {/* Header Introduction Box */}
          {activeSubcategory === 'all' ? (
            <div className="category-intro-box">
              <div style={{ fontSize: '11px', color: 'var(--color-gold)', fontWeight: '800', textTransform: 'uppercase', marginBottom: '4px' }}>
                {lang === 'CZ' ? 'Ohodnocené karty' : 'Graded Cards'}
              </div>
              <h2 className="category-title">Graded Slabs</h2>
              <div className="category-description-wrapper">
                <p className={`category-description-text ${!isDescExpanded ? 'collapsed' : ''}`}>
                  {lang === 'CZ' 
                    ? 'Sběratelská špička a nejbezpečnější forma investování do sběratelských karet. Ohodnocené karty (Slabs) jsou profesionálně certifikovány nezávislými autoritami jako PSA, Beckett (BGS), TAG či CGC. Každá karta je uzavřena v ochranném akrylátovém pouzdře s unikátním certifikačním číslem a výslednou známkou stavu na stupnici od 1 do 10. Certifikace zaručuje nejen stoprocentní pravost karty, ale také přesné a objektivní posouzení stavu rohů, hran, povrchu a centrování. V naší nabídce naleznete výhradně kousky s vysokým hodnocením (převážně 9 Gem Mint a 10 Gem Mint). Tyto karty mají nejvyšší likviditu a stabilní růst hodnoty na globálním trhu. Certifikaci každé karty si můžete ověřit přímo v oficiálních databázích gradingových firem pomocí certifikačního kódu uvedeného na štítku.'
                    : 'The pinnacle of collecting and the safest way to invest in trading cards. Graded cards (Slabs) are professionally certified by independent authorities such as PSA, Beckett (BGS), TAG, or CGC. Each card is sealed in a protective acrylic holder with a unique certification number and a final grade scale from 1 to 10. Certification guarantees not only the 100% authenticity of the card, but also an accurate and objective assessment of its corners, edges, surface, and centering. Our selection features exclusively high-grade cards (mostly 9 Mint and 10 Gem Mint). These cards offer the highest liquidity and stable growth in value on the global market. You can verify the certification of each card directly in the official databases of the grading companies using the cert code printed on the label.'
                  }
                </p>
                <button 
                  className="description-toggle-btn"
                  onClick={() => setIsDescExpanded(!isDescExpanded)}
                >
                  <span>{isDescExpanded ? (lang === 'CZ' ? 'Méně informací' : 'Less info') : (lang === 'CZ' ? 'Více informací' : 'More info')}</span>
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    width="12" 
                    height="12" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2.5" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    style={{ 
                      transition: 'transform 0.25s ease', 
                      transform: isDescExpanded ? 'rotate(180deg)' : 'rotate(0deg)' 
                    }}
                  >
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </button>
              </div>
            </div>
          ) : (
            <div className="category-intro-box">
              <h2 className="category-title">
                {subSubcategoriesConfig[activeSubcategory]?.title || `${activeSubcategory} Slabs`}
              </h2>
              <div className="category-description-wrapper">
                <p className={`category-description-text ${!isDescExpanded ? 'collapsed' : ''}`}>
                  {subSubcategoriesConfig[activeSubcategory]?.desc[lang] || (lang === 'CZ' ? 'Detailní popis slabs se připravuje.' : 'Detailed description of slabs is being prepared.')}
                </p>
                  <button
                    className="description-toggle-btn"
                    onClick={() => setIsDescExpanded(!isDescExpanded)}
                  >
                    <span>{isDescExpanded ? (lang === 'CZ' ? 'Méně informací' : 'Less info') : (lang === 'CZ' ? 'Více informací' : 'More info')}</span>
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      width="12" 
                      height="12" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2.5" 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      style={{ 
                        transition: 'transform 0.25s ease', 
                        transform: isDescExpanded ? 'rotate(180deg)' : 'rotate(0deg)' 
                      }}
                    >
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </button>
              </div>
            </div>
          )}

          {/* Subcategories or Sub-subcategories Grid Selection */}
          {activeSubcategory === 'all' ? (
            <>
              <div className="subcategories-section-title">{lang === 'CZ' ? 'Vyberte podle gradingové firmy' : 'Select by Grading Company'}</div>
              <div className="subcategory-grid">
                {subcategories.map(sub => {
                  const hasImage = sub.icon && sub.icon.props && sub.icon.props.src;
                  return (
                    <div 
                      key={sub.id} 
                      className={`subcategory-box ${activeSubcategory === sub.id ? 'active' : ''}`}
                      onClick={() => {
                        setActiveSubcategory(sub.id);
                        setActiveSubsubcategory('all');
                        setSelectedCompanies(sub.id === 'all' ? [] : [sub.id]);
                        setFilters(prev => ({ 
                           ...prev, 
                           company: sub.id === 'all' ? undefined : sub.id,
                           subsubcat: undefined 
                        }));
                      }}
                    >
                      <span className={`subcategory-icon ${hasImage ? 'clean-img-container' : ''}`}>
                        {sub.icon}
                      </span>
                      <span className="subcategory-name">{sub.name}</span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            subSubcategoriesConfig[activeSubcategory]?.subsubcats && (
              <>
                <div className="subcategories-section-title">
                  {lang === 'CZ' ? 'Upřesněte výslednou známku' : 'Refine the grade'}
                </div>
                <div className="subcategory-grid">
                  {subSubcategoriesConfig[activeSubcategory].subsubcats.map(sub => {
                    const isEmoji = typeof sub.icon === 'string';
                    return (
                      <div
                        key={sub.id}
                        className={`subcategory-box ${activeSubsubcategory === sub.id ? 'active' : ''}`}
                        onClick={() => {
                          setActiveSubsubcategory(sub.id);
                          setFilters(prev => ({
                            ...prev,
                            subsubcat: sub.id === 'all' ? undefined : sub.id
                          }));
                        }}
                      >
                        <span className="subcategory-icon" style={{ fontSize: isEmoji ? '24px' : 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {sub.icon}
                        </span>
                        <span className="subcategory-name">
                          {typeof sub.name === 'object' ? sub.name[lang] : sub.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </>
            )
          )}

          {/* Toolbar panel */}
          <div className="catalog-toolbar">
            <div className="toolbar-left-group">
              {/* Sort Tabs */}
              <div className="sort-tabs-list">
                <button 
                  className={`sort-tab-btn ${sortBy === 'top' ? 'active' : ''}`}
                  onClick={() => setSortBy('top')}
                >
                  TOP
                </button>
                <button 
                  className={`sort-tab-btn ${sortBy === 'expensive' ? 'active' : ''}`}
                  onClick={() => setSortBy('expensive')}
                >
                  {lang === 'CZ' ? 'Nejdražší' : 'Most Expensive'}
                </button>
                <button 
                  className={`sort-tab-btn ${sortBy === 'cheap' ? 'active' : ''}`}
                  onClick={() => setSortBy('cheap')}
                >
                  {lang === 'CZ' ? 'Nejlevnější' : 'Least Expensive'}
                </button>
                <button 
                  className={`sort-tab-btn ${sortBy === 'new' ? 'active' : ''}`}
                  onClick={() => setSortBy('new')}
                >
                  {lang === 'CZ' ? 'Novinky' : 'New Arrivals'}
                </button>
              </div>
            </div>

            <div className="toolbar-right-group">
              {/* Counter */}
              <span className="results-counter">
                {lang === 'CZ' ? 'Celkem nalezeno: ' : 'Total found: '}<strong>{sortedSlabs.length}</strong> slabs
              </span>

              {/* Filters Trigger (Mobile only) */}
              <button 
                className="mobile-filters-trigger"
                onClick={() => setMobileFiltersOpen(true)}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                </svg>
                {lang === 'CZ' ? 'Filtry' : 'Filters'}
              </button>
            </div>
          </div>

          {/* Products Grid */}
          {sortedSlabs.length === 0 ? (
            <div className="glass-panel" style={{ padding: '48px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', textAlign: 'center' }}>
              <span style={{ fontSize: '48px' }}>💎</span>
              <h3>{lang === 'CZ' ? 'Nebyly nalezeny žádné ohodnocené karty' : 'No graded cards found'}</h3>
              <p style={{ color: 'var(--text-muted)' }}>{lang === 'CZ' ? 'Zkuste změnit výběr gradingových firem nebo známky.' : 'Try changing your grading companies or grade selection.'}</p>
            </div>
          ) : (
            <div className="catalog-product-grid">
              {sortedSlabs.map(product => (
                <ProductCard 
                  key={product.id}
                  product={product}
                  addToCart={addToCart}
                  setSelectedProductId={setSelectedProductId}
                  setActivePage={setActivePage}
                />
              ))}
            </div>
          )}
        </main>
      </div>

    </div>
  );
}
