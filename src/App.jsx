import React, { useState, useEffect } from 'react';
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

import { mockProducts } from './mockData';
import './App.css';

export default function App() {
  // Navigation & Page State
  const [activePage, setActivePage] = useState('home');

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
  
  // Search and Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({});

  // Cart State
  const [cart, setCart] = useState([]);

  // Toast Notification State
  const [toast, setToast] = useState({ message: '', visible: false, type: 'success' });

  // Custom Toast helper
  const showToast = (message, type = 'success') => {
    setToast({ message, visible: true, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 3500);
  };

  // User State (Mock DB)
  const [user, setUser] = useState({
    storeCredit: 1000,
    transactionHistory: [
      { id: 't-init', description: 'Uvítací bonusový Store Kredit', amount: 1000, date: '26. 5. 2026' }
    ],
    orderHistory: [],
    gradingSubmissions: []
  });

  // Buylists State (Admin approvals)
  const [buylists, setBuylists] = useState([
    {
      id: 'BL-984321',
      items: [
        { name: 'Charizard ex (Special Illustration Rare)', condition: 'NM', lang: 'EN', price: 1110, quantity: 1 }
      ],
      payoutMethod: 'credit',
      totalPayout: 1388,
      status: 'Čeká na odeslání',
      date: '25. 5. 2026'
    }
  ]);

  // Add to Cart Action
  const addToCart = (variant, product) => {
    const isSingle = product.type === 'single';
    const itemId = isSingle ? variant.id : product.id;
    const itemName = isSingle ? `${product.name} (${variant.condition})` : product.name;
    const itemPrice = isSingle ? variant.price : product.price;

    setCart(prevCart => {
      const existing = prevCart.find(item => item.id === itemId);
      if (existing) {
        return prevCart.map(item => 
          item.id === itemId ? { ...item, quantity: item.quantity + 1 } : item
        );
      } else {
        return [...prevCart, {
          id: itemId,
          name: itemName,
          price: itemPrice,
          quantity: 1,
          condition: isSingle ? variant.condition : null,
          lang: isSingle ? variant.lang : null,
          foil: isSingle ? variant.foil : null,
          productName: product.name,
          product: product
        }];
      }
    });
    showToast(`"${itemName}" přidáno do košíku.`, 'success');
  };

  // Submit Order Action
  const submitOrder = (order, creditApplied) => {
    setUser(prev => {
      let updatedCredit = prev.storeCredit;
      let updatedHistory = [...prev.transactionHistory];

      if (creditApplied > 0) {
        updatedCredit -= creditApplied;
        updatedHistory.unshift({
          id: 't-ord-' + order.id,
          description: `Platba za objednávku #${order.id} (uplatněn kredit)`,
          amount: -creditApplied,
          date: order.date
        });
      }

      return {
        ...prev,
        storeCredit: updatedCredit,
        transactionHistory: updatedHistory,
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

      if (bl.payoutMethod === 'credit') {
        setUser(prevUser => ({
          ...prevUser,
          storeCredit: prevUser.storeCredit + bl.totalPayout,
          transactionHistory: [
            {
              id: 't-buy-' + bl.id,
              description: `Připsán Store Kredit za výkup ${bl.id} (+25% bonus)`,
              amount: bl.totalPayout,
              date: new Date().toLocaleDateString()
            },
            ...prevUser.transactionHistory
          ]
        }));
        showToast(`Výkup ${bl.id} schválen. Kredit +${bl.totalPayout} Kč byl připsán.`, 'success');
      } else {
        setUser(prevUser => ({
          ...prevUser,
          transactionHistory: [
            {
              id: 't-buy-cash-' + bl.id,
              description: `Vyplacena hotovost za výkup ${bl.id} na bankovní účet`,
              amount: 0,
              date: new Date().toLocaleDateString()
            },
            ...prevUser.transactionHistory
          ]
        }));
        showToast(`Výkup ${bl.id} schválen k bankovnímu převodu.`, 'success');
      }

      return updated;
    }));
  };

  return (
    <div style={styles.appContainer}>
      <Navbar 
        activePage={activePage} 
        setActivePage={setActivePage} 
        cart={cart}
        user={user}
        setFilters={setFilters}
        setSearchQuery={setSearchQuery}
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
          />
        )}

        {activePage === 'singles-detail' && (
          <SinglesDetail 
            productId={selectedProductId}
            products={mockProducts}
            addToCart={addToCart}
            setSelectedProductId={setSelectedProductId}
            setActivePage={setActivePage}
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
            user={user}
            submitOrder={submitOrder}
            setActivePage={setActivePage}
            alert={showToast}
          />
        )}

        {activePage === 'profile' && (
          <UserPortal 
            user={user}
            setActivePage={setActivePage}
          />
        )}

        {activePage === 'admin' && (
          <AdminPanel 
            buylists={buylists}
            approveBuylist={approveBuylist}
          />
        )}
      </main>

      <Footer setActivePage={setActivePage} />

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
