import assert from "node:assert/strict";
import test from "node:test";
import {
  buildSmsPaymentReminder,
  receivableBalance,
  smsReminderEligibility,
} from "./sms-payment-reminders.js";
import { encryptSmsGatewayField, readSmsGatewayConfig } from "./sms-gateway.js";

const now = new Date("2026-08-31T03:00:00.000Z");
const order = {
  id: "HL-100",
  status: "completed",
  stage: "completed",
  contact: "0903333841",
  delivered_at: "2026-08-28T02:59:00.000Z",
  public_tracking_token: "public-token",
};

test("paid receivables are never eligible", () => {
  const receivable = { total: 500_000, paid: 500_000, status: "paid" };
  assert.equal(receivableBalance(receivable), 0);
  assert.deepEqual(smsReminderEligibility({ order, receivable, now }), {
    eligible: false,
    reason: "paid_or_closed",
    amountDue: 0,
  });
});
test("completed orders with a balance become eligible after three days", () => {
  const result = smsReminderEligibility({ order, receivable: { total: 500_000, paid: 100_000, status: "partial" }, now });
  assert.equal(result.eligible, true);
  assert.equal(result.amountDue, 400_000);
  assert.equal(result.phone, "+84903333841");
});

test("reminder copy contains balance and public link", () => {
  const text = buildSmsPaymentReminder({ order, amountDue: 400_000, now });
  assert.match(text, /400\.000 ₫/);
  assert.match(text, /\/don-hang\/public-token/);
  assert.match(text, /vui lòng bỏ qua tin nhắn/i);
});

test("gateway configuration fails closed without the encryption passphrase", () => {
  const config = readSmsGatewayConfig({
    SMS_GATEWAY_USERNAME: "user",
    SMS_GATEWAY_PASSWORD: "secret",
    SMS_GATEWAY_DEVICE_ID: "device",
  });
  assert.equal(config.ready, false);
  assert.deepEqual(config.missing, ["SMS_GATEWAY_ENCRYPTION_PASSPHRASE"]);
});

test("gateway field encryption follows the SMSGate envelope", () => {
  const encrypted = encryptSmsGatewayField("Hoàng Long", "correct horse battery staple", 1000);
  assert.match(encrypted, /^\$aes-256-cbc\/pbkdf2-sha1\$i=1000\$[^$]+\$[^$]+$/);
  assert.doesNotMatch(encrypted, /Hoàng Long/);
});
