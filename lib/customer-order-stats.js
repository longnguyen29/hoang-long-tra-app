const DAY_MS = 86_400_000;

function calendarDay(value, timeZone) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  const part = (type) => Number(parts.find((item) => item.type === type)?.value);
  return Date.UTC(part("year"), part("month") - 1, part("day"));
}

export function daysSinceOrder(value, now = new Date(), timeZone = "Asia/Ho_Chi_Minh") {
  const orderDay = calendarDay(value, timeZone);
  const today = calendarDay(now, timeZone);
  return orderDay === null || today === null ? null : Math.max(0, Math.round((today - orderDay) / DAY_MS));
}

function orderQuantities(order) {
  const totals = {};
  if (Array.isArray(order?.lines) && order.lines.length) {
    for (const line of order.lines) {
      const qty = Number(line.qty ?? line.quantity);
      if (!Number.isFinite(qty) || qty <= 0) continue;
      const unit = String(line.unit || "pcs").trim().toLowerCase();
      totals[unit] = (totals[unit] || 0) + qty;
    }
  } else {
    const kg = Number(order?.kg ?? order?.totalKg);
    const items = Number(order?.items ?? order?.totalItems);
    if (Number.isFinite(kg) && kg > 0) totals.kg = kg;
    if (Number.isFinite(items) && items > 0) totals.pcs = items;
  }
  return totals;
}

export function customerOrderStats(history = [], fullOrders = [], now = new Date()) {
  const byId = new Map(fullOrders.map((order) => [order.id, order]));
  const timestamps = history.map((order) => calendarDay(order.ts, "Asia/Ho_Chi_Minh")).filter((day) => day !== null).sort((a, b) => a - b);
  const lastOrder = timestamps.length ? timestamps.at(-1) : null;
  const averageGapDays = timestamps.length >= 3
    ? Math.round(((lastOrder - timestamps[0]) / DAY_MS / (timestamps.length - 1)) * 10) / 10
    : null;
  const quantityTotals = {};
  const quantitiesById = {};
  for (const item of history) {
    const quantities = orderQuantities(byId.get(item.id) || item);
    quantitiesById[item.id] = quantities;
    for (const [unit, qty] of Object.entries(quantities)) {
      quantityTotals[unit] = (quantityTotals[unit] || 0) + qty;
    }
  }
  const averageQuantities = Object.fromEntries(Object.entries(quantityTotals).map(([unit, qty]) => [unit, qty / history.length]));
  return {
    daysSinceLastOrder: lastOrder === null ? null : daysSinceOrder(lastOrder, now),
    averageGapDays,
    averageQuantities,
    quantitiesById,
  };
}

export function formatQuantities(quantities) {
  const units = { kg: "kg", pcs: "sp", pack: "gói", g: "g" };
  return Object.entries(quantities || {})
    .filter(([, qty]) => Number.isFinite(qty) && qty > 0)
    .map(([unit, qty]) => `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(qty)} ${units[unit] || unit}`)
    .join(" · ") || "Chưa ghi số lượng";
}
