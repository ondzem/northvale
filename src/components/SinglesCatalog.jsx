import { useState } from 'react';
import ProductCard from './ProductCard';
import DealOfTheDay from './DealOfTheDay';

export default function SinglesCatalog({ products, addToCart, setSelectedProductId, setActivePage, filters, setFilters, searchQuery, setSearchQuery }) {
  const [selectedEditions, setSelectedEditions] = useState(filters.edition ? [filters.edition] : []);
  const [selectedConditions, setSelectedConditions] = useState([]);
  const [selectedLangs, setSelectedLangs] = useState(filters.lang ? [filters.lang] : []);
  const [foilFilter, setFoilFilter] = useState('all');
  const [priceRange, setPriceRange] = useState(25000);
  
  // Decklist Importer states
  const [showImporter, setShowImporter] = useState(false);
  const [decklistText, setDecklistText] = useState('');
  
  // Expandable description state
  const [isDescExpanded, setIsDescExpanded] = useState(false);

  // Active subcategory (rarity filter)
  const [activeSubcategory, setActiveSubcategory] = useState('all');

  // Sorting
  const [sortBy, setSortBy] = useState('top');

  // Mobile filters sidebar open/close
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Get only singles
  const singles = products.filter(p => p.type === 'single');

  // Available filters options
  const editions = Array.from(new Set(singles.map(s => s.edition)));
  const conditions = ['NM', 'EX', 'GD', 'LP', 'PL', 'PO'];
  const langs = ['EN', 'JP', 'CN', 'KR'];

  const subcategories = [
    { id: 'all', name: 'Všechny kusovky', icon: '🃏' },
    { id: 'Alternate Art', name: 'Alternate Art', icon: '🌟' },
    { id: 'Special Illustration Rare', name: 'Special Illustration', icon: '🎨' },
    { id: 'Secret Rare', name: 'Secret Rare', icon: '💎' },
    { id: 'Rainbow Rare', name: 'Rainbow Rare', icon: '🌈' },
  ];

  // Toggle helpers
  const handleEditionToggle = (edition) => {
    setSelectedEditions(prev => 
      prev.includes(edition) ? prev.filter(e => e !== edition) : [...prev, edition]
    );
  };

  const handleConditionToggle = (cond) => {
    setSelectedConditions(prev => 
      prev.includes(cond) ? prev.filter(c => c !== cond) : [...prev, cond]
    );
  };

  const handleLangToggle = (lang) => {
    setSelectedLangs(prev => 
      prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]
    );
  };

  // Filter logic
  const filteredSingles = singles.filter(product => {
    // Search query filter
    if (searchQuery && 
        !product.name.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !product.edition.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    // Edition filter
    if (selectedEditions.length > 0 && !selectedEditions.includes(product.edition)) {
      return false;
    }

    // Subcategory (Rarity) filter
    if (activeSubcategory !== 'all' && product.rarity !== activeSubcategory) {
      return false;
    }

    // Variants matching filters
    const matchingVariants = product.variants.filter(variant => {
      if (selectedConditions.length > 0 && !selectedConditions.includes(variant.condition)) {
        return false;
      }
      if (selectedLangs.length > 0 && !selectedLangs.includes(variant.lang)) {
        return false;
      }
      if (foilFilter === 'foil' && !variant.foil) return false;
      if (foilFilter === 'non-foil' && variant.foil) return false;
      if (variant.price > priceRange) return false;
      return true;
    });

    return matchingVariants.length > 0;
  });

  // Sort logic
  const sortedSingles = [...filteredSingles].sort((a, b) => {
    const priceA = a.variants ? Math.min(...a.variants.map(v => v.price)) : a.price;
    const priceB = b.variants ? Math.min(...b.variants.map(v => v.price)) : b.price;

    if (sortBy === 'expensive') return priceB - priceA;
    if (sortBy === 'cheap') return priceA - priceB;
    if (sortBy === 'new') return b.id.localeCompare(a.id); // mock sort
    return 0; // Default: top
  });

  // Parse and import decklist
  const handleImportDecklist = () => {
    if (!decklistText.trim()) return;
    const lines = decklistText.split('\n');
    let importCount = 0;
    
    lines.forEach(line => {
      const match = line.trim().match(/^(\d+)?\s*(.+)$/);
      if (match) {
        const qty = match[1] ? parseInt(match[1]) : 1;
        const cardQuery = match[2].trim();
        
        const card = singles.find(p => p.name.toLowerCase().includes(cardQuery.toLowerCase()));
        if (card) {
          const defaultVariant = card.variants[0];
          for (let i = 0; i < qty; i++) {
            addToCart(defaultVariant, card);
          }
          importCount += qty;
        }
      }
    });

    if (importCount > 0) {
      alert(`Import úspěšný! Do košíku bylo přidáno ${importCount} karet podle Vašeho seznamu.`);
      setDecklistText('');
      setShowImporter(false);
    } else {
      alert('Nebyly nalezeny žádné odpovídající karty. Zkontrolujte prosím názvy v seznamu.');
    }
  };

  return (
    <div className="container fade-in" style={{ paddingTop: '20px', paddingBottom: '40px' }}>
      <h1 className="sr-only">Katalog kusových TCG karet - Pokémon Kusovky</h1>

      {/* Decklist Importer Toggle Bar */}
      <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '20px' }}>
        <button 
          className="btn btn-secondary" 
          onClick={() => setShowImporter(!showImporter)}
          style={{ fontSize: '13px' }}
        >
          {showImporter ? '✕ Zavřít importér' : '📥 Importovat Decklist (pro turnajové hráče)'}
        </button>
      </div>

      {/* Decklist Importer Box */}
      {showImporter && (
        <div className="glass-panel" style={{ padding: '24px', textAlign: 'left', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '800', margin: '0 0 6px 0' }}>Decklist Importer</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 12px 0', lineHeight: '1.4' }}>
            Vložte seznam karet (každou kartu na nový řádek ve formátu: <code>množství název</code>, např. <code>4 Charizard</code>). Automaticky vyhledáme a přidáme nejlepší dostupné varianty do košíku.
          </p>
          <textarea
            rows="5"
            placeholder="Příklad:&#10;4 Charizard ex&#10;2 Pikachu VMAX"
            value={decklistText}
            onChange={(e) => setDecklistText(e.target.value)}
            style={{
              width: '100%',
              backgroundColor: 'var(--bg-page)',
              border: '1px solid var(--border-light)',
              padding: '12px',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-main)',
              fontSize: '13px',
              fontFamily: 'monospace',
              outline: 'none',
              resize: 'vertical',
            }}
          />
          <button className="btn btn-primary" onClick={handleImportDecklist} style={{ marginTop: '12px' }}>
            Importovat do košíku
          </button>
        </div>
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

          {/* Filter: Search within category */}
          <div className="sidebar-filter-section">
            <h4 className="sidebar-filter-title">Hledat název karty</h4>
            <input 
              type="text" 
              placeholder="Zadejte název..." 
              value={searchQuery || ''} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              className="sidebar-search-input"
            />
          </div>

          {/* Filter: Set / Edition checkboxes */}
          <div className="sidebar-filter-section">
            <h4 className="sidebar-filter-title">Edice / Set</h4>
            <div className="sidebar-checkbox-list">
              {editions.map(ed => (
                <label key={ed} className="sidebar-checkbox-label">
                  <input 
                    type="checkbox" 
                    checked={selectedEditions.includes(ed)} 
                    onChange={() => handleEditionToggle(ed)}
                    className="sidebar-checkbox"
                  />
                  <span>{ed}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Filter: Condition checkboxes */}
          <div className="sidebar-filter-section">
            <h4 className="sidebar-filter-title">Stav karty</h4>
            <div className="sidebar-checkbox-list">
              {conditions.map(cond => (
                <label key={cond} className="sidebar-checkbox-label">
                  <input 
                    type="checkbox" 
                    checked={selectedConditions.includes(cond)} 
                    onChange={() => handleConditionToggle(cond)}
                    className="sidebar-checkbox"
                  />
                  <span style={{ fontWeight: '700', color: 'var(--text-main)' }}>{cond}</span>
                </label>
              ))}
            </div>
            <span 
              onClick={() => { setActivePage('grading-guide'); setMobileFiltersOpen(false); }}
              style={{
                fontSize: '11px',
                color: 'var(--color-gold)',
                cursor: 'pointer',
                fontWeight: '600',
                textDecoration: 'underline',
                textAlign: 'left'
              }}
            >
              Průvodce stavy karet
            </span>
          </div>

          {/* Filter: Language checkboxes */}
          <div className="sidebar-filter-section">
            <h4 className="sidebar-filter-title">Jazyk</h4>
            <div className="sidebar-checkbox-list">
              {langs.map(lang => (
                <label key={lang} className="sidebar-checkbox-label">
                  <input 
                    type="checkbox" 
                    checked={selectedLangs.includes(lang)} 
                    onChange={() => handleLangToggle(lang)}
                    className="sidebar-checkbox"
                  />
                  <span>{lang === 'EN' ? 'Angličtina (EN) 🇬🇧' : lang === 'JP' ? 'Japonština (JP) 🇯🇵' : lang === 'CN' ? 'Čínština (CN) 🇨🇳' : 'Korejština (KR) 🇰🇷'}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Filter: Foil Type select */}
          <div className="sidebar-filter-section">
            <h4 className="sidebar-filter-title">Provedení</h4>
            <select 
              value={foilFilter} 
              onChange={(e) => setFoilFilter(e.target.value)} 
              className="sidebar-select"
            >
              <option value="all">Všechny úpravy</option>
              <option value="foil">Pouze Foil (Třpytivé) ✨</option>
              <option value="non-foil">Pouze Non-Foil (Matné) ▱</option>
            </select>
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
              setSelectedEditions([]);
              setSelectedConditions([]);
              setSelectedLangs([]);
              setFoilFilter('all');
              setPriceRange(25000);
              setSearchQuery('');
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
              Kusové karty
            </div>
            <h2 className="category-title">Pokémon Kusovky</h2>
            <div className="category-description-wrapper">
              <p className={`category-description-text ${!isDescExpanded ? 'collapsed' : ''}`}>
                Objevte širokou nabídku Pokémon kusových karet z nejnovějších i starších edicí. Od běžných karet po extrémně vzácné kousky Alternate Art a Special Illustration Rare. Garantujeme 100% originalitu a precizní posouzení stavu každé nabízené karty. Naše nabídka Pokémon kusovek je denně aktualizována. Každá karta prochází přísnou kontrolou kvality, abychom zajistili přesné zařazení do stavových kategorií. Využijte náš pokročilý filtr pro rychlé nalezení konkrétních karet do vašeho herního balíčku nebo sbírky. Pro turnajové hráče doporučujeme použít náš inovativní Decklist Importer, se kterým naplníte košík celým seznamem karet během několika sekund.
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
          <div className="subcategories-section-title">Populární kategorie vzácností</div>
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
                Celkem nalezeno: <strong>{sortedSingles.length}</strong> karet
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
          {sortedSingles.length === 0 ? (
            <div className="glass-panel" style={{ padding: '48px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', textAlign: 'center' }}>
              <span style={{ fontSize: '48px' }}>🔍</span>
              <h3>Nebyly nalezeny žádné kusové karty</h3>
              <p style={{ color: 'var(--text-muted)' }}>Zkuste změnit výběr filtrů nebo vyhledávaný výraz.</p>
            </div>
          ) : (
            <div className="catalog-product-grid">
              {sortedSingles.map(product => (
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
