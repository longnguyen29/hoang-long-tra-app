import crypto from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { processSampleFollowups } from '@/lib/sample-followup-server';

export const maxDuration = 60;

export async function GET(request) {
  const secret = process.env.SMS_RETRY_CRON_SECRET?.trim();
  if (!secret) return Response.json({ ok: false, error: 'cron_not_configured' }, { status: 503 });
  const actual = Buffer.from(request.headers.get('authorization') || '');
  const expected = Buffer.from(`Bearer ${secret}`);
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) {
    return Response.json({ ok: false }, { status: 401 });
  }
  try {
    const result = await processSampleFollowups(createAdminClient());
    return Response.json({ ok: result.failed === 0 && result.uncertain === 0 && result.telegramFailed === 0, ...result }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    console.error('Sample follow-up scan failed');
    return Response.json({ ok: false, error: 'sample_followup_scan_failed' }, { status: 500 });
  }
}
