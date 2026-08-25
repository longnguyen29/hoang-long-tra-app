export const TRADE_STAGES = [
  { id: "lead", label: "Mới", short: "Lead" },
  { id: "sample_requested", label: "Chọn mẫu", short: "Mẫu" },
  { id: "sample_sent", label: "Đã gửi mẫu", short: "Đã gửi" },
  { id: "feedback", label: "Đang thử trà", short: "Phản hồi" },
  { id: "quoted", label: "Đã báo giá", short: "Báo giá" },
  { id: "won", label: "Đơn đầu tiên", short: "Đơn đầu" },
  { id: "active", label: "Đối tác định kỳ", short: "Định kỳ" },
];

export const QUOTE_STATUS = {
  draft: "Bản nháp",
  sent: "Đã gửi",
  accepted: "Đã đồng ý",
  declined: "Từ chối",
  expired: "Hết hạn",
  converted: "Đã thành đơn",
};

export const stageLabel = (stage) => TRADE_STAGES.find((item) => item.id === stage)?.label || (stage === "lost" ? "Tạm dừng" : stage);

export const normalizeContact = (value = "") => {
  const text = String(value).trim().toLowerCase();
  if (text.includes("@")) return text;
  const digits = text.replace(/\D/g, "");
  return digits.startsWith("84") ? `0${digits.slice(2)}` : digits || text;
};

export const dateInput = (offset = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
};

export const money = (value) => value
  ? new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(Number(value))
  : "Chưa báo giá";

export const shortDate = (value) => {
  if (!value) return "Chưa hẹn";
  const date = new Date(value.length === 10 ? `${value}T12:00:00` : value);
  return Number.isNaN(date.getTime()) ? "Chưa hẹn" : new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
};

export const quoteMessage = (quote) => {
  const lines = (quote.lines || []).map((line) => `• ${line.name?.vi || line.name?.en}: ${line.qty} ${line.unit} × ${money(line.price)}`);
  return [
    `HOUSE OF HOÀNG LONG — BÁO GIÁ ${quote.id}`,
    `Kính gửi ${quote.customer_name},`,
    "",
    ...lines,
    "",
    `Tổng dự kiến: ${money(quote.total)}`,
    quote.valid_until ? `Hiệu lực đến: ${shortDate(quote.valid_until)}` : "",
    quote.terms || "",
    "",
    "Hoàng Long",
  ].filter(Boolean).join("\n");
};
