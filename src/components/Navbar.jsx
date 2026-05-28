import React, { useState, useEffect } from 'react';

export default function Navbar({ activePage, setActivePage, cart, user, setFilters, setSearchQuery }) {
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
  const [lang, setLang] = useState('CZ');
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 900);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 900);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
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

  const [openMobileSections, setOpenMobileSections] = useState({
    pokemon: false,
    mtg: false,
    onepiece: false,
    riftbound: false,
    accessories: false,
    slabs: false,
    grading: false,
  });

  const toggleMobileSection = (section) => {
    setOpenMobileSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearchQuery(searchInput);
    setActivePage('singles-catalog');
  };

  const handleCategoryClick = (category, subFilters = {}) => {
    setFilters(subFilters);
    if (category === 'singles') {
      setActivePage('singles-catalog');
    } else if (category === 'sealed') {
      setActivePage('sealed-catalog');
    } else if (category === 'slabs') {
      setActivePage('slabs-catalog');
    } else if (category === 'grading') {
      setActivePage('grading');
    }
    setActiveDropdown(null);
  };

  return (
    <header style={styles.header}>
      {!isMobile ? (
        <>
          {/* 1. TOP BAR (Zákaznická pomoc, Čeština, sociální sítě) */}
          <div style={styles.topBar}>
            <div className="container" style={styles.topBarContent}>
              <div style={styles.topBarLeft} onClick={() => setActivePage('support')}>
                Potřebujete poradit? <strong style={styles.faqLink}>Podívejte se na naše nejčastější dotazy</strong>
              </div>
              <div style={styles.topBarRight}>
                <div 
                  style={styles.langContainer}
                  onMouseLeave={() => setLangDropdownOpen(false)}
                >
                  <div 
                    style={styles.langSelector} 
                    onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                  >
                    {lang === 'CZ' ? (
                      <>
                        <img src="/cz ikona.png" alt="CZ" style={styles.flagIcon} />
                        <span>Čeština</span>
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 30" style={styles.flagIcon}>
                          <clipPath id="s">
                            <path d="M0,0 v30 h60 v-30 z"/>
                          </clipPath>
                          <path d="M0,0 v30 h60 v-30 z" fill="#012169"/>
                          <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" clipPath="url(#s)"/>
                          <path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" strokeWidth="4" clipPath="url(#s)"/>
                          <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10"/>
                          <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6"/>
                        </svg>
                        <span>English</span>
                      </>
                    )}
                    <img src="/angle-small-down (1).png" style={styles.langChevron} alt="" />
                  </div>

                  {langDropdownOpen && (
                    <div style={styles.langDropdown} className="glass-panel">
                      <div 
                        style={{
                          ...styles.langOption,
                          backgroundColor: lang === 'CZ' ? 'rgba(255,255,255,0.05)' : 'transparent',
                        }}
                        onClick={() => { setLang('CZ'); setLangDropdownOpen(false); }}
                      >
                        <img src="/cz ikona.png" alt="CZ" style={styles.flagIcon} />
                        <span>Čeština</span>
                      </div>
                      <div 
                        style={{
                          ...styles.langOption,
                          backgroundColor: lang === 'EN' ? 'rgba(255,255,255,0.05)' : 'transparent',
                        }}
                        onClick={() => { setLang('EN'); setLangDropdownOpen(false); }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 30" style={styles.flagIcon}>
                          <clipPath id="s2">
                            <path d="M0,0 v30 h60 v-30 z"/>
                          </clipPath>
                          <path d="M0,0 v30 h60 v-30 z" fill="#012169"/>
                          <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" clipPath="url(#s2)"/>
                          <path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" strokeWidth="4" clipPath="url(#s2)"/>
                          <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10"/>
                          <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6"/>
                        </svg>
                        <span>English</span>
                      </div>
                    </div>
                  )}
                </div>
                
                <span style={styles.topBarDivider}>|</span>
                
                <span style={styles.contactLink} onClick={() => setActivePage('support')}>
                  Kontakt
                </span>
                
                <span style={styles.topBarDivider}>|</span>
                
                <div style={styles.socials}>
                  <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" style={styles.socialLink}>
                    <img src="/instagram.png" alt="Instagram" style={styles.socialIcon} />
                  </a>
                  <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" style={styles.socialLink}>
                    <img src="/youtube.png" alt="YouTube" style={styles.socialIcon} />
                  </a>
                  <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer" style={styles.socialLink}>
                    <img src="/tik-tok.png" alt="TikTok" style={styles.socialIcon} />
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* 2. MIDDLE BAR (Logo, Vyhledávání, Oblíbené, Přihlásit se, Košík) */}
          <div style={styles.middleBar}>
            <div className="container" style={styles.middleBarContent}>
              {/* Logo */}
              <div style={styles.logoContainer} onClick={() => { setFilters({}); setActivePage('home'); }}>
                <img src="/Northvale Logo.webp" alt="NORTHVALE TCG" style={styles.logoImg} />
              </div>

              {/* Search bar */}
              <form onSubmit={handleSearchSubmit} style={styles.searchForm}>
                <input
                  type="text"
                  placeholder="Vyhledat karty, boxy, příslušenství..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  style={styles.searchInput}
                />
                <button type="submit" style={styles.searchBtn}>
                  <img src="/search.png" alt="Hledat" style={styles.searchIcon} />
                </button>
              </form>

              <div style={styles.navActions}>
                <button className="nav-action-btn" onClick={() => { setFilters({}); setActivePage('singles-catalog'); }} title="Oblíbené">
                  <img src="/heart.png" alt="Oblíbené" />
                  <span style={styles.actionLabel}>Oblíbené</span>
                </button>

                <button className="nav-action-btn" onClick={() => setActivePage('profile')} title="Přihlásit se">
                  <img src="/user.png" alt="Profil" />
                  <span style={styles.actionLabel}>
                    {user.storeCredit > 1000 ? `Můj účet (${user.storeCredit} Kč)` : 'Přihlásit se'}
                  </span>
                </button>

                <button className="nav-action-btn" style={{ marginRight: '-12px' }} onClick={() => setActivePage('checkout')} title="Košík">
                  <div style={styles.cartIconWrapper}>
                    <img src="/shopping-cart.png" alt="Košík" />
                    {cartItemsCount > 0 && (
                      <span style={styles.cartBadge}>{cartItemsCount}</span>
                    )}
                  </div>
                  <span style={styles.actionLabel}>Košík</span>
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
                  onMouseEnter={() => setActiveDropdown('pokemon')}
                  onMouseLeave={() => setActiveDropdown(null)}
                >
                  <button style={{ ...styles.categoryItem, paddingLeft: 0 }} onClick={() => handleCategoryClick('singles', { game: 'Pokémon' })}>
                    Pokémon <img src="/angle-small-down (1).png" style={styles.chevron} alt="" />
                  </button>
                  {activeDropdown === 'pokemon' && (
                    <div style={styles.dropdownMenu} className="glass-panel">
                      <div style={styles.dropdownGrid}>
                        <div style={styles.dropdownColumn}>
                          <h4 style={styles.dropdownColHeading}>ENG (Anglické)</h4>
                          <span style={styles.dropdownLink} onClick={() => handleCategoryClick('sealed', { game: 'Pokémon', lang: 'EN', type: 'Booster Box' })}>Booster boxy</span>
                          <span style={styles.dropdownLink} onClick={() => handleCategoryClick('sealed', { game: 'Pokémon', lang: 'EN', type: 'ETB' })}>Elite trainer boxy (ETB)</span>
                          <span style={styles.dropdownLink} onClick={() => handleCategoryClick('sealed', { game: 'Pokémon', lang: 'EN', type: 'Booster Bundle' })}>Booster bundly</span>
                          <span style={styles.dropdownLink} onClick={() => handleCategoryClick('sealed', { game: 'Pokémon', lang: 'EN', type: 'Booster' })}>Boostery</span>
                          <span style={styles.dropdownLink} onClick={() => handleCategoryClick('sealed', { game: 'Pokémon', lang: 'EN', type: 'Special Collection' })}>Speciální kolekce</span>
                          <span style={styles.dropdownLink} onClick={() => handleCategoryClick('sealed', { game: 'Pokémon', lang: 'EN', type: 'Other' })}>Ostatní</span>
                        </div>
                        <div style={styles.dropdownColumn}>
                          <h4 style={styles.dropdownColHeading} onClick={() => handleCategoryClick('sealed', { game: 'Pokémon', lang: 'JP' })}>JPN (Japonské)</h4>
                          <span style={styles.dropdownLink} onClick={() => handleCategoryClick('sealed', { game: 'Pokémon', lang: 'JP' })}>Všechny JPN produkty</span>
                          
                          <h4 style={{ ...styles.dropdownColHeading, marginTop: '16px' }} onClick={() => handleCategoryClick('sealed', { game: 'Pokémon', lang: 'CN' })}>CHN (Čínské)</h4>
                          <span style={styles.dropdownLink} onClick={() => handleCategoryClick('sealed', { game: 'Pokémon', lang: 'CN' })}>Všechny CHN produkty</span>
                        </div>
                        <div style={{ ...styles.dropdownColumn, gridColumn: 'span 2' }}>
                          <h4 style={styles.dropdownColHeading}>Investiční</h4>
                          <p style={styles.investDesc}>
                            V této sekci najdete produkty starších i moderních setů. Ty pak pečlivě prohlížíme a vybíráme ty v TOP stavech vhodných do sbírky.
                          </p>
                          <div style={styles.investLinks}>
                            <span style={styles.dropdownLink} onClick={() => handleCategoryClick('sealed', { game: 'Pokémon', investment: true, type: 'Booster Box' })}>Booster boxy</span>
                            <span style={styles.dropdownLink} onClick={() => handleCategoryClick('sealed', { game: 'Pokémon', investment: true, type: 'ETB' })}>ETB</span>
                            <span style={styles.dropdownLink} onClick={() => handleCategoryClick('sealed', { game: 'Pokémon', investment: true, type: 'Sealed Case' })}>Sealed case</span>
                            <span style={styles.dropdownLink} onClick={() => handleCategoryClick('sealed', { game: 'Pokémon', investment: true, type: 'Other' })}>Ostatní</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Magic the Gathering Dropdown */}
                <div 
                  style={styles.dropdownContainer}
                  onMouseEnter={() => setActiveDropdown('mtg')}
                  onMouseLeave={() => setActiveDropdown(null)}
                >
                  <button style={styles.categoryItem} onClick={() => handleCategoryClick('singles', { game: 'Magic' })}>
                    Magic: The Gathering <img src="/angle-small-down (1).png" style={styles.chevron} alt="" />
                  </button>
                  {activeDropdown === 'mtg' && (
                    <div style={styles.dropdownMenu} className="glass-panel">
                      <div style={styles.dropdownGrid}>
                        <div style={styles.dropdownColumn}>
                          <span style={styles.dropdownLink} onClick={() => handleCategoryClick('sealed', { game: 'Magic', type: 'Booster Box' })}>Booster boxy</span>
                          <span style={styles.dropdownLink} onClick={() => handleCategoryClick('sealed', { game: 'Magic', type: 'Commander Deck' })}>Commander decky</span>
                          <span style={styles.dropdownLink} onClick={() => handleCategoryClick('sealed', { game: 'Magic', type: 'Bundle' })}>Bundly</span>
                          <span style={styles.dropdownLink} onClick={() => handleCategoryClick('sealed', { game: 'Magic', type: 'Booster' })}>Boostery</span>
                          <span style={styles.dropdownLink} onClick={() => handleCategoryClick('sealed', { game: 'Magic', type: 'Other' })}>Ostatní</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. One Piece Dropdown */}
                <div 
                  style={styles.dropdownContainer}
                  onMouseEnter={() => setActiveDropdown('onepiece')}
                  onMouseLeave={() => setActiveDropdown(null)}
                >
                  <button style={styles.categoryItem} onClick={() => handleCategoryClick('singles', { game: 'One Piece' })}>
                    One Piece <img src="/angle-small-down (1).png" style={styles.chevron} alt="" />
                  </button>
                  {activeDropdown === 'onepiece' && (
                    <div style={styles.dropdownMenu} className="glass-panel">
                      <div style={styles.dropdownGrid}>
                        <div style={styles.dropdownColumn}>
                          <span style={styles.dropdownLink} onClick={() => handleCategoryClick('sealed', { game: 'One Piece', type: 'Booster Box' })}>Booster boxy</span>
                          <span style={styles.dropdownLink} onClick={() => handleCategoryClick('sealed', { game: 'One Piece', type: 'Booster' })}>Boostery</span>
                          <span style={styles.dropdownLink} onClick={() => handleCategoryClick('sealed', { game: 'One Piece', type: 'Other' })}>Ostatní</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 4. Riftbound Dropdown */}
                <div 
                  style={styles.dropdownContainer}
                  onMouseEnter={() => setActiveDropdown('riftbound')}
                  onMouseLeave={() => setActiveDropdown(null)}
                >
                  <button style={styles.categoryItem} onClick={() => handleCategoryClick('singles', { game: 'Riftbound' })}>
                    Riftbound <img src="/angle-small-down (1).png" style={styles.chevron} alt="" />
                  </button>
                  {activeDropdown === 'riftbound' && (
                    <div style={styles.dropdownMenu} className="glass-panel">
                      <div style={styles.dropdownGrid}>
                        <div style={styles.dropdownColumn}>
                          <span style={styles.dropdownLink} onClick={() => handleCategoryClick('sealed', { game: 'Riftbound', type: 'Booster Box' })}>Booster boxy</span>
                          <span style={styles.dropdownLink} onClick={() => handleCategoryClick('sealed', { game: 'Riftbound', type: 'Trial Deck' })}>Trial decky</span>
                          <span style={styles.dropdownLink} onClick={() => handleCategoryClick('sealed', { game: 'Riftbound', type: 'Booster' })}>Boostery</span>
                          <span style={styles.dropdownLink} onClick={() => handleCategoryClick('sealed', { game: 'Riftbound', type: 'Other' })}>Ostatní</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 5. Příslušenství Dropdown */}
                <div 
                  style={styles.dropdownContainer}
                  onMouseEnter={() => setActiveDropdown('accessories')}
                  onMouseLeave={() => setActiveDropdown(null)}
                >
                  <button style={styles.categoryItem} onClick={() => handleCategoryClick('sealed', { category: 'Accessories' })}>
                    Příslušenství <img src="/angle-small-down (1).png" style={styles.chevron} alt="" />
                  </button>
                  {activeDropdown === 'accessories' && (
                    <div style={styles.dropdownMenu} className="glass-panel">
                      <div style={styles.dropdownGrid}>
                        <div style={styles.dropdownColumn}>
                          <h4 style={styles.dropdownColHeading}>Ochrana karet</h4>
                          <span style={styles.dropdownLink} onClick={() => handleCategoryClick('sealed', { category: 'Accessories', subcat: 'Penny sleeves' })}>Penny sleeves</span>
                          <span style={styles.dropdownLink} onClick={() => handleCategoryClick('sealed', { category: 'Accessories', subcat: 'Perfect fit' })}>Perfect fit</span>
                          <span style={styles.dropdownLink} onClick={() => handleCategoryClick('sealed', { category: 'Accessories', subcat: 'Matte sleeves' })}>Matné herní obaly</span>
                          <span style={styles.dropdownLink} onClick={() => handleCategoryClick('sealed', { category: 'Accessories', subcat: 'Toploaders' })}>Toploadery</span>
                          <span style={styles.dropdownLink} onClick={() => handleCategoryClick('sealed', { category: 'Accessories', subcat: 'Card Saver 1' })}>Card Savery 1</span>
                        </div>
                        <div style={styles.dropdownColumn}>
                          <h4 style={styles.dropdownColHeading}>Ukládání</h4>
                          <span style={styles.dropdownLink} onClick={() => handleCategoryClick('sealed', { category: 'Accessories', subcat: 'Binders' })}>Alba</span>
                          <span style={styles.dropdownLink} onClick={() => handleCategoryClick('sealed', { category: 'Accessories', subcat: 'Acrylic Boxes' })}>Akrylové boxy</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 6. Ohodnocené karty Dropdown */}
                <div 
                  style={styles.dropdownContainer}
                  onMouseEnter={() => setActiveDropdown('slabs')}
                  onMouseLeave={() => setActiveDropdown(null)}
                >
                  <button style={styles.categoryItem} onClick={() => handleCategoryClick('slabs')}>
                    Ohodnocené karty <img src="/angle-small-down (1).png" style={styles.chevron} alt="" />
                  </button>
                  {activeDropdown === 'slabs' && (
                    <div style={styles.dropdownMenu} className="glass-panel">
                      <div style={styles.dropdownGrid}>
                        <div style={styles.dropdownColumn}>
                          <span style={styles.dropdownLink} onClick={() => handleCategoryClick('slabs', { company: 'PSA' })}>PSA</span>
                          <span style={styles.dropdownLink} onClick={() => handleCategoryClick('slabs', { company: 'Beckett' })}>Beckett</span>
                          <span style={styles.dropdownLink} onClick={() => handleCategoryClick('slabs', { company: 'Other' })}>Ostatní (CGC, TAG)</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 7. Grading Dropdown */}
                <div 
                  style={styles.dropdownContainer}
                  onMouseEnter={() => setActiveDropdown('grading')}
                  onMouseLeave={() => setActiveDropdown(null)}
                >
                  <button style={styles.categoryItem} onClick={() => setActivePage('grading')}>
                    Grading <img src="/angle-small-down (1).png" style={styles.chevron} alt="" />
                  </button>
                  {activeDropdown === 'grading' && (
                    <div style={styles.dropdownMenu} className="glass-panel">
                      <div style={styles.dropdownGrid}>
                        <div style={styles.dropdownColumn}>
                          <span style={styles.dropdownLink} onClick={() => { setActivePage('grading'); setActiveDropdown(null); }}>Pre Grading</span>
                          <span style={styles.dropdownLink} onClick={() => { setActivePage('grading'); setActiveDropdown(null); }}>Odeslání PSA</span>
                          <span style={styles.dropdownLink} onClick={() => { setActivePage('grading'); setActiveDropdown(null); }}>Odeslání Beckett</span>
                          <span style={styles.dropdownLink} onClick={() => { setActivePage('grading'); setActiveDropdown(null); }}>Odeslání TAG</span>
                          <span style={{ ...styles.dropdownLink, color: 'var(--color-gold)', marginTop: '8px' }} onClick={() => { setActivePage('grading-guide'); setActiveDropdown(null); }}>Průvodce stavy</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Hamburger Icon */}
              <button style={styles.hamburgerBtn} onClick={() => setDrawerOpen(true)} title="Více informací">
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
                <button style={{ ...styles.hamburgerBtn, marginLeft: '-8px', marginRight: 0 }} onClick={() => setDrawerOpen(true)} title="Menu">
                  <svg viewBox="0 0 24 24" style={styles.hamburgerIcon} stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round">
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                  </svg>
                </button>
              </div>

              {/* Center: Logo */}
              <div style={styles.mobileCenterArea} onClick={() => { setFilters({}); setActivePage('home'); }}>
                <img src="/Northvale Logo.webp" alt="NORTHVALE TCG" style={styles.mobileLogoImg} />
              </div>

              {/* Right: Profile & Cart */}
              <div style={styles.mobileRightArea}>
                <button className="nav-action-btn" style={styles.mobileActionBtn} onClick={() => setActivePage('profile')} title="Přihlásit se">
                  <img src="/user.png" alt="Profil" style={styles.mobileActionIcon} />
                </button>
                <button className="nav-action-btn" style={{ ...styles.mobileActionBtn, marginRight: '-8px' }} onClick={() => setActivePage('checkout')} title="Košík">
                  <div style={styles.cartIconWrapper}>
                    <img src="/shopping-cart.png" alt="Košík" style={styles.mobileActionIcon} />
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
              <form onSubmit={handleSearchSubmit} style={styles.mobileSearchForm}>
                <input
                  type="text"
                  placeholder="Vyhledat karty, boxy, příslušenství..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  style={styles.mobileSearchInput}
                />
                <button type="submit" style={styles.mobileSearchBtn}>
                  <img src="/search.png" alt="Hledat" style={styles.searchIcon} />
                </button>
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
              borderBottom: isMobile ? 'none' : '1px solid rgba(255, 255, 255, 0.08)',
              paddingBottom: isMobile ? '0' : '16px',
              marginBottom: isMobile ? '72px' : '20px',
            }}>
              {!isMobile && <h3 style={styles.drawerHeading}>Více informací</h3>}
              <button style={styles.drawerCloseBtn} onClick={() => setDrawerOpen(false)}>&times;</button>
            </div>
            
            <div style={styles.drawerBody} className="drawer-body-no-scrollbar">
              {/* Mobile Navigation Categories (Only shown on mobile) */}
              {isMobile && (
                <div style={styles.mobileDrawerNav}>
                  {/* 1. Pokémon */}
                  <div style={styles.mobileNavSection}>
                    <div className="mobile-nav-header" style={styles.mobileNavHeader} onClick={() => { handleCategoryClick('singles', { game: 'Pokémon' }); setDrawerOpen(false); }}>
                      <span>Pokémon</span>
                    </div>
                  </div>

                  {/* 2. MTG */}
                  <div style={styles.mobileNavSection}>
                    <div className="mobile-nav-header" style={styles.mobileNavHeader} onClick={() => { handleCategoryClick('singles', { game: 'Magic' }); setDrawerOpen(false); }}>
                      <span>Magic: The Gathering</span>
                    </div>
                  </div>

                  {/* 3. One Piece */}
                  <div style={styles.mobileNavSection}>
                    <div className="mobile-nav-header" style={styles.mobileNavHeader} onClick={() => { handleCategoryClick('singles', { game: 'One Piece' }); setDrawerOpen(false); }}>
                      <span>One Piece</span>
                    </div>
                  </div>

                  {/* 4. Riftbound */}
                  <div style={styles.mobileNavSection}>
                    <div className="mobile-nav-header" style={styles.mobileNavHeader} onClick={() => { handleCategoryClick('singles', { game: 'Riftbound' }); setDrawerOpen(false); }}>
                      <span>Riftbound</span>
                    </div>
                  </div>

                  {/* 5. Accessories */}
                  <div style={styles.mobileNavSection}>
                    <div className="mobile-nav-header" style={styles.mobileNavHeader} onClick={() => { handleCategoryClick('sealed', { category: 'Accessories' }); setDrawerOpen(false); }}>
                      <span>Příslušenství</span>
                    </div>
                  </div>

                  {/* 6. Slabs */}
                  <div style={styles.mobileNavSection}>
                    <div className="mobile-nav-header" style={styles.mobileNavHeader} onClick={() => { handleCategoryClick('slabs'); setDrawerOpen(false); }}>
                      <span>Ohodnocené karty</span>
                    </div>
                  </div>

                  {/* 7. Grading */}
                  <div style={styles.mobileNavSection}>
                    <div className="mobile-nav-header" style={styles.mobileNavHeader} onClick={() => { setActivePage('grading'); setDrawerOpen(false); }}>
                      <span>Grading</span>
                    </div>
                  </div>

                  {/* Language selector on mobile */}
                  <div style={{ ...styles.mobileNavSection, borderBottom: 'none', paddingBottom: '0', marginTop: '48px' }}>
                    <div style={{ ...styles.mobileNavHeader, cursor: 'default', backgroundColor: 'transparent', border: 'none' }}>
                      <span>Jazyk</span>
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
                        <img src="/cz ikona.png" alt="CZ" style={styles.flagIcon} /> Čeština
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
                            <path d="M0,0 v30 h60 v-30 z"/>
                          </clipPath>
                          <path d="M0,0 v30 h60 v-30 z" fill="#012169"/>
                          <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" clipPath="url(#s-mob)"/>
                          <path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" strokeWidth="4" clipPath="url(#s-mob)"/>
                          <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10"/>
                          <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6"/>
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
                  <div style={styles.drawerSection}>
                    <h4 style={styles.drawerSectionTitle}>Výkup karet (Buylist)</h4>
                    <p style={styles.drawerText}>
                      Vykupujeme kusové karty her Pokémon, Magic a One Piece. Získejte peníze na účet nebo Store Kredit s <strong>+25% bonusem</strong>!
                    </p>
                    <button 
                      className="btn btn-primary" 
                      onClick={() => { setActivePage('buylist'); setDrawerOpen(false); }}
                      style={{ width: '100%', marginTop: '8px' }}
                    >
                      Přejít na výkup
                    </button>
                  </div>

                  <div style={styles.drawerSection}>
                    <h4 style={styles.drawerSectionTitle}>Osobní odběr Coffee &amp; Cards</h4>
                    <p style={styles.drawerText}>
                      Vyzvedněte si Své objednávky zdarma v Pardubicích. Ke každé objednávce získáte 10% slevu na kávu.
                    </p>
                    <button 
                      className="btn btn-secondary" 
                      onClick={() => { setActivePage('community'); setDrawerOpen(false); }}
                      style={{ width: '100%', marginTop: '8px' }}
                    >
                      Zobrazit mapu a turnaje
                    </button>
                  </div>

                  <div style={styles.drawerSection}>
                    <h4 style={styles.drawerSectionTitle}>Kontakty a otevírací doba</h4>
                    <p style={styles.drawerText}>
                      <strong>Adresa:</strong> Sladkovského 512, Pardubice<br />
                      <strong>E-mail:</strong> info@northvaletcg.eu<br />
                      <strong>Otevřeno:</strong> Denně 9:00 - 20:00
                    </p>
                  </div>

                  <div style={styles.drawerSection}>
                    <h4 style={styles.drawerSectionTitle}>Studentská sleva 5 %</h4>
                    <p style={styles.drawerText}>
                      Pro studenty UPCE s platnou kartou ISIC nabízíme slevu na celý sortiment kusovek a doplňků. Zadejte Své číslo ISIC v pokladně.
                    </p>
                  </div>

                  <div style={{ ...styles.drawerSection, borderBottom: 'none', marginTop: 'auto' }}>
                    <button 
                      className="btn btn-secondary" 
                      onClick={() => { setActivePage('admin'); setDrawerOpen(false); }}
                      style={{ width: '100%', opacity: 0.6, fontSize: '12px' }}
                    >
                      Vstup do Administrace
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Mobile Help & Socials (Only shown on mobile, pinned at the bottom) */}
            {isMobile && (
              <div style={styles.mobileDrawerFooter}>
                {/* Actions Row (Oblíbené, Kontakt) */}
                <div style={styles.drawerActionsRow}>
                  <button style={styles.drawerActionLink} onClick={() => { handleCategoryClick('singles'); setDrawerOpen(false); }}>
                    <img src="/heart.png" alt="" style={styles.drawerActionIcon} /> Oblíbené
                  </button>
                  <button style={styles.drawerActionLink} onClick={() => { setActivePage('support'); setDrawerOpen(false); }}>
                    Kontakt
                  </button>
                </div>

                {/* Socials */}
                <div style={styles.drawerSocials}>
                  <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" style={styles.drawerSocialLink}>
                    <img src="/instagram.png" alt="Instagram" style={styles.drawerSocialIcon} />
                  </a>
                  <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" style={styles.drawerSocialLink}>
                    <img src="/youtube.png" alt="YouTube" style={styles.drawerSocialIcon} />
                  </a>
                  <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer" style={styles.drawerSocialLink}>
                    <img src="/tik-tok.png" alt="TikTok" style={styles.drawerSocialIcon} />
                  </a>
                </div>

                {/* FAQ Banner */}
                <div style={styles.faqBanner} onClick={() => { setActivePage('support'); setDrawerOpen(false); }}>
                  Potřebujete poradit? <span style={styles.faqBannerLink}>Nejčastější dotazy</span>
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
    gap: '10px',
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
    marginLeft: '-34px',
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
  },
  categoriesList: {
    display: 'flex',
    alignItems: 'center',
    height: '100%',
  },
  dropdownContainer: {
    position: 'relative',
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
    padding: '20px',
    minWidth: '240px',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
  },
  dropdownGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '24px',
    width: 'max-content',
    maxWidth: '800px',
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
};
