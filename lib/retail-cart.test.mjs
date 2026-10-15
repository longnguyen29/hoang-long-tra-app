import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RETAIL_CART_STORAGE_KEY,
  RETAIL_CART_MAX,
  RETAIL_LEGACY_CART_STORAGE_KEY,
  restoreRetailCart,
  parseRetailCart,
  changeRetailQuantity,
  reconcileRetailCart,
} from './retail-cart.js';

test('retail cart storage retains only bounded whole quantities, not prices or customer details', () => {
  const cart = parseRetailCart(JSON.stringify({
    'tea-a__100g': 2,
    'pho-nhi__1 viên (8g)': 4,
    'too-many': 1200,
    zero: 0,
    negative: -1,
    fractional: 1.5,
    numericString: '2',
    price: { amount: 1000 },
    contact: { phone: '0900000000' },
  }));
  assert.equal(cart['tea-a__100g'], 2);
  assert.equal(cart['pho-nhi__1 viên (8g)'], 4);
  assert.ok(!Object.hasOwn(cart, 'price'));
  assert.ok(!Object.hasOwn(cart, 'contact'));
  for (const key of ['zero', 'negative', 'fractional', 'numericString']) assert.ok(!Object.hasOwn(cart, key));
  assert.ok(Object.values(cart).every(qty => Number.isInteger(qty) && qty > 0 && qty <= RETAIL_CART_MAX));
  assert.equal(parseRetailCart({tea:100}).tea,100);
  assert.equal(typeof RETAIL_CART_STORAGE_KEY, 'string');
  assert.ok(RETAIL_CART_STORAGE_KEY.length > 0);
});

test('new cart isolates100kg purchases from old tabs and imports a legacy cart only once',()=>{
  assert.notEqual(RETAIL_CART_STORAGE_KEY,RETAIL_LEGACY_CART_STORAGE_KEY);
  assert.deepEqual(restoreRetailCart(null,'{"tea":20}'),{tea:20});
  assert.deepEqual(restoreRetailCart('{"tea":100}','{"tea":99}'),{tea:100});
  assert.deepEqual(restoreRetailCart('{}','{"tea":20}'),{});
  assert.deepEqual(restoreRetailCart('{broken','{"tea":20}'),{});
});

test('damaged local storage and prototype keys cannot create order lines', () => {
  for (const raw of [null, undefined, '', '{broken', 'null', '[]', '5', '"tea"']) {
    assert.deepEqual(parseRetailCart(raw), {});
  }
  const cart = parseRetailCart('{"__proto__":1,"constructor":2,"prototype":3,"":1,"tea-a":2}');
  assert.deepEqual(cart, { 'tea-a': 2 });
  assert.equal({}.polluted, undefined);
});

test('quantity controls preserve other selections, delete an empty line and stay bounded', () => {
  const original = { 'tea-a': 1, 'tea-b__100g': 3 };
  const increased = changeRetailQuantity(original, 'tea-a', 1);
  assert.deepEqual(increased, { 'tea-a': 2, 'tea-b__100g': 3 });
  assert.deepEqual(original, { 'tea-a': 1, 'tea-b__100g': 3 });
  assert.deepEqual(changeRetailQuantity(original, 'tea-a', -1), { 'tea-b__100g': 3 });
  assert.equal(changeRetailQuantity({ 'tea-a': RETAIL_CART_MAX }, 'tea-a', 1)['tea-a'], RETAIL_CART_MAX);
  assert.deepEqual(changeRetailQuantity({}, 'tea-a', -1), {});
  assert.deepEqual(changeRetailQuantity(original, '__proto__', 1), original);
});

test('restored cart survives product navigation but reconciles against current available options', () => {
  const stored = JSON.stringify({ 'tea-a__100g': 5, 'tea-b': 2, removed: 1, unpriced: 1, soldout: 1 });
  const cart = parseRetailCart(stored);
  const options = [
    { key: 'tea-a__100g', stock: 3, orderable: true },
    { key: 'tea-b', stock: null, orderable: true },
    { key: 'unpriced', stock: null, orderable: false },
    { key: 'soldout', stock: 0, orderable: false },
  ];
  const reconciled = reconcileRetailCart(cart, options);
  assert.deepEqual(reconciled, { 'tea-a__100g': 3, 'tea-b': 2 });
  assert.deepEqual(parseRetailCart(JSON.stringify(reconciled)), reconciled);
  assert.deepEqual(cart, { 'tea-a__100g': 5, 'tea-b': 2, removed: 1, unpriced: 1, soldout: 1 });
});
