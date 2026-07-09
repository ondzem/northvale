import { useState, useEffect, useRef } from 'react';
import { FEATURE_FLAGS } from '../config';
import { useTranslation } from '../context/LanguageContext';
import { fetchProductsFromDB } from '../services/products';
import { fetchCategoriesFromDB } from '../services/categories';

export default function Navbar({ setActivePage, cart, user, setFilters, setSearchQuery, isLoggedIn, onOpenLogin, setSelectedProductId }) {
  const [drawerOpen, _setDrawerOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const setDrawerOpen = (open) => {
    if (open === false) {
      setIsClosing(true);
      setTimeout(() => {
        _setDrawerOpen(false);
        setIsClosing(false);
      }, 300);
    } else {
      _setDrawerOpen(true);
      setIsClosing(false);
    }
  };
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [searchInput, setSearchInput] = useState('');
  const { lang, setLang, t } = useTranslation();

  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [btnHovered, setBtnHovered] = useState(false);
  const searchContainerRef = useRef(null);
  const mobileSearchContainerRef = useRef(null);

  useEffect(() => {
    if (!searchInput.trim()) {
      setSuggestions([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      try {
        const results = await fetchProductsFromDB({ searchQuery: searchInput });
        setSuggestions(results.slice(0, 6));
      } catch (err) {
        console.error('Error fetching suggestions:', err);
      }
    }, 150);

  }, [searchInput]);

  const [categories, setCategories] = useState([]);

  useEffect(() => {
    let active = true;
    async function loadCategories() {
      try {
        const data = await fetchCategoriesFromDB();
        if (active) {
          setCategories(data || []);
        }
      } catch (err) {
        console.error("Failed to load categories in Navbar:", err);
      }
    }
    loadCategories();
    return () => { active = false; };
  }, []);

  const getCategoryIcon = (cat) => {
    if (cat.image_url) return cat.image_url;
    const id = cat.id || '';
    if (id.includes('booster-box')) {
      return 'https://tcgplayer-cdn.tcgplayer.com/product/552309_in_1000x1000.jpg';
    }
    if (id.includes('etb') || id.includes('trove')) {
      return 'https://tcgplayer-cdn.tcgplayer.com/product/506307_in_1000x1000.jpg';
    }
    if (id.includes('bundle')) {
      return 'https://tcgplayer-cdn.tcgplayer.com/product/530267_in_1000x1000.jpg';
    }
    if (id.includes('booster')) {
      return 'https://tcgplayer-cdn.tcgplayer.com/product/550201_in_1000x1000.jpg';
    }
    if (id.includes('special')) {
      return 'https://tcgplayer-cdn.tcgplayer.com/product/561990_in_1000x1000.jpg';
    }
    if (id.includes('sleeves')) {
      return 'https://tcgplayer-cdn.tcgplayer.com/product/484394_in_1000x1000.jpg';
    }
    if (id.includes('toploader')) {
      return 'https://tcgplayer-cdn.tcgplayer.com/product/251347_in_1000x1000.jpg';
    }
    if (id.includes('binder') || id.includes('album')) {
      return 'https://tcgplayer-cdn.tcgplayer.com/product/251411_in_1000x1000.jpg';
    }
    if (id.includes('acrylic')) {
      return '/acrylic-etb-box.webp';
    }
    return 'https://tcgplayer-cdn.tcgplayer.com/product/450463_in_1000x1000.jpg';
  };

  const pokemonCategories = categories.filter(c => c.game === 'Pokémon' && c.parent_id === 'game-pokemon');
  const lorcanaCategories = categories.filter(c => c.game === 'Lorcana' && c.parent_id === 'game-lorcana');
  const onepieceCategories = categories.filter(c => c.game === 'One Piece' && c.parent_id === 'game-onepiece');
  const riftboundCategories = categories.filter(c => c.game === 'Riftbound' && c.parent_id === 'game-riftbound');
  const accessoriesCategories = categories.filter(c => c.game === 'Accessories' && c.parent_id === 'game-accessories');
  const acrylicsCategories = categories.filter(c => c.game === 'Acrylics' && c.parent_id === 'game-acrylics');

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) &&
        (mobileSearchContainerRef.current && !mobileSearchContainerRef.current.contains(event.target))
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const renderSuggestions = () => {
    if (!showSuggestions || suggestions.length === 0) return null;
    return (
      <div style={styles.searchSuggestions}>
        {suggestions.map((p, index) => (
          <div
            key={p.id}
            style={{
              ...styles.suggestionItem,
              backgroundColor: hoveredIndex === index ? 'rgba(253, 189, 22, 0.08)' : 'transparent',
              borderBottom: index === suggestions.length - 1 ? 'none' : undefined
            }}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedProductId(p.id);
              if (p.type === 'single' || p.type === 'slab') {
                setActivePage('singles-detail');
              } else {
                setActivePage('sealed-detail');
              }
              setShowSuggestions(false);
              setSearchInput('');
            }}
          >
            <img 
              src={p.image || '/logo.png'} 
              alt={p.name || 'Northvale TCG'} 
              style={styles.suggestionThumb} 
              width="32"
              height="32"
              onError={(e) => { e.target.src = '/logo.png'; }}
            />
            <span style={styles.suggestionName}>{p.name}</span>
          </div>
        ))}
        <button
          type="button"
          style={{
            ...styles.allResultsBtn,
            backgroundColor: btnHovered ? 'rgba(255, 255, 255, 0.03)' : 'var(--bg-secondary)',
            color: btnHovered ? 'var(--text-main)' : 'var(--text-muted)'
          }}
          onMouseEnter={() => setBtnHovered(true)}
          onMouseLeave={() => setBtnHovered(false)}
          onClick={(e) => {
            e.stopPropagation();
            setSearchQuery(searchInput);
            setActivePage('sealed-catalog');
            setShowSuggestions(false);
          }}
        >
          {lang === 'CZ' ? 'Všechny výsledky hledání' : 'All search results'}
        </button>
      </div>
    );
  };
  
  const translateSubcat = (text) => {
    if (lang === 'CZ') return text;
    const mapping = {
      'Booster boxy': 'Booster Boxes',
      'Elite trainer boxy': 'Elite Trainer Boxes',
      'Bundles': 'Booster Bundles',
      'Boostery': 'Boosters',
      'Speciální kolekce': 'Special Collections',
      'Ostatní': 'Other',
      'Trove boxy': 'Trove Boxes',
      'Trial decky': 'Trial Decks',
      'Na karty': 'For Cards',
      'Na toploadery': 'For Toploaders',
      'Na graded karty': 'For Graded Cards',
      'Sleevy': 'Sleeves',
      'Toploadery': 'Toploaders',
      'Psa karty': 'PSA Cases',
      'Ostatní (CGC, TAG)': 'Other (CGC, TAG)',
      'Pre Grading': 'Pre-Grading',
      'Odeslání PSA': 'PSA Submission',
      'Odeslání Beckett': 'Beckett Submission',
      'Odeslání TAG': 'TAG Submission',
      'Průvodce stavy': 'Condition Guide',
      'Příslušenství': 'Accessories',
      'Akryly': 'Acrylics',
      'Ohodnocené karty': 'Graded Cards',
      'O nás': 'About Us',
      'Kontakt': 'Contact',
      'Výkup karet (Buylist)': 'Card Buylist',
      'Grading servis': 'Grading Service',
      'Nejčastější dotazy (FAQ)': 'FAQ',
      'Doprava a osobní odběr': 'Shipping & Pickup',
      'Obchodní podmínky (VOP)': 'Terms & Conditions',
      'Ochrana osobních údajů (GDPR)': 'Privacy Policy (GDPR)',
      'Odstoupení od smlouvy': 'Contract Withdrawal',
      'Kontakty': 'Contacts',
      'Provozovatel': 'Operator',
      'Sídlo': 'Registered Address',
      'Odběr': 'Pickup Address',
      'Jazyk': 'Language',
      'Potřebujete poradit?': 'Need assistance?',
      'Nejčastější dotazy': 'Frequently Asked Questions',
      'Informace o společnosti': 'Company Information',
      'Vše o nákupu': 'Customer Service'
    };
    return mapping[text] || text;
  };

  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 900);
  const langTimeoutRef = useRef(null);

  const handleLangMouseEnter = () => {
    if (isMobile) return;
    if (langTimeoutRef.current) {
      clearTimeout(langTimeoutRef.current);
      langTimeoutRef.current = null;
    }
    setLangDropdownOpen(true);
  };

  const handleLangMouseLeave = () => {
    if (isMobile) return;
    if (langTimeoutRef.current) {
      clearTimeout(langTimeoutRef.current);
    }
    langTimeoutRef.current = setTimeout(() => {
      setLangDropdownOpen(false);
    }, 250);
  };

  const handleLangClick = (e) => {
    e.stopPropagation();
    setLangDropdownOpen((prev) => !prev);
  };

  const handleSelectLang = (newLang) => {
    setLang(newLang);
    setLangDropdownOpen(false);
    if (langTimeoutRef.current) {
      clearTimeout(langTimeoutRef.current);
      langTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 900);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (langTimeoutRef.current) {
        clearTimeout(langTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (drawerOpen) {
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
  }, [drawerOpen]);



  const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearchQuery(searchInput);
    setActivePage('sealed-catalog');
  };

  const handleCategoryClick = (category, subFilters = {}) => {
    setFilters(subFilters);
    if (category === 'sealed') {
      setActivePage('sealed-catalog');
    } else if (category === 'grading') {
      setActivePage('grading');
    }
    setActiveDropdown(null);
  };

  return (
    <header style={styles.header} className="main-navbar">
      {!isMobile ? (
        <>
          {/* 1. TOP BAR (Zákaznická pomoc, Čeština, sociální sítě) */}
          <div style={styles.topBar}>
            <div className="container" style={styles.topBarContent}>
              <div style={styles.topBarLeft} onClick={() => setActivePage('faq')}>
                {t('Navbar.advice')} <strong style={styles.faqLink}>{t('Navbar.faqLink')}</strong>
              </div>
              <div style={styles.topBarRight}>
                <div
                  style={styles.langContainer}
                  onMouseEnter={handleLangMouseEnter}
                  onMouseLeave={handleLangMouseLeave}
                >
                  <div
                    style={styles.langSelector}
                    onClick={handleLangClick}
                  >
                    {lang === 'CZ' ? (
                      <>
                        <img src="/cz ikona.png" alt="CZ" style={styles.flagIcon} width="16" height="11" />
                        <span>Čeština</span>
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 30" style={styles.flagIcon}>
                          <clipPath id="s">
                            <path d="M0,0 v30 h60 v-30 z" />
                          </clipPath>
                          <path d="M0,0 v30 h60 v-30 z" fill="#012169" />
                          <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" clipPath="url(#s)" />
                          <path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" strokeWidth="4" clipPath="url(#s)" />
                          <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10" />
                          <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6" />
                        </svg>
                        <span>English</span>
                      </>
                    )}
                    <img src="/angle-small-down (1).png" style={styles.langChevron} alt="" width="10" height="10" />
                  </div>

                  {langDropdownOpen && (
                    <div style={styles.langDropdown} className="glass-panel">
                      <div
                        style={{
                          ...styles.langOption,
                          backgroundColor: lang === 'CZ' ? 'rgba(255,255,255,0.05)' : 'transparent',
                        }}
                        onClick={() => handleSelectLang('CZ')}
                      >
                        <img src="/cz ikona.png" alt="CZ" style={styles.flagIcon} width="16" height="11" />
                        <span>Čeština</span>
                      </div>
                      <div
                        style={{
                          ...styles.langOption,
                          backgroundColor: lang === 'EN' ? 'rgba(255,255,255,0.05)' : 'transparent',
                        }}
                        onClick={() => handleSelectLang('EN')}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 30" style={styles.flagIcon}>
                          <clipPath id="s2">
                            <path d="M0,0 v30 h60 v-30 z" />
                          </clipPath>
                          <path d="M0,0 v30 h60 v-30 z" fill="#012169" />
                          <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" clipPath="url(#s2)" />
                          <path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" strokeWidth="4" clipPath="url(#s2)" />
                          <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10" />
                          <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6" />
                        </svg>
                        <span>English</span>
                      </div>
                    </div>
                  )}
                </div>

                <span style={styles.topBarDivider}>|</span>

                <span className="topbar-contact-link" style={styles.contactLink} onClick={() => setActivePage('support')}>
                  Kontakt
                </span>

                <span style={styles.topBarDivider}>|</span>

                <div style={styles.socials}>
                  <a href="https://www.instagram.com/northvaletcg/?utm_source=ig_web_button_share_sheet" target="_blank" rel="noopener noreferrer" className="topbar-social-link" style={styles.socialLink}>
                    <img src="/instagram.png" alt="Instagram" className="topbar-social-icon" style={styles.socialIcon} width="14" height="14" />
                  </a>
                  <a href="https://www.facebook.com/share/18yajuq6N1/?mibextid=wwXIfr" target="_blank" rel="noopener noreferrer" className="topbar-social-link" style={styles.socialLink}>
                    <img src="/facebook.png" alt="Facebook" className="topbar-social-icon" style={styles.socialIcon} width="14" height="14" />
                  </a>
                  <a href="https://www.tiktok.com/@northvaletcg" target="_blank" rel="noopener noreferrer" className="topbar-social-link" style={styles.socialLink}>
                    <img src="/tik-tok.png" alt="TikTok" className="topbar-social-icon" style={styles.socialIcon} width="14" height="14" />
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* 2. MIDDLE BAR (Logo, Vyhledávání, Oblíbené, Přihlásit se, Košík) */}
          <div style={styles.middleBar}>
            <div className="container" style={styles.middleBarContent}>
              {/* Logo */}
              <a 
                href="/" 
                style={{ ...styles.logoContainer, display: 'block' }} 
                onClick={(e) => {
                  if (e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
                    e.preventDefault();
                    setFilters({});
                    setActivePage('home');
                  }
                }}
              >
                <img src="/logo s popisem.webp" alt="NORTHVALE TCG" style={styles.logoImg} width="168" height="84" />
              </a>

              <form 
                ref={searchContainerRef}
                onSubmit={handleSearchSubmit} 
                style={styles.searchForm}
                onFocus={() => setShowSuggestions(true)}
              >
                <input
                  type="text"
                  placeholder={t('Navbar.searchPlaceholder')}
                  value={searchInput}
                  onChange={(e) => {
                    setSearchInput(e.target.value);
                    setShowSuggestions(true);
                  }}
                  style={styles.searchInput}
                />
                <button type="submit" style={styles.searchBtn}>
                  <img src="/search.png" alt={t('common.search')} style={styles.searchIcon} width="16" height="16" />
                </button>
                {renderSuggestions()}
              </form>

              <div style={styles.navActions}>
                <button className="nav-action-btn" onClick={() => setActivePage('favorites')} title={t('Navbar.favorites')}>
                  <img src="/heart.png" alt={t('Navbar.favorites')} width="18" height="18" />
                  <span style={styles.actionLabel}>{t('Navbar.favorites')}</span>
                </button>

                <button
                  className="nav-action-btn"
                  onClick={() => isLoggedIn ? setActivePage('profile') : onOpenLogin()}
                  title={isLoggedIn ? t('Navbar.myAccount') : t('Navbar.login')}
                >
                  {isLoggedIn && user.avatar && user.avatar !== '/user.png' ? (
                    <img
                      src={user.avatar}
                      alt="Profil"
                      className="no-invert-avatar"
                      width="22"
                      height="22"
                      style={{ borderRadius: '50%', filter: 'none', width: '22px', height: '22px', objectFit: 'cover' }}
                    />
                  ) : (
                    <img src="/user.png" alt="Profil" width="18" height="18" />
                  )}
                  <span style={styles.actionLabel}>
                    {isLoggedIn ? `${user.name || t('Navbar.myAccount')}` : t('Navbar.login')}
                  </span>
                </button>

                <button className="nav-action-btn" style={{ marginRight: '-12px' }} onClick={() => setActivePage('cart')} title={t('Navbar.cart')}>
                  <div style={styles.cartIconWrapper}>
                    <img src="/shopping-cart.png" alt={t('Navbar.cart')} width="18" height="18" />
                    {cartItemsCount > 0 && (
                      <span style={styles.cartBadge}>{cartItemsCount}</span>
                    )}
                  </div>
                  <span style={styles.actionLabel}>{t('Navbar.cart')}</span>
                </button>
              </div>
            </div>
          </div>

          {/* 3. BOTTOM BAR (Kategorie, Hamburger) */}
          <nav style={styles.bottomBar}>
            <div className="container" style={styles.bottomBarContent}>
              <div style={styles.categoriesList}>
                {/* 1. Pokémon Dropdown */}
                <div
                  style={styles.dropdownContainer}
                  onMouseEnter={() => { if (pokemonCategories.length > 0) setActiveDropdown('pokemon'); }}
                  onMouseLeave={() => setActiveDropdown(null)}
                >
                  <a 
                    href="/sealed-catalog?game=Pokémon"
                    style={{ ...styles.categoryItem, paddingLeft: 0 }} 
                    onClick={(e) => {
                      if (e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
                        e.preventDefault();
                        handleCategoryClick('sealed', { game: 'Pokémon' });
                      }
                    }}
                  >
                    Pokémon {pokemonCategories.length > 0 && <img src="/angle-small-down (1).png" style={styles.chevron} alt="" width="10" height="10" />}
                  </a>
                  {pokemonCategories.length > 0 && activeDropdown === 'pokemon' && (
                    <div style={styles.dropdownMenu} className="glass-panel dropdown-menu-animate">
                      <div className="nav-dropdown-row">
                        {pokemonCategories.map(cat => (
                          <div key={cat.id} className="nav-dropdown-item" onClick={() => handleCategoryClick('sealed', { game: 'Pokémon', category_id: cat.id })}>
                            <div className="nav-dropdown-icon">
                              <img src={getCategoryIcon(cat)} alt="" className="nav-dropdown-img" width="60" height="60" />
                            </div>
                            <span className="nav-dropdown-text">{lang === 'CZ' ? cat.name_cz : cat.name_en}</span>
                          </div>
                        ))}
                      </div>
                      <div className="nav-dropdown-footer">
                        <span className="nav-dropdown-all-link" onClick={() => handleCategoryClick('sealed', { game: 'Pokémon' })}>
                          {t('Navbar.allCategory')}
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                            <polyline points="12 5 19 12 12 19"></polyline>
                          </svg>
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Disney Lorcana Dropdown */}
                <div
                  style={styles.dropdownContainer}
                  onMouseEnter={() => { if (lorcanaCategories.length > 0) setActiveDropdown('lorcana'); }}
                  onMouseLeave={() => setActiveDropdown(null)}
                >
                  <a 
                    href="/sealed-catalog?game=Lorcana"
                    style={styles.categoryItem} 
                    onClick={(e) => {
                      if (e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
                        e.preventDefault();
                        handleCategoryClick('sealed', { game: 'Lorcana' });
                      }
                    }}
                  >
                    Disney Lorcana {lorcanaCategories.length > 0 && <img src="/angle-small-down (1).png" style={styles.chevron} alt="" width="10" height="10" />}
                  </a>
                  {lorcanaCategories.length > 0 && activeDropdown === 'lorcana' && (
                    <div style={styles.dropdownMenu} className="glass-panel dropdown-menu-animate">
                      <div className="nav-dropdown-row">
                        {lorcanaCategories.map(cat => (
                          <div key={cat.id} className="nav-dropdown-item" onClick={() => handleCategoryClick('sealed', { game: 'Lorcana', category_id: cat.id })}>
                            <div className="nav-dropdown-icon">
                              <img src={getCategoryIcon(cat)} alt="" className="nav-dropdown-img" width="60" height="60" />
                            </div>
                            <span className="nav-dropdown-text">{lang === 'CZ' ? cat.name_cz : cat.name_en}</span>
                          </div>
                        ))}
                      </div>
                      <div className="nav-dropdown-footer">
                        <span className="nav-dropdown-all-link" onClick={() => handleCategoryClick('sealed', { game: 'Lorcana' })}>
                          {t('Navbar.allCategory')}
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                            <polyline points="12 5 19 12 12 19"></polyline>
                          </svg>
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. One Piece Dropdown */}
                <div
                  style={styles.dropdownContainer}
                  onMouseEnter={() => { if (onepieceCategories.length > 0) setActiveDropdown('onepiece'); }}
                  onMouseLeave={() => setActiveDropdown(null)}
                >
                  <a 
                    href="/sealed-catalog?game=One+Piece"
                    style={styles.categoryItem} 
                    onClick={(e) => {
                      if (e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
                        e.preventDefault();
                        handleCategoryClick('sealed', { game: 'One Piece' });
                      }
                    }}
                  >
                    One Piece {onepieceCategories.length > 0 && <img src="/angle-small-down (1).png" style={styles.chevron} alt="" width="10" height="10" />}
                  </a>
                  {onepieceCategories.length > 0 && activeDropdown === 'onepiece' && (
                    <div style={styles.dropdownMenu} className="glass-panel dropdown-menu-animate">
                      <div className="nav-dropdown-row">
                        {onepieceCategories.map(cat => (
                          <div key={cat.id} className="nav-dropdown-item" onClick={() => handleCategoryClick('sealed', { game: 'One Piece', category_id: cat.id })}>
                            <div className="nav-dropdown-icon">
                              <img src={getCategoryIcon(cat)} alt="" className="nav-dropdown-img" width="60" height="60" />
                            </div>
                            <span className="nav-dropdown-text">{lang === 'CZ' ? cat.name_cz : cat.name_en}</span>
                          </div>
                        ))}
                      </div>
                      <div className="nav-dropdown-footer">
                        <span className="nav-dropdown-all-link" onClick={() => handleCategoryClick('sealed', { game: 'One Piece' })}>
                          {t('Navbar.allCategory')}
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                            <polyline points="12 5 19 12 12 19"></polyline>
                          </svg>
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 4. Riftbound Dropdown */}
                <div
                  style={styles.dropdownContainer}
                  onMouseEnter={() => { if (riftboundCategories.length > 0) setActiveDropdown('riftbound'); }}
                  onMouseLeave={() => setActiveDropdown(null)}
                >
                  <a 
                    href="/sealed-catalog?game=Riftbound"
                    style={styles.categoryItem} 
                    onClick={(e) => {
                      if (e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
                        e.preventDefault();
                        handleCategoryClick('sealed', { game: 'Riftbound' });
                      }
                    }}
                  >
                    Riftbound {riftboundCategories.length > 0 && <img src="/angle-small-down (1).png" style={styles.chevron} alt="" width="10" height="10" />}
                  </a>
                  {riftboundCategories.length > 0 && activeDropdown === 'riftbound' && (
                    <div style={styles.dropdownMenu} className="glass-panel dropdown-menu-animate">
                      <div className="nav-dropdown-row">
                        {riftboundCategories.map(cat => (
                          <div key={cat.id} className="nav-dropdown-item" onClick={() => handleCategoryClick('sealed', { game: 'Riftbound', category_id: cat.id })}>
                            <div className="nav-dropdown-icon">
                              <img src={getCategoryIcon(cat)} alt="" className="nav-dropdown-img" width="60" height="60" />
                            </div>
                            <span className="nav-dropdown-text">{lang === 'CZ' ? cat.name_cz : cat.name_en}</span>
                          </div>
                        ))}
                      </div>
                      <div className="nav-dropdown-footer">
                        <span className="nav-dropdown-all-link" onClick={() => handleCategoryClick('sealed', { game: 'Riftbound' })}>
                          {t('Navbar.allCategory')}
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                            <polyline points="12 5 19 12 12 19"></polyline>
                          </svg>
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 5. Příslušenství Dropdown */}
                <div
                  style={styles.dropdownContainer}
                  onMouseEnter={() => { if (accessoriesCategories.length > 0) setActiveDropdown('accessories'); }}
                  onMouseLeave={() => setActiveDropdown(null)}
                >
                  <a 
                    href="/sealed-catalog?game=Accessories"
                    style={styles.categoryItem} 
                    onClick={(e) => {
                      if (e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
                        e.preventDefault();
                        handleCategoryClick('sealed', { game: 'Accessories' });
                      }
                    }}
                  >
                    {translateSubcat('Příslušenství')} {accessoriesCategories.length > 0 && <img src="/angle-small-down (1).png" style={styles.chevron} alt="" width="10" height="10" />}
                  </a>
                  {accessoriesCategories.length > 0 && activeDropdown === 'accessories' && (
                    <div style={styles.dropdownMenu} className="glass-panel dropdown-menu-animate">
                      <div className="nav-dropdown-row">
                        {accessoriesCategories.map(cat => (
                          <div key={cat.id} className="nav-dropdown-item" onClick={() => handleCategoryClick('sealed', { game: 'Accessories', category_id: cat.id })}>
                            <div className="nav-dropdown-icon">
                              <img src={getCategoryIcon(cat)} alt="" className="nav-dropdown-img" width="60" height="60" />
                            </div>
                            <span className="nav-dropdown-text">{lang === 'CZ' ? cat.name_cz : cat.name_en}</span>
                          </div>
                        ))}
                      </div>
                      <div className="nav-dropdown-footer">
                        <span className="nav-dropdown-all-link" onClick={() => handleCategoryClick('sealed', { game: 'Accessories' })}>
                          {t('Navbar.allCategory')}
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                            <polyline points="12 5 19 12 12 19"></polyline>
                          </svg>
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 6. Akryly Dropdown */}
                <div
                  style={styles.dropdownContainer}
                  onMouseEnter={() => { if (acrylicsCategories.length > 0) setActiveDropdown('acrylics'); }}
                  onMouseLeave={() => setActiveDropdown(null)}
                >
                  <a 
                    href="/sealed-catalog?game=Acrylics"
                    style={styles.categoryItem} 
                    onClick={(e) => {
                      if (e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
                        e.preventDefault();
                        handleCategoryClick('sealed', { game: 'Acrylics' });
                      }
                    }}
                  >
                    {translateSubcat('Akryly')} {acrylicsCategories.length > 0 && <img src="/angle-small-down (1).png" style={styles.chevron} alt="" width="10" height="10" />}
                  </a>
                  {acrylicsCategories.length > 0 && activeDropdown === 'acrylics' && (
                    <div style={styles.dropdownMenu} className="glass-panel dropdown-menu-animate">
                      <div className="nav-dropdown-row">
                        {acrylicsCategories.map(cat => (
                          <div key={cat.id} className="nav-dropdown-item" onClick={() => handleCategoryClick('sealed', { game: 'Acrylics', category_id: cat.id })}>
                            <div className="nav-dropdown-icon">
                              <img src={getCategoryIcon(cat)} alt="" className="nav-dropdown-img" width="60" height="60" />
                            </div>
                            <span className="nav-dropdown-text">{lang === 'CZ' ? cat.name_cz : cat.name_en}</span>
                          </div>
                        ))}
                      </div>
                      <div className="nav-dropdown-footer">
                        <span className="nav-dropdown-all-link" onClick={() => handleCategoryClick('sealed', { game: 'Acrylics' })}>
                          {t('Navbar.allCategory')}
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                            <polyline points="12 5 19 12 12 19"></polyline>
                          </svg>
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 6. Ohodnocené karty Dropdown */}
                {FEATURE_FLAGS.showSlabs && (
                  <div
                    style={styles.dropdownContainer}
                    onMouseEnter={() => setActiveDropdown('slabs')}
                    onMouseLeave={() => setActiveDropdown(null)}
                  >
                    <a 
                      href="/slabs-catalog"
                      style={styles.categoryItem} 
                      onClick={(e) => {
                        if (e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
                          e.preventDefault();
                          handleCategoryClick('slabs');
                        }
                      }}
                    >
                      {translateSubcat('Ohodnocené karty')} <img src="/angle-small-down (1).png" style={styles.chevron} alt="" width="10" height="10" />
                    </a>
                    {activeDropdown === 'slabs' && (
                      <div style={styles.dropdownMenu} className="glass-panel dropdown-menu-animate">
                        <div className="nav-dropdown-row">
                          <div className="nav-dropdown-item" onClick={() => handleCategoryClick('slabs', { company: 'PSA' })}>
                            <div className="nav-dropdown-icon">
                              <img src="/Ohodnoceni karet.webp" alt="" className="nav-dropdown-img" width="60" height="60" />
                            </div>
                            <span className="nav-dropdown-text">{translateSubcat('PSA')}</span>
                          </div>
                          <div className="nav-dropdown-item" onClick={() => handleCategoryClick('slabs', { company: 'Beckett' })}>
                            <div className="nav-dropdown-icon">
                              <img src="/Ohodnoceni karet.webp" alt="" className="nav-dropdown-img" width="60" height="60" />
                            </div>
                            <span className="nav-dropdown-text">{translateSubcat('Beckett')}</span>
                          </div>
                          <div className="nav-dropdown-item" onClick={() => handleCategoryClick('slabs', { company: 'Other' })}>
                            <div className="nav-dropdown-icon">
                              <img src="/Ohodnoceni karet.webp" alt="" className="nav-dropdown-img" width="60" height="60" />
                            </div>
                            <span className="nav-dropdown-text">Ostatní (CGC, TAG)</span>
                          </div>
                        </div>
                        <div className="nav-dropdown-footer">
                          <span className="nav-dropdown-all-link" onClick={() => handleCategoryClick('slabs')}>
                            {t('Navbar.allCategory')}
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="5" y1="12" x2="19" y2="12"></line>
                              <polyline points="12 5 19 12 12 19"></polyline>
                            </svg>
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 7. Grading Dropdown */}
                {FEATURE_FLAGS.showGrading && (
                  <div
                    style={styles.dropdownContainer}
                    onMouseEnter={() => setActiveDropdown('grading')}
                    onMouseLeave={() => setActiveDropdown(null)}
                  >
                    <a 
                      href="/grading"
                      style={styles.categoryItem} 
                      onClick={(e) => {
                        if (e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
                          e.preventDefault();
                          setActivePage('grading');
                        }
                      }}
                    >
                      Grading <img src="/angle-small-down (1).png" style={styles.chevron} alt="" width="10" height="10" />
                    </a>
                    {activeDropdown === 'grading' && (
                      <div style={styles.dropdownMenu} className="glass-panel dropdown-menu-animate">
                        <div className="nav-dropdown-row">
                          <div className="nav-dropdown-item" onClick={() => { setActivePage('grading'); setActiveDropdown(null); }}>
                            <div className="nav-dropdown-icon">
                              <img src="/Grading.webp" alt="" className="nav-dropdown-img" width="60" height="60" />
                            </div>
                            <span className="nav-dropdown-text">{translateSubcat('Pre Grading')}</span>
                          </div>
                          <div className="nav-dropdown-item" onClick={() => { setActivePage('grading'); setActiveDropdown(null); }}>
                            <div className="nav-dropdown-icon">
                              <img src="/Desktop - Grading Karet.webp" alt="" className="nav-dropdown-img" width="60" height="60" />
                            </div>
                            <span className="nav-dropdown-text">{translateSubcat('Odeslání PSA')}</span>
                          </div>
                          <div className="nav-dropdown-item" onClick={() => { setActivePage('grading'); setActiveDropdown(null); }}>
                            <div className="nav-dropdown-icon">
                              <img src="/Mobile - Grading karet.webp" alt="" className="nav-dropdown-img" width="60" height="60" />
                            </div>
                            <span className="nav-dropdown-text">{translateSubcat('Odeslání Beckett')}</span>
                          </div>
                          <div className="nav-dropdown-item" onClick={() => { setActivePage('grading'); setActiveDropdown(null); }}>
                            <div className="nav-dropdown-icon">
                              <img src="/grading sekce.webp" alt="" className="nav-dropdown-img" width="60" height="60" />
                            </div>
                            <span className="nav-dropdown-text">{translateSubcat('Odeslání TAG')}</span>
                          </div>
                          <div className="nav-dropdown-item" onClick={() => { setActivePage('grading-guide'); setActiveDropdown(null); }}>
                            <div className="nav-dropdown-icon">
                              <img src="/grading sekce.webp" alt="" className="nav-dropdown-img" width="60" height="60" />
                            </div>
                            <span className="nav-dropdown-text" style={{ color: 'var(--color-gold)' }}>{translateSubcat('Průvodce stavy')}</span>
                          </div>
                        </div>
                        <div className="nav-dropdown-footer">
                          <span className="nav-dropdown-all-link" onClick={() => { setActivePage('grading'); setActiveDropdown(null); }}>
                            {t('Navbar.allCategory')}
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="5" y1="12" x2="19" y2="12"></line>
                              <polyline points="12 5 19 12 12 19"></polyline>
                            </svg>
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

              </div>

              {/* Hamburger Icon */}
              <button style={styles.hamburgerBtn} onClick={() => setDrawerOpen(true)} title={lang === 'CZ' ? 'Více informací' : 'More information'}>
                <svg viewBox="0 0 24 24" style={styles.hamburgerIcon} stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round">
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>
            </div>
          </nav>
        </>
      ) : (
        <>
          {/* Mobile Main Row */}
          <div style={styles.mobileMainRow}>
            <div className="container" style={styles.mobileMainRowContent}>
              {/* Left: Hamburger */}
              <div style={styles.mobileLeftArea}>
                <button style={{ ...styles.hamburgerBtn, marginLeft: '-8px', marginRight: 0 }} onClick={() => setDrawerOpen(true)} title={t('Navbar.menu')}>
                  <svg viewBox="0 0 24 24" style={styles.hamburgerIcon} stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round">
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                  </svg>
                </button>
              </div>

              {/* Center: Logo */}
              <a 
                href="/" 
                style={{ ...styles.mobileCenterArea, display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
                onClick={(e) => {
                  if (e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
                    e.preventDefault();
                    setFilters({});
                    setActivePage('home');
                  }
                }}
              >
                <img src="/Northvale Logo.webp" alt="NORTHVALE TCG" style={styles.mobileLogoImg} width="80" height="80" />
              </a>

              {/* Right: Profile & Cart */}
              <div style={styles.mobileRightArea}>
                <button
                  className="nav-action-btn"
                  style={styles.mobileActionBtn}
                  onClick={() => isLoggedIn ? setActivePage('profile') : onOpenLogin()}
                  title={isLoggedIn ? "Můj účet" : "Přihlásit se"}
                >
                  {isLoggedIn && user.avatar && user.avatar !== '/user.png' ? (
                    <img
                      src={user.avatar}
                      alt="Profil"
                      className="no-invert-avatar"
                      style={{ borderRadius: '50%', filter: 'none', width: '22px', height: '22px', objectFit: 'cover' }}
                    />
                  ) : (
                    <img src="/user.png" alt="Profil" style={styles.mobileActionIcon} width="20" height="20" />
                  )}
                </button>
                <button className="nav-action-btn" style={{ ...styles.mobileActionBtn, marginRight: '-8px' }} onClick={() => setActivePage('cart')} title="Košík">
                  <div style={styles.cartIconWrapper}>
                    <img src="/shopping-cart.png" alt="Košík" style={styles.mobileActionIcon} width="20" height="20" />
                    {cartItemsCount > 0 && (
                      <span style={styles.cartBadge}>{cartItemsCount}</span>
                    )}
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Search Row */}
          <div style={styles.mobileSearchRow}>
            <div className="container">
              <form 
                ref={mobileSearchContainerRef}
                onSubmit={handleSearchSubmit} 
                style={styles.mobileSearchForm}
                onFocus={() => setShowSuggestions(true)}
              >
                <input
                  type="text"
                  placeholder={t('Navbar.searchPlaceholder')}
                  value={searchInput}
                  onChange={(e) => {
                    setSearchInput(e.target.value);
                    setShowSuggestions(true);
                  }}
                  style={styles.mobileSearchInput}
                />
                <button type="submit" style={styles.mobileSearchBtn}>
                  <img src="/search.png" alt="Hledat" style={styles.searchIcon} width="16" height="16" />
                </button>
                {renderSuggestions()}
              </form>
            </div>
          </div>
        </>
      )}

      {/* 4. SLIDE-OUT DRAWER OVERLAY */}
      {drawerOpen && (
        <div
          style={{
            ...styles.drawerOverlay,
            justifyContent: isMobile ? 'flex-start' : 'flex-end',
            animation: isClosing ? 'fadeOut 0.3s forwards' : 'none'
          }}
          onClick={() => setDrawerOpen(false)}
        >
          <div
            style={{
              ...styles.drawer,
              width: isMobile ? '100vw' : 'min(360px, 100vw)',
              borderRight: isMobile ? '1px solid rgba(63, 63, 86, 0.4)' : 'none',
              borderLeft: isMobile ? 'none' : '1px solid rgba(63, 63, 86, 0.4)',
              boxShadow: isMobile ? '10px 0 30px rgba(0,0,0,0.5)' : '-10px 0 30px rgba(0,0,0,0.5)',
              transformOrigin: isMobile ? 'top left' : 'top right',
              animation: isClosing
                ? (isMobile ? 'slideOutToTopLeft 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards' : 'slideOutToTopRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards')
                : (isMobile ? 'slideFromTopLeft 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards' : 'slideFromTopRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards')
            }}
            className="glass-panel"
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              ...styles.drawerHeader,
              borderBottom: 'none',
              paddingBottom: isMobile ? '0' : '16px',
              marginBottom: isMobile ? '72px' : '20px',
            }}>
              <button style={styles.drawerCloseBtn} onClick={() => setDrawerOpen(false)}>&times;</button>
            </div>

            <div style={styles.drawerBody} className="drawer-body-no-scrollbar">
              {/* Mobile Navigation Categories (Only shown on mobile) */}
              {isMobile && (
                <div style={styles.mobileDrawerNav}>
                  {/* 1. Pokémon */}
                  <div style={styles.mobileNavSection}>
                    <div className="mobile-nav-header" style={styles.mobileNavHeader} onClick={() => { handleCategoryClick('sealed', { game: 'Pokémon' }); setDrawerOpen(false); }}>
                      <span>Pokémon</span>
                    </div>
                  </div>

                  {/* 2. Disney Lorcana */}
                  <div style={styles.mobileNavSection}>
                    <div className="mobile-nav-header" style={styles.mobileNavHeader} onClick={() => { handleCategoryClick('sealed', { game: 'Lorcana' }); setDrawerOpen(false); }}>
                      <span>Disney Lorcana</span>
                    </div>
                  </div>

                  {/* 3. One Piece */}
                  <div style={styles.mobileNavSection}>
                    <div className="mobile-nav-header" style={styles.mobileNavHeader} onClick={() => { handleCategoryClick('sealed', { game: 'One Piece' }); setDrawerOpen(false); }}>
                      <span>One Piece</span>
                    </div>
                  </div>

                  {/* 4. Riftbound */}
                  <div style={styles.mobileNavSection}>
                    <div className="mobile-nav-header" style={styles.mobileNavHeader} onClick={() => { handleCategoryClick('sealed', { game: 'Riftbound' }); setDrawerOpen(false); }}>
                      <span>Riftbound</span>
                    </div>
                  </div>

                  {/* 5. Accessories */}
                  <div style={styles.mobileNavSection}>
                    <div className="mobile-nav-header" style={styles.mobileNavHeader} onClick={() => { handleCategoryClick('sealed', { game: 'Accessories' }); setDrawerOpen(false); }}>
                      <span>{translateSubcat('Příslušenství')}</span>
                    </div>
                  </div>

                  {/* 6. Acrylics */}
                  <div style={styles.mobileNavSection}>
                    <div className="mobile-nav-header" style={styles.mobileNavHeader} onClick={() => { handleCategoryClick('sealed', { game: 'Acrylics' }); setDrawerOpen(false); }}>
                      <span>{translateSubcat('Akryly')}</span>
                    </div>
                  </div>

                  {/* O nás mobile link */}
                  <div style={styles.mobileNavSection}>
                    <div className="mobile-nav-header" style={styles.mobileNavHeader} onClick={() => { setActivePage('about'); setDrawerOpen(false); }}>
                      <span>{t('Navbar.aboutUs')}</span>
                    </div>
                  </div>

                  {/* Blog mobile link */}
                  <div style={styles.mobileNavSection}>
                    <div className="mobile-nav-header" style={styles.mobileNavHeader} onClick={() => { setActivePage('blog'); setDrawerOpen(false); }}>
                      <span>Blog</span>
                    </div>
                  </div>

                  {/* 7. Slabs */}
                  {FEATURE_FLAGS.showSlabs && (
                    <div style={styles.mobileNavSection}>
                      <div className="mobile-nav-header" style={styles.mobileNavHeader} onClick={() => { handleCategoryClick('slabs'); setDrawerOpen(false); }}>
                        <span>{translateSubcat('Ohodnocené karty')}</span>
                      </div>
                    </div>
                  )}

                  {/* 8. Grading */}
                  {FEATURE_FLAGS.showGrading && (
                    <div style={styles.mobileNavSection}>
                      <div className="mobile-nav-header" style={styles.mobileNavHeader} onClick={() => { setActivePage('grading'); setDrawerOpen(false); }}>
                        <span>Grading</span>
                      </div>
                    </div>
                  )}

                  {/* Language selector on mobile */}
                  <div style={{ ...styles.mobileNavSection, borderBottom: 'none', paddingBottom: '0', marginTop: '48px' }}>
                    <div style={{ ...styles.mobileNavHeader, cursor: 'default', backgroundColor: 'transparent', border: 'none' }}>
                      <span>{translateSubcat('Jazyk')}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '8px', justifyContent: 'center' }}>
                      <button
                        style={{
                          ...styles.mobileLangBtn,
                          border: lang === 'CZ' ? '1px solid var(--color-gold)' : '1px solid rgba(255,255,255,0.1)',
                          backgroundColor: lang === 'CZ' ? 'rgba(253, 189, 22, 0.1)' : 'transparent',
                        }}
                        onClick={() => setLang('CZ')}
                      >
                        <img src="/cz ikona.png" alt="CZ" style={styles.flagIcon} width="16" height="11" /> Čeština
                      </button>
                      <button
                        style={{
                          ...styles.mobileLangBtn,
                          border: lang === 'EN' ? '1px solid var(--color-gold)' : '1px solid rgba(255,255,255,0.1)',
                          backgroundColor: lang === 'EN' ? 'rgba(253, 189, 22, 0.1)' : 'transparent',
                        }}
                        onClick={() => setLang('EN')}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 30" style={styles.flagIcon}>
                          <clipPath id="s-mob">
                            <path d="M0,0 v30 h60 v-30 z" />
                          </clipPath>
                          <path d="M0,0 v30 h60 v-30 z" fill="#012169" />
                          <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" clipPath="url(#s-mob)" />
                          <path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" strokeWidth="4" clipPath="url(#s-mob)" />
                          <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10" />
                          <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6" />
                        </svg>
                        English
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Desktop Drawer Content (Only shown on desktop) */}
              {!isMobile && (
                <>
                  {/* Skupina 1: Informace o společnosti */}
                  <div style={styles.drawerGroup}>
                    <h5 style={styles.drawerGroupHeader}>{translateSubcat('Informace o společnosti')}</h5>
                    <ul style={styles.drawerLinkList}>
                      <li 
                        style={styles.drawerLinkItem} 
                        className="drawer-link-item"
                        onClick={() => { setActivePage('about'); setDrawerOpen(false); }}
                      >
                        {translateSubcat('O nás')}
                      </li>
                      <li 
                        style={styles.drawerLinkItem} 
                        className="drawer-link-item"
                        onClick={() => { setActivePage('support'); setDrawerOpen(false); }}
                      >
                        {translateSubcat('Kontakt')}
                      </li>
                      <li 
                        style={styles.drawerLinkItem} 
                        className="drawer-link-item"
                        onClick={() => { setActivePage('blog'); setDrawerOpen(false); }}
                      >
                        {translateSubcat('Blog')}
                      </li>
                      {FEATURE_FLAGS.showBuylist && (
                        <li 
                          style={styles.drawerLinkItem} 
                          className="drawer-link-item"
                          onClick={() => { setActivePage('buylist'); setDrawerOpen(false); }}
                        >
                          {translateSubcat('Výkup karet (Buylist)')}
                        </li>
                      )}
                      {FEATURE_FLAGS.showGrading && (
                        <li 
                          style={styles.drawerLinkItem} 
                          className="drawer-link-item"
                          onClick={() => { setActivePage('grading'); setDrawerOpen(false); }}
                        >
                          {translateSubcat('Grading servis')}
                        </li>
                      )}
                    </ul>
                  </div>

                  {/* Skupina 2: Vše o nákupu */}
                  <div style={styles.drawerGroup}>
                    <h5 style={styles.drawerGroupHeader}>{translateSubcat('Vše o nákupu')}</h5>
                    <ul style={styles.drawerLinkList}>
                      <li 
                        style={styles.drawerLinkItem} 
                        className="drawer-link-item"
                        onClick={() => { setActivePage('faq'); setDrawerOpen(false); }}
                      >
                        {translateSubcat('Nejčastější dotazy (FAQ)')}
                      </li>
                      <li 
                        style={styles.drawerLinkItem} 
                        className="drawer-link-item"
                        onClick={() => { setActivePage('gdpr-vop', 'doprava'); setDrawerOpen(false); }}
                      >
                        {translateSubcat('Doprava a osobní odběr')}
                      </li>
                      <li 
                        style={styles.drawerLinkItem} 
                        className="drawer-link-item"
                        onClick={() => { setActivePage('gdpr-vop', 'vop'); setDrawerOpen(false); }}
                      >
                        {translateSubcat('Obchodní podmínky (VOP)')}
                      </li>
                      <li 
                        style={styles.drawerLinkItem} 
                        className="drawer-link-item"
                        onClick={() => { setActivePage('gdpr-vop', 'gdpr'); setDrawerOpen(false); }}
                      >
                        {translateSubcat('Ochrana osobních údajů (GDPR)')}
                      </li>
                      <li 
                        style={styles.drawerLinkItem} 
                        className="drawer-link-item"
                        onClick={() => { setActivePage('gdpr-vop', 'odstoupeni'); setDrawerOpen(false); }}
                      >
                        {translateSubcat('Odstoupení od smlouvy')}
                      </li>
                    </ul>
                  </div>

                  <div style={{ ...styles.drawerSection, borderBottom: 'none', marginTop: 'auto', paddingBottom: '0', alignItems: 'flex-start', textAlign: 'left' }}>
                    <h4 style={{ ...styles.drawerSectionTitle, textAlign: 'left' }}>{translateSubcat('Kontakty')}</h4>
                    <p style={{ ...styles.drawerText, textAlign: 'left' }}>
                      <strong>{translateSubcat('Provozovatel')}:</strong> NORTHVALE s.r.o.<br />
                      <strong>{translateSubcat('Sídlo')}:</strong> Bratří Čapků 1095, Holice<br />
                      <strong>{translateSubcat('Odběr')}:</strong> Sladkovského 512, Pardubice<br />
                      <strong>E-mail:</strong> info@northvaletcg.eu<br />
                      <strong>Telefon:</strong> +420 739 666 779
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Mobile Help & Socials (Only shown on mobile, pinned at the bottom) */}
            {isMobile && (
              <div style={styles.mobileDrawerFooter}>
                {/* Actions Row (Oblíbené, Kontakt) */}
                <div style={styles.drawerActionsRow}>
                  <button className="drawer-action-link" style={styles.drawerActionLink} onClick={() => { setActivePage('favorites'); setDrawerOpen(false); }}>
                    <img src="/heart.png" alt="" style={styles.drawerActionIcon} width="16" height="16" /> {t('Navbar.favorites')}
                  </button>
                  <button className="drawer-action-link" style={styles.drawerActionLink} onClick={() => { setActivePage('support'); setDrawerOpen(false); }}>
                    Kontakt
                  </button>
                </div>

                {/* Socials */}
                <div style={styles.drawerSocials}>
                  <a href="https://www.instagram.com/northvaletcg/?utm_source=ig_web_button_share_sheet" target="_blank" rel="noopener noreferrer" className="drawer-social-link" style={styles.drawerSocialLink}>
                    <img src="/instagram.png" alt="Instagram" className="drawer-social-icon" style={styles.drawerSocialIcon} width="18" height="18" />
                  </a>
                  <a href="https://www.facebook.com/share/18yajuq6N1/?mibextid=wwXIfr" target="_blank" rel="noopener noreferrer" className="drawer-social-link" style={styles.drawerSocialLink}>
                    <img src="/facebook.png" alt="Facebook" className="drawer-social-icon" style={styles.drawerSocialIcon} width="18" height="18" />
                  </a>
                  <a href="https://www.tiktok.com/@northvaletcg" target="_blank" rel="noopener noreferrer" className="drawer-social-link" style={styles.drawerSocialLink}>
                    <img src="/tik-tok.png" alt="TikTok" className="drawer-social-icon" style={styles.drawerSocialIcon} width="18" height="18" />
                  </a>
                </div>

                {/* FAQ Banner */}
                <div style={styles.faqBanner} onClick={() => { setActivePage('faq'); setDrawerOpen(false); }}>
                  {t('Navbar.advice')} <span style={styles.faqBannerLink}>{t('Navbar.faqLink')}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

const styles = {
  header: {
    backgroundColor: 'var(--bg-secondary)',
    borderBottom: '1px solid var(--border)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
  },

  /* 1. Top Bar styles */
  topBar: {
    backgroundColor: 'var(--bg-page)',
    borderBottom: '1px solid var(--border)',
    fontSize: '12px',
    color: 'var(--text-muted)',
    padding: '8px 0',
  },
  topBarContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topBarLeft: {
    cursor: 'pointer',
    textAlign: 'left',
  },
  faqLink: {
    color: 'var(--text-main)',
    textDecoration: 'underline',
    marginLeft: '4px',
  },
  topBarRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  langContainer: {
    position: 'relative',
    display: 'inline-block',
  },
  langSelector: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    cursor: 'pointer',
    userSelect: 'none',
  },
  langDropdown: {
    position: 'absolute',
    top: '26px',
    right: 0,
    padding: '6px',
    minWidth: '110px',
    boxShadow: '0 8px 20px rgba(0, 0, 0, 0.4)',
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  langOption: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 10px',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    fontSize: '12px',
    color: 'var(--text-main)',
    userSelect: 'none',
    '&:hover': {
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
    }
  },
  flagIcon: {
    width: '16px',
    height: '11px',
    borderRadius: '1px',
  },
  langChevron: {
    width: '10px',
    height: '10px',
    filter: 'invert(0.9)',
    opacity: 0.6,
  },
  contactLink: {
    cursor: 'pointer',
    color: 'var(--text-muted)',
    transition: 'color 0.2s',
    '&:hover': {
      color: 'var(--text-main)',
    }
  },
  topBarDivider: {
    opacity: 0.15,
  },
  socials: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  socialLink: {
    display: 'flex',
    alignItems: 'center',
  },
  socialIcon: {
    width: '14px',
    height: '14px',
    filter: 'invert(0.9)',
    opacity: 0.7,
    transition: 'opacity 0.2s',
    '&:hover': {
      opacity: 1,
    }
  },

  /* 2. Middle Bar styles */
  middleBar: {
    padding: '2px 0',
  },
  middleBarContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '24px',
  },
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    height: '72px',
  },
  logoImg: {
    height: '84px',
    width: 'auto',
    objectFit: 'contain',
    marginTop: '-6px',
    marginBottom: '-6px',
    marginLeft: '-17px',
    zIndex: 10,
  },
  searchForm: {
    display: 'flex',
    flexGrow: 1,
    maxWidth: '520px',
    position: 'relative',
  },
  searchInput: {
    width: '100%',
    backgroundColor: 'var(--bg-page)',
    border: '1px solid var(--border-light)',
    padding: '9px 40px 9px 14px',
    borderRadius: 'var(--radius-md)',
    outline: 'none',
    fontSize: '13px',
    transition: 'border-color 0.2s',
    color: 'var(--text-main)',
  },
  searchBtn: {
    position: 'absolute',
    right: '10px',
    top: '50%',
    transform: 'translateY(-50%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.8,
  },
  searchIcon: {
    width: '16px',
    height: '16px',
    filter: 'invert(0.9)',
  },
  navActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },

  actionLabel: {
    fontSize: '13px',
    fontWeight: '600',
  },
  cartIconWrapper: {
    position: 'relative',
    display: 'flex',
  },
  cartBadge: {
    position: 'absolute',
    top: '-10px',
    right: '-10px',
    backgroundColor: 'var(--color-gold)',
    color: '#000',
    fontSize: '9px',
    fontWeight: '800',
    borderRadius: '50%',
    width: '16px',
    height: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 4px rgba(0,0,0,0.5)',
  },

  /* 3. Bottom Bar styles */
  bottomBar: {
    borderTop: '1px solid rgba(255, 255, 255, 0.04)',
    height: '46px',
  },
  bottomBarContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: '100%',
    position: 'relative',
  },
  categoriesList: {
    display: 'flex',
    alignItems: 'center',
    height: '100%',
  },
  dropdownContainer: {
    position: 'static',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
  },
  categoryItem: {
    fontSize: '13.5px',
    fontWeight: '600',
    padding: '0 14px',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    color: 'var(--text-main)',
    transition: 'color 0.2s',
    '&:hover': {
      color: 'var(--color-gold)',
    }
  },
  chevron: {
    width: '10px',
    height: '10px',
    filter: 'invert(0.9)',
    opacity: 0.6,
  },
  dropdownMenu: {
    position: 'absolute',
    top: '46px',
    left: '0',
    right: '0',
    width: '100%',
    padding: '36px 48px',
    boxShadow: '0 15px 35px rgba(0, 0, 0, 0.6)',
    zIndex: 1000,
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderTop: 'none',
    borderRadius: '0 0 var(--radius-md) var(--radius-md)',
  },
  dropdownGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: '32px',
    width: '100%',
  },
  dropdownColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  dropdownColHeading: {
    fontSize: '13px',
    fontWeight: '700',
    color: 'var(--text-main)',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    paddingBottom: '6px',
    marginBottom: '4px',
    fontFamily: 'var(--font-heading)',
  },
  dropdownLink: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    transition: 'color 0.2s',
    textAlign: 'left',
    '&:hover': {
      color: 'var(--color-gold)',
    }
  },
  investDesc: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    lineHeight: '1.4',
    marginBottom: '8px',
    maxWidth: '300px',
    textAlign: 'left',
  },
  investLinks: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '6px',
  },
  hamburgerBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text-main)',
    cursor: 'pointer',
    padding: '8px',
    borderRadius: '4px',
    transition: 'color 0.2s, background-color 0.2s',
    marginRight: '-8px',
    '&:hover': {
      color: 'var(--color-gold)',
      backgroundColor: 'rgba(255, 255, 255, 0.03)',
    }
  },
  hamburgerIcon: {
    width: '26px',
    height: '26px',
  },

  /* 4. Slide-out Drawer styles */
  drawerOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    backdropFilter: 'blur(4px)',
    zIndex: 9999,
    display: 'flex',
    justifyContent: 'flex-start',
  },
  drawer: {
    width: 'min(360px, 100vw)',
    height: '100%',
    background: 'rgba(32, 32, 52, 0.95)',
    borderRight: '1px solid rgba(63, 63, 86, 0.4)',
    borderRadius: '0',
    display: 'flex',
    flexDirection: 'column',
    padding: '24px',
    boxShadow: '10px 0 30px rgba(0,0,0,0.5)',
    animation: 'slideFromTopLeft 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
    transformOrigin: 'top left',
    textAlign: 'center',
  },
  drawerHeader: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    paddingBottom: '16px',
    marginBottom: '20px',
    position: 'relative',
  },
  drawerHeading: {
    fontSize: '18px',
    fontWeight: '800',
    margin: 0,
    fontFamily: 'var(--font-heading)',
    textAlign: 'center',
  },
  drawerCloseBtn: {
    fontSize: '24px',
    fontWeight: '600',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    transition: 'color 0.2s',
    position: 'absolute',
    right: 0,
    '&:hover': {
      color: 'var(--color-gold)',
    }
  },
  drawerBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    flexGrow: 1,
    overflowY: 'auto',
  },
  drawerGroup: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '16px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
    paddingBottom: '24px',
    textAlign: 'left',
    width: '100%',
  },
  drawerGroupHeader: {
    fontSize: '11px',
    fontWeight: '800',
    color: 'var(--color-gold)',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    margin: 0,
    textAlign: 'left',
    width: '100%',
  },
  drawerLinkList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    alignItems: 'flex-start',
    width: '100%',
  },
  drawerLinkItem: {
    fontSize: '14px',
    fontWeight: '600',
    color: 'var(--text-main)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    textAlign: 'left',
    width: '100%',
    padding: '4px 0',
  },
  drawerSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
    paddingBottom: '16px',
    textAlign: 'center',
  },
  drawerSectionTitle: {
    fontSize: '14px',
    fontWeight: '800',
    margin: 0,
    color: 'var(--text-main)',
    fontFamily: 'var(--font-heading)',
    textAlign: 'center',
  },
  drawerText: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    lineHeight: '1.5',
    margin: 0,
    textAlign: 'center',
  },

  /* Mobile navbar styles */
  mobileMainRow: {
    padding: '4px 0',
    backgroundColor: 'var(--bg-secondary)',
    borderBottom: 'none',
    height: '68px',
    display: 'flex',
    alignItems: 'center',
  },
  mobileMainRowContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  mobileLeftArea: {
    display: 'flex',
    justifyContent: 'flex-start',
    alignItems: 'center',
    flex: '1 1 0%',
  },
  mobileCenterArea: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    flex: '1 1 0%',
    cursor: 'pointer',
  },
  mobileRightArea: {
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: '4px',
    flex: '1 1 0%',
  },
  mobileLogoImg: {
    height: '80px',
    width: 'auto',
    objectFit: 'contain',
    zIndex: 10,
    marginTop: '-12px',
    marginBottom: '-12px',
  },
  mobileActionBtn: {
    padding: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileActionIcon: {
    width: '20px',
    height: '20px',
    filter: 'invert(0.9)',
  },
  mobileSearchRow: {
    padding: '10px 0',
    backgroundColor: 'var(--bg-secondary)',
    borderBottom: '1px solid var(--border)',
  },
  mobileSearchForm: {
    display: 'flex',
    position: 'relative',
    width: '100%',
  },
  mobileSearchInput: {
    width: '100%',
    backgroundColor: 'var(--bg-page)',
    border: '1px solid var(--border-light)',
    padding: '10px 40px 10px 14px',
    borderRadius: 'var(--radius-md)',
    outline: 'none',
    fontSize: '14px',
    transition: 'border-color 0.2s',
    color: 'var(--text-main)',
  },
  mobileSearchBtn: {
    position: 'absolute',
    right: '10px',
    top: '50%',
    transform: 'translateY(-50%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.8,
  },

  /* Mobile drawer accordion styles */
  mobileDrawerNav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    marginBottom: '32px',
    borderBottom: 'none',
    paddingBottom: '0',
    width: '80%',
    margin: '0 auto',
  },
  mobileNavSection: {
    display: 'flex',
    flexDirection: 'column',
    borderBottom: '1px solid rgba(255, 255, 255, 0.09)',
  },
  mobileNavHeader: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '17px 0',
    fontSize: '18px',
    fontWeight: '600',
    color: 'var(--text-main)',
    cursor: 'pointer',
    gap: '8px',
  },
  mobileChevron: {
    width: '12px',
    height: '12px',
    filter: 'invert(0.9)',
    opacity: 0.6,
    transition: 'transform 0.2s ease',
  },
  mobileSubList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    paddingLeft: '0',
    paddingBottom: '12px',
    alignItems: 'center',
  },
  mobileSubHeader: {
    fontSize: '11px',
    fontWeight: '700',
    color: 'var(--color-gold)',
    marginTop: '8px',
    marginBottom: '2px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    textAlign: 'center',
  },
  mobileSubLink: {
    fontSize: '13px',
    color: 'var(--text-muted)',
    padding: '6px 0',
    cursor: 'pointer',
    transition: 'color 0.2s',
    textAlign: 'center',
    '&:hover': {
      color: 'var(--color-gold)',
    }
  },
  mobileLangBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '10px 14px',
    borderRadius: 'var(--radius-sm)',
    fontSize: '13px',
    color: 'var(--text-main)',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  faqBanner: {
    fontSize: '13px',
    color: 'var(--text-muted)',
    textAlign: 'center',
    cursor: 'pointer',
    marginTop: '12px',
    padding: '12px',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: 'var(--radius-md)',
    transition: 'background-color 0.2s',
  },
  faqBannerLink: {
    color: 'var(--color-gold)',
    textDecoration: 'underline',
    fontWeight: '600',
  },
  drawerActionsRow: {
    display: 'flex',
    justifyContent: 'center',
    gap: '32px',
    marginTop: '12px',
    paddingBottom: '16px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.09)',
  },
  drawerActionLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    fontWeight: '600',
    color: 'var(--text-main)',
    cursor: 'pointer',
    transition: 'color 0.2s',
  },
  drawerActionIcon: {
    width: '16px',
    height: '16px',
    filter: 'invert(0.9)',
  },
  drawerSocials: {
    display: 'flex',
    justifyContent: 'center',
    gap: '24px',
    marginTop: '16px',
    paddingBottom: '8px',
  },
  drawerSocialLink: {
    display: 'flex',
    alignItems: 'center',
  },
  drawerSocialIcon: {
    width: '18px',
    height: '18px',
    filter: 'invert(0.9)',
    opacity: 0.7,
    transition: 'opacity 0.2s',
  },
  mobileDrawerFooter: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    gap: '8px',
    marginTop: 'auto',
  },
  searchSuggestions: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: '6px',
    backgroundColor: '#1C1C22',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
    zIndex: 9999,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: 'var(--font-outfit)',
  },
  suggestionItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px 14px',
    gap: '12px',
    cursor: 'pointer',
    borderBottom: '1px solid rgba(255, 255, 255, 0.015)',
    transition: 'background-color 0.2s',
    textDecoration: 'none',
  },
  suggestionThumb: {
    width: '32px',
    height: '32px',
    objectFit: 'contain',
    borderRadius: '4px',
    backgroundColor: 'transparent',
  },
  suggestionName: {
    fontSize: '13px',
    fontWeight: '500',
    color: 'var(--text-main)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    flexGrow: 1,
    textAlign: 'left',
  },
  suggestionEdition: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    marginLeft: 'auto',
  },
  allResultsBtn: {
    display: 'block',
    width: '100%',
    padding: '12px 14px',
    textAlign: 'center',
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--text-muted)',
    textDecoration: 'underline',
    backgroundColor: 'var(--bg-secondary)',
    border: 'none',
    borderTop: '1px solid rgba(255, 255, 255, 0.015)',
    cursor: 'pointer',
    transition: 'color 0.2s, background-color 0.2s',
    fontFamily: 'var(--font-outfit)',
    marginTop: '8px',
  },
};
