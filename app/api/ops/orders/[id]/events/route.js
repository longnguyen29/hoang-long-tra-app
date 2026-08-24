import { cookies } from "next/headers";
import { OPS_AUTH_COOKIE, isOpsAuthedToken } from "@/lib/ops-auth";
import { createAdminClient } from "@/lib/supabase/admin";

// Activity tab in the order panel fetches this lazily, once per order per page load — see
// supabase/migrations/0030_v3_order_events.sql. Same PIN-cookie gate as every other ops route.
export async function GET(request, { params }) {
  const cookie = (await cookies()).get(OPS_AUTH_COOKIE)?.value;
  if (!(await isOpsAuthedToken(cookie))) {
    return Response.json({ ok: false }, { status: 401 });
  }

  const { id } = await params;

  const { data, error } = await createAdminClient()
    .from("order_events")
    .select("*")
    .eq("order_id", id)
    .order("created_at", { ascending: false });
  if (error) return Response.json({ ok: false }, { status: 500 });

  return Response.json({ ok: true, events: data });
}
