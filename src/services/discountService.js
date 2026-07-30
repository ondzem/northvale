import { supabase } from '../supabase.js';

/**
 * Get current local date in YYYY-MM-DD format (Czech timezone safe)
 */
export function getTodayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format YYYY-MM-DD date to Czech DD.MM.YYYY
 */
export function formatCzechDate(dateStr) {
  if (!dateStr) return '';
  const parts = String(dateStr).split('-');
  if (parts.length === 3) {
    return `${parts[2]}.${parts[1]}.${parts[0]}`;
  }
  return dateStr;
}

/**
 * Get human-readable status of a discount code
 * Returns: { status: 'active' | 'scheduled' | 'expired' | 'exhausted' | 'inactive', label: string, color: string, bg: string }
 */
export function getDiscountCodeStatus(codeItem, lang = 'CZ') {
  if (!codeItem) {
    return { status: 'inactive', label: lang === 'CZ' ? 'Neaktivní' : 'Inactive', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' };
  }

  const isActive = codeItem.is_active !== undefined ? codeItem.is_active : codeItem.active;
  if (!isActive) {
    return { status: 'inactive', label: lang === 'CZ' ? 'Neaktivní' : 'Inactive', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' };
  }

  const todayStr = getTodayDateString();

  if (codeItem.valid_from && todayStr < codeItem.valid_from) {
    return { status: 'scheduled', label: lang === 'CZ' ? 'Naplánováno' : 'Scheduled', color: '#eab308', bg: 'rgba(234, 179, 8, 0.15)' };
  }

  if (codeItem.valid_until && todayStr > codeItem.valid_until) {
    return { status: 'expired', label: lang === 'CZ' ? 'Vypršelo' : 'Expired', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' };
  }

  if (codeItem.max_uses !== null && codeItem.max_uses !== undefined && codeItem.max_uses !== '') {
    const maxUses = Number(codeItem.max_uses);
    const usedCount = Number(codeItem.used_count || 0);
    if (usedCount >= maxUses) {
      return { status: 'exhausted', label: lang === 'CZ' ? 'Vyčerpáno' : 'Exhausted', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.15)' };
    }
  }

  return { status: 'active', label: lang === 'CZ' ? 'Aktivní' : 'Active', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' };
}

/**
 * Validate input discount code against database or loaded code list
 */
export function validateDiscountCode(inputCode, availableCodes = [], lang = 'CZ') {
  const clean = String(inputCode || '').trim().toUpperCase();
  if (!clean) {
    return {
      isValid: false,
      error: lang === 'CZ' ? 'Zadejte slevový kód.' : 'Please enter a discount code.',
      discountItem: null
    };
  }

  // 1. Find code
  const found = availableCodes.find(c => String(c.code || '').trim().toUpperCase() === clean);
  if (!found) {
    return {
      isValid: false,
      error: lang === 'CZ' ? `Slevový kód "${clean}" neexistuje.` : `Discount code "${clean}" does not exist.`,
      discountItem: null
    };
  }

  // 2. Check active status
  const isActive = found.is_active !== undefined ? found.is_active : found.active;
  if (!isActive) {
    return {
      isValid: false,
      error: lang === 'CZ' ? `Slevový kód "${clean}" je neaktivní.` : `Discount code "${clean}" is inactive.`,
      discountItem: null
    };
  }

  const todayStr = getTodayDateString();

  // 3. Check start date (valid_from)
  if (found.valid_from && todayStr < found.valid_from) {
    const formattedDate = formatCzechDate(found.valid_from);
    return {
      isValid: false,
      error: lang === 'CZ' ? `Slevový kód "${clean}" ještě není platný (platí až od ${formattedDate}).` : `Discount code "${clean}" is not valid yet (valid from ${formattedDate}).`,
      discountItem: null
    };
  }

  // 4. Check end date (valid_until)
  if (found.valid_until && todayStr > found.valid_until) {
    const formattedDate = formatCzechDate(found.valid_until);
    return {
      isValid: false,
      error: lang === 'CZ' ? `Slevový kód "${clean}" již vypršel dnem ${formattedDate}.` : `Discount code "${clean}" expired on ${formattedDate}.`,
      discountItem: null
    };
  }

  // 5. Check capacity limit (max_uses)
  if (found.max_uses !== null && found.max_uses !== undefined && found.max_uses !== '') {
    const maxUses = Number(found.max_uses);
    const usedCount = Number(found.used_count || 0);
    if (usedCount >= maxUses) {
      return {
        isValid: false,
        error: lang === 'CZ' ? `Slevový kód "${clean}" již vyčerpal svou maximální kapacitu použití.` : `Discount code "${clean}" has reached its maximum usage capacity.`,
        discountItem: null
      };
    }
  }

  // 6. Device tracking for 1-time single use codes
  if (Number(found.max_uses) === 1) {
    try {
      const redeemed = JSON.parse(localStorage.getItem('nv_redeemed_discounts') || '[]');
      if (Array.isArray(redeemed) && redeemed.includes(clean)) {
        return {
          isValid: false,
          error: lang === 'CZ' ? `Slevový kód "${clean}" jste již na tomto zařízení uplatnili.` : `Discount code "${clean}" has already been redeemed on this device.`,
          discountItem: null
        };
      }
    } catch {}
  }

  return { isValid: true, error: '', discountItem: found };
}

/**
 * Calculate numerical discount amount in CZK based on type ('percent' vs 'fixed')
 */
export function calculateDiscountAmount(totalPrice, discountItem) {
  if (!discountItem || !totalPrice || totalPrice <= 0) return 0;

  const type = discountItem.discount_type || 'percent';
  const val = Number(discountItem.discount_value !== undefined && discountItem.discount_value !== null ? discountItem.discount_value : discountItem.discount_percent || 0);

  let amount = 0;
  if (type === 'percent') {
    amount = Math.round((totalPrice * val) / 100);
  } else if (type === 'fixed') {
    amount = val;
  }

  return Math.min(totalPrice, Math.max(0, amount));
}

/**
 * Apply discount code usage atomically upon order completion
 */
export async function applyDiscountCodeUsage(codeString) {
  if (!codeString) return;
  const cleanCode = String(codeString).trim().toUpperCase();

  try {
    const { data: dbItem, error: fetchErr } = await supabase
      .from('discount_codes')
      .select('*')
      .eq('code', cleanCode)
      .maybeSingle();

    if (fetchErr || !dbItem) return;

    const newUsedCount = Number(dbItem.used_count || 0) + 1;
    const maxUsesNum = dbItem.max_uses !== null && dbItem.max_uses !== undefined && dbItem.max_uses !== '' ? Number(dbItem.max_uses) : null;
    const isExhausted = maxUsesNum !== null ? (newUsedCount >= maxUsesNum) : false;

    const payload = {
      used_count: newUsedCount
    };

    if (isExhausted) {
      payload.is_active = false;
      payload.active = false;
    }

    await supabase
      .from('discount_codes')
      .update(payload)
      .eq('id', dbItem.id);

    // If 1-time single use code, record device redemption
    if (maxUsesNum === 1) {
      try {
        const redeemed = JSON.parse(localStorage.getItem('nv_redeemed_discounts') || '[]');
        if (!redeemed.includes(cleanCode)) {
          redeemed.push(cleanCode);
          localStorage.setItem('nv_redeemed_discounts', JSON.stringify(redeemed));
        }
      } catch {}
    }
  } catch (err) {
    console.error('Error applying discount code usage:', err);
  }
}
