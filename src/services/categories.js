import { supabase } from '../supabase';

// Static default categories to fallback to if the Supabase table doesn't exist yet
export const mockCategories = [
  // --- TOP LEVEL GAMES ---
  { id: 'game-pokemon', name_cz: 'Pokémon TCG', name_en: 'Pokémon TCG', type: 'single', game: 'Pokémon', parent_id: null },
  { id: 'game-lorcana', name_cz: 'Disney Lorcana', name_en: 'Disney Lorcana', type: 'single', game: 'Lorcana', parent_id: null },
  { id: 'game-onepiece', name_cz: 'One Piece Card Game', name_en: 'One Piece Card Game', type: 'single', game: 'One Piece', parent_id: null },
  { id: 'game-riftbound', name_cz: 'Riftbound', name_en: 'Riftbound', type: 'single', game: 'Riftbound', parent_id: null },
  
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

  // --- RIFTBOUND SUB-CATEGORIES (Level 2) ---
  { id: 'riftbound-booster-box', name_cz: 'Booster Boxy', name_en: 'Booster Boxes', type: 'sealed', game: 'Riftbound', parent_id: 'game-riftbound' },
  { id: 'riftbound-boostery', name_cz: 'Boostery', name_en: 'Booster Packs', type: 'sealed', game: 'Riftbound', parent_id: 'game-riftbound' },
  { id: 'riftbound-trial-decky', name_cz: 'Trial Decky', name_en: 'Trial Decks', type: 'sealed', game: 'Riftbound', parent_id: 'game-riftbound' },
  { id: 'riftbound-other', name_cz: 'Ostatní', name_en: 'Others', type: 'sealed', game: 'Riftbound', parent_id: 'game-riftbound' },

  // --- RIFTBOUND SUB-SUBCATEGORIES (Level 3) ---
  { id: 'riftbound-standard-booster-box', name_cz: 'Standard Booster Box', name_en: 'Standard Booster Box', type: 'sealed', game: 'Riftbound', parent_id: 'riftbound-booster-box' },
  { id: 'riftbound-standard-booster-pack', name_cz: 'Standard Booster Pack', name_en: 'Standard Booster Pack', type: 'sealed', game: 'Riftbound', parent_id: 'riftbound-boostery' },
  { id: 'riftbound-standard-trial-deck', name_cz: 'Standard Trial Deck', name_en: 'Standard Trial Deck', type: 'sealed', game: 'Riftbound', parent_id: 'riftbound-trial-decky' },
  { id: 'riftbound-official-playmat', name_cz: 'Official Playmat', name_en: 'Official Playmat', type: 'sealed', game: 'Riftbound', parent_id: 'riftbound-other' },

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

// In-memory cache for categories
let cachedCategories = null;
let categoriesCacheTime = 0;
const CATEGORIES_CACHE_TTL = 300000; // 5 minutes cache TTL

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

    let finalCategories = [...mockCategories];
    if (data && data.length > 0) {
      data.forEach(dbCat => {
        const idx = finalCategories.findIndex(m => m.id === dbCat.id);
        if (idx !== -1) {
          finalCategories[idx] = dbCat;
        } else {
          finalCategories.push(dbCat);
        }
      });
    }
    
    cachedCategories = finalCategories;
    categoriesCacheTime = now;
    return finalCategories;
  } catch (err) {
    console.warn('Database categories query failed, using local fallback:', err.message || err);
    return mockCategories;
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

    return { error: null };
  } catch (err) {
    console.error(`Failed to delete category ${id} from database:`, err.message || err);
    return { error: err };
  }
}
