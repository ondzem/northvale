import { useState, useEffect } from 'react';
import { useTranslation } from '../context/LanguageContext';
import { blogArticles } from '../blogData';

export default function Blog({ selectedArticleId, setSelectedProductId, setActivePage }) {
  const { lang } = useTranslation();
  const [activeCategory, setActiveCategory] = useState('all');

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

  const filteredArticles = activeCategory === 'all'
    ? blogArticles
    : blogArticles.filter(a => a.category === activeCategory);

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

  if (activeArticle) {
    // Detailed Article View
    return (
      <div className="container fade-in" style={styles.container}>
        <div style={{ marginBottom: '24px' }}>
          <button 
            type="button"
            className="btn btn-outline"
            style={styles.backBtn}
            onClick={handleBackToList}
          >
            ← {tLabel('Zpět na přehled článků', 'Back to articles')}
          </button>
        </div>

        <article className="glass-panel" style={styles.articleCard}>
          {/* Article Header Image */}
          <div style={styles.detailImageWrapper}>
            <img 
              src={activeArticle.image} 
              alt={activeArticle.title} 
              style={styles.detailImage}
            />
            <div style={styles.imageOverlay} />
          </div>

          <div style={styles.detailContent}>
            {/* Meta info */}
            <div style={styles.metaRow}>
              <span style={styles.categoryBadge}>
                {tLabel(
                  activeArticle.category,
                  categories.find(c => c.id === activeArticle.category)?.en || activeArticle.category
                )}
              </span>
              <span style={styles.readTime}>⏱ {activeArticle.readTime}</span>
            </div>

            {/* Title */}
            <h1 style={styles.articleTitle}>{activeArticle.title}</h1>

            {/* Description */}
            <p style={styles.articleLead}>{activeArticle.description}</p>

            <div className="article-divider" style={styles.divider}></div>

            {/* Main Text Content */}
            <div style={styles.bodyText}>
              {activeArticle.content.map((sec, idx) => {
                if (sec.type === 'h2') {
                  return <h2 key={idx} style={styles.h2}>{sec.text}</h2>;
                }
                if (sec.type === 'h3') {
                  return <h3 key={idx} style={styles.h3}>{sec.text}</h3>;
                }
                
                // Format links dynamically in paragraph text for SEO optimization
                let text = sec.text;
                
                // Replace internal keywords with actual working links
                // 1. "Jak se hrají karty Pokémon" or "článku Jak se hrají karty"
                // 2. "jak poznat falešné karty Pokémon" or "jak poznat fake Pokémon kartu"
                // 3. "ochranu Pokémon karet"
                // 4. "nabídku toploaderů"
                // 5. "akrylové stojánky a display systémy"
                // Let's keep the html parsing simple or render standard react links.
                // We'll split the text by some terms and output elements
                
                const formatParagraphText = (rawText) => {
                  const parts = [];
                  let lastIdx = 0;
                  
                  const linksToMap = [
                    { pattern: 'nabídku toploaderů', action: () => handleInternalNav('sealed-catalog', { game: 'Accessories' }) },
                    { pattern: 'pokémon obaly', action: () => handleInternalNav('sealed-catalog', { game: 'Accessories' }) },
                    { pattern: 'obaly na karty', action: () => handleInternalNav('sealed-catalog', { game: 'Accessories' }) },
                    { pattern: 'akrylové stojánky', action: () => handleInternalNav('sealed-catalog', { game: 'Acrylics' }) },
                    { pattern: 'obaly Ultra PRO', action: () => handleInternalNav('sealed-catalog', { game: 'Accessories' }) },
                    { pattern: 'stojánky a display systémy', action: () => handleInternalNav('sealed-catalog', { game: 'Acrylics' }) },
                    { pattern: 'jak poznat fake Pokémon kartu', action: () => handleArticleClick('jak-rozpoznat-fale-nou-pok-mon-kartu') },
                    { pattern: 'jak poznat falešnou Pokémon kartu', action: () => handleArticleClick('jak-rozpoznat-fale-nou-pok-mon-kartu') },
                    { pattern: 'jak poznat falešné karty Pokémon', action: () => handleArticleClick('jak-rozpoznat-fale-nou-pok-mon-kartu') },
                    { pattern: 'jak začít s Pokémon kartami', action: () => handleArticleClick('jak-zacit-s-pokemon-kartami') },
                    { pattern: 'kde koupit Pokémon karty v Česku', action: () => handleArticleClick('kde-koupit-pokemon-karty-v-cesku') },
                    { pattern: 'kde sehnat Pokémon karty v ČR', action: () => handleArticleClick('kde-sehnat-pokemon-karty-v-cr') },
                    { pattern: 'příslušenství pro karty', action: () => handleArticleClick('prislusenstvi-pro-karty') },
                    { pattern: 'výbavu sběratele Pokémon karet', action: () => handleArticleClick('vybava-sberatele-pokemon-karet') }
                  ];

                  // Let's do a simple replacement check
                  let matches = [];
                  linksToMap.forEach(link => {
                    let idx = rawText.toLowerCase().indexOf(link.pattern.toLowerCase());
                    while (idx !== -1) {
                      matches.push({ start: idx, length: link.pattern.length, label: rawText.substring(idx, idx + link.pattern.length), action: link.action });
                      idx = rawText.toLowerCase().indexOf(link.pattern.toLowerCase(), idx + 1);
                    }
                  });

                  // Sort matches by start index
                  matches.sort((a, b) => a.start - b.start);

                  // Filter out overlapping matches
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
                      <span 
                        key={index} 
                        style={styles.inlineLink}
                        onClick={m.action}
                      >
                        {m.label}
                      </span>
                    );
                    currentPos = m.start + m.length;
                  });

                  if (currentPos < rawText.length) {
                    parts.push(rawText.substring(currentPos));
                  }

                  return parts;
                };

                const handleInternalNav = (page, filters = {}) => {
                  // Direct navigation helper
                  if (filters.game) {
                    // Update filters
                    window.location.hash = ''; // Clear hash
                    setActivePage(page);
                  } else {
                    setActivePage(page);
                  }
                };
                
                return (
                  <p key={idx} style={styles.p}>
                    {formatParagraphText(text)}
                  </p>
                );
              })}
            </div>
          </div>
        </article>
      </div>
    );
  }


  // Helper to map category colors to gradients
  const getCategoryGradient = (category) => {
    switch (category) {
      case 'Bezpečnost':
        return 'linear-gradient(135deg, #FF007A 0%, #FF8A00 100%)';
      case 'Pro začátečníky':
        return 'linear-gradient(135deg, #7F00FF 0%, #FF007F 100%)';
      case 'Nákupní průvodce':
        return 'linear-gradient(135deg, #00C6FF 0%, #0072FF 100%)';
      case 'Příslušenství':
        return 'linear-gradient(135deg, #F3904F 0%, #3B4371 100%)';
      case 'Pro sběratele':
        return 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)';
      default:
        return 'linear-gradient(135deg, #2c3e50 0%, #000000 100%)';
    }
  };

  // Helper to get static publication date
  const getArticleDate = (id) => {
    switch (id) {
      case 'jak-rozpoznat-fale-nou-pok-mon-kartu':
        return '18. 06. 2026';
      case 'jak-zacit-s-pokemon-kartami':
        return '17. 06. 2026';
      case 'kde-koupit-pokemon-karty-v-cesku':
        return '16. 06. 2026';
      case 'kde-sehnat-pokemon-karty-v-cr':
        return '15. 06. 2026';
      case 'prislusenstvi-pro-karty':
        return '14. 06. 2026';
      case 'vybava-sberatele-pokemon-karet':
        return '13. 06. 2026';
      default:
        return '18. 06. 2026';
    }
  };

  // Articles Grid/Overview View
  return (
    <div className="container fade-in" style={styles.container}>
      {/* Eyebrow & Title */}
      <div style={styles.header}>
        <span style={styles.eyebrow}>{tLabel('Články a sběratelský blog', 'Articles & Collector Blog')}</span>
        <h1 style={styles.title}>
          {tLabel('Náš ', 'Our ')}
          <span style={{ color: 'var(--color-gold)' }}>{tLabel('blog', 'blog')}</span>
        </h1>
        <p style={styles.subtitle}>
          {tLabel(
            'Průvodce světem karetních her, tipy na ochranu sbírky, rady pro začátečníky a návody pro rozpoznání padělaných karet.',
            'Guides to the card game world, tips on preserving your collection, advice for beginners, and guides to spot fake cards.'
          )}
        </p>
      </div>

      {/* Category Pills Filter */}
      <div style={styles.pillContainer}>
        {categories.map(cat => (
          <button
            key={cat.id}
            type="button"
            className={`blog-pill ${activeCategory === cat.id ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat.id)}
          >
            {tLabel(cat.cz, cat.en)}
          </button>
        ))}
      </div>

      {/* Articles Grid */}
      <div style={styles.grid}>
        {filteredArticles.map(article => (
          <div 
            key={article.id}
            className="blog-card"
            onClick={() => handleArticleClick(article.id)}
          >
            {/* Image Wrapper with Category Gradient */}
            <div 
              className="blog-card-image-wrapper"
              style={{ background: getCategoryGradient(article.category) }}
            >
              {/* Inner Floating Glass Frame */}
              <div className="blog-card-glass-frame">
                <img 
                  src={article.image} 
                  alt={article.title} 
                  className="blog-card-img"
                />
              </div>
              
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
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  container: {
    paddingTop: '48px',
    paddingBottom: '80px',
    maxWidth: '1200px',
    margin: '0 auto',
    boxSizing: 'border-box'
  },
  header: {
    textAlign: 'center',
    marginBottom: '48px'
  },
  eyebrow: {
    fontSize: '11px',
    fontWeight: '500',
    color: '#8A8A92',
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    display: 'block',
    marginBottom: '10px'
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
  pillContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
    justifyContent: 'center',
    marginBottom: '56px'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
    gap: '48px 40px'
  },
  cardCategoryBadge: {
    position: 'absolute',
    top: '24px',
    left: '24px',
    backgroundColor: 'rgba(18, 18, 20, 0.8)',
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
  }
};
