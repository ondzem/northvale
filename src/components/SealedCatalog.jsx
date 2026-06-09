import { useState } from 'react';
import ProductCard from './ProductCard';
import DealOfTheDay from './DealOfTheDay';

export default function SealedCatalog({ products, addToCart, setSelectedProductId, setActivePage, filters, setFilters }) {
  const [selectedGame, setSelectedGame] = useState(filters.game || 'all');
  const [selectedLang, setSelectedLang] = useState(filters.lang || 'all');
  const [investmentOnly, setInvestmentOnly] = useState(filters.investment || false);
  const [priceRange, setPriceRange] = useState(25000);

  const [prevFilters, setPrevFilters] = useState(filters);
  if (filters !== prevFilters) {
    setPrevFilters(filters);
    if (filters.game) setSelectedGame(filters.game);
    if (filters.lang) setSelectedLang(filters.lang);
    if (filters.investment) setInvestmentOnly(filters.investment);
  }

  // Expandable description state
  const [isDescExpanded, setIsDescExpanded] = useState(false);

  // Active subcategory filter
  const [activeSubcategory, setActiveSubcategory] = useState('all');

  // Sorting
  const [sortBy, setSortBy] = useState('top');

  // Mobile filters sidebar
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const sealedProducts = products.filter(p => p.type === 'sealed' || p.type === 'accessory');

  const subcategories = [
    { id: 'all', name: 'Všechny produkty', icon: '📦' },
    { id: 'booster-box', name: 'Booster Boxy', icon: '📦' },
    { id: 'etb', name: 'Elite Trainer Boxy', icon: '🎁' },
    { id: 'bundle', name: 'Booster Bundly', icon: '🛍️' },
    { id: 'pack', name: 'Boostery (balíčky)', icon: '🃏' },
    { id: 'accessory', name: 'Příslušenství', icon: '🛡️' }
  ];

  // Filter logic
  const filteredProducts = sealedProducts.filter(product => {
    // Game selection
    if (selectedGame !== 'all') {
      if (selectedGame === 'Accessories' && product.type !== 'accessory') return false;
      if (selectedGame !== 'Accessories' && product.game !== selectedGame) return false;
    }

    // Language selection
    if (selectedLang !== 'all' && product.lang !== selectedLang) return false;

    // Investment checkbox
    if (investmentOnly && !product.investment) return false;

    // Price range
    if (product.price > priceRange) return false;

    // Subcategories matching helper
    if (activeSubcategory !== 'all') {
      const name = product.name.toLowerCase();
      if (activeSubcategory === 'booster-box' && !name.includes('booster box')) return false;
      if (activeSubcategory === 'etb' && !name.includes('elite trainer') && !name.includes('etb')) return false;
      if (activeSubcategory === 'bundle' && !name.includes('bundle')) return false;
      if (activeSubcategory === 'pack' && (!name.includes('booster') || name.includes('box') || name.includes('bundle') || name.includes('etb'))) return false;
      if (activeSubcategory === 'accessory' && product.type !== 'accessory') return false;
    }

    return true;
  });

  // Sort logic
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === 'expensive') return b.price - a.price;
    if (sortBy === 'cheap') return a.price - b.price;
    if (sortBy === 'new') return b.id.localeCompare(a.id); // mock sort
    return 0; // Default: top
  });

  return (
    <div className="container fade-in" style={{ paddingTop: '20px', paddingBottom: '40px' }}>
      <h1 className="sr-only">Katalog zapečetěných TCG produktů - Sealed & Příslušenství</h1>

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

          {/* Filter: Karetní hra */}
          <div className="sidebar-filter-section">
            <h4 className="sidebar-filter-title">Karetní hra</h4>
            <select 
              value={selectedGame} 
              onChange={(e) => setSelectedGame(e.target.value)} 
              className="sidebar-select"
            >
              <option value="all">Všechny hry</option>
              <option value="Pokémon">Pokémon TCG</option>
              <option value="Magic">Magic the Gathering</option>
              <option value="One Piece">One Piece TCG</option>
              <option value="Riftbound">Riftbound</option>
              <option value="Accessories">Příslušenství & doplňky</option>
            </select>
          </div>

          {/* Filter: Jazyk */}
          <div className="sidebar-filter-section">
            <h4 className="sidebar-filter-title">Jazyk balení</h4>
            <select 
              value={selectedLang} 
              onChange={(e) => setSelectedLang(e.target.value)} 
              className="sidebar-select"
            >
              <option value="all">Všechny jazyky</option>
              <option value="EN">Angličtina (ENG) 🇬🇧</option>
              <option value="JP">Japonština (JPN) 🇯🇵</option>
              <option value="CN">Čínština (CHN) 🇨🇳</option>
              <option value="KR">Korejština (KOR) 🇰🇷</option>
            </select>
          </div>

          {/* Filter: Investiční edice */}
          <div className="sidebar-filter-section">
            <label className="sidebar-checkbox-label" style={{ fontWeight: '700' }}>
              <input 
                type="checkbox" 
                checked={investmentOnly} 
                onChange={(e) => setInvestmentOnly(e.target.checked)}
                className="sidebar-checkbox"
              />
              <span>Pouze investiční edice 💎</span>
            </label>
          </div>

          {/* Filter: Price Range slider */}
          <div className="sidebar-filter-section">
            <h4 className="sidebar-filter-title">Maximální cena</h4>
            <div className="sidebar-range-box">
              <input 
                type="range" 
                min="0" 
                max="25000" 
                step="250"
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
              setSelectedGame('all');
              setSelectedLang('all');
              setInvestmentOnly(false);
              setPriceRange(25000);
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
              Sealed produkty
            </div>
            <h2 className="category-title">Zapečetěné produkty</h2>
            <div className="category-description-wrapper">
              <p className={`category-description-text ${!isDescExpanded ? 'collapsed' : ''}`}>
                Vstupte do světa originálních zapečetěných Pokémon a Magic: The Gathering produktů. Nabízíme široký výběr booster boxů, dárkových Elite Trainer Boxů, booster bundlů i samostatných balíčků. Všechny produkty odebíráme výhradně od oficiálních distributorů, což garantuje stoprocentní pravost a bezchybný stav balení vhodný i pro dlouhodobé investiční účely. Investování do zapečetěných karetních setů získává na obrovské popularitě. U nás prochází každá krabice pečlivou vizuální kontrolou stavu ochranné fólie a rohů. Pokud hledáte produkty přímo určené k uchování v čase, doporučujeme zaškrtnout náš filtr 'Pouze investiční edice'. Zde naleznete kousky v muzejní sběratelské kvalitě s garancí perfektního stavu balení.
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
          <div className="subcategories-section-title">Vyberte typ balení</div>
          <div className="subcategory-grid">
            {subcategories.map(sub => (
              <div 
                key={sub.id} 
                className={`subcategory-box ${activeSubcategory === sub.id ? 'active' : ''}`}
                onClick={() => setActiveSubcategory(sub.id)}
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
                Celkem nalezeno: <strong>{sortedProducts.length}</strong> produktů
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
          {sortedProducts.length === 0 ? (
            <div className="glass-panel" style={{ padding: '48px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', textAlign: 'center' }}>
              <span style={{ fontSize: '48px' }}>📦</span>
              <h3>Nebyly nalezeny žádné produkty</h3>
              <p style={{ color: 'var(--text-muted)' }}>Zkuste změnit výběr filtrů nebo subkategorií.</p>
            </div>
          ) : (
            <div className="catalog-product-grid">
              {sortedProducts.map(product => (
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
