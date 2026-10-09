import test from "node:test";
import assert from "node:assert/strict";
import { allowedEventEnquiryOrigin, eventEnquiryReference, eventEnquiryThrottleKeys,
  normalizeEventEnquiry, readEventEnquiryBody } from "./event-enquiry.js";

const requestId = "12345678-1234-4123-8123-123456789abc";
const input = (overrides = {}) => ({ requestId, name: "Test visitor", business: "Test business", contact: "+84 901 234 567",
  intent: "sample", note: "Tea for our menu", consent: true, website: "",
  attribution: { source: "teashow", medium: "qr", campaign: "event_contact_v1" }, ...overrides });
const request = (origin, url = "https://www.hoanglongtra.com/api/event-enquiries") => new Request(url, { headers: origin ? { origin } : {} });

test("normalizes retry identity and contact without losing the visitor's request", () => {
  const normalized = normalizeEventEnquiry(input({ requestId: requestId.toUpperCase(), name: "  Cafe\u0301\u202e visitor  ", note: "  Menu\u200b test  " }));
  assert.equal(normalized.requestId, requestId);
  assert.equal(normalized.name, "Café visitor");
  assert.equal(normalized.contactKey, "0901234567");
  assert.equal(normalized.note, "Menu test");
  assert.equal(normalized.intent, "sample");
  assert.equal(eventEnquiryReference(requestId), "HL-E-12345678");
  assert.equal(normalizeEventEnquiry(input({ contact: "VISITOR+event@example.test" })).contactKey, "visitor+event@example.test");
});
test("consent, a real contact, allowlisted attribution and empty honeypot are required", () => {
  assert.throws(() => normalizeEventEnquiry(input({ consent: "true" })), /consent_required/);
  for (const contact of ["", "https://example.test", "visitor@", "123", "0901 text 234", "+000123456789", "x".repeat(121)]) {
    assert.throws(() => normalizeEventEnquiry(input({ contact })), /invalid_contact/);
  }
  for (const fields of [{ name: " " }, { name: "x".repeat(81) }, { business: "x".repeat(121) }, { note: "x".repeat(701) },
    { requestId: "not-a-uuid" }, { intent: "order" }, { website: "spam.test" }, { website: false },
    { attribution: { source: "visitor@example.test", medium: "qr", campaign: "event_contact_v1" } },
    { attribution: { source: "event", medium: "paid", campaign: "event_contact_v1" } },
    { attribution: { source: "event", medium: "qr", campaign: "contact=private" } }]) {
    assert.throws(() => normalizeEventEnquiry(input(fields)), /invalid_request/);
  }
});
test("only real site origins or the exact local development origin are accepted", () => {
  assert.equal(allowedEventEnquiryOrigin(request("https://hoanglongtra.com"), true), true);
  assert.equal(allowedEventEnquiryOrigin(request("https://www.hoanglongtra.com"), true), true);
  for (const origin of [null, "null", "https://hoanglongtra.com.attacker.test", "http://www.hoanglongtra.com", "https://www.hoanglongtra.com/", "https://attacker.test"]) {
    assert.equal(allowedEventEnquiryOrigin(request(origin), true), false);
  }
  assert.equal(allowedEventEnquiryOrigin(request("http://localhost:3000", "http://localhost:3000/api/event-enquiries"), false), true);
  assert.equal(allowedEventEnquiryOrigin(request("http://localhost:3001", "http://localhost:3000/api/event-enquiries"), false), false);
  assert.equal(allowedEventEnquiryOrigin(request("http://localhost:3000", "http://localhost:3000/api/event-enquiries"), true), false);
  assert.equal(allowedEventEnquiryOrigin(request("https://attacker.test", "https://attacker.test/api/event-enquiries"), false), false);
});
test("throttles use daily keyed pseudonyms and protected IP headers across midnight", () => {
  const secret = "test-only-secret";
  const before = eventEnquiryThrottleKeys(new Headers({ "x-vercel-forwarded-for": "192.0.2.20", "x-forwarded-for": "192.0.2.99" }), secret, new Date("2026-10-10T23:59:59Z"), true);
  const after = eventEnquiryThrottleKeys(new Headers({ "x-vercel-forwarded-for": "192.0.2.20" }), secret, new Date("2026-10-11T00:00:01Z"), true);
  assert.equal(after.previousKey, before.key);
  assert.match(after.key, /^[a-f0-9]{64}$/);
  assert.notEqual(after.key, before.key);
  assert.notEqual(after.key, eventEnquiryThrottleKeys(new Headers({ "x-vercel-forwarded-for": "192.0.2.20" }), "other-secret", new Date("2026-10-11T00:00:01Z"), true).key);
  const unknown = eventEnquiryThrottleKeys(new Headers(), secret, new Date("2026-10-11T00:00:01Z"), true);
  assert.equal(unknown.key, eventEnquiryThrottleKeys(new Headers({ "x-forwarded-for": "192.0.2.99" }), secret, new Date("2026-10-11T00:00:01Z"), true).key);
  assert.equal(unknown.key, eventEnquiryThrottleKeys(new Headers({ "x-vercel-forwarded-for": "spoofed" }), secret, new Date("2026-10-11T00:00:01Z"), true).key);
});
test("streamed JSON enforces the byte limit even without Content-Length", async () => {
  const body = new Request("http://localhost", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input()) });
  assert.equal((await readEventEnquiryBody(body)).requestId, requestId);
  const large = new Request("http://localhost", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ note: "茶".repeat(3000) }) });
  await assert.rejects(readEventEnquiryBody(large), /invalid_request/);
  for (const [type, content] of [["text/plain", "{}"], ["application/json", "{not json"]]) {
    await assert.rejects(readEventEnquiryBody(new Request("http://localhost", { method: "POST", headers: { "content-type": type }, body: content })), /invalid_request/);
  }
});
