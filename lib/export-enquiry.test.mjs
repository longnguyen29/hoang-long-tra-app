import test from "node:test";
import assert from "node:assert/strict";
import { exportAttribution, exportEventInput, exportLink, exportRequirementsLimit, normalizeExportConnectorContact } from "./export-enquiry.js";
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
test("connector submissions keep the real customer identity separate from the person responsible for connecting", () => {
  const first = exportEventInput(valid({ submitterRole: "connector", connectorName: "Test coordinator", connectorContact: "COORDINATOR@example.test" }));
  assert.equal(first.business, "Test company");
  assert.equal(first.name, "Test buyer");
  assert.equal(first.contact, "buyer@example.test");
  assert.match(first.note, /Submitted by: Connector/);
  assert.match(first.note, /Connector responsible: Test coordinator \/ coordinator@example.test/);
  assert.equal(first.note.includes("Introducer (buyer-provided)"), false);
  assert.equal(Object.hasOwn(first, "partner_id"), false);
  const second = exportEventInput(valid({ submitterRole: "connector", business: "Other buyer company", name: "Other buyer", contact: "+886 923 456 789", connectorName: "Test coordinator", connectorContact: "COORDINATOR@example.test" }));
  assert.equal(second.business, "Other buyer company");
  assert.equal(second.contact, "+886 923 456 789");
  assert.notEqual(second.contact, first.contact);
  assert.match(second.note, /coordinator@example.test/);
  const buyer = exportEventInput(valid({ submitterRole: "buyer", connectorName: "", connectorContact: "" }));
  assert.match(buyer.note, /Submitted by: Buyer/);
  // Older clients omit the role. Keep their previous note representation so
  // an in-flight idempotent retry does not conflict simply after this release.
  const legacy = exportEventInput(valid());
  assert.equal(legacy.note.includes("Submitted by:"), false);
  assert.match(legacy.note, /Introducer \(buyer-provided\): Test connector/);
});
test("submitter roles are bounded and connectors require their own name plus a real email or phone", () => {
  for (const role of ["admin", "partner", "Connector", " connector", null, true, {}, "x".repeat(100)]) assert.throws(() => exportEventInput(valid({ submitterRole: role })), /invalid_submitter_role/);
  for (const name of [undefined, " ", "x".repeat(41)]) assert.throws(() => exportEventInput(valid({ submitterRole: "connector", connectorName: name })), /connector_name_required/);
  for (const contact of [undefined, "", "LINE:test-connector", "coordinator@", "https://example.test", "+000123456789", "123", "0901 text 234", "x".repeat(61)]) {
    assert.throws(() => exportEventInput(valid({ submitterRole: "connector", connectorContact: contact })), /invalid_connector_contact/);
  }
  assert.equal(normalizeExportConnectorContact("  COORDINATOR+trade@EXAMPLE.test  "), "coordinator+trade@example.test");
  assert.equal(normalizeExportConnectorContact("+886 912 345 678"), "+886 912 345 678");
  assert.equal(normalizeExportConnectorContact("+84 901 234 567"), "+84 901 234 567");
});
test("connector responsibility and full source hints fit the same nontruncating private note budget", () => {
  const input = valid({ submitterRole: "connector", teaIds: EXPORT_TEAS.map((tea) => tea.id), contactDetail: "l".repeat(60), connectorName: "n".repeat(40), connectorContact: `${"c".repeat(47)}@example.test`, requirements: "",
    attribution: { source: "s".repeat(32), medium: "m".repeat(32), campaign: "p".repeat(32), content: "c".repeat(64) } });
  const limit = exportRequirementsLimit(input, input.attribution);
  assert.ok(limit > 0 && limit < 200);
  const normalized = exportEventInput({ ...input, requirements: "x".repeat(limit) });
  assert.equal(normalized.note.length, 700);
  assert.match(normalized.note, /Submitted by: Connector/);
  assert.match(normalized.note, /Connector responsible:/);
  assert.throws(() => exportEventInput({ ...input, requirements: "x".repeat(limit + 1) }), /note_too_long/);
});
