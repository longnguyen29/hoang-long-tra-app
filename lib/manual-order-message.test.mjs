import assert from "node:assert/strict";
import test from "node:test";
import { buildManualOrderMessage, makeSmsHref, normalizeSmsPhone } from "./manual-order-message.js";

const order = { id: "order-123", publicTrackingToken: "7f4e4d50-9108-4b40-8f7d-6247ad3c9899" };

test("normalizes Vietnamese numbers for a phone SMS app", () => {
  assert.equal(normalizeSmsPhone("0903 333 841"), "+84903333841");
  assert.equal(normalizeSmsPhone("+84 903 333 841"), "+84903333841");
  assert.equal(normalizeSmsPhone("not a phone"), "");
});

test("builds a delivered message with private page and payment reminder", () => {
  const message = buildManualOrderMessage({ order, kind: "delivered_due", amountDue: 383_000 });
  assert.match(message, /đã giao thành công/);
  assert.match(message, /383\.000 ₫/);
  assert.match(message, /mã QR và thông tin chuyển khoản/);
  assert.match(message, /đã thanh toán, vui lòng bỏ qua/);
  assert.match(message, /\/don-hang\/7f4e4d50-9108-4b40-8f7d-6247ad3c9899/);
});

test("uses the correct body separator for iPhone and Android", () => {
  assert.match(makeSmsHref("0903333841", "Xin chào", "ios"), /^sms:\+84903333841&body=/);
  assert.match(makeSmsHref("0903333841", "Xin chào", "android"), /^sms:\+84903333841\?body=/);
});
