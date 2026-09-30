import test from 'node:test';
import assert from 'node:assert/strict';
import { orderSmsHistory } from './order-sms-history.js';

test('combines shipping and payment SMS logs newest first without changing their status', () => {
  const history = orderSmsHistory(
    [{ id: 'ship-1', status: 'queued', shipping_carrier: 'ghn', tracking_code: 'ABC', attempts: 1, created_at: '2026-09-29T10:00:00Z' }],
    [{ id: 'pay-1', status: 'failed', amount_due: 1000000, last_error: 'offline', attempts: 2, created_at: '2026-09-30T10:00:00Z' }],
  );
  assert.deepEqual(history.map(({ id, kind, status }) => ({ id, kind, status })), [
    { id: 'payment:pay-1', kind: 'payment', status: 'failed' },
    { id: 'shipping:ship-1', kind: 'shipping', status: 'queued' },
  ]);
  assert.equal(history[0].lastError, 'offline');
  assert.equal(history[1].trackingCode, 'ABC');
});
