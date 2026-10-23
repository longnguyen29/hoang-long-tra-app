import test from 'node:test';
import assert from 'node:assert/strict';
import { applyOrderLinePriceChanges } from './order-price-history.js';

test('first real edit saves the previous agreed sale price without mutating its source', () => {
  const before = [{ productId: 'tea', qty: 3, unit: 'kg', price: 80000, listPrice: 100000 }];
  const after = applyOrderLinePriceChanges(before, [{ index: 0, price: 90000 }]);
  assert.deepEqual(after, [{ ...before[0], price: 90000, priceBeforeEdit: 80000 }]);
  assert.equal(Object.hasOwn(before[0], 'priceBeforeEdit'), false);
  assert.equal(before[0].price, 80000);
});

test('later edits preserve the first snapshot including zero and an unquoted baseline', () => {
  for (const priceBeforeEdit of [80000, 0, null]) {
    const after = applyOrderLinePriceChanges([{ price: 90000, priceBeforeEdit }], [{ index: 0, price: 95000 }]);
    assert.equal(after[0].priceBeforeEdit, priceBeforeEdit);
  }
});

test('unchanged lines do not invent a historical price and unknown differs from zero', () => {
  const lines = [{ price: 80000 }, { price: 0 }, { price: null }, {}, { price: '100000' }];
  const unchanged = applyOrderLinePriceChanges(lines, lines.map((line, index) => ({ index, price: [80000, 0, null, null, 100000][index] })));
  assert.ok(unchanged.every(line => !Object.hasOwn(line, 'priceBeforeEdit')));
  const changed = applyOrderLinePriceChanges([{ price: 0 }, { price: null }], [{ index: 0, price: null }, { index: 1, price: 0 }]);
  assert.equal(changed[0].priceBeforeEdit, 0);
  assert.equal(changed[1].priceBeforeEdit, null);
});
