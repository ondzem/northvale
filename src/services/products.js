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
    innerDimensions: p.inner_dimensions
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
      // Handle Accessories / Acrylics special cases
      if (game === 'Accessories') {
        // accessories might be category Accessories or type accessory
      } else {
        query = query.eq('game', game);
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
      filtered = filtered.filter(p => p.game === game);
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
