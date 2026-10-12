import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTradePriceRules, buildTradeQuoteLines, selectTradeProduct, tradeProductOptions } from './trade-line-units.js';

const products = tradeProductOptions([
  { id: 'loose', line: 'everyday', name: { vi: 'Trà nền' }, price: 80000 },
  { id: 'puer', line: 'everyday', name: { vi: 'Phổ Nhĩ' }, variants: [{ weight: '1 viên (8g)', price: 10000 }, { weight: '1 bánh (357g)', price: 500000 }, { weight: '500g', price: 200000 }] },
]);

test('quote product choices use actual sale units without treating packaging mass as kilograms', () => {
  assert.deepEqual(products.map(p => p.unit), ['kg', 'viên', 'bánh', 'pcs']);
  const draft = products.map(product => selectTradeProduct({ qty: 2 }, product));
  const lines = buildTradeQuoteLines(draft, products);
  assert.deepEqual(lines.map(line => [line.qty, line.unit, line.price]), [[2, 'kg', 80000], [2, 'viên', 10000], [2, 'bánh', 500000], [2, 'pcs', 200000]]);
});

test('an existing B2B agreement keeps its entered kg or pack basis instead of changing the negotiated price', () => {
  const product = products[3];
  const draft = selectTradeProduct({ qty: 1 }, product, { unit: 'kg', minimum_quantity: 2.5, price: 70000 }, 'agreement-old');
  const [line] = buildTradeQuoteLines([draft], products);
  assert.equal(line.unit, 'kg');
  assert.equal(line.qty, 2.5);
  assert.equal(line.price, 70000);
  assert.equal(line.priceAgreementId, 'agreement-old');
  const [rule] = buildTradePriceRules([{ ...draft, unit: 'pack', minimum_quantity: 10, price: 125000 }], products);
  assert.equal(rule.unit, 'pack');
  assert.equal(rule.price, 125000);
  assert.equal(rule.minimum_quantity, 10);
});

test('zero agreed price is preserved, but unknown price or invalid fractional package counts cannot save', () => {
  const product = products[1];
  const zero = selectTradeProduct({ qty: 1 }, product, { unit: 'viên', minimum_quantity: 1, price: 0 }, 'free-sample');
  assert.equal(buildTradeQuoteLines([zero], products)[0].price, 0);
  for (const price of ['', undefined, null, -1, Infinity]) assert.throws(() => buildTradeQuoteLines([{ ...zero, price }], products), /trade_price_required/);
  assert.throws(() => buildTradeQuoteLines([{ ...zero, qty: 2.5 }], products), /trade_quantity_invalid/);
  assert.throws(() => buildTradePriceRules([{ ...zero, minimum_quantity: 0.5 }], products), /trade_quantity_invalid/);
  assert.equal(buildTradeQuoteLines([{ ...zero, unit: 'kg', qty: 2.5 }], products)[0].qty, 2.5);
});

test('selecting a different product resets price/unit to that product and does not retain another agreement', () => {
  const original = { qty: 3, unit: 'kg', price: 80000, priceAgreementId: 'old' };
  const next = selectTradeProduct(original, products[1]);
  assert.equal(next.unit, 'viên');
  assert.equal(next.price, 10000);
  assert.equal(next.qty, 3);
  assert.equal(next.priceAgreementId, null);
  assert.throws(() => buildTradeQuoteLines([{ ...next, productKey: 'gone' }], products), /trade_product_required/);
});
