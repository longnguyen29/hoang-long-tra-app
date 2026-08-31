import {
  BarChart3, Beaker, ClipboardCheck, ClipboardList, FlaskConical,
  Handshake, Settings2, Sprout,
} from "lucide-react";

export const STAFF_APPS = {
  work: {
    key: "work", label: "Giao việc", short: "Giao việc", href: "/admin/work",
    description: "Giao việc một lần, tạo lịch lặp và xem ai đang bị vướng.", icon: ClipboardCheck,
  },
  orders: {
    key: "orders", label: "Đơn hàng", short: "Đơn hàng", href: "/admin/orders",
    description: "Tạo đơn, theo dõi giao hàng, công nợ và tin nhắn khách.", icon: ClipboardList,
  },
  pipeline: {
    key: "pipeline", label: "Khách hàng", short: "Khách hàng", href: "/admin/pipeline",
    description: "Một hồ sơ xuyên suốt từ mẫu thử, công thức, báo giá đến đơn hàng.", icon: Handshake,
  },
  operations: {
    key: "operations", label: "Vận hành", short: "Vận hành", href: "/admin/operations",
    description: "Sản xuất, lô trà, vật tư, tồn kho, chi phí, công nợ và ngân sách.", icon: BarChart3,
  },
  house: {
    key: "house", label: "Website & sản phẩm", short: "Website", href: "/admin/house",
    description: "Nội dung website, sản phẩm và câu chuyện đang hiển thị.", icon: Sprout,
  },
  recipes: {
    key: "recipes", label: "Công thức & R&D", short: "Công thức", href: "/admin/recipes?view=radar",
    description: "Radar món mới, lần pha thử, giá vốn mỗi ly và công thức đã chốt.", icon: Beaker,
  },
  control: {
    key: "control", label: "Báo cáo & thiết lập", short: "Thiết lập", href: "/admin/control",
    description: "Báo cáo tháng, ưu đãi, đánh giá, tài khoản nhận tiền và khôi phục dữ liệu.", icon: Settings2,
  },
  growth: {
    key: "growth", label: "Công cụ nội dung", short: "Công cụ", href: "/admin/growth",
    description: "Tạo, chấm và đo nội dung dẫn khách tới bộ mẫu cho quán.", icon: FlaskConical,
  },
};

export const STAFF_APP_GROUPS = [
  { label: "Hằng ngày", keys: ["work", "orders", "pipeline"] },
  { label: "Doanh nghiệp", keys: ["operations", "house"] },
  { label: "Công cụ", keys: ["recipes", "control", "growth"] },
];

export const STAFF_APP_LIST = STAFF_APP_GROUPS.flatMap((group) => group.keys.map((key) => STAFF_APPS[key]));
