export const ORDER_STAGES = [
  {
    id: "new_order",
    number: "01",
    label: "Đơn mới",
    shortLabel: "Mới",
    nextAction: "Kiểm tra khách hàng, sản phẩm, số lượng và giá trước khi xác nhận.",
  },
  {
    id: "confirm_details",
    number: "02",
    label: "Xác nhận thông tin",
    shortLabel: "Xác nhận",
    nextAction: "Chốt địa chỉ, thanh toán, thời gian giao và yêu cầu riêng với khách.",
  },
  {
    id: "prepare_materials",
    number: "03",
    label: "Chuẩn bị trà",
    shortLabel: "Chuẩn bị",
    nextAction: "Giữ đủ trà, bao bì và nhãn cho toàn bộ đơn trước khi sản xuất.",
  },
  {
    id: "production",
    number: "04",
    label: "Sản xuất",
    shortLabel: "Sản xuất",
    nextAction: "Thực hiện phối, sao hoặc hoàn thiện mẻ theo đúng yêu cầu của đơn.",
  },
  {
    id: "packing",
    number: "05",
    label: "Đóng gói",
    shortLabel: "Đóng gói",
    nextAction: "Kiểm số lượng, nhãn, niêm phong và chụp kiện trước khi bàn giao.",
  },
  {
    id: "shipping",
    number: "06",
    label: "Giao hàng",
    shortLabel: "Đang giao",
    nextAction: "Lưu mã vận đơn và xác nhận kiện đã được đơn vị vận chuyển nhận.",
  },
  {
    id: "completed",
    number: "07",
    label: "Hoàn tất",
    shortLabel: "Hoàn tất",
    nextAction: "Đơn đã khép lại. Dùng lịch sử bên dưới nếu cần kiểm tra lại.",
  },
];

export const ORDER_STAGE_IDS = ORDER_STAGES.map((stage) => stage.id);

export const ORDER_HEALTH = [
  { id: "on_track", label: "Đang đúng tiến độ", shortLabel: "Đúng tiến độ" },
  { id: "waiting", label: "Đang chờ", shortLabel: "Đang chờ" },
  { id: "blocked", label: "Bị vướng", shortLabel: "Bị vướng" },
];

export const ORDER_HEALTH_IDS = ORDER_HEALTH.map((health) => health.id);

export const ORDER_WAITING_ON = [
  { id: "us", label: "Nhà Hoàng Long" },
  { id: "customer", label: "Khách hàng" },
  { id: "supplier", label: "Nhà cung cấp" },
  { id: "production", label: "Bộ phận sản xuất" },
  { id: "carrier", label: "Đơn vị vận chuyển" },
];

export const ORDER_WAITING_ON_IDS = ORDER_WAITING_ON.map((item) => item.id);

export function orderStageForStatus(status) {
  return {
    pending: "new_order",
    confirmed: "confirm_details",
    shipped: "shipping",
    completed: "completed",
  }[status] || "new_order";
}

export function statusForOrderStage(stage) {
  if (stage === "new_order") return "pending";
  if (stage === "shipping") return "shipped";
  if (stage === "completed") return "completed";
  return "confirmed";
}

export function orderStageMeta(stage) {
  return ORDER_STAGES.find((item) => item.id === stage) || ORDER_STAGES[0];
}

export function orderStageIndex(stage) {
  const index = ORDER_STAGE_IDS.indexOf(stage);
  return index < 0 ? 0 : index;
}
