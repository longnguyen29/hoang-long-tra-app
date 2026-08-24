import { cookies } from "next/headers";
import { OPS_AUTH_COOKIE, isOpsAuthedToken } from "@/lib/ops-auth";
import { OPS_STAGES } from "@/lib/ops-stages";
import { createAdminClient } from "@/lib/supabase/admin";

async function requireOpsAuth() {
  const cookie = (await cookies()).get(OPS_AUTH_COOKIE)?.value;
  return isOpsAuthedToken(cookie);
}

// List/create orders for the ops console's Order Flow board (public/ops/index.html). Gated by
// the same PIN cookie as the console itself, not a Supabase session — see lib/ops-auth.js.
// Writes go through the service-role client because the orders table's RLS only allows public
// inserts with status="pending", unread=true (the customer-checkout case); a staff-entered
// order is already past that, so it can't satisfy that policy from the browser.
export async function GET() {
  if (!(await requireOpsAuth())) {
    return Response.json({ ok: false }, { status: 401 });
  }

  const { data, error } = await createAdminClient()
    .from("orders")
    .select("*")
    .order("ts", { ascending: false });
  if (error) return Response.json({ ok: false }, { status: 500 });

  return Response.json({ ok: true, orders: data });
}

export async function POST(request) {
  if (!(await requireOpsAuth())) {
    return Response.json({ ok: false }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }

  const { customerName, contact, type, stage, paymentMethod, note } = body || {};
  if (
    typeof customerName !== "string" || !customerName.trim() ||
    typeof contact !== "string" || !contact.trim() ||
    !["wholesale", "retail"].includes(type) ||
    !OPS_STAGES.includes(stage) ||
    !["qr", "cash"].includes(paymentMethod)
  ) {
    return Response.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  const row = {
    id: "ops-" + Date.now().toString(36),
    type,
    customer_name: customerName.trim(),
    contact: contact.trim(),
    note: typeof note === "string" ? note.trim() : "",
    lines: [],
    status: "confirmed",
    unread: false,
    payment_method: paymentMethod,
    stage,
  };

  const { data, error } = await createAdminClient().from("orders").insert(row).select().single();
  if (error) return Response.json({ ok: false }, { status: 500 });

  return Response.json({ ok: true, order: data });
}
