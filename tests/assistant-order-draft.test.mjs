import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAssistantOrderDraft } from '../lib/assistant-order-draft.js';

test('only safe editable text is transferred to the existing order form', () => {
  assert.deepEqual(normalizeAssistantOrderDraft({
    customerName: ' Mai ', contact: '0900', address: null, note: ' Giao sau ',
    type: 'wholesale', paymentMethod: 'cash', lines: [{ productId: 'abc', price: 1 }],
  }), { customerName: 'Mai', contact: '0900', address: '', note: 'Giao sau' });
});

test('invalid transfer payload cannot create an order', () => {
  assert.equal(normalizeAssistantOrderDraft(null), null);
  assert.equal(normalizeAssistantOrderDraft([]), null);
  assert.equal(normalizeAssistantOrderDraft({ contact: { phone: '0900' } }).contact, '');
});
