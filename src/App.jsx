import { useState, useEffect } from 'react';
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
import './App.css';

export default function App() {
  // Navigation & Page State
  const [activePage, setActivePage] = useState('home');
  const [gdprVopTab, setGdprVopTab] = useState('vop');

  const navigateToPage = (page, tab) => {
    setActivePage(page);
    if (page === 'gdpr-vop' && tab) {
      setGdprVopTab(tab);
    }
  };

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



  const [selectedProductId, setSelectedProductId] = useState(null);
  
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
  // Search and Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({});

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
        title = 'Sealed produkty - Northvaletcg.eu';
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
  const showToast = (message, type = 'success') => {
    setToast({ message, visible: true, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 3500);
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

        {activePage === 'buylist' && (
          <BuylistPortal 
            products={mockProducts}
            submitBuylist={submitBuylist}
            user={user}
            setActivePage={setActivePage}
            alert={showToast}
          />
        )}

        {activePage === 'grading' && (
          <GradingPortal 
            submitGrading={submitGrading}
            user={user}
            setActivePage={setActivePage}
            alert={showToast}
          />
        )}

        {activePage === 'grading-guide' && (
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
      {toast.visible && (
        <div style={styles.toast} className="glass-panel">
          <span style={styles.toastIcon}>✓</span>
          <span style={styles.toastMessage}>{toast.message}</span>
        </div>
      )}
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
