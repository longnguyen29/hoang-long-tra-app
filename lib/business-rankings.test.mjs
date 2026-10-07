import test from "node:test";
import assert from "node:assert/strict";
import { calculateBusinessRankings, formatRankingQuantities } from "./business-rankings.js";

const order = (id, extra = {}) => ({ id, ts: "2026-10-07T03:00:00Z", status: "completed", customer_name: "Khách A", contact: "0903 333 841", estimated_total: 100000, lines: [{ productId: "tea-1", name: { vi: "Trà xanh" }, qty: 2, unit: "kg", price: 50000 }], ...extra });

test("completed default reconciles stage, groups tea variants and one phone, and counts orders once", () => {
  const result = calculateBusinessRankings([
    order("1", { stage: "shipping", lines: [{ productId: "tea-1", name: "Trà xanh", qty: 2, unit: "kg", price: 50000 }, { productId: "tea-1", name: "Trà xanh", weight: "500g", qty: 3, unit: "pcs", price: 20000 }] }),
    order("2", { contact: "+84 903 333 841", lines: [{ product_id: "tea-1", name: "Trà xanh", variant_weight: "200g", qty: 4, unit: "pack", price: 10000 }] }),
    order("3", { status: "pending", stage: "shipping" }),
    order("2", { contact: "+84 903 333 841" }),
  ]);
  assert.equal(result.summary.orderCount, 2);
  assert.equal(result.products.length, 1);
  assert.equal(result.products[0].orderCount, 2);
  assert.equal(result.products[0].lineCount, 3);
  assert.equal(result.products[0].value, 200000);
  assert.deepEqual(result.products[0].quantities, { kg: 2, pcs: 3, pack: 4 });
  assert.deepEqual(result.products[0].variants, ["500g", "200g"]);
  assert.equal(result.buyers.length, 1);
  assert.equal(result.buyers[0].orderCount, 2);
  assert.equal(result.buyers[0].value, 200000);
  assert.equal(result.period.basis, "order_creation_date");
});

test("unknown contacts never merge by name, emails normalize, explicit product IDs remain distinct", () => {
  const result = calculateBusinessRankings([
    order("1", { contact: "", lines: [{ productId: "tea-1", name: "Cùng tên", qty: 1, unit: "kg", price: 1 }] }),
    order("2", { contact: "không rõ", lines: [{ productId: "tea-2", name: "Cùng tên", qty: 1, unit: "kg", price: 1 }] }),
    order("3", { contact: "Buyer@Example.com" }),
    order("4", { contact: " buyer@example.com " }),
    order("5", { contact: "", partner_account_id: "partner-1" }),
    order("6", { contact: "", partnerAccountId: "partner-1" }),
  ], { limit: 20 });
  assert.equal(result.buyers.length, 4);
  assert.equal(result.summary.missingIdentityOrderCount, 2);
  assert.equal(result.buyers.filter((buyer) => buyer.identityKind === "unknown").length, 2);
  assert.equal(result.buyers.find((buyer) => buyer.identityKind === "email").orderCount, 2);
  assert.equal(result.buyers.find((buyer) => buyer.identityKind === "account").orderCount, 2);
  assert.equal(result.products.length, 2);
});

test("month/year/date filters use Vietnam creation dates and inclusive boundaries", () => {
  const orders = [
    order("before", { ts: "2026-09-30T16:59:59Z" }),
    order("start", { ts: "2026-09-30T17:00:00Z" }),
    order("end", { ts: "2026-10-31T16:59:59Z" }),
    order("after", { ts: "2026-10-31T17:00:00Z" }),
    order("old", { ts: "2025-10-07T03:00:00Z" }),
    order("bad", { ts: "bad" }),
  ];
  assert.equal(calculateBusinessRankings(orders, { month: "2026-10" }).summary.orderCount, 2);
  assert.equal(calculateBusinessRankings(orders, { fromDate: "2026-10-01", toDate: "2026-10-31" }).summary.orderCount, 2);
  assert.equal(calculateBusinessRankings(orders, { year: 2026 }).summary.orderCount, 4);
  assert.equal(calculateBusinessRankings(orders, { month: "2026-10" }).summary.excludedInvalidDateOrderCount, 1);
  assert.equal(calculateBusinessRankings(orders, { fromDate: "2026-02-30" }).period.invalid, true);
  assert.equal(calculateBusinessRankings(orders, { fromDate: "2026-11-01", toDate: "2026-10-01" }).summary.orderCount, 0);
});

test("zero values are known, missing/invalid amounts remain incomplete, and mapped fields work", () => {
  const result = calculateBusinessRankings([
    order("1", { estimated_total: null, lines: [{ productId: "tea-1", name: "Trà xanh", qty: "bad", unit: "kg", price: 50000 }] }),
    order("2", { estimated_total: 0, lines: [{ productId: "tea-1", name: "Trà xanh", qty: 2, unit: "kg", price: 0 }] }),
    order("3", { estimated_total: undefined, estimatedTotal: 200000, customer_name: undefined, customerName: "Tên mới", ts: "2026-10-08T03:00:00Z", lines: [{ productId: "tea-1", name: "Trà xanh", quantity: 2, unit: "kg", unitPrice: 100000 }] }),
    order("4", { contact: "", estimated_total: Infinity, lines: [{ name: "Trà thiếu giá", qty: 1, unit: "pack", price: null }] }),
  ]);
  assert.equal(result.summary.value, 200000);
  assert.equal(result.summary.missingValueCount, 2);
  const green = result.products.find((product) => product.productId === "tea-1");
  assert.equal(green.value, 200000);
  assert.equal(green.missingValueCount, 1);
  assert.equal(green.missingQuantityCount, 1);
  assert.deepEqual(green.quantities, { kg: 4 });
  const buyer = result.buyers.find((entry) => entry.identityKind === "phone");
  assert.equal(buyer.name, "Tên mới");
  assert.equal(buyer.lastOrderAt, "2026-10-08T03:00:00.000Z");
  assert.equal(buyer.missingValueCount, 1);
  assert.equal(result.products.find((product) => product.productId === null).value, null);
});

test("product line value is never fabricated by allocating discounted order totals", () => {
  const result = calculateBusinessRankings([order("1", { estimated_total: 80000, promo: { discount: 20000 } })]);
  assert.equal(result.products[0].value, 100000);
  assert.equal(result.buyers[0].value, 80000);
  assert.equal("revenue" in result.summary, false);
});

test("products rank by distinct order count, buyers by value, with explicit sort switches and limits", () => {
  const orders = [
    order("1", { contact: "0903333841", lines: [{ productId: "popular", name: "Trà thường", qty: 1, unit: "kg", price: 1 }] }),
    order("2", { contact: "0903333841", lines: [{ productId: "popular", name: "Trà thường", qty: 1, unit: "kg", price: 1 }] }),
    order("3", { contact: "0987654321", estimated_total: 500000, lines: [{ productId: "expensive", name: "Trà cao cấp", qty: 1, unit: "kg", price: 500000 }] }),
    order("4", { contact: "", estimated_total: null, lines: [{ productId: "unknown", name: "Trà chưa có giá", qty: 1, unit: "pack", price: null }] }),
  ];
  const result = calculateBusinessRankings(orders, { limit: 1 });
  assert.equal(result.products[0].productId, "popular");
  assert.equal(result.buyers[0].contact, "0987654321");
  const switched = calculateBusinessRankings(orders, { productSort: "value", buyerSort: "orderCount" });
  assert.equal(switched.products[0].productId, "expensive");
  assert.equal(switched.buyers[0].contact, "0903333841");
  assert.equal(switched.products.at(-1).value, null);
});

test("quantities keep explicit units and pack weights never invent kg; absent lines use known order totals", () => {
  const result = calculateBusinessRankings([
    order("1", { lines: [{ productId: "tea-1", name: "Trà xanh", qty: 10, unit: "pcs", weight: "500g", price: 1 }, { productId: "tea-1", name: "Trà xanh", qty: 3, unit: "gói", price: 1 }, { productId: "tea-1", name: "Trà xanh", qty: 250, unit: "g", price: 1 }, { productId: "tea-1", name: "Trà xanh", qty: 2, price: 1 }] }),
    order("2", { lines: [], total_kg: undefined, totalKg: 15, total_items: undefined, totalItems: 4 }),
    order("3", { status: "pending", contact: "0987654321" }),
  ]);
  assert.deepEqual(result.products[0].quantities, { pcs: 10, pack: 3, g: 250, unknown: 2 });
  assert.deepEqual(result.buyers[0].quantities, { pcs: 10, pack: 3, g: 250, unknown: 2, kg: 15, items: 4 });
  assert.equal(result.summary.missingLinesOrderCount, 1);
  assert.equal(result.summary.unknownUnitLineCount, 1);
  assert.equal(formatRankingQuantities(result.products[0].quantities), "10 sản phẩm · 3 gói · 250 g · 2 chưa rõ đơn vị");
  assert.equal(calculateBusinessRankings([order("open", { status: "pending" })], { scope: "all" }).summary.openOrderCount, 1);
});
