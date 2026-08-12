// Tell the House a customer just sent something in.
//
// Fire-and-forget by design: the record is already saved by the time this runs, so a
// notification that fails — no network, Telegram down, nothing configured yet — must never
// surface to the customer or hold up their confirmation screen. It is logged and dropped.
//
// Only a kind and an id cross the wire. The message is composed server-side from the row,
// so nothing typed into a form can end up as text in the House chat.
export function notifyHouse(kind, id) {
  if (!id) return;
  fetch("/api/notify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind, id }),
  }).catch((e) => console.error(`Notification failed (${kind}):`, e));
}
