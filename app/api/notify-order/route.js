import { notifyTelegram } from "@/lib/telegram";

// Superseded by /api/notify, which handles every kind of record rather than just orders.
// Kept because a customer with the page already open when the new build ships will still
// call this one, and a lost order alert is exactly the thing worth a few lines to avoid.
export async function POST(request) {
  let orderId;
  try {
    ({ orderId } = await request.json());
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }

  const result = await notifyTelegram("orders", orderId);
  return Response.json(result, result.status ? { status: result.status } : undefined);
}
