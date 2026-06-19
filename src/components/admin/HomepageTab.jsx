import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from '../../context/LanguageContext';
import { fetchSlidesFromDB, saveSlideToDB, deleteSlideFromDB } from '../../services/slides';
import { fetchDailyDealFromDB, saveDailyDealToDB } from '../../services/dailyDeal';
import { fetchProductsFromDB } from '../../services/products';

export default function HomepageTab({ showToast }) {
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

  // Deal of the Day Form State
  const [dealLoading, setDealLoading] = useState(true);
  const [dealSaving, setDealSaving] = useState(false);
  const [dealProductsList, setDealProductsList] = useState([]);
  
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

      const dbDeal = await fetchDailyDealFromDB();
      if (dbDeal) {
        setDealName(dbDeal.name || '');
        setDealProductId(dbDeal.product_id || '');
        setDealStock(String(dbDeal.stock || 0));
        setDealPrice(String(dbDeal.price || 0));
        setDealOriginalPrice(dbDeal.original_price ? String(dbDeal.original_price) : '');
        setDealImageUrl(dbDeal.image_url || '');

        const endsAt = new Date(dbDeal.ends_at).getTime();
        const diff = Math.max(0, endsAt - Date.now());
        const totalSecs = Math.floor(diff / 1000);
        setDealDays(String(Math.floor(totalSecs / (3600 * 24))));
        setDealHours(String(Math.floor((totalSecs % (3600 * 24)) / 3600)));
        setDealMinutes(String(Math.floor((totalSecs % 3600) / 60)));
        setDealSeconds(String(totalSecs % 60));
      }
    } catch (err) {
      console.error('Failed to load daily deal in admin:', err);
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

    const endsAtIso = new Date(Date.now() + daysOffset + hoursOffset + minsOffset + secsOffset).toISOString();

    const payload = {
      name: dealName,
      product_id: dealProductId || null,
      stock: Number(dealStock || 0),
      price: Number(dealPrice || 0),
      original_price: dealOriginalPrice ? Number(dealOriginalPrice) : null,
      image_url: dealImageUrl || null,
      ends_at: endsAtIso
    };

    const { data, error, isMockFallback } = await saveDailyDealToDB(payload);

    if (error) {
      showToast(lang === 'CZ' ? 'Chyba při ukládání akce dne!' : 'Error saving Deal of the Day!', 'error');
    } else {
      showToast(
        isMockFallback
          ? (lang === 'CZ' ? 'Akce dne uložena pouze lokálně (Chyba DB)!' : 'Daily deal saved locally only (DB error)!')
          : (lang === 'CZ' ? 'Akce dne úspěšně uložena!' : 'Deal of the Day successfully saved!'),
        isMockFallback ? 'warning' : 'success'
      );
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
        const frameW = cropTarget === 'desktop' ? 280 : (cropTarget === 'mobile' ? 256 : 220);
        const frameH = cropTarget === 'desktop' ? 122 : (cropTarget === 'mobile' ? 320 : 220);

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

    const frameW = cropTarget === 'desktop' ? 280 : (cropTarget === 'mobile' ? 256 : 220);
    const frameH = cropTarget === 'desktop' ? 122 : (cropTarget === 'mobile' ? 320 : 220);
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
    const frameW = cropTarget === 'desktop' ? 280 : (cropTarget === 'mobile' ? 256 : 220);
    const frameH = cropTarget === 'desktop' ? 122 : (cropTarget === 'mobile' ? 320 : 220);

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

    const baseW = cropTarget === 'desktop' ? 1920 : (cropTarget === 'mobile' ? 800 : 500);
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

    if (cropTarget !== 'deal') {
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

    const format = cropTarget === 'deal' ? 'image/png' : 'image/jpeg';
    const quality = cropTarget === 'deal' ? undefined : 0.85;
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
      
      {/* SECTION 1: HERO SLIDESHOW */}
      <div className="ctf-shell">
      {/* Left panel: Slide list */}
      <section className="ctf-tree-col" style={{ flex: '1.2 1 0%', maxWidth: 'none' }}>
        <div>
          <h3 className="ctf-col-title">{lang === 'CZ' ? 'Bannery v slideshow' : 'Slideshow Banners'}</h3>
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

                    <div style={{ display: 'flex', gap: '16px', marginTop: '24px', alignItems: 'stretch' }} className="slide-list-split">
                      {/* Desktop preview */}
                      <div style={{ flex: '1 1 50%', minWidth: '0' }}>
                        <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>Desktop</span>
                        <div style={{ height: '90px', width: '100%', background: '#0e0e11', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '6px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <img src={slide.desktop_image_url} alt="Desktop slide" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} onError={(e) => { e.target.src = '/logo s popisem.webp'; }} />
                        </div>
                      </div>

                      {/* Mobile preview */}
                      <div style={{ flex: '0 0 90px' }}>
                        <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>Mobil</span>
                        <div style={{ height: '90px', width: '90px', background: '#0e0e11', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '6px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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

      <hr style={{ border: 'none', borderTop: '1px solid rgba(255, 255, 255, 0.08)', margin: '0' }} />

      {/* SECTION 2: DEAL OF THE DAY CMS */}
      <div>
        <h3 className="ctf-col-title" style={{ fontSize: '20px', marginBottom: '8px' }}>
          {lang === 'CZ' ? 'Správa Akce dne (Deal of the Day)' : 'Deal of the Day Administration'}
        </h3>
        <p className="ctf-col-sub" style={{ marginBottom: '24px' }}>
          {lang === 'CZ'
            ? 'Zde můžete upravit název, cenu, skladové zásoby, fotku a odpočet pro aktivní Akci dne. Akce se propíše na homepage i do katalogů.'
            : 'Here you can configure the title, pricing, stock count, picture and timer for the active Daily Deal. Changes apply storefront-wide.'}
        </p>

        {dealLoading ? (
          <p className="ctf-col-sub">{lang === 'CZ' ? 'Načítání konfigurace akce...' : 'Loading deal configuration...'}</p>
        ) : (
          <div className="ctf-shell" style={{ display: 'flex', gap: '32px', alignItems: 'flex-start' }}>
            {/* Left Column: Form */}
            <form onSubmit={handleSaveDailyDeal} className="ctf-form" style={{ flex: '1.2 1 0%', minWidth: '0' }}>
              
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
                <label className="ctf-label">{lang === 'CZ' ? 'Obrázek akce (poměr 1:1)' : 'Deal Image (1:1 aspect ratio)'}<span style={{ color: '#ef4444' }}> *</span></label>
                
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
                      {lang === 'CZ' ? 'Podporuje JPG, PNG, WEBP (ořez 1:1)' : 'Supports JPG, PNG, WEBP (1:1 crop)'}
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
                    ? 'Zadejte čas zbývající do konce akce. Odpočet se po uložení začne odpočítávat v reálném čase.'
                    : 'Enter the remaining duration for the deal. The live timer will compute the deadline relative to saving moment.'}
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
            <section className="ctf-form-col" style={{ flex: '0 0 320px', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
              <h4 className="ctf-col-title" style={{ fontSize: '14px', marginBottom: '16px', color: 'var(--color-gold)' }}>
                {lang === 'CZ' ? 'Živý náhled karty' : 'Live Card Preview'}
              </h4>

              {/* Deal Card Layout Markup */}
              <div 
                className="glass-panel deal-widget-banner"
                style={{ 
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
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  background: 'rgba(255,255,255,0.02)',
                  borderRadius: '12px'
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
                  height: '145px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  marginTop: '34px',
                  marginBottom: '8px'
                }}>
                  <img 
                    src={dealImageUrl || '/logo s popisem.webp'} 
                    alt="" 
                    style={{ 
                      maxHeight: '100%', 
                      maxWidth: '100%', 
                      objectFit: 'contain',
                      transform: 'scale(1.22) translateY(12px)'
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
                  marginBottom: '14px',
                  marginTop: 'auto'
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
                  : (lang === 'CZ' ? 'Poměr stran je uzamčen na čtverec (1:1 - pro produkt)' : 'Aspect ratio locked to square (1:1 - for product)'))
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
                backgroundColor: '#0c0c0e'
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
