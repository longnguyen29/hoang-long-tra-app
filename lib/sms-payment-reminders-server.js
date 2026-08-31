import { logOrderEvent } from "@/lib/ops-events";
import { readSmsGatewayConfig, sendSmsGatewayMessage } from "@/lib/sms-gateway";
import {
  SMS_PAYMENT_REMINDER_DAYS,
  buildSmsPaymentReminder,
  smsPaymentReminderId,
  smsReminderEligibility,
} from "@/lib/sms-payment-reminders";

async function mark(admin, id, patch) {
  return admin.from("sms_payment_reminders").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id);
}

async function freshRecords(admin, orderId, receivableId) {
  const [orderResult, receivableResult] = await Promise.all([
    admin.from("orders").select("id,status,stage,customer_name,contact,delivered_at,public_tracking_token").eq("id", orderId).maybeSingle(),
    admin.from("receivables").select("id,order_id,total,paid,status,updated_at").eq("id", receivableId).maybeSingle(),
  ]);
  if (orderResult.error) throw orderResult.error;
  if (receivableResult.error) throw receivableResult.error;
  return { order: orderResult.data, receivable: receivableResult.data };
}

async function createReminder(admin, order, receivable, eligibility) {
  const id = smsPaymentReminderId(receivable.id);
  const { data, error } = await admin.from("sms_payment_reminders").insert({
    id,
    order_id: order.id,
    receivable_id: receivable.id,
    amount_due: eligibility.amountDue,
    status: "pending",
  }).select().single();
  if (!error) return data;
  if (error.code !== "23505") throw error;
  const existing = await admin.from("sms_payment_reminders").select("*").eq("receivable_id", receivable.id).maybeSingle();
  if (existing.error) throw existing.error;
  return existing.data;
}

async function processOne(admin, reminder, { now, sendMessage }) {
  if (!reminder || ["queued", "sent", "skipped"].includes(reminder.status)) {
    return { id: reminder?.id || "", status: reminder?.status || "duplicate" };
  }

  const { order, receivable } = await freshRecords(admin, reminder.order_id, reminder.receivable_id);
  const eligibility = smsReminderEligibility({ order, receivable, now });
  if (!eligibility.eligible) {
    await mark(admin, reminder.id, { status: "skipped", skip_reason: eligibility.reason, last_error: "" });
    return { id: reminder.id, status: "skipped", reason: eligibility.reason };
  }

  const attempts = Number(reminder.attempts || 0) + 1;
  const { data: claimed, error: claimError } = await admin.from("sms_payment_reminders").update({
    status: "sending",
    attempts,
    amount_due: eligibility.amountDue,
    last_error: "",
    skip_reason: "",
    updated_at: new Date().toISOString(),
  }).eq("id", reminder.id).eq("attempts", Number(reminder.attempts || 0)).in("status", ["pending", "failed", "sending"]).select("id").maybeSingle();
  if (claimError) throw claimError;
  if (!claimed) return { id: reminder.id, status: "already_processing" };
  try {
    const text = buildSmsPaymentReminder({ order, amountDue: eligibility.amountDue, now });
    const result = await sendMessage({ id: reminder.id, phone: eligibility.phone, text });
    const queuedAt = new Date().toISOString();
    await mark(admin, reminder.id, {
      status: "queued",
      provider_message_id: String(result?.id || reminder.id),
      provider_state: String(result?.state || "Pending"),
      queued_at: queuedAt,
    });
    await logOrderEvent(admin, {
      orderId: order.id,
      kind: "customer_notification",
      message: `SMS đã được đưa tới điện thoại để nhắc khoản còn phải thu ${new Intl.NumberFormat("vi-VN").format(eligibility.amountDue)} ₫.`,
      actor: "SMS tự động",
      externalRef: `sms:${reminder.id}`,
    });
    return { id: reminder.id, status: "queued" };
  } catch (error) {
    const lastError = String(error?.message || error).slice(0, 500);
    await mark(admin, reminder.id, { status: "failed", last_error: lastError });
    return { id: reminder.id, status: "failed", error: lastError };
  }
}

export async function processSmsPaymentReminders(admin, {
  now = new Date(),
  limit = 25,
  sendMessage = sendSmsGatewayMessage,
  config = readSmsGatewayConfig(),
} = {}) {
  if (!config.ready && sendMessage === sendSmsGatewayMessage) {
    return { status: "not_configured", missing: config.missing, scanned: 0, results: [] };
  }

  const cutoff = new Date(new Date(now).getTime() - SMS_PAYMENT_REMINDER_DAYS * 86_400_000).toISOString();
  const { data: orders, error: orderError } = await admin
    .from("orders")
    .select("id,status,stage,customer_name,contact,delivered_at,public_tracking_token")
    .eq("status", "completed")
    .not("delivered_at", "is", null)
    .lte("delivered_at", cutoff)
    .order("delivered_at", { ascending: true })
    .limit(Math.max(1, Math.min(100, Number(limit) || 25)));
  if (orderError) throw orderError;
  if (!orders?.length) return { status: "completed", scanned: 0, results: [] };

  const { data: receivables, error: receivableError } = await admin
    .from("receivables")
    .select("id,order_id,total,paid,status,updated_at")
    .in("order_id", orders.map((order) => order.id))
    .in("status", ["open", "partial"]);
  if (receivableError) throw receivableError;
  const receivableByOrder = new Map((receivables || []).map((item) => [item.order_id, item]));

  const results = [];
  for (const order of orders) {
    const receivable = receivableByOrder.get(order.id);
    const eligibility = smsReminderEligibility({ order, receivable, now });
    if (!eligibility.eligible) continue;
    const reminder = await createReminder(admin, order, receivable, eligibility);
    if (Number(reminder?.attempts || 0) >= 3 && reminder?.status === "failed") {
      results.push({ id: reminder.id, status: "failed_limit" });
      continue;
    }
    results.push(await processOne(admin, reminder, { now, sendMessage: (message) => sendMessage({ ...message, config }) }));
  }
  return { status: "completed", scanned: orders.length, results };
}
