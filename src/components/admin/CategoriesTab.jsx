import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from '../../context/LanguageContext';
import { fetchCategoriesFromDB, saveCategoryToDB, deleteCategoryFromDB } from '../../services/categories';

const getGameIcon = (gameName) => {
  if (gameName === 'Accessories') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px', opacity: 0.9, color: 'var(--color-gold)' }}>
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
        <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
        <line x1="12" y1="22.08" x2="12" y2="12"></line>
      </svg>
    );
  }
  if (gameName === 'Acrylics') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px', opacity: 0.9, color: 'var(--color-gold)' }}>
        <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
        <polyline points="2 17 12 22 22 17"></polyline>
        <polyline points="2 12 12 17 22 12"></polyline>
      </svg>
    );
  }
  // Default TCG card deck icon
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px', opacity: 0.9, color: 'var(--color-gold)' }}>
      <rect x="3" y="3" width="12" height="14" rx="2" ry="2"></rect>
      <path d="M9 21h10a2 2 0 0 0 2-2V7"></path>
    </svg>
  );
};

export default function CategoriesTab({ showToast }) {
  const { lang } = useTranslation();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);
  
  // Form State
  const [formId, setFormId] = useState('');
  const [formNameCz, setFormNameCz] = useState('');
  const [formNameEn, setFormNameEn] = useState('');
  const [formType, setFormType] = useState('single');
  const [formGame, setFormGame] = useState('Pokémon');
  const [formParentId, setFormParentId] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formDescCz, setFormDescCz] = useState('');
  const [formDescEn, setFormDescEn] = useState('');
  
  const [isEditing, setIsEditing] = useState(false);
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
  const [collapsedCats, setCollapsedCats] = useState({});
  const [deleteConfirm, setDeleteConfirm] = useState({
    isOpen: false,
    categoryId: ''
  });

  const [isParentDropdownOpen, setIsParentDropdownOpen] = useState(false);
  const parentDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (parentDropdownRef.current && !parentDropdownRef.current.contains(e.target)) {
        setIsParentDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleCollapse = (catId, e) => {
    e.stopPropagation();
    setCollapsedCats(prev => ({
      ...prev,
      [catId]: !prev[catId]
    }));
  };

  const triggerDeleteConfirm = (id) => {
    setDeleteConfirm({
      isOpen: true,
      categoryId: id
    });
  };

  // Cropping State
  const [cropTarget, setCropTarget] = useState({ type: 'category' });
  const [cropImageSrc, setCropImageSrc] = useState(null);
  const [isCropping, setIsCropping] = useState(false);
  const [cropImageFormat, setCropImageFormat] = useState('image/jpeg');
  const [cropOrientation, setCropOrientation] = useState('landscape');

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

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setLoading(true);
    const data = await fetchCategoriesFromDB();
    setCategories(data || []);
    setLoading(false);
  };

  const generateSlug = (name) => {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // remove diacritics
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleNameCzChange = (val) => {
    setFormNameCz(val);
    if (!isSlugManuallyEdited) {
      const targetName = formNameEn || val;
      setFormId(generateSlug(targetName));
    }
  };

  const handleNameEnChange = (val) => {
    setFormNameEn(val);
    if (!isSlugManuallyEdited) {
      const targetName = val || formNameCz;
      setFormId(generateSlug(targetName));
    }
  };

  const handleSelectCategory = (cat) => {
    setSelectedCategory(cat);
    setFormId(cat.id);
    setFormNameCz(cat.name_cz || '');
    setFormNameEn(cat.name_en || '');
    setFormType(cat.type || 'single');
    setFormGame(cat.game || 'Pokémon');
    setFormParentId(cat.parent_id || '');
    setFormImageUrl(cat.image_url || '');
    setFormDescCz(cat.description_cz || '');
    setFormDescEn(cat.description_en || '');
    setIsEditing(true);
    setIsSlugManuallyEdited(true); // Don't overwrite existing ID when editing
  };

  const handleResetForm = () => {
    setSelectedCategory(null);
    setFormId('');
    setFormNameCz('');
    setFormNameEn('');
    setFormType('single');
    setFormGame('Pokémon');
    setFormParentId('');
    setFormImageUrl('');
    setFormDescCz('');
    setFormDescEn('');
    setIsEditing(false);
    setIsSlugManuallyEdited(false);
  };

  // --- Canvas Cropper Implementation ---
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      loadImageFile(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      loadImageFile(file);
    }
  };

  const loadImageFile = (file) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      setCropImageSrc(event.target.result);
      setCropImageFormat(file.type || 'image/jpeg');
      setIsCropping(true);
      
      // Default to landscape for categories
      setCropOrientation('landscape');

      // Initialize refs
      cropRefX.current = 0;
      cropRefY.current = 0;
      cropRefScale.current = 1;
      minScaleRef.current = 0.01;
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (isCropping && cropImageSrc && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.onload = () => {
        loadedImage.current = img;

        const frameW = cropOrientation === 'landscape' ? 280 : 200;
        const frameH = cropOrientation === 'landscape' ? 200 : 280;

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
  }, [isCropping, cropImageSrc, cropOrientation]);

  const drawCanvas = () => {
    if (!loadedImage.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = loadedImage.current;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const frameW = cropOrientation === 'landscape' ? 280 : 200;
    const frameH = cropOrientation === 'landscape' ? 200 : 280;
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
    const frameW = cropOrientation === 'landscape' ? 280 : 200;
    const frameH = cropOrientation === 'landscape' ? 200 : 280;

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

    const baseW = cropOrientation === 'landscape' ? 1400 : 1000;
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

    const isTransparent = cropImageFormat === 'image/png' || cropImageFormat === 'image/webp' || cropImageFormat === 'image/gif';

    if (!isTransparent) {
      // Fill background with theme color to avoid transparent areas turning black in JPEG
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

    const outputFormat = cropImageFormat === 'image/webp' ? 'image/webp' : (isTransparent ? 'image/png' : 'image/jpeg');
    const outputQuality = outputFormat === 'image/webp' || outputFormat === 'image/jpeg' ? 0.85 : undefined;
    const croppedUrl = cropCanvas.toDataURL(outputFormat, outputQuality);
    setFormImageUrl(croppedUrl);

    setIsCropping(false);
    setCropImageSrc(null);
    showToast(lang === 'CZ' ? 'Obrázek byl úspěšně oříznut!' : 'Image cropped successfully!', 'success');
  };


  const getGameRootCategoryId = (gameName) => {
    const found = categories.find(c => c.game === gameName && c.parent_id === null);
    if (found) return found.id;
    const mapping = {
      'Pokémon': 'game-pokemon',
      'Lorcana': 'game-lorcana',
      'One Piece': 'game-onepiece',
      'Riftbound': 'game-riftbound',
      'Accessories': 'game-accessories',
      'Acrylics': 'game-acrylics'
    };
    return mapping[gameName] || null;
  };

  const isParentRoot = (parentId) => {
    if (!parentId) return true;
    const parent = categories.find(c => c.id === parentId);
    return parent ? parent.parent_id === null : false;
  };

  const resolveCategoryType = (game, parentId) => {
    if (parentId && !isParentRoot(parentId)) {
      const parent = categories.find(c => c.id === parentId);
      if (parent) return parent.type;
    }
    if (game === 'Accessories' || game === 'Acrylics') {
      return 'accessory';
    }
    return 'sealed';
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formId.trim()) {
      const slug = (formNameEn || formNameCz)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      if (!slug) {
        showToast(lang === 'CZ' ? 'Vyplňte prosím název kategorie.' : 'Please enter category name.', 'error');
        return;
      }
      setFormId(slug);
    }

    let resolvedParentId = formParentId;
    if (!resolvedParentId || isParentRoot(resolvedParentId)) {
      resolvedParentId = getGameRootCategoryId(formGame);
    }

    const resolvedType = resolveCategoryType(formGame, resolvedParentId);

    const catData = {
      id: formId.trim() || (formNameEn || formNameCz).toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      name_cz: formNameCz,
      name_en: formNameEn,
      type: resolvedType,
      game: formGame,
      parent_id: resolvedParentId || null,
      image_url: formImageUrl,
      description_cz: formDescCz,
      description_en: formDescEn
    };

    const { data, error } = await saveCategoryToDB(catData);
    if (error) {
      showToast(lang === 'CZ' ? 'Chyba při ukládání kategorie.' : 'Error saving category.', 'error');
    } else {
      showToast(lang === 'CZ' ? 'Kategorie úspěšně uložena!' : 'Category saved successfully!', 'success');
      loadCategories();
      handleResetForm();
    }
  };

  const handleDelete = async (id) => {
    const { error } = await deleteCategoryFromDB(id);
    if (error) {
      showToast(lang === 'CZ' ? 'Chyba při mazání kategorie.' : 'Error deleting category.', 'error');
    } else {
      showToast(lang === 'CZ' ? 'Kategorie byla úspěšně smazána.' : 'Category deleted successfully.', 'success');
      loadCategories();
      handleResetForm();
    }
    setDeleteConfirm({ isOpen: false, categoryId: '' });
  };

  // Group categories for rendering
  const gamesList = ['Pokémon', 'Lorcana', 'One Piece', 'Riftbound', 'Accessories', 'Acrylics'];

  const getCategoryDepth = (cat) => {
    let depth = 0;
    let current = cat;
    const visited = new Set();
    while (current && current.parent_id && !visited.has(current.id)) {
      visited.add(current.id);
      const parent = categories.find(c => c.id === current.parent_id);
      if (!parent) break;
      depth++;
      current = parent;
    }
    return depth;
  };

  const getParentName = (parentId) => {
    const parent = categories.find(c => c.id === parentId);
    if (!parent) return parentId;
    return lang === 'CZ' ? parent.name_cz : parent.name_en;
  };

  const getParentPath = (parentId) => {
    if (!parentId) return '';
    const path = [];
    let current = categories.find(c => c.id === parentId);
    const visited = new Set();
    while (current && !visited.has(current.id)) {
      visited.add(current.id);
      if (current.parent_id !== null) {
        path.unshift(lang === 'CZ' ? current.name_cz : current.name_en);
      }
      current = categories.find(c => c.id === current.parent_id);
    }
    return path.join(' ➔ ');
  };

  const getCategoryPrefix = (depth) => {
    if (depth === 0) return '';
    return '\u00A0\u00A0'.repeat(depth) + '↳ ';
  };

  const getHierarchicalOptions = () => {
    const list = [];
    
    // Helper to check if a category is a descendant of formId (or formId itself)
    const isSelfOrDescendant = (catId) => {
      if (!formId) return false;
      if (catId === formId) return true;
      let current = categories.find(c => c.id === catId);
      const visited = new Set();
      while (current && current.parent_id && !visited.has(current.id)) {
        visited.add(current.id);
        if (current.parent_id === formId) return true;
        current = categories.find(c => c.id === current.parent_id);
      }
      return false;
    };
    
    // We only want options for the currently selected game, excluding self/descendants
    const gameCats = categories.filter(c => c.game === formGame && !isSelfOrDescendant(c.id));
    
    // Filter out root categories (parent_id: null)
    const nonRootGameCats = gameCats.filter(c => c.parent_id !== null);
    
    // Find Level 1 categories (direct children of the root category)
    const roots = nonRootGameCats.filter(c => {
      const parent = categories.find(p => p.id === c.parent_id);
      return parent ? parent.parent_id === null : true;
    });
    
    const traverse = (cat, depth = 0) => {
      list.push({
        id: cat.id,
        name: lang === 'CZ' ? cat.name_cz : cat.name_en,
        depth: depth
      });
      
      const children = nonRootGameCats.filter(c => c.parent_id === cat.id);
      children.forEach(child => traverse(child, depth + 1));
    };
    
    roots.forEach(root => traverse(root, 0));
    return list;
  };

  const renderCategoryNode = (cat, level = 0) => {
    const isSelected = selectedCategory?.id === cat.id;
    const children = categories.filter(c => c.parent_id === cat.id);
    
    const isRoot = level === 0;
    const nodeClass = `ctf-node level-${level} ${isRoot ? 'ctf-root' : 'ctf-leaf'}`;
    const nameClass = `ctf-node-name level-${level}-name ${isRoot ? 'ctf-root-name' : 'ctf-leaf-name'}`;
    const delClass = isRoot ? 'ctf-root-del' : 'ctf-leaf-del';
    const isCollapsed = !!collapsedCats[cat.id];
    
    return (
      <div key={cat.id} className={isRoot ? "ctf-root-category" : "ctf-subcategory"} style={{ width: '100%' }}>
        <div 
          className={`${nodeClass} ${isSelected ? 'is-selected' : ''}`}
          onClick={() => handleSelectCategory(cat)}
        >
          {children.length > 0 ? (
            <button 
              type="button" 
              onClick={(e) => toggleCollapse(cat.id, e)} 
              style={{
                background: 'none',
                border: 'none',
                padding: '2px',
                marginRight: '2px',
                color: isSelected ? 'var(--color-gold)' : 'rgba(255,255,255,0.4)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '4px',
                transition: 'color 0.2s, background-color 0.2s',
                flexShrink: 0
              }}
              className="ctf-toggle-btn"
              title={isCollapsed ? (lang === 'CZ' ? 'Rozbalit' : 'Expand') : (lang === 'CZ' ? 'Sbalit' : 'Collapse')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'transform 0.15s ease', transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}>
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </button>
          ) : (
            <div style={{ width: '14px', flexShrink: 0 }} />
          )}

          {isRoot ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ color: isSelected ? 'var(--color-gold)' : 'currentColor', flexShrink: 0 }}>
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
            </svg>
          ) : (
            children.length > 0 ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ color: isSelected ? 'var(--color-gold)' : 'currentColor', flexShrink: 0 }}>
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ color: isSelected ? 'var(--color-gold)' : 'currentColor', flexShrink: 0 }}>
                <path d="M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0l-7.2-7.2a2 2 0 0 1-.6-1.4V5a2 2 0 0 1 2-2h7a2 2 0 0 1 1.4.6l7.2 7.2a2 2 0 0 1 0 2.6z"></path>
                <circle cx="7.5" cy="7.5" r="1"></circle>
              </svg>
            )
          )}
          <span className={nameClass}>
            {lang === 'CZ' ? cat.name_cz : cat.name_en}
          </span>
          <button 
            type="button"
            className={delClass} 
            onClick={(e) => { e.stopPropagation(); triggerDeleteConfirm(cat.id); }}
            title={lang === 'CZ' ? 'Smazat' : 'Delete'}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width={isRoot ? "14" : "13"} height={isRoot ? "14" : "13"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
            </svg>
          </button>
        </div>
        
        {children.length > 0 && !isCollapsed && (
          <div className="ctf-leaves">
            {children.map(child => renderCategoryNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="ctf-shell">
      {/* Left pane: Tree view */}
      <section className="ctf-tree-col">
        <div>
          <h3 className="ctf-col-title">{lang === 'CZ' ? 'Strom kategorií' : 'Category Tree'}</h3>
          <p className="ctf-col-sub">
            {lang === 'CZ' 
              ? 'Vyberte kategorii pro úpravu nebo vytvořte novou podkategorii.'
              : 'Select a category to edit or create a new subcategory.'}
          </p>
        </div>

        {loading ? (
          <p className="ctf-col-sub">{lang === 'CZ' ? 'Načítání...' : 'Loading...'}</p>
        ) : (
          <div className="ctf-tree">
            {gamesList.map(game => {
              const gameRoot = categories.find(c => c.game === game && c.parent_id === null);
              const roots = gameRoot ? categories.filter(c => c.parent_id === gameRoot.id) : [];
              const getGameDisplayName = (g) => {
                const mapping = {
                  'Pokémon': 'Pokémon',
                  'Lorcana': 'Disney Lorcana',
                  'One Piece': 'One Piece',
                  'Riftbound': 'Riftbound',
                  'Accessories': lang === 'CZ' ? 'Herní příslušenství' : 'Gaming Accessories',
                  'Acrylics': lang === 'CZ' ? 'Prémiové akrylové boxy' : 'Premium Acrylic Cases'
                };
                return mapping[g] || g;
              };
              return (
                <div key={game} className="ctf-group">
                  <div className="ctf-group-label">{getGameDisplayName(game)}</div>
                  {roots.length === 0 ? (
                    <div className="ctf-col-sub" style={{ paddingLeft: '12px', fontStyle: 'italic', fontSize: '12px', marginBottom: '12px' }}>
                      {lang === 'CZ' ? 'Žádné podkategorie' : 'No subcategories'}
                    </div>
                  ) : (
                    roots.map(root => renderCategoryNode(root, 0))
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Right pane: Form */}
      <section className="ctf-form-col">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h3 className="ctf-col-title" style={{ margin: 0 }}>
            {isEditing 
              ? (lang === 'CZ' ? 'Upravit kategorii' : 'Edit Category')
              : (lang === 'CZ' ? 'Vytvořit kategorii' : 'Create Category')}
          </h3>
          {isEditing && (
            <button type="button" className="adf-cat-new-btn" onClick={handleResetForm}>
              <span>{lang === 'CZ' ? 'Nová +' : 'New +'}</span>
            </button>
          )}
        </div>

        <form onSubmit={handleSave} className="ctf-form">
          {/* Live Shop Placement Preview */}
          <div className="ctf-path-preview" style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '28px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.02)'
          }}>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-gold, #fdbd16)', letterSpacing: '0.8px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
              {lang === 'CZ' ? 'Živý náhled umístění v e-shopu' : 'Live Shop Placement Preview'}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', fontSize: '13px', color: '#fff', padding: '4px 0 2px 0' }}>
              <span style={{ color: 'rgba(255,255,255,0.45)' }}>Domů</span>
              <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '10px' }}>➔</span>
              <span style={{ color: '#fff', fontWeight: '500' }}>{formGame}</span>
              {formParentId && !isParentRoot(formParentId) && (
                <>
                  <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '10px' }}>➔</span>
                  <span style={{ color: 'rgba(255,255,255,0.8)' }}>
                    {categories.find(c => c.id === formParentId) ? (lang === 'CZ' ? categories.find(c => c.id === formParentId).name_cz : categories.find(c => c.id === formParentId).name_en) : formParentId}
                  </span>
                </>
              )}
              <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '10px' }}>➔</span>
              <span style={{ color: 'var(--color-gold, #fdbd16)', fontWeight: 'bold' }}>
                {lang === 'CZ' ? (formNameCz || 'Nová kategorie') : (formNameEn || 'New Category')}
              </span>
            </div>
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic', marginTop: '2px' }}>
              {lang === 'CZ' 
                ? 'Tento náhled ukazuje, do jaké úrovně se kategorie zařadí v navigaci.' 
                : 'This preview shows where in the catalog hierarchy this category will fit.'}
            </span>
          </div>

          {/* KROK 1: Umístění */}
          <div className="ctf-form-section" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '24px', marginBottom: '24px' }}>
            <h4 style={{ margin: '0 0 18px 0', fontSize: '13px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', color: 'var(--color-gold)', fontSize: '11px', fontWeight: 'bold' }}>1</span>
              {lang === 'CZ' ? 'Zařazení v katalogu' : 'Catalog Placement'}
            </h4>

            <div className="ctf-field">
              <label className="ctf-label">{lang === 'CZ' ? 'Hra / Franchise' : 'Game / Franchise'}</label>
              <div className="ctf-select">
                <select 
                  value={formGame}
                  onChange={e => {
                    const nextGame = e.target.value;
                    setFormGame(nextGame);
                    // Clear parent selection if it doesn't belong to the newly selected game
                    const validParents = categories.filter(c => c.game === nextGame);
                    if (!validParents.some(p => p.id === formParentId)) {
                      setFormParentId('');
                    }
                  }}
                >
                  {gamesList.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
              </div>
              <p className="ctf-hint">
                {lang === 'CZ' 
                  ? 'Hlavní značka/karta, pod kterou zboží spadá.' 
                  : 'The franchise under which this category is cataloged.'}
              </p>
            </div>

            <div className="ctf-field" style={{ marginTop: '16px' }}>
              <label className="ctf-label">{lang === 'CZ' ? 'Nadřazená kategorie (Hierarchie)' : 'Parent Category (Hierarchy)'}</label>
              <div ref={parentDropdownRef} style={{ position: 'relative', width: '100%' }}>
                <button
                  type="button"
                  onClick={() => setIsParentDropdownOpen(!isParentDropdownOpen)}
                  style={{
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    color: '#fff',
                    fontSize: '13.5px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    textAlign: 'left',
                    boxSizing: 'border-box',
                    transition: 'all 0.2s ease',
                  }}
                  className="ctf-parent-trigger"
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {!formParentId || isParentRoot(formParentId) ? (
                      <>
                        <span style={{ color: 'rgba(255, 255, 255, 0.4)' }}>🌐</span>
                        <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                          {lang === 'CZ' ? '— Hlavní kategorie —' : '— Top-level category —'}
                        </span>
                      </>
                    ) : (
                      <>
                        <span style={{ color: 'var(--color-gold)' }}>📁</span>
                        <span style={{ fontSize: '13px' }}>{getParentPath(formParentId)}</span>
                        <span style={{ color: 'rgba(255, 255, 255, 0.35)', fontSize: '11px' }}>({formParentId})</span>
                      </>
                    )}
                  </span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transition: 'transform 0.2s', transform: isParentDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                    <path d="M6 9l6 6 6-6"/>
                  </svg>
                </button>
                
                {isParentDropdownOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 6px)',
                      left: 0,
                      width: '100%',
                      maxHeight: '320px',
                      overflowY: 'auto',
                      background: '#1E1E24',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '8px',
                      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.6)',
                      zIndex: 999,
                      padding: '8px',
                      boxSizing: 'border-box',
                    }}
                    className="ctf-parent-dropdown"
                  >
                    {/* Option for None */}
                    <div
                      onClick={() => { setFormParentId(''); setIsParentDropdownOpen(false); }}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '13px',
                        color: !formParentId || isParentRoot(formParentId) ? 'var(--color-gold)' : '#fff',
                        background: !formParentId || isParentRoot(formParentId) ? 'rgba(253, 189, 22, 0.08)' : 'transparent',
                        transition: 'background 0.15s, color 0.15s',
                        marginBottom: '6px',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
                      }}
                      className="ctf-parent-opt-none"
                    >
                      <span>🌐</span>
                      <span style={{ fontWeight: !formParentId || isParentRoot(formParentId) ? '600' : '400' }}>
                        {lang === 'CZ' ? '— Hlavní kategorie —' : '— Top-level category —'}
                      </span>
                    </div>

                    {/* Hierarchical Options */}
                    {getHierarchicalOptions().length === 0 ? (
                      <div style={{ padding: '8px 12px', color: 'rgba(255,255,255,0.4)', fontSize: '12px', fontStyle: 'italic', textAlign: 'center' }}>
                        {lang === 'CZ' ? 'Žádné nadřazené kategorie k dispozici' : 'No parent categories available'}
                      </div>
                    ) : (
                      getHierarchicalOptions().map((opt, idx) => {
                        const isOptSelected = formParentId === opt.id;
                        const isLevel0 = opt.depth === 0;
                        const isLevel1 = opt.depth === 1;
                        
                        // Separator line before Level 1 categories to group children under parents visually
                        const showSeparator = isLevel1 && idx > 1;

                        return (
                          <div key={opt.id}>
                            {showSeparator && (
                              <div style={{ height: '1px', backgroundColor: 'rgba(255, 255, 255, 0.05)', margin: '10px 8px 8px 8px' }}></div>
                            )}
                            <div
                              onClick={() => {
                                setFormParentId(opt.id);
                                setIsParentDropdownOpen(false);
                              }}
                              style={{
                                padding: isLevel0 ? '10px 12px' : '8px 12px',
                                paddingLeft: `${12 + opt.depth * 24}px`, // Indent 24px per level
                                borderRadius: '6px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontSize: isLevel0 ? '13.5px' : '13px',
                                transition: 'background 0.15s, color 0.15s',
                                marginTop: isLevel0 ? '8px' : '2px',
                                marginBottom: isLevel0 ? '4px' : '0px',
                                background: isOptSelected 
                                  ? 'rgba(253, 189, 22, 0.08)' 
                                  : isLevel0 
                                    ? 'rgba(255, 255, 255, 0.025)' 
                                    : 'transparent',
                                border: isOptSelected 
                                  ? '1px solid rgba(253, 189, 22, 0.2)' 
                                  : isLevel0 
                                    ? '1px solid rgba(255, 255, 255, 0.06)' 
                                    : '1px solid transparent',
                              }}
                              className="ctf-parent-option-row"
                            >
                              <span 
                                style={{ 
                                  opacity: 0.8, 
                                  fontSize: '11px',
                                  color: isOptSelected 
                                    ? 'var(--color-gold)' 
                                    : isLevel1 
                                      ? '#FDBD16' 
                                      : 'inherit'
                                }}
                              >
                                {opt.depth > 0 ? '↳' : '📁'}
                              </span>
                              <span 
                                style={{ 
                                  fontWeight: isOptSelected || isLevel0 ? '700' : isLevel1 ? '600' : '400',
                                  color: isOptSelected 
                                    ? 'var(--color-gold)' 
                                    : isLevel0 
                                      ? '#ffffff' 
                                      : isLevel1 
                                        ? '#FDBD16' 
                                        : 'rgba(255, 255, 255, 0.65)'
                                }}
                              >
                                {opt.name}
                              </span>
                              <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '11px', marginLeft: 'auto' }}>
                                {opt.id}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
              <p className="ctf-hint">
                {lang === 'CZ' 
                  ? 'Umožňuje vytvořit podkategorii (např. edici Scarlet & Violet zařadit pod hlavní kategorii). Ponecháním prázdné vytvoříte hlavní složku.' 
                  : 'Nests this category under an existing main group. Leave empty if this is a top-level category itself.'}
              </p>
            </div>
          </div>

          {/* KROK 2: Základní detaily */}
          <div className="ctf-form-section" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '24px', marginBottom: '24px' }}>
            <h4 style={{ margin: '0 0 18px 0', fontSize: '13px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', color: 'var(--color-gold)', fontSize: '11px', fontWeight: 'bold' }}>2</span>
              {lang === 'CZ' ? 'Detaily a popis kategorie' : 'Category Details'}
            </h4>

            <div className="ctf-row2">
              <div className="ctf-field ctf-field-half">
                <label className="ctf-label">
                  {lang === 'CZ' ? 'Název CZ' : 'Name CZ'} 
                  <span className="ctf-req">*</span>
                </label>
                <input 
                  type="text" 
                  required
                  className="ctf-input"
                  value={formNameCz}
                  onChange={e => handleNameCzChange(e.target.value)}
                />
                <p className="ctf-hint">{lang === 'CZ' ? 'Název zobrazený českým uživatelům.' : 'Czech version name.'}</p>
              </div>
              <div className="ctf-field ctf-field-half">
                <label className="ctf-label">
                  {lang === 'CZ' ? 'Název EN' : 'Name EN'} 
                  <span className="ctf-req">*</span>
                </label>
                <input 
                  type="text" 
                  required
                  className="ctf-input"
                  value={formNameEn}
                  onChange={e => handleNameEnChange(e.target.value)}
                />
                <p className="ctf-hint">{lang === 'CZ' ? 'Název zobrazený anglickým uživatelům.' : 'English version name.'}</p>
              </div>
            </div>

            <div className="ctf-field" style={{ marginTop: '16px' }}>
              <label className="ctf-label">{lang === 'CZ' ? 'Popis CZ' : 'Description CZ'}</label>
              <textarea 
                className="ctf-textarea"
                rows="2"
                value={formDescCz}
                onChange={e => setFormDescCz(e.target.value)}
                placeholder={lang === 'CZ' ? 'Krátký popis kategorie...' : 'Short category description...'}
              />
              <p className="ctf-hint">{lang === 'CZ' ? 'Krátký text v záhlaví této kategorie na e-shopu.' : 'Description text displayed in CZ.'}</p>
            </div>

            <div className="ctf-field" style={{ marginTop: '16px' }}>
              <label className="ctf-label">{lang === 'CZ' ? 'Popis EN' : 'Description EN'}</label>
              <textarea 
                className="ctf-textarea"
                rows="2"
                value={formDescEn}
                onChange={e => setFormDescEn(e.target.value)}
                placeholder={lang === 'CZ' ? 'Short category description...' : 'Short category description...'}
              />
              <p className="ctf-hint">{lang === 'CZ' ? 'Krátký text pro anglickou verzi webu.' : 'Description text displayed in EN.'}</p>
            </div>
          </div>

          {/* KROK 3: Vzhled a Obrázek */}
          <div className="ctf-form-section" style={{ marginBottom: '24px' }}>
            <h4 style={{ margin: '0 0 18px 0', fontSize: '13px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', color: 'var(--color-gold)', fontSize: '11px', fontWeight: 'bold' }}>3</span>
              {lang === 'CZ' ? 'Vzhled a náhledový obrázek' : 'Appearance & Banner Image'}
            </h4>

            <div className="ctf-field">
              <label className="ctf-label">{lang === 'CZ' ? 'Obrázek kategorie' : 'Category Image'}</label>
              {formImageUrl ? (
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', padding: '12px', borderRadius: '8px' }}>
                  <img 
                    src={formImageUrl} 
                    alt="Preview category" 
                    style={{ height: '70px', width: '100px', objectFit: 'cover', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)' }} 
                    onError={(e) => { e.target.onerror = null; e.target.src = '/Northvale Logo.webp'; }} 
                  />
                  <div style={{ flex: 1, display: 'flex', gap: '8px' }}>
                    <button 
                      type="button" 
                      className="pmf-variants-add" 
                      style={{ padding: '6px 12px', fontSize: '11px' }} 
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/*';
                        input.onchange = (e) => {
                          const file = e.target.files[0];
                          if (file) {
                            loadImageFile(file);
                          }
                        };
                        input.click();
                      }}
                    >
                      {lang === 'CZ' ? 'Změnit fotku' : 'Change Photo'}
                    </button>
                    <button 
                      type="button" 
                      className="pmf-variants-add" 
                      style={{ padding: '6px 12px', fontSize: '11px', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#ef4444' }} 
                      onClick={() => setFormImageUrl('')}
                    >
                      {lang === 'CZ' ? 'Odstranit' : 'Remove'}
                    </button>
                  </div>
                </div>
              ) : (
                <div 
                  className="pmf-drop"
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById('ctf-image-file-input').click()}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '8px', color: 'var(--text-muted, #8a8a92)' }}>
                    <rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8.5" cy="9.5" r="1.5" /><path d="M21 16l-5-5L5 20" />
                  </svg>
                  <p className="dropText" style={{ fontSize: '11px', margin: 0, color: 'var(--text-muted, #8a8a92)' }}>
                    {lang === 'CZ' ? 'Přetáhněte obrázek sem nebo klikněte k výběru' : 'Drag & Drop image here or click to select'}
                  </p>
                  <input 
                    type="file" 
                    id="ctf-image-file-input" 
                    accept="image/*" 
                    style={{ display: 'none' }} 
                    onChange={handleFileChange} 
                  />
                </div>
              )}
              <p className="ctf-hint">{lang === 'CZ' ? 'Obrázek pro tuto kategorii.' : 'Image representing this category.'}</p>
            </div>
          </div>

          <div className="ctf-form-foot">
            {isEditing && (
              <button 
                type="button" 
                className="pmf-btn-danger" 
                style={{ marginRight: 'auto' }}
                onClick={() => triggerDeleteConfirm(formId)}
              >
                {lang === 'CZ' ? 'Smazat kategorii' : 'Delete Category'}
              </button>
            )}
            <button type="button" className="ctf-btn-ghost" onClick={handleResetForm}>
              {lang === 'CZ' ? 'Zrušit' : 'Cancel'}
            </button>
            <button type="submit" className="ctf-btn-primary">
              {lang === 'CZ' ? 'Uložit kategorii' : 'Save Category'}
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '6px' }}><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
            </button>
          </div>
        </form>
      </section>

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
              {lang === 'CZ' ? 'Ořez obrázku' : 'Crop Image'}
            </h3>
            
            <div style={{ display: 'flex', gap: '8px', width: '100%', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setCropOrientation('portrait')}
                style={{
                  flex: 1,
                  padding: '6px 12px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  borderRadius: '6px',
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: cropOrientation === 'portrait' ? 'var(--nv-gold, #fdbd16)' : 'rgba(255,255,255,0.02)',
                  color: cropOrientation === 'portrait' ? '#000' : '#fff',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {lang === 'CZ' ? 'Na výšku (2.5:3.5)' : 'Portrait (2.5:3.5)'}
              </button>
              <button
                type="button"
                onClick={() => setCropOrientation('landscape')}
                style={{
                  flex: 1,
                  padding: '6px 12px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  borderRadius: '6px',
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: cropOrientation === 'landscape' ? 'var(--nv-gold, #fdbd16)' : 'rgba(255,255,255,0.02)',
                  color: cropOrientation === 'landscape' ? '#000' : '#fff',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {lang === 'CZ' ? 'Na šířku (3.5:2.5)' : 'Landscape (3.5:2.5)'}
              </button>
            </div>
            
            <canvas 
              ref={canvasRef}
              width={300}
              height={400}
              className="crop-canvas-checkerboard"
              style={{
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                cursor: 'move'
              }}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseUp}
              onTouchStart={handleCanvasTouchStart}
              onTouchMove={handleCanvasTouchMove}
              onTouchEnd={handleCanvasMouseUp}
            />
            {/* ZOOM SLIDER & BUTTONS */}
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: '600' }}>
                <span>{lang === 'CZ' ? 'Přiblížení obrázku:' : 'Image Zoom:'}</span>
                <span ref={zoomValRef} style={{ color: 'var(--nv-gold, #fdbd16)', fontWeight: 'bold' }}>100%</span>
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
                  style={{ flex: 1, accentColor: 'var(--nv-gold, #fdbd16)', cursor: 'pointer', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.1)' }}
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
                className="pmf-btn-ghost"
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
                className="pmf-btn-primary"
                style={{ flex: 1, padding: '10px 16px', fontSize: '12px', borderRadius: '8px', border: 'none', background: 'var(--nv-gold, #fdbd16)', color: '#000', fontWeight: 'bold', cursor: 'pointer' }}
                onClick={handleCropAction}
              >
                {lang === 'CZ' ? 'Oříznout' : 'Crop'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {deleteConfirm.isOpen && createPortal(
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          animation: 'fadeIn 0.2s ease-out'
        }} onClick={() => setDeleteConfirm({ isOpen: false, categoryId: '' })}>
          <div style={{
            backgroundColor: '#1C1C22',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: '12px',
            padding: '28px',
            width: '420px',
            maxWidth: '90%',
            boxShadow: '0 25px 50px rgba(0,0,0,0.8)',
            transform: 'scale(1)',
            animation: 'slideUpScale 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            textAlign: 'left'
          }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{
              margin: '0 0 12px 0',
              fontFamily: "'Outfit', sans-serif",
              fontSize: '18px',
              fontWeight: '700',
              color: '#ef4444'
            }}>
              {lang === 'CZ' ? 'Potvrdit smazání' : 'Confirm Deletion'}
            </h3>
            <p style={{
              margin: '0 0 24px 0',
              color: '#a0a0a5',
              fontSize: '14px',
              lineHeight: '1.6'
            }}>
              {lang === 'CZ' 
                ? `Opravdu chcete smazat kategorii "${deleteConfirm.categoryId}"? Tím dojde k odstranění i všech jejích podkategorií.` 
                : `Are you sure you want to delete category "${deleteConfirm.categoryId}"? This will also remove all its subcategories.`}
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button 
                type="button"
                onClick={() => setDeleteConfirm({ isOpen: false, categoryId: '' })}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: 'rgba(255,255,255,0.02)',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '600'
                }}
              >
                {lang === 'CZ' ? 'Zrušit' : 'Cancel'}
              </button>
              <button 
                type="button"
                onClick={() => handleDelete(deleteConfirm.categoryId)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#ef4444',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '700'
                }}
              >
                {lang === 'CZ' ? 'Smazat' : 'Delete'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
