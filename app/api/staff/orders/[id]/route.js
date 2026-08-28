import {
  ORDER_HEALTH_IDS,
  ORDER_STAGE_IDS,
  ORDER_WAITING_ON_IDS,
  orderStageMeta,
  statusForOrderStage,
} from "@/lib/order-flow";
import { SHIPPING_CARRIER_IDS, carrierLabel, normalizeTrackingCode } from "@/lib/carrier-tracking";
import { logOrderEvent } from "@/lib/ops-events";
import { authenticateStaffRequest } from "@/lib/staff-api-auth";

async function readEvents(admin, orderId) {
  return admin
    .from("order_events")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false });
}

export async function GET(request, { params }) {
  const staff = await authenticateStaffRequest(request);
  if (!staff) return Response.json({ ok: false }, { status: 401 });

  const { id } = await params;
  const { data, error } = await readEvents(staff.admin, id);
  if (error) return Response.json({ ok: false }, { status: 500 });
  return Response.json({ ok: true, events: data || [] });
}

export async function POST(request, { params }) {
  const staff = await authenticateStaffRequest(request);
  if (!staff) return Response.json({ ok: false }, { status: 401 });

  const { id } = await params;
  const { data: order } = await staff.admin.from("orders").select("id").eq("id", id).maybeSingle();
  if (!order) return Response.json({ ok: false }, { status: 404 });

  await logOrderEvent(staff.admin, {
    orderId: id,
    kind: "created",
    message: "Đơn được tạo và đưa vào bước Đơn mới.",
    actor: staff.user.email,
  });
  return Response.json({ ok: true });
}

export async function PATCH(request, { params }) {
  const staff = await authenticateStaffRequest(request);
  if (!staff) return Response.json({ ok: false }, { status: 401 });

  const { id } = await params;
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  const { stage, health, waitingOn, healthNote, trackingCode, shippingCarrier, linePrices } = body || {};
  const update = {};
  const events = [];

  if (stage !== undefined) {
    if (!ORDER_STAGE_IDS.includes(stage)) {
      return Response.json({ ok: false, error: "invalid_stage" }, { status: 400 });
    }
    update.stage = stage;
    update.status = statusForOrderStage(stage);
    update.unread = false;
    events.push({
      kind: "stage_change",
      message: `Chuyển đơn sang bước: ${orderStageMeta(stage).label}.`,
    });
  }

  if (health !== undefined) {
    if (!ORDER_HEALTH_IDS.includes(health)) {
      return Response.json({ ok: false, error: "invalid_health" }, { status: 400 });
    }
    if (waitingOn !== undefined && waitingOn !== null && !ORDER_WAITING_ON_IDS.includes(waitingOn)) {
      return Response.json({ ok: false, error: "invalid_waiting_on" }, { status: 400 });
    }
    update.health = health;
    update.waiting_on = health === "on_track" ? null : waitingOn || null;
    update.health_note = health === "on_track" ? "" : String(healthNote || "").trim();
    update.health_changed_at = new Date().toISOString();
    events.push({
      kind: "health_change",
      message: health === "on_track"
        ? "Đơn trở lại đúng tiến độ."
        : `${health === "waiting" ? "Đơn đang chờ" : "Đơn bị vướng"}${update.health_note ? `: ${update.health_note}` : "."}`,
    });
  }

  if (trackingCode !== undefined || shippingCarrier !== undefined) {
    const normalizedTrackingCode = normalizeTrackingCode(trackingCode);
    const normalizedCarrier = shippingCarrier || null;
    if (normalizedCarrier !== null && !SHIPPING_CARRIER_IDS.includes(normalizedCarrier)) {
      return Response.json({ ok: false, error: "invalid_shipping_carrier" }, { status: 400 });
    }
    if ((normalizedTrackingCode && !normalizedCarrier) || (!normalizedTrackingCode && normalizedCarrier)) {
      return Response.json({ ok: false, error: "incomplete_carrier_tracking" }, { status: 400 });
    }
    update.tracking_code = normalizedTrackingCode;
    update.shipping_carrier = normalizedCarrier;
    update.carrier_status_code = "";
    update.carrier_status_name = "";
    update.carrier_status_at = null;
    update.carrier_event_key = "";
    update.delivered_at = null;
    events.push({
      kind: "tracking_change",
      message: update.tracking_code
        ? `Đã kết nối ${carrierLabel(normalizedCarrier)} với mã vận đơn ${update.tracking_code}; chờ hãng cập nhật trạng thái.`
        : "Đã xóa hãng vận chuyển và mã vận đơn.",
    });
  }

  if (linePrices !== undefined) {
    if (!Array.isArray(linePrices) || linePrices.some((item) => (
      !Number.isInteger(item?.index)
      || item.index < 0
      || (item.price !== null && (!Number.isFinite(item.price) || item.price < 0))
    ))) {
      return Response.json({ ok: false, error: "invalid_line_prices" }, { status: 400 });
    }

    const { data: currentOrder, error: readError } = await staff.admin
      .from("orders")
      .select("lines")
      .eq("id", id)
      .maybeSingle();
    if (readError) return Response.json({ ok: false }, { status: 500 });
    if (!currentOrder) return Response.json({ ok: false }, { status: 404 });

    const lines = Array.isArray(currentOrder.lines) ? currentOrder.lines.map((line) => ({ ...line })) : [];
    const distinctIndexes = new Set(linePrices.map((item) => item.index));
    if (!lines.length || linePrices.length !== lines.length || distinctIndexes.size !== lines.length || linePrices.some((item) => item.index >= lines.length)) {
      return Response.json({ ok: false, error: "invalid_line_index" }, { status: 400 });
    }

    for (const item of linePrices) lines[item.index].price = item.price;
    update.lines = lines;
    update.estimated_total = lines.every((line) => Number.isFinite(line.price))
      ? lines.reduce((total, line) => total + (Number(line.qty) || 0) * line.price, 0)
      : null;
    events.push({
      kind: "price_change",
      message: update.estimated_total === null
        ? "Đã điều chỉnh giá bán; đơn vẫn còn dòng chưa báo giá."
        : `Đã điều chỉnh giá bán theo đơn. Tổng dự kiến mới: ${new Intl.NumberFormat("vi-VN").format(update.estimated_total)} ₫.`,
    });
  }

  if (!Object.keys(update).length) {
    return Response.json({ ok: false, error: "empty_update" }, { status: 400 });
  }

  const { data, error } = await staff.admin
    .from("orders")
    .update(update)
    .eq("id", id)
    .select()
    .maybeSingle();
  if (error) return Response.json({ ok: false }, { status: 500 });
  if (!data) return Response.json({ ok: false }, { status: 404 });

  for (const event of events) {
    await logOrderEvent(staff.admin, {
      orderId: id,
      ...event,
      actor: staff.user.email,
    });
  }

  const { data: eventRows } = await readEvents(staff.admin, id);
  return Response.json({ ok: true, order: data, events: eventRows || [] });
}
