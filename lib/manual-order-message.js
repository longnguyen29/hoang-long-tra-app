export const MANUAL_MESSAGE_KINDS = [
  { id: "shipping", label: "Đã gửi hàng" },
  { id: "delivered", label: "Giao thành công" },
  { id: "delivered_due", label: "Giao xong · còn thanh toán" },
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

export function buildManualOrderMessage({ order, kind, amountDue = 0, siteUrl = "https://www.hoanglongtra.com" }) {
  const orderId = String(order?.id || "").trim();
  const token = String(order?.publicTrackingToken || order?.public_tracking_token || "").trim();
  const trackingUrl = token ? `${siteUrl.replace(/\/$/, "")}/don-hang/${encodeURIComponent(token)}` : "";

  if (kind === "delivered_due" && Number(amountDue) > 0) {
    return `Hoàng Long xin báo đơn ${orderId} đã giao thành công. Số tiền còn lại là ${formatMessageMoney(amountDue)}. Quý khách có thể xem hành trình đơn, mã QR và thông tin chuyển khoản tại ${trackingUrl}. Nếu quý khách đã thanh toán, vui lòng bỏ qua tin nhắn này; Nhà sẽ cập nhật sau khi đối chiếu. Xin cảm ơn.`;
  }
  if (kind === "delivered") {
    return `Hoàng Long xin báo đơn ${orderId} đã giao thành công. Quý khách có thể xem lại thông tin đơn tại ${trackingUrl}. Cảm ơn quý khách đã lựa chọn Trà Hoàng Long.`;
  }
  return `Hoàng Long xin báo đơn ${orderId} đã được gửi. Quý khách có thể xem hành trình và thông tin đơn tại ${trackingUrl}. Cảm ơn quý khách.`;
}

export function makeSmsHref(phone, message, platform = "android") {
  const recipient = normalizeSmsPhone(phone);
  if (!recipient) return "";
  const separator = platform === "ios" ? "&" : "?";
  return `sms:${recipient}${separator}body=${encodeURIComponent(message)}`;
}
