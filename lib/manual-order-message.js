export const MANUAL_MESSAGE_KINDS = [
  { id: "shipping", label: "Đã gửi hàng" },
  { id: "delivered", label: "Đơn hoàn thành" },
  { id: "delivered_due", label: "Hoàn thành · còn thanh toán" },
];

export function normalizeSmsPhone(value) {
  const compact = String(value || "").replace(/[^\d+]/g, "");
  const match = compact.match(/(?:\+?84|0)\d{9}/)?.[0] || "";
  const digits = match.replace(/\D/g, "");
  if (/^84\d{9}$/.test(digits)) return `+${digits}`;
  if (/^0\d{9}$/.test(digits)) return `+84${digits.slice(1)}`;
  return "";
}

export function formatMessageMoney(value) {
  return `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(Number(value) || 0)} ₫`;
}

export function daysSinceOrderCompleted(order, now = new Date()) {
  const value = order?.deliveredAt || order?.delivered_at;
  if (!value) return null;
  const completedAt = new Date(value);
  const current = new Date(now);
  if (Number.isNaN(completedAt.getTime()) || Number.isNaN(current.getTime())) return null;
  return Math.max(0, Math.floor((current.getTime() - completedAt.getTime()) / 86_400_000));
}

function completedPhrase(order, now) {
  const days = daysSinceOrderCompleted(order, now);
  if (days === 0) return "đã hoàn thành hôm nay";
  if (days !== null) return `đã hoàn thành được ${days} ngày`;
  return "đã hoàn thành";
}

export function buildManualOrderMessage({ order, kind, amountDue = 0, siteUrl = "https://www.hoanglongtra.com", now = new Date() }) {
  const orderId = String(order?.id || "").trim();
  const token = String(order?.publicTrackingToken || order?.public_tracking_token || "").trim();
  const trackingUrl = token ? `${siteUrl.replace(/\/$/, "")}/don-hang/${encodeURIComponent(token)}` : "";
  const completion = completedPhrase(order, now);

  if (kind === "delivered_due" && Number(amountDue) > 0) {
    return `Hoàng Long xin báo đơn ${orderId} ${completion}. Số tiền còn lại của đơn là ${formatMessageMoney(amountDue)}. Quý khách kiểm tra thông tin đơn, mã QR và thông tin chuyển khoản tại ${trackingUrl}. Nếu quý khách đã thanh toán khoản này, vui lòng bỏ qua tin nhắn; Nhà sẽ cập nhật sau khi đối chiếu. Xin cảm ơn.`;
  }
  if (kind === "delivered") {
    return `Hoàng Long xin báo đơn ${orderId} ${completion}. Quý khách có thể kiểm tra lại thông tin đơn tại ${trackingUrl}. Cảm ơn quý khách đã lựa chọn Trà Hoàng Long.`;
  }
  return `Hoàng Long xin báo đơn ${orderId} đã được gửi. Quý khách có thể xem hành trình và thông tin đơn tại ${trackingUrl}. Cảm ơn quý khách.`;
}

export function makeSmsHref(phone, message, platform = "android") {
  const recipient = normalizeSmsPhone(phone);
  if (!recipient) return "";
  const separator = platform === "ios" ? "&" : "?";
  return `sms:${recipient}${separator}body=${encodeURIComponent(message)}`;
}
