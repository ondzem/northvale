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

let cachedDeal = null;

/**
 * Fetch the active Deal of the Day from Supabase.
 * Falls back to default mock deal if table query fails or returns empty.
 */
export async function fetchDailyDealFromDB() {
  try {
    if (!supabase.from) {
      throw new Error('Supabase client is not initialized');
    }

    const { data, error } = await supabase
      .from('daily_deal')
      .select('*')
      .eq('id', 'active-deal')
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      // If table is empty, insert and return default deal
      await saveDailyDealToDB(DEFAULT_DEAL);
      return DEFAULT_DEAL;
    }

    cachedDeal = data;
    return data;
  } catch (err) {
    console.warn('Database daily_deal fetch failed, using fallback/cache:', err.message || err);
    
    // Check localStorage cache first
    try {
      const cached = localStorage.getItem('northvale-cached-deal');
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      console.warn('Failed to read cached daily_deal:', e);
    }
    
    return DEFAULT_DEAL;
  }
}

/**
 * Save or update the Deal of the Day in Supabase.
 */
export async function saveDailyDealToDB(deal) {
  try {
    if (!supabase.from) {
      throw new Error('Supabase client is not initialized');
    }

    // Map fields
    const payload = {
      id: 'active-deal',
      name: deal.name,
      image_url: deal.image_url || null,
      stock: deal.stock !== undefined ? Number(deal.stock) : 0,
      price: deal.price !== undefined ? Number(deal.price) : 0,
      original_price: deal.original_price !== undefined ? Number(deal.original_price) : null,
      ends_at: deal.ends_at,
      product_id: deal.product_id || null
    };

    const { data, error } = await supabase
      .from('daily_deal')
      .upsert(payload)
      .select()
      .single();

    if (error) {
      throw error;
    }

    cachedDeal = data;
    // Update local cache
    try {
      localStorage.setItem('northvale-cached-deal', JSON.stringify(data));
    } catch (e) {
      console.warn('Failed to cache daily_deal locally:', e);
    }

    return { data, error: null };
  } catch (err) {
    console.error('Failed to save daily_deal to Supabase:', err);

    // Fallback: save to localStorage cache to let it work client-side
    const fallbackDeal = {
      ...deal,
      id: 'active-deal'
    };
    try {
      localStorage.setItem('northvale-cached-deal', JSON.stringify(fallbackDeal));
    } catch (e) {
      console.warn('Failed to cache daily_deal locally during fallback:', e);
    }

    return {
      data: fallbackDeal,
      error: null,
      isMockFallback: true,
      dbError: err.message || String(err)
    };
  }
}
