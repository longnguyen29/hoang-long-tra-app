import test from 'node:test';
import assert from 'node:assert/strict';
import { smsStatus } from './sms-status.js';

test('provider acceptance and Android processing do not claim sent or delivered', () => {
  assert.equal(smsStatus({ status: 'queued', provider_state: 'Pending' }).key, 'queued');
  assert.equal(smsStatus({ status: 'queued', provider_state: 'Processed' }).key, 'processing');
  assert.equal(smsStatus({ status: 'sending', last_error: 'submission_uncertain' }).key, 'uncertain');
});
test('delivery proof survives a later provider failure', () => {
  const row = smsStatus({ status: 'queued', provider_state: 'Failed', provider_states: { Sent: '2026-10-11T04:00:00Z', Delivered: '2026-10-11T04:01:00Z' } });
  assert.equal(row.key, 'delivered');
  assert.equal(row.deliveredAt, '2026-10-11T04:01:00Z');
  assert.match(row.detail, /báo lỗi sau/);
  assert.equal(smsStatus({ status: 'queued', provider_state: 'Failed' }).key, 'failed');
  const undatedProof = smsStatus({ status: 'queued', provider_state: 'Failed', provider_states: { Sent: null, Delivered: null } });
  assert.equal(undatedProof.key, 'delivered');
  assert.equal(undatedProof.deliveredAt, null);
});
test('receipt read failure does not erase stored sent proof', () => {
  const row = smsStatus({ providerState: 'Sent', providerSentAt: '2026-10-11T04:00:00Z', providerCheckError: 'gateway_offline' });
  assert.equal(row.key, 'sent');
  assert.equal(row.checkError, 'gateway_offline');
});
