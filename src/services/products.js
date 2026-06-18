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

/**
 * Fetch products from Supabase database with filters and search query.
 * Falls back to client-side filtering on mockProducts if database is not configured/accessible.
 */
export async function fetchProductsFromDB(options = {}) {
  const { type, types, game, searchQuery, edition } = options;

  try {
    // Check if supabase client is active
    if (!supabase.from) {
      throw new Error('Supabase client is not initialized');
    }

    let query = supabase.from('products').select('*');

    // Filter by type or types array
    if (types && types.length > 0) {
      query = query.in('type', types);
    } else if (type) {
      query = query.eq('type', type);
    }

    // Filter by game
    if (game && game !== 'all' && game !== 'all-games') {
      if (game === 'Accessories') {
        query = query.eq('type', 'accessory').or('category.is.null,category.neq.Acrylics');
      } else if (game === 'Acrylics') {
        query = query.eq('category', 'Acrylics');
      } else {
        query = query.eq('game', game).or('category.is.null,category.neq.Acrylics');
      }
    }

    // Filter by edition
    if (edition && edition !== 'all') {
      query = query.eq('edition', edition);
    }

    // Text Search (case-insensitive substring match on name or edition)
    if (searchQuery && searchQuery.trim() !== '') {
      const cleanSearch = searchQuery.trim();
      query = query.or(`name.ilike.%${cleanSearch}%,edition.ilike.%${cleanSearch}%`);
    }

    // Sort by id for deterministic order
    query = query.order('id', { ascending: true });

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    if (data) {
      return data.map(mapDbProduct);
    }
    return [];

  } catch (err) {
    console.warn('Database products query failed, using local mock fallback:', err.message || err);

    // Filter local mockProducts identically
    let filtered = [...mockProducts];

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

    return mapDbProduct(data);
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
