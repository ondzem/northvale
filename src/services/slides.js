import { supabase } from '../supabase';

// Static default slides for fallback if DB is empty or fails
export const DEFAULT_SLIDES = [
  {
    id: 'default-slide-1',
    desktop_image_url: '/Akce - NORTHVALE.webp',
    mobile_image_url: '/Akce - NORTHVALE.webp',
    redirect_page: 'sealed-catalog',
    sort_order: 1
  }
];

let cachedSlides = null;

/**
 * Fetch all hero slideshow banners from Supabase.
 * Falls back to default mock slides if table query fails or returns empty.
 */
export async function fetchSlidesFromDB() {
  try {
    if (!supabase.from) {
      throw new Error('Supabase client is not initialized');
    }

    const { data, error } = await supabase
      .from('hero_slides')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      return DEFAULT_SLIDES;
    }

    cachedSlides = data;
    return data;
  } catch (err) {
    console.warn('Database hero_slides fetch failed, using defaults:', err.message || err);
    return DEFAULT_SLIDES;
  }
}

/**
 * Save or update a slide in Supabase.
 */
export async function saveSlideToDB(slide) {
  try {
    if (!supabase.from) {
      throw new Error('Supabase client is not initialized');
    }

    // Map clean entity to database fields
    const payload = {
      desktop_image_url: slide.desktop_image_url,
      mobile_image_url: slide.mobile_image_url,
      redirect_page: slide.redirect_page || null,
      sort_order: slide.sort_order !== undefined ? Number(slide.sort_order) : 0
    };

    if (slide.id && !slide.id.startsWith('default-slide')) {
      payload.id = slide.id;
    }

    const { data, error } = await supabase
      .from('hero_slides')
      .upsert(payload)
      .select()
      .single();

    if (error) {
      throw error;
    }

    cachedSlides = null; // Invalidate cache
    return { data, error: null };
  } catch (err) {
    console.error('Failed to save slide to Supabase, fallback operation:', err);
    
    // Simulate fallback update in-memory
    const mockSlide = {
      ...slide,
      id: slide.id && !slide.id.startsWith('default-slide') ? slide.id : 'mock-slide-' + Math.random().toString(36).substr(2, 5)
    };

    return {
      data: mockSlide,
      error: null,
      isMockFallback: true,
      dbError: err.message || String(err)
    };
  }
}

/**
 * Delete a slide from Supabase.
 */
export async function deleteSlideFromDB(id) {
  try {
    if (!supabase.from) {
      throw new Error('Supabase client is not initialized');
    }

    // If deleting a default slide, mock it
    if (String(id).startsWith('default-slide')) {
      return { error: null, isMockFallback: true };
    }

    const { error } = await supabase
      .from('hero_slides')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    cachedSlides = null; // Invalidate cache
    return { error: null };
  } catch (err) {
    console.error(`Failed to delete slide ${id} from DB:`, err);
    return { error: null, isMockFallback: true, dbError: err.message || String(err) };
  }
}
