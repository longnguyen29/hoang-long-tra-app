import test from "node:test";
import assert from "node:assert/strict";
import { customerOrderStats, daysSinceOrder, formatQuantities } from "./customer-order-stats.js";

test("customer stats use local calendar days and require three orders for cadence", () => {
  assert.equal(daysSinceOrder("2026-09-28T16:30:00Z", new Date("2026-09-29T02:00:00Z")), 1);
  const history = [
    { id: "1", ts: "2026-09-01T02:00:00Z" },
    { id: "2", ts: "2026-09-11T02:00:00Z" },
    { id: "3", ts: "2026-09-29T02:00:00Z" },
  ];
  const orders = [
    { id: "1", lines: [{ qty: 10, unit: "kg" }] },
    { id: "2", lines: [{ qty: 20, unit: "kg" }, { qty: 2, unit: "pcs" }] },
    { id: "3", lines: [{ qty: 30, unit: "kg" }, { qty: 1, unit: "pcs" }] },
  ];
  const stats = customerOrderStats(history, orders, new Date("2026-09-29T02:00:00Z"));
  assert.equal(stats.daysSinceLastOrder, 0);
  assert.equal(stats.averageGapDays, 14);
  assert.deepEqual(stats.averageQuantities, { kg: 20, pcs: 1 });
  assert.deepEqual(stats.quantitiesById["2"], { kg: 20, pcs: 2 });
  assert.equal(formatQuantities(stats.averageQuantities), "20 kg · 1 sp");
  assert.equal(customerOrderStats(history.slice(0, 2), orders).averageGapDays, null);
});
