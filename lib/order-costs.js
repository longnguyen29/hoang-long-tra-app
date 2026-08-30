export const ORDER_COST_CATEGORIES = [
  { id: "tea", label: "Trà / giá vốn" },
  { id: "packaging", label: "Bao bì, nhãn" },
  { id: "shipping", label: "Vận chuyển" },
  { id: "production", label: "Gia công" },
  { id: "labor", label: "Nhân công" },
  { id: "other", label: "Khác" },
];

export const ORDER_COST_STATUSES = [
  { id: "planned", label: "Dự kiến" },
  { id: "committed", label: "Đã cam kết" },
  { id: "paid", label: "Đã trả" },
];

export const ORDER_COST_CATEGORY_IDS = ORDER_COST_CATEGORIES.map((item) => item.id);
export const ORDER_COST_STATUS_IDS = ORDER_COST_STATUSES.map((item) => item.id);

export function orderCostAmount(cost) {
  return (Number(cost?.quantity) || 0) * (Number(cost?.unit_cost ?? cost?.unitCost) || 0);
}

export function orderEconomics(revenue, costs = []) {
  if (revenue === null || revenue === undefined || revenue === "") {
    return {
      revenue: null,
      costTotal: costs.reduce((total, cost) => total + orderCostAmount(cost), 0),
      grossProfit: null,
      marginPercent: null,
    };
  }
  const sellingTotal = Number(revenue);
  const costTotal = costs.reduce((total, cost) => total + orderCostAmount(cost), 0);
  if (!Number.isFinite(sellingTotal)) {
    return { revenue: null, costTotal, grossProfit: null, marginPercent: null };
  }
  const grossProfit = sellingTotal - costTotal;
  return {
    revenue: sellingTotal,
    costTotal,
    grossProfit,
    marginPercent: sellingTotal > 0 ? (grossProfit / sellingTotal) * 100 : null,
  };
}
