import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { pathToFileURL } from "node:url";
import path from "node:path";

const adminUrl = "data:text/javascript," + encodeURIComponent("let admin;export function setAdmin(value){admin=value}export function createAdminClient(){return admin}");
registerHooks({ resolve(specifier, context, next) {
  if (specifier === "@/lib/supabase/admin") return { url: adminUrl, shortCircuit: true };
  if (specifier.startsWith("@/")) return next(pathToFileURL(path.resolve(specifier.slice(2) + ".js")).href, context);
  return next(specifier, context);
} });
const { setAdmin } = await import(adminUrl);
const { POST } = await import("../app/api/export-enquiries/route.js");
const requestId = "12345678-1234-4123-8123-123456789abc";
const valid = (overrides = {}) => ({ requestId, name: "Test buyer", business: "Test company", contact: "+886 912 345 678", teaIds: ["steamed-green"],
  intent: "sample", quantityKg: "1000", desiredDate: "", contactMethod: "phone", contactDetail: "", requirements: "Test sample first", consent: true, authorized: true, website: "",
  attribution: { source: "connector", medium: "referral", campaign: "taiwan_export_v1", content: "" }, ...overrides });
function fixture(result) {
  process.env.NODE_ENV = "production";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-only-key";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://database.example.test";
  const calls = [];
  setAdmin({ async rpc(name, args) { calls.push({ name, args }); return typeof result === "function" ? result(args) : result || { data: { request_id: args.p_request_id, is_new: true }, error: null }; } });
  return calls;
}
function send(body = valid(), headers = {}, raw) {
  return POST(new Request("https://www.hoanglongtra.com/api/export-enquiries", { method: "POST", headers: { "content-type": "application/json", origin: "https://www.hoanglongtra.com", "x-vercel-forwarded-for": "192.0.2.10", ...headers }, body: raw === undefined ? JSON.stringify(body) : raw }));
}
test("export intake reuses the private idempotent Pipeline transaction and discloses only a public receipt", async () => {
  let count = 0;
  const calls = fixture((args) => ({ data: { request_id: args.p_request_id, is_new: count++ === 0, opportunity_id: "PRIVATE-OPPORTUNITY" }, error: null }));
  const first = await send();
  const retry = await send();
  assert.equal(first.status, 201);
  assert.equal(retry.status, 200);
  assert.deepEqual(await first.json(), { ok: true, requestId, reference: "HL-E-12345678" });
  assert.deepEqual(await retry.json(), { ok: true, requestId, reference: "HL-E-12345678" });
  assert.equal(calls[0].name, "submit_event_enquiry");
  assert.match(calls[0].args.p_note, /Taiwan export \/ EXW/);
  assert.equal(calls[0].args.p_contact, "+886 912 345 678");
  assert.equal(calls[0].args.p_campaign, "event_contact_v1");
  assert.equal(calls[0].args.p_consent, true);
  assert.match(calls[0].args.p_throttle_key, /^[a-f0-9]{64}$/);
  assert.equal(first.headers.get("cache-control"), "no-store");
});
test("invalid source, contact, authority and export details never reach the database", async () => {
  const calls = fixture();
  assert.equal((await send(valid(), { origin: "https://attacker.test" })).status, 403);
  for (const [fields, error] of [[{ contact: "not-contact" }, "invalid_contact"], [{ authorized: false }, "authorization_required"],
    [{ consent: false }, "consent_required"], [{ teaIds: [] }, "tea_required"], [{ quantityKg: "-2" }, "invalid_quantity"],
    [{ desiredDate: "2026-02-30" }, "invalid_date"], [{ website: "spam.test" }, "invalid_request"], [{ contactMethod: "line" }, "contact_detail_required"]]) {
    const response = await send(valid(fields));
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { ok: false, error });
  }
  assert.equal((await send(null, {}, "{")).status, 400);
  assert.equal((await send(null, {}, JSON.stringify({ requirements: "茶".repeat(3000) }))).status, 400);
  assert.equal(calls.length, 0);
});
test("database throttles and unavailable services do not leak data or claim a saved enquiry", async () => {
  fixture({ data: null, error: { message: "event_enquiry_rate_limited PRIVATE-CONTACT" } });
  const limited = await send();
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get("retry-after"), "1800");
  assert.deepEqual(await limited.json(), { ok: false, error: "rate_limited" });
  fixture();
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  const absent = await send();
  assert.equal(absent.status, 503);
  assert.deepEqual(await absent.json(), { ok: false, error: "unavailable" });
  fixture(() => { throw new Error("PRIVATE-KEY"); });
  assert.equal((await send()).status, 503);
});
test("connector enquiry reaches the shared transaction with the customer's identity, not the connector's", async () => {
  let count = 0;
  const calls = fixture((args) => ({ data: { request_id: args.p_request_id, is_new: count++ === 0 }, error: null }));
  const body = valid({ submitterRole: "connector", connectorName: "Test responsible person", connectorContact: "COORDINATOR@example.test" });
  const first = await send(body);
  const retry = await send(body);
  assert.equal(first.status, 201);
  assert.equal(retry.status, 200);
  assert.equal(calls[0].args.p_business, "Test company");
  assert.equal(calls[0].args.p_name, "Test buyer");
  assert.equal(calls[0].args.p_contact, "+886 912 345 678");
  assert.match(calls[0].args.p_note, /Submitted by: Connector/);
  assert.match(calls[0].args.p_note, /Connector responsible: Test responsible person \/ coordinator@example.test/);
  assert.deepEqual(calls[0].args, calls[1].args);
  assert.deepEqual(await first.json(), { ok: true, requestId, reference: "HL-E-12345678" });
  assert.deepEqual(await retry.json(), { ok: true, requestId, reference: "HL-E-12345678" });
});
test("invalid connector roles or details return safe actionable errors, and buyer contact is still mandatory", async () => {
  const calls = fixture();
  for (const [fields, error] of [[{ submitterRole: "admin" }, "invalid_submitter_role"],
    [{ submitterRole: "connector", connectorName: "", connectorContact: "coordinator@example.test" }, "connector_name_required"],
    [{ submitterRole: "connector", connectorName: "Test connector", connectorContact: "LINE:private-id" }, "invalid_connector_contact"],
    [{ submitterRole: "connector", connectorName: "Test connector", connectorContact: "coordinator@example.test", contact: "" }, "invalid_contact"],
    [{ submitterRole: "connector", connectorName: "Test connector", connectorContact: "coordinator@example.test", name: "" }, "invalid_request"]]) {
    const response = await send(valid(fields));
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { ok: false, error });
  }
  assert.equal(calls.length, 0);
});
