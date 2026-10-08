import {
  BarChart3, Beaker, ClipboardCheck, ClipboardList, FlaskConical,
  Handshake, Settings2, Sprout, Search, ListChecks, Network,
} from "lucide-react";

export const STAFF_APPS = {
  discovery: {
    key: "discovery", label: "Tìm khách hàng", short: "Tìm khách", href: "/admin/discovery",
    description: "Đọc nguồn công khai, phân loại và theo dõi khách hàng tiềm năng.", icon: Search,
  },
  work: {
    key: "work", label: "Giao việc", short: "Giao việc", href: "/admin/work",
    description: "Giao việc một lần, tạo lịch lặp và xem ai đang bị vướng.", icon: ClipboardCheck,
  },
  procedures: {
    key: "procedures", label: "Quy trình đơn B2B", short: "Quy trình", href: "/admin/procedures",
    description: "Việc cần làm, bằng chứng và điểm chặn trước khi giao đơn sỉ.", icon: ListChecks,
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
    description: "Chỉ số kinh doanh, EBITDA, báo cáo tháng, ưu đãi và thiết lập thanh toán.", icon: Settings2,
  },
  growth: {
    key: "growth", label: "Công cụ nội dung", short: "Công cụ", href: "/admin/growth",
    description: "Tạo, chấm và đo nội dung dẫn khách tới bộ mẫu cho quán.", icon: FlaskConical,
  },
  knowledge: {
    key: "knowledge", label: "Trung tâm kiến thức", short: "Kiến thức", href: "/admin/knowledge",
    description: "Kiến thức trà và kinh doanh, góc nội dung, bài đã làm và kết quả theo chủ đề.", icon: Network,
  },
};

export const STAFF_APP_GROUPS = [
  { label: "Hằng ngày", keys: ["work", "orders", "procedures", "pipeline"] },
  { label: "Doanh nghiệp", keys: ["discovery", "operations", "house"] },
  { label: "Phòng chuyên môn", keys: ["recipes", "knowledge", "control", "growth"] },
];

export const STAFF_APP_LIST = STAFF_APP_GROUPS.flatMap((group) => group.keys.map((key) => STAFF_APPS[key]));
