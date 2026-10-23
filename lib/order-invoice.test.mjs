import test from 'node:test';
import assert from 'node:assert/strict';
import { buildOrderInvoiceHtml, invoicePaymentDetails } from './order-invoice.js';
import { PAYMENT_BANK_OVERRIDE } from './payment-settings.js';

function order(overrides = {}) {
  return {
    id: 'HL-INVOICE-42',
    type: 'wholesale',
    customerName: 'Quán Sen',
    contact: '0901234567',
    address: '12 Phố Huế, Hà Nội',
    note: 'Giao buổi sáng',
    estimatedTotal: 240000,
    lines: [{ name: 'Hồng Trà Shan Mật', qty: 2, unit: 'kg', price: 120000, priceBeforeEdit: 150000, listPrice: 170000, total: 240000 }],
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

test('opt-in shows the price before a manual order edit and never substitutes a catalog list price', () => {
  const html = buildOrderInvoiceHtml(order({
    lines: [
      { name: 'Trà từng sửa giá', qty: 1, unit: 'kg', price: 71000, priceBeforeEdit: 93000, listPrice: 115000 },
      { productId: 'no-catalog-lookup', name: 'Trà không lưu giá trước khi sửa', qty: 1, unit: 'kg', price: 72000, listPrice: 116000 },
      { name: 'Mẫu giá trước khi sửa bằng không', qty: 1, unit: 'pack', price: 0, priceBeforeEdit: 0, listPrice: 117000 },
      { name: 'Chưa biết giá trước khi sửa', qty: 1, unit: 'kg', price: 73000, priceBeforeEdit: null, listPrice: 118000 },
    ],
  }), { showOriginalPrice: true });
  assert.match(html, /<th\b[^>]*data-column=["']original-price["'][^>]*>\s*Giá gốc\s*<\/th>/i);
  assert.match(lineRow(html, 0), amount(93000));
  assert.doesNotMatch(lineRow(html, 0), amount(115000));
  assert.match(lineRow(html, 0), amount(71000));
  assert.match(lineRow(html, 1), /—/);
  assert.match(lineRow(html, 1), amount(72000));
  assert.doesNotMatch(lineRow(html, 1), amount(116000));
  assert.doesNotMatch(lineRow(html, 2), /—/);
  assert.match(lineRow(html, 2), />\s*0(?:\s|&nbsp;|₫|đ|VND|<)/);
  assert.match(lineRow(html, 3), /—/);
  assert.doesNotMatch(lineRow(html, 3), amount(118000));
});

test('export uses the saved current unit price and quantity instead of a stale line total', () => {
  const html = buildOrderInvoiceHtml(order({
    estimatedTotal: 400000,
    lines: [{ name: 'Đơn đã sửa giá', qty: 2, unit: 'kg', price: 200000, priceBeforeEdit: 230000, listPrice: 250000, total: 460000 }],
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
  assert.doesNotMatch(html, /<img\b[^>]*\bsrc=["']?x(?:\s|["'>])/i);
  assert.doesNotMatch(html, /<img\b[^>]*\bonerror\s*=/i);
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
    lines: [{ name: 'Trà bán cho khách', qty: 1, unit: 'kg', price: 120000, priceBeforeEdit: 150000, listPrice: 170000,
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

test('payment QR uses the same central receiving bank and saved order total without a ledger', () => {
  const result = invoicePaymentDetails(order(), { payment: {
    bin: 'OLD-BANK', accountNumber: 'OLD-ACCOUNT', accountName: 'OLD-NAME', bankShortName: 'OLD',
  } });
  assert.equal(result.bank.bin, PAYMENT_BANK_OVERRIDE.bin);
  assert.equal(result.bank.accountNumber, PAYMENT_BANK_OVERRIDE.accountNumber);
  assert.equal(result.bank.accountName, PAYMENT_BANK_OVERRIDE.accountName);
  assert.equal(result.reference, 'HL-INVOICE-42');
  assert.equal(result.total, 240000);
  assert.equal(result.paid, null, 'No receivable ledger must not invent a recorded payment amount');
  assert.equal(result.due, 240000);
  const qr = new URL(result.qrUrl);
  assert.equal(qr.protocol, 'https:');
  assert.equal(qr.hostname, 'img.vietqr.io');
  assert.ok(qr.pathname.includes(PAYMENT_BANK_OVERRIDE.bin));
  assert.ok(qr.pathname.includes(PAYMENT_BANK_OVERRIDE.accountNumber));
  assert.equal(qr.searchParams.get('amount'), '240000');
});

test('a partially paid ledger QR contains only the remainder, safe bank details and encoded reference', () => {
  const reference = 'TT HL/42 & đợt 2?';
  const input = order({ customerName: 'PRIVATE_CUSTOMER', contact: 'PRIVATE_PHONE', address: 'PRIVATE_ADDRESS' });
  const result = invoicePaymentDetails(input, { receivable: {
    invoice_number: reference, total: 240000, paid: 65000, status: 'partial',
  } });
  assert.equal(result.reference, reference);
  assert.equal(result.paid, 65000);
  assert.equal(result.due, 175000);
  const qr = new URL(result.qrUrl);
  assert.equal(qr.searchParams.get('amount'), '175000');
  assert.equal(qr.searchParams.get('addInfo'), reference);
  assert.equal(qr.searchParams.get('accountName'), PAYMENT_BANK_OVERRIDE.accountName);
  assert.doesNotMatch(result.qrUrl, /PRIVATE_CUSTOMER|PRIVATE_PHONE|PRIVATE_ADDRESS/);
});

test('zero totals and fully paid ledgers have no payment QR', () => {
  for (const [input, options] of [
    [order({ estimatedTotal: 0 }), {}],
    [order(), { receivable: { total: 240000, paid: 240000, status: 'paid' } }],
    [order({ estimatedTotal: 0 }), { receivable: { total: 0, paid: 0, status: 'open' } }],
  ]) {
    const result = invoicePaymentDetails(input, options);
    assert.ok(!result.qrUrl);
    assert.equal(result.due, 0);
  }
});

test('unknown or invalid total and ledger payment values do not create a QR for a guessed amount', () => {
  for (const total of [undefined, null, '', 'not-a-number', -1]) {
    assert.ok(!invoicePaymentDetails(order({ estimatedTotal: total })).qrUrl, `Unknown total ${String(total)}`);
  }
  for (const paid of [undefined, null, '', 'unknown', -1]) {
    const result = invoicePaymentDetails(order(), { receivable: { total: 240000, paid, status: 'open' } });
    assert.ok(!result.qrUrl, `Unknown ledger paid ${String(paid)}`);
    assert.ok(result.reason, 'Unknown ledger payment has a visible explanation');
  }
});

test('a void ledger cannot produce an active payment QR', () => {
  const result = invoicePaymentDetails(order(), { receivable: { total: 240000, paid: 0, status: 'void' } });
  assert.ok(!result.qrUrl);
  assert.ok(result.reason);
});

test('a ledger total that disagrees with the saved order fails closed instead of charging the wrong amount', () => {
  const result = invoicePaymentDetails(order(), { receivable: {
    invoice_number: 'STALE-INVOICE', total: 260000, paid: 50000, status: 'partial',
  } });
  assert.ok(!result.qrUrl);
  assert.ok(result.reason);
});

test('standalone invoice includes a trustworthy QR for the unpaid remainder and no QR once paid', () => {
  const receivable = { invoice_number: 'TT-HL-42', total: 240000, paid: 60000, status: 'partial' };
  const html = buildOrderInvoiceHtml(order(), { receivable });
  const img = html.match(/<img\b[^>]*\bsrc=["']([^"']+)["']/i);
  assert.ok(img, 'Payment QR is embedded in the printable invoice');
  const qr = new URL(img[1].replaceAll('&amp;', '&'));
  assert.equal(qr.hostname, 'img.vietqr.io');
  assert.equal(qr.searchParams.get('amount'), '180000');
  assert.equal(qr.searchParams.get('addInfo'), 'TT-HL-42');
  assert.match(html, amount(60000));
  assert.match(html, amount(180000));
  const paid = buildOrderInvoiceHtml(order(), { receivable: { ...receivable, paid: 240000, status: 'paid' } });
  assert.doesNotMatch(paid, /<img\b[^>]*\bsrc=["']https:\/\/img\.vietqr\.io/i);
});
