import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from '../context/LanguageContext';
import { fetchDailyDealFromDB } from '../services/dailyDeal';
import { fetchProductByIdFromDB } from '../services/products';

export default function DealOfTheDay({ products, addToCart, setSelectedProductId, setActivePage }) {
  const { lang } = useTranslation();
  
  // Deal data state with localStorage fallback
  const [deal, setDeal] = useState(() => {
    try {
      const cached = localStorage.getItem('northvale-cached-deal');
      if (cached) return JSON.parse(cached);
    } catch (e) {
      console.warn('Failed to load cached daily deal:', e);
    }
    return null;
  });

  const [dealAdded, setDealAdded] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isBtnHovered, setIsBtnHovered] = useState(false);
  const [dealProduct, setDealProduct] = useState(null);

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

  useEffect(() => {
    let active = true;
    async function loadProduct() {
      if (activeDeal && activeDeal.product_id) {
        const prod = await fetchProductByIdFromDB(activeDeal.product_id);
        if (active) {
          setDealProduct(prod);
        }
      }
    }
    loadProduct();
    return () => {
      active = false;
    };
  }, [activeDeal.product_id]);

  // Load daily deal from Supabase on mount
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

  // Find linked product in catalog
  const catalogProduct = dealProduct;
  const dealProductPrice = Number(activeDeal.price || 0);
  const getDealStock = () => {
    if (activeDeal.stock && Number(activeDeal.stock) > 0) {
      return Number(activeDeal.stock);
    }
    if (dealProduct) {
      if (dealProduct.variants && dealProduct.variants.length > 0) {
        return dealProduct.variants.reduce((sum, v) => sum + Number(v.stock || 0), 0);
      }
      return Number(dealProduct.stock || 0);
    }
    return Number(activeDeal.stock || 0);
  };
  const dealProductStock = getDealStock();
  const dealProductOriginalPrice = activeDeal.original_price ? Number(activeDeal.original_price) : null;

  // Countdown timer logic based on absolute ends_at timestamp
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
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeDeal.ends_at]);

  const handleCardClick = () => {
    if (!catalogProduct) return;
    setSelectedProductId(catalogProduct.id);
    if (catalogProduct.type === 'single' || catalogProduct.type === 'slab') {
      setActivePage('singles-detail');
    } else {
      setActivePage('sealed-detail');
    }
  };

  const handleBuyDealClick = (e) => {
    e.stopPropagation();
    const productToBuy = catalogProduct || {
      id: activeDeal.product_id || 'deal-of-the-day',
      name: activeDeal.name,
      image: activeDeal.image_url || '/9.png',
      stock: dealProductStock,
      price: dealProductPrice,
      originalPrice: dealProductOriginalPrice,
      type: 'sealed'
    };

    // Create a modified product payload carrying the deal overrides
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

  const discountPercent = dealProductOriginalPrice 
    ? Math.round(((dealProductOriginalPrice - dealProductPrice) / dealProductOriginalPrice) * 100)
    : 0;

  return (
    <div 
      className="glass-panel deal-widget-banner"
      style={{ 
        flex: '0 0 auto',
        height: '420px', 
        padding: '16px 16px 0 16px',
        flexDirection: 'column',
        alignItems: 'stretch',
        justifyContent: 'space-between',
        display: 'flex',
        overflow: 'hidden',
        position: 'relative',
        width: '100%',
        boxSizing: 'border-box',
        marginBottom: '20px'
      }}
    >
      {/* Top: Title */}
      <h3 
        style={{ 
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
        }}
        onClick={handleCardClick}
      >
        {activeDeal.name}
      </h3>

      {/* Center: Image Container */}
      <div 
        style={{
          height: '175px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          zIndex: 1,
          cursor: catalogProduct ? 'pointer' : 'default',
          marginTop: '16px',
          marginBottom: '8px'
        }}
        onClick={handleCardClick}
      >
        <img 
          src={activeDeal.image_url || '/logo s popisem.webp'} 
          alt={activeDeal.name || 'Akční nabídka - Northvale TCG'} 
          width="125"
          height="175"
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
                {dealProductOriginalPrice.toLocaleString(lang === 'CZ' ? 'cs-CZ' : 'en-US')} {lang === 'CZ' ? 'Kč' : 'CZK'}
              </span>
            )}
          </div>
          <span style={{ fontSize: '19px', fontWeight: '800', color: 'var(--color-gold)', marginTop: '2px', whiteSpace: 'nowrap' }}>
            {dealProductPrice.toLocaleString(lang === 'CZ' ? 'cs-CZ' : 'en-US')} {lang === 'CZ' ? 'Kč' : 'CZK'}
          </span>
        </div>

        <button 
          className="btn btn-primary" 
          onMouseEnter={() => setIsBtnHovered(true)}
          onMouseLeave={() => setIsBtnHovered(false)}
          style={{
            backgroundColor: dealAdded 
              ? 'var(--color-gold-hover)' 
              : (isBtnHovered ? 'var(--color-gold-hover)' : 'var(--color-gold)'),
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
            transform: dealAdded ? 'scale(0.95)' : (isBtnHovered ? 'scale(1.05)' : 'scale(1)'),
            transition: 'all 0.15s ease',
            boxShadow: isBtnHovered 
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
    </div>
  );
}

