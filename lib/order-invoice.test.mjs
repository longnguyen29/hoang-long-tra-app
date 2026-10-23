import test from 'node:test';
import assert from 'node:assert/strict';
import { buildOrderInvoiceHtml } from './order-invoice.js';

function order(overrides = {}) {
  return {
    id: 'HL-INVOICE-42',
    type: 'wholesale',
    customerName: 'Quán Sen',
    contact: '0901234567',
    address: '12 Phố Huế, Hà Nội',
    note: 'Giao buổi sáng',
    estimatedTotal: 240000,
    lines: [{ name: 'Hồng Trà Shan Mật', qty: 2, unit: 'kg', price: 120000, listPrice: 150000, total: 240000 }],
    ...overrides,
  };
}

function lineRow(html, index = 0) {
  const row = html.match(new RegExp(`<tr\\b[^>]*\\bdata-line-index=["']${index}["'][^>]*>([\\s\\S]*?)<\\/tr>`, 'i'));
  assert.ok(row, `Invoice contains a row for saved line ${index}`);
  return row[1];
}

const amount = (value) => new RegExp(String(value).replace(/\B(?=(\d{3})+(?!\d))/g, '[.,\\s\\u00a0\\u202f]?'));

test('original selling prices are hidden by default', () => {
  const html = buildOrderInvoiceHtml(order());
  assert.doesNotMatch(html, /<th\b[^>]*data-column=["']original-price["']/i);
  assert.doesNotMatch(html, /<th\b[^>]*>\s*Giá gốc\s*<\/th>/i);
  assert.doesNotMatch(lineRow(html), amount(150000));
  assert.match(lineRow(html), amount(120000));
});

test('opt-in shows each recorded list price and leaves a missing original price unknown', () => {
  const html = buildOrderInvoiceHtml(order({
    lines: [
      { name: 'Trà có giá niêm yết', qty: 1, unit: 'kg', price: 71000, listPrice: 93000 },
      { productId: 'no-catalog-lookup', name: 'Trà không lưu giá gốc', qty: 1, unit: 'kg', price: 72000 },
      { name: 'Mẫu giá gốc bằng không', qty: 1, unit: 'pack', price: 0, listPrice: 0 },
    ],
  }), { showOriginalPrice: true });
  assert.match(html, /<th\b[^>]*data-column=["']original-price["'][^>]*>\s*Giá gốc\s*<\/th>/i);
  assert.match(lineRow(html, 0), amount(93000));
  assert.match(lineRow(html, 0), amount(71000));
  assert.match(lineRow(html, 1), /—/);
  assert.match(lineRow(html, 1), amount(72000));
  assert.doesNotMatch(lineRow(html, 2), /—/);
  assert.match(lineRow(html, 2), />\s*0(?:\s|&nbsp;|₫|đ|VND|<)/);
});

test('export uses the saved current unit price and quantity instead of a stale line total', () => {
  const html = buildOrderInvoiceHtml(order({
    estimatedTotal: 400000,
    lines: [{ name: 'Đơn đã sửa giá', qty: 2, unit: 'kg', price: 200000, listPrice: 230000, total: 460000 }],
  }), { showOriginalPrice: true });
  const row = lineRow(html);
  assert.match(row, amount(200000));
  assert.match(row, amount(400000));
  assert.doesNotMatch(row, amount(460000));
});

test('a zero-priced sample and a saved zero order total remain visible', () => {
  const html = buildOrderInvoiceHtml(order({
    estimatedTotal: 0,
    lines: [{ name: 'Mẫu không thu tiền', qty: 1, unit: 'g', price: 0, total: 99000 }],
  }));
  assert.doesNotMatch(lineRow(html), /—/);
  assert.doesNotMatch(html, amount(99000));
  assert.ok((html.match(/>\s*0(?:\s|&nbsp;|₫|đ|VND|<)/g) || []).length >= 3, 'Unit price, line total and order total show zero');
});

test('the agreed order total is retained rather than applying a bulk discount again', () => {
  const input = order({
    type: 'wholesale',
    totalKg: 50,
    discountPercent: 5,
    estimatedTotal: 190000,
    lines: [{ name: 'Đơn đã chốt giảm giá', qty: 50, unit: 'kg', price: 4000, total: 200000 }],
  });
  const html = buildOrderInvoiceHtml(input);
  assert.match(lineRow(html), amount(200000));
  assert.match(html, amount(190000));
  assert.doesNotMatch(html, amount(180500));
});

test('untrusted order, customer, product and note text is escaped in the standalone HTML', () => {
  const attack = '<img src=x onerror=alert(1)>';
  const html = buildOrderInvoiceHtml(order({
    id: `HL-${attack}`,
    customerName: `Khách ${attack}`,
    contact: `0901 ${attack}`,
    address: `Địa chỉ ${attack}`,
    note: `Ghi chú ${attack} & giữ nguyên`,
    lines: [{ name: `Trà ${attack}`, qty: 1, unit: 'kg', weight: `Quy cách ${attack}`, price: 120000 }],
  }), { showOriginalPrice: true });
  assert.doesNotMatch(html, /<img\b/i);
  assert.doesNotMatch(html, /<script\b[^>]*>\s*alert/i);
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  for (const label of ['HL-', 'Khách', '0901', 'Địa chỉ', 'Ghi chú', 'Trà']) {
    assert.ok(html.includes(label), `${label} is retained as printable text`);
  }
  assert.match(html, /&amp; giữ nguyên/);
});

test('mixed tea selling units remain kg, pieces and packs without invented weight conversion', () => {
  const input = order({ lines: [
    { name: 'Trà rời', qty: 2.5, unit: 'kg', price: 80000 },
    { name: 'Phổ Nhĩ viên', qty: 3, unit: 'viên', price: 10000 },
    { name: 'Trà đóng gói', qty: 2, unit: 'pack', weight: '500g', price: 70000 },
  ] });
  const vi = buildOrderInvoiceHtml(input);
  assert.match(lineRow(vi, 0), /kg/);
  assert.match(lineRow(vi, 1), /viên/);
  assert.doesNotMatch(lineRow(vi, 1), /kg/);
  assert.match(lineRow(vi, 2), /gói/);
  const en = buildOrderInvoiceHtml(input, { locale: 'en' });
  assert.match(lineRow(en, 1), /pieces/);
  assert.match(lineRow(en, 2), /packs/);
});

test('customer-facing exports never expose internal cost, margin or partner settlement fields', () => {
  const html = buildOrderInvoiceHtml(order({
    productionCost: 'INTERNAL_FACTORY_COST',
    margin: 'INTERNAL_MARGIN',
    partnerBasePrice: 'INTERNAL_PARTNER_BASE',
    partnerCommission: 'INTERNAL_COMMISSION',
    lines: [{ name: 'Trà bán cho khách', qty: 1, unit: 'kg', price: 120000, listPrice: 150000,
      costPrice: 'INTERNAL_LINE_COST', margin: 'INTERNAL_LINE_MARGIN', partnerBasePrice: 'INTERNAL_LINE_BASE' }],
  }), { showOriginalPrice: true });
  assert.doesNotMatch(html, /INTERNAL_/);
  assert.match(lineRow(html), amount(150000));
});

test('rendering both invoice options does not modify the saved order snapshot', () => {
  const input = order();
  const original = structuredClone(input);
  Object.freeze(input.lines[0]);
  Object.freeze(input.lines);
  Object.freeze(input);
  buildOrderInvoiceHtml(input);
  buildOrderInvoiceHtml(input, { showOriginalPrice: true });
  assert.deepEqual(input, original);
});
