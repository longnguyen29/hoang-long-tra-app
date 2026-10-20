import test from 'node:test';
import assert from 'node:assert/strict';
import { RETAIL_CART_MAX } from './retail-cart.js';
import {
  RETAIL_BUNDLES, RETAIL_BUNDLE_PURPOSES, RETAIL_BUNDLE_TIMES,
  resolveRetailBundle, addRetailBundleToCart,
} from './retail-bundles.js';

const bundle = id => RETAIL_BUNDLES.find(item => item.id === id);
const product = (id, variants, extra = {}) => ({
  id, kind: 'tea', line: 'reserve', available: true,
  name: { vi: id, en: id }, variants, ...extra,
});
const pack = (weight, price = 100000, stock = null) => ({ weight, price, stockSocSon: stock, stockHaGiang: null });
const catalogue = () => [
  product('daily-green-tea-iced-tea-mu3w9lr0', [pack('500g', 60000)], { line: 'everyday' }),
  product('bach-mau-don', [pack('50g', 175000), pack('100g', 350000)]),
  product('pho-nhi-vien-mv2k5p6r', [pack('1 viên', 20000)]),
  product('luc-tra-shan-mv4nnv9p', [pack('200g', 110000)]),
  product('luc-tra-ngoc-lan', [pack('1kg', 250000)]),
  product('tra-gao-sen-3-lan', [pack('50g', 750000)]),
  product('tra-gao-sen-7-lan', [pack('50g', 1500000)]),
];
const custom = components => ({ id: 'test-bundle', ready: true, components });

test('bundle selection contains eight exact purchasable combinations and five interest-only plans', () => {
  assert.equal(RETAIL_BUNDLES.length, 13);
  assert.equal(new Set(RETAIL_BUNDLES.map(item => item.id)).size, 13);
  assert.deepEqual(RETAIL_BUNDLES.filter(item => item.ready).map(item => [item.id, item.components]), [
    ['home-and-work', [{ productId: 'daily-green-tea-iced-tea-mu3w9lr0', weight: '500g', qty: 2 }]],
    ['weekend', [{ productId: 'bach-mau-don', weight: '50g', qty: 1 }, { productId: 'pho-nhi-vien-mv2k5p6r', weight: '1 viên', qty: 2 }]],
    ['first-tea', [{ productId: 'luc-tra-shan-mv4nnv9p', weight: '200g', qty: 1 }, { productId: 'bach-mau-don', weight: '50g', qty: 1 }]],
    ['office', [{ productId: 'luc-tra-ngoc-lan', weight: '1kg', qty: 1 }, { productId: 'luc-tra-shan-mv4nnv9p', weight: '200g', qty: 1 }, { productId: 'bach-mau-don', weight: '50g', qty: 1 }]],
    ['lotus-and-leaf', [{ productId: 'tra-gao-sen-3-lan', weight: '50g', qty: 1 }, { productId: 'luc-tra-shan-mv4nnv9p', weight: '200g', qty: 1 }]],
    ['lotus-and-white', [{ productId: 'tra-gao-sen-3-lan', weight: '50g', qty: 1 }, { productId: 'bach-mau-don', weight: '50g', qty: 1 }]],
    ['special-gift', [{ productId: 'tra-gao-sen-7-lan', weight: '50g', qty: 1 }, { productId: 'bach-mau-don', weight: '50g', qty: 1 }]],
    ['lotus-comparison', [{ productId: 'tra-gao-sen-3-lan', weight: '50g', qty: 1 }, { productId: 'tra-gao-sen-7-lan', weight: '50g', qty: 1 }]],
  ]);
  assert.deepEqual(RETAIL_BUNDLES.filter(item => !item.ready).map(item => item.id), ['find-your-taste', 'lotus-discovery', 'travel', 'cafe-trial', 'familiar-and-new']);
  for (const item of RETAIL_BUNDLES) {
    for (const field of ['name', 'description', 'audience', 'occasion']) {
      assert.equal(typeof item[field].vi, 'string');
      assert.equal(typeof item[field].en, 'string');
    }
    assert.ok(item.purposes.every(id => RETAIL_BUNDLE_PURPOSES.some(purpose => purpose.id === id)));
    assert.ok(item.times.every(id => RETAIL_BUNDLE_TIMES.some(time => time.id === id)));
    assert.ok(!Object.hasOwn(item, 'price'));
    if (!item.ready) {
      assert.deepEqual(item.components, []);
      assert.match(item.plannedContents.vi, /xác nhận/);
      assert.match(item.plannedContents.en, /confirmed/);
      assert.deepEqual(resolveRetailBundle(item, catalogue()), { bundle: item, lines: [], subtotal: null, canAdd: false, reason: 'not_ready' });
    }
  }
});

test('ready bundles use fresh catalogue prices and retain package sale units', () => {
  const products = catalogue();
  for (const item of RETAIL_BUNDLES.filter(item => item.ready)) assert.equal(resolveRetailBundle(item, products).canAdd, true, item.id);
  const first = resolveRetailBundle(bundle('weekend'), products);
  assert.equal(first.subtotal, 215000);
  assert.equal(first.reason, null);
  assert.deepEqual(first.lines.map(line => [line.key, line.weight, line.qty, line.unit]), [
    ['bach-mau-don__50g', '50g', 1, 'pcs'],
    ['pho-nhi-vien-mv2k5p6r__1 viên', '1 viên', 2, 'viên'],
  ]);
  products.find(item => item.id === 'bach-mau-don').variants[0].price = 180000;
  assert.equal(resolveRetailBundle(bundle('weekend'), products).subtotal, 220000);
  assert.equal(first.subtotal, 215000);
});

test('an exact pack is required and no base price, nearby size or product alias substitutes', () => {
  const item = custom([{ productId: 'tea', weight: '50g', qty: 1 }]);
  for (const products of [
    [],
    [product('tea-alias', [pack('50g')], { name: { vi: 'tea' } })],
    [product('tea', [], { price: 100000, packSize: '50g' })],
    [product('tea', [pack('100g')], { price: 100000, packSize: '50g' })],
    [product('tea', [pack('50 g')])],
  ]) {
    const result = resolveRetailBundle(item, products);
    assert.equal(result.canAdd, false);
    assert.equal(result.reason, 'unavailable');
    assert.equal(result.subtotal, null);
    assert.deepEqual(result.lines, []);
  }
  const products = catalogue();
  products.find(value => value.id === 'pho-nhi-vien-mv2k5p6r').variants = [pack('1 viên (8g)')];
  assert.equal(resolveRetailBundle(bundle('weekend'), products).reason, 'unavailable');
});

test('hidden products, zero stock and absent or invalid prices cannot become purchasable', () => {
  const item = custom([{ productId: 'tea', weight: '50g', qty: 1 }]);
  for (const price of [undefined, null, 0, -1, '100000', NaN, Infinity]) {
    const result = resolveRetailBundle(item, [product('tea', [{ ...pack('50g'), price }])]);
    assert.equal(result.reason, 'unavailable', String(price));
    assert.equal(result.subtotal, null, String(price));
  }
  for (const tea of [product('tea', [pack('50g')], { available: false }), product('tea', [pack('50g', 100000, 0)])]) {
    const result = resolveRetailBundle(item, [tea]);
    assert.equal(result.canAdd, false);
    assert.equal(result.reason, 'unavailable');
    assert.equal(result.subtotal, 100000);
  }
  for (const extra of [{ kind: 'goods' }, { line: 'sample' }]) {
    const result = resolveRetailBundle(item, [product('tea', [pack('50g')], extra)]);
    assert.equal(result.canAdd, false);
    assert.equal(result.reason, 'unavailable');
    assert.equal(result.subtotal, null);
  }
});

test('ambiguous catalogue identities and unsafe cart keys fail closed', () => {
  const item = custom([{ productId: 'tea', weight: '50g', qty: 1 }]);
  for (const products of [
    [product('tea', [pack('50g')]), product('tea', [pack('50g', 200000)])],
    [product('tea', [pack('50g'), pack('50g', 200000)])],
  ]) {
    assert.equal(resolveRetailBundle(item, products).reason, 'unavailable');
    assert.equal(resolveRetailBundle(item, products).subtotal, null);
  }
  const longId = 't'.repeat(240);
  assert.equal(resolveRetailBundle(custom([{ productId: longId, weight: '50g', qty: 1 }]), [product(longId, [pack('50g')])]).reason, 'unavailable');
});

test('repeated components aggregate before stock and existing-cart checks', () => {
  const item = custom([
    { productId: 'tea', weight: '50g', qty: 2 },
    { productId: 'other', weight: '1 viên', qty: 2 },
    { productId: 'tea', weight: '50g', qty: 3 },
  ]);
  const products = [product('tea', [pack('50g', 100000, 6), pack('100g', 200000, 1)]), product('other', [pack('1 viên', 20000)])];
  const result = resolveRetailBundle(item, products, { 'tea__50g': 1, 'tea__100g': 1, unrelated: 25 });
  assert.equal(result.canAdd, true);
  assert.equal(result.subtotal, 540000);
  assert.deepEqual(result.lines.map(line => [line.key, line.qty]), [['tea__50g', 5], ['other__1 viên', 2]]);
  assert.equal(resolveRetailBundle(item, products, { 'tea__50g': 2 }).reason, 'stock_limit');
  products[0].variants[0].stockSocSon = 4;
  assert.equal(resolveRetailBundle(item, products).reason, 'stock_limit');
  products[0].variants[0].stockSocSon = null;
  assert.equal(resolveRetailBundle(item, products, { 'tea__50g': 200 }).canAdd, true);
});

test('fresh stock changes disable the whole addition without reducing its requested quantities', () => {
  const products = catalogue();
  const item = bundle('weekend');
  assert.equal(resolveRetailBundle(item, products).canAdd, true);
  const pieces = products.find(tea => tea.id === 'pho-nhi-vien-mv2k5p6r').variants[0];
  pieces.stockHaGiang = 1;
  pieces.stockSocSon = 1;
  assert.equal(resolveRetailBundle(item, products).canAdd, true);
  assert.equal(resolveRetailBundle(item, products, { 'pho-nhi-vien-mv2k5p6r__1 viên': 1 }).reason, 'stock_limit');
  pieces.stockSocSon = 0;
  const result = resolveRetailBundle(item, products);
  assert.equal(result.reason, 'stock_limit');
  assert.equal(result.lines[1].qty, 2);
});

test('cart maximum applies per sale option to aggregated bundle and existing quantities', () => {
  const item = custom([{ productId: 'tea', weight: '50g', qty: 2 }, { productId: 'tea', weight: '50g', qty: 3 }]);
  const products = [product('tea', [pack('50g')])];
  assert.equal(resolveRetailBundle(item, products, { 'tea__50g': RETAIL_CART_MAX - 5 }).canAdd, true);
  for (const qty of [RETAIL_CART_MAX - 4, RETAIL_CART_MAX, RETAIL_CART_MAX + 1]) {
    assert.equal(resolveRetailBundle(item, products, { 'tea__50g': qty }).reason, 'cart_limit');
  }
  assert.equal(resolveRetailBundle(item, products, { unrelated: RETAIL_CART_MAX }).canAdd, true);
  assert.equal(resolveRetailBundle(custom([{ productId: 'tea', weight: '50g', qty: RETAIL_CART_MAX + 1 }]), products).reason, 'cart_limit');
});

test('invalid component quantities and empty ready definitions cannot create a partial selection', () => {
  const products = [product('tea', [pack('50g')])];
  for (const qty of [0, -1, 1.5, '2', NaN, Infinity]) {
    assert.equal(resolveRetailBundle(custom([{ productId: 'tea', weight: '50g', qty }]), products).reason, 'unavailable');
  }
  assert.equal(resolveRetailBundle(custom([]), products).reason, 'unavailable');
  assert.equal(resolveRetailBundle(null, products).reason, 'not_ready');
});

test('adding a whole bundle preserves unrelated lines and never mutates the input cart', () => {
  const current = Object.freeze({ 'bach-mau-don__50g': 3, unrelated: RETAIL_CART_MAX });
  const result = addRetailBundleToCart(current, bundle('weekend'), catalogue());
  assert.deepEqual(result, { ok: true, reason: null, cart: { 'bach-mau-don__50g': 4, unrelated: RETAIL_CART_MAX, 'pho-nhi-vien-mv2k5p6r__1 viên': 2 } });
  assert.deepEqual(current, { 'bach-mau-don__50g': 3, unrelated: RETAIL_CART_MAX });
  assert.notEqual(result.cart, current);
  assert.deepEqual(Object.keys(result.cart).sort(), ['bach-mau-don__50g', 'pho-nhi-vien-mv2k5p6r__1 viên', 'unrelated']);
});

test('failed additions return the original cart and do not silently add or clamp any component', () => {
  const item = bundle('weekend');
  const current = Object.freeze({ unrelated: 3, 'bach-mau-don__50g': 2 });
  const products = catalogue();
  products.find(tea => tea.id === 'pho-nhi-vien-mv2k5p6r').variants[0].stockSocSon = 1;
  const stock = addRetailBundleToCart(current, item, products);
  assert.deepEqual(stock, { ok: false, cart: current, reason: 'stock_limit' });
  assert.equal(stock.cart, current);
  assert.deepEqual(current, { unrelated: 3, 'bach-mau-don__50g': 2 });
  const full = Object.freeze({ 'bach-mau-don__50g': RETAIL_CART_MAX });
  const limit = addRetailBundleToCart(full, item, catalogue());
  assert.equal(limit.cart, full);
  assert.equal(limit.reason, 'cart_limit');
  assert.equal(addRetailBundleToCart(current, bundle('find-your-taste'), catalogue()).cart, current);
  assert.equal(addRetailBundleToCart(current, item, []).cart, current);
});
