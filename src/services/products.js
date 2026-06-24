import { supabase } from '../supabase';
import { mockProducts } from '../mockData';

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
// In-memory cache for raw products list
let cachedRawProducts = null;
let productsCacheTime = 0;
const PRODUCTS_CACHE_TTL = 30000; // 30 seconds cache TTL

/**
 * Fetch products from Supabase database with filters and search query.
 * Falls back to client-side filtering on mockProducts if database is not configured/accessible.
 */
export async function fetchProductsFromDB(options = {}) {
  const { type, types, game, searchQuery, edition } = options;

  try {
    if (!supabase.from) {
      throw new Error('Supabase client is not initialized');
    }

    const now = Date.now();
    let rawData;
    if (cachedRawProducts && (now - productsCacheTime < PRODUCTS_CACHE_TTL)) {
      rawData = cachedRawProducts;
    } else {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, type, game, edition, category, subcat, subsubcat, subsubcategory, rarity, image, back_image, price, stock, lang, packaging_type, booster_count, year, foil_condition, preorder, investment, company, grade, cert_number, acrylic_thickness, uv_protection, closing_type, inner_dimensions, variants, created_at, category_id, short_description, additional_images, illustrator, set_code, stage, element, custom_params');

      if (error) {
        throw error;
      }
      cachedRawProducts = data || [];
      productsCacheTime = now;
      rawData = cachedRawProducts;
    }

    // Filter rawData in memory (ignore singles and slabs)
    let filtered = rawData.map(mapDbProduct).filter(p => p.type !== 'single' && p.type !== 'slab');

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
    console.warn('Database products query failed, using local mock fallback:', err.message || err);

    // Filter local mockProducts identically (ignore singles and slabs)
    let filtered = mockProducts.filter(p => p.type !== 'single' && p.type !== 'slab');

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
    return product;
  } catch (err) {
    console.warn(`Database fetch for single product ${id} failed, using mock fallback:`, err.message || err);
    const mock = mockProducts.find(p => p.id === id);
    return mock || null;
  }
}

/**
 * Maps frontend product representation to database snake_case structure.
 */
export function mapProductToDb(p) {
  if (!p) return null;
  return {
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
    back_image: p.backImage || p.back_image || null,
    description: p.desc || p.description || null,
    price: p.price !== undefined && p.price !== null ? Number(p.price) : null,
    stock: p.stock !== undefined && p.stock !== null ? Number(p.stock) : null,
    lang: p.lang || null,
    packaging_type: p.packagingType || p.packaging_type || null,
    booster_count: p.boosterCount !== undefined && p.boosterCount !== null ? Number(p.boosterCount) : null,
    year: p.year !== undefined && p.year !== null ? Number(p.year) : null,
    foil_condition: p.preorder ? (p.releaseDate || null) : (p.foilCondition || p.foil_condition || null),
    preorder: !!p.preorder,
    investment: !!p.investment,
    company: p.company || null,
    grade: p.grade !== undefined && p.grade !== null ? Number(p.grade) : null,
    cert_number: p.certNumber || p.cert_number || null,
    acrylic_thickness: p.acrylicThickness !== undefined && p.acrylicThickness !== null ? Number(p.acrylicThickness) : null,
    uv_protection: !!(p.uvProtection || p.uv_protection),
    closing_type: p.closingType || p.closing_type || null,
    inner_dimensions: p.innerDimensions || p.inner_dimensions || null,
    variants: p.variants || null,
    category_id: p.category_id || null,
    short_description: p.shortDesc || null,
    additional_images: p.additionalImages || null,
    illustrator: p.illustrator || null,
    set_code: p.setCode || null,
    stage: p.stage || null,
    element: p.element || null,
    custom_params: p.customParams || []
  };
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

    return { data: mapDbProduct(data), error: null };
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

    return { error: null };
  } catch (err) {
    console.error(`Failed to delete product ${id} from database, using mock fallback:`, err.message || err);
    
    // Fallback: delete from local mockProducts array
    const idx = mockProducts.findIndex(p => p.id === id);
    if (idx !== -1) {
      mockProducts.splice(idx, 1);
    }
    
    return { error: null, isMockFallback: true, dbError: err.message || String(err) };
  }
}
