import { useState } from 'react';
import ProductCard from './ProductCard';
import DealOfTheDay from './DealOfTheDay';

export default function SlabsCatalog({ products, addToCart, setSelectedProductId, setActivePage, filters, setFilters }) {
  const [selectedCompany, setSelectedCompany] = useState(filters.company || 'all');
  const [selectedGrade, setSelectedGrade] = useState('all');
  const [priceRange, setPriceRange] = useState(45000);

  const [prevFilters, setPrevFilters] = useState(filters);
  if (filters !== prevFilters) {
    setPrevFilters(filters);
    if (filters.company) setSelectedCompany(filters.company);
  }

  // Expandable description state
  const [isDescExpanded, setIsDescExpanded] = useState(false);

  // Active subcategory (Company) filter
  const [activeSubcategory, setActiveSubcategory] = useState('all');

  // Sorting
  const [sortBy, setSortBy] = useState('top');

  // Mobile filters sidebar
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const slabs = products.filter(p => p.type === 'slab');

  const companies = ['PSA', 'Beckett', 'CGC', 'TAG'];
  const grades = [10, 9.5, 9, 8.5, 8, 7, 6, 5, 4, 3, 2, 1];

  const subcategories = [
    { id: 'all', name: 'Všechny Slabs', icon: '💎' },
    { id: 'PSA', name: 'PSA Slabs', icon: '🔴' },
    { id: 'Beckett', name: 'Beckett Slabs', icon: '🦅' },
    { id: 'TAG', name: 'TAG Slabs', icon: '🛡️' },
    { id: 'CGC', name: 'CGC Slabs', icon: '🔵' }
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
              style={{
                display: 'none',
                background: 'none',
                border: 'none',
                color: 'var(--color-gold)',
                fontSize: '22px',
                cursor: 'pointer',
                padding: '4px'
              }}
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

          {/* Subcategories Grid Selection */}
          <div className="subcategories-section-title">Vyberte podle gradingové firmy</div>
          <div className="subcategory-grid">
            {subcategories.map(sub => (
              <div 
                key={sub.id} 
                className={`subcategory-box ${activeSubcategory === sub.id ? 'active' : ''}`}
                onClick={() => {
                  setActiveSubcategory(sub.id);
                  // Sync selector as well
                  setSelectedCompany(sub.id);
                }}
              >
                <span className="subcategory-icon">{sub.icon}</span>
                <span className="subcategory-name">{sub.name}</span>
              </div>
            ))}
          </div>

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
