import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateInvoiceTotals, frameworkIsValid, officialTeaName, workflowProgress } from './b2b-customer-workflow.js';

test('framework is reusable only when signed evidence and validity are present', () => {
  const contract = { status: 'complete', file_id: 'file', valid_from: '2026-01-01', valid_until: '2026-12-31' };
  assert.equal(frameworkIsValid(contract, '2026-11-25'), true);
  assert.equal(frameworkIsValid(contract, '2027-01-01'), false);
  assert.equal(frameworkIsValid({ ...contract, file_id: null }, '2026-11-25'), false);
  assert.equal(frameworkIsValid({ ...contract, valid_from: '2026-02-30' }, '2026-11-25'), false);
});

test('draft invoice is not issued and next step remains visible', () => {
  const result = workflowProgress({ date: '2026-11-25', frameworks: [{ status: 'complete', file_id: 'f', valid_from: '2026-01-01' }], documents: [
    { kind: 'sales_contract', status: 'complete', file_id: 's' },
    { kind: 'delivery_record', status: 'complete', file_id: 'd' },
    { kind: 'vat_invoice', status: 'complete', file_id: 'i', invoice_number: '', invoice_date: '2026-11-25' },
  ] });
  assert.equal(result.completed, 3); assert.equal(result.next.key, 'vat_invoice'); assert.equal(result.done, false);
});

test('invoice calculations require an explicit rate and reject incomplete quantities', () => {
  assert.deepEqual(calculateInvoiceTotals([{ qty: 2, price: 125000 }], 8), { subtotal: 250000, vatPercent: 8, vatAmount: 20000, total: 270000 });
  assert.equal(calculateInvoiceTotals([{ qty: 1, price: 100 }], ''), null);
  assert.equal(calculateInvoiceTotals([{ qty: '', price: 100 }], 8), null);
  assert.equal(officialTeaName('hong-tra-shan-mat'), 'Trà đen OP1');
  assert.equal(officialTeaName('unknown', 'Xác nhận tên hóa đơn'), 'Xác nhận tên hóa đơn');
});
