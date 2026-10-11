import test from 'node:test';
import assert from 'node:assert/strict';
import { catalogSellingUnit, formatLineQuantities, orderLineSellingUnit, validSaleQuantity } from './selling-units.js';

test('everyday Phổ Nhĩ variant and declared packaging are counted as viên', () => {
  const product = { line: 'everyday', packSize: 'Viên', weight: '1 viên' };
  assert.equal(catalogSellingUnit(product), 'viên');
  assert.equal(catalogSellingUnit({ line: 'everyday', packSize: 'Viên' }), 'viên');
  assert.equal(catalogSellingUnit({ line: 'everyday' }, '1 bánh (357g)'), 'bánh');
  assert.equal(orderLineSellingUnit({}, product, 'retail'), 'viên');
  assert.equal(orderLineSellingUnit({}, product, 'wholesale'), 'viên');
});
test('fixed weight variants count packages, while loose tea remains priced by kg', () => {
  for (const weight of ['500g', '1kg', '5kg']) assert.equal(catalogSellingUnit({ line: 'everyday' }, weight), 'pcs');
  assert.equal(catalogSellingUnit({ line: 'everyday', packSize: '1kg, 5kg' }), 'kg');
  assert.equal(catalogSellingUnit({ line: 'premium', packSize: '100g' }), 'pcs');
  assert.equal(catalogSellingUnit({ line: 'everyday', packSize: 'Viên' }, '20 viên'), 'pcs');
  assert.equal(catalogSellingUnit({ line: 'everyday', packSize: 'Viên' }, '500g'), 'pcs');
});
test('changing order type does not turn a new package line into kilograms', () => {
  const product = { line: 'everyday', weight: '1 viên' };
  assert.equal(orderLineSellingUnit({}, product, 'retail'), orderLineSellingUnit({}, product, 'wholesale'));
  assert.equal(orderLineSellingUnit({ sourceUnit: 'viên' }, product, 'wholesale'), 'viên');
  // Preserve an old agreement until staff reviews the visible unit selector.
  assert.equal(orderLineSellingUnit({ sourceUnit: 'kg' }, product, 'wholesale'), 'kg');
  assert.equal(orderLineSellingUnit({ sourceUnit: '' }, product, 'wholesale'), 'viên');
});
test('counts require whole packages; wholesale mass can remain fractional', () => {
  assert.equal(validSaleQuantity(2.5, 'viên', 'wholesale'), false);
  assert.equal(validSaleQuantity(2.5, 'pcs', 'wholesale'), false);
  assert.equal(validSaleQuantity(2.5, 'kg', 'wholesale'), true);
  assert.equal(validSaleQuantity(2.5, 'kg', 'retail'), false);
  assert.equal(validSaleQuantity(20, 'viên', 'retail'), true);
  for (const value of [0, -1, NaN, Infinity]) assert.equal(validSaleQuantity(value, 'kg', 'wholesale'), false);
});
test('order summary keeps independent package and mass quantities without inventing weight', () => {
  assert.equal(formatLineQuantities([{ qty: 12, unit: 'viên' }, { qty: 3, unit: 'pcs' }, { qty: 2.5, unit: 'kg' }]), '12 viên · 3 gói · 2,5 kg');
  assert.equal(formatLineQuantities([{ qty: 1, unit: 'viên' }, { qty: 3, unit: 'viên' }]), '4 viên');
});
