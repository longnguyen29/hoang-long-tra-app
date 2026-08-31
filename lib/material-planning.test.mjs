import test from "node:test";
import assert from "node:assert/strict";
import { bomCoverage, buildPurchasePlan, orderMaterialDemand } from "./material-planning.js";

const bom = [
  { product_id: "tea-1", variant_weight: "500g", supply_item_id: "bag", quantity_per_sale: 1, waste_percent: 5 },
  { product_id: "tea-1", variant_weight: "500g", supply_item_id: "label", quantity_per_sale: 1, waste_percent: 0 },
];

test("turns open order lines into material demand including waste", () => {
  const demand = orderMaterialDemand([
    { status: "confirmed", lines: [{ productId: "tea-1", weight: "500g", qty: 10 }] },
    { status: "completed", lines: [{ productId: "tea-1", weight: "500g", qty: 100 }] },
  ], bom);
  assert.equal(demand.bag, 10.5);
  assert.equal(demand.label, 10);
});

test("recommends enough purchasing to cover orders and restore target stock", () => {
  const plan = buildPurchasePlan({
    items: [{ id: "bag", name: "Túi zipper", stock_on_hand: 8, reorder_point: 5, target_stock: 30, unit_cost: 3830 }],
    bom,
    orders: [{ status: "pending", lines: [{ productId: "tea-1", weight: "500g", qty: 10 }] }],
  });
  assert.equal(plan[0].status, "short");
  assert.equal(plan[0].suggested, 32.5);
  assert.equal(plan[0].suggestedCost, 124475);
});

test("shows which sellable variants still have no BOM", () => {
  const rows = bomCoverage([{ id: "tea-1", name: { vi: "Hồng trà" } }], [
    { product_id: "tea-1", weight: "500g" },
    { product_id: "tea-1", weight: "1kg" },
  ], bom);
  assert.equal(rows[0].components.length, 2);
  assert.equal(rows[1].components.length, 0);
});
