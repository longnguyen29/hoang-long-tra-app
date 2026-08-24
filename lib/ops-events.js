// Shared by every ops route that mutates an order, so each one doesn't reimplement the same
// insert. Never throws — a failed event write shouldn't fail the order mutation that triggered
// it; callers just don't await anything from this beyond letting it settle.
export async function logOrderEvent(admin, { orderId, kind, message, actor }) {
  await admin.from("order_events").insert({
    order_id: orderId,
    kind,
    message,
    actor: typeof actor === "string" ? actor.trim() : "",
  });
}
