import test from 'node:test';
import assert from 'node:assert/strict';
import { RETAIL_CART_MAX } from './retail-cart.js';
import {
  RETAIL_BUNDLES, RETAIL_BUNDLE_PURPOSES, RETAIL_BUNDLE_TIMES,
  resolveRetailBundle, resolveRetailBundleFamilies, addRetailBundleToCart,
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

test('a high budget selects and adds the exact Sen 7 composition inside one visible family', () => {
  const products = catalogue();
  const families = resolveRetailBundleFamilies(products, {}, { budget: 'high' });
  const selected = families.find(entry => entry.family.id === 'lotus-and-white');
  assert.equal(selected.resolved.bundle.id, 'special-gift');
  assert.equal(selected.resolved.subtotal, 1675000);
  assert.equal(selected.choices.find(choice => choice.resolved.bundle.id === 'lotus-and-white').eligible, false);
  assert.equal(families.some(entry => entry.family.id === 'special-gift'), false);
  const added = addRetailBundleToCart({}, selected.resolved.bundle, products);
  assert.equal(added.cart['tra-gao-sen-7-lan__50g'], 1);
  assert.equal(added.cart['tra-gao-sen-3-lan__50g'], undefined);
});

test('product-detail recommendations contain that exact product, including the Sen 7 family', () => {
  const families = resolveRetailBundleFamilies(catalogue(), {}, { productId: 'tra-gao-sen-7-lan' });
  const selected = families.find(entry => entry.family.id === 'lotus-and-white');
  assert.deepEqual(selected.choices.map(choice => choice.resolved.bundle.id), ['special-gift']);
  assert.equal(selected.resolved.bundle.id, 'special-gift');
  assert.ok(families.every(entry => entry.resolved.bundle.components.some(component => component.productId === 'tra-gao-sen-7-lan')));
  assert.equal(families.some(entry => entry.family.id === 'lotus-and-leaf'), false);
});

test('a selected choice stays blocked on stock failure rather than silently switching tea', () => {
  const products = catalogue();
  products.find(tea => tea.id === 'tra-gao-sen-7-lan').variants[0].stockSocSon = 0;
  const selected = resolveRetailBundleFamilies(products, {}, { selections: { 'lotus-and-white': 'special-gift' } })
    .find(entry => entry.family.id === 'lotus-and-white');
  assert.equal(selected.resolved.bundle.id, 'special-gift');
  assert.equal(selected.resolved.canAdd, false);
  assert.equal(addRetailBundleToCart({}, selected.resolved.bundle, products).ok, false);
});

test('public placements distinguish featured sets, alternatives, active plans and historic plans', () => {
  assert.equal(RETAIL_BUNDLES.filter(item => item.ready).length, 8);
  assert.equal(new Set(RETAIL_BUNDLES.map(item => item.id)).size, RETAIL_BUNDLES.length);
  const placed = placement => RETAIL_BUNDLES.filter(item => item.placement === placement).map(item => item.id);
  assert.deepEqual(placed('featured'), ['first-tea', 'weekend', 'lotus-and-white']);
  assert.deepEqual(placed('specialist'), ['lotus-comparison']);
  assert.deepEqual(placed('replenishment'), ['home-and-work', 'office']);
  assert.deepEqual(placed('related'), ['lotus-and-leaf']);
  assert.deepEqual(placed('upgrade'), ['special-gift']);
  assert.equal(bundle('special-gift').upgradeFor, 'lotus-and-white');
  assert.deepEqual(placed('planned'), ['find-your-taste', 'lotus-discovery', 'honey-and-smoke', 'personal-office']);
  assert.deepEqual(placed('archived'), ['travel', 'cafe-trial', 'familiar-and-new']);
  assert.deepEqual(RETAIL_BUNDLE_PURPOSES.map(item => item.id), ['everyday', 'discovery', 'gifting', 'office']);
  for (const item of RETAIL_BUNDLES) {
    const fields = ['name', 'description', 'audience', 'occasion'];
    if (item.placement !== 'archived') fields.push('pairingReason');
    if (item.equipment) fields.push('equipment');
    for (const field of fields) {
      assert.equal(typeof item[field].vi, 'string');
      assert.equal(typeof item[field].en, 'string');
    }
    if (item.placement !== 'archived') assert.ok(item.purposes.every(id => RETAIL_BUNDLE_PURPOSES.some(purpose => purpose.id === id)));
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
  assert.equal(first.subtotal, 195000);
  assert.equal(first.reason, null);
  assert.deepEqual(first.lines.map(line => [line.key, line.weight, line.qty, line.unit]), [
    ['bach-mau-don__50g', '50g', 1, 'pcs'],
    ['pho-nhi-vien-mv2k5p6r__1 viên', '1 viên', 1, 'viên'],
  ]);
  products.find(item => item.id === 'bach-mau-don').variants[0].price = 180000;
  assert.equal(resolveRetailBundle(bundle('weekend'), products).subtotal, 200000);
  assert.equal(first.subtotal, 195000);
});

test('home and work alternative resolves the exact live 1kg pack independently', () => {
  const item = bundle('home-and-work');
  const alternative = custom([item.alternative]);
  const products = catalogue();
  assert.equal(resolveRetailBundle(item, products).subtotal, 120000);
  assert.equal(resolveRetailBundle(alternative, products).reason, 'unavailable');
  products[0].variants.push(pack('1kg', 115000));
  const resolved = resolveRetailBundle(alternative, products);
  assert.equal(resolved.canAdd, true);
  assert.equal(resolved.subtotal, 115000);
  assert.deepEqual(resolved.lines.map(line => [line.weight, line.qty]), [['1kg', 1]]);
  products[0].variants[1].price = 125000;
  assert.equal(resolveRetailBundle(alternative, products).subtotal, 125000);
  assert.equal(resolveRetailBundle(item, products).subtotal, 120000);
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
  const current = { 'pho-nhi-vien-mv2k5p6r__1 viên': 1 };
  assert.equal(resolveRetailBundle(item, products, current).canAdd, true);
  assert.equal(resolveRetailBundle(item, products, { 'pho-nhi-vien-mv2k5p6r__1 viên': 2 }).reason, 'stock_limit');
  pieces.stockSocSon = 0;
  const result = resolveRetailBundle(item, products, current);
  assert.equal(result.reason, 'stock_limit');
  assert.equal(result.lines[1].qty, 1);
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
  assert.deepEqual(result, { ok: true, reason: null, cart: { 'bach-mau-don__50g': 4, unrelated: RETAIL_CART_MAX, 'pho-nhi-vien-mv2k5p6r__1 viên': 1 } });
  assert.deepEqual(current, { 'bach-mau-don__50g': 3, unrelated: RETAIL_CART_MAX });
  assert.notEqual(result.cart, current);
  assert.deepEqual(Object.keys(result.cart).sort(), ['bach-mau-don__50g', 'pho-nhi-vien-mv2k5p6r__1 viên', 'unrelated']);
});

test('failed additions return the original cart and do not silently add or clamp any component', () => {
  const item = bundle('weekend');
  const current = Object.freeze({ unrelated: 3, 'bach-mau-don__50g': 2, 'pho-nhi-vien-mv2k5p6r__1 viên': 1 });
  const products = catalogue();
  products.find(tea => tea.id === 'pho-nhi-vien-mv2k5p6r').variants[0].stockSocSon = 1;
  const stock = addRetailBundleToCart(current, item, products);
  assert.deepEqual(stock, { ok: false, cart: current, reason: 'stock_limit' });
  assert.equal(stock.cart, current);
  assert.deepEqual(current, { unrelated: 3, 'bach-mau-don__50g': 2, 'pho-nhi-vien-mv2k5p6r__1 viên': 1 });
  const full = Object.freeze({ 'bach-mau-don__50g': RETAIL_CART_MAX });
  const limit = addRetailBundleToCart(full, item, catalogue());
  assert.equal(limit.cart, full);
  assert.equal(limit.reason, 'cart_limit');
  assert.equal(addRetailBundleToCart(current, bundle('find-your-taste'), catalogue()).cart, current);
  assert.equal(addRetailBundleToCart(current, item, []).cart, current);
});
