import { createHash, createHmac } from "node:crypto";

// This feature is deliberately scoped to the campaign the owner selected.
export const META_CAMPAIGN_ID = "120251073471340262";
export const META_ACCOUNT_ID = "569279908663703";
const CACHE_MS = 5 * 60 * 1000;
const FIELDS = "account_id,account_currency,campaign_id,ad_id,ad_name,adset_name,date_start,date_stop,spend,impressions,inline_link_clicks,actions";
let cache = null;
let pending = null;

const numberOrNull = (value) => {
  if (value === undefined || value === null || value === "" || !/^\d+(?:\.\d+)?$/.test(String(value))) return null;
  const n = Number(value);
  return Number.isFinite(n) && n <= Number.MAX_SAFE_INTEGER ? n : null;
};

export function normalizeInsights(data) {
  if (!Array.isArray(data)) throw new Error("invalid_response");
  return data.map((row) => {
    if (row.account_id !== META_ACCOUNT_ID || row.campaign_id !== META_CAMPAIGN_ID || row.account_currency !== "VND") {
      throw new Error("unexpected_account");
    }
    const matches = Array.isArray(row.actions) ? row.actions.filter((action) => action?.action_type === "offsite_conversion.fb_pixel_lead") : [];
    return {
      adId: /^\d+$/.test(String(row.ad_id || "")) ? String(row.ad_id) : "",
      adName: typeof row.ad_name === "string" ? row.ad_name.slice(0, 200) : "",
      adSetName: typeof row.adset_name === "string" ? row.adset_name.slice(0, 200) : "",
      dateStart: /^\d{4}-\d{2}-\d{2}$/.test(row.date_start || "") ? row.date_start : null,
      dateStop: /^\d{4}-\d{2}-\d{2}$/.test(row.date_stop || "") ? row.date_stop : null,
      spend: numberOrNull(row.spend),
      impressions: numberOrNull(row.impressions),
      linkClicks: numberOrNull(row.inline_link_clicks),
      // Do not combine action categories or treat a missing action as a zero.
      pixelLeads: matches.length === 1 ? numberOrNull(matches[0].value) : null,
    };
  });
}

export async function readMetaInsights({ token, appSecret = "", fetcher = fetch, now = Date.now() }) {
  if (!token?.trim()) return { status: "not_configured" };
  const key = createHash("sha256").update(token).update("\0").update(appSecret).digest("hex");
  if (cache?.key === key && now - cache.at < CACHE_MS) return cache.value;
  if (pending?.key === key) return pending.promise;
  const request = (async () => {
    const url = new URL(`https://graph.facebook.com/v25.0/${META_CAMPAIGN_ID}/insights`);
    url.searchParams.set("fields", FIELDS);
    url.searchParams.set("level", "ad");
    url.searchParams.set("date_preset", "last_7d");
    url.searchParams.set("use_unified_attribution_setting", "true");
    url.searchParams.set("limit", "100");
    if (appSecret) url.searchParams.set("appsecret_proof", createHmac("sha256", appSecret).update(token).digest("hex"));
    const response = await fetcher(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error("meta_unavailable");
    const payload = await response.json();
    // Never display a partial report if Meta has more results.
    if (payload?.paging?.next) throw new Error("incomplete_results");
    const rows = normalizeInsights(payload?.data);
    const value = { status: "connected", fetchedAt: new Date(now).toISOString(), rows };
    cache = { key, at: now, value };
    return value;
  })();
  pending = { key, promise: request };
  try { return await request; } finally { if (pending?.promise === request) pending = null; }
}
