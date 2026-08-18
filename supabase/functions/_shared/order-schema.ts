/**
 * Order Normalization Schema for NORTHVALE E-Commerce Engine
 * Guarantees a canonical order structure across all edge functions and frontend components,
 * while preserving extra keys and backward-compatible property names.
 */

export function normalizeItems(itemsInput: any): any[] {
  if (!itemsInput || !Array.isArray(itemsInput)) {
    return [];
  }

  return itemsInput.map((item: any) => {
    if (!item || typeof item !== 'object') {
      return item;
    }

    const name = String(item.name || item.productName || item.title || '').trim();
    const product_id = String(item.product_id || item.productId || item.id || '').trim();
    const variant_id = item.variant_id || item.variantId || null;
    const quantity = Math.max(1, parseFloat(item.quantity ?? 1) || 1);
    const price = Math.max(0, parseFloat(item.price ?? 0) || 0);
    const no_vat = Boolean(
      item.no_vat || 
      item.noVat || 
      item.product?.no_vat || 
      item.product?.noVat || 
      false
    );

    return {
      ...item,
      name,
      product_id,
      variant_id,
      quantity,
      price,
      no_vat
    };
  });
}

export function normalizeOrder(input: any): Record<string, any> {
  const obj = (input && typeof input === 'object') ? input : {};

  // Extract raw values for status normalization (check all status fields, preventing 'neuhrazeno' substring false positive)
  const rawStatus = String(obj.payment_status || '').toLowerCase().trim();
  const rawStatusCamel = String(obj.paymentStatus || '').toLowerCase().trim();
  const rawPlatba = String(obj.platba || '').toLowerCase().trim();
  let payment_status: 'awaiting_payment' | 'paid' | 'cod' = 'awaiting_payment';

  const isPaidStr = (s: string) => {
    if (!s) return false;
    if (s.includes('neuhrazeno') || s.includes('unpaid') || s.includes('awaiting')) return false;
    return s === 'paid' || s === 'uhrazeno' || s === 'zaplaceno' || s.includes('uhrazeno') || s.includes('zaplaceno') || s.includes('paid');
  };

  const isCodStr = (s: string) => {
    if (!s) return false;
    return s === 'cod' || s.includes('dobírk') || s.includes('na dobírku');
  };

  if (isPaidStr(rawStatus) || isPaidStr(rawStatusCamel) || isPaidStr(rawPlatba)) {
    payment_status = 'paid';
  } else if (isCodStr(rawStatus) || isCodStr(rawStatusCamel) || isCodStr(rawPlatba)) {
    payment_status = 'cod';
  } else {
    payment_status = 'awaiting_payment';
  }

  const rawFulfillmentStatus = String(obj.fulfillment_status || obj.fulfillmentStatus || obj.stav || '').toLowerCase().trim();
  let fulfillment_status: 'pending' | 'shipped' | 'completed' | 'cancelled' = 'pending';
  if (rawFulfillmentStatus.includes('completed') || rawFulfillmentStatus.includes('vyřízeno')) {
    fulfillment_status = 'completed';
  } else if (rawFulfillmentStatus.includes('shipped') || rawFulfillmentStatus.includes('odesláno')) {
    fulfillment_status = 'shipped';
  } else if (rawFulfillmentStatus.includes('cancelled') || rawFulfillmentStatus.includes('stornováno')) {
    fulfillment_status = 'cancelled';
  } else {
    fulfillment_status = 'pending';
  }

  const rawItems = Array.isArray(obj.items) ? obj.items : [];
  const normalizedItemsList = normalizeItems(rawItems);

  const has_no_vat = Boolean(
    obj.has_no_vat ||
    obj.hasNoVat ||
    obj.no_vat ||
    obj.noVat ||
    normalizedItemsList.some((it: any) => Boolean(it.no_vat || it.noVat))
  );

  const shipping_method = String(obj.shipping_method || obj.shippingMethod || '').trim();
  let carrier = String(obj.carrier || '').trim();
  if (!carrier) {
    if (shipping_method.includes('GLS')) carrier = 'GLS';
    else if (shipping_method.includes('DPD')) carrier = 'DPD';
    else if (shipping_method.toLowerCase().includes('osobní') || shipping_method.toLowerCase().includes('skrba') || shipping_method.toLowerCase().includes('škrba')) carrier = 'Osobní odběr';
    else carrier = 'Osobní odběr';
  }

  const id = String(obj.id || obj.orderId || obj.order_id || '').trim();
  const created_at = String(obj.created_at || obj.createdAt || obj.date_created || new Date().toISOString()).trim();
  const date = String(obj.date || (created_at.includes('-') && created_at.length > 10 ? new Date(created_at).toLocaleDateString('cs-CZ') : new Date().toLocaleDateString('cs-CZ'))).trim();

  const user_id = obj.user_id || obj.userId || null;
  const customer_name = String(obj.customer_name || obj.customerName || obj.name || '').trim();
  const customer_email = String(obj.customer_email || obj.customerEmail || obj.email || '').trim().toLowerCase();
  const customer_phone = String(obj.customer_phone || obj.customerPhone || obj.phone || '').trim();
  const customer_street = String(obj.customer_street || obj.shippingStreet || obj.street || '').trim();
  const customer_city = String(obj.customer_city || obj.shippingCity || obj.city || '').trim();
  const customer_zip = String(obj.customer_zip || obj.shippingZip || obj.zip || '').trim();

  const is_company = Boolean(obj.is_company || obj.isCompany || false);
  const company_name = String(obj.company_name || obj.companyName || '').trim();
  const ico = String(obj.ico || '').trim();
  const dic = String(obj.dic || '').trim();

  const payment_method = String(obj.payment_method || obj.paymentMethod || '').trim();
  const shipping_cost = Math.max(0, parseFloat(obj.shipping_cost ?? obj.shippingCost ?? 0) || 0);
  const payment_surcharge = Math.max(0, parseFloat(obj.payment_surcharge ?? obj.paymentSurcharge ?? 0) || 0);

  const itemsTotalSum = normalizedItemsList.reduce((sum: number, it: any) => sum + (it.price * it.quantity), 0);
  const subtotal = Math.max(0, parseFloat(obj.subtotal ?? itemsTotalSum) || 0);
  const discount_code = obj.discount_code || obj.discountCode || null;
  const discount_amount = Math.max(0, parseFloat(obj.discount_amount ?? obj.discountAmount ?? 0) || 0);
  const credit_applied = Math.max(0, parseFloat(obj.credit_applied ?? obj.creditApplied ?? 0) || 0);

  const rawFinalTotal = parseFloat(obj.final_total ?? obj.finalTotal ?? obj.totalPrice ?? obj.total_price ?? 0);
  const final_total = rawFinalTotal > 0 ? rawFinalTotal : Math.max(0, subtotal + shipping_cost + payment_surcharge - discount_amount - credit_applied);

  const notes = String(obj.notes || '').trim();
  const pickup_point_details = obj.pickup_point_details || obj.pickupPointDetails || null;

  // Dual-write backward compatibility mappings
  const platba = payment_status === 'paid' ? 'uhrazeno' : (payment_status === 'cod' ? 'dobírka' : 'neuhrazeno');
  const stav = fulfillment_status === 'completed' ? 'vyřízeno' : (fulfillment_status === 'shipped' ? 'odesláno' : (fulfillment_status === 'cancelled' ? 'stornováno' : 'v řešení'));

  return {
    ...obj,
    id,
    created_at,
    date,
    user_id,
    customer_name,
    customer_email,
    customer_phone,
    customer_street,
    customer_city,
    customer_zip,
    is_company,
    company_name,
    ico,
    dic,
    payment_method,
    payment_status,
    fulfillment_status,
    shipping_method,
    carrier,
    shipping_cost,
    payment_surcharge,
    subtotal,
    discount_code,
    discount_amount,
    credit_applied,
    final_total,
    has_no_vat,
    notes,
    pickup_point_details,
    items: normalizedItemsList,

    // Backward compatibility keys
    paymentStatus: payment_status,
    platba,
    fulfillmentStatus: fulfillment_status,
    fulfillment_status,
    stav,
    customerEmail: customer_email,
    customerName: customer_name,
    customerPhone: customer_phone,
    shippingStreet: customer_street,
    shippingCity: customer_city,
    shippingZip: customer_zip,
    shippingCost: shipping_cost,
    paymentSurcharge: payment_surcharge,
    shippingMethod: shipping_method,
    paymentMethod: payment_method,
    finalTotal: final_total,
    discountCode: discount_code,
    discountAmount: discount_amount,
    creditApplied: credit_applied,
    pickupPointDetails: pickup_point_details,
    hasNoVat: has_no_vat,
    userId: user_id
  };
}

/**
 * Odlehčená verze objednávky pro profiles.order_history.
 *
 * Položky košíku v sobě nesou celý objekt `product` (obrázky, popisy,
 * varianty…) — ukládat tohle do historie profil nafoukne o desítky kB
 * s každou objednávkou a zpomalí každé přihlášení. Historie potřebuje
 * jen souhrn; kompletní objednávka žije ve storage (order_<id>.json).
 */
export function slimOrderForHistory(order: Record<string, any>): Record<string, any> {
  const slim = { ...order };
  delete slim.rawJson;
  slim.items = (order.items || []).map((i: any) => ({
    id: i.id,
    product_id: i.product_id,
    variant_id: i.variant_id ?? null,
    name: i.name,
    price: i.price,
    quantity: i.quantity,
    no_vat: !!i.no_vat
  }));
  return slim;
}

/** Strop délky order_history v profilu — starší objednávky zůstávají ve storage. */
export const ORDER_HISTORY_LIMIT = 100;
