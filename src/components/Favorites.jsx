import { useState, useRef } from 'react';
import { useTranslation } from '../context/LanguageContext';
import ProductCard from './ProductCard';

export default function Favorites({ products, addToCart, setSelectedProductId, setActivePage }) {
  const { t } = useTranslation();
  const [favoriteIds, setFavoriteIds] = useState(() => {
    const ids = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('fav-')) {
          const val = localStorage.getItem(key);
          if (val === 'true') {
            ids.push(key.replace('fav-', ''));
          }
        }
      }
    } catch (err) {
      console.error(err);
    }
    return ids;
  });

  const favListRef = useRef(null);

  const favoriteProducts = products.filter(p => favoriteIds.includes(p.id));

  // Scroll handler for slider on desktop
  const handleScroll = (ref, direction) => {
    if (ref.current) {
      const isCurrentlyMobile = window.innerWidth <= 650;
      const scrollAmount = isCurrentlyMobile ? 220 : 280;
      ref.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  // Sync state if an item is unfavorited from inside this view
  const handleUnfavoriteCheck = () => {
    // Re-scan localStorage
    const ids = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('fav-')) {
          const val = localStorage.getItem(key);
          if (val === 'true') {
            ids.push(key.replace('fav-', ''));
          }
        }
      }
    } catch (err) {
      console.error(err);
    }
    setFavoriteIds(ids);
  };

  return (
    <div className="container fade-in">
      <h1 className="sr-only">{t('Favorites.srOnlyTitle')}</h1>

      {/* Breadcrumbs */}
      <nav className="breadcrumbs-nav" aria-label={t('Favorites.breadcrumbLabel')} style={{ marginBottom: '24px', paddingTop: '20px' }}>
        <span className="breadcrumb-item" onClick={() => setActivePage('home')}>{t('Favorites.breadcrumbHome')}</span>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-item active">{t('Favorites.breadcrumbFavs')}</span>
      </nav>

      <section className="fav-section" style={{ textAlign: 'left' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '800', margin: '0 0 24px 0', fontFamily: 'var(--font-heading)' }}>
          {t('Favorites.title')}
        </h2>

        {favoriteProducts.length === 0 ? (
          <div className="glass-panel" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', padding: '60px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', textAlign: 'center' }}>
            <span style={{ fontSize: '56px' }}>❤️</span>
            <h3 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>{t('Favorites.emptyTitle')}</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>{t('Favorites.emptyDesc')}</p>
            <button 
              className="btn btn-primary" 
              onClick={() => setActivePage('singles-catalog')}
              style={{ marginTop: '10px' }}
            >
              {t('Favorites.browseBtn')}
            </button>
          </div>
        ) : (
          <div 
            onClick={handleUnfavoriteCheck} // Recheck whenever click events bubble up (e.g. clicking heart buttons inside ProductCard)
            style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
          >
            <div className="slider-container-wrapper">
              <button 
                onClick={() => handleScroll(favListRef, 'left')} 
                className="scroll-arrow-btn left-arrow" 
                aria-label={t('Favorites.prevBtn')}
              >
                ‹
              </button>
              
              <div 
                ref={favListRef} 
                className="favorites-slider-grid catalog-product-grid"
              >
                {favoriteProducts.map(product => (
                  <ProductCard 
                    key={product.id}
                    product={product}
                    addToCart={addToCart}
                    setSelectedProductId={setSelectedProductId}
                    setActivePage={setActivePage}
                  />
                ))}
              </div>
              
              <button 
                onClick={() => handleScroll(favListRef, 'right')} 
                className="scroll-arrow-btn right-arrow" 
                aria-label={t('Favorites.nextBtn')}
              >
                ›
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
