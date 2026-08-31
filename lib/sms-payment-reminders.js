import { buildManualOrderMessage, normalizeSmsPhone } from "./manual-order-message.js";

export const SMS_PAYMENT_REMINDER_DAYS = 3;

export function receivableBalance(receivable) {
  return Math.max(0, Number(receivable?.total || 0) - Number(receivable?.paid || 0));
}

export function smsReminderEligibility({ order, receivable, now = new Date(), reminderDays = SMS_PAYMENT_REMINDER_DAYS }) {
  const completedAt = new Date(order?.delivered_at || order?.deliveredAt || "");
  const current = new Date(now);
  const amountDue = receivableBalance(receivable);
  if (!order || !receivable) return { eligible: false, reason: "missing_record", amountDue };
  if (order.status !== "completed" && order.stage !== "completed") return { eligible: false, reason: "order_not_completed", amountDue };
  if (Number.isNaN(completedAt.getTime())) return { eligible: false, reason: "completion_time_missing", amountDue };
  if (!Number.isFinite(current.getTime()) || current.getTime() - completedAt.getTime() < reminderDays * 86_400_000) {
    return { eligible: false, reason: "waiting_period", amountDue };
  }
  if (!['open', 'partial'].includes(receivable.status) || amountDue <= 0) {
    return { eligible: false, reason: "paid_or_closed", amountDue: 0 };
  }
  const phone = normalizeSmsPhone(order.contact);
  if (!phone) return { eligible: false, reason: "invalid_phone", amountDue };
  if (!order.public_tracking_token && !order.publicTrackingToken) return { eligible: false, reason: "tracking_link_missing", amountDue };
  return { eligible: true, reason: "ready", amountDue, phone };
}

export function smsPaymentReminderId(receivableId) {
  return `sms-payment-${String(receivableId || "").replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 80)}`;
}

export function buildSmsPaymentReminder({ order, amountDue, now = new Date() }) {
  return buildManualOrderMessage({ order, kind: "delivered_due", amountDue, now });
}
