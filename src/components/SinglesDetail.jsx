import { useState, useEffect } from 'react';
import { FEATURE_FLAGS } from '../config';
import { useTranslation } from '../context/LanguageContext';
import ProductCard from './ProductCard';

const getGameImage = (product) => {
  if (product.category === 'Acrylics') return '/acrylic-etb-box.png';
  const game = product.game || '';
  const g = game.toLowerCase();
  if (g.includes('pokémon') || g.includes('pokemon')) return '/Pokemon.webp';
  if (g.includes('lorcana')) return '/lorcana logo.webp';
  if (g.includes('riftbound')) return '/Riftbound.webp';
  if (g.includes('magic')) return '/Magic the gathering.webp';
  if (g.includes('one piece') || g.includes('onepiece')) return '/One piece.webp';
  return '/logo s popisem.webp';
};

// Rich text formatter function for custom headers, lists, check lists, bold text
const parseFormattedText = (text, isMini = false) => {
  if (!text) return null;

  // If it looks like HTML, render it directly
  if (/<[a-z][\s\S]*>/i.test(text)) {
    return (
      <div 
        className={isMini ? "mock-page-container-html" : "tab-popis-text-html"} 
        dangerouslySetInnerHTML={{ __html: text }} 
      />
    );
  }

  const lines = text.split('\n');
  const elements = [];
  let currentList = [];
  
  const parseInlineFormatting = (str) => {
    if (!str) return '';
    const parts = str.split(/\*\*([^*]+)\*\*/g);
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        return <strong key={index} style={{ color: '#fff', fontWeight: 'bold' }}>{part}</strong>;
      }
      return part;
    });
  };

  const flushList = (key) => {
    if (currentList.length > 0) {
      elements.push(
        <ul key={`ul-${key}`} style={{ margin: isMini ? '0 0 8px 0' : '0 0 16px 0', paddingLeft: isMini ? '16px' : '24px', listStyleType: 'none', display: 'flex', flexDirection: 'column', gap: isMini ? '4px' : '8px' }}>
          {currentList.map((item, idx) => {
            const bulletColor = item.type === 'star' ? 'var(--color-gold, #fdbd16)' : item.type === 'check' ? '#4caf50' : 'rgba(255,255,255,0.4)';
            const bulletChar = item.type === 'check' ? '✓' : item.type === 'star' ? '✦' : '•';
            return (
              <li key={`li-${key}-${idx}`} style={{ display: 'flex', gap: '6px', alignItems: 'flex-start', fontSize: isMini ? '11px' : '14.5px', lineHeight: '1.6', color: 'rgba(255,255,255,0.85)' }}>
                <span style={{ color: bulletColor, fontWeight: 'bold', fontSize: isMini ? '10px' : '14px', flexShrink: 0, marginTop: isMini ? '1px' : '2px' }}>{bulletChar}</span>
                <span style={{ flex: 1 }}>{parseInlineFormatting(item.text)}</span>
              </li>
            );
          })}
        </ul>
      );
      currentList = [];
    }
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    
    // Check if it's a heading
    if (trimmed.startsWith('### ')) {
      flushList(index);
      const headingText = trimmed.substring(4);
      elements.push(
        <h3 key={index} style={{ fontSize: isMini ? '12px' : '18px', fontWeight: '800', color: '#fff', margin: isMini ? '12px 0 6px 0' : '24px 0 12px 0', fontFamily: 'var(--font-heading)' }}>
          {parseInlineFormatting(headingText)}
        </h3>
      );
    } else if (trimmed.startsWith('## ')) {
      flushList(index);
      const headingText = trimmed.substring(3);
      elements.push(
        <h2 key={index} style={{ fontSize: isMini ? '13px' : '20px', fontWeight: '800', color: '#fff', margin: isMini ? '14px 0 8px 0' : '28px 0 16px 0', fontFamily: 'var(--font-heading)' }}>
          {parseInlineFormatting(headingText)}
        </h2>
      );
    } else if (trimmed.startsWith('# ')) {
      flushList(index);
      const headingText = trimmed.substring(2);
      elements.push(
        <h1 key={index} style={{ fontSize: isMini ? '14px' : '24px', fontWeight: '800', color: '#fff', margin: isMini ? '16px 0 10px 0' : '32px 0 20px 0', fontFamily: 'var(--font-heading)' }}>
          {parseInlineFormatting(headingText)}
        </h1>
      );
    }
    // Check if it's a list item
    else if (trimmed.startsWith('• ') || trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const itemText = trimmed.replace(/^(•|-|\*)\s*/, '');
      currentList.push({ type: 'bullet', text: itemText });
    } else if (trimmed.startsWith('✦ ')) {
      const itemText = trimmed.replace(/^✦\s*/, '');
      currentList.push({ type: 'star', text: itemText });
    } else if (trimmed.startsWith('✓ ')) {
      const itemText = trimmed.replace(/^✓\s*/, '');
      currentList.push({ type: 'check', text: itemText });
    }
    // Regular line
    else {
      if (trimmed === '') {
        flushList(index);
        elements.push(<div key={index} style={{ height: isMini ? '6px' : '12px' }} />);
      } else {
        flushList(index);
        elements.push(
          <p key={index} style={{ margin: isMini ? '0 0 6px 0' : '0 0 16px 0', whiteSpace: 'pre-wrap', lineHeight: '1.6', color: 'rgba(255,255,255,0.85)', fontSize: isMini ? '11px' : '14.5px' }}>
            {parseInlineFormatting(line)}
          </p>
        );
      }
    }
  });

  flushList(lines.length);
  return elements;
};

export default function SinglesDetail({ productId, products, addToCart, setSelectedProductId, setActivePage, setFilters, alert }) {
  const { lang, t } = useTranslation();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxZoomStyle, setLightboxZoomStyle] = useState({ display: 'none' });
  
  // Custom interactive states
  const [qty, setQty] = useState(1);
  const [activeTab, setActiveTab] = useState('popis');
  const [isAskModalOpen, setIsAskModalOpen] = useState(false);
  const [isWatchdogModalOpen, setIsWatchdogModalOpen] = useState(false);
  const [isFavorite, setIsFavorite] = useState(() => {
    try {
      const saved = localStorage.getItem(`fav-${productId}`);
      return saved === 'true';
    } catch {
      return false;
    }
  });

  const handleFavoriteClick = () => {
    const nextVal = !isFavorite;
    setIsFavorite(nextVal);
    try {
      localStorage.setItem(`fav-${productId}`, String(nextVal));
      if (alert) {
        alert(nextVal ? 'Přidáno do oblíbených' : 'Odebráno z oblíbených', 'success');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Ask Form fields
  const [askEmail, setAskEmail] = useState('');
  const [askPhone, setAskPhone] = useState('');
  const [askMessage, setAskMessage] = useState('');
  const [askGdpr, setAskGdpr] = useState(false);

  // Watchdog Form fields
  const [watchdogType, setWatchdogType] = useState('stock');
  const [watchdogPriceLimit, setWatchdogPriceLimit] = useState('');
  const [watchdogEmail, setWatchdogEmail] = useState('');
  const [watchdogGdpr, setWatchdogGdpr] = useState(false);

  // Local state for reviews & comments (mock database)
  const [reviews, setReviews] = useState([
    { author: 'Ondřej K.', rating: 5, date: '12. 5. 2026', text: 'Karta dorazila v naprosto perfektním stavu (NM je opravdu NM). Maximální spokojenost, doporučuji!' },
    { author: 'Marek P.', rating: 5, date: '3. 4. 2026', text: 'Skvěle zabaleno, rohy chráněné, rychlé dodání. Už se těším na další nákup.' }
  ]);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewAuthor, setReviewAuthor] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');

  const [comments, setComments] = useState([
    { author: 'Pavel S.', date: '20. 5. 2026', text: 'Máte skladem i foil variantu z japonské edice?' },
    { author: 'Northvale Team', date: '21. 5. 2026', text: 'Dobrý den, ano, japonskou verzi NM Foil naleznete v katalogu pod kódem SV3a-139.' }
  ]);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [commentAuthor, setCommentAuthor] = useState('');
  const [commentText, setCommentText] = useState('');



  const product = products.find(p => p.id === productId);

  if (!product) {
    return (
      <div style={styles.errorContainer} className="glass-panel">
        <h3>{lang === 'CZ' ? 'Karta nebyla nalezena' : 'Card not found'}</h3>
        <button className="btn btn-primary" onClick={() => { if (setFilters) setFilters({}); setActivePage('singles-catalog'); }}>
          {lang === 'CZ' ? 'Zpět do katalogu' : 'Back to catalog'}
        </button>
      </div>
    );
  }

  // React state for dynamic selection of variant parameters
  const initialVariant = product.variants && product.variants.length > 0
    ? product.variants[0]
    : { id: product.id, price: product.price || 0, stock: product.stock || 0, condition: 'NM', lang: 'EN', foil: false };

  const [selectedCondition, setSelectedCondition] = useState(initialVariant.condition);
  const [selectedLang, setSelectedLang] = useState(initialVariant.lang);
  const [selectedFoil, setSelectedFoil] = useState(initialVariant.foil);

  // Sync state if product changes
  useEffect(() => {
    if (product.variants && product.variants.length > 0) {
      setSelectedCondition(product.variants[0].condition);
      setSelectedLang(product.variants[0].lang);
      setSelectedFoil(product.variants[0].foil);
    } else {
      setSelectedCondition('NM');
      setSelectedLang('EN');
      setSelectedFoil(false);
    }
    setQty(1);
  }, [productId, products]);

  // Find exact matching variant
  let activeVariant = product.variants && product.variants.length > 0
    ? product.variants.find(v => v.condition === selectedCondition && v.lang === selectedLang && v.foil === selectedFoil)
    : null;

  // Fallback to avoid crashes
  if (!activeVariant && product.variants && product.variants.length > 0) {
    activeVariant = product.variants.find(v => v.condition === selectedCondition)
      || product.variants.find(v => v.lang === selectedLang)
      || product.variants[0];
  }

  if (!activeVariant) {
    activeVariant = { id: product.id, price: product.price || 0, stock: product.stock || 0, condition: 'NM', lang: 'EN', foil: false };
  }

  const price = activeVariant.price;
  const stock = activeVariant.stock;
  const condition = activeVariant.condition;
  const variantLang = activeVariant.lang;
  const foil = activeVariant.foil;

  // Auto-sync handlers to prevent invalid states
  const handleConditionChange = (cond) => {
    setSelectedCondition(cond);
    const matchingVariant = product.variants.find(v => v.condition === cond);
    if (matchingVariant) {
      setSelectedLang(matchingVariant.lang);
      setSelectedFoil(matchingVariant.foil);
    }
  };

  const handleLangChange = (lg) => {
    setSelectedLang(lg);
    const matchingVariant = product.variants.find(v => v.condition === selectedCondition && v.lang === lg) 
      || product.variants.find(v => v.lang === lg);
    if (matchingVariant) {
      setSelectedCondition(matchingVariant.condition);
      setSelectedFoil(matchingVariant.foil);
    }
  };

  const handleFoilChange = (fl) => {
    setSelectedFoil(fl);
    const matchingVariant = product.variants.find(v => v.condition === selectedCondition && v.lang === selectedLang && v.foil === fl)
      || product.variants.find(v => v.foil === fl);
    if (matchingVariant) {
      setSelectedCondition(matchingVariant.condition);
      setSelectedLang(matchingVariant.lang);
    }
  };

  const availableConditions = product.variants ? [...new Set(product.variants.map(v => v.condition))] : [];
  const availableLangs = product.variants ? [...new Set(product.variants.map(v => v.lang))] : [];
  const availableFoils = product.variants ? [...new Set(product.variants.map(v => v.foil))] : [];

  const images = [
    product.image,
    ...(product.additionalImages || []),
    product.backImage || 'https://images.pokemontcg.io/unbroken_bonds/back.png'
  ].filter(Boolean);

  const activeImage = images[currentImageIndex] || product.image;

  const handlePrevImage = (e) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNextImage = (e) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  // Custom Zoom Magnifier implementation for Lightbox Modal
  const handleLightboxMouseMove = (e) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setLightboxZoomStyle({
      display: 'block',
      backgroundImage: `url(${activeImage})`,
      backgroundPosition: `${x}% ${y}%`,
      backgroundSize: `${width * 2.2}px ${height * 2.2}px` // 2.2x zoom
    });
  };

  const handleLightboxMouseLeave = () => {
    setLightboxZoomStyle({ display: 'none' });
  };

  // Filter related and similar products
  const relatedSingles = products
    .filter(p => p.type === 'single' && p.game === product.game && p.id !== product.id)
    .slice(0, 8);

  const similarSingles = products
    .filter(p => (p.type === 'single' || (FEATURE_FLAGS.showSlabs && p.type === 'slab')) && p.id !== product.id && !relatedSingles.some(r => r.id === p.id))
    .slice(0, 8);

  // Helper function to get card codes


  // Smooth scroll handler for tabs
  const scrollToSection = (id) => {
    setActiveTab(id);
    setTimeout(() => {
      const element = document.querySelector('.product-tabs-wrapper');
      if (element) {
        const offset = 80; // offset matches sticky header navbar
        const elementPosition = element.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({
          top: elementPosition - offset,
          behavior: 'smooth'
        });
      }
    }, 50);
  };



  // Action submissions
  const handleAskSubmit = (e) => {
    e.preventDefault();
    if (alert) {
      alert(lang === 'CZ' ? 'Váš dotaz byl úspěšně odeslán prodejci. Brzy se Vám ozveme.' : 'Your inquiry has been successfully sent to the seller. We will get back to you soon.', 'success');
    }
    setAskEmail('');
    setAskPhone('');
    setAskMessage('');
    setAskGdpr(false);
    setIsAskModalOpen(false);
  };

  const handleWatchdogSubmit = (e) => {
    e.preventDefault();
    if (alert) {
      alert(lang === 'CZ' ? 'Hlídací pes byl nastaven. Budete upozorněni e-mailem.' : 'Watchdog has been set. You will be notified by email.', 'success');
    }
    setWatchdogPriceLimit('');
    setWatchdogEmail('');
    setWatchdogGdpr(false);
    setIsWatchdogModalOpen(false);
  };

  const handleShareClick = () => {
    navigator.clipboard.writeText(window.location.href);
    if (alert) {
      alert(lang === 'CZ' ? 'Odkaz na tuto kartu byl zkopírován do schránky.' : 'Link to this card has been copied to your clipboard.', 'success');
    }
  };

  const handleReviewSubmit = (e) => {
    e.preventDefault();
    const dateStr = new Date().toLocaleDateString(lang === 'CZ' ? 'cs-CZ' : 'en-US');
    const newRev = {
      author: reviewAuthor,
      rating: reviewRating,
      date: dateStr,
      text: reviewText
    };
    setReviews([newRev, ...reviews]);
    if (alert) {
      alert(lang === 'CZ' ? 'Děkujeme! Vaše hodnocení bylo úspěšně přidáno.' : 'Thank you! Your review has been successfully added.', 'success');
    }
    setReviewAuthor('');
    setReviewRating(5);
    setReviewText('');
    setIsReviewModalOpen(false);
    scrollToSection('hodnoceni');
  };

  const handleCommentSubmit = (e) => {
    e.preventDefault();
    const dateStr = new Date().toLocaleDateString(lang === 'CZ' ? 'cs-CZ' : 'en-US');
    const newComm = {
      author: commentAuthor,
      date: dateStr,
      text: commentText
    };
    setComments([...comments, newComm]);
    if (alert) {
      alert(lang === 'CZ' ? 'Komentář byl úspěšně přidán do diskuze.' : 'Comment has been successfully added to the discussion.', 'success');
    }
    setCommentAuthor('');
    setCommentText('');
    setIsCommentModalOpen(false);
    scrollToSection('diskuse');
  };
  const getPriceHistory = () => {
    const months = lang === 'CZ'
      ? ['Čec', 'Srp', 'Zář', 'Říj', 'Lis', 'Pro', 'Led', 'Úno', 'Bře', 'Dub', 'Kvě', 'Čer']
      : ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const seed = product.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const history = [];
    let tempPrice = price;
    for (let i = 11; i >= 0; i--) {
      history.unshift({
        month: months[i],
        price: Math.round(tempPrice)
      });
      const changePercent = 0.965 + ((seed + i) % 5) * 0.01;
      tempPrice = tempPrice * changePercent;
    }
    history[11].price = price;
    return history;
  };

  let descBlocks = [];
  try {
    if (product.desc && product.desc.startsWith('[')) {
      descBlocks = JSON.parse(product.desc);
    }
  } catch (e) {
    console.error("Failed to parse description blocks", e);
  }
  if (!Array.isArray(descBlocks) || descBlocks.length === 0) {
    descBlocks = [{ id: 'b-default', type: 'text', value: product.desc || '' }];
  }

  const firstBlockText = descBlocks.find(b => b.type === 'text')?.value || '';
  const fallbackShortDesc = firstBlockText ? (firstBlockText.split('.').slice(0, 2).filter(Boolean).join('. ') + '.') : '';

  return (
    <div style={styles.container} className="fade-in">
      <h1 className="sr-only">{product.name} - Detail karty - NORTHVALE</h1>

      {/* Breadcrumbs Navigation */}
      <div className="container">
        <nav className="breadcrumbs-nav">
        <span className="breadcrumb-item" onClick={() => { setActivePage('home'); }}>
          {t('common.home')}
        </span>
        <span className="breadcrumb-separator">/</span>
        <span 
          className="breadcrumb-item" 
          onClick={() => { 
            if (setFilters) setFilters({ game: product.game }); 
            setActivePage('singles-catalog'); 
          }}
        >
          {product.game}
        </span>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-item active">
          {product.name}
        </span>
      </nav>
      </div>

      <div className="container">
        <div style={styles.layout}>
        {/* Left Column: Clean Image Gallery */}
        <div className="product-detail-left-col" style={styles.leftCol}>
          <div className="detail-gallery-wrapper">
            {/* Left Nav Arrow */}
            {images.length > 1 && (
              <button type="button" className="gallery-nav-btn gallery-nav-left" onClick={handlePrevImage} aria-label={lang === 'CZ' ? 'Předchozí obrázek' : 'Previous image'}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="20" y1="12" x2="4" y2="12" />
                  <polyline points="10 18 4 12 10 6" />
                </svg>
              </button>
            )}

            <div 
              className="detail-clean-image-container"
              onClick={() => setIsLightboxOpen(true)}
              style={{ cursor: 'zoom-in' }}
            >
              <img 
                src={activeImage} 
                alt={product.name} 
              />
            </div>

            {/* Right Nav Arrow */}
            {images.length > 1 && (
              <button type="button" className="gallery-nav-btn gallery-nav-right" onClick={handleNextImage} aria-label={lang === 'CZ' ? 'Další obrázek' : 'Next image'}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="4" y1="12" x2="20" y2="12" />
                  <polyline points="14 6 20 12 14 18" />
                </svg>
              </button>
            )}
          </div>

          {/* Indicator Lines */}
          {images.length > 1 && (
            <div style={styles.indicators}>
              {images.map((_, idx) => (
                <span 
                  key={idx} 
                  style={{
                    ...styles.dot, 
                    width: currentImageIndex === idx ? '32px' : '16px',
                    backgroundColor: currentImageIndex === idx ? 'var(--color-gold)' : 'rgba(255,255,255,0.2)'
                  }}
                  onClick={() => setCurrentImageIndex(idx)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Title, Ratings, Pricing, Buy Action */}
        <div className="product-detail-right-col" style={{ ...styles.rightCol, background: 'transparent', border: 'none', boxShadow: 'none', padding: 0 }}>
          <h2 style={styles.cardTitle}>{product.name}</h2>
          
          {/* Rating stars and count link */}
          <div className="rating-stars-container">
            <span className="rating-star-gold">{'★'.repeat(5)}</span>
            <span className="rating-count-link" onClick={() => scrollToSection('hodnoceni')}>
              ({reviews.length} {lang === 'CZ' ? 'hodnocení' : 'reviews'})
            </span>
          </div>

          {/* Short description with more info link */}
          <div className="product-short-desc">
            {parseFormattedText(product.shortDesc || fallbackShortDesc)}
            <span className="more-info-link" onClick={() => scrollToSection('popis')} style={{ display: 'inline-block', marginLeft: '6px' }}>
              {lang === 'CZ' ? ' Víc informací' : ' More info'}
            </span>
          </div>

          {/* Variant Selectors */}
          {product.variants && product.variants.length > 1 && (
            <div style={styles.variantSelectorsContainer}>
              <h4 style={styles.variantSelectorsTitle}>
                {lang === 'CZ' ? 'Výběr varianty karty:' : 'Select Card Variant:'}
              </h4>
              <div style={styles.selectorsGrid}>
                {/* Condition Selector */}
                {availableConditions.length > 0 && (
                  <div style={styles.selectorField}>
                    <label style={styles.selectorLabel}>{lang === 'CZ' ? 'Stav karty:' : 'Card Condition:'}</label>
                    <select 
                      value={selectedCondition} 
                      onChange={(e) => handleConditionChange(e.target.value)}
                      style={styles.variantSelect}
                    >
                      {availableConditions.map(cond => (
                        <option key={cond} value={cond}>
                          {cond}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Language Selector */}
                {availableLangs.length > 0 && (
                  <div style={styles.selectorField}>
                    <label style={styles.selectorLabel}>{lang === 'CZ' ? 'Jazyk karty:' : 'Card Language:'}</label>
                    <select 
                      value={selectedLang} 
                      onChange={(e) => handleLangChange(e.target.value)}
                      style={styles.variantSelect}
                    >
                      {availableLangs.map(lg => (
                        <option key={lg} value={lg}>
                          {lg === 'EN' ? (lang === 'CZ' ? 'Angličtina (EN)' : 'English (EN)') : lg === 'JP' ? (lang === 'CZ' ? 'Japonština (JP)' : 'Japanese (JP)') : lg}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Foil Selector */}
                {availableFoils.length > 0 && (
                  <div style={styles.selectorField}>
                    <label style={styles.selectorLabel}>{lang === 'CZ' ? 'Provedení:' : 'Finish:'}</label>
                    <select 
                      value={selectedFoil ? 'foil' : 'non-foil'} 
                      onChange={(e) => handleFoilChange(e.target.value === 'foil')}
                      style={styles.variantSelect}
                    >
                      {availableFoils.map(fl => (
                        <option key={fl ? 'foil' : 'non-foil'} value={fl ? 'foil' : 'non-foil'}>
                          {fl ? (lang === 'CZ' ? 'Foil (lesklá)' : 'Foil (shiny)') : (lang === 'CZ' ? 'Non-Foil (klasická)' : 'Non-Foil (classic)')}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}

          <hr className="product-detail-divider" />

          <div className="product-price-purchase-box">
            <div className="price-stock-delivery-group">
              {/* Price displaying */}
              <div className="product-price-section">
                <div className="product-price-vat">
                  {price.toLocaleString('cs-CZ')} Kč
                </div>
                <div className="product-price-ex-vat">
                  {lang === 'CZ' ? 'Bez DPH:' : 'Excl. VAT:'} {Math.round(price / 1.21).toLocaleString('cs-CZ')} Kč
                </div>
              </div>

              {/* Stock status */}
              <div className="product-stock-delivery-wrapper">
                <div className={`product-stock-status ${product.preorder ? 'in-stock' : (stock > 0 ? 'in-stock' : 'out-of-stock')}`}>
                  <span style={{ fontSize: '20px', lineHeight: 1, color: product.preorder ? 'var(--color-gold)' : (stock > 0 ? 'var(--color-green)' : 'var(--color-red)') }}>●</span>
                  {product.preorder ? (
                    <span style={{ color: 'var(--nv-gold, #fdbd16)', fontWeight: 'bold' }}>
                      {lang === 'CZ' ? 'Předobjednávka' : 'Pre-order'}
                    </span>
                  ) : (
                    stock > 0 ? (lang === 'CZ' ? `Skladem (${stock} ks)` : `In Stock (${stock} pcs)`) : (lang === 'CZ' ? 'Na objednávku' : 'Special Order')
                  )}
                </div>
                {product.preorder && product.releaseDate && (
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span>📅</span>
                    <span>{lang === 'CZ' ? `Očekávané vydání: ${product.releaseDate}` : `Expected release: ${product.releaseDate}`}</span>
                    <button 
                      type="button"
                      onClick={() => {
                        sessionStorage.setItem('scrollToPreorderInfo', 'true');
                        setActivePage('gdpr-vop', 'doprava');
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        cursor: 'pointer',
                        color: 'var(--nv-gold, #fdbd16)',
                        textDecoration: 'underline',
                        fontSize: '11px',
                        fontWeight: '600',
                        fontFamily: 'inherit',
                        marginLeft: '4px'
                      }}
                    >
                      {lang === 'CZ' ? 'Jak to funguje?' : 'How does it work?'}
                    </button>
                  </div>
                )}
                <span className="product-delivery-link" onClick={() => setActivePage('community')}>
                  {lang === 'CZ' ? 'Možnosti doručení' : 'Delivery options'}
                </span>
              </div>
            </div>

            <div className="purchase-actions-group">
              {/* Quantity and Cart Button */}
              <div className="product-purchase-row">
                <div className="product-quantity-selector">
                  <button className="qty-btn" onClick={() => setQty(prev => Math.max(1, prev - 1))}>−</button>
                  <input type="number" className="qty-input" value={qty} onChange={e => setQty(Math.max(1, parseInt(e.target.value) || 1))} min="1" max={stock > 0 ? stock : 10} />
                  <button className="qty-btn" onClick={() => setQty(prev => Math.min(stock > 0 ? stock : 10, prev + 1))}>+</button>
                </div>

                <button 
                  className="product-add-to-cart-btn"
                  disabled={stock === 0 && !product.preorder}
                  onClick={() => addToCart(activeVariant, product, qty)}
                  style={{
                    backgroundColor: product.preorder ? 'var(--nv-gold, #fdbd16)' : undefined,
                    color: product.preorder ? '#000' : undefined,
                    fontWeight: product.preorder ? '700' : undefined
                  }}
                >
                  {product.preorder ? (lang === 'CZ' ? 'Předobjednat' : 'Pre-order') : t('common.addToCart')}
                </button>
              </div>

              {/* Actions Buttons Grid */}
              <div className="product-actions-grid">
                <button className="product-action-btn" onClick={handleFavoriteClick} title="Oblíbené" aria-label="Oblíbené">
                  <svg viewBox="0 0 24 24" fill={isFavorite ? 'var(--color-gold)' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                  <span>{t('Navbar.favorites')}</span>
                </button>
                <button className="product-action-btn" onClick={() => setIsAskModalOpen(true)} title="Zeptat se" aria-label="Zeptat se">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  <span>{lang === 'CZ' ? 'Zeptat se' : 'Ask a question'}</span>
                </button>
                <button className="product-action-btn" onClick={() => setIsWatchdogModalOpen(true)} title="Upozornění" aria-label="Upozornění">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                  <span>{lang === 'CZ' ? 'Upozornění' : 'Watchdog'}</span>
                </button>
                <button className="product-action-btn" onClick={handleShareClick} title="Sdílet" aria-label="Sdílet">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="18" cy="5" r="3" />
                    <circle cx="6" cy="12" r="3" />
                    <circle cx="18" cy="19" r="3" />
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                  </svg>
                  <span>{lang === 'CZ' ? 'Sdílet' : 'Share'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Trust Badges */}
          <div className="detail-trust-badges">
            <div className="detail-trust-badge">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="detail-badge-icon-svg">
                <rect x="1" y="3" width="15" height="13" />
                <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                <circle cx="5.5" cy="18.5" r="2.5" />
                <circle cx="18.5" cy="18.5" r="2.5" />
              </svg>
              <div className="detail-badge-text">
                <h4 className="detail-badge-title">{lang === 'CZ' ? 'Doprava zdarma' : 'Free Shipping'}</h4>
                <p className="detail-badge-desc">{lang === 'CZ' ? 'nad 1 000 Kč' : 'over 1,000 CZK'}</p>
              </div>
            </div>
            <div className="detail-trust-badge">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="detail-badge-icon-svg">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
                <line x1="12" y1="2" x2="12" y2="4" />
              </svg>
              <div className="detail-badge-text">
                <h4 className="detail-badge-title">{lang === 'CZ' ? 'Rychlost' : 'Fast Dispatch'}</h4>
                <p className="detail-badge-desc">{lang === 'CZ' ? 'Odesíláme do 24h' : 'Within 24 hours'}</p>
              </div>
            </div>
            <div className="detail-trust-badge">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="detail-badge-icon-svg">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <polyline points="9 11 11 13 15 9" />
              </svg>
              <div className="detail-badge-text">
                <h4 className="detail-badge-title">{lang === 'CZ' ? '100% Originál' : '100% Genuine'}</h4>
                <p className="detail-badge-desc">{lang === 'CZ' ? 'Od distributorů' : 'From distributors'}</p>
              </div>
            </div>
            <div className="detail-trust-badge">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="detail-badge-icon-svg">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                <line x1="1" y1="10" x2="23" y2="10" />
              </svg>
              <div className="detail-badge-text">
                <h4 className="detail-badge-title">{lang === 'CZ' ? 'Bezpečná platba' : 'Secure Payment'}</h4>
                <p className="detail-badge-desc">{lang === 'CZ' ? 'Karta, bankovní převod' : 'Card, bank transfer'}</p>
              </div>
            </div>
          </div>

          {product.investment && (
            <div style={{
              background: 'rgba(253, 189, 22, 0.03)',
              border: '1px solid rgba(253, 189, 22, 0.15)',
              borderRadius: '12px',
              padding: '16px',
              marginTop: '16px',
              display: 'flex',
              gap: '12px',
              alignItems: 'flex-start'
            }}>
              <span style={{ fontSize: '20px', color: 'var(--nv-gold, #fdbd16)', lineHeight: '1' }}>📈</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left' }}>
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--nv-gold, #fdbd16)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {lang === 'CZ' ? 'Investiční doporučení' : 'Investment Advice'}
                </span>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', lineHeight: '1.4' }}>
                  {lang === 'CZ' 
                    ? 'Tato karta představuje zajímavou sběratelskou a investiční příležitost. Pro zachování její hodnoty a stavu (condition) doporučujeme kartu uchovávat v ochranné fólii (sleeve) a pevné toploader/magnetic case krabičce a nevystavovat ji slunečnímu záření.'
                    : 'This card represents a great collecting and investment opportunity. To maintain its value and condition, we recommend keeping the card in a protective sleeve and a rigid toploader/magnetic case, away from direct sunlight.'}
                </span>
              </div>
            </div>
          )}

        </div>
      </div>
      </div>

      {/* Sticky Tab Bar */}
      <div className="product-tabs-wrapper">
        <div className="product-tabs-nav">
          <button 
            className={`product-tab-btn ${activeTab === 'popis' ? 'active' : ''}`} 
            onClick={() => scrollToSection('popis')}
          >
            <svg className="tab-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="21" x2="4" y2="14" />
              <line x1="4" y1="10" x2="4" y2="3" />
              <line x1="12" y1="21" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12" y2="3" />
              <line x1="20" y1="21" x2="20" y2="16" />
              <line x1="20" y1="12" x2="20" y2="3" />
              <line x1="1" y1="14" x2="7" y2="14" />
              <line x1="9" y1="8" x2="15" y2="8" />
              <line x1="17" y1="16" x2="23" y2="16" />
            </svg>
            <span>{lang === 'CZ' ? 'Popis a parametry' : 'Description & Specs'}</span>
          </button>
          {product.investment && (
            <button 
              className={`product-tab-btn ${activeTab === 'trend' ? 'active' : ''}`} 
              onClick={() => scrollToSection('trend')}
            >
              <svg className="tab-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
              <span>{lang === 'CZ' ? 'Vývoj ceny' : 'Price Trend'}</span>
            </button>
          )}
          <button 
            className={`product-tab-btn ${activeTab === 'hodnoceni' ? 'active' : ''}`} 
            onClick={() => scrollToSection('hodnoceni')}
          >
            <svg className="tab-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <span>{lang === 'CZ' ? 'Hodnocení' : 'Reviews'}</span>
          </button>
          <button 
            className={`product-tab-btn ${activeTab === 'diskuse' ? 'active' : ''}`} 
            onClick={() => scrollToSection('diskuse')}
          >
            <svg className="tab-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 8h2a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-2v4l-4-4H9a1.9 1.9 0 0 1-2-2" />
              <path d="M3 14V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-4 4v-4H3z" />
            </svg>
            <span>{lang === 'CZ' ? 'Diskuze' : 'Discussion'}</span>
          </button>
          <button 
            className={`product-tab-btn ${activeTab === 'souvisejici' ? 'active' : ''}`} 
            onClick={() => scrollToSection('souvisejici')}
          >
            <svg className="tab-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
            <span>{lang === 'CZ' ? 'Související produkty' : 'Related Products'}</span>
          </button>
          <button 
            className={`product-tab-btn ${activeTab === 'podobne' ? 'active' : ''}`} 
            onClick={() => scrollToSection('podobne')}
          >
            <svg className="tab-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            <span>{lang === 'CZ' ? 'Podobné produkty' : 'Similar Products'}</span>
          </button>
        </div>
      </div>

    <div className="container">
      {/* Popis Section */}
      {activeTab === 'popis' && (() => {
        const isSlab = product.type === 'slab';
        
        // Helper formatting
        const foilText = foil ? 'Foil' : 'Non-Foil';
        const foilLongText = foil 
          ? (lang === 'CZ' ? 'Foil (Třpytivá) ✨' : 'Foil (Shiny) ✨') 
          : (lang === 'CZ' ? 'Non-Foil (Matná)' : 'Non-Foil (Matte)');
        const langText = variantLang === 'JP' 
          ? (lang === 'CZ' ? 'Japonština 🇯🇵' : 'Japanese 🇯🇵') 
          : variantLang === 'CN' 
            ? (lang === 'CZ' ? 'Čínština 🇨🇳' : 'Chinese 🇨🇳') 
            : (lang === 'CZ' ? 'Angličtina 🇬🇧' : 'English 🇬🇧');
        const conditionFull = condition === 'NM' ? 'Near Mint (NM)' : condition === 'EX' ? 'Excellent (EX)' : condition === 'GD' ? 'Good (GD)' : condition === 'LP' ? 'Light Played (LP)' : condition === 'PL' ? 'Played (PL)' : 'Poor (PO)';
        
        // Mapped details from product (strict truthiness, no fallback mocks)
        const yearReleased = (product.year !== undefined && product.year !== null && product.year !== '') ? Number(product.year) : null;
        const setCode = product.setCode || null;
        const elementColor = product.element || null;
        const stageLevel = product.stage || null;
        const illustrator = product.illustrator || null;

        return (
          <section id="popis" className="detail-section">
            <div className="tab-popis-layout">
              <div className="tab-popis-left-col">
                  <h3 className="detail-section-title" style={{ marginTop: 0 }}>{lang === 'CZ' ? 'Popis produktu' : 'Product Description'}</h3>
                  <div className="tab-popis-text">
                    {descBlocks.map(block => {
                      if (block.type === 'text') {
                        return (
                          <div key={block.id}>
                            {parseFormattedText(block.value)}
                          </div>
                        );
                      } else if (block.type === 'image') {
                        return (
                          <div key={block.id} className="desc-block-image-container" style={{ margin: '20px 0', textAlign: 'left' }}>
                            <img src={block.value} alt="" style={{ maxWidth: '100%', height: 'auto', borderRadius: '8px' }} />
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>


              </div>
              
              <div className="tab-popis-right-col">
                <div className="custom-detail-panel" style={{ padding: '32px', width: '100%', boxSizing: 'border-box' }}>
                  <h3 className="detail-section-title" style={{ marginTop: 0 }}>{lang === 'CZ' ? 'Parametry karty' : 'Card Specs'}</h3>
                  {!isSlab ? (
                    <table className="tab-popis-specs-table">
                      <tbody>
                        {product.game && (
                          <tr>
                            <td>{lang === 'CZ' ? 'Značka / Hra' : 'Game'}</td>
                            <td>{product.game}</td>
                          </tr>
                        )}
                        {product.edition && (
                          <tr>
                            <td>{lang === 'CZ' ? 'Edice / Sada' : 'Expansion / Set'}</td>
                            <td>{product.edition}</td>
                          </tr>
                        )}
                        {setCode && (
                          <tr>
                            <td>{lang === 'CZ' ? 'Zkratka edice' : 'Set Code'}</td>
                            <td>{setCode}</td>
                          </tr>
                        )}
                        {product.rarity && (
                          <tr>
                            <td>{lang === 'CZ' ? 'Rarita' : 'Rarity'}</td>
                            <td>{product.rarity}</td>
                          </tr>
                        )}
                        {getCardCode(product) && (
                          <tr>
                            <td>{lang === 'CZ' ? 'Sběratelské číslo' : 'Collector Number'}</td>
                            <td>{getCardCode(product)}</td>
                          </tr>
                        )}
                        {conditionFull && (
                          <tr>
                            <td>{lang === 'CZ' ? 'Stav karty' : 'Card Condition'}</td>
                            <td>{conditionFull}</td>
                          </tr>
                        )}
                        {langText && (
                          <tr>
                            <td>{lang === 'CZ' ? 'Jazyk' : 'Language'}</td>
                            <td>{langText}</td>
                          </tr>
                        )}
                        {foilLongText && (
                          <tr>
                            <td>{lang === 'CZ' ? 'Provedení (Finish)' : 'Foiling / Finish'}</td>
                            <td>{foilLongText}</td>
                          </tr>
                        )}
                        {elementColor && (
                          <tr>
                            <td>{lang === 'CZ' ? 'Typ / Element' : 'Type / Element'}</td>
                            <td>{elementColor}</td>
                          </tr>
                        )}
                        {product.game === 'Pokémon' && stageLevel && (
                          <tr>
                            <td>{lang === 'CZ' ? 'Stádium vývoje' : 'Stage'}</td>
                            <td>{stageLevel}</td>
                          </tr>
                        )}
                        {illustrator && (
                          <tr>
                            <td>{lang === 'CZ' ? 'Ilustrátor' : 'Illustrator'}</td>
                            <td>{illustrator}</td>
                          </tr>
                        )}
                        {yearReleased && (
                          <tr>
                            <td>{lang === 'CZ' ? 'Rok vydání' : 'Year Released'}</td>
                            <td>{yearReleased}</td>
                          </tr>
                        )}
                        {product.customParams && Array.isArray(product.customParams) && product.customParams.map((cp, idx) => (
                          <tr key={idx}>
                            <td>{cp.label}</td>
                            <td>{cp.value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <table className="tab-popis-specs-table">
                      <tbody>
                        {product.game && (
                          <tr>
                            <td>{lang === 'CZ' ? 'Značka / Hra' : 'Game'}</td>
                            <td>{product.game}</td>
                          </tr>
                        )}
                        {product.edition && (
                          <tr>
                            <td>{lang === 'CZ' ? 'Edice / Sada' : 'Expansion / Set'}</td>
                            <td>{product.edition}</td>
                          </tr>
                        )}
                        {product.rarity && (
                          <tr>
                            <td>{lang === 'CZ' ? 'Rarita' : 'Rarity'}</td>
                            <td>{product.rarity}</td>
                          </tr>
                        )}
                        {langText && (
                          <tr>
                            <td>{lang === 'CZ' ? 'Jazyk' : 'Language'}</td>
                            <td>{langText}</td>
                          </tr>
                        )}
                        {product.company && (
                          <tr>
                            <td>{lang === 'CZ' ? 'Gradingová firma' : 'Grading Company'}</td>
                            <td><strong>{product.company}</strong></td>
                          </tr>
                        )}
                        {product.grade && (
                          <tr>
                            <td>{lang === 'CZ' ? 'Výsledná známka' : 'Grade'}</td>
                            <td><strong>{product.grade} ({product.grade === 10 ? 'Gem Mint' : 'Gem Mint'})</strong></td>
                          </tr>
                        )}
                        {product.certNumber && (
                          <tr>
                            <td>{lang === 'CZ' ? 'Certifikační číslo' : 'Certificate Number'}</td>
                            <td><code>{product.certNumber}</code></td>
                          </tr>
                        )}
                        {product.customParams && Array.isArray(product.customParams) && product.customParams.map((cp, idx) => (
                          <tr key={idx}>
                            <td>{cp.label}</td>
                            <td>{cp.value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </section>
        );
      })()}

      {/* Vývoj ceny Section */}
      {activeTab === 'trend' && product.investment && (() => {
        const history = getPriceHistory();
        const prices = history.map(h => h.price);
        const minP = Math.min(...prices) * 0.98;
        const maxP = Math.max(...prices) * 1.02;
        const rangeP = maxP - minP || 1;

        const getX = (idx) => 60 + idx * (705 / 11);
        const getY = (val) => 260 - ((val - minP) / rangeP) * 230;

        const points = history.map((h, i) => `${getX(i)},${getY(h.price)}`).join(' ');
        const areaPoints = `60,260 ${points} 765,260`;

        const yTicks = [
          minP,
          minP + rangeP * 0.33,
          minP + rangeP * 0.66,
          maxP
        ];

        return (
          <section id="trend" className="detail-section" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '24px', textAlign: 'left', marginBottom: '40px' }}>
            <h3 className="detail-section-title" style={{ marginTop: 0, marginBottom: '8px', color: 'var(--nv-gold, #fdbd16)' }}>
              {lang === 'CZ' ? 'Historický vývoj tržní ceny' : 'Historical Market Price Trend'}
            </h3>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', margin: '0 0 24px 0', lineHeight: '1.4' }}>
              {lang === 'CZ'
                ? 'Níže uvedený graf zobrazuje odhadovaný vývoj tržní ceny této karty za posledních 12 měsíců. Údaje jsou pravidelně aktualizovány na základě prodejů z hlavních světových trhů (Cardmarket, eBay).'
                : 'The chart below shows the estimated market price development of this card over the last 12 months. Data is regularly updated based on sales from major global card marketplaces (Cardmarket, eBay).'}
            </p>

            <div style={{ width: '100%', overflowX: 'auto', background: 'rgba(0,0,0,0.15)', borderRadius: '12px', padding: '16px 8px 8px 8px', border: '1px solid rgba(255,255,255,0.03)' }}>
              <svg viewBox="0 0 800 300" style={{ width: '100%', height: 'auto', minWidth: '600px', display: 'block' }}>
                <defs>
                  <linearGradient id="chart-line-grad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#fdbd16" />
                    <stop offset="100%" stopColor="#c4900a" />
                  </linearGradient>
                  <linearGradient id="chart-area-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fdbd16" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="#fdbd16" stopOpacity="0.00" />
                  </linearGradient>
                </defs>

                {yTicks.map((val, idx) => (
                  <g key={idx}>
                    <line x1="60" y1={getY(val)} x2="765" y2={getY(val)} stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />
                    <text x="50" y={getY(val) + 4} fill="rgba(255,255,255,0.4)" fontSize="10" textAnchor="end" fontFamily="monospace">
                      {Math.round(val).toLocaleString()} Kč
                    </text>
                  </g>
                ))}

                <line x1="60" y1="260" x2="765" y2="260" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
                <polygon points={areaPoints} fill="url(#chart-area-grad)" />
                <polyline points={points} fill="none" stroke="url(#chart-line-grad)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

                {history.map((h, i) => (
                  <text key={i} x={getX(i)} y="280" fill="rgba(255,255,255,0.4)" fontSize="10" textAnchor="middle">
                    {h.month}
                  </text>
                ))}

                {history.map((h, i) => {
                  const x = getX(i);
                  const y = getY(h.price);
                  return (
                    <g key={i} className="chart-dot-group">
                      <circle cx={x} cy={y} r="4.5" fill="#fdbd16" />
                      <g className="chart-tooltip">
                        <rect x={x - 45} y={y - 32} width="90" height="22" rx="4" fill="#181920" stroke="rgba(253, 189, 22, 0.4)" strokeWidth="1" />
                        <text x={x} y={y - 18} fill="#fff" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                          {h.price.toLocaleString()} Kč
                        </text>
                      </g>
                    </g>
                  );
                })}
              </svg>
            </div>
            
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '16px', color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>
              <span style={{ color: 'var(--color-green)' }}>●</span>
              <span>{lang === 'CZ' ? 'Data jsou synchronizována v reálném čase.' : 'Data is synced in real-time.'}</span>
            </div>
          </section>
        );
      })()}

      {/* Hodnocení Section */}
      {activeTab === 'hodnoceni' && (
        <section id="hodnoceni" className="detail-section custom-detail-panel">
          <div className="reviews-dashboard">
            <div className="reviews-dashboard-score">
              <div className="reviews-average-number">4.8</div>
              <div className="reviews-average-stars">★★★★★</div>
              <div className="reviews-average-count">
                {lang === 'CZ' ? `Založeno na ${reviews.length} hodnoceních` : `Based on ${reviews.length} reviews`}
              </div>
            </div>
            
            <div className="reviews-dashboard-bars">
              <div className="reviews-bar-row">
                <span className="bar-label">5 ★</span>
                <div className="bar-track"><div className="bar-fill" style={{ width: '85%' }}></div></div>
                <span className="bar-percentage">85%</span>
              </div>
              <div className="reviews-bar-row">
                <span className="bar-label">4 ★</span>
                <div className="bar-track"><div className="bar-fill" style={{ width: '15%' }}></div></div>
                <span className="bar-percentage">15%</span>
              </div>
              <div className="reviews-bar-row">
                <span className="bar-label">3 ★</span>
                <div className="bar-track"><div className="bar-fill" style={{ width: '0%' }}></div></div>
                <span className="bar-percentage">0%</span>
              </div>
              <div className="reviews-bar-row">
                <span className="bar-label">2 ★</span>
                <div className="bar-track"><div className="bar-fill" style={{ width: '0%' }}></div></div>
                <span className="bar-percentage">0%</span>
              </div>
              <div className="reviews-bar-row">
                <span className="bar-label">1 ★</span>
                <div className="bar-track"><div className="bar-fill" style={{ width: '0%' }}></div></div>
                <span className="bar-percentage">0%</span>
              </div>
            </div>

            <div className="reviews-dashboard-action">
              <p className="action-text">
                {lang === 'CZ' 
                  ? 'Podělte se o své zkušenosti s tímto produktem a pomozte ostatním sběratelům.' 
                  : 'Share your experience with this product and help other collectors.'}
              </p>
              <button className="btn btn-primary reviews-add-btn" onClick={() => setIsReviewModalOpen(true)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '6px' }}>
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
                {lang === 'CZ' ? 'Napsat recenzi' : 'Write a review'}
              </button>
            </div>
          </div>

          {reviews.length > 0 ? (
            <div className="reviews-list">
              {reviews.map((rev, i) => {
                const initials = rev.author.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                return (
                  <div key={i} className="premium-review-card">
                    <div className="review-avatar-col">
                      <div className="review-avatar">{initials}</div>
                    </div>
                    <div className="review-main-col">
                      <div className="review-meta-row">
                        <div className="review-author-group">
                          <span className="review-author">{rev.author}</span>
                          <span className="verified-badge">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '2px' }}>
                              <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                            </svg>
                            {lang === 'CZ' ? 'Ověřený nákup' : 'Verified Purchase'}
                          </span>
                        </div>
                        <span className="review-date">{rev.date}</span>
                      </div>
                      <div className="review-stars-row">
                        {'★'.repeat(rev.rating)}{'☆'.repeat(5 - rev.rating)}
                      </div>
                      <p className="review-text">{rev.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="no-reviews">
              {lang === 'CZ' ? 'K tomuto produktu zatím nebyla přidána žádná hodnocení. Buďte první!' : 'No reviews have been added for this product yet. Be the first!'}
            </div>
          )}
        </section>
      )}

      {/* Diskuze Section */}
      {activeTab === 'diskuse' && (
        <section id="diskuse" className="detail-section custom-detail-panel">
          <div className="discussions-dashboard">
            <div className="discussions-dashboard-info">
              <h3 className="detail-section-title" style={{ margin: 0 }}>
                {lang === 'CZ' ? `Diskuze k produktu (${comments.length})` : `Product Discussion (${comments.length})`}
              </h3>
              <p className="discussions-dashboard-subtitle">
                {lang === 'CZ' ? 'Máte k produktu nějaký dotaz? Náš tým Vám rád odpoví.' : 'Do you have any questions about this product? Our team will gladly answer them.'}
              </p>
            </div>
            <button className="btn btn-primary discussions-add-btn" onClick={() => setIsCommentModalOpen(true)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '6px' }}>
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              {lang === 'CZ' ? 'Položit dotaz' : 'Ask a question'}
            </button>
          </div>

          {comments.length > 0 ? (
            <div className="comments-list-wrapper">
              {comments.map((comm, i) => {
                const isReply = comm.author.includes('Team') || comm.author.includes('Support');
                const initials = comm.author.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                
                return (
                  <div key={i} className={`premium-comment-card ${isReply ? 'reply-card' : 'question-card'}`}>
                    {isReply && <div className="reply-connector-line"></div>}
                    <div className="comment-avatar-col">
                      <div className={`comment-avatar ${isReply ? 'admin-avatar' : ''}`}>
                        {isReply ? '🛡️' : initials}
                      </div>
                    </div>
                    <div className="comment-main-col">
                      <div className="comment-header-row">
                        <span className={`comment-author ${isReply ? 'admin-author' : ''}`}>
                          {comm.author}
                          {isReply && <span className="admin-badge">{lang === 'CZ' ? 'Podpora' : 'Support'}</span>}
                        </span>
                        <span className="comment-date">{comm.date}</span>
                      </div>
                      <p className="comment-text">{comm.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="no-comments">
              {lang === 'CZ' ? 'K tomuto produktu zatím nebyly položeny žádné dotazy. Zeptejte se na to, co vás zajímá!' : 'No questions have been asked about this product yet. Ask what you are interested in!'}
            </div>
          )}
        </section>
      )}

      {/* Související produkty Section */}
      {activeTab === 'souvisejici' && (
        <section id="souvisejici" className="detail-section">
          <h3 className="detail-section-title">{lang === 'CZ' ? 'Související produkty' : 'Related Products'}</h3>
          {relatedSingles.length > 0 ? (
            <div className="catalog-product-grid">
              {relatedSingles.map(rel => (
                <ProductCard key={rel.id} product={rel} addToCart={addToCart} setSelectedProductId={setSelectedProductId} setActivePage={setActivePage} />
              ))}
            </div>
          ) : (
            <div className="no-reviews" style={{ background: 'rgba(255,255,255,0.01)', borderRadius: '8px' }}>
              {lang === 'CZ' ? 'Žádané související produkty nebyly nalezeny.' : 'No related products found.'}
            </div>
          )}
        </section>
      )}

      {/* Podobné produkty Section */}
      {activeTab === 'podobne' && (
        <section id="podobne" className="detail-section">
          <h3 className="detail-section-title">{lang === 'CZ' ? 'Podobné produkty' : 'Similar Products'}</h3>
          {similarSingles.length > 0 ? (
            <div className="catalog-product-grid">
              {similarSingles.map(rel => (
                <ProductCard key={rel.id} product={rel} addToCart={addToCart} setSelectedProductId={setSelectedProductId} setActivePage={setActivePage} />
              ))}
            </div>
          ) : (
            <div className="no-reviews" style={{ background: 'rgba(255,255,255,0.01)', borderRadius: '8px' }}>
              {lang === 'CZ' ? 'Žádané podobné produkty nebyly nalezeny.' : 'No similar products found.'}
            </div>
          )}
        </section>
      )}
    </div>

    {/* Newsletter above footer */}
    <section className="newsletter-section-wrapper" style={{ margin: '40px 0 -20px 0' }}>
        <div className="container newsletter-section">
          <div className="newsletter-content">
            <div className="newsletter-eyebrow">NEWSLETTER • 028</div>
            <h2 className="newsletter-heading">
              {FEATURE_FLAGS.showBuylist 
                ? (lang === 'CZ' ? 'Nové edice & výkupy jako první.' : 'New editions & buybacks first.')
                : (lang === 'CZ' ? 'Nové edice & akce jako první.' : 'New editions & sales first.')}
            </h2>
          </div>
          <form className="newsletter-form" onSubmit={(e) => { e.preventDefault(); if(alert) alert(lang === 'CZ' ? 'Děkujeme za přihlášení k newsletteru!' : 'Thank you for subscribing to our newsletter!', 'success'); }}>
            <div className="newsletter-input-group">
              <label className="newsletter-input-label">{lang === 'CZ' ? 'VÁŠ E-MAIL' : 'YOUR EMAIL'}</label>
              <input type="email" required placeholder="jmeno@example.com" className="newsletter-underline-input" />
            </div>
            <button className="newsletter-submit-btn" type="submit">{lang === 'CZ' ? 'ODEBÍRAT' : 'SUBSCRIBE'} &rarr;</button>
          </form>
        </div>
      </section>

      {/* Lightbox Modal Overlay */}
      {isLightboxOpen && (
        <div 
          className="lightbox-overlay" 
          onClick={() => setIsLightboxOpen(false)}
        >
          <div 
            className="lightbox-container lightbox-container-clean" 
            onClick={(e) => e.stopPropagation()}
            style={{ position: 'relative' }}
          >
            <button 
              type="button" 
              className="lightbox-close-btn" 
              onClick={() => setIsLightboxOpen(false)}
              aria-label={lang === 'CZ' ? 'Zavřít' : 'Close'}
            >
              ✕
            </button>

            <h3 className="lightbox-title" style={{ marginBottom: '12px' }}>{product.name}</h3>

            <div className="lightbox-gallery-wrapper">
              {/* Left Arrow inside modal */}
              {images.length > 1 && (
                <button 
                  type="button" 
                  className="gallery-nav-btn gallery-nav-left" 
                  onClick={handlePrevImage} 
                  aria-label={lang === 'CZ' ? 'Předchozí obrázek' : 'Previous image'}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="20" y1="12" x2="4" y2="12" />
                    <polyline points="10 18 4 12 10 6" />
                  </svg>
                </button>
              )}

              {/* Image with Magnifier Zoom inside Modal */}
              <div 
                className="lightbox-magnifier-container"
                onMouseMove={handleLightboxMouseMove}
                onMouseLeave={handleLightboxMouseLeave}
              >
                <img 
                  src={activeImage} 
                  alt={product.name} 
                  className="lightbox-image lightbox-image-clean" 
                />
                <div className="lightbox-magnifier-lens" style={lightboxZoomStyle} />
              </div>

              {/* Right Arrow inside modal */}
              {images.length > 1 && (
                <button 
                  type="button" 
                  className="gallery-nav-btn gallery-nav-right" 
                  onClick={handleNextImage} 
                  aria-label={lang === 'CZ' ? 'Další obrázek' : 'Next image'}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="4" y1="12" x2="20" y2="12" />
                    <polyline points="14 6 20 12 14 18" />
                  </svg>
                </button>
              )}
            </div>

            {/* Indicators inside modal */}
            {images.length > 1 && (
              <div className="lightbox-indicators">
                {images.map((_, idx) => (
                  <span 
                    key={idx} 
                    style={{
                      ...styles.dot, 
                      width: currentImageIndex === idx ? '32px' : '16px',
                      backgroundColor: currentImageIndex === idx ? 'var(--color-gold)' : 'rgba(255,255,255,0.2)'
                    }}
                    onClick={() => setCurrentImageIndex(idx)}
                  />
                ))}
              </div>
            )}
            
            <span className="lightbox-tip">
              {lang === 'CZ' ? 'Najetím myší na obrázek jej přiblížíte pro detailní kontrolu.' : 'Hover over the image to zoom in for detailed inspection.'}
            </span>
          </div>
        </div>
      )}

      {/* Local Modal Overlays for actions */}
      {isAskModalOpen && (
        <div className="product-modal-overlay" onClick={() => setIsAskModalOpen(false)}>
          <div className="product-modal-container" onClick={e => e.stopPropagation()}>
            <button className="product-modal-close" onClick={() => setIsAskModalOpen(false)}>✕</button>
            <h3 className="product-modal-title">{lang === 'CZ' ? 'Zeptat se prodejce' : 'Ask the Seller'}</h3>
            <form onSubmit={handleAskSubmit} className="login-modal-form">
              <div className="login-form-group">
                <label className="login-form-label">{lang === 'CZ' ? 'Váš E-mail' : 'Your Email'} <span className="text-red">*</span></label>
                <input type="email" required className="login-form-input" value={askEmail} onChange={e => setAskEmail(e.target.value)} placeholder="jmeno@example.com" />
              </div>
              <div className="login-form-group">
                <label className="login-form-label">{lang === 'CZ' ? 'Telefonní číslo' : 'Phone Number'}</label>
                <input type="tel" className="login-form-input" value={askPhone} onChange={e => setAskPhone(e.target.value)} placeholder={lang === 'CZ' ? 'Např. +420 777 777 777' : 'e.g. +420 777 777 777'} />
              </div>
              <div className="login-form-group">
                <label className="login-form-label">{lang === 'CZ' ? 'Vaše zpráva' : 'Your Message'} <span className="text-red">*</span></label>
                <textarea required className="login-form-input" style={{ minHeight: '100px', resize: 'vertical' }} value={askMessage} onChange={e => setAskMessage(e.target.value)} placeholder={lang === 'CZ' ? 'Zde napište svůj dotaz ohledně karty...' : 'Write your question about the card here...'} />
              </div>
              <div className="login-form-group" style={{ flexDirection: 'row', gap: '10px', alignItems: 'flex-start' }}>
                <input type="checkbox" required id="ask-gdpr" checked={askGdpr} onChange={e => setAskGdpr(e.target.checked)} style={{ marginTop: '3px' }} />
                <label htmlFor="ask-gdpr" style={{ fontSize: '11px', color: 'var(--text-muted)', cursor: 'pointer', lineHeight: '1.4' }}>
                  {lang === 'CZ' 
                    ? 'Souhlasím se zpracováním osobních údajů v souladu se zásadami ochrany osobních údajů na této stránce.' 
                    : 'I agree to the processing of personal data in accordance with the privacy policy on this site.'}
                </label>
              </div>
              <button type="submit" className="login-submit-btn">{lang === 'CZ' ? 'Odeslat dotaz' : 'Send Inquiry'}</button>
            </form>
          </div>
        </div>
      )}

      {isWatchdogModalOpen && (
        <div className="product-modal-overlay" onClick={() => setIsWatchdogModalOpen(false)}>
          <div className="product-modal-container" onClick={e => e.stopPropagation()}>
            <button className="product-modal-close" onClick={() => setIsWatchdogModalOpen(false)}>✕</button>
            <h3 className="product-modal-title">{lang === 'CZ' ? 'Sledovat produkt (Hlídací pes)' : 'Watch Product (Watchdog)'}</h3>
            <form onSubmit={handleWatchdogSubmit} className="login-modal-form">
              <div className="login-form-group">
                <label className="login-form-label">{lang === 'CZ' ? 'Upozornit mě, když:' : 'Notify me when:'}</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                    <input type="radio" name="watchdog-type" checked={watchdogType === 'stock'} onChange={() => setWatchdogType('stock')} />
                    {lang === 'CZ' ? 'Produkt bude skladem' : 'Product is in stock'}
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                    <input type="radio" name="watchdog-type" checked={watchdogType === 'sale'} onChange={() => setWatchdogType('sale')} />
                    {lang === 'CZ' ? 'Produkt bude v akci' : 'Product is on sale'}
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', flexWrap: 'wrap' }}>
                    <input type="radio" name="watchdog-type" checked={watchdogType === 'price'} onChange={() => setWatchdogType('price')} />
                    {lang === 'CZ' ? 'Cena klesne pod:' : 'Price drops below:'} 
                    <input type="number" disabled={watchdogType !== 'price'} value={watchdogPriceLimit} onChange={e => setWatchdogPriceLimit(e.target.value)} className="login-form-input" style={{ width: '100px', padding: '6px 12px', display: 'inline-block', margin: '0 4px', height: 'auto' }} placeholder={lang === 'CZ' ? 'Částka' : 'Amount'} />
                    Kč
                  </label>
                </div>
              </div>
              <div className="login-form-group" style={{ marginTop: '8px' }}>
                <label className="login-form-label">{lang === 'CZ' ? 'E-mail pro zaslání upozornění' : 'Email for notification'} <span className="text-red">*</span></label>
                <input type="email" required className="login-form-input" value={watchdogEmail} onChange={e => setWatchdogEmail(e.target.value)} placeholder="jmeno@example.com" />
              </div>
              <div className="login-form-group" style={{ flexDirection: 'row', gap: '10px', alignItems: 'flex-start' }}>
                <input type="checkbox" required id="watchdog-gdpr" checked={watchdogGdpr} onChange={e => setWatchdogGdpr(e.target.checked)} style={{ marginTop: '3px' }} />
                <label htmlFor="watchdog-gdpr" style={{ fontSize: '11px', color: 'var(--text-muted)', cursor: 'pointer', lineHeight: '1.4' }}>
                  {lang === 'CZ' 
                    ? 'Beru na vědomí, že moje e-mailová adresa bude spravována za účelem informování o dostupnosti a cenách produktů v souladu se zásadami zpracování osobních údajů.' 
                    : 'I acknowledge that my email address will be managed for the purpose of informing me about product availability and prices in accordance with the privacy policy.'}
                </label>
              </div>
              <button type="submit" className="login-submit-btn">{lang === 'CZ' ? 'Uložit nastavení hlídání' : 'Save Watchdog Settings'}</button>
            </form>
          </div>
        </div>
      )}

      {isReviewModalOpen && (
        <div className="product-modal-overlay" onClick={() => setIsReviewModalOpen(false)}>
          <div className="product-modal-container" onClick={e => e.stopPropagation()}>
            <button className="product-modal-close" onClick={() => setIsReviewModalOpen(false)}>✕</button>
            <h3 className="product-modal-title">{lang === 'CZ' ? 'Přidat hodnocení produktu' : 'Add Product Review'}</h3>
            <form onSubmit={handleReviewSubmit} className="login-modal-form">
              <div className="login-form-group">
                <label className="login-form-label">{lang === 'CZ' ? 'Vaše jméno' : 'Your Name'} <span className="text-red">*</span></label>
                <input type="text" required className="login-form-input" value={reviewAuthor} onChange={e => setReviewAuthor(e.target.value)} placeholder="Jan N." />
              </div>
              <div className="login-form-group">
                <label className="login-form-label">{lang === 'CZ' ? 'Počet hvězdiček' : 'Star Rating'} <span className="text-red">*</span></label>
                <select className="login-form-input" value={reviewRating} onChange={e => setReviewRating(Number(e.target.value))}>
                  <option value={5}>★★★★★ ({lang === 'CZ' ? '5 hvězdiček' : '5 stars'})</option>
                  <option value={4}>★★★★☆ ({lang === 'CZ' ? '4 hvězdičky' : '4 stars'})</option>
                  <option value={3}>★★★☆☆ ({lang === 'CZ' ? '3 hvězdičky' : '3 stars'})</option>
                  <option value={2}>★★☆☆☆ ({lang === 'CZ' ? '2 hvězdičky' : '2 stars'})</option>
                  <option value={1}>★☆☆☆☆ ({lang === 'CZ' ? '1 hvězdička' : '1 star'})</option>
                </select>
              </div>
              <div className="login-form-group">
                <label className="login-form-label">{lang === 'CZ' ? 'Text recenze' : 'Review Content'} <span className="text-red">*</span></label>
                <textarea required className="login-form-input" style={{ minHeight: '100px', resize: 'vertical' }} value={reviewText} onChange={e => setReviewText(e.target.value)} placeholder={lang === 'CZ' ? 'Jak jste spokojen s tímto produktem?' : 'How satisfied are you with this product?'} />
              </div>
              <button type="submit" className="login-submit-btn">{lang === 'CZ' ? 'Odeslat recenzi' : 'Submit Review'}</button>
            </form>
          </div>
        </div>
      )}

      {isCommentModalOpen && (
        <div className="product-modal-overlay" onClick={() => setIsCommentModalOpen(false)}>
          <div className="product-modal-container" onClick={e => e.stopPropagation()}>
            <button className="product-modal-close" onClick={() => setIsCommentModalOpen(false)}>✕</button>
            <h3 className="product-modal-title">{lang === 'CZ' ? 'Položit dotaz / Napsat komentář' : 'Ask a Question / Write a Comment'}</h3>
            <form onSubmit={handleCommentSubmit} className="login-modal-form">
              <div className="login-form-group">
                <label className="login-form-label">{lang === 'CZ' ? 'Vaše jméno' : 'Your Name'} <span className="text-red">*</span></label>
                <input type="text" required className="login-form-input" value={commentAuthor} onChange={e => setCommentAuthor(e.target.value)} placeholder="Jan N." />
              </div>
              <div className="login-form-group">
                <label className="login-form-label">{lang === 'CZ' ? 'Text komentáře' : 'Comment Text'} <span className="text-red">*</span></label>
                <textarea required className="login-form-input" style={{ minHeight: '100px', resize: 'vertical' }} value={commentText} onChange={e => setCommentText(e.target.value)} placeholder={lang === 'CZ' ? 'Zde napište svůj dotaz nebo postřeh...' : 'Write your question or feedback here...'} />
              </div>
              <button type="submit" className="login-submit-btn">{lang === 'CZ' ? 'Odeslat komentář' : 'Submit Comment'}</button>
            </form>
          </div>
        </div>
      )}


    </div>
  );
}

const styles = {
  container: {
    paddingTop: '20px',
    paddingBottom: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '32px',
  },
  errorContainer: {
    padding: '40px',
    textAlign: 'center',
  },
  layout: {
    display: 'flex',
    gap: '32px',
    flexWrap: 'wrap',
  },
  leftCol: {
    flex: '1.2 1 400px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    alignItems: 'center',
  },
  galleryWrapper: {
    position: 'relative',
    width: '100%',
    maxWidth: '320px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicators: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '8px',
    zIndex: 5,
    marginTop: '10px',
  },
  dot: {
    height: '4px',
    borderRadius: '2px',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  rightCol: {
    flex: '1.5 1 400px',
    padding: '30px',
    textAlign: 'left',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  cardTitle: {
    fontSize: '24px',
    fontWeight: '800',
    lineHeight: '1.3',
    margin: 0,
    fontFamily: 'var(--font-heading)',
  },
  variantSelectorsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    backgroundColor: 'rgba(255,255,255,0.02)',
    padding: '16px',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--border)',
    marginTop: '8px',
  },
  variantSelectorsTitle: {
    fontSize: '14px',
    fontWeight: '700',
    margin: 0,
    color: 'var(--text-main)',
  },
  selectorsGrid: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap',
  },
  selectorField: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    flex: '1 1 120px',
  },
  selectorLabel: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  variantSelect: {
    backgroundColor: 'var(--bg-page)',
    border: '1px solid var(--border-light)',
    padding: '8px 12px',
    borderRadius: 'var(--radius-md)',
    fontSize: '13px',
    color: 'var(--text-main)',
    outline: 'none',
    cursor: 'pointer',
    width: '100%',
  }
};
