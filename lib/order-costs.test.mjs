import assert from "node:assert/strict";
import test from "node:test";
import { orderCostAmount, orderEconomics } from "./order-costs.js";

test("calculates a cost from quantity and unit cost", () => {
  assert.equal(orderCostAmount({ quantity: 3, unit_cost: 12_500 }), 37_500);
});

test("calculates gross profit and selling margin", () => {
  const result = orderEconomics(1_000_000, [
    { quantity: 2, unit_cost: 200_000 },
    { quantity: 5, unit_cost: 10_000 },
  ]);
  assert.equal(result.revenue, 1_000_000);
  assert.equal(result.costTotal, 450_000);
  assert.equal(result.grossProfit, 550_000);
  assert.ok(Math.abs(result.marginPercent - 55) < Number.EPSILON * 100);
});

test("keeps costs visible when an order is not fully priced", () => {
  assert.deepEqual(orderEconomics(null, [{ quantity: 1, unit_cost: 80_000 }]), {
    revenue: null,
    costTotal: 80_000,
    grossProfit: null,
    marginPercent: null,
  });
});
