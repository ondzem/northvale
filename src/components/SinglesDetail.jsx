import { useState } from 'react';
import { FEATURE_FLAGS } from '../config';
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

export default function SinglesDetail({ productId, products, addToCart, setSelectedProductId, setActivePage, setFilters, alert }) {
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
        <h3>Karta nebyla nalezena</h3>
        <button className="btn btn-primary" onClick={() => { if (setFilters) setFilters({}); setActivePage('singles-catalog'); }}>
          Zpět do katalogu
        </button>
      </div>
    );
  }

  // Treat Singles as a single entity mapping to the first variant or defaults
  const activeVariant = product.variants && product.variants.length > 0 
    ? product.variants[0] 
    : { id: product.id, price: product.price || 0, stock: product.stock || 0, condition: 'NM', lang: 'EN', foil: true };

  const price = activeVariant.price;
  const stock = activeVariant.stock;
  const condition = activeVariant.condition;
  const lang = activeVariant.lang;
  const foil = activeVariant.foil;

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
  const getCardCode = (prod) => {
    const match = prod.name.match(/(\d+\/\d+)/);
    if (match) return match[1];
    if (prod.id.includes('charizard')) return 'SV3-223';
    if (prod.id.includes('pikachu')) return 'SWSH4-188';
    if (prod.id.includes('umbreon')) return 'SWSH7-215';
    if (prod.id.includes('giratina')) return 'SWSH11-186';
    if (prod.id.includes('rayquaza')) return 'SWSH7-218';
    return 'SV3-139';
  };

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
      alert('Váš dotaz byl úspěšně odeslán prodejci. Brzy se vám ozveme.', 'success');
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
      alert('Hlídací pes byl nastaven. Budete upozorněni e-mailem.', 'success');
    }
    setWatchdogPriceLimit('');
    setWatchdogEmail('');
    setWatchdogGdpr(false);
    setIsWatchdogModalOpen(false);
  };

  const handleShareClick = () => {
    navigator.clipboard.writeText(window.location.href);
    if (alert) {
      alert('Odkaz na tuto kartu byl zkopírován do schránky.', 'success');
    }
  };

  const handleReviewSubmit = (e) => {
    e.preventDefault();
    const dateStr = new Date().toLocaleDateString('cs-CZ');
    const newRev = {
      author: reviewAuthor,
      rating: reviewRating,
      date: dateStr,
      text: reviewText
    };
    setReviews([newRev, ...reviews]);
    if (alert) {
      alert('Děkujeme! Vaše hodnocení bylo úspěšně přidáno.', 'success');
    }
    setReviewAuthor('');
    setReviewRating(5);
    setReviewText('');
    setIsReviewModalOpen(false);
    scrollToSection('hodnoceni');
  };

  const handleCommentSubmit = (e) => {
    e.preventDefault();
    const dateStr = new Date().toLocaleDateString('cs-CZ');
    const newComm = {
      author: commentAuthor,
      date: dateStr,
      text: commentText
    };
    setComments([...comments, newComm]);
    if (alert) {
      alert('Komentář byl úspěšně přidán do diskuze.', 'success');
    }
    setCommentAuthor('');
    setCommentText('');
    setIsCommentModalOpen(false);
    scrollToSection('diskuse');
  };

  return (
    <div style={styles.container} className="fade-in">
      <h1 className="sr-only">{product.name} - Detail karty - NORTHVALE</h1>

      {/* Breadcrumbs Navigation */}
      <div className="container">
        <nav className="breadcrumbs-nav">
        <span className="breadcrumb-item" onClick={() => { setActivePage('home'); }}>
          Domů
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
              <button type="button" className="gallery-nav-btn gallery-nav-left" onClick={handlePrevImage} aria-label="Předchozí obrázek">
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
              <button type="button" className="gallery-nav-btn gallery-nav-right" onClick={handleNextImage} aria-label="Další obrázek">
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
              ({reviews.length} hodnocení)
            </span>
          </div>

          {/* Short description with more info link */}
          <p className="product-short-desc">
            {product.desc.split('.').slice(0, 2).filter(Boolean).join('. ') + '.'}
            <span className="more-info-link" onClick={() => scrollToSection('popis')}>
              Víc informací
            </span>
          </p>

          <hr className="product-detail-divider" />

          <div className="product-price-purchase-box">
            <div className="price-stock-delivery-group">
              {/* Price displaying */}
              <div className="product-price-section">
                <div className="product-price-vat">
                  {price.toLocaleString('cs-CZ')} Kč
                </div>
                <div className="product-price-ex-vat">
                  Bez DPH: {Math.round(price / 1.21).toLocaleString('cs-CZ')} Kč
                </div>
              </div>

              {/* Stock status */}
              <div className="product-stock-delivery-wrapper">
                <div className={`product-stock-status ${stock > 0 ? 'in-stock' : 'out-of-stock'}`}>
                  <span style={{ fontSize: '20px', lineHeight: 1 }}>●</span>
                  {stock > 0 ? `Skladem (${stock} ks)` : 'Na objednávku'}
                </div>
                <span className="product-delivery-link" onClick={() => setActivePage('community')}>
                  Možnosti doručení
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
                  disabled={stock === 0}
                  onClick={() => addToCart(activeVariant, product, qty)}
                >
                  Do košíku
                </button>
              </div>

              {/* Actions Buttons Grid */}
              <div className="product-actions-grid">
                <button className="product-action-btn" onClick={handleFavoriteClick} title="Oblíbené" aria-label="Oblíbené">
                  <svg viewBox="0 0 24 24" fill={isFavorite ? 'var(--color-gold)' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                  <span>Oblíbené</span>
                </button>
                <button className="product-action-btn" onClick={() => setIsAskModalOpen(true)} title="Zeptat se" aria-label="Zeptat se">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  <span>Zeptat se</span>
                </button>
                <button className="product-action-btn" onClick={() => setIsWatchdogModalOpen(true)} title="Upozornění" aria-label="Upozornění">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                  <span>Upozornění</span>
                </button>
                <button className="product-action-btn" onClick={handleShareClick} title="Sdílet" aria-label="Sdílet">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="18" cy="5" r="3" />
                    <circle cx="6" cy="12" r="3" />
                    <circle cx="18" cy="19" r="3" />
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                  </svg>
                  <span>Sdílet</span>
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
                <h4 className="detail-badge-title">Doprava zdarma</h4>
                <p className="detail-badge-desc">nad 1 000 Kč</p>
              </div>
            </div>
            <div className="detail-trust-badge">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="detail-badge-icon-svg">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
                <line x1="12" y1="2" x2="12" y2="4" />
              </svg>
              <div className="detail-badge-text">
                <h4 className="detail-badge-title">Rychlost</h4>
                <p className="detail-badge-desc">Odesíláme do 24h</p>
              </div>
            </div>
            <div className="detail-trust-badge">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="detail-badge-icon-svg">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <polyline points="9 11 11 13 15 9" />
              </svg>
              <div className="detail-badge-text">
                <h4 className="detail-badge-title">100% Originál</h4>
                <p className="detail-badge-desc">Od distributorů</p>
              </div>
            </div>
            <div className="detail-trust-badge">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="detail-badge-icon-svg">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                <line x1="1" y1="10" x2="23" y2="10" />
              </svg>
              <div className="detail-badge-text">
                <h4 className="detail-badge-title">Bezpečná platba</h4>
                <p className="detail-badge-desc">Karta, bankovní převod</p>
              </div>
            </div>
          </div>

          {/* Product Code and Brand Specs */}
          <div className="product-meta-specs">
            <div className="product-meta-item">
              Kód produktu: <strong>{getCardCode(product)}</strong>
            </div>
            <div className="product-meta-item">
              Značka: <strong>{product.game}</strong>
            </div>
          </div>
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
            <span>Popis a parametry</span>
          </button>
          <button 
            className={`product-tab-btn ${activeTab === 'hodnoceni' ? 'active' : ''}`} 
            onClick={() => scrollToSection('hodnoceni')}
          >
            <svg className="tab-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <span>Hodnocení</span>
          </button>
          <button 
            className={`product-tab-btn ${activeTab === 'diskuse' ? 'active' : ''}`} 
            onClick={() => scrollToSection('diskuse')}
          >
            <svg className="tab-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 8h2a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-2v4l-4-4H9a1.9 1.9 0 0 1-2-2" />
              <path d="M3 14V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-4 4v-4H3z" />
            </svg>
            <span>Diskuze</span>
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
            <span>Související produkty</span>
          </button>
          <button 
            className={`product-tab-btn ${activeTab === 'podobne' ? 'active' : ''}`} 
            onClick={() => scrollToSection('podobne')}
          >
            <svg className="tab-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            <span>Podobné produkty</span>
          </button>
        </div>
      </div>

    <div className="container">
      {/* Popis Section */}
      {activeTab === 'popis' && (() => {
        const isSlab = product.type === 'slab';
        
        // Helper formatting
        const foilText = foil ? 'Foil' : 'Non-Foil';
        const foilLongText = foil ? 'Foil (Třpytivá) ✨' : 'Non-Foil (Matná)';
        const langText = lang === 'JP' ? 'Japonština 🇯🇵' : lang === 'CN' ? 'Čínština 🇨🇳' : 'Angličtina 🇬🇧';
        const conditionFull = condition === 'NM' ? 'Near Mint (NM)' : condition === 'EX' ? 'Excellent (EX)' : condition === 'GD' ? 'Good (GD)' : condition === 'LP' ? 'Light Played (LP)' : condition === 'PL' ? 'Played (PL)' : 'Poor (PO)';
        
        // Mocked details based on card id
        const yearReleased = product.id.includes('charizard') ? 2023 : product.id.includes('pikachu') ? 2020 : product.id.includes('umbreon') ? 2021 : product.id.includes('giratina') ? 2022 : product.id.includes('rayquaza') ? 2021 : 2024;
        const setCode = product.id.includes('charizard') ? 'OBF' : product.id.includes('pikachu') ? 'VIV' : product.id.includes('umbreon') ? 'EVS' : product.id.includes('giratina') ? 'LOR' : product.id.includes('rayquaza') ? 'EVS' : 'LRC';
        const elementColor = product.game === 'Pokémon' ? (product.id.includes('charizard') ? 'Fire' : product.id.includes('pikachu') ? 'Lightning' : product.id.includes('umbreon') ? 'Darkness' : product.id.includes('giratina') ? 'Psychic' : product.id.includes('rayquaza') ? 'Dragon' : 'Grass') : (product.game === 'Lorcana' ? 'Amethyst' : 'Purple');
        const stageLevel = product.id.includes('vmax') ? 'VMAX' : product.id.includes('ex') ? 'ex' : 'Basic';
        const illustrator = product.id.includes('charizard') ? 'Mitsuhiro Arita' : product.id.includes('pikachu') ? 'Kiyotaka Oshiyama' : 'Teeziro';

        return (
          <section id="popis" className="detail-section">
            <div className="tab-popis-layout">
              <div className="tab-popis-left-col">
                <div className="detail-desc-block">
                  <h3 className="detail-section-title" style={{ marginTop: 0 }}>Popis produktu</h3>
                  <div className="tab-popis-text">
                    <p style={{ margin: 0 }}>{product.desc}</p>
                  </div>
                </div>

                <div className="detail-desc-media-block">
                  <img 
                    src={getGameImage(product)} 
                    alt={product.game || 'Detail karty'} 
                    className="detail-desc-image" 
                  />
                </div>

                <div className="detail-desc-block">
                  {!isSlab ? (
                    <div className="detail-desc-features">
                      <h4 className="detail-features-subtitle">Přednosti karty a standard doručení</h4>
                      <p style={{ lineHeight: '1.7', fontSize: '14.5px', color: 'rgba(255, 255, 255, 0.85)', margin: '0 0 16px 0' }}>
                        Originální karta <strong>{product.name}</strong> ze sady <strong>{product.edition}</strong> v provedení <strong>{foilText}</strong>. Karta pochází z oficiální distribuce a je skladována v ideálních podmínkách.
                      </p>
                      <ul className="detail-desc-list">
                        <li><strong style={{ color: 'var(--text-main)' }}>Stav karty:</strong> Karta je v našem skladu pečlivě uchovávána a odpovídá stavu <strong>{conditionFull}</strong>.</li>
                        <li><strong style={{ color: 'var(--text-main)' }}>Bezpečné doručení:</strong> Kartu Vám odešleme v penny sleeve obalu hlavou dolů, pevném toploaderu s vytahovacím poutkem a zajistíme ji mezi dva silné kartony papírovou malířskou páskou. Žádné zbytky lepidla na plastech.</li>
                      </ul>
                    </div>
                  ) : (
                    <div className="detail-desc-features">
                      <h4 className="detail-features-subtitle">Certifikace a ochrana investiční karty</h4>
                      <p style={{ lineHeight: '1.7', fontSize: '14.5px', color: 'rgba(255, 255, 255, 0.85)', margin: '0 0 16px 0' }}>
                        Investiční a sběratelská karta <strong>{product.name}</strong> ze sady <strong>{product.edition}</strong> ohodnocená prestižní společností <strong>{product.company}</strong> s výslednou známkou <strong>{product.grade}</strong>.
                      </p>
                      <ul className="detail-desc-list">
                        <li><strong style={{ color: 'var(--text-main)' }}>Certifikace:</strong> Pravost a kvalitu této karty si můžete ověřit v oficiálním registru pod číslem <strong>{product.certNumber}</strong>.</li>
                        <li><strong style={{ color: 'var(--text-main)' }}>Ochrana:</strong> Plastové pouzdro (slab) chrání kartu před prachem, vlhkostí a mechanickým poškozením. Zásilku balíme do silné vrstvy bublinkové fólie a pevné kartonové krabice.</li>
                      </ul>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="tab-popis-right-col">
                <div className="custom-detail-panel" style={{ padding: '32px', width: '100%', boxSizing: 'border-box' }}>
                  <h3 className="detail-section-title" style={{ marginTop: 0 }}>Parametry karty</h3>
                  {!isSlab ? (
                    <table className="tab-popis-specs-table">
                      <tbody>
                        <tr>
                          <td>Značka / Hra</td>
                          <td>{product.game}</td>
                        </tr>
                        <tr>
                          <td>Edice / Sada</td>
                          <td>{product.edition}</td>
                        </tr>
                        <tr>
                          <td>Zkratka edice</td>
                          <td>{setCode}</td>
                        </tr>
                        {product.rarity && (
                          <tr>
                            <td>Rarita</td>
                            <td>{product.rarity}</td>
                          </tr>
                        )}
                        <tr>
                          <td>Číslo karty</td>
                          <td>{getCardCode(product)}</td>
                        </tr>
                        <tr>
                          <td>Stav karty</td>
                          <td>{conditionFull}</td>
                        </tr>
                        <tr>
                          <td>Jazyk</td>
                          <td>{langText}</td>
                        </tr>
                        <tr>
                          <td>Provedení (Finish)</td>
                          <td>{foilLongText}</td>
                        </tr>
                        <tr>
                          <td>Typ / Element</td>
                          <td>{elementColor}</td>
                        </tr>
                        {product.game === 'Pokémon' && (
                          <tr>
                            <td>Stádium vývoje</td>
                            <td>{stageLevel}</td>
                          </tr>
                        )}
                        <tr>
                          <td>Ilustrátor</td>
                          <td>{illustrator}</td>
                        </tr>
                        <tr>
                          <td>Rok vydání</td>
                          <td>{yearReleased}</td>
                        </tr>
                      </tbody>
                    </table>
                  ) : (
                    <table className="tab-popis-specs-table">
                      <tbody>
                        <tr>
                          <td>Značka / Hra</td>
                          <td>{product.game}</td>
                        </tr>
                        <tr>
                          <td>Edice / Sada</td>
                          <td>{product.edition}</td>
                        </tr>
                        {product.rarity && (
                          <tr>
                            <td>Rarita</td>
                            <td>{product.rarity}</td>
                          </tr>
                        )}
                        <tr>
                          <td>Jazyk</td>
                          <td>{langText}</td>
                        </tr>
                        <tr>
                          <td>Gradingová firma</td>
                          <td><strong>{product.company}</strong></td>
                        </tr>
                        <tr>
                          <td>Výsledná známka</td>
                          <td><strong>{product.grade} ({product.grade === 10 ? 'Gem Mint' : 'Gem Mint'})</strong></td>
                        </tr>
                        <tr>
                          <td>Certifikační číslo</td>
                          <td><code>{product.certNumber}</code></td>
                        </tr>
                        {product.company === 'Beckett' && (
                          <>
                            <tr>
                              <td>Centering (Vycentrování)</td>
                              <td>9.5</td>
                            </tr>
                            <tr>
                              <td>Corners (Rohy)</td>
                              <td>9.5</td>
                            </tr>
                            <tr>
                              <td>Edges (Hrany)</td>
                              <td>9.5</td>
                            </tr>
                            <tr>
                              <td>Surface (Povrch)</td>
                              <td>10</td>
                            </tr>
                          </>
                        )}
                        <tr>
                          <td>Certifikovaný podpis</td>
                          <td>Ne</td>
                        </tr>
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
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
              <div className="reviews-average-count">Založeno na {reviews.length} hodnoceních</div>
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
              <p className="action-text">Podělte se o své zkušenosti s tímto produktem a pomozte ostatním sběratelům.</p>
              <button className="btn btn-primary reviews-add-btn" onClick={() => setIsReviewModalOpen(true)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '6px' }}>
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
                Napsat recenzi
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
                            Ověřený nákup
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
            <div className="no-reviews">K tomuto produktu zatím nebyla přidána žádná hodnocení. Buďte první!</div>
          )}
        </section>
      )}

      {/* Diskuze Section */}
      {activeTab === 'diskuse' && (
        <section id="diskuse" className="detail-section custom-detail-panel">
          <div className="discussions-dashboard">
            <div className="discussions-dashboard-info">
              <h3 className="detail-section-title" style={{ margin: 0 }}>Diskuze k produktu ({comments.length})</h3>
              <p className="discussions-dashboard-subtitle">Máte k produktu nějaký dotaz? Náš tým vám rád odpoví.</p>
            </div>
            <button className="btn btn-primary discussions-add-btn" onClick={() => setIsCommentModalOpen(true)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '6px' }}>
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              Položit dotaz
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
                          {isReply && <span className="admin-badge">Podpora</span>}
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
            <div className="no-comments">K tomuto produktu zatím nebyly položeny žádné dotazy. Zeptejte se na to, co vás zajímá!</div>
          )}
        </section>
      )}

      {/* Související produkty Section */}
      {activeTab === 'souvisejici' && (
        <section id="souvisejici" className="detail-section">
          <h3 className="detail-section-title">Související produkty</h3>
          {relatedSingles.length > 0 ? (
            <div className="catalog-product-grid">
              {relatedSingles.map(rel => (
                <ProductCard key={rel.id} product={rel} addToCart={addToCart} setSelectedProductId={setSelectedProductId} setActivePage={setActivePage} />
              ))}
            </div>
          ) : (
            <div className="no-reviews" style={{ background: 'rgba(255,255,255,0.01)', borderRadius: '8px' }}>Žádané související produkty nebyly nalezeny.</div>
          )}
        </section>
      )}

      {/* Podobné produkty Section */}
      {activeTab === 'podobne' && (
        <section id="podobne" className="detail-section">
          <h3 className="detail-section-title">Podobné produkty</h3>
          {similarSingles.length > 0 ? (
            <div className="catalog-product-grid">
              {similarSingles.map(rel => (
                <ProductCard key={rel.id} product={rel} addToCart={addToCart} setSelectedProductId={setSelectedProductId} setActivePage={setActivePage} />
              ))}
            </div>
          ) : (
            <div className="no-reviews" style={{ background: 'rgba(255,255,255,0.01)', borderRadius: '8px' }}>Žádané podobné produkty nebyly nalezeny.</div>
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
              {FEATURE_FLAGS.showBuylist ? 'Nové edice & výkupy jako první.' : 'Nové edice & akce jako první.'}
            </h2>
          </div>
          <form className="newsletter-form" onSubmit={(e) => { e.preventDefault(); if(alert) alert('Děkujeme za přihlášení k newsletteru!', 'success'); }}>
            <div className="newsletter-input-group">
              <label className="newsletter-input-label">VÁŠ E-MAIL</label>
              <input type="email" required placeholder="jmeno@example.com" className="newsletter-underline-input" />
            </div>
            <button className="newsletter-submit-btn" type="submit">ODEBÍRAT &rarr;</button>
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
              aria-label="Zavřít"
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
                  aria-label="Předchozí obrázek"
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
                  aria-label="Další obrázek"
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
            
            <span className="lightbox-tip">Najetím myší na obrázek jej přiblížíte pro detailní kontrolu.</span>
          </div>
        </div>
      )}

      {/* Local Modal Overlays for actions */}
      {isAskModalOpen && (
        <div className="product-modal-overlay" onClick={() => setIsAskModalOpen(false)}>
          <div className="product-modal-container" onClick={e => e.stopPropagation()}>
            <button className="product-modal-close" onClick={() => setIsAskModalOpen(false)}>✕</button>
            <h3 className="product-modal-title">Zeptat se prodejce</h3>
            <form onSubmit={handleAskSubmit} className="login-modal-form">
              <div className="login-form-group">
                <label className="login-form-label">Váš E-mail <span className="text-red">*</span></label>
                <input type="email" required className="login-form-input" value={askEmail} onChange={e => setAskEmail(e.target.value)} placeholder="jmeno@example.com" />
              </div>
              <div className="login-form-group">
                <label className="login-form-label">Telefonní číslo</label>
                <input type="tel" className="login-form-input" value={askPhone} onChange={e => setAskPhone(e.target.value)} placeholder="Např. +420 777 777 777" />
              </div>
              <div className="login-form-group">
                <label className="login-form-label">Vaše zpráva <span className="text-red">*</span></label>
                <textarea required className="login-form-input" style={{ minHeight: '100px', resize: 'vertical' }} value={askMessage} onChange={e => setAskMessage(e.target.value)} placeholder="Zde napište svůj dotaz ohledně karty..." />
              </div>
              <div className="login-form-group" style={{ flexDirection: 'row', gap: '10px', alignItems: 'flex-start' }}>
                <input type="checkbox" required id="ask-gdpr" checked={askGdpr} onChange={e => setAskGdpr(e.target.checked)} style={{ marginTop: '3px' }} />
                <label htmlFor="ask-gdpr" style={{ fontSize: '11px', color: 'var(--text-muted)', cursor: 'pointer', lineHeight: '1.4' }}>
                  Souhlasím se zpracováním osobních údajů v souladu se zásadami ochrany osobních údajů na této stránce.
                </label>
              </div>
              <button type="submit" className="login-submit-btn">Odeslat dotaz</button>
            </form>
          </div>
        </div>
      )}

      {isWatchdogModalOpen && (
        <div className="product-modal-overlay" onClick={() => setIsWatchdogModalOpen(false)}>
          <div className="product-modal-container" onClick={e => e.stopPropagation()}>
            <button className="product-modal-close" onClick={() => setIsWatchdogModalOpen(false)}>✕</button>
            <h3 className="product-modal-title">Sledovat produkt (Hlídací pes)</h3>
            <form onSubmit={handleWatchdogSubmit} className="login-modal-form">
              <div className="login-form-group">
                <label className="login-form-label">Upozornit mě, když:</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                    <input type="radio" name="watchdog-type" checked={watchdogType === 'stock'} onChange={() => setWatchdogType('stock')} />
                    Produkt bude skladem
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                    <input type="radio" name="watchdog-type" checked={watchdogType === 'sale'} onChange={() => setWatchdogType('sale')} />
                    Produkt bude v akci
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', flexWrap: 'wrap' }}>
                    <input type="radio" name="watchdog-type" checked={watchdogType === 'price'} onChange={() => setWatchdogType('price')} />
                    Cena klesne pod: 
                    <input type="number" disabled={watchdogType !== 'price'} value={watchdogPriceLimit} onChange={e => setWatchdogPriceLimit(e.target.value)} className="login-form-input" style={{ width: '100px', padding: '6px 12px', display: 'inline-block', margin: '0 4px', height: 'auto' }} placeholder="Částka" />
                    Kč
                  </label>
                </div>
              </div>
              <div className="login-form-group" style={{ marginTop: '8px' }}>
                <label className="login-form-label">E-mail pro zaslání upozornění <span className="text-red">*</span></label>
                <input type="email" required className="login-form-input" value={watchdogEmail} onChange={e => setWatchdogEmail(e.target.value)} placeholder="jmeno@example.com" />
              </div>
              <div className="login-form-group" style={{ flexDirection: 'row', gap: '10px', alignItems: 'flex-start' }}>
                <input type="checkbox" required id="watchdog-gdpr" checked={watchdogGdpr} onChange={e => setWatchdogGdpr(e.target.checked)} style={{ marginTop: '3px' }} />
                <label htmlFor="watchdog-gdpr" style={{ fontSize: '11px', color: 'var(--text-muted)', cursor: 'pointer', lineHeight: '1.4' }}>
                  Beru na vědomí, že moje e-mailová adresa bude spravována za účelem informování o dostupnosti a cenách produktů v souladu se zásadami zpracování osobních údajů.
                </label>
              </div>
              <button type="submit" className="login-submit-btn">Uložit nastavení hlídání</button>
            </form>
          </div>
        </div>
      )}

      {isReviewModalOpen && (
        <div className="product-modal-overlay" onClick={() => setIsReviewModalOpen(false)}>
          <div className="product-modal-container" onClick={e => e.stopPropagation()}>
            <button className="product-modal-close" onClick={() => setIsReviewModalOpen(false)}>✕</button>
            <h3 className="product-modal-title">Přidat hodnocení produktu</h3>
            <form onSubmit={handleReviewSubmit} className="login-modal-form">
              <div className="login-form-group">
                <label className="login-form-label">Vaše jméno <span className="text-red">*</span></label>
                <input type="text" required className="login-form-input" value={reviewAuthor} onChange={e => setReviewAuthor(e.target.value)} placeholder="Jan N." />
              </div>
              <div className="login-form-group">
                <label className="login-form-label">Počet hvězdiček <span className="text-red">*</span></label>
                <select className="login-form-input" value={reviewRating} onChange={e => setReviewRating(Number(e.target.value))}>
                  <option value={5}>★★★★★ (5 hvězdiček)</option>
                  <option value={4}>★★★★☆ (4 hvězdičky)</option>
                  <option value={3}>★★★☆☆ (3 hvězdičky)</option>
                  <option value={2}>★★☆☆☆ (2 hvězdičky)</option>
                  <option value={1}>★☆☆☆☆ (1 hvězdička)</option>
                </select>
              </div>
              <div className="login-form-group">
                <label className="login-form-label">Text recenze <span className="text-red">*</span></label>
                <textarea required className="login-form-input" style={{ minHeight: '100px', resize: 'vertical' }} value={reviewText} onChange={e => setReviewText(e.target.value)} placeholder="Jak jste spokojen s tímto produktem?" />
              </div>
              <button type="submit" className="login-submit-btn">Odeslat recenzi</button>
            </form>
          </div>
        </div>
      )}

      {isCommentModalOpen && (
        <div className="product-modal-overlay" onClick={() => setIsCommentModalOpen(false)}>
          <div className="product-modal-container" onClick={e => e.stopPropagation()}>
            <button className="product-modal-close" onClick={() => setIsCommentModalOpen(false)}>✕</button>
            <h3 className="product-modal-title">Položit dotaz / Napsat komentář</h3>
            <form onSubmit={handleCommentSubmit} className="login-modal-form">
              <div className="login-form-group">
                <label className="login-form-label">Vaše jméno <span className="text-red">*</span></label>
                <input type="text" required className="login-form-input" value={commentAuthor} onChange={e => setCommentAuthor(e.target.value)} placeholder="Jan N." />
              </div>
              <div className="login-form-group">
                <label className="login-form-label">Text komentáře <span className="text-red">*</span></label>
                <textarea required className="login-form-input" style={{ minHeight: '100px', resize: 'vertical' }} value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="Zde napište svůj dotaz nebo postřeh..." />
              </div>
              <button type="submit" className="login-submit-btn">Odeslat komentář</button>
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
  }
};
