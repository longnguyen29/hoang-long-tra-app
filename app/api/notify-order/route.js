import { createClient } from "@supabase/supabase-js";

// New-order ping to Telegram.
//
// Runs server-side only: the bot token and the service-role key must never reach the
// browser. The client sends nothing but an order id — the message is built here from the
// row we read back ourselves, so a caller can't inject arbitrary text into the chat.
//
// Required env vars (set these in Vercel → Settings → Environment Variables):
//   TELEGRAM_BOT_TOKEN        from @BotFather
//   TELEGRAM_CHAT_ID          the chat/group the bot should post to
//   SUPABASE_SERVICE_ROLE_KEY same value as in .env.local
// With any of them missing the route quietly does nothing, so orders still succeed.

export async function POST(request) {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  // Trimmed because a chat id is copied by hand out of a wall of JSON, and a trailing space
  // fails as "chat not found" — indistinguishable from having the wrong number entirely.
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim().replace(/^["']|["']$/g, "");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

  // Names of whatever is missing, never values. A bare "not_configured" turns setting this
  // up into guesswork — you cannot tell a misspelled key from one saved to the wrong
  // environment from a deploy that predates the change. The names are already public in the
  // README and .env.example, so listing them gives nothing away.
  const missing = Object.entries({
    TELEGRAM_BOT_TOKEN: token,
    TELEGRAM_CHAT_ID: chatId,
    SUPABASE_SERVICE_ROLE_KEY: serviceKey,
    NEXT_PUBLIC_SUPABASE_URL: url,
  }).filter(([, v]) => !v).map(([k]) => k);

  if (missing.length > 0) {
    return Response.json({ ok: false, reason: "not_configured", missing });
  }

  let orderId;
  try {
    ({ orderId } = await request.json());
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }
  if (!orderId || typeof orderId !== "string") {
    return Response.json({ ok: false }, { status: 400 });
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: order } = await admin
    .from("orders")
    .select("id, ts, type, customer_name, contact, address, total_kg, total_items, estimated_total, payment_method, note")
    .eq("id", orderId)
    .maybeSingle();

  if (!order) return Response.json({ ok: false }, { status: 404 });

  // Only ping for orders that were just placed — stops the endpoint being replayed to
  // spam the chat with notifications for old orders.
  if (Date.now() - new Date(order.ts).getTime() > 5 * 60 * 1000) {
    return Response.json({ ok: false, reason: "stale" });
  }

  const money = (n) => (typeof n === "number" ? `${n.toLocaleString("vi-VN")}đ` : "—");
  const lines = [
    `🍃 *Đơn hàng mới* (${order.type === "retail" ? "lẻ" : "sỉ"})`,
    `\`${order.id}\``,
    `👤 ${order.customer_name}`,
    `📞 ${order.contact}`,
    order.address ? `📍 ${order.address}` : null,
    order.type === "retail"
      ? `📦 ${order.total_items ?? 0} sản phẩm`
      : `📦 ${order.total_kg ?? 0} kg`,
    `💰 ${money(order.estimated_total)} · ${order.payment_method === "cash" ? "tiền mặt" : "chuyển khoản"}`,
    order.note ? `📝 ${order.note}` : null,
  ].filter(Boolean);

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: lines.join("\n"),
        parse_mode: "Markdown",
        disable_web_page_preview: true,
      }),
    });
    if (!res.ok) {
      // Log the status only — the response body can echo the token back.
      console.error("Telegram sendMessage failed:", res.status);
      return Response.json({ ok: false, reason: "send_failed" });
    }
  } catch (e) {
    console.error("Telegram sendMessage error:", e?.message);
    return Response.json({ ok: false, reason: "send_error" });
  }

  return Response.json({ ok: true });
}
