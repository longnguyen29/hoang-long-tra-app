import { notifyTelegram } from "@/lib/telegram";

// One endpoint for every kind of inbound record — orders, leads, sample requests, bookings.
// The caller passes only a kind and an id; the message itself is composed server-side from
// the row, so this cannot be used to post arbitrary text into the House chat.
export async function POST(request) {
  let kind, id;
  try {
    ({ kind, id } = await request.json());
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }

  const result = await notifyTelegram(kind, id);
  return Response.json(result, result.status ? { status: result.status } : undefined);
}
