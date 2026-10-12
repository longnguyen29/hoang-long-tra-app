import { parseRetailCart } from './retail-cart.js';
import { retailOrderLines, retailOptions } from './retail-catalog.js';

export function validateRetailCheckout(payload) {
  if (!payload || typeof payload !== 'object' || !payload.cart || Array.isArray(payload.cart) || typeof payload.cart !== 'object') throw new Error('invalid_checkout');
  const entries = Object.entries(payload.cart);
  const cart = parseRetailCart(payload.cart);
  if (!entries.length || entries.length > 50 || Object.keys(cart).length !== entries.length || entries.some(([, qty]) => !Number.isInteger(qty) || qty < 1 || qty > 99)) throw new Error('invalid_checkout');
  if (!Array.isArray(payload.expectedLines) || payload.expectedLines.length !== entries.length || new Set(payload.expectedLines.map(item => item?.key)).size !== entries.length) throw new Error('invalid_checkout');
  const input = payload.customer;
  const customer = {};
  for (const [key, limit, required] of [['name', 180, true], ['contact', 240, true], ['address', 1000, true], ['tax', 80, false], ['note', 3000, false]]) {
    if (input?.[key] !== undefined && typeof input[key] !== 'string') throw new Error('invalid_checkout');
    const value = (input?.[key] || '').trim();
    if (value.length > limit || (required && !value)) throw new Error('invalid_checkout');
    customer[key] = value;
  }
  if (input?.consent !== true || !['qr', 'cash'].includes(input?.payment) || typeof payload.expectedTotal !== 'number' || !Number.isFinite(payload.expectedTotal) || payload.expectedTotal <= 0) throw new Error('invalid_checkout');
  customer.payment = input.payment;
  return { cart, customer, expectedTotal: payload.expectedTotal };
}

export function prepareRetailCheckout(payload, products) {
  const { cart, customer, expectedTotal } = validateRetailCheckout(payload);
  const lines = retailOrderLines(cart, products);
  const options = products.flatMap(retailOptions);
  for (const key of Object.keys(cart)) {
    const expected = payload.expectedLines.find(item => item?.key === key);
    const current = options.find(item => item.key === key);
    if (!expected || expected.unit !== current?.unit || expected.weight !== current?.weight || expected.packing !== (current?.product.packSize || '')) throw new Error('cart_changed');
    if (expected.price !== current.price) throw new Error('price_changed');
  }
  if (lines.some(line => products.find(product => product.id === line.productId)?.line === 'sample')) throw new Error('cart_changed');
  const total = lines.reduce((sum, line) => sum + line.qty * line.price, 0);
  if (Math.abs(total - expectedTotal) > 0.01) throw new Error('price_changed');
  return { lines, total, customer, count: lines.reduce((sum, line) => sum + line.qty, 0) };
}
