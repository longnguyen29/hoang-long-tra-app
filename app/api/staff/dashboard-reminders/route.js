import { authenticateManagerRequest } from '@/lib/staff-api-auth';
import { processDashboardReminders } from '@/lib/dashboard-reminders-server';

export const runtime = 'nodejs';
export const maxDuration = 60;

const respond = (body, status = 200) => Response.json(body, {
  status,
  headers: { 'Cache-Control': 'no-store' },
});

export async function POST(request) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return respond({ ok: false, error: 'dashboard_reminders_not_configured' }, 503);
  }

  let staff;
  try {
    staff = await authenticateManagerRequest(request);
  } catch {
    return respond({ ok: false, error: 'dashboard_reminder_auth_unavailable' }, 503);
  }
  if (!staff) return respond({ ok: false, error: 'manager_auth_required' }, 401);

  try {
    // Use the same date window, atomic claim and sent-event deduplication as cron.
    // No client date or selected item may force a future reminder to send early.
    const result = await processDashboardReminders(staff.admin);
    if (!result.configured) {
      return respond({ ok: false, error: 'telegram_not_configured', ...result }, 503);
    }
    return respond({ ok: result.failed === 0 && result.receiptFailed === 0, ...result });
  } catch {
    return respond({ ok: false, error: 'dashboard_reminder_scan_failed' }, 500);
  }
}
