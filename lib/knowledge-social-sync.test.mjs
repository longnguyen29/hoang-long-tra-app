import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeBufferPost, normalizeBufferPosts, safeSocialUrl, fetchBufferPublishedPosts } from './knowledge-social-sync.js';

const fetchedAt = '2026-10-11T10:00:00.000Z';
const account = { id: 'account1', service: 'threads', name: 'Tea brand', organizationId: 'org1' };
const options = { organizationId: 'org1', channels: [account], fetchedAt, importMethod: 'connector' };
const metric = (type, value, unit = 'count') => ({ type, name: type, value, unit });
const post = overrides => ({ id: 'post1', channelId: 'account1', channelService: 'threads', status: 'sent',
  text: 'Chế biến trà\nMột câu chuyện trà.', sentAt: '2026-10-10T04:00:00.000Z', externalLink: 'https://www.threads.com/@teabrand/post/example',
  metricsUpdatedAt: '2026-10-11T09:00:00.000Z', metrics: [metric('views', 0), metric('reactions', 9), metric('comments', 3), metric('reposts', 2), metric('quotes', 8)],
  assets: [], ...overrides });

test('normalizes published source and verified count definitions without CRM attribution', () => {
  const normalized = normalizeBufferPost(post({ leads: 99, revenue: 888 }), options);
  assert.deepEqual(normalized.metrics, { views: 0, likes: 9, comments: 3, shares: 2 });
  assert.equal(normalized.title, 'Chế biến trà'); assert.equal(normalized.account_name, 'Tea brand');
  assert.equal(normalized.published_at, '2026-10-10T04:00:00.000Z');
  assert.equal(normalized.import_method, 'connector'); assert.equal(normalized.raw_metrics.find(m => m.type === 'quotes').value, 8);
  assert.equal(Object.hasOwn(normalized, 'leads'), false); assert.equal(Object.hasOwn(normalized.metrics, 'revenue'), false);
});
test('unmeasured placeholder zero values stay unknown, measured zero stays zero', () => {
  for (const metricsUpdatedAt of [null, '', '2026-10-12T00:00:00Z']) {
    const result = normalizeBufferPost(post({ metricsUpdatedAt }), options);
    assert.deepEqual(result.metrics, {}); assert.deepEqual(result.raw_metrics, []); assert.equal(result.metrics_updated_at, null);
  }
  assert.equal(normalizeBufferPost(post(), options).metrics.views, 0);
});
test('views are never fabricated from reach/impressions; Facebook reactions are not likes', () => {
  const result = normalizeBufferPost(post({ channelService: 'facebook', metrics: [metric('reactions', 7), metric('reach', 20), metric('impressions', 30), metric('shares', 4)] }),
    { ...options, channels: [{ ...account, service: 'facebook' }] });
  assert.deepEqual(result.metrics, { shares: 4 }); assert.equal(result.raw_metrics.length, 4);
});
test('TikTok uses single-like reaction count, metric unit and unavailable fields remain honest', () => {
  const result = normalizeBufferPost(post({ channelService: 'tiktok', metrics: [metric('reactions', 2), metric('comments', 4, 'percentage'), metric('views', -1), metric('clicks', 1.2), metric('shares', NaN)] }),
    { ...options, channels: [{ ...account, service: 'tiktok' }] });
  assert.deepEqual(result.metrics, { likes: 2 }); assert.equal(result.raw_metrics.length, 3);
});
test('published identity, organization inventory and actual dates are required', () => {
  for (const overrides of [{ status: 'draft' }, { sentAt: null }, { sentAt: '2026-10-12T00:00:00Z' },
    { sentAt: '2026-02-31T00:00:00Z' }, { id: '' }, { channelId: 'other', channel: account }, { channelService: 'other' }]) {
    assert.equal(normalizeBufferPost(post(overrides), options), null);
  }
  assert.equal(normalizeBufferPost(post(), { ...options, channels: [{ ...account, organizationId: 'another' }] }), null);
});
test('identity deduplicates imported posts and bounded import preserves fresh content', () => {
  const rows = normalizeBufferPosts([post(), post({ text: 'Updated' }), ...Array.from({ length: 30 }, (_, i) => post({ id: `post${i + 2}` }))], options);
  assert.equal(rows.length, 20); assert.equal(rows[0].body, 'Updated'); assert.equal(new Set(rows.map(r => r.external_post_id)).size, 20);
});
test('public post/media links exclude credentials, local addresses and unrelated post domains', () => {
  for (const url of ['javascript:alert(1)', 'http://www.threads.com/post/a', 'https://127.0.0.1/a', 'https://[::1]/a',
    'https://localhost/a', 'https://internal.local/a', 'https://user:pw@threads.com/a', 'https://threads.com.evil.test/a', 'https://threads.com:444/a']) {
    assert.equal(safeSocialUrl(url, 'threads'), '');
  }
  const row = normalizeBufferPost(post({ externalLink: 'https://evil.test/a', assets: [
    { type: 'image', source: 'https://cdn.example.com/photo.jpg', thumbnail: 'https://127.0.0.1/photo.jpg' },
    { type: 'video', source: 'javascript:alert(1)' }, { type: 'document', source: 'https://cdn.example.com/doc.pdf' },
  ] }), options);
  assert.equal(row.url, ''); assert.deepEqual(row.media, [{ type: 'image', url: 'https://cdn.example.com/photo.jpg' }]);
});

function apiFixture() {
  const requests = [];
  const fetchImpl = async (url, init) => {
    requests.push({ url, init });
    const request = JSON.parse(init.body);
    const data = request.query.includes('KnowledgeChannels') ? { channels: [account] }
      : { posts: { edges: [{ node: post() }], pageInfo: { hasNextPage: true } } };
    return Response.json({ data });
  };
  return { requests, fetchImpl };
}
test('provider fetch uses two fixed read queries, published channel filter and no redirect or mutation', async () => {
  const f = apiFixture();
  const result = await fetchBufferPublishedPosts({ apiKey: 'PRIVATE_KEY', organizationId: 'org1', fetchedAt, fetchImpl: f.fetchImpl });
  assert.equal(result.posts.length, 1); assert.equal(result.hasMore, true); assert.equal(result.limit, 20);
  assert.equal(result.posts[0].import_method, 'api'); assert.equal(f.requests.length, 2);
  for (const { url, init } of f.requests) {
    assert.equal(url, 'https://api.buffer.com'); assert.equal(init.redirect, 'error'); assert.equal(init.cache, 'no-store');
    assert.equal(init.headers.Authorization, 'Bearer PRIVATE_KEY'); assert.doesNotMatch(JSON.parse(init.body).query, /\bmutation\b/);
  }
  const published = JSON.parse(f.requests[1].init.body);
  assert.deepEqual(published.variables.channelIds, ['account1']); assert.match(published.query, /status: \[sent\]/);
});
test('provider errors are sanitized, including auth, API details and oversized data', async () => {
  for (const [response, expected] of [
    [new Response('private token info', { status: 401 }), 'social_provider_authorization_failed'],
    [new Response('quota', { status: 429 }), 'social_provider_rate_limited'],
    [Response.json({ errors: [{ message: 'secret from provider' }] }), 'social_provider_invalid_response'],
    [new Response('x'.repeat(100), { headers: { 'content-length': '100' } }), 'social_response_too_large'],
  ]) {
    await assert.rejects(fetchBufferPublishedPosts({ apiKey: 'PRIVATE_KEY', organizationId: 'org1', fetchedAt, maxBytes: 50, fetchImpl: async () => response }),
      error => error.code === expected && !error.message.includes('PRIVATE_KEY') && !error.message.includes('secret'));
  }
});
test('slow provider times out across the entire sync without unbounded retries', async () => {
  let requests = 0;
  await assert.rejects(fetchBufferPublishedPosts({ apiKey: 'PRIVATE_KEY', organizationId: 'org1', timeoutMs: 10,
    fetchImpl: (_url, { signal }) => new Promise((_resolve, reject) => { requests++; signal.addEventListener('abort', () => reject(new Error('aborted'))); }) }),
  error => error.code === 'social_provider_timeout');
  assert.equal(requests, 1);
});
