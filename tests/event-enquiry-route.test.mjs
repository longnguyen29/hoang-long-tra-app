import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { pathToFileURL } from "node:url";
import path from "node:path";

// Exercise the real public handler and validation. Only the database client is
// substituted; no requests, customer records or deployed secrets are accessed.
const adminUrl = "data:text/javascript," + encodeURIComponent("let admin;export function setAdmin(value){admin=value}export function createAdminClient(){return admin}");
registerHooks({ resolve(specifier, context, next) {
  if (specifier === "@/lib/supabase/admin") return { url: adminUrl, shortCircuit: true };
  if (specifier.startsWith("@/")) return next(pathToFileURL(path.resolve(specifier.slice(2) + ".js")).href, context);
  return next(specifier, context);
} });
const { setAdmin } = await import(adminUrl);
const { POST } = await import("../app/api/event-enquiries/route.js");
const requestId = "12345678-1234-4123-8123-123456789abc";
const valid = (overrides = {}) => ({ requestId, name: "Test visitor", business: "Test café", contact: "0901234567",
  intent: "quote", note: "Test request", consent: true, website: "",
  attribution: { source: "event", medium: "referral", campaign: "event_contact_v1" }, ...overrides });
function fixture(result) {
  process.env.NODE_ENV = "production";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-only-key";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://database.example.test";
  const calls = [];
  setAdmin({ async rpc(name, args) { calls.push({ name, args }); return typeof result === "function" ? result(args) : result || { data: { request_id: args.p_request_id, is_new: true }, error: null }; } });
  return calls;
}
function send(body = valid(), headers = {}, raw) {
  return POST(new Request("https://www.hoanglongtra.com/api/event-enquiries", { method: "POST",
    headers: { "content-type": "application/json", origin: "https://www.hoanglongtra.com", "x-vercel-forwarded-for": "192.0.2.10", ...headers },
    body: raw === undefined ? JSON.stringify(body) : raw }));
}
test("new enquiries and idempotent retries disclose only the same public reference", async () => {
  let count = 0;
  const calls = fixture(args => ({ data: { request_id: args.p_request_id, is_new: count++ === 0, opportunity_id: "PRIVATE-RELATIONSHIP" }, error: null }));
  const first = await send();
  const retry = await send();
  assert.equal(first.status, 201);
  assert.equal(retry.status, 200);
  const expected = { ok: true, reference: "HL-E-12345678", requestId };
  assert.deepEqual(await first.json(), expected);
  assert.deepEqual(await retry.json(), expected);
  assert.equal(first.headers.get("cache-control"), "no-store");
  assert.equal(calls[0].name, "submit_event_enquiry");
  assert.equal(calls[0].args.p_consent, true);
  assert.equal(calls[0].args.p_campaign, "event_contact_v1");
  assert.match(calls[0].args.p_throttle_key, /^[a-f0-9]{64}$/);
  assert.equal(calls[0].args.p_throttle_key.includes("192.0.2.10"), false);
});
test("invalid origins, consent, attribution, contacts and payloads never reach the database", async () => {
  const calls = fixture();
  const badOrigin = await send(valid(), { origin: "https://attacker.test" });
  assert.equal(badOrigin.status, 403);
  assert.deepEqual(await badOrigin.json(), { ok: false, error: "invalid_request" });
  for (const [body, error] of [[valid({ consent: false }), "consent_required"], [valid({ contact: "not-a-contact" }), "invalid_contact"],
    [valid({ website: "spam.test" }), "invalid_request"], [valid({ attribution: { source: "private", medium: "qr", campaign: "event_contact_v1" } }), "invalid_request"]]) {
    const response = await send(body);
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { ok: false, error });
  }
  assert.equal((await send(null, {}, "{" )).status, 400);
  assert.equal((await send(null, {}, JSON.stringify({ note: "x".repeat(9000) }))).status, 400);
  assert.equal(calls.length, 0);
});
test("database rate and retry conflicts expose no contact or previous-record details", async () => {
  fixture({ error: { message: "event_enquiry_rate_limited PRIVATE-CONTACT" }, data: null });
  const limited = await send();
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get("retry-after"), "1800");
  assert.deepEqual(await limited.json(), { ok: false, error: "rate_limited" });
  fixture({ error: { message: "event_enquiry_retry_conflict PRIVATE-EXISTING-DATA" }, data: null });
  const conflict = await send();
  assert.equal(conflict.status, 400);
  assert.deepEqual(await conflict.json(), { ok: false, error: "invalid_request" });
});
test("missing configuration and backend failures fail without a false receipt or PII logs", async () => {
  const calls = fixture();
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  const absent = await send();
  assert.equal(absent.status, 503);
  assert.deepEqual(await absent.json(), { ok: false, error: "unavailable" });
  assert.equal(calls.length, 0);
  fixture(() => { throw new Error("PRIVATE-KEY PRIVATE-CONTACT"); });
  const failed = await send();
  assert.equal(failed.status, 503);
  assert.deepEqual(await failed.json(), { ok: false, error: "unavailable" });
  fixture({ data: { request_id: "OTHER-RECORD", is_new: true }, error: null });
  assert.equal((await send()).status, 503);
});
