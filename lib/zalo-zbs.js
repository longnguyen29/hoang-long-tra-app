const TOKEN_URL = "https://oauth.zaloapp.com/v4/oa/access_token";
const MESSAGE_URL = "https://business.openapi.zalo.me/message/template";

function configured() {
  return Boolean(process.env.ZALO_APP_ID && process.env.ZALO_APP_SECRET);
}
function usableAccessToken(row) {
  if (!row?.access_token || !row?.access_expires_at) return false;
  return new Date(row.access_expires_at).getTime() > Date.now() + 5 * 60 * 1000;
}

async function readTokens(admin) {
  const { data, error } = await admin.from("zalo_oauth_tokens").select("*").eq("id", 1).maybeSingle();
  if (error) throw error;
  return data;
}

async function refreshAccessToken(admin, current) {
  if (!configured()) throw new Error("zalo_app_not_configured");
  const refreshToken = current?.refresh_token || process.env.ZALO_OA_REFRESH_TOKEN;
  if (!refreshToken) throw new Error("zalo_refresh_token_missing");

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      secret_key: process.env.ZALO_APP_SECRET,
    },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      app_id: process.env.ZALO_APP_ID,
      grant_type: "refresh_token",
    }),
  });
  const payload = await response.json();
  if (!response.ok || !payload?.access_token || !payload?.refresh_token) {
    // A concurrent request may already have rotated this one-time refresh token. Prefer
    // the newer database row when that happened instead of rotating it a second time.
    const latest = await readTokens(admin);
    if (usableAccessToken(latest) && latest.refresh_token !== refreshToken) return latest.access_token;
    throw new Error(`zalo_token_refresh_failed:${payload?.error_name || payload?.error || response.status}`);
  }

  const expiresIn = Math.max(60, Number(payload.expires_in) || 90000);
  const row = {
    id: 1,
    oa_id: String(payload.oa_id || current?.oa_id || process.env.ZALO_OA_ID || ""),
    access_token: payload.access_token,
    refresh_token: payload.refresh_token,
    access_expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
    refresh_expires_at: new Date(Date.now() + 89 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  };
  const { error } = await admin.from("zalo_oauth_tokens").upsert(row);
  if (error) throw error;
  return row.access_token;
}

export async function getZaloAccessToken(admin) {
  const current = await readTokens(admin);
  if (usableAccessToken(current)) return current.access_token;
  return refreshAccessToken(admin, current);
}

export async function sendZaloTemplate(admin, notification) {
  const accessToken = await getZaloAccessToken(admin);
  const response = await fetch(MESSAGE_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      access_token: accessToken,
    },
    body: JSON.stringify({
      phone: notification.recipient,
      template_id: notification.template_id,
      template_data: notification.template_data,
      tracking_id: notification.id,
    }),
  });
  const payload = await response.json();
  if (!response.ok || payload?.error !== 0) {
    throw new Error(`zalo_send_failed:${payload?.error || response.status}:${payload?.message || "unknown"}`);
  }
  return payload.data || {};
}
