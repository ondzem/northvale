import { useState, useEffect } from 'react';

export default function DealOfTheDay({ products, addToCart, setSelectedProductId, setActivePage }) {
  const dealProduct = products.find(p => p.id === 'deal-of-the-day') || products.find(p => p.price !== undefined) || products[0];
  const dealProductHasVariants = dealProduct.variants && dealProduct.variants.length > 0;
  const dealProductPrice = dealProductHasVariants ? dealProduct.variants[0].price : (dealProduct.price || 0);
  const dealProductStock = dealProductHasVariants ? dealProduct.variants[0].stock : (dealProduct.stock || 0);
  const dealProductOriginalPrice = dealProduct.originalPrice || (dealProductHasVariants ? dealProduct.variants[0].originalPrice : null);
  
  // Deal of the day countdown timer
  const [timeLeft, setTimeLeft] = useState({ hours: 14, minutes: 35, seconds: 22 });
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

  const handleCardClick = () => {
    setSelectedProductId(dealProduct.id);
    if (dealProduct.type === 'single' || dealProduct.type === 'slab') {
      setActivePage('singles-detail');
    } else {
      setActivePage('sealed-detail');
    }
  };

  const handleBuyDealClick = (e) => {
    e.stopPropagation();
    addToCart(dealProduct.variants ? dealProduct.variants[0] : dealProduct, dealProduct);
    setDealAdded(true);
    setTimeout(() => {
      setDealAdded(false);
    }, 1500);
  };

  const discountPercent = dealProductOriginalPrice 
    ? Math.round(((dealProductOriginalPrice - dealProductPrice) / dealProductOriginalPrice) * 100)
    : 33;

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
        cursor: 'pointer',
        width: '100%',
        boxSizing: 'border-box',
        marginBottom: '20px'
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
      }} onClick={handleCardClick}>
        {dealProduct.name}
      </h3>

      {/* Center: Image Container */}
      <div style={{
        height: '145px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        zIndex: 1,
        cursor: 'pointer',
        marginTop: '34px',
        marginBottom: '8px'
      }} onClick={handleCardClick}>
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
              -{discountPercent} %
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', textDecoration: 'line-through' }}>
              {dealProductOriginalPrice ? dealProductOriginalPrice.toLocaleString() : '2 690'} Kč
            </span>
          </div>
          <span style={{ fontSize: '19px', fontWeight: '800', color: 'var(--color-gold)', marginTop: '2px', whiteSpace: 'nowrap' }}>
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
            cursor: dealProductStock > 0 ? 'pointer' : 'not-allowed',
            flex: '0 0 auto',
            minWidth: '110px',
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
    </div>
  );
}
