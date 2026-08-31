import test from "node:test";
import assert from "node:assert/strict";
import { buildCustomerJourney, buildJourneyQueue, relativeDueLabel } from "./customer-journey.js";

const now = new Date("2026-08-31T12:00:00+07:00");
const opportunity = {
  id: "opp-1", business_name: "Quán Một", contact: "+84 903 333 841", stage: "feedback",
  source_type: "sample", source_id: "sample-1", next_action: "Hỏi phản hồi", next_action_at: "2026-08-30T09:00:00+07:00",
  created_at: "2026-08-20T09:00:00+07:00", updated_at: "2026-08-30T09:00:00+07:00",
};

test("joins the complete customer journey by opportunity, contact, quote and partner", () => {
  const result = buildCustomerJourney({
    opportunity,
    now,
    samples: [{ id: "sample-1", phone: "0903333841", store_name: "Quán Một", pack: "4 trà", status: "sent", ts: "2026-08-25T09:00:00+07:00" }],
    recipes: [{ id: "recipe-1", opportunity_id: "opp-1", name: "Trà đào", purpose: "Menu hè", status: "approved", created_at: "2026-08-26T09:00:00+07:00", updated_at: "2026-08-27T09:00:00+07:00" }],
    recipeVersions: [{ id: "version-1", recipe_id: "recipe-1", version_number: 2, result: "pass", created_at: "2026-08-27T08:00:00+07:00" }],
    quotes: [{ id: "quote-1", opportunity_id: "opp-1", contact: "0903333841", status: "accepted", total: 1200000, accepted_at: "2026-08-28T09:00:00+07:00", created_at: "2026-08-27T09:00:00+07:00" }],
    partners: [{ id: "partner-1", opportunity_id: "opp-1", contact: "0903333841", reorder_cadence_days: 30 }],
    orders: [{ id: "order-1", quote_id: "quote-1", partner_account_id: "partner-1", contact: "0903333841", status: "completed", estimated_total: 1200000, ts: "2026-08-28T10:00:00+07:00", delivered_at: "2026-08-28T12:00:00+07:00" }],
    receivables: [{ id: "rec-1", order_id: "order-1", total: 1200000, paid: 200000, status: "partial", created_at: "2026-08-28T10:00:00+07:00", updated_at: "2026-08-28T10:00:00+07:00" }],
  });

  assert.deepEqual(result.counts, { samples: 1, recipes: 1, quotes: 1, orders: 1 });
  assert.ok(result.timeline.some((item) => item.id === "recipe-version:version-1"));
  assert.ok(result.timeline.some((item) => item.id === "delivery:order-1"));
  assert.ok(result.actions.some((item) => item.kind === "payment" && item.detail.includes("1.000.000")));
});

test("turns an approved recipe without a quote into the next commercial action", () => {
  const result = buildCustomerJourney({
    opportunity: { ...opportunity, next_action: "", next_action_at: null }, now,
    recipes: [{ id: "recipe-2", opportunity_id: "opp-1", name: "Shan mật sữa", status: "approved", updated_at: "2026-08-30T09:00:00+07:00" }],
  });
  assert.equal(result.actions[0].command, "create-quote");
  assert.match(result.actions[0].title, /Tạo báo giá/);
});

test("queue keeps only the most urgent action for each relationship", () => {
  const queue = buildJourneyQueue({
    opportunities: [opportunity, { ...opportunity, id: "opp-2", business_name: "Quán Hai", contact: "0911222333", next_action: "Gọi lại", next_action_at: "2026-08-31T09:00:00+07:00" }],
    now,
  });
  assert.equal(queue.length, 2);
  assert.equal(queue[0].opportunity.id, "opp-1");
});

test("formats due dates for a low-tech action label", () => {
  assert.equal(relativeDueLabel("2026-08-31T09:00:00+07:00", now), "Hôm nay");
  assert.equal(relativeDueLabel("2026-09-01T09:00:00+07:00", now), "Ngày mai");
  assert.equal(relativeDueLabel("2026-08-29T09:00:00+07:00", now), "Quá hạn 2 ngày");
});
