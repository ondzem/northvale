import { supabase } from '../supabase';

// Static default deal for fallback if DB is empty, inaccessible, or table does not exist
export const DEFAULT_DEAL = {
  id: 'active-deal',
  name: 'Booster Box SV06 Twilight Masquerade',
  image_url: '/9.png',
  stock: 14,
  price: 2690,
  original_price: 3590,
  ends_at: new Date(Date.now() + 14.5 * 3600 * 1000).toISOString(), // 14 hours 30 mins from now
  product_id: 'deal-of-the-day'
};

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
      // If table is empty, insert default active-deal
      await saveDailyDealToDB(DEFAULT_DEAL, 'active-deal');
      return [DEFAULT_DEAL];
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
    return [DEFAULT_DEAL];
  }
}

/**
 * Get the currently active daily deal from a list of deals based on ends_at values.
 * Returns the first deal that ends in the future.
 */
export function getActiveDailyDeal(allDeals) {
  if (!allDeals || allDeals.length === 0) return null;
  
  // Sort deals by ends_at ascending
  const sortedDeals = [...allDeals].sort((a, b) => new Date(a.ends_at) - new Date(b.ends_at));
  
  // Find first deal that expires in the future
  const now = Date.now();
  const active = sortedDeals.find(d => new Date(d.ends_at).getTime() > now);
  
  return active || null;
}

/**
 * Fetch the active daily deal (or fallback to DEFAULT_DEAL if none are in the future).
 * This function is used by the storefront so it doesn't need to know about slots.
 */
export async function fetchDailyDealFromDB() {
  const deals = await fetchDailyDealsFromDB();
  const active = getActiveDailyDeal(deals);
  return active || DEFAULT_DEAL;
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
