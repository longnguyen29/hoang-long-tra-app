const display = (value) => String(value ?? "").replace(/\s+/g, " ").trim() || "—";
const number = (value) => Number(value).toLocaleString("vi-VN", { maximumFractionDigits: 3 });

function teaName(line) {
  const name = line?.name || line?.productName || line?.product_name;
  if (typeof name === "string" && name.trim()) return display(name);
  return display(name?.vi || name?.en || line?.productId || line?.product_id || "Trà chưa rõ tên");
}

export function orderTelegramMessage(order) {
  const lines = Array.isArray(order?.lines) ? order.lines : [];
  const teaLines = lines.length
    ? lines.map((line) => {
        const qty = Number(line.qty ?? line.quantity ?? 0);
        const unit = line.unit === "kg" ? "kg" : line.unit === "pack" ? "gói" : "sp";
        const weight = line.weight || line.variant_weight;
        return `• ${teaName(line)}${weight ? ` (${display(weight)})` : ""}: ${number(qty)} ${unit}`;
      })
    : ["• Chưa ghi sản phẩm"];
  const totalKg = Number(order?.total_kg);
  return [
    order?.reorder_of_order_id ? "🔁 ĐƠN ĐẶT LẠI" : "🍃 ĐƠN HÀNG MỚI",
    `Mã: ${display(order?.id)}`,
    order?.reorder_of_order_id ? `Từ đơn: ${display(order.reorder_of_order_id)}` : null,
    `Loại: ${order?.type === "retail" ? "Đơn lẻ" : "Đơn sỉ"}`,
    `Khách: ${display(order?.customer_name)}`,
    `Điện thoại/liên hệ: ${display(order?.contact)}`,
    `Địa chỉ giao: ${display(order?.address)}`,
    "Trà và số lượng:",
    ...teaLines,
    Number.isFinite(totalKg) && totalKg > 0 ? `Tổng: ${number(totalKg)} kg` : null,
    Number.isFinite(Number(order?.estimated_total)) && order?.estimated_total != null
      ? `Giá trị dự kiến: ${Number(order.estimated_total).toLocaleString("vi-VN")}đ`
      : null,
  ].filter(Boolean).join("\n").slice(0, 4000);
}
