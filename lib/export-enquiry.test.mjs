import test from "node:test";
import assert from "node:assert/strict";
import { exportAttribution, exportEventInput, exportLink, exportRequirementsLimit } from "./export-enquiry.js";
import { EXPORT_TEAS } from "./export-teas.js";
const valid = (overrides = {}) => ({ requestId: "12345678-1234-4123-8123-123456789abc", name: "Test buyer", business: "Test company", contact: "buyer@example.test",
  teaIds: ["black-op1"], intent: "quote", quantityKg: "2500", desiredDate: "2026-11-15", contactMethod: "line", contactDetail: "test-buyer", currency: "TWD",
  connectorName: "Test connector", connectorContact: "connector@example.test", requirements: "25 kg bags; pesticide test specification to agree; port Kaohsiung",
  consent: true, authorized: true, website: "", attribution: exportAttribution("?utm_source=connector&utm_medium=referral&utm_campaign=taiwan_tea"), ...overrides });

test("Taiwan brief maps into the existing private Pipeline intake without assigning referral ownership", () => {
  const request = exportEventInput(valid({ partnerId: "untrusted-identity" }));
  assert.equal(request.business, "Test company");
  assert.equal(request.intent, "quote");
  assert.equal(request.attribution.campaign, "event_contact_v1");
  assert.equal(request.attribution.medium, "referral");
  assert.match(request.note, /Taiwan export \/ EXW/);
  assert.match(request.note, /Hồng Trà OP1/);
  assert.match(request.note, /2500 kg/);
  assert.match(request.note, /Quote currency: TWD/);
  assert.match(request.note, /Introducer \(buyer-provided\): Test connector/);
  assert.match(request.note, /campaign=taiwan_tea/);
  assert.equal(request.note.includes("untrusted-identity"), false);
  assert.equal(Object.hasOwn(request, "partnerId"), false);
  assert.ok(request.note.length <= 700);
  const visit = exportEventInput(valid({ intent: "factory_visit" }));
  assert.equal(visit.intent, "cooperation");
  assert.match(visit.note, /Purpose: Factory visit/);
});
test("authority, real selection, quantities, dates and communication details are validated server-side", () => {
  for (const [fields, error] of [
    [{ consent: false }, /consent_required/], [{ authorized: "true" }, /authorization_required/],
    [{ teaIds: [] }, /tea_required/], [{ teaIds: ["black-op1", "black-op1"] }, /tea_required/], [{ teaIds: ["fabricated"] }, /tea_required/],
    [{ quantityKg: "0" }, /invalid_quantity/], [{ quantityKg: "1e5" }, /invalid_quantity/], [{ quantityKg: "1,000" }, /invalid_quantity/], [{ quantityKg: "10000001" }, /invalid_quantity/],
    [{ desiredDate: "2026-02-30" }, /invalid_date/], [{ desiredDate: "2026-2-1" }, /invalid_date/],
    [{ contactDetail: " " }, /contact_detail_required/], [{ business: " " }, /invalid_request/], [{ currency: "BTC" }, /invalid_request/],
    [{ connectorName: "x".repeat(41) }, /invalid_request/], [{ connectorContact: "x".repeat(61) }, /invalid_request/],
    [{ attribution: { source: "buyer@example.test", medium: "owned", campaign: "taiwan_export_v1", content: "" } }, /invalid_request/],
  ]) assert.throws(() => exportEventInput(valid(fields)), error);
  assert.match(exportEventInput(valid({ quantityKg: "0.001", desiredDate: "2028-02-29" })).note, /0.001 kg/);
  assert.match(exportEventInput(valid({ quantityKg: "", desiredDate: "", contactMethod: "email", contactDetail: "" })).note, /Not yet specified/);
});
test("campaign labels persist across known links, duplicate or unsafe labels and arbitrary parameters do not", () => {
  const search = "?utm_source=connector&utm_medium=referral&utm_campaign=taiwan_tea&utm_content=price_card&partner=PRIVATE&email=buyer@example.test";
  const link = exportLink("/company", search, "zh-TW");
  assert.equal(link, "/company?utm_source=connector&utm_medium=referral&utm_campaign=taiwan_tea&utm_content=price_card&lang=en");
  assert.equal(exportLink("/export/taiwan", search, "zh-TW").endsWith("lang=zh-TW"), true);
  assert.deepEqual(exportAttribution("?utm_source=one&utm_source=two&utm_medium=buyer@example.test&utm_campaign=" + "x".repeat(33)),
    { source: "website", medium: "owned", campaign: "taiwan_exw_v1", content: "" });
  assert.throws(() => exportLink("https://attacker.test", search), /invalid_request/);
});
test("a full approved partner code is retained only as a campaign hint, without ownership or privileges", () => {
  const code = "HL-P-12345678123441238123123456789ABC";
  const attribution = exportAttribution(`?utm_source=partner-network&utm_medium=referral&utm_content=${code}`);
  assert.equal(attribution.content, code.toLowerCase());
  const input = exportEventInput(valid({ attribution }));
  assert.match(input.note, new RegExp(`content=${code.toLowerCase()}`));
  assert.equal(Object.hasOwn(input, "partner_id"), false);
  assert.equal(exportAttribution(`?utm_content=${"x".repeat(65)}`).content, "");
});
test("all metadata is retained while a dynamic note budget prevents truncation of buyer requirements", () => {
  const input = valid({ teaIds: EXPORT_TEAS.map((tea) => tea.id), contactDetail: "l".repeat(60), connectorName: "n".repeat(40), connectorContact: "c".repeat(60), requirements: "",
    attribution: { source: "s".repeat(32), medium: "m".repeat(32), campaign: "p".repeat(32), content: "c".repeat(32) } });
  const remaining = exportRequirementsLimit(input, input.attribution);
  assert.ok(remaining > 0 && remaining < 200);
  const note = exportEventInput({ ...input, requirements: "茶".repeat(remaining) }).note;
  assert.equal(note.length, 700);
  assert.match(note, /content=cccc/);
  assert.throws(() => exportEventInput({ ...input, requirements: "茶".repeat(remaining + 1) }), /note_too_long/);
  const reordered = exportEventInput({ ...input, teaIds: [...input.teaIds].reverse() });
  assert.equal(reordered.note, exportEventInput(input).note);
});
