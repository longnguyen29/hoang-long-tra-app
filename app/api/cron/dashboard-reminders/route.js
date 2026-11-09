import { createAdminClient } from '@/lib/supabase/admin';
import { processDashboardReminders } from '@/lib/dashboard-reminders-server';
import { processDueCustomerReminders } from '@/lib/customer-memory-server';

export const maxDuration = 60;

export async function GET(request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return Response.json({ ok: false, error: 'cron_not_configured' }, { status: 503 });
  if (request.headers.get('authorization') !== `Bearer ${secret}`) return Response.json({ ok: false }, { status: 401 });
  try {
    const admin = createAdminClient();
    const result = await processDashboardReminders(admin);
    let customerMemory = { skipped: true };
    try { customerMemory = await processDueCustomerReminders(admin); }
    catch (error) { console.error('Customer memory reminders unavailable', { reason: error.message }); customerMemory = { error: 'customer_memory_unavailable' }; }
    return Response.json({ ok: result.configured && result.failed === 0 && !result.receiptFailed, ...result, customerMemory }, { status: result.configured ? 200 : 503 });
  } catch (error) {
    console.error('Dashboard reminder scan failed', { error: error.message });
    return Response.json({ ok: false, error: 'dashboard_reminder_scan_failed' }, { status: 500 });
  }
}
