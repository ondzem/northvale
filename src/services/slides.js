import { supabase } from '../supabase';

// Static default slides for instant initial render before DB query resolves
export const DEFAULT_SLIDES = [
  {
    id: 'hero-slide-primary',
    desktop_image_url: '/hero_slide_primary.webp',
    mobile_image_url: '/hero_slide_primary_mobile.webp',
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

    const cleaned = (data || []).map(slide => {
      let dUrl = slide.desktop_image_url;
      let mUrl = slide.mobile_image_url;

      if (!dUrl || dUrl.includes('pohoda-orders')) {
        dUrl = '/hero_slide_primary.webp';
      }
      if (!mUrl || mUrl.includes('pohoda-orders')) {
        mUrl = '/hero_slide_primary_mobile.webp';
      }

      return {
        ...slide,
        desktop_image_url: dUrl,
        mobile_image_url: mUrl
      };
    });

    cachedSlides = cleaned;
    return cleaned;
  } catch (err) {
    console.warn('Database hero_slides fetch failed, using defaults:', err.message || err);
    return DEFAULT_SLIDES;
  }
}

export async function uploadSlideImageToStorage(dataUrl, fileNamePrefix = 'hero_slide') {
  if (!dataUrl || !dataUrl.startsWith('data:')) {
    return dataUrl;
  }

  try {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const fileName = `${fileNamePrefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.webp`;

    const { error: uploadErr } = await supabase.storage
      .from('hero-slides')
      .upload(fileName, blob, {
        contentType: 'image/webp',
        upsert: true
      });

    if (uploadErr) {
      console.warn('Storage upload warning:', uploadErr);
      return dataUrl;
    }

    const { data: publicUrlData } = supabase.storage
      .from('hero-slides')
      .getPublicUrl(fileName);

    return publicUrlData?.publicUrl || dataUrl;
  } catch (err) {
    console.error('Failed to upload slide image to storage:', err);
    return dataUrl;
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

    let finalDesktopUrl = slide.desktop_image_url;
    let finalMobileUrl = slide.mobile_image_url;

    if (finalDesktopUrl && finalDesktopUrl.startsWith('data:')) {
      finalDesktopUrl = await uploadSlideImageToStorage(finalDesktopUrl, 'hero_desktop');
    }
    if (finalMobileUrl && finalMobileUrl.startsWith('data:')) {
      finalMobileUrl = await uploadSlideImageToStorage(finalMobileUrl, 'hero_mobile');
    }

    // Map clean entity to database fields
    const payload = {
      desktop_image_url: finalDesktopUrl,
      mobile_image_url: finalMobileUrl,
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
