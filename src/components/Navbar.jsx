import { useState, useEffect } from 'react';
import { FEATURE_FLAGS } from '../config';

export default function Navbar({ setActivePage, cart, user, setFilters, setSearchQuery, isLoggedIn, onOpenLogin }) {
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
    <header style={styles.header} className="main-navbar">
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
                <img src="/logo s popisem.webp" alt="NORTHVALE TCG" style={styles.logoImg} />
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
                <button className="nav-action-btn" onClick={() => setActivePage('favorites')} title="Oblíbené">
                  <img src="/heart.png" alt="Oblíbené" />
                  <span style={styles.actionLabel}>Oblíbené</span>
                </button>

                <button
                  className="nav-action-btn"
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
                    <img src="/user.png" alt="Profil" />
                  )}
                  <span style={styles.actionLabel}>
                    {isLoggedIn ? `${user.name || 'Můj účet'}` : 'Přihlásit se'}
                  </span>
                </button>

                <button className="nav-action-btn" style={{ marginRight: '-12px' }} onClick={() => setActivePage('cart')} title="Košík">
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
                  <button style={{ ...styles.categoryItem, paddingLeft: 0 }} onClick={() => handleCategoryClick('sealed', { game: 'Pokémon' })}>
                    Pokémon <img src="/angle-small-down (1).png" style={styles.chevron} alt="" />
                  </button>
                  {activeDropdown === 'pokemon' && (
                    <div style={styles.dropdownMenu} className="glass-panel dropdown-menu-animate">
                      <div className="nav-dropdown-row">
                        <div className="nav-dropdown-item" onClick={() => handleCategoryClick('sealed', { game: 'Pokémon', type: 'Booster Box' })}>
                          <div className="nav-dropdown-icon">
                            <img src="https://tcgplayer-cdn.tcgplayer.com/product/552309_in_1000x1000.jpg" alt="" className="nav-dropdown-img" />
                          </div>
                          <span className="nav-dropdown-text">Booster boxy</span>
                        </div>
                        <div className="nav-dropdown-item" onClick={() => handleCategoryClick('sealed', { game: 'Pokémon', type: 'Elite Trainer Box' })}>
                          <div className="nav-dropdown-icon">
                            <img src="https://tcgplayer-cdn.tcgplayer.com/product/506307_in_1000x1000.jpg" alt="" className="nav-dropdown-img" />
                          </div>
                          <span className="nav-dropdown-text">Elite trainer boxy</span>
                        </div>
                        <div className="nav-dropdown-item" onClick={() => handleCategoryClick('sealed', { game: 'Pokémon', type: 'Booster Bundle' })}>
                          <div className="nav-dropdown-icon">
                            <img src="https://tcgplayer-cdn.tcgplayer.com/product/530267_in_1000x1000.jpg" alt="" className="nav-dropdown-img" />
                          </div>
                          <span className="nav-dropdown-text">Bundles</span>
                        </div>
                        <div className="nav-dropdown-item" onClick={() => handleCategoryClick('sealed', { game: 'Pokémon', type: 'Booster' })}>
                          <div className="nav-dropdown-icon">
                            <img src="https://tcgplayer-cdn.tcgplayer.com/product/550201_in_1000x1000.jpg" alt="" className="nav-dropdown-img" />
                          </div>
                          <span className="nav-dropdown-text">Boostery</span>
                        </div>
                        <div className="nav-dropdown-item" onClick={() => handleCategoryClick('sealed', { game: 'Pokémon', type: 'Special Collection' })}>
                          <div className="nav-dropdown-icon">
                            <img src="https://tcgplayer-cdn.tcgplayer.com/product/561990_in_1000x1000.jpg" alt="" className="nav-dropdown-img" />
                          </div>
                          <span className="nav-dropdown-text">Speciální kolekce</span>
                        </div>
                        <div className="nav-dropdown-item" onClick={() => handleCategoryClick('sealed', { game: 'Pokémon', type: 'Other' })}>
                          <div className="nav-dropdown-icon">
                            <img src="https://tcgplayer-cdn.tcgplayer.com/product/450463_in_1000x1000.jpg" alt="" className="nav-dropdown-img" />
                          </div>
                          <span className="nav-dropdown-text">Ostatní</span>
                        </div>
                      </div>
                      <div className="nav-dropdown-footer">
                        <span className="nav-dropdown-all-link" onClick={() => handleCategoryClick('sealed', { game: 'Pokémon' })}>
                          Celá kategorie
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
                  onMouseEnter={() => setActiveDropdown('lorcana')}
                  onMouseLeave={() => setActiveDropdown(null)}
                >
                  <button style={styles.categoryItem} onClick={() => handleCategoryClick('sealed', { game: 'Lorcana' })}>
                    Disney Lorcana <img src="/angle-small-down (1).png" style={styles.chevron} alt="" />
                  </button>
                  {activeDropdown === 'lorcana' && (
                    <div style={styles.dropdownMenu} className="glass-panel dropdown-menu-animate">
                      <div className="nav-dropdown-row">
                        <div className="nav-dropdown-item" onClick={() => handleCategoryClick('sealed', { game: 'Lorcana', type: 'Booster Box' })}>
                          <div className="nav-dropdown-icon">
                            <img src="https://tcgplayer-cdn.tcgplayer.com/product/501783_in_1000x1000.jpg" alt="" className="nav-dropdown-img" />
                          </div>
                          <span className="nav-dropdown-text">Booster boxy</span>
                        </div>
                        <div className="nav-dropdown-item" onClick={() => handleCategoryClick('sealed', { game: 'Lorcana', type: 'Trove Box' })}>
                          <div className="nav-dropdown-icon">
                            <img src="https://tcgplayer-cdn.tcgplayer.com/product/559441_in_1000x1000.jpg" alt="" className="nav-dropdown-img" />
                          </div>
                          <span className="nav-dropdown-text">Trove boxy</span>
                        </div>
                        <div className="nav-dropdown-item" onClick={() => handleCategoryClick('sealed', { game: 'Lorcana', type: 'Booster' })}>
                          <div className="nav-dropdown-icon">
                            <img src="https://tcgplayer-cdn.tcgplayer.com/product/482406_in_1000x1000.jpg" alt="" className="nav-dropdown-img" />
                          </div>
                          <span className="nav-dropdown-text">Boostery</span>
                        </div>
                        <div className="nav-dropdown-item" onClick={() => handleCategoryClick('sealed', { game: 'Lorcana', type: 'Other' })}>
                          <div className="nav-dropdown-icon">
                            <img src="https://tcgplayer-cdn.tcgplayer.com/product/482407_in_1000x1000.jpg" alt="" className="nav-dropdown-img" />
                          </div>
                          <span className="nav-dropdown-text">Ostatní</span>
                        </div>
                      </div>
                      <div className="nav-dropdown-footer">
                        <span className="nav-dropdown-all-link" onClick={() => handleCategoryClick('sealed', { game: 'Lorcana' })}>
                          Celá kategorie
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
                  onMouseEnter={() => setActiveDropdown('onepiece')}
                  onMouseLeave={() => setActiveDropdown(null)}
                >
                  <button style={styles.categoryItem} onClick={() => handleCategoryClick('sealed', { game: 'One Piece' })}>
                    One Piece <img src="/angle-small-down (1).png" style={styles.chevron} alt="" />
                  </button>
                  {activeDropdown === 'onepiece' && (
                    <div style={styles.dropdownMenu} className="glass-panel dropdown-menu-animate">
                      <div className="nav-dropdown-row">
                        <div className="nav-dropdown-item" onClick={() => handleCategoryClick('sealed', { game: 'One Piece', type: 'Booster Box' })}>
                          <div className="nav-dropdown-icon">
                            <img src="https://tcgplayer-cdn.tcgplayer.com/product/532107_in_1000x1000.jpg" alt="" className="nav-dropdown-img" />
                          </div>
                          <span className="nav-dropdown-text">Booster boxy</span>
                        </div>
                        <div className="nav-dropdown-item" onClick={() => handleCategoryClick('sealed', { game: 'One Piece', type: 'Booster' })}>
                          <div className="nav-dropdown-icon">
                            <img src="https://tcgplayer-cdn.tcgplayer.com/product/536109_in_1000x1000.jpg" alt="" className="nav-dropdown-img" />
                          </div>
                          <span className="nav-dropdown-text">Boostery</span>
                        </div>
                        <div className="nav-dropdown-item" onClick={() => handleCategoryClick('sealed', { game: 'One Piece', type: 'Other' })}>
                          <div className="nav-dropdown-icon">
                            <img src="https://tcgplayer-cdn.tcgplayer.com/product/513361_in_1000x1000.jpg" alt="" className="nav-dropdown-img" />
                          </div>
                          <span className="nav-dropdown-text">Ostatní</span>
                        </div>
                      </div>
                      <div className="nav-dropdown-footer">
                        <span className="nav-dropdown-all-link" onClick={() => handleCategoryClick('sealed', { game: 'One Piece' })}>
                          Celá kategorie
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
                  onMouseEnter={() => setActiveDropdown('riftbound')}
                  onMouseLeave={() => setActiveDropdown(null)}
                >
                  <button style={styles.categoryItem} onClick={() => handleCategoryClick('sealed', { game: 'Riftbound' })}>
                    Riftbound <img src="/angle-small-down (1).png" style={styles.chevron} alt="" />
                  </button>
                  {activeDropdown === 'riftbound' && (
                    <div style={styles.dropdownMenu} className="glass-panel dropdown-menu-animate">
                      <div className="nav-dropdown-row">
                        <div className="nav-dropdown-item" onClick={() => handleCategoryClick('sealed', { game: 'Riftbound', type: 'Booster Box' })}>
                          <div className="nav-dropdown-icon">
                            <img src="/Riftbound.webp" alt="" className="nav-dropdown-img" />
                          </div>
                          <span className="nav-dropdown-text">Booster boxy</span>
                        </div>
                        <div className="nav-dropdown-item" onClick={() => handleCategoryClick('sealed', { game: 'Riftbound', type: 'Booster' })}>
                          <div className="nav-dropdown-icon">
                            <img src="/Riftbound.webp" alt="" className="nav-dropdown-img" />
                          </div>
                          <span className="nav-dropdown-text">Boostery</span>
                        </div>
                        <div className="nav-dropdown-item" onClick={() => handleCategoryClick('sealed', { game: 'Riftbound', type: 'Trial Deck' })}>
                          <div className="nav-dropdown-icon">
                            <img src="/Riftbound.webp" alt="" className="nav-dropdown-img" />
                          </div>
                          <span className="nav-dropdown-text">Trial decky</span>
                        </div>
                        <div className="nav-dropdown-item" onClick={() => handleCategoryClick('sealed', { game: 'Riftbound', type: 'Other' })}>
                          <div className="nav-dropdown-icon">
                            <img src="/Riftbound.webp" alt="" className="nav-dropdown-img" />
                          </div>
                          <span className="nav-dropdown-text">Ostatní</span>
                        </div>
                      </div>
                      <div className="nav-dropdown-footer">
                        <span className="nav-dropdown-all-link" onClick={() => handleCategoryClick('sealed', { game: 'Riftbound' })}>
                          Celá kategorie
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
                  onMouseEnter={() => setActiveDropdown('accessories')}
                  onMouseLeave={() => setActiveDropdown(null)}
                >
                  <button style={styles.categoryItem} onClick={() => handleCategoryClick('sealed', { game: 'Accessories' })}>
                    Příslušenství <img src="/angle-small-down (1).png" style={styles.chevron} alt="" />
                  </button>
                  {activeDropdown === 'accessories' && (
                    <div style={styles.dropdownMenu} className="glass-panel dropdown-menu-animate">
                      <div className="nav-dropdown-row">
                        <div className="nav-dropdown-item" onClick={() => handleCategoryClick('sealed', { game: 'Accessories', subcat: 'Binders', subsubcat: 'cards' })}>
                          <div className="nav-dropdown-icon">
                            <img src="https://tcgplayer-cdn.tcgplayer.com/product/142827_in_1000x1000.jpg" alt="" className="nav-dropdown-img" />
                          </div>
                          <span className="nav-dropdown-text">Na karty</span>
                        </div>
                        <div className="nav-dropdown-item" onClick={() => handleCategoryClick('sealed', { game: 'Accessories', subcat: 'Binders', subsubcat: 'toploaders' })}>
                          <div className="nav-dropdown-icon">
                            <img src="https://tcgplayer-cdn.tcgplayer.com/product/142827_in_1000x1000.jpg" alt="" className="nav-dropdown-img" />
                          </div>
                          <span className="nav-dropdown-text">Na toploadery</span>
                        </div>
                        {FEATURE_FLAGS.showSlabs && (
                          <div className="nav-dropdown-item" onClick={() => handleCategoryClick('sealed', { game: 'Accessories', subcat: 'Binders', subsubcat: 'graded' })}>
                            <div className="nav-dropdown-icon">
                              <img src="https://tcgplayer-cdn.tcgplayer.com/product/142827_in_1000x1000.jpg" alt="" className="nav-dropdown-img" />
                            </div>
                            <span className="nav-dropdown-text">Na graded karty</span>
                          </div>
                        )}
                        <div className="nav-dropdown-item" onClick={() => handleCategoryClick('sealed', { game: 'Accessories', subcat: 'Sleeves' })}>
                          <div className="nav-dropdown-icon">
                            <img src="https://tcgplayer-cdn.tcgplayer.com/product/122159_in_1000x1000.jpg" alt="" className="nav-dropdown-img" />
                          </div>
                          <span className="nav-dropdown-text">Sleevy</span>
                        </div>
                        <div className="nav-dropdown-item" onClick={() => handleCategoryClick('sealed', { game: 'Accessories', subcat: 'Toploaders' })}>
                          <div className="nav-dropdown-icon">
                            <img src="https://tcgplayer-cdn.tcgplayer.com/product/142981_in_1000x1000.jpg" alt="" className="nav-dropdown-img" />
                          </div>
                          <span className="nav-dropdown-text">Toploadery</span>
                        </div>
                        <div className="nav-dropdown-item" onClick={() => handleCategoryClick('sealed', { game: 'Accessories', subcat: 'Other' })}>
                          <div className="nav-dropdown-icon">
                            <img src="https://tcgplayer-cdn.tcgplayer.com/product/142827_in_1000x1000.jpg" alt="" className="nav-dropdown-img" />
                          </div>
                          <span className="nav-dropdown-text">Ostatní</span>
                        </div>
                      </div>
                      <div className="nav-dropdown-footer">
                        <span className="nav-dropdown-all-link" onClick={() => handleCategoryClick('sealed', { game: 'Accessories' })}>
                          Celá kategorie
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
                  onMouseEnter={() => setActiveDropdown('acrylics')}
                  onMouseLeave={() => setActiveDropdown(null)}
                >
                  <button style={styles.categoryItem} onClick={() => handleCategoryClick('sealed', { game: 'Acrylics' })}>
                    Akryly <img src="/angle-small-down (1).png" style={styles.chevron} alt="" />
                  </button>
                  {activeDropdown === 'acrylics' && (
                    <div style={styles.dropdownMenu} className="glass-panel dropdown-menu-animate">
                      <div className="nav-dropdown-row">
                        <div className="nav-dropdown-item" onClick={() => handleCategoryClick('sealed', { game: 'Acrylics', gameFilter: 'Pokémon' })}>
                          <div className="nav-dropdown-icon">
                            <img src="/acrylic-etb-box.png" alt="" className="nav-dropdown-img" />
                          </div>
                          <span className="nav-dropdown-text">Pokemon</span>
                        </div>
                        <div className="nav-dropdown-item" onClick={() => handleCategoryClick('sealed', { game: 'Acrylics', gameFilter: 'Lorcana' })}>
                          <div className="nav-dropdown-icon">
                            <img src="/acrylic-etb-box.png" alt="" className="nav-dropdown-img" />
                          </div>
                          <span className="nav-dropdown-text">Lorcana</span>
                        </div>
                        <div className="nav-dropdown-item" onClick={() => handleCategoryClick('sealed', { game: 'Acrylics', gameFilter: 'Riftbound' })}>
                          <div className="nav-dropdown-icon">
                            <img src="/acrylic-etb-box.png" alt="" className="nav-dropdown-img" />
                          </div>
                          <span className="nav-dropdown-text">Riftbound</span>
                        </div>
                        {FEATURE_FLAGS.showSlabs && (
                          <div className="nav-dropdown-item" onClick={() => handleCategoryClick('sealed', { game: 'Acrylics', gameFilter: 'PSA' })}>
                            <div className="nav-dropdown-icon">
                              <img src="/acrylic-etb-box.png" alt="" className="nav-dropdown-img" />
                            </div>
                            <span className="nav-dropdown-text">Psa karty</span>
                          </div>
                        )}
                      </div>
                      <div className="nav-dropdown-footer">
                        <span className="nav-dropdown-all-link" onClick={() => handleCategoryClick('sealed', { game: 'Acrylics' })}>
                          Celá kategorie
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
                    <button style={styles.categoryItem} onClick={() => handleCategoryClick('slabs')}>
                      Ohodnocené karty <img src="/angle-small-down (1).png" style={styles.chevron} alt="" />
                    </button>
                    {activeDropdown === 'slabs' && (
                      <div style={styles.dropdownMenu} className="glass-panel dropdown-menu-animate">
                        <div className="nav-dropdown-row">
                          <div className="nav-dropdown-item" onClick={() => handleCategoryClick('slabs', { company: 'PSA' })}>
                            <div className="nav-dropdown-icon">
                              <img src="/Ohodnoceni karet.webp" alt="" className="nav-dropdown-img" />
                            </div>
                            <span className="nav-dropdown-text">PSA</span>
                          </div>
                          <div className="nav-dropdown-item" onClick={() => handleCategoryClick('slabs', { company: 'Beckett' })}>
                            <div className="nav-dropdown-icon">
                              <img src="/Ohodnoceni karet.webp" alt="" className="nav-dropdown-img" />
                            </div>
                            <span className="nav-dropdown-text">Beckett</span>
                          </div>
                          <div className="nav-dropdown-item" onClick={() => handleCategoryClick('slabs', { company: 'Other' })}>
                            <div className="nav-dropdown-icon">
                              <img src="/Ohodnoceni karet.webp" alt="" className="nav-dropdown-img" />
                            </div>
                            <span className="nav-dropdown-text">Ostatní (CGC, TAG)</span>
                          </div>
                        </div>
                        <div className="nav-dropdown-footer">
                          <span className="nav-dropdown-all-link" onClick={() => handleCategoryClick('slabs')}>
                            Celá kategorie
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
                    <button style={styles.categoryItem} onClick={() => setActivePage('grading')}>
                      Grading <img src="/angle-small-down (1).png" style={styles.chevron} alt="" />
                    </button>
                    {activeDropdown === 'grading' && (
                      <div style={styles.dropdownMenu} className="glass-panel dropdown-menu-animate">
                        <div className="nav-dropdown-row">
                          <div className="nav-dropdown-item" onClick={() => { setActivePage('grading'); setActiveDropdown(null); }}>
                            <div className="nav-dropdown-icon">
                              <img src="/Grading.webp" alt="" className="nav-dropdown-img" />
                            </div>
                            <span className="nav-dropdown-text">Pre Grading</span>
                          </div>
                          <div className="nav-dropdown-item" onClick={() => { setActivePage('grading'); setActiveDropdown(null); }}>
                            <div className="nav-dropdown-icon">
                              <img src="/Desktop - Grading Karet.webp" alt="" className="nav-dropdown-img" />
                            </div>
                            <span className="nav-dropdown-text">Odeslání PSA</span>
                          </div>
                          <div className="nav-dropdown-item" onClick={() => { setActivePage('grading'); setActiveDropdown(null); }}>
                            <div className="nav-dropdown-icon">
                              <img src="/Mobile - Grading karet.webp" alt="" className="nav-dropdown-img" />
                            </div>
                            <span className="nav-dropdown-text">Odeslání Beckett</span>
                          </div>
                          <div className="nav-dropdown-item" onClick={() => { setActivePage('grading'); setActiveDropdown(null); }}>
                            <div className="nav-dropdown-icon">
                              <img src="/grading sekce.webp" alt="" className="nav-dropdown-img" />
                            </div>
                            <span className="nav-dropdown-text">Odeslání TAG</span>
                          </div>
                          <div className="nav-dropdown-item" onClick={() => { setActivePage('grading-guide'); setActiveDropdown(null); }}>
                            <div className="nav-dropdown-icon">
                              <img src="/grading sekce.webp" alt="" className="nav-dropdown-img" />
                            </div>
                            <span className="nav-dropdown-text" style={{ color: 'var(--color-gold)' }}>Průvodce stavy</span>
                          </div>
                        </div>
                        <div className="nav-dropdown-footer">
                          <span className="nav-dropdown-all-link" onClick={() => { setActivePage('grading'); setActiveDropdown(null); }}>
                            Celá kategorie
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
                    <img src="/user.png" alt="Profil" style={styles.mobileActionIcon} />
                  )}
                </button>
                <button className="nav-action-btn" style={{ ...styles.mobileActionBtn, marginRight: '-8px' }} onClick={() => setActivePage('cart')} title="Košík">
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
                      <span>Příslušenství</span>
                    </div>
                  </div>

                  {/* 6. Acrylics */}
                  <div style={styles.mobileNavSection}>
                    <div className="mobile-nav-header" style={styles.mobileNavHeader} onClick={() => { handleCategoryClick('sealed', { game: 'Acrylics' }); setDrawerOpen(false); }}>
                      <span>Akryly</span>
                    </div>
                  </div>

                  {/* O nás mobile link */}
                  <div style={styles.mobileNavSection}>
                    <div className="mobile-nav-header" style={styles.mobileNavHeader} onClick={() => { setActivePage('about'); setDrawerOpen(false); }}>
                      <span>O nás</span>
                    </div>
                  </div>

                  {/* 7. Slabs */}
                  {FEATURE_FLAGS.showSlabs && (
                    <div style={styles.mobileNavSection}>
                      <div className="mobile-nav-header" style={styles.mobileNavHeader} onClick={() => { handleCategoryClick('slabs'); setDrawerOpen(false); }}>
                        <span>Ohodnocené karty</span>
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
                    <h5 style={styles.drawerGroupHeader}>Informace o společnosti</h5>
                    <ul style={styles.drawerLinkList}>
                      <li 
                        style={styles.drawerLinkItem} 
                        className="drawer-link-item"
                        onClick={() => { setActivePage('about'); setDrawerOpen(false); }}
                      >
                        O nás
                      </li>
                      <li 
                        style={styles.drawerLinkItem} 
                        className="drawer-link-item"
                        onClick={() => { setActivePage('support'); setDrawerOpen(false); }}
                      >
                        Kontakt
                      </li>
                      {FEATURE_FLAGS.showBuylist && (
                        <li 
                          style={styles.drawerLinkItem} 
                          className="drawer-link-item"
                          onClick={() => { setActivePage('buylist'); setDrawerOpen(false); }}
                        >
                          Výkup karet (Buylist)
                        </li>
                      )}
                      {FEATURE_FLAGS.showGrading && (
                        <li 
                          style={styles.drawerLinkItem} 
                          className="drawer-link-item"
                          onClick={() => { setActivePage('grading'); setDrawerOpen(false); }}
                        >
                          Grading servis
                        </li>
                      )}
                    </ul>
                  </div>

                  {/* Skupina 2: Vše o nákupu */}
                  <div style={styles.drawerGroup}>
                    <h5 style={styles.drawerGroupHeader}>Vše o nákupu</h5>
                    <ul style={styles.drawerLinkList}>
                      <li 
                        style={styles.drawerLinkItem} 
                        className="drawer-link-item"
                        onClick={() => { setActivePage('support'); setDrawerOpen(false); }}
                      >
                        Centrum podpory
                      </li>
                      <li 
                        style={styles.drawerLinkItem} 
                        className="drawer-link-item"
                        onClick={() => { setActivePage('support'); setDrawerOpen(false); }}
                      >
                        FAQ
                      </li>
                      <li 
                        style={styles.drawerLinkItem} 
                        className="drawer-link-item"
                        onClick={() => { setActivePage('gdpr-vop', 'doprava'); setDrawerOpen(false); }}
                      >
                        Doprava a osobní odběr
                      </li>
                      <li 
                        style={styles.drawerLinkItem} 
                        className="drawer-link-item"
                        onClick={() => { setActivePage('gdpr-vop', 'vop'); setDrawerOpen(false); }}
                      >
                        Obchodní podmínky (VOP)
                      </li>
                      <li 
                        style={styles.drawerLinkItem} 
                        className="drawer-link-item"
                        onClick={() => { setActivePage('gdpr-vop', 'gdpr'); setDrawerOpen(false); }}
                      >
                        Ochrana osobních údajů (GDPR)
                      </li>
                      <li 
                        style={styles.drawerLinkItem} 
                        className="drawer-link-item"
                        onClick={() => { setActivePage('gdpr-vop', 'odstoupeni'); setDrawerOpen(false); }}
                      >
                        Odstoupení od smlouvy
                      </li>
                    </ul>
                  </div>

                  <div style={{ ...styles.drawerSection, borderBottom: 'none', marginTop: 'auto', paddingBottom: '0', alignItems: 'flex-start', textAlign: 'left' }}>
                    <h4 style={{ ...styles.drawerSectionTitle, textAlign: 'left' }}>Kontakty</h4>
                    <p style={{ ...styles.drawerText, textAlign: 'left' }}>
                      <strong>Provozovatel:</strong> NORTHVALE s.r.o.<br />
                      <strong>Sídlo:</strong> Bratří Čapků 1095, Holice<br />
                      <strong>Odběr:</strong> Sladkovského 512, Pardubice<br />
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
                  <button style={styles.drawerActionLink} onClick={() => { setActivePage('favorites'); setDrawerOpen(false); }}>
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
};
