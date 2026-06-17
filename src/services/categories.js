import { supabase } from '../supabase';

// Static default categories to fallback to if the Supabase table doesn't exist yet
export const mockCategories = [
  // --- TOP LEVEL GAMES ---
  { id: 'game-pokemon', name_cz: 'Pokémon TCG', name_en: 'Pokémon TCG', type: 'single', game: 'Pokémon', parent_id: null },
  { id: 'game-lorcana', name_cz: 'Disney Lorcana', name_en: 'Disney Lorcana', type: 'single', game: 'Lorcana', parent_id: null },
  { id: 'game-onepiece', name_cz: 'One Piece Card Game', name_en: 'One Piece Card Game', type: 'single', game: 'One Piece', parent_id: null },
  { id: 'game-riftbound', name_cz: 'Riftbound', name_en: 'Riftbound', type: 'single', game: 'Riftbound', parent_id: null },
  
  // --- POKEMON EXPANSION SETS ---
  { id: 'set-obsidian-flames', name_cz: 'Obsidian Flames', name_en: 'Obsidian Flames', type: 'single', game: 'Pokémon', parent_id: 'game-pokemon' },
  { id: 'set-vivid-voltage', name_cz: 'Vivid Voltage', name_en: 'Vivid Voltage', type: 'single', game: 'Pokémon', parent_id: 'game-pokemon' },
  { id: 'set-evolving-skies', name_cz: 'Evolving Skies', name_en: 'Evolving Skies', type: 'single', game: 'Pokémon', parent_id: 'game-pokemon' },
  { id: 'set-lost-origin', name_cz: 'Lost Origin', name_en: 'Lost Origin', type: 'single', game: 'Pokémon', parent_id: 'game-pokemon' },
  { id: 'set-151', name_cz: 'Scarlet & Violet - 151', name_en: 'Scarlet & Violet - 151', type: 'single', game: 'Pokémon', parent_id: 'game-pokemon' },
  { id: 'set-stellar-crown', name_cz: 'Stellar Crown', name_en: 'Stellar Crown', type: 'single', game: 'Pokémon', parent_id: 'game-pokemon' },
  { id: 'set-shrouded-fable', name_cz: 'Shrouded Fable', name_en: 'Shrouded Fable', type: 'single', game: 'Pokémon', parent_id: 'game-pokemon' },
  { id: 'set-paldean-fates', name_cz: 'Paldean Fates', name_en: 'Paldean Fates', type: 'single', game: 'Pokémon', parent_id: 'game-pokemon' },
  { id: 'set-silver-tempest', name_cz: 'Silver Tempest', name_en: 'Silver Tempest', type: 'single', game: 'Pokémon', parent_id: 'game-pokemon' },

  // --- LORCANA EXPANSION SETS ---
  { id: 'set-first-chapter', name_cz: 'The First Chapter', name_en: 'The First Chapter', type: 'single', game: 'Lorcana', parent_id: 'game-lorcana' },
  { id: 'set-shimmering-skies', name_cz: 'Shimmering Skies', name_en: 'Shimmering Skies', type: 'single', game: 'Lorcana', parent_id: 'game-lorcana' },
  { id: 'set-rise-floodborn', name_cz: 'Rise of the Floodborn', name_en: 'Rise of the Floodborn', type: 'single', game: 'Lorcana', parent_id: 'game-lorcana' },
  { id: 'set-ursulas-return', name_cz: 'Ursula\'s Return', name_en: 'Ursula\'s Return', type: 'single', game: 'Lorcana', parent_id: 'game-lorcana' },

  // --- ONE PIECE EXPANSION SETS ---
  { id: 'set-awakening-era', name_cz: 'Awakening of the New Era', name_en: 'Awakening of the New Era', type: 'single', game: 'One Piece', parent_id: 'game-onepiece' },
  { id: 'set-two-legends', name_cz: 'Two Legends', name_en: 'Two Legends', type: 'single', game: 'One Piece', parent_id: 'game-onepiece' },
  { id: 'set-500-years', name_cz: '500 Years in the Future', name_en: '500 Years in the Future', type: 'single', game: 'One Piece', parent_id: 'game-onepiece' },

  // --- RIFTBOUND EXPANSION SETS ---
  { id: 'set-riftbound-base', name_cz: 'Základní hra', name_en: 'Base Game', type: 'single', game: 'Riftbound', parent_id: 'game-riftbound' },
  { id: 'set-riftbound-accessories', name_cz: 'Příslušenství', name_en: 'Accessories', type: 'single', game: 'Riftbound', parent_id: 'game-riftbound' },

  // --- ACCESSORIES SUBCATEGORIES ---
  { id: 'cat-sleeves', name_cz: 'Sleevy / Obaly', name_en: 'Sleeves', type: 'accessory', game: 'Accessories', parent_id: null },
  { id: 'cat-toploaders', name_cz: 'Toploadery', name_en: 'Toploaders', type: 'accessory', game: 'Accessories', parent_id: null },
  { id: 'cat-binders', name_cz: 'Alba / PRO-Bindery', name_en: 'Binders / Albums', type: 'accessory', game: 'Accessories', parent_id: null },
  { id: 'cat-other-acc', name_cz: 'Ostatní příslušenství', name_en: 'Other Accessories', type: 'accessory', game: 'Accessories', parent_id: null },

  // --- ACRYLICS SUBCATEGORIES ---
  { id: 'cat-acrylics-booster', name_cz: 'Ochrana Booster Boxů', name_en: 'Booster Box Cases', type: 'accessory', game: 'Acrylics', parent_id: null },
  { id: 'cat-acrylics-etb', name_cz: 'Ochrana ETB boxů', name_en: 'ETB Cases', type: 'accessory', game: 'Acrylics', parent_id: null },
  { id: 'cat-acrylics-trove', name_cz: 'Ochrana Trove boxů', name_en: 'Trove Cases', type: 'accessory', game: 'Acrylics', parent_id: null },
  { id: 'cat-acrylics-slabs', name_cz: 'Stojánky na graded slabs', name_en: 'Slab Stands', type: 'accessory', game: 'Acrylics', parent_id: null }
];

/**
 * Fetch all categories from Supabase, falling back to mockCategories on error.
 */
export async function fetchCategoriesFromDB() {
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

    if (data && data.length > 0) {
      return data;
    }
    
    return mockCategories;
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

    return { error: null };
  } catch (err) {
    console.error(`Failed to delete category ${id} from database:`, err.message || err);
    return { error: err };
  }
}
