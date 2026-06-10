import { useState, useEffect } from 'react';
import ProductCard from './ProductCard';
import DealOfTheDay from './DealOfTheDay';

const subSubcategoriesConfig = {
  'PSA': {
    title: 'PSA Graded Slabs',
    desc: 'PSA (Professional Sports Authenticator) je největší a nejdůvěryhodnější nezávislá gradingová společnost na světě. Karty ohodnocené známkou PSA 10 Gem Mint představují absolutní stavový vrchol a jsou vysoce vyhledávaným sběratelským i investičním artiklem s maximální likviditou.',
    subsubcats: [
      { id: 'all', name: 'Všechny PSA Slabs', icon: '💎' },
      { id: 'Grade 10 Gem Mint', name: 'PSA 10 Gem Mint', icon: '🏆' },
      { id: 'Grade 9.5 Mint', name: 'PSA 9.5 Mint', icon: '🌟' }
    ]
  },
  'Beckett': {
    title: 'Beckett (BGS) Graded Slabs',
    desc: 'Beckett Grading Services (BGS) je proslulý svými extrémně přísnými standardy a detailními dílčími známkami (Subgrades) za centrování, rohy, hrany a povrch. Zlatý štítek BGS 9.5 nebo BGS 10 je symbolem prvotřídního stavu karty.',
    subsubcats: [
      { id: 'all', name: 'Všechny Beckett Slabs', icon: '💎' },
      { id: 'Grade 10 Gem Mint', name: 'BGS 10 Gem Mint', icon: '🏆' },
      { id: 'Grade 9.5 Mint', name: 'BGS 9.5 Mint', icon: '🌟' }
    ]
  },
  'TAG': {
    title: 'TAG Graded Slabs',
    desc: 'TAG (Technical Assessment Group) přináresi revoluci do gradingu pomocí plně automatizované laserové a počítačové analýzy. Odstraňuje lidský faktor a poskytuje stoprocentně konzistentní hodnocení doprovázené detailním digitálním reportem stavu karty.',
    subsubcats: [
      { id: 'all', name: 'Všechny TAG Slabs', icon: '💎' },
      { id: 'Grade 10 Gem Mint', name: 'TAG 10 Gem Mint', icon: '🏆' },
      { id: 'Grade 9.5 Mint', name: 'TAG 9.5 Mint', icon: '🌟' }
    ]
  },
  'CGC': {
    title: 'CGC Graded Slabs',
    desc: 'CGC Cards je přední gradingová autorita specializující se na sběratelské karetní hry. Nabízí moderní, křišťálově čistá pouzdra s vynikající optikou, která nechají vyniknout barvám a detailům vaší karty.',
    subsubcats: [
      { id: 'all', name: 'Všechny CGC Slabs', icon: '💎' },
      { id: 'Grade 10 Gem Mint', name: 'CGC 10 Gem Mint', icon: '🏆' },
      { id: 'Grade 9.5 Mint', name: 'CGC 9.5 Mint', icon: '🌟' }
    ]
  }
};

export default function SlabsCatalog({ products, addToCart, setSelectedProductId, setActivePage, filters, setFilters }) {
  const [selectedCompany, setSelectedCompany] = useState(filters.company || 'all');
  const [selectedGrade, setSelectedGrade] = useState('all');
  const [priceRange, setPriceRange] = useState(45000);

  const [prevFilters, setPrevFilters] = useState(filters);
  if (filters !== prevFilters) {
    setPrevFilters(filters);
    if (filters.company) setSelectedCompany(filters.company);
    setActiveSubcategory(filters.company || 'all');
    setActiveSubsubcategory(filters.subsubcat || 'all');
  }

  // Expandable description state
  const [isDescExpanded, setIsDescExpanded] = useState(false);

  // Active subcategory (Company) filter
  const [activeSubcategory, setActiveSubcategory] = useState(filters.company || 'all');
  const [activeSubsubcategory, setActiveSubsubcategory] = useState(filters.subsubcat || 'all');

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



  const slabs = products.filter(p => p.type === 'slab');

  const companies = ['PSA', 'Beckett', 'CGC', 'TAG'];
  const grades = [10, 9.5, 9, 8.5, 8, 7, 6, 5, 4, 3, 2, 1];

  const subcategories = [
    { id: 'all', name: 'Všechny Slabs', icon: <img src="/Ohodnoceni karet.webp" alt="" className="subcategory-img" /> },
    { id: 'PSA', name: 'PSA Slabs', icon: <img src="https://images.pokemontcg.io/sv3/223.png" alt="" className="subcategory-img" /> },
    { id: 'Beckett', name: 'Beckett Slabs', icon: <img src="https://images.pokemontcg.io/swsh4/188.png" alt="" className="subcategory-img" /> },
    { id: 'TAG', name: 'TAG Slabs', icon: <img src="https://images.pokemontcg.io/swsh7/215.png" alt="" className="subcategory-img" /> },
    { id: 'CGC', name: 'CGC Slabs', icon: <img src="https://images.pokemontcg.io/swsh11/186.png" alt="" className="subcategory-img" /> }
  ];

  // Filter logic
  const filteredSlabs = slabs.filter(product => {
    // Certifying Company Filter (Sidebar select)
    if (selectedCompany !== 'all' && product.company !== selectedCompany) return false;

    // Grade Score Filter
    if (selectedGrade !== 'all' && product.grade !== Number(selectedGrade)) return false;

    // Price Filter
    if (product.price > priceRange) return false;

    // Subcategory (Company) Filter
    if (activeSubcategory !== 'all' && product.company !== activeSubcategory) return false;

    // Subsubcategory (Grade Score Category) Filter
    if (activeSubsubcategory !== 'all' && product.subsubcategory !== activeSubsubcategory) return false;

    return true;
  });

  // Sort logic
  const sortedSlabs = [...filteredSlabs].sort((a, b) => {
    if (sortBy === 'expensive') return b.price - a.price;
    if (sortBy === 'cheap') return a.price - b.price;
    if (sortBy === 'new') return b.id.localeCompare(a.id); // mock sort
    return 0; // Default: top
  });

  return (
    <div className="container fade-in" style={{ paddingTop: '20px', paddingBottom: '40px' }}>
      <h1 className="sr-only">Katalog ohodnocených TCG karet (Slabs) - NORTHVALE</h1>

      {/* Breadcrumbs Navigation */}
      {(selectedCompany !== 'all' || activeSubcategory !== 'all') && (
        <nav className="breadcrumbs-nav" aria-label="Drobečková navigace">
          <span className="breadcrumb-item" onClick={() => setActivePage('home')}>Domů</span>
          
          {selectedCompany !== 'all' && (
            <>
              <span className="breadcrumb-separator">/</span>
              {activeSubsubcategory === 'all' ? (
                <span className="breadcrumb-item active">
                  {subcategories.find(s => s.id === selectedCompany)?.name}
                </span>
              ) : (
                <span 
                  className="breadcrumb-item" 
                  onClick={() => { 
                    setActiveSubsubcategory('all'); 
                    setFilters(prev => ({ ...prev, subsubcat: undefined })); 
                  }}
                >
                  {subcategories.find(s => s.id === selectedCompany)?.name}
                </span>
              )}
            </>
          )}

          {activeSubsubcategory !== 'all' && (
            <>
              <span className="breadcrumb-separator">/</span>
              <span className="breadcrumb-item active">
                {subSubcategoriesConfig[selectedCompany]?.subsubcats?.find(s => s.id === activeSubsubcategory)?.name || activeSubsubcategory}
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
            <h3 className="catalog-sidebar-title">Filtry a akce</h3>
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

          {/* Filter: Certifikační firma */}
          <div className="sidebar-filter-section">
            <h4 className="sidebar-filter-title">Gradingová firma</h4>
            <select 
              value={selectedCompany} 
              onChange={(e) => {
                setSelectedCompany(e.target.value);
                // Also sync with active subcategory if a specific company is selected
                setActiveSubcategory(e.target.value);
              }} 
              className="sidebar-select"
            >
              <option value="all">Všechny firmy</option>
              {companies.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Filter: Výsledná známka */}
          <div className="sidebar-filter-section">
            <h4 className="sidebar-filter-title">Výsledná známka</h4>
            <select 
              value={selectedGrade} 
              onChange={(e) => setSelectedGrade(e.target.value)} 
              className="sidebar-select"
            >
              <option value="all">Všechny známky</option>
              {grades.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          {/* Filter: Price Range slider */}
          <div className="sidebar-filter-section">
            <h4 className="sidebar-filter-title">Maximální cena</h4>
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
              <span className="sidebar-range-value">{priceRange.toLocaleString()} Kč</span>
            </div>
          </div>

          {/* Clear Filters Button */}
          <button 
            className="btn btn-secondary sidebar-reset-btn"
            onClick={() => {
              setSelectedCompany('all');
              setSelectedGrade('all');
              setPriceRange(45000);
              setActiveSubcategory('all');
              setFilters({});
              setMobileFiltersOpen(false);
            }}
          >
            Smazat filtry
          </button>
        </aside>

        {/* RIGHT COLUMN: Headers, Subcategories, Toolbar & Products Grid */}
        <main className="catalog-main">
          
          {/* Header Introduction Box */}
          {activeSubcategory === 'all' ? (
            <div className="category-intro-box">
              <div style={{ fontSize: '11px', color: 'var(--color-gold)', fontWeight: '800', textTransform: 'uppercase', marginBottom: '4px' }}>
                Ohodnocené karty
              </div>
              <h2 className="category-title">Graded Slabs</h2>
              <div className="category-description-wrapper">
                <p className={`category-description-text ${!isDescExpanded ? 'collapsed' : ''}`}>
                  Sběratelská špička a nejbezpečnější forma investování do sběratelských karet. Ohodnocené karty (Slabs) jsou profesionálně certifikovány nezávislými autoritami jako PSA, Beckett (BGS), TAG či CGC. Každá karta je uzavřena v ochranném akrylátovém pouzdře s unikátním certifikačním číslem a výslednou známkou stavu na stupnici od 1 do 10. Certifikace zaručuje nejen stoprocentní pravost karty, ale také přesné a objektivní posouzení stavu rohů, hran, povrchu a centrování. V naší nabídce naleznete výhradně kousky s vysokým hodnocením (převážně 9 Gem Mint a 10 Gem Mint). Tyto karty mají nejvyšší likviditu a stabilní růst hodnoty na globálním trhu. Certifikaci každé karty si můžete ověřit přímo v oficiálních databázích gradingových firem pomocí certifikačního kódu uvedeného na štítku.
                </p>
                <button 
                  className="description-toggle-btn"
                  onClick={() => setIsDescExpanded(!isDescExpanded)}
                >
                  {isDescExpanded ? 'Méně informací ▲' : 'Více informací ▼'}
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
                  {subSubcategoriesConfig[activeSubcategory]?.desc || 'Detailní popis slabs se připravuje.'}
                </p>
                <button
                  className="description-toggle-btn"
                  onClick={() => setIsDescExpanded(!isDescExpanded)}
                >
                  {isDescExpanded ? 'Méně informací ▲' : 'Více informací ▼'}
                </button>
              </div>
            </div>
          )}

          {/* Subcategories or Sub-subcategories Grid Selection */}
          {activeSubcategory === 'all' ? (
            <>
              <div className="subcategories-section-title">Vyberte podle gradingové firmy</div>
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
                        setSelectedCompany(sub.id);
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
                  Upřesněte výslednou známku
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
                        <span className="subcategory-name">{sub.name}</span>
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
                  Nejdražší
                </button>
                <button 
                  className={`sort-tab-btn ${sortBy === 'cheap' ? 'active' : ''}`}
                  onClick={() => setSortBy('cheap')}
                >
                  Nejlevnější
                </button>
                <button 
                  className={`sort-tab-btn ${sortBy === 'new' ? 'active' : ''}`}
                  onClick={() => setSortBy('new')}
                >
                  Novinky
                </button>
              </div>
            </div>

            <div className="toolbar-right-group">
              {/* Counter */}
              <span className="results-counter">
                Celkem nalezeno: <strong>{sortedSlabs.length}</strong> slabů
              </span>

              {/* Filters Trigger (Mobile only) */}
              <button 
                className="mobile-filters-trigger"
                onClick={() => setMobileFiltersOpen(true)}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                </svg>
                Filtry
              </button>
            </div>
          </div>

          {/* Products Grid */}
          {sortedSlabs.length === 0 ? (
            <div className="glass-panel" style={{ padding: '48px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', textAlign: 'center' }}>
              <span style={{ fontSize: '48px' }}>💎</span>
              <h3>Nebyly nalezeny žádné ohodnocené karty</h3>
              <p style={{ color: 'var(--text-muted)' }}>Zkuste změnit výběr gradingových firem nebo známky.</p>
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
