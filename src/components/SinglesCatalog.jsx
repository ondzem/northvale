import { useState, useEffect } from 'react';
import ProductCard from './ProductCard';
import DealOfTheDay from './DealOfTheDay';

const gameInfo = {
  'Pokémon': {
    title: 'Pokémon Kusovky',
    desc: 'Objevte širokou nabídku Pokémon kusových karet z nejnovějších i starších edicí. Od běžných karet po extrémně vzácné kousky Alternate Art a Special Illustration Rare. Garantujeme 100% originalitu a precizní posouzení stavu každé nabízené karty. Naše nabídka Pokémon kusovek je denně aktualizována. Každá karta prochází přísnou kontrolou kvality, abychom zajistili přesné zařazení do stavových kategorií. Využijte náš pokročilý filtr pro rychlé nalezení konkrétních karet do vašeho herního balíčku nebo sbírky. Pro turnajové hráče doporučujeme použít náš inovativní Decklist Importer, se kterým naplníte košík celým seznamem karet během několika sekund.'
  },
  'Lorcana': {
    title: 'Disney Lorcana Kusovky',
    desc: 'Prozkoumejte naši nabídku kusových karet Disney Lorcana. Najděte chybějící karty do své sbírky nebo herního balíčku, od běžných karet až po vzácné Enchanted verze oblíbených postav. Zaručujeme kvalitu a originalitu všech karet, které pečlivě třídíme podle stavu a edic. Prozkoumejte magický svět Lorcana s našimi prémiovými kartami.'
  },
  'One Piece': {
    title: 'One Piece Kusovky',
    desc: 'Kompletní výběr kusových karet z One Piece Card Game. Od základních karet po Alternate Art a Secret Rare sběratelské kusy. Všechny karty jsou detailně zkontrolovány, abychom zaručili jejich stav a pravost. Sestavte si svůj pirátský balíček s nejlepšími lídry a charaktery.'
  },
  'Riftbound': {
    title: 'Riftbound Kusovky',
    desc: 'Najděte ty správné kusové karty pro taktickou hru Riftbound. Doplňte svůj balíček o klíčové jednotky a kouzla. Garantujeme rychlé doručení a výborný stav všech herních karet. Získejte převahu na bojišti s těmi správnými strategickými kartami.'
  }
};

const subSubcategoriesConfig = {
  'Pokémon': {
    'Alternate Art': {
      title: 'Pokémon Alternate Art karty',
      desc: 'Alternate Art (Alt Art) karty jsou jedny z nejvyhledávanějších a nejcennějších karet moderní éry Pokémon TCG. Tyto karty nahrazují tradiční zobrazení Pokémona detailní, celoplošnou uměleckou ilustrací, která často vypráví příběh nebo zachycuje Pokémona v jeho přirozeném prostředí. Mají extrémně nízký poměr otevírání z boosterů a představují skvělou sběratelskou i investiční příležitost.',
      subsubcats: [
        { id: 'all', name: 'Všechny Alt Arty', icon: '🎨' },
        { id: 'Alternate Art', name: 'Standard Alt Art', icon: '✨' },
        { id: 'Alternate Art Secret Rare', name: 'Secret Rare Alt Art', icon: '👑' }
      ]
    },
    'Special Illustration Rare': {
      title: 'Pokémon Special Illustration Rare karty',
      desc: 'Special Illustration Rare (SIR) jsou zlatým standardem moderních sérií ze éry Scarlet & Violet. Tyto karty se vyznačují dechberoucími celoplošnými kresbami od renomovaných ilustrátorů, které přetvářejí ikonické Pokémony do uměleckých děl. Každá karta je opatřena jedinečnou texturou a foilovým efektem.',
      subsubcats: [
        { id: 'all', name: 'Všechny SIR', icon: '🌟' },
        { id: 'Special Illustration', name: 'Special Illustration', icon: '🎨' }
      ]
    },
    'Secret Rare': {
      title: 'Pokémon Secret Rare karty',
      desc: 'Secret Rare karty jsou karty, jejichž číslo edice přesahuje oficiální počet karet v setu (např. 215/198). Tyto karty bývají vyvedeny ve zlatém provedení, s duhovým efektem nebo jako speciální celoplošné ilustrace. Jsou ozdobou každého sběratelského alba.',
      subsubcats: [
        { id: 'all', name: 'Všechny Secret Rare', icon: '🔑' },
        { id: 'Alternate Art Secret Rare', name: 'Secret Rare Alt Art', icon: '✨' }
      ]
    },
    'Rainbow Rare': {
      title: 'Pokémon Rainbow Rare karty',
      desc: 'Rainbow Rare (duhové) karty byly představeny v éře Sun & Moon a pokračovaly v éře Sword & Shield. Tyto karty mají charakteristický stříbřitě duhový třpytivý povrch s výraznou texturou, který pokrývá celou plochu karty. Jsou vysoce ceněny pro svůj unikátní estetický vzhled.',
      subsubcats: [
        { id: 'all', name: 'Všechny Rainbow Rare', icon: '🌈' },
        { id: 'Rainbow Rare', name: 'Rainbow Rare', icon: '✨' }
      ]
    }
  },
  'Lorcana': {
    'Enchanted': {
      title: 'Disney Lorcana Enchanted karty',
      desc: 'Enchanted karty jsou nejvzácnějšími a sběratelsky nejcennějšími kartami v Disney Lorcana. Mají nádhernou bezrámovou alternativní ilustraci pokrytou speciálním duhovým „foil“ efektem. Pravděpodobnost otevření Enchanted karty z boosteru je extrémně nízká, což z nich dělá vysoce ceněné sběratelské klenoty.',
      subsubcats: [
        { id: 'all', name: 'Všechny Enchanted', icon: '✨' },
        { id: 'Enchanted', name: 'Enchanted', icon: '🦄' }
      ]
    },
    'Legendary': {
      title: 'Disney Lorcana Legendary karty',
      desc: 'Legendary karty představují nejvyšší standardní vzácnost v balíčcích Disney Lorcana (před Enchanted). Tyto karty mají silné herní schopnosti a nádherný foilový nebo nefoilový vzhled. Jsou klíčové pro stavbu kompetitivních herních balíčků.',
      subsubcats: [
        { id: 'all', name: 'Všechny Legendary', icon: '🐉' },
        { id: 'Legendary', name: 'Legendary', icon: '💎' }
      ]
    },
    'Super Rare': {
      title: 'Disney Lorcana Super Rare karty',
      desc: 'Super Rare karty jsou další významnou úrovní vzácnosti v Disney Lorcana. Často obsahují velmi užitečné postavy a akční karty, které tvoří pilíře mnoha herních strategií.',
      subsubcats: [
        { id: 'all', name: 'Všechny Super Rare', icon: '🌟' }
      ]
    },
    'Rare': {
      title: 'Disney Lorcana Rare karty',
      desc: 'Rare (vzácné) karty jsou v každém boosteru garantovány v počtu dvou kusů (pokud nejsou nahrazeny vyšší vzácností). Nabízejí pestrou škálu zajímavých efektů a postav.',
      subsubcats: [
        { id: 'all', name: 'Všechny Rare', icon: '🛡️' }
      ]
    },
    'Uncommon': {
      title: 'Disney Lorcana Uncommon karty',
      desc: 'Uncommon (neobvyklé) karty doplňují herní balíčky o důležité synergické karty a postavy.',
      subsubcats: [
        { id: 'all', name: 'Všechny Uncommon', icon: '⚡' }
      ]
    },
    'Common': {
      title: 'Disney Lorcana Common karty',
      desc: 'Common (běžné) karty tvoří základní kostru každého herního balíčku a sbírky. Obsahují základní verze mnoha oblíbených postav.',
      subsubcats: [
        { id: 'all', name: 'Všechny Common', icon: '🍃' }
      ]
    }
  },
  'One Piece': {
    'Alternate Art': {
      title: 'One Piece Alternate Art karty',
      desc: 'Alternate Art (Alt Art) karty v One Piece Card Game se vyznačují exkluzivními ilustracemi postav a vůdců, které se liší od standardních verzí v setu. Nejvzácnější z nich jsou takzvané Manga Rare karty, které mají na pozadí ikonické panely z manga předlohy Eiichira Ody. Jsou svatým grálem pro všechny fanoušky Slamáků.',
      subsubcats: [
        { id: 'all', name: 'Všechny Alt Arty', icon: '🏴‍☠️' },
        { id: 'Alternate Art', name: 'Standard Alt Art', icon: '✨' }
      ]
    },
    'Secret Rare': {
      title: 'One Piece Secret Rare karty',
      desc: 'Secret Rare (SEC) karty jsou nejvyšší standardní vzácností v každém setu One Piece Card Game. Mají úchvatné zpracování a jsou velmi silné v samotné hře.',
      subsubcats: [
        { id: 'all', name: 'Všechny Secret Rare', icon: '🪙' }
      ]
    },
    'Leader': {
      title: 'One Piece Leader karty',
      desc: 'Leader (vůdce) karty určují barvu a strategii vašeho celého One Piece balíčku. Nabízíme jak standardní Leader karty, tak jejich vzácné Alternate Art verze s celoplošným zobrazením obličeje postavy.',
      subsubcats: [
        { id: 'all', name: 'Všechny Leadery', icon: '👑' }
      ]
    },
    'Super Rare': {
      title: 'One Piece Super Rare karty',
      desc: 'Super Rare (SR) karty tvoří klíčové bojovníky a události pro sestavení konkurenceschopného balíčku.',
      subsubcats: [
        { id: 'all', name: 'Všechny Super Rare', icon: '🌟' }
      ]
    },
    'Rare': {
      title: 'One Piece Rare karty',
      desc: 'Vzácné (R) karty v One Piece Card Game přinášejí důležité efekty a podporu pro vaše pirátské posádky.',
      subsubcats: [
        { id: 'all', name: 'Všechny Rare', icon: '🛡️' }
      ]
    },
    'Uncommon': {
      title: 'One Piece Uncommon karty',
      desc: 'Neobvyklé (UC) karty poskytují nezbytné synergie a doplňkové postavy pro stabilní hru.',
      subsubcats: [
        { id: 'all', name: 'Všechny Uncommon', icon: '⚡' }
      ]
    },
    'Common': {
      title: 'One Piece Common karty',
      desc: 'Běžné (C) karty tvoří základ každé edice a jsou základním stavebním kamenem pro začínající hráče.',
      subsubcats: [
        { id: 'all', name: 'Všechny Common', icon: '🍃' }
      ]
    }
  }
};

export default function SinglesCatalog({ products, addToCart, setSelectedProductId, setActivePage, filters, setFilters, searchQuery, setSearchQuery }) {
  const [selectedGame, setSelectedGame] = useState(filters.game || 'Pokémon');
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
  const [activeSubcategory, setActiveSubcategory] = useState(filters.rarity || 'all');
  const [activeSubsubcategory, setActiveSubsubcategory] = useState(filters.subsubcat || 'all');



  // Sorting
  const [sortBy, setSortBy] = useState('top');

  // Mobile filters sidebar open/close
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

  const [prevFilters, setPrevFilters] = useState(filters);
  if (filters !== prevFilters) {
    setPrevFilters(filters);
    if (filters.game) setSelectedGame(filters.game);
    if (filters.lang) {
      setSelectedLangs([filters.lang]);
    } else {
      setSelectedLangs([]);
    }
    if (filters.edition) {
      setSelectedEditions([filters.edition]);
    } else {
      setSelectedEditions([]);
    }
    setActiveSubcategory(filters.rarity || 'all');
    setActiveSubsubcategory(filters.subsubcat || 'all');
  }

  // Get only singles and slabs (slab products are also single cards but graded!)
  const singles = products.filter(p => p.type === 'single' || p.type === 'slab');

  // Available filters options
  const editions = Array.from(new Set(singles.filter(s => s.game === selectedGame).map(s => s.edition)));
  const conditions = ['NM', 'EX', 'GD', 'LP', 'PL', 'PO'];
  const langs = ['EN', 'JP', 'CN', 'KR'];

  // Dynamic subcategories setup
  let subcategories = [];
  if (selectedGame === 'Pokémon') {
    subcategories = [
      { id: 'all', name: 'Pokémon TCG', icon: <img src="/Pokemon.webp" alt="" className="subcategory-img" /> },
      { id: 'Alternate Art', name: 'Alternate Art', icon: <img src="https://images.pokemontcg.io/swsh11/186.png" alt="" className="subcategory-img" /> },
      { id: 'Special Illustration Rare', name: 'Special Illustration', icon: <img src="https://images.pokemontcg.io/sv3/223.png" alt="" className="subcategory-img" /> },
      { id: 'Secret Rare', name: 'Secret Rare', icon: <img src="https://images.pokemontcg.io/swsh7/218.png" alt="" className="subcategory-img" /> },
      { id: 'Rainbow Rare', name: 'Rainbow Rare', icon: <img src="https://images.pokemontcg.io/swsh4/188.png" alt="" className="subcategory-img" /> },
    ];
  } else if (selectedGame === 'Lorcana') {
    subcategories = [
      { id: 'all', name: 'Lorcana TCG', icon: <img src="/Lorcana.png" alt="" className="subcategory-img" /> },
      { id: 'Common', name: 'Common', icon: <img src="https://tcgplayer-cdn.tcgplayer.com/product/508930_in_1000x1000.jpg" alt="" className="subcategory-img" /> },
      { id: 'Uncommon', name: 'Uncommon', icon: <img src="https://tcgplayer-cdn.tcgplayer.com/product/508930_in_1000x1000.jpg" alt="" className="subcategory-img" /> },
      { id: 'Rare', name: 'Rare', icon: <img src="https://tcgplayer-cdn.tcgplayer.com/product/508930_in_1000x1000.jpg" alt="" className="subcategory-img" /> },
      { id: 'Super Rare', name: 'Super Rare', icon: <img src="https://tcgplayer-cdn.tcgplayer.com/product/508930_in_1000x1000.jpg" alt="" className="subcategory-img" /> },
      { id: 'Legendary', name: 'Legendary', icon: <img src="https://tcgplayer-cdn.tcgplayer.com/product/508930_in_1000x1000.jpg" alt="" className="subcategory-img" /> },
      { id: 'Enchanted', name: 'Enchanted', icon: <img src="https://tcgplayer-cdn.tcgplayer.com/product/508930_in_1000x1000.jpg" alt="" className="subcategory-img" /> },
    ];
  } else if (selectedGame === 'One Piece') {
    subcategories = [
      { id: 'all', name: 'One Piece TCG', icon: <img src="/One piece.webp" alt="" className="subcategory-img" /> },
      { id: 'Common', name: 'Common', icon: <img src="https://tcgplayer-cdn.tcgplayer.com/product/527633_in_1000x1000.jpg" alt="" className="subcategory-img" /> },
      { id: 'Uncommon', name: 'Uncommon', icon: <img src="https://tcgplayer-cdn.tcgplayer.com/product/527633_in_1000x1000.jpg" alt="" className="subcategory-img" /> },
      { id: 'Rare', name: 'Rare', icon: <img src="https://tcgplayer-cdn.tcgplayer.com/product/527633_in_1000x1000.jpg" alt="" className="subcategory-img" /> },
      { id: 'Super Rare', name: 'Super Rare', icon: <img src="https://tcgplayer-cdn.tcgplayer.com/product/527633_in_1000x1000.jpg" alt="" className="subcategory-img" /> },
      { id: 'Secret Rare', name: 'Secret Rare', icon: <img src="https://tcgplayer-cdn.tcgplayer.com/product/527633_in_1000x1000.jpg" alt="" className="subcategory-img" /> },
      { id: 'Leader', name: 'Leader', icon: <img src="https://tcgplayer-cdn.tcgplayer.com/product/527633_in_1000x1000.jpg" alt="" className="subcategory-img" /> },
      { id: 'Alternate Art', name: 'Alternate Art', icon: <img src="https://tcgplayer-cdn.tcgplayer.com/product/527633_in_1000x1000.jpg" alt="" className="subcategory-img" /> },
    ];
  } else {
    subcategories = [
      { id: 'all', name: selectedGame ? `${selectedGame} TCG` : 'Všechny kusovky', icon: <img src="/Pokemon.webp" alt="" className="subcategory-img" /> }
    ];
  }

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
    // Game filter
    if (selectedGame && product.game !== selectedGame) {
      return false;
    }
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

    // Subsubcategory filter
    if (activeSubsubcategory !== 'all' && product.subsubcategory !== activeSubsubcategory) {
      return false;
    }

    // Variants matching filters
    if (product.type === 'slab') {
      if (foilFilter === 'foil') return false;
      if (product.price > priceRange) return false;
      if (selectedLangs.length > 0) {
        const slabLang = product.name.toLowerCase().includes('japanese') || product.name.toLowerCase().includes('jp') ? 'JP' : 'EN';
        if (!selectedLangs.includes(slabLang)) return false;
      }
      return true;
    }

    const matchingVariants = product.variants ? product.variants.filter(variant => {
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
    }) : [];

    return matchingVariants.length > 0;
  });

  // Sort logic
  const sortedSingles = [...filteredSingles].sort((a, b) => {
    const priceA = a.variants && a.variants.length > 0 ? Math.min(...a.variants.map(v => v.price)) : (a.price || 0);
    const priceB = b.variants && b.variants.length > 0 ? Math.min(...b.variants.map(v => v.price)) : (b.price || 0);

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

      {/* Breadcrumbs Navigation */}
      {(selectedGame !== 'all' || activeSubcategory !== 'all') && (
        <nav className="breadcrumbs-nav" aria-label="Drobečková navigace">
          <span className="breadcrumb-item" onClick={() => setActivePage('home')}>Domů</span>
          
          {selectedGame !== 'all' && (
            <>
              <span className="breadcrumb-separator">/</span>
              {activeSubcategory === 'all' ? (
                <span className="breadcrumb-item active">{selectedGame}</span>
              ) : (
                <span 
                  className="breadcrumb-item" 
                  onClick={() => { 
                    setActiveSubcategory('all'); 
                    setActiveSubsubcategory('all'); 
                    setFilters(prev => ({ ...prev, rarity: undefined, subsubcat: undefined })); 
                  }}
                >
                  {selectedGame}
                </span>
              )}
            </>
          )}

          {activeSubcategory !== 'all' && (
            <>
              <span className="breadcrumb-separator">/</span>
              <span className="breadcrumb-item active">
                {subcategories.find(s => s.id === activeSubcategory)?.name}
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
          {activeSubcategory === 'all' ? (
            <div className="category-intro-box">
              <div style={{ fontSize: '11px', color: 'var(--color-gold)', fontWeight: '800', textTransform: 'uppercase', marginBottom: '4px' }}>
                Kusové karty
              </div>
              <h2 className="category-title">{gameInfo[selectedGame]?.title || 'Kusové TCG karty'}</h2>
              <div className="category-description-wrapper">
                <p className={`category-description-text ${!isDescExpanded ? 'collapsed' : ''}`}>
                  {gameInfo[selectedGame]?.desc || 'Vyberte si ze širokého katalogu kusových karet pro různé karetní hry (Pokémon, Lorcana, One Piece, Riftbound). Garantujeme 100% originalitu a perfektní servis.'}
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
                {subSubcategoriesConfig[selectedGame]?.[activeSubcategory]?.title || `${selectedGame} - ${subcategories.find(s => s.id === activeSubcategory)?.name}`}
              </h2>
              <div className="category-description-wrapper">
                <p className={`category-description-text ${!isDescExpanded ? 'collapsed' : ''}`}>
                  {subSubcategoriesConfig[selectedGame]?.[activeSubcategory]?.desc || 'Detailní popis vzácnosti se připravuje.'}
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
            subcategories.length > 0 && (
              <>
                <div className="subcategories-section-title">
                  {selectedGame === 'Pokémon' ? 'Populární kategorie vzácností' : `Vyberte vzácnost (${selectedGame})`}
                </div>
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
                          setFilters(prev => ({ 
                            ...prev, 
                            rarity: sub.id === 'all' ? undefined : sub.id,
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
            )
          ) : (
            subSubcategoriesConfig[selectedGame]?.[activeSubcategory]?.subsubcats && (
              <>
                <div className="subcategories-section-title">
                  Upřesněte vzácnost
                </div>
                <div className="subcategory-grid">
                  {subSubcategoriesConfig[selectedGame][activeSubcategory].subsubcats.map(sub => {
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
