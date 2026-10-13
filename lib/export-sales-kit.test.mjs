import test from "node:test";
import assert from "node:assert/strict";
import { buildExportSalesKitHref, parseExportTeaIds } from "./export-sales-kit.js";
import { getExportSalesProfile } from "./export-sales-profiles.js";

test("selected briefs retain only chosen known teas in a stable order", () => {
  assert.deepEqual(parseExportTeaIds(undefined), ["steamed-green", "smoked-black", "black-op1", "magnolia-green"]);
  assert.deepEqual(parseExportTeaIds("magnolia-green,smoked-black"), ["smoked-black", "magnolia-green"]);
  for (const value of ["", "black-op1,black-op1", "black-op1,unknown", "black-op1,", ["black-op1"], null]) {
    assert.equal(parseExportTeaIds(value), null);
  }
});

test("a kit URL contains the full approved-code format and no personal information", () => {
  const partnerCode = "hl-p-0123456789abcdef0123456789abcdef";
  const url = new URL(buildExportSalesKitHref({ teaIds: ["magnolia-green", "black-op1"], currency: "TWD", partnerCode,
    name: "PRIVATE_NAME", phone: "PRIVATE_PHONE", margin: "PRIVATE_MARGIN" }), "https://www.hoanglongtra.com");
  assert.equal(url.pathname, "/export/taiwan");
  assert.equal(url.searchParams.get("teas"), "black-op1,magnolia-green");
  assert.equal(url.searchParams.get("lang"), "vi");
  assert.equal(url.searchParams.get("currency"), "TWD");
  assert.equal(url.searchParams.get("utm_content"), partnerCode.toUpperCase());
  assert.equal(url.searchParams.get("utm_source"), "partner-network");
  assert.equal(url.searchParams.get("utm_medium"), "referral");
  assert.equal(url.href.includes("PRIVATE"), false);
  assert.equal(new URL(buildExportSalesKitHref(), url).searchParams.has("utm_content"), false);
});

test("invalid selections, unsupported currencies and malformed partner codes cannot make share links", () => {
  for (const teaIds of [[], ["bad"], ["black-op1", "black-op1"], null, "black-op1"]) assert.throws(() => buildExportSalesKitHref({ teaIds }), /invalid_sales_kit/);
  for (const currency of ["EUR", "usd", "USD&phone=secret"]) assert.throws(() => buildExportSalesKitHref({ currency }), /invalid_sales_kit/);
  assert.throws(() => buildExportSalesKitHref({ locale: "zh-TW" }), /invalid_sales_kit/);
  for (const partnerCode of ["", "HL-P-001", "HL-P-0123456789abcdef0123456789abcdef&phone=secret", null]) assert.throws(() => buildExportSalesKitHref({ partnerCode }), /invalid_partner_code/);
});

test("personalised links use only approved public profiles and retain referral and tea selection", () => {
  const code = "HL-P-0123456789ABCDEF0123456789ABCDEF";
  const url = new URL(buildExportSalesKitHref({ profileId: "anh-long", teaIds: ["black-op1"], currency: "USD", partnerCode: code }), "https://www.hoanglongtra.com");
  assert.equal(url.searchParams.get("profile"), "anh-long");
  assert.equal(url.searchParams.get("teas"), "black-op1");
  assert.equal(url.searchParams.get("currency"), "USD");
  assert.equal(url.searchParams.get("utm_content"), code);
  assert.equal(getExportSalesProfile("anh-long").contact.phone, "+84782293579");
  assert.equal(getExportSalesProfile(undefined).contact, null);
  assert.equal(new URL(buildExportSalesKitHref(), url).searchParams.has("profile"), false);
  for (const profileId of ["unknown", "anh-long&phone=private", ["anh-long"], null]) {
    assert.equal(getExportSalesProfile(profileId), null);
    assert.throws(() => buildExportSalesKitHref({ profileId }), /invalid_sales_kit/);
  }
});
