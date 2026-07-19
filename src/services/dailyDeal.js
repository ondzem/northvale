import { supabase } from '../supabase';



let cachedDeals = [];

/**
 * Fetch all daily deal slots from Supabase.
 */
export async function fetchDailyDealsFromDB() {
  try {
    if (!supabase.from) {
      throw new Error('Supabase client is not initialized');
    }

    const { data, error } = await supabase
      .from('daily_deal')
      .select('*');

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      return [];
    }

    cachedDeals = data;
    return data;
  } catch (err) {
    console.warn('Database daily_deal slots fetch failed, using cache/fallback:', err.message || err);
    try {
      const cached = localStorage.getItem('northvale-cached-deals');
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      console.warn('Failed to read cached daily_deals:', e);
    }
    return [];
  }
}

/**
 * Compute the effective remaining stock for a daily deal.
 * If linked to a catalog product, takes the minimum of deal allocation and actual product stock.
 */
export function getEffectiveDealStock(deal, linkedProducts = []) {
  if (!deal) return 0;
  const dealStock = Number(deal.stock || 0);
  if (deal.product_id && deal.product_id !== 'deal-of-the-day') {
    const catalogProduct = linkedProducts.find(p => p.id === deal.product_id);
    if (catalogProduct) {
      let prodStock = 0;
      if (catalogProduct.variants && catalogProduct.variants.length > 0) {
        prodStock = catalogProduct.variants.reduce((sum, v) => sum + Number(v.stock || 0), 0);
      } else {
        prodStock = Number(catalogProduct.stock || 0);
      }
      return Math.min(dealStock, prodStock);
    }
  }
  return dealStock;
}

/**
 * Get the currently active daily deal from a list of deals based on ends_at values.
 * Returns the first deal that ends in the future and has stock remaining.
 */
export function getActiveDailyDeal(allDeals, linkedProducts = []) {
  if (!allDeals || allDeals.length === 0) return null;
  
  // Sort deals by ends_at ascending
  const sortedDeals = [...allDeals].sort((a, b) => new Date(a.ends_at) - new Date(b.ends_at));
  
  // Find first deal that expires in the future and has stock remaining > 0
  const now = Date.now();
  const active = sortedDeals.find(d => {
    if (new Date(d.ends_at).getTime() <= now) return false;
    const stock = getEffectiveDealStock(d, linkedProducts);
    if (stock <= 0) return false;
    return true;
  });
  
  return active || null;
}

/**
 * Fetch the active daily deal, evaluating real-time stock levels of linked catalog products.
 * Returns null if no valid daily deal is scheduled or active.
 */
export async function fetchDailyDealFromDB() {
  const deals = await fetchDailyDealsFromDB();
  
  // Fetch current stock from Supabase for all products linked to these deals
  const productIds = deals.map(d => d.product_id).filter(id => id && id !== 'deal-of-the-day');
  let products = [];
  if (productIds.length > 0) {
    try {
      const { data } = await supabase
        .from('products')
        .select('id, stock, variants')
        .in('id', productIds);
      products = data || [];
    } catch (e) {
      console.warn('Failed to fetch linked products for stock validation:', e);
    }
  }

  const active = getActiveDailyDeal(deals, products);
  return active || null;
}

/**
 * Save or update a specific daily deal slot.
 */
export async function saveDailyDealToDB(deal, slotId = 'active-deal') {
  try {
    if (!supabase.from) {
      throw new Error('Supabase client is not initialized');
    }

    const payload = {
      id: slotId,
      name: deal.name,
      image_url: deal.image_url || null,
      stock: deal.stock !== undefined ? Number(deal.stock) : 0,
      price: deal.price !== undefined ? Number(deal.price) : 0,
      original_price: deal.original_price !== undefined ? Number(deal.original_price) : null,
      ends_at: deal.ends_at,
      product_id: deal.product_id || null,
      expiry_notified: deal.expiry_notified ?? false
    };

    const { data, error } = await supabase
      .from('daily_deal')
      .upsert(payload)
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Refresh cachedDeals
    await fetchDailyDealsFromDB();
    
    // Update local cache
    try {
      localStorage.setItem('northvale-cached-deals', JSON.stringify(cachedDeals));
      // Also cache active deal for backwards compatibility
      const active = getActiveDailyDeal(cachedDeals);
      if (active) {
        localStorage.setItem('northvale-cached-deal', JSON.stringify(active));
      }
    } catch (e) {
      console.warn('Failed to cache daily_deals locally:', e);
    }

    return { data, error: null };
  } catch (err) {
    console.error('Failed to save daily_deal to Supabase:', err);

    // Fallback: update local list
    const fallbackDeal = {
      ...deal,
      id: slotId
    };
    
    const existingIndex = cachedDeals.findIndex(d => d.id === slotId);
    if (existingIndex >= 0) {
      cachedDeals[existingIndex] = fallbackDeal;
    } else {
      cachedDeals.push(fallbackDeal);
    }

    try {
      localStorage.setItem('northvale-cached-deals', JSON.stringify(cachedDeals));
      const active = getActiveDailyDeal(cachedDeals);
      if (active) {
        localStorage.setItem('northvale-cached-deal', JSON.stringify(active));
      }
    } catch (e) {
      console.warn('Failed to cache daily_deals locally during fallback:', e);
    }

    return {
      data: fallbackDeal,
      error: null,
      isMockFallback: true,
      dbError: err.message || String(err)
    };
  }
}

/**
 * Delete a specific daily deal slot from Supabase.
 */
export async function deleteDailyDealFromDB(slotId) {
  try {
    if (!supabase.from) {
      throw new Error('Supabase client is not initialized');
    }

    const { error } = await supabase
      .from('daily_deal')
      .delete()
      .eq('id', slotId);

    if (error) {
      throw error;
    }

    // Refresh cachedDeals
    cachedDeals = cachedDeals.filter(d => d.id !== slotId);
    
    // Update local cache
    try {
      localStorage.setItem('northvale-cached-deals', JSON.stringify(cachedDeals));
      const active = getActiveDailyDeal(cachedDeals);
      if (active) {
        localStorage.setItem('northvale-cached-deal', JSON.stringify(active));
      } else {
        localStorage.removeItem('northvale-cached-deal');
      }
    } catch (e) {
      console.warn('Failed to cache daily_deals locally after deletion:', e);
    }

    return { error: null };
  } catch (err) {
    console.error(`Failed to delete daily_deal slot ${slotId} from Supabase:`, err);
    // Fallback: update local list
    cachedDeals = cachedDeals.filter(d => d.id !== slotId);
    try {
      localStorage.setItem('northvale-cached-deals', JSON.stringify(cachedDeals));
      const active = getActiveDailyDeal(cachedDeals);
      if (active) {
        localStorage.setItem('northvale-cached-deal', JSON.stringify(active));
      } else {
        localStorage.removeItem('northvale-cached-deal');
      }
    } catch (e) {
      console.warn('Failed to cache daily_deals locally after deletion during fallback:', e);
    }
    return { error: err, isMockFallback: true };
  }
}
