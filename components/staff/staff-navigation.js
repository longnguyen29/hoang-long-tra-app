import {
  BarChart3, Beaker, ClipboardCheck, ClipboardList, FlaskConical,
  Handshake, Settings2, Sprout, Search, ListChecks, Network, Files, BrainCircuit, Sparkles,
} from "lucide-react";

export const STAFF_APPS = {
  productDevelopment: {
    key: "productDevelopment", label: "Phát triển sản phẩm", short: "Phát triển", href: "/admin/product-development",
    description: "Ý tưởng, thông số, nguồn gia công và bước tiếp theo; liên kết catalog và kho hiện có.", icon: FlaskConical,
  },
  suppliers: {
    key: "suppliers", label: "Nguồn gia công", short: "Gia công", href: "/admin/suppliers",
    description: "Đầu mối, khả năng nhận trà Hoàng Long và theo dõi việc thẩm định.", icon: Handshake,
  },
  documents: {
    key: "documents", label: "Tài liệu công ty", short: "Tài liệu", href: "/admin/documents",
    description: "Soạn thỏa thuận đối tác, bảo mật và biên bản đối soát; in hoặc lưu PDF.", icon: Files,
  },
  partnerNetwork: {
    key: "partnerNetwork", label: "Đối tác giới thiệu", short: "Đối tác", href: "/admin/partner-network",
    description: "Duyệt đối tác, kiểm tra khách giới thiệu và đối soát hoa hồng theo tiền đã thu.", icon: Handshake,
  },
  customerMemory: {
    key: "customerMemory", label: "Trí nhớ khách hàng", short: "Trí nhớ", href: "/admin/customer-memory",
    description: "Lưu hội thoại Zalo và Messenger, nhớ khẩu vị, giá đã báo và đề xuất trả lời để duyệt.", icon: BrainCircuit,
  },
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
  assistant: {
    key: "assistant", label: "Trợ lý Hoàng Long", short: "Trợ lý", href: "/admin/assistant",
    description: "Đọc đoạn hội thoại để chuẩn bị đơn, việc cần làm và bản nháp trả lời.", icon: Sparkles,
  },
  knowledge: {
    key: "knowledge", label: "Trung tâm kiến thức", short: "Kiến thức", href: "/admin/knowledge",
    description: "Kiến thức trà và kinh doanh, góc nội dung, bài đã làm và kết quả theo chủ đề.", icon: Network,
  },
};

export const STAFF_APP_GROUPS = [
  { label: "Bán hàng", keys: ["orders", "pipeline", "customerMemory", "discovery", "partnerNetwork"] },
  { label: "Vận hành", keys: ["operations", "work", "procedures"] },
  { label: "Sản phẩm & phát triển", keys: ["house", "recipes", "productDevelopment", "suppliers"] },
  { label: "Nội dung & quản lý", keys: ["knowledge", "growth", "assistant", "documents", "control"] },
];

export const STAFF_APP_LIST = STAFF_APP_GROUPS.flatMap((group) => group.keys.map((key) => STAFF_APPS[key]));

export const STAFF_WORK_AREAS = [
  { id: "sales", label: "Bán hàng", icon: Handshake, links: [
    { module: "pipeline" }, { module: "orders" },
    { module: "orders", label: "Trang mua riêng", href: "/admin/orders/private" },
    { module: "customerMemory" }, { module: "discovery" }, { module: "partnerNetwork" },
    { module: "assistant" }, { module: "growth" },
  ] },
  { id: "operations", label: "Vận hành", icon: ClipboardCheck, links: [
    { module: "work" }, { module: "operations", label: "Kho & sản xuất" }, { module: "procedures" },
    { module: "recipes" }, { module: "productDevelopment" }, { module: "suppliers" },
    { module: "knowledge" }, { module: "documents" },
  ] },
  { id: "finance", label: "Tài chính", icon: BarChart3, links: [
    { module: "operations", label: "Công nợ", href: "/admin/operations?tab=finance" },
    { module: "operations", label: "Giá vốn & định giá", href: "/admin/operations/pricing" },
    { module: "operations", label: "Chi phí", href: "/admin/operations/expenses" },
    { module: "operations", label: "Ngân sách", href: "/admin/operations/budget" },
    { module: "control", label: "Báo cáo kinh doanh", href: "/admin/control?tab=reports" },
    { module: "control", label: "Thanh toán", href: "/admin/control?tab=payment" },
  ] },
  { id: "system", label: "Quản trị hệ thống", icon: Settings2, links: [
    { module: "house" },
    { module: "control", label: "Tích hợp & kết nối", href: "/admin/control?tab=connections" },
    { label: "Quyền thành viên", href: "/admin/team-access", accessAdminOnly: true },
    { label: "Xem website", href: "/", external: true },
  ] },
];

export function visibleStaffWorkAreas(allowedModules, partnerNetworkEnabled, canManageAccess) {
  return STAFF_WORK_AREAS.map(area => ({
    ...area,
    links: area.links.filter(item => {
      if (item.accessAdminOnly) return canManageAccess;
      if (!item.module) return allowedModules === null;
      return (allowedModules === null || allowedModules.includes(item.module)) &&
        (item.module !== "partnerNetwork" || partnerNetworkEnabled);
    }).map(item => ({ ...STAFF_APPS[item.module], ...item })),
  })).filter(area => area.links.length);
}

export function activeStaffWorkLink(areas, pathname, search) {
  const actualTab = search.get("tab") || (pathname === "/admin/control" ? "reports" : null);
  const items = areas.flatMap(area => area.links.map(item => ({ ...item, area: area.id })));
  const candidates = items.filter(item => {
    if (item.external) return false;
    const [path, query] = item.href.split("?");
    if (query?.startsWith("tab=")) return pathname === path && actualTab === query.slice(4);
    return pathname === path || pathname.startsWith(path + "/");
  });
  return candidates.sort((a, b) => b.href.length - a.href.length)[0];
}
