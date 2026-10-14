import test from "node:test";
import assert from "node:assert/strict";
import { normalizePartnerOrderUpdate, partnerDateLabel, partnerOrderCommission, partnerOrderJourney, partnerQuoteStatusLabel, partnerSampleStatusLabel } from "./partner-order-journey.js";

test("own order progress reuses the real stage while waybill does not prove delivery or collection", () => {
  const result = partnerOrderJourney({ id: "test-order", stage: "packing", status: "shipped", health: "waiting", tracking_code: "TEST123", lines: [{ name: "Trà", qty: 5, unit: "kg", price: 123, secret: "private" }] });
  assert.equal(result.stage, "shipping");
  assert.equal(result.delivery.label, "Chờ cập nhật từ hãng");
  assert.equal(result.collectionComplete, false);
  assert.deepEqual(result.lines, [{ name: "Trà", qty: 5, unit: "kg" }]);
  assert.equal(result.quantity, "5 kg");
  assert.equal(result.deliveryDueAt, null);
  assert.equal(result.expectedPaymentOn, null);
  assert.equal(partnerOrderJourney({ lines: [{ name: "Trà", qty: null, unit: "kg" }] }).lines[0].qty, null);
  assert.equal(partnerOrderJourney({ lines: [{ name: "Trà", qty: null, unit: "kg" }] }).quantity, "");
});

test("delivery, operational completion and client payment retain separate truth", () => {
  const completed = partnerOrderJourney({ stage: "completed", status: "completed", collection_complete: false });
  assert.equal(completed.delivery.label, "Hoàn tất");
  assert.equal(completed.collectionComplete, false);
  const delivered = partnerOrderJourney({ stage: "shipping", status: "shipped", shipping_carrier: "vietnam_post", carrier_status_code: "14", collection_complete: true });
  assert.equal(delivered.delivery.label, "Đã giao hàng");
  assert.equal(delivered.collectionComplete, true);
});

test("planned delivery, forecast payout and paid date are distinct and not inferred", () => {
  const result = partnerOrderJourney({ ts: "2026-10-14T08:00:00Z", delivery_due_at: "2026-11-01T10:00:00Z", expected_payment_on: "2026-11-10", updated_at: "2026-10-16T08:00:00Z" });
  assert.equal(result.deliveryDueAt, "2026-11-01T10:00:00Z");
  assert.equal(result.expectedPaymentOn, "2026-11-10");
  assert.equal(result.lastUpdated, "2026-10-16T08:00:00Z");
  assert.equal(partnerOrderJourney({ next_action_at: "2026-11-01", estimated_total: 100000000 }).expectedPaymentOn, null);
  assert.equal(partnerDateLabel("2026-11-10"), "10/11/26");
  assert.equal(partnerDateLabel(null), "Chưa xác định");
});

test("commission unknowns stay unknown and forecasts do not become approved or paid", () => {
  assert.deepEqual(partnerOrderCommission({ forecast_amount: 750000 }), { forecast: 750000, provisional: null, approved: null, paid: null, paidAt: null, stale: false, status: null });
  const result = partnerOrderCommission({ forecast_amount: 450000 }, { eligible_amount: 500000, approved_amount: 500000, paid_amount: 500000, paid_at: "2026-10-20", status: "paid" });
  assert.equal(result.forecast, 450000);
  assert.equal(result.provisional, 500000);
  assert.equal(result.approved, 500000);
  assert.equal(result.paid, 500000);
  assert.equal(result.paidAt, "2026-10-20");
  assert.equal(partnerOrderCommission({}, { eligible_amount: null, current_amount: 999999 }).provisional, null);
});

test("stale recalculation never falsely becomes zero and keeps historical paid amount", () => {
  const result = partnerOrderCommission({}, { eligible_amount: 0, approved_amount: 450000, paid_amount: 450000, status: "paid", stale: true });
  assert.equal(result.provisional, null);
  assert.equal(result.approved, null);
  assert.equal(result.paid, 450000);
  assert.equal(partnerOrderCommission({}, { eligible_amount: null, status: "void" }).provisional, 0);
  assert.equal(partnerOrderCommission({ forecast_amount: 0 }, { eligible_amount: 0 }).forecast, 0);
});

test("manager updates are bounded, nullable and preserve explicit zero", () => {
  const input = { forecast_amount: "0", forecast_note: "Reviewed estimate", expected_payment_on: "2026-11-10", public_note: "Đã gửi mẫu", next_action: "Chờ phản hồi", reason: "New sample update" };
  const result = normalizePartnerOrderUpdate(input);
  assert.equal(result.forecast_amount, 0);
  assert.equal(result.expected_payment_on, "2026-11-10");
  assert.equal(normalizePartnerOrderUpdate({ ...input, forecast_amount: "", expected_payment_on: "" }).forecast_amount, null);
  assert.equal(normalizePartnerOrderUpdate({ ...input, expected_payment_on: "" }).expected_payment_on, null);
  assert.throws(() => normalizePartnerOrderUpdate({ ...input, forecast_note: " " }), /partner_forecast_note_required/);
  for (const forecast_amount of ["-1", "1.5", "1e5", "Infinity", 1000000000000, true]) assert.throws(() => normalizePartnerOrderUpdate({ ...input, forecast_amount }));
  for (const expected_payment_on of ["2026-02-30", "2026-11-10T10:00:00Z", "10/11/2026", "1899-12-31", "2101-01-01", 0]) assert.throws(() => normalizePartnerOrderUpdate({ ...input, expected_payment_on }));
  for (const invalid of [{ reason: " " }, { public_note: "x".repeat(501) }, { next_action: "x".repeat(161) }, { partner_id: "other" }, { internal_cost_total: 1 }]) assert.throws(() => normalizePartnerOrderUpdate({ ...input, ...invalid }));
});

test("sample and quote labels describe recorded events without asserting order success", () => {
  assert.equal(partnerSampleStatusLabel("sent"), "Đã gửi mẫu");
  assert.equal(partnerQuoteStatusLabel("accepted"), "Khách đã đồng ý báo giá");
  assert.equal(partnerQuoteStatusLabel("converted"), "Đã tạo đơn từ báo giá");
  assert.equal(partnerSampleStatusLabel("unknown"), "Đang xử lý mẫu");
});
