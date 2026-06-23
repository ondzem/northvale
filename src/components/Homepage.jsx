import { useState, useEffect, useRef, useMemo } from 'react';
import { FEATURE_FLAGS } from '../config';
import { useTranslation } from '../context/LanguageContext';
import { fetchSlidesFromDB, DEFAULT_SLIDES } from '../services/slides';
import { fetchDailyDealFromDB } from '../services/dailyDeal';
import { fetchHomepageSectionsFromDB } from '../services/homepageSections';
import { fetchProductByIdFromDB } from '../services/products';

const ProductImage = ({ src, alt, className = '' }) => {
  const [aspectRatio, setAspectRatio] = useState(1.0);
  const [loaded, setLoaded] = useState(false);

  const handleLoad = (e) => {
    const { naturalWidth, naturalHeight } = e.target;
    if (naturalWidth && naturalHeight) {
      setAspectRatio(naturalWidth / naturalHeight);
    }
    setLoaded(true);
  };

  const fitClass = aspectRatio >= 1.1 ? 'ca-fit-contain' : 'ca-fit-cover';

  return (
    <img
      src={src}
      alt={alt || 'Northvale TCG produkt'}
      onLoad={handleLoad}
      className={`${className} ${fitClass} ${loaded ? 'loaded' : ''}`}
      loading="lazy"
    />
  );
};


export default function Homepage({ setActivePage, addToCart, products, setSelectedProductId, setFilters }) {
  const { lang, t } = useTranslation();
  // Mobile state detection (900px breakpoint for layout)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 900);
  // Image breakpoint detection (650px breakpoint for mobile images)
  const [useMobileImage, setUseMobileImage] = useState(window.innerWidth <= 650);
  // USP slider detection (970px breakpoint for USP carousel)
  const [isUspMobile, setIsUspMobile] = useState(window.innerWidth < 970);

  // Dynamic slides state initialized from SWR cache or empty array
  const [slides, setSlides] = useState(() => {
    try {
      const cached = localStorage.getItem('northvale-cached-slides');
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (err) {
      console.warn('Failed to load cached slides:', err);
    }
    return [];
  });

  const [loadedImages, setLoadedImages] = useState({});



  useEffect(() => {
    let active = true;
    async function loadSlides() {
      const dbSlides = await fetchSlidesFromDB();
      if (!active) return;
      const mapped = (dbSlides || []).map(slide => ({
        mobileImage: slide.mobile_image_url,
        desktopImage: slide.desktop_image_url,
        page: slide.redirect_page || null
      }));
      
      if (mapped.length > 0) {
        try {
          localStorage.setItem('northvale-cached-slides', JSON.stringify(mapped));
        } catch (err) {
          console.warn('Failed to cache slides:', err);
        }

        // Preload first slide images in background for both mobile and desktop
        let loadedCount = 0;
        const targetImages = [mapped[0].desktopImage, mapped[0].mobileImage].filter(Boolean);
        if (targetImages.length > 0) {
          targetImages.forEach(src => {
            const img = new Image();
            img.src = src;
            const onDone = () => {
              loadedCount++;
              if (loadedCount === targetImages.length && active) {
                setSlides(mapped);
              }
            };
            img.onload = onDone;
            img.onerror = onDone;
          });
          return;
        }
      } else {
        // If DB has no slides, fall back to DEFAULT_SLIDES but cache it too
        try {
          const defaultMapped = DEFAULT_SLIDES.map(slide => ({
            mobileImage: slide.mobile_image_url,
            desktopImage: slide.desktop_image_url,
            page: slide.redirect_page || null
          }));
          localStorage.setItem('northvale-cached-slides', JSON.stringify(defaultMapped));
          setSlides(defaultMapped);
          return;
        } catch (err) {
          console.warn('Failed to set default fallback:', err);
        }
      }
      setSlides(mapped);
    }
    loadSlides();
    return () => {
      active = false;
    };
  }, []);

  // Preload remaining slide images in the background to prevent flashing during transitions
  useEffect(() => {
    if (slides.length > 1) {
      slides.forEach((slide) => {
        if (slide.desktopImage) {
          const img1 = new Image();
          img1.src = slide.desktopImage;
        }
        if (slide.mobileImage) {
          const img2 = new Image();
          img2.src = slide.mobileImage;
        }
      });
    }
  }, [slides]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 900);
      setUseMobileImage(window.innerWidth <= 650);
      setIsUspMobile(window.innerWidth < 970);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // USP slideshow ref & data
  const uspScrollRef = useRef(null);
  const uspItems = [
    { icon: '/truck-moving.png', title: lang === 'CZ' ? 'Doprava zdarma' : 'Free Shipping', desc: lang === 'CZ' ? 'při objednávce nad 1 000 Kč' : 'on orders over 1,000 Kč' },
    { icon: '/tachometer-fast.png', title: lang === 'CZ' ? 'Rychlost doručení' : 'Fast Shipping', desc: lang === 'CZ' ? 'Odesíláme do 24 hodin' : 'Dispatched within 24 hours' },
    { icon: '/badget-check-alt.png', title: lang === 'CZ' ? '100% Originální' : '100% Authentic', desc: lang === 'CZ' ? 'Pouze od ověřených distributorů' : 'Only from verified distributors' },
    { icon: '/credit-card.png', title: lang === 'CZ' ? 'Bezpečná platba' : 'Secure Payment', desc: lang === 'CZ' ? 'Karta, bankovní převod, dobírka' : 'Cards, bank transfer, COD' }
  ];

  const handleUspScroll = (direction) => {
    if (uspScrollRef.current) {
      const scrollAmount = uspScrollRef.current.clientWidth;
      uspScrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  // Slideshow state & swipe gesture logic for hero slideshow
  const [currentSlide, setCurrentSlide] = useState(0);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    if (isLeftSwipe) {
      nextSlide();
    } else if (isRightSwipe) {
      prevSlide();
    }
  };

  // Safety check to keep current slide selection within bounds on array changes
  useEffect(() => {
    if (currentSlide >= slides.length && slides.length > 0) {
      setCurrentSlide(slides.length - 1);
    }
  }, [slides, currentSlide]);

  // Deal data state with localStorage fallback
  const [deal, setDeal] = useState(() => {
    try {
      const cached = localStorage.getItem('northvale-cached-deal');
      if (cached) return JSON.parse(cached);
    } catch (e) {
      console.warn('Failed to load cached daily deal on homepage:', e);
    }
    return null;
  });

  useEffect(() => {
    let active = true;
    async function loadDailyDeal() {
      const dbDeal = await fetchDailyDealFromDB();
      if (active && dbDeal) {
        setDeal(dbDeal);
        try {
          localStorage.setItem('northvale-cached-deal', JSON.stringify(dbDeal));
        } catch (e) {
          console.warn('Failed to cache daily deal:', e);
        }
      }
    }
    loadDailyDeal();
    return () => {
      active = false;
    };
  }, []);

  const fallbackEndsAt = useMemo(() => new Date(Date.now() + 14.5 * 3600 * 1000).toISOString(), []);

  const activeDeal = deal || {
    name: 'Booster Box SV06 Twilight Masquerade',
    image_url: '/9.png',
    stock: 14,
    price: 2690,
    original_price: 3590,
    ends_at: fallbackEndsAt,
    product_id: 'deal-of-the-day'
  };

  // Deal of the day countdown timer
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  
  // Deal Button micro-animation state
  const [dealAdded, setDealAdded] = useState(false);
  const [isBtnHoveredVertical, setIsBtnHoveredVertical] = useState(false);
  const [isBtnHoveredHorizontal, setIsBtnHoveredHorizontal] = useState(false);
  const [dealProductState, setDealProductState] = useState(null);

  useEffect(() => {
    let active = true;
    async function loadProduct() {
      if (activeDeal && activeDeal.product_id) {
        const prod = await fetchProductByIdFromDB(activeDeal.product_id);
        if (active) {
          setDealProductState(prod);
        }
      }
    }
    loadProduct();
    return () => {
      active = false;
    };
  }, [activeDeal.product_id]);

  useEffect(() => {
    if (!activeDeal.ends_at) return;

    const updateTimer = () => {
      const endsAt = new Date(activeDeal.ends_at).getTime();
      const diff = endsAt - Date.now();

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const totalSecs = Math.floor(diff / 1000);
      const d = Math.floor(totalSecs / (3600 * 24));
      const h = Math.floor((totalSecs % (3600 * 24)) / 3600);
      const m = Math.floor((totalSecs % 3600) / 60);
      const s = totalSecs % 60;

      setTimeLeft({ days: d, hours: h, minutes: m, seconds: s });
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [activeDeal.ends_at]);

  const nextSlide = () => {
    setCurrentSlide((currentSlide + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((currentSlide - 1 + slides.length) % slides.length);
  };

  useEffect(() => {
    if (slides.length <= 1) return;
    const interval = setInterval(() => {
      nextSlide();
    }, 5000);
    return () => clearInterval(interval);
  }, [slides, currentSlide]);

  const [sectionConfig, setSectionConfig] = useState(() => {
    try {
      const cached = localStorage.getItem('northvale-cached-sections');
      if (cached) return JSON.parse(cached);
    } catch (e) {
      console.warn('Failed to parse cached sections:', e);
    }
    return {
      newArrivals: [],
      preorders: [],
      accessories: []
    };
  });

  useEffect(() => {
    async function loadSections() {
      const data = await fetchHomepageSectionsFromDB();
      if (data) {
        setSectionConfig(data);
      }
    }
    loadSections();
  }, []);

  const getSectionProducts = (sectionKey, defaultFilter) => {
    const configuredIds = sectionConfig[sectionKey] || [];
    if (configuredIds.length > 0) {
      return configuredIds
        .map(id => products.find(p => p.id === id))
        .filter(Boolean);
    }
    return products.filter(defaultFilter).slice(0, 5);
  };

  const newArrivals = getSectionProducts('newArrivals', p => p.type === 'single');
  const preorders = getSectionProducts('preorders', p => p.type === 'sealed' && p.preorder);
  const gradedCards = products.filter(p => p.type === 'slab').slice(0, 5);
  const accessories = getSectionProducts('accessories', p => p.type === 'accessory');
  const newArrivalsRef = useRef(null);
  const preordersRef = useRef(null);
  const gradedCardsRef = useRef(null);
  const accessoriesRef = useRef(null);
  const testimonialsRef = useRef(null);

  const testimonials = [
    {
      initials: 'FK',
      name: 'Filip K.',
      desc: 'Pardubice',
      text: lang === 'CZ'
        ? '„Karty dorazily v naprosto bezchybném stavu. Kartonový sendvič a toploader bez lepidla jsou přesně to, co od sběratelského obchodu očekávám. Tímto děkuji za super přístup a skvělou komunikaci.“'
        : '“The cards arrived in absolutely perfect condition. The cardboard sandwich and glue-free toploader are exactly what I expect from a collector-focused store. Thank you for the awesome service and great communication.”'
    },
    {
      initials: 'MR',
      name: 'Monika R.',
      desc: lang === 'CZ' ? 'UPCE student' : 'UPCE Student',
      text: lang === 'CZ'
        ? `„Oceňuji možnost doručení kusovek na odběrné místo v kavárně v centru Pardubic. Neplatím žádné poštovné pro malé objednávky a k tomu dostanu výbornou kávu. ${FEATURE_FLAGS.showBuylist ? 'Výkup proběhl' : 'Nákup proběhl'} naprosto hladce.“`
        : `“I appreciate the option to pick up my singles at the pickup point in a cafe in Pardubice city center. I don't pay any shipping for small orders and I get a delicious coffee to boot. The ${FEATURE_FLAGS.showBuylist ? 'buylist trade' : 'purchase'} went incredibly smoothly.”`
    },
    FEATURE_FLAGS.showGrading && {
      initials: 'PS',
      name: 'Petr S.',
      desc: 'Hradec Králové',
      text: lang === 'CZ'
        ? '„Nechal jsem si přes ně nagradovat pět drahých Pokémon karet u PSA. Celý proces šlo sledovat online v mém profilu, vše bylo pojištěné a výsledné známky (tři desítky!) předčily mé očekávání.“'
        : '“I submitted five expensive Pokémon cards for grading to PSA through Northvale. The entire process was fully trackable online in my profile, fully insured, and the grades (three Gem Mints!) exceeded my expectations.”'
    },
    {
      initials: 'JM',
      name: 'Jana M.',
      desc: 'Pardubice',
      text: lang === 'CZ'
        ? '„Jako rodič velmi oceňuji dárkového průvodce. Vůbec se v Pokémon edicích nevyznám, ale s jejich dárkovým setem pod stromečkem mělo dítě obrovskou radost a já měl jistotu, že nekupuji fake karty.“'
        : '“As a parent, I highly appreciate their gift guide. I don\'t understand Pokémon sets at all, but their gift bundle under the Christmas tree made my child extremely happy, and I was sure I wasn\'t buying counterfeit cards.”'
    }
  ].filter(Boolean);

  const handleScroll = (ref, direction) => {
    if (ref.current) {
      const isCurrentlyMobile = window.innerWidth <= 650;
      const scrollAmount = isCurrentlyMobile ? 232 : 280;
      ref.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const getDealStock = () => {
    if (activeDeal.stock && Number(activeDeal.stock) > 0) {
      return Number(activeDeal.stock);
    }
    if (dealProductState) {
      if (dealProductState.variants && dealProductState.variants.length > 0) {
        return dealProductState.variants.reduce((sum, v) => sum + Number(v.stock || 0), 0);
      }
      return Number(dealProductState.stock || 0);
    }
    return Number(activeDeal.stock || 0);
  };
  const dealProductStock = getDealStock();
  const dealProductPrice = Number(activeDeal.price || 0);
  const dealProductOriginalPrice = activeDeal.original_price ? Number(activeDeal.original_price) : null;
  const discountPercent = dealProductOriginalPrice 
    ? Math.round(((dealProductOriginalPrice - dealProductPrice) / dealProductOriginalPrice) * 100)
    : 0;

  const catalogProduct = dealProductState;
  const dealProduct = catalogProduct || {
    id: activeDeal.product_id || 'deal-of-the-day',
    name: activeDeal.name,
    image: activeDeal.image_url || '/9.png',
    stock: dealProductStock,
    price: dealProductPrice,
    originalPrice: dealProductOriginalPrice,
    type: 'sealed'
  };

  const handleCardClick = (product) => {
    if (!catalogProduct || product.id === 'deal-of-the-day') return;
    setSelectedProductId(product.id);
    if (product.type === 'single' || product.type === 'slab') {
      setActivePage('singles-detail');
    } else {
      setActivePage('sealed-detail');
    }
  };

  const handleBuyDealClick = (e) => {
    if (e) e.stopPropagation();
    const productToBuy = catalogProduct || dealProduct;
    const cartProduct = {
      ...productToBuy,
      name: activeDeal.name,
      price: dealProductPrice,
      originalPrice: dealProductOriginalPrice,
      image: activeDeal.image_url || productToBuy.image,
      stock: dealProductStock
    };

    const cartVariant = productToBuy.variants && productToBuy.variants.length > 0 
      ? { 
          ...productToBuy.variants[0], 
          price: dealProductPrice, 
          stock: dealProductStock 
        } 
      : cartProduct;

    addToCart(cartVariant, cartProduct);
    setDealAdded(true);
    setTimeout(() => {
      setDealAdded(false);
    }, 1500);
  };



  const currentImageUrl = slides && slides.length > 0 && slides[currentSlide]
    ? (useMobileImage ? slides[currentSlide].mobileImage : slides[currentSlide].desktopImage)
    : null;
  const isCurrentLoaded = !!loadedImages[currentImageUrl];

  return (
    <div style={{ ...styles.container, paddingTop: isMobile ? '12px' : '24px', paddingBottom: isMobile ? '40px' : '96px', gap: isMobile ? '48px' : '88px' }} className="fade-in">
      <h1 className="sr-only">{lang === 'CZ' ? 'NORTHVALE TCG - Váš specializovaný e-shop pro Pokémon, Lorcana, One Piece a grading karet' : 'NORTHVALE TCG - Your specialized store for Pokémon, Lorcana, One Piece and card grading'}</h1>

      {/* Hero Section */}
      <section style={{ ...styles.heroSection, marginTop: isMobile ? '12px' : '64px', gap: isMobile ? '16px' : '24px' }} className="container">
        {/* Slideshow Wrapper (70% width) */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          flex: !isMobile ? '7.3 1 66%' : '7 1 60%', 
          minWidth: isMobile ? '100%' : '280px'
        }}>
          <div 
            style={{ 
              ...styles.slideshow, 
              flex: 'none', 
              width: '100%', 
              height: 'auto',
              aspectRatio: useMobileImage ? '800 / 1000' : '1920 / 840',
              padding: '0',
              backgroundColor: 'var(--bg-secondary)', 
              cursor: (slides && slides[currentSlide]?.page) ? 'pointer' : 'default',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              boxShadow: '0 24px 50px rgba(0, 0, 0, 0.45)',
              backdropFilter: 'none',
              WebkitBackdropFilter: 'none',
              position: 'relative',
              overflow: 'hidden'
            }} 
            onClick={() => {
              if (slides && slides[currentSlide]?.page) {
                const path = slides[currentSlide].page;
                if (path.startsWith('http') || path.startsWith('/') || path.includes('.')) {
                  if (path.startsWith('http')) {
                    window.open(path, '_blank');
                  } else {
                    const pageMap = {
                      'home': 'home',
                      'sealed-catalog': 'sealed-catalog',
                      'singles-catalog': 'singles-catalog',
                      'slabs-catalog': 'slabs-catalog',
                      'grading': 'grading',
                      'buylist': 'buylist',
                      'about': 'about',
                      'support': 'support'
                    };
                    const cleanPath = path.replace(/^\//, '');
                    if (pageMap[cleanPath]) {
                      setFilters({});
                      setActivePage(pageMap[cleanPath]);
                    } else {
                      window.location.href = path;
                    }
                  }
                } else {
                  setFilters({});
                  setActivePage(path);
                }
              }
            }}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            {currentImageUrl && (
              <img 
                src={currentImageUrl}
                alt={lang === 'CZ' ? 'Akční nabídka a novinky - Northvale TCG' : 'Special offer and news - Northvale TCG'}
                loading="eager"
                fetchpriority="high"
                onLoad={() => {
                  setLoadedImages(prev => ({ ...prev, [currentImageUrl]: true }));
                }}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                  opacity: isCurrentLoaded ? 1 : 0,
                  transition: 'opacity 0.2s ease-in-out',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  zIndex: 1
                }}
              />
            )}

            {slides && slides.length > 1 && (
              <button 
                type="button" 
                onClick={(e) => { e.stopPropagation(); prevSlide(); }} 
                style={{ ...styles.slideArrow, left: '20px', zIndex: 2 }}
                aria-label="Předchozí snímek"
              >
                ‹
              </button>
            )}
            {slides && slides.length > 1 && (
              <button 
                type="button" 
                onClick={(e) => { e.stopPropagation(); nextSlide(); }} 
                style={{ ...styles.slideArrow, right: '20px', zIndex: 2 }}
                aria-label="Další snímek"
              >
                ›
              </button>
            )}
            {slides && slides.length > 1 && (
              <div 
                style={{ 
                  ...styles.indicators, 
                  position: 'absolute', 
                  bottom: '16px', 
                  left: '50%', 
                  transform: 'translateX(-50%)', 
                  zIndex: 10,
                  margin: 0
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {slides.map((_, idx) => (
                  <span 
                    key={idx} 
                    style={{
                      ...styles.dot, 
                      width: currentSlide === idx ? '32px' : '16px',
                      backgroundColor: currentSlide === idx ? 'var(--color-gold)' : 'rgba(255,255,255,0.2)'
                    }}
                    onClick={() => setCurrentSlide(idx)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Deal of the Day */}
        <div style={{ 
          ...styles.dealWidget, 
          flex: !isMobile ? '2.7 1 22%' : '3 1 25%',
          height: !isMobile ? 'auto' : (useMobileImage ? '410px' : '380px'), 
          padding: (!isMobile || useMobileImage) ? '16px 16px 0 16px' : '0 16px 0 0',
          flexDirection: (!isMobile || useMobileImage) ? 'column' : 'row',
          alignItems: 'stretch',
          justifyContent: 'space-between',
          overflow: 'hidden'
        }} className="glass-panel deal-widget-banner">
          
          {(!isMobile || useMobileImage) ? (
            // --- VERTICAL LAYOUT (DESKTOP & MOBILE) ---
            <>
              {/* Product link wrapping title and image */}
              <a 
                href={dealProduct.id && dealProduct.id !== 'deal-of-the-day' ? (dealProduct.type === 'single' || dealProduct.type === 'slab' ? `/singles-detail/${dealProduct.id}` : `/sealed-detail/${dealProduct.id}`) : '#'} 
                style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', height: '100%', flex: '1 1 auto', width: '100%' }} 
                onClick={(e) => { 
                  if (e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey && dealProduct.id && dealProduct.id !== 'deal-of-the-day') { 
                    e.preventDefault(); 
                    handleCardClick(dealProduct); 
                  } 
                }}
              >
                {/* Top: Title */}
                <h3 style={{ 
                  fontSize: '17px', 
                  fontWeight: '700', 
                  color: 'var(--text-main)', 
                  margin: '4px 0 0 0',
                  textAlign: 'left',
                  lineHeight: '1.4',
                  cursor: catalogProduct ? 'pointer' : 'default',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  height: '48px',
                  fontFamily: 'var(--font-heading)',
                  position: 'relative',
                  zIndex: 10
                }}>
                  {activeDeal.name}
                </h3>

                {/* Center: Image Container */}
                <div style={{
                  height: !isMobile ? '230px' : '175px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  zIndex: 1,
                  cursor: catalogProduct ? 'pointer' : 'default',
                  marginTop: '16px',
                  marginBottom: '8px',
                  width: '100%'
                }}>
                  <img 
                    src={activeDeal.image_url || '/logo s popisem.webp'} 
                    alt={activeDeal.name || 'Akční nabídka - Northvale TCG'} 
                    width={!isMobile ? "164" : "125"}
                    height={!isMobile ? "230" : "175"}
                    style={{ 
                      maxHeight: '100%', 
                      maxWidth: '100%', 
                      objectFit: 'contain',
                      transform: 'scale(1) translateY(4px)',
                      transition: 'transform 0.3s ease'
                    }} 
                  />
                  {/* Floating stock badge */}
                  <span style={{
                    position: 'absolute',
                    top: '4px',
                    left: '4px',
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    color: 'var(--text-main)',
                    fontWeight: '700',
                    fontSize: '9px',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}>
                    {lang === 'CZ' ? `Zbývá ${dealProductStock} kusů` : `${dealProductStock} pcs left`}
                  </span>
                </div>
              </a>

              {/* Below Title: Price & Button Row */}
              <div style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                width: '100%',
                marginTop: 'auto',
                marginBottom: '14px',
                position: 'relative',
                zIndex: 10
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {discountPercent > 0 && (
                      <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--color-red)' }}>
                        -{discountPercent} %
                      </span>
                    )}
                    {dealProductOriginalPrice && (
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', textDecoration: 'line-through' }}>
                        {dealProductOriginalPrice.toLocaleString()} Kč
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: !isMobile ? '19px' : '18px', fontWeight: '800', color: 'var(--color-gold)', marginTop: '2px', whiteSpace: 'nowrap' }}>
                    {dealProductPrice.toLocaleString()} Kč
                  </span>
                </div>

                <button 
                  className="btn btn-primary" 
                  onMouseEnter={() => setIsBtnHoveredVertical(true)}
                  onMouseLeave={() => setIsBtnHoveredVertical(false)}
                  style={{
                    backgroundColor: dealAdded 
                      ? 'var(--color-gold-hover)' 
                      : (isBtnHoveredVertical ? 'var(--color-gold-hover)' : 'var(--color-gold)'),
                    color: '#000',
                    fontWeight: '700',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    border: 'none',
                    cursor: (dealProductStock > 0) ? 'pointer' : 'not-allowed',
                    opacity: 1,
                    flex: '0 0 auto',
                    minWidth: '110px',
                    transform: dealAdded ? 'scale(0.95)' : (isBtnHoveredVertical ? 'scale(1.05)' : 'scale(1)'),
                    transition: 'all 0.15s ease',
                    boxShadow: isBtnHoveredVertical 
                      ? '0 6px 16px rgba(253, 189, 22, 0.3)' 
                      : '0 4px 12px rgba(253, 189, 22, 0.15)'
                  }}
                  disabled={dealProductStock === 0}
                  onClick={handleBuyDealClick}
                >
                  <img 
                    src="/shopping-cart.png" 
                    alt="" 
                    width="14"
                    height="14"
                    style={{ 
                      width: '14px', 
                      height: '14px', 
                      filter: 'brightness(0)' 
                     }} 
                  />
                  {dealAdded ? (lang === 'CZ' ? 'Přidáno' : 'Added') : (lang === 'CZ' ? 'Do košíku' : 'Add to Cart')}
                </button>
              </div>

              {/* Bottom: Floating gold Countdown Banner */}
              <div style={{
                background: 'var(--color-gold)', 
                borderRadius: 'var(--radius-md)',
                padding: '16px 12px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                width: 'calc(100% + 2px)',
                margin: '0 -1px 15px -1px',
                boxSizing: 'border-box',
                boxShadow: '0 4px 12px rgba(253, 189, 22, 0.2)'
              }}>
                <span style={{ 
                  fontSize: '10px', 
                  fontWeight: '800', 
                  color: '#000', 
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  marginBottom: '6px'
                }}>
                  {lang === 'CZ' ? 'Akce dne' : 'Deal of the day'}
                </span>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: timeLeft.days > 0 ? '8px' : '14px',
                  color: '#000'
                }}>
                  {timeLeft.days > 0 && (
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
                      <span style={{ fontSize: '18px', fontWeight: '800' }}>
                        {timeLeft.days}
                      </span>
                      <span style={{ fontSize: '10px', color: 'rgba(0, 0, 0, 0.65)', fontWeight: '500' }}>
                        {lang === 'CZ' ? (timeLeft.days === 1 ? 'den' : timeLeft.days < 5 ? 'dny' : 'dní') : (timeLeft.days === 1 ? 'day' : 'days')}
                      </span>
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
                    <span style={{ fontSize: '18px', fontWeight: '800' }}>
                      {timeLeft.hours.toString().padStart(2, '0')}
                    </span>
                    <span style={{ fontSize: '10px', color: 'rgba(0, 0, 0, 0.65)', fontWeight: '500' }}>{lang === 'CZ' ? 'hodin' : 'hours'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
                    <span style={{ fontSize: '18px', fontWeight: '800' }}>
                      {timeLeft.minutes.toString().padStart(2, '0')}
                    </span>
                    <span style={{ fontSize: '10px', color: 'rgba(0, 0, 0, 0.65)', fontWeight: '500' }}>{lang === 'CZ' ? 'minut' : 'mins'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
                    <span style={{ fontSize: '18px', fontWeight: '800' }}>
                      {timeLeft.seconds.toString().padStart(2, '0')}
                    </span>
                    <span style={{ fontSize: '10px', color: 'rgba(0, 0, 0, 0.65)', fontWeight: '500' }}>{lang === 'CZ' ? 'sekund' : 'secs'}</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            // --- HORIZONTAL SPLIT LAYOUT (TABLET 650px - 900px) ---
            <>
              {/* Left Column: Vertical Countdown Banner */}
              <div style={{
                background: 'var(--color-gold)', 
                borderRadius: 'var(--radius-md)',
                padding: '24px 12px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                width: '120px',
                minWidth: '120px',
                margin: '15px 0 15px 15px',
                boxSizing: 'border-box',
                boxShadow: '0 4px 12px rgba(253, 189, 22, 0.2)'
              }}>
                <span style={{ 
                  fontSize: '10px', 
                  fontWeight: '800', 
                  color: '#000', 
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  marginBottom: '16px',
                  textAlign: 'center'
                }}>
                  {lang === 'CZ' ? 'Akce dne' : 'Deal of the day'}
                </span>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: timeLeft.days > 0 ? '12px' : '20px',
                  color: '#000'
                }}>
                  {timeLeft.days > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                      <span style={{ fontSize: '24px', fontWeight: '800', lineHeight: '1' }}>
                        {timeLeft.days}
                      </span>
                      <span style={{ fontSize: '9px', color: 'rgba(0, 0, 0, 0.65)', textTransform: 'uppercase', fontWeight: '500' }}>
                        {lang === 'CZ' ? (timeLeft.days === 1 ? 'den' : timeLeft.days < 5 ? 'dny' : 'dní') : (timeLeft.days === 1 ? 'day' : 'days')}
                      </span>
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                    <span style={{ fontSize: '24px', fontWeight: '800', lineHeight: '1' }}>
                      {timeLeft.hours.toString().padStart(2, '0')}
                    </span>
                    <span style={{ fontSize: '9px', color: 'rgba(0, 0, 0, 0.65)', textTransform: 'uppercase', fontWeight: '500' }}>{lang === 'CZ' ? 'hodin' : 'hours'}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                    <span style={{ fontSize: '24px', fontWeight: '800', lineHeight: '1' }}>
                      {timeLeft.minutes.toString().padStart(2, '0')}
                    </span>
                    <span style={{ fontSize: '9px', color: 'rgba(0, 0, 0, 0.65)', textTransform: 'uppercase', fontWeight: '500' }}>{lang === 'CZ' ? 'minut' : 'mins'}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                    <span style={{ fontSize: '24px', fontWeight: '800', lineHeight: '1' }}>
                      {timeLeft.seconds.toString().padStart(2, '0')}
                    </span>
                    <span style={{ fontSize: '9px', color: 'rgba(0, 0, 0, 0.65)', textTransform: 'uppercase', fontWeight: '500' }}>{lang === 'CZ' ? 'sekund' : 'secs'}</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Product Details & Layout */}
              <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '16px 0 16px 16px',
                boxSizing: 'border-box'
              }}>
                {/* Title (Enlarged) */}
                <a 
                  href={dealProduct.id && dealProduct.id !== 'deal-of-the-day' ? (dealProduct.type === 'single' || dealProduct.type === 'slab' ? `/singles-detail/${dealProduct.id}` : `/sealed-detail/${dealProduct.id}`) : '#'} 
                  style={{ textDecoration: 'none', color: 'inherit' }} 
                  onClick={(e) => { 
                    if (e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey && dealProduct.id && dealProduct.id !== 'deal-of-the-day') { 
                      e.preventDefault(); 
                      handleCardClick(dealProduct); 
                    } 
                  }}
                >
                  <h3 style={{ 
                    fontSize: '18px', 
                    fontWeight: '800', 
                    color: 'var(--text-main)', 
                    margin: '0 0 8px 0',
                    textAlign: 'left',
                    lineHeight: '1.3',
                    cursor: catalogProduct ? 'pointer' : 'default',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    fontFamily: 'var(--font-heading)'
                  }}>
                    {activeDeal.name}
                  </h3>
                </a>

                {/* Split row: Left (enlarged image shifted left) & Right (stacked details) */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'stretch',
                  gap: '12px',
                  flex: 1,
                  minHeight: '180px'
                }}>
                  {/* Left part: Image Container (shifted all the way to left, enlarged) */}
                  <a 
                    href={dealProduct.id && dealProduct.id !== 'deal-of-the-day' ? (dealProduct.type === 'single' || dealProduct.type === 'slab' ? `/singles-detail/${dealProduct.id}` : `/sealed-detail/${dealProduct.id}`) : '#'} 
                    style={{ flex: '1.2 1 0%', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', position: 'relative', textDecoration: 'none' }} 
                    onClick={(e) => { 
                      if (e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey && dealProduct.id && dealProduct.id !== 'deal-of-the-day') { 
                        e.preventDefault(); 
                        handleCardClick(dealProduct); 
                      } 
                    }}
                  >
                    <div style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-start',
                      cursor: catalogProduct ? 'pointer' : 'default'
                    }}>
                      <img 
                        src={activeDeal.image_url || '/logo s popisem.webp'} 
                        alt={activeDeal.name || 'Akční nabídka - Northvale TCG'} 
                        width="185"
                        height="185"
                        style={{ 
                          maxHeight: '100%', 
                          maxWidth: '100%', 
                          objectFit: 'contain',
                          transform: 'scale(1.25) translate(-28px, 16px)',
                          transformOrigin: 'left center'
                        }} 
                      />
                    </div>
                  </a>

                  {/* Right part: Prices, Stock badge, and Buy Button vertically stacked */}
                  <div style={{
                    flex: '1 1 0%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'flex-start',
                    gap: '10px',
                    paddingLeft: '4px'
                  }}>
                    {/* Stock badge */}
                    <span style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.08)',
                      color: 'var(--text-main)',
                      fontWeight: '700',
                      fontSize: '10px',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      marginBottom: '2px'
                    }}>
                      {lang === 'CZ' ? `Zbývá ${dealProductStock} kusů` : `${dealProductStock} pcs left`}
                    </span>

                    {/* Pricing */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {discountPercent > 0 && (
                          <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--color-red)' }}>
                            -{discountPercent} %
                          </span>
                        )}
                        {dealProductOriginalPrice && (
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', textDecoration: 'line-through' }}>
                            {dealProductOriginalPrice.toLocaleString()} Kč
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '19px', fontWeight: '800', color: 'var(--color-gold)', marginTop: '1px' }}>
                        {dealProductPrice.toLocaleString()} Kč
                      </span>
                    </div>

                    {/* Buy Button */}
                    <button 
                      className="btn btn-primary" 
                      onMouseEnter={() => setIsBtnHoveredHorizontal(true)}
                      onMouseLeave={() => setIsBtnHoveredHorizontal(false)}
                      style={{
                        backgroundColor: dealAdded 
                          ? 'var(--color-gold-hover)' 
                          : (isBtnHoveredHorizontal ? 'var(--color-gold-hover)' : 'var(--color-gold)'),
                        color: '#000',
                        fontWeight: '700',
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        border: 'none',
                        cursor: (dealProductStock > 0) ? 'pointer' : 'not-allowed',
                        opacity: 1,
                        width: '120px',
                        transform: dealAdded ? 'scale(0.95)' : (isBtnHoveredHorizontal ? 'scale(1.05)' : 'scale(1)'),
                        transition: 'all 0.15s ease',
                        boxShadow: isBtnHoveredHorizontal 
                          ? '0 6px 16px rgba(253, 189, 22, 0.3)' 
                          : '0 4px 12px rgba(253, 189, 22, 0.15)'
                      }}
                      disabled={dealProductStock === 0}
                      onClick={handleBuyDealClick}
                    >
                      <img 
                        src="/shopping-cart.png" 
                        alt="" 
                        width="14"
                        height="14"
                        style={{ 
                          width: '14px', 
                          height: '14px', 
                          filter: 'brightness(0)' 
                        }} 
                      />
                      {dealAdded ? (lang === 'CZ' ? 'Přidáno' : 'Added') : (lang === 'CZ' ? 'Do košíku' : 'Add to Cart')}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      {/* USP Bar */}
      {isUspMobile ? (
        <section 
          style={{ 
            ...styles.uspBar, 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 16px',
            position: 'relative'
          }}
          className="container"
        >
          <button 
            className="usp-arrow-btn" 
            onClick={() => handleUspScroll('left')}
            aria-label="Předchozí výhoda"
          >
            ‹
          </button>
          
          <div 
            ref={uspScrollRef}
            className="usp-scroll-container"
            style={{
              display: 'flex',
              flexDirection: 'row',
              overflowX: 'auto',
              scrollBehavior: 'smooth',
              scrollSnapType: 'x mandatory',
              WebkitOverflowScrolling: 'touch',
              flex: 1,
              gap: '0px',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none'
            }}
          >
            {uspItems.map((item, idx) => (
              <div 
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '16px',
                  minWidth: '100%',
                  flexShrink: 0,
                  scrollSnapAlign: 'center',
                  padding: '4px 0'
                }}
              >
                <img 
                  src={item.icon} 
                  alt={item.title || 'Northvale TCG'} 
                  width="36"
                  height="36"
                  style={styles.uspIcon} 
                />
                <div style={styles.uspText}>
                  <h4 style={{ ...styles.uspTitle, margin: 0 }}>{item.title}</h4>
                  <p style={{ ...styles.uspDesc, margin: '3px 0 0' }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <button 
            className="usp-arrow-btn" 
            onClick={() => handleUspScroll('right')}
            aria-label="Další výhoda"
          >
            ›
          </button>
        </section>
      ) : (
        <section style={styles.uspBar} className="container">
          <div style={{ ...styles.uspBox, borderRight: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <img src="/truck-moving.png" alt={lang === 'CZ' ? 'Doprava zdarma' : 'Free Shipping'} width="36" height="36" style={styles.uspIcon} />
            <div style={styles.uspText}>
              <h4 style={styles.uspTitle}>{lang === 'CZ' ? 'Doprava zdarma' : 'Free Shipping'}</h4>
              <p style={styles.uspDesc}>{lang === 'CZ' ? 'při objednávce nad 1 000 Kč' : 'on orders over 1,000 Kč'}</p>
            </div>
          </div>
          <div style={{ ...styles.uspBox, borderRight: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <img src="/tachometer-fast.png" alt={lang === 'CZ' ? 'Rychlost doručení' : 'Fast Delivery'} width="36" height="36" style={styles.uspIcon} />
            <div style={styles.uspText}>
              <h4 style={styles.uspTitle}>{lang === 'CZ' ? 'Rychlost doručení' : 'Fast Shipping'}</h4>
              <p style={styles.uspDesc}>{lang === 'CZ' ? 'Odesíláme do 24 hodin' : 'Dispatched within 24 hours'}</p>
            </div>
          </div>
          <div style={{ ...styles.uspBox, borderRight: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <img src="/badget-check-alt.png" alt={lang === 'CZ' ? '100% Originální' : '100% Authentic'} width="36" height="36" style={styles.uspIcon} />
            <div style={styles.uspText}>
              <h4 style={styles.uspTitle}>{lang === 'CZ' ? '100% Originální' : '100% Authentic'}</h4>
              <p style={styles.uspDesc}>{lang === 'CZ' ? 'Pouze od ověřených distributorů' : 'Only from verified distributors'}</p>
            </div>
          </div>
          <div style={styles.uspBox}>
            <img src="/credit-card.png" alt={lang === 'CZ' ? 'Bezpečná platba' : 'Secure Payment'} width="36" height="36" style={styles.uspIcon} />
            <div style={styles.uspText}>
              <h4 style={styles.uspTitle}>{lang === 'CZ' ? 'Bezpečná platba' : 'Secure Payment'}</h4>
              <p style={styles.uspDesc}>{lang === 'CZ' ? 'Karta, bankovní převod, dobírka' : 'Cards, bank transfer, COD'}</p>
            </div>
          </div>
        </section>
      )}

      {/* Founders Story Section Wrapper */}
      <div className="founders-story-wrapper">
        <section className="container founders-story-container">
          {/* Left Side: Rich text content */}
          <div className="founders-story-text-column">
            <div>
              <span style={{
                fontSize: '11px',
                fontWeight: '800',
                color: 'var(--color-gold)',
                textTransform: 'uppercase',
                letterSpacing: '1.5px',
                display: 'block',
                marginBottom: '6px'
              }}>
                {lang === 'CZ' ? 'Příběh Northvale' : 'The Northvale Story'}
              </span>
              <h2 style={{
                fontSize: isMobile ? '28px' : '36px',
                fontWeight: '800',
                color: 'var(--text-main)',
                lineHeight: '1.15',
                margin: 0,
                fontFamily: 'var(--font-heading)'
              }}>
                {lang === 'CZ' ? 'Vítej na e-shopu Northvale' : 'Welcome to Northvale'}
              </h2>
            </div>

            <p style={{
              fontSize: isMobile ? '15px' : '16px',
              color: 'var(--text-main)',
              lineHeight: '1.6',
              fontWeight: '500',
              margin: 0,
              opacity: 0.95
            }}>
              {lang === 'CZ' ? 'Po letech sbírání Pokémonů a dalších karetních her jsme se rozhodli posunout tento koníček o úroveň výš.' : 'After years of collecting Pokémon and other card games, we decided to take this hobby to the next level.'}
            </p>

            <p style={{
              fontSize: isMobile ? '14px' : '15px',
              color: 'var(--text-muted)',
              lineHeight: '1.6',
              margin: 0
            }}>
              {lang === 'CZ' ? `Víme, jak těžké je dnes sehnat TCG produkty za rozumné ceny. Proto chceme nabídnout široký výběr produktů${FEATURE_FLAGS.showSlabs ? ', ohodnocených karet' : ''} i příslušenství za férové ceny.` : `We know how hard it is to find TCG products at reasonable prices these days. That's why we want to offer a wide selection of products${FEATURE_FLAGS.showSlabs ? ', graded cards,' : ''} and accessories at fair prices.`}
            </p>

            <p style={{
              fontSize: isMobile ? '14px' : '15px',
              color: 'var(--text-muted)',
              lineHeight: '1.6',
              margin: 0
            }}>
              {lang === 'CZ' ? 'Zakládáme si především na kvalitě a dostupnosti zboží.' : 'We pride ourselves above all on the quality and availability of our inventory.'}
            </p>
            <button 
              className="btn btn-primary" 
              style={{ marginTop: '8px', alignSelf: 'flex-start' }}
              onClick={() => setActivePage('about')}
            >
              {lang === 'CZ' ? 'Přečíst více' : 'Read More'}
            </button>
          </div>

          {/* Right Side: Image with premium design effects */}
          <div className="founders-story-image-column">
            {/* Subtle gold glow back-frame */}
            <div style={{
              position: 'absolute',
              top: '12px',
              left: '12px',
              right: '-12px',
              bottom: '-12px',
              border: '2px solid rgba(253, 189, 22, 0.15)',
              borderRadius: 'var(--radius-lg)',
              zIndex: 1,
              pointerEvents: 'none'
            }} />

            {/* Actual image wrapper with rounded corners and border */}
            <div style={{
              width: '100%',
              height: '100%',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              position: 'relative',
              zIndex: 2,
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
            }} className="about-us-img-container">
              <img 
                src="/o nas northvale.webp" 
                alt="O nás - Northvale" 
                width="1254"
                height="1254"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block'
                }}
              />
            </div>
          </div>
        </section>
      </div>

        {/* Category Tiles */}
        <section id="popular-categories" className="category-section container">
        <h2 style={styles.sectionHeading} className="section-title">{lang === 'CZ' ? 'Oblíbené kategorie' : 'Popular Categories'}</h2>
        <div className="category-tiles-grid">
          <a href="/sealed-catalog?game=Pok%C3%A9mon" style={{ ...styles.categoryTile, textDecoration: 'none', color: 'inherit' }} className="glass-card" onClick={(e) => { if (e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) { e.preventDefault(); setFilters({ game: 'Pokémon' }); setActivePage('sealed-catalog'); } }}>
            <img src="/Pokemon.webp" alt="Pokémon" className="category-tile-img" width="3376" height="1248" />
          </a>
          <a href="/sealed-catalog?game=Lorcana" style={{ ...styles.categoryTile, textDecoration: 'none', color: 'inherit' }} className="glass-card" onClick={(e) => { if (e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) { e.preventDefault(); setFilters({ game: 'Lorcana' }); setActivePage('sealed-catalog'); } }}>
            <img src="/lorcana logo.webp" alt="Disney Lorcana" className="category-tile-img" width="3376" height="1248" />
          </a>
          <a href="/sealed-catalog?game=One+Piece" style={{ ...styles.categoryTile, textDecoration: 'none', color: 'inherit' }} className="glass-card" onClick={(e) => { if (e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) { e.preventDefault(); setFilters({ game: 'One Piece' }); setActivePage('sealed-catalog'); } }}>
            <img src="/One piece.webp" alt="One Piece" className="category-tile-img" width="3376" height="1248" />
          </a>
          <a href="/sealed-catalog?game=Riftbound" style={{ ...styles.categoryTile, textDecoration: 'none', color: 'inherit' }} className="glass-card" onClick={(e) => { if (e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) { e.preventDefault(); setFilters({ game: 'Riftbound' }); setActivePage('sealed-catalog'); } }}>
            <img src="/Riftbound.webp" alt="Riftbound" className="category-tile-img" width="1233" height="456" />
          </a>
          <a href="/sealed-catalog?game=Accessories" style={{ ...styles.categoryTile, textDecoration: 'none', color: 'inherit' }} className="glass-card" onClick={(e) => { if (e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) { e.preventDefault(); setFilters({ game: 'Accessories' }); setActivePage('sealed-catalog'); } }}>
            <img src="/Prislusentstvi.webp" alt={lang === 'CZ' ? 'Příslušenství' : 'Accessories'} className="category-tile-img" width="3376" height="1248" />
          </a>
          <a href="/sealed-catalog?game=Acrylics" style={{ ...styles.categoryTile, textDecoration: 'none', color: 'inherit' }} className="glass-card" onClick={(e) => { if (e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) { e.preventDefault(); setFilters({ game: 'Acrylics' }); setActivePage('sealed-catalog'); } }}>
            <img src="/Akryly.webp" alt="Akryly" className="category-tile-img" width="2800" height="1035" />
          </a>
          {FEATURE_FLAGS.showSlabs && (
            <a href="/slabs-catalog" style={{ ...styles.categoryTile, textDecoration: 'none', color: 'inherit' }} className="glass-card" onClick={(e) => { if (e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) { e.preventDefault(); setFilters({}); setActivePage('slabs-catalog'); } }}>
              <img src="/Ohodnoceni karet.webp" alt={lang === 'CZ' ? 'Ohodnocené karty' : 'Graded Cards'} className="category-tile-img" width="3376" height="1248" />
            </a>
          )}
        </div>
      </section>

      {/* Product Grids */}
      {/* 1. {lang === 'CZ' ? 'Novinky' : 'New Releases'} (New arrivals) */}
      <section style={{ ...styles.sectionContainer, paddingBottom: isMobile ? '12px' : '0' }} className="container">
        <header className="nv-header">
          <div className="nv-header-left">
            <div className="nv-eyebrow">{lang === 'CZ' ? 'Nové přírůstky' : 'New Additions'}</div>
            <h2 className="nv-title">{lang === 'CZ' ? 'Novinky' : 'New Releases'}</h2>
          </div>
        </header>
        <div className="slider-container-wrapper">
          <button onClick={() => handleScroll(newArrivalsRef, 'left')} className="scroll-arrow-btn left-arrow" aria-label="Předchozí">‹</button>
          <div ref={newArrivalsRef} className="homepage-product-grid">
            {newArrivals.map(product => (
              <a 
                key={product.id} 
                href={product.type === 'single' || product.type === 'slab' ? `/singles-detail/${product.id}` : `/sealed-detail/${product.id}`} 
                className={`vf-card type-${product.type}`} 
                style={{ textDecoration: 'none', color: 'inherit' }}
                onClick={(e) => { 
                  if (e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) { 
                    e.preventDefault(); 
                    handleCardClick(product); 
                  } 
                }}
              >
                <div className="vf-art">
                  <div className="card-art">
                    <ProductImage src={product.image} alt={product.name || 'Northvale TCG produkt'} className="ca-card-img" />
                    <div className="ca-holo"></div>
                    <div className="ca-shine"></div>
                    <div className="ca-grain"></div>
                  </div>
                </div>
                <div className="vf-info">
                  <div className="vf-name">{product.name.split(' (')[0]}</div>
                  <div className="vf-rule"></div>
                  <div className="vf-meta">
                    <span className="vf-stock">
                      <span className="vf-dot"></span>
                      {lang === 'CZ' ? 'Skladem' : 'In Stock'}
                    </span>
                    <span className="vf-price">{((product.variants ? product.variants[0].price : product.price) || 1200).toLocaleString('cs-CZ')} Kč</span>
                  </div>
                </div>
              </a>
            ))}
          </div>
          <button onClick={() => handleScroll(newArrivalsRef, 'right')} className="scroll-arrow-btn right-arrow" aria-label="Další">›</button>
        </div>
      </section>

      {/* 2. & 3. Propojené sekce s pozadím na celou šířku (full-bleed) */}
      <div style={{
        backgroundColor: 'var(--bg-secondary)',
        borderTop: '1px solid rgba(255, 255, 255, 0.04)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
        width: '100%',
        paddingTop: isMobile ? '48px' : '88px',
        paddingBottom: isMobile ? '24px' : '88px',
        display: 'flex',
        flexDirection: 'column',
        gap: isMobile ? '36px' : '88px',
        boxSizing: 'border-box'
      }}>
        {/* 2. {lang === 'CZ' ? 'Předobjednávky' : 'Pre-orders'} (Preorders) */}
        <section style={{ ...styles.sectionContainer, marginBottom: isMobile ? '8px' : '40px' }} className="container">
          <header className="nv-header">
            <div className="nv-header-left">
              <div className="nv-eyebrow">{lang === 'CZ' ? 'Připravované edice' : 'Upcoming Expansions'}</div>
              <h2 className="nv-title">{lang === 'CZ' ? 'Předobjednávky' : 'Pre-orders'}</h2>
            </div>
          </header>
          <div className="slider-container-wrapper">
            <button onClick={() => handleScroll(preordersRef, 'left')} className="scroll-arrow-btn left-arrow" aria-label="Předchozí">‹</button>
            <div ref={preordersRef} className="homepage-product-grid">
            {preorders.map(product => (
              <a 
                key={product.id} 
                href={product.type === 'single' || product.type === 'slab' ? `/singles-detail/${product.id}` : `/sealed-detail/${product.id}`} 
                className={`vf-card type-${product.type}`} 
                style={{ textDecoration: 'none', color: 'inherit' }}
                onClick={(e) => { 
                  if (e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) { 
                    e.preventDefault(); 
                    handleCardClick(product); 
                  } 
                }}
              >
                <div className="vf-art">
                  <div className="card-art">
                    <ProductImage src={product.image} alt={product.name || 'Northvale TCG produkt'} className="ca-card-img" />
                    <div className="ca-holo"></div>
                    <div className="ca-shine"></div>
                    <div className="ca-grain"></div>
                  </div>
                </div>
                <div className="vf-info">
                  <div className="vf-name">{product.name}</div>
                  <div className="vf-rule"></div>
                  <div className="vf-meta">
                    <span className="vf-stock">
                      <span className="vf-dot"></span>
                      {lang === 'CZ' ? 'Předobjednávka' : 'Pre-order'}
                    </span>
                    <span className="vf-price">{product.price.toLocaleString('cs-CZ')} Kč</span>
                  </div>
                </div>
              </a>
            ))}
            </div>
            <button onClick={() => handleScroll(preordersRef, 'right')} className="scroll-arrow-btn right-arrow" aria-label="Další">›</button>
          </div>
        </section>

        {/* Grading Banner */}
        {FEATURE_FLAGS.showGrading && (
          <section style={{ marginBottom: isMobile ? '24px' : '40px' }} className="container">
            <div className="grading-banner-card">
              <div className="grading-banner-content">
                <h2 className="grading-banner-title">{lang === 'CZ' ? 'Nechte si ohodnotit vaši kartu' : 'Have Your Cards Professionally Graded'}</h2>
                <p className="grading-banner-description">
                  Zprostředkujeme pro Vás odeslání karet do USA (PSA, Beckett, TAG). Vaše karty vyčistíme, bezpečně zabalíme a kompletně pojistíme. Sledujte průběh své zakázky online.
                </p>
                <button className="btn btn-primary" onClick={() => { setFilters({}); setActivePage('grading'); }}>{lang === 'CZ' ? 'Chci ohodnotit kartu' : 'Submit Cards for Grading'}</button>
              </div>
              <div className="grading-banner-img-wrapper">
                <img src="/grading sekce.webp" alt="Grading karet" className="grading-banner-image" width="1672" height="941" />
              </div>
            </div>
          </section>
        )}

        {/* 3. {lang === 'CZ' ? 'Ohodnocené karty' : 'Graded Cards'} (Slabs) */}
        {FEATURE_FLAGS.showSlabs && (
          <section style={{ ...styles.sectionContainer, paddingBottom: isMobile ? '48px' : '0' }} className="container">
            <header className="nv-header">
              <div className="nv-header-left">
                <div className="nv-eyebrow">{lang === 'CZ' ? 'Certifikovaná kvalita' : 'Certified Quality'}</div>
                <h2 className="nv-title">{lang === 'CZ' ? 'Ohodnocené karty' : 'Graded Cards'}</h2>
              </div>
              <span className="nv-link more-link-desktop" onClick={() => { setFilters({}); setActivePage('slabs-catalog'); }}>
                {lang === 'CZ' ? 'Zobrazit více' : 'Show More'} &rarr;
              </span>
            </header>
            <div className="slider-container-wrapper">
              <button onClick={() => handleScroll(gradedCardsRef, 'left')} className="scroll-arrow-btn left-arrow" aria-label="Předchozí">‹</button>
              <div ref={gradedCardsRef} className="homepage-product-grid">
              {gradedCards.map(product => (
                <a 
                  key={product.id} 
                  href={product.type === 'single' || product.type === 'slab' ? `/singles-detail/${product.id}` : `/sealed-detail/${product.id}`} 
                  className={`vf-card type-${product.type}`} 
                  style={{ textDecoration: 'none', color: 'inherit' }}
                  onClick={(e) => { 
                    if (e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) { 
                      e.preventDefault(); 
                      handleCardClick(product); 
                    } 
                  }}
                >
                  <div className="vf-art">
                    <div className="card-art">
                      <ProductImage src={product.image} alt={product.name || 'Northvale TCG produkt'} className="ca-card-img" />
                      <div className="ca-holo"></div>
                      <div className="ca-shine"></div>
                      <div className="ca-grain"></div>
                    </div>
                  </div>
                  <div className="vf-info">
                    <div className="vf-name">{product.name}</div>
                    <div className="vf-rule"></div>
                    <div className="vf-meta">
                      <span className="slab-badge">{product.company} {product.grade}</span>
                      <span className="vf-price">{product.price.toLocaleString('cs-CZ')} Kč</span>
                    </div>
                  </div>
                </a>
              ))}
              </div>
              <button onClick={() => handleScroll(gradedCardsRef, 'right')} className="scroll-arrow-btn right-arrow" aria-label="Další">›</button>
            </div>
            <div className="more-link-mobile-wrapper">
              <span className="nv-link more-link-mobile" onClick={() => { setFilters({}); setActivePage('slabs-catalog'); }}>
                {lang === 'CZ' ? 'Zobrazit více' : 'Show More'} &rarr;
              </span>
            </div>
          </section>
        )}
      </div>

      {/* 4. {lang === 'CZ' ? 'Příslušenství' : 'Accessories'} (Accessories) */}
      <section style={{ ...styles.sectionContainer, marginBottom: isMobile ? '8px' : '40px', paddingBottom: isMobile ? '27px' : '0' }} className="container">
        <header className="nv-header">
          <div className="nv-header-left">
            <div className="nv-eyebrow">{lang === 'CZ' ? 'Doplňky pro sběratele' : 'Collector Accessories'}</div>
            <h2 className="nv-title">{lang === 'CZ' ? 'Příslušenství' : 'Accessories'}</h2>
          </div>
          <span className="nv-link more-link-desktop" onClick={() => { setFilters({ game: 'Accessories' }); setActivePage('sealed-catalog'); }}>
            {lang === 'CZ' ? 'Zobrazit více' : 'Show More'} &rarr;
          </span>
        </header>
        <div className="slider-container-wrapper">
          <button onClick={() => handleScroll(accessoriesRef, 'left')} className="scroll-arrow-btn left-arrow" aria-label="Předchozí">‹</button>
          <div ref={accessoriesRef} className="homepage-product-grid">
            {accessories.map(product => (
              <a 
                key={product.id} 
                href={product.type === 'single' || product.type === 'slab' ? `/singles-detail/${product.id}` : `/sealed-detail/${product.id}`} 
                className={`vf-card type-${product.type}`} 
                style={{ textDecoration: 'none', color: 'inherit' }}
                onClick={(e) => { 
                  if (e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) { 
                    e.preventDefault(); 
                    handleCardClick(product); 
                  } 
                }}
              >
                <div className="vf-art">
                  <div className="card-art">
                    <ProductImage src={product.image} alt={product.name || 'Northvale TCG produkt'} className="ca-card-img" />
                    <div className="ca-holo"></div>
                    <div className="ca-shine"></div>
                    <div className="ca-grain"></div>
                  </div>
                </div>
                <div className="vf-info">
                  <div className="vf-name">{product.name}</div>
                  <div className="vf-rule"></div>
                  <div className="vf-meta">
                    <span className="vf-stock">
                      <span className="vf-dot"></span>
                      {lang === 'CZ' ? 'Skladem' : 'In Stock'}
                    </span>
                    <span className="vf-price">{product.price.toLocaleString('cs-CZ')} Kč</span>
                  </div>
                </div>
              </a>
            ))}
          </div>
          <button onClick={() => handleScroll(accessoriesRef, 'right')} className="scroll-arrow-btn right-arrow" aria-label="Další">›</button>
        </div>
        <div className="more-link-mobile-wrapper" style={{ marginTop: isMobile ? '-55px' : '16px' }}>
          <span className="nv-link more-link-mobile" onClick={() => { setFilters({ game: 'Accessories' }); setActivePage('sealed-catalog'); }}>
            {lang === 'CZ' ? 'Zobrazit více' : 'Show More'} &rarr;
          </span>
        </div>
      </section>

      {/* Testimonials */}
      {FEATURE_FLAGS.showTestimonials && (
        <section style={styles.sectionContainer} className="container testimonials-section">
          <header className="testimonials-header">
            <div className="testimonials-header-left">
              <div className="testimonials-eyebrow">{lang === 'CZ' ? 'RECENZE OVĚŘENÝCH ZÁKAZNÍKŮ' : 'VERIFIED CUSTOMER REVIEWS'}</div>
              <h2 className="testimonials-title">{lang === 'CZ' ? 'Co o nás říkají' : 'What they say about us'}</h2>
            </div>
            <div className="testimonials-rating-desktop">
              <span className="testimonials-stars">★★★★★</span>
              <span className="testimonials-rating-text">{lang === 'CZ' ? '4,8 • 312 hodnocení' : '4.8 • 312 reviews'}</span>
            </div>
          </header>
          <div className="slider-container-wrapper testimonials-slider-wrapper">
            <button onClick={() => handleScroll(testimonialsRef, 'left')} className="scroll-arrow-btn left-arrow" aria-label="Předchozí">‹</button>
            <div ref={testimonialsRef} className="testimonials-grid-scroll">
              {testimonials.map((t, idx) => (
                <div key={idx} className="testimonial-card">
                  <div className="testimonial-quote">“</div>
                  <p className="testimonial-text">{t.text.replace(/^[„"“]/, '').replace(/[“"“]$/, '')}</p>
                  <div className="testimonial-footer">
                    <div className="testimonial-avatar">{t.initials}</div>
                    <div className="testimonial-author-info">
                      <span className="testimonial-author-name">{t.name}</span>
                      <span className="testimonial-author-desc">{t.desc}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => handleScroll(testimonialsRef, 'right')} className="scroll-arrow-btn right-arrow" aria-label="Další">›</button>
          </div>
        </section>
      )}

    </div>
  );
}

const styles = {
  container: {
    paddingTop: '24px',
    paddingBottom: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '88px',
  },
  heroSection: {
    display: 'flex',
    gap: '24px',
    width: '100%',
    flexWrap: 'wrap',
    marginTop: '40px',
  },
  slideshow: {
    flex: '7 1 60%',
    height: '420px',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    padding: '40px',
    textAlign: 'center',
  },
  slideContent: {
    maxWidth: '500px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
    zIndex: 2,
  },
  slideTitle: {
    fontSize: '28px',
    fontWeight: '800',
    color: 'var(--text-main)',
    lineHeight: '1.2',
  },
  slideDesc: {
    fontSize: '15px',
    color: 'var(--text-muted)',
  },
  slideBtn: {
    alignSelf: 'center',
    marginTop: '10px',
  },
  slideArrow: {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    width: 'auto',
    height: 'auto',
    fontSize: '44px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    border: 'none',
    color: 'var(--text-main)',
    transition: 'color 0.2s, opacity 0.2s',
    zIndex: 5,
    cursor: 'pointer',
    opacity: 0.6,
    '&:hover': {
      opacity: 1,
      color: 'var(--color-gold)',
    }
  },
  indicators: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '8px',
    zIndex: 5,
  },
  dot: {
    height: '4px',
    borderRadius: '2px',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  dealWidget: {
    flex: '3 1 25%',
    height: '420px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
  },
  dealBadge: {
    position: 'absolute',
    top: '12px',
    left: '12px',
    backgroundColor: 'var(--color-gold)',
    color: '#000',
    fontWeight: '800',
    fontSize: '11px',
    padding: '3px 8px',
    borderRadius: 'var(--radius-sm)',
    letterSpacing: '0.5px',
  },
  dealImageContainer: {
    height: '160px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: '10px',
    cursor: 'pointer',
  },
  dealImage: {
    maxHeight: '100%',
    maxWidth: '100%',
    objectFit: 'contain',
  },
  dealName: {
    fontSize: '15px',
    fontWeight: '700',
    textAlign: 'center',
    margin: '8px 0 0',
    cursor: 'pointer',
    '&:hover': {
      color: 'var(--color-gold)',
    }
  },
  priceRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  oldPrice: {
    fontSize: '13px',
    color: 'var(--text-muted)',
    textDecoration: 'line-through',
  },
  dealPrice: {
    fontSize: '18px',
    fontWeight: '800',
    color: 'var(--color-gold)',
  },
  timerContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    margin: '6px 0',
  },
  timeBox: {
    backgroundColor: 'var(--bg-surface-alt)',
    padding: '6px 10px',
    borderRadius: 'var(--radius-sm)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    minWidth: '45px',
  },
  timeNum: {
    fontSize: '15px',
    fontWeight: '700',
    color: 'var(--text-main)',
  },
  timeLabel: {
    fontSize: '8px',
    color: 'var(--text-muted)',
    marginTop: '2px',
  },
  timeDivider: {
    fontSize: '16px',
    fontWeight: '700',
    color: 'var(--text-muted)',
  },
  dealBuyBtn: {
    width: '100%',
    border: 'none',
    cursor: 'pointer',
    fontWeight: '700',
    borderRadius: 'var(--radius-md)'
  },
  uspBar: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '0px',
    flexWrap: 'wrap',
    padding: '16px 0',
  },
  uspBox: {
    flex: '1 1 220px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    padding: '12px 20px',
    backgroundColor: 'transparent',
    boxSizing: 'border-box',
  },
  uspIcon: {
    width: '36px',
    height: '36px',
    filter: 'invert(0.9)',
  },
  uspText: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    textAlign: 'left',
  },
  uspTitle: {
    fontSize: '15px',
    fontWeight: '700',
    margin: 0,
    color: 'var(--text-main)',
  },
  uspDesc: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    margin: '3px 0 0',
  },
  sectionContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--section-header-gap, 24px)',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  sectionHeading: {
    fontWeight: '700',
    textAlign: 'left',
    margin: 0,
  },

  categoryTile: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px 10px',
    cursor: 'pointer',
    textAlign: 'center',
    height: '110px',
    backgroundColor: 'rgba(24, 24, 27, 0.4)',
    border: '1px solid rgba(63, 63, 70, 0.15)',
    borderRadius: 'var(--radius-md)',
    transition: 'all 0.2s',
  },
  productCard: {
    display: 'flex',
    flexDirection: 'column',
    textAlign: 'center',
    width: '100%',
  },
  cardImgContainer: {
    height: '240px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    padding: '16px',
    position: 'relative',
  },
  cardImg: {
    maxHeight: '100%',
    maxWidth: '100%',
    objectFit: 'contain',
  },
  cardDetails: {
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    flexGrow: 1,
    borderTop: 'none',
    alignItems: 'center',
  },
  cardRarity: {
    fontSize: '10px',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: '0.5px',
  },
  cardName: {
    fontSize: '14px',
    fontWeight: '700',
    margin: 0,
    lineHeight: '1.4',
    minHeight: '40px',
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'auto',
    paddingTop: '6px',
  },
  cardStock: {
    fontSize: '11px',
    fontWeight: '600',
  },
  cardPrice: {
    fontSize: '15px',
    fontWeight: '800',
    color: 'var(--color-gold)',
  },
  preorderBadge: {
    fontSize: '9px',
    fontWeight: '800',
    backgroundColor: 'rgba(253, 189, 22, 0.15)',
    color: 'var(--color-gold)',
    padding: '2px 6px',
    borderRadius: '2px',
    alignSelf: 'flex-start',
  },
  slabBadge: {
    fontSize: '9px',
    fontWeight: '800',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    color: 'var(--color-green)',
    padding: '2px 6px',
    borderRadius: '2px',
  },

  storySection: {
    display: 'flex',
    gap: '40px',
    alignItems: 'stretch',
    flexWrap: 'wrap',
    marginTop: '72px',
    marginBottom: '56px',
  }
};
