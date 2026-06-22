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
import ContactPage from './components/ContactPage';
import FaqPage from './components/FaqPage';
import CheckoutFlow from './components/CheckoutFlow';
import UserPortal from './components/UserPortal';
import AdminPanel from './components/AdminPanel';
import GdprVop from './components/GdprVop';
import AboutPage from './components/AboutPage';
import Cart from './components/Cart';
import Favorites from './components/Favorites';
import LoginModal from './components/LoginModal';
import ResetPasswordModal from './components/ResetPasswordModal';
import CookieConsent from './components/CookieConsent';
import ErrorPage from './components/ErrorPage';
import { supabase } from './supabase';
import Blog from './components/Blog';
import { blogArticles } from './blogData';

import { mockProducts } from './mockData';
import { fetchProductsFromDB } from './services/products';
import { FEATURE_FLAGS } from './config';
import { LanguageProvider, useTranslation } from './context/LanguageContext';
import './App.css';

const parseUrlToState = () => {
  const path = window.location.pathname;
  const searchParams = new URLSearchParams(window.location.search);
  
  let page = 'home';
  let productId = null;
  let tab = 'vop';
  let parsedFilters = {};
  
  if (path.startsWith('/sealed-detail/')) {
    const parsedId = path.replace('/sealed-detail/', '');
    const product = mockProducts.find(p => p.id === parsedId);
    if (product && !FEATURE_FLAGS.showSlabs && (product.subsubcat === 'graded' || product.subcat === 'graded' || (product.category === 'Acrylics' && product.game === 'PSA'))) {
      page = 'home';
    } else {
      page = 'sealed-detail';
      productId = parsedId;
    }
  } else if (path.startsWith('/singles-detail/')) {
    const parsedId = path.replace('/singles-detail/', '');
    const product = mockProducts.find(p => p.id === parsedId);
    if (product && product.type === 'slab' && !FEATURE_FLAGS.showSlabs) {
      page = 'home';
    } else {
      page = 'singles-detail';
      productId = parsedId;
    }
  } else if (path === '/singles-catalog') {
    page = 'singles-catalog';
  } else if (path === '/sealed-catalog') {
    page = 'sealed-catalog';
  } else if (path === '/slabs-catalog') {
    page = FEATURE_FLAGS.showSlabs ? 'slabs-catalog' : 'home';
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
  } else if (path === '/faq') {
    page = 'faq';
  } else if (path === '/about') {
    page = 'about';
  } else if (path.startsWith('/blog/')) {
    page = 'blog';
    productId = path.replace('/blog/', '');
  } else if (path === '/blog') {
    page = 'blog';
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
  } else if (path === '/' || path === '') {
    page = 'home';
  } else {
    page = 'error';
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
    path = FEATURE_FLAGS.showSlabs ? '/slabs-catalog' : '/';
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
  } else if (page === 'faq') {
    path = '/faq';
  } else if (page === 'about') {
    path = '/about';
  } else if (page === 'blog') {
    if (productId) {
      path = `/blog/${productId}`;
    } else {
      path = '/blog';
    }
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
  } else if (page === 'error') {
    path = window.location.pathname;
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

function AppContent() {
  const { lang, setLang, t } = useTranslation();
  const initialUrlState = parseUrlToState();

  const toastTimeoutRef = useRef(null);

  // Navigation & Page State
  const [activePage, setActivePage] = useState(initialUrlState.page);
  const [gdprVopTab, setGdprVopTab] = useState(initialUrlState.tab);
  const [selectedProductId, setSelectedProductId] = useState(initialUrlState.productId);
  const [searchQuery, setSearchQuery] = useState(initialUrlState.searchQuery);
  const [filters, setFilters] = useState(initialUrlState.filters);

  // User and Session State (Declared at top to avoid hoisting reference issues)
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  // Applied Discount Code State
  const [appliedDiscount, setAppliedDiscount] = useState(null);

  // Cart State (Initialized from localStorage)
  const [cart, setCart] = useState(() => {
    try {
      const stored = localStorage.getItem('northvale-cart');
      return stored ? JSON.parse(stored) : [];
    } catch (err) {
      console.warn(err);
      return [];
    }
  });

  // Favorites State (Synchronized from individual fav-* local storage keys)
  const [favorites, setFavorites] = useState(() => {
    const list = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('fav-')) {
          const val = localStorage.getItem(key);
          if (val === 'true') {
            list.push(key.replace('fav-', ''));
          }
        }
      }
    } catch (err) {
      console.warn(err);
    }
    return list;
  });

  // User State
  const [user, setUser] = useState({
    id: '',
    orderHistory: [],
    gradingSubmissions: [],
    buylistHistory: [],
    storeCredit: 0,
    name: '',
    email: '',
    phone: '',
    role: 'customer',
    avatar: '/user.png',
    billingCompany: '',
    billingName: '',
    billingStreet: '',
    billingCity: '',
    billingZip: '',
    billingCountry: '',
    billingIco: '',
    billingDic: '',
    billingBankAccount: '',
    shippingAddresses: [],
    newsletter: false,
    twoFactorEnabled: false
  });

  // Centralized Products Fetching from Database with Fallbacks
  const [dbProducts, setDbProducts] = useState(mockProducts);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  useEffect(() => {
    let active = true;
    const loadProducts = async () => {
      setIsLoadingProducts(true);
      let queryOptions = {};

      if (activePage === 'singles-catalog') {
        queryOptions.types = ['single', 'slab'];
        queryOptions.game = filters.game || 'Pokémon';
      } else if (activePage === 'sealed-catalog') {
        queryOptions.types = ['sealed', 'accessory'];
        if (filters.game && filters.game !== 'all') {
          queryOptions.game = filters.game;
        }
      } else if (activePage === 'slabs-catalog') {
        queryOptions.type = 'slab';
        if (filters.game && filters.game !== 'all') {
          queryOptions.game = filters.game;
        }
      }

      if (searchQuery) {
        queryOptions.searchQuery = searchQuery;
      }

      const result = await fetchProductsFromDB(queryOptions);
      if (active) {
        setDbProducts(result);
        setIsLoadingProducts(false);
      }
    };

    loadProducts();
    return () => {
      active = false;
    };
  }, [activePage, filters.game, searchQuery]);

  // Supabase auth state change handler
  const handleAuthSession = async (session, event) => {
    setIsAuthChecking(true);
    if (session) {
      const authUser = session.user;
      setIsLoggedIn(true);

      // Fetch user profile from database
      let { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (error && error.code === 'PGRST116') {
        // Profile row does not exist! Create it dynamically to avoid database trigger dependency.
        const defaultProfile = {
          id: authUser.id,
          full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || '',
          role: 'customer',
          store_credit: 0,
          cart: cart || [],
          favorites: favorites || []
        };
        const { data: insertedData, error: insertErr } = await supabase
          .from('profiles')
          .upsert(defaultProfile)
          .select()
          .single();

        if (insertErr) {
          console.error('Failed to create missing profile row:', insertErr.message);
        } else if (insertedData) {
          profile = insertedData;
          error = null;
        }
      } else if (error) {
        console.error('Error fetching user profile:', error.message);
      }

      setUser(prev => ({
        ...prev,
        id: authUser.id,
        email: authUser.email || '',
        name: profile?.full_name || authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || '',
        phone: profile?.phone || authUser.user_metadata?.phone || '',
        role: profile?.role || 'customer',
        storeCredit: profile?.store_credit || 0,
        avatar: authUser.user_metadata?.avatar_url || '/user.png',
        billingCompany: profile?.billing_company || '',
        billingName: profile?.billing_name || '',
        billingStreet: profile?.billing_street || '',
        billingCity: profile?.billing_city || '',
        billingZip: profile?.billing_zip || '',
        billingCountry: profile?.billing_country || '',
        billingIco: profile?.billing_ico || '',
        billingDic: profile?.billing_dic || '',
        billingBankAccount: profile?.billing_bank_account || '',
        shippingAddresses: profile?.shipping_addresses || [],
        newsletter: profile?.newsletter || false,
        twoFactorEnabled: profile?.two_factor_enabled || false,
        orderHistory: profile?.order_history || [],
        buylistHistory: profile?.buylist_history || [],
        gradingSubmissions: profile?.grading_submissions || []
      }));

      // Load user's cart from database profile
      if (profile?.cart) {
        setCart(profile.cart);
      }

      // Load user's favorites from database profile and sync to local storage
      const dbFavorites = profile?.favorites || [];
      try {
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const key = localStorage.key(i);
          if (key && key.startsWith('fav-')) {
            localStorage.removeItem(key);
          }
        }
        dbFavorites.forEach(id => {
          localStorage.setItem(`fav-${id}`, 'true');
        });
      } catch (err) {
        console.warn(err);
      }
      setFavorites(dbFavorites);
      try {
        window.dispatchEvent(new Event('local-favorites-changed'));
      } catch (err) {
        console.warn(err);
      }

    } else {
      setIsLoggedIn(false);
      setUser({
        id: '',
        orderHistory: [],
        gradingSubmissions: [],
        buylistHistory: [],
        storeCredit: 0,
        name: '',
        email: '',
        phone: '',
        role: 'customer',
        avatar: '/user.png',
        billingCompany: '',
        billingName: '',
        billingStreet: '',
        billingCity: '',
        billingZip: '',
        billingCountry: '',
        billingIco: '',
        billingDic: '',
        billingBankAccount: '',
        shippingAddresses: [],
        newsletter: false,
        twoFactorEnabled: false
      });

      // Clear cart and favorites from localStorage and state on sign out
      if (event === 'SIGNED_OUT') {
        try {
          localStorage.removeItem('northvale-cart');
          for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i);
            if (key && key.startsWith('fav-')) {
              localStorage.removeItem(key);
            }
          }
        } catch (err) {
          console.warn(err);
        }
        setCart([]);
        setFavorites([]);
        try {
          window.dispatchEvent(new Event('local-favorites-changed'));
        } catch (err) {
          console.warn(err);
        }
      }
    }
    setIsAuthChecking(false);
  };

  // Listen to Supabase Auth State Changes
  useEffect(() => {
    const isInitialRecoveryLink = window.location.hash.includes('type=recovery');
    
    if (localStorage.getItem('supabase_recovery_active') === 'true' && !isInitialRecoveryLink) {
      // Clear flag and sign out since they didn't complete the password reset
      localStorage.removeItem('supabase_recovery_active');
      supabase.auth.signOut().then(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
          handleAuthSession(session, 'SIGNED_OUT');
        });
      });
    } else {
      // Check initial session
      supabase.auth.getSession().then(({ data: { session } }) => {
        handleAuthSession(session, 'INITIAL_SESSION');
      });
    }

    // Listen to changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      handleAuthSession(session, event);
      if (event === 'PASSWORD_RECOVERY') {
        localStorage.setItem('supabase_recovery_active', 'true');
        setIsResetPasswordModalOpen(true);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const navigateToPage = (page, tab) => {
    if (page === 'buylist' && !FEATURE_FLAGS.showBuylist) {
      page = 'home';
    }
    if ((page === 'grading' || page === 'grading-guide') && !FEATURE_FLAGS.showGrading) {
      page = 'home';
    }
    if (page === 'slabs-catalog' && !FEATURE_FLAGS.showSlabs) {
      page = 'home';
    }
    if (page === 'admin') {
      const isAdmin = isLoggedIn && user && (user.role === 'admin' || user.email === 'info@northvaletcg.eu');
      if (!isLoggedIn || !isAdmin) {
        showToast(
          lang === 'CZ' 
            ? 'Přístup odepřen. Tuto stránku mohou navštěvovat pouze administrátoři.' 
            : 'Access denied. Only administrators can visit this page.', 
          'error'
        );
        page = 'home';
      }
    }
    setActivePage(page);
    if (page === 'gdpr-vop' && tab) {
      setGdprVopTab(tab);
    }
  };

  // Admin Page Security Route Guard
  useEffect(() => {
    if (activePage === 'admin') {
      if (isAuthChecking) return;

      const isAdmin = isLoggedIn && user && (user.role === 'admin' || user.email === 'info@northvaletcg.eu');
      if (isLoggedIn && !isAdmin) {
        setActivePage('home');
        showToast(
          lang === 'CZ' 
            ? 'Přístup odepřen. Tuto stránku mohou navštěvovat pouze administrátoři.' 
            : 'Access denied. Only administrators can visit this page.', 
          'error'
        );
      } else if (!isLoggedIn) {
        setActivePage('home');
        showToast(
          lang === 'CZ' 
            ? 'Pro vstup do administrace se musíte nejdříve přihlásit.' 
            : 'You must log in to access the administration panel.', 
          'error'
        );
      }
    }
  }, [activePage, isLoggedIn, user.role, user.email, isAuthChecking]);

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

  const handleLogin = (email, name = '') => {
    setIsLoggedIn(true);
    setActivePage('profile');
    showToast(
      lang === 'CZ'
        ? `Byl(a) jste úspěšně přihlášen(a) jako ${name || email}`
        : `Successfully signed in as ${name || email}`,
      'success'
    );
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      showToast(
        lang === 'CZ'
          ? `Chyba při odhlášení: ${error.message}`
          : `Logout error: ${error.message}`,
        'error'
      );
    } else {
      setIsLoggedIn(false);
      setActivePage('home');
      showToast(
        lang === 'CZ' ? 'Byl jste úspěšně odhlášen.' : 'Successfully signed out.',
        'success'
      );
    }
  };

  const handleRegister = (email, name = '') => {
    showToast(
      lang === 'CZ'
        ? `Registrace byla úspěšná! Na e-mail ${email} byl odeslán potvrzovací odkaz. Před prvním přihlášením na něj prosím klikněte.`
        : `Registration successful! A confirmation link was sent to ${email}. Please click it before logging in.`,
      'success'
    );
  };
  // Search and Filters are declared at the top

  // Listen to local favorites changes (triggered by card clicks)
  useEffect(() => {
    const handleFavsChange = () => {
      const list = [];
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('fav-')) {
            const val = localStorage.getItem(key);
            if (val === 'true') {
              list.push(key.replace('fav-', ''));
            }
          }
        }
      } catch (err) {
        console.warn(err);
      }
      setFavorites(list);
    };

    window.addEventListener('local-favorites-changed', handleFavsChange);
    return () => window.removeEventListener('local-favorites-changed', handleFavsChange);
  }, []);

  // Sync cart to localStorage and Supabase (if logged in)
  useEffect(() => {
    try {
      localStorage.setItem('northvale-cart', JSON.stringify(cart));
    } catch (err) {
      console.warn(err);
    }

    const syncCart = async () => {
      if (isLoggedIn && user.id) {
        try {
          await supabase
            .from('profiles')
            .update({ cart: cart })
            .eq('id', user.id);
        } catch (err) {
          console.warn('Cart database sync failed:', err);
        }
      }
    };
    syncCart();
  }, [cart, isLoggedIn, user.id]);

  // Sync favorites to Supabase (if logged in)
  useEffect(() => {
    const syncFavorites = async () => {
      if (isLoggedIn && user.id) {
        try {
          await supabase
            .from('profiles')
            .update({ favorites: favorites })
            .eq('id', user.id);
        } catch (err) {
          console.warn('Favorites database sync failed:', err);
        }
      }
    };
    syncFavorites();
  }, [favorites, isLoggedIn, user.id]);

  // Toast Notification State
  const [toast, setToast] = useState({ message: '', visible: false, type: 'success' });

  // Smooth scroll to top on page or legal tab change
  useEffect(() => {
    if (sessionStorage.getItem('scrollToPreorderInfo') === 'true') {
      return;
    }
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }, [activePage, gdprVopTab]);

  // Helpers for stripping HTML tags and JSON-LD structured data formatting
  const stripAndTruncate = (text, max = 155) => {
    if (!text) return '';
    const plain = String(text)
      .replace(/<[^>]+>/g, '') // Strip HTML tags
      .replace(/data:image\/[^"']+/g, '') // Strip base64 inline images
      .replace(/[{}"]/g, '') // Strip JSON brackets/quotes if any JSON structure leaked
      .replace(/\s+/g, ' ') // Collapse whitespaces
      .trim();
    return plain.length > max ? plain.slice(0, max - 1).trimEnd() + '…' : plain;
  };

  const extractFirstTextBlock = (desc) => {
    if (!desc) return '';
    if (desc.trim().startsWith('[') || desc.trim().startsWith('{')) {
      try {
        const blocks = JSON.parse(desc);
        if (Array.isArray(blocks)) {
          const firstText = blocks.find(b => b.type === 'paragraph' || b.type === 'text' || b.text);
          if (firstText) {
            return firstText.text || '';
          }
        } else if (blocks.text) {
          return blocks.text;
        }
      } catch (err) {
        // Fallback to string handling
      }
    }
    return desc;
  };

  // Dynamic Page Title & SEO Meta Description
  useEffect(() => {
    let pageTitle = '';
    let metaDescription = 'Northvale TCG - Váš průvodce světem karetních her Pokémon, Disney Lorcana a One Piece. Originální produkty, příslušenství a sběratelský blog.';

    switch (activePage) {
      case 'home':
        pageTitle = lang === 'CZ'
          ? 'Northvale TCG – Pokémon, Lorcana a One Piece karty | E-shop'
          : 'Northvale TCG – Pokémon, Lorcana & One Piece Cards Shop';
        break;
      case 'singles-catalog': {
        const gamePart = filters.game && filters.game !== 'all' && filters.game !== 'all-games' ? filters.game : '';
        const typePart = filters.type || '';
        pageTitle = gamePart || typePart 
          ? `${[typePart, gamePart].filter(Boolean).join(' ')} - Kusovky` 
          : t('Catalogs.singlesTitle');
        metaDescription = gamePart || typePart
          ? `Kusové karty ${[typePart, gamePart].filter(Boolean).join(' ')} na kusovky. Doplňte svou sbírku Pokémon, Lorcana a One Piece karet.`
          : 'Kusové karty Pokémon, Lorcana a One Piece na jednom místě. Prozkoumejte naši širokou nabídku a doplňte svou sbírku.';
        break;
      }
      case 'sealed-catalog': {
        const gamePart = filters.game && filters.game !== 'all' && filters.game !== 'all-games' ? filters.game : '';
        const typePart = filters.type || '';
        pageTitle = gamePart || typePart 
          ? `${[typePart, gamePart].filter(Boolean).join(' ')}` 
          : t('Catalogs.sealedTitle');
        metaDescription = gamePart || typePart
          ? `${[typePart, gamePart].filter(Boolean).join(' ')} skladem na Northvale TCG. Zapečetěné produkty Pokémon, Lorcana a One Piece.`
          : 'Zapečetěné balíčky (boostery), boxy, ETB a příslušenství pro karetní hry Pokémon, Lorcana a One Piece.';
        break;
      }
      case 'slabs-catalog':
        pageTitle = t('Catalogs.slabsTitle');
        metaDescription = 'Ohodnocené karty (graded slabs) s certifikovanou pravostí a kvalitou od předních gradingových společností.';
        break;
      case 'singles-detail':
      case 'sealed-detail': {
        const currentProduct = dbProducts.find(p => p.id === selectedProductId);
        if (currentProduct) {
          pageTitle = currentProduct.name;
          const plainDesc = extractFirstTextBlock(currentProduct.desc || currentProduct.description);
          const rawShort = currentProduct.shortDesc || plainDesc || 'Kupte originální TCG produkty na Northvale TCG.';
          metaDescription = stripAndTruncate(rawShort);
        }
        break;
      }
      case 'blog': {
        if (selectedProductId) {
          const currentArticle = blogArticles.find(a => a.id === selectedProductId);
          if (currentArticle) {
            pageTitle = currentArticle.title;
            metaDescription = currentArticle.description;
          } else {
            pageTitle = 'Článek nenalezen';
          }
        } else {
          pageTitle = 'Blog';
          metaDescription = 'Průvodce světem karetních her, tipy na ochranu sbírky, rady pro začátečníky a návody pro rozpoznání padělaných karet.';
        }
        break;
      }
      case 'buylist':
        pageTitle = t('BuylistPortal.title');
        metaDescription = 'Výkup Pokémon, Lorcana a One Piece karet. Prodejte nám své přebytečné kusové karty za skvělé ceny.';
        break;
      case 'grading':
        pageTitle = t('GradingPortal.title');
        metaDescription = 'Profesionální grading servis pro vaše TCG karty. Certifikace stavu, bezpečné pouzdro a zvýšení hodnoty.';
        break;
      case 'grading-guide':
        pageTitle = t('GradingGuide.title');
        metaDescription = 'Průvodce gradingem karet. Jak připravit karty pro grading, jaké zvolit služby a na co si dát pozor.';
        break;
      case 'community':
        pageTitle = t('Community.title');
        metaDescription = 'Turnaje a komunitní akce Northvale TCG. Připojte se k lokálním hráčům a poměřte své síly.';
        break;
      case 'support':
        pageTitle = t('ContactPage.title');
        metaDescription = 'Kontaktujte Northvale TCG. Rádi vám poradíme s výběrem produktů, stavbou balíčku nebo objednávkou.';
        break;
      case 'faq':
        pageTitle = t('FaqPage.title');
        metaDescription = 'Často kladené dotazy (FAQ) ohledně dopravy, plateb, věrnostního programu a pravosti karet.';
        break;
      case 'about':
        pageTitle = t('AboutPage.title');
        metaDescription = 'O nás - Northvale TCG. Příběh e-shopu založeného z vášně pro sbírání karetních her Pokémon, Lorcana a One Piece.';
        break;
      case 'admin':
        pageTitle = 'Administrace';
        break;
      case 'gdpr-vop':
        if (gdprVopTab === 'doprava') {
          pageTitle = t('GdprVop.dopravaTitle');
          metaDescription = 'Informace o možnostech dopravy a platby. Doručení po celé ČR a na Slovensko přes Zásilkovnu a PPL.';
        } else if (gdprVopTab === 'vop') {
          pageTitle = t('GdprVop.vopTitle');
          metaDescription = 'Všeobecné obchodní podmínky (VOP) e-shopu Northvale TCG.';
        } else if (gdprVopTab === 'odstoupeni') {
          pageTitle = t('GdprVop.withdrawalTitle');
          metaDescription = 'Formulář a podmínky pro odstoupení od kupní smlouvy do 14 dnů.';
        } else {
          pageTitle = t('GdprVop.gdprTitle');
          metaDescription = 'Zásady ochrany osobních údajů (GDPR) a zpracování cookies.';
        }
        break;
      case 'cart':
        pageTitle = t('Cart.title');
        break;
      case 'favorites':
        pageTitle = t('Navbar.favorites');
        break;
      case 'profile':
        pageTitle = t('UserPortal.title');
        break;
      default:
        pageTitle = 'Northvaletcg.eu';
    }

    document.title = pageTitle ? `${pageTitle} - Northvaletcg.eu` : 'Northvaletcg.eu';

    // Synchronize HTML language code dynamically
    document.documentElement.lang = lang === 'CZ' ? 'cs' : 'en';

    // Dynamic Meta Description
    let metaDescTag = document.querySelector('meta[name="description"]');
    if (!metaDescTag) {
      metaDescTag = document.createElement('meta');
      metaDescTag.name = 'description';
      document.head.appendChild(metaDescTag);
    }
    metaDescTag.content = metaDescription;

    // Canonical link injection
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.rel = 'canonical';
      document.head.appendChild(canonicalLink);
    }
    const cleanSearch = new URLSearchParams();
    const activeParams = new URLSearchParams(window.location.search);
    ['game', 'type', 'company', 'gameFilter'].forEach(param => {
      if (activeParams.has(param)) {
        cleanSearch.set(param, activeParams.get(param));
      }
    });
    const searchString = cleanSearch.toString();
    const canonicalUrl = `https://northvaletcg.eu${window.location.pathname}${searchString ? '?' + searchString : ''}`;
    canonicalLink.href = canonicalUrl;

    // Open Graph / Twitter meta helpers
    const setMeta = (attr, key, value) => {
      if (!value) return;
      let tag = document.querySelector(`meta[${attr}="${key}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute(attr, key);
        document.head.appendChild(tag);
      }
      tag.content = value;
    };

    setMeta('property', 'og:title', pageTitle ? `${pageTitle} - Northvaletcg.eu` : 'Northvaletcg.eu');
    setMeta('property', 'og:description', metaDescription);
    setMeta('property', 'og:type', (activePage === 'sealed-detail' || activePage === 'singles-detail') ? 'product' : 'website');
    setMeta('property', 'og:url', canonicalUrl);
    setMeta('name', 'twitter:card', 'summary_large_image');

    // Retrieve active visual images
    let ogImageUrl = '/Northvale Logo.webp';
    const currentProduct = (activePage === 'sealed-detail' || activePage === 'singles-detail')
      ? dbProducts.find(p => p.id === selectedProductId)
      : null;
    if (currentProduct && currentProduct.image) {
      ogImageUrl = currentProduct.image;
    } else if (activePage === 'blog' && selectedProductId) {
      const currentArticle = blogArticles.find(a => a.id === selectedProductId);
      if (currentArticle && currentArticle.image) {
        ogImageUrl = currentArticle.image;
      }
    }
    if (ogImageUrl.startsWith('/')) {
      ogImageUrl = `https://northvaletcg.eu${ogImageUrl}`;
    }
    setMeta('property', 'og:image', ogImageUrl);

    // Structured Data (JSON-LD) injection
    let jsonLdScript = document.getElementById('structured-data-seo');
    if (jsonLdScript) {
      jsonLdScript.remove();
    }

    let jsonLdData = null;

    if (activePage === 'home') {
      jsonLdData = {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "Organization",
            "@id": "https://northvaletcg.eu/#organization",
            "name": "Northvale TCG",
            "url": "https://northvaletcg.eu",
            "logo": "https://northvaletcg.eu/Northvale%20Logo.webp",
            "sameAs": [
              "https://www.instagram.com/northvaletcg/",
              "https://www.youtube.com/@northvaletcg",
              "https://www.tiktok.com/@northvaletcg"
            ]
          },
          {
            "@type": "WebSite",
            "@id": "https://northvaletcg.eu/#website",
            "url": "https://northvaletcg.eu",
            "name": "Northvale TCG",
            "publisher": { "@id": "https://northvaletcg.eu/#organization" }
          }
        ]
      };
    } else if ((activePage === 'sealed-detail' || activePage === 'singles-detail') && currentProduct) {
      const price = currentProduct.price ?? 0;
      const stock = currentProduct.stock ?? 0;
      const offersStock = stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock";
      jsonLdData = {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": currentProduct.name,
        "image": ogImageUrl,
        "description": metaDescription,
        "offers": {
          "@type": "Offer",
          "url": canonicalUrl,
          "priceCurrency": "CZK",
          "price": price,
          "availability": offersStock
        }
      };
    } else if (activePage === 'blog') {
      if (selectedProductId) {
        const currentArticle = blogArticles.find(a => a.id === selectedProductId);
        if (currentArticle) {
          jsonLdData = {
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            "headline": currentArticle.title,
            "description": currentArticle.description,
            "image": ogImageUrl,
            "datePublished": "2026-06-18T12:00:00Z",
            "author": {
              "@type": "Organization",
              "name": "Northvale TCG"
            }
          };
        }
      }
    } else if (activePage === 'sealed-catalog' || activePage === 'singles-catalog') {
      jsonLdData = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": lang === 'CZ' ? "Domů" : "Home",
            "item": "https://northvaletcg.eu/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": pageTitle,
            "item": canonicalUrl
          }
        ]
      };
    }

    if (jsonLdData) {
      jsonLdScript = document.createElement('script');
      jsonLdScript.type = 'application/ld+json';
      jsonLdScript.id = 'structured-data-seo';
      jsonLdScript.text = JSON.stringify(jsonLdData);
      document.head.appendChild(jsonLdScript);
    }

  }, [activePage, selectedProductId, gdprVopTab, lang, filters, dbProducts]);

  // Custom Toast helper
  function showToast(message, type = 'success', title = '') {
    // Determine title if not provided
    let defaultTitle = lang === 'CZ' ? 'Oznámení' : 'Notification';
    if (type === 'success') {
      if (message.includes('košík') || message.includes('přidáno') || message.includes('cart') || message.includes('added')) {
        defaultTitle = lang === 'CZ' ? 'Zboží přidáno do košíku' : 'Item added to cart';
      } else {
        defaultTitle = lang === 'CZ' ? 'Úspěšná operace' : 'Success';
      }
    } else if (type === 'error') {
      defaultTitle = lang === 'CZ' ? 'Nastala chyba' : 'An error occurred';
    }

    setToast({ message, visible: true, type, title: title || defaultTitle });
    
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    
    toastTimeoutRef.current = setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 4000);
  };

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
    showToast(
      lang === 'CZ'
        ? `"${itemName}" (${quantityToAdd} ks) přidáno do košíku.`
        : `"${itemName}" (${quantityToAdd} pcs) added to cart.`,
      'success'
    );
  };

  // Submit Order Action
  const submitOrder = async (order, creditApplied = 0) => {
    let updatedOrders = [];
    let newCredit = 0;
    setUser(prev => {
      updatedOrders = [order, ...prev.orderHistory];
      newCredit = Math.max(0, prev.storeCredit - creditApplied);
      return {
        ...prev,
        orderHistory: updatedOrders,
        storeCredit: newCredit
      };
    });

    setCart([]);
    setAppliedDiscount(null);

    // Save to Supabase if logged in
    try {
      const sessionRes = await supabase.auth.getSession();
      const session = sessionRes.data?.session;
      if (session) {
        await supabase
          .from('profiles')
          .upsert({
            id: session.user.id,
            order_history: updatedOrders,
            store_credit: newCredit
          });
      }
    } catch (err) {
      console.error('Failed to sync order history to Supabase:', err);
    }

    // Call Edge Function to export order to Pohoda
    try {
      await supabase.functions.invoke('pohoda-connector/export-order', {
        body: {
          order: {
            id: order.id,
            created_at: new Date().toISOString(),
            customer_name: order.customerName,
            customer_city: order.shippingCity,
            customer_street: order.shippingStreet,
            customer_zip: order.shippingZip,
            customer_email: order.customerEmail,
            customer_phone: order.customerPhone,
            payment_method: order.paymentMethod
          },
          items: order.items.map(item => ({
            name: item.name,
            product_id: item.id || item.product_id || item.name,
            quantity: item.quantity,
            price: item.price
          }))
        }
      });
    } catch (exportErr) {
      console.error('Pohoda order export invocation failed:', exportErr);
    }
  };

  // Submit Buylist Action
  const submitBuylist = async (submission) => {
    setBuylists(prev => [submission, ...prev]);
    let updatedBuylists = [];
    setUser(prev => {
      updatedBuylists = [submission, ...prev.buylistHistory];
      return {
        ...prev,
        buylistHistory: updatedBuylists
      };
    });

    try {
      const sessionRes = await supabase.auth.getSession();
      const session = sessionRes.data?.session;
      if (session) {
        await supabase
          .from('profiles')
          .upsert({ id: session.user.id, buylist_history: updatedBuylists });
      }
    } catch (err) {
      console.error('Failed to sync buylist history to Supabase:', err);
    }
  };

  // Submit Grading Action
  const submitGrading = async (submission) => {
    let updatedGrading = [];
    setUser(prev => {
      updatedGrading = [submission, ...prev.gradingSubmissions];
      return {
        ...prev,
        gradingSubmissions: updatedGrading
      };
    });

    try {
      const sessionRes = await supabase.auth.getSession();
      const session = sessionRes.data?.session;
      if (session) {
        await supabase
          .from('profiles')
          .upsert({ id: session.user.id, grading_submissions: updatedGrading });
      }
    } catch (err) {
      console.error('Failed to sync grading submissions to Supabase:', err);
    }
  };

  // Approve Buylist Action (Admin)
  const approveBuylist = (buylistId) => {
    setBuylists(prev => prev.map(bl => {
      if (bl.id !== buylistId) return bl;
      
      const updated = { ...bl, status: 'Schváleno - Vyplaceno' };
      const isStoreCredit = bl.payoutMethod && bl.payoutMethod.toLowerCase().includes('credit');

      setUser(prevUser => {
        const nextCredit = isStoreCredit 
          ? prevUser.storeCredit + bl.totalPayout 
          : prevUser.storeCredit;
        
        const updatedHistory = prevUser.buylistHistory.map(h => 
          h.id === buylistId ? { ...h, status: 'Schváleno - Vyplaceno' } : h
        );

        return {
          ...prevUser,
          storeCredit: nextCredit,
          buylistHistory: updatedHistory
        };
      });

      showToast(
        lang === 'CZ'
          ? (isStoreCredit 
              ? `Výkup ${bl.id} schválen. Částka ${bl.totalPayout.toLocaleString('cs-CZ')} Kč připsána jako Store Kredit.`
              : `Výkup ${bl.id} schválen k bankovnímu převodu.`)
          : (isStoreCredit
              ? `Buylist ${bl.id} approved. ${bl.totalPayout.toLocaleString('en-US')} CZK added as Store Credit.`
              : `Buylist ${bl.id} approved for bank transfer.`),
        'success'
      );

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
        setSelectedProductId={setSelectedProductId}
      />
      
      <main style={styles.mainContent}>
        {activePage === 'home' && (
          <Homepage 
            setActivePage={navigateToPage} 
            addToCart={addToCart} 
            products={dbProducts}
            setSelectedProductId={setSelectedProductId}
            setFilters={setFilters}
          />
        )}
        
        {activePage === 'singles-catalog' && (
          <SinglesCatalog 
            products={dbProducts}
            addToCart={addToCart}
            setSelectedProductId={setSelectedProductId}
            setActivePage={navigateToPage}
            filters={filters}
            setFilters={setFilters}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            alert={showToast}
          />
        )}

        {activePage === 'sealed-catalog' && (
          <SealedCatalog 
            products={dbProducts}
            addToCart={addToCart}
            setSelectedProductId={setSelectedProductId}
            setActivePage={navigateToPage}
            filters={filters}
            setFilters={setFilters}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />
        )}

        {activePage === 'slabs-catalog' && FEATURE_FLAGS.showSlabs && (
          <SlabsCatalog 
            products={dbProducts}
            addToCart={addToCart}
            setSelectedProductId={setSelectedProductId}
            setActivePage={navigateToPage}
            filters={filters}
            setFilters={setFilters}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />
        )}

        {activePage === 'sealed-detail' && (
          <SealedDetail 
            productId={selectedProductId}
            products={dbProducts}
            addToCart={addToCart}
            setSelectedProductId={setSelectedProductId}
            setActivePage={navigateToPage}
            setFilters={setFilters}
            alert={showToast}
            user={user}
            onOpenLogin={() => setIsLoginModalOpen(true)}
          />
        )}

        {activePage === 'singles-detail' && (
          <SinglesDetail 
            productId={selectedProductId}
            products={dbProducts}
            addToCart={addToCart}
            setSelectedProductId={setSelectedProductId}
            setActivePage={navigateToPage}
            setFilters={setFilters}
            alert={showToast}
            user={user}
            onOpenLogin={() => setIsLoginModalOpen(true)}
          />
        )}

        {activePage === 'buylist' && FEATURE_FLAGS.showBuylist && (
          <BuylistPortal 
            products={dbProducts}
            submitBuylist={submitBuylist}
            user={user}
            setActivePage={navigateToPage}
            alert={showToast}
          />
        )}

        {activePage === 'grading' && FEATURE_FLAGS.showGrading && (
          <GradingPortal 
            submitGrading={submitGrading}
            user={user}
            setActivePage={navigateToPage}
            alert={showToast}
          />
        )}

        {activePage === 'grading-guide' && FEATURE_FLAGS.showGrading && (
          <GradingGuide 
            setActivePage={navigateToPage}
          />
        )}

        {activePage === 'community' && (
          <CommunityTournaments />
        )}

        {activePage === 'support' && (
          <ContactPage setActivePage={navigateToPage} />
        )}

        {activePage === 'faq' && (
          <FaqPage setActivePage={navigateToPage} />
        )}

        {activePage === 'about' && (
          <AboutPage setActivePage={navigateToPage} />
        )}

        {activePage === 'blog' && (
          <Blog 
            selectedArticleId={selectedProductId}
            setSelectedProductId={setSelectedProductId}
            setActivePage={navigateToPage}
          />
        )}

        {activePage === 'checkout' && (
          <CheckoutFlow 
            cart={cart}
            user={user}
            submitOrder={submitOrder}
            setActivePage={navigateToPage}
            alert={showToast}
            onOpenLogin={() => setIsLoginModalOpen(true)}
            appliedDiscount={appliedDiscount}
            setAppliedDiscount={setAppliedDiscount}
          />
        )}

        {activePage === 'profile' && (
          <UserPortal 
            user={user}
            setUser={setUser}
            setActivePage={navigateToPage}
            onLogout={handleLogout}
            showToast={showToast}
          />
        )}

        {activePage === 'admin' && (
          <AdminPanel 
            showToast={showToast}
            setActivePage={navigateToPage}
          />
        )}

        {activePage === 'gdpr-vop' && (
          <GdprVop setActivePage={navigateToPage} initialTab={gdprVopTab} />
        )}

        {activePage === 'cart' && (
          <Cart 
            cart={cart} 
            setCart={setCart} 
            setActivePage={navigateToPage} 
            appliedDiscount={appliedDiscount}
            setAppliedDiscount={setAppliedDiscount}
            alert={showToast}
          />
        )}

        {activePage === 'favorites' && (
          <Favorites 
            products={dbProducts}
            addToCart={addToCart}
            setSelectedProductId={setSelectedProductId}
            setActivePage={navigateToPage}
          />
        )}

        {activePage === 'error' && (
          <ErrorPage setActivePage={navigateToPage} />
        )}
      </main>

      <Footer setActivePage={navigateToPage} activePage={activePage} />

      <LoginModal 
        isOpen={isLoginModalOpen} 
        onClose={() => setIsLoginModalOpen(false)} 
        onLogin={handleLogin} 
        onRegister={handleRegister} 
        showToast={showToast}
      />

      <ResetPasswordModal
        isOpen={isResetPasswordModalOpen}
        onClose={() => setIsResetPasswordModalOpen(false)}
        showToast={showToast}
      />

      {/* Premium Custom Toast Banner */}
      {toast.visible && (() => {
        const cartMatch = toast.message.match(/"([^"]+)"\s*\((\d+)\s*(?:ks|pcs)\)\s*(?:přidáno do košíku\.|added to cart\.)/);
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
                  {isCartAddition ? (lang === 'CZ' ? 'Košík aktualizován' : 'Cart updated') : (toast.title || (lang === 'CZ' ? 'Oznámení' : 'Notification'))}
                </span>
                <span className="premium-toast-body">
                  {isCartAddition ? (
                    lang === 'CZ' ? (
                      <>
                        Úspěšně jste přidali <strong>{productName}</strong> ({quantity} ks) do košíku.
                      </>
                    ) : (
                      <>
                        Successfully added <strong>{productName}</strong> ({quantity} pcs) to your cart.
                      </>
                    )
                  ) : (
                    toast.message
                  )}
                </span>
              </div>
              <button 
                className="premium-toast-close" 
                onClick={() => setToast(prev => ({ ...prev, visible: false }))}
                aria-label={lang === 'CZ' ? 'Zavřít' : 'Close'}
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
                  {lang === 'CZ' ? 'Zobrazit košík' : 'View Cart'}
                </button>
              </div>
            )}
            
            <div className="premium-toast-progress" />
          </div>
        );
      })()}

      <CookieConsent />
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
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
