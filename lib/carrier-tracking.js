export const SHIPPING_CARRIERS = [
  { id: "viettel_post", label: "Viettel Post" },
  { id: "vietnam_post", label: "Vietnam Post" },
];

export const SHIPPING_CARRIER_IDS = SHIPPING_CARRIERS.map((carrier) => carrier.id);

const DELIVERED_CODES = {
  viettel_post: new Set(["501"]),
  vietnam_post: new Set(["14", "109"]),
};

const WAITING_CODES = {
  viettel_post: new Set(["505", "506", "507"]),
  vietnam_post: new Set(["15", "23"]),
};

const BLOCKED_CODES = {
  viettel_post: new Set(["502", "503", "504", "515"]),
  vietnam_post: new Set(["19"]),
};

const STATUS_NAMES = {
  viettel_post: {
    "500": "Giao bưu tá đi phát",
    "501": "Phát thành công",
    "502": "Chuyển hoàn bưu cục gốc",
    "504": "Chuyển hoàn thành công",
    "505": "Yêu cầu chuyển hoàn",
    "506": "Phát thất bại",
    "507": "Khách hàng đến bưu cục nhận",
  },
  vietnam_post: {
    "12": "Đang giao hàng",
    "14": "Đã giao hàng",
    "15": "Giao không thành công",
    "19": "Trả hàng thành công",
    "23": "Giao hàng thành công một phần",
    "109": "EMI - Đã phát thành công",
  },
};

export function normalizeTrackingCode(value) {
  return String(value || "").trim().toUpperCase();
}

export function carrierLabel(carrier) {
  return SHIPPING_CARRIERS.find((item) => item.id === carrier)?.label || "Đơn vị vận chuyển";
}

export function defaultCarrierStatusName(carrier, statusCode) {
  const code = String(statusCode ?? "").trim();
  return STATUS_NAMES[carrier]?.[code] || `Trạng thái ${code}`;
}

export function carrierStatusEffect(carrier, statusCode) {
  const code = String(statusCode ?? "").trim();
  if (DELIVERED_CODES[carrier]?.has(code)) return "delivered";
  if (WAITING_CODES[carrier]?.has(code)) return "waiting";
  if (BLOCKED_CODES[carrier]?.has(code)) return "blocked";
  return "progress";
}

export function makeCarrierEventKey({ carrier, trackingCode, statusCode, statusAt, fallback }) {
  return [
    carrier,
    normalizeTrackingCode(trackingCode),
    String(statusCode ?? "").trim(),
    String(statusAt || fallback || "").trim(),
  ].join(":");
}

export function parseCarrierDate(value, fallback = new Date()) {
  if (!value) return fallback.toISOString();
  const direct = new Date(value);
  if (!Number.isNaN(direct.getTime())) return direct.toISOString();

  // Viettel Post examples use both ISO strings and dd/MM/yyyy HH:mm:ss.
  const match = String(value).trim().match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (!match) return fallback.toISOString();
  const [, day, month, year, hour = "0", minute = "0", second = "0"] = match;
  const parsed = new Date(`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:${minute}:${second}+07:00`);
  return Number.isNaN(parsed.getTime()) ? fallback.toISOString() : parsed.toISOString();
}
