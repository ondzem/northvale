import { supabase } from '../supabase';

// Static default categories to fallback to if the Supabase table doesn't exist yet
export const mockCategories = [
  // --- TOP LEVEL GAMES ---
  { id: 'game-pokemon', name_cz: 'Pokémon TCG', name_en: 'Pokémon TCG', type: 'single', game: 'Pokémon', parent_id: null },
  { id: 'game-lorcana', name_cz: 'Disney Lorcana', name_en: 'Disney Lorcana', type: 'single', game: 'Lorcana', parent_id: null },
  { id: 'game-onepiece', name_cz: 'One Piece Card Game', name_en: 'One Piece Card Game', type: 'single', game: 'One Piece', parent_id: null },
  { id: 'game-ostatni', name_cz: 'Ostatní TCG', name_en: 'Other TCG', type: 'single', game: 'Ostatní TCG', parent_id: null },
  
  // --- POKEMON SUB-CATEGORIES (Level 2) ---
  { id: 'pokemon-booster-box', name_cz: 'Booster Boxy', name_en: 'Booster Boxes', type: 'sealed', game: 'Pokémon', parent_id: 'game-pokemon' },
  { id: 'pokemon-etb', name_cz: 'Elite Trainer Boxy', name_en: 'Elite Trainer Boxes', type: 'sealed', game: 'Pokémon', parent_id: 'game-pokemon' },
  { id: 'pokemon-bundles', name_cz: 'Bundles', name_en: 'Booster Bundles', type: 'sealed', game: 'Pokémon', parent_id: 'game-pokemon' },
  { id: 'pokemon-boostery', name_cz: 'Boostery', name_en: 'Booster Packs', type: 'sealed', game: 'Pokémon', parent_id: 'game-pokemon' },
  { id: 'pokemon-special', name_cz: 'Speciální kolekce', name_en: 'Special Collections', type: 'sealed', game: 'Pokémon', parent_id: 'game-pokemon' },
  { id: 'pokemon-other', name_cz: 'Ostatní', name_en: 'Others', type: 'sealed', game: 'Pokémon', parent_id: 'game-pokemon' },

  // --- POKEMON SUB-SUBCATEGORIES / TYPES (Level 3 under Booster Boxy) ---
  { id: 'pokemon-draft-booster-box', name_cz: 'Draft Booster Box', name_en: 'Draft Booster Box', type: 'sealed', game: 'Pokémon', parent_id: 'pokemon-booster-box' },
  { id: 'pokemon-collector-booster-box', name_cz: 'Collector Booster Box', name_en: 'Collector Booster Box', type: 'sealed', game: 'Pokémon', parent_id: 'pokemon-booster-box' },
  { id: 'pokemon-set-booster-box', name_cz: 'Set Booster Box', name_en: 'Set Booster Box', type: 'sealed', game: 'Pokémon', parent_id: 'pokemon-booster-box' },
  { id: 'pokemon-jumpstart-booster-box', name_cz: 'Jumpstart Booster Box', name_en: 'Jumpstart Booster Box', type: 'sealed', game: 'Pokémon', parent_id: 'pokemon-booster-box' },
  { id: 'pokemon-japanese-booster-box', name_cz: 'Japonský Booster Box', name_en: 'Japanese Booster Box', type: 'sealed', game: 'Pokémon', parent_id: 'pokemon-booster-box' },
  { id: 'pokemon-chinese-booster-box', name_cz: 'Čínský Booster Box', name_en: 'Chinese Booster Box', type: 'sealed', game: 'Pokémon', parent_id: 'pokemon-booster-box' },

  // --- POKEMON SUB-SUBCATEGORIES (Level 3 under ETB) ---
  { id: 'pokemon-standard-etb', name_cz: 'Standard ETB', name_en: 'Standard ETB', type: 'sealed', game: 'Pokémon', parent_id: 'pokemon-etb' },
  { id: 'pokemon-center-etb', name_cz: 'Pokémon Center ETB', name_en: 'Pokémon Center ETB', type: 'sealed', game: 'Pokémon', parent_id: 'pokemon-etb' },

  // --- POKEMON SUB-SUBCATEGORIES (Level 3 under Bundles) ---
  { id: 'pokemon-booster-bundle', name_cz: 'Booster Bundle', name_en: 'Booster Bundle', type: 'sealed', game: 'Pokémon', parent_id: 'pokemon-bundles' },

  // --- POKEMON SUB-SUBCATEGORIES (Level 3 under Boostery) ---
  { id: 'pokemon-standard-booster', name_cz: 'Standard Booster', name_en: 'Standard Booster', type: 'sealed', game: 'Pokémon', parent_id: 'pokemon-boostery' },
  { id: 'pokemon-japanese-booster', name_cz: 'Japonský Booster', name_en: 'Japanese Booster', type: 'sealed', game: 'Pokémon', parent_id: 'pokemon-boostery' },
  { id: 'pokemon-chinese-booster', name_cz: 'Čínský Booster', name_en: 'Chinese Booster', type: 'sealed', game: 'Pokémon', parent_id: 'pokemon-boostery' },

  // --- POKEMON SUB-SUBCATEGORIES (Level 3 under Special Collection) ---
  { id: 'pokemon-premium-collection', name_cz: 'Premium Collection', name_en: 'Premium Collection', type: 'sealed', game: 'Pokémon', parent_id: 'pokemon-special' },
  { id: 'pokemon-japanese-special-set', name_cz: 'Japonský Speciální Set', name_en: 'Japanese Special Set', type: 'sealed', game: 'Pokémon', parent_id: 'pokemon-special' },

  // --- POKEMON SUB-SUBCATEGORIES (Level 3 under Other) ---
  { id: 'pokemon-sealed-case', name_cz: 'Sady boxů (Case)', name_en: 'Cases', type: 'sealed', game: 'Pokémon', parent_id: 'pokemon-other' },
  { id: 'pokemon-japanese-other', name_cz: 'Japonské ostatní', name_en: 'Japanese Other', type: 'sealed', game: 'Pokémon', parent_id: 'pokemon-other' },

  // --- LORCANA SUB-CATEGORIES (Level 2) ---
  { id: 'lorcana-booster-box', name_cz: 'Booster Boxy', name_en: 'Booster Boxes', type: 'sealed', game: 'Lorcana', parent_id: 'game-lorcana' },
  { id: 'lorcana-trove-box', name_cz: 'Trove Boxy', name_en: 'Trove Boxes', type: 'sealed', game: 'Lorcana', parent_id: 'game-lorcana' },
  { id: 'lorcana-boostery', name_cz: 'Boostery', name_en: 'Booster Packs', type: 'sealed', game: 'Lorcana', parent_id: 'game-lorcana' },
  { id: 'lorcana-other', name_cz: 'Ostatní', name_en: 'Others', type: 'sealed', game: 'Lorcana', parent_id: 'game-lorcana' },

  // --- LORCANA SUB-SUBCATEGORIES (Level 3) ---
  { id: 'lorcana-standard-booster-box', name_cz: 'Standard Booster Box', name_en: 'Standard Booster Box', type: 'sealed', game: 'Lorcana', parent_id: 'lorcana-booster-box' },
  { id: 'lorcana-illumineers-trove', name_cz: 'Illumineer\'s Trove', name_en: 'Illumineer\'s Trove', type: 'sealed', game: 'Lorcana', parent_id: 'lorcana-trove-box' },
  { id: 'lorcana-standard-booster', name_cz: 'Standard Booster', name_en: 'Standard Booster', type: 'sealed', game: 'Lorcana', parent_id: 'lorcana-boostery' },
  { id: 'lorcana-starter-deck', name_cz: 'Starter Deck', name_en: 'Starter Deck', type: 'sealed', game: 'Lorcana', parent_id: 'lorcana-other' },

  // --- ONE PIECE SUB-CATEGORIES (Level 2) ---
  { id: 'onepiece-booster-box', name_cz: 'Booster Boxy', name_en: 'Booster Boxes', type: 'sealed', game: 'One Piece', parent_id: 'game-onepiece' },
  { id: 'onepiece-boostery', name_cz: 'Boostery', name_en: 'Booster Packs', type: 'sealed', game: 'One Piece', parent_id: 'game-onepiece' },
  { id: 'onepiece-other', name_cz: 'Ostatní', name_en: 'Others', type: 'sealed', game: 'One Piece', parent_id: 'game-onepiece' },

  // --- ONE PIECE SUB-SUBCATEGORIES (Level 3) ---
  { id: 'onepiece-english-booster-box', name_cz: 'English Booster Box', name_en: 'English Booster Box', type: 'sealed', game: 'One Piece', parent_id: 'onepiece-booster-box' },
  { id: 'onepiece-english-booster-pack', name_cz: 'English Booster Pack', name_en: 'English Booster Pack', type: 'sealed', game: 'One Piece', parent_id: 'onepiece-boostery' },
  { id: 'onepiece-starter-deck', name_cz: 'Starter Deck', name_en: 'Starter Deck', type: 'sealed', game: 'One Piece', parent_id: 'onepiece-other' },

  // --- OSTATNI TCG SUB-CATEGORIES (Level 2) ---
  { id: 'ostatni-booster-box', name_cz: 'Booster Boxy', name_en: 'Booster Boxes', type: 'sealed', game: 'Ostatní TCG', parent_id: 'game-ostatni' },
  { id: 'ostatni-boostery', name_cz: 'Boostery', name_en: 'Booster Packs', type: 'sealed', game: 'Ostatní TCG', parent_id: 'game-ostatni' },
  { id: 'ostatni-trial-decky', name_cz: 'Trial Decky', name_en: 'Trial Decks', type: 'sealed', game: 'Ostatní TCG', parent_id: 'game-ostatni' },
  { id: 'ostatni-other', name_cz: 'Ostatní', name_en: 'Others', type: 'sealed', game: 'Ostatní TCG', parent_id: 'game-ostatni' },

  // --- OSTATNI TCG SUB-SUBCATEGORIES (Level 3) ---
  { id: 'ostatni-standard-booster-box', name_cz: 'Standard Booster Box', name_en: 'Standard Booster Box', type: 'sealed', game: 'Ostatní TCG', parent_id: 'ostatni-booster-box' },
  { id: 'ostatni-standard-booster-pack', name_cz: 'Standard Booster Pack', name_en: 'Standard Booster Pack', type: 'sealed', game: 'Ostatní TCG', parent_id: 'ostatni-boostery' },
  { id: 'ostatni-standard-trial-deck', name_cz: 'Standard Trial Deck', name_en: 'Standard Trial Deck', type: 'sealed', game: 'Ostatní TCG', parent_id: 'ostatni-trial-decky' },
  { id: 'ostatni-official-playmat', name_cz: 'Official Playmat', name_en: 'Official Playmat', type: 'sealed', game: 'Ostatní TCG', parent_id: 'ostatni-other' },

  // --- ACCESSORIES SUB-CATEGORIES (Level 2) ---
  { id: 'game-accessories', name_cz: 'Všechno příslušenství', name_en: 'All Accessories', type: 'accessory', game: 'Accessories', parent_id: null },
  { id: 'cat-sleeves', name_cz: 'Sleevy / Obaly', name_en: 'Sleeves', type: 'accessory', game: 'Accessories', parent_id: 'game-accessories' },
  { id: 'cat-toploaders', name_cz: 'Toploadery', name_en: 'Toploaders', type: 'accessory', game: 'Accessories', parent_id: 'game-accessories' },
  { id: 'cat-binders', name_cz: 'Alba / PRO-Bindery', name_en: 'Binders / Albums', type: 'accessory', game: 'Accessories', parent_id: 'game-accessories' },
  { id: 'cat-other-acc', name_cz: 'Ostatní příslušenství', name_en: 'Other Accessories', type: 'accessory', game: 'Accessories', parent_id: 'game-accessories' },

  // --- ACCESSORIES SUB-SUBCATEGORIES (Level 3) ---
  { id: 'acc-standard-sleeves', name_cz: 'Standard Sleeves', name_en: 'Standard Sleeves', type: 'accessory', game: 'Accessories', parent_id: 'cat-sleeves' },
  { id: 'acc-standard-toploaders', name_cz: 'Standard Toploaders', name_en: 'Standard Toploaders', type: 'accessory', game: 'Accessories', parent_id: 'cat-toploaders' },
  { id: 'acc-albums-cards', name_cz: 'Alba na karty', name_en: 'Card Albums', type: 'accessory', game: 'Accessories', parent_id: 'cat-binders' },
  { id: 'acc-albums-toploaders', name_cz: 'Alba na toploadery', name_en: 'Toploader Albums', type: 'accessory', game: 'Accessories', parent_id: 'cat-binders' },
  { id: 'acc-albums-graded', name_cz: 'Alba na graded karty', name_en: 'Graded Card Albums', type: 'accessory', game: 'Accessories', parent_id: 'cat-binders' },
  { id: 'acc-standard-other', name_cz: 'Standardní příslušenství', name_en: 'Standard Accessories', type: 'accessory', game: 'Accessories', parent_id: 'cat-other-acc' },

  // --- ACRYLICS SUB-CATEGORIES (Level 2) ---
  { id: 'game-acrylics', name_cz: 'Všechny akryly', name_en: 'All Acrylic Cases', type: 'accessory', game: 'Acrylics', parent_id: null },
  { id: 'cat-acrylics-booster', name_cz: 'Ochrana Booster Boxů', name_en: 'Booster Box Cases', type: 'accessory', game: 'Acrylics', parent_id: 'game-acrylics' },
  { id: 'cat-acrylics-etb', name_cz: 'Ochrana ETB boxů', name_en: 'ETB Cases', type: 'accessory', game: 'Acrylics', parent_id: 'game-acrylics' },
  { id: 'cat-acrylics-trove', name_cz: 'Ochrana Trove boxů', name_en: 'Trove Cases', type: 'accessory', game: 'Acrylics', parent_id: 'game-acrylics' },
  { id: 'cat-acrylics-slabs', name_cz: 'Stojánky na graded slabs', name_en: 'Slab Stands', type: 'accessory', game: 'Acrylics', parent_id: 'game-acrylics' },

  // --- ACRYLICS SUB-SUBCATEGORIES (Level 3) ---
  { id: 'acrylic-pokemon-booster', name_cz: 'Pokémon akryly', name_en: 'Pokémon Acrylics', type: 'accessory', game: 'Acrylics', parent_id: 'cat-acrylics-booster' },
  { id: 'acrylic-pokemon-etb', name_cz: 'Pokémon ETB akryly', name_en: 'Pokémon ETB Acrylics', type: 'accessory', game: 'Acrylics', parent_id: 'cat-acrylics-etb' },
  { id: 'acrylic-lorcana-trove', name_cz: 'Lorcana akryly', name_en: 'Lorcana Acrylics', type: 'accessory', game: 'Acrylics', parent_id: 'cat-acrylics-trove' }
];

// In-memory and localStorage cache for categories
let cachedCategories = (() => {
  try {
    const val = localStorage.getItem('northvale-cached-categories');
    return val ? JSON.parse(val) : null;
  } catch {
    return null;
  }
})();

let categoriesCacheTime = (() => {
  try {
    const val = localStorage.getItem('northvale-cached-categories-time');
    return val ? Number(val) : 0;
  } catch {
    return 0;
  }
})();

const CATEGORIES_CACHE_TTL = 300000; // 5 minutes cache TTL

/**
 * Helper to get cached/local categories synchronously on initial mount.
 */
export function getCachedCategories() {
  return cachedCategories || [];
}

/**
 * Fetch all categories from Supabase, falling back to mockCategories on error.
 */
export async function fetchCategoriesFromDB() {
  const now = Date.now();
  if (cachedCategories && (now - categoriesCacheTime < CATEGORIES_CACHE_TTL)) {
    return cachedCategories;
  }

  try {
    if (!supabase.from) {
      throw new Error('Supabase client is not initialized');
    }

    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    // If query was successful and we have records in the database, return them.
    // Otherwise, if the database has no records (e.g. not seeded yet), fallback to mockCategories.
    let finalCategories = [];
    if (data && data.length > 0) {
      finalCategories = data;
    } else {
      finalCategories = mockCategories;
    }
    
    cachedCategories = finalCategories;
    categoriesCacheTime = now;

    try {
      localStorage.setItem('northvale-cached-categories', JSON.stringify(finalCategories));
      localStorage.setItem('northvale-cached-categories-time', String(categoriesCacheTime));
    } catch (e) {
      console.warn('Failed to save categories cache to localStorage:', e);
    }

    return finalCategories;
  } catch (err) {
    console.warn('Database categories query failed, using local fallback:', err.message || err);
    return cachedCategories || mockCategories;
  }
}

/**
 * Create or update a category inside Supabase.
 */
export async function saveCategoryToDB(category) {
  try {
    if (!supabase.from) {
      throw new Error('Supabase client is not initialized');
    }

    const { data, error } = await supabase
      .from('categories')
      .upsert(category)
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Invalidate categories cache
    cachedCategories = null;
    categoriesCacheTime = 0;

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('northvale-categories-updated'));
    }

    return { data, error: null };
  } catch (err) {
    console.error('Failed to save category to database:', err.message || err);
    return { data: null, error: err };
  }
}

/**
 * Delete a category by ID from Supabase.
 */
export async function deleteCategoryFromDB(id) {
  try {
    if (!supabase.from) {
      throw new Error('Supabase client is not initialized');
    }

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    // Invalidate categories cache
    cachedCategories = null;
    categoriesCacheTime = 0;

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('northvale-categories-updated'));
    }

    return { error: null };
  } catch (err) {
    console.error(`Failed to delete category ${id} from database:`, err.message || err);
    return { error: err };
  }
}

/**
 * Resolves the visual thumbnail icon/flag for a category.
 * Returns custom uploaded category image first, falls back to flag SVGs for language subcategories,
 * and defaults to matching game fallback logos for consistent UI rendering.
 */
export function getCategoryIcon(cat) {
  if (!cat) return '/Northvale Logo.webp';
  if (cat.image_url) return cat.image_url;
  const id = cat.id || '';

  // Custom premium flag badges for language categories (if no custom uploaded image is present)
  if (id === 'eng') {
    return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 30"><clipPath id="c"><circle cx="15" cy="15" r="14"/></clipPath><g clip-path="url(%23c)"><rect width="30" height="30" fill="%23012169"/><path d="M0,0 L30,30 M30,0 L0,30" stroke="%23fff" strokeWidth="3.5"/><path d="M0,0 L30,30 M30,0 L0,30" stroke="%23C8102E" strokeWidth="2"/><path d="M15,0 v30 M0,15 h30" stroke="%23fff" strokeWidth="5"/><path d="M15,0 v30 M0,15 h30" stroke="%23C8102E" strokeWidth="3"/></g><circle cx="15" cy="15" r="14.5" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1"/></svg>`;
  }
  if (id === 'jpn') {
    return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 30"><clipPath id="c"><circle cx="15" cy="15" r="14"/></clipPath><g clip-path="url(%23c)"><rect width="30" height="30" fill="%23fff"/><circle cx="15" cy="15" r="8" fill="%23BC002D"/></g><circle cx="15" cy="15" r="14.5" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1"/></svg>`;
  }
  if (id === 'chn') {
    return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 30"><clipPath id="c"><circle cx="15" cy="15" r="14"/></clipPath><g clip-path="url(%23c)"><rect width="30" height="30" fill="%23ee1c25"/><polygon points="8,5 6.5,10 11,7 6,7 10,10" fill="%23ffde00"/></g><circle cx="15" cy="15" r="14.5" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1"/></svg>`;
  }

  // Restore detailed category default icons
  if (id.includes('booster-box')) {
    return 'https://tcgplayer-cdn.tcgplayer.com/product/552309_in_1000x1000.jpg';
  }
  if (id.includes('etb') || id.includes('trove')) {
    return 'https://tcgplayer-cdn.tcgplayer.com/product/506307_in_1000x1000.jpg';
  }
  if (id.includes('bundle')) {
    return 'https://tcgplayer-cdn.tcgplayer.com/product/530267_in_1000x1000.jpg';
  }
  if (id.includes('booster')) {
    return 'https://tcgplayer-cdn.tcgplayer.com/product/550201_in_1000x1000.jpg';
  }
  if (id.includes('special')) {
    return 'https://tcgplayer-cdn.tcgplayer.com/product/561990_in_1000x1000.jpg';
  }
  if (id.includes('sleeves')) {
    return 'https://tcgplayer-cdn.tcgplayer.com/product/484394_in_1000x1000.jpg';
  }
  if (id.includes('toploader')) {
    return 'https://tcgplayer-cdn.tcgplayer.com/product/251347_in_1000x1000.jpg';
  }
  if (id.includes('binder') || id.includes('album')) {
    return 'https://tcgplayer-cdn.tcgplayer.com/product/251411_in_1000x1000.jpg';
  }
  if (id.includes('acrylic')) {
    return '/acrylic-etb-box.webp';
  }

  // Default to the game fallback logo if none of the above matches
  const game = cat.game || '';
  switch (game) {
    case 'Pokémon': return '/Pokemon.webp';
    case 'Lorcana': return '/lorcana logo.webp';
    case 'One Piece': return '/One piece.webp';
    case 'Ostatní TCG': return '/OstatniTCG.webp';
    case 'Accessories': return '/Prislusentstvi.webp';
    case 'Acrylics': return '/acrylic-etb-box.webp';
    default: return '/Northvale Logo.webp';
  }
}
