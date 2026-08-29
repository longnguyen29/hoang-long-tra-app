import { createHash } from "node:crypto";

export function normalizeVietnamPhone(value) {
  const compact = String(value || "").replace(/[^\d+]/g, "");
  const candidates = compact.match(/(?:\+?84|0)\d{9}/g) || [];
  for (const candidate of candidates) {
    const digits = candidate.replace(/\D/g, "");
    if (/^84\d{9}$/.test(digits)) return digits;
    if (/^0\d{9}$/.test(digits)) return `84${digits.slice(1)}`;
  }
  return "";
}
export function formatZaloMoney(value) {
  return `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(Number(value) || 0)} đ`;
}

export function formatZaloDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function makeZaloTrackingId(orderId, eventKey) {
  const digest = createHash("sha256").update(`${orderId}:${eventKey}`).digest("hex").slice(0, 20);
  return `HL${String(orderId || "ORDER").replace(/[^a-z0-9]/gi, "").slice(0, 20)}${digest}`.slice(0, 48);
}

// These names must be used verbatim when the two ZBS templates are submitted for approval.
export function buildDeliveryTemplateData(order, amountDue, siteUrl = "https://www.hoanglongtra.com") {
  const token = String(order.public_tracking_token || "").trim();
  return {
    customer_name: String(order.customer_name || "Quý khách").trim().slice(0, 100),
    order_code: String(order.id || "").trim().slice(0, 100),
    tracking_code: String(order.tracking_code || "").trim().slice(0, 100),
    delivered_at: formatZaloDate(order.delivered_at),
    amount_due: formatZaloMoney(amountDue),
    tracking_url: token ? `${siteUrl.replace(/\/$/, "")}/don-hang/${encodeURIComponent(token)}` : "",
  };
}
