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

  // Articles Grid/Overview View
  return (
    <div className="container fade-in" style={styles.container}>
      {/* Eyebrow & Title */}
      <div style={styles.header}>
        <span className="nv-eyebrow">{tLabel('Články a sběratelský blog', 'Articles & Collector Blog')}</span>
        <h1 style={styles.title}>
          {tLabel('Náš ', 'Our ')}
          <span style={{ color: 'var(--color-gold)' }}>{tLabel('Blog', 'Blog')}</span>
        </h1>
        <p style={styles.subtitle}>
          {tLabel(
            'Průvodce světem karetních her, tipy na ochranu sbírky, rady pro začátečníky a návody pro rozpoznání padělaných karet.',
            'Guides to the card game world, tips on preserving your collection, beginner advice, and how to identify counterfeit cards.'
          )}
        </p>
      </div>

      {/* Category Pills Filter */}
      <div style={styles.pillContainer}>
        {categories.map(cat => (
          <button
            key={cat.id}
            type="button"
            style={{
              ...styles.pill,
              backgroundColor: activeCategory === cat.id ? 'var(--color-gold)' : 'rgba(255, 255, 255, 0.03)',
              color: activeCategory === cat.id ? '#000' : 'var(--text-main)',
              borderColor: activeCategory === cat.id ? 'var(--color-gold)' : 'rgba(255, 255, 255, 0.08)'
            }}
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
            className="glass-panel blog-card"
            style={styles.card}
            onClick={() => handleArticleClick(article.id)}
          >
            {/* Image Wrapper */}
            <div style={styles.imageWrapper}>
              <img 
                src={article.image} 
                alt={article.title} 
                style={styles.cardImage}
                className="blog-card-image"
              />
              <span style={styles.cardCategoryBadge}>
                {tLabel(
                  article.category,
                  categories.find(c => c.id === article.category)?.en || article.category
                )}
              </span>
            </div>

            {/* Info */}
            <div style={styles.cardBody}>
              <div style={styles.cardMeta}>
                <span>⏱ {article.readTime}</span>
              </div>
              <h3 style={styles.cardTitle}>{article.title}</h3>
              <p style={styles.cardDesc}>{article.description}</p>
              
              <span className="blog-read-more" style={styles.readMoreLink}>
                {tLabel('Číst článek →', 'Read Article →')}
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
    marginBottom: '40px'
  },
  title: {
    fontSize: '36px',
    fontWeight: '800',
    marginTop: '12px',
    marginBottom: '16px',
    fontFamily: 'var(--font-heading)',
    letterSpacing: '-0.5px'
  },
  subtitle: {
    fontSize: '16px',
    color: 'var(--text-muted)',
    maxWidth: '650px',
    margin: '0 auto',
    lineHeight: '1.6'
  },
  pillContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
    justifyContent: 'center',
    marginBottom: '48px'
  },
  pill: {
    padding: '8px 16px',
    borderRadius: '100px',
    border: '1px solid',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    outline: 'none'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
    gap: '24px'
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    borderRadius: 'var(--radius-lg)',
    cursor: 'pointer',
    height: '100%',
    padding: '0',
    transition: 'transform 0.3s ease, border-color 0.3s ease'
  },
  imageWrapper: {
    width: '100%',
    height: '210px',
    position: 'relative',
    overflow: 'hidden'
  },
  cardImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transition: 'transform 0.5s ease'
  },
  cardCategoryBadge: {
    position: 'absolute',
    top: '12px',
    left: '12px',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    color: 'var(--color-gold)',
    border: '1px solid rgba(253, 189, 22, 0.3)',
    fontSize: '11px',
    fontWeight: '700',
    padding: '4px 10px',
    borderRadius: '100px',
    backdropFilter: 'blur(4px)'
  },
  cardBody: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    flex: '1 1 auto'
  },
  cardMeta: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    marginBottom: '10px',
    fontWeight: '600'
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: 'var(--text-main)',
    marginBottom: '10px',
    lineHeight: '1.4',
    fontFamily: 'var(--font-heading)'
  },
  cardDesc: {
    fontSize: '13.5px',
    color: 'var(--text-muted)',
    lineHeight: '1.6',
    marginBottom: '20px',
    display: '-webkit-box',
    WebkitLineClamp: 3,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden'
  },
  readMoreLink: {
    marginTop: 'auto',
    fontSize: '13px',
    fontWeight: '700',
    color: 'var(--color-gold)',
    display: 'inline-block',
    transition: 'color 0.2s ease'
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
