import { supabase } from '../supabase';
import { mockProducts } from '../mockData';

// Image cache version check - force invalidation of old base64 strings to clear space & fix stale JPEGs
try {
  const IMAGE_CACHE_VERSION = 'v3'; // Increment to force clear all clients
  if (localStorage.getItem('nv-img-cache-version') !== IMAGE_CACHE_VERSION) {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith('nv-img-') || k.startsWith('nv-back-img-'))) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
    localStorage.setItem('nv-img-cache-version', IMAGE_CACHE_VERSION);
  }
} catch (e) {
  console.warn('LocalStorage error on image cache version invalidation:', e);
}

// In-memory cache for product images during session
const productImageInMemoryCache = {};
const productBackImageInMemoryCache = {};

// Safe LocalStorage setItem helper that frees space if quota is exceeded
function safeLocalStorageSetItem(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    if (e.name === 'QuotaExceededError' || e.code === 22) {
      console.warn('LocalStorage quota exceeded. Clearing product image cache...');
      try {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && (k.startsWith('nv-img-') || k.startsWith('nv-back-img-'))) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
        // Try setting the item again
        localStorage.setItem(key, value);
      } catch (retryErr) {
        console.error('Failed to set item even after clearing image cache:', retryErr);
      }
    } else {
      console.error('LocalStorage write error:', e);
    }
  }
}

/**
 * Maps database snake_case fields back to frontend camelCase properties.
 */
function mapDbProduct(p) {
  if (!p) return null;
  return {
    ...p,
    desc: p.description,
    backImage: p.back_image,
    packagingType: p.packaging_type,
    boosterCount: p.booster_count,
    foilCondition: p.foil_condition,
    certNumber: p.cert_number,
    acrylicThickness: p.acrylic_thickness,
    uvProtection: p.uv_protection,
    closingType: p.closing_type,
    innerDimensions: p.inner_dimensions,
    shortDesc: p.short_description || null,
    additionalImages: p.additional_images || [],
    illustrator: p.illustrator || null,
    setCode: p.set_code || null,
    stage: p.stage || null,
    element: p.element || null,
    releaseDate: p.preorder ? p.foil_condition : null,
    customParams: p.custom_params || []
  };
}
function cleanProductsForCache(products) {
  if (!products || !Array.isArray(products)) return [];
  return products.map(p => {
    if (!p) return p;
    const clean = { ...p };
    if (clean.image && clean.image.startsWith('data:')) {
      clean.image = '';
    }
    if (clean.back_image && clean.back_image.startsWith('data:')) {
      clean.back_image = '';
    }
    if (clean.additional_images && Array.isArray(clean.additional_images)) {
      clean.additional_images = clean.additional_images.map(img => 
        (img && img.startsWith('data:')) ? '' : img
      );
    }
    return clean;
  });
}

// In-memory and localStorage cache for raw products list and detail lookups
let cachedRawProducts = (() => {
  try {
    const val = localStorage.getItem('northvale-cached-raw-products');
    return val ? JSON.parse(val) : null;
  } catch {
    return null;
  }
})();

let isCachedDataFull = true; // Always true as main catalog list no longer loads massive base64 columns

let productsCacheTime = (() => {
  try {
    const val = localStorage.getItem('northvale-cached-products-time');
    return val ? Number(val) : 0;
  } catch {
    return 0;
  }
})();

const PRODUCTS_CACHE_TTL = 30000; // 30 seconds cache TTL

const singleProductCache = {};
export function getProductFromCache(id) {
  return singleProductCache[id] || null;
}

/**
 * Helper to filter cached/local raw products synchronously on initial mount.
 */
export function getCachedProducts(options = {}) {
  const { type, types, game, searchQuery, edition, includeAll } = options;

  const rawData = cachedRawProducts || [];

  let filtered = rawData.map(mapDbProduct);
  filtered.forEach(p => {
    if (p && p.id) {
      singleProductCache[p.id] = p;
    }
  });

  if (!includeAll) {
    filtered = filtered.filter(p => p.type !== 'single' && p.type !== 'slab');
    
    // Always hide out-of-stock items from public view
    filtered = filtered.filter(p => {
      if (p.type === 'single') {
        const totalStock = p.variants?.reduce((sum, v) => sum + (v.stock || 0), 0) || 0;
        return totalStock > 0;
      } else {
        return (p.stock || 0) > 0;
      }
    });
  }

  if (types && types.length > 0) {
    filtered = filtered.filter(p => types.includes(p.type));
  } else if (type) {
    filtered = filtered.filter(p => p.type === type);
  }

  if (game && game !== 'all' && game !== 'all-games') {
    if (game === 'Accessories') {
      filtered = filtered.filter(p => p.type === 'accessory' && (!p.category || p.category !== 'Acrylics'));
    } else if (game === 'Acrylics') {
      filtered = filtered.filter(p => p.category === 'Acrylics');
    } else {
      filtered = filtered.filter(p => p.game === game && (!p.category || p.category !== 'Acrylics'));
    }
  }

  if (edition && edition !== 'all') {
    filtered = filtered.filter(p => p.edition === edition);
  }

  if (searchQuery && searchQuery.trim() !== '') {
    const lowerSearch = searchQuery.trim().toLowerCase();
    filtered = filtered.filter(p => 
      p.name.toLowerCase().includes(lowerSearch) || 
      (p.edition && p.edition.toLowerCase().includes(lowerSearch))
    );
  }

  filtered.sort((a, b) => (a.id > b.id ? 1 : -1));
  return filtered;
}

/**
 * Fetch products from Supabase database with filters and search query.
 * Falls back to client-side filtering on mockProducts if database is not configured/accessible.
 */
export async function fetchProductsFromDB(options = {}) {
  const { type, types, game, searchQuery, edition, includeAll } = options;

  try {
    if (!supabase.from) {
      throw new Error('Supabase client is not initialized');
    }

    const now = Date.now();
    let rawData;
    if (cachedRawProducts && isCachedDataFull && (now - productsCacheTime < PRODUCTS_CACHE_TTL)) {
      rawData = cachedRawProducts;
    } else {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, type, game, edition, category, subcat, subsubcat, subsubcategory, rarity, description, price, stock, lang, packaging_type, booster_count, year, foil_condition, preorder, investment, company, grade, cert_number, acrylic_thickness, uv_protection, closing_type, inner_dimensions, variants, created_at, category_id, short_description, illustrator, set_code, stage, element, custom_params, no_vat');

      if (error) {
        throw error;
      }
      cachedRawProducts = data || [];
      isCachedDataFull = true;
      productsCacheTime = now;

      try {
        const cleanData = cleanProductsForCache(cachedRawProducts);
        localStorage.setItem('northvale-cached-raw-products', JSON.stringify(cleanData));
        localStorage.setItem('northvale-cached-products-time', String(productsCacheTime));
      } catch (e) {
        console.warn('Failed to save products cache to localStorage:', e);
      }

      rawData = cachedRawProducts;
    }

    // Filter rawData in memory (ignore singles and slabs unless includeAll is true)
    let filtered = rawData.map(mapDbProduct);
    filtered.forEach(p => {
      if (p && p.id) {
        singleProductCache[p.id] = p;
      }
    });
    if (!includeAll) {
      filtered = filtered.filter(p => p.type !== 'single' && p.type !== 'slab');
      
      // Always hide out-of-stock items from public view
      filtered = filtered.filter(p => {
        if (p.type === 'single') {
          const totalStock = p.variants?.reduce((sum, v) => sum + (v.stock || 0), 0) || 0;
          return totalStock > 0;
        } else {
          return (p.stock || 0) > 0;
        }
      });
    }

    if (types && types.length > 0) {
      filtered = filtered.filter(p => types.includes(p.type));
    } else if (type) {
      filtered = filtered.filter(p => p.type === type);
    }

    if (game && game !== 'all' && game !== 'all-games') {
      if (game === 'Accessories') {
        filtered = filtered.filter(p => p.type === 'accessory' && (!p.category || p.category !== 'Acrylics'));
      } else if (game === 'Acrylics') {
        filtered = filtered.filter(p => p.category === 'Acrylics');
      } else {
        filtered = filtered.filter(p => p.game === game && (!p.category || p.category !== 'Acrylics'));
      }
    }

    if (edition && edition !== 'all') {
      filtered = filtered.filter(p => p.edition === edition);
    }

    if (searchQuery && searchQuery.trim() !== '') {
      const lowerSearch = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(lowerSearch) || 
        (p.edition && p.edition.toLowerCase().includes(lowerSearch))
      );
    }

    // Sort by id for deterministic order
    filtered.sort((a, b) => (a.id > b.id ? 1 : -1));

    return filtered;

  } catch (err) {
    console.warn('Database products query failed, using local fallback:', err.message || err);

    let filtered = cachedRawProducts && cachedRawProducts.length > 0 ? cachedRawProducts : mockProducts;
    if (!includeAll) {
      filtered = filtered.filter(p => p.type !== 'single' && p.type !== 'slab');
      
      // Always hide out-of-stock items from public view
      filtered = filtered.filter(p => {
        if (p.type === 'single') {
          const totalStock = p.variants?.reduce((sum, v) => sum + (v.stock || 0), 0) || 0;
          return totalStock > 0;
        } else {
          return (p.stock || 0) > 0;
        }
      });
    }

    if (types && types.length > 0) {
      filtered = filtered.filter(p => types.includes(p.type));
    } else if (type) {
      filtered = filtered.filter(p => p.type === type);
    }

    if (game && game !== 'all' && game !== 'all-games') {
      if (game === 'Accessories') {
        filtered = filtered.filter(p => p.type === 'accessory' && p.category !== 'Acrylics');
      } else if (game === 'Acrylics') {
        filtered = filtered.filter(p => p.category === 'Acrylics');
      } else {
        filtered = filtered.filter(p => p.game === game && p.category !== 'Acrylics');
      }
    }

    if (edition && edition !== 'all') {
      filtered = filtered.filter(p => p.edition === edition);
    }

    if (searchQuery && searchQuery.trim() !== '') {
      const lowerSearch = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(lowerSearch) || 
        (p.edition && p.edition.toLowerCase().includes(lowerSearch))
      );
    }

    return filtered;
  }
}

/**
 * Fetch a single product by ID, with fallback to local mock data.
 */
export async function fetchProductByIdFromDB(id) {
  if (singleProductCache[id] && singleProductCache[id].isFullyFetched) {
    return singleProductCache[id];
  }

  try {
    if (!supabase.from) {
      throw new Error('Supabase client is not initialized');
    }

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw error;
    }

    const product = mapDbProduct(data);
    if (product) {
      product.isFullyFetched = true;
      singleProductCache[id] = product;
      if (product.image) {
        productImageInMemoryCache[id] = product.image;
        safeLocalStorageSetItem(`nv-img-${id}`, product.image);
        safeLocalStorageSetItem(`nv-img-time-${id}`, String(Date.now()));
      }
      if (product.backImage) {
        productBackImageInMemoryCache[id] = product.backImage;
        safeLocalStorageSetItem(`nv-back-img-${id}`, product.backImage);
        safeLocalStorageSetItem(`nv-back-img-time-${id}`, String(Date.now()));
      }
    }
    return product;
  } catch (err) {
    console.warn(`Database fetch for single product ${id} failed, using mock fallback:`, err.message || err);
    const mock = mockProducts.find(p => p.id === id);
    if (mock) {
      mock.isFullyFetched = true;
      singleProductCache[id] = mock;
    }
    return mock || null;
  }
}

/**
 * Maps frontend product representation to database snake_case structure.
 */
export function mapProductToDb(p) {
  if (!p) return null;
  const dbObj = {
    id: p.id,
    name: p.name,
    type: p.type,
    game: p.game,
    edition: p.edition,
    category: p.category,
    subcat: p.subcat,
    subsubcat: p.subsubcat,
    subsubcategory: p.subsubcategory,
    rarity: p.rarity,
    image: p.image,
    no_vat: !!p.no_vat
  };

  if (p.backImage !== undefined || p.back_image !== undefined) {
    dbObj.back_image = p.backImage !== undefined ? p.backImage : p.back_image;
  }
  if (p.desc !== undefined || p.description !== undefined) {
    dbObj.description = p.desc !== undefined ? p.desc : p.description;
  }
  if (p.price !== undefined) {
    dbObj.price = p.price !== null ? Number(p.price) : null;
  }
  if (p.stock !== undefined) {
    dbObj.stock = p.stock !== null ? Number(p.stock) : null;
  }
  if (p.lang !== undefined) {
    dbObj.lang = p.lang;
  }
  if (p.packagingType !== undefined || p.packaging_type !== undefined) {
    dbObj.packaging_type = p.packagingType !== undefined ? p.packagingType : p.packaging_type;
  }
  if (p.boosterCount !== undefined || p.booster_count !== undefined) {
    dbObj.booster_count = p.boosterCount !== null && p.boosterCount !== undefined ? Number(p.boosterCount) : null;
  }
  if (p.year !== undefined) {
    dbObj.year = p.year !== null ? Number(p.year) : null;
  }
  if (p.preorder !== undefined) {
    dbObj.preorder = !!p.preorder;
    dbObj.foil_condition = p.preorder ? (p.releaseDate || null) : (p.foilCondition || p.foil_condition || null);
  } else if (p.foilCondition !== undefined || p.foil_condition !== undefined) {
    dbObj.foil_condition = p.foilCondition !== undefined ? p.foilCondition : p.foil_condition;
  }
  if (p.investment !== undefined) {
    dbObj.investment = !!p.investment;
  }
  if (p.company !== undefined) {
    dbObj.company = p.company;
  }
  if (p.grade !== undefined) {
    dbObj.grade = p.grade !== null ? Number(p.grade) : null;
  }
  if (p.certNumber !== undefined || p.cert_number !== undefined) {
    dbObj.cert_number = p.certNumber !== undefined ? p.certNumber : p.cert_number;
  }
  if (p.acrylicThickness !== undefined || p.acrylic_thickness !== undefined) {
    dbObj.acrylic_thickness = p.acrylicThickness !== null && p.acrylicThickness !== undefined ? Number(p.acrylicThickness) : null;
  }
  if (p.uvProtection !== undefined || p.uv_protection !== undefined) {
    dbObj.uv_protection = !!(p.uvProtection || p.uv_protection);
  }
  if (p.closingType !== undefined || p.closing_type !== undefined) {
    dbObj.closing_type = p.closingType !== undefined ? p.closingType : p.closing_type;
  }
  if (p.innerDimensions !== undefined || p.inner_dimensions !== undefined) {
    dbObj.inner_dimensions = p.innerDimensions !== undefined ? p.innerDimensions : p.inner_dimensions;
  }
  if (p.variants !== undefined) {
    dbObj.variants = p.variants;
  }
  if (p.category_id !== undefined) {
    dbObj.category_id = p.category_id;
  }
  if (p.shortDesc !== undefined || p.short_description !== undefined) {
    dbObj.short_description = p.shortDesc !== undefined ? p.shortDesc : p.short_description;
  }
  if (p.additionalImages !== undefined || p.additional_images !== undefined) {
    dbObj.additional_images = p.additionalImages !== undefined ? p.additionalImages : p.additional_images;
  }
  if (p.illustrator !== undefined) {
    dbObj.illustrator = p.illustrator;
  }
  if (p.setCode !== undefined || p.set_code !== undefined) {
    dbObj.set_code = p.setCode !== undefined ? p.setCode : p.set_code;
  }
  if (p.stage !== undefined) {
    dbObj.stage = p.stage;
  }
  if (p.element !== undefined) {
    dbObj.element = p.element;
  }
  if (p.customParams !== undefined || p.custom_params !== undefined) {
    dbObj.custom_params = p.customParams !== undefined ? p.customParams : p.custom_params;
  }

  return dbObj;
}

/**
 * Create or update a product in Supabase.
 */
export async function saveProductToDB(product) {
  try {
    if (!supabase.from) {
      throw new Error('Supabase client is not initialized');
    }

    const mapped = mapProductToDb(product);
    const { data, error } = await supabase
      .from('products')
      .upsert(mapped)
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Invalidate products cache
    cachedRawProducts = null;
    productsCacheTime = 0;
    try {
      localStorage.removeItem(`nv-img-${product.id}`);
      localStorage.removeItem(`nv-img-time-${product.id}`);
      localStorage.removeItem(`nv-back-img-${product.id}`);
      localStorage.removeItem(`nv-back-img-time-${product.id}`);
    } catch {}

    const mappedProduct = mapDbProduct(data);
    if (mappedProduct && mappedProduct.id) {
      singleProductCache[mappedProduct.id] = mappedProduct;
    }

    return { data: mappedProduct, error: null };
  } catch (err) {
    console.error('Failed to save product to database, using mock fallback:', err.message || err);
    
    // Fallback: update local mockProducts array
    const idx = mockProducts.findIndex(p => p.id === product.id);
    const mappedFallback = mapDbProduct(mapProductToDb(product));
    if (idx !== -1) {
      mockProducts[idx] = { ...mockProducts[idx], ...mappedFallback };
    } else {
      mockProducts.push(mappedFallback);
    }
    
    if (mappedFallback && mappedFallback.id) {
      singleProductCache[mappedFallback.id] = mappedFallback;
    }

    return { 
      data: mappedFallback, 
      error: null, 
      isMockFallback: true, 
      dbError: err.message || String(err) 
    };
  }
}

/**
 * Delete a product from Supabase.
 */
export async function deleteProductFromDB(id) {
  try {
    if (!supabase.from) {
      throw new Error('Supabase client is not initialized');
    }

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    // Invalidate products cache
    cachedRawProducts = null;
    productsCacheTime = 0;
    delete singleProductCache[id];
    try {
      localStorage.removeItem(`nv-img-${id}`);
      localStorage.removeItem(`nv-img-time-${id}`);
      localStorage.removeItem(`nv-back-img-${id}`);
      localStorage.removeItem(`nv-back-img-time-${id}`);
    } catch {}

    return { error: null };
  } catch (err) {
    console.error(`Failed to delete product ${id} from database, using mock fallback:`, err.message || err);
    
    // Fallback: delete from local mockProducts array
    const idx = mockProducts.findIndex(p => p.id === id);
    if (idx !== -1) {
      mockProducts.splice(idx, 1);
    }
    delete singleProductCache[id];
    
    return { error: null, isMockFallback: true, dbError: err.message || String(err) };
  }
}

/**
 * Lazy fetch single product front image (utilizes local cache first, refreshes every 2 hours max).
 */
export async function fetchProductImage(productId) {
  if (!productId) return null;
  
  if (productImageInMemoryCache[productId]) {
    return productImageInMemoryCache[productId];
  }

  const now = Date.now();
  
  try {
    const cached = localStorage.getItem(`nv-img-${productId}`);
    const cachedTime = localStorage.getItem(`nv-img-time-${productId}`);
    if (cached && cachedTime && (now - Number(cachedTime) < 900000)) { // 15 minutes TTL
      productImageInMemoryCache[productId] = cached;
      return cached;
    }
  } catch (e) {
    console.warn('LocalStorage error on image lookup:', e);
  }

  // Fetch from Database
  try {
    if (!supabase.from) return null;
    const { data, error } = await supabase
      .from('products')
      .select('image')
      .eq('id', productId)
      .single();

    if (!error && data && data.image) {
      productImageInMemoryCache[productId] = data.image;
      safeLocalStorageSetItem(`nv-img-${productId}`, data.image);
      safeLocalStorageSetItem(`nv-img-time-${productId}`, String(now));
      return data.image;
    }
  } catch (err) {
    console.error('Failed to fetch image for product:', productId, err);
  }

  // Fallback to older cached value if database query failed
  try {
    const backup = localStorage.getItem(`nv-img-${productId}`) || null;
    if (backup) {
      productImageInMemoryCache[productId] = backup;
    }
    return backup;
  } catch {
    return null;
  }
}

/**
 * Lazy fetch single product back image.
 */
export async function fetchProductBackImage(productId) {
  if (!productId) return null;
  
  if (productBackImageInMemoryCache[productId]) {
    return productBackImageInMemoryCache[productId];
  }

  const now = Date.now();
  
  try {
    const cached = localStorage.getItem(`nv-back-img-${productId}`);
    const cachedTime = localStorage.getItem(`nv-back-img-time-${productId}`);
    if (cached && cachedTime && (now - Number(cachedTime) < 900000)) { // 15 minutes TTL
      productBackImageInMemoryCache[productId] = cached;
      return cached;
    }
  } catch {}

  try {
    if (!supabase.from) return null;
    const { data, error } = await supabase
      .from('products')
      .select('back_image')
      .eq('id', productId)
      .single();

    if (!error && data && data.back_image) {
      productBackImageInMemoryCache[productId] = data.back_image;
      safeLocalStorageSetItem(`nv-back-img-${productId}`, data.back_image);
      safeLocalStorageSetItem(`nv-back-img-time-${productId}`, String(now));
      return data.back_image;
    }
  } catch (err) {
    console.error('Failed to fetch back image for product:', productId, err);
  }

  try {
    const backup = localStorage.getItem(`nv-back-img-${productId}`) || null;
    if (backup) {
      productBackImageInMemoryCache[productId] = backup;
    }
    return backup;
  } catch {
    return null;
  }
}

/**
 * Synchronously retrieves a cached product image from localStorage if it exists.
 */
export function getProductImageCached(productId, fallbackSrc = '') {
  if (!productId) return fallbackSrc || '';
  if (productImageInMemoryCache[productId]) {
    return productImageInMemoryCache[productId];
  }
  try {
    const cached = localStorage.getItem(`nv-img-${productId}`);
    if (cached) {
      productImageInMemoryCache[productId] = cached;
      return cached;
    }
  } catch {}
  return fallbackSrc || '';
}
