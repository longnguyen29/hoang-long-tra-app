import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const backend = 'data:text/javascript,' + encodeURIComponent('export function createAdminClient(){throw new Error("must not access database without auth")}');
registerHooks({ resolve(specifier, context, next) {
  if (specifier === '@/lib/supabase/admin') return { url: backend, shortCircuit: true };
  if (specifier.startsWith('@/')) return next(pathToFileURL(path.resolve(specifier.slice(2) + '.js')).href, context);
  return next(specifier, context);
} });
const { maybeSendShippingSms, retryShippingSms } = await import('../lib/shipping-sms-server.js');
const { GET } = await import('../app/api/cron/shipping-sms/route.js');
const now = new Date('2026-10-01T09:00:00Z');
const order = { id: 'test-order', stage: 'shipping', status: 'shipped', contact: '0903333841', shipping_carrier: 'vietnam_post', tracking_code: 'TEST123', public_tracking_token: 'test-link' };
function fixture(overrides = {}) {
  const record = { id: 'retry', ...order, order_id: order.id, status: 'failed', attempts: 3, claimed_at: '2026-10-01T06:00:00Z', updated_at: '2026-10-01T06:00:00Z', ...overrides };
  const calls = []; let current = { ...record };
  const admin = { from(table) {
    let patch; let matches = true;
    const chain = {
      select() { return chain; }, order() { return chain; }, limit() { return chain; },
      insert() { return Promise.resolve({ error: { code: '23505' } }); },
      update(value) { patch = value; return chain; },
      eq(key, value) { if (table === 'sms_tracking_updates' && current[key] !== value) matches = false; return chain; },
      in(key, values) { if (!values.includes(current[key])) matches = false; return chain; },
      lte(key, value) { if (current[key] > value) matches = false; return chain; },
      lt(key, value) { if (current[key] >= value) matches = false; return chain; },
      async single() { return { data: { ...current }, error: null }; },
      async maybeSingle() { if (patch && matches) current = { ...current, ...patch }; return { data: matches ? table === 'orders' ? order : { ...current } : null, error: null }; },
      then(resolve) { if (patch && matches) current = { ...current, ...patch }; return Promise.resolve({ data: matches ? [{ ...current }] : [], error: null }).then(resolve); },
    };
    return chain;
  } };
  return { admin, calls, record: () => current, options: { now, config: { ready: true }, sendMessage: async msg => { calls.push(msg); return { id: msg.id, state: 'Pending' }; } } };
}
test('retry at three hours continues beyond the old three-attempt cap', async () => {
  const f = fixture(); const result = await maybeSendShippingSms(f.admin, order, f.options);
  assert.equal(result.status, 'queued'); assert.equal(f.calls.length, 1); assert.equal(f.record().attempts, 4);
});
test('save within three hours does not submit again', async () => {
  const f = fixture({ claimed_at: '2026-10-01T06:00:01Z' });
  const result = await maybeSendShippingSms(f.admin, order, f.options);
  assert.equal(result.status, 'retry_later'); assert.equal(f.calls.length, 0);
});
test('gateway-accepted messages are never resubmitted', async () => {
  const f = fixture({ status: 'queued' });
  assert.equal((await maybeSendShippingSms(f.admin, order, f.options)).status, 'queued'); assert.equal(f.calls.length, 0);
});
test('concurrent retry calls only submit once', async () => {
  const f = fixture(); await Promise.all([maybeSendShippingSms(f.admin, order, f.options), maybeSendShippingSms(f.admin, order, f.options)]);
  assert.equal(f.calls.length, 1);
});
test('scheduler does not scan a recently attempted message', async () => {
  const f = fixture({ updated_at: '2026-10-01T08:00:00Z' });
  assert.equal((await retryShippingSms(f.admin, f.options)).scanned, 0); assert.equal(f.calls.length, 0);
});
test('gateway rejection remains failed and has a new attempt timestamp', async () => {
  const f = fixture(); f.options.sendMessage = async () => { throw new Error('offline'); };
  assert.equal((await maybeSendShippingSms(f.admin, order, f.options)).status, 'failed');
  assert.equal(f.record().attempts, 4); assert.equal(f.record().claimed_at, now.toISOString());
});
test('cron rejects missing or wrong secret before accessing the database', async () => {
  const previous = process.env.SMS_RETRY_CRON_SECRET;
  try {
    delete process.env.SMS_RETRY_CRON_SECRET;
    assert.equal((await GET(new Request('https://example.test'))).status, 503);
    process.env.SMS_RETRY_CRON_SECRET = 'test-only';
    assert.equal((await GET(new Request('https://example.test', { headers: { authorization: 'Bearer wrong' } }))).status, 401);
  } finally { if (previous === undefined) delete process.env.SMS_RETRY_CRON_SECRET; else process.env.SMS_RETRY_CRON_SECRET = previous; }
});
