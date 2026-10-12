import test from 'node:test';
import assert from 'node:assert/strict';
import { retailOptions, retailProductFacts, retailProductHref, matchesRetailSearch, retailOrderLines } from './retail-catalog.js';

const tea = {
  id: 'pho-nhi-vien-mv2k5p6r', kind: 'tea', line: 'everyday', available: true,
  name: { vi: 'Phổ Nhĩ viên', en: 'Pu-erh Tea Pieces' },
  notes: { vi: 'Vị đậm, hậu ngọt', en: 'Rich taste, sweet finish' },
  flavors: { vi: ['Mật ong'], en: ['Honey'] },
  brew: { vi: 'Ủ 3 phút', en: 'Steep for 3 minutes' },
};

test('retail variant units remain pieces, cakes or packages rather than inferred kilograms', () => {
  const options = retailOptions({ ...tea, variants: [
    { weight: '1 viên (8g)', price: 15000, stockHaGiang: null, stockSocSon: null },
    { weight: '1 bánh (357g)', price: 300000, stockHaGiang: 2, stockSocSon: 3 },
    { weight: '20 viên', price: 200000 },
    { weight: '500g', price: 120000 },
  ] });
  assert.deepEqual(options.map(option => option.unit), ['viên', 'bánh', 'pcs', 'pcs']);
  assert.equal(options[0].key, `${tea.id}__1 viên (8g)`);
  assert.equal(options[0].product.id, tea.id);
  assert.equal(options[1].stock, 5);
});

test('unknown stock stays unknown while sold-out variants cannot be added', () => {
  const options = retailOptions({ ...tea, variants: [
    { weight: '100g', price: 50000 },
    { weight: '200g', price: 80000, stockHaGiang: 0, stockSocSon: 0 },
    { weight: '300g', price: 100000, stockHaGiang: null, stockSocSon: 2 },
  ] });
  assert.equal(options[0].stock, null);
  assert.equal(options[0].orderable, true);
  assert.equal(options[1].stock, 0);
  assert.equal(options[1].orderable, false);
  assert.equal(options[2].stock, 2);
  assert.equal(options[2].orderable, true);
});

test('missing or invalid retail prices do not become a zero-price checkout', () => {
  for (const price of [undefined, null, 0, -1000, NaN, Infinity]) {
    const [option] = retailOptions({ ...tea, price });
    assert.equal(option.orderable, false);
  }
  const [option] = retailOptions({ ...tea, price: 40000, packSize: 'Viên' });
  assert.equal(option.price, 40000);
  assert.equal(option.unit, 'viên');
  assert.equal(option.orderable, true);
  assert.equal(retailOptions({ ...tea, available: false, price: 40000 })[0].orderable, false);
});

test('retail search understands accents and both catalogue languages without invented facts', () => {
  for (const query of ['', 'pho nhi', 'Pu-erh honey', 'hau ngot', 'steep minutes']) {
    assert.equal(matchesRetailSearch(tea, query, 'vi'), true, query);
  }
  assert.equal(matchesRetailSearch(tea, 'pu-erh jasmine', 'en'), false);
  assert.equal(matchesRetailSearch({ ...tea, notes: null, flavors: null, brew: null }, 'honey', 'en'), false);
});

test('detail links preserve chosen locale and encode product identity safely', () => {
  const vi = new URL(retailProductHref('tea-a', 'vi'), 'https://example.test');
  const en = new URL(retailProductHref('tea a/100g', 'en'), 'https://example.test');
  assert.equal(vi.pathname, '/shop/tea-a');
  assert.equal(en.pathname, '/shop/tea%20a%2F100g');
  assert.equal(en.searchParams.get('lang'), 'en');
  assert.ok(!new URL(retailProductHref('tea-a', 'fr'), 'https://example.test').searchParams.has('lang'));
});

test('product detail facts reuse recorded content and do not fill absent tasting or brewing claims', () => {
  const facts = retailProductFacts({ ...tea, packSize: 'Viên' }, 'vi');
  assert.equal(facts.name, 'Phổ Nhĩ viên');
  assert.equal(facts.note, tea.notes.vi);
  assert.equal(facts.brew, tea.brew.vi);
  assert.equal(facts.packing, 'Viên');
  assert.equal(facts.groupId, 'pressed');
  const sparse = retailProductFacts({ id: 'new-tea', name: { vi: 'Trà mới' }, line: 'everyday' }, 'vi');
  assert.equal(sparse.note, '');
  assert.equal(sparse.brew, '');
  assert.equal(sparse.packing, '');
  assert.deepEqual(sparse.flavors, []);
});

test('order construction uses fresh catalogue prices and the correct package unit', () => {
  const current = { ...tea, variants: [{ weight: '1 viên (8g)', price: 18000, stockSocSon: 10 }] };
  const key = `${tea.id}__1 viên (8g)`;
  const [line] = retailOrderLines({ [key]: 2 }, [current]);
  assert.equal(line.price, 18000);
  assert.equal(line.qty, 2);
  assert.equal(line.unit, 'viên');
  assert.equal(line.productId, tea.id);
  assert.equal(line.weight, '1 viên (8g)');
  assert.deepEqual(line.name, {
    vi: 'Phổ Nhĩ viên (1 viên (8g))',
    en: 'Pu-erh Tea Pieces (1 viên (8g))',
  });
});

test('order construction refuses stale options, missing prices and quantities beyond current stock', () => {
  const current = { ...tea, price: 18000, packSize: 'Viên', stockSocSon: 2 };
  for (const cart of [{ missing: 1 }, { [tea.id]: 3 }, { [tea.id]: 100 }, { [tea.id]: 1.5 }, { [tea.id]: 0 }]) {
    assert.throws(() => retailOrderLines(cart, [current]), /cart_changed/);
  }
  for (const fields of [{ available: false }, { price: null }, { stockSocSon: 0 }]) {
    assert.throws(() => retailOrderLines({ [tea.id]: 1 }, [{ ...current, ...fields }]), /cart_changed/);
  }
});
