import { createClient } from "@supabase/supabase-js";
import { deleteMistakenOrder } from "@/lib/delete-mistaken-order";
import {
  ORDER_HEALTH_IDS,
  ORDER_STAGE_IDS,
  ORDER_WAITING_ON_IDS,
  orderStageMeta,
  statusForOrderStage,
} from "@/lib/order-flow";
import { SHIPPING_CARRIER_IDS, carrierLabel, normalizeTrackingCode } from "@/lib/carrier-tracking";
import { logOrderEvent } from "@/lib/ops-events";
import { authenticateManagerRequest } from "@/lib/staff-api-auth";
import { maybeSendShippingSms, readShippingSms } from "@/lib/shipping-sms-server";
import { readOrderSmsHistory } from "@/lib/order-sms-history-server";
import { SUPPORTED_SELLING_UNITS } from "@/lib/selling-units";

async function readEvents(admin, orderId) {
  return admin
    .from("order_events")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false });
}

async function readCosts(admin, orderId) {
  return admin
    .from("order_costs")
    .select("*")
    .eq("order_id", orderId)
    .order("incurred_on", { ascending: false })
    .order("created_at", { ascending: false });
}

async function readReceivable(admin, orderId) {
  return admin
    .from("receivables")
    .select("id,total,paid,status,due_at,updated_at")
    .eq("order_id", orderId)
    .neq("status", "void")
    .maybeSingle();
}

export async function GET(request, { params }) {
  const staff = await authenticateManagerRequest(request);
  if (!staff) return Response.json({ ok: false }, { status: 401 });

  const { id } = await params;
  const [eventResult, costResult, receivableResult, trackingSms, smsHistory] = await Promise.all([
    readEvents(staff.admin, id),
    readCosts(staff.admin, id),
    readReceivable(staff.admin, id),
    readShippingSms(staff.admin, id),
    readOrderSmsHistory(staff.admin, id),
  ]);
  if (eventResult.error || costResult.error || receivableResult.error) return Response.json({ ok: false }, { status: 500 });
  return Response.json({ ok: true, events: eventResult.data || [], costs: costResult.data || [], receivable: receivableResult.data || null, trackingSms, smsHistory });
}

export async function POST(request, { params }) {
  const staff = await authenticateManagerRequest(request);
  if (!staff) return Response.json({ ok: false }, { status: 401 });

  const { id } = await params;
  const { data: order } = await staff.admin.from("orders").select("id,reorder_of_order_id").eq("id", id).maybeSingle();
  if (!order) return Response.json({ ok: false }, { status: 404 });

  await logOrderEvent(staff.admin, {
    orderId: id,
    kind: "created",
    message: order.reorder_of_order_id
      ? `Đặt lại từ đơn ${order.reorder_of_order_id}; đơn mới vào bước Đơn mới.`
      : "Đơn được tạo và đưa vào bước Đơn mới.",
    actor: staff.user.email,
  });
  return Response.json({ ok: true });
}

export async function PATCH(request, { params }) {
  const staff = await authenticateManagerRequest(request);
  if (!staff) return Response.json({ ok: false }, { status: 401 });

  const { id } = await params;
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  if (body && Object.hasOwn(body, 'correctLineUnit')) {
    const correction = body.correctLineUnit;
    if (Object.keys(body).length !== 1 || !correction || Array.isArray(correction) || typeof correction !== 'object'
      || Object.keys(correction).some(key => !['index', 'expectedLines', 'unit', 'reason'].includes(key))
      || !Number.isInteger(correction.index) || correction.index < 0
      || !Array.isArray(correction.expectedLines) || correction.expectedLines.length < 1
      || correction.expectedLines.length > 500 || correction.index >= correction.expectedLines.length
      || correction.expectedLines.some(line => !line || typeof line !== 'object' || Array.isArray(line))) {
      return Response.json({ ok: false, error: 'invalid_line_unit_correction' }, { status: 400 });
    }
    const unit = typeof correction.unit === 'string' ? correction.unit.trim() : '';
    if (!SUPPORTED_SELLING_UNITS.includes(unit)) {
      return Response.json({ ok: false, error: 'invalid_line_unit' }, { status: 400 });
    }
    if (typeof correction.reason !== 'string' || correction.reason.trim().length < 5 || correction.reason.trim().length > 1000) {
      return Response.json({ ok: false, error: 'line_unit_reason_required' }, { status: 400 });
    }
    const { data: result, error } = await staff.admin.rpc('correct_order_line_unit', {
      p_order_id: id, p_line_index: correction.index, p_expected_lines: correction.expectedLines,
      p_unit: unit, p_reason: correction.reason.trim(), p_actor: staff.user.id,
    });
    if (error) {
      const known = ['manager_required', 'line_unit_reason_required', 'order_not_found', 'invalid_line_index',
        'order_lines_changed', 'invalid_order_lines', 'invalid_line_unit', 'invalid_line_quantity', 'line_unit_unchanged'];
      const code = known.find(value => error.message?.includes(value));
      const status = code === 'manager_required' ? 403 : code === 'order_not_found' ? 404
        : ['line_unit_reason_required', 'invalid_line_index', 'invalid_order_lines', 'invalid_line_unit', 'invalid_line_quantity'].includes(code) ? 400
          : code ? 409 : 500;
      return Response.json({ ok: false, error: code || 'line_unit_correction_failed' }, { status });
    }
    if (!result?.order) return Response.json({ ok: false, error: 'line_unit_correction_reload_failed' }, { status: 500 });
    const [eventResult, costResult, receivableResult] = await Promise.all([
      readEvents(staff.admin, id), readCosts(staff.admin, id), readReceivable(staff.admin, id),
    ]);
    // Correcting the recorded selling unit keeps quantity, price, payments and
    // fulfilment intact; it must not trigger a shipping/customer notification.
    return Response.json({ ok: true, order: result.order, receivable: receivableResult.data || null,
      events: eventResult.data || [], costs: costResult.data || [] });
  }

  if (body && Object.hasOwn(body, 'removeLine')) {
    const removal = body.removeLine;
    if (Object.keys(body).length !== 1 || !removal || Array.isArray(removal) || typeof removal !== 'object'
      || Object.keys(removal).some(key => !['index', 'expectedLines', 'reason'].includes(key))
      || !Number.isInteger(removal.index) || removal.index < 0
      || !Array.isArray(removal.expectedLines) || removal.expectedLines.length < 2
      || removal.expectedLines.length > 500 || removal.index >= removal.expectedLines.length
      || removal.expectedLines.some(line => !line || typeof line !== 'object' || Array.isArray(line))) {
      return Response.json({ ok: false, error: 'invalid_line_removal' }, { status: 400 });
    }
    if (typeof removal.reason !== 'string' || removal.reason.trim().length < 5 || removal.reason.trim().length > 1000) {
      return Response.json({ ok: false, error: 'line_removal_reason_required' }, { status: 400 });
    }
    const { data: result, error } = await staff.admin.rpc('remove_order_line', {
      p_order_id: id, p_line_index: removal.index, p_expected_lines: removal.expectedLines,
      p_reason: removal.reason.trim(), p_actor: staff.user.id,
    });
    if (error) {
      const known = ['manager_required', 'line_removal_reason_required', 'order_not_found', 'invalid_line_index',
        'order_lines_changed', 'last_order_line', 'invalid_order_lines', 'line_removal_payment_conflict'];
      const code = known.find(value => error.message?.includes(value));
      const status = code === 'manager_required' ? 403 : code === 'order_not_found' ? 404
        : ['line_removal_reason_required', 'invalid_line_index', 'invalid_order_lines'].includes(code) ? 400 : code ? 409 : 500;
      return Response.json({ ok: false, error: code || 'line_removal_failed' }, { status });
    }
    if (!result?.order) return Response.json({ ok: false, error: 'line_removal_reload_failed' }, { status: 500 });
    const [eventResult, costResult] = await Promise.all([readEvents(staff.admin, id), readCosts(staff.admin, id)]);
    // The RPC commits the correction, amount, reservations and audit together.
    // Removing an entered line does not dispatch shipping/customer messages.
    return Response.json({ ok: true, order: result.order, receivable: result.receivable || null,
      events: eventResult.data || [], costs: costResult.data || [] });
  }

  if (body && Object.hasOwn(body, 'forceOffReason')) {
    if (Object.keys(body).length !== 1 || typeof body.forceOffReason !== 'string' || body.forceOffReason.trim().length < 10 || body.forceOffReason.trim().length > 1000) {
      return Response.json({ ok: false, error: 'force_reason_required' }, { status: 400 });
    }
    const { error: forceError } = await staff.admin.rpc('force_off_procedure_order', {
      p_order_id: id, p_reason: body.forceOffReason.trim(), p_actor: staff.user.id,
    });
    if (forceError) {
      const known = ['manager_required', 'force_reason_required', 'order_not_found', 'order_not_ready_for_force_off', 'procedure_run_not_active'];
      const code = known.find(value => forceError.message?.includes(value));
      return Response.json({ ok: false, error: code || 'force_off_failed' }, { status: code === 'manager_required' ? 403 : code === 'force_reason_required' ? 400 : code === 'order_not_found' ? 404 : code ? 409 : 500 });
    }
    const [{ data: order, error: orderError }, eventResult, trackingSms, smsHistory] = await Promise.all([
      staff.admin.from('orders').select('*').eq('id', id).maybeSingle(), readEvents(staff.admin, id),
      readShippingSms(staff.admin, id), readOrderSmsHistory(staff.admin, id),
    ]);
    if (orderError || !order) return Response.json({ ok: false, error: 'force_off_reload_failed' }, { status: 500 });
    return Response.json({ ok: true, order, events: eventResult.data || [], trackingSms, smsHistory });
  }

  if (body && Object.hasOwn(body, 'forceShipReason')) {
    if (Object.keys(body).length !== 1 || typeof body.forceShipReason !== 'string' || body.forceShipReason.trim().length < 10 || body.forceShipReason.trim().length > 1000) {
      return Response.json({ ok: false, error: 'force_reason_required' }, { status: 400 });
    }
    const { error: forceError } = await staff.admin.rpc('force_ship_order', {
      p_order_id: id, p_reason: body.forceShipReason.trim(), p_actor: staff.user.id,
    });
    if (forceError) {
      const known = ['manager_required', 'force_reason_required', 'order_not_found', 'order_not_ready_for_force_shipping', 'procedure_run_not_active'];
      const code = known.find(value => forceError.message?.includes(value));
      return Response.json({ ok: false, error: code || 'force_ship_failed' }, { status: code === 'manager_required' ? 403 : code === 'force_reason_required' ? 400 : code === 'order_not_found' ? 404 : code ? 409 : 500 });
    }
    const { data: order, error: orderError } = await staff.admin.from('orders').select('*').eq('id', id).maybeSingle();
    if (orderError || !order) return Response.json({ ok: false, error: 'force_ship_reload_failed' }, { status: 500 });
    try {
      await maybeSendShippingSms(staff.admin, order);
    } catch (smsError) {
      console.error('Shipping SMS could not be queued', { orderId: id, error: smsError.message });
    }
    const [eventResult, trackingSms, smsHistory] = await Promise.all([
      readEvents(staff.admin, id), readShippingSms(staff.admin, id), readOrderSmsHistory(staff.admin, id),
    ]);
    return Response.json({ ok: true, order, events: eventResult.data || [], trackingSms, smsHistory });
  }

  const { stage, health, waitingOn, healthNote, trackingCode, shippingCarrier, linePrices, type } = body || {};
  const update = {};
  const events = [];

  if (type !== undefined) {
    if (!["retail", "wholesale"].includes(type)) return Response.json({ok:false,error:"invalid_type"},{status:400});
    update.type = type;
    events.push({kind:"type_change",message:`Đổi loại đơn thành ${type === "wholesale" ? "đơn sỉ" : "đơn lẻ"}. Giữ nguyên sản phẩm, số lượng và đơn giá.`});
  }

  if (linePrices !== undefined) {
    const invoice = await readReceivable(staff.admin, id);
    if (invoice.error) return Response.json({ok:false,error:"receivable_read_failed"},{status:500});
    if (invoice.data) return Response.json({ok:false,error:"receivable_exists"},{status:409});
  }

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
  if (error) {
    if (`${error.message || ''} ${error.details || ''}`.includes('procedure_stop_or_preflight_incomplete')) {
      const { data: run } = await staff.admin.from('procedure_runs').select('id').eq('order_id', id).maybeSingle();
      return Response.json({ ok: false, error: 'procedure_preflight_incomplete', procedureRunId: run?.id || null }, { status: 409 });
    }
    return Response.json({ ok: false }, { status: 500 });
  }
  if (!data) return Response.json({ ok: false }, { status: 404 });

  for (const event of events) {
    await logOrderEvent(staff.admin, {
      orderId: id,
      ...event,
      actor: staff.user.email,
    });
  }

  if (stage !== undefined || trackingCode !== undefined || shippingCarrier !== undefined) {
    try {
      await maybeSendShippingSms(staff.admin, data);
    } catch (smsError) {
      console.error('Shipping SMS could not be queued', { orderId: id, error: smsError.message });
    }
  }

  const [eventResult, trackingSms, smsHistory] = await Promise.all([
    readEvents(staff.admin, id), readShippingSms(staff.admin, id), readOrderSmsHistory(staff.admin, id),
  ]);
  return Response.json({ ok: true, order: data, events: eventResult.data || [], trackingSms, smsHistory });
}


export async function DELETE(request, { params }) {
  const staff = await authenticateManagerRequest(request);
  if (!staff) return Response.json({ok:false,error:"not_authorised"}, {status:401});
  const {id} = await params;
  let body;
  try { body = await request.json(); } catch { return Response.json({ok:false,error:"invalid_body"},{status:400}); }
  // archive_and_delete checks auth.uid(): forward the verified staff session,
  // rather than using service-role credentials for this RPC.
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    global:{headers:{Authorization:request.headers.get("authorization")}},
    auth:{persistSession:false,autoRefreshToken:false},
  });
  try {
    const result = await deleteMistakenOrder({admin:staff.admin,id,confirmation:body?.confirmation,actor:staff.user.email,
      archive:args=>client.rpc("archive_and_delete",args)});
    return Response.json(result,{status:result.status});
  } catch { return Response.json({ok:false,error:"delete_failed"},{status:500}); }
}
