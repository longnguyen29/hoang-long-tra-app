import { timingSafeEqual } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { retryShippingSms } from '@/lib/shipping-sms-server';

export const maxDuration = 60;

export async function GET(request) {
  const secret = process.env.SMS_RETRY_CRON_SECRET?.trim();
  if (!secret) return Response.json({ ok: false, error: 'cron_not_configured' }, { status: 503 });
  const expected = Buffer.from(`Bearer ${secret}`);
  const supplied = Buffer.from(request.headers.get('authorization') || '');
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) {
    return Response.json({ ok: false }, { status: 401 });
  }
  try {
    // Four sequential gateway timeouts fit within the function's 60-second budget.
    const result = await retryShippingSms(createAdminClient(), { limit: 4 });
    return Response.json({ ok: true, ...result });
  } catch (error) {
    console.error('Shipping SMS retry failed', { error: error.message });
    return Response.json({ ok: false, error: 'shipping_sms_retry_failed' }, { status: 500 });
  }
}
