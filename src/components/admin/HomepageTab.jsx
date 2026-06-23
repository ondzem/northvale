import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from '../../context/LanguageContext';
import { fetchSlidesFromDB, saveSlideToDB, deleteSlideFromDB } from '../../services/slides';
import { fetchDailyDealFromDB, saveDailyDealToDB, fetchDailyDealsFromDB } from '../../services/dailyDeal';
import { fetchProductsFromDB } from '../../services/products';
import { fetchHomepageSectionsFromDB, saveHomepageSectionToDB } from '../../services/homepageSections';

export default function HomepageTab({ showToast, onEditProduct }) {
  const { lang } = useTranslation();
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlide, setSelectedSlide] = useState(null);

  // Form State
  const [formId, setFormId] = useState('');
  const [formDesktopUrl, setFormDesktopUrl] = useState('');
  const [formMobileUrl, setFormMobileUrl] = useState('');
  const [formRedirectType, setFormRedirectType] = useState('home');
  const [formRedirectCustom, setFormRedirectCustom] = useState('');
  const [formSortOrder, setFormSortOrder] = useState('0');

  const [isEditing, setIsEditing] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, slideId: '' });

  // Cropping State
  const [cropTarget, setCropTarget] = useState('desktop'); // 'desktop', 'mobile' or 'deal'
  const [cropImageSrc, setCropImageSrc] = useState(null);
  const [isCropping, setIsCropping] = useState(false);
  const [cropImageFormat, setCropImageFormat] = useState('image/jpeg');

  // Deal of the Day Form State
  const [dealLoading, setDealLoading] = useState(true);
  const [dealSaving, setDealSaving] = useState(false);
  const [dealProductsList, setDealProductsList] = useState([]);
  const [selectedSlotId, setSelectedSlotId] = useState('active-deal');
  
  const [dealName, setDealName] = useState('');
  const [dealProductId, setDealProductId] = useState('');
  const [dealStock, setDealStock] = useState('0');
  const [dealPrice, setDealPrice] = useState('0');
  const [dealOriginalPrice, setDealOriginalPrice] = useState('');
  const [dealDays, setDealDays] = useState('0');
  const [dealHours, setDealHours] = useState('14');
  const [dealMinutes, setDealMinutes] = useState('35');
  const [dealSeconds, setDealSeconds] = useState('0');
  const [dealImageUrl, setDealImageUrl] = useState('');

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 900);
  const [slideshowExpanded, setSlideshowExpanded] = useState(false);
  const [dealExpanded, setDealExpanded] = useState(false);
  const [newsExpanded, setNewsExpanded] = useState(false);
  const [preordersExpanded, setPreordersExpanded] = useState(false);
  const [accessoriesExpanded, setAccessoriesExpanded] = useState(false);

  const [sections, setSections] = useState({ newArrivals: [], preorders: [], accessories: [] });
  const [sectionsLoading, setSectionsLoading] = useState(true);
  const [searchQueries, setSearchQueries] = useState({ newArrivals: '', preorders: '', accessories: '' });

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 900);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Cropper Refs
  const canvasRef = useRef(null);
  const sliderRef = useRef(null);
  const zoomValRef = useRef(null);
  const loadedImage = useRef(null);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const minScaleRef = useRef(0.1);
  const cropRefX = useRef(0);
  const cropRefY = useRef(0);
  const cropRefScale = useRef(1);

  // List of standard storefront redirect destinations
  const REDIRECT_OPTIONS = [
    { value: 'home', labelCz: 'Úvodní stránka', labelEn: 'Homepage' },
    { value: 'sealed-catalog', labelCz: 'Zapečetěné produkty (Sealed)', labelEn: 'Sealed Products' },
    { value: 'singles-catalog', labelCz: 'Kusové karty (Singles)', labelEn: 'Singles Catalog' },
    { value: 'slabs-catalog', labelCz: 'Ohodnocené karty (Slabs)', labelEn: 'Graded Slabs' },
    { value: 'grading', labelCz: 'Zprostředkování gradingu', labelEn: 'Grading Service' },
    { value: 'buylist', labelCz: 'Výkup karet (Buylist)', labelEn: 'Card Buylist' },
    { value: 'about', labelCz: 'O nás (Příběh)', labelEn: 'About Us' },
    { value: 'support', labelCz: 'Kontakt a podpora', labelEn: 'Contact & Support' },
    { value: 'custom', labelCz: 'Vlastní URL / Odkaz', labelEn: 'Custom URL / Path' }
  ];

  useEffect(() => {
    loadSlides();
    loadDailyDeal();
  }, []);

  const loadSections = async (productsList = []) => {
    setSectionsLoading(true);
    const data = await fetchHomepageSectionsFromDB();
    
    const resolvedSections = {
      newArrivals: data?.newArrivals?.length > 0 
        ? data.newArrivals 
        : productsList.filter(p => p.type === 'single').slice(0, 5).map(p => p.id),
      preorders: data?.preorders?.length > 0 
        ? data.preorders 
        : productsList.filter(p => p.type === 'sealed' && p.preorder).slice(0, 5).map(p => p.id),
      accessories: data?.accessories?.length > 0 
        ? data.accessories 
        : productsList.filter(p => p.type === 'accessory').slice(0, 5).map(p => p.id)
    };

    setSections(resolvedSections);
    setSectionsLoading(false);
  };

  const handleSaveSection = async (sectionKey) => {
    const productIds = sections[sectionKey] || [];
    const { data, error, isMockFallback } = await saveHomepageSectionToDB(sectionKey, productIds);
    if (error) {
      showToast(lang === 'CZ' ? 'Chyba při ukládání sekce!' : 'Error saving section!', 'error');
    } else {
      if (data) {
        setSections(data);
      }
      showToast(
        isMockFallback
          ? (lang === 'CZ' ? 'Sekce uložena lokálně (Chyba DB)!' : 'Section saved locally (DB error)!')
          : (lang === 'CZ' ? 'Sekce úspěšně uložena!' : 'Section successfully saved!'),
        isMockFallback ? 'warning' : 'success'
      );
    }
  };

  const handleAddProductToSection = (sectionKey, productId) => {
    const currentList = sections[sectionKey] || [];
    if (currentList.includes(productId)) {
      showToast(lang === 'CZ' ? 'Tento produkt již v sekci je!' : 'This product is already in the section!', 'warning');
      return;
    }
    setSections(prev => ({
      ...prev,
      [sectionKey]: [...currentList, productId]
    }));
    setSearchQueries(prev => ({
      ...prev,
      [sectionKey]: ''
    }));
  };

  const handleRemoveProductFromSection = (sectionKey, productId) => {
    setSections(prev => ({
      ...prev,
      [sectionKey]: (prev[sectionKey] || []).filter(id => id !== productId)
    }));
  };

  const handleMoveProduct = (sectionKey, index, direction) => {
    const list = [...(sections[sectionKey] || [])];
    if (direction === 'up' && index > 0) {
      const temp = list[index];
      list[index] = list[index - 1];
      list[index - 1] = temp;
    } else if (direction === 'down' && index < list.length - 1) {
      const temp = list[index];
      list[index] = list[index + 1];
      list[index + 1] = temp;
    }
    setSections(prev => ({
      ...prev,
      [sectionKey]: list
    }));
  };

  const renderSectionCms = (sectionKey) => {
    const query = searchQueries[sectionKey] || '';
    const currentIds = sections[sectionKey] || [];
    
    let matches = [];
    if (query.trim().length >= 2) {
      const q = query.toLowerCase().trim();
      matches = dealProductsList.filter(p => p.name.toLowerCase().includes(q)).slice(0, 8);
    }

    const selectedProducts = currentIds
      .map(id => dealProductsList.find(p => p.id === id))
      .filter(Boolean);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <p className="ctf-col-sub" style={{ marginBottom: '8px' }}>
          {sectionKey === 'newArrivals' 
            ? (lang === 'CZ' ? 'Vyberte produkty, které se zobrazí v sekci Novinky na hlavní stránce. Můžete měnit jejich pořadí.' : 'Select products to display in the New Releases section on the homepage. You can change their sorting order.')
            : sectionKey === 'preorders'
            ? (lang === 'CZ' ? 'Vyberte produkty, které se zobrazí v sekci Předobjednávky na hlavní stránce. Můžete měnit jejich pořadí.' : 'Select products to display in the Pre-orders section on the homepage. You can change their sorting order.')
            : (lang === 'CZ' ? 'Vyberte produkty, které se zobrazí v sekci Příslušenství na hlavní stránce. Můžete měnit jejich pořadí.' : 'Select products to display in the Accessories section on the homepage. You can change their sorting order.')}
        </p>

        <div className="ctf-field" style={{ position: 'relative' }}>
          <label className="ctf-label">{lang === 'CZ' ? 'Přidat produkt (vyhledat podle názvu)' : 'Add Product (search by title)'}</label>
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '12px' }}>
            <input 
              type="text" 
              className="ctf-input"
              value={query}
              onChange={e => setSearchQueries(prev => ({ ...prev, [sectionKey]: e.target.value }))}
              placeholder={lang === 'CZ' ? 'Začněte psát název produktu (např. Booster, Charizard)...' : 'Type product title (e.g. Booster, Charizard)...'}
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
            {query && (
              <button 
                type="button" 
                className="btn btn-secondary"
                style={{ padding: isMobile ? '10px 16px' : '0 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '6px', cursor: 'pointer', width: isMobile ? '100%' : 'auto' }}
                onClick={() => setSearchQueries(prev => ({ ...prev, [sectionKey]: '' }))}
              >
                {lang === 'CZ' ? 'Zrušit' : 'Clear'}
              </button>
            )}
          </div>

          {query.trim().length >= 2 && (
            <div style={{ 
              position: 'absolute', 
              top: '100%', 
              left: 0, 
              right: 0, 
              background: '#18181c', 
              border: '1px solid rgba(255,255,255,0.1)', 
              borderRadius: '8px', 
              marginTop: '6px', 
              zIndex: 100, 
              maxHeight: '280px', 
              overflowY: 'auto',
              boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
              padding: '8px'
            }}>
              {matches.length === 0 ? (
                <p className="ctf-col-sub" style={{ margin: '12px', fontStyle: 'italic', fontSize: '12px' }}>
                  {lang === 'CZ' ? 'Žádné produkty nenalezeny.' : 'No products found.'}
                </p>
              ) : (
                matches.map(prod => {
                  const isAdded = currentIds.includes(prod.id);
                  return (
                    <div 
                      key={prod.id} 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between', 
                        padding: '8px 12px', 
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                        borderRadius: '6px',
                        cursor: isAdded ? 'default' : 'pointer',
                        transition: 'background 0.2s',
                        background: isAdded ? 'rgba(255,255,255,0.01)' : 'transparent'
                      }}
                      className={isAdded ? '' : 'search-result-row-hover'}
                      onClick={() => !isAdded && handleAddProductToSection(sectionKey, prod.id)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                        <img 
                          src={prod.image || '/logo s popisem.webp'} 
                          alt="" 
                          style={{ width: '32px', height: '32px', objectFit: 'contain', background: '#0c0c0e', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.06)' }} 
                          onError={e => { e.target.src = '/logo s popisem.webp'; }}
                        />
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <span style={{ fontSize: '13px', fontWeight: '600', color: '#fff', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{prod.name}</span>
                          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{prod.price} Kč • {prod.type}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        style={{
                          background: isAdded ? 'rgba(255,255,255,0.06)' : 'rgba(253, 189, 22, 0.1)',
                          border: isAdded ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(253, 189, 22, 0.2)',
                          color: isAdded ? 'rgba(255,255,255,0.4)' : 'var(--color-gold, #fdbd16)',
                          borderRadius: '4px',
                          padding: '4px 10px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          cursor: isAdded ? 'default' : 'pointer'
                        }}
                      >
                        {isAdded ? (lang === 'CZ' ? 'Přidáno' : 'Added') : (lang === 'CZ' ? 'Přidat +' : 'Add +')}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        <div>
          <label className="ctf-label" style={{ marginBottom: '12px', display: 'block' }}>
            {lang === 'CZ' ? `Aktuální karty v sekci (${selectedProducts.length})` : `Current Cards in Section (${selectedProducts.length})`}
          </label>

          {selectedProducts.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', background: 'rgba(255,255,255,0.01)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '8px' }}>
              <p className="ctf-col-sub" style={{ margin: 0, fontStyle: 'italic' }}>
                {lang === 'CZ' ? 'Žádné vybrané produkty. Na hlavní stránce se budou zobrazovat výchozí (nejnovější) produkty.' : 'No selected products. The homepage will display fallback (newest) products.'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {selectedProducts.map((prod, index) => (
                <div 
                  key={prod.id} 
                  style={{
                    display: 'flex',
                    flexDirection: isMobile ? 'column' : 'row',
                    alignItems: isMobile ? 'stretch' : 'center',
                    justifyContent: 'space-between',
                    background: 'rgba(255, 255, 255, 0.01)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '8px',
                    padding: isMobile ? '12px' : '12px 16px',
                    transition: 'all 0.2s',
                    gap: isMobile ? '12px' : '16px'
                  }}
                  className="slide-list-item-card"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: 0, flex: 1 }}>
                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--color-gold)', width: '20px' }}>
                      {index + 1}.
                    </span>
                    <img 
                      src={prod.image || '/logo s popisem.webp'} 
                      alt="" 
                      style={{ width: '40px', height: '40px', objectFit: 'contain', background: '#0c0c0e', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.08)' }} 
                      onError={e => { e.target.src = '/logo s popisem.webp'; }}
                    />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <span style={{ 
                        fontSize: '13px', 
                        fontWeight: 'bold', 
                        color: '#fff', 
                        display: 'block', 
                        lineHeight: '1.4',
                        wordBreak: 'break-word',
                        whiteSpace: isMobile ? 'normal' : 'nowrap',
                        overflow: isMobile ? 'visible' : 'hidden',
                        textOverflow: isMobile ? 'clip' : 'ellipsis'
                      }}>
                        {prod.name}
                      </span>
                      <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                        {prod.price.toLocaleString('cs-CZ')} Kč • {prod.stock > 0 ? (lang === 'CZ' ? 'Skladem' : 'In Stock') : (lang === 'CZ' ? 'Nedostupné' : 'Out of stock')}
                      </span>
                    </div>
                  </div>

                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: isMobile ? '8px' : '12px',
                    justifyContent: isMobile ? 'space-between' : 'flex-end',
                    flexWrap: isMobile ? 'wrap' : 'nowrap',
                    borderTop: isMobile ? '1px solid rgba(255, 255, 255, 0.05)' : 'none',
                    paddingTop: isMobile ? '10px' : '0',
                    marginTop: isMobile ? '2px' : '0'
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'row', gap: '4px', flex: isMobile ? '1 1 auto' : 'none' }}>
                      <button
                        type="button"
                        disabled={index === 0}
                        style={{
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          color: '#fff',
                          opacity: index === 0 ? 0.3 : 1,
                          cursor: index === 0 ? 'not-allowed' : 'pointer',
                          borderRadius: '4px',
                          padding: isMobile ? '8px 12px' : '4px 8px',
                          fontSize: isMobile ? '13px' : '11px',
                          flex: isMobile ? 1 : 'none',
                          textAlign: 'center'
                        }}
                        onClick={() => handleMoveProduct(sectionKey, index, 'up')}
                        title={lang === 'CZ' ? 'Posunout nahoru' : 'Move up'}
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        disabled={index === selectedProducts.length - 1}
                        style={{
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          color: '#fff',
                          opacity: index === selectedProducts.length - 1 ? 0.3 : 1,
                          cursor: index === selectedProducts.length - 1 ? 'not-allowed' : 'pointer',
                          borderRadius: '4px',
                          padding: isMobile ? '8px 12px' : '4px 8px',
                          fontSize: isMobile ? '13px' : '11px',
                          flex: isMobile ? 1 : 'none',
                          textAlign: 'center'
                        }}
                        onClick={() => handleMoveProduct(sectionKey, index, 'down')}
                        title={lang === 'CZ' ? 'Posunout dolů' : 'Move down'}
                      >
                        ▼
                      </button>
                    </div>

                    <button
                      type="button"
                      style={{
                        background: 'rgba(253, 189, 22, 0.08)',
                        border: '1px solid rgba(253, 189, 22, 0.15)',
                        color: 'var(--color-gold)',
                        borderRadius: '4px',
                        padding: isMobile ? '8px 12px' : '6px 10px',
                        cursor: 'pointer',
                        fontSize: isMobile ? '12px' : '11px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        flex: isMobile ? '1 1 auto' : 'none'
                      }}
                      onClick={() => {
                        if (onEditProduct) {
                          onEditProduct(prod.id);
                        } else {
                          showToast(lang === 'CZ' ? 'Rychlá úprava není dostupná.' : 'Quick edit is not available.', 'error');
                        }
                      }}
                      title={lang === 'CZ' ? 'Upravit kartu v katalogu' : 'Edit card in catalog'}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                      {lang === 'CZ' ? 'Upravit' : 'Edit'}
                    </button>

                    <button
                      type="button"
                      style={{
                        background: 'rgba(239, 68, 68, 0.08)',
                        border: '1px solid rgba(239, 68, 68, 0.15)',
                        color: '#ef4444',
                        borderRadius: '4px',
                        padding: isMobile ? '8px 12px' : '6px 10px',
                        cursor: 'pointer',
                        fontSize: isMobile ? '12px' : '11px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        flex: isMobile ? '1 1 auto' : 'none'
                      }}
                      onClick={() => handleRemoveProductFromSection(sectionKey, prod.id)}
                      title={lang === 'CZ' ? 'Odebrat z úvodní stránky' : 'Remove from homepage'}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                      {lang === 'CZ' ? 'Odebrat' : 'Remove'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Save Button */}
        <button
          type="button"
          className="btn btn-primary"
          style={{ width: '100%', padding: '12px', marginTop: '12px' }}
          onClick={() => handleSaveSection(sectionKey)}
        >
          {lang === 'CZ' ? 'Uložit změny v sekci' : 'Save Section Changes'}
        </button>
      </div>
    );
  };

  const loadSlides = async () => {
    setLoading(true);
    const data = await fetchSlidesFromDB();
    setSlides(data || []);
    setLoading(false);
  };

  const loadDailyDeal = async () => {
    setDealLoading(true);
    try {
      const allProducts = await fetchProductsFromDB();
      setDealProductsList(allProducts || []);
      
      // Load sections with products preloaded so defaults can be computed
      await loadSections(allProducts || []);

      await handleSlotChange(selectedSlotId);
    } catch (err) {
      console.error('Failed to load daily deal in admin:', err);
      setDealLoading(false);
    }
  };

  const handleSlotChange = async (slotId) => {
    setSelectedSlotId(slotId);
    setDealLoading(true);
    try {
      const dealsList = await fetchDailyDealsFromDB();
      const slotDeal = dealsList.find(d => d.id === slotId);

      if (slotDeal) {
        setDealName(slotDeal.name || '');
        setDealProductId(slotDeal.product_id || '');
        setDealStock(String(slotDeal.stock || 0));
        setDealPrice(String(slotDeal.price || 0));
        setDealOriginalPrice(slotDeal.original_price ? String(slotDeal.original_price) : '');
        setDealImageUrl(slotDeal.image_url || '');

        let durationMs = 0;
        if (slotId === 'active-deal') {
          const endsAt = new Date(slotDeal.ends_at).getTime();
          durationMs = Math.max(0, endsAt - Date.now());
        } else if (slotId === 'deal-2') {
          const deal1 = dealsList.find(d => d.id === 'active-deal');
          const parentEndsAt = deal1 ? new Date(deal1.ends_at).getTime() : Date.now();
          durationMs = Math.max(0, new Date(slotDeal.ends_at).getTime() - parentEndsAt);
        } else { // deal-3
          const deal2 = dealsList.find(d => d.id === 'deal-2');
          const deal1 = dealsList.find(d => d.id === 'active-deal');
          const parentEndsAt = deal2 ? new Date(deal2.ends_at).getTime() : (deal1 ? new Date(deal1.ends_at).getTime() : Date.now());
          durationMs = Math.max(0, new Date(slotDeal.ends_at).getTime() - parentEndsAt);
        }

        const totalSecs = Math.floor(durationMs / 1000);
        setDealDays(String(Math.floor(totalSecs / (3600 * 24))));
        setDealHours(String(Math.floor((totalSecs % (3600 * 24)) / 3600)));
        setDealMinutes(String(Math.floor((totalSecs % 3600) / 60)));
        setDealSeconds(String(totalSecs % 60));
      } else {
        // Clear forms if slot is new/empty
        setDealName('');
        setDealProductId('');
        setDealStock('0');
        setDealPrice('0');
        setDealOriginalPrice('');
        setDealImageUrl('');
        setDealDays('0');
        setDealHours('24');
        setDealMinutes('0');
        setDealSeconds('0');
      }
    } catch (err) {
      console.error('Failed to switch daily deal slot:', err);
    }
    setDealLoading(false);
  };

  const handleAutoFillFromProduct = (prodId) => {
    const prod = dealProductsList.find(p => p.id === prodId);
    if (prod) {
      setDealName(prod.name || '');
      setDealStock(String(prod.stock || 0));
      const activePrice = prod.variants && prod.variants.length > 0 
        ? prod.variants[0].price 
        : (prod.price || 0);
      setDealPrice(String(activePrice));
      
      const activeOriginalPrice = prod.originalPrice || (prod.variants && prod.variants.length > 0 ? prod.variants[0].originalPrice : null);
      setDealOriginalPrice(activeOriginalPrice ? String(activeOriginalPrice) : String(Math.round(activePrice * 1.3)));
      
      setDealImageUrl(prod.image || '');
      showToast(lang === 'CZ' ? 'Pole předvyplněna z produktu!' : 'Form pre-filled from product!', 'success');
    }
  };

  const handleSaveDailyDeal = async (e) => {
    e.preventDefault();
    setDealSaving(true);

    const daysOffset = Number(dealDays || 0) * 24 * 3600 * 1000;
    const hoursOffset = Number(dealHours || 0) * 3600 * 1000;
    const minsOffset = Number(dealMinutes || 0) * 60 * 1000;
    const secsOffset = Number(dealSeconds || 0) * 1000;
    const durationMs = daysOffset + hoursOffset + minsOffset + secsOffset;

    try {
      const dealsList = await fetchDailyDealsFromDB();
      const deal1 = dealsList.find(d => d.id === 'active-deal');
      const deal2 = dealsList.find(d => d.id === 'deal-2');
      const deal3 = dealsList.find(d => d.id === 'deal-3');

      let endsAtIso = '';
      if (selectedSlotId === 'active-deal') {
        endsAtIso = new Date(Date.now() + durationMs).toISOString();
      } else if (selectedSlotId === 'deal-2') {
        const parentEndsAt = deal1 ? new Date(deal1.ends_at).getTime() : Date.now();
        endsAtIso = new Date(parentEndsAt + durationMs).toISOString();
      } else { // deal-3
        const parentEndsAt = deal2 ? new Date(deal2.ends_at).getTime() : (deal1 ? new Date(deal1.ends_at).getTime() : Date.now());
        endsAtIso = new Date(parentEndsAt + durationMs).toISOString();
      }

      const payload = {
        name: dealName,
        product_id: dealProductId || null,
        stock: Number(dealStock || 0),
        price: Number(dealPrice || 0),
        original_price: dealOriginalPrice ? Number(dealOriginalPrice) : null,
        image_url: dealImageUrl || null,
        ends_at: endsAtIso,
        expiry_notified: false
      };

      const { error, isMockFallback } = await saveDailyDealToDB(payload, selectedSlotId);

      if (error) {
        throw error;
      }

      const newT_saved = new Date(endsAtIso).getTime();

      // Cascade shifts
      if (selectedSlotId === 'active-deal') {
        if (deal2 && deal1) {
          const oldT1 = new Date(deal1.ends_at).getTime();
          const oldT2 = new Date(deal2.ends_at).getTime();
          const durationSlot2 = Math.max(0, oldT2 - oldT1);
          const newT2 = newT_saved + durationSlot2;
          const newT2Iso = new Date(newT2).toISOString();
          
          await saveDailyDealToDB({ ...deal2, ends_at: newT2Iso }, 'deal-2');

          if (deal3) {
            const oldT3 = new Date(deal3.ends_at).getTime();
            const durationSlot3 = Math.max(0, oldT3 - oldT2);
            const newT3 = newT2 + durationSlot3;
            const newT3Iso = new Date(newT3).toISOString();

            await saveDailyDealToDB({ ...deal3, ends_at: newT3Iso }, 'deal-3');
          }
        }
      } else if (selectedSlotId === 'deal-2') {
        if (deal3 && deal2) {
          const oldT2 = new Date(deal2.ends_at).getTime();
          const oldT3 = new Date(deal3.ends_at).getTime();
          const durationSlot3 = Math.max(0, oldT3 - oldT2);
          const newT3 = newT_saved + durationSlot3;
          const newT3Iso = new Date(newT3).toISOString();

          await saveDailyDealToDB({ ...deal3, ends_at: newT3Iso }, 'deal-3');
        }
      }

      showToast(
        isMockFallback
          ? (lang === 'CZ' ? 'Akce dne uložena pouze lokálně (Chyba DB)!' : 'Daily deal saved locally only (DB error)!')
          : (lang === 'CZ' ? 'Akce dne úspěšně uložena!' : 'Deal of the Day successfully saved!'),
        isMockFallback ? 'warning' : 'success'
      );

      // Reload form states
      await loadDailyDeal();
    } catch (err) {
      console.error('Failed to save daily deal:', err);
      showToast(lang === 'CZ' ? 'Chyba při ukládání akce dne!' : 'Error saving Deal of the Day!', 'error');
    }
    setDealSaving(false);
  };

  const handleSelectSlide = (slide) => {
    setSelectedSlide(slide);
    setFormId(slide.id);
    setFormDesktopUrl(slide.desktop_image_url || '');
    setFormMobileUrl(slide.mobile_image_url || '');
    
    // Determine redirect type
    const pageVal = slide.redirect_page || '';
    const isStandard = REDIRECT_OPTIONS.some(opt => opt.value === pageVal && opt.value !== 'custom');
    if (isStandard) {
      setFormRedirectType(pageVal);
      setFormRedirectCustom('');
    } else if (pageVal === '' || pageVal === null) {
      setFormRedirectType('home');
      setFormRedirectCustom('');
    } else {
      setFormRedirectType('custom');
      setFormRedirectCustom(pageVal);
    }

    setFormSortOrder(String(slide.sort_order || 0));
    setIsEditing(true);
  };

  const handleResetForm = () => {
    setSelectedSlide(null);
    setFormId('');
    setFormDesktopUrl('');
    setFormMobileUrl('');
    setFormRedirectType('home');
    setFormRedirectCustom('');
    setFormSortOrder('0');
    setIsEditing(false);
  };

  // --- Canvas Cropper Logic ---
  const processImageFile = (file, target) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      setCropTarget(target);
      setCropImageSrc(event.target.result);
      setCropImageFormat(file.type || 'image/jpeg');
      setIsCropping(true);
      
      // Reset cropping refs
      cropRefX.current = 0;
      cropRefY.current = 0;
      cropRefScale.current = 1;
      minScaleRef.current = 0.01;
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e, target) => {
    const file = e.target.files[0];
    if (file) {
      processImageFile(file, target);
    }
  };

  const handleDrop = (e, target) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      processImageFile(file, target);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  useEffect(() => {
    if (isCropping && cropImageSrc && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.onload = () => {
        loadedImage.current = img;

        // frame resolution helper
        const frameW = cropTarget === 'desktop' ? 280 : (cropTarget === 'mobile' ? 256 : (cropTarget === 'deal' ? 200 : 220));
        const frameH = cropTarget === 'desktop' ? 122 : (cropTarget === 'mobile' ? 320 : (cropTarget === 'deal' ? 280 : 220));

        // Calculate min scale to cover the frame
        const minScaleX = frameW / img.width;
        const minScaleY = frameH / img.height;
        const computedMinScale = Math.max(minScaleX, minScaleY);
        
        const sliderMinScale = 0.01;
        minScaleRef.current = sliderMinScale;

        cropRefScale.current = computedMinScale;
        cropRefX.current = 0;
        cropRefY.current = 0;

        if (sliderRef.current) {
          sliderRef.current.min = sliderMinScale.toString();
          sliderRef.current.max = Math.max(computedMinScale * 4, 3).toString();
          sliderRef.current.step = "0.01";
          sliderRef.current.value = computedMinScale.toString();
        }
        if (zoomValRef.current) {
          zoomValRef.current.textContent = `${Math.round(computedMinScale * 100)}%`;
        }

        drawCanvas();
      };
      img.src = cropImageSrc;
    }
  }, [isCropping, cropImageSrc, cropTarget]);

  const drawCanvas = () => {
    if (!loadedImage.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = loadedImage.current;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const frameW = cropTarget === 'desktop' ? 280 : (cropTarget === 'mobile' ? 256 : (cropTarget === 'deal' ? 200 : 220));
    const frameH = cropTarget === 'desktop' ? 122 : (cropTarget === 'mobile' ? 320 : (cropTarget === 'deal' ? 280 : 220));
    const frameX = (canvas.width - frameW) / 2;
    const frameY = (canvas.height - frameH) / 2;

    ctx.save();

    ctx.beginPath();
    ctx.rect(frameX, frameY, frameW, frameH);
    ctx.clip();

    const scale = cropRefScale.current;
    const drawW = img.width * scale;
    const drawH = img.height * scale;

    let maxLimitX = (drawW - frameW) / 2;
    let minLimitX = (frameW - drawW) / 2;
    let maxLimitY = (drawH - frameH) / 2;
    let minLimitY = (frameH - drawH) / 2;

    if (minLimitX > maxLimitX) {
      cropRefX.current = 0;
    } else {
      cropRefX.current = Math.max(minLimitX, Math.min(maxLimitX, cropRefX.current));
    }

    if (minLimitY > maxLimitY) {
      cropRefY.current = 0;
    } else {
      cropRefY.current = Math.max(minLimitY, Math.min(maxLimitY, cropRefY.current));
    }

    const drawX = frameX + (frameW - drawW) / 2 + cropRefX.current;
    const drawY = frameY + (frameH - drawH) / 2 + cropRefY.current;

    ctx.drawImage(img, drawX, drawY, drawW, drawH);

    ctx.restore();

    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fillRect(0, 0, canvas.width, frameY);
    ctx.fillRect(0, frameY + frameH, canvas.width, frameY);
    ctx.fillRect(0, frameY, frameX, frameH);
    ctx.fillRect(frameX + frameW, frameY, frameX, frameH);

    ctx.strokeStyle = 'var(--color-gold, #fdbd16)';
    ctx.lineWidth = 2;
    ctx.strokeRect(frameX, frameY, frameW, frameH);
  };

  const handleCanvasMouseDown = (e) => {
    isDragging.current = true;
    const rect = canvasRef.current.getBoundingClientRect();
    dragStart.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const handleCanvasMouseMove = (e) => {
    if (!isDragging.current || !loadedImage.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const dx = mouseX - dragStart.current.x;
    const dy = mouseY - dragStart.current.y;

    cropRefX.current += dx;
    cropRefY.current += dy;

    dragStart.current = { x: mouseX, y: mouseY };
    drawCanvas();
  };

  const handleCanvasMouseUp = () => {
    isDragging.current = false;
  };

  const handleCanvasTouchStart = (e) => {
    if (e.touches.length !== 1) return;
    isDragging.current = true;
    const rect = canvasRef.current.getBoundingClientRect();
    dragStart.current = {
      x: e.touches[0].clientX - rect.left,
      y: e.touches[0].clientY - rect.top
    };
  };

  const handleCanvasTouchMove = (e) => {
    if (!isDragging.current || !loadedImage.current || e.touches.length !== 1) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.touches[0].clientX - rect.left;
    const mouseY = e.touches[0].clientY - rect.top;

    const dx = mouseX - dragStart.current.x;
    const dy = mouseY - dragStart.current.y;

    cropRefX.current += dx;
    cropRefY.current += dy;

    dragStart.current = { x: mouseX, y: mouseY };
    drawCanvas();
  };

  const handleCropAction = () => {
    if (!loadedImage.current || !canvasRef.current) return;

    const img = loadedImage.current;
    const frameW = cropTarget === 'desktop' ? 280 : (cropTarget === 'mobile' ? 256 : (cropTarget === 'deal' ? 200 : 220));
    const frameH = cropTarget === 'desktop' ? 122 : (cropTarget === 'mobile' ? 320 : (cropTarget === 'deal' ? 280 : 220));

    const scale = cropRefScale.current;
    const drawW = img.width * scale;
    const drawH = img.height * scale;

    const imageLeft = (frameW - drawW) / 2 + cropRefX.current;
    const imageTop = (frameH - drawH) / 2 + cropRefY.current;

    const visibleX = Math.max(0, imageLeft);
    const visibleY = Math.max(0, imageTop);
    const visibleW = Math.min(frameW, imageLeft + drawW) - visibleX;
    const visibleH = Math.min(frameH, imageTop + drawH) - visibleY;

    if (visibleW <= 0 || visibleH <= 0) {
      showToast(lang === 'CZ' ? 'Obrázek je mimo ořezové pole!' : 'Image is outside the crop frame!', 'error');
      return;
    }

    const baseW = cropTarget === 'desktop' ? 1920 : (cropTarget === 'mobile' ? 800 : (cropTarget === 'deal' ? 1000 : 500));
    const scaleFactor = baseW / frameW;

    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = visibleW * scaleFactor;
    cropCanvas.height = visibleH * scaleFactor;
    const cropCtx = cropCanvas.getContext('2d');

    const sourceXInScaledImage = visibleX - imageLeft;
    const sourceYInScaledImage = visibleY - imageTop;

    const sx = sourceXInScaledImage / scale;
    const sy = sourceYInScaledImage / scale;
    const sw = visibleW / scale;
    const sh = visibleH / scale;

    cropCtx.imageSmoothingEnabled = true;
    cropCtx.imageSmoothingQuality = 'high';

    const isPng = cropImageFormat === 'image/png' || cropTarget === 'deal';

    if (!isPng) {
      cropCtx.fillStyle = '#1c1c22';
      cropCtx.fillRect(0, 0, cropCanvas.width, cropCanvas.height);
    } else {
      cropCtx.clearRect(0, 0, cropCanvas.width, cropCanvas.height);
    }

    cropCtx.drawImage(
      img,
      sx,
      sy,
      sw,
      sh,
      0,
      0,
      cropCanvas.width,
      cropCanvas.height
    );

    const format = isPng ? 'image/png' : 'image/jpeg';
    const quality = isPng ? undefined : 0.85;
    const croppedUrl = cropCanvas.toDataURL(format, quality);
    if (cropTarget === 'desktop') {
      setFormDesktopUrl(croppedUrl);
    } else if (cropTarget === 'mobile') {
      setFormMobileUrl(croppedUrl);
    } else if (cropTarget === 'deal') {
      setDealImageUrl(croppedUrl);
    }

    setIsCropping(false);
    setCropImageSrc(null);
    showToast(lang === 'CZ' ? 'Obrázek byl úspěšně oříznut!' : 'Image cropped successfully!', 'success');
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (!formDesktopUrl.trim()) {
      showToast(lang === 'CZ' ? 'Vyplňte nebo nahrajte desktopový obrázek!' : 'Desktop image is required!', 'error');
      return;
    }
    if (!formMobileUrl.trim()) {
      showToast(lang === 'CZ' ? 'Vyplňte nebo nahrajte mobilní obrázek!' : 'Mobile image is required!', 'error');
      return;
    }

    const redirectVal = formRedirectType === 'custom' ? formRedirectCustom : formRedirectType;

    const slideData = {
      id: formId || undefined,
      desktop_image_url: formDesktopUrl,
      mobile_image_url: formMobileUrl,
      redirect_page: redirectVal || null,
      sort_order: Number(formSortOrder || 0)
    };

    const { data, error } = await saveSlideToDB(slideData);
    if (error) {
      showToast(lang === 'CZ' ? 'Chyba při ukládání snímku.' : 'Error saving slide.', 'error');
    } else {
      showToast(lang === 'CZ' ? 'Snímek byl úspěšně uložen!' : 'Slide saved successfully!', 'success');
      loadSlides();
      handleResetForm();
    }
  };

  const handleDelete = async (id) => {
    const { error } = await deleteSlideFromDB(id);
    if (error) {
      showToast(lang === 'CZ' ? 'Chyba při mazání snímku.' : 'Error deleting slide.', 'error');
    } else {
      showToast(lang === 'CZ' ? 'Snímek byl úspěšně smazán.' : 'Slide deleted successfully.', 'success');
      loadSlides();
      handleResetForm();
    }
    setDeleteConfirm({ isOpen: false, slideId: '' });
  };

  const getRedirectLabel = (pageVal) => {
    if (!pageVal) return lang === 'CZ' ? 'Žádný proklik' : 'No redirect';
    const opt = REDIRECT_OPTIONS.find(o => o.value === pageVal);
    if (opt) return lang === 'CZ' ? opt.labelCz : opt.labelEn;
    return pageVal;
  };
  const previewDiscount = dealOriginalPrice && dealPrice
    ? Math.round(((Number(dealOriginalPrice) - Number(dealPrice)) / Number(dealOriginalPrice)) * 100)
    : 0;

  const allCollapsed = !slideshowExpanded && !dealExpanded && !newsExpanded && !preordersExpanded && !accessoriesExpanded;

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: allCollapsed ? '16px' : '36px', 
      transition: 'gap 0.3s cubic-bezier(0.4, 0, 0.2, 1)' 
    }}>
      
      {/* SECTION 1: HERO SLIDESHOW */}
      <div className="admin-accordion-item">
        <div 
          className={`admin-accordion-header ${slideshowExpanded ? 'is-open' : ''}`}
          onClick={() => setSlideshowExpanded(!slideshowExpanded)}
        >
          <h3 className="admin-accordion-header-title">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-gold)' }}>
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="3" y1="9" x2="21" y2="9"></line>
              <line x1="9" y1="21" x2="9" y2="9"></line>
            </svg>
            <span>{lang === 'CZ' ? 'Bannery v slideshow' : 'Slideshow Banners'}</span>
          </h3>
          <div className="admin-accordion-header-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </div>
        </div>

        {slideshowExpanded && (
          <div className="admin-accordion-content">
            <div className="ctf-shell">
            {/* Left panel: Slide list */}
            <section className="ctf-tree-col" style={{ flex: '1.2 1 0%', maxWidth: 'none' }}>
              <div>
                <h3 className="ctf-col-title">{lang === 'CZ' ? 'Aktuální snímky' : 'Current Slides'}</h3>
          <p className="ctf-col-sub">
            {lang === 'CZ' 
              ? 'Seznam bannerů v úvodní hero sekci. Snímky se seřadí podle nastaveného pořadí vzestupně.'
              : 'List of banners in the main hero section. Slides are ordered ascending by sort order.'}
          </p>
        </div>

        {loading ? (
          <p className="ctf-col-sub" style={{ marginTop: '24px' }}>{lang === 'CZ' ? 'Načítání...' : 'Loading...'}</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '24px', overflowY: 'auto', maxHeight: '600px', paddingRight: '4px' }}>
            {slides.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', background: 'rgba(255, 255, 255, 0.01)', border: '1px dashed rgba(255, 255, 255, 0.08)', borderRadius: '8px' }}>
                <p className="ctf-col-sub" style={{ margin: 0, fontStyle: 'italic' }}>
                  {lang === 'CZ' ? 'Žádné nahrané snímky. Zobrazují se výchozí šablony.' : 'No uploaded slides. Default templates are currently shown.'}
                </p>
              </div>
            ) : (
              slides.map((slide) => {
                const isSelected = selectedSlide?.id === slide.id;
                const isDefault = String(slide.id).startsWith('default-slide');
                
                return (
                  <div 
                    key={slide.id} 
                    style={{
                      background: isSelected ? 'rgba(253, 189, 22, 0.04)' : 'rgba(255, 255, 255, 0.01)',
                      border: isSelected ? '1px solid var(--color-gold, #fdbd16)' : '1px solid rgba(255, 255, 255, 0.06)',
                      borderRadius: '10px',
                      padding: '16px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      position: 'relative'
                    }}
                    onClick={() => handleSelectSlide(slide)}
                    className="slide-list-item-card"
                  >
                    {/* Badge showing sort order */}
                    <div style={{
                      position: 'absolute',
                      top: '12px',
                      left: '12px',
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '4px',
                      padding: '2px 6px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      color: 'var(--color-gold, #fdbd16)'
                    }}>
                      {lang === 'CZ' ? `Pozice: ${slide.sort_order}` : `Order: ${slide.sort_order}`}
                    </div>

                    {isDefault && (
                      <div style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        background: 'rgba(253, 189, 22, 0.15)',
                        border: '1px solid rgba(253, 189, 22, 0.3)',
                        borderRadius: '4px',
                        padding: '1px 5px',
                        fontSize: '9px',
                        fontWeight: 'bold',
                        color: 'var(--color-gold, #fdbd16)',
                        textTransform: 'uppercase'
                      }}>
                        {lang === 'CZ' ? 'Výchozí' : 'Default'}
                      </div>
                    )}

                    <div style={{ 
                      display: 'flex', 
                      flexDirection: isMobile ? 'column' : 'row', 
                      gap: '16px', 
                      marginTop: '24px', 
                      alignItems: 'stretch' 
                    }} className="slide-list-split">
                      {/* Desktop preview */}
                      <div style={{ flex: '1 1 50%', minWidth: '0' }}>
                        <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>Desktop</span>
                        <div style={{ height: '90px', width: '100%', background: '#0e0e11', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '6px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <img src={slide.desktop_image_url} alt="Desktop slide" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} onError={(e) => { e.target.src = '/logo s popisem.webp'; }} />
                        </div>
                      </div>

                      {/* Mobile preview */}
                      <div style={{ flex: isMobile ? '1 1 auto' : '0 0 90px' }}>
                        <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>Mobil</span>
                        <div style={{ height: '90px', width: isMobile ? '100%' : '90px', background: '#0e0e11', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '6px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <img src={slide.mobile_image_url} alt="Mobile slide" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} onError={(e) => { e.target.src = '/logo s popisem.webp'; }} />
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.04)' }}>
                      <div style={{ minWidth: '0', flex: 1, paddingRight: '12px' }}>
                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', display: 'block' }}>{lang === 'CZ' ? 'Proklik' : 'Link'}:</span>
                        <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#fff', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {getRedirectLabel(slide.redirect_page)}
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                        <button 
                          type="button" 
                          style={{
                            background: 'rgba(239, 68, 68, 0.08)',
                            border: '1px solid rgba(239, 68, 68, 0.15)',
                            color: '#ef4444',
                            borderRadius: '6px',
                            padding: '6px 10px',
                            cursor: 'pointer',
                            fontSize: '11px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isDefault) {
                              showToast(lang === 'CZ' ? 'Výchozí snímky nelze smazat!' : 'Default slides cannot be deleted!', 'error');
                              return;
                            }
                            setDeleteConfirm({ isOpen: true, slideId: slide.id });
                          }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                          {lang === 'CZ' ? 'Smazat' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </section>

      {/* Right panel: Edit Form */}
      <section className="ctf-form-col" style={{ flex: '1 1 0%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h3 className="ctf-col-title" style={{ margin: 0 }}>
            {isEditing 
              ? (lang === 'CZ' ? 'Upravit snímek' : 'Edit Slide')
              : (lang === 'CZ' ? 'Nový snímek slideshow' : 'New Slideshow Slide')}
          </h3>
          {isEditing && (
            <button type="button" className="adf-cat-new-btn" onClick={handleResetForm}>
              <span>{lang === 'CZ' ? 'Nový +' : 'New +'}</span>
            </button>
          )}
        </div>

        <form onSubmit={handleSave} className="ctf-form">
          {/* Pořadí zobrazení */}
          <div className="ctf-field">
            <label className="ctf-label">{lang === 'CZ' ? 'Pořadí (číslo)' : 'Sort Order (number)'}</label>
            <input 
              type="number" 
              className="ctf-input"
              value={formSortOrder} 
              onChange={e => setFormSortOrder(e.target.value)} 
              placeholder="0"
              required 
            />
            <p className="ctf-hint">
              {lang === 'CZ' 
                ? 'Snímky se seřadí vzestupně (od nejnižšího po nejvyšší číslo).' 
                : 'Slides will render in ascending order (from lowest to highest number).'}
            </p>
          </div>

          {/* Desktop Banner Upload & Crop */}
          <div className="ctf-field" style={{ marginTop: '20px' }}>
            <label className="ctf-label">{lang === 'CZ' ? 'Desktopový banner' : 'Desktop Banner'}<span style={{ color: '#ef4444' }}> *</span></label>
            
            {formDesktopUrl ? (
              <div style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)', padding: '12px' }}>
                <div style={{ height: '110px', width: '100%', background: '#0e0e11', borderRadius: '6px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img src={formDesktopUrl} alt="Preview desktop" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <button type="button" className="btn btn-secondary" style={{ flex: 1, fontSize: '11px', padding: '6px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} onClick={() => document.getElementById('desktop-file-input').click()}>{lang === 'CZ' ? 'Změnit fotku' : 'Change Photo'}</button>
                  <button type="button" className="btn btn-secondary" style={{ flex: 1, fontSize: '11px', padding: '6px 12px', color: '#ef4444', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.15)' }} onClick={() => setFormDesktopUrl('')}>{lang === 'CZ' ? 'Odstranit' : 'Remove'}</button>
                </div>
              </div>
            ) : (
              <div 
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, 'desktop')}
                style={{
                  border: '1px dashed rgba(255, 255, 255, 0.15)',
                  borderRadius: '8px',
                  padding: '28px 16px',
                  textAlign: 'center',
                  background: 'rgba(255, 255, 255, 0.01)',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s'
                }}
                onClick={() => document.getElementById('desktop-file-input').click()}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" style={{ color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
                <span style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.6)', fontWeight: 'bold' }}>
                  {lang === 'CZ' ? 'Přetáhněte sem desktopový banner' : 'Drag desktop banner here'}
                </span>
                <span style={{ display: 'block', fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>
                  {lang === 'CZ' ? 'nebo klikněte pro výběr. Poměr stran ořezu: 1920 × 840 px.' : 'or click to select. Crop ratio: 1920 × 840 px.'}
                </span>
              </div>
            )}
            <input 
              id="desktop-file-input" 
              type="file" 
              accept="image/*" 
              style={{ display: 'none' }} 
              onChange={(e) => handleFileChange(e, 'desktop')}
            />

            <div style={{ marginTop: '10px' }}>
              <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '4px' }}>
                {lang === 'CZ' ? 'Nebo zadejte přímou URL adresu obrázku (např. /banners/slide1.webp):' : 'Or enter direct image URL (e.g. /banners/slide1.webp):'}
              </label>
              <input
                type="text"
                className="ctf-input"
                style={{ fontSize: '12px', padding: '8px 12px' }}
                value={formDesktopUrl}
                onChange={e => setFormDesktopUrl(e.target.value)}
                placeholder={lang === 'CZ' ? 'Zadejte URL nebo cestu k obrázku...' : 'Enter URL or image path...'}
              />
            </div>

            {formDesktopUrl && formDesktopUrl.startsWith('data:image') && formDesktopUrl.length > 150000 && (
              <div style={{
                marginTop: '8px',
                padding: '10px 12px',
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.15)',
                borderRadius: '6px',
                color: '#f87171',
                fontSize: '11px',
                lineHeight: '1.4'
              }}>
                <strong>{lang === 'CZ' ? 'Upozornění na výkon:' : 'Performance Warning:'}</strong>{' '}
                {lang === 'CZ'
                  ? 'Tento obrázek je uložen jako velký textový řetězec (Base64). Pro lepší rychlost načítání stránek doporučujeme nahrát soubor do Supabase Storage a vložit jeho veřejný odkaz výše.'
                  : 'This image is stored as a large Base64 string. To prevent page load delays, we recommend uploading the image to Supabase Storage and pasting its public link above.'}
              </div>
            )}
          </div>

          {/* Mobile Banner Upload & Crop */}
          <div className="ctf-field" style={{ marginTop: '20px' }}>
            <label className="ctf-label">{lang === 'CZ' ? 'Mobilní banner' : 'Mobile Banner'}<span style={{ color: '#ef4444' }}> *</span></label>
            
            {formMobileUrl ? (
              <div style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)', padding: '12px' }}>
                <div style={{ height: '110px', width: '100%', background: '#0e0e11', borderRadius: '6px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img src={formMobileUrl} alt="Preview mobile" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <button type="button" className="btn btn-secondary" style={{ flex: 1, fontSize: '11px', padding: '6px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} onClick={() => document.getElementById('mobile-file-input').click()}>{lang === 'CZ' ? 'Změnit fotku' : 'Change Photo'}</button>
                  <button type="button" className="btn btn-secondary" style={{ flex: 1, fontSize: '11px', padding: '6px 12px', color: '#ef4444', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.15)' }} onClick={() => setFormMobileUrl('')}>{lang === 'CZ' ? 'Odstranit' : 'Remove'}</button>
                </div>
              </div>
            ) : (
              <div 
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, 'mobile')}
                style={{
                  border: '1px dashed rgba(255, 255, 255, 0.15)',
                  borderRadius: '8px',
                  padding: '28px 16px',
                  textAlign: 'center',
                  background: 'rgba(255, 255, 255, 0.01)',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s'
                }}
                onClick={() => document.getElementById('mobile-file-input').click()}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" style={{ color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
                <span style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.6)', fontWeight: 'bold' }}>
                  {lang === 'CZ' ? 'Přetáhněte sem mobilní banner' : 'Drag mobile banner here'}
                </span>
                <span style={{ display: 'block', fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>
                  {lang === 'CZ' ? 'nebo klikněte pro výběr. Poměr stran ořezu: 800 × 1000 px.' : 'or click to select. Crop ratio: 800 × 1000 px.'}
                </span>
              </div>
            )}
            <input 
              id="mobile-file-input" 
              type="file" 
              accept="image/*" 
              style={{ display: 'none' }} 
              onChange={(e) => handleFileChange(e, 'mobile')}
            />

            <div style={{ marginTop: '10px' }}>
              <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '4px' }}>
                {lang === 'CZ' ? 'Nebo zadejte přímou URL adresu obrázku (např. /banners/slide1-mobile.webp):' : 'Or enter direct image URL (e.g. /banners/slide1-mobile.webp):'}
              </label>
              <input
                type="text"
                className="ctf-input"
                style={{ fontSize: '12px', padding: '8px 12px' }}
                value={formMobileUrl}
                onChange={e => setFormMobileUrl(e.target.value)}
                placeholder={lang === 'CZ' ? 'Zadejte URL nebo cestu k obrázku...' : 'Enter URL or image path...'}
              />
            </div>

            {formMobileUrl && formMobileUrl.startsWith('data:image') && formMobileUrl.length > 150000 && (
              <div style={{
                marginTop: '8px',
                padding: '10px 12px',
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.15)',
                borderRadius: '6px',
                color: '#f87171',
                fontSize: '11px',
                lineHeight: '1.4'
              }}>
                <strong>{lang === 'CZ' ? 'Upozornění na výkon:' : 'Performance Warning:'}</strong>{' '}
                {lang === 'CZ'
                  ? 'Tento obrázek je uložen jako velký textový řetězec (Base64). Pro lepší rychlost načítání stránek doporučujeme nahrát soubor do Supabase Storage a vložit jeho veřejný odkaz výše.'
                  : 'This image is stored as a large Base64 string. To prevent page load delays, we recommend uploading the image to Supabase Storage and pasting its public link above.'}
              </div>
            )}
          </div>

          {/* Cíl přesměrování */}
          <div className="ctf-field" style={{ marginTop: '20px' }}>
            <label className="ctf-label">{lang === 'CZ' ? 'Cíl přesměrování (proklik)' : 'Redirect Destination'}</label>
            
            <div className="ctf-select" style={{ marginBottom: formRedirectType === 'custom' ? '12px' : '0' }}>
              <select 
                value={formRedirectType}
                onChange={e => setFormRedirectType(e.target.value)}
              >
                {REDIRECT_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {lang === 'CZ' ? opt.labelCz : opt.labelEn}
                  </option>
                ))}
              </select>
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
            </div>

            {formRedirectType === 'custom' && (
              <input 
                type="text" 
                className="ctf-input"
                value={formRedirectCustom} 
                onChange={e => setFormRedirectCustom(e.target.value)} 
                placeholder="např. /sealed-catalog/pokemon-etb nebo externí URL"
                required 
              />
            )}
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ flex: 1 }}
            >
              {lang === 'CZ' ? 'Uložit snímek' : 'Save Slide'}
            </button>
            
            {isEditing && (
              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#fff'
                }}
                onClick={handleResetForm}
              >
                {lang === 'CZ' ? 'Zrušit' : 'Cancel'}
              </button>
            )}
          </div>
        </form>
      </section>
      </div>
          </div>
        )}
      </div>

      {/* SECTION 2: DEAL OF THE DAY CMS */}
      <div className="admin-accordion-item">
        <div 
          className={`admin-accordion-header ${dealExpanded ? 'is-open' : ''}`}
          onClick={() => setDealExpanded(!dealExpanded)}
        >
          <h3 className="admin-accordion-header-title">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-gold)' }}>
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            <span>{lang === 'CZ' ? 'Správa Akce dne (Deal of the Day)' : 'Deal of the Day Administration'}</span>
          </h3>
          <div className="admin-accordion-header-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </div>
        </div>

        {dealExpanded && (
          <div className="admin-accordion-content">
            <p className="ctf-col-sub" style={{ marginBottom: '24px' }}>
              {lang === 'CZ'
                ? 'Zde můžete upravit název, cenu, skladové zásoby, fotku a odpočet pro aktivní Akci dne. Akce se propíše na homepage i do katalogů.'
                : 'Here you can configure the title, pricing, stock count, picture and timer for the active Daily Deal. Changes apply storefront-wide.'}
            </p>

            {/* Slot selector dropdown */}
            <div className="ctf-field" style={{ marginBottom: '24px', maxWidth: '320px' }}>
              <label className="ctf-label" style={{ fontWeight: '700' }}>
                {lang === 'CZ' ? 'Vyberte slot Akce dne:' : 'Select Daily Deal Slot:'}
              </label>
              <div className="ctf-select">
                <select 
                  value={selectedSlotId}
                  onChange={(e) => handleSlotChange(e.target.value)}
                >
                  <option value="active-deal">
                    {lang === 'CZ' ? '1. Aktivní akce dne (Hlavní)' : '1. Active Deal of the Day (Primary)'}
                  </option>
                  <option value="deal-2">
                    {lang === 'CZ' ? '2. Následující akce dne' : '2. Next Scheduled Deal'}
                  </option>
                  <option value="deal-3">
                    {lang === 'CZ' ? '3. Následující akce dne 2' : '3. Second Next Scheduled Deal'}
                  </option>
                </select>
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
              </div>
            </div>

        {dealLoading ? (
          <p className="ctf-col-sub">{lang === 'CZ' ? 'Načítání konfigurace akce...' : 'Loading deal configuration...'}</p>
        ) : (
          <div className="ctf-shell" style={{ 
            display: 'flex', 
            flexDirection: isMobile ? 'column' : 'row', 
            gap: isMobile ? '24px' : '32px', 
            alignItems: 'stretch' 
          }}>
            {/* Left Column: Form */}
            <form onSubmit={handleSaveDailyDeal} className="ctf-form" style={{ flex: '1.2 1 0%', minWidth: '0', width: '100%' }}>
              
              {/* Propojený produkt */}
              <div className="ctf-field">
                <label className="ctf-label">{lang === 'CZ' ? 'Propojený katalogový produkt' : 'Linked Catalog Product'}</label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <select 
                    className="ctf-input" 
                    value={dealProductId} 
                    onChange={(e) => setDealProductId(e.target.value)}
                    style={{ flex: 1 }}
                  >
                    <option value="">{lang === 'CZ' ? '-- Nepropojeno (Čistě grafická karta) --' : '-- Not Linked (Graphical card only) --'}</option>
                    {dealProductsList.map(prod => (
                      <option key={prod.id} value={prod.id}>
                        {prod.name} ({prod.price} Kč)
                      </option>
                    ))}
                  </select>
                  {dealProductId && (
                    <button 
                      type="button" 
                      className="btn btn-secondary" 
                      style={{ padding: '0 16px', fontSize: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                      onClick={() => handleAutoFillFromProduct(dealProductId)}
                    >
                      {lang === 'CZ' ? 'Předvyplnit' : 'Pre-fill'}
                    </button>
                  )}
                </div>
                <p className="ctf-hint">
                  {lang === 'CZ' 
                    ? 'Vyberte produkt pro automatické přesměrování a nákupní tlačítko "Do košíku".'
                    : 'Select a product to map card redirects and "Add to Cart" button.'}
                </p>
              </div>

              {/* Název */}
              <div className="ctf-field" style={{ marginTop: '20px' }}>
                <label className="ctf-label">{lang === 'CZ' ? 'Název akce / produktu' : 'Deal / Product Title'}<span style={{ color: '#ef4444' }}> *</span></label>
                <input 
                  type="text" 
                  className="ctf-input"
                  value={dealName} 
                  onChange={e => setDealName(e.target.value)} 
                  placeholder={lang === 'CZ' ? 'Zadejte název pro zobrazení na kartě...' : 'Enter a title for the deal...'}
                  required 
                />
              </div>

              {/* Ceny a sklad */}
              <div style={{ display: 'flex', gap: '16px', marginTop: '20px' }} className="slide-list-split">
                <div className="ctf-field" style={{ flex: 1 }}>
                  <label className="ctf-label">{lang === 'CZ' ? 'Akční cena (Kč)' : 'Deal Price (CZK)'}<span style={{ color: '#ef4444' }}> *</span></label>
                  <input 
                    type="number" 
                    className="ctf-input"
                    value={dealPrice} 
                    onChange={e => setDealPrice(e.target.value)} 
                    placeholder="0"
                    required 
                  />
                </div>
                <div className="ctf-field" style={{ flex: 1 }}>
                  <label className="ctf-label">{lang === 'CZ' ? 'Původní cena (Kč)' : 'Original Price (CZK)'}</label>
                  <input 
                    type="number" 
                    className="ctf-input"
                    value={dealOriginalPrice} 
                    onChange={e => setDealOriginalPrice(e.target.value)} 
                    placeholder="Např. 3590"
                  />
                </div>
                <div className="ctf-field" style={{ flex: 1 }}>
                  <label className="ctf-label">{lang === 'CZ' ? 'Kusů zbývá' : 'Pieces Left'}<span style={{ color: '#ef4444' }}> *</span></label>
                  <input 
                    type="number" 
                    className="ctf-input"
                    value={dealStock} 
                    onChange={e => setDealStock(e.target.value)} 
                    placeholder="0"
                    required 
                  />
                </div>
              </div>

              {/* Ořez obrázku */}
              <div className="ctf-field" style={{ marginTop: '20px' }}>
                <label className="ctf-label">{lang === 'CZ' ? 'Obrázek akce (poměr 5:7)' : 'Deal Image (5:7 aspect ratio)'}<span style={{ color: '#ef4444' }}> *</span></label>
                
                {dealImageUrl ? (
                  <div style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)', padding: '12px' }}>
                    <div style={{ height: '110px', width: '100%', background: '#0e0e11', borderRadius: '6px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <img src={dealImageUrl} alt="Preview deal" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                      <button type="button" className="btn btn-secondary" style={{ flex: 1, fontSize: '11px', padding: '6px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} onClick={() => document.getElementById('deal-file-input').click()}>{lang === 'CZ' ? 'Změnit fotku' : 'Change Photo'}</button>
                      <button type="button" className="btn btn-secondary" style={{ flex: 1, fontSize: '11px', padding: '6px 12px', color: '#ef4444', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.15)' }} onClick={() => setDealImageUrl('')}>{lang === 'CZ' ? 'Odstranit' : 'Remove'}</button>
                    </div>
                  </div>
                ) : (
                  <div 
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, 'deal')}
                    onClick={() => document.getElementById('deal-file-input').click()}
                    style={{
                      border: '2px dashed rgba(255, 255, 255, 0.15)',
                      borderRadius: '10px',
                      padding: '32px 16px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      background: 'rgba(255, 255, 255, 0.01)',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                    className="crop-upload-zone"
                  >
                    <span style={{ fontSize: '24px' }}>📁</span>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: 'rgba(255,255,255,0.7)' }}>
                      {lang === 'CZ' ? 'Přetáhněte obrázek sem nebo klikněte k výběru' : 'Drag image here or click to select'}
                    </span>
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                      {lang === 'CZ' ? 'Podporuje JPG, PNG, WEBP (ořez 5:7, 1000 × 1400 px)' : 'Supports JPG, PNG, WEBP (5:7 crop, 1000 × 1400 px)'}
                    </span>
                  </div>
                )}
                <input 
                  id="deal-file-input" 
                  type="file" 
                  accept="image/*" 
                  style={{ display: 'none' }} 
                  onChange={(e) => handleFileChange(e, 'deal')} 
                />
              </div>

              {/* Countdown Fields */}
              <div className="ctf-field" style={{ marginTop: '20px' }}>
                <label className="ctf-label">{lang === 'CZ' ? 'Odpočet času do konce akce' : 'Countdown Duration'}</label>
                <div style={{ display: 'flex', gap: '12px' }} className="countdown-inputs-row">
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '4px' }}>{lang === 'CZ' ? 'Dny' : 'Days'}</span>
                    <input type="number" min="0" className="ctf-input" value={dealDays} onChange={e => setDealDays(e.target.value)} placeholder="0" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '4px' }}>{lang === 'CZ' ? 'Hodiny' : 'Hours'}</span>
                    <input type="number" min="0" max="23" className="ctf-input" value={dealHours} onChange={e => setDealHours(e.target.value)} placeholder="14" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '4px' }}>{lang === 'CZ' ? 'Minuty' : 'Minutes'}</span>
                    <input type="number" min="0" max="59" className="ctf-input" value={dealMinutes} onChange={e => setDealMinutes(e.target.value)} placeholder="35" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '4px' }}>{lang === 'CZ' ? 'Sekundy' : 'Seconds'}</span>
                    <input type="number" min="0" max="59" className="ctf-input" value={dealSeconds} onChange={e => setDealSeconds(e.target.value)} placeholder="0" />
                  </div>
                </div>
                <p className="ctf-hint">
                  {lang === 'CZ'
                    ? selectedSlotId === 'active-deal'
                      ? 'Zadejte čas zbývající do konce akce. Odpočet se po uložení začne odpočítávat v reálném čase.'
                      : 'Zadejte dobu trvání této akce. Spustí se automaticky ihned po skončení předchozí akce.'
                    : selectedSlotId === 'active-deal'
                      ? 'Enter the remaining duration for the deal. The live timer will compute the deadline relative to saving moment.'
                      : 'Enter the duration for this deal. It will start automatically after the previous scheduled deal ends.'}
                </p>
              </div>

              {/* Submit */}
              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ marginTop: '28px', width: '100%', padding: '12px' }}
                disabled={dealSaving}
              >
                {dealSaving 
                  ? (lang === 'CZ' ? 'Ukládání...' : 'Saving...') 
                  : (lang === 'CZ' ? 'Uložit akci dne' : 'Save Deal of the Day')}
              </button>

            </form>

            {/* Right Column: Live Preview */}
            <section className="ctf-form-col" style={{ 
              flex: isMobile ? '1' : '0 0 320px', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: isMobile ? 'center' : 'stretch',
              width: '100%'
            }}>
              <h4 className="ctf-col-title" style={{ fontSize: '14px', marginBottom: '16px', color: 'var(--color-gold)' }}>
                {lang === 'CZ' ? 'Živý náhled karty' : 'Live Card Preview'}
              </h4>

              {/* Deal Card Layout Markup */}
              <div 
                className="glass-panel deal-widget-banner"
                style={{ 
                  height: '480px', 
                  padding: '16px 16px 0 16px',
                  flexDirection: 'column',
                  alignItems: 'stretch',
                  justifyContent: 'space-between',
                  display: 'flex',
                  overflow: 'hidden',
                  position: 'relative',
                  width: '100%',
                  maxWidth: '320px',
                  boxSizing: 'border-box',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  background: 'rgba(255,255,255,0.02)',
                  borderRadius: '12px',
                  margin: isMobile ? '0 auto' : '0'
                }}
              >
                {/* Title */}
                <h3 style={{ 
                  fontSize: '17px', 
                  fontWeight: '700', 
                  color: 'var(--text-main)', 
                  margin: '4px 0 0 0',
                  textAlign: 'left',
                  lineHeight: '1.4',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  height: '48px',
                  fontFamily: 'var(--font-heading)'
                }}>
                  {dealName || (lang === 'CZ' ? 'Vyberte produkt...' : 'Select product...')}
                </h3>

                {/* Image */}
                <div style={{
                  height: '230px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  zIndex: 1,
                  marginTop: '16px',
                  marginBottom: '8px'
                }}>
                  <img 
                    src={dealImageUrl || '/logo s popisem.webp'} 
                    alt="" 
                    style={{ 
                      maxHeight: '100%', 
                      maxWidth: '100%', 
                      objectFit: 'contain',
                      transform: 'scale(1) translateY(4px)',
                      transition: 'transform 0.3s ease'
                    }} 
                  />
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
                    {lang === 'CZ' ? `Zbývá ${dealStock} kusů` : `${dealStock} pcs left`}
                  </span>
                </div>

                {/* Prices & Button */}
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
                      {previewDiscount > 0 && (
                        <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--color-red)' }}>
                          -{previewDiscount} %
                        </span>
                      )}
                      {dealOriginalPrice && (
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', textDecoration: 'line-through' }}>
                          {Number(dealOriginalPrice).toLocaleString()} Kč
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '19px', fontWeight: '800', color: 'var(--color-gold)', marginTop: '2px', whiteSpace: 'nowrap' }}>
                      {Number(dealPrice).toLocaleString()} Kč
                    </span>
                  </div>

                  <button 
                    type="button"
                    className="btn btn-primary" 
                    style={{
                      backgroundColor: 'var(--color-gold)',
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
                      opacity: dealProductId ? 1 : 0.5,
                      cursor: 'default',
                      minWidth: '110px'
                    }}
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
                    {lang === 'CZ' ? 'Do košíku' : 'Add to Cart'}
                  </button>
                </div>

                {/* Countdown */}
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
                  boxSizing: 'border-box'
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
                    gap: Number(dealDays) > 0 ? '8px' : '14px',
                    color: '#000'
                  }}>
                    {Number(dealDays) > 0 && (
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
                        <span style={{ fontSize: '18px', fontWeight: '800' }}>
                          {Number(dealDays)}
                        </span>
                        <span style={{ fontSize: '10px', color: 'rgba(0, 0, 0, 0.65)', fontWeight: '500' }}>
                          {lang === 'CZ' ? (Number(dealDays) === 1 ? 'den' : Number(dealDays) < 5 ? 'dny' : 'dní') : (Number(dealDays) === 1 ? 'day' : 'days')}
                        </span>
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
                      <span style={{ fontSize: '18px', fontWeight: '800' }}>
                        {Number(dealHours || 0).toString().padStart(2, '0')}
                      </span>
                      <span style={{ fontSize: '10px', color: 'rgba(0, 0, 0, 0.65)', fontWeight: '500' }}>{lang === 'CZ' ? 'hodin' : 'hours'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
                      <span style={{ fontSize: '18px', fontWeight: '800' }}>
                        {Number(dealMinutes || 0).toString().padStart(2, '0')}
                      </span>
                      <span style={{ fontSize: '10px', color: 'rgba(0, 0, 0, 0.65)', fontWeight: '500' }}>{lang === 'CZ' ? 'minut' : 'mins'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
                      <span style={{ fontSize: '18px', fontWeight: '800' }}>
                        {Number(dealSeconds || 0).toString().padStart(2, '0')}
                      </span>
                      <span style={{ fontSize: '10px', color: 'rgba(0, 0, 0, 0.65)', fontWeight: '500' }}>{lang === 'CZ' ? 'sekund' : 'secs'}</span>
                    </div>
                  </div>
                </div>

              </div>
            </section>
          </div>
        )}
          </div>
        )}
      </div>

      {/* SECTION 3: NOVINKY SECTION */}
      <div className="admin-accordion-item">
        <div 
          className={`admin-accordion-header ${newsExpanded ? 'is-open' : ''}`}
          onClick={() => setNewsExpanded(!newsExpanded)}
        >
          <h3 className="admin-accordion-header-title">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-gold)' }}>
              <path d="M19 20H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1m2 4h-4V7a3 3 0 0 0-3-3m5 5v10a2 2 0 0 1-2 2H9"></path>
            </svg>
            <span>{lang === 'CZ' ? 'Správa sekce Novinky' : 'New Releases Section CMS'}</span>
          </h3>
          <div className="admin-accordion-header-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </div>
        </div>

        {newsExpanded && (
          <div className="admin-accordion-content">
            {renderSectionCms('newArrivals')}
          </div>
        )}
      </div>

      {/* SECTION 4: PREORDERS SECTION */}
      <div className="admin-accordion-item">
        <div 
          className={`admin-accordion-header ${preordersExpanded ? 'is-open' : ''}`}
          onClick={() => setPreordersExpanded(!preordersExpanded)}
        >
          <h3 className="admin-accordion-header-title">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-gold)' }}>
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            <span>{lang === 'CZ' ? 'Správa sekce Předobjednávky' : 'Pre-orders Section CMS'}</span>
          </h3>
          <div className="admin-accordion-header-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </div>
        </div>

        {preordersExpanded && (
          <div className="admin-accordion-content">
            {renderSectionCms('preorders')}
          </div>
        )}
      </div>

      {/* SECTION 5: ACCESSORIES SECTION */}
      <div className="admin-accordion-item">
        <div 
          className={`admin-accordion-header ${accessoriesExpanded ? 'is-open' : ''}`}
          onClick={() => setAccessoriesExpanded(!accessoriesExpanded)}
        >
          <h3 className="admin-accordion-header-title">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-gold)' }}>
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path>
            </svg>
            <span>{lang === 'CZ' ? 'Správa sekce Příslušenství' : 'Accessories Section CMS'}</span>
          </h3>
          <div className="admin-accordion-header-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </div>
        </div>

        {accessoriesExpanded && (
          <div className="admin-accordion-content">
            {renderSectionCms('accessories')}
          </div>
        )}
      </div>

      {/* Canvas Cropper Portal Dialog */}
      {isCropping && createPortal(
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.85)',
          zIndex: 1000000,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          backdropFilter: 'blur(6px)'
        }}>
          <div style={{
            backgroundColor: '#18181c',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '380px',
            width: '90%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
          }} className="fade-in">
            <h3 style={{ margin: 0, color: '#fff', fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: 'var(--font-heading)' }}>
              {cropTarget === 'deal' 
                ? (lang === 'CZ' ? 'Ořez fotky akce' : 'Crop Deal Photo')
                : (lang === 'CZ' ? 'Ořez banneru' : 'Crop Banner')}
            </h3>
            
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.55)', textAlign: 'center', lineHeight: '1.4' }}>
              {cropTarget === 'desktop'
                ? (lang === 'CZ' ? 'Poměr stran je uzamčen na šířku (2.28:1 - pro desktop)' : 'Aspect ratio locked to landscape (2.28:1 - for desktop)')
                : (cropTarget === 'mobile'
                  ? (lang === 'CZ' ? 'Poměr stran je uzamčen na výšku (4:5 - pro mobil)' : 'Aspect ratio locked to portrait (4:5 - for mobile)')
                  : (lang === 'CZ' ? 'Poměr stran je uzamčen na výšku (5:7 - pro akci dne)' : 'Aspect ratio locked to portrait (5:7 - for deal of the day)'))
              }
            </div>
            
            <canvas 
              ref={canvasRef}
              width={300}
              height={400}
              className="crop-canvas-checkerboard"
              style={{
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                cursor: 'move',
                backgroundColor: '#0c0c0e',
                maxWidth: '100%',
                height: 'auto'
              }}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseUp}
              onTouchStart={handleCanvasTouchStart}
              onTouchMove={handleCanvasTouchMove}
              onTouchEnd={handleCanvasMouseUp}
            />
            {/* ZOOM CONTROL */}
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: '600' }}>
                <span>{lang === 'CZ' ? 'Přiblížení obrázku:' : 'Image Zoom:'}</span>
                <span ref={zoomValRef} style={{ color: 'var(--color-gold, #fdbd16)', fontWeight: 'bold' }}>100%</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}>
                <button 
                  type="button" 
                  onClick={() => {
                    if (sliderRef.current) {
                      const minVal = Number(sliderRef.current.min);
                      const newVal = Math.max(minVal, cropRefScale.current - 0.05);
                      sliderRef.current.value = newVal.toString();
                      cropRefScale.current = newVal;
                      if (zoomValRef.current) zoomValRef.current.textContent = `${Math.round(newVal * 100)}%`;
                      drawCanvas();
                    }
                  }}
                  style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                </button>
                
                <input 
                  ref={sliderRef}
                  type="range"
                  min="0.01"
                  max="3"
                  step="0.01"
                  style={{ flex: 1, accentColor: 'var(--color-gold, #fdbd16)', cursor: 'pointer', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.1)' }}
                  onChange={(e) => {
                    const newScale = Number(e.target.value);
                    cropRefScale.current = newScale;
                    if (zoomValRef.current) zoomValRef.current.textContent = `${Math.round(newScale * 100)}%`;
                    drawCanvas();
                  }}
                />

                <button 
                  type="button"
                  onClick={() => {
                    if (sliderRef.current) {
                      const maxVal = Number(sliderRef.current.max);
                      const newVal = Math.min(maxVal, cropRefScale.current + 0.05);
                      sliderRef.current.value = newVal.toString();
                      cropRefScale.current = newVal;
                      if (zoomValRef.current) zoomValRef.current.textContent = `${Math.round(newVal * 100)}%`;
                      drawCanvas();
                    }
                  }}
                  style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                </button>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '12px', width: '100%', marginTop: '8px' }}>
              <button
                type="button"
                style={{ flex: 1, padding: '10px 16px', fontSize: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#fff', cursor: 'pointer' }}
                onClick={() => {
                  setIsCropping(false);
                  setCropImageSrc(null);
                }}
              >
                {lang === 'CZ' ? 'Zrušit' : 'Cancel'}
              </button>
              <button
                type="button"
                style={{ flex: 1, padding: '10px 16px', fontSize: '12px', borderRadius: '8px', border: 'none', background: 'var(--color-gold, #fdbd16)', color: '#000', fontWeight: 'bold', cursor: 'pointer' }}
                onClick={handleCropAction}
              >
                {lang === 'CZ' ? 'Oříznout' : 'Crop'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Modal Portal */}
      {deleteConfirm.isOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: 'var(--bg-secondary, #141416)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '12px',
            padding: '28px',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 20px 50px rgba(0,0,0,0.6)'
          }}>
            <h4 style={{ fontSize: '18px', fontWeight: 'bold', color: '#fff', margin: '0 0 12px 0' }}>
              {lang === 'CZ' ? 'Opravdu smazat?' : 'Confirm Delete?'}
            </h4>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', margin: '0 0 24px 0', lineHeight: '1.5' }}>
              {lang === 'CZ' 
                ? 'Tento krok trvale smaže vybraný banner ze slideshow úvodní stránky. Tuto akci nelze vzít zpět.' 
                : 'This action will permanently delete the selected slide banner from the home slideshow. This cannot be undone.'}
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#fff',
                  padding: '10px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
                onClick={() => setDeleteConfirm({ isOpen: false, slideId: '' })}
              >
                {lang === 'CZ' ? 'Zrušit' : 'Cancel'}
              </button>
              <button
                type="button"
                style={{
                  background: '#ef4444',
                  border: 'none',
                  color: '#fff',
                  padding: '10px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
                onClick={() => handleDelete(deleteConfirm.slideId)}
              >
                {lang === 'CZ' ? 'Smazat' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
