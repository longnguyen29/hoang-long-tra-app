import test from 'node:test';
import assert from 'node:assert/strict';
import { retailBrewingGuidance } from './retail-product-guidance.js';

test('short tasting infusions apply to known loose teas, not iced-tea or compressed formats', () => {
  const tasting = retailBrewingGuidance({ id: 'luc-tra-shan-moc' });
  assert.equal(tasting.methods.find(method => method.id === 'tasting').duration, '10–30 giây');
  assert.deepEqual(retailBrewingGuidance({ id: 'daily-green-tea-iced-tea-mu3w9lr0' }).methods.map(method => method.id), ['hot', 'cold']);
  for (const id of ['pho-nhi-vien-mv2k5p6r', 'pho-nhi-banh-mv2k6syd', 'unknown-tea']) {
    assert.deepEqual(retailBrewingGuidance({ id }).methods, []);
  }
});

test('brewing suggestions preserve product instructions and keep cold brew refrigerated', () => {
  const product = { id: 'bach-mau-don', brew: { vi: 'Công thức riêng đã xác nhận', en: 'Confirmed recipe' } };
  const before = JSON.stringify(product);
  const vi = retailBrewingGuidance(product);
  const en = retailBrewingGuidance(product, 'en');
  assert.equal(JSON.stringify(product), before);
  assert.deepEqual(vi.methods.map(method => method.id), ['tasting', 'cold']);
  assert.match(vi.methods.find(method => method.id === 'cold').instructions, /đặt ngay vào ngăn mát/);
  assert.match(en.methods.find(method => method.id === 'cold').instructions, /refrigerate immediately/);
  assert.match(en.methods.find(method => method.id === 'cold').caption, /4°C/);
  assert.deepEqual(retailBrewingGuidance({ id: 'luc-tra-shan-moc', kind: 'goods' }).methods, []);
});
