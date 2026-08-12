import { createClient } from "@supabase/supabase-js";

// Telegram alerts for anything a customer sends us.
//
// Server-side only: the bot token and the service-role key must never reach the browser.
// The caller sends nothing but a kind and an id — every word of the message is built here
// from the row we read back ourselves, so nobody can push arbitrary text into the House
// chat by calling the endpoint directly.
//
// Required env vars (Vercel → Settings → Environment Variables):
//   TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL

// An allowlist, not a parameter: this reads a table by name with the service-role key, which
// bypasses RLS entirely. Anything not named here cannot be read through this route.
const KINDS = {
  orders: { table: "orders", tsColumn: "ts" },
  leads: { table: "leads", tsColumn: "ts" },
  sample_requests: { table: "sample_requests", tsColumn: "ts" },
  tea_sessions: { table: "tea_sessions", tsColumn: "created_at" },
};

// Stored as ids so the value is the same whichever language the form was in.
const HEARD_LABELS = {
  threads: "Threads", tiktok: "TikTok",
  facebook_instagram: "Facebook / Instagram", word_of_mouth: "Người quen giới thiệu",
};

const money = (n) => (typeof n === "number" ? `${n.toLocaleString("vi-VN")}đ` : "—");
const yesNo = (b) => (b ? "✓" : "✕");

function buildMessage(kind, r) {
  if (kind === "orders") {
    return [
      `🍃 *Đơn hàng mới* (${r.type === "retail" ? "lẻ" : "sỉ"})`,
      `\`${r.id}\``,
      `👤 ${r.customer_name}`,
      `📞 ${r.contact}`,
      r.address ? `📍 ${r.address}` : null,
      r.type === "retail" ? `📦 ${r.total_items ?? 0} sản phẩm` : `📦 ${r.total_kg ?? 0} kg`,
      `💰 ${money(r.estimated_total)} · ${r.payment_method === "cash" ? "tiền mặt" : "chuyển khoản"}`,
      r.note ? `📝 ${r.note}` : null,
    ];
  }
  if (kind === "leads") {
    return [
      // The advert's leads are the ones that owe somebody a sample, so they say so up top
      // rather than being read off a tag at the bottom.
      r.interest === "mau-thu-doanh-nghiep" ? "🌱 *Đăng ký nhận mẫu* (từ quảng cáo)" : "🌱 *Khách quan tâm mới*",
      `👤 ${r.name}`,
      `📞 ${r.contact}`,
      r.business_name ? `🏪 ${r.business_name}` : null,
      r.address ? `📍 ${r.address}` : null,
      r.interest && r.interest !== "mau-thu-doanh-nghiep" ? `🏷 ${r.interest === "wholesale" ? "bán sỉ" : "bán lẻ"}` : null,
    ];
  }
  if (kind === "sample_requests") {
    return [
      `🎁 *Yêu cầu trà mẫu* — ${r.pack}${r.pack === "50g" ? " (miễn phí)" : ""}`,
      `🏪 ${r.store_name}`,
      [r.contact_name, r.phone].filter(Boolean).join(" · "),
      `📍 ${r.address}`,
      // What they promised, so a free pack can be checked before it goes out.
      r.pack === "50g"
        ? `${yesNo(r.has_shop)} có quán · ${yesNo(r.can_reformulate)} chỉnh công thức · ${yesNo(r.can_feedback)} phản hồi 3–7 ngày`
        : null,
      r.heard_from ? `📣 ${HEARD_LABELS[r.heard_from] || r.heard_from}` : null,
      r.note ? `📝 ${r.note}` : null,
    ];
  }
  if (kind === "tea_sessions") {
    return [
      "🍵 *Đặt lịch buổi trà*",
      `📅 ${r.date}${r.session_time ? ` · ${String(r.session_time).slice(0, 5)}` : ""}`,
      `👤 ${r.customer_name}`,
      `📞 ${r.contact}`,
      `💰 ${r.payment_method === "cash" ? "tiền mặt" : "chuyển khoản"}`,
      r.note ? `📝 ${r.note}` : null,
    ];
  }
  return null;
}

export async function notifyTelegram(kind, id) {
  const spec = KINDS[kind];
  if (!spec || !id || typeof id !== "string") return { ok: false, reason: "bad_request", status: 400 };

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
  if (missing.length > 0) return { ok: false, reason: "not_configured", missing };

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: row } = await admin.from(spec.table).select("*").eq("id", id).maybeSingle();
  if (!row) return { ok: false, reason: "not_found", status: 404 };

  // Only ping for something that just happened — otherwise the endpoint can be replayed to
  // flood the chat with alerts for old records.
  const at = new Date(row[spec.tsColumn]).getTime();
  if (Date.now() - at > 5 * 60 * 1000) return { ok: false, reason: "stale" };

  const lines = buildMessage(kind, row);
  if (!lines) return { ok: false, reason: "bad_request", status: 400 };

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: lines.filter(Boolean).join("\n"),
        parse_mode: "Markdown",
        disable_web_page_preview: true,
      }),
    });
    if (!res.ok) {
      // Log the status only — the response body can echo the token back.
      console.error(`Telegram sendMessage failed (${kind}):`, res.status);
      return { ok: false, reason: "send_failed" };
    }
  } catch (e) {
    console.error(`Telegram sendMessage error (${kind}):`, e?.message);
    return { ok: false, reason: "send_error" };
  }

  return { ok: true };
}
