import { after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyTelegram } from "@/lib/telegram";
import { privateText, validPrivateId } from "@/lib/private-order";

const reply = (data, status) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request, { params }) {
  const { token } = await params;
  if (!validPrivateId(token)) return reply({ error: "page_closed" }, 404);
  const input = await request.json().catch(() => null);
  const contact = privateText(input?.contact, 240);
  const address = privateText(input?.address, 1000);
  const note = privateText(input?.note, 1000);
  const quantities = input?.quantities;
  if (input?.consent !== true || !contact || !address || !validPrivateId(input?.requestId) || !Number.isSafeInteger(input.revision) || input.revision < 1
      || !["qr", "cash"].includes(input.payment) || !quantities || Array.isArray(quantities) || typeof quantities !== "object"
      || Object.keys(quantities).length > 30 || !Object.entries(quantities).every(([id, qty]) => validPrivateId(id) && Number.isFinite(qty) && qty > 0 && qty <= 100000)) {
    return reply({ error: "invalid_order" }, 400);
  }
  const admin = createAdminClient();
  const { data: orderId, error } = await admin.rpc("submit_private_order", {
    p_token: token, p_revision: input.revision, p_request: input.requestId, p_quantities: quantities,
    p_contact: contact, p_address: address, p_note: note, p_payment: input.payment,
  });
  if (error) {
    const known = { page_closed: 404, page_changed: 409, request_conflict: 409, invalid_order: 400 };
    return Object.hasOwn(known, error.message) ? reply({ error: error.message }, known[error.message]) : reply({ error: "order_failed" }, 500);
  }

  after(async () => {
    try {
      const result = await notifyTelegram("orders", orderId);
      if (!result.ok) console.error("Private order Telegram delivery:", result.reason);
    } catch { console.error("Private order Telegram delivery failed"); }
  });
  const { data: order } = await admin.from("orders").select("public_tracking_token").eq("id", orderId).maybeSingle();
  return reply({ orderId, trackingToken: order?.public_tracking_token || null }, 200);
}
