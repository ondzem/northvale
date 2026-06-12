import { useState, useEffect, useRef } from 'react';
import { FEATURE_FLAGS } from '../config';

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
      alt={alt}
      onLoad={handleLoad}
      className={`${className} ${fitClass} ${loaded ? 'loaded' : ''}`}
    />
  );
};


export default function Homepage({ setActivePage, addToCart, products, setSelectedProductId, setFilters }) {
  // Mobile state detection (900px breakpoint for layout)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 900);
  // Image breakpoint detection (650px breakpoint for mobile images)
  const [useMobileImage, setUseMobileImage] = useState(window.innerWidth <= 650);
  // USP slider detection (970px breakpoint for USP carousel)
  const [isUspMobile, setIsUspMobile] = useState(window.innerWidth < 970);

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
    { icon: '/truck-moving.png', title: 'Doprava zdarma', desc: 'při objednávce nad 1 000 Kč' },
    { icon: '/tachometer-fast.png', title: 'Rychlost doručení', desc: 'Odesíláme do 24 hodin' },
    { icon: '/badget-check-alt.png', title: '100% Originální', desc: 'Pouze od ověřených distributorů' },
    { icon: '/credit-card.png', title: 'Bezpečná platba', desc: 'Karta, bankovní převod, dobírka' }
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
  const rawSlides = [
    { 
      mobileImage: '/Mobile - Grading karet.webp', 
      desktopImage: '/Desktop - Grading Karet.webp', 
      page: 'grading' 
    },
    { title: 'Zprostředkování gradingu v USA', desc: 'Pošlete Své karty do PSA, Beckett nebo TAG s pre-grading kontrolou.', buttonText: 'Více o gradingu', page: 'grading' },
    { title: 'One Piece Card Game', desc: 'Nové booster boxy a starter decky skladem.', buttonText: 'Prohlížet One Piece', page: 'sealed-catalog' },
    { title: 'Investiční produkty', desc: 'Vybrané ETB a booster boxy v bezchybném stavu vhodné do sbírky.', buttonText: 'Investovat', page: 'sealed-catalog' },
    { title: 'Výkup karet za hotové', desc: 'Nabídněte nám své přebytečné karty a získejte peníze na bankovní účet.', buttonText: 'Prodat karty', page: 'buylist' }
  ];

  const slides = rawSlides.filter(slide => {
    if (slide.page === 'grading' && !FEATURE_FLAGS.showGrading) return false;
    if (slide.page === 'buylist' && !FEATURE_FLAGS.showBuylist) return false;
    return true;
  });

  // Deal of the day countdown timer
  const [timeLeft, setTimeLeft] = useState({ hours: 14, minutes: 35, seconds: 22 });
  
  // Deal Button micro-animation state
  const [dealAdded, setDealAdded] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        } else {
          return { hours: 23, minutes: 59, seconds: 59 };
        }
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const nextSlide = () => {
    setCurrentSlide((currentSlide + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((currentSlide - 1 + slides.length) % slides.length);
  };

  const newArrivals = products.filter(p => p.type === 'single').slice(0, 5);
  const preorders = products.filter(p => p.type === 'sealed' && p.preorder).slice(0, 5);
  const gradedCards = products.filter(p => p.type === 'slab').slice(0, 5);
  const accessories = products.filter(p => p.type === 'accessory').slice(0, 5);
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
      text: '„Karty dorazily v naprosto bezchybném stavu. Kartonový sendvič a toploader bez lepidla jsou přesně to, co od sběratelského obchodu očekávám. Tímto děkuji za super přístup a skvělou komunikaci.“'
    },
    {
      initials: 'MR',
      name: 'Monika R.',
      desc: 'UPCE student',
      text: `„Oceňuji možnost doručení kusovek na odběrné místo v kavárně v centru Pardubic. Neplatím žádné poštovné pro malé objednávky a k tomu dostanu výbornou kávu. ${FEATURE_FLAGS.showBuylist ? 'Výkup proběhl' : 'Nákup proběhl'} naprosto hladce.“`
    },
    FEATURE_FLAGS.showGrading && {
      initials: 'PS',
      name: 'Petr S.',
      desc: 'Hradec Králové',
      text: '„Nechal jsem si přes ně nagradovat pět drahých Pokémon karet u PSA. Celý proces šlo sledovat online v mém profilu, vše bylo pojištěné a výsledné známky (tři desítky!) předčily mé očekávání.“'
    },
    {
      initials: 'JM',
      name: 'Jana M.',
      desc: 'Pardubice',
      text: '„Jako rodič velmi oceňuji dárkového průvodce. Vůbec se v Pokémon edicích nevyznám, ale s jejich dárkovým setem pod stromečkem mělo dítě obrovskou radost a já měl jistotu, že nekupuji fake karty.“'
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

  const dealProduct = products.find(p => p.id === 'deal-of-the-day') || products.find(p => p.price !== undefined) || products[0];
  const dealProductHasVariants = dealProduct.variants && dealProduct.variants.length > 0;
  const dealProductPrice = dealProductHasVariants ? dealProduct.variants[0].price : (dealProduct.price || 0);
  const dealProductStock = dealProductHasVariants ? dealProduct.variants[0].stock : (dealProduct.stock || 0);
  const dealProductOriginalPrice = dealProduct.originalPrice || (dealProductHasVariants ? dealProduct.variants[0].originalPrice : null);

  const handleCardClick = (product) => {
    setSelectedProductId(product.id);
    if (product.type === 'single' || product.type === 'slab') {
      setActivePage('singles-detail');
    } else {
      setActivePage('sealed-detail');
    }
  };

  const handleBuyDealClick = () => {
    addToCart(dealProduct.variants ? dealProduct.variants[0] : dealProduct, dealProduct);
    setDealAdded(true);
    setTimeout(() => {
      setDealAdded(false);
    }, 1500);
  };

  return (
    <div style={{ ...styles.container, paddingTop: isMobile ? '12px' : '24px', gap: isMobile ? '48px' : '88px' }} className="fade-in">
      <h1 className="sr-only">NORTHVALE TCG - Váš specializovaný e-shop pro Pokémon, Lorcana, One Piece a grading karet</h1>

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
              height: isMobile ? (useMobileImage ? 'clamp(360px, max(calc(93vw - 20px), calc(33.3vw + 278px)), 610px)' : '420px') : '420px', 
              aspectRatio: 'auto',
              padding: slides[currentSlide].desktopImage ? '0' : (isMobile ? '20px' : '40px'),
              backgroundImage: slides[currentSlide].desktopImage 
                ? `url("${useMobileImage ? slides[currentSlide].mobileImage : slides[currentSlide].desktopImage}")` 
                : 'none',
              backgroundSize: 'cover',
              backgroundPosition: slides[currentSlide].desktopImage ? 'center bottom' : 'center',
              backgroundRepeat: 'no-repeat',
              cursor: slides[currentSlide].page ? 'pointer' : 'default'
            }} 
            className="glass-panel"
            onClick={() => {
              if (slides[currentSlide].page) {
                setFilters({});
                setActivePage(slides[currentSlide].page);
              }
            }}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            {!slides[currentSlide].desktopImage && (
              <div style={styles.slideContent}>
                <h2 style={{ ...styles.slideTitle, fontSize: isMobile ? '24px' : '28px' }}>{slides[currentSlide].title}</h2>
                <p style={{ ...styles.slideDesc, fontSize: isMobile ? '14px' : '15px' }}>{slides[currentSlide].desc}</p>
                <button 
                  className="btn btn-primary" 
                  style={styles.slideBtn}
                >
                  {slides[currentSlide].buttonText}
                </button>
              </div>
            )}
          </div>

          <div style={{ ...styles.indicators, marginTop: '14px', marginBottom: isMobile ? '24px' : '0' }}>
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
        </div>

        {/* Deal of the Day */}
        <div style={{ 
          ...styles.dealWidget, 
          flex: !isMobile ? '2.7 1 22%' : '3 1 25%',
          height: !isMobile ? '420px' : (useMobileImage ? '410px' : '380px'), 
          padding: (!isMobile || useMobileImage) ? '16px 16px 0 16px' : '0 16px 0 0',
          flexDirection: (!isMobile || useMobileImage) ? 'column' : 'row',
          alignItems: 'stretch',
          justifyContent: 'space-between',
          overflow: 'hidden'
        }} className="glass-panel deal-widget-banner">
          
          {(!isMobile || useMobileImage) ? (
            // --- VERTICAL LAYOUT (DESKTOP & MOBILE) ---
            <>
              {/* Top: Title */}
              <h3 style={{ 
                fontSize: '17px', 
                fontWeight: '700', 
                color: 'var(--text-main)', 
                margin: '4px 0 0 0',
                textAlign: 'left',
                lineHeight: '1.4',
                cursor: 'pointer',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                height: '48px',
                fontFamily: 'var(--font-heading)',
                position: 'relative',
                zIndex: 10
              }} onClick={() => handleCardClick(dealProduct)}>
                {dealProduct.name}
              </h3>

              {/* Center: Image Container */}
              <div style={{
                height: !isMobile ? '145px' : '135px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                zIndex: 1,
                cursor: 'pointer',
                marginTop: '34px',
                marginBottom: '8px'
              }} onClick={() => handleCardClick(dealProduct)}>
                <img 
                  src={dealProduct.image} 
                  alt={dealProduct.name} 
                  style={{ 
                    maxHeight: '100%', 
                    maxWidth: '100%', 
                    objectFit: 'contain',
                    transform: 'scale(1.22) translateY(12px)',
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
                  Zbývá {dealProductStock} kusů
                </span>
              </div>

              {/* Below Image: Price & Button Row */}
              <div style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                width: '100%',
                marginBottom: '14px',
                marginTop: 'auto',
                position: 'relative',
                zIndex: 10
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--color-red)' }}>
                      -{dealProductOriginalPrice ? Math.round(((dealProductOriginalPrice - dealProductPrice) / dealProductOriginalPrice) * 100) : 33} %
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', textDecoration: 'line-through' }}>
                      {dealProductOriginalPrice ? dealProductOriginalPrice.toLocaleString() : '2 690'} Kč
                    </span>
                  </div>
                  <span style={{ fontSize: !isMobile ? '19px' : '18px', fontWeight: '800', color: 'var(--color-gold)', marginTop: '2px', whiteSpace: 'nowrap' }}>
                    {dealProductPrice.toLocaleString()} Kč
                  </span>
                </div>

                <button 
                  className="btn btn-primary" 
                  style={{
                    backgroundColor: dealAdded ? 'var(--color-gold-hover)' : 'var(--color-gold)',
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
                    cursor: 'pointer',
                    flex: '0 0 auto',
                    minWidth: '110px',
                    transform: dealAdded ? 'scale(0.95)' : 'scale(1)',
                    transition: 'all 0.15s ease',
                    boxShadow: '0 4px 12px rgba(253, 189, 22, 0.15)'
                  }}
                  disabled={dealProduct.stock === 0}
                  onClick={handleBuyDealClick}
                >
                  <img 
                    src="/shopping-cart.png" 
                    alt="" 
                    style={{ 
                      width: '14px', 
                      height: '14px', 
                      filter: 'brightness(0)' 
                    }} 
                  />
                  {dealAdded ? 'Přidáno' : 'Do košíku'}
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
                  Akce dne
                </span>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  color: '#000'
                }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
                    <span style={{ fontSize: '18px', fontWeight: '800' }}>
                      {timeLeft.hours.toString().padStart(2, '0')}
                    </span>
                    <span style={{ fontSize: '10px', color: 'rgba(0, 0, 0, 0.65)', fontWeight: '500' }}>hodin</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
                    <span style={{ fontSize: '18px', fontWeight: '800' }}>
                      {timeLeft.minutes.toString().padStart(2, '0')}
                    </span>
                    <span style={{ fontSize: '10px', color: 'rgba(0, 0, 0, 0.65)', fontWeight: '500' }}>minut</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
                    <span style={{ fontSize: '18px', fontWeight: '800' }}>
                      {timeLeft.seconds.toString().padStart(2, '0')}
                    </span>
                    <span style={{ fontSize: '10px', color: 'rgba(0, 0, 0, 0.65)', fontWeight: '500' }}>sekund</span>
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
                  Akce dne
                </span>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '20px',
                  color: '#000'
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                    <span style={{ fontSize: '24px', fontWeight: '800', lineHeight: '1' }}>
                      {timeLeft.hours.toString().padStart(2, '0')}
                    </span>
                    <span style={{ fontSize: '9px', color: 'rgba(0, 0, 0, 0.65)', textTransform: 'uppercase', fontWeight: '500' }}>hodin</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                    <span style={{ fontSize: '24px', fontWeight: '800', lineHeight: '1' }}>
                      {timeLeft.minutes.toString().padStart(2, '0')}
                    </span>
                    <span style={{ fontSize: '9px', color: 'rgba(0, 0, 0, 0.65)', textTransform: 'uppercase', fontWeight: '500' }}>minut</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                    <span style={{ fontSize: '24px', fontWeight: '800', lineHeight: '1' }}>
                      {timeLeft.seconds.toString().padStart(2, '0')}
                    </span>
                    <span style={{ fontSize: '9px', color: 'rgba(0, 0, 0, 0.65)', textTransform: 'uppercase', fontWeight: '500' }}>sekund</span>
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
                <h3 style={{ 
                  fontSize: '18px', 
                  fontWeight: '800', 
                  color: 'var(--text-main)', 
                  margin: '0 0 8px 0',
                  textAlign: 'left',
                  lineHeight: '1.3',
                  cursor: 'pointer',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  fontFamily: 'var(--font-heading)'
                }} onClick={() => handleCardClick(dealProduct)}>
                  {dealProduct.name}
                </h3>

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
                  <div style={{
                    flex: '1.2 1 0%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    position: 'relative',
                    cursor: 'pointer'
                  }} onClick={() => handleCardClick(dealProduct)}>
                    <img 
                      src={dealProduct.image} 
                      alt={dealProduct.name} 
                      style={{ 
                        maxHeight: '100%', 
                        maxWidth: '100%', 
                        objectFit: 'contain',
                        transform: 'scale(1.25) translate(-28px, 16px)',
                        transformOrigin: 'left center'
                      }} 
                    />
                  </div>

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
                      Zbývá {dealProductStock} kusů
                    </span>

                    {/* Pricing */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--color-red)' }}>
                          -{dealProductOriginalPrice ? Math.round(((dealProductOriginalPrice - dealProductPrice) / dealProductOriginalPrice) * 100) : 33} %
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', textDecoration: 'line-through' }}>
                          {dealProductOriginalPrice ? dealProductOriginalPrice.toLocaleString() : '2 690'} Kč
                        </span>
                      </div>
                      <span style={{ fontSize: '19px', fontWeight: '800', color: 'var(--color-gold)', marginTop: '1px' }}>
                        {dealProductPrice.toLocaleString()} Kč
                      </span>
                    </div>

                    {/* Buy Button */}
                    <button 
                      className="btn btn-primary" 
                      style={{
                        backgroundColor: dealAdded ? 'var(--color-gold-hover)' : 'var(--color-gold)',
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
                        cursor: 'pointer',
                        width: '120px',
                        transform: dealAdded ? 'scale(0.95)' : 'scale(1)',
                        transition: 'all 0.15s ease',
                        boxShadow: '0 4px 12px rgba(253, 189, 22, 0.15)'
                      }}
                      disabled={dealProductStock === 0}
                      onClick={handleBuyDealClick}
                    >
                      <img 
                        src="/shopping-cart.png" 
                        alt="" 
                        style={{ 
                          width: '14px', 
                          height: '14px', 
                          filter: 'brightness(0)' 
                        }} 
                      />
                      {dealAdded ? 'Přidáno' : 'Do košíku'}
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
                  alt="" 
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
            <img src="/truck-moving.png" alt="Doprava zdarma" style={styles.uspIcon} />
            <div style={styles.uspText}>
              <h4 style={styles.uspTitle}>Doprava zdarma</h4>
              <p style={styles.uspDesc}>při objednávce nad 1 000 Kč</p>
            </div>
          </div>
          <div style={{ ...styles.uspBox, borderRight: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <img src="/tachometer-fast.png" alt="Rychlost doručení" style={styles.uspIcon} />
            <div style={styles.uspText}>
              <h4 style={styles.uspTitle}>Rychlost doručení</h4>
              <p style={styles.uspDesc}>Odesíláme do 24 hodin</p>
            </div>
          </div>
          <div style={{ ...styles.uspBox, borderRight: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <img src="/badget-check-alt.png" alt="100% Originální" style={styles.uspIcon} />
            <div style={styles.uspText}>
              <h4 style={styles.uspTitle}>100% Originální</h4>
              <p style={styles.uspDesc}>Pouze od ověřených distributorů</p>
            </div>
          </div>
          <div style={styles.uspBox}>
            <img src="/credit-card.png" alt="Bezpečná platba" style={styles.uspIcon} />
            <div style={styles.uspText}>
              <h4 style={styles.uspTitle}>Bezpečná platba</h4>
              <p style={styles.uspDesc}>Karta, bankovní převod, dobírka</p>
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
                Příběh Northvale
              </span>
              <h2 style={{
                fontSize: isMobile ? '28px' : '36px',
                fontWeight: '800',
                color: 'var(--text-main)',
                lineHeight: '1.15',
                margin: 0,
                fontFamily: 'var(--font-heading)'
              }}>
                Vítej na e-shopu Northvale
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
              Po letech sbírání Pokémonů a dalších karetních her jsme se rozhodli posunout tento koníček o úroveň výš.
            </p>

            <p style={{
              fontSize: isMobile ? '14px' : '15px',
              color: 'var(--text-muted)',
              lineHeight: '1.6',
              margin: 0
            }}>
              Víme, jak těžké je dnes sehnat TCG produkty za rozumné ceny. Proto chceme nabídnout široký výběr produktů, ohodnocených karet i příslušenství za férové ceny.
            </p>

            <p style={{
              fontSize: isMobile ? '14px' : '15px',
              color: 'var(--text-muted)',
              lineHeight: '1.6',
              margin: 0
            }}>
              Zakládáme si především na kvalitě a dostupnosti zboží.
            </p>
            <button 
              className="btn btn-primary" 
              style={{ marginTop: '8px', alignSelf: 'flex-start' }}
              onClick={() => setActivePage('about')}
            >
              Přečíst více
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
        <h2 style={styles.sectionHeading} className="section-title">Oblíbené kategorie</h2>
        <div className="category-tiles-grid">
          <div style={styles.categoryTile} className="glass-card" onClick={() => { setFilters({ game: 'Pokémon' }); setActivePage('sealed-catalog'); }}>
            <img src="/Pokemon.webp" alt="Pokémon" className="category-tile-img" />
          </div>
          <div style={styles.categoryTile} className="glass-card" onClick={() => { setFilters({ game: 'Lorcana' }); setActivePage('sealed-catalog'); }}>
            <img src="/lorcana logo.webp" alt="Disney Lorcana" className="category-tile-img" />
          </div>
          <div style={styles.categoryTile} className="glass-card" onClick={() => { setFilters({ game: 'One Piece' }); setActivePage('sealed-catalog'); }}>
            <img src="/One piece.webp" alt="One Piece" className="category-tile-img" />
          </div>
          <div style={styles.categoryTile} className="glass-card" onClick={() => { setFilters({ game: 'Riftbound' }); setActivePage('sealed-catalog'); }}>
            <img src="/Riftbound.webp" alt="Riftbound" className="category-tile-img" />
          </div>
          <div style={styles.categoryTile} className="glass-card" onClick={() => { setFilters({ game: 'Accessories' }); setActivePage('sealed-catalog'); }}>
            <img src="/Prislusentstvi.webp" alt="Příslušenství" className="category-tile-img" />
          </div>
          <div style={styles.categoryTile} className="glass-card" onClick={() => { setFilters({ game: 'Acrylics' }); setActivePage('sealed-catalog'); }}>
            <img src="/Akryly.webp" alt="Akryly" className="category-tile-img" />
          </div>
          {FEATURE_FLAGS.showSlabs && (
            <div style={styles.categoryTile} className="glass-card" onClick={() => { setFilters({}); setActivePage('slabs-catalog'); }}>
              <img src="/Ohodnoceni karet.webp" alt="Ohodnocené karty" className="category-tile-img" />
            </div>
          )}
        </div>
      </section>

      {/* Product Grids */}
      {/* 1. Novinky (New arrivals) */}
      <section style={{ ...styles.sectionContainer, paddingBottom: isMobile ? '48px' : '0' }} className="container">
        <header className="nv-header">
          <div className="nv-header-left">
            <div className="nv-eyebrow">Nové přírůstky</div>
            <h2 className="nv-title">Novinky</h2>
          </div>
          <span className="nv-link more-link-desktop" onClick={() => { setFilters({}); setActivePage('singles-catalog'); }}>
            Zobrazit více &rarr;
          </span>
        </header>
        <div className="slider-container-wrapper">
          <button onClick={() => handleScroll(newArrivalsRef, 'left')} className="scroll-arrow-btn left-arrow" aria-label="Předchozí">‹</button>
          <div ref={newArrivalsRef} className="homepage-product-grid">
            {newArrivals.map(product => (
              <div key={product.id} className={`vf-card type-${product.type}`} onClick={() => handleCardClick(product)}>
                <div className="vf-art">
                  <div className="card-art">
                    <ProductImage src={product.image} alt={product.name} className="ca-card-img" />
                    <div className="ca-holo"></div>
                    <div className="ca-shine"></div>
                    <div className="ca-grain"></div>
                  </div>
                </div>
                <div className="vf-shadow"></div>
                <div className="vf-info">
                  <div className="vf-name">{product.name.split(' (')[0]}</div>
                  <div className="vf-rule"></div>
                  <div className="vf-meta">
                    <span className="vf-stock">
                      <span className="vf-dot"></span>
                      Skladem
                    </span>
                    <span className="vf-price">{((product.variants ? product.variants[0].price : product.price) || 1200).toLocaleString('cs-CZ')} Kč</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => handleScroll(newArrivalsRef, 'right')} className="scroll-arrow-btn right-arrow" aria-label="Další">›</button>
        </div>
        <div className="more-link-mobile-wrapper">
          <span className="nv-link more-link-mobile" onClick={() => { setFilters({}); setActivePage('singles-catalog'); }}>
            Zobrazit více &rarr;
          </span>
        </div>
      </section>

      {/* 2. & 3. Propojené sekce s pozadím na celou šířku (full-bleed) */}
      <div style={{
        backgroundColor: 'var(--bg-secondary)',
        borderTop: '1px solid rgba(255, 255, 255, 0.04)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
        width: '100%',
        paddingTop: isMobile ? '48px' : '88px',
        paddingBottom: isMobile ? '48px' : '88px',
        display: 'flex',
        flexDirection: 'column',
        gap: isMobile ? '72px' : '88px',
        boxSizing: 'border-box'
      }}>
        {/* 2. Předobjednávky (Preorders) */}
        <section style={{ ...styles.sectionContainer, marginBottom: isMobile ? '24px' : '40px' }} className="container">
          <header className="nv-header">
            <div className="nv-header-left">
              <div className="nv-eyebrow">Připravované edice</div>
              <h2 className="nv-title">Předobjednávky</h2>
            </div>
            <span className="nv-link more-link-desktop" onClick={() => { setFilters({}); setActivePage('sealed-catalog'); }}>
              Zobrazit více &rarr;
            </span>
          </header>
          <div className="slider-container-wrapper">
            <button onClick={() => handleScroll(preordersRef, 'left')} className="scroll-arrow-btn left-arrow" aria-label="Předchozí">‹</button>
            <div ref={preordersRef} className="homepage-product-grid">
            {preorders.map(product => (
              <div key={product.id} className={`vf-card type-${product.type}`} onClick={() => handleCardClick(product)}>
                <div className="vf-art">
                  <div className="card-art">
                    <ProductImage src={product.image} alt={product.name} className="ca-card-img" />
                    <div className="ca-holo"></div>
                    <div className="ca-shine"></div>
                    <div className="ca-grain"></div>
                  </div>
                </div>
                <div className="vf-shadow"></div>
                <div className="vf-info">
                  <div className="vf-name">{product.name}</div>
                  <div className="vf-rule"></div>
                  <div className="vf-meta">
                    <span className="vf-stock">
                      <span className="vf-dot"></span>
                      Předobjednávka
                    </span>
                    <span className="vf-price">{product.price.toLocaleString('cs-CZ')} Kč</span>
                  </div>
                </div>
              </div>
            ))}
            </div>
            <button onClick={() => handleScroll(preordersRef, 'right')} className="scroll-arrow-btn right-arrow" aria-label="Další">›</button>
          </div>
          <div className="more-link-mobile-wrapper">
            <span className="nv-link more-link-mobile" onClick={() => { setFilters({}); setActivePage('sealed-catalog'); }}>
              Zobrazit více &rarr;
            </span>
          </div>
        </section>

        {/* Grading Banner */}
        {FEATURE_FLAGS.showGrading && (
          <section style={{ marginBottom: isMobile ? '24px' : '40px' }} className="container">
            <div className="grading-banner-card">
              <div className="grading-banner-content">
                <h2 className="grading-banner-title">Nechte si ohodnotit vaši kartu</h2>
                <p className="grading-banner-description">
                  Zprostředkujeme pro Vás odeslání karet do USA (PSA, Beckett, TAG). Vaše karty vyčistíme, bezpečně zabalíme a kompletně pojistíme. Sledujte průběh své zakázky online.
                </p>
                <button className="btn btn-primary" onClick={() => { setFilters({}); setActivePage('grading'); }}>Chci ohodnotit kartu</button>
              </div>
              <div className="grading-banner-img-wrapper">
                <img src="/grading sekce.webp" alt="Grading karet" className="grading-banner-image" />
              </div>
            </div>
          </section>
        )}

        {/* 3. Ohodnocené karty (Slabs) */}
        {FEATURE_FLAGS.showSlabs && (
          <section style={{ ...styles.sectionContainer, paddingBottom: isMobile ? '48px' : '0' }} className="container">
            <header className="nv-header">
              <div className="nv-header-left">
                <div className="nv-eyebrow">Certifikovaná kvalita</div>
                <h2 className="nv-title">Ohodnocené karty</h2>
              </div>
              <span className="nv-link more-link-desktop" onClick={() => { setFilters({}); setActivePage('slabs-catalog'); }}>
                Zobrazit více &rarr;
              </span>
            </header>
            <div className="slider-container-wrapper">
              <button onClick={() => handleScroll(gradedCardsRef, 'left')} className="scroll-arrow-btn left-arrow" aria-label="Předchozí">‹</button>
              <div ref={gradedCardsRef} className="homepage-product-grid">
              {gradedCards.map(product => (
                <div key={product.id} className={`vf-card type-${product.type}`} onClick={() => handleCardClick(product)}>
                  <div className="vf-art">
                    <div className="card-art">
                      <ProductImage src={product.image} alt={product.name} className="ca-card-img" />
                      <div className="ca-holo"></div>
                      <div className="ca-shine"></div>
                      <div className="ca-grain"></div>
                    </div>
                  </div>
                  <div className="vf-shadow"></div>
                  <div className="vf-info">
                    <div className="vf-name">{product.name}</div>
                    <div className="vf-rule"></div>
                    <div className="vf-meta">
                      <span className="slab-badge">{product.company} {product.grade}</span>
                      <span className="vf-price">{product.price.toLocaleString('cs-CZ')} Kč</span>
                    </div>
                  </div>
                </div>
              ))}
              </div>
              <button onClick={() => handleScroll(gradedCardsRef, 'right')} className="scroll-arrow-btn right-arrow" aria-label="Další">›</button>
            </div>
            <div className="more-link-mobile-wrapper">
              <span className="nv-link more-link-mobile" onClick={() => { setFilters({}); setActivePage('slabs-catalog'); }}>
                Zobrazit více &rarr;
              </span>
            </div>
          </section>
        )}
      </div>

      {/* 4. Příslušenství (Accessories) */}
      <section style={{ ...styles.sectionContainer, marginBottom: isMobile ? '24px' : '40px', paddingBottom: isMobile ? '48px' : '0' }} className="container">
        <header className="nv-header">
          <div className="nv-header-left">
            <div className="nv-eyebrow">Doplňky pro sběratele</div>
            <h2 className="nv-title">Příslušenství</h2>
          </div>
          <span className="nv-link more-link-desktop" onClick={() => { setFilters({ game: 'Accessories' }); setActivePage('sealed-catalog'); }}>
            Zobrazit více &rarr;
          </span>
        </header>
        <div className="slider-container-wrapper">
          <button onClick={() => handleScroll(accessoriesRef, 'left')} className="scroll-arrow-btn left-arrow" aria-label="Předchozí">‹</button>
          <div ref={accessoriesRef} className="homepage-product-grid">
            {accessories.map(product => (
              <div key={product.id} className={`vf-card type-${product.type}`} onClick={() => handleCardClick(product)}>
                <div className="vf-art">
                  <div className="card-art">
                    <ProductImage src={product.image} alt={product.name} className="ca-card-img" />
                    <div className="ca-holo"></div>
                    <div className="ca-shine"></div>
                    <div className="ca-grain"></div>
                  </div>
                </div>
                <div className="vf-shadow"></div>
                <div className="vf-info">
                  <div className="vf-name">{product.name}</div>
                  <div className="vf-rule"></div>
                  <div className="vf-meta">
                    <span className="vf-stock">
                      <span className="vf-dot"></span>
                      Skladem
                    </span>
                    <span className="vf-price">{product.price.toLocaleString('cs-CZ')} Kč</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => handleScroll(accessoriesRef, 'right')} className="scroll-arrow-btn right-arrow" aria-label="Další">›</button>
        </div>
        <div className="more-link-mobile-wrapper">
          <span className="nv-link more-link-mobile" onClick={() => { setFilters({ game: 'Accessories' }); setActivePage('sealed-catalog'); }}>
            Zobrazit více &rarr;
          </span>
        </div>
      </section>

      {/* Testimonials */}
      <section style={styles.sectionContainer} className="container testimonials-section">
        <header className="testimonials-header">
          <div className="testimonials-header-left">
            <div className="testimonials-eyebrow">RECENZE OVĚŘENÝCH ZÁKAZNÍKŮ</div>
            <h2 className="testimonials-title">Co o nás říkají</h2>
          </div>
          <div className="testimonials-rating-desktop">
            <span className="testimonials-stars">★★★★★</span>
            <span className="testimonials-rating-text">4,8 • 312 hodnocení</span>
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

      {/* Newsletter */}
      <section className="newsletter-section-wrapper">
        <div className="container newsletter-section">
          <div className="newsletter-content">
            <div className="newsletter-eyebrow">NEWSLETTER • 028</div>
            <h2 className="newsletter-heading">
              {FEATURE_FLAGS.showBuylist ? 'Nové edice & výkupy jako první.' : 'Nové edice & akce jako první.'}
            </h2>
          </div>
          <form className="newsletter-form" onSubmit={(e) => { e.preventDefault(); alert('Děkujeme za přihlášení k newsletteru!'); }}>
            <div className="newsletter-input-group">
              <label className="newsletter-input-label">VÁŠ E-MAIL</label>
              <input type="email" required placeholder="jmeno@example.com" className="newsletter-underline-input" />
            </div>
            <button className="newsletter-submit-btn" type="submit">ODEBÍRAT &rarr;</button>
          </form>
        </div>
      </section>
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
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
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
