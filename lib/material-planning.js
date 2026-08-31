const number = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
const keyFor = (productId, weight = "") => `${productId || ""}|${weight || ""}`;

export function orderMaterialDemand(orders = [], bom = []) {
  const componentsByProduct = bom.reduce((result, component) => {
    (result[keyFor(component.product_id, component.variant_weight)] ||= []).push(component);
    return result;
  }, {});
  const demand = {};
  orders
    .filter((order) => ["pending", "confirmed"].includes(order.status))
    .forEach((order) => (order.lines || []).forEach((line) => {
      const productId = line.productId || line.product_id;
      const weight = line.weight || line.variant_weight || "";
      (componentsByProduct[keyFor(productId, weight)] || []).forEach((component) => {
        const waste = 1 + number(component.waste_percent) / 100;
        demand[component.supply_item_id] = (demand[component.supply_item_id] || 0)
          + number(line.qty ?? line.quantity) * number(component.quantity_per_sale) * waste;
      });
    }));
  return demand;
}

export function buildPurchasePlan({ items = [], bom = [], orders = [] } = {}) {
  const demand = orderMaterialDemand(orders, bom);
  return items.map((item) => {
    const required = demand[item.id] || 0;
    const stock = number(item.stock_on_hand);
    const reorderPoint = number(item.reorder_point);
    const target = Math.max(reorderPoint, number(item.target_stock));
    const projected = stock - required;
    const needsOrder = projected <= reorderPoint;
    const suggested = needsOrder ? Math.max(0, target - projected) : 0;
    return {
      ...item,
      required,
      projected,
      suggested,
      suggestedCost: suggested * number(item.unit_cost),
      status: projected < 0 ? "short" : needsOrder ? "reorder" : "enough",
    };
  }).sort((left, right) => {
    const rank = { short: 0, reorder: 1, enough: 2 };
    return rank[left.status] - rank[right.status] || number(right.suggestedCost) - number(left.suggestedCost);
  });
}

export function bomCoverage(products = [], variants = [], bom = []) {
  const productRows = products.flatMap((product) => {
    const productVariants = variants.filter((variant) => variant.product_id === product.id);
    return productVariants.length
      ? productVariants.map((variant) => ({ product_id: product.id, variant_weight: variant.weight, name: product.name }))
      : [{ product_id: product.id, variant_weight: "", name: product.name }];
  });
  return productRows.map((row) => ({
    ...row,
    components: bom.filter((component) => component.product_id === row.product_id && (component.variant_weight || "") === row.variant_weight),
  }));
}
