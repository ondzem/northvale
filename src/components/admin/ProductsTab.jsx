import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from '../../context/LanguageContext';
import { fetchProductsFromDB, saveProductToDB, deleteProductFromDB, fetchProductByIdFromDB } from '../../services/products';
import { fetchCategoriesFromDB } from '../../services/categories';
import ProductCard from '../ProductCard';
import { FEATURE_FLAGS } from '../../config';

// Rich text formatter function for custom headers, lists, check lists, bold text, and raw HTML
const parseFormattedText = (text, isMini = false) => {
  if (!text) return null;

  // If it looks like HTML, render it directly
  if (/<[a-z][\s\S]*>/i.test(text)) {
    return (
      <div
        className={isMini ? "mock-page-container-html" : "tab-popis-text-html"}
        dangerouslySetInnerHTML={{ __html: text }}
      />
    );
  }

  const lines = text.split('\n');
  const elements = [];
  let currentList = [];

  const parseInlineFormatting = (str) => {
    if (!str) return '';
    const parts = str.split(/\*\*([^*]+)\*\*/g);
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        return <strong key={index} style={{ color: '#fff', fontWeight: 'bold' }}>{part}</strong>;
      }
      return part;
    });
  };

  const flushList = (key) => {
    if (currentList.length > 0) {
      elements.push(
        <ul key={`ul-${key}`} style={{ margin: isMini ? '0 0 8px 0' : '0 0 16px 0', paddingLeft: isMini ? '16px' : '24px', listStyleType: 'none', display: 'flex', flexDirection: 'column', gap: isMini ? '4px' : '8px' }}>
          {currentList.map((item, idx) => {
            const bulletColor = item.type === 'star' ? 'var(--color-gold, #fdbd16)' : item.type === 'check' ? '#4caf50' : 'rgba(255,255,255,0.4)';
            const bulletChar = item.type === 'check' ? '✓' : item.type === 'star' ? '✦' : '•';
            return (
              <li key={`li-${key}-${idx}`} style={{ display: 'flex', gap: '6px', alignItems: 'flex-start', fontSize: isMini ? '11px' : '14.5px', lineHeight: '1.6', color: 'rgba(255,255,255,0.85)' }}>
                <span style={{ color: bulletColor, fontWeight: 'bold', fontSize: isMini ? '10px' : '14px', flexShrink: 0, marginTop: isMini ? '1px' : '2px' }}>{bulletChar}</span>
                <span style={{ flex: 1 }}>{parseInlineFormatting(item.text)}</span>
              </li>
            );
          })}
        </ul>
      );
      currentList = [];
    }
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    // Check if it's a heading
    if (trimmed.startsWith('### ')) {
      flushList(index);
      const headingText = trimmed.substring(4);
      elements.push(
        <h3 key={index} style={{ fontSize: isMini ? '12px' : '18px', fontWeight: '800', color: '#fff', margin: isMini ? '12px 0 6px 0' : '24px 0 12px 0', fontFamily: 'var(--font-heading)' }}>
          {parseInlineFormatting(headingText)}
        </h3>
      );
    } else if (trimmed.startsWith('## ')) {
      flushList(index);
      const headingText = trimmed.substring(3);
      elements.push(
        <h2 key={index} style={{ fontSize: isMini ? '13px' : '20px', fontWeight: '800', color: '#fff', margin: isMini ? '14px 0 8px 0' : '28px 0 16px 0', fontFamily: 'var(--font-heading)' }}>
          {parseInlineFormatting(headingText)}
        </h2>
      );
    } else if (trimmed.startsWith('# ')) {
      flushList(index);
      const headingText = trimmed.substring(2);
      elements.push(
        <h1 key={index} style={{ fontSize: isMini ? '14px' : '24px', fontWeight: '800', color: '#fff', margin: isMini ? '16px 0 10px 0' : '32px 0 20px 0', fontFamily: 'var(--font-heading)' }}>
          {parseInlineFormatting(headingText)}
        </h1>
      );
    }
    // Check if it's a list item
    else if (trimmed.startsWith('• ') || trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const itemText = trimmed.replace(/^(•|-|\*)\s*/, '');
      currentList.push({ type: 'bullet', text: itemText });
    } else if (trimmed.startsWith('✦ ')) {
      const itemText = trimmed.replace(/^✦\s*/, '');
      currentList.push({ type: 'star', text: itemText });
    } else if (trimmed.startsWith('✓ ')) {
      const itemText = trimmed.replace(/^✓\s*/, '');
      currentList.push({ type: 'check', text: itemText });
    }
    // Regular line
    else {
      if (trimmed === '') {
        flushList(index);
        elements.push(<div key={index} style={{ height: isMini ? '6px' : '12px' }} />);
      } else {
        flushList(index);
        elements.push(
          <p key={index} style={{ margin: isMini ? '0 0 6px 0' : '0 0 16px 0', whiteSpace: 'pre-wrap', lineHeight: '1.6', color: 'rgba(255,255,255,0.85)', fontSize: isMini ? '11px' : '14.5px' }}>
            {parseInlineFormatting(line)}
          </p>
        );
      }
    }
  });

  flushList(lines.length);
  return elements;
};

// WordPress-style true visual text editor
const RichTextEditor = ({ value, onChange, placeholder, className, style }) => {
  const { lang } = useTranslation();
  const editorRef = useRef(null);
  const lastValueRef = useRef(value);
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    if (editorRef.current) {
      if (!hasInitializedRef.current || value !== lastValueRef.current) {
        editorRef.current.innerHTML = value || '';
        lastValueRef.current = value;
        hasInitializedRef.current = true;
      }
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      lastValueRef.current = html;
      onChange(html);
    }
  };

  const executeCommand = (command, arg = null) => {
    document.execCommand(command, false, arg);
    handleInput();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      {/* Editor Toolbar */}
      <div className="pmf-editor-toolbar" style={{
        display: 'flex',
        gap: '4px',
        alignItems: 'center',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(240, 240, 240, 0.12)',
        borderBottom: 'none',
        borderRadius: '10px 10px 0 0',
        padding: '6px 10px',
        boxSizing: 'border-box'
      }}>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => executeCommand('bold')}
          title={lang === 'CZ' ? 'Tučné' : 'Bold'}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#fff',
            fontWeight: 'bold',
            fontSize: '12px',
            cursor: 'pointer',
            width: '28px',
            height: '24px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(255,255,255,0.02)'
          }}
        >
          B
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => executeCommand('formatBlock', '<h3>')}
          title={lang === 'CZ' ? 'Nadpis H3' : 'Heading H3'}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#fff',
            fontWeight: 'bold',
            fontSize: '11px',
            cursor: 'pointer',
            width: '32px',
            height: '24px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(255,255,255,0.02)'
          }}
        >
          H3
        </button>
        <div style={{ width: '1px', height: '14px', background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => executeCommand('insertUnorderedList')}
          title={lang === 'CZ' ? 'Odrážkový seznam' : 'Bullet List'}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#fff',
            fontSize: '14px',
            cursor: 'pointer',
            width: '28px',
            height: '24px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(255,255,255,0.02)'
          }}
        >
          •
        </button>
      </div>

      {/* Contenteditable Area */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onPaste={handlePaste}
        className={`${className || ''} tab-popis-text-html`}
        style={{
          minHeight: '100px',
          outline: 'none',
          ...style
        }}
        placeholder={placeholder}
      />
    </div>
  );
};

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

export default function ProductsTab({ showToast, initialEditProductId, onClearInitialEditProduct }) {
  const { lang } = useTranslation();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editedProducts, setEditedProducts] = useState({});
  const [outOfStockBehavior, setOutOfStockBehavior] = useState(localStorage.getItem('outOfStockBehavior') || 'watchdog');
  const [pokemonSets, setPokemonSets] = useState([]);

  // Filters for table list
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterGame, setFilterGame] = useState('all');
  const [sortBy, setSortBy] = useState('newest'); // 'newest', 'oldest', 'name_asc', 'name_desc'

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isApiLoading, setIsApiLoading] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // CSV Import State
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvContent, setCsvContent] = useState('');
  const [parsedRows, setParsedRows] = useState([]);

  // Form fields state
  const [formId, setFormId] = useState('');
  const [formName, setFormName] = useState('');
  const [formCardCode, setFormCardCode] = useState('');
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
  const [formReleaseDate, setFormReleaseDate] = useState('');
  const [formInvestment, setFormInvestment] = useState(false);
  const [formNoVat, setFormNoVat] = useState(false);
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

  // Split-form and preview states
  const [formShortDesc, setFormShortDesc] = useState('');
  const [formAdditionalImages, setFormAdditionalImages] = useState([]);
  const [formDescBlocks, setFormDescBlocks] = useState([{ id: 'b-0', type: 'text', value: '' }]);
  const [cropTarget, setCropTarget] = useState({ type: 'front' });
  const [formSetCode, setFormSetCode] = useState('');
  const [formIllustrator, setFormIllustrator] = useState('');
  const [formStage, setFormStage] = useState('');
  const [formElement, setFormElement] = useState('');
  const [formCustomParams, setFormCustomParams] = useState([]);
  const [isFullPreviewOpen, setIsFullPreviewOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, productId: '' });
  const [previewActiveTab, setPreviewActiveTab] = useState('popis');
  const [previewCondition, setPreviewCondition] = useState('NM');
  const [previewLang, setPreviewLang] = useState('EN');
  const [previewFoil, setPreviewFoil] = useState(false);
  const [previewActiveImage, setPreviewActiveImage] = useState('');

  // Custom Category Dropdown State
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const categoryDropdownRef = useRef(null);

  // AbortController for cancelable TCG fetch
  const abortControllerRef = useRef(null);

  // Image Crop State (Using Refs for 60fps performance to bypass React renders during drag/zoom)
  const [cropImageSrc, setCropImageSrc] = useState(null);
  const [isCropping, setIsCropping] = useState(false);
  const [cropImageFormat, setCropImageFormat] = useState('image/jpeg');
  const [cropOrientation, setCropOrientation] = useState('portrait');
  const cropRefX = useRef(0);
  const cropRefY = useRef(0);
  const cropRefScale = useRef(1);
  const minScaleRef = useRef(0.1);
  const sliderRef = useRef(null);
  const zoomValRef = useRef(null);
  const canvasRef = useRef(null);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const loadedImage = useRef(null);

  useEffect(() => {
    loadData();
    // Fetch Pokemon sets once on mount for set code mapping (e.g. PAL -> sv2)
    const fetchSets = async () => {
      try {
        const res = await fetch("https://api.pokemontcg.io/v2/sets");
        const data = await res.json();
        if (data && data.data) {
          setPokemonSets(data.data);
        }
      } catch (err) {
        console.error("Failed to fetch Pokemon TCG sets:", err);
      }
    };
    fetchSets();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(e.target)) {
        setIsCategoryDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (initialEditProductId && products.length > 0) {
      const prod = products.find(p => p.id === initialEditProductId);
      if (prod) {
        handleOpenEditModal(prod);
        if (onClearInitialEditProduct) {
          onClearInitialEditProduct();
        }
      }
    }
  }, [initialEditProductId, products]);

  useEffect(() => {
    setPreviewActiveImage(formImage || '/Northvale Logo.webp');
  }, [formImage]);

  useEffect(() => {
    if (formVariants && formVariants.length > 0) {
      setPreviewCondition(formVariants[0].condition || 'NM');
      setPreviewLang(formVariants[0].lang || 'EN');
      setPreviewFoil(!!formVariants[0].foil);
    }
  }, [formVariants]);

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

  // Effect to automatically generate SKU for new products in real-time
  useEffect(() => {
    if (!editingProduct && isModalOpen) {
      if (formType === 'single') {
        const cleanSet = (formSetCode || '').trim().toUpperCase();
        const cleanNum = (formCardCode || '').trim().split('/')[0].trim();
        if (cleanSet && cleanNum) {
          let prefix = 'SGL';
          if (formGame === 'Pokémon') prefix = 'POK';
          else if (formGame === 'Lorcana') prefix = 'LOR';
          else if (formGame === 'One Piece') prefix = 'OP';
          else if (formGame === 'Riftbound') prefix = 'RIF';
          setFormId(`${prefix}-${cleanSet}-${cleanNum}`);
          return;
        }
      }

      const cleanName = (formName || '').trim();
      const cleanCardCode = (formCardCode || '').trim();
      const combined = cleanCardCode ? `${cleanName} (${cleanCardCode})` : cleanName;
      if (combined) {
        const generated = combined
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');
        setFormId(generated);
      } else {
        setFormId('');
      }
    }
  }, [editingProduct, isModalOpen, formType, formGame, formName, formSetCode, formCardCode]);

  const loadData = async () => {
    setLoading(true);
    const [pData, cData] = await Promise.all([
      fetchProductsFromDB({ includeAll: true }),
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
    setFormCardCode('');
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
    setFormReleaseDate('');
    setFormInvestment(false);
    setFormNoVat(false);
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

    // Reset split-form states
    setFormShortDesc('');
    setFormAdditionalImages([]);
    setFormDescBlocks([{ id: 'b-' + Math.random().toString(36).substr(2, 5), type: 'text', value: '' }]);
    setCropTarget({ type: 'front' });
    setFormSetCode('');
    setFormStage('');
    setFormElement('');
    setFormIllustrator('');
    setFormCustomParams([]);

    setIsModalOpen(true);
  };

  const handleOpenEditModal = async (prod) => {
    let p = prod;
    if (!prod.desc && prod.id) {
      try {
        const fetched = await fetchProductByIdFromDB(prod.id);
        if (fetched) {
          p = fetched;
        }
      } catch (e) {
        console.error("Failed to fetch full product details for edit modal", e);
      }
    }
    setEditingProduct(p);
    setFormId(p.id || '');

    let cleanName = p.name || '';
    let parsedCode = '';
    const nameMatch = cleanName.match(/\(([^)]+)\)$/);
    if (nameMatch) {
      parsedCode = nameMatch[1];
      cleanName = cleanName.substring(0, cleanName.lastIndexOf(`(${parsedCode})`)).trim();
    }
    setFormName(cleanName);
    setFormCardCode(parsedCode);
    setFormType(p.type || 'single');
    setFormGame(p.game || 'Pokémon');
    setFormEdition(p.edition || '');
    setFormRarity(p.rarity || '');
    setFormImage(p.image || '');
    const defaultBack = (p.game || 'Pokémon') === 'Pokémon' ? 'https://images.pokemontcg.io/unbroken_bonds/back.png' : '';
    setFormBackImage(p.backImage || p.back_image || defaultBack);
    setFormDesc(p.desc || p.description || '');
    setFormPrice(p.price !== null && p.price !== undefined ? p.price.toString() : '');
    setFormStock(p.stock !== null && p.stock !== undefined ? p.stock.toString() : '');
    setFormLang(p.lang || 'EN');
    setFormPreorder(!!p.preorder);
    setFormReleaseDate(p.releaseDate || p.foil_condition || '');
    setFormInvestment(!!p.investment);
    setFormNoVat(!!p.no_vat);
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
    const loadedVariants = p.variants && p.variants.length > 0
      ? p.variants
      : [{ id: 'v-' + Math.random().toString(36).substr(2, 5), condition: 'NM', lang: 'EN', foil: false, price: p.price || 0, stock: p.stock || 0 }];
    setFormVariants(loadedVariants);

    // Decodes JSON blocks from p.desc
    let parsedBlocks = [];
    try {
      const descVal = p.desc || p.description || '';
      if (descVal && descVal.startsWith('[')) {
        parsedBlocks = JSON.parse(descVal);
      }
    } catch (e) {
      console.error("Failed to parse description blocks in editor", e);
    }
    if (!Array.isArray(parsedBlocks) || parsedBlocks.length === 0) {
      parsedBlocks = [{ id: 'b-' + Math.random().toString(36).substr(2, 5), type: 'text', value: p.desc || p.description || '' }];
    }
    setFormDescBlocks(parsedBlocks);

    // Compute fallback description if needed
    const firstTextBlock = parsedBlocks.find(b => b.type === 'text')?.value || '';
    const fallbackShortDesc = firstTextBlock ? (firstTextBlock.split('.').slice(0, 2).filter(Boolean).join('. ') + '.') : '';

    const isHtmlEmpty = (html) => {
      if (!html) return true;
      const clean = html.replace(/<[^>]+>/g, '').trim();
      return clean === '' || clean === '&nbsp;';
    };

    const savedShortDesc = p.shortDesc || p.short_description || '';

    // Load new split-form and preview states
    setFormShortDesc(!isHtmlEmpty(savedShortDesc) ? savedShortDesc : fallbackShortDesc);
    setFormAdditionalImages(p.additionalImages || []);

    setCropTarget({ type: 'front' });
    setFormSetCode(p.setCode || '');
    setFormStage(p.stage || '');
    setFormElement(p.element || '');
    setFormIllustrator(p.illustrator || '');
    setFormCustomParams(p.customParams || p.custom_params || []);

    setIsModalOpen(true);
  };

  const getHierarchicalCategoryOptions = () => {
    const list = [];
    const gameCats = categories.filter(c => c.game === formGame);

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

  const getCategoryPath = (catId) => {
    if (!catId) return '';
    const path = [];
    let current = categories.find(c => String(c.id) === String(catId));
    const visited = new Set();
    while (current && !visited.has(current.id)) {
      visited.add(current.id);
      if (current.parent_id !== null) {
        path.unshift(lang === 'CZ' ? current.name_cz : current.name_en);
      }
      current = categories.find(c => String(c.id) === String(current.parent_id));
    }
    return path.join(' ➔ ');
  };

  const getCategoryOptionsForGame = (game) => {
    const list = [];
    const gameCats = categories.filter(c => c.game === game);
    const nonRootGameCats = gameCats.filter(c => c.parent_id !== null);
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

  const handleExcelRowChange = (productId, field, value) => {
    setEditedProducts(prev => {
      const currentEdit = prev[productId] || { ...products.find(p => p.id === productId) };
      return {
        ...prev,
        [productId]: {
          ...currentEdit,
          [field]: value
        }
      };
    });
  };

  const handleSaveExcelRow = async (productId) => {
    const editData = editedProducts[productId];
    if (!editData) return;

    const productPayload = {
      ...editData,
      price: editData.type === 'single' ? null : (editData.price ? Number(editData.price) : 0),
      stock: editData.type === 'single' ? null : (editData.stock ? Number(editData.stock) : 0),
    };

    const { error, isMockFallback } = await saveProductToDB(productPayload);
    if (error) {
      showToast(lang === 'CZ' ? `Chyba při ukládání: ${error.message || error}` : `Error saving: ${error.message || error}`, 'error');
    } else {
      if (isMockFallback) {
        showToast(lang === 'CZ' ? `Uloženo lokálně (Chyba DB)` : `Saved locally (DB Error)`, 'warning');
      } else {
        showToast(lang === 'CZ' ? 'Změny v řádku uloženy!' : 'Row changes saved!', 'success');
      }
      setEditedProducts(prev => {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      });
      loadData();
    }
  };

  const handleSaveAllExcel = async () => {
    const ids = Object.keys(editedProducts);
    if (ids.length === 0) return;

    let successCount = 0;
    let failCount = 0;

    for (const id of ids) {
      const editData = editedProducts[id];
      const productPayload = {
        ...editData,
        price: editData.type === 'single' ? null : (editData.price ? Number(editData.price) : 0),
        stock: editData.type === 'single' ? null : (editData.stock ? Number(editData.stock) : 0),
      };

      const { error } = await saveProductToDB(productPayload);
      if (error) {
        failCount++;
      } else {
        successCount++;
      }
    }

    if (failCount === 0) {
      showToast(lang === 'CZ' ? `Uloženo všech ${successCount} produktů.` : `All ${successCount} products saved.`, 'success');
      setEditedProducts({});
    } else {
      showToast(lang === 'CZ' ? `Uloženo: ${successCount}, Chyba: ${failCount}` : `Saved: ${successCount}, Failed: ${failCount}`, 'warning');
    }
    loadData();
  };

  const handleCancelTcgFetch = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsApiLoading(false);
    showToast(lang === 'CZ' ? 'Vyhledávání zrušeno.' : 'Search cancelled.', 'info');
  };

  const handleFetchTcgCard = async () => {
    const setInput = document.getElementById('api-set-code');
    const numberInput = document.getElementById('api-card-number');
    const setVal = setInput ? setInput.value.trim().toLowerCase() : '';
    const numberVal = numberInput ? numberInput.value.trim() : '';

    if (!setVal || !numberVal) {
      showToast(lang === 'CZ' ? 'Zadejte kód sady a číslo karty.' : 'Please enter set code and card number.', 'warning');
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsApiLoading(true);

    // Normalize number: strip slashes (e.g. 062/193 -> 062) and leading zeroes (062 -> 62)
    let normalizedNumberVal = numberVal.split('/')[0].trim();
    if (/^\d+$/.test(normalizedNumberVal)) {
      normalizedNumberVal = parseInt(normalizedNumberVal, 10).toString();
    }

    // Map input set code to correct set.id (e.g., PAL -> sv2)
    let resolvedSetId = setVal;
    if (formGame === 'Pokémon' || formGame.toLowerCase().includes('pok')) {
      const matchedSet = pokemonSets.find(s =>
        s.id.toLowerCase() === setVal ||
        s.ptcgoCode?.toLowerCase() === setVal ||
        s.name.toLowerCase() === setVal
      );
      if (matchedSet) {
        resolvedSetId = matchedSet.id.toLowerCase();
      }
    }

    try {
      if (formGame === 'Pokémon' || formGame.toLowerCase().includes('pok')) {
        let url = `https://api.pokemontcg.io/v2/cards?q=set.id:${resolvedSetId} number:${normalizedNumberVal}`;
        let res = await fetch(url, { signal: controller.signal });
        let data = await res.json();

        if (!data.data || data.data.length === 0) {
          url = `https://api.pokemontcg.io/v2/cards?q=set.ptcgoCode:${setVal.toUpperCase()} number:${normalizedNumberVal}`;
          res = await fetch(url, { signal: controller.signal });
          data = await res.json();
        }

        if (!data.data || data.data.length === 0) {
          url = `https://api.pokemontcg.io/v2/cards?q=number:${normalizedNumberVal}`;
          res = await fetch(url, { signal: controller.signal });
          data = await res.json();
        }

        let card = null;
        if (data.data && data.data.length > 0) {
          card = data.data.find(c =>
            c.set.id.toLowerCase() === resolvedSetId ||
            c.set.id.toLowerCase() === setVal ||
            c.set.ptcgoCode?.toLowerCase() === setVal ||
            c.set.name.toLowerCase().includes(setVal)
          ) || data.data[0];
        }

        if (!card) {
          showToast(lang === 'CZ' ? 'Karta nebyla nalezena.' : 'Card not found.', 'error');
          return;
        }

        setFormName(card.name);
        setFormCardCode(card.number + '/' + (card.set.printedTotal || card.set.total || ''));
        setFormEdition(card.set.name);
        setFormSetCode(card.set.ptcgoCode || card.set.id.toUpperCase());
        setFormRarity(card.rarity || 'Common');
        setFormImage(card.images.large || card.images.small);
        setFormBackImage('https://images.pokemontcg.io/unbroken_bonds/back.png');
        setFormIllustrator(card.artist || '');
        setFormStage(card.subtypes?.[0] || '');
        setFormElement(card.types?.[0] || '');

        const generatedSku = `POK-${(card.set.ptcgoCode || card.set.id).toUpperCase()}-${card.number}`;
        setFormId(generatedSku);

        // Compile Short Description
        const printedTotal = card.set.printedTotal || card.set.total || '';
        const shortDescText = lang === 'CZ'
          ? `Sběratelská karta Pokémon TCG\n• Edice: ${card.set.name}\n• Číslo karty: ${card.number}/${printedTotal}\n• Rarita: ${card.rarity || 'Common'}\n• Typ: ${card.supertype} - ${card.subtypes?.join(', ') || ''}\n• Ilustrátor: ${card.artist || 'Neznámý'}`
          : `Collectible Pokémon TCG card\n• Expansion: ${card.set.name}\n• Card number: ${card.number}/${printedTotal}\n• Rarity: ${card.rarity || 'Common'}\n• Type: ${card.supertype} - ${card.subtypes?.join(', ') || ''}\n• Artist: ${card.artist || 'Unknown'}`;
        setFormShortDesc(shortDescText);

        // Compile Detailed Description
        let detailText = '';
        if (lang === 'CZ') {
          detailText += `Originální sběratelská karta **${card.name}** ze sady **${card.set.name}**.\n\n`;
          if (card.supertype === 'Pokémon') {
            detailText += `Tato karta představuje Pokémona typu ${card.types?.join(', ') || ''} ve fázi ${card.subtypes?.join(', ') || ''}.\n`;
          }
          if (card.rules && card.rules.length > 0) {
            detailText += `\n**Pravidla a efekty karty:**\n${card.rules.map(r => `• ${r}`).join('\n')}\n`;
          }
          if (card.abilities && card.abilities.length > 0) {
            detailText += `\n**Schopnosti (Abilities):**\n${card.abilities.map(a => `• **${a.name}**: ${a.text}`).join('\n')}\n`;
          }
          if (card.attacks && card.attacks.length > 0) {
            detailText += `\n**Útoky (Attacks):**\n${card.attacks.map(a => `• **${a.name}** (${a.damage ? `Zranění: ${a.damage}` : 'Bez zranění'}): ${a.text || ''}`).join('\n')}\n`;
          }
          if (card.flavorText) {
            detailText += `\n*„${card.flavorText}“*\n`;
          }
        } else {
          detailText += `Original collectible card **${card.name}** from the expansion **${card.set.name}**.\n\n`;
          if (card.supertype === 'Pokémon') {
            detailText += `This card represents a ${card.types?.join(', ') || ''} type Pokémon in its ${card.subtypes?.join(', ') || ''} stage.\n`;
          }
          if (card.rules && card.rules.length > 0) {
            detailText += `\n**Card Rules & Effects:**\n${card.rules.map(r => `• ${r}`).join('\n')}\n`;
          }
          if (card.abilities && card.abilities.length > 0) {
            detailText += `\n**Abilities:**\n${card.abilities.map(a => `• **${a.name}**: ${a.text}`).join('\n')}\n`;
          }
          if (card.attacks && card.attacks.length > 0) {
            detailText += `\n**Attacks:**\n${card.attacks.map(a => `• **${a.name}** (${a.damage ? `Damage: ${a.damage}` : 'No damage'}): ${a.text || ''}`).join('\n')}\n`;
          }
          if (card.flavorText) {
            detailText += `\n*“${card.flavorText}”*\n`;
          }
        }

        setFormDesc(detailText);
        setFormDescBlocks([
          { id: 'b-' + Math.random().toString(36).substr(2, 5), type: 'text', value: detailText }
        ]);

        setFormVariants([
          { id: 'v-' + Math.random().toString(36).substr(2, 5), condition: 'NM', lang: 'EN', foil: false, price: 100, stock: 1 }
        ]);

        showToast(lang === 'CZ' ? `Karta ${card.name} úspěšně načtena!` : `Card ${card.name} loaded successfully!`, 'success');
      } else {
        showToast(lang === 'CZ'
          ? 'Pro tuto hru/příslušenství není automatické doplňování k dispozici – vyplňte prosím údaje ručně.'
          : 'Auto-fill is not available for this game/accessory – please enter the details manually.', 'warning');
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('TCG Fetch aborted');
        return;
      }
      console.error(err);
      showToast(lang === 'CZ' ? 'Chyba při dotazování externího API.' : 'Error querying external API.', 'error');
    } finally {
      setIsApiLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleDeleteProduct = (id) => {
    setDeleteConfirm({
      isOpen: true,
      productId: id
    });
  };

  const handleConfirmDeleteProduct = async () => {
    const id = deleteConfirm.productId;
    if (!id) return;

    const { error, isMockFallback, dbError } = await deleteProductFromDB(id);
    if (error) {
      showToast(lang === 'CZ' ? `Chyba při mazání produktu: ${error.message || error}` : `Error deleting product: ${error.message || error}`, 'error');
    } else {
      if (isMockFallback) {
        console.warn("Product deleted from mock data fallback due to DB error:", dbError);
        showToast(lang === 'CZ' ? `Smazáno lokálně (Chyba DB: ${dbError})` : `Deleted locally (DB Error: ${dbError})`, 'warning');
      } else {
        showToast(lang === 'CZ' ? 'Produkt byl smazán z databáze.' : 'Product was deleted from database.', 'success');
      }
      loadData();
    }
    setDeleteConfirm({ isOpen: false, productId: '' });
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    const cleanName = formName.trim();
    const cleanCardCode = formCardCode.trim();
    const combinedName = cleanCardCode ? `${cleanName} (${cleanCardCode})` : cleanName;

    let finalId = formId.trim();
    if (!finalId) {
      finalId = combinedName
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // remove diacritics
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    }

    if (!finalId) {
      showToast(lang === 'CZ' ? 'Název produktu je povinný.' : 'Product name is required.', 'error');
      return;
    }

    // Automatické zachycení rozepsaného vlastního parametru, pokud ho uživatel zapomněl přidat tlačítkem
    let finalCustomParams = [...formCustomParams];
    const labelInput = document.getElementById('new-param-label');
    const valueInput = document.getElementById('new-param-value');
    if (labelInput && valueInput && labelInput.value.trim() && valueInput.value.trim()) {
      finalCustomParams.push({
        label: labelInput.value.trim(),
        value: valueInput.value.trim()
      });
      // Vyčistíme políčka v DOM
      labelInput.value = '';
      valueInput.value = '';
    }

    const productPayload = {
      id: finalId,
      name: combinedName,
      type: formType,
      game: formGame,
      edition: formEdition,
      rarity: formRarity,
      image: formImage,
      backImage: formBackImage,
      desc: JSON.stringify(formDescBlocks), // Save serialized description blocks
      preorder: formPreorder,
      releaseDate: formPreorder ? formReleaseDate : null,
      investment: formInvestment,
      no_vat: formNoVat,
      category_id: formCategoryId || null,
      shortDesc: formShortDesc || null,
      additionalImages: formAdditionalImages || [],
      setCode: formSetCode || null,
      stage: formStage || null,
      element: formElement || null,
      illustrator: formIllustrator || null,
      year: formYear ? Number(formYear) : null,
      customParams: finalCustomParams,
      lang: formLang || 'EN'
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

    const { data, error, isMockFallback, dbError } = await saveProductToDB(productPayload);
    if (error) {
      showToast(lang === 'CZ' ? `Chyba při ukládání produktu: ${error.message || error}` : `Error saving product: ${error.message || error}`, 'error');
    } else {
      if (isMockFallback) {
        console.warn("Product saved to mock data fallback due to DB error:", dbError);
        showToast(lang === 'CZ' ? `Uloženo lokálně (Chyba DB: ${dbError})` : `Saved locally (DB Error: ${dbError})`, 'warning');
      } else {
        showToast(lang === 'CZ' ? 'Produkt úspěšně uložen do databáze!' : 'Product saved successfully to database!', 'success');
      }
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

  // Description Blocks Helper Handlers
  const handleAddDescBlock = (type) => {
    const newBlock = {
      id: 'b-' + Math.random().toString(36).substr(2, 5),
      type: type,
      value: ''
    };
    setFormDescBlocks([...formDescBlocks, newBlock]);
  };

  const handleRemoveDescBlock = (id) => {
    setFormDescBlocks(formDescBlocks.filter(b => b.id !== id));
  };

  const handleMoveDescBlock = (index, direction) => {
    const newBlocks = [...formDescBlocks];
    const targetIndex = index + direction;
    if (targetIndex >= 0 && targetIndex < newBlocks.length) {
      const temp = newBlocks[index];
      newBlocks[index] = newBlocks[targetIndex];
      newBlocks[targetIndex] = temp;
      setFormDescBlocks(newBlocks);
    }
  };

  const handleDescBlockChange = (id, value) => {
    setFormDescBlocks(formDescBlocks.map(b => b.id === id ? { ...b, value } : b));
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

  const loadImageFile = (file, directTarget = null) => {
    const target = directTarget || cropTarget;
    const reader = new FileReader();
    reader.onload = (event) => {
      setCropImageSrc(event.target.result);
      setCropImageFormat(file.type || 'image/jpeg');
      setIsCropping(true);

      // Default crop orientation based on target type
      if (target && (target.type === 'block' || target.type === 'additional')) {
        setCropOrientation('landscape');
      } else {
        setCropOrientation('portrait');
      }

      // Initialize refs
      cropRefX.current = 0;
      cropRefY.current = 0;
      cropRefScale.current = 1;
      minScaleRef.current = 0.1;
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

        // Allow zooming out down to 1% (0.01) so they can fit wide/tall images fully
        const sliderMinScale = 0.01;
        minScaleRef.current = sliderMinScale;

        cropRefScale.current = computedMinScale;
        cropRefX.current = 0;
        cropRefY.current = 0;

        // Update range slider range and initial value
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

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Target frame dimensions (aspect ratio ~2.5:3.5 for cards, adjustable)
    const frameW = cropOrientation === 'landscape' ? 280 : 200;
    const frameH = cropOrientation === 'landscape' ? 200 : 280;
    const frameX = (canvas.width - frameW) / 2;
    const frameY = (canvas.height - frameH) / 2;

    // Save context state
    ctx.save();

    // Clip to crop target frame
    ctx.beginPath();
    ctx.rect(frameX, frameY, frameW, frameH);
    ctx.clip();

    // Constrain cropRefX and cropRefY so the image covers the frame
    const scale = cropRefScale.current;
    const drawW = img.width * scale;
    const drawH = img.height * scale;

    let minLimitX, maxLimitX;
    if (drawW >= frameW) {
      minLimitX = (frameW - drawW) / 2;
      maxLimitX = (drawW - frameW) / 2;
    } else {
      minLimitX = -(frameW + drawW) / 2;
      maxLimitX = (frameW + drawW) / 2;
    }

    let minLimitY, maxLimitY;
    if (drawH >= frameH) {
      minLimitY = (frameH - drawH) / 2;
      maxLimitY = (drawH - frameH) / 2;
    } else {
      minLimitY = -(frameH + drawH) / 2;
      maxLimitY = (frameH + drawH) / 2;
    }

    cropRefX.current = Math.max(minLimitX, Math.min(maxLimitX, cropRefX.current));
    cropRefY.current = Math.max(minLimitY, Math.min(maxLimitY, cropRefY.current));

    // Draw scaled & translated image
    const drawX = frameX + (frameW - drawW) / 2 + cropRefX.current;
    const drawY = frameY + (frameH - drawH) / 2 + cropRefY.current;

    ctx.drawImage(img, drawX, drawY, drawW, drawH);

    // Restore context (remove clipping)
    ctx.restore();

    // Draw darker overlay outside the target frame
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    // top
    ctx.fillRect(0, 0, canvas.width, frameY);
    // bottom
    ctx.fillRect(0, frameY + frameH, canvas.width, frameY);
    // left
    ctx.fillRect(0, frameY, frameX, frameH);
    // right
    ctx.fillRect(frameX + frameW, frameY, frameX, frameH);

    // Draw frame borders
    ctx.strokeStyle = 'var(--nv-gold, #fdbd16)';
    ctx.lineWidth = 2;
    ctx.strokeRect(frameX, frameY, frameW, frameH);
  };

  const handleCanvasMouseDown = (e) => {
    e.preventDefault();
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
    e.preventDefault();
    isDragging.current = true;
    const rect = canvasRef.current.getBoundingClientRect();
    dragStart.current = {
      x: e.touches[0].clientX - rect.left,
      y: e.touches[0].clientY - rect.top
    };
  };

  const handleCanvasTouchMove = (e) => {
    if (!isDragging.current || !loadedImage.current || e.touches.length !== 1) return;
    e.preventDefault();
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

    // Relative position of the scaled image inside the crop frame
    const imageLeft = (frameW - drawW) / 2 + cropRefX.current;
    const imageTop = (frameH - drawH) / 2 + cropRefY.current;

    // High resolution scaling factor (4x baseline: 1400px width for landscape, 1000px for portrait)
    const baseW = cropOrientation === 'landscape' ? 1400 : 1000;
    const scaleFactor = baseW / frameW;

    // Create target canvas representing the entire crop frame
    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = frameW * scaleFactor;
    cropCanvas.height = frameH * scaleFactor;
    const cropCtx = cropCanvas.getContext('2d');

    // Enable high quality image scaling on canvas
    cropCtx.imageSmoothingEnabled = true;
    cropCtx.imageSmoothingQuality = 'high';

    const isTransparent = cropImageFormat === 'image/png' || cropImageFormat === 'image/webp' || cropImageFormat === 'image/gif';

    if (!isTransparent) {
      // Fill background with white to avoid transparent areas turning black in JPEG
      cropCtx.fillStyle = '#ffffff';
      cropCtx.fillRect(0, 0, cropCanvas.width, cropCanvas.height);
    } else {
      cropCtx.clearRect(0, 0, cropCanvas.width, cropCanvas.height);
    }

    const dx = imageLeft * scaleFactor;
    const dy = imageTop * scaleFactor;
    const dw = drawW * scaleFactor;
    const dh = drawH * scaleFactor;

    cropCtx.drawImage(
      img,
      0,
      0,
      img.width,
      img.height,
      dx,
      dy,
      dw,
      dh
    );

    const outputFormat = cropImageFormat === 'image/webp' ? 'image/webp' : (isTransparent ? 'image/png' : 'image/jpeg');
    const outputQuality = outputFormat === 'image/webp' || outputFormat === 'image/jpeg' ? 0.85 : undefined;
    const croppedUrl = cropCanvas.toDataURL(outputFormat, outputQuality);
    if (cropTarget.type === 'front') {
      setFormImage(croppedUrl);
    } else if (cropTarget.type === 'back') {
      setFormBackImage(croppedUrl);
    } else if (cropTarget.type === 'additional') {
      const idx = cropTarget.index;
      setFormAdditionalImages(prev => {
        const next = [...prev];
        if (idx !== undefined && idx < next.length) {
          next[idx] = croppedUrl;
        } else {
          next.push(croppedUrl);
        }
        return next;
      });
    } else if (cropTarget.type === 'block') {
      const blockId = cropTarget.id;
      setFormDescBlocks(prev => prev.map(b => b.id === blockId ? { ...b, value: croppedUrl } : b));
    }

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
            } catch (e) {
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

  // Sort products list
  filteredProducts.sort((a, b) => {
    if (sortBy === 'newest') {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      if (dateB !== dateA) return dateB - dateA;
      return a.id.localeCompare(b.id);
    }
    if (sortBy === 'oldest') {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      if (dateA !== dateB) return dateA - dateB;
      return a.id.localeCompare(b.id);
    }
    if (sortBy === 'name_asc') {
      return a.name.localeCompare(b.name, lang === 'CZ' ? 'cs' : 'en');
    }
    if (sortBy === 'name_desc') {
      return b.name.localeCompare(a.name, lang === 'CZ' ? 'cs' : 'en');
    }
    return 0;
  });

  const previewName = (formName || (lang === 'CZ' ? 'Název karty' : 'Card Name')) + (formCardCode ? ` (${formCardCode})` : '');

  const previewAvailableConditions = [...new Set((formVariants || []).map(v => v.condition))].filter(Boolean);
  const previewAvailableLangs = [...new Set((formVariants || []).map(v => v.lang))].filter(Boolean);
  const previewAvailableFoils = [...new Set((formVariants || []).map(v => v.foil))];

  const selectedCategory = categories.find(c => String(c.id) === String(formCategoryId));
  const isAcrylic = selectedCategory?.name_en === 'Acrylics' || formGame === 'Acrylics';
  const isAccessory = formType === 'accessory' && !isAcrylic;

  const getPreviewAccType = () => {
    const catName = selectedCategory?.name_en || '';
    if (catName.includes('Sleeves')) return lang === 'CZ' ? 'Obaly na karty' : 'Card sleeves';
    if (catName.includes('Toploaders')) return lang === 'CZ' ? 'Toploadery' : 'Toploaders';
    if (catName.includes('Binders')) return lang === 'CZ' ? 'Alba a pořadače' : 'Binders & portfolios';
    return lang === 'CZ' ? 'Herní příslušenství' : 'Gaming accessories';
  };
  const previewAccBrand = formName.includes('Dragon Shield') ? 'Dragon Shield' : formName.includes('Ultra Pro') ? 'Ultra Pro' : formName.includes('Ultimate Guard') ? 'Ultimate Guard' : (lang === 'CZ' ? 'Ostatní' : 'Other');
  const previewAccSize = formName.includes('Japanese') ? 'Japanese Size' : 'Standard Size (Pokémon/Lorcana)';
  const previewAccCount = formName.includes('100')
    ? (lang === 'CZ' ? '100 ks' : '100 pcs')
    : formName.includes('25')
      ? (lang === 'CZ' ? '25 ks' : '25 pcs')
      : formName.includes('216')
        ? (lang === 'CZ' ? '216 slotů' : '216 slots')
        : formName.includes('30')
          ? (lang === 'CZ' ? '30 slotů' : '30 slots')
          : (lang === 'CZ' ? '1 ks' : '1 pc');
  const previewAccMaterial = formName.includes('Matte')
    ? (lang === 'CZ' ? 'Matný plast (Matte)' : 'Matte plastic')
    : (lang === 'CZ' ? 'Prvotřídní acid-free PP' : 'Premium acid-free PP');
  const previewAccColor = formName.includes('Clear')
    ? (lang === 'CZ' ? 'Průhledná (Clear)' : 'Clear')
    : (lang === 'CZ' ? 'Černá (Black)' : 'Black');

  let activePreviewVariant = (formVariants || []).find(v => v.condition === previewCondition && v.lang === previewLang && v.foil === previewFoil)
    || (formVariants || []).find(v => v.condition === previewCondition)
    || (formVariants || [])[0];

  const previewPrice = formType === 'single'
    ? (activePreviewVariant?.price || 0)
    : (formPrice ? Number(formPrice) : 0);

  const previewStock = formType === 'single'
    ? (activePreviewVariant?.stock || 0)
    : (formStock ? Number(formStock) : 0);

  const livePreviewProduct = {
    id: formId || 'preview-id',
    name: previewName || (lang === 'CZ' ? 'Název karty' : 'Card Name'),
    type: formType,
    game: formGame,
    edition: formEdition || (lang === 'CZ' ? 'Edice' : 'Edition'),
    rarity: formRarity,
    image: formImage || '/Northvale Logo.webp',
    backImage: formBackImage,
    preorder: formPreorder,
    releaseDate: formPreorder ? formReleaseDate : null,
    investment: formInvestment,
    category_id: formCategoryId,
    lang: formLang,

    // Single-specific
    variants: formVariants,

    // Non-single specific
    price: formPrice ? Number(formPrice) : 0,
    stock: formStock ? Number(formStock) : 0,

    // Sealed-specific
    packagingType: formPackagingType,
    boosterCount: formBoosterCount ? Number(formBoosterCount) : null,
    year: formYear ? Number(formYear) : null,
    foilCondition: formFoilCondition,

    // Slab-specific
    company: formCompany,
    grade: formGrade ? Number(formGrade) : null,
    certNumber: formCertNumber,

    // Accessory-specific
    acrylicThickness: formAcrylicThickness ? Number(formAcrylicThickness) : null,
    uvProtection: formUvProtection,
    closingType: formClosingType,
    innerDimensions: formInnerDimensions,

    // Custom specifications/parameters
    customParams: formCustomParams
  };

  return (
    <div style={{ width: '100%' }}>
      {/* Top Bar Actions / Toolbar matching A _ Floating _ Minimal */}
      <div className="adf-toolbar">
        <div className="adf-tsearch">
          <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"></circle><path d="M21 21l-4.2-4.2"></path></svg>
          <input
            type="text"
            placeholder={lang === 'CZ' ? 'Hledat název, ID nebo set...' : 'Search name, ID or set...'}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        <div style={{ marginRight: 'auto' }} />

        {Object.keys(editedProducts).length > 0 && (
          <button
            type="button"
            onClick={handleSaveAllExcel}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#10b981',
              color: '#fff',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.16s ease',
              marginRight: '8px',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)'
            }}
          >
            💾 {lang === 'CZ' ? `Uložit vše (${Object.keys(editedProducts).length})` : `Save All (${Object.keys(editedProducts).length})`}
          </button>
        )}

        <div className="adf-tselect">
          <select
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
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 9l6 6 6-6"></path></svg>
        </div>

        <div className="adf-tselect">
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
          >
            <option value="newest">{lang === 'CZ' ? 'Nejnovější' : 'Newest'}</option>
            <option value="oldest">{lang === 'CZ' ? 'Nejstarší' : 'Oldest'}</option>
            <option value="name_asc">{lang === 'CZ' ? 'Název (A-Z)' : 'Name (A-Z)'}</option>
            <option value="name_desc">{lang === 'CZ' ? 'Název (Z-A)' : 'Name (Z-A)'}</option>
          </select>
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 9l6 6 6-6"></path></svg>
        </div>

        <button type="button" className="adf-tcsv" onClick={() => showToast(lang === 'CZ' ? 'Tato funkce hromadného importu CSV zatím není nastavená.' : 'Bulk CSV Import function is not configured yet.', 'warning')}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2h9l5 5v15H6z"></path><path d="M14 2v6h6M9 13h6M9 17h6"></path></svg>
          <span> {lang === 'CZ' ? 'Hromadný CSV import' : 'Bulk CSV Import'}</span>
        </button>

        <button type="button" className="adf-tadd" onClick={handleOpenAddModal}>
          <span>+ {lang === 'CZ' ? 'Přidat produkt' : 'Add Product'}</span>
        </button>
      </div>
      {/* Excel Grid View */}
      <div className="nv-excel-container">
        {loading ? (
          <p style={{ ...styles.infoText, padding: '24px' }}>{lang === 'CZ' ? 'Načítání produktů...' : 'Loading products...'}</p>
        ) : filteredProducts.length === 0 ? (
          <p style={{ ...styles.infoText, padding: '24px' }}>{lang === 'CZ' ? 'Žádné produkty neodpovídají filtrům.' : 'No products match filters.'}</p>
        ) : (
          <table className="nv-excel-table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>{lang === 'CZ' ? 'Náhled' : 'Preview'}</th>
                <th style={{ width: '160px' }}>{lang === 'CZ' ? 'SKU / ID' : 'SKU / ID'}</th>
                <th>{lang === 'CZ' ? 'Název produktu' : 'Product Name'}</th>
                <th style={{ width: '130px' }}>{lang === 'CZ' ? 'Hra' : 'Game'}</th>
                <th style={{ width: '180px' }}>{lang === 'CZ' ? 'Kategorie' : 'Category'}</th>
                <th style={{ width: '110px' }}>{lang === 'CZ' ? 'Typ' : 'Type'}</th>
                <th style={{ width: '120px' }}>{lang === 'CZ' ? 'Cena (Kč)' : 'Price (CZK)'}</th>
                <th style={{ width: '100px' }}>{lang === 'CZ' ? 'Sklad (ks)' : 'Stock'}</th>
                {/* <th style={{ width: '50px', textAlign: 'center' }}>Pre</th>
                  <th style={{ width: '50px', textAlign: 'center' }}>Inv</th> */}
                <th style={{ width: '120px', textAlign: 'center' }}>{lang === 'CZ' ? 'Akce' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map(p => {
                const isModified = !!editedProducts[p.id];
                const currentP = editedProducts[p.id] || p;

                return (
                  <tr key={p.id}>
                    <td data-label={lang === 'CZ' ? 'Náhled' : 'Preview'} style={{ textAlign: 'center' }}>
                      <div style={{ width: '36px', height: '36px', overflow: 'hidden', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)', background: '#121216', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                        {p.image ? (
                          <img src={p.image} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} onError={(e) => { e.target.onerror = null; e.target.src = '/Northvale Logo.webp'; }} />
                        ) : (
                          <span style={{ fontSize: '10px', color: '#8a8a92' }}>N/A</span>
                        )}
                      </div>
                    </td>
                    <td data-label="SKU / ID">
                      <code style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: 'var(--nv-gold, #fdbd16)', display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '150px' }} title={p.id}>
                        {p.id}
                      </code>
                    </td>
                    <td data-label={lang === 'CZ' ? 'Název' : 'Name'}>
                      <input
                        type="text"
                        className="nv-excel-input"
                        value={currentP.name || ''}
                        onChange={e => handleExcelRowChange(p.id, 'name', e.target.value)}
                      />
                    </td>
                    <td data-label={lang === 'CZ' ? 'Hra' : 'Game'}>
                      <select
                        className="nv-excel-select"
                        value={currentP.game || ''}
                        onChange={e => {
                          handleExcelRowChange(p.id, 'game', e.target.value);
                          handleExcelRowChange(p.id, 'category_id', null);
                        }}
                      >
                        <option value="Pokémon">Pokémon</option>
                        <option value="Lorcana">Lorcana</option>
                        <option value="One Piece">One Piece</option>
                        <option value="Riftbound">Riftbound</option>
                        <option value="Accessories">{lang === 'CZ' ? 'Příslušenství' : 'Accessories'}</option>
                        <option value="Acrylics">{lang === 'CZ' ? 'Akryly' : 'Acrylics'}</option>
                      </select>
                    </td>
                    <td data-label={lang === 'CZ' ? 'Kategorie' : 'Category'}>
                      <select
                        className="nv-excel-select"
                        value={currentP.category_id || ''}
                        onChange={e => handleExcelRowChange(p.id, 'category_id', e.target.value || null)}
                      >
                        <option value="">— Bez kategorie —</option>
                        {getCategoryOptionsForGame(currentP.game).map(opt => (
                          <option key={opt.id} value={opt.id}>
                            {'\u00A0'.repeat(opt.depth * 2)}{opt.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td data-label={lang === 'CZ' ? 'Typ' : 'Type'}>
                      <select
                        className="nv-excel-select"
                        value={currentP.type || ''}
                        onChange={e => handleExcelRowChange(p.id, 'type', e.target.value)}
                      >
                        <option value="single">Single</option>
                        <option value="sealed">Sealed</option>
                        <option value="slab">Slab</option>
                        <option value="acrylic">Acrylic</option>
                        <option value="accessory">Accessory</option>
                      </select>
                    </td>
                    <td data-label={lang === 'CZ' ? 'Cena' : 'Price'}>
                      {currentP.type === 'single' ? (
                        <span className="nv-excel-badge-single" onClick={() => handleOpenEditModal(p)}>
                          {lang === 'CZ' ? 'Varianty' : 'Variants'}
                        </span>
                      ) : (
                        <input
                          type="number"
                          className="nv-excel-input"
                          value={currentP.price === null || currentP.price === undefined ? '' : currentP.price}
                          onChange={e => handleExcelRowChange(p.id, 'price', e.target.value)}
                          placeholder="Cena"
                          style={{ textAlign: 'right' }}
                        />
                      )}
                    </td>
                    <td data-label={lang === 'CZ' ? 'Sklad' : 'Stock'}>
                      {currentP.type === 'single' ? (
                        <span style={{ fontSize: '11px', color: '#8a8a92' }}>
                          {(p.variants || []).reduce((sum, v) => sum + v.stock, 0)} ks
                        </span>
                      ) : (
                        <input
                          type="number"
                          className="nv-excel-input"
                          value={currentP.stock === null || currentP.stock === undefined ? '' : currentP.stock}
                          onChange={e => handleExcelRowChange(p.id, 'stock', e.target.value)}
                          placeholder="Sklad"
                          style={{ textAlign: 'right' }}
                        />
                      )}
                    </td>
                    {/* <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          className="nv-excel-checkbox"
                          checked={!!currentP.preorder}
                          onChange={e => handleExcelRowChange(p.id, 'preorder', e.target.checked)}
                        />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          className="nv-excel-checkbox"
                          checked={!!currentP.investment}
                          onChange={e => handleExcelRowChange(p.id, 'investment', e.target.checked)}
                        />
                      </td> */}
                    <td data-label={lang === 'CZ' ? 'Akce' : 'Actions'} style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                        <button
                          type="button"
                          className={`nv-excel-action-btn ${isModified ? 'save-pending' : ''}`}
                          onClick={() => handleSaveExcelRow(p.id)}
                          disabled={!isModified}
                          title={lang === 'CZ' ? 'Uložit změny v řádku' : 'Save row changes'}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                        </button>
                        <button
                          type="button"
                          className="nv-excel-action-btn"
                          onClick={() => handleOpenEditModal(p)}
                          title={lang === 'CZ' ? 'Otevřít detailní formulář' : 'Open detailed form'}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </button>
                        <button
                          type="button"
                          className="nv-excel-action-btn delete"
                          onClick={() => handleDeleteProduct(p.id)}
                          title={lang === 'CZ' ? 'Smazat' : 'Delete'}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                        </button>
                      </div>
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
          <div className="pmf-modal fade-in" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '1280px', width: '96%' }}>
            <div className="pmf-head">
              <h2 className="pmf-title">
                {editingProduct
                  ? (lang === 'CZ' ? `Upravit: ${editingProduct.name}` : `Edit: ${editingProduct.name}`)
                  : (lang === 'CZ' ? 'Vytvořit nový produkt' : 'Create New Product')}
              </h2>
              <button className="pmf-close" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleSaveProduct} style={{ display: 'flex', flexDirection: 'column', gap: '32px', width: '100%' }}>

              {!editingProduct && formType === 'single' && (
                <div className="pmf-section-card" style={{
                  background: 'linear-gradient(135deg, rgba(253, 189, 22, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',
                  border: '1px solid rgba(253, 189, 22, 0.15)',
                  borderRadius: '12px',
                  padding: '20px',
                  marginBottom: '10px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  boxSizing: 'border-box',
                  width: '100%'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '18px' }}>🔍</span>
                    <strong style={{ color: 'var(--nv-gold, #fdbd16)', textTransform: 'uppercase', fontSize: '13px', letterSpacing: '0.5px' }}>
                      {lang === 'CZ' ? 'TCG Rychlé doplňování' : 'TCG Auto-Fill Lookup'}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', width: '100%' }}>
                    <div style={{ flex: '1 1 180px' }}>
                      <label style={{ fontSize: '11px', color: '#8a8a92', display: 'block', marginBottom: '6px' }}>
                        {lang === 'CZ' ? 'Hra' : 'Game'}
                      </label>
                      <div className="pmf-select-wrapper">
                        <select
                          className="pmf-select"
                          value={formGame}
                          onChange={e => setFormGame(e.target.value)}
                          style={{ height: '38px', padding: '0 10px' }}
                        >
                          <option value="Pokémon">Pokémon</option>
                          <option value="Lorcana">Lorcana</option>
                          <option value="One Piece">One Piece</option>
                          <option value="Riftbound">Riftbound</option>
                          <option value="Accessories">{lang === 'CZ' ? 'Příslušenství' : 'Accessories'}</option>
                          <option value="Acrylics">{lang === 'CZ' ? 'Akryly' : 'Acrylics'}</option>
                        </select>
                        <svg className="pmf-select-chevron" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
                      </div>
                    </div>
                    <div style={{ flex: '1 1 180px' }}>
                      <label style={{ fontSize: '11px', color: '#8a8a92', display: 'block', marginBottom: '6px' }}>
                        {lang === 'CZ' ? 'Zkratka Edice (Set Code)' : 'Set Code'}
                      </label>
                      <input
                        type="text"
                        id="api-set-code"
                        className="pmf-input"
                        autoComplete="new-password"
                        placeholder={formGame === 'Pokémon' ? 'např. sv3, obf' : 'např. aac, woo'}
                        style={{ height: '38px' }}
                      />
                    </div>
                    <div style={{ flex: '1 1 150px' }}>
                      <label style={{ fontSize: '11px', color: '#8a8a92', display: 'block', marginBottom: '6px' }}>
                        {lang === 'CZ' ? 'Číslo karty' : 'Card Number'}
                      </label>
                      <input
                        type="text"
                        id="api-card-number"
                        className="pmf-input"
                        autoComplete="new-password"
                        placeholder="např. 186"
                        style={{ height: '38px' }}
                      />
                    </div>
                    <div style={{ flex: '1 1 200px', display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                      <button
                        type="button"
                        onClick={handleFetchTcgCard}
                        disabled={isApiLoading}
                        style={{
                          flex: 1,
                          height: '38px',
                          background: isApiLoading ? 'rgba(253, 189, 22, 0.2)' : 'var(--nv-gold, #fdbd16)',
                          color: isApiLoading ? '#8a8a92' : '#0b0c10',
                          border: 'none',
                          borderRadius: '8px',
                          fontWeight: '700',
                          cursor: isApiLoading ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          transition: 'background-color 0.16s ease'
                        }}
                      >
                        {isApiLoading ? (
                          <>
                            <div className="spinner-loader co-spinner" style={{ width: '14px', height: '14px', borderWidth: '1.5px', margin: 0 }}></div>
                            <span>{lang === 'CZ' ? 'Vyhledávám...' : 'Searching...'}</span>
                          </>
                        ) : (
                          <>
                            <span>⚡</span>
                            <span>{lang === 'CZ' ? 'Vyhledat a doplnit' : 'Search & Autofill'}</span>
                          </>
                        )}
                      </button>
                      {isApiLoading && (
                        <button
                          type="button"
                          onClick={handleCancelTcgFetch}
                          style={{
                            height: '38px',
                            padding: '0 16px',
                            background: 'rgba(239, 68, 68, 0.15)',
                            color: 'rgb(248, 113, 113)',
                            border: '1px solid rgba(239, 68, 68, 0.25)',
                            borderRadius: '8px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.16s ease'
                          }}
                        >
                          {lang === 'CZ' ? 'Zrušit' : 'Cancel'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ROW 1: PART 1 */}
              <div style={{ display: 'flex', gap: '40px', alignItems: 'flex-start' }} className="pmf-modal-split-layout">
                {/* Left Column: Part 1 Form */}
                <div style={{ flex: '1 1 720px', minWidth: '0' }}>

                  {/* ČÁST 1: NÁHLEDOVÁ KARTA */}
                  <div className="pmf-section-card" style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '12px',
                    padding: '24px',
                    marginBottom: '0px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '20px'
                  }}>
                    <div className="pmf-section-header" style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                      paddingBottom: '12px',
                      marginBottom: '4px'
                    }}>
                      <span className="pmf-section-badge" style={{
                        background: 'var(--nv-gold, #fdbd16)',
                        color: '#0b0c10',
                        fontWeight: '800',
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '13px'
                      }}>1</span>
                      <h3 className="pmf-section-title" style={{
                        fontSize: '15px',
                        fontWeight: '800',
                        color: '#fff',
                        margin: 0,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>{lang === 'CZ' ? '1. ČÁST: NÁHLEDOVÁ KARTA' : 'PART 1: CATALOG CARD PREVIEW'}</h3>
                    </div>

                    <div className="pmf-form-row" style={styles.row}>
                      <div className="pmf-form-col" style={{ ...styles.col, flex: '2 1 0' }}>
                        <div className="pmf-field">
                          <label className="pmf-label">{lang === 'CZ' ? 'Název produktu' : 'Product Name'}<span className="pmf-req-dot"> *</span></label>
                          <input 
                            type="text" 
                            required 
                            className="pmf-input" 
                            autoComplete="new-password" 
                            value={formName} 
                            onChange={e => setFormName(e.target.value)} 
                            placeholder="např. Charizard ex" 
                            disabled={!!editingProduct?.id}
                            style={editingProduct?.id ? { opacity: 0.7, cursor: 'not-allowed', backgroundColor: 'rgba(255, 255, 255, 0.02)' } : {}}
                          />
                        </div>
                      </div>
                      <div className="pmf-form-col" style={{ ...styles.col, flex: '1 1 0' }}>
                        <div className="pmf-field">
                          <label className="pmf-label">{lang === 'CZ' ? 'Kód / SKU' : 'SKU / Code'}</label>
                          <input
                            type="text"
                            disabled={true}
                            className="pmf-input"
                            value={formId}
                            placeholder={lang === 'CZ' ? 'Generuje se automaticky' : 'Generated automatically'}
                            style={{
                              opacity: 0.65,
                              cursor: 'not-allowed',
                              border: '1px dashed rgba(255, 255, 255, 0.15)',
                              backgroundColor: 'rgba(255, 255, 255, 0.02)'
                            }}
                          />
                          <span style={{ fontSize: '10px', color: '#8a8a92', marginTop: '4px', display: 'block' }}>
                            {lang === 'CZ' ? 'Generuje se automaticky.' : 'Generated automatically.'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pmf-form-row" style={styles.row}>
                      <div className="pmf-form-col" style={styles.col}>
                        <div className="pmf-field">
                          <label className="pmf-label">{lang === 'CZ' ? 'Hra' : 'Game'}</label>
                          <div className="pmf-select-wrapper">
                            <select className="pmf-select" value={formGame} onChange={e => {
                              const nextGame = e.target.value;
                              setFormGame(nextGame);
                              setFormCategoryId(''); // reset category selection
                              if (nextGame === 'Pokémon') {
                                setFormBackImage('https://images.pokemontcg.io/unbroken_bonds/back.png');
                              } else {
                                setFormBackImage('');
                              }
                            }}>
                              <option value="Pokémon">Pokémon</option>
                              <option value="Lorcana">Lorcana</option>
                              <option value="One Piece">One Piece</option>
                              <option value="Riftbound">Riftbound</option>
                              <option value="Accessories">Accessories</option>
                              <option value="Acrylics">Acrylics</option>
                            </select>
                            <svg className="pmf-select-chevron" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
                          </div>
                        </div>
                      </div>

                      <div className="pmf-form-col" style={{ ...styles.col, flex: 1.8 }}>
                        <div className="pmf-field" style={{ position: 'relative' }}>
                          <label className="pmf-label">{lang === 'CZ' ? 'Zařadit pod kategorii' : 'Assign to Category'}</label>
                          <div ref={categoryDropdownRef} className="pmf-select-wrapper">
                            <style>{`
                            .pmf-select.is-open {
                              border-bottom: 1px solid var(--nv-gold, #fdbd16) !important;
                            }
                          `}</style>
                            <button
                              type="button"
                              onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                              className={`pmf-select ctf-parent-trigger ${isCategoryDropdownOpen ? 'is-open' : ''}`}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                textAlign: 'left',
                                paddingRight: '28px',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                boxSizing: 'border-box'
                              }}
                            >
                              <span style={{
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                fontSize: '15px',
                                color: 'rgb(240, 240, 240)'
                              }}>
                                {formCategoryId ? (
                                  getCategoryPath(formCategoryId)
                                ) : (
                                  lang === 'CZ' ? '— Bez kategorie (Hlavní) —' : '— No Category (Top-level) —'
                                )}
                              </span>
                            </button>
                            <svg
                              className="pmf-select-chevron"
                              xmlns="http://www.w3.org/2000/svg"
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              style={{
                                transform: isCategoryDropdownOpen ? 'translateY(-50%) rotate(180deg)' : 'translateY(-50%) rotate(0deg)',
                                transition: 'transform 0.2s ease, stroke 0.2s ease'
                              }}
                            >
                              <path d="M6 9l6 6 6-6" />
                            </svg>

                            {isCategoryDropdownOpen && (
                              <div
                                style={{
                                  position: 'absolute',
                                  top: 'calc(100% + 6px)',
                                  left: 0,
                                  width: '100%',
                                  minWidth: '360px',
                                  maxHeight: '320px',
                                  overflowY: 'auto',
                                  background: '#1E1E24',
                                  border: '1px solid rgba(255, 255, 255, 0.12)',
                                  borderRadius: '8px',
                                  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.6)',
                                  zIndex: 9999,
                                  padding: '8px',
                                  boxSizing: 'border-box',
                                }}
                                className="ctf-parent-dropdown"
                              >
                                {/* Option for None */}
                                <div
                                  onClick={() => {
                                    setFormCategoryId('');
                                    setIsCategoryDropdownOpen(false);
                                  }}
                                  style={{
                                    padding: '8px 12px',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    fontSize: '13px',
                                    color: !formCategoryId ? 'var(--color-gold)' : '#fff',
                                    background: !formCategoryId ? 'rgba(253, 189, 22, 0.08)' : 'transparent',
                                    transition: 'background 0.15s, color 0.15s',
                                    marginBottom: '6px',
                                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                                    boxSizing: 'border-box'
                                  }}
                                  className="ctf-parent-opt-none"
                                >
                                  <span>🌐</span>
                                  <span style={{ fontWeight: !formCategoryId ? '600' : '400' }}>
                                    {lang === 'CZ' ? '— Bez kategorie (Hlavní) —' : '— No Category (Top-level) —'}
                                  </span>
                                </div>

                                {/* Hierarchical Options */}
                                {getHierarchicalCategoryOptions().length === 0 ? (
                                  <div style={{ padding: '8px 12px', color: 'rgba(255,255,255,0.4)', fontSize: '12px', fontStyle: 'italic', textAlign: 'center' }}>
                                    {lang === 'CZ' ? 'Žádné kategorie k dispozici' : 'No categories available'}
                                  </div>
                                ) : (
                                  getHierarchicalCategoryOptions().map((opt, idx) => {
                                    const isOptSelected = formCategoryId === opt.id;
                                    const isLevel0 = opt.depth === 0;
                                    const isLevel1 = opt.depth === 1;

                                    const showSeparator = isLevel1 && idx > 1;

                                    return (
                                      <div key={opt.id}>
                                        {showSeparator && (
                                          <div style={{ height: '1px', backgroundColor: 'rgba(255, 255, 255, 0.05)', margin: '10px 8px 8px 8px' }}></div>
                                        )}
                                        <div
                                          onClick={() => {
                                            setFormCategoryId(opt.id);
                                            const cat = categories.find(c => String(c.id) === String(opt.id));
                                            if (cat && cat.type) {
                                              setFormType(cat.type);
                                            }
                                            setIsCategoryDropdownOpen(false);
                                          }}
                                          style={{
                                            padding: isLevel0 ? '10px 12px' : '8px 12px',
                                            paddingLeft: `${12 + opt.depth * 24}px`,
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
                                            boxSizing: 'border-box'
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
                        </div>
                      </div>
                    </div>

                    {/* Standard Flat price/stock inputs (non-singles) */}
                    {formType !== 'single' && (
                      <div className="pmf-form-row" style={styles.row}>
                        <div className="pmf-form-col" style={styles.col}>
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
                              placeholder="např. 150"
                              disabled={!!editingProduct?.id}
                              style={editingProduct?.id ? { opacity: 0.7, cursor: 'not-allowed', backgroundColor: 'rgba(255, 255, 255, 0.02)' } : {}}
                            />
                          </div>
                        </div>
                        <div className="pmf-form-col" style={styles.col}>
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
                              placeholder="např. 5"
                              disabled={!!editingProduct?.id}
                              style={editingProduct?.id ? { opacity: 0.7, cursor: 'not-allowed', backgroundColor: 'rgba(255, 255, 255, 0.02)' } : {}}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Main image dropzone in Part 1 */}
                    <div className="pmf-field">
                      <label className="pmf-label">{lang === 'CZ' ? 'Obrázek náhledu (Přední strana)' : 'Preview Image (Front Side)'}<span className="pmf-req-dot"> *</span></label>
                      {formImage ? (
                        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', padding: '12px', borderRadius: '8px' }}>
                          <img src={formImage} alt="Preview front" style={{ height: '70px', width: '50px', objectFit: 'contain', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)' }} onError={(e) => { e.target.onerror = null; e.target.src = '/Northvale Logo.webp'; }} />
                          <div style={{ flex: 1, display: 'flex', gap: '8px' }}>
                            <button type="button" className="pmf-variants-add" style={{ padding: '6px 12px', fontSize: '11px' }} onClick={() => {
                              const input = document.createElement('input');
                              input.type = 'file';
                              input.accept = 'image/*';
                              input.onchange = (e) => {
                                const file = e.target.files[0];
                                if (file) {
                                  const target = { type: 'front' };
                                  setCropTarget(target);
                                  loadImageFile(file, target);
                                }
                              };
                              input.click();
                            }}>{lang === 'CZ' ? 'Změnit fotku' : 'Change Photo'}</button>
                            <button type="button" className="pmf-variants-add" style={{ padding: '6px 12px', fontSize: '11px', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#ef4444' }} onClick={() => setFormImage('')}>{lang === 'CZ' ? 'Odstranit' : 'Remove'}</button>
                          </div>
                        </div>
                      ) : (
                        <div
                          className="pmf-drop"
                          onDragOver={handleDragOver}
                          onDrop={(e) => {
                            e.preventDefault();
                            const file = e.dataTransfer.files[0];
                            if (file) {
                              const target = { type: 'front' };
                              setCropTarget(target);
                              loadImageFile(file, target);
                            }
                          }}
                          onClick={() => document.getElementById('pmf-main-file-input').click()}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '8px', color: 'var(--text-muted, #8a8a92)' }}>
                            <rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8.5" cy="9.5" r="1.5" /><path d="M21 16l-5-5L5 20" />
                          </svg>
                          <p className="dropText" style={{ fontSize: '11px', margin: 0, color: 'var(--text-muted, #8a8a92)' }}>
                            {lang === 'CZ' ? 'Přetáhněte obrázek karty sem nebo klikněte k výběru' : 'Drag & Drop card image here or click to select'}
                          </p>
                          <input type="file" id="pmf-main-file-input" accept="image/*" style={{ display: 'none' }} onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                              const target = { type: 'front' };
                              setCropTarget(target);
                              loadImageFile(file, target);
                            }
                          }} />
                        </div>
                      )}
                    </div>

                    {/* Variants Row if it's a single card */}
                    {formType === 'single' && (
                      <div style={{ marginTop: '10px' }}>
                        <div className="pmf-variants-head">
                          <div>
                            <h4 className="pmf-variants-title">{lang === 'CZ' ? 'Cena a sklad karty' : 'Card Price & Stock'}</h4>
                            <span className="pmf-variants-sub">{lang === 'CZ' ? 'Nastavení ceny a množství kusů' : 'Set price and quantity'}</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '12px' }}>
                          {formVariants.map((v) => (
                            <div key={v.id} className="pmf-vrow" style={{ padding: '8px 0', display: 'flex', gap: '16px' }}>
                              {/* Price */}
                              <div style={{ flex: 1 }}>
                                <div className="pmf-vcell-label">
                                  {lang === 'CZ' ? 'Cena' : 'Price'}
                                </div>
                                <input
                                  type="number"
                                  className="pmf-input"
                                  value={v.price}
                                  onChange={e => handleVariantChange(v.id, 'price', e.target.value ? Number(e.target.value) : '')}
                                  style={{ padding: '8px 12px', fontSize: '13px', ...(editingProduct?.id ? { opacity: 0.7, cursor: 'not-allowed', backgroundColor: 'rgba(255, 255, 255, 0.02)' } : {}) }}
                                  placeholder="100"
                                  disabled={!!editingProduct?.id}
                                />
                              </div>
                              {/* Stock */}
                              <div style={{ flex: 1 }}>
                                <div className="pmf-vcell-label">
                                  {lang === 'CZ' ? 'Skladem (ks)' : 'Stock (pcs)'}
                                </div>
                                <input
                                  type="number"
                                  className="pmf-input"
                                  value={v.stock}
                                  onChange={e => handleVariantChange(v.id, 'stock', e.target.value ? Number(e.target.value) : '')}
                                  style={{ padding: '8px 12px', fontSize: '13px', ...(editingProduct?.id ? { opacity: 0.7, cursor: 'not-allowed', backgroundColor: 'rgba(255, 255, 255, 0.02)' } : {}) }}
                                  placeholder="1"
                                  disabled={!!editingProduct?.id}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Bez DPH Checkbox */}
                    <div className="pmf-field" style={{ marginTop: '16px', marginBottom: '16px' }}>
                      <label className="pmf-check-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: 'rgba(255,255,255,0.8)' }}>
                        <input
                          type="checkbox"
                          className="pmf-check-box"
                          checked={formNoVat}
                          onChange={e => setFormNoVat(e.target.checked)}
                          style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                        />
                        {lang === 'CZ' ? 'Bez DPH' : 'No VAT'}
                      </label>
                    </div>

                    {/* Preorder & Investment checkboxes hidden for now
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '10px 0', marginTop: '10px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                      <label className="pmf-check-label">
                        <input type="checkbox" className="pmf-check-box" checked={formPreorder} onChange={e => setFormPreorder(e.target.checked)} />
                        {lang === 'CZ' ? 'Předobjednávka' : 'Preorder'}
                      </label>
                      <label className="pmf-check-label">
                        <input type="checkbox" className="pmf-check-box" checked={formInvestment} onChange={e => setFormInvestment(e.target.checked)} />
                        {lang === 'CZ' ? 'Investiční produkt' : 'Investment Product'}
                      </label>
                    </div>

                    {formPreorder && (
                      <div className="pmf-field" style={{ margin: '8px 0 0 0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div className="pmf-label" style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>
                          {lang === 'CZ' ? 'Očekávané datum vydání / naskladnění (např. 18. 9. 2026 nebo Září 2026)' : 'Expected release / stock date (e.g. Sep 18, 2026 or September 2026)'}
                        </div>
                        <input 
                          type="text" 
                          className="pmf-input" 
                          value={formReleaseDate} 
                          onChange={e => setFormReleaseDate(e.target.value)} 
                          style={{ padding: '8px 12px', fontSize: '13px', maxWidth: '300px' }} 
                          placeholder={lang === 'CZ' ? 'Doplňte datum...' : 'Enter date...'} 
                        />
                      </div>
                    )}
                  </div>
                  */}

                  </div>

                </div> {/* Closes Left Column for Part 1 Form */}

                {/* Right Column: Card Live Preview */}
                <div style={{ width: '360px', flexShrink: 0, position: 'sticky', top: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }} className="pmf-preview-column">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--nv-gold, #fdbd16)', letterSpacing: '1px', fontFamily: 'var(--font-heading)' }}>
                        {lang === 'CZ' ? 'Živý náhled karty' : 'Live Card Preview'}
                      </span>
                      <button
                        type="button"
                        className="pmf-variants-add"
                        style={{ padding: '3px 8px', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                        onClick={() => { setPreviewActiveTab('popis'); setIsFullPreviewOpen(true); }}
                      >
                        👁️ {lang === 'CZ' ? 'Celá stránka' : 'Full Page'}
                      </button>
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted, #8a8a92)', lineHeight: '1.4' }}>
                      {lang === 'CZ' ? 'Jak bude karta vypadat v katalogu e-shopu.' : 'How the card will look in the catalog.'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center', width: '100%', padding: '24px 16px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', boxSizing: 'border-box' }}>
                    <div style={{ width: '100%', maxWidth: '240px', pointerEvents: 'none', userSelect: 'none' }}>
                      <ProductCard
                        product={livePreviewProduct}
                        addToCart={() => { }}
                        setSelectedProductId={() => { }}
                        setActivePage={() => { }}
                      />
                    </div>
                  </div>
                </div>

              </div> {/* Closes Row 1 flex container */}

              {/* Horizontal Divider */}
              <div style={{ height: '1px', backgroundColor: 'rgba(255, 255, 255, 0.08)', margin: '8px 0' }}></div>

              {/* ROW 2: PART 2 */}
              <div style={{ display: 'flex', gap: '40px', alignItems: 'flex-start' }} className="pmf-modal-split-layout">
                {/* Left Column: Part 2 Form */}
                <div style={{ flex: '1 1 720px', minWidth: '0', display: 'flex', flexDirection: 'column', gap: '28px' }}>

                  {/* ČÁST 2: DETAIL PRODUKTOVÉ STRÁNKY */}
                  <div className="pmf-section-card" style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '12px',
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '24px'
                  }}>
                    <div className="pmf-section-header" style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                      paddingBottom: '12px',
                      marginBottom: '4px'
                    }}>
                      <span className="pmf-section-badge" style={{
                        background: 'var(--nv-gold, #fdbd16)',
                        color: '#0b0c10',
                        fontWeight: '800',
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '13px'
                      }}>2</span>
                      <h3 className="pmf-section-title" style={{
                        fontSize: '15px',
                        fontWeight: '800',
                        color: '#fff',
                        margin: 0,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>{lang === 'CZ' ? '2. ČÁST: DETAIL PRODUKTOVÉ STRÁNKY' : 'PART 2: STOREFRONT DETAILS PAGE'}</h3>
                    </div>

                    {/* PODSEKCE 2.1: FOTOGALERIE A KRÁTKÝ POPIS */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      {/* Multi-Image Gallery Slots */}
                      <div className="pmf-field">
                        <label className="pmf-label">
                          {lang === 'CZ' ? 'Fotogalerie produktu (Oříznutelné fotky)' : 'Product Gallery (Croppable Photos)'}
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '16px', marginTop: '8px' }}>
                          {/* Front Photo Card (Mirrored) */}
                          <div className="image-slot-card" style={styles.imageSlotCard}>
                            <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--nv-gold, #fdbd16)', fontWeight: '800', letterSpacing: '0.5px' }}>{lang === 'CZ' ? 'Přední strana' : 'Front side'}</span>
                            {formImage ? (
                              <div style={styles.slotPreviewWrap}>
                                <img src={formImage} alt="Front preview" style={styles.slotPreviewImg} />
                                <div style={styles.slotActions}>
                                  <button type="button" className="slot-btn" style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '11px' }} onClick={() => {
                                    const input = document.createElement('input');
                                    input.type = 'file';
                                    input.accept = 'image/*';
                                    input.onchange = (e) => {
                                      const file = e.target.files[0];
                                      if (file) {
                                        const target = { type: 'front' };
                                        setCropTarget(target);
                                        loadImageFile(file, target);
                                      }
                                    };
                                    input.click();
                                  }}>🔄</button>
                                </div>
                              </div>
                            ) : (
                              <div className="slot-empty" style={styles.slotEmpty} onClick={() => {
                                const input = document.createElement('input');
                                input.type = 'file';
                                input.accept = 'image/*';
                                input.onchange = (e) => {
                                  const file = e.target.files[0];
                                  if (file) {
                                    const target = { type: 'front' };
                                    setCropTarget(target);
                                    loadImageFile(file, target);
                                  }
                                };
                                input.click();
                              }}>
                                <span>➕ {lang === 'CZ' ? 'Přední' : 'Front'}</span>
                              </div>
                            )}
                          </div>

                          {/* Back Photo Card */}
                          <div className="image-slot-card" style={styles.imageSlotCard}>
                            <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '800', letterSpacing: '0.5px' }}>{lang === 'CZ' ? 'Zadní strana' : 'Back side'}</span>
                            {formBackImage ? (
                              <div style={styles.slotPreviewWrap}>
                                <img src={formBackImage} alt="Back preview" style={styles.slotPreviewImg} />
                                <div style={styles.slotActions}>
                                  <button type="button" className="slot-btn" style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '11px' }} onClick={() => {
                                    const input = document.createElement('input');
                                    input.type = 'file';
                                    input.accept = 'image/*';
                                    input.onchange = (e) => {
                                      const file = e.target.files[0];
                                      if (file) {
                                        const target = { type: 'back' };
                                        setCropTarget(target);
                                        loadImageFile(file, target);
                                      }
                                    };
                                    input.click();
                                  }}>🔄</button>
                                  <button type="button" className="slot-btn" style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '11px' }} onClick={() => setFormBackImage('')}>🗑️</button>
                                </div>
                              </div>
                            ) : (
                              <div className="slot-empty" style={styles.slotEmpty} onClick={() => {
                                const input = document.createElement('input');
                                input.type = 'file';
                                input.accept = 'image/*';
                                input.onchange = (e) => {
                                  const file = e.target.files[0];
                                  if (file) {
                                    const target = { type: 'back' };
                                    setCropTarget(target);
                                    loadImageFile(file, target);
                                  }
                                };
                                input.click();
                              }}>
                                <span>➕ {lang === 'CZ' ? 'Zadní' : 'Back'}</span>
                              </div>
                            )}
                          </div>

                          {/* Additional Photo Cards */}
                          {formAdditionalImages.map((imgUrl, index) => (
                            <div key={index} className="image-slot-card" style={styles.imageSlotCard}>
                              <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '800', letterSpacing: '0.5px' }}>{lang === 'CZ' ? `Další #${index + 1}` : `Extra #${index + 1}`}</span>
                              <div style={styles.slotPreviewWrap}>
                                <img src={imgUrl} alt="Extra preview" style={styles.slotPreviewImg} />
                                <div style={styles.slotActions}>
                                  <button type="button" className="slot-btn" style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '11px' }} onClick={() => {
                                    const input = document.createElement('input');
                                    input.type = 'file';
                                    input.accept = 'image/*';
                                    input.onchange = (e) => {
                                      const file = e.target.files[0];
                                      if (file) {
                                        const target = { type: 'additional', index };
                                        setCropTarget(target);
                                        loadImageFile(file, target);
                                      }
                                    };
                                    input.click();
                                  }}>🔄</button>
                                  <button type="button" className="slot-btn" style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '11px' }} onClick={() => {
                                    setFormAdditionalImages(formAdditionalImages.filter((_, i) => i !== index));
                                  }}>🗑️</button>
                                </div>
                              </div>
                            </div>
                          ))}

                          {/* Add Extra Photo Card */}
                          <div className="image-slot-card" style={styles.imageSlotCard}>
                            <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', fontWeight: '800', letterSpacing: '0.5px' }}>{lang === 'CZ' ? 'Další fotka' : 'Additional'}</span>
                            <div className="slot-empty" style={styles.slotEmpty} onClick={() => {
                              const input = document.createElement('input');
                              input.type = 'file';
                              input.accept = 'image/*';
                              input.onchange = (e) => {
                                const file = e.target.files[0];
                                if (file) {
                                  const target = { type: 'additional' };
                                  setCropTarget(target);
                                  loadImageFile(file, target);
                                }
                              };
                              input.click();
                            }}>
                              <span>➕ {lang === 'CZ' ? 'Přidat' : 'Add'}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Custom short description textarea */}
                      <div className="pmf-field">
                        <label className="pmf-label">
                          {lang === 'CZ' ? 'Vlastní krátký popisek (u tlačítek)' : 'Custom Short Description (Near Actions)'}
                        </label>
                        <RichTextEditor
                          value={formShortDesc}
                          onChange={setFormShortDesc}
                          placeholder={lang === 'CZ' ? 'Vyplňte vlastní krátký popis, který se zobrazuje vedle fotky karty. Pokud necháte prázdné, vygeneruje se z hlavního popisu.' : 'Enter short descriptive teaser. Fallback is generated from the main description if empty.'}
                          className="pmf-textarea pmf-textarea-with-toolbar"
                        />
                        <span style={styles.helperText}>
                          {lang === 'CZ' ? '💡 Krátký odstavec u nákupních tlačítek pod nadpisem karty.' : '💡 Displayed near price and cart button.'}
                        </span>
                      </div>
                    </div>

                    {/* DELICÍ ČÁRA */}
                    <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '12px 0' }}></div>

                    {/* PODSEKCE 2.2: OBSAH A SPECIFIKACE (Dvě sekce) */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                      {/* Sekce A: Podrobný popis */}
                      <div style={{
                        background: 'rgba(255, 255, 255, 0.01)',
                        border: '1px solid rgba(255, 255, 255, 0.04)',
                        borderRadius: '12px',
                        padding: '20px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '14px'
                      }}>
                        <h4 style={{ margin: 0, fontSize: '13px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--nv-gold, #fdbd16)', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '10px' }}>
                          {lang === 'CZ' ? 'A. Podrobný popis produktu' : 'A. Detailed Product Description'}
                        </h4>
                        {/* Description Blocks Builder */}
                        <div className="pmf-field" style={{ margin: 0 }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', background: 'rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '16px' }}>

                            {formDescBlocks.map((block, idx) => (
                              <div key={block.id} style={{ display: 'flex', gap: '12px', alignItems: 'stretch', padding: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px' }}>

                                {/* Reordering indicators */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', justifyContent: 'center', alignItems: 'center', minWidth: '36px', borderRight: '1px solid rgba(255,255,255,0.06)', paddingRight: '8px' }}>
                                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 'bold' }}># {idx + 1}</span>
                                  <span style={{ fontSize: '13px' }}>{block.type === 'text' ? '📝' : '🖼️'}</span>
                                </div>

                                {/* Block input fields */}
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', justifyContent: 'center' }}>
                                  {block.type === 'text' ? (
                                    <>
                                      <RichTextEditor
                                        value={block.value}
                                        onChange={(val) => handleDescBlockChange(block.id, val)}
                                        placeholder={lang === 'CZ' ? 'Zde napište text...' : 'Write text block content here...'}
                                        className="pmf-textarea pmf-textarea-with-toolbar"
                                        style={{ padding: '8px 10px', fontSize: '14px' }}
                                      />
                                    </>
                                  ) : (
                                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                                      {block.value ? (
                                        <img src={block.value} alt="" style={{ height: '70px', width: '50px', objectFit: 'contain', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)' }} />
                                      ) : (
                                        <div style={{ height: '70px', width: '50px', borderRadius: '4px', border: '1px dashed rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.2)', fontSize: '18px' }}>📷</div>
                                      )}
                                      <div style={{ flex: 1 }}>
                                        <button type="button" className="pmf-variants-add" style={{ padding: '6px 12px', fontSize: '11px' }} onClick={() => {
                                          const input = document.createElement('input');
                                          input.type = 'file';
                                          input.accept = 'image/*';
                                          input.onchange = (e) => {
                                            const file = e.target.files[0];
                                            if (file) {
                                              const target = { type: 'block', id: block.id };
                                              setCropTarget(target);
                                              loadImageFile(file, target);
                                            }
                                          };
                                          input.click();
                                        }}>
                                          {block.value ? (lang === 'CZ' ? 'Změnit obrázek' : 'Change Image') : (lang === 'CZ' ? 'Nahrát a oříznout' : 'Upload & Crop')}
                                        </button>
                                        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
                                          {lang === 'CZ'
                                            ? 'Doporučená velikost šablony: 1050×750 px (na šířku) nebo 750×1050 px (na výšku).'
                                            : 'Recommended template size: 1050×750 px (landscape) or 750×1050 px (portrait).'}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Block Actions */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', justifyContent: 'center', borderLeft: '1px solid rgba(255,255,255,0.06)', paddingLeft: '8px' }}>
                                  <button type="button" style={{ background: 'none', border: 'none', color: '#8a8a92', cursor: 'pointer', fontSize: '10px', opacity: idx === 0 ? 0.3 : 1 }} disabled={idx === 0} onClick={() => handleMoveDescBlock(idx, -1)}>▲</button>
                                  <button type="button" style={{ background: 'none', border: 'none', color: '#8a8a92', cursor: 'pointer', fontSize: '10px', opacity: idx === formDescBlocks.length - 1 ? 0.3 : 1 }} disabled={idx === formDescBlocks.length - 1} onClick={() => handleMoveDescBlock(idx, 1)}>▼</button>
                                  <button type="button" style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '11px', marginTop: '4px' }} onClick={() => handleRemoveDescBlock(block.id)}>🗑️</button>
                                </div>
                              </div>
                            ))}

                            <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
                              <button type="button" className="pmf-variants-add" style={{ flex: 1 }} onClick={() => handleAddDescBlock('text')}>
                                ➕ {lang === 'CZ' ? 'Přidat Textový Blok' : 'Add Text Block'}
                              </button>
                              <button type="button" className="pmf-variants-add" style={{ flex: 1 }} onClick={() => handleAddDescBlock('image')}>
                                🖼️ {lang === 'CZ' ? 'Přidat Obrázek' : 'Add Image Block'}
                              </button>
                            </div>

                          </div>
                        </div>
                      </div>

                      {/* Sekce B: Parametry a specifikace */}
                      <div style={{
                        background: 'rgba(255, 255, 255, 0.01)',
                        border: '1px solid rgba(255, 255, 255, 0.04)',
                        borderRadius: '12px',
                        padding: '20px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '14px'
                      }}>
                        <h4 style={{ margin: 0, fontSize: '13px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--nv-gold, #fdbd16)', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '10px' }}>
                          {lang === 'CZ' ? 'B. Parametry a specifikace produktu' : 'B. Product Specs & Specifications'}
                        </h4>
                        {/* Optional Specifications parameters Checklist */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          {/* Set / Edition */}
                          <div className="pmf-form-row" style={styles.row}>
                            <div className="pmf-form-col" style={styles.col}>
                              <div className="pmf-field">
                                <label className="pmf-label">{lang === 'CZ' ? 'Edice / Sada' : 'Set / Expansion'}</label>
                                <input type="text" className="pmf-input" autoComplete="new-password" value={formEdition} onChange={e => setFormEdition(e.target.value)} placeholder="např. Obsidian Flames" />
                              </div>
                            </div>
                            <div className="pmf-form-col" style={styles.col}>
                              <div className="pmf-field">
                                <label className="pmf-label">{lang === 'CZ' ? 'Zkratka edice (Set Code)' : 'Set Code'}</label>
                                <input type="text" className="pmf-input" autoComplete="new-password" value={formSetCode} onChange={e => setFormSetCode(e.target.value)} placeholder="např. OBF" />
                              </div>
                            </div>
                          </div>

                          {/* Sběratelské číslo & Rarita */}
                          <div className="pmf-form-row" style={styles.row}>
                            <div className="pmf-form-col" style={styles.col}>
                              <div className="pmf-field">
                                <label className="pmf-label">{lang === 'CZ' ? 'Sběratelské číslo' : 'Collector Code'}</label>
                                <input type="text" className="pmf-input" autoComplete="new-password" value={formCardCode} onChange={e => setFormCardCode(e.target.value)} placeholder="např. 186/196" />
                              </div>
                            </div>
                            <div className="pmf-form-col" style={styles.col}>
                              <div className="pmf-field">
                                <label className="pmf-label">{lang === 'CZ' ? 'Rarita' : 'Rarity'}</label>
                                <input type="text" className="pmf-input" autoComplete="new-password" value={formRarity} onChange={e => setFormRarity(e.target.value)} placeholder="např. Ultra Rare" />
                              </div>
                            </div>
                          </div>

                          {/* Jazyk & Element / Barva / Typ */}
                          <div className="pmf-form-row" style={styles.row}>
                            <div className="pmf-form-col" style={styles.col}>
                              <div className="pmf-field">
                                <label className="pmf-label">{lang === 'CZ' ? 'Jazyk (Hlavní)' : 'Language'}</label>
                                <div className="pmf-select-wrapper">
                                  <select className="pmf-select" value={formLang} onChange={e => {
                                    const newLang = e.target.value;
                                    setFormLang(newLang);
                                    if (formType === 'single' && formVariants.length > 0) {
                                      setFormVariants(formVariants.map((v, i) => i === 0 ? { ...v, lang: newLang } : v));
                                    }
                                    setPreviewLang(newLang);
                                  }}>
                                    <option value="EN">EN 🇬🇧</option>
                                    <option value="JP">JP 🇯🇵</option>
                                    <option value="CN">CN 🇨🇳</option>
                                    <option value="CZ">CZ 🇨🇿</option>
                                  </select>
                                  <svg className="pmf-select-chevron" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
                                </div>
                              </div>
                            </div>
                            <div className="pmf-form-col" style={styles.col}>
                              <div className="pmf-field">
                                <label className="pmf-label">{lang === 'CZ' ? 'Element / Barva / Typ' : 'Element / Color / Type'}</label>
                                <input type="text" className="pmf-input" value={formElement} onChange={e => setFormElement(e.target.value)} placeholder="např. Fire, Lightning, Amethyst..." />
                              </div>
                            </div>
                          </div>

                          {/* Stav karty & Provedení (pouze pro single karty) */}
                          {formType === 'single' && (
                            <div className="pmf-form-row" style={styles.row}>
                              <div className="pmf-form-col" style={styles.col}>
                                <div className="pmf-field">
                                  <label className="pmf-label">{lang === 'CZ' ? 'Stav karty' : 'Card Condition'}</label>
                                  <div className="pmf-select-wrapper">
                                    <select
                                      className="pmf-select"
                                      value={formVariants[0]?.condition || 'NM'}
                                      onChange={e => {
                                        const newCond = e.target.value;
                                        if (formVariants.length > 0) {
                                          setFormVariants(formVariants.map((v, i) => i === 0 ? { ...v, condition: newCond } : v));
                                        }
                                        setPreviewCondition(newCond);
                                      }}
                                    >
                                      <option value="NM">Near Mint (NM)</option>
                                      <option value="EX">Excellent (EX)</option>
                                      <option value="GD">Good (GD)</option>
                                      <option value="LP">Light Played (LP)</option>
                                      <option value="PL">Played (PL)</option>
                                      <option value="PO">Poor (PO)</option>
                                    </select>
                                    <svg className="pmf-select-chevron" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
                                  </div>
                                </div>
                              </div>
                              <div className="pmf-form-col" style={styles.col}>
                                <div className="pmf-field">
                                  <label className="pmf-label">{lang === 'CZ' ? 'Provedení' : 'Foiling / Finish'}</label>
                                  <div className="pmf-select-wrapper">
                                    <select
                                      className="pmf-select"
                                      value={formVariants[0]?.foil === true ? "foil" : "non-foil"}
                                      onChange={e => {
                                        const isFoil = e.target.value === 'foil';
                                        if (formVariants.length > 0) {
                                          setFormVariants(formVariants.map((v, i) => i === 0 ? { ...v, foil: isFoil } : v));
                                        }
                                        setPreviewFoil(isFoil);
                                      }}
                                    >
                                      <option value="non-foil">{lang === 'CZ' ? 'Non-Foil (matná)' : 'Non-Foil (matte)'}</option>
                                      <option value="foil">{lang === 'CZ' ? 'Foil (lesklá) ✨' : 'Foil (shiny) ✨'}</option>
                                    </select>
                                    <svg className="pmf-select-chevron" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Vývojové stádium & Ilustrátor */}
                          <div className="pmf-form-row" style={styles.row}>
                            <div className="pmf-form-col" style={styles.col}>
                              <div className="pmf-field">
                                <label className="pmf-label">{lang === 'CZ' ? 'Vývojové stádium' : 'Stage'}</label>
                                <input type="text" className="pmf-input" value={formStage} onChange={e => setFormStage(e.target.value)} placeholder="např. VMAX, ex, Stage 1, Basic..." />
                              </div>
                            </div>
                            <div className="pmf-form-col" style={styles.col}>
                              <div className="pmf-field">
                                <label className="pmf-label">{lang === 'CZ' ? 'Ilustrátor' : 'Illustrator'}</label>
                                <input type="text" className="pmf-input" value={formIllustrator} onChange={e => setFormIllustrator(e.target.value)} placeholder="např. Mitsuhiro Arita" />
                              </div>
                            </div>
                          </div>

                          {/* Rok vydání */}
                          <div className="pmf-form-row" style={styles.row}>
                            <div className="pmf-form-col" style={styles.col}>
                              <div className="pmf-field">
                                <label className="pmf-label">{lang === 'CZ' ? 'Rok vydání' : 'Release Year'}</label>
                                <input type="number" className="pmf-input" value={formYear} onChange={e => setFormYear(e.target.value)} placeholder="např. 2024" />
                              </div>
                            </div>
                            <div className="pmf-form-col" style={styles.col}>
                              {/* Empty column for visual symmetry */}
                            </div>
                          </div>





                          {/* TYPE-SPECIFIC DETAILS (Sealed / Slab / Acrylics / Accessories) */}
                          {formType === 'sealed' && (
                            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                              <div className="pmf-form-row" style={styles.row}>
                                <div className="pmf-form-col" style={styles.col}>
                                  <div className="pmf-field">
                                    <label className="pmf-label">{lang === 'CZ' ? 'Typ balení' : 'Packaging Type'}</label>
                                    <input type="text" className="pmf-input" value={formPackagingType} onChange={e => setFormPackagingType(e.target.value)} placeholder="Booster Box, ETB, Booster..." />
                                  </div>
                                </div>
                                <div className="pmf-form-col" style={styles.col}>
                                  <div className="pmf-field">
                                    <label className="pmf-label">{lang === 'CZ' ? 'Počet boosterů' : 'Booster Count'}</label>
                                    <input type="number" className="pmf-input" value={formBoosterCount} onChange={e => setFormBoosterCount(e.target.value)} placeholder="36" />
                                  </div>
                                </div>
                              </div>
                              <div className="pmf-field">
                                <label className="pmf-label">{lang === 'CZ' ? 'Stav sealed fólie' : 'Shrink Wrap Condition'}</label>
                                <input type="text" className="pmf-input" value={formFoilCondition} onChange={e => setFormFoilCondition(e.target.value)} placeholder="100% stav" />
                              </div>
                            </div>
                          )}

                          {formType === 'slab' && (
                            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                              <div className="pmf-form-row" style={styles.row}>
                                <div className="pmf-form-col" style={styles.col}>
                                  <div className="pmf-field">
                                    <label className="pmf-label">{lang === 'CZ' ? 'Gradingová firma' : 'Grading Company'}</label>
                                    <input type="text" className="pmf-input" value={formCompany} onChange={e => setFormCompany(e.target.value)} placeholder="PSA, Beckett, AP..." />
                                  </div>
                                </div>
                                <div className="pmf-form-col" style={styles.col}>
                                  <div className="pmf-field">
                                    <label className="pmf-label">{lang === 'CZ' ? 'Známka (Grade)' : 'Grade'}</label>
                                    <input type="number" className="pmf-input" value={formGrade} onChange={e => setFormGrade(e.target.value)} placeholder="10" />
                                  </div>
                                </div>
                              </div>
                              <div className="pmf-field">
                                <label className="pmf-label">{lang === 'CZ' ? 'Certifikační číslo' : 'Certificate Number'}</label>
                                <input type="text" className="pmf-input" value={formCertNumber} onChange={e => setFormCertNumber(e.target.value)} placeholder="např. 89234850" />
                              </div>
                            </div>
                          )}

                          {formType === 'accessory' && (
                            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                              <div className="pmf-form-row" style={styles.row}>
                                <div className="pmf-form-col" style={styles.col}>
                                  <div className="pmf-field">
                                    <label className="pmf-label">{lang === 'CZ' ? 'Tloušťka akrylu (mm)' : 'Acrylic Thickness (mm)'}</label>
                                    <input type="number" className="pmf-input" value={formAcrylicThickness} onChange={e => setFormAcrylicThickness(e.target.value)} placeholder="4" />
                                  </div>
                                </div>
                                <div className="pmf-form-col" style={styles.col}>
                                  <div className="pmf-field" style={{ justifyContent: 'center' }}>
                                    <label className="pmf-check-label">
                                      <input type="checkbox" className="pmf-check-box" checked={formUvProtection} onChange={e => setFormUvProtection(e.target.checked)} />
                                      {lang === 'CZ' ? 'Integrovaný UV filtr' : 'Integrated UV Protection'}
                                    </label>
                                  </div>
                                </div>
                              </div>
                              <div className="pmf-form-row" style={styles.row}>
                                <div className="pmf-form-col" style={styles.col}>
                                  <div className="pmf-field">
                                    <label className="pmf-label">{lang === 'CZ' ? 'Typ zavírání' : 'Closing Type'}</label>
                                    <input type="text" className="pmf-input" value={formClosingType} onChange={e => setFormClosingType(e.target.value)} placeholder="Magnetické víko..." />
                                  </div>
                                </div>
                                <div className="pmf-form-col" style={styles.col}>
                                  <div className="pmf-field">
                                    <label className="pmf-label">{lang === 'CZ' ? 'Vnitřní rozměry' : 'Inner Dimensions'}</label>
                                    <input type="text" className="pmf-input" value={formInnerDimensions} onChange={e => setFormInnerDimensions(e.target.value)} placeholder="142 x 125 x 78 mm" />
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Custom parameters manager */}
                          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px', marginTop: '16px' }}>
                            <label className="pmf-label" style={{ display: 'block', marginBottom: '8px', color: 'var(--nv-gold, #fdbd16)', fontSize: '12px', fontWeight: 'bold' }}>
                              {lang === 'CZ' ? 'Vlastní parametry a specifikace' : 'Custom Specifications'}
                            </label>

                            {/* List of custom params */}
                            {formCustomParams.length > 0 && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                                {formCustomParams.map((param, index) => (
                                  <div key={index} style={{ display: 'flex', gap: '12px', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '8px 12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.04)' }}>
                                    <input
                                      type="text"
                                      className="pmf-input"
                                      style={{ flex: 1, padding: '6px 10px', fontSize: '12px' }}
                                      value={param.label}
                                      onChange={(e) => {
                                        const newParams = formCustomParams.map((p, i) =>
                                          i === index ? { ...p, label: e.target.value } : p
                                        );
                                        setFormCustomParams(newParams);
                                      }}
                                      placeholder={lang === 'CZ' ? 'Název parametru' : 'Parameter Name'}
                                    />
                                    <input
                                      type="text"
                                      className="pmf-input"
                                      style={{ flex: 2, padding: '6px 10px', fontSize: '12px' }}
                                      value={param.value}
                                      onChange={(e) => {
                                        const newParams = formCustomParams.map((p, i) =>
                                          i === index ? { ...p, value: e.target.value } : p
                                        );
                                        setFormCustomParams(newParams);
                                      }}
                                      placeholder={lang === 'CZ' ? 'Hodnota parametru' : 'Parameter Value'}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => setFormCustomParams(formCustomParams.filter((_, i) => i !== index))}
                                      style={{
                                        background: 'rgba(239, 68, 68, 0.1)',
                                        border: '1px solid rgba(239, 68, 68, 0.2)',
                                        color: '#ef4444',
                                        padding: '6px 10px',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                      }}
                                      title={lang === 'CZ' ? 'Odstranit' : 'Delete'}
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Form to add a new parameter */}
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                              <div style={{ flex: 1 }}>
                                <input
                                  id="new-param-label"
                                  type="text"
                                  className="pmf-input"
                                  style={{ padding: '8px 12px', fontSize: '13px' }}
                                  placeholder={lang === 'CZ' ? 'Např. Jazyk karty' : 'E.g. Language'}
                                />
                              </div>
                              <div style={{ flex: 2 }}>
                                <input
                                  id="new-param-value"
                                  type="text"
                                  className="pmf-input"
                                  style={{ padding: '8px 12px', fontSize: '13px' }}
                                  placeholder={lang === 'CZ' ? 'Např. Čeština (CZ)' : 'E.g. Czech (CZ)'}
                                />
                              </div>
                              <button
                                type="button"
                                className="pmf-variants-add"
                                style={{
                                  padding: '8px 16px',
                                  height: '38px',
                                  whiteSpace: 'nowrap',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                                onClick={() => {
                                  const labelInput = document.getElementById('new-param-label');
                                  const valueInput = document.getElementById('new-param-value');
                                  if (labelInput && valueInput && labelInput.value.trim() && valueInput.value.trim()) {
                                    setFormCustomParams([...formCustomParams, { label: labelInput.value.trim(), value: valueInput.value.trim() }]);
                                    labelInput.value = '';
                                    valueInput.value = '';
                                  } else {
                                    alert(lang === 'CZ' ? 'Vyplňte prosím název i hodnotu parametru.' : 'Please fill both the parameter name and value.');
                                  }
                                }}
                              >
                                <span>+</span> {lang === 'CZ' ? 'Přidat' : 'Add'}
                              </button>
                            </div>
                          </div>

                        </div>
                      </div>

                    </div>
                  </div>

                </div> {/* Closes Left Column for Part 2 Form */}

                {/* Right Column: Page Detail Live Preview */}
                <div style={{ width: '360px', flexShrink: 0, position: 'sticky', top: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }} className="pmf-preview-column">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--nv-gold, #fdbd16)', letterSpacing: '1px', fontFamily: 'var(--font-heading)' }}>
                        {lang === 'CZ' ? 'Živý náhled detailu' : 'Live Page Preview'}
                      </span>
                      <button
                        type="button"
                        className="pmf-variants-add"
                        style={{ padding: '3px 8px', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                        onClick={() => { setPreviewActiveTab('popis'); setIsFullPreviewOpen(true); }}
                      >
                        👁️ {lang === 'CZ' ? 'Celá stránka' : 'Full Page'}
                      </button>
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted, #8a8a92)', lineHeight: '1.4' }}>
                      {lang === 'CZ' ? 'Jak bude vypadat produktová stránka (scrollovatelná).' : 'How the storefront details page will look (scrollable).'}
                    </span>
                  </div>

                  {/* Miniature Storefront Page Preview */}
                  <div style={styles.mockPageContainer} className="glass-panel">

                    {/* Breadcrumbs Mockup */}
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Domů / {formGame} / {formEdition || (lang === 'CZ' ? 'Bez sady' : 'No set')}
                    </div>

                    {/* Image Gallery area */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center', width: '100%' }}>
                      <div style={{ width: '100%', height: '330px', backgroundColor: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        <img
                          src={previewActiveImage || formImage || '/Northvale Logo.webp'}
                          alt=""
                          style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
                          onError={(e) => { e.target.onerror = null; e.target.src = '/Northvale Logo.webp'; }}
                        />
                      </div>

                      {/* Dot indicator lines */}
                      {(formBackImage || formAdditionalImages.length > 0) && (
                        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', padding: '2px 0', width: '100%', justifyContent: 'center' }}>
                          {formImage && (
                            <div
                              onClick={() => setPreviewActiveImage(formImage)}
                              style={{ width: '28px', height: '36px', border: (previewActiveImage === formImage) ? '1.5px solid var(--nv-gold, #fdbd16)' : '1px solid rgba(255,255,255,0.15)', borderRadius: '4px', overflow: 'hidden', backgroundColor: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer' }}
                            >
                              <img src={formImage} style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                            </div>
                          )}
                          {formBackImage && (
                            <div
                              onClick={() => setPreviewActiveImage(formBackImage)}
                              style={{ width: '28px', height: '36px', border: (previewActiveImage === formBackImage) ? '1.5px solid var(--nv-gold, #fdbd16)' : '1px solid rgba(255,255,255,0.15)', borderRadius: '4px', overflow: 'hidden', backgroundColor: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer' }}
                            >
                              <img src={formBackImage} style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                            </div>
                          )}
                          {formAdditionalImages.map((imgUrl, i) => (
                            <div
                              key={i}
                              onClick={() => setPreviewActiveImage(imgUrl)}
                              style={{ width: '28px', height: '36px', border: (previewActiveImage === imgUrl) ? '1.5px solid var(--nv-gold, #fdbd16)' : '1px solid rgba(255,255,255,0.15)', borderRadius: '4px', overflow: 'hidden', backgroundColor: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer' }}
                            >
                              <img src={imgUrl} style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Header details block */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <h3 style={{ fontSize: '15px', fontWeight: '800', margin: 0, color: '#fff', letterSpacing: '-0.3px', lineHeight: '1.2' }}>
                        {previewName || (lang === 'CZ' ? 'Název produktu' : 'Product Name')}
                      </h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--nv-gold, #fdbd16)' }}>
                        <span>★★★★★</span>
                        <span style={{ color: 'rgba(255,255,255,0.4)' }}>(5 {lang === 'CZ' ? 'recenzí' : 'reviews'})</span>
                      </div>

                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', margin: '8px 0 0 0', lineHeight: '1.4' }}>
                        {parseFormattedText(formShortDesc || (formDescBlocks.find(b => b.type === 'text')?.value?.split('.').slice(0, 2).filter(Boolean).join('. ') + '.') || (lang === 'CZ' ? 'Prázdný krátký popis...' : 'Teaser description empty...'), true)}
                      </div>
                    </div>

                    <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.08)', margin: 0 }} />

                    {/* Variant selectors for miniature preview */}
                    {formType === 'single' && (formVariants || []).length > 1 && (
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', fontSize: '10px' }}>
                        {previewAvailableConditions.length > 0 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: '1 1 50px' }}>
                            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '9px' }}>{lang === 'CZ' ? 'Stav:' : 'Condition:'}</span>
                            <select
                              value={previewCondition}
                              onChange={(e) => setPreviewCondition(e.target.value)}
                              style={{ backgroundColor: '#000', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '2px 4px', borderRadius: '4px', fontSize: '10px', width: '100%' }}
                            >
                              {previewAvailableConditions.map(cond => <option key={cond} value={cond}>{cond}</option>)}
                            </select>
                          </div>
                        )}
                        {previewAvailableLangs.length > 0 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: '1 1 50px' }}>
                            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '9px' }}>{lang === 'CZ' ? 'Jazyk:' : 'Lang:'}</span>
                            <select
                              value={previewLang}
                              onChange={(e) => setPreviewLang(e.target.value)}
                              style={{ backgroundColor: '#000', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '2px 4px', borderRadius: '4px', fontSize: '10px', width: '100%' }}
                            >
                              {previewAvailableLangs.map(lg => <option key={lg} value={lg}>{lg}</option>)}
                            </select>
                          </div>
                        )}
                        {previewAvailableFoils.length > 0 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: '1 1 60px' }}>
                            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '9px' }}>{lang === 'CZ' ? 'Úprava:' : 'Finish:'}</span>
                            <select
                              value={previewFoil ? 'foil' : 'non-foil'}
                              onChange={(e) => setPreviewFoil(e.target.value === 'foil')}
                              style={{ backgroundColor: '#000', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '2px 4px', borderRadius: '4px', fontSize: '10px', width: '100%' }}
                            >
                              {previewAvailableFoils.map(fl => <option key={fl ? 'foil' : 'non-foil'} value={fl ? 'foil' : 'non-foil'}>{fl ? 'Foil' : 'Non-Foil'}</option>)}
                            </select>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Pricing and Stock */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--nv-gold, #fdbd16)' }}>
                          {`${(previewPrice).toLocaleString('cs-CZ')} Kč`}
                        </div>
                        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                          {lang === 'CZ' ? 'Včetně DPH' : 'Incl. VAT'}
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: '11px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600' }}>
                          <span>●</span>
                          {previewStock > 0 ? (lang === 'CZ' ? `Skladem (${previewStock} ks)` : `In Stock (${previewStock} pcs)`) : (lang === 'CZ' ? 'Na objednávku' : 'Special Order')}
                        </div>
                      </div>
                    </div>

                    {/* Add to Cart button */}
                    <button type="button" disabled style={{ width: '100%', padding: '10px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: 'rgba(255,255,255,0.4)', fontWeight: 'bold', fontSize: '11px', cursor: 'not-allowed', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {lang === 'CZ' ? 'Do košíku' : 'Add to Cart'}
                    </button>

                    <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.08)', margin: 0 }} />

                    {/* Stacked Desc and Specs details */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                      {/* Description blocks loop */}
                      <div>
                        <h4 style={{ fontSize: '11px', textTransform: 'uppercase', color: '#fff', margin: '0 0 8px 0', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '4px', letterSpacing: '0.5px', fontWeight: '800' }}>
                          {lang === 'CZ' ? 'Popis produktu' : 'Description'}
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {formDescBlocks.map((block) => {
                            if (block.type === 'text') {
                              return (
                                <div key={block.id}>
                                  {block.value ? parseFormattedText(block.value, true) : (
                                    <p style={{ fontSize: '11px', margin: 0, color: 'rgba(255,255,255,0.5)' }}>
                                      {lang === 'CZ' ? 'Zatím bez textu...' : 'No text content...'}
                                    </p>
                                  )}
                                </div>
                              );
                            } else if (block.type === 'image') {
                              return (
                                <div key={block.id} className="desc-block-image-container" style={{ margin: '12px 0', display: 'flex', justifyContent: 'flex-start' }}>
                                  <img
                                    src={block.value || '/Northvale Logo.webp'}
                                    alt=""
                                    style={{ maxWidth: '100%', height: 'auto', borderRadius: '4px' }}
                                    onError={(e) => { e.target.onerror = null; e.target.src = '/Northvale Logo.webp'; }}
                                  />
                                </div>
                              );
                            }
                            return null;
                          })}
                        </div>
                      </div>

                      {/* Parametry list */}
                      <div>
                        <h4 style={{ fontSize: '11px', textTransform: 'uppercase', color: '#fff', margin: '0 0 8px 0', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '4px', letterSpacing: '0.5px', fontWeight: '800' }}>
                          {lang === 'CZ' ? 'Parametry produktu' : 'Specifications'}
                        </h4>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                          <tbody>
                            {formGame && (
                              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                <td style={{ padding: '6px 0', color: 'rgba(255,255,255,0.4)', textAlign: 'left' }}>{lang === 'CZ' ? 'Značka / Hra' : 'Game'}</td>
                                <td style={{ padding: '6px 0', textAlign: 'right', color: '#fff', fontWeight: '600' }}>{formGame}</td>
                              </tr>
                            )}
                            {formEdition && (
                              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                <td style={{ padding: '6px 0', color: 'rgba(255,255,255,0.4)', textAlign: 'left' }}>{lang === 'CZ' ? 'Edice / Sada' : 'Set / Expansion'}</td>
                                <td style={{ padding: '6px 0', textAlign: 'right', color: '#fff', fontWeight: '600' }}>{formEdition}</td>
                              </tr>
                            )}
                            {formSetCode && (
                              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                <td style={{ padding: '6px 0', color: 'rgba(255,255,255,0.4)', textAlign: 'left' }}>{lang === 'CZ' ? 'Zkratka edice' : 'Set Code'}</td>
                                <td style={{ padding: '6px 0', textAlign: 'right', color: '#fff', fontWeight: '600' }}>{formSetCode}</td>
                              </tr>
                            )}
                            {formRarity && (
                              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                <td style={{ padding: '6px 0', color: 'rgba(255,255,255,0.4)', textAlign: 'left' }}>{lang === 'CZ' ? 'Rarita' : 'Rarity'}</td>
                                <td style={{ padding: '6px 0', textAlign: 'right', color: '#fff', fontWeight: '600' }}>{formRarity}</td>
                              </tr>
                            )}
                            {formCardCode && (
                              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                <td style={{ padding: '6px 0', color: 'rgba(255,255,255,0.4)', textAlign: 'left' }}>{lang === 'CZ' ? 'Sběratelské číslo' : 'Collector Code'}</td>
                                <td style={{ padding: '6px 0', textAlign: 'right', color: '#fff', fontWeight: '600' }}>{formCardCode}</td>
                              </tr>
                            )}
                            {formType === 'single' && (
                              <>
                                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                  <td style={{ padding: '6px 0', color: 'rgba(255,255,255,0.4)', textAlign: 'left' }}>{lang === 'CZ' ? 'Stav karty' : 'Card Condition'}</td>
                                  <td style={{ padding: '6px 0', textAlign: 'right', color: '#fff', fontWeight: '600' }}>{previewCondition}</td>
                                </tr>
                                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                  <td style={{ padding: '6px 0', color: 'rgba(255,255,255,0.4)', textAlign: 'left' }}>{lang === 'CZ' ? 'Jazyk' : 'Language'}</td>
                                  <td style={{ padding: '6px 0', textAlign: 'right', color: '#fff', fontWeight: '600' }}>{previewLang === 'EN' ? (lang === 'CZ' ? 'Angličtina' : 'English') : previewLang === 'JP' ? (lang === 'CZ' ? 'Japonština' : 'Japanese') : previewLang}</td>
                                </tr>
                                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                  <td style={{ padding: '6px 0', color: 'rgba(255,255,255,0.4)', textAlign: 'left' }}>{lang === 'CZ' ? 'Provedení (Finish)' : 'Foiling / Finish'}</td>
                                  <td style={{ padding: '6px 0', textAlign: 'right', color: '#fff', fontWeight: '600' }}>{previewFoil ? (lang === 'CZ' ? 'Foil (lesklá) ✨' : 'Foil (shiny) ✨') : (lang === 'CZ' ? 'Non-Foil (klasická)' : 'Non-Foil (classic)')}</td>
                                </tr>
                              </>
                            )}
                            {formElement && (
                              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                <td style={{ padding: '6px 0', color: 'rgba(255,255,255,0.4)', textAlign: 'left' }}>{lang === 'CZ' ? 'Element / Barva / Typ' : 'Element / Color / Type'}</td>
                                <td style={{ padding: '6px 0', textAlign: 'right', color: '#fff', fontWeight: '600' }}>{formElement}</td>
                              </tr>
                            )}
                            {formStage && (
                              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                <td style={{ padding: '6px 0', color: 'rgba(255,255,255,0.4)', textAlign: 'left' }}>{lang === 'CZ' ? 'Vývojové stádium' : 'Stage'}</td>
                                <td style={{ padding: '6px 0', textAlign: 'right', color: '#fff', fontWeight: '600' }}>{formStage}</td>
                              </tr>
                            )}
                            {formIllustrator && (
                              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                <td style={{ padding: '6px 0', color: 'rgba(255,255,255,0.4)', textAlign: 'left' }}>{lang === 'CZ' ? 'Ilustrátor' : 'Illustrator'}</td>
                                <td style={{ padding: '6px 0', textAlign: 'right', color: '#fff', fontWeight: '600' }}>{formIllustrator}</td>
                              </tr>
                            )}
                            {formYear && (
                              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                <td style={{ padding: '6px 0', color: 'rgba(255,255,255,0.4)', textAlign: 'left' }}>{lang === 'CZ' ? 'Rok vydání' : 'Year'}</td>
                                <td style={{ padding: '6px 0', textAlign: 'right', color: '#fff', fontWeight: '600' }}>{formYear}</td>
                              </tr>
                            )}
                            {formType === 'sealed' && formPackagingType && (
                              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                <td style={{ padding: '6px 0', color: 'rgba(255,255,255,0.4)', textAlign: 'left' }}>{lang === 'CZ' ? 'Typ balení' : 'Packaging Type'}</td>
                                <td style={{ padding: '6px 0', textAlign: 'right', color: '#fff', fontWeight: '600' }}>{formPackagingType}</td>
                              </tr>
                            )}
                            {formType === 'sealed' && formLang && (
                              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                <td style={{ padding: '6px 0', color: 'rgba(255,255,255,0.4)', textAlign: 'left' }}>{lang === 'CZ' ? 'Jazyk' : 'Language'}</td>
                                <td style={{ padding: '6px 0', textAlign: 'right', color: '#fff', fontWeight: '600' }}>{formLang}</td>
                              </tr>
                            )}
                            {formType === 'sealed' && formBoosterCount && (
                              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                <td style={{ padding: '6px 0', color: 'rgba(255,255,255,0.4)', textAlign: 'left' }}>{lang === 'CZ' ? 'Počet boosterů' : 'Booster Count'}</td>
                                <td style={{ padding: '6px 0', textAlign: 'right', color: '#fff', fontWeight: '600' }}>{formBoosterCount}</td>
                              </tr>
                            )}
                            {formType === 'sealed' && formFoilCondition && (
                              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                <td style={{ padding: '6px 0', color: 'rgba(255,255,255,0.4)', textAlign: 'left' }}>{lang === 'CZ' ? 'Stav fólie' : 'Foil Condition'}</td>
                                <td style={{ padding: '6px 0', textAlign: 'right', color: '#fff', fontWeight: '600' }}>{formFoilCondition}</td>
                              </tr>
                            )}
                            {formType === 'slab' && formCompany && (
                              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                <td style={{ padding: '6px 0', color: 'rgba(255,255,255,0.4)', textAlign: 'left' }}>{lang === 'CZ' ? 'Firma' : 'Grading Company'}</td>
                                <td style={{ padding: '6px 0', textAlign: 'right', color: '#fff', fontWeight: '600' }}>{formCompany}</td>
                              </tr>
                            )}
                            {formType === 'slab' && formGrade && (
                              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                <td style={{ padding: '6px 0', color: 'rgba(255,255,255,0.4)', textAlign: 'left' }}>{lang === 'CZ' ? 'Známka' : 'Grade'}</td>
                                <td style={{ padding: '6px 0', textAlign: 'right', color: '#fff', fontWeight: '600' }}>{formGrade}</td>
                              </tr>
                            )}
                            {formType === 'slab' && formCertNumber && (
                              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                <td style={{ padding: '6px 0', color: 'rgba(255,255,255,0.4)', textAlign: 'left' }}>{lang === 'CZ' ? 'Certifikace' : 'Cert Number'}</td>
                                <td style={{ padding: '6px 0', textAlign: 'right', color: '#fff', fontWeight: '600' }}><code>{formCertNumber}</code></td>
                              </tr>
                            )}
                            {formType === 'accessory' && isAcrylic && (
                              <>
                                {formAcrylicThickness && (
                                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                    <td style={{ padding: '6px 0', color: 'rgba(255,255,255,0.4)', textAlign: 'left' }}>{lang === 'CZ' ? 'Tloušťka akrylu' : 'Acrylic Thickness'}</td>
                                    <td style={{ padding: '6px 0', textAlign: 'right', color: '#fff', fontWeight: '600' }}>{formAcrylicThickness} mm</td>
                                  </tr>
                                )}
                                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                  <td style={{ padding: '6px 0', color: 'rgba(255,255,255,0.4)', textAlign: 'left' }}>{lang === 'CZ' ? 'UV Ochrana' : 'UV Protection'}</td>
                                  <td style={{ padding: '6px 0', textAlign: 'right', color: '#fdbd16', fontWeight: '600' }}>{formUvProtection ? 'Ano (99%)' : 'Ne'}</td>
                                </tr>
                                {formClosingType && (
                                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                    <td style={{ padding: '6px 0', color: 'rgba(255,255,255,0.4)', textAlign: 'left' }}>{lang === 'CZ' ? 'Typ zavírání' : 'Closing Type'}</td>
                                    <td style={{ padding: '6px 0', textAlign: 'right', color: '#fff', fontWeight: '600' }}>{formClosingType}</td>
                                  </tr>
                                )}
                                {formInnerDimensions && (
                                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                    <td style={{ padding: '6px 0', color: 'rgba(255,255,255,0.4)', textAlign: 'left' }}>{lang === 'CZ' ? 'Vnitřní rozměry' : 'Inner Dimensions'}</td>
                                    <td style={{ padding: '6px 0', textAlign: 'right', color: '#fff', fontWeight: '600' }}>{formInnerDimensions}</td>
                                  </tr>
                                )}
                              </>
                            )}
                            {isAccessory && (
                              <>
                                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                  <td style={{ padding: '6px 0', color: 'rgba(255,255,255,0.4)', textAlign: 'left' }}>{lang === 'CZ' ? 'Typ příslušenství' : 'Accessory Type'}</td>
                                  <td style={{ padding: '6px 0', textAlign: 'right', color: '#fff', fontWeight: '600' }}>{getPreviewAccType()}</td>
                                </tr>
                                {previewAccBrand && previewAccBrand !== 'Other' && previewAccBrand !== 'Ostatní' && (
                                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                    <td style={{ padding: '6px 0', color: 'rgba(255,255,255,0.4)', textAlign: 'left' }}>{lang === 'CZ' ? 'Značka' : 'Brand'}</td>
                                    <td style={{ padding: '6px 0', textAlign: 'right', color: '#fff', fontWeight: '600' }}>{previewAccBrand}</td>
                                  </tr>
                                )}
                                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                  <td style={{ padding: '6px 0', color: 'rgba(255,255,255,0.4)', textAlign: 'left' }}>{lang === 'CZ' ? 'Rozměr' : 'Size'}</td>
                                  <td style={{ padding: '6px 0', textAlign: 'right', color: '#fff', fontWeight: '600' }}>{previewAccSize}</td>
                                </tr>
                                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                  <td style={{ padding: '6px 0', color: 'rgba(255,255,255,0.4)', textAlign: 'left' }}>{lang === 'CZ' ? 'Balení' : 'Package'}</td>
                                  <td style={{ padding: '6px 0', textAlign: 'right', color: '#fff', fontWeight: '600' }}>{previewAccCount}</td>
                                </tr>
                                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                  <td style={{ padding: '6px 0', color: 'rgba(255,255,255,0.4)', textAlign: 'left' }}>{lang === 'CZ' ? 'Materiál' : 'Material'}</td>
                                  <td style={{ padding: '6px 0', textAlign: 'right', color: '#fff', fontWeight: '600' }}>{previewAccMaterial}</td>
                                </tr>
                                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                  <td style={{ padding: '6px 0', color: 'rgba(255,255,255,0.4)', textAlign: 'left' }}>{lang === 'CZ' ? 'Barva' : 'Color'}</td>
                                  <td style={{ padding: '6px 0', textAlign: 'right', color: '#fff', fontWeight: '600' }}>{previewAccColor}</td>
                                </tr>
                              </>
                            )}
                            {formCustomParams && formCustomParams.map((cp, idx) => (
                              <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                <td style={{ padding: '6px 0', color: 'rgba(255,255,255,0.4)', textAlign: 'left' }}>{cp.label}</td>
                                <td style={{ padding: '6px 0', textAlign: 'right', color: '#fff', fontWeight: '600' }}>{cp.value}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                    </div>

                  </div>
                </div>

              </div> {/* Closes Row 2 flex container */}

              {/* MODAL FOOTER */}
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

            {isFullPreviewOpen && (
              <div
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: '#0b0c10', // Actual storefront dark background
                  zIndex: 2000000,
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'stretch',
                  boxSizing: 'border-box',
                  fontFamily: "'Inter Tight', sans-serif"
                }}
                className="fade-in"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Admin Sticky Control Bar */}
                <div style={{
                  position: 'sticky',
                  top: 0,
                  width: '100%',
                  backgroundColor: '#12131a',
                  borderBottom: '1.5px solid var(--nv-gold, #fdbd16)',
                  padding: '12px 24px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  zIndex: 2000010,
                  boxSizing: 'border-box',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--nv-gold, #fdbd16)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                      {lang === 'CZ' ? 'ŽIVÝ NÁHLED CELÉ STRÁNKY (STOREFRONT)' : 'FULL STOREFRONT PAGE LIVE PREVIEW'}
                    </span>
                    <span style={{ fontSize: '11px', color: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.08)', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>
                      {lang === 'CZ' ? 'Aktivní zobrazení' : 'Live View'}
                    </span>
                  </div>
                  <button
                    type="button"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      color: '#fff',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      padding: '8px 20px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                    }}
                    onClick={() => setIsFullPreviewOpen(false)}
                  >
                    ✕ {lang === 'CZ' ? 'Zavřít náhled' : 'Close Preview'}
                  </button>
                </div>

                {/* 1. STOREFRONT TOP BAR */}
                <div style={{
                  backgroundColor: '#07080a',
                  borderBottom: '1px solid rgba(255,255,255,0.03)',
                  padding: '8px 0',
                  fontSize: '12px',
                  color: 'rgba(255, 255, 255, 0.5)'
                }}>
                  <div className="container" style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    maxWidth: '1200px',
                    margin: '0 auto',
                    padding: '0 16px',
                    boxSizing: 'border-box'
                  }}>
                    <div style={{ textAlign: 'left' }}>
                      {lang === 'CZ' ? 'Potřebujete poradit? Podívejte se na ' : 'Need help? Check out '}
                      <strong style={{ color: 'var(--nv-gold, #fdbd16)', cursor: 'pointer' }}>
                        {lang === 'CZ' ? 'nejčastější dotazy' : 'frequently asked questions'}
                      </strong>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                        {lang === 'CZ' ? (
                          <>
                            <img src="/cz ikona.png" alt="CZ" style={{ width: '16px', height: '11px', objectFit: 'contain' }} />
                            <span>Čeština</span>
                          </>
                        ) : (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 30" style={{ width: '16px', height: '11px', objectFit: 'contain' }}>
                              <clipPath id="s-preview">
                                <path d="M0,0 v30 h60 v-30 z" />
                              </clipPath>
                              <path d="M0,0 v30 h60 v-30 z" fill="#012169" />
                              <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" clipPath="url(#s-preview)" />
                              <path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" strokeWidth="4" clipPath="url(#s-preview)" />
                              <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10" />
                              <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6" />
                            </svg>
                            <span>English</span>
                          </>
                        )}
                        <span style={{ fontSize: '9px', opacity: 0.5 }}>▼</span>
                      </div>
                      <span style={{ opacity: 0.2 }}>|</span>
                      <span style={{ cursor: 'pointer' }}>Kontakt</span>
                      <span style={{ opacity: 0.2 }}>|</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <img src="/instagram.png" alt="Instagram" style={{ width: '14px', height: '14px', filter: 'brightness(0.8)' }} />
                        <img src="/facebook.png" alt="Facebook" style={{ width: '14px', height: '14px', filter: 'brightness(0.8)' }} />
                        <img src="/tik-tok.png" alt="TikTok" style={{ width: '14px', height: '14px', filter: 'brightness(0.8)' }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. STOREFRONT MIDDLE BAR */}
                <div style={{
                  backgroundColor: '#0b0c10',
                  padding: '20px 0',
                  borderBottom: '1px solid rgba(255,255,255,0.03)'
                }}>
                  <div className="container" style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    maxWidth: '1200px',
                    margin: '0 auto',
                    padding: '0 16px',
                    boxSizing: 'border-box',
                    gap: '24px',
                    flexWrap: 'wrap'
                  }}>
                    {/* Logo */}
                    <div style={{ cursor: 'pointer' }}>
                      <img src="/logo s popisem.webp" alt="NORTHVALE TCG" style={{ height: '42px', objectFit: 'contain' }} />
                    </div>

                    {/* Mock Search Form */}
                    <div style={{
                      flex: 1,
                      maxWidth: '520px',
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center'
                    }}>
                      <input
                        type="text"
                        placeholder={lang === 'CZ' ? 'Vyhledat karty, sady, příslušenství...' : 'Search cards, sets, accessories...'}
                        disabled
                        style={{
                          width: '100%',
                          backgroundColor: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: '8px',
                          padding: '12px 48px 12px 16px',
                          color: '#fff',
                          fontSize: '14px',
                          outline: 'none'
                        }}
                      />
                      <button type="button" style={{
                        position: 'absolute',
                        right: '4px',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '8px'
                      }}>
                        <img src="/search.png" alt="Search" style={{ width: '18px', height: '18px', filter: 'brightness(0.9)' }} />
                      </button>
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                      <div className="nav-action-btn" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer', background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)' }}>
                        <img src="/heart.png" alt="Oblíbené" style={{ width: '20px', height: '20px' }} />
                        <span style={{ fontSize: '11px', fontWeight: '500' }}>{lang === 'CZ' ? 'Oblíbené' : 'Favorites'}</span>
                      </div>
                      <div className="nav-action-btn" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer', background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)' }}>
                        <img src="/user.png" alt="Profil" style={{ width: '20px', height: '20px' }} />
                        <span style={{ fontSize: '11px', fontWeight: '500' }}>{lang === 'CZ' ? 'Northvale admin' : 'My Account'}</span>
                      </div>
                      <div className="nav-action-btn" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer', background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', position: 'relative' }}>
                        <div style={{ position: 'relative' }}>
                          <img src="/shopping-cart.png" alt="Košík" style={{ width: '20px', height: '20px' }} />
                          <span style={{
                            position: 'absolute',
                            top: '-8px',
                            right: '-10px',
                            backgroundColor: 'var(--nv-gold, #fdbd16)',
                            color: '#000',
                            borderRadius: '50%',
                            width: '15px',
                            height: '15px',
                            fontSize: '9px',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>0</span>
                        </div>
                        <span style={{ fontSize: '11px', fontWeight: '500' }}>{lang === 'CZ' ? 'Košík' : 'Cart'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. STOREFRONT BOTTOM BAR (Categories) */}
                <div style={{
                  backgroundColor: '#0b0c10',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                  padding: '12px 0'
                }}>
                  <div className="container" style={{
                    display: 'flex',
                    alignItems: 'center',
                    maxWidth: '1200px',
                    margin: '0 auto',
                    padding: '0 16px',
                    boxSizing: 'border-box',
                    gap: '28px',
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#fff',
                    flexWrap: 'wrap'
                  }}>
                    <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      Pokémon <span style={{ fontSize: '8px', opacity: 0.5 }}>▼</span>
                    </div>
                    <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      Disney Lorcana <span style={{ fontSize: '8px', opacity: 0.5 }}>▼</span>
                    </div>
                    <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      One Piece <span style={{ fontSize: '8px', opacity: 0.5 }}>▼</span>
                    </div>
                    <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--nv-gold, #fdbd16)' }}>
                      Riftbound <span style={{ fontSize: '8px', opacity: 0.5 }}>▼</span>
                    </div>
                    <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {lang === 'CZ' ? 'Příslušenství' : 'Accessories'} <span style={{ fontSize: '8px', opacity: 0.5 }}>▼</span>
                    </div>
                    <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {lang === 'CZ' ? 'Akryly' : 'Acrylics'} <span style={{ fontSize: '8px', opacity: 0.5 }}>▼</span>
                    </div>
                    {FEATURE_FLAGS.showSlabs && (
                      <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {lang === 'CZ' ? 'Ohodnocené karty' : 'Graded Cards'} <span style={{ fontSize: '8px', opacity: 0.5 }}>▼</span>
                      </div>
                    )}
                    <div style={{ marginLeft: 'auto', opacity: 0.5, cursor: 'pointer' }}>
                      ☰
                    </div>
                  </div>
                </div>

                {/* 4. STOREFRONT CONTENT CONTAINER */}
                <div style={{
                  width: '100%',
                  backgroundColor: '#0b0c10',
                  padding: '32px 0 64px 0',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  flex: 1
                }}>
                  <div className="container" style={{
                    width: '100%',
                    maxWidth: '1200px',
                    padding: '0 16px',
                    boxSizing: 'border-box'
                  }}>

                    {/* BREADCRUMBS */}
                    <nav className="breadcrumbs-nav" style={{ marginBottom: '32px' }}>
                      <span className="breadcrumb-item" style={{ cursor: 'pointer' }}>{lang === 'CZ' ? 'Domů' : 'Home'}</span>
                      <span className="breadcrumb-separator">/</span>
                      <span className="breadcrumb-item" style={{ cursor: 'pointer' }}>{formGame}</span>
                      <span className="breadcrumb-separator">/</span>
                      <span className="breadcrumb-item active">{previewName || (lang === 'CZ' ? 'Název produktu' : 'Product Name')}</span>
                    </nav>

                    {/* MAIN TWO-COLUMN GRID */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
                      gap: '64px',
                      alignItems: 'start',
                      marginBottom: '64px'
                    }}>

                      {/* LEFT COLUMN: Clean Gallery */}
                      <div className="product-detail-left-col" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <div className="detail-gallery-wrapper" style={{ position: 'relative' }}>
                          <div className="detail-clean-image-container">
                            <img
                              src={previewActiveImage || formImage || '/Northvale Logo.webp'}
                              alt="Product Main Preview"
                              onError={(e) => { e.target.onerror = null; e.target.src = '/Northvale Logo.webp'; }}
                            />
                          </div>
                        </div>

                        {/* Thumbnails */}
                        {(formBackImage || formAdditionalImages.length > 0) && (
                          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
                            {formImage && (
                              <div
                                onClick={() => setPreviewActiveImage(formImage)}
                                style={{ width: '60px', height: '80px', border: previewActiveImage === formImage ? '2px solid var(--nv-gold, #fdbd16)' : '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', overflow: 'hidden', backgroundColor: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                              >
                                <img src={formImage} style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                              </div>
                            )}
                            {formBackImage && (
                              <div
                                onClick={() => setPreviewActiveImage(formBackImage)}
                                style={{ width: '60px', height: '80px', border: previewActiveImage === formBackImage ? '2px solid var(--nv-gold, #fdbd16)' : '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', overflow: 'hidden', backgroundColor: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                              >
                                <img src={formBackImage} style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                              </div>
                            )}
                            {formAdditionalImages.map((imgUrl, i) => (
                              <div
                                key={i}
                                onClick={() => setPreviewActiveImage(imgUrl)}
                                style={{ width: '60px', height: '80px', border: previewActiveImage === imgUrl ? '2px solid var(--nv-gold, #fdbd16)' : '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', overflow: 'hidden', backgroundColor: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                              >
                                <img src={imgUrl} style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* RIGHT COLUMN: Buy block, title, stars */}
                      <div className="product-detail-right-col" style={{ display: 'flex', flexDirection: 'column', gap: '24px', textAlign: 'left' }}>

                        {/* Title, Brand, rating */}
                        <div>
                          <h2 style={{
                            fontSize: '36px',
                            fontWeight: '900',
                            color: '#fff',
                            margin: '0 0 12px 0',
                            fontFamily: "'Outfit', sans-serif",
                            lineHeight: '1.2',
                            letterSpacing: '-0.5px'
                          }}>
                            {previewName || (lang === 'CZ' ? 'Název produktu' : 'Product Name')}
                          </h2>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--nv-gold, #fdbd16)' }}>
                            <span>★★★★★</span>
                            <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: '500', cursor: 'pointer' }}>
                              (12 {lang === 'CZ' ? 'hodnocení' : 'reviews'})
                            </span>
                          </div>
                        </div>

                        {/* Short Teaser with left golden line */}
                        <div style={{
                          fontSize: '15px',
                          color: 'rgba(255,255,255,0.75)',
                          margin: 0,
                          lineHeight: '1.6',
                          borderLeft: '2px solid var(--nv-gold, #fdbd16)',
                          paddingLeft: '16px'
                        }}>
                          {parseFormattedText(formShortDesc || (formDescBlocks.find(b => b.type === 'text')?.value?.split('.').slice(0, 2).filter(Boolean).join('. ') + '.') || (lang === 'CZ' ? 'Tento produkt zatím nemá žádný krátký popis.' : 'No short description provided yet.'))}
                          <span style={{ color: 'var(--nv-gold, #fdbd16)', cursor: 'pointer', marginLeft: '6px' }}>
                            {lang === 'CZ' ? ' Víc informací' : ' More info'}
                          </span>
                        </div>

                        {/* Variant selectors (if single) */}
                        {formType === 'single' && (formVariants || []).length > 1 && (
                          <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                            backgroundColor: 'rgba(255,255,255,0.02)',
                            padding: '16px',
                            borderRadius: '12px',
                            border: '1px solid rgba(255,255,255,0.08)',
                          }}>
                            <h4 style={{ fontSize: '13px', fontWeight: '700', margin: 0, color: '#fff' }}>
                              {lang === 'CZ' ? 'Výběr varianty karty:' : 'Select Card Variant:'}
                            </h4>
                            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                              {previewAvailableConditions.length > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: '1 1 120px' }}>
                                  <label style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', fontWeight: '600', textTransform: 'uppercase' }}>{lang === 'CZ' ? 'Stav karty:' : 'Card Condition:'}</label>
                                  <select
                                    value={previewCondition}
                                    onChange={(e) => setPreviewCondition(e.target.value)}
                                    style={{ backgroundColor: '#000', border: '1px solid rgba(255,255,255,0.12)', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', color: '#fff', outline: 'none', cursor: 'pointer' }}
                                  >
                                    {previewAvailableConditions.map(cond => (
                                      <option key={cond} value={cond}>{cond}</option>
                                    ))}
                                  </select>
                                </div>
                              )}

                              {previewAvailableLangs.length > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: '1 1 120px' }}>
                                  <label style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', fontWeight: '600', textTransform: 'uppercase' }}>{lang === 'CZ' ? 'Jazyk karty:' : 'Card Language:'}</label>
                                  <select
                                    value={previewLang}
                                    onChange={(e) => setPreviewLang(e.target.value)}
                                    style={{ backgroundColor: '#000', border: '1px solid rgba(255,255,255,0.12)', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', color: '#fff', outline: 'none', cursor: 'pointer' }}
                                  >
                                    {previewAvailableLangs.map(lg => (
                                      <option key={lg} value={lg}>
                                        {lg === 'EN' ? (lang === 'CZ' ? 'Angličtina (EN)' : 'English (EN)') : lg === 'JP' ? (lang === 'CZ' ? 'Japonština (JP)' : 'Japanese (JP)') : lg}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              )}

                              {previewAvailableFoils.length > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: '1 1 120px' }}>
                                  <label style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', fontWeight: '600', textTransform: 'uppercase' }}>{lang === 'CZ' ? 'Provedení:' : 'Finish:'}</label>
                                  <select
                                    value={previewFoil ? 'foil' : 'non-foil'}
                                    onChange={(e) => setPreviewFoil(e.target.value === 'foil')}
                                    style={{ backgroundColor: '#000', border: '1px solid rgba(255,255,255,0.12)', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', color: '#fff', outline: 'none', cursor: 'pointer' }}
                                  >
                                    {previewAvailableFoils.map(fl => (
                                      <option key={fl ? 'foil' : 'non-foil'} value={fl ? 'foil' : 'non-foil'}>
                                        {fl ? (lang === 'CZ' ? 'Foil (lesklá)' : 'Foil (shiny)') : (lang === 'CZ' ? 'Non-Foil (klasická)' : 'Non-Foil (classic)')}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        <hr style={{ border: 'none', borderBottom: '1px solid rgba(255,255,255,0.06)', margin: 0 }} />

                        {/* Buy Box Group */}
                        <div style={{
                          background: 'rgba(255, 255, 255, 0.01)',
                          border: '1px solid rgba(255, 255, 255, 0.05)',
                          borderRadius: '16px',
                          padding: '24px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '24px'
                        }}>

                          {/* Price & Stock info */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ fontSize: '32px', fontWeight: '900', color: 'var(--nv-gold, #fdbd16)', fontFamily: "'Outfit', sans-serif" }}>
                                {`${(previewPrice).toLocaleString('cs-CZ')} Kč`}
                              </div>
                              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
                                {lang === 'CZ'
                                  ? `Bez DPH: ${Math.round(previewPrice / 1.21).toLocaleString('cs-CZ')} Kč`
                                  : `Excl. VAT: ${Math.round(previewPrice / 1.21).toLocaleString('cs-CZ')} CZK`}
                              </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                              <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontSize: '13px',
                                fontWeight: '700',
                                color: previewStock > 0 ? '#10b981' : '#ef4444',
                                backgroundColor: previewStock > 0 ? 'rgba(16, 185, 129, 0.06)' : 'rgba(239, 68, 68, 0.06)',
                                padding: '6px 12px',
                                borderRadius: '999px',
                                border: previewStock > 0 ? '1px solid rgba(16, 185, 129, 0.12)' : '1px solid rgba(239, 68, 68, 0.12)'
                              }}>
                                <span style={{ fontSize: '8px' }}>●</span>
                                {previewStock > 0
                                  ? (lang === 'CZ' ? `Skladem (${previewStock} ks)` : `In Stock (${previewStock} pcs)`)
                                  : (lang === 'CZ' ? 'Na objednávku' : 'Out of Stock')}
                              </div>
                              <span style={{ fontSize: '11px', color: 'var(--nv-gold, #fdbd16)', textDecoration: 'underline', cursor: 'pointer' }}>
                                {lang === 'CZ' ? 'Možnosti doručení' : 'Delivery options'}
                              </span>
                            </div>
                          </div>

                          {/* Qty and button */}
                          <div style={{ display: 'flex', gap: '16px' }}>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              border: '1px solid rgba(255,255,255,0.12)',
                              borderRadius: '8px',
                              overflow: 'hidden',
                              height: '48px',
                              width: '100px',
                              justifyContent: 'center',
                              color: '#fff',
                              fontWeight: 'bold',
                              fontSize: '15px'
                            }}>
                              <span style={{ opacity: 0.5, cursor: 'not-allowed', padding: '0 10px' }}>−</span>
                              <span style={{ width: '30px', textAlign: 'center' }}>1</span>
                              <span style={{ opacity: 0.5, cursor: 'not-allowed', padding: '0 10px' }}>+</span>
                            </div>

                            <button type="button" disabled style={{
                              flex: 1,
                              height: '48px',
                              backgroundColor: 'var(--nv-gold, #fdbd16)',
                              border: 'none',
                              borderRadius: '8px',
                              color: '#000',
                              fontWeight: '900',
                              fontSize: '13px',
                              textTransform: 'uppercase',
                              letterSpacing: '0.8px',
                              cursor: 'not-allowed',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '8px'
                            }}>
                              Do košíku
                            </button>
                          </div>

                          {/* Secondary actions */}
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(4, 1fr)',
                            gap: '8px',
                            borderTop: '1px solid rgba(255,255,255,0.06)',
                            paddingTop: '16px'
                          }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', fontSize: '11px' }}>
                              <svg style={{ width: '16px', height: '16px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
                              <span>{lang === 'CZ' ? 'Oblíbené' : 'Favorites'}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', fontSize: '11px' }}>
                              <svg style={{ width: '16px', height: '16px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                              <span>{lang === 'CZ' ? 'Zeptat se' : 'Ask'}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', fontSize: '11px' }}>
                              <svg style={{ width: '16px', height: '16px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
                              <span>{lang === 'CZ' ? 'Upozornění' : 'Watchdog'}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', fontSize: '11px' }}>
                              <svg style={{ width: '16px', height: '16px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>
                              <span>{lang === 'CZ' ? 'Sdílet' : 'Share'}</span>
                            </div>
                          </div>

                        </div>

                        {/* Trust Badges */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(4, 1fr)',
                          gap: '12px',
                          marginTop: '8px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '20px', height: '20px', color: 'rgba(255,255,255,0.5)', flexShrink: 0 }}>
                              <rect x="1" y="3" width="15" height="13" />
                              <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                              <circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
                            </svg>
                            <div style={{ textAlign: 'left', lineHeight: '1.2' }}>
                              <div style={{ fontSize: '10px', color: '#fff', fontWeight: 'bold' }}>{lang === 'CZ' ? 'Doprava zdarma' : 'Free Shipping'}</div>
                              <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.4)', marginTop: '1px' }}>{lang === 'CZ' ? 'nad 1 500 Kč' : 'over 1,500 CZK'}</div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '20px', height: '20px', color: 'rgba(255,255,255,0.5)', flexShrink: 0 }}>
                              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                            </svg>
                            <div style={{ textAlign: 'left', lineHeight: '1.2' }}>
                              <div style={{ fontSize: '10px', color: '#fff', fontWeight: 'bold' }}>{lang === 'CZ' ? 'Rychlost' : 'Fast Delivery'}</div>
                              <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.4)', marginTop: '1px' }}>{lang === 'CZ' ? 'Odesíláme do 24h' : 'Within 24h'}</div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '20px', height: '20px', color: 'rgba(255,255,255,0.5)', flexShrink: 0 }}>
                              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><polyline points="9 11 11 13 15 9" />
                            </svg>
                            <div style={{ textAlign: 'left', lineHeight: '1.2' }}>
                              <div style={{ fontSize: '10px', color: '#fff', fontWeight: 'bold' }}>{lang === 'CZ' ? '100% Originál' : '100% Genuine'}</div>
                              <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.4)', marginTop: '1px' }}>{lang === 'CZ' ? 'Od distributorů' : 'From distributors'}</div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '20px', height: '20px', color: 'rgba(255,255,255,0.5)', flexShrink: 0 }}>
                              <rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" />
                            </svg>
                            <div style={{ textAlign: 'left', lineHeight: '1.2' }}>
                              <div style={{ fontSize: '10px', color: '#fff', fontWeight: 'bold' }}>{lang === 'CZ' ? 'Bezpečná platba' : 'Secure Pay'}</div>
                              <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.4)', marginTop: '1px' }}>{lang === 'CZ' ? 'Karta, převod' : 'Card, transfer'}</div>
                            </div>
                          </div>
                        </div>



                      </div>
                    </div>

                    {/* HORIZONTAL TABS BAR */}
                    <div className="product-tabs-wrapper" style={{ margin: '48px 0 32px 0' }}>
                      <div className="product-tabs-nav">
                        <button
                          className={`product-tab-btn ${previewActiveTab === 'popis' ? 'active' : ''}`}
                          onClick={() => setPreviewActiveTab('popis')}
                        >
                          <svg className="tab-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" /><line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" /><line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" /><line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" />
                          </svg>
                          <span>{lang === 'CZ' ? 'Popis a parametry' : 'Description & Specs'}</span>
                        </button>
                        <button
                          className={`product-tab-btn ${previewActiveTab === 'hodnoceni' ? 'active' : ''}`}
                          onClick={() => setPreviewActiveTab('hodnoceni')}
                        >
                          <svg className="tab-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                          </svg>
                          <span>{lang === 'CZ' ? 'Hodnocení' : 'Reviews'}</span>
                        </button>
                        <button
                          className={`product-tab-btn ${previewActiveTab === 'diskuse' ? 'active' : ''}`}
                          onClick={() => setPreviewActiveTab('diskuse')}
                        >
                          <svg className="tab-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17 8h2a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-2v4l-4-4H9a1.9 1.9 0 0 1-2-2" /><path d="M3 14V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-4 4v-4H3z" />
                          </svg>
                          <span>{lang === 'CZ' ? 'Diskuze' : 'Discussion'}</span>
                        </button>
                        <button
                          className={`product-tab-btn ${previewActiveTab === 'souvisejici' ? 'active' : ''}`}
                          onClick={() => setPreviewActiveTab('souvisejici')}
                        >
                          <svg className="tab-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
                          </svg>
                          <span>{lang === 'CZ' ? 'Související produkty' : 'Related Products'}</span>
                        </button>
                        <button
                          className={`product-tab-btn ${previewActiveTab === 'podobne' ? 'active' : ''}`}
                          onClick={() => setPreviewActiveTab('podobne')}
                        >
                          <svg className="tab-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                          </svg>
                          <span>{lang === 'CZ' ? 'Podobné produkty' : 'Similar Products'}</span>
                        </button>
                      </div>
                    </div>

                    {/* TAB CONTENT BLOCK */}
                    <div>
                      {previewActiveTab === 'popis' && (
                        <div className="tab-popis-layout" style={{ textAlign: 'left' }}>

                          {/* Left Column: Descriptions */}
                          <div className="tab-popis-left-col">
                            <div>
                              <h3 className="detail-section-title" style={{ marginTop: 0 }}>
                                {lang === 'CZ' ? 'Popis produktu' : 'Product Description'}
                              </h3>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                {formDescBlocks.map((block) => {
                                  if (block.type === 'text') {
                                    return (
                                      <div key={block.id}>
                                        {block.value ? parseFormattedText(block.value) : (
                                          <p style={{ fontSize: '14.5px', margin: 0, color: 'rgba(255,255,255,0.5)' }}>
                                            {lang === 'CZ' ? 'Tento popis je zatím prázdný...' : 'No description content yet...'}
                                          </p>
                                        )}
                                      </div>
                                    );
                                  } else if (block.type === 'image') {
                                    return (
                                      <div key={block.id} className="desc-block-image-container" style={{ margin: '16px 0', display: 'flex', justifyContent: 'flex-start' }}>
                                        <img
                                          src={block.value || '/Northvale Logo.webp'}
                                          alt=""
                                          style={{ maxWidth: '100%', height: 'auto', borderRadius: '8px' }}
                                          onError={(e) => { e.target.onerror = null; e.target.src = '/Northvale Logo.webp'; }}
                                        />
                                      </div>
                                    );
                                  }
                                  return null;
                                })}
                              </div>
                            </div>


                          </div>

                          {/* Right Column: Parameters inside custom-panel */}
                          <div className="tab-popis-right-col">
                            <div className="custom-detail-panel" style={{ padding: '32px', width: '100%', boxSizing: 'border-box' }}>
                              <h3 className="detail-section-title" style={{ marginTop: 0 }}>
                                {lang === 'CZ' ? 'Parametry produktu' : 'Product Specs'}
                              </h3>

                              <table className="tab-popis-specs-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <tbody>
                                  {formGame && (
                                    <tr>
                                      <td>{lang === 'CZ' ? 'Značka / Hra' : 'Game'}</td>
                                      <td>{formGame}</td>
                                    </tr>
                                  )}
                                  {formEdition && (
                                    <tr>
                                      <td>{lang === 'CZ' ? 'Edice / Sada' : 'Set / Expansion'}</td>
                                      <td>{formEdition}</td>
                                    </tr>
                                  )}
                                  {formSetCode && (
                                    <tr>
                                      <td>{lang === 'CZ' ? 'Zkratka edice' : 'Set Code'}</td>
                                      <td>{formSetCode}</td>
                                    </tr>
                                  )}
                                  {formRarity && (
                                    <tr>
                                      <td>{lang === 'CZ' ? 'Rarita' : 'Rarity'}</td>
                                      <td>{formRarity}</td>
                                    </tr>
                                  )}
                                  {formCardCode && (
                                    <tr>
                                      <td>{lang === 'CZ' ? 'Sběratelské číslo' : 'Collector Code'}</td>
                                      <td>{formCardCode}</td>
                                    </tr>
                                  )}
                                  {formType === 'single' && (
                                    <>
                                      <tr>
                                        <td>{lang === 'CZ' ? 'Stav karty' : 'Condition'}</td>
                                        <td>{previewCondition}</td>
                                      </tr>
                                      <tr>
                                        <td>{lang === 'CZ' ? 'Jazyk' : 'Language'}</td>
                                        <td>{previewLang === 'EN' ? (lang === 'CZ' ? 'Angličtina' : 'English') : previewLang === 'JP' ? (lang === 'CZ' ? 'Japonština' : 'Japanese') : previewLang}</td>
                                      </tr>
                                      <tr>
                                        <td>{lang === 'CZ' ? 'Provedení (Finish)' : 'Foiling / Finish'}</td>
                                        <td>{previewFoil ? (lang === 'CZ' ? 'Foil (lesklá) ✨' : 'Foil (shiny) ✨') : (lang === 'CZ' ? 'Non-Foil (klasická)' : 'Non-Foil (classic)')}</td>
                                      </tr>
                                    </>
                                  )}
                                  {formElement && (
                                    <tr>
                                      <td>{lang === 'CZ' ? 'Element / Barva / Typ' : 'Element / Color / Type'}</td>
                                      <td>{formElement}</td>
                                    </tr>
                                  )}
                                  {formStage && (
                                    <tr>
                                      <td>{lang === 'CZ' ? 'Vývojové stádium' : 'Stage'}</td>
                                      <td>{formStage}</td>
                                    </tr>
                                  )}
                                  {formIllustrator && (
                                    <tr>
                                      <td>{lang === 'CZ' ? 'Ilustrátor' : 'Illustrator'}</td>
                                      <td>{formIllustrator}</td>
                                    </tr>
                                  )}
                                  {formYear && (
                                    <tr>
                                      <td>{lang === 'CZ' ? 'Rok vydání' : 'Year'}</td>
                                      <td>{formYear}</td>
                                    </tr>
                                  )}
                                  {formType === 'sealed' && (
                                    <>
                                      {formPackagingType && (
                                        <tr>
                                          <td>{lang === 'CZ' ? 'Typ balení' : 'Packaging Type'}</td>
                                          <td>{formPackagingType}</td>
                                        </tr>
                                      )}
                                      {formBoosterCount && (
                                        <tr>
                                          <td>{lang === 'CZ' ? 'Počet boosterů' : 'Booster Count'}</td>
                                          <td>{formBoosterCount} ks</td>
                                        </tr>
                                      )}
                                      {formFoilCondition && (
                                        <tr>
                                          <td>{lang === 'CZ' ? 'Stav fólie' : 'Foil Condition'}</td>
                                          <td>{formFoilCondition}</td>
                                        </tr>
                                      )}
                                    </>
                                  )}
                                  {formType === 'slab' && (
                                    <>
                                      {formCompany && (
                                        <tr>
                                          <td>{lang === 'CZ' ? 'Firma' : 'Grading Company'}</td>
                                          <td>{formCompany}</td>
                                        </tr>
                                      )}
                                      {formGrade && (
                                        <tr>
                                          <td>{lang === 'CZ' ? 'Známka' : 'Grade'}</td>
                                          <td>{formGrade}</td>
                                        </tr>
                                      )}
                                      {formCertNumber && (
                                        <tr>
                                          <td>{lang === 'CZ' ? 'Certifikace' : 'Cert Number'}</td>
                                          <td><code>{formCertNumber}</code></td>
                                        </tr>
                                      )}
                                    </>
                                  )}
                                  {formType === 'accessory' && isAcrylic && (
                                    <>
                                      {formAcrylicThickness && (
                                        <tr>
                                          <td>{lang === 'CZ' ? 'Tloušťka akrylu' : 'Acrylic Thickness'}</td>
                                          <td>{formAcrylicThickness} mm</td>
                                        </tr>
                                      )}
                                      <tr>
                                        <td>{lang === 'CZ' ? 'UV Ochrana' : 'UV Protection'}</td>
                                        <td style={{ color: 'var(--nv-gold, #fdbd16)', fontWeight: '600' }}>{formUvProtection ? (lang === 'CZ' ? 'Ano (99% ochrana)' : 'Yes (99% protection)') : (lang === 'CZ' ? 'Ne' : 'No')}</td>
                                      </tr>
                                      {formClosingType && (
                                        <tr>
                                          <td>{lang === 'CZ' ? 'Typ zavírání' : 'Closing Type'}</td>
                                          <td>{formClosingType}</td>
                                        </tr>
                                      )}
                                      {formInnerDimensions && (
                                        <tr>
                                          <td>{lang === 'CZ' ? 'Vnitřní rozměry' : 'Inner Dimensions'}</td>
                                          <td>{formInnerDimensions}</td>
                                        </tr>
                                      )}
                                    </>
                                  )}
                                  {isAccessory && (
                                    <>
                                      <tr>
                                        <td>{lang === 'CZ' ? 'Typ příslušenství' : 'Accessory Type'}</td>
                                        <td>{getPreviewAccType()}</td>
                                      </tr>
                                      {previewAccBrand && previewAccBrand !== 'Other' && previewAccBrand !== 'Ostatní' && (
                                        <tr>
                                          <td>{lang === 'CZ' ? 'Výrobce / Značka' : 'Manufacturer / Brand'}</td>
                                          <td><strong>{previewAccBrand}</strong></td>
                                        </tr>
                                      )}
                                      <tr>
                                        <td>{lang === 'CZ' ? 'Velikost / Rozměr' : 'Size / Dimensions'}</td>
                                        <td>{previewAccSize}</td>
                                      </tr>
                                      <tr>
                                        <td>{lang === 'CZ' ? 'Počet kusů v balení' : 'Quantity in Package'}</td>
                                        <td>{previewAccCount}</td>
                                      </tr>
                                      <tr>
                                        <td>{lang === 'CZ' ? 'Materiál / Povrch' : 'Material / Surface'}</td>
                                        <td>{previewAccMaterial}</td>
                                      </tr>
                                      <tr>
                                        <td>{lang === 'CZ' ? 'Barva' : 'Color'}</td>
                                        <td>{previewAccColor}</td>
                                      </tr>
                                    </>
                                  )}
                                  {formCustomParams && formCustomParams.map((cp, idx) => (
                                    <tr key={idx}>
                                      <td>{cp.label}</td>
                                      <td>{cp.value}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>

                        </div>
                      )}

                      {previewActiveTab === 'hodnoceni' && (
                        <div className="detail-section custom-detail-panel" style={{ textAlign: 'left', padding: '32px', boxSizing: 'border-box' }}>
                          <div className="reviews-dashboard">
                            <div className="reviews-dashboard-score">
                              <div className="reviews-average-number">4.8</div>
                              <div className="reviews-average-stars">★★★★★</div>
                              <div className="reviews-average-count">
                                {lang === 'CZ' ? 'Založeno na 12 hodnoceních' : 'Based on 12 reviews'}
                              </div>
                            </div>

                            <div className="reviews-dashboard-bars">
                              <div className="reviews-bar-row">
                                <span className="bar-label">5 ★</span>
                                <div className="bar-track"><div className="bar-fill" style={{ width: '85%' }}></div></div>
                                <span className="bar-percentage">85%</span>
                              </div>
                              <div className="reviews-bar-row">
                                <span className="bar-label">4 ★</span>
                                <div className="bar-track"><div className="bar-fill" style={{ width: '15%' }}></div></div>
                                <span className="bar-percentage">15%</span>
                              </div>
                              <div className="reviews-bar-row">
                                <span className="bar-label">3 ★</span>
                                <div className="bar-track"><div className="bar-fill" style={{ width: '0%' }}></div></div>
                                <span className="bar-percentage">0%</span>
                              </div>
                              <div className="reviews-bar-row">
                                <span className="bar-label">2 ★</span>
                                <div className="bar-track"><div className="bar-fill" style={{ width: '0%' }}></div></div>
                                <span className="bar-percentage">0%</span>
                              </div>
                              <div className="reviews-bar-row">
                                <span className="bar-label">1 ★</span>
                                <div className="bar-track"><div className="bar-fill" style={{ width: '0%' }}></div></div>
                                <span className="bar-percentage">0%</span>
                              </div>
                            </div>

                            <div className="reviews-dashboard-action">
                              <p className="action-text">
                                {lang === 'CZ'
                                  ? 'Podělte se o své zkušenosti s tímto produktem a pomozte ostatním sběratelům.'
                                  : 'Share your experience with this product and help other collectors.'}
                              </p>
                              <button type="button" className="btn btn-primary reviews-add-btn" style={{ pointerEvents: 'none', opacity: 0.8 }}>
                                {lang === 'CZ' ? 'Napsat recenzi' : 'Write a review'}
                              </button>
                            </div>
                          </div>

                          <div className="reviews-list" style={{ marginTop: '32px' }}>
                            <div className="premium-review-card">
                              <div className="review-avatar-col">
                                <div className="review-avatar">OK</div>
                              </div>
                              <div className="review-main-col">
                                <div className="review-meta-row">
                                  <div className="review-author-group">
                                    <span className="review-author">Ondřej K.</span>
                                    <span className="verified-badge">✓ {lang === 'CZ' ? 'Ověřený nákup' : 'Verified Purchase'}</span>
                                  </div>
                                  <span className="review-date">12. 5. 2026</span>
                                </div>
                                <div className="review-stars-row">★★★★★</div>
                                <p className="review-text">{lang === 'CZ' ? 'Naprosto bezchybné. Rychlé dodání a skvěle zabaleno.' : 'Absolutely flawless. Fast shipping and extremely well packed.'}</p>
                              </div>
                            </div>
                            <div className="premium-review-card">
                              <div className="review-avatar-col">
                                <div className="review-avatar">MP</div>
                              </div>
                              <div className="review-main-col">
                                <div className="review-meta-row">
                                  <div className="review-author-group">
                                    <span className="review-author">Marek P.</span>
                                    <span className="verified-badge">✓ {lang === 'CZ' ? 'Ověřený nákup' : 'Verified Purchase'}</span>
                                  </div>
                                  <span className="review-date">3. 4. 2026</span>
                                </div>
                                <div className="review-stars-row">★★★★★</div>
                                <p className="review-text">{lang === 'CZ' ? 'Krásný stav produktu, fólie bez trhlin. Doporučuji nákup.' : 'Beautiful product condition, wrap without tears. Recommended.'}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {previewActiveTab === 'diskuse' && (
                        <div className="detail-section custom-detail-panel" style={{ textAlign: 'left', padding: '32px', boxSizing: 'border-box' }}>
                          <div className="discussions-dashboard">
                            <div className="discussions-dashboard-info">
                              <h3 className="detail-section-title" style={{ margin: 0 }}>
                                {lang === 'CZ' ? 'Diskuze k produktu (2)' : 'Product Discussion (2)'}
                              </h3>
                              <p className="discussions-dashboard-subtitle">
                                {lang === 'CZ' ? 'Máte k produktu nějaký dotaz? Náš tým vám rád odpoví.' : 'Do you have any questions about this product? Our team will gladly answer them.'}
                              </p>
                            </div>
                            <button type="button" className="btn btn-primary discussions-add-btn" style={{ pointerEvents: 'none', opacity: 0.8 }}>
                              {lang === 'CZ' ? 'Položit dotaz' : 'Ask a question'}
                            </button>
                          </div>

                          <div className="comments-list-wrapper" style={{ marginTop: '32px' }}>
                            <div className="premium-comment-card question-card">
                              <div className="comment-avatar-col">
                                <div className="comment-avatar">PS</div>
                              </div>
                              <div className="comment-main-col">
                                <div className="comment-header-row">
                                  <span className="comment-author">Pavel S.</span>
                                  <span className="comment-date">20. 5. 2026</span>
                                </div>
                                <p className="comment-text">{lang === 'CZ' ? 'Dobrý den, bude v budoucnu naskladněno více kusů?' : 'Hello, will there be more stock available in the future?'}</p>
                              </div>
                            </div>
                            <div className="premium-comment-card reply-card" style={{ marginLeft: '40px', borderLeft: '2px solid rgba(255,255,255,0.06)', paddingLeft: '16px' }}>
                              <div className="comment-avatar-col">
                                <div className="comment-avatar admin-avatar">🛡️</div>
                              </div>
                              <div className="comment-main-col">
                                <div className="comment-header-row">
                                  <span className="comment-author admin-author">
                                    Northvale Team <span className="admin-badge">{lang === 'CZ' ? 'Podpora' : 'Support'}</span>
                                  </span>
                                  <span className="comment-date">21. 5. 2026</span>
                                </div>
                                <p className="comment-text">{lang === 'CZ' ? 'Dobrý den, ano, další zásilku od distributora očekáváme koncem příštího týdne.' : 'Hello, yes, we expect another shipment from our distributor by the end of next week.'}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {previewActiveTab === 'souvisejici' && (
                        <div style={{ textAlign: 'center', padding: '40px 0', opacity: 0.5, border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '12px' }}>
                          <p style={{ margin: 0, fontSize: '14px' }}>
                            {lang === 'CZ' ? 'Zde se ve ve finální verzi zobrazí související produkty ze stejné edice.' : 'In the final version, related products from the same set will display here.'}
                          </p>
                        </div>
                      )}

                      {previewActiveTab === 'podobne' && (
                        <div style={{ textAlign: 'center', padding: '40px 0', opacity: 0.5, border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '12px' }}>
                          <p style={{ margin: 0, fontSize: '14px' }}>
                            {lang === 'CZ' ? 'Zde se ve ve finální verzi zobrazí doporučené podobné produkty z obchodu.' : 'In the final version, recommended similar products from the store will display here.'}
                          </p>
                        </div>
                      )}
                    </div>

                  </div>
                </div>

                {/* 5. NEWSLETTER ROW ABOVE FOOTER */}
                {FEATURE_FLAGS.showNewsletter && (
                  <section className="newsletter-section-wrapper" style={{ margin: 0, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                    <div className="container newsletter-section" style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '32px' }}>
                      <div className="newsletter-content" style={{ textAlign: 'left' }}>
                        <div className="newsletter-eyebrow" style={{ letterSpacing: '2px', fontSize: '11px', color: 'var(--nv-gold, #fdbd16)', fontWeight: 'bold' }}>NEWSLETTER • 028</div>
                        <h2 className="newsletter-heading" style={{ fontSize: '24px', fontWeight: '900', color: '#fff', margin: '8px 0 0 0' }}>
                          {lang === 'CZ' ? 'Nové edice & akce jako první.' : 'New editions & sales first.'}
                        </h2>
                      </div>
                      <form className="newsletter-form" style={{ display: 'flex', gap: '16px', flex: 1, maxWidth: '500px' }} onSubmit={(e) => e.preventDefault()}>
                        <div className="newsletter-input-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, textAlign: 'left' }}>
                          <label className="newsletter-input-label" style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 'bold' }}>{lang === 'CZ' ? 'VÁŠ E-MAIL' : 'YOUR EMAIL'}</label>
                          <input type="email" required placeholder="jmeno@example.com" disabled className="newsletter-underline-input" style={{ width: '100%', backgroundColor: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.2)', padding: '8px 0', color: '#fff', outline: 'none' }} />
                        </div>
                        <button className="newsletter-submit-btn" type="button" disabled style={{ backgroundColor: 'var(--nv-gold, #fdbd16)', color: '#000', border: 'none', borderRadius: '4px', padding: '0 24px', fontWeight: 'bold', fontSize: '13px', cursor: 'not-allowed' }}>
                          {lang === 'CZ' ? 'ODEBÍRAT' : 'SUBSCRIBE'}
                        </button>
                      </form>
                    </div>
                  </section>
                )}

                {/* 6. STOREFRONT FOOTER */}
                <footer className="main-footer" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="container footer-grid has-four-cols" style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '40px', padding: '48px 16px 32px 16px', boxSizing: 'border-box', textAlign: 'left' }}>

                    {/* Col 1 */}
                    <div className="footer-column footer-col-about" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <img src="/logo s popisem.webp" alt="NORTHVALE TCG" style={{ height: '36px', width: 'fit-content', objectFit: 'contain' }} />
                      <p className="footer-desc" style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', lineHeight: '1.5', margin: 0 }}>
                        {lang === 'CZ'
                          ? 'TCG e-shop od sběratelů pro sběratele. Nakupte originální karetní produkty se 100% garancí pravosti a špičkovým sběratelským balením.'
                          : 'TCG shop run by collectors for collectors. Purchase authentic card products with 100% guaranteed authenticity and premium collector packaging.'}
                      </p>
                      <div className="footer-socials" style={{ display: 'flex', gap: '12px' }}>
                        <img src="/instagram.png" alt="Instagram" style={{ width: '20px', height: '20px' }} />
                        <img src="/tik-tok.png" alt="TikTok" style={{ width: '20px', height: '20px' }} />
                        <img src="/facebook.png" alt="Facebook" style={{ width: '20px', height: '20px' }} />
                      </div>
                    </div>

                    {/* Col 2 */}
                    <div className="footer-column footer-col-company">
                      <h4 className="footer-heading" style={{ fontSize: '14px', color: '#fff', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.8px', margin: '0 0 16px 0' }}>
                        {lang === 'CZ' ? 'O společnosti' : 'Company'}
                      </h4>
                      <ul className="footer-list" style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>
                        <li style={{ cursor: 'pointer' }}>{lang === 'CZ' ? 'O nás' : 'About Us'}</li>
                        <li style={{ cursor: 'pointer' }}>{lang === 'CZ' ? 'Kontakt' : 'Contact'}</li>
                        <li style={{ cursor: 'pointer' }}>{lang === 'CZ' ? 'Časté dotazy (FAQ)' : 'FAQ'}</li>
                        <li style={{ cursor: 'pointer' }}>{lang === 'CZ' ? 'Nabízené produkty' : 'Our Products'}</li>
                      </ul>
                    </div>

                    {/* Col 3 */}
                    <div className="footer-column footer-col-purchase">
                      <h4 className="footer-heading" style={{ fontSize: '14px', color: '#fff', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.8px', margin: '0 0 16px 0' }}>
                        {lang === 'CZ' ? 'Vše o nákupu' : 'Customer Service'}
                      </h4>
                      <ul className="footer-list" style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>
                        <li style={{ cursor: 'pointer' }}>{lang === 'CZ' ? 'Nastavení cookies' : 'Cookie Settings'}</li>
                        <li style={{ cursor: 'pointer' }}>{lang === 'CZ' ? 'Doprava a osobní odběr' : 'Shipping & Pickup'}</li>
                        <li style={{ cursor: 'pointer' }}>{lang === 'CZ' ? 'Obchodní podmínky (VOP)' : 'Terms & Conditions'}</li>
                        <li style={{ cursor: 'pointer' }}>{lang === 'CZ' ? 'Ochrana osobních údajů (GDPR)' : 'Privacy Policy (GDPR)'}</li>
                        <li style={{ cursor: 'pointer' }}>{lang === 'CZ' ? 'Odstoupení od smlouvy' : 'Order Withdrawal'}</li>
                      </ul>
                    </div>

                    {/* Col 4 */}
                    <div className="footer-column footer-col-contacts">
                      <h4 className="footer-heading" style={{ fontSize: '14px', color: '#fff', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.8px', margin: '0 0 16px 0' }}>
                        {lang === 'CZ' ? 'Kontakty' : 'Contacts'}
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ opacity: 0.6 }}>{lang === 'CZ' ? 'IČO:' : 'Company ID:'}</span>
                          <span style={{ color: '#fff', fontWeight: '600' }}>29618142</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ opacity: 0.6 }}>E-mail:</span>
                          <span style={{ color: '#fff', fontWeight: '600' }}>info@northvaletcg.eu</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ opacity: 0.6 }}>{lang === 'CZ' ? 'Telefon:' : 'Phone:'}</span>
                          <span style={{ color: '#fff', fontWeight: '600' }}>+420 739 666 779</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ opacity: 0.6 }}>{lang === 'CZ' ? 'Odběr:' : 'Pickup:'}</span>
                          <span style={{ color: '#fff', fontWeight: '600' }}>Pardubice / Holice</span>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Footer bottom bar */}
                  <div className="footer-bottom" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '20px 0', fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                    <div className="container" style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 16px', boxSizing: 'border-box' }}>
                      <span>&copy; {new Date().getFullYear()} NORTHVALE s.r.o.</span>
                      <img src="/comgate-logos.png" alt="Payment methods" style={{ maxHeight: '24px', opacity: 0.6 }} />
                      <span>{lang === 'CZ' ? 'Vytvořil' : 'Created by'} <strong style={{ color: '#fff' }}>ozeman.cz</strong></span>
                    </div>
                  </div>
                </footer>

              </div>
            )}

            {/* FLOATING VISUAL CROPPER OVERLAY DIALOG */}
            {isCropping && (
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
                  {cropTarget && cropTarget.type !== 'front' && cropTarget.type !== 'back' && (
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
                  )}
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
                      style={{ flex: 1, padding: '10px 16px', fontSize: '12px', borderRadius: '8px', border: 'none', background: 'var(--nv-gold, #fdbd16)', color: '#000', fontWeight: 'bold', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                      onClick={handleCropAction}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><polyline points="20 6 9 17 4 12"></polyline></svg>
                      {lang === 'CZ' ? 'Oříznout' : 'Crop'}
                    </button>
                  </div>
                </div>
              </div>
            )}
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

      {deleteConfirm.isOpen && createPortal(
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
                ? `Opravdu chcete smazat produkt "${deleteConfirm.productId}"? Tuto akci nelze vzít zpět.`
                : `Are you sure you want to delete product "${deleteConfirm.productId}"? This action cannot be undone.`}
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
                onClick={() => setDeleteConfirm({ isOpen: false, productId: '' })}
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
                onClick={handleConfirmDeleteProduct}
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
    gap: '28px',
  },
  modalGrid: {
    display: 'flex',
    gap: '40px',
    flexWrap: 'wrap',
  },
  modalColLeft: {
    flex: '1.5 1 450px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  modalColRight: {
    flex: '1 1 280px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  row: {
    display: 'flex',
    gap: '24px',
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
  },
  imageSlotCard: {
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '8px',
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    alignItems: 'center',
    position: 'relative',
    minHeight: '140px',
    justifyContent: 'center',
    boxSizing: 'border-box',
  },
  slotPreviewWrap: {
    width: '100%',
    height: '110px',
    position: 'relative',
    borderRadius: '6px',
    overflow: 'hidden',
    border: '1px solid rgba(255,255,255,0.04)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
  },
  slotPreviewImg: {
    maxHeight: '100%',
    maxWidth: '100%',
    objectFit: 'contain',
  },
  slotActions: {
    position: 'absolute',
    bottom: '4px',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    gap: '4px',
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: '4px 8px',
    borderRadius: '20px',
    backdropFilter: 'blur(2px)',
  },
  slotEmpty: {
    width: '100%',
    height: '110px',
    border: '1px dashed rgba(255,255,255,0.15)',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontSize: '11px',
    color: 'var(--text-muted, #8a8a92)',
    transition: 'all 0.2s ease',
  },
  mockPageContainer: {
    width: '100%',
    maxHeight: '600px',
    overflowY: 'auto',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '12px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    boxSizing: 'border-box',
    textAlign: 'left',
  }
};
