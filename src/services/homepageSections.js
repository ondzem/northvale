import { supabase } from '../supabase';

// Standard fallback config keys mapped to empty arrays
export const DEFAULT_SECTIONS = {
  newArrivals: [],
  preorders: [],
  accessories: []
};

/**
 * Fetch assigned product IDs for each homepage section.
 * Utilizes local cache for immediate rendering, revalidating in background.
 */
export async function fetchHomepageSectionsFromDB() {
  try {
    if (!supabase.from) {
      throw new Error('Supabase client is not initialized');
    }

    const { data, error } = await supabase
      .from('homepage_sections')
      .select('*');

    if (error) {
      throw error;
    }

    const config = {
      newArrivals: [],
      preorders: [],
      accessories: []
    };

    if (data && data.length > 0) {
      data.forEach(row => {
        config[row.section_key] = row.product_ids || [];
      });
    } else {
      // Initialize with empty DB entries if query returned no rows
      await saveHomepageSectionToDB('newArrivals', []);
      await saveHomepageSectionToDB('preorders', []);
      await saveHomepageSectionToDB('accessories', []);
    }

    // Cache the verified results
    try {
      localStorage.setItem('northvale-cached-sections', JSON.stringify(config));
    } catch (e) {
      console.warn('Failed to cache homepage sections locally:', e);
    }

    return config;
  } catch (err) {
    console.warn('Database homepage_sections fetch failed, using local fallback:', err.message || err);
    
    // Read from localStorage cache if DB call is down
    try {
      const cached = localStorage.getItem('northvale-cached-sections');
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      console.warn('Failed to parse cached homepage sections:', e);
    }
    
    return { ...DEFAULT_SECTIONS };
  }
}

/**
 * Save / Update a list of product IDs for a specific homepage section.
 */
export async function saveHomepageSectionToDB(sectionKey, productIds) {
  try {
    if (!supabase.from) {
      throw new Error('Supabase client is not initialized');
    }

    const payload = {
      section_key: sectionKey,
      product_ids: productIds,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('homepage_sections')
      .upsert(payload);

    if (error) {
      throw error;
    }

    // Re-fetch and update all caches
    const updatedConfig = await fetchHomepageSectionsFromDB();
    return { data: updatedConfig, error: null };
  } catch (err) {
    console.error('Failed to save homepage section to DB:', err);
    
    // Fallback: save to local cache so the user sees their changes instantly
    try {
      const cachedString = localStorage.getItem('northvale-cached-sections');
      const currentConfig = cachedString ? JSON.parse(cachedString) : { ...DEFAULT_SECTIONS };
      currentConfig[sectionKey] = productIds;
      localStorage.setItem('northvale-cached-sections', JSON.stringify(currentConfig));
      return { data: currentConfig, error: null, isMockFallback: true, dbError: err.message || String(err) };
    } catch (e) {
      console.warn('Failed to update local cache during fallback:', e);
    }
    
    return { data: null, error: err };
  }
}
