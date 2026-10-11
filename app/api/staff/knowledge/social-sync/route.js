import { authenticateManagerRequest } from '@/lib/staff-api-auth';
import { fetchBufferPublishedPosts, SOCIAL_SYNC_COOLDOWN_MS, SocialSyncError } from '@/lib/knowledge-social-sync';

export const maxDuration = 30;
const configured = () => Boolean(process.env.BUFFER_API_KEY?.trim() && process.env.BUFFER_ORGANIZATION_ID?.trim());
const json = (body, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

export async function GET(request) {
  if (!await authenticateManagerRequest(request)) return json({ ok: false }, 401);
  return json({ configured: configured() });
}

export async function POST(request) {
  const staff = await authenticateManagerRequest(request);
  if (!staff) return json({ ok: false }, 401);
  let body;
  try { body = await request.json(); } catch { return json({ ok: false, error: 'invalid_body' }, 400); }
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key => key !== 'action')
    || body.action !== undefined && body.action !== 'sync') return json({ ok: false, error: 'invalid_social_sync_action' }, 400);
  if (!configured()) return json({ ok: false, error: 'social_sync_not_configured' }, 503);
  const organizationId = process.env.BUFFER_ORGANIZATION_ID.trim();
  const { data: latest, error: readError } = await staff.admin.from('knowledge_social_posts').select('fetched_at')
    .eq('provider', 'buffer').eq('organization_id', organizationId).order('fetched_at', { ascending: false }).limit(1).maybeSingle();
  if (readError) return json({ ok: false, error: 'social_sync_read_failed' }, 500);
  const lastFetched = new Date(latest?.fetched_at).getTime();
  if (Number.isFinite(lastFetched) && Date.now() - lastFetched < SOCIAL_SYNC_COOLDOWN_MS) {
    return json({ ok: false, error: 'social_sync_cooldown', retryAfterSeconds: Math.max(1, Math.ceil((SOCIAL_SYNC_COOLDOWN_MS - (Date.now() - lastFetched)) / 1000)) }, 429);
  }
  try {
    const source = await fetchBufferPublishedPosts({ apiKey: process.env.BUFFER_API_KEY, organizationId });
    const { data, error } = source.posts.length
      ? await staff.admin.rpc('ingest_knowledge_social_posts', { p_posts: source.posts })
      : { data: { imported: 0, updated: 0, unchanged: 0 }, error: null };
    if (error) return json({ ok: false, error: 'social_sync_save_failed' }, 500);
    return json({ ok: true, imported: data?.imported || 0, updated: data?.updated || 0, unchanged: data?.unchanged || 0,
      hasMore: source.hasMore, limit: source.limit, channels: source.channels });
  } catch (error) {
    const code = error instanceof SocialSyncError ? error.code : 'social_sync_failed';
    return json({ ok: false, error: code }, code === 'social_provider_timeout' ? 504
      : ['social_sync_not_configured', 'social_provider_authorization_failed'].includes(code) ? 503
        : code === 'social_provider_rate_limited' ? 429 : 502);
  }
}
