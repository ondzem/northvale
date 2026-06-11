import { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Homepage from './components/Homepage';
import SinglesCatalog from './components/SinglesCatalog';
import SealedCatalog from './components/SealedCatalog';
import SlabsCatalog from './components/SlabsCatalog';
import SealedDetail from './components/SealedDetail';
import SinglesDetail from './components/SinglesDetail';
import BuylistPortal from './components/BuylistPortal';
import GradingPortal from './components/GradingPortal';
import GradingGuide from './components/GradingGuide';
import CommunityTournaments from './components/CommunityTournaments';
import SupportFAQ from './components/SupportFAQ';
import CheckoutFlow from './components/CheckoutFlow';
import UserPortal from './components/UserPortal';
import AdminPanel from './components/AdminPanel';
import GdprVop from './components/GdprVop';
import Cart from './components/Cart';
import Favorites from './components/Favorites';
import LoginModal from './components/LoginModal';

import { mockProducts } from './mockData';
import { FEATURE_FLAGS } from './config';
import './App.css';

const parseUrlToState = () => {
  const path = window.location.pathname;
  const searchParams = new URLSearchParams(window.location.search);
  
  let page = 'home';
  let productId = null;
  let tab = 'vop';
  let parsedFilters = {};
  
  if (path.startsWith('/sealed-detail/')) {
    page = 'sealed-detail';
    productId = path.replace('/sealed-detail/', '');
  } else if (path.startsWith('/singles-detail/')) {
    page = 'singles-detail';
    productId = path.replace('/singles-detail/', '');
  } else if (path === '/singles-catalog') {
    page = 'singles-catalog';
  } else if (path === '/sealed-catalog') {
    page = 'sealed-catalog';
  } else if (path === '/slabs-catalog') {
    page = 'slabs-catalog';
  } else if (path === '/buylist') {
    page = FEATURE_FLAGS.showBuylist ? 'buylist' : 'home';
  } else if (path === '/grading') {
    page = FEATURE_FLAGS.showGrading ? 'grading' : 'home';
  } else if (path === '/grading-guide') {
    page = FEATURE_FLAGS.showGrading ? 'grading-guide' : 'home';
  } else if (path === '/community') {
    page = 'community';
  } else if (path === '/support') {
    page = 'support';
  } else if (path === '/checkout') {
    page = 'checkout';
  } else if (path === '/profile') {
    page = 'profile';
  } else if (path === '/admin') {
    page = 'admin';
  } else if (path === '/gdpr-vop') {
    page = 'gdpr-vop';
    tab = searchParams.get('tab') || 'vop';
  } else if (path === '/cart') {
    page = 'cart';
  } else if (path === '/favorites') {
    page = 'favorites';
  } else {
    page = 'home';
  }
  
  searchParams.forEach((value, key) => {
    if (key !== 'tab' && key !== 'q') {
      if (value === 'true') parsedFilters[key] = true;
      else if (value === 'false') parsedFilters[key] = false;
      else parsedFilters[key] = value;
    }
  });

  const searchQuery = searchParams.get('q') || '';
  
  return { page, productId, tab, filters: parsedFilters, searchQuery };
};

const generateUrlFromState = (page, productId, tab, filtersObj, searchQuery) => {
  let path = '/';
  const searchParams = new URLSearchParams();
  
  if (page === 'sealed-detail' && productId) {
    path = `/sealed-detail/${productId}`;
  } else if (page === 'singles-detail' && productId) {
    path = `/singles-detail/${productId}`;
  } else if (page === 'singles-catalog') {
    path = '/singles-catalog';
  } else if (page === 'sealed-catalog') {
    path = '/sealed-catalog';
  } else if (page === 'slabs-catalog') {
    path = '/slabs-catalog';
  } else if (page === 'buylist') {
    path = FEATURE_FLAGS.showBuylist ? '/buylist' : '/';
  } else if (page === 'grading') {
    path = FEATURE_FLAGS.showGrading ? '/grading' : '/';
  } else if (page === 'grading-guide') {
    path = FEATURE_FLAGS.showGrading ? '/grading-guide' : '/';
  } else if (page === 'community') {
    path = '/community';
  } else if (page === 'support') {
    path = '/support';
  } else if (page === 'checkout') {
    path = '/checkout';
  } else if (page === 'profile') {
    path = '/profile';
  } else if (page === 'admin') {
    path = '/admin';
  } else if (page === 'gdpr-vop') {
    path = '/gdpr-vop';
    if (tab) {
      searchParams.set('tab', tab);
    }
  } else if (page === 'cart') {
    path = '/cart';
  } else if (page === 'favorites') {
    path = '/favorites';
  }
  
  if (filtersObj && Object.keys(filtersObj).length > 0) {
    Object.entries(filtersObj).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        searchParams.set(key, String(val));
      }
    });
  }

  if (searchQuery) {
    searchParams.set('q', searchQuery);
  }
  
  const searchStr = searchParams.toString();
  return path + (searchStr ? `?${searchStr}` : '');
};

export default function App() {
  const initialUrlState = parseUrlToState();

  const toastTimeoutRef = useRef(null);

  // Navigation & Page State
  const [activePage, setActivePage] = useState(initialUrlState.page);
  const [gdprVopTab, setGdprVopTab] = useState(initialUrlState.tab);
  const [selectedProductId, setSelectedProductId] = useState(initialUrlState.productId);
  const [searchQuery, setSearchQuery] = useState(initialUrlState.searchQuery);
  const [filters, setFilters] = useState(initialUrlState.filters);

  const navigateToPage = (page, tab) => {
    if (page === 'buylist' && !FEATURE_FLAGS.showBuylist) {
      page = 'home';
    }
    if ((page === 'grading' || page === 'grading-guide') && !FEATURE_FLAGS.showGrading) {
      page = 'home';
    }
    setActivePage(page);
    if (page === 'gdpr-vop' && tab) {
      setGdprVopTab(tab);
    }
  };

  const isPoppingState = useRef(false);

  // Sync state to URL in history
  useEffect(() => {
    const newUrl = generateUrlFromState(activePage, selectedProductId, gdprVopTab, filters, searchQuery);
    const currentUrl = window.location.pathname + window.location.search;
    
    if (newUrl !== currentUrl) {
      if (isPoppingState.current) {
        // Just sync currentUrl
      } else {
        window.history.pushState(null, '', newUrl);
      }
    }
  }, [activePage, selectedProductId, gdprVopTab, filters, searchQuery]);

  // Sync browser back/forward buttons to state
  useEffect(() => {
    const handlePopState = () => {
      const stateFromUrl = parseUrlToState();
      isPoppingState.current = true;
      setActivePage(stateFromUrl.page);
      setSelectedProductId(stateFromUrl.productId);
      setGdprVopTab(stateFromUrl.tab);
      setFilters(stateFromUrl.filters);
      setSearchQuery(stateFromUrl.searchQuery);
      setTimeout(() => {
        isPoppingState.current = false;
      }, 0);
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  useEffect(() => {
    // Detect OS and add class
    const isMac = /Mac|iPhone|iPod|iPad/.test(navigator.userAgent);
    document.documentElement.classList.add(isMac ? 'os-mac' : 'os-windows');

    let scrollTimeout;
    const handleScroll = () => {
      document.documentElement.classList.add('is-scrolling');
      document.body.classList.add('is-scrolling');
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        document.documentElement.classList.remove('is-scrolling');
        document.body.classList.remove('is-scrolling');
      }, 1000);
    };

    window.addEventListener('scroll', handleScroll, { capture: true, passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll, { capture: true });
      clearTimeout(scrollTimeout);
    };
  }, []);



  // selectedProductId is declared at the top
  
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const handleLogin = (email, name = '', avatar = '') => {
    setIsLoggedIn(true);
    setUser(prev => ({
      ...prev,
      email: email,
      name: name || email.split('@')[0],
      avatar: avatar || '/user.png'
    }));
    showToast(`Byl jste úspěšně přihlášen jako ${name || email}`, 'success');
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUser(prev => ({
      ...prev,
      email: '',
      name: '',
      avatar: '/user.png'
    }));
    setActivePage('home');
    showToast('Byl jste úspěšně odhlášen.', 'success');
  };

  const handleRegister = (email, name = '', phone = '') => {
    setIsLoggedIn(true);
    setUser(prev => ({
      ...prev,
      email: email,
      name: name || email.split('@')[0],
      phone: phone,
      avatar: '/user.png'
    }));
    showToast(`Registrace úspěšná! Vítejte, ${name || email}`, 'success');
  };
  // Search and Filters are declared at the top

  // Cart State
  const [cart, setCart] = useState([]);

  // Toast Notification State
  const [toast, setToast] = useState({ message: '', visible: false, type: 'success' });

  // Smooth scroll to top on page or legal tab change
  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }, [activePage, gdprVopTab]);

  // Dynamic Page Title
  useEffect(() => {
    let title = 'Northvaletcg.eu';
    
    switch (activePage) {
      case 'home':
        title = 'Domů - Northvaletcg.eu';
        break;
      case 'singles-catalog':
        title = 'Pokémon Singles - Northvaletcg.eu';
        break;
      case 'sealed-catalog':
        title = 'Katalog - Northvaletcg.eu';
        break;
      case 'slabs-catalog':
        title = 'Ohodnocené slabs - Northvaletcg.eu';
        break;
      case 'singles-detail':
      case 'sealed-detail': {
        const currentProduct = mockProducts.find(p => p.id === selectedProductId);
        if (currentProduct) {
          title = `${currentProduct.name} - Northvaletcg.eu`;
        }
        break;
      }
      case 'buylist':
        title = 'Výkup karet (Buylist) - Northvaletcg.eu';
        break;
      case 'grading':
        title = 'Grading Servis - Northvaletcg.eu';
        break;
      case 'grading-guide':
        title = 'Průvodce stavy karet - Northvaletcg.eu';
        break;
      case 'community':
        title = 'Komunita a turnaje - Northvaletcg.eu';
        break;
      case 'support':
        title = 'Centrum podpory - Northvaletcg.eu';
        break;
      case 'admin':
        title = 'Administrace - Northvaletcg.eu';
        break;
      case 'gdpr-vop':
        if (gdprVopTab === 'doprava') {
          title = 'Doprava a platba - Northvaletcg.eu';
        } else if (gdprVopTab === 'vop') {
          title = 'Obchodní podmínky (VOP) - Northvaletcg.eu';
        } else if (gdprVopTab === 'odstoupeni') {
          title = 'Odstoupení od smlouvy - Northvaletcg.eu';
        } else {
          title = 'Ochrana osobních údajů (GDPR) - Northvaletcg.eu';
        }
        break;
      case 'cart':
        title = 'Nákupní košík - Northvaletcg.eu';
        break;
      case 'favorites':
        title = 'Oblíbené - Northvaletcg.eu';
        break;
      case 'profile':
        title = 'Můj profil - Northvaletcg.eu';
        break;
      default:
        title = 'Northvaletcg.eu';
    }
    
    document.title = title;
  }, [activePage, selectedProductId, gdprVopTab]);

  // Custom Toast helper
  const showToast = (message, type = 'success', title = '') => {
    // Determine title if not provided
    let defaultTitle = 'Oznámení';
    if (type === 'success') {
      if (message.includes('košík') || message.includes('přidáno')) {
        defaultTitle = 'Zboží přidáno do košíku';
      } else {
        defaultTitle = 'Úspěšná operace';
      }
    } else if (type === 'error') {
      defaultTitle = 'Nastala chyba';
    }

    setToast({ message, visible: true, type, title: title || defaultTitle });
    
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    
    toastTimeoutRef.current = setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 4000);
  };

  // User State (Mock DB)
  const [user, setUser] = useState({
    orderHistory: [],
    gradingSubmissions: [],
    name: '',
    email: '',
    avatar: '/user.png'
  });

  // Buylists State (Admin approvals)
  const [buylists, setBuylists] = useState([
    {
      id: 'BL-984321',
      items: [
        { name: 'Charizard ex (Special Illustration Rare)', condition: 'NM', lang: 'EN', price: 1110, quantity: 1 }
      ],
      payoutMethod: 'cash',
      totalPayout: 1110,
      status: 'Čeká na odeslání',
      date: '25. 5. 2026'
    }
  ]);

  // Add to Cart Action
  const addToCart = (variant, product, quantityToAdd = 1) => {
    const isSingle = product.type === 'single';
    const itemId = isSingle ? variant.id : product.id;
    const itemName = isSingle ? `${product.name} (${variant.condition})` : product.name;
    const itemPrice = isSingle ? variant.price : product.price;

    setCart(prevCart => {
      const existing = prevCart.find(item => item.id === itemId);
      if (existing) {
        return prevCart.map(item => 
          item.id === itemId ? { ...item, quantity: item.quantity + quantityToAdd } : item
        );
      } else {
        return [...prevCart, {
          id: itemId,
          name: itemName,
          price: itemPrice,
          quantity: quantityToAdd,
          condition: isSingle ? variant.condition : null,
          lang: isSingle ? variant.lang : null,
          foil: isSingle ? variant.foil : null,
          productName: product.name,
          product: product
        }];
      }
    });
    showToast(`"${itemName}" (${quantityToAdd} ks) přidáno do košíku.`, 'success');
  };

  // Submit Order Action
  const submitOrder = (order) => {
    setUser(prev => {
      return {
        ...prev,
        orderHistory: [order, ...prev.orderHistory]
      };
    });

    setCart([]);
  };

  // Submit Buylist Action
  const submitBuylist = (submission) => {
    setBuylists(prev => [submission, ...prev]);
  };

  // Submit Grading Action
  const submitGrading = (submission) => {
    setUser(prev => ({
      ...prev,
      gradingSubmissions: [submission, ...prev.gradingSubmissions]
    }));
  };

  // Approve Buylist Action (Admin)
  const approveBuylist = (buylistId) => {
    setBuylists(prev => prev.map(bl => {
      if (bl.id !== buylistId) return bl;
      
      const updated = { ...bl, status: 'Schváleno - Vyplaceno' };

      showToast(`Výkup ${bl.id} schválen k bankovnímu převodu.`, 'success');

      return updated;
    }));
  };

  return (
    <div style={styles.appContainer}>
      <Navbar 
        activePage={activePage} 
        setActivePage={navigateToPage} 
        cart={cart}
        user={user}
        setFilters={setFilters}
        setSearchQuery={setSearchQuery}
        isLoggedIn={isLoggedIn}
        onOpenLogin={() => setIsLoginModalOpen(true)}
      />
      
      <main style={styles.mainContent}>
        {activePage === 'home' && (
          <Homepage 
            setActivePage={setActivePage} 
            addToCart={addToCart} 
            products={mockProducts}
            setSelectedProductId={setSelectedProductId}
            setFilters={setFilters}
          />
        )}
        
        {activePage === 'singles-catalog' && (
          <SinglesCatalog 
            products={mockProducts}
            addToCart={addToCart}
            setSelectedProductId={setSelectedProductId}
            setActivePage={setActivePage}
            filters={filters}
            setFilters={setFilters}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            alert={showToast}
          />
        )}

        {activePage === 'sealed-catalog' && (
          <SealedCatalog 
            products={mockProducts}
            addToCart={addToCart}
            setSelectedProductId={setSelectedProductId}
            setActivePage={setActivePage}
            filters={filters}
            setFilters={setFilters}
          />
        )}

        {activePage === 'slabs-catalog' && (
          <SlabsCatalog 
            products={mockProducts}
            addToCart={addToCart}
            setSelectedProductId={setSelectedProductId}
            setActivePage={setActivePage}
            filters={filters}
            setFilters={setFilters}
          />
        )}

        {activePage === 'sealed-detail' && (
          <SealedDetail 
            productId={selectedProductId}
            products={mockProducts}
            addToCart={addToCart}
            setSelectedProductId={setSelectedProductId}
            setActivePage={setActivePage}
            setFilters={setFilters}
            alert={showToast}
          />
        )}

        {activePage === 'singles-detail' && (
          <SinglesDetail 
            productId={selectedProductId}
            products={mockProducts}
            addToCart={addToCart}
            setSelectedProductId={setSelectedProductId}
            setActivePage={setActivePage}
            setFilters={setFilters}
            alert={showToast}
          />
        )}

        {activePage === 'buylist' && FEATURE_FLAGS.showBuylist && (
          <BuylistPortal 
            products={mockProducts}
            submitBuylist={submitBuylist}
            user={user}
            setActivePage={setActivePage}
            alert={showToast}
          />
        )}

        {activePage === 'grading' && FEATURE_FLAGS.showGrading && (
          <GradingPortal 
            submitGrading={submitGrading}
            user={user}
            setActivePage={setActivePage}
            alert={showToast}
          />
        )}

        {activePage === 'grading-guide' && FEATURE_FLAGS.showGrading && (
          <GradingGuide 
            setActivePage={setActivePage}
          />
        )}

        {activePage === 'community' && (
          <CommunityTournaments />
        )}

        {activePage === 'support' && (
          <SupportFAQ />
        )}

        {activePage === 'checkout' && (
          <CheckoutFlow 
            cart={cart}
            submitOrder={submitOrder}
            setActivePage={setActivePage}
            alert={showToast}
          />
        )}

        {activePage === 'profile' && (
          <UserPortal 
            user={user}
            setActivePage={setActivePage}
            onLogout={handleLogout}
          />
        )}

        {activePage === 'admin' && (
          <AdminPanel 
            buylists={buylists}
            approveBuylist={approveBuylist}
          />
        )}

        {activePage === 'gdpr-vop' && (
          <GdprVop setActivePage={navigateToPage} initialTab={gdprVopTab} />
        )}

        {activePage === 'cart' && (
          <Cart 
            cart={cart} 
            setCart={setCart} 
            setActivePage={setActivePage} 
          />
        )}

        {activePage === 'favorites' && (
          <Favorites 
            products={mockProducts}
            addToCart={addToCart}
            setSelectedProductId={setSelectedProductId}
            setActivePage={setActivePage}
          />
        )}
      </main>

      <Footer setActivePage={navigateToPage} />

      <LoginModal 
        isOpen={isLoginModalOpen} 
        onClose={() => setIsLoginModalOpen(false)} 
        onLogin={handleLogin} 
        onRegister={handleRegister} 
      />

      {/* Premium Custom Toast Banner */}
      {toast.visible && (() => {
        const cartMatch = toast.message.match(/"([^"]+)"\s*\((\d+)\s*ks\)\s*přidáno do košíku\./);
        const isCartAddition = !!cartMatch;
        const productName = isCartAddition ? cartMatch[1] : '';
        const quantity = isCartAddition ? cartMatch[2] : '';

        return (
          <div className="premium-toast">
            <div className="premium-toast-header">
              <div className="premium-toast-icon-wrapper">
                {isCartAddition ? (
                  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                )}
              </div>
              <div className="premium-toast-title-container">
                <span className="premium-toast-title">
                  {isCartAddition ? 'Košík aktualizován' : (toast.title || 'Oznámení')}
                </span>
                <span className="premium-toast-body">
                  {isCartAddition ? (
                    <>
                      Úspěšně jste přidali <strong>{productName}</strong> ({quantity} ks) do košíku.
                    </>
                  ) : (
                    toast.message
                  )}
                </span>
              </div>
              <button 
                className="premium-toast-close" 
                onClick={() => setToast(prev => ({ ...prev, visible: false }))}
                aria-label="Zavřít"
              >
                <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            
            {isCartAddition && (
              <div className="premium-toast-action-area">
                <button 
                  className="premium-toast-btn"
                  onClick={() => {
                    setActivePage('cart');
                    setToast(prev => ({ ...prev, visible: false }));
                  }}
                >
                  <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                  Zobrazit košík
                </button>
              </div>
            )}
            
            <div className="premium-toast-progress" />
          </div>
        );
      })()}
    </div>
  );
}

const styles = {
  appContainer: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    backgroundColor: 'var(--bg-page)',
    color: 'var(--text-main)',
    position: 'relative',
  },
  mainContent: {
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    boxSizing: 'border-box',
  },
  toast: {
    position: 'fixed',
    top: '24px',
    right: '24px',
    padding: '14px 24px',
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    backgroundColor: 'rgba(32, 32, 52, 0.95)',
    border: '1px solid var(--color-gold)',
    boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
    borderRadius: 'var(--radius-md)',
    animation: 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
  },
  toastIcon: {
    color: 'var(--color-gold)',
    fontWeight: '800',
    fontSize: '16px',
  },
  toastMessage: {
    fontSize: '13px',
    fontWeight: '700',
    color: 'var(--text-main)',
  }
};
