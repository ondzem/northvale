import { useState } from 'react';
import ProductCard from './ProductCard';

export default function Favorites({ products, addToCart, setSelectedProductId, setActivePage }) {
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

  const favoriteProducts = products.filter(p => favoriteIds.includes(p.id));

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
    <div className="container fade-in" style={{ paddingTop: '20px', paddingBottom: '60px', textAlign: 'left' }}>
      <h1 className="sr-only">Oblíbené položky - NORTHVALE</h1>

      {/* Breadcrumbs */}
      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '25px' }}>
        <span style={{ cursor: 'pointer' }} onClick={() => setActivePage('home')}>Domů</span>
        <span> &raquo; </span>
        <span style={{ color: 'var(--color-gold)', fontWeight: '700' }}>Oblíbené</span>
      </div>

      <h2 style={{ fontSize: '24px', fontWeight: '800', margin: '0 0 24px 0', fontFamily: 'var(--font-heading)' }}>
        Oblíbené produkty
      </h2>

      {favoriteProducts.length === 0 ? (
        <div className="glass-panel" style={{ padding: '60px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', textAlign: 'center' }}>
          <span style={{ fontSize: '56px' }}>❤️</span>
          <h3 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>Nemáte žádné oblíbené produkty</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>Označte produkty v katalogu ikonou srdíčka a zobrazí se zde.</p>
          <button 
            className="btn btn-primary" 
            onClick={() => setActivePage('singles-catalog')}
            style={{ marginTop: '10px' }}
          >
            Prohlížet nabídku karet
          </button>
        </div>
      ) : (
        <div 
          onClick={handleUnfavoriteCheck} // Recheck whenever click events bubble up (e.g. clicking heart buttons inside ProductCard)
          style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
        >
          <div className="catalog-product-grid">
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
            className="btn btn-secondary"
            onClick={() => setActivePage('singles-catalog')}
            style={{ alignSelf: 'flex-start' }}
          >
            &larr; Pokračovat v nákupu
          </button>
        </div>
      )}
    </div>
  );
}
