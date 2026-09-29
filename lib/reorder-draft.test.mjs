import test from "node:test";
import assert from "node:assert/strict";
import { productKeyForOrderLine, reorderLinesFromOrder } from "./reorder-draft.js";

test("reorder keeps the old quantity and negotiated price for editing", () => {
  const source = { lines: [
    { productId: "tea-1", weight: "500g", name: { vi: "Trà xanh" }, qty: 25, price: 125000 },
    { productId: "tea-2", name: "Trà đen", qty: 10, price: null },
  ] };
  const lines = reorderLinesFromOrder(source, () => "new-line");
  assert.deepEqual(lines.map(({ productKey, qty, unitPrice }) => ({ productKey, qty, unitPrice })), [
    { productKey: "tea-1__500g", qty: 25, unitPrice: 125000 },
    { productKey: "tea-2", qty: 10, unitPrice: "" },
  ]);
  assert.notEqual(lines[0], source.lines[0]);
});

test("legacy items without a product ID stay visible for replacement", () => {
  const [line] = reorderLinesFromOrder({ lines: [{ name: "Trà cũ", qty: 5, price: 50000 }] }, () => "id");
  assert.equal(productKeyForOrderLine({ product_id: "tea-3", variant_weight: "1kg" }), "tea-3__1kg");
  assert.equal(line.productKey, "");
  assert.equal(line.sourceName, "Trà cũ");
});
