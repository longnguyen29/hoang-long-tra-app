import {
  Home, Feather, Handshake, ShoppingBag, Bell, Store,
  Mountain, Leaf, Phone, ShieldCheck, Palette,
} from "lucide-react";

export const TOKENS = {
  paper: "#F7F3EA",
  paperDeep: "#F4EEE1",
  jade: "#1C2B24",
  jadeSoft: "#2E4A40",
  brass: "#B08D57",
  brassDeep: "#AD8A4E",
  lacquer: "#9C3B2E",
};

export const ROLES = [
  { id: "wholesale", icon: Store, label: { en: "Wholesale", vi: "Khách sỉ" } },
  { id: "retail", icon: ShoppingBag, label: { en: "Retail", vi: "Khách lẻ" } },
];

export const NAV = [
  { id: "home", icon: Home, roles: ["admin", "wholesale", "retail"], label: { en: "The House", vi: "Trang chủ" } },
  { id: "wiki", icon: Feather, roles: ["admin", "wholesale", "retail"], label: { en: "Our Story", vi: "Câu chuyện" } },
  { id: "wholesale", icon: Handshake, roles: ["admin", "wholesale"], label: { en: "Trade Partners", vi: "Đối tác sỉ" } },
  { id: "retail", icon: ShoppingBag, roles: ["admin", "retail"], label: { en: "Tea Shop", vi: "Cửa hàng lẻ" } },
  { id: "frontdesk", icon: Bell, roles: ["admin"], label: { en: "Front Desk", vi: "Bàn tiếp nhận" } },
];

export const CATEGORIES = [
  {
    id: "legacy",
    icon: Feather,
    audience: ["admin", "wholesale", "retail"],
    label: { en: "Legacy & Founders", vi: "Câu chuyện thương hiệu" },
    subtitle: { en: "Who we are, why we started", vi: "Chúng tôi là ai, vì sao tồn tại" },
  },
  {
    id: "origin",
    icon: Mountain,
    audience: ["admin", "wholesale", "retail"],
    label: { en: "Origin & Craft", vi: "Nguồn gốc & Công nghệ" },
    subtitle: { en: "Ancient tea, Japanese processing", vi: "Trà cổ thụ Hà Giang, chế biến Nhật Bản" },
  },
  {
    id: "library",
    icon: Leaf,
    audience: ["admin", "wholesale", "retail"],
    label: { en: "Our Offering", vi: "Sản Vật Của Chúng Tôi" },
    subtitle: { en: "What we made with our leaves", vi: "Những gì chúng tôi làm ra từ búp trà" },
  },
  {
    id: "visit",
    icon: Phone,
    audience: ["admin", "wholesale", "retail"],
    label: { en: "Visit Us", vi: "Liên hệ" },
    subtitle: { en: "Hotline, showroom, factory", vi: "Hotline, showroom, xưởng" },
  },
  {
    id: "policies",
    icon: ShieldCheck,
    audience: ["admin", "wholesale", "retail"],
    label: { en: "Policies & FAQ", vi: "Chính sách & FAQ" },
    subtitle: { en: "Shipping, returns, quality", vi: "Giao hàng, đổi trả, chất lượng" },
  },
  {
    id: "brandkit",
    icon: Palette,
    audience: ["admin"],
    label: { en: "Brand Kit (internal)", vi: "Bộ nhận diện (nội bộ)" },
    subtitle: { en: "Colors, type, design rules", vi: "Màu sắc, font, quy chuẩn thiết kế" },
  },
];

export const PRICE_TIERS = [
  { min: 0, range: { en: "Under 200 kg", vi: "Dưới 200kg" }, off: { en: "Base price", vi: "Giá gốc" }, pct: 0 },
  { min: 200, range: { en: "200–499 kg", vi: "200–499kg" }, off: { en: "5% off", vi: "Giảm 5%" }, pct: 5 },
  { min: 500, range: { en: "500 kg – 1 tonne", vi: "500kg–1 tấn" }, off: { en: "10% off", vi: "Giảm 10%" }, pct: 10 },
  { min: 1000, range: { en: "1–10 tonnes", vi: "1–10 tấn" }, off: { en: "15% off", vi: "Giảm 15%" }, pct: 15 },
  { min: 10000, range: { en: "10–50 tonnes", vi: "10–50 tấn" }, off: { en: "25% off", vi: "Giảm 25%" }, pct: 25 },
  { min: 50000, range: { en: "50–100 tonnes", vi: "50–100 tấn" }, off: { en: "30% off", vi: "Giảm 30%" }, pct: 30 },
];

export const STATUS_STEPS = [
  { id: "pending", label: { en: "Pending", vi: "Chờ xác nhận" } },
  { id: "confirmed", label: { en: "Confirmed", vi: "Đã xác nhận" } },
  { id: "shipped", label: { en: "Shipped", vi: "Đang giao" } },
  { id: "completed", label: { en: "Completed", vi: "Hoàn tất" } },
];
