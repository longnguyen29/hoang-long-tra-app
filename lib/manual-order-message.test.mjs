import assert from "node:assert/strict";
import test from "node:test";
import { buildManualOrderMessage, daysSinceOrderCompleted, makeSmsHref, normalizeSmsPhone } from "./manual-order-message.js";

const order = {
  id: "order-123",
  publicTrackingToken: "7f4e4d50-9108-4b40-8f7d-6247ad3c9899",
  deliveredAt: "2026-08-28T03:00:00.000Z",
};

test("normalizes Vietnamese numbers for a phone SMS app", () => {
  assert.equal(normalizeSmsPhone("0903 333 841"), "+84903333841");
  assert.equal(normalizeSmsPhone("+84 903 333 841"), "+84903333841");
  assert.equal(normalizeSmsPhone("not a phone"), "");
});

test("builds a delivered message with private page and payment reminder", () => {
  const message = buildManualOrderMessage({ order, kind: "delivered_due", amountDue: 383_000, now: "2026-08-31T03:00:00.000Z" });
  assert.match(message, /đã hoàn thành được 3 ngày/);
  assert.match(message, /383\.000 ₫/);
  assert.match(message, /mã QR và thông tin chuyển khoản/);
  assert.match(message, /đã thanh toán khoản này, vui lòng bỏ qua/);
  assert.match(message, /\/don-hang\/7f4e4d50-9108-4b40-8f7d-6247ad3c9899/);
});

test("calculates completed age from the carrier delivery time", () => {
  assert.equal(daysSinceOrderCompleted(order, "2026-08-31T03:00:00.000Z"), 3);
  assert.equal(daysSinceOrderCompleted({}), null);
});

test("uses the correct body separator for iPhone and Android", () => {
  assert.match(makeSmsHref("0903333841", "Xin chào", "ios"), /^sms:\+84903333841&body=/);
  assert.match(makeSmsHref("0903333841", "Xin chào", "android"), /^sms:\+84903333841\?body=/);
});
