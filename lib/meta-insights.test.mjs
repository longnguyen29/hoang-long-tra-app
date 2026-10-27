import test from "node:test";
import assert from "node:assert/strict";
import { META_ACCOUNT_ID, META_CAMPAIGN_ID, normalizeInsights, readMetaInsights } from "./meta-insights.js";

const sample = { account_id: META_ACCOUNT_ID, account_currency: "VND", campaign_id: META_CAMPAIGN_ID, ad_id: "123", ad_name: "Mẫu A", adset_name: "Quán", date_start: "2026-10-20", date_stop: "2026-10-26", spend: "1234.50", impressions: "100", inline_link_clicks: "4", actions: [{ action_type: "offsite_conversion.fb_pixel_lead", value: "2" }, { action_type: "lead", value: "9" }] };

test("reports only the campaign's own VND metrics and the specific Pixel lead action", () => {
  const [row] = normalizeInsights([sample]);
  assert.deepEqual([row.spend, row.impressions, row.linkClicks, row.pixelLeads], [1234.5, 100, 4, 2]);
  assert.equal(normalizeInsights([{ ...sample, actions: [] }])[0].pixelLeads, null);
  assert.equal(normalizeInsights([{ ...sample, actions: [...sample.actions, sample.actions[0]] }])[0].pixelLeads, null);
  assert.throws(() => normalizeInsights([{ ...sample, account_id: "other" }]), /unexpected_account/);
  assert.throws(() => normalizeInsights([{ ...sample, campaign_id: "other" }]), /unexpected_account/);
  assert.throws(() => normalizeInsights([{ ...sample, account_currency: "USD" }]), /unexpected_account/);
  assert.throws(() => normalizeInsights({}), /invalid_response/);
});

test("unconfigured returns a clear status without requesting Meta", async () => {
  const result = await readMetaInsights({ token: "", fetcher: () => { throw new Error("unexpected request"); } });
  assert.deepEqual(result, { status: "not_configured" });
});

test("requests a scoped seven-day report without exposing the token in the URL and caches the result", async () => {
  let calls = 0;
  const fetcher = async (url, options) => {
    calls++;
    const parsed = new URL(url);
    assert.equal(parsed.hostname, "graph.facebook.com");
    assert.equal(parsed.pathname, `/v25.0/${META_CAMPAIGN_ID}/insights`);
    assert.equal(parsed.searchParams.get("level"), "ad");
    assert.equal(parsed.searchParams.get("date_preset"), "last_7d");
    assert.ok(!url.includes("test-token-unique"));
    assert.equal(options.headers.Authorization, "Bearer test-token-unique");
    assert.equal(options.redirect, "error");
    return { ok: true, json: async () => ({ data: [sample] }) };
  };
  const first = await readMetaInsights({ token: "test-token-unique", fetcher, now: 1800000000000 });
  const second = await readMetaInsights({ token: "test-token-unique", fetcher, now: 1800000001000 });
  assert.equal(first.status, "connected");
  assert.equal(first.rows[0].pixelLeads, 2);
  assert.deepEqual(second, first);
  assert.equal(calls, 1);
});

test("rejects failed and incomplete responses rather than showing partial figures", async () => {
  await assert.rejects(readMetaInsights({ token: "error-test", fetcher: async () => ({ ok: false }) }), /meta_unavailable/);
  await assert.rejects(readMetaInsights({ token: "paging-test", fetcher: async () => ({ ok: true, json: async () => ({ data: [sample], paging: { next: "https://example.invalid" } }) }) }), /incomplete_results/);
  const empty = await readMetaInsights({ token: "empty-test", fetcher: async () => ({ ok: true, json: async () => ({ data: [] }) }) });
  assert.deepEqual(empty.rows, []);
});
