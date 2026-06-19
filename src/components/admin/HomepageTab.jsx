import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from '../../context/LanguageContext';
import { fetchSlidesFromDB, saveSlideToDB, deleteSlideFromDB } from '../../services/slides';

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
  const [cropTarget, setCropTarget] = useState('desktop'); // 'desktop' or 'mobile'
  const [cropImageSrc, setCropImageSrc] = useState(null);
  const [isCropping, setIsCropping] = useState(false);

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
  }, []);

  const loadSlides = async () => {
    setLoading(true);
    const data = await fetchSlidesFromDB();
    setSlides(data || []);
    setLoading(false);
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
        const frameW = cropTarget === 'desktop' ? 280 : 256;
        const frameH = cropTarget === 'desktop' ? 122 : 320;

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

    const frameW = cropTarget === 'desktop' ? 280 : 256;
    const frameH = cropTarget === 'desktop' ? 122 : 320;
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
    const frameW = cropTarget === 'desktop' ? 280 : 256;
    const frameH = cropTarget === 'desktop' ? 122 : 320;

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

    const baseW = cropTarget === 'desktop' ? 1920 : 800;
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

    cropCtx.fillStyle = '#1c1c22';
    cropCtx.fillRect(0, 0, cropCanvas.width, cropCanvas.height);

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

    const croppedUrl = cropCanvas.toDataURL('image/jpeg', 0.85);
    if (cropTarget === 'desktop') {
      setFormDesktopUrl(croppedUrl);
    } else {
      setFormMobileUrl(croppedUrl);
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

  return (
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
              {lang === 'CZ' ? 'Ořez banneru' : 'Crop Banner'}
            </h3>
            
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.55)', textAlign: 'center', lineHeight: '1.4' }}>
              {cropTarget === 'desktop'
                ? (lang === 'CZ' ? 'Poměr stran je uzamčen na šířku (2.28:1 - pro desktop)' : 'Aspect ratio locked to landscape (2.28:1 - for desktop)')
                : (lang === 'CZ' ? 'Poměr stran je uzamčen na výšku (4:5 - pro mobil)' : 'Aspect ratio locked to portrait (4:5 - for mobile)')
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
