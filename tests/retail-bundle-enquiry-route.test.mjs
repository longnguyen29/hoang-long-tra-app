import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { pathToFileURL } from "node:url";
import path from "node:path";

// Run the actual public handler with its complete validation/CRM composition.
// Only the service client is replaced; no deployed data or secrets are used.
const adminUrl = "data:text/javascript," + encodeURIComponent("let admin;export function setAdmin(value){admin=value}export function createAdminClient(){return admin}");
registerHooks({ resolve(specifier, context, next) {
  if (specifier === "@/lib/supabase/admin") return { url: adminUrl, shortCircuit: true };
  if (specifier.startsWith("@/")) return next(pathToFileURL(path.resolve(specifier.slice(2) + ".js")).href, context);
  return next(specifier, context);
} });
const { setAdmin } = await import(adminUrl);
const { POST } = await import("../app/api/retail-bundle-enquiries/route.js");
const { RETAIL_BUNDLES } = await import("../lib/retail-bundles.js");
const { RETAIL_BUNDLE_ENQUIRY_NOTE_LIMIT } = await import("../lib/retail-bundle-enquiry.js");
const requestId = "12345678-1234-4123-8123-123456789abc";
const valid = (overrides = {}) => ({ requestId, bundleId: "find-your-taste", name: "Test visitor",
  contact: "0901234567", note: "Please contact me when the pack is defined", consent: true, ...overrides });
function fixture(result) {
  process.env.NODE_ENV = "production";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-only-key";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://database.example.test";
  const calls = [];
  setAdmin({ async rpc(name, args) { calls.push({ name, args }); return typeof result === "function" ? result(args) : result || { data: { request_id: args.p_request_id, is_new: true }, error: null }; } });
  return calls;
}
function send(body = valid(), headers = {}, raw) {
  return POST(new Request("https://www.hoanglongtra.com/api/retail-bundle-enquiries", { method: "POST",
    headers: { "content-type": "application/json", origin: "https://www.hoanglongtra.com", "x-vercel-forwarded-for": "192.0.2.10", ...headers },
    body: raw === undefined ? JSON.stringify(body) : raw }));
}

test("planned interest uses the existing private transaction and the same reference on a retry", async t => {
  let count = 0;
  const calls = fixture(args => ({ data: { request_id: args.p_request_id, is_new: count++ === 0, opportunity_id: "PRIVATE-CRM-ID" }, error: null }));
  const network = t.mock.method(globalThis, "fetch", () => { throw new Error("Unexpected external request"); });
  const first = await send(), retry = await send();
  assert.equal(first.status, 201);
  assert.equal(retry.status, 200);
  const expected = { ok: true, reference: "HL-E-12345678", requestId };
  assert.deepEqual(await first.json(), expected);
  assert.deepEqual(await retry.json(), expected);
  assert.equal(first.headers.get("cache-control"), "no-store");
  assert.equal(first.headers.get("x-content-type-options"), "nosniff");
  assert.equal(calls[0].name, "submit_event_enquiry");
  assert.deepEqual(calls[0].args, calls[1].args);
  const saved = calls[0].args;
  assert.equal(saved.p_name, "Test visitor");
  assert.equal(saved.p_business, "");
  assert.equal(saved.p_contact, "0901234567");
  assert.equal(saved.p_intent, "quote");
  assert.equal(saved.p_source, "website");
  assert.equal(saved.p_medium, "owned");
  assert.equal(saved.p_campaign, "event_contact_v1");
  assert.equal(saved.p_consent, true);
  assert.match(saved.p_note, /\[Retail bundle: find-your-taste\]/);
  assert.match(saved.p_note, /Đăng ký quan tâm bộ dự kiến; chưa mở bán, chưa chốt giá\/quy cách\. Không phải đơn hàng/);
  assert.match(saved.p_note, /Campaign: retail_bundles_v1/);
  assert.match(saved.p_note, /Lời nhắn khách: Please contact me/);
  assert.match(saved.p_throttle_key, /^[a-f0-9]{64}$/);
  assert.equal(network.mock.callCount(), 0);
  assert.equal(JSON.stringify(expected).includes(saved.p_contact), false);
});

test("all five known planned definitions use the server name and fit the durable note budget", async () => {
  const calls = fixture();
  const ids = ["find-your-taste", "lotus-discovery", "travel", "cafe-trial", "familiar-and-new"];
  for (const bundleId of ids) {
    const response = await send(valid({ bundleId, note: "x".repeat(RETAIL_BUNDLE_ENQUIRY_NOTE_LIMIT) }));
    assert.equal(response.status, 201, bundleId);
    const definition = RETAIL_BUNDLES.find(bundle => bundle.id === bundleId);
    assert.equal(definition.ready, false);
    assert.ok(calls.at(-1).args.p_note.includes(typeof definition.name === "string" ? definition.name : definition.name.vi));
    assert.ok(calls.at(-1).args.p_note.length <= 700);
  }
  assert.equal((await send(valid({ note: undefined }))).status, 201);
});

test("ready or unknown bundles and injected commercial metadata never reach the database", async () => {
  const calls = fixture();
  const ready = RETAIL_BUNDLES.find(bundle => bundle.ready === true);
  assert.ok(ready);
  for (const fields of [{ bundleId: ready.id }, { bundleId: "not-a-bundle" }, { bundleId: "__proto__" },
    { price: 1 }, { components: [] }, { ready: true }, { status: "confirmed" }, { bundleName: "Invented" },
    { attribution: { campaign: "retail_bundles_v1" } }, { business: "Injected" }]) {
    const response = await send(valid(fields));
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { ok: false, error: "invalid_request" });
  }
  assert.equal(calls.length, 0);
});

test("origins are checked before reading the body and share the existing development policy", async () => {
  const calls = fixture();
  const response = await POST({ headers: new Headers({ origin: "https://attacker.test" }),
    get body() { throw new Error("Body must not be read"); } });
  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), { ok: false, error: "invalid_request" });
  assert.equal((await send(valid(), { origin: "" })).status, 403);
  const local = () => POST(new Request("http://localhost:3000/api/retail-bundle-enquiries", { method: "POST",
    headers: { "content-type": "application/json", origin: "http://127.0.0.1:3000" }, body: JSON.stringify(valid()) }));
  assert.equal((await local()).status, 403);
  assert.equal(calls.length, 0);
  process.env.NODE_ENV = "development";
  assert.equal((await local()).status, 201);
  assert.equal(calls.length, 1);
});

test("consent, contact, UUID, name, note and bounded JSON requirements are enforced", async () => {
  const calls = fixture();
  for (const [fields, error] of [[{ consent: false }, "consent_required"], [{ consent: "true" }, "consent_required"],
    [{ contact: "not-a-contact" }, "invalid_contact"], [{ contact: "1".repeat(121) }, "invalid_contact"],
    [{ requestId: "invalid-uuid" }, "invalid_request"], [{ name: "" }, "invalid_request"],
    [{ name: "x".repeat(81) }, "invalid_request"], [{ note: "x".repeat(RETAIL_BUNDLE_ENQUIRY_NOTE_LIMIT + 1) }, "invalid_request"],
    [{ note: 7 }, "invalid_request"]]) {
    const response = await send(valid(fields));
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { ok: false, error });
  }
  assert.equal((await send(null)).status, 400);
  assert.equal((await send([])).status, 400);
  assert.equal((await send(null, {}, "{")).status, 400);
  assert.equal((await send(valid(), { "content-type": "text/plain" })).status, 400);
  assert.equal((await send(valid(), { "content-length": "8193" })).status, 400);
  assert.equal((await send(null, {}, JSON.stringify({ note: "茶".repeat(3000) }))).status, 400);
  assert.equal(calls.length, 0);
});

test("public forwarding headers cannot bypass the existing trusted production throttle", async () => {
  const calls = fixture();
  const headers = { "x-vercel-forwarded-for": "", "x-forwarded-for": "198.51.100.1" };
  await send(valid(), headers);
  await send(valid(), { ...headers, "x-forwarded-for": "198.51.100.2" });
  assert.equal(calls[0].args.p_throttle_key, calls[1].args.p_throttle_key);
  await send(valid(), { "x-vercel-forwarded-for": "198.51.100.1" });
  assert.notEqual(calls[0].args.p_throttle_key, calls[2].args.p_throttle_key);
});

test("database rate limits, conflicts and failures never leak private data or claim success", async () => {
  fixture({ data: null, error: { message: "event_enquiry_rate_limited PRIVATE-CONTACT" } });
  const limited = await send();
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get("retry-after"), "1800");
  assert.deepEqual(await limited.json(), { ok: false, error: "rate_limited" });
  fixture({ data: null, error: { message: "event_enquiry_retry_conflict PRIVATE-EXISTING-DATA" } });
  const conflict = await send();
  assert.equal(conflict.status, 400);
  assert.deepEqual(await conflict.json(), { ok: false, error: "invalid_request" });
  const calls = fixture();
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  const absent = await send();
  assert.equal(absent.status, 503);
  assert.deepEqual(await absent.json(), { ok: false, error: "unavailable" });
  assert.equal(calls.length, 0);
  for (const result of [() => { throw new Error("PRIVATE-KEY PRIVATE-CONTACT"); },
    { data: null, error: { message: "PRIVATE-DATABASE-ERROR" } },
    { data: { request_id: "OTHER-RECORD", is_new: true }, error: null }]) {
    fixture(result);
    const response = await send();
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { ok: false, error: "unavailable" });
  }
});
