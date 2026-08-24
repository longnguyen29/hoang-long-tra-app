import { cookies } from "next/headers";
import { OPS_AUTH_COOKIE, isOpsAuthedToken } from "@/lib/ops-auth";
import { OPS_STAGES } from "@/lib/ops-stages";
import { OPS_HEALTH_STATES, OPS_WAITING_ON } from "@/lib/ops-health";
import { createAdminClient } from "@/lib/supabase/admin";
import { logOrderEvent } from "@/lib/ops-events";

// Persists the stage-stepper / "Mark complete" actions and the health/waiting-on control in
// public/ops/index.html's order panel — two independent things an order can carry (stage is
// where it is in the flow, health is whether it's actually moving). Same PIN-cookie gate and
// service-role write path as app/api/ops/orders/route.js. Body may include either or both;
// at least one must be present.
export async function PATCH(request, { params }) {
  const cookie = (await cookies()).get(OPS_AUTH_COOKIE)?.value;
  if (!(await isOpsAuthedToken(cookie))) {
    return Response.json({ ok: false }, { status: 401 });
  }

  const { id } = await params;

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }

  const { stage, health, waitingOn, healthNote, actor } = body || {};
  const update = {};

  if (stage !== undefined) {
    if (!OPS_STAGES.includes(stage)) {
      return Response.json({ ok: false, error: "invalid_stage" }, { status: 400 });
    }
    update.stage = stage;
  }

  if (health !== undefined) {
    if (!OPS_HEALTH_STATES.includes(health)) {
      return Response.json({ ok: false, error: "invalid_health" }, { status: 400 });
    }
    if (waitingOn !== undefined && waitingOn !== null && !OPS_WAITING_ON.includes(waitingOn)) {
      return Response.json({ ok: false, error: "invalid_waiting_on" }, { status: 400 });
    }
    update.health = health;
    update.waiting_on = health === "on_track" ? null : waitingOn ?? null;
    update.health_note = typeof healthNote === "string" ? healthNote.trim() : "";
    update.health_changed_at = new Date().toISOString();
  }

  if (Object.keys(update).length === 0) {
    return Response.json({ ok: false, error: "empty_update" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("orders")
    .update(update)
    .eq("id", id)
    .select()
    .maybeSingle();
  if (error) return Response.json({ ok: false }, { status: 500 });
  if (!data) return Response.json({ ok: false }, { status: 404 });

  if (stage !== undefined) {
    await logOrderEvent(admin, { orderId: id, kind: "stage_change", message: `Moved to stage: ${stage}`, actor });
  }
  if (health !== undefined) {
    const waitingPart = update.waiting_on ? ` (waiting on ${update.waiting_on})` : "";
    const notePart = update.health_note ? `: ${update.health_note}` : "";
    await logOrderEvent(admin, { orderId: id, kind: "health_change", message: `Health set to ${health}${waitingPart}${notePart}`, actor });
  }

  return Response.json({ ok: true, order: data });
}

// Removes an order the same way app/admin's dashboard does — archived into deleted_records
// first (supabase/migrations/0025_v3_recycle_bin.sql), recoverable there for 7 days, rather
// than a plain hard delete. Can't call the existing archive_and_delete() RPC directly: it's
// security definer but still checks is_staff() internally, which needs a real Supabase auth
// session (auth.uid()) — the ops console only ever has the PIN cookie, no session. So this
// does the same two steps the RPC does, using the service-role client instead.
export async function DELETE(request, { params }) {
  const cookie = (await cookies()).get(OPS_AUTH_COOKIE)?.value;
  if (!(await isOpsAuthedToken(cookie))) {
    return Response.json({ ok: false }, { status: 401 });
  }

  const { id } = await params;
  const admin = createAdminClient();

  let actor;
  try {
    ({ actor } = await request.json());
  } catch {
    // DELETE is sent with no body in most clients; actor is optional either way.
  }

  const { data: row, error: readError } = await admin.from("orders").select("*").eq("id", id).maybeSingle();
  if (readError) return Response.json({ ok: false }, { status: 500 });
  if (!row) return Response.json({ ok: false }, { status: 404 });

  const { error: archiveError } = await admin.from("deleted_records").insert({
    table_name: "orders",
    record_id: id,
    payload: row,
    label: row.customer_name || "",
    deleted_by: "ops-console",
  });
  if (archiveError) return Response.json({ ok: false }, { status: 500 });

  // Logged before the delete, not after — order_events has no FK to orders.id (see the
  // migration), so writing it before or after makes no functional difference, but "before"
  // means a crash between the two calls still leaves a record that a deletion was attempted.
  await logOrderEvent(admin, { orderId: id, kind: "deleted", message: "Order deleted", actor });

  const { error: deleteError } = await admin.from("orders").delete().eq("id", id);
  if (deleteError) return Response.json({ ok: false }, { status: 500 });

  return Response.json({ ok: true });
}
