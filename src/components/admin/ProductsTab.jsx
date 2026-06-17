import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from '../../context/LanguageContext';
import { fetchProductsFromDB, saveProductToDB, deleteProductFromDB } from '../../services/products';
import { fetchCategoriesFromDB } from '../../services/categories';

// Simple CSV parser helper
function parseCSV(text) {
  const lines = text.split(/\r?\n/);
  if (lines.length < 2) return [];
  
  // Detect separator
  const header = lines[0];
  const separator = header.includes(';') ? ';' : ',';
  
  const headers = header.split(separator).map(h => h.trim().replace(/^["']|["']$/g, ''));
  
  const results = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Split by separator taking quotes into account
    let matches = [];
    let insideQuote = false;
    let entries = [];
    let current = '';
    
    for (let charIndex = 0; charIndex < line.length; charIndex++) {
      const char = line[charIndex];
      if (char === '"' || char === "'") {
        insideQuote = !insideQuote;
      } else if (char === separator && !insideQuote) {
        entries.push(current.trim().replace(/^["']|["']$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    entries.push(current.trim().replace(/^["']|["']$/g, ''));
    
    if (entries.length > 0) {
      const obj = {};
      headers.forEach((h, idx) => {
        obj[h] = entries[idx] || '';
      });
      results.push(obj);
    }
  }
  return results;
}

export default function ProductsTab({ showToast }) {
  const { lang } = useTranslation();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters for table list
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterGame, setFilterGame] = useState('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  
  // CSV Import State
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvContent, setCsvContent] = useState('');
  const [parsedRows, setParsedRows] = useState([]);

  // Form fields state
  const [formId, setFormId] = useState('');
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState('single');
  const [formGame, setFormGame] = useState('Pokémon');
  const [formEdition, setFormEdition] = useState('');
  const [formRarity, setFormRarity] = useState('');
  const [formImage, setFormImage] = useState('');
  const [formBackImage, setFormBackImage] = useState('https://images.pokemontcg.io/unbroken_bonds/back.png');
  const [formDesc, setFormDesc] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formStock, setFormStock] = useState('');
  const [formLang, setFormLang] = useState('EN');
  
  // Specialized fields based on type
  const [formPreorder, setFormPreorder] = useState(false);
  const [formInvestment, setFormInvestment] = useState(false);
  const [formCategoryId, setFormCategoryId] = useState('');
  
  // Sealed fields
  const [formPackagingType, setFormPackagingType] = useState('Booster Box');
  const [formBoosterCount, setFormBoosterCount] = useState('');
  const [formYear, setFormYear] = useState('');
  const [formFoilCondition, setFormFoilCondition] = useState('100% stav');
  
  // Slab fields
  const [formCompany, setFormCompany] = useState('PSA');
  const [formGrade, setFormGrade] = useState('10');
  const [formCertNumber, setFormCertNumber] = useState('');
  
  // Acrylic fields
  const [formAcrylicThickness, setFormAcrylicThickness] = useState('4');
  const [formUvProtection, setFormUvProtection] = useState(true);
  const [formClosingType, setFormClosingType] = useState('Magnetické víko');
  const [formInnerDimensions, setFormInnerDimensions] = useState('');

  // Variants state for Singles
  const [formVariants, setFormVariants] = useState([]);

  // Image Crop State
  const [cropImageSrc, setCropImageSrc] = useState(null);
  const [cropScale, setCropScale] = useState(1);
  const [cropX, setCropX] = useState(0);
  const [cropY, setCropY] = useState(0);
  const [isCropping, setIsCropping] = useState(false);
  const canvasRef = useRef(null);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const loadedImage = useRef(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (isModalOpen || isCsvModalOpen) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [isModalOpen, isCsvModalOpen]);

  const loadData = async () => {
    setLoading(true);
    const [pData, cData] = await Promise.all([
      fetchProductsFromDB(),
      fetchCategoriesFromDB()
    ]);
    setProducts(pData || []);
    setCategories(cData || []);
    setLoading(false);
  };

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setFormId('');
    setFormName('');
    setFormType('single');
    setFormGame('Pokémon');
    setFormEdition('');
    setFormRarity('');
    setFormImage('');
    setFormBackImage('https://images.pokemontcg.io/unbroken_bonds/back.png');
    setFormDesc('');
    setFormPrice('');
    setFormStock('');
    setFormLang('EN');
    setFormPreorder(false);
    setFormInvestment(false);
    setFormCategoryId('');
    setFormPackagingType('Booster Box');
    setFormBoosterCount('');
    setFormYear('');
    setFormFoilCondition('100% stav');
    setFormCompany('PSA');
    setFormGrade('10');
    setFormCertNumber('');
    setFormAcrylicThickness('4');
    setFormUvProtection(true);
    setFormClosingType('Magnetické víko');
    setFormInnerDimensions('');
    setFormVariants([
      { id: 'v-' + Math.random().toString(36).substr(2, 5), condition: 'NM', lang: 'EN', foil: true, price: 100, stock: 1 }
    ]);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (p) => {
    setEditingProduct(p);
    setFormId(p.id || '');
    setFormName(p.name || '');
    setFormType(p.type || 'single');
    setFormGame(p.game || 'Pokémon');
    setFormEdition(p.edition || '');
    setFormRarity(p.rarity || '');
    setFormImage(p.image || '');
    setFormBackImage(p.backImage || p.back_image || 'https://images.pokemontcg.io/unbroken_bonds/back.png');
    setFormDesc(p.desc || p.description || '');
    setFormPrice(p.price !== null && p.price !== undefined ? p.price.toString() : '');
    setFormStock(p.stock !== null && p.stock !== undefined ? p.stock.toString() : '');
    setFormLang(p.lang || 'EN');
    setFormPreorder(!!p.preorder);
    setFormInvestment(!!p.investment);
    setFormCategoryId(p.category_id || '');
    
    // Sealed fields
    setFormPackagingType(p.packagingType || p.packaging_type || 'Booster Box');
    setFormBoosterCount(p.boosterCount !== null && p.boosterCount !== undefined ? p.boosterCount.toString() : '');
    setFormYear(p.year !== null && p.year !== undefined ? p.year.toString() : '');
    setFormFoilCondition(p.foilCondition || p.foil_condition || '100% stav');
    
    // Slab fields
    setFormCompany(p.company || 'PSA');
    setFormGrade(p.grade !== null && p.grade !== undefined ? p.grade.toString() : '10');
    setFormCertNumber(p.certNumber || p.cert_number || '');
    
    // Acrylic fields
    setFormAcrylicThickness(p.acrylicThickness !== null && p.acrylicThickness !== undefined ? p.acrylicThickness.toString() : '4');
    setFormUvProtection(!!(p.uvProtection || p.uv_protection));
    setFormClosingType(p.closingType || p.closing_type || 'Magnetické víko');
    setFormInnerDimensions(p.innerDimensions || p.inner_dimensions || '');

    // Variants
    setFormVariants(p.variants || []);
    setIsModalOpen(true);
  };

  const handleDeleteProduct = async (id) => {
    const confirmMsg = lang === 'CZ'
      ? `Opravdu chcete smazat produkt "${id}"?`
      : `Are you sure you want to delete product "${id}"?`;
      
    if (window.confirm(confirmMsg)) {
      const { error } = await deleteProductFromDB(id);
      if (error) {
        showToast(lang === 'CZ' ? 'Chyba při mazání produktu.' : 'Error deleting product.', 'error');
      } else {
        showToast(lang === 'CZ' ? 'Produkt byl smazán.' : 'Product was deleted.', 'success');
        loadData();
      }
    }
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    let finalId = formId.trim();
    if (!finalId) {
      finalId = formName
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // remove diacritics
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    }

    if (!finalId) {
      showToast(lang === 'CZ' ? 'Název nebo identifikátor produktu je povinný.' : 'Product name or identifier is required.', 'error');
      return;
    }

    const productPayload = {
      id: finalId,
      name: formName,
      type: formType,
      game: formGame,
      edition: formEdition,
      rarity: formRarity,
      image: formImage,
      backImage: formBackImage,
      desc: formDesc,
      preorder: formPreorder,
      investment: formInvestment,
      category_id: formCategoryId || null
    };

    if (formType === 'single') {
      productPayload.variants = formVariants;
      productPayload.price = null;
      productPayload.stock = null;
    } else {
      productPayload.price = formPrice ? Number(formPrice) : null;
      productPayload.stock = formStock ? Number(formStock) : null;
    }

    if (formType === 'sealed') {
      productPayload.packagingType = formPackagingType;
      productPayload.boosterCount = formBoosterCount ? Number(formBoosterCount) : null;
      productPayload.year = formYear ? Number(formYear) : null;
      productPayload.foilCondition = formFoilCondition;
    }

    if (formType === 'slab') {
      productPayload.company = formCompany;
      productPayload.grade = formGrade ? Number(formGrade) : null;
      productPayload.certNumber = formCertNumber;
    }

    if (formType === 'accessory') {
      productPayload.acrylicThickness = formAcrylicThickness ? Number(formAcrylicThickness) : null;
      productPayload.uvProtection = formUvProtection;
      productPayload.closingType = formClosingType;
      productPayload.innerDimensions = formInnerDimensions;
    }

    const { data, error } = await saveProductToDB(productPayload);
    if (error) {
      showToast(lang === 'CZ' ? 'Chyba při ukládání produktu.' : 'Error saving product.', 'error');
    } else {
      showToast(lang === 'CZ' ? 'Produkt úspěšně uložen!' : 'Product saved successfully!', 'success');
      setIsModalOpen(false);
      loadData();
    }
  };

  // Variants Helper Form Handlers
  const handleAddVariantRow = () => {
    setFormVariants([
      ...formVariants,
      { id: 'v-' + Math.random().toString(36).substr(2, 5), condition: 'NM', lang: 'EN', foil: false, price: 100, stock: 1 }
    ]);
  };

  const handleRemoveVariantRow = (id) => {
    setFormVariants(formVariants.filter(v => v.id !== id));
  };

  const handleVariantChange = (id, field, value) => {
    setFormVariants(formVariants.map(v => {
      if (v.id === id) {
        return { ...v, [field]: value };
      }
      return v;
    }));
  };

  // --- Image Crop Canvas Implementation ---
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
      setIsCropping(true);
      setCropScale(1);
      setCropX(0);
      setCropY(0);
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
        drawCanvas();
      };
      img.src = cropImageSrc;
    }
  }, [isCropping, cropImageSrc, cropScale, cropX, cropY]);

  const drawCanvas = () => {
    if (!loadedImage.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = loadedImage.current;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Target frame dimensions (aspect ratio ~2.5:3.5 for cards)
    const frameW = 200;
    const frameH = 280;
    const frameX = (canvas.width - frameW) / 2;
    const frameY = (canvas.height - frameH) / 2;

    // Save context state
    ctx.save();

    // Clip to crop target frame
    ctx.beginPath();
    ctx.rect(frameX, frameY, frameW, frameH);
    ctx.clip();

    // Draw scaled & translated image
    const drawW = img.width * cropScale;
    const drawH = img.height * cropScale;
    const drawX = frameX + (frameW - drawW) / 2 + cropX;
    const drawY = frameY + (frameH - drawH) / 2 + cropY;

    ctx.drawImage(img, drawX, drawY, drawW, drawH);

    // Restore context (remove clipping)
    ctx.restore();

    // Draw darker overlay outside the target frame
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    // top
    ctx.fillRect(0, 0, canvas.width, frameY);
    // bottom
    ctx.fillRect(0, frameY + frameH, canvas.width, frameY);
    // left
    ctx.fillRect(0, frameY, frameX, frameH);
    // right
    ctx.fillRect(frameX + frameW, frameY, frameX, frameH);

    // Draw frame borders
    ctx.strokeStyle = 'var(--color-gold)';
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
    if (!isDragging.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const dx = mouseX - dragStart.current.x;
    const dy = mouseY - dragStart.current.y;

    setCropX(prev => prev + dx);
    setCropY(prev => prev + dy);

    dragStart.current = { x: mouseX, y: mouseY };
  };

  const handleCanvasMouseUp = () => {
    isDragging.current = false;
  };

  const handleCropAction = () => {
    if (!loadedImage.current || !canvasRef.current) return;
    
    // Create offscreen canvas to perform final crop extraction
    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = 250;
    cropCanvas.height = 350;
    const cropCtx = cropCanvas.getContext('2d');

    const img = loadedImage.current;
    const frameW = 200;
    const frameH = 280;
    
    // Find absolute coordinate mappings from visual canvas to cropped image
    const drawW = img.width * cropScale;
    const drawH = img.height * cropScale;
    
    // Visual offset of target frame relative to center + drag position
    const offsetX = (frameW - drawW) / 2 + cropX;
    const offsetY = (frameH - drawH) / 2 + cropY;

    // Draw on target extraction canvas
    cropCtx.drawImage(
      img,
      (offsetX / drawW) * img.width * -1,
      (offsetY / drawH) * img.height * -1,
      (frameW / drawW) * img.width,
      (frameH / drawH) * img.height,
      0,
      0,
      cropCanvas.width,
      cropCanvas.height
    );

    const croppedUrl = cropCanvas.toDataURL('image/png');
    setFormImage(croppedUrl);
    setIsCropping(false);
    setCropImageSrc(null);
    showToast(lang === 'CZ' ? 'Obrázek byl úspěšně oříznut!' : 'Image cropped successfully!', 'success');
  };

  // --- CSV Bulk Import logic ---
  const handleCsvImport = async () => {
    if (!csvContent.trim()) {
      showToast(lang === 'CZ' ? 'Zadejte prosím CSV text.' : 'Please enter CSV text.', 'error');
      return;
    }

    try {
      const rows = parseCSV(csvContent);
      if (rows.length === 0) {
        showToast(lang === 'CZ' ? 'Nebyla nalezena žádná platná data.' : 'No valid CSV rows parsed.', 'error');
        return;
      }

      setParsedRows(rows);
      showToast(lang === 'CZ' ? `Načteno ${rows.length} řádků. Klikněte na Uložit do DB.` : `Parsed ${rows.length} rows. Click Save to DB.`, 'success');
    } catch (err) {
      showToast(lang === 'CZ' ? 'Chyba při čtení CSV.' : 'Error reading CSV.', 'error');
    }
  };

  const handleSaveCsvToDb = async () => {
    if (parsedRows.length === 0) return;
    
    let successCount = 0;
    let failCount = 0;

    for (const row of parsedRows) {
      try {
        // Build product mapping from CSV headers
        const pId = row.id || row.code || row.ID || row.Code;
        const pName = row.name || row.Name || row.title || row.Title;
        if (!pId || !pName) {
          failCount++;
          continue;
        }

        const productPayload = {
          id: pId.trim(),
          name: pName,
          type: row.type || row.Type || 'single',
          game: row.game || row.Game || 'Pokémon',
          edition: row.edition || row.Edition || '',
          rarity: row.rarity || row.Rarity || '',
          image: row.image || row.Image || '',
          desc: row.desc || row.description || row.Description || '',
          preorder: row.preorder === 'true' || row.preorder === '1',
          investment: row.investment === 'true' || row.investment === '1',
          category_id: row.category_id || null
        };

        if (productPayload.type === 'single') {
          // If variants are supplied as json in CSV, parse it
          if (row.variants) {
            try {
              productPayload.variants = JSON.parse(row.variants);
            } catch(e) {
              productPayload.variants = [];
            }
          } else {
            // Create default variant
            productPayload.variants = [
              {
                id: 'v-' + Math.random().toString(36).substr(2, 5),
                condition: row.condition || 'NM',
                lang: row.lang || 'EN',
                foil: row.foil === 'true' || row.foil === '1',
                price: Number(row.price || 100),
                stock: Number(row.stock || 1)
              }
            ];
          }
        } else {
          productPayload.price = row.price ? Number(row.price) : null;
          productPayload.stock = row.stock ? Number(row.stock) : null;
        }

        const { error } = await saveProductToDB(productPayload);
        if (error) {
          failCount++;
        } else {
          successCount++;
        }
      } catch (err) {
        failCount++;
      }
    }

    showToast(
      lang === 'CZ' 
        ? `Hromadný import dokončen. Úspěšně: ${successCount}, Chyby: ${failCount}` 
        : `Bulk import completed. Success: ${successCount}, Fails: ${failCount}`,
      failCount > 0 ? 'warning' : 'success'
    );

    setIsCsvModalOpen(false);
    setCsvContent('');
    setParsedRows([]);
    loadData();
  };

  // Filter products list
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (p.edition && p.edition.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = filterType === 'all' || p.type === filterType;
    const matchesGame = filterGame === 'all' || p.game === filterGame;
    return matchesSearch && matchesType && matchesGame;
  });

  return (
    <div style={styles.container}>
      {/* Top Bar Actions */}
      <div style={styles.topBar}>
        <div style={styles.filtersGroup}>
          <input 
            type="text" 
            style={styles.searchInput}
            placeholder={lang === 'CZ' ? 'Hledat název, ID nebo set...' : 'Search name, ID or set...'}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          <select 
            style={styles.filterSelect}
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
          >
            <option value="all">{lang === 'CZ' ? 'Všechny typy' : 'All Types'}</option>
            <option value="single">{lang === 'CZ' ? 'Karty (Singles)' : 'Singles'}</option>
            <option value="sealed">{lang === 'CZ' ? 'Zapečetěné' : 'Sealed'}</option>
            <option value="slab">{lang === 'CZ' ? 'Slab (Graded)' : 'Slabs'}</option>
            <option value="accessory">{lang === 'CZ' ? 'Příslušenství / Akryly' : 'Accessories / Acrylics'}</option>
          </select>
          <select 
            style={styles.filterSelect}
            value={filterGame}
            onChange={e => setFilterGame(e.target.value)}
          >
            <option value="all">{lang === 'CZ' ? 'Všechny hry' : 'All Games'}</option>
            <option value="Pokémon">Pokémon</option>
            <option value="Lorcana">Lorcana</option>
            <option value="One Piece">One Piece</option>
            <option value="Riftbound">Riftbound</option>
            <option value="Accessories">{lang === 'CZ' ? 'Příslušenství' : 'Accessories'}</option>
            <option value="Acrylics">{lang === 'CZ' ? 'Akryly' : 'Acrylics'}</option>
          </select>
        </div>

        <div style={styles.actions}>
          <button className="btn btn-secondary" onClick={() => setIsCsvModalOpen(true)}>
            📊 {lang === 'CZ' ? 'Hromadný CSV import' : 'Bulk CSV Import'}
          </button>
          <button className="btn btn-success" onClick={handleOpenAddModal}>
            ➕ {lang === 'CZ' ? 'Přidat produkt' : 'Add Product'}
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div style={styles.tableWrapper} className="glass-panel">
        {loading ? (
          <p style={styles.infoText}>{lang === 'CZ' ? 'Načítání produktů...' : 'Loading products...'}</p>
        ) : filteredProducts.length === 0 ? (
          <p style={styles.infoText}>{lang === 'CZ' ? 'Žádné produkty neodpovídají filtrům.' : 'No products match filters.'}</p>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableHeaderRow}>
                <th style={styles.th}>{lang === 'CZ' ? 'Náhled' : 'Preview'}</th>
                <th style={styles.th}>{lang === 'CZ' ? 'Kód / ID' : 'Code / ID'}</th>
                <th style={styles.th}>{lang === 'CZ' ? 'Název produktu' : 'Product Name'}</th>
                <th style={styles.th}>{lang === 'CZ' ? 'Hra' : 'Game'}</th>
                <th style={styles.th}>{lang === 'CZ' ? 'Typ' : 'Type'}</th>
                <th style={styles.th}>{lang === 'CZ' ? 'Cena / Sklad' : 'Price / Stock'}</th>
                <th style={styles.th}>{lang === 'CZ' ? 'Akce' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map(p => {
                let priceStockText = '';
                if (p.type === 'single') {
                  const totalStock = p.variants?.reduce((sum, v) => sum + v.stock, 0) || 0;
                  const minPrice = p.variants?.length > 0 ? Math.min(...p.variants.map(v => v.price)) : 0;
                  priceStockText = `${lang === 'CZ' ? 'od' : 'from'} ${minPrice} Kč (${totalStock} ks)`;
                } else {
                  priceStockText = `${p.price || 0} Kč (${p.stock || 0} ks)`;
                }

                return (
                  <tr key={p.id} style={styles.tableRow}>
                    <td style={styles.td}>
                      <img 
                        src={p.image || '/logo-northvale.png'} 
                        alt="" 
                        style={styles.tableImg} 
                        onError={(e) => { e.target.src = '/logo-northvale.png'; }}
                      />
                    </td>
                    <td style={styles.tdCode}>{p.id}</td>
                    <td style={styles.tdName}>
                      <div style={styles.nameCell}>
                        <strong>{p.name}</strong>
                        {p.edition && <span style={styles.subtext}>{p.edition}</span>}
                      </div>
                    </td>
                    <td style={styles.td}>{p.game}</td>
                    <td style={styles.td}>
                      <span style={styles.typeBadge}>{p.type}</span>
                    </td>
                    <td style={styles.td}>{priceStockText}</td>
                    <td style={styles.tdActions}>
                      <button 
                        className="btn btn-secondary" 
                        style={styles.actionBtn}
                        onClick={() => handleOpenEditModal(p)}
                      >
                        ✏️ {lang === 'CZ' ? 'Upravit' : 'Edit'}
                      </button>
                      <button 
                        className="btn btn-danger" 
                        style={styles.actionBtn}
                        onClick={() => handleDeleteProduct(p.id)}
                      >
                        🗑️ {lang === 'CZ' ? 'Smazat' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && createPortal(
        <div className="pmf-modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="pmf-modal fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="pmf-head">
              <h2 className="pmf-title">
                {editingProduct 
                  ? (lang === 'CZ' ? `Upravit: ${editingProduct.name}` : `Edit: ${editingProduct.name}`)
                  : (lang === 'CZ' ? 'Vytvořit nový produkt' : 'Create New Product')}
              </h2>
              <button className="pmf-close" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleSaveProduct} style={styles.modalForm}>
              <div style={styles.modalGrid}>
                {/* Left columns - Details */}
                <div style={styles.modalColLeft}>
                  <div style={styles.row}>
                    <div style={styles.col}>
                      <div className="pmf-field">
                        <label className="pmf-label">
                          {lang === 'CZ' ? 'Identifikátor / Kód' : 'Code / ID'}
                          <span className="pmf-req-dot"> *</span>
                        </label>
                        <input 
                          type="text" 
                          className="pmf-input"
                          value={formId}
                          onChange={e => setFormId(e.target.value)}
                          disabled={!!editingProduct}
                          placeholder={lang === 'CZ' ? 'např. charizard-ex (lze nechat prázdné)' : 'e.g. charizard-ex (can leave empty)'}
                        />
                        <span style={styles.helperText}>
                          {lang === 'CZ' 
                            ? '💡 Unikátní kód v databázi a součást adresy (např. .../singles/charizard-ex). Pište bez mezer a diakritiky, pouze s pomlčkami. Pokud necháte prázdné, vygeneruje se z názvu.' 
                            : '💡 Unique ID and URL slug. Use lowercase & hyphens. If left empty, it will auto-generate from the name.'}
                        </span>
                      </div>
                    </div>
                    <div style={styles.col}>
                      <div className="pmf-field">
                        <label className="pmf-label">{lang === 'CZ' ? 'Hra' : 'Game'}</label>
                        <div className="pmf-select-wrapper">
                          <select 
                            className="pmf-select"
                            value={formGame}
                            onChange={e => setFormGame(e.target.value)}
                          >
                            <option value="Pokémon">Pokémon</option>
                            <option value="Lorcana">Lorcana</option>
                            <option value="One Piece">One Piece</option>
                            <option value="Riftbound">Riftbound</option>
                            <option value="Accessories">Accessories</option>
                            <option value="Acrylics">Acrylics</option>
                          </select>
                          <svg className="pmf-select-chevron" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M6 9l6 6 6-6" />
                          </svg>
                        </div>
                        <span style={styles.helperText}>
                          {lang === 'CZ' ? '💡 Hlavní série (franšíza) tohoto produktu.' : '💡 Main category franchise.'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={styles.row}>
                    <div style={styles.col}>
                      <div className="pmf-field">
                        <label className="pmf-label">
                          {lang === 'CZ' ? 'Název produktu' : 'Product Name'}
                          <span className="pmf-req-dot"> *</span>
                        </label>
                        <input 
                          type="text" 
                          required
                          className="pmf-input"
                          value={formName}
                          onChange={e => setFormName(e.target.value)}
                          placeholder={lang === 'CZ' ? 'např. Charizard ex' : 'e.g. Charizard ex'}
                        />
                        <span style={styles.helperText}>
                          {lang === 'CZ' 
                            ? '💡 Veřejný název zobrazený na e-shopu.' 
                            : '💡 Product name shown on the storefront.'}
                        </span>
                      </div>
                    </div>
                    <div style={styles.col}>
                      <div className="pmf-field">
                        <label className="pmf-label">{lang === 'CZ' ? 'Typ produktu' : 'Product Type'}</label>
                        <div className="pmf-select-wrapper">
                          <select 
                            className="pmf-select"
                            value={formType}
                            onChange={e => setFormType(e.target.value)}
                          >
                            <option value="single">{lang === 'CZ' ? 'Kusová karta' : 'Single Card'}</option>
                            <option value="sealed">{lang === 'CZ' ? 'Zapečetěný produkt' : 'Sealed Product'}</option>
                            <option value="slab">{lang === 'CZ' ? 'Graded Slab' : 'Graded Slab'}</option>
                            <option value="accessory">{lang === 'CZ' ? 'Příslušenství' : 'Accessory'}</option>
                          </select>
                          <svg className="pmf-select-chevron" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M6 9l6 6 6-6" />
                          </svg>
                        </div>
                        <span style={styles.helperText}>
                          {lang === 'CZ' 
                            ? '💡 Kusové karty podporují stavy a jazyky. Ostatní mají jednu pevnou cenu.' 
                            : '💡 Singles allow variations. Other types use a flat price.'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Standard price/stock inputs (non-singles) */}
                  {formType !== 'single' && (
                    <div style={styles.row}>
                      <div style={styles.col}>
                        <div className="pmf-field">
                          <label className="pmf-label">
                            {lang === 'CZ' ? 'Cena (Kč)' : 'Price (CZK)'}
                            <span className="pmf-req-dot"> *</span>
                          </label>
                          <input 
                            type="number" 
                            required
                            className="pmf-input"
                            value={formPrice}
                            onChange={e => setFormPrice(e.target.value)}
                            placeholder="e.g. 150"
                          />
                          <span style={styles.helperText}>
                            {lang === 'CZ' ? '💡 Konečná prodejní cena v Kč.' : '💡 Sales price in CZK.'}
                          </span>
                        </div>
                      </div>
                      <div style={styles.col}>
                        <div className="pmf-field">
                          <label className="pmf-label">
                            {lang === 'CZ' ? 'Skladem (ks)' : 'Stock (pcs)'}
                            <span className="pmf-req-dot"> *</span>
                          </label>
                          <input 
                            type="number" 
                            required
                            className="pmf-input"
                            value={formStock}
                            onChange={e => setFormStock(e.target.value)}
                            placeholder="e.g. 5"
                          />
                          <span style={styles.helperText}>
                            {lang === 'CZ' ? '💡 Počet kusů připravených k prodeji.' : '💡 Quantity available.'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div style={styles.row}>
                    <div style={styles.col}>
                      <div className="pmf-field">
                        <label className="pmf-label">{lang === 'CZ' ? 'Edice / Set' : 'Set / Edition'}</label>
                        <input 
                          type="text" 
                          className="pmf-input"
                          value={formEdition}
                          onChange={e => setFormEdition(e.target.value)}
                          placeholder="Obsidian Flames"
                        />
                        <span style={styles.helperText}>
                          {lang === 'CZ' ? '💡 Název sady/expanze (např. Obsidian Flames).' : '💡 Set or expansion name.'}
                        </span>
                      </div>
                    </div>
                    <div style={styles.col}>
                      <div className="pmf-field">
                        <label className="pmf-label">{lang === 'CZ' ? 'Zařadit pod kategorii' : 'Assign to Category'}</label>
                        <div className="pmf-select-wrapper">
                          <select 
                            className="pmf-select"
                            value={formCategoryId}
                            onChange={e => setFormCategoryId(e.target.value)}
                          >
                            <option value="">{lang === 'CZ' ? '-- Žádná --' : '-- None --'}</option>
                            {categories
                              .filter(c => c.game === formGame || formGame === 'Accessories' || formGame === 'Acrylics')
                              .map(c => (
                                <option key={c.id} value={c.id}>
                                  {c.game} - {lang === 'CZ' ? c.name_cz : c.name_en} ({c.id})
                                </option>
                              ))
                            }
                          </select>
                          <svg className="pmf-select-chevron" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M6 9l6 6 6-6" />
                          </svg>
                        </div>
                        <span style={styles.helperText}>
                          {lang === 'CZ' ? '💡 Zařadí produkt pod konkrétní podkategorii v e-shopu.' : '💡 Places it in a category filter tree.'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Preorder & Investment checkboxes */}
                  <div style={{ display: 'flex', gap: '24px', alignItems: 'center', padding: '4px 0' }}>
                    <label className="pmf-check-label">
                      <input 
                        type="checkbox" 
                        className="pmf-check-box"
                        checked={formPreorder} 
                        onChange={e => setFormPreorder(e.target.checked)} 
                      />
                      {lang === 'CZ' ? 'Předobjednávka' : 'Preorder'}
                    </label>
                    <label className="pmf-check-label">
                      <input 
                        type="checkbox" 
                        className="pmf-check-box"
                        checked={formInvestment} 
                        onChange={e => setFormInvestment(e.target.checked)} 
                      />
                      {lang === 'CZ' ? 'Investiční produkt' : 'Investment Product'}
                    </label>
                  </div>
                  <span style={styles.helperText} style={{ marginTop: '-4px', marginBottom: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
                    {lang === 'CZ' 
                      ? '💡 Předobjednávka přidá štítek. Investiční produkt zařadí položku do doporučených investic.' 
                      : '💡 Preorder adds a badge. Investment adds it to the investment portal.'}
                  </span>

                  {/* Description */}
                  <div className="pmf-field">
                    <label className="pmf-label">{lang === 'CZ' ? 'Popis produktu' : 'Description'}</label>
                    <textarea 
                      className="pmf-textarea"
                      rows="3"
                      value={formDesc}
                      onChange={e => setFormDesc(e.target.value)}
                      placeholder={lang === 'CZ' ? 'Zde zadejte podrobný popis...' : 'Enter detailed product description...'}
                    />
                    <span style={styles.helperText}>
                      {lang === 'CZ' ? '💡 Popis zobrazený na detailu produktu.' : '💡 Product details shown on its page.'}
                    </span>
                  </div>

                  {/* TYPE-SPECIFIC DETAILS */}
                  {formType === 'sealed' && (
                    <div style={styles.typeSpecificBox}>
                      <h4 style={styles.boxTitle}>{lang === 'CZ' ? 'Parametry zapečetěného produktu' : 'Sealed Product Parameters'}</h4>
                      <div style={styles.row}>
                        <div style={styles.col}>
                          <div className="pmf-field">
                            <label className="pmf-label">{lang === 'CZ' ? 'Typ balení' : 'Packaging Type'}</label>
                            <input 
                              type="text" 
                              className="pmf-input"
                              value={formPackagingType}
                              onChange={e => setFormPackagingType(e.target.value)}
                              placeholder="Booster Box, ETB, Booster..."
                            />
                            <span style={styles.helperText}>
                              {lang === 'CZ' ? '💡 Např. Booster Box, Elite Trainer Box, plechovka...' : '💡 e.g. Booster Box, ETB, tin.'}
                            </span>
                          </div>
                        </div>
                        <div style={styles.col}>
                          <div className="pmf-field">
                            <label className="pmf-label">{lang === 'CZ' ? 'Počet boosterů' : 'Booster Count'}</label>
                            <input 
                              type="number" 
                              className="pmf-input"
                              value={formBoosterCount}
                              onChange={e => setFormBoosterCount(e.target.value)}
                              placeholder="36"
                            />
                            <span style={styles.helperText}>
                              {lang === 'CZ' ? '💡 Počet balíčků uvnitř balení.' : '💡 Number of packs inside.'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div style={styles.row}>
                        <div style={styles.col}>
                          <div className="pmf-field">
                            <label className="pmf-label">{lang === 'CZ' ? 'Rok vydání' : 'Release Year'}</label>
                            <input 
                              type="number" 
                              className="pmf-input"
                              value={formYear}
                              onChange={e => setFormYear(e.target.value)}
                              placeholder="2024"
                            />
                            <span style={styles.helperText}>
                              {lang === 'CZ' ? '💡 Rok vydání na trh.' : '💡 Product launch year.'}
                            </span>
                          </div>
                        </div>
                        <div style={styles.col}>
                          <div className="pmf-field">
                            <label className="pmf-label">{lang === 'CZ' ? 'Stav fólie / krabice' : 'Foil Condition'}</label>
                            <input 
                              type="text" 
                              className="pmf-input"
                              value={formFoilCondition}
                              onChange={e => setFormFoilCondition(e.target.value)}
                              placeholder="100% stav"
                            />
                            <span style={styles.helperText}>
                              {lang === 'CZ' ? '💡 Stav vnější fólie (např. bez trhlin).' : '💡 Foil wrapping condition.'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {formType === 'slab' && (
                    <div style={styles.typeSpecificBox}>
                      <h4 style={styles.boxTitle}>{lang === 'CZ' ? 'Parametry certifikovaného slab' : 'Graded Slab Parameters'}</h4>
                      <div style={styles.row}>
                        <div style={styles.col}>
                          <div className="pmf-field">
                            <label className="pmf-label">{lang === 'CZ' ? 'Certifikační autorita' : 'Grading Company'}</label>
                            <div className="pmf-select-wrapper">
                              <select 
                                className="pmf-select"
                                value={formCompany}
                                onChange={e => setFormCompany(e.target.value)}
                              >
                                <option value="PSA">PSA</option>
                                <option value="Beckett">Beckett (BGS)</option>
                                <option value="CGC">CGC</option>
                                <option value="AP">AP Gradings</option>
                              </select>
                              <svg className="pmf-select-chevron" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M6 9l6 6 6-6" />
                              </svg>
                            </div>
                            <span style={styles.helperText}>
                              {lang === 'CZ' ? '💡 Společnost, která kartu certifikovala.' : '💡 Certification company.'}
                            </span>
                          </div>
                        </div>
                        <div style={styles.col}>
                          <div className="pmf-field">
                            <label className="pmf-label">{lang === 'CZ' ? 'Hodnocení (Grade)' : 'Grade'}</label>
                            <input 
                              type="number" 
                              step="0.5"
                              className="pmf-input"
                              value={formGrade}
                              onChange={e => setFormGrade(e.target.value)}
                              placeholder="10"
                            />
                            <span style={styles.helperText}>
                              {lang === 'CZ' ? '💡 Výsledná známka (např. 10, 9.5).' : '💡 Numerical grade.'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="pmf-field">
                        <label className="pmf-label">{lang === 'CZ' ? 'Certifikační číslo' : 'Cert Number'}</label>
                        <input 
                          type="text" 
                          className="pmf-input"
                          value={formCertNumber}
                          onChange={e => setFormCertNumber(e.target.value)}
                          placeholder="84729104"
                        />
                        <span style={styles.helperText}>
                          {lang === 'CZ' ? '💡 Unikátní číslo ze štítku slabu.' : '💡 Unique label barcode number.'}
                        </span>
                      </div>
                    </div>
                  )}

                  {formType === 'accessory' && (
                    <div style={styles.typeSpecificBox}>
                      <h4 style={styles.boxTitle}>{lang === 'CZ' ? 'Parametry příslušenství / akrylu' : 'Accessory / Acrylic Parameters'}</h4>
                      <div style={styles.row}>
                        <div style={styles.col}>
                          <div className="pmf-field">
                            <label className="pmf-label">{lang === 'CZ' ? 'Tloušťka akrylu (mm)' : 'Acrylic Thickness (mm)'}</label>
                            <input 
                              type="number" 
                              className="pmf-input"
                              value={formAcrylicThickness}
                              onChange={e => setFormAcrylicThickness(e.target.value)}
                              placeholder="4"
                            />
                            <span style={styles.helperText}>
                              {lang === 'CZ' ? '💡 Síla stěny akrylu v mm.' : '💡 Acrylic thickness in mm.'}
                            </span>
                          </div>
                        </div>
                        <div style={styles.col}>
                          <div className="pmf-field">
                            <label className="pmf-label">{lang === 'CZ' ? 'Způsob zavírání' : 'Closing Type'}</label>
                            <input 
                              type="text" 
                              className="pmf-input"
                              value={formClosingType}
                              onChange={e => setFormClosingType(e.target.value)}
                              placeholder="Magnetické víko..."
                            />
                            <span style={styles.helperText}>
                              {lang === 'CZ' ? '💡 Typ uzávěru (např. magnetický, posuvný).' : '💡 e.g. magnetic, slide.'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div style={styles.row}>
                        <div style={styles.col}>
                          <div className="pmf-field">
                            <label className="pmf-label">{lang === 'CZ' ? 'Vnitřní rozměry' : 'Inner Dimensions'}</label>
                            <input 
                              type="text" 
                              className="pmf-input"
                              value={formInnerDimensions}
                              onChange={e => setFormInnerDimensions(e.target.value)}
                              placeholder="142 x 125 x 78 mm"
                            />
                            <span style={styles.helperText}>
                              {lang === 'CZ' ? '💡 Vnitřní prostor v mm (Š x V x H).' : '💡 Inside cavity dimensions.'}
                            </span>
                          </div>
                        </div>
                        <div style={styles.col}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '24px' }}>
                            <label className="pmf-check-label">
                              <input 
                                type="checkbox" 
                                className="pmf-check-box"
                                checked={formUvProtection} 
                                onChange={e => setFormUvProtection(e.target.checked)} 
                              />
                              {lang === 'CZ' ? 'UV Ochrana 99%' : '99% UV Protection'}
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SINGLES VARIANTS SUB-FORM */}
                  {formType === 'single' && (
                    <div className="pmf-variants">
                      <div className="pmf-variants-head">
                        <div>
                          <h4 className="pmf-variants-title">{lang === 'CZ' ? 'Varianty karty' : 'Card Variants'}</h4>
                          <span className="pmf-variants-sub">{lang === 'CZ' ? 'Stavy · Jazyky · Ceny' : 'Conditions · Languages · Prices'}</span>
                        </div>
                        <button type="button" className="pmf-variants-add" onClick={handleAddVariantRow}>
                          {lang === 'CZ' ? '+ Přidat variantu' : '+ Add Variant'}
                        </button>
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block', textAlign: 'left' }}>
                        {lang === 'CZ' 
                          ? '💡 Zadejte stav (NM = perfektní, PO = nejhorší), jazyk, foil (lesklá) a ceny se skladem pro každou variantu.' 
                          : '💡 Input conditions (NM = mint, PO = poor), lang, foil (shiny), prices & stock.'}
                      </span>

                      {formVariants.length > 0 && (
                        <div style={{ display: 'flex', gap: '12px', marginTop: '16px', padding: '0 10px' }}>
                          <div style={{ flex: 2 }} className="pmf-vcell-label">{lang === 'CZ' ? 'Stav' : 'Condition'}</div>
                          <div style={{ flex: 2 }} className="pmf-vcell-label">{lang === 'CZ' ? 'Jazyk' : 'Language'}</div>
                          <div style={{ flex: 1.2 }} className="pmf-vcell-label">{lang === 'CZ' ? 'Foil' : 'Foil'}</div>
                          <div style={{ flex: 1.5 }} className="pmf-vcell-label">{lang === 'CZ' ? 'Cena (Kč)' : 'Price (CZK)'}</div>
                          <div style={{ flex: 1.5 }} className="pmf-vcell-label">{lang === 'CZ' ? 'Sklad' : 'Stock'}</div>
                          <div style={{ width: '24px' }}></div>
                        </div>
                      )}

                      <div style={styles.variantsList}>
                        {formVariants.map((v, idx) => (
                          <div key={v.id} className="pmf-vrow">
                            <div className="pmf-select-wrapper">
                              <select 
                                className="pmf-select" 
                                value={v.condition}
                                onChange={e => handleVariantChange(v.id, 'condition', e.target.value)}
                              >
                                <option value="NM">NM (Near Mint)</option>
                                <option value="LP">LP (Light Played)</option>
                                <option value="GD">GD (Good)</option>
                                <option value="EX">EX (Excellent)</option>
                                <option value="PL">PL (Played)</option>
                                <option value="PO">PO (Poor)</option>
                              </select>
                              <svg className="pmf-select-chevron" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M6 9l6 6 6-6" />
                              </svg>
                            </div>

                            <div className="pmf-select-wrapper">
                              <select 
                                className="pmf-select" 
                                value={v.lang}
                                onChange={e => handleVariantChange(v.id, 'lang', e.target.value)}
                              >
                                <option value="EN">EN</option>
                                <option value="CZ">CZ</option>
                                <option value="JP">JP</option>
                                <option value="CN">CN</option>
                              </select>
                              <svg className="pmf-select-chevron" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M6 9l6 6 6-6" />
                              </svg>
                            </div>

                            <label className="pmf-vfoil">
                              <input 
                                type="checkbox" 
                                className="pmf-check-box"
                                checked={!!v.foil} 
                                onChange={e => handleVariantChange(v.id, 'foil', e.target.checked)} 
                              />
                              Foil
                            </label>

                            <input 
                              type="number" 
                              className="pmf-input"
                              placeholder={lang === 'CZ' ? 'Cena' : 'Price'}
                              value={v.price}
                              onChange={e => handleVariantChange(v.id, 'price', Number(e.target.value))}
                            />

                            <input 
                              type="number" 
                              className="pmf-input"
                              placeholder={lang === 'CZ' ? 'Ks' : 'Qty'}
                              value={v.stock}
                              onChange={e => handleVariantChange(v.id, 'stock', Number(v.stock))}
                            />

                            <button 
                              type="button" 
                              className="pmf-vdel"
                              onClick={() => handleRemoveVariantRow(v.id)}
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right columns - Images & Cropper */}
                <div style={styles.modalColRight}>
                  <div className="pmf-field">
                    <label className="pmf-label">{lang === 'CZ' ? 'Hlavní obrázek' : 'Main Image'}</label>
                    <input 
                      type="text" 
                      className="pmf-input"
                      value={formImage}
                      onChange={e => setFormImage(e.target.value)}
                      placeholder="https://..."
                    />
                    <span style={styles.helperText}>
                      {lang === 'CZ' ? '💡 Vložte přímý odkaz na obrázek, nebo nahrávejte/přetáhněte níže.' : '💡 Enter direct image link or drag/upload below.'}
                    </span>

                    {/* Drag and Drop Zone */}
                    <div 
                      className="pmf-drop"
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                      onClick={() => document.getElementById('pmf-file-input').click()}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '8px', color: 'var(--text-muted, #8a8a92)' }}>
                        <rect x="3" y="4" width="18" height="16" rx="2" />
                        <circle cx="8.5" cy="9.5" r="1.5" />
                        <path d="M21 16l-5-5L5 20" />
                      </svg>
                      <p className="dropText" style={{ fontSize: '11px', margin: 0, color: 'var(--text-muted, #8a8a92)' }}>
                        {lang === 'CZ' 
                          ? 'Přetáhněte obrázek sem nebo klikněte k výběru'
                          : 'Drag & Drop image here or click to select'}
                      </p>
                      <input 
                        type="file" 
                        id="pmf-file-input"
                        accept="image/*"
                        style={{ display: 'none' }} 
                        onChange={handleFileChange}
                      />
                    </div>
                    <span style={styles.helperText}>
                      {lang === 'CZ' ? '💡 Po nahrání souboru se zobrazí nástroj pro oříznutí.' : '💡 Uploading a file will open the cropping canvas.'}
                    </span>
                  </div>

                  {/* VISUAL CROPPER OVERLAY */}
                  {isCropping && (
                    <div style={styles.cropperBox}>
                      <canvas 
                        ref={canvasRef}
                        width={300}
                        height={400}
                        style={styles.cropperCanvas}
                        onMouseDown={handleCanvasMouseDown}
                        onMouseMove={handleCanvasMouseMove}
                        onMouseUp={handleCanvasMouseUp}
                        onMouseLeave={handleCanvasMouseUp}
                      />
                      <div style={styles.cropperControls}>
                        <label style={styles.cropperLabel}>
                          {lang === 'CZ' ? 'Přiblížení:' : 'Zoom:'}
                          <input 
                            type="range" 
                            min="0.1" 
                            max="3" 
                            step="0.05"
                            value={cropScale}
                            onChange={e => setCropScale(Number(e.target.value))}
                            style={styles.slider}
                          />
                        </label>
                        <div style={styles.cropperBtns}>
                          <button type="button" className="pmf-btn-ghost" onClick={() => setIsCropping(false)}>
                            {lang === 'CZ' ? 'Zrušit' : 'Cancel'}
                          </button>
                          <button type="button" className="pmf-btn-primary" onClick={handleCropAction}>
                            {lang === 'CZ' ? 'Oříznout fotku' : 'Crop Image'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Preview of current image */}
                  {formImage && !isCropping ? (
                    <div style={styles.previewBox}>
                      <label className="pmf-label">{lang === 'CZ' ? 'Náhled obrázku' : 'Image Preview'}</label>
                      <img 
                        src={formImage} 
                        alt="Product preview" 
                        style={styles.previewImg} 
                        onError={(e) => { e.target.src = '/logo-northvale.png'; }}
                      />
                    </div>
                  ) : (
                    !isCropping && (
                      <div style={styles.previewBox}>
                        <label className="pmf-label">{lang === 'CZ' ? 'Náhled obrázku' : 'Image Preview'}</label>
                        <div style={styles.noImagePlaceholder}>
                          <span>📷</span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {lang === 'CZ' ? 'Není vybrán obrázek' : 'No image selected'}
                          </span>
                        </div>
                      </div>
                    )
                  )}

                  {formType === 'single' && (
                    <div className="pmf-field" style={{ marginTop: '16px' }}>
                      <label className="pmf-label">{lang === 'CZ' ? 'Zadní strana karty (URL)' : 'Back Image (URL)'}</label>
                      <input 
                        type="text" 
                        className="pmf-input"
                        value={formBackImage}
                        onChange={e => setFormBackImage(e.target.value)}
                      />
                      <span style={styles.helperText}>
                        {lang === 'CZ' ? '💡 Rub karty. Pro standardní Pokémon rub netřeba měnit.' : '💡 Card back face URL.'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '20px', marginTop: '10px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted, #8a8a92)' }}>
                  <span style={{ color: 'var(--nv-gold, #fdbd16)', fontWeight: 'bold' }}>*</span> {lang === 'CZ' ? 'Povinné pole' : 'Required field'}
                </span>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button type="button" className="pmf-btn-ghost" onClick={() => setIsModalOpen(false)}>
                    {lang === 'CZ' ? 'Zavřít' : 'Close'}
                  </button>
                  <button type="submit" className="pmf-btn-primary">
                    {lang === 'CZ' ? 'ULOŽIT PRODUKT →' : 'SAVE PRODUCT →'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* CSV Import Modal */}
      {isCsvModalOpen && createPortal(
        <div style={styles.modalOverlay} onClick={() => setIsCsvModalOpen(false)}>
          <div style={styles.csvModalContent} className="glass-panel fade-in" onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>
                {lang === 'CZ' ? 'Hromadný import z CSV' : 'Bulk CSV Import'}
              </h2>
              <button style={styles.closeBtn} onClick={() => setIsCsvModalOpen(false)}>✕</button>
            </div>

            <div style={styles.csvBody}>
              <p style={styles.desc}>
                {lang === 'CZ' 
                  ? 'Vložte data ve formátu CSV (oddělovač čárka nebo středník). Hlavičky by měly obsahovat: id, name, game, type, edition, rarity, price, stock, variants.' 
                  : 'Paste your CSV content (comma or semicolon separated). Allowed headers: id, name, game, type, edition, rarity, price, stock, variants.'}
              </p>

              <textarea 
                style={styles.csvTextarea}
                rows="10"
                placeholder={`id;name;game;type;edition;price;stock\ncharizard-ex;Charizard ex;Pokémon;single;Obsidian Flames;1850;3`}
                value={csvContent}
                onChange={e => setCsvContent(e.target.value)}
              />

              {parsedRows.length > 0 && (
                <div style={styles.parsedPreview}>
                  <h4>{lang === 'CZ' ? `Náhled importu (${parsedRows.length} řádků)` : `Import Preview (${parsedRows.length} rows)`}</h4>
                  <div style={styles.parsedRowsList}>
                    {parsedRows.slice(0, 5).map((row, idx) => (
                      <div key={idx} style={styles.parsedRowItem}>
                        <strong>{row.id || row.code}</strong>: {row.name} ({row.game} - {row.type})
                      </div>
                    ))}
                    {parsedRows.length > 5 && <div style={styles.parsedRowItem}>... a {parsedRows.length - 5} dalších</div>}
                  </div>
                </div>
              )}

              <div style={styles.modalFooter}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsCsvModalOpen(false)}>
                  {lang === 'CZ' ? 'Zavřít' : 'Close'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={handleCsvImport}>
                  {lang === 'CZ' ? 'Analyzovat CSV' : 'Parse CSV'}
                </button>
                {parsedRows.length > 0 && (
                  <button type="button" className="btn btn-success" onClick={handleSaveCsvToDb}>
                    💾 {lang === 'CZ' ? 'Uložit do databáze' : 'Save to Database'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

const styles = {
  container: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '16px',
    flexWrap: 'wrap',
  },
  filtersGroup: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    flex: '1 1 auto',
  },
  searchInput: {
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    padding: '8px 14px',
    color: 'var(--text-main)',
    fontSize: '13px',
    minWidth: '220px',
  },
  filterSelect: {
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    padding: '8px 14px',
    color: 'var(--text-main)',
    fontSize: '13px',
    cursor: 'pointer',
  },
  actions: {
    display: 'flex',
    gap: '12px',
  },
  tableWrapper: {
    overflowX: 'auto',
    width: '100%',
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    padding: '8px 0',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
  },
  tableHeaderRow: {
    borderBottom: '1px solid var(--border)',
  },
  th: {
    padding: '14px 18px',
    fontSize: '12px',
    fontWeight: '800',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
  },
  tableRow: {
    borderBottom: '1px solid rgba(255,255,255,0.03)',
    ':hover': {
      backgroundColor: 'rgba(255,255,255,0.01)',
    }
  },
  td: {
    padding: '14px 18px',
    fontSize: '13px',
    color: 'var(--text-main)',
    verticalAlign: 'middle',
  },
  tdCode: {
    padding: '14px 18px',
    fontSize: '11px',
    color: 'var(--color-gold)',
    fontFamily: 'monospace',
    verticalAlign: 'middle',
  },
  tdName: {
    padding: '14px 18px',
    fontSize: '13px',
    verticalAlign: 'middle',
  },
  nameCell: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '2px',
  },
  subtext: {
    fontSize: '11px',
    color: 'var(--text-muted)',
  },
  tableImg: {
    width: '40px',
    height: '56px',
    objectFit: 'contain',
    borderRadius: 'var(--radius-xs)',
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  typeBadge: {
    fontSize: '10px',
    backgroundColor: 'rgba(255,255,255,0.06)',
    padding: '2px 6px',
    borderRadius: '4px',
    textTransform: 'uppercase',
    color: 'var(--text-muted)',
  },
  tdActions: {
    padding: '14px 18px',
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    verticalAlign: 'middle',
  },
  actionBtn: {
    padding: '4px 10px',
    fontSize: '11px',
  },
  infoText: {
    padding: '40px',
    fontSize: '13px',
    color: 'var(--text-muted)',
  },

  // Modal styling
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
    zIndex: 999999, // extremely high to override navbar/menus
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '20px',
  },
  modalContent: {
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    width: '100%',
    maxWidth: '900px',
    maxHeight: '90vh',
    overflowY: 'auto',
    padding: '30px',
    boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    paddingBottom: '16px',
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: '800',
    margin: 0,
    fontFamily: 'var(--font-heading)',
    color: 'var(--text-main)',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    fontSize: '18px',
    cursor: 'pointer',
    padding: '4px',
    ':hover': {
      color: 'var(--text-main)',
    }
  },
  modalForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  modalGrid: {
    display: 'flex',
    gap: '30px',
    flexWrap: 'wrap',
  },
  modalColLeft: {
    flex: '1.5 1 450px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  modalColRight: {
    flex: '1 1 280px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  row: {
    display: 'flex',
    gap: '16px',
  },
  col: {
    flex: 1,
  },
  label: {
    fontSize: '12px',
    fontWeight: '700',
    color: 'var(--text-main)',
    textAlign: 'left',
  },
  helperText: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    marginTop: '2px',
    textAlign: 'left',
    lineHeight: '1.4',
  },
  noImagePlaceholder: {
    width: '120px',
    height: '168px',
    borderRadius: 'var(--radius-sm)',
    border: '1px dashed var(--border)',
    backgroundColor: 'rgba(0,0,0,0.15)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '8px',
  },
  input: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    padding: '8px 12px',
    color: 'var(--text-main)',
    fontSize: '13px',
    width: '100%',
    boxSizing: 'border-box',
  },
  select: {
    backgroundColor: 'var(--bg-page)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    padding: '8px 12px',
    color: 'var(--text-main)',
    fontSize: '13px',
    width: '100%',
    boxSizing: 'border-box',
    cursor: 'pointer',
  },
  textarea: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    padding: '8px 12px',
    color: 'var(--text-main)',
    fontSize: '13px',
    width: '100%',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    resize: 'vertical',
  },
  checkboxRow: {
    display: 'flex',
    gap: '20px',
    alignItems: 'center',
    padding: '4px 0',
  },
  checkboxLabel: {
    fontSize: '12px',
    color: 'var(--text-main)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
  },

  // Type Specific Config container
  typeSpecificBox: {
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 'var(--radius-md)',
    padding: '16px',
    backgroundColor: 'rgba(255,255,255,0.01)',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  boxTitle: {
    fontSize: '13px',
    fontWeight: '800',
    margin: '0 0 4px 0',
    color: 'var(--color-gold)',
    textAlign: 'left',
  },

  // Variants box styling
  variantsBox: {
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 'var(--radius-md)',
    padding: '16px',
    backgroundColor: 'rgba(255,255,255,0.01)',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  variantsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addVarBtn: {
    padding: '4px 8px',
    fontSize: '11px',
  },
  variantsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    maxHeight: '200px',
    overflowY: 'auto',
    paddingRight: '6px',
  },
  variantRow: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.15)',
    padding: '6px 10px',
    borderRadius: 'var(--radius-sm)',
  },
  varSelect: {
    backgroundColor: 'var(--bg-page)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-xs)',
    padding: '4px 6px',
    color: 'var(--text-main)',
    fontSize: '11px',
    flex: 1.5,
  },
  varCheckboxLabel: {
    fontSize: '11px',
    color: 'var(--text-main)',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    cursor: 'pointer',
    flex: 1,
  },
  varPriceInput: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-xs)',
    padding: '4px 8px',
    color: 'var(--text-main)',
    fontSize: '11px',
    width: '60px',
    boxSizing: 'border-box',
  },
  varStockInput: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-xs)',
    padding: '4px 8px',
    color: 'var(--text-main)',
    fontSize: '11px',
    width: '45px',
    boxSizing: 'border-box',
  },
  deleteVarBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--color-red)',
    fontSize: '13px',
    cursor: 'pointer',
    padding: '4px',
  },

  // Image Drag-Drop Cropper Styles
  dropZone: {
    border: '2px dashed var(--border)',
    borderRadius: 'var(--radius-md)',
    padding: '20px',
    textAlign: 'center',
    cursor: 'pointer',
    position: 'relative',
    backgroundColor: 'rgba(255,255,255,0.01)',
    transition: 'background-color 0.2s',
    ':hover': {
      backgroundColor: 'rgba(255,255,255,0.03)',
    }
  },
  dropText: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    margin: 0,
  },
  fileInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    opacity: 0,
    cursor: 'pointer',
  },
  cropperBox: {
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    padding: '16px',
    backgroundColor: 'rgba(0,0,0,0.3)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
  },
  cropperCanvas: {
    backgroundColor: '#111',
    cursor: 'grab',
    border: '1px solid rgba(255,255,255,0.1)',
  },
  cropperControls: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  cropperLabel: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  slider: {
    flex: 1,
    cursor: 'pointer',
  },
  cropperBtns: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
  },
  previewBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    alignItems: 'center',
  },
  previewImg: {
    maxWidth: '120px',
    maxHeight: '168px',
    objectFit: 'contain',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border)',
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    paddingTop: '16px',
    marginTop: '10px',
  },

  // CSV Modal specific
  csvModalContent: {
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    width: '100%',
    maxWidth: '650px',
    padding: '30px',
    boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
  },
  csvBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    marginTop: '16px',
  },
  csvTextarea: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    padding: '12px',
    color: 'var(--text-main)',
    fontSize: '12px',
    width: '100%',
    boxSizing: 'border-box',
    fontFamily: 'monospace',
  },
  parsedPreview: {
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 'var(--radius-md)',
    padding: '12px',
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  parsedRowsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    maxHeight: '120px',
    overflowY: 'auto',
  },
  parsedRowItem: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    textAlign: 'left',
  }
};
