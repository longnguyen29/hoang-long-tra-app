// Buffer is a read source here. Publishing, account tokens and CRM attribution are never imported.
// Fields verified against Buffer's GraphQL schema and /guides/getting-started.html.
export const SOCIAL_SYNC_LIMIT = 20;
export const SOCIAL_SYNC_COOLDOWN_MS = 60_000;
const SUPPORTED_CHANNELS = new Set(['threads', 'facebook', 'instagram', 'tiktok']);
const POST_HOSTS = {
  threads: ['threads.com', 'threads.net'], facebook: ['facebook.com', 'fb.watch'],
  instagram: ['instagram.com'], tiktok: ['tiktok.com'],
};
const BUFFER_CHANNELS_QUERY = `query KnowledgeChannels($organizationId: OrganizationId!) {
  channels(input: {organizationId: $organizationId}) {
    id name displayName service organizationId isLocked isDisconnected
  }
}`;
export const BUFFER_POSTS_QUERY = `query KnowledgePublishedPosts($organizationId: OrganizationId!, $channelIds: [ChannelId!]!) {
  posts(first: 20, input: {organizationId: $organizationId, filter: {channelIds: $channelIds, status: [sent]}, sort: [{field: dueAt, direction: desc}]}) {
    edges { node {
      id status text sentAt channelId channelService externalLink metricsUpdatedAt
      metrics { type name value unit }
      assets { type source thumbnail }
    } }
    pageInfo { hasNextPage }
  }
}`;

export class SocialSyncError extends Error {
  constructor(code) { super(code); this.name = 'SocialSyncError'; this.code = code; }
}
const clean = (value, max) => typeof value === 'string' ? value.replace(/\u0000/g, '').trim().slice(0, max) : '';
const identifier = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,120}$/.test(value) ? value : '';
function isoDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return null;
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  if (year < 1970 || month < 1 || month > 12 || day < 1 || day > new Date(Date.UTC(year, month, 0)).getUTCDate()) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

// Evidence links are displayed, never fetched by the app. Still exclude local/private endpoints.
export function safeSocialUrl(value, channel = null) {
  if (typeof value !== 'string' || value.length > 3000) return '';
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    if (url.protocol !== 'https:' || url.username || url.password || url.port && url.port !== '443'
      || !host.includes('.') || host === 'localhost' || host.endsWith('.localhost')
      || host.endsWith('.local') || host.endsWith('.internal') || /^[\d.]+$/.test(host) || host.includes(':')) return '';
    if (channel && !POST_HOSTS[channel]?.some(domain => host === domain || host.endsWith(`.${domain}`))) return '';
    return url.href;
  } catch { return ''; }
}

function normalizeMetrics(post, fetchedAt) {
  const updated = isoDate(post.metricsUpdatedAt);
  // Some Buffer posts expose zero-filled metrics before any measurement. They remain unknown.
  if (!updated || updated > fetchedAt || !Array.isArray(post.metrics)) {
    return { metrics: {}, raw_metrics: [], metrics_updated_at: null };
  }
  const raw = post.metrics.filter(metric => metric && typeof metric === 'object'
    && typeof metric.type === 'string' && metric.type.length > 0 && metric.type.length <= 80
    && typeof metric.value === 'number' && Number.isFinite(metric.value) && metric.value >= 0
    && metric.value <= Number.MAX_SAFE_INTEGER && typeof metric.unit === 'string' && metric.unit.length <= 30)
    .slice(0, 40).map(metric => ({ type: metric.type, name: clean(metric.name, 120), value: metric.value, unit: metric.unit }));
  const value = (...types) => {
    for (const type of types) {
      const matches = raw.filter(metric => metric.type === type && metric.unit === 'count' && Number.isSafeInteger(metric.value));
      // Duplicate definitions must not become an arbitrary total.
      if (matches.length === 1) return matches[0].value;
    }
    return undefined;
  };
  const channel = post.channelService || post.channel?.service;
  const mapped = {
    views: value('views'),
    likes: channel === 'facebook' ? value('likes') : value('likes', 'reactions'),
    comments: channel === 'threads' ? value('comments', 'replies') : value('comments'),
    shares: channel === 'threads' ? value('reposts') : value('shares'),
    clicks: value('clicks'),
  };
  return { metrics: Object.fromEntries(Object.entries(mapped).filter(([, number]) => number !== undefined)),
    raw_metrics: raw, metrics_updated_at: updated };
}

/** Accepts Buffer's Post shape, including the connector's get_post output. */
export function normalizeBufferPost(post, { organizationId, channels = [], fetchedAt = new Date().toISOString(), importMethod = 'api' } = {}) {
  const fetched = isoDate(fetchedAt);
  const published = isoDate(post?.sentAt);
  const organization = identifier(organizationId);
  const postId = identifier(post?.id);
  const accountId = identifier(post?.channelId || post?.channel?.id);
  const channel = post?.channelService || post?.channel?.service;
  if (!organization || !postId || !accountId || !SUPPORTED_CHANNELS.has(channel)
    || post?.status !== 'sent' || !published || !fetched || published > fetched
    || !['api', 'connector'].includes(importMethod)) return null;
  const candidates = Array.isArray(channels) ? channels : Object.values(channels || {});
  const inventoriedAccount = candidates.find(candidate => candidate?.id === accountId);
  const account = inventoriedAccount || post.channel;
  if (account && (account.service && account.service !== channel
    || account.organizationId && account.organizationId !== organization)) return null;
  // Callers supplying a channel inventory must not import an unrecognized account.
  if (candidates.length && !inventoriedAccount) return null;
  const body = clean(post.text, 30000);
  const media = (Array.isArray(post.assets) ? post.assets : []).filter(asset => ['image', 'video'].includes(asset?.type))
    .map(asset => ({ type: asset.type, url: safeSocialUrl(asset.source), ...(safeSocialUrl(asset.thumbnail) ? { thumbnail: safeSocialUrl(asset.thumbnail) } : {}) }))
    .filter(asset => asset.url).slice(0, 10);
  return {
    provider: 'buffer', organization_id: organization, account_id: accountId,
    account_name: clean(account?.displayName || account?.name, 180) || accountId,
    channel, external_post_id: postId, title: body.split(/\r?\n/).find(line => line.trim())?.slice(0, 180) || 'Bài đăng không có nội dung chữ',
    body, url: safeSocialUrl(post.externalLink, channel), published_at: published, media,
    ...normalizeMetrics({ ...post, channelService: channel }, fetched), fetched_at: fetched, import_method: importMethod,
  };
}

export function normalizeBufferPosts(posts, options) {
  const rows = new Map();
  for (const post of Array.isArray(posts) ? posts : []) {
    const row = normalizeBufferPost(post, options);
    if (row) rows.set(`${row.organization_id}:${row.account_id}:${row.external_post_id}`, row);
    if (rows.size === SOCIAL_SYNC_LIMIT) break;
  }
  return [...rows.values()];
}

async function boundedJson(response, maxBytes) {
  const length = Number(response.headers.get('content-length'));
  if (length > maxBytes) throw new SocialSyncError('social_response_too_large');
  if (!response.body) throw new SocialSyncError('social_provider_invalid_response');
  const reader = response.body.getReader();
  const chunks = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) throw new SocialSyncError('social_response_too_large');
      chunks.push(value);
    }
  } finally { await reader.cancel().catch(() => {}); }
  const buffer = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { buffer.set(chunk, offset); offset += chunk.byteLength; }
  try { return JSON.parse(new TextDecoder().decode(buffer)); }
  catch { throw new SocialSyncError('social_provider_invalid_response'); }
}

export async function fetchBufferPublishedPosts({ apiKey, organizationId, fetchImpl = fetch, fetchedAt = new Date().toISOString(), timeoutMs = 15000, maxBytes = 1_000_000 } = {}) {
  if (typeof apiKey !== 'string' || !apiKey.trim() || /[\r\n]/.test(apiKey) || !identifier(organizationId)) {
    throw new SocialSyncError('social_sync_not_configured');
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const query = async (queryText, variables) => {
    const response = await fetchImpl('https://api.buffer.com', {
      method: 'POST', redirect: 'error', cache: 'no-store', signal: controller.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey.trim()}` },
      body: JSON.stringify({ query: queryText, variables }),
    });
    if (response.status === 401 || response.status === 403) throw new SocialSyncError('social_provider_authorization_failed');
    if (response.status === 429) throw new SocialSyncError('social_provider_rate_limited');
    if (!response.ok) throw new SocialSyncError('social_provider_unavailable');
    const payload = await boundedJson(response, maxBytes);
    if (payload.errors?.length || !payload.data || typeof payload.data !== 'object') throw new SocialSyncError('social_provider_invalid_response');
    return payload.data;
  };
  try {
    const inventory = await query(BUFFER_CHANNELS_QUERY, { organizationId });
    if (!Array.isArray(inventory.channels)) throw new SocialSyncError('social_provider_invalid_response');
    const channels = inventory.channels.filter(channel => identifier(channel?.id) && channel.organizationId === organizationId && SUPPORTED_CHANNELS.has(channel.service));
    if (!channels.length) return { posts: [], hasMore: false, limit: SOCIAL_SYNC_LIMIT, channels: [] };
    const data = await query(BUFFER_POSTS_QUERY, { organizationId, channelIds: channels.map(channel => channel.id) });
    if (!Array.isArray(data.posts?.edges)) throw new SocialSyncError('social_provider_invalid_response');
    return { posts: normalizeBufferPosts(data.posts.edges.map(edge => edge?.node), { organizationId, channels, fetchedAt, importMethod: 'api' }),
      hasMore: data.posts.pageInfo?.hasNextPage === true, limit: SOCIAL_SYNC_LIMIT,
      channels: channels.map(channel => ({ channel: channel.service, name: clean(channel.displayName || channel.name, 180) || channel.id,
        locked: channel.isLocked === true, disconnected: channel.isDisconnected === true })) };
  } catch (error) {
    if (controller.signal.aborted) throw new SocialSyncError('social_provider_timeout');
    if (error instanceof SocialSyncError) throw error;
    throw new SocialSyncError('social_provider_unavailable');
  } finally { clearTimeout(timer); }
}
