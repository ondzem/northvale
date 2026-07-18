import { useState, useEffect } from 'react';
import { useTranslation } from '../context/LanguageContext';
import { blogArticles } from '../blogData';

// Helper to get static publication date
const getArticleDate = (id) => {
  switch (id) {
    case 'jak-rozpoznat-falesnou-pokemon-kartu':
      return '28. 07. 2026';
    case 'jak-zacit-s-pokemon-kartami':
      return '25. 07. 2026';
    case 'kde-koupit-pokemon-karty-v-cesku':
      return '22. 07. 2026';
    case 'kde-sehnat-pokemon-karty-v-cr':
      return '19. 07. 2026';
    case 'prislusenstvi-pro-karty':
      return '15. 07. 2026';
    case 'vybava-sberatele-pokemon-karet':
      return '12. 07. 2026';
    default:
      return '28. 07. 2026';
  }
};

export default function Blog({ selectedArticleId, setSelectedProductId, setActivePage }) {
  const { lang } = useTranslation();

  // Categories list derived from CZ categories
  const categories = [
    { id: 'all', cz: 'Všechny články', en: 'All Articles' },
    { id: 'Bezpečnost', cz: 'Bezpečnost', en: 'Security' },
    { id: 'Pro začátečníky', cz: 'Pro začátečníky', en: 'For Beginners' },
    { id: 'Nákupní průvodce', cz: 'Nákupní průvodce', en: 'Shopping Guide' },
    { id: 'Příslušenství', cz: 'Příslušenství', en: 'Accessories' },
    { id: 'Pro sběratele', cz: 'Pro sběratele', en: 'For Collectors' }
  ];

  // Scroll to top when article is selected or page mounts
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [selectedArticleId]);

  const activeArticle = blogArticles.find(a => a.id === selectedArticleId);

  const filteredArticles = blogArticles;

  const handleArticleClick = (slug) => {
    // Set active page to blog and pass slug as product/article ID
    setSelectedProductId(slug);
    setActivePage('blog');
  };

  const handleBackToList = () => {
    setSelectedProductId(null);
    setActivePage('blog');
  };

  // Helper to translate labels
  const tLabel = (cz, en) => (lang === 'CZ' ? cz : en);

  // Scroll Spy / Active Anchor state
  const [activeAnchor, setActiveAnchor] = useState('');

  useEffect(() => {
    if (!activeArticle) return;
    
    const handleScroll = () => {
      const headings = document.querySelectorAll('.are-body h2');
      let currentActive = '';
      
      // If we are at the top of the page, highlight the first item
      if (window.scrollY < 200) {
        const firstHeading = headings[0];
        if (firstHeading) {
          setActiveAnchor(firstHeading.id);
          return;
        }
      }
      
      headings.forEach(heading => {
        const rect = heading.getBoundingClientRect();
        // If the heading is in the upper part of the viewport
        if (rect.top <= 140) {
          currentActive = heading.id;
        }
      });
      
      if (currentActive) {
        setActiveAnchor(currentActive);
      }
    };

    window.addEventListener('scroll', handleScroll);
    // Initial call to set active heading
    handleScroll();
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, [selectedArticleId, activeArticle]);

  if (activeArticle) {
    // Extract H2 sections for the Table of Contents sidebar
    const h2Sections = activeArticle.content.filter(sec => sec.type === 'h2');

    const handleTocClick = (e, slug) => {
      e.preventDefault();
      const element = document.getElementById(slug);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
        setActiveAnchor(slug);
      }
    };

    // Helper to generate dynamic matching anchor IDs
    const slugify = (text) => {
      return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');
    };

    // Detailed Article View
    return (
      <div className="container fade-in" style={{ ...styles.container, paddingTop: '40px' }}>
        <div style={{ marginBottom: '24px' }}>
          <button 
            type="button"
            className="are-back"
            onClick={handleBackToList}
          >
            ← {tLabel('Zpět na přehled článků', 'Back to articles')}
          </button>
        </div>

        {/* Article Header (Masthead) */}
        <header className="are-mast">
          <h1 className="are-title">{activeArticle.title}</h1>
          <p className="are-lead">{activeArticle.description}</p>
          <div style={styles.mastMeta}>
            <span>👤 {tLabel('Redakce Northvale TCG', 'Northvale TCG Editors')}</span>
            <span style={{ margin: '0 8px', opacity: 0.3 }}>•</span>
            <span>📅 {getArticleDate(activeArticle.id)}</span>
            <span style={{ margin: '0 8px', opacity: 0.3 }}>•</span>
            <span>⏱ {activeArticle.readTime} {tLabel('čtení', 'read')}</span>
          </div>
        </header>

        {/* Premium full-width hero image with auto height */}
        <div className="are-hero">
          <div className="card-art-hero">
            <img src={activeArticle.image} alt={activeArticle.title || 'Northvale TCG blog'} className="card-art-hero-img" width="1200" height="675" />
          </div>
        </div>

        {/* Main Editorial Grid Layout */}
        <div className="are-grid">
          {/* Table of Contents Sticky Sidebar */}
          <aside className="are-toc">
            <div className="are-toc-label">— {tLabel('V tomto článku', 'In this article')}</div>
            <nav className="are-toc-nav">
              {h2Sections.map((sec, idx) => {
                const num = String(idx + 1).padStart(2, '0');
                const slug = slugify(sec.text);
                const isActive = slug === activeAnchor;
                return (
                  <a 
                    key={idx} 
                    href={`#${slug}`} 
                    className={`are-toc-item ${isActive ? 'active' : ''}`}
                    onClick={(e) => handleTocClick(e, slug)}
                  >
                    <span className="are-toc-num">{num}</span>
                    <span>{sec.text}</span>
                  </a>
                );
              })}
            </nav>
          </aside>

          {/* Main Article Body Column */}
          <article className="are-body">
            {activeArticle.content.map((sec, idx) => {
              if (sec.type === 'h2') {
                const slug = slugify(sec.text);
                return (
                  <h2 key={idx} id={slug} className="are-h2">
                    {sec.text}
                  </h2>
                );
              }
              if (sec.type === 'h3') {
                return <h3 key={idx} className="are-h3">{sec.text}</h3>;
              }
              
              // Format links dynamically in paragraph text for SEO optimization
              let text = sec.text;
              
              const formatParagraphText = (rawText) => {
                const parts = [];
                
                const linksToMap = [
                  { pattern: 'nabídku toploaderů', href: '/sealed-catalog?game=Accessories', action: () => handleInternalNav('sealed-catalog', { game: 'Accessories' }) },
                  { pattern: 'pokémon obaly', href: '/sealed-catalog?game=Accessories', action: () => handleInternalNav('sealed-catalog', { game: 'Accessories' }) },
                  { pattern: 'obaly na karty', href: '/sealed-catalog?game=Accessories', action: () => handleInternalNav('sealed-catalog', { game: 'Accessories' }) },
                  { pattern: 'akrylové stojánky', href: '/sealed-catalog?game=Acrylics', action: () => handleInternalNav('sealed-catalog', { game: 'Acrylics' }) },
                  { pattern: 'obaly Ultra PRO', href: '/sealed-catalog?game=Accessories', action: () => handleInternalNav('sealed-catalog', { game: 'Accessories' }) },
                  { pattern: 'stojánky a display systémy', href: '/sealed-catalog?game=Acrylics', action: () => handleInternalNav('sealed-catalog', { game: 'Acrylics' }) },
                  { pattern: 'jak poznat fake Pokémon kartu', href: '/blog/jak-rozpoznat-falesnou-pokemon-kartu', action: () => handleArticleClick('jak-rozpoznat-falesnou-pokemon-kartu') },
                  { pattern: 'jak poznat falešnou Pokémon kartu', href: '/blog/jak-rozpoznat-falesnou-pokemon-kartu', action: () => handleArticleClick('jak-rozpoznat-falesnou-pokemon-kartu') },
                  { pattern: 'jak poznat falešné karty Pokémon', href: '/blog/jak-rozpoznat-falesnou-pokemon-kartu', action: () => handleArticleClick('jak-rozpoznat-falesnou-pokemon-kartu') },
                  { pattern: 'jak začít s Pokémon kartami', href: '/blog/jak-zacit-s-pokemon-kartami', action: () => handleArticleClick('jak-zacit-s-pokemon-kartami') },
                  { pattern: 'kde koupit Pokémon karty v Česku', href: '/blog/kde-koupit-pokemon-karty-v-cesku', action: () => handleArticleClick('kde-koupit-pokemon-karty-v-cesku') },
                  { pattern: 'kde sehnat Pokémon karty v ČR', href: '/blog/kde-sehnat-pokemon-karty-v-cr', action: () => handleArticleClick('kde-sehnat-pokemon-karty-v-cr') },
                  { pattern: 'příslušenství pro karty', href: '/blog/prislusenstvi-pro-karty', action: () => handleArticleClick('prislusenstvi-pro-karty') },
                  { pattern: 'výbavu sběratele Pokémon karet', href: '/blog/vybava-sberatele-pokemon-karet', action: () => handleArticleClick('vybava-sberatele-pokemon-karet') }
                ];

                let matches = [];
                linksToMap.forEach(link => {
                  let idx = rawText.toLowerCase().indexOf(link.pattern.toLowerCase());
                  while (idx !== -1) {
                    matches.push({ 
                      start: idx, 
                      length: link.pattern.length, 
                      label: rawText.substring(idx, idx + link.pattern.length), 
                      action: link.action,
                      href: link.href
                    });
                    idx = rawText.toLowerCase().indexOf(link.pattern.toLowerCase(), idx + 1);
                  }
                });

                matches.sort((a, b) => a.start - b.start);

                let filteredMatches = [];
                let lastEnd = 0;
                for (let m of matches) {
                  if (m.start >= lastEnd) {
                    filteredMatches.push(m);
                    lastEnd = m.start + m.length;
                  }
                }

                if (filteredMatches.length === 0) {
                  return rawText;
                }

                let currentPos = 0;
                filteredMatches.forEach((m, index) => {
                  if (m.start > currentPos) {
                    parts.push(rawText.substring(currentPos, m.start));
                  }
                  parts.push(
                    <a 
                      key={index} 
                      href={m.href}
                      className="are-link"
                      onClick={(e) => {
                        if (e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
                          e.preventDefault();
                          m.action();
                        }
                      }}
                    >
                      {m.label}
                    </a>
                  );
                  currentPos = m.start + m.length;
                });

                if (currentPos < rawText.length) {
                  parts.push(rawText.substring(currentPos));
                }

                return parts;
              };

              const handleInternalNav = (page, filters = {}) => {
                if (filters.game) {
                  window.location.hash = '';
                  setActivePage(page);
                } else {
                  setActivePage(page);
                }
              };
              
              return (
                <p key={idx} className="are-p">
                  {formatParagraphText(text)}
                </p>
              );
            })}

            {/* Author Bio Section */}
            <div style={styles.authorBio} className="glass-card">
              <img 
                src="/favicon.svg" 
                alt="Northvale TCG" 
                style={styles.authorAvatar} 
                width="64"
                height="64"
              />
              <div style={styles.authorInfo}>
                <h4 style={styles.authorName}>{tLabel('Autor: Redakce Northvale TCG', 'Written by: Northvale TCG Editor')}</h4>
                <p style={styles.authorDesc}>
                  {tLabel(
                    'Specializovaný tým sběratelů a hráčů karetních her Pokémon, Lorcana a One Piece. Pomáháme chránit vaši sbírku a bezpečně nakupovat originální produkty.',
                    'A specialized team of collectors and players of Pokémon, Lorcana, and One Piece card games. We help protect your collection and safely purchase authentic products.'
                  )}
                </p>
              </div>
            </div>
          </article>
        </div>
      </div>
    );
  }

  // Articles Grid/Overview View
  return (
    <div className="container fade-in" style={styles.container}>
      {/* Title Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>
          {tLabel('Náš blog', 'Our Blog')}
        </h1>
        <p style={styles.subtitle}>
          {tLabel(
            'Průvodce světem karetních her, tipy na ochranu sbírky, rady pro začátečníky a návody pro rozpoznání padělaných karet.',
            'Guides to the card game world, tips on preserving your collection, advice for beginners, and guides to spot fake cards.'
          )}
        </p>
      </div>

      {/* Articles Grid */}
      <div style={styles.grid}>
        {filteredArticles.map(article => (
          <a 
            key={article.id}
            href={`/blog/${article.id}`}
            className="blog-card"
            onClick={(e) => {
              if (e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
                e.preventDefault();
                handleArticleClick(article.id);
              }
            }}
          >
            {/* Image Wrapper - Full width/height, no inner glass border */}
            <div className="blog-card-image-wrapper">
              <img 
                src={article.image} 
                alt={article.title || 'Northvale TCG blog'} 
                className="blog-card-img"
                width="350"
                height="196"
              />
              
              {/* Absolute Top-Left Category Badge */}
              <span style={styles.cardCategoryBadge}>
                {tLabel(
                  article.category,
                  categories.find(c => c.id === article.category)?.en || article.category
                )}
              </span>
            </div>

            {/* Card Body Info */}
            <div style={styles.cardBody}>
              <div style={styles.cardMeta}>
                <span>⏱ {article.readTime}</span>
                <span style={{ margin: '0 8px', opacity: 0.3 }}>•</span>
                <span>{getArticleDate(article.id)}</span>
              </div>
              <h3 className="blog-card-title">{article.title}</h3>
              <p className="blog-card-desc">{article.description}</p>
              
              <span className="blog-card-readmore">
                {tLabel('ČÍST ČLÁNEK', 'READ ARTICLE')}
                <span style={{ fontSize: '14px' }}>→</span>
              </span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

const styles = {
  container: {
    paddingTop: '100px',
    paddingBottom: '180px',
    maxWidth: '1200px',
    margin: '0 auto',
    boxSizing: 'border-box'
  },
  header: {
    textAlign: 'center',
    marginBottom: '64px'
  },
  title: {
    fontSize: '48px',
    fontWeight: '800',
    marginTop: '12px',
    marginBottom: '16px',
    fontFamily: 'var(--font-heading)',
    letterSpacing: '-0.5px',
    color: '#FFF'
  },
  subtitle: {
    fontSize: '15px',
    color: '#8A8A92',
    maxWidth: '650px',
    margin: '0 auto',
    lineHeight: '1.6'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
    gap: '48px 40px'
  },
  cardCategoryBadge: {
    position: 'absolute',
    top: '20px',
    left: '20px',
    backgroundColor: 'rgba(18, 18, 20, 0.85)',
    color: 'var(--color-gold)',
    border: '1px solid rgba(253, 189, 22, 0.2)',
    fontSize: '10px',
    fontWeight: '700',
    padding: '6px 14px',
    borderRadius: '100px',
    backdropFilter: 'blur(5px)',
    letterSpacing: '0.05em',
    zIndex: 10
  },
  cardBody: {
    paddingTop: '20px',
    display: 'flex',
    flexDirection: 'column',
    flex: '1 1 auto'
  },
  cardMeta: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    marginBottom: '10px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center'
  },
  backBtn: {
    color: 'var(--text-main)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    padding: '10px 18px',
    fontSize: '13.5px',
    fontWeight: '600',
    borderRadius: 'var(--radius-md)'
  },
  articleCard: {
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
    padding: '0'
  },
  detailImageWrapper: {
    width: '100%',
    height: '400px',
    position: 'relative'
  },
  detailImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: 'linear-gradient(to bottom, rgba(10, 10, 12, 0) 30%, rgba(10, 10, 12, 0.95) 100%)'
  },
  detailContent: {
    padding: '32px 48px 48px 48px',
    maxWidth: '850px',
    margin: '0 auto',
    boxSizing: 'border-box'
  },
  metaRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '20px'
  },
  categoryBadge: {
    backgroundColor: 'rgba(253, 189, 22, 0.1)',
    color: 'var(--color-gold)',
    border: '1px solid rgba(253, 189, 22, 0.2)',
    fontSize: '12px',
    fontWeight: '700',
    padding: '4px 12px',
    borderRadius: '100px'
  },
  readTime: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    fontWeight: '600'
  },
  articleTitle: {
    fontSize: '32px',
    fontWeight: '800',
    color: 'var(--text-main)',
    marginBottom: '20px',
    lineHeight: '1.3',
    fontFamily: 'var(--font-heading)'
  },
  articleLead: {
    fontSize: '17px',
    color: 'var(--text-muted)',
    lineHeight: '1.6',
    marginBottom: '24px',
    fontWeight: '500'
  },
  divider: {
    height: '1px',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: '32px'
  },
  bodyText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: '15px',
    lineHeight: '1.8'
  },
  p: {
    marginBottom: '20px'
  },
  h2: {
    fontSize: '22px',
    fontWeight: '700',
    color: 'var(--text-main)',
    marginTop: '36px',
    marginBottom: '16px',
    fontFamily: 'var(--font-heading)',
    borderLeft: '3px solid var(--color-gold)',
    paddingLeft: '12px'
  },
  h3: {
    fontSize: '17px',
    fontWeight: '600',
    color: 'var(--color-gold)',
    marginTop: '24px',
    marginBottom: '12px',
    fontFamily: 'var(--font-heading)'
  },
  inlineLink: {
    color: 'var(--color-gold)',
    textDecoration: 'underline',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'opacity 0.2s ease',
    textUnderlineOffset: '3px'
  },
  mastMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '13px',
    color: 'var(--text-muted)',
    marginTop: '12px',
    fontWeight: '500'
  },
  authorBio: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    padding: '24px',
    marginTop: '48px',
    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 'var(--radius-lg)'
  },
  authorAvatar: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    objectFit: 'cover',
    border: '2px solid var(--color-gold)',
    backgroundColor: 'var(--bg-secondary)',
    padding: '6px'
  },
  authorInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  authorName: {
    fontSize: '16px',
    fontWeight: '700',
    color: 'var(--text-main)',
    margin: 0
  },
  authorDesc: {
    fontSize: '14px',
    color: 'var(--text-muted)',
    margin: 0,
    lineHeight: '1.5'
  }
};

