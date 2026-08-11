import { createClient } from "@supabase/supabase-js";

// "I placed an order and nothing arrived" has four possible causes and no way to tell them
// apart from the outside: an env var never reached production, the token is wrong, the chat
// id is wrong, or the bot was never added to the group. The order route can't say which —
// it deliberately logs the status and stays quiet so a broken notification never breaks a
// sale, and reading Vercel logs isn't something the shop owner should have to do.
//
// So: a button that sends a test message and reports back exactly what Telegram said.
//
// Staff only, and checked properly. This posts into the House's private chat, so an open
// endpoint would let anyone on the internet spam it. The caller's own access token is
// passed to Supabase and is_staff() decides — the same check the database uses everywhere
// else, rather than a second, weaker one invented here.
export async function POST(request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const auth = request.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ") || !url || !anonKey) {
    return Response.json({ ok: false, reason: "unauthorised" }, { status: 401 });
  }

  const asCaller = createClient(url, anonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: auth } },
  });
  const { data: staff } = await asCaller.rpc("is_staff");
  if (staff !== true) {
    return Response.json({ ok: false, reason: "unauthorised" }, { status: 403 });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  // See notify-order: a hand-copied chat id often arrives with a space or quotes around it.
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim().replace(/^["']|["']$/g, "");

  // Names only, never values — and the names are already in .env.example.
  const missing = Object.entries({ TELEGRAM_BOT_TOKEN: token, TELEGRAM_CHAT_ID: chatId })
    .filter(([, v]) => !v)
    .map(([k]) => k);
  if (missing.length > 0) {
    return Response.json({ ok: false, reason: "not_configured", missing });
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: "🍃 Thử kết nối — House of Hoàng Long\nNếu bạn thấy tin này, thông báo đơn hàng đã hoạt động.",
        disable_web_page_preview: true,
      }),
    });
    const body = await res.json().catch(() => ({}));

    if (res.ok && body.ok) return Response.json({ ok: true });

    // It failed, so stop making the operator guess which number to try next: ask Telegram
    // which chats this bot has actually heard from, and show them with their ids beside the
    // id currently configured. A dropped minus sign or a missing -100 prefix is then visible
    // rather than deduced. Only reached on failure — a working setup needs none of it.
    const chats = [];
    try {
      const u = await fetch(`https://api.telegram.org/bot${token}/getUpdates`);
      const ub = await u.json().catch(() => ({}));
      const seen = new Set();
      for (const upd of Array.isArray(ub.result) ? ub.result : []) {
        // Always the chat object, never `from`: in a private chat they hold the same number,
        // but `from` is also where the bot's own id appears, and pointing at that is what
        // produced "can't send messages to bots" in the first place.
        const c = (upd.message || upd.my_chat_member || upd.channel_post || {}).chat;
        if (!c || !c.id || seen.has(c.id)) continue;
        seen.add(c.id);
        // Identity of the chat only — never message text.
        chats.push({ id: String(c.id), type: c.type || "", name: c.title || c.first_name || "" });
      }
    } catch { /* diagnostics are a bonus; the real answer is the description below */ }

    // Telegram's own wording, which names the actual fault: "Unauthorized" for a bad token,
    // "chat not found" for a bad chat id, "bot was kicked" for a group it isn't in. Passing
    // it through saves a round of guessing. It never contains the token.
    return Response.json({
      ok: false,
      reason: "telegram_rejected",
      status: res.status,
      description: typeof body.description === "string" ? body.description : "",
      // Not a secret — a chat id is just a number, and only staff reach this route. Showing
      // it back is the whole point: it is what you compare the candidates against.
      configured: chatId,
      chats,
    });
  } catch (e) {
    return Response.json({ ok: false, reason: "network", description: e?.message || "" });
  }
}
