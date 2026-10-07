import { reconcileOrderStage } from "./order-flow.js";

// VND inputs above this ceiling are almost certainly an input/unit error.
export const MAX_METRIC_AMOUNT = 1_000_000_000_000_000;

export const METRIC_FIELDS = [
  { key: "netRevenue", label: "Doanh thu thuần", group: "operations", help: "Doanh thu ghi nhận trong tháng, đã trừ giảm giá, hàng trả lại và VAT. Không tự lấy giá trị đơn hàng làm doanh thu." },
  { key: "costOfGoodsSold", label: "Giá vốn hàng bán", group: "operations", help: "Giá vốn tương ứng với doanh thu đã ghi nhận: trà, bao bì, gia công… Hàng mua về chưa bán vẫn là tồn kho, chưa tính vào giá vốn. Không gồm khấu hao/phân bổ, lãi vay và thuế thu nhập trong bản tính này." },
  { key: "operatingExpenses", label: "Chi phí vận hành", group: "operations", help: "Chi phí bán hàng, quản lý, lương, thuê mặt bằng… Không tính lại giá vốn; không gồm khấu hao/phân bổ, lãi vay và thuế thu nhập." },
  { key: "otherIncome", label: "Thu nhập khác", group: "other", help: "Thu nhập khác được ghi nhận trong tháng. Nhập 0 nếu không có; không tính lại doanh thu thuần." },
  { key: "otherExpenses", label: "Chi phí khác", group: "other", help: "Chi phí khác được ghi nhận trong tháng, chưa nằm trong giá vốn hoặc vận hành; không gồm khấu hao/phân bổ, lãi vay và thuế thu nhập." },
  { key: "depreciationAmortization", label: "Khấu hao & phân bổ", group: "finance", help: "Khấu hao tài sản và phân bổ trong tháng. Nhập riêng để tính EBIT, tránh tính trùng trong giá vốn/vận hành." },
  { key: "interestExpense", label: "Chi phí lãi vay", group: "finance", help: "Lãi vay của tháng; không gồm tiền trả nợ gốc. Nhập 0 nếu không có." },
  { key: "incomeTax", label: "Thuế thu nhập", group: "finance", help: "Chi phí thuế thu nhập của tháng; không gồm VAT. Nhập 0 nếu không phát sinh." },
];

export function emptyMetricInputs() {
  return Object.fromEntries(METRIC_FIELDS.map(({ key }) => [key, ""]));
}

function knownAmount(value) {
  if (value === null || value === undefined || (typeof value === "string" && !value.trim())) return null;
  if (typeof value !== "number" && typeof value !== "string") return null;
  // Avoid interpreting non-decimal strings (e.g. hexadecimal) as business input.
  if (typeof value === "string" && !/^[+]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(value.trim())) return null;
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 && amount <= MAX_METRIC_AMOUNT ? amount : null;
}

export function normalizeMetricInputs(inputs = {}) {
  const values = {};
  const errors = {};
  for (const { key } of METRIC_FIELDS) {
    const input = inputs?.[key];
    values[key] = knownAmount(input);
    const blank = input === null || input === undefined || (typeof input === "string" && !input.trim());
    if (!blank && values[key] === null) errors[key] = "Nhập số tiền VND không âm, tối đa 1.000.000.000.000.000.";
  }
  return { values, errors };
}

const DEPENDENCIES = {
  grossProfit: ["netRevenue", "costOfGoodsSold"],
  operatingBeforeDA: ["netRevenue", "costOfGoodsSold", "operatingExpenses"],
  ebitda: ["netRevenue", "costOfGoodsSold", "operatingExpenses", "otherIncome", "otherExpenses"],
  ebit: ["netRevenue", "costOfGoodsSold", "operatingExpenses", "otherIncome", "otherExpenses", "depreciationAmortization"],
  profitBeforeTax: ["netRevenue", "costOfGoodsSold", "operatingExpenses", "otherIncome", "otherExpenses", "depreciationAmortization", "interestExpense"],
  netIncome: METRIC_FIELDS.map(({ key }) => key),
};

export function calculateBusinessMetrics(inputs = {}) {
  const { values, errors } = normalizeMetricInputs(inputs);
  const missing = METRIC_FIELDS.map(({ key }) => key).filter((key) => values[key] === null);
  const missingByMetric = Object.fromEntries(Object.entries(DEPENDENCIES).map(([metric, keys]) => [metric, keys.filter((key) => values[key] === null)]));
  const calculate = (key, formula) => missingByMetric[key].length ? null : formula();
  const grossProfit = calculate("grossProfit", () => values.netRevenue - values.costOfGoodsSold);
  const operatingBeforeDA = calculate("operatingBeforeDA", () => grossProfit - values.operatingExpenses);
  const ebitda = calculate("ebitda", () => operatingBeforeDA + values.otherIncome - values.otherExpenses);
  const ebit = calculate("ebit", () => ebitda - values.depreciationAmortization);
  const profitBeforeTax = calculate("profitBeforeTax", () => ebit - values.interestExpense);
  const netIncome = calculate("netIncome", () => profitBeforeTax - values.incomeTax);
  const margin = (profit) => profit !== null && values.netRevenue > 0 ? (profit / values.netRevenue) * 100 : null;
  return {
    values, errors, missing, missingByMetric,
    grossProfit, operatingBeforeDA, ebitda, ebit, profitBeforeTax, netIncome,
    grossMargin: margin(grossProfit), ebitdaMargin: margin(ebitda), netMargin: margin(netIncome),
  };
}

const monthFormatter = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit" });

function localMonth(value) {
  if (value === null || value === undefined || value === "") return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  const parts = monthFormatter.formatToParts(date);
  return `${parts.find(({ type }) => type === "year").value}-${parts.find(({ type }) => type === "month").value}`;
}

function orderKg(order) {
  const total = knownAmount(order.total_kg !== undefined ? order.total_kg : order.totalKg);
  if (total !== null) return total;
  // Older retail orders have no total_kg; derive only explicitly weighted lines.
  const weighted = (Array.isArray(order.lines) ? order.lines : []).filter((line) => ["kg", "g", "ton", "tons", "t"].includes(String(line?.unit || "").toLowerCase()));
  if (!weighted.length) return null;
  let quantity = 0;
  for (const line of weighted) {
    const amount = knownAmount(line.qty ?? line.quantity);
    if (amount === null) return null;
    const unit = String(line.unit).toLowerCase();
    quantity += amount * (unit === "g" ? 0.001 : ["ton", "tons", "t"].includes(unit) ? 1000 : 1);
  }
  return Number.isFinite(quantity) && quantity <= Number.MAX_SAFE_INTEGER ? quantity : null;
}

function knownSum(values) {
  if (!values.length) return null;
  const sum = values.reduce((total, value) => total + value, 0);
  return Number.isFinite(sum) && sum <= Number.MAX_SAFE_INTEGER ? sum : null;
}

// These are order-book indicators, never an accounting revenue source. A completed
// order remains in its creation-month cohort, even if delivered in a later month.
export function calculateOrderIndicators(rawRows = [], month) {
  const validMonth = typeof month === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(month);
  const orders = validMonth ? (Array.isArray(rawRows) ? rawRows : []).filter((order) => order && localMonth(order.ts) === month) : [];
  const completed = orders.filter((order) => reconcileOrderStage(order.stage, order.status) === "completed");
  const orderAmount = (order) => knownAmount(order.estimated_total !== undefined ? order.estimated_total : order.estimatedTotal);
  const amounts = orders.map(orderAmount);
  const completedAmounts = completed.map(orderAmount);
  const quantities = orders.map(orderKg);
  const knownValues = amounts.filter((value) => value !== null);
  const completedKnownValues = completedAmounts.filter((value) => value !== null);
  const knownQuantities = quantities.filter((value) => value !== null);
  const bookedValue = knownSum(knownValues);
  return {
    month, invalidMonth: !validMonth,
    count: orders.length, openCount: orders.length - completed.length, completedCount: completed.length,
    bookedValue, countKnownValue: knownValues.length, countMissingValue: orders.length - knownValues.length,
    completedValue: knownSum(completedKnownValues), completedCountMissingValue: completed.length - completedKnownValues.length,
    knownKg: knownSum(knownQuantities), countKnownKg: knownQuantities.length, countMissingKg: orders.length - knownQuantities.length,
    averageKnownOrderValue: bookedValue !== null && knownValues.length ? bookedValue / knownValues.length : null,
  };
}
