import test from 'node:test';
import assert from 'node:assert/strict';
import { retailTeaComparisonCopy, retailTeaComparisons } from './retail-tea-comparison.js';

const tea = (id, fields = {}) => ({
  id, kind: 'tea', line: 'everyday', available: true, price: 125000,
  name: { vi: `Tên hiện tại ${id}`, en: `Current name ${id}` },
  flavors: { vi: ['Hương trong danh mục'], en: ['Current catalogue note'] },
  ...fields,
});

test('familiar categories use explicit tea identities and ignore misleading product names', () => {
  const products = [
    tea('luc-tra-shan-moc'), tea('hong-tra-shan-mat'), tea('hong-tra-shan-tuyen-mti6jlyg'),
    tea('hong-tra-shan-khoi'), tea('luc-tra-lai-tieu-chuan'), tea('luc-tra-hoa-sen'),
    tea('tra-gao-sen-3-lan'), tea('tra-gao-sen-7-lan'), tea('oolong-kim-tuyen-nghe-nhan-ai-loan-mti6gt2a'),
    tea('unknown', { name: { vi: 'Thái Nguyên Shan Mật Khói Sen Lài Oolong English Breakfast' } }),
    tea('daily-green-tea-iced-tea-mu3w9lr0'),
  ];
  const groups = retailTeaComparisons(products.reverse());
  assert.deepEqual(groups.map(group => [group.id, group.products.map(item => item.product.id)]), [
    ['familiar-green', ['luc-tra-shan-moc']],
    ['breakfast-black', ['hong-tra-shan-mat', 'hong-tra-shan-tuyen-mti6jlyg']],
    ['smoky-black', ['hong-tra-shan-khoi']],
    ['floral', ['luc-tra-lai-tieu-chuan', 'luc-tra-hoa-sen', 'tra-gao-sen-3-lan', 'tra-gao-sen-7-lan']],
    ['oolong', ['oolong-kim-tuyen-nghe-nhan-ai-loan-mti6gt2a']],
  ]);
});

test('only current orderable teas appear, with empty categories removed', () => {
  for (const fields of [
    { available: false }, { available: undefined }, { kind: 'goods' }, { line: 'sample' },
    { price: null }, { price: 0 }, { stockSocSon: 0, stockHaGiang: 0 },
    { variants: [{ weight: '50g', price: 50000, stockSocSon: 0 }] },
  ]) {
    assert.deepEqual(retailTeaComparisons([tea('hong-tra-shan-khoi', fields)]), [], JSON.stringify(fields));
  }
  assert.deepEqual(retailTeaComparisons(), []);
  assert.deepEqual(retailTeaComparisons([null]), []);
  const groups = retailTeaComparisons([tea('luc-tra-hoa-sen')]);
  assert.deepEqual(groups.map(group => group.id), ['floral']);
  assert.deepEqual(groups[0].products.map(item => item.product.id), ['luc-tra-hoa-sen']);
});

test('recommendations retain fresh localized catalogue facts, links and available pack options', () => {
  const product = tea('hong-tra-shan-mat', { price: 999999, variants: [
    { weight: '50g', price: 70000, stockSocSon: 0 },
    { weight: '100g', price: 130000, stockSocSon: 3 },
    { weight: '200g', price: null },
  ] });
  const before = JSON.stringify(product);
  const [english] = retailTeaComparisons([product], 'en');
  const [match] = english.products;
  assert.equal(match.product, product);
  assert.equal(match.facts.name, product.name.en);
  assert.deepEqual(match.facts.flavors, product.flavors.en);
  assert.equal(match.href, '/shop/hong-tra-shan-mat?lang=en');
  assert.deepEqual(match.options.map(option => [option.weight, option.price, option.stock]), [['100g', 130000, 3]]);
  assert.equal(JSON.stringify(product), before);
  const [vietnamese] = retailTeaComparisons([product], 'fr');
  assert.equal(vietnamese.products[0].facts.name, product.name.vi);
  assert.equal(vietnamese.products[0].href, '/shop/hong-tra-shan-mat');
});

test('detail guidance is restricted to a current product’s relevant familiar category', () => {
  const products = [tea('hong-tra-shan-mat'), tea('hong-tra-shan-tuyen-mti6jlyg'), tea('luc-tra-hoa-sen')];
  const filtered = retailTeaComparisons(products, 'en', { productId: 'hong-tra-shan-mat' });
  assert.deepEqual(filtered.map(group => group.id), ['breakfast-black']);
  assert.equal(filtered[0].products.length, 2);
  for (const productId of ['missing', 'luc-tra-shan-moc', '']) {
    assert.deepEqual(retailTeaComparisons(products, 'vi', { productId }), []);
  }
  assert.deepEqual(retailTeaComparisons([tea('hong-tra-shan-mat', { available: false }), tea('hong-tra-shan-tuyen-mti6jlyg')], 'vi', { productId: 'hong-tra-shan-mat' }), []);
});

test('both languages frame origin differences and tasting prompts without fabricated evaluations', () => {
  for (const locale of ['vi', 'en']) {
    const copy = retailTeaComparisonCopy(locale);
    const groups = retailTeaComparisons([tea('luc-tra-shan-moc'), tea('hong-tra-shan-mat')], locale);
    assert.ok(copy.title);
    assert.match(groups[0].intro, /Thái Nguyên/);
    assert.match(groups[0].intro, /Shan/);
    assert.match(groups[0].intro, locale === 'vi' ? /không mang chỉ dẫn xuất xứ Thái Nguyên/ : /no Thái Nguyên origin claim/);
    assert.ok(groups.every(group => group.compare.length && group.products.every(item => item.facts.note === '')));
    assert.deepEqual(groups[1].sources, [{ label: 'Dilmah · English Breakfast', url: 'https://shop.dilmahtea.com.au/products/finest-english-breakfast' }]);
    assert.doesNotMatch(JSON.stringify([copy, groups.map(({ products, ...context }) => context)]), /equivalent|superior|better than|tốt hơn|tương đương|detox|giải độc|rating|đánh giá \d|Twinings|bergamot/i);
  }
});
