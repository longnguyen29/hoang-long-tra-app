import { calculateBusinessMetrics } from "./business-metrics.js";

export const growthMetrics = [
  { title: "Tài chính", metrics: [
    ["netRevenue", "Doanh thu thuần", "money", "Sổ chỉ số kinh doanh"],
    ["grossMargin", "Biên lợi nhuận gộp", "%", "Sổ chỉ số kinh doanh"],
    ["ebitda", "EBITDA", "money", "Sổ chỉ số kinh doanh"],
    ["cashCollected", "Tiền thu ghi trong app", "money", "Theo ngày ghi nhận thanh toán"],
  ] },
  { title: "Khách sỉ & mẫu thử", metrics: [
    ["prospects", "Cơ hội mới trong CRM", "count", "Theo ngày tạo hồ sơ"],
    ["sampleRequests", "Yêu cầu mẫu", "count", "Theo ngày nhận yêu cầu"],
    ["samplesSent", "Mẫu đã gửi", "count", "Có ngày gửi mẫu"],
    ["quotesSent", "Báo giá đã gửi", "count", "Có ngày gửi báo giá"],
    ["firstPaidBuyers", "Khách sỉ thanh toán lần đầu", "count", "Dựa trên lịch sử đã ghi đủ tiền"],
    ["repeatPaidBuyers", "Khách sỉ thanh toán đơn mua lại", "count", "Khách có đơn sỉ đã trả tiền trước đó"],
    ["activePaidBuyers", "Khách sỉ có đơn đã trả đủ", "count", "Mỗi khách đếm một lần"],
  ] },
  { title: "Đơn hàng & sản lượng", metrics: [
    ["orders", "Đơn tạo trong tháng", "count", "Gồm đơn đang xử lý và đã xong"],
    ["wholesaleOrders", "Đơn sỉ", "count", "Theo ngày tạo đơn"],
    ["retailOrders", "Đơn lẻ", "count", "Theo ngày tạo đơn"],
    ["completedOrders", "Đơn đã hoàn tất", "count", "Trạng thái hiện tại của đơn tạo trong tháng"],
    ["bookedValue", "Giá trị đơn có giá", "money", "Tổng giá trị dự kiến"],
    ["averageOrderValue", "Giá trị trung bình mỗi đơn có giá", "money", "Giá trị dự kiến chia số đơn đã có giá"],
    ["wholesaleKg", "Lượng trà đặt sỉ", "kg", "Theo khối lượng đã ghi trên đơn"],
  ] },
];

export const planningInputs = [
  ["leadToSample", "Cơ hội gửi được mẫu (%)", 100],
  ["sampleToFirst", "Mẫu thành khách trả tiền (%)", 100],
  ["firstToRepeat", "Khách mới mua lại trong 90 ngày (%)", 100],
  ["budget", "Ngân sách tìm khách (₫)", 1e12],
  ["firstOrderValue", "Giá trị đơn đầu trung bình (₫)", 1e12],
];
const metricLimits = { money: 1e15, "%": 100, count: 1e7, kg: 1e9 };
const targetLimits = Object.fromEntries(growthMetrics.flatMap(({ metrics }) => metrics.map(([key,,unit]) => [key, metricLimits[unit]])));
const assumptionLimits = Object.fromEntries(planningInputs.map(([key,,max]) => [key, max]));

export const localMonth = () => new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit",
}).format(new Date());

export function validateGrowthValues(values, type) {
  if (!values || typeof values !== "object" || Array.isArray(values)) return null;
  const limits = type === "targets" ? targetLimits : assumptionLimits;
  const entries = Object.entries(values);
  if (entries.some(([key, value]) => !Object.hasOwn(limits,key) || typeof value !== "number"
    || !Number.isFinite(value) || value < (key === "ebitda" || key === "grossMargin" ? -limits[key] : 0)
    || value > limits[key] || (targetLimits[key] === metricLimits.count && !Number.isInteger(value)))) return null;
  return Object.fromEntries(entries);
}

export function growthActual(row) {
  if (!row) return {};
  const report = calculateBusinessMetrics(row.financialInputs ?? {});
  return {
    ...row, netRevenue: report.values.netRevenue, grossMargin: report.grossMargin, ebitda: report.ebitda,
    averageOrderValue: row.bookedValue != null && row.knownOrderValues > 0 ? row.bookedValue / row.knownOrderValues : null,
  };
}

export function suggestedGrowthTargets(rows, increase = 10) {
  const goal = {};
  for (const { metrics } of growthMetrics) {
    for (const [key,,unit] of metrics) {
      const values = rows.map(row => growthActual(row)[key]).filter(Number.isFinite).sort((a,b) => a-b);
      if (values.length < 2) continue;
      const middle = Math.floor(values.length / 2);
      const base = values.length % 2 ? values[middle] : (values[middle - 1] + values[middle]) / 2;
      if (base <= 0) continue;
      const projection = (unit === "%" ? base : base * (1 + increase / 100));
      goal[key] = unit === "%" ? Math.round(projection * 10) / 10 : Math.round(projection);
    }
  }
  return goal;
}

export function growthFunnel(newBuyers, assumptions) {
  const buyers = newBuyers > 0 ? newBuyers : null;
  const samples = buyers !== null && assumptions.sampleToFirst > 0 ? Math.ceil(buyers * 100 / assumptions.sampleToFirst) : null;
  const prospects = samples !== null && assumptions.leadToSample > 0 ? Math.ceil(samples * 100 / assumptions.leadToSample) : null;
  return {
    buyers, samples, prospects,
    weeklyProspects: prospects == null ? null : prospects * 7 / (assumptions.daysInMonth || 30),
    repeats: buyers !== null && assumptions.firstToRepeat != null ? buyers * assumptions.firstToRepeat / 100 : null,
    firstOrderValue: buyers !== null && assumptions.firstOrderValue != null ? buyers * assumptions.firstOrderValue : null,
    budgetPerBuyer: buyers !== null && assumptions.budget != null ? assumptions.budget / buyers : null,
  };
}

export function growthPriority(actual, targets, comparable) {
  if (actual.netRevenue == null || actual.grossMargin == null) return {
    title: "Chốt doanh thu và giá vốn",
    detail: "Bổ sung số liệu tháng để biết mức tăng trưởng nào vẫn giữ được lợi nhuận.",
    href: "/admin/control?tab=metrics", action: "Mở chỉ số kinh doanh",
  };
  if (Number.isFinite(targets.grossMargin) && actual.grossMargin < targets.grossMargin) return {
    title: "Giữ biên gộp trước khi mở rộng",
    detail: "Xem lại SKU, chiết khấu, giá vốn và chi phí mẫu trước khi tăng ngân sách.",
    href: "/admin/operations/pricing", action: "Mở giá bán",
  };
  if (comparable && Number.isFinite(targets.prospects) && actual.prospects < targets.prospects) return {
    title: "Bổ sung cơ hội bán sỉ",
    detail: "Dẫn nội dung cho quán về trang chọn mẫu. Đếm cơ hội đủ thông tin trong CRM sau từng tuần.",
    href: "/admin/pipeline", action: "Mở CRM",
  };
  return {
    title: "Theo sát mẫu để có đơn đầu và đơn mua lại",
    detail: "Chọn nhóm khách đã nhận mẫu, ghi ngày hỏi lại và kết quả thử. Với khách đã mua, đặt lịch nhắc theo lượng dùng thực tế.",
    href: "/admin/pipeline", action: "Mở CRM",
  };
}
