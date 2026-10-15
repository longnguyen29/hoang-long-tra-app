export const RETAIL_CART_STORAGE_KEY = 'hl-retail-cart-v1';
export const RETAIL_CART_MAX = 1000;

const safeKey = key => typeof key === 'string' && key.length > 0 && key.length <= 240 && !/[\u0000-\u001f\u007f]/.test(key) && !['__proto__', 'constructor', 'prototype'].includes(key);

export function parseRetailCart(raw) {
  try {
    const value = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!value || Array.isArray(value) || typeof value !== 'object') return {};
    return Object.fromEntries(Object.entries(value).filter(([key, qty]) => safeKey(key) && Number.isInteger(qty) && qty > 0).map(([key, qty]) => [key, Math.min(RETAIL_CART_MAX, qty)]));
  } catch { return {}; }
}

export function changeRetailQuantity(cart, key, delta) {
  const current = parseRetailCart(cart);
  if (!safeKey(key) || !Number.isInteger(delta)) return current;
  const qty = Math.max(0, Math.min(RETAIL_CART_MAX, (current[key] || 0) + delta));
  if (qty) current[key] = qty;
  else delete current[key];
  return current;
}

export function reconcileRetailCart(cart, options) {
  const result = {};
  const byKey = new Map(options.map(option => [option.key, option]));
  for (const [key, qty] of Object.entries(parseRetailCart(cart))) {
    const option = byKey.get(key);
    if (!option?.orderable) continue;
    const capped = option.stock === null || option.stock === undefined ? qty : Math.min(qty, Math.max(0, Math.floor(option.stock)));
    if (capped > 0) result[key] = capped;
  }
  return result;
}
