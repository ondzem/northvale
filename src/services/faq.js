import { supabase } from '../supabase';

export const DEFAULT_FAQ = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    name_cz: 'Doprava a doručení',
    name_en: 'Shipping & Delivery',
    position: 0,
    questions: [
      {
        id: 'a1111111-1111-1111-1111-111111111111',
        category_id: '11111111-1111-1111-1111-111111111111',
        question_cz: 'Jaké jsou způsoby dopravy a kolik stojí?',
        question_en: 'What shipping methods do you offer and how much do they cost?',
        answer_cz: 'Nabízíme Zásilkovnu (79 Kč na výdejní místo), GLS (99 Kč doručení na adresu) a DPD (109 Kč doručení na adresu). Osobní odběr je zdarma na adrese Bratří Čapků 1095, Holice (případně dle domluvy v Pardubicích). Při nákupu nad 2 000 Kč máte dopravu zcela zdarma.',
        answer_en: 'We offer Packeta (79 CZK to pick-up points), GLS (99 CZK home delivery), and DPD (109 CZK home delivery). Local pickup is free at Bratří Čapků 1095, Holice (or by agreement in Pardubice). We offer free shipping on all orders over 2,000 CZK.',
        position: 0
      },
      {
        id: 'a2222222-2222-2222-2222-222222222222',
        category_id: '11111111-1111-1111-1111-111111111111',
        question_cz: 'Jak balíte kusové karty (Singles)?',
        question_en: 'How do you package single cards (Singles)?',
        answer_cz: 'Držíme se striktního sběratelského standardu: Karta jde do penny sleeve hlavou dolů, připevní se vytahovací páska (pull-tab), vloží se do toploaderu, ten jde do uzavíratelného team bagu, a ten se zafixuje v kartonovém sendviči (nepoužíváme izolepu na toploaderu). Nakonec vše vložíme do bublinkové obálky.',
        answer_en: 'We adhere strictly to collector-grade standards: each card is placed upside down in a penny sleeve, a pull-tab is attached, it is inserted into a toploader, placed inside a sealable team bag, and secured between cardboard layers (we never apply adhesive tape directly to the toploader). Finally, it is shipped in a bubble mailer.',
        position: 1
      },
      {
        id: 'a3333333-3333-3333-3333-333333333333',
        category_id: '11111111-1111-1111-1111-111111111111',
        question_cz: 'Kdy obdržím svou objednávku?',
        question_en: 'When will I receive my order?',
        answer_cz: 'Zásilky odesíláme do 24 hodin od zaplacení (v pracovní dny). Doručení obvykle trvá 24-48 hodin od expedice.',
        answer_en: 'We dispatch orders within 24 hours of payment (on business days). Delivery typically takes 24–48 hours after dispatch.',
        position: 2
      }
    ]
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    name_cz: 'Výkup karet (Buylist)',
    name_en: 'Card Buylist',
    position: 1,
    questions: [
      {
        id: 'b1111111-1111-1111-1111-111111111111',
        category_id: '22222222-2222-2222-2222-222222222222',
        question_cz: 'Jak funguje výkup karet?',
        question_en: 'How does the card buyback process work?',
        answer_cz: 'Karty naklikáte do výkupního košíku v našem portálu, zvolíte stav a jazyk a odešlete. Následně karty zabalíte a zašlete na naši adresu nebo odevzdáte osobně. Jakmile karty zkontrolujeme (do 48h od přijetí), vyplatíme Vám peníze přímo na Váš bankovní účet.',
        answer_en: 'Simply add your singles to the buylist cart in our portal, specify their condition and language, and submit. Then, pack the cards securely and send them to our address or drop them off in person. Once verified (usually within 48 hours), your payment will be sent directly to your bank account.',
        position: 0
      }
    ]
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    name_cz: 'Platby a reklamace',
    name_en: 'Payments & Claims',
    position: 2,
    questions: [
      {
        id: 'c1111111-1111-1111-1111-111111111111',
        category_id: '33333333-3333-3333-3333-333333333333',
        question_cz: 'Jaké platební metody podporujete?',
        question_en: 'What payment methods do you accept?',
        answer_cz: 'Můžete platit platební kartou online přes zabezpečenou platební bránu GP Webpay, nebo klasickým bankovním převodem.',
        answer_en: 'You can pay online by card via the secure GP Webpay payment gateway, or via standard bank transfer.',
        position: 0
      },
      {
        id: 'c2222222-2222-2222-2222-222222222222',
        category_id: '33333333-3333-3333-3333-333333333333',
        question_cz: 'Jak mohu zboží reklamovat?',
        question_en: 'How do I file a claim or return items?',
        answer_cz: 'Pokud se zásilka poškodila během přepravy nebo neodpovídá deklarovaný stav karty, kontaktujte nás e-mailem. Reklamace vyřizujeme obratem v souladu se zákonem.',
        answer_en: 'If your package is damaged during shipping or the card condition does not match its description, please contact us by email. We resolve all complaints promptly in compliance with consumer protection laws.',
        position: 1
      }
    ]
  }
];

/**
 * Fetch FAQ categories and items, returning them grouped.
 * Integrates local cache for immediate loading.
 */
export async function fetchFaqData() {
  try {
    if (!supabase.from) {
      throw new Error('Supabase client is not initialized');
    }

    const [catRes, itemRes] = await Promise.all([
      supabase.from('faq_categories').select('*').order('position', { ascending: true }),
      supabase.from('faq_items').select('*').order('position', { ascending: true })
    ]);

    if (catRes.error) throw catRes.error;
    if (itemRes.error) throw itemRes.error;

    const categories = catRes.data || [];
    const items = itemRes.data || [];

    // Group items into categories
    const structuredFaq = categories.map(cat => {
      return {
        ...cat,
        questions: items.filter(item => item.category_id === cat.id)
      };
    });

    // Save to cache
    try {
      localStorage.setItem('northvale-cached-faq', JSON.stringify(structuredFaq));
    } catch (e) {
      console.warn('Failed to cache FAQ list:', e);
    }

    return structuredFaq;
  } catch (err) {
    console.warn('Database FAQ fetch failed, returning cached/default data:', err.message || err);
    
    try {
      const cached = localStorage.getItem('northvale-cached-faq');
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      console.warn('Failed to parse cached FAQ list:', e);
    }

    return [...DEFAULT_FAQ];
  }
}

/**
 * Save or update a FAQ category (Upsert)
 */
export async function saveFaqCategory(category) {
  try {
    if (!supabase.from) {
      throw new Error('Supabase client is not initialized');
    }

    const { data, error } = await supabase
      .from('faq_categories')
      .upsert(category)
      .select();

    if (error) throw error;
    return { data: data?.[0] || null, error: null };
  } catch (err) {
    console.error('Failed to save FAQ category:', err);
    return { data: null, error: err };
  }
}

/**
 * Delete a FAQ category (removes items via cascade in DB)
 */
export async function deleteFaqCategory(id) {
  try {
    if (!supabase.from) {
      throw new Error('Supabase client is not initialized');
    }

    const { error } = await supabase
      .from('faq_categories')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true, error: null };
  } catch (err) {
    console.error('Failed to delete FAQ category:', err);
    return { success: false, error: err };
  }
}

/**
 * Save or update a FAQ item (Upsert)
 */
export async function saveFaqItem(item) {
  try {
    if (!supabase.from) {
      throw new Error('Supabase client is not initialized');
    }

    const { data, error } = await supabase
      .from('faq_items')
      .upsert(item)
      .select();

    if (error) throw error;
    return { data: data?.[0] || null, error: null };
  } catch (err) {
    console.error('Failed to save FAQ item:', err);
    return { data: null, error: err };
  }
}

/**
 * Delete a FAQ item
 */
export async function deleteFaqItem(id) {
  try {
    if (!supabase.from) {
      throw new Error('Supabase client is not initialized');
    }

    const { error } = await supabase
      .from('faq_items')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true, error: null };
  } catch (err) {
    console.error('Failed to delete FAQ item:', err);
    return { success: false, error: err };
  }
}

/**
 * Reorder categories in the database
 */
export async function saveFaqCategoriesOrder(categories) {
  try {
    if (!supabase.from) {
      throw new Error('Supabase client is not initialized');
    }

    const payloads = categories.map((cat, idx) => ({
      id: cat.id,
      name_cz: cat.name_cz,
      name_en: cat.name_en,
      position: idx
    }));

    const { error } = await supabase
      .from('faq_categories')
      .upsert(payloads);

    if (error) throw error;
    return { success: true, error: null };
  } catch (err) {
    console.error('Failed to save FAQ categories order:', err);
    return { success: false, error: err };
  }
}

/**
 * Reorder items inside a category in the database
 */
export async function saveFaqItemsOrder(items) {
  try {
    if (!supabase.from) {
      throw new Error('Supabase client is not initialized');
    }

    const payloads = items.map((item, idx) => ({
      id: item.id,
      category_id: item.category_id,
      question_cz: item.question_cz,
      question_en: item.question_en,
      answer_cz: item.answer_cz,
      answer_en: item.answer_en,
      position: idx
    }));

    const { error } = await supabase
      .from('faq_items')
      .upsert(payloads);

    if (error) throw error;
    return { success: true, error: null };
  } catch (err) {
    console.error('Failed to save FAQ items order:', err);
    return { success: false, error: err };
  }
}
