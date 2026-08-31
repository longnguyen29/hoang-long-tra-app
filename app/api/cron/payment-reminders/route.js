import { createAdminClient } from "@/lib/supabase/admin";
import { processSmsPaymentReminders } from "@/lib/sms-payment-reminders-server";

export const maxDuration = 60;

export async function GET(request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return Response.json({ ok: false, error: "cron_not_configured" }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) return Response.json({ ok: false }, { status: 401 });
  try {
    const result = await processSmsPaymentReminders(createAdminClient());
    return Response.json({ ok: true, ...result });
  } catch (error) {
    console.error("Scheduled SMS payment reminders failed", { error: error.message });
    return Response.json({ ok: false, error: "sms_reminder_scan_failed" }, { status: 500 });
  }
}
