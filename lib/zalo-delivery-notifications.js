import {
  buildDeliveryTemplateData,
  makeZaloTrackingId,
  normalizeVietnamPhone,
} from "@/lib/zalo-notifications-core";
import { logOrderEvent } from "@/lib/ops-events";
import { sendZaloTemplate } from "@/lib/zalo-zbs";

function templateIdFor(kind) {
  return kind === "delivered_due"
    ? process.env.ZALO_ZBS_DELIVERED_DUE_TEMPLATE_ID || ""
    : process.env.ZALO_ZBS_DELIVERED_PAID_TEMPLATE_ID || "";
}
async function remainingReceivable(admin, orderId) {
  const { data, error } = await admin
    .from("receivables")
    .select("total,paid,status,due_at")
    .eq("order_id", orderId)
    .maybeSingle();
  if (error) throw error;
  if (!data || !["open", "partial"].includes(data.status)) return 0;
  return Math.max(0, Number(data.total || 0) - Number(data.paid || 0));
}

async function createOrReadNotification(admin, row) {
  const { data, error } = await admin.from("customer_notifications").insert(row).select().single();
  if (!error) return data;
  if (error.code !== "23505") throw error;
  const existing = await admin
    .from("customer_notifications")
    .select("*")
    .eq("channel", row.channel)
    .eq("event_key", row.event_key)
    .maybeSingle();
  if (existing.error) throw existing.error;
  return existing.data;
}

async function sendStoredNotification(admin, notification) {
  if (!notification?.template_id) return { ok: true, status: "pending_configuration" };

  await admin.from("customer_notifications").update({
    status: "sending",
    attempts: Number(notification.attempts || 0) + 1,
    updated_at: new Date().toISOString(),
  }).eq("id", notification.id);

  try {
    const result = await sendZaloTemplate(admin, notification);
    const sentAt = new Date().toISOString();
    await admin.from("customer_notifications").update({
      status: "sent",
      provider_message_id: String(result.msg_id || ""),
      last_error: "",
      sent_at: sentAt,
      updated_at: sentAt,
    }).eq("id", notification.id);
    await logOrderEvent(admin, {
      orderId: notification.order_id,
      kind: "customer_notification",
      message: Number(notification.amount_due) > 0
        ? `Zalo đã báo giao thành công và nhắc khoản còn phải thu ${new Intl.NumberFormat("vi-VN").format(notification.amount_due)} ₫.`
        : "Zalo đã báo khách đơn giao thành công.",
      actor: "Zalo ZBS",
      externalRef: `zalo:${notification.id}`,
    });
    return { ok: true, status: "sent", messageId: result.msg_id || "" };
  } catch (sendError) {
    await admin.from("customer_notifications").update({
      status: "failed",
      last_error: String(sendError?.message || sendError).slice(0, 500),
      updated_at: new Date().toISOString(),
    }).eq("id", notification.id);
    return { ok: false, status: "failed" };
  }
}

export async function notifyZaloOrderDelivered(admin, { orderId, eventKey }) {
  try {
    const { data: order, error } = await admin
      .from("orders")
      .select("id,customer_name,contact,tracking_code,delivered_at,public_tracking_token")
      .eq("id", orderId)
      .maybeSingle();
    if (error) throw error;
    if (!order) return { ok: false, error: "order_not_found" };

    const amountDue = await remainingReceivable(admin, order.id);
    const kind = amountDue > 0 ? "delivered_due" : "delivered_paid";
    const recipient = normalizeVietnamPhone(order.contact);
    const templateId = templateIdFor(kind);
    const status = !recipient ? "skipped" : !templateId ? "pending_configuration" : "pending";
    const id = makeZaloTrackingId(order.id, eventKey);
    const notification = await createOrReadNotification(admin, {
      id,
      order_id: order.id,
      channel: "zalo_zbs",
      event_key: eventKey,
      recipient,
      template_kind: kind,
      template_id: templateId,
      template_data: buildDeliveryTemplateData(order, amountDue),
      amount_due: amountDue,
      status,
      last_error: !recipient ? "customer_phone_missing_or_invalid" : !templateId ? "zalo_template_not_configured" : "",
    });

    if (!notification || notification.status === "sent" || notification.status === "skipped") {
      return { ok: true, status: notification?.status || "duplicate" };
    }
    return sendStoredNotification(admin, notification);
  } catch (error) {
    console.error("Could not prepare Zalo delivery notification", error);
    return { ok: false, status: "failed" };
  }
}

export async function retryZaloDeliveryNotifications(admin, limit = 20) {
  const { data, error } = await admin
    .from("customer_notifications")
    .select("*")
    .eq("channel", "zalo_zbs")
    .in("status", ["pending", "pending_configuration", "failed"])
    .lt("attempts", 5)
    .order("created_at", { ascending: true })
    .limit(Math.max(1, Math.min(50, Number(limit) || 20)));
  if (error) throw error;

  const results = [];
  for (const item of data || []) {
    const templateId = templateIdFor(item.template_kind);
    if (!templateId) {
      results.push({ id: item.id, status: "pending_configuration" });
      continue;
    }
    const notification = { ...item, template_id: templateId };
    await admin.from("customer_notifications").update({
      template_id: templateId,
      status: "pending",
      last_error: "",
      updated_at: new Date().toISOString(),
    }).eq("id", item.id);
    results.push({ id: item.id, ...(await sendStoredNotification(admin, notification)) });
  }
  return results;
}
