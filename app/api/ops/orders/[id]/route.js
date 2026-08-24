import { cookies } from "next/headers";
import { OPS_AUTH_COOKIE, isOpsAuthedToken } from "@/lib/ops-auth";
import { OPS_STAGES } from "@/lib/ops-stages";
import { createAdminClient } from "@/lib/supabase/admin";

// Persists the stage-stepper / "Mark complete" actions in public/ops/index.html's order
// panel. Same PIN-cookie gate and service-role write path as app/api/ops/orders/route.js.
export async function PATCH(request, { params }) {
  const cookie = (await cookies()).get(OPS_AUTH_COOKIE)?.value;
  if (!(await isOpsAuthedToken(cookie))) {
    return Response.json({ ok: false }, { status: 401 });
  }

  const { id } = await params;

  let stage;
  try {
    ({ stage } = await request.json());
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }
  if (!OPS_STAGES.includes(stage)) {
    return Response.json({ ok: false, error: "invalid_stage" }, { status: 400 });
  }

  const { data, error } = await createAdminClient()
    .from("orders")
    .update({ stage })
    .eq("id", id)
    .select()
    .maybeSingle();
  if (error) return Response.json({ ok: false }, { status: 500 });
  if (!data) return Response.json({ ok: false }, { status: 404 });

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

  const { error: deleteError } = await admin.from("orders").delete().eq("id", id);
  if (deleteError) return Response.json({ ok: false }, { status: 500 });

  return Response.json({ ok: true });
}
