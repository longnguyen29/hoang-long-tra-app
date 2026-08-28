import { carrierLabel, carrierStatusEffect, makeCarrierEventKey, normalizeTrackingCode } from "@/lib/carrier-tracking";
import { logOrderEvent } from "@/lib/ops-events";

export async function applyCarrierUpdate(admin, update) {
  const carrier = update.carrier;
  const trackingCode = normalizeTrackingCode(update.trackingCode);
  const statusCode = String(update.statusCode ?? "").trim();
  const statusName = String(update.statusName || `Trạng thái ${statusCode}`).trim();
  const eventKey = makeCarrierEventKey({
    carrier,
    trackingCode,
    statusCode,
    statusAt: update.statusAt,
    fallback: update.eventFallback,
  });

  const { data: order, error: readError } = await admin
    .from("orders")
    .select("id,stage,status,carrier_event_key,carrier_status_at,delivered_at")
    .eq("shipping_carrier", carrier)
    .eq("tracking_code", trackingCode)
    .maybeSingle();

  if (readError) throw readError;
  if (!order) return { matched: false };
  if (order.carrier_event_key === eventKey) return { matched: true, duplicate: true, orderId: order.id };

  const incomingTime = new Date(update.statusAt).getTime();
  const currentTime = new Date(order.carrier_status_at).getTime();
  if (Number.isFinite(currentTime) && Number.isFinite(incomingTime) && incomingTime < currentTime) {
    return { matched: true, stale: true, orderId: order.id };
  }

  const effect = carrierStatusEffect(carrier, statusCode);
  const row = {
    carrier_status_code: statusCode,
    carrier_status_name: statusName,
    carrier_status_at: update.statusAt,
    carrier_event_key: eventKey,
  };

  if (effect === "delivered") {
    row.stage = "completed";
    row.status = "completed";
    row.health = "on_track";
    row.waiting_on = null;
    row.health_note = "";
    row.health_changed_at = update.statusAt;
    row.delivered_at = order.delivered_at || update.statusAt;
  } else if (effect === "waiting" || effect === "blocked") {
    row.health = effect;
    row.waiting_on = "carrier";
    row.health_note = `${carrierLabel(carrier)}: ${statusName}`;
    row.health_changed_at = update.statusAt;
    row.unread = true;
  }

  const { error: writeError } = await admin.from("orders").update(row).eq("id", order.id);
  if (writeError) throw writeError;

  const movedToComplete = effect === "delivered" && order.stage !== "completed";
  const effectNote = movedToComplete
    ? " Đơn đã tự động chuyển sang Hoàn tất."
    : effect === "waiting"
      ? " Đơn được đánh dấu đang chờ đơn vị vận chuyển."
      : effect === "blocked"
        ? " Đơn được đánh dấu bị vướng để nhân viên kiểm tra."
        : "";

  await logOrderEvent(admin, {
    orderId: order.id,
    kind: effect === "delivered" ? "carrier_delivered" : "carrier_update",
    message: `${carrierLabel(carrier)} · ${statusName}${statusCode ? ` (${statusCode})` : ""}.${effectNote}`,
    actor: `${carrierLabel(carrier)} webhook`,
    externalRef: eventKey,
  });

  return { matched: true, orderId: order.id, effect };
}
