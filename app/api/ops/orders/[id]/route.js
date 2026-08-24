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
