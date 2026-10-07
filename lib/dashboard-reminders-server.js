import { houseDateKey, reminderDue } from './dashboard-calendar.js';

function dateAfter(today, days) {
  return new Date(Date.parse(`${today}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
}

export function reminderText(plan, today) {
  const date = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    .format(new Date(`${plan.event_on}T12:00:00Z`));
  return `${plan.kind === 'obligation' ? '🏛 Nhắc nghĩa vụ Hoàng Long' : '📅 Nhắc lịch Hoàng Long'}\n${plan.title}\n${plan.kind === 'obligation' ? 'Hạn' : 'Ngày'}: ${date}${plan.event_on === today ? ' (hôm nay)' : ''}${plan.reminder_unit === 'month' ? '\nNhắc trước 1 tháng theo lịch' : ''}\nMở: https://www.hoanglongtra.com/admin${plan.kind === 'obligation' ? '#government-obligations' : ''}`;
}

async function sendTelegram(text, { token, chatId }) {
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
  });
  if (!response.ok) throw new Error(`telegram_http_${response.status}`);
}

export async function processDashboardReminders(admin, { now = new Date(), sendMessage = sendTelegram } = {}) {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim().replace(/^["']|["']$/g, '');
  if (!token || !chatId) return { configured: false, scanned: 0, sent: 0, failed: 0, receiptFailed: 0 };

  const today = houseDateKey(now);
  const { error: occurrenceError } = await admin.rpc('ensure_government_obligation_calendar', { p_year: Number(today.slice(0,4)) });
  if (occurrenceError) throw occurrenceError;
  const { data: plans, error } = await admin.from('dashboard_plans').select('*')
    .eq('status', 'pending').eq('notify_telegram', true)
    .gte('event_on', today).lte('event_on', dateAfter(today, 31));
  if (error) throw error;

  let sent = 0;
  let failed = 0;
  let receiptFailed = 0;
  for (const plan of (plans || []).filter((item) => reminderDue(item, today))) {
    const { data: claimed, error: claimError } = await admin.rpc('claim_dashboard_reminder', { p_id: plan.id, p_today: today });
    if (claimError) throw claimError;
    if (!claimed?.length) continue;
    const currentPlan = claimed[0];
    try {
      await sendMessage(reminderText(currentPlan, today), { token, chatId });
    } catch (sendError) {
      failed++;
      await admin.from('dashboard_plans').update({
        notification_claimed_at: null,
        notification_last_error: String(sendError.message || 'send_failed').slice(0, 100),
      }).eq('id', currentPlan.id);
      continue;
    }
    sent++;
    // A successful Telegram send must not become an immediate resend just
    // because saving its receipt failed. Keep the claim lease and report that
    // uncertainty separately; a later retry may still need a human check.
    try {
      const { error: savedError } = await admin.from('dashboard_plans').update({
        notified_event_on: currentPlan.event_on, notification_claimed_at: null, notification_last_error: '',
      }).eq('id', currentPlan.id);
      if (savedError) throw savedError;
    } catch {
      receiptFailed++;
      console.error('Dashboard reminder sent but receipt not confirmed', { planId: currentPlan.id });
    }
  }
  return { configured: true, scanned: plans?.length || 0, sent, failed, receiptFailed };
}
