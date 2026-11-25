import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { DOCUMENT_TEMPLATES, createDocumentDraft, buildDocument } from './company-documents.js';
import { B2B_DOCUMENT_TEMPLATES, prefillB2BDocument } from './b2b-document-drafts.js';

const order = {
  id: 'ord-example', type: 'wholesale', customer_name: 'Khách kiểm thử', address: 'Điểm nhận thử',
  estimated_total: 350000, payment_method: 'qr',
  lines: [
    { productId: 'hong-tra-shan-mat', name: { vi: 'Hồng trà Shan Mật' }, qty: 1, unit: 'kg', price: 100000 },
    { productId: 'hong-tra-shan-khoi', name: { vi: 'Hồng trà Shan Khói' }, qty: 1, unit: 'kg', price: 100000 },
    { name: { vi: 'Trà nhài 500g' }, qty: 1, unit: 'pcs', price: 150000 },
  ],
};
const customer = { business_name: 'Tên cửa hàng', b2b_legal: { legalName: 'Pháp nhân B', taxId: '0000000001', address: 'Địa chỉ pháp nhân B' } };
const seller = { details: { legalName: 'Pháp nhân A', taxId: '0000000002', address: 'Địa chỉ pháp nhân A', bankHolder: 'Pháp nhân A', bankAccount: '00001' } };
const workflow = { seller_id: 'green-hill', vat_percent: 8 };
const date = new Date('2026-11-25T18:00:00Z');

test('the four B2B templates are scoped to the workflow', () => {
  const ids = DOCUMENT_TEMPLATES.filter(template => template.workflowOnly).map(template => template.id);
  assert.deepEqual(ids, Object.values(B2B_DOCUMENT_TEMPLATES));
  assert.equal(createDocumentDraft(B2B_DOCUMENT_TEMPLATES.framework).company_legal_name, '');
});

test('invoice prep uses legal identities, aliases, and configured VAT, with a draft watermark', () => {
  const fields = prefillB2BDocument('vat_invoice', { order, seller, workflow, customer }, date);
  const templateId = B2B_DOCUMENT_TEMPLATES.vat_invoice;
  const document = buildDocument(templateId, createDocumentDraft(templateId, { ...fields, document_ref: 'ĐC-001' }));
  assert.equal(document.validation.valid, true, JSON.stringify(document.validation.errors));
  assert.equal(document.validation.amounts.b2bTotals.total, 378000);
  assert.match(document.plainText, /HÓA ĐƠN CHƯA PHÁT HÀNH/);
  assert.match(document.plainText, /Trà đen OP1/);
  assert.match(document.plainText, /Trà đen OP ·/);
  assert.match(document.plainText, /Trà Nhài/);
  assert.doesNotMatch(document.plainText, /Hồng trà Shan|\b00001\b/);
  assert.deepEqual(document.signatureBlocks, []);
  assert.equal(fields.document_date, '2026-11-26');
});

test('document prefill does not treat delivery as proof or assume prices already include VAT', () => {
  const discounted = prefillB2BDocument('sales_contract', { order: { ...order, estimated_total: 320000 }, workflow });
  const retail = prefillB2BDocument('sales_contract', { order: { ...order, type: 'retail' }, workflow });
  const delivery = prefillB2BDocument('delivery_record', { order, seller, customer, workflow });
  assert.equal(discounted.b2b_subtotal, null);
  assert.equal(retail.b2b_subtotal, null);
  assert.equal(delivery.b2b_actual_quantities, undefined);
  assert.doesNotMatch(delivery.tea_order_lines, /100.000|350.000|₫/);
  assert.equal(delivery.tea_order_shipping, order.address);
});
