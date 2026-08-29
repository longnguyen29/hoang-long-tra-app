import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDeliveryTemplateData,
  makeZaloTrackingId,
  normalizeVietnamPhone,
} from "./zalo-notifications-core.js";

test("Vietnamese phone numbers are normalized for Zalo", () => {
  assert.equal(normalizeVietnamPhone("0903 333 841"), "84903333841");
  assert.equal(normalizeVietnamPhone("+84 903-333-841"), "84903333841");
  assert.equal(normalizeVietnamPhone("long@example.com"), "");
});
test("Zalo tracking ids are deterministic, provider-safe and short", () => {
  const first = makeZaloTrackingId("order-123", "viettel:ABC:501:2026-08-28");
  const second = makeZaloTrackingId("order-123", "viettel:ABC:501:2026-08-28");
  assert.equal(first, second);
  assert.match(first, /^[A-Za-z0-9]+$/);
  assert.ok(first.length <= 48);
});

test("approved delivery template fields are populated consistently", () => {
  const data = buildDeliveryTemplateData({
    id: "HL-42",
    customer_name: "Quán Trà Mây",
    tracking_code: "EE123VN",
    delivered_at: "2026-08-28T13:30:00.000Z",
    public_tracking_token: "7f4e4d50-9108-4b40-8f7d-6247ad3c9899",
  }, 1250000);
  assert.equal(data.customer_name, "Quán Trà Mây");
  assert.equal(data.order_code, "HL-42");
  assert.equal(data.tracking_code, "EE123VN");
  assert.match(data.delivered_at, /28\/08\/2026/);
  assert.equal(data.amount_due, "1.250.000 đ");
  assert.equal(data.tracking_url, "https://www.hoanglongtra.com/don-hang/7f4e4d50-9108-4b40-8f7d-6247ad3c9899");
});
