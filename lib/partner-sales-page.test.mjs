import test from "node:test";
import assert from "node:assert/strict";
import { buildPartnerSalesPageHref, isPartnerSalesPageSlug, normalizePartnerSalesPageInput, parsePublicPartnerSalesPage, partnerSalesPageProfile } from "./partner-sales-page.js";

const page = { slug: "anh-long", display_name: "Anh Long", phone: "078 229 3579", region: "Việt Nam / Đài Loan", tea_ids: ["steamed-green", "black-op1"], revision: 1 };

test("public page DTO includes only explicitly approved public presentation", () => {
  const parsed = parsePublicPartnerSalesPage({ ...page, partner_id: "PRIVATE", email: "PRIVATE", terms: "PRIVATE", internal_cost_total: 123 });
  assert.deepEqual(parsed, page);
  assert.equal(JSON.stringify(parsed).includes("PRIVATE"), false);
  assert.equal(partnerSalesPageProfile(parsed).contact.phone, "0782293579");
  assert.equal(partnerSalesPageProfile(parsed).pdf, "/downloads/hoang-long-b2b-sales-kit-vi.pdf");
});

test("personalized links preserve the bound page and restrict selected teas", () => {
  const href = buildPartnerSalesPageHref({ salesPage: page, teaIds: ["black-op1"], currency: "USD" });
  const url = new URL(href, "https://www.hoanglongtra.com");
  assert.equal(url.pathname, "/doi-tac/anh-long");
  assert.equal(url.searchParams.get("teas"), "black-op1");
  assert.equal(url.searchParams.get("currency"), "USD");
  assert.equal(url.searchParams.get("lang"), "vi");
  assert.equal(url.searchParams.has("partner_id"), false);
  assert.equal(url.searchParams.has("phone"), false);
  assert.throws(() => buildPartnerSalesPageHref({ salesPage: page, teaIds: ["magnolia-green"] }), /invalid_partner_sales_page/);
  assert.throws(() => buildPartnerSalesPageHref({ salesPage: page, currency: "EUR" }), /invalid_partner_sales_page/);
});

test("publication requires explicit contact review, reason and bounded valid fields", () => {
  const input = { ...page, published: true, content_reviewed: false, reason: "Tạo trang giới thiệu cho thử nghiệm" };
  assert.equal(normalizePartnerSalesPageInput(input).ok, false);
  const result = normalizePartnerSalesPageInput({ ...input, content_reviewed: true });
  assert.equal(result.ok, true);
  assert.equal(Object.hasOwn(result.data, "revision"), false);
  assert.equal(result.data.expected_revision, 0);
  assert.equal(normalizePartnerSalesPageInput({ ...input, expected_revision: -1 }).ok, false);
  assert.equal(normalizePartnerSalesPageInput({ ...input, content_reviewed: true, expected_revision: 3 }).data.expected_revision, 3);
  assert.equal(normalizePartnerSalesPageInput({ ...input, published: false }).ok, true);
  for (const patch of [{ reason: "" }, { phone: "@bad" }, { display_name: "\u200bName" }, { region: "" }, { tea_ids: [] }, { tea_ids: ["black-op1", "black-op1"] }, { published: "true" }]) {
    assert.equal(normalizePartnerSalesPageInput({ ...input, content_reviewed: true, ...patch }).ok, false);
  }
});

test("invalid slugs, revisions and unsafe contacts do not produce public pages", () => {
  for (const slug of ["a", "ab", "A-Long", "anh--long", "anh-long?phone=private", "../long", "-long", "long-", "a".repeat(65), ["anh-long"]]) assert.equal(isPartnerSalesPageSlug(slug), false);
  for (const patch of [{ revision: 0 }, { revision: "1" }, { phone: "+0123456789" }, { tea_ids: ["unknown"] }, { region: "x".repeat(161) }]) assert.equal(parsePublicPartnerSalesPage({ ...page, ...patch }), null);
});
