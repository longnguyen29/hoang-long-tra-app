import test from 'node:test';
import assert from 'node:assert/strict';
import { validateRetailCheckout, prepareRetailCheckout } from './retail-checkout.js';
import { retailOptions } from './retail-catalog.js';

const customer = { name: '  Test buyer  ', contact: '  buyer@example.test  ', address: '  Test address  ', consent: true, payment: 'qr' };
const product = { id: 'tea-a', available: true, line: 'everyday', name: { vi: 'Trà thử', en: 'Test tea' }, variants: [{ weight: '1 viên (8g)', price: 20000, stockSocSon: 3 }] };
const key = 'tea-a__1 viên (8g)';
const snapshots = products => products.flatMap(retailOptions).map(option => ({ key: option.key, price: option.price, unit: option.unit, weight: option.weight, packing: option.product.packSize || '' }));
const checkout = () => ({ customer: { ...customer }, cart: { [key]: 2 }, expectedTotal: 40000, expectedLines: snapshots([product]) });

test('checkout keeps only trimmed fulfilment fields and accepted payment choices', () => {
  const input = checkout();
  input.customer.internalNote = 'not a fulfilment field';
  const result = validateRetailCheckout(input);
  assert.deepEqual(result.customer, { name: 'Test buyer', contact: 'buyer@example.test', address: 'Test address', tax: '', note: '', payment: 'qr' });
  assert.deepEqual(result.cart, { [key]: 2 });
  assert.equal(result.expectedTotal, 40000);
  assert.equal(validateRetailCheckout({ ...checkout(), customer: { ...customer, payment: 'cash' } }).customer.payment, 'cash');
});

test('checkout requires genuine consent, required customer details and a supported payment', () => {
  for (const fields of [{ consent: false }, { consent: 'true' }, { consent: undefined }, { name: ' ' }, { contact: '' }, { address: '' }, { payment: 'card' }, { payment: undefined }, { tax: 123 }]) {
    assert.throws(() => validateRetailCheckout({ ...checkout(), customer: { ...customer, ...fields } }), /invalid_checkout/);
  }
  for (const [field, length] of [['name', 181], ['contact', 241], ['address', 1001], ['tax', 81], ['note', 3001]]) {
    assert.throws(() => validateRetailCheckout({ ...checkout(), customer: { ...customer, [field]: 'x'.repeat(length) } }), /invalid_checkout/);
  }
});

test('strict order validation rejects unsafe or excessive cart input without silently clamping it', () => {
  for (const qty of [0, -1, 1.5, 100, '2', null, Infinity]) {
    assert.throws(() => validateRetailCheckout({ ...checkout(), cart: { [key]: qty } }), /invalid_checkout/);
  }
  for (const cart of [{}, [], null, JSON.parse('{"__proto__":1}'), { [key]: 2, invalid: '2' }, Object.fromEntries(Array.from({ length: 51 }, (_, i) => [`tea-${i}`, 1]))]) {
    assert.throws(() => validateRetailCheckout({ ...checkout(), cart }), /invalid_checkout/);
  }
  for (const expectedTotal of [0, -1, '40000', null, NaN, Infinity]) {
    assert.throws(() => validateRetailCheckout({ ...checkout(), expectedTotal }), /invalid_checkout/);
  }
});

test('checkout derives catalogue price, package unit, count and total rather than browser line snapshots', () => {
  const input = { ...checkout(), lines: [{ productId: 'tea-a', price: 1, unit: 'kg', qty: 99 }], estimatedTotal: 1 };
  const prepared = prepareRetailCheckout(input, [product]);
  assert.equal(prepared.total, 40000);
  assert.equal(prepared.count, 2);
  assert.equal(prepared.lines[0].price, 20000);
  assert.equal(prepared.lines[0].unit, 'viên');
  assert.equal(prepared.lines[0].qty, 2);
  assert.equal(prepared.lines[0].productId, 'tea-a');
});

test('checkout asks for review when a saved price changes and refuses missing, unavailable or sample items', () => {
  assert.throws(() => prepareRetailCheckout(checkout(), [{ ...product, variants: [{ ...product.variants[0], price: 21000 }] }]), /price_changed/);
  for (const products of [[], [{ ...product, available: false }], [{ ...product, line: 'sample' }], [{ ...product, variants: [{ ...product.variants[0], stockSocSon: 1 }] }]]) {
    assert.throws(() => prepareRetailCheckout(checkout(), products), /cart_changed/);
  }
});

test('checkout requires one distinct option snapshot for each cart line', () => {
  for (const expectedLines of [undefined, null, {}, [], [null, null]]) {
    assert.throws(() => validateRetailCheckout({ ...checkout(), expectedLines }), /invalid_checkout/);
  }
  const first = snapshots([product])[0];
  assert.throws(() => validateRetailCheckout({ ...checkout(), cart: { [key]: 1, 'tea-b': 1 }, expectedLines: [first, first] }), /invalid_checkout/);
  assert.throws(() => prepareRetailCheckout({ ...checkout(), expectedLines: [{ ...first, key: 'other-product' }] }, [product]), /cart_changed/);
});

test('unchanged total cannot conceal a changed unit or packaging specification', () => {
  const loose = { id: 'loose', available: true, line: 'everyday', name: { vi: 'Trà rời' }, price: 20000 };
  const payload = { customer: { ...customer }, cart: { loose: 1 }, expectedTotal: 20000, expectedLines: snapshots([loose]) };
  // Changing the sale basis from kg to package requires buyer review even if
  // the numerical price is unchanged.
  assert.throws(() => prepareRetailCheckout(payload, [{ ...loose, line: 'reserve' }]), /cart_changed/);
  // This does not change the kg unit; its packaging change is independently
  // material to the shopper's selection.
  assert.throws(() => prepareRetailCheckout(payload, [{ ...loose, packSize: '1kg, 5kg' }]), /cart_changed/);
});

test('offsetting price changes still require review even when the total stays identical', () => {
  const first = { id: 'tea-first', available: true, line: 'everyday', packSize: 'Viên', name: { vi: 'Trà một' }, price: 20000 };
  const second = { ...first, id: 'tea-second', name: { vi: 'Trà hai' }, price: 30000 };
  const payload = { customer: { ...customer }, cart: { 'tea-first': 1, 'tea-second': 1 }, expectedTotal: 50000, expectedLines: snapshots([first, second]) };
  assert.equal(prepareRetailCheckout(payload, [first, second]).total, 50000);
  assert.throws(() => prepareRetailCheckout(payload, [{ ...first, price: 25000 }, { ...second, price: 25000 }]), /price_changed/);
});
