export function productKeyForOrderLine(line) {
  const productId = line?.productId || line?.product_id || "";
  const weight = line?.weight || line?.variant_weight || "";
  return productId ? `${productId}${weight ? `__${weight}` : ""}` : "";
}

export function reorderLinesFromOrder(order, makeId) {
  if (!Array.isArray(order?.lines) || !order.lines.length) return [];
  return order.lines.map((line) => ({
    id: makeId(),
    productKey: productKeyForOrderLine(line),
    sourceName: typeof line.name === "string" ? line.name : line.name?.vi || line.name?.en || line.productId || "Sản phẩm cũ",
    qty: Number(line.qty) > 0 ? line.qty : 1,
    unitPrice: line.price === null || line.price === undefined ? "" : line.price,
  }));
}
