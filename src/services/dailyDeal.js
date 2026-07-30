import { supabase } from '../supabase';

let cachedDeals = [];

/**
 * Helper: Parse YYYY-MM-DD + HH:mm assuming Europe/Prague timezone into UTC ISO string.
 */
export function parsePragueDateTimeToISO(dateStr, timeStr) {
  if (!dateStr) return null;
  const tStr = timeStr || '00:00';
  const testDate = new Date(`${dateStr}T${tStr}:00Z`);
  const pragueStr = testDate.toLocaleString('en-US', { timeZone: 'Europe/Prague', timeZoneName: 'short' });
  const isSummer = pragueStr.includes('GMT+2') || pragueStr.includes('CEST') || pragueStr.includes('GMT+02');
  const offset = isSummer ? '+02:00' : '+01:00';
  const isoWithOffset = `${dateStr}T${tStr}:00${offset}`;
  return new Date(isoWithOffset).toISOString();
}

/**
 * Helper: Format an ISO string to Czech date format: "D. M. YYYY v HH:mm" (Europe/Prague).
 */
export function formatPragueDateTime(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '';
  const day = d.toLocaleDateString('cs-CZ', { timeZone: 'Europe/Prague', day: 'numeric', month: 'numeric', year: 'numeric' });
  const time = d.toLocaleTimeString('cs-CZ', { timeZone: 'Europe/Prague', hour: '2-digit', minute: '2-digit' });
  return `${day} v ${time}`;
}

/**
 * Helper: Extract YYYY-MM-DD and HH:mm in Europe/Prague timezone from ISO string.
 */
export function getPragueDateAndTimeString(isoString) {
  if (!isoString) {
    const now = new Date();
    const dateStr = now.toLocaleDateString('sv-SE', { timeZone: 'Europe/Prague' }); // "YYYY-MM-DD"
    const timeStr = now.toLocaleTimeString('cs-CZ', { timeZone: 'Europe/Prague', hour: '2-digit', minute: '2-digit' });
    return { startDate: dateStr, startTime: timeStr };
  }
  const d = new Date(isoString);
  if (isNaN(d.getTime())) {
    const now = new Date();
    return {
      startDate: now.toLocaleDateString('sv-SE', { timeZone: 'Europe/Prague' }),
      startTime: now.toLocaleTimeString('cs-CZ', { timeZone: 'Europe/Prague', hour: '2-digit', minute: '2-digit' })
    };
  }
  const startDate = d.toLocaleDateString('sv-SE', { timeZone: 'Europe/Prague' }); // "YYYY-MM-DD"
  const startTime = d.toLocaleTimeString('cs-CZ', { timeZone: 'Europe/Prague', hour: '2-digit', minute: '2-digit' });
  return { startDate, startTime };
}

/**
 * Get current deal status: 'active' | 'scheduled' | 'expired'
 */
export function getDealStatus(deal) {
  if (!deal) return 'expired';
  const now = Date.now();
  const startsAt = deal.starts_at ? new Date(deal.starts_at).getTime() : 0;
  const endsAt = deal.ends_at ? new Date(deal.ends_at).getTime() : 0;

  if (startsAt > 0 && now < startsAt) {
    return 'scheduled';
  }
  if (endsAt > 0 && now > endsAt) {
    return 'expired';
  }
  return 'active';
}

/**
 * Fetch all daily deal slots from Supabase and merge timing config.
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

    let config = {};
    try {
      const edgeRes = await supabase.functions.invoke('finalize-order', {
        body: { action: 'get-daily-deal-config' }
      });
      if (edgeRes.data && edgeRes.data.config) {
        config = edgeRes.data.config;
      }
    } catch (_e) {
      console.warn('Daily deal Edge config fetch failed, using DB/localStorage fallback');
    }

    let localConfig = {};
    try {
      const stored = localStorage.getItem('northvale-daily-deals-config');
      if (stored) localConfig = JSON.parse(stored);
    } catch (_e) {}

    const merged = (data || []).map(d => {
      const cfg = config[d.id] || localConfig[d.id] || {};
      return {
        ...d,
        starts_at: d.starts_at || cfg.starts_at || null,
        ends_at: d.ends_at || cfg.ends_at || null
      };
    });

    cachedDeals = merged;
    return merged;
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
 * Compute effective remaining stock for a daily deal.
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
 * Get currently active daily deal based on starts_at and ends_at values.
 */
export function getActiveDailyDeal(allDeals, linkedProducts = []) {
  if (!allDeals || allDeals.length === 0) return null;
  
  const sortedDeals = [...allDeals].sort((a, b) => new Date(a.ends_at) - new Date(b.ends_at));
  
  const active = sortedDeals.find(d => {
    const status = getDealStatus(d);
    if (status !== 'active') return false;
    const stock = getEffectiveDealStock(d, linkedProducts);
    if (stock <= 0) return false;
    return true;
  });
  
  return active || null;
}

/**
 * Fetch active daily deal.
 */
export async function fetchDailyDealFromDB() {
  const deals = await fetchDailyDealsFromDB();
  
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

    // Save timing config to Storage via Edge Function
    try {
      await supabase.functions.invoke('finalize-order', {
        body: {
          action: 'save-daily-deal-config',
          slotId,
          config: {
            starts_at: deal.starts_at || null,
            ends_at: deal.ends_at || null
          }
        }
      });
    } catch (_e) {
      console.warn('Edge Function save-daily-deal-config failed, saved locally');
    }

    // Save locally
    try {
      let localConfig = {};
      const stored = localStorage.getItem('northvale-daily-deals-config');
      if (stored) localConfig = JSON.parse(stored);
      localConfig[slotId] = { starts_at: deal.starts_at || null, ends_at: deal.ends_at || null };
      localStorage.setItem('northvale-daily-deals-config', JSON.stringify(localConfig));
    } catch (_e) {}

    // Refresh cachedDeals
    await fetchDailyDealsFromDB();
    
    try {
      localStorage.setItem('northvale-cached-deals', JSON.stringify(cachedDeals));
      const active = getActiveDailyDeal(cachedDeals);
      if (active) {
        localStorage.setItem('northvale-cached-deal', JSON.stringify(active));
      }
    } catch (e) {
      console.warn('Failed to cache daily_deals locally:', e);
    }

    return { data: { ...data, starts_at: deal.starts_at }, error: null };
  } catch (err) {
    console.error('Failed to save daily_deal to Supabase:', err);

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
 * Delete a specific daily deal slot.
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
      console.warn('Failed to cache daily_deals locally after deletion:', e);
    }

    return { error: null };
  } catch (err) {
    console.error(`Failed to delete daily_deal slot ${slotId} from Supabase:`, err);
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
