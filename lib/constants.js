import {
  Home, Feather, Handshake, ShoppingBag, Bell, Store, Library, BookMarked,
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
  // Premium/zen surface system: hairline borders + soft elevation instead of heavy colored boxes.
  hairline: "rgba(173,138,78,0.16)",
  shadowSm: "0 1px 2px rgba(28,43,36,0.04)",
  shadowMd: "0 2px 8px rgba(28,43,36,0.06)",
  shadowLg: "0 8px 28px rgba(28,43,36,0.10)",
  radius: 16,
};

export const CARD_SURFACE = {
  background: TOKENS.paper,
  border: `1px solid ${TOKENS.hairline}`,
  borderRadius: TOKENS.radius,
  boxShadow: TOKENS.shadowSm,
};

export const ROLES = [
  { id: "wholesale", icon: Store, label: { en: "Wholesale", vi: "Khách sỉ" } },
  { id: "retail", icon: ShoppingBag, label: { en: "Retail", vi: "Khách lẻ" } },
];

export const NAV = [
  { id: "home", icon: Home, roles: ["admin", "wholesale", "retail"], label: { en: "The House", vi: "Trang chủ" } },
  { id: "wiki", icon: Feather, roles: ["admin", "wholesale", "retail"], label: { en: "Our Story", vi: "Câu chuyện" } },
  { id: "library", icon: Library, roles: ["admin", "wholesale", "retail"], label: { en: "Library", vi: "Thư Viện Trà" } },
  { id: "wholesale", icon: Handshake, roles: ["admin", "wholesale"], label: { en: "House Partners", vi: "Đối tác sỉ" } },
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

// Library — general tea knowledge (not brand story). Same drill-down pattern as Our Story,
// kept separate and read-only for now (no admin edit UI yet — see build brief v2.0 §2).
export const LIBRARY_CATEGORIES = [
  {
    id: "types",
    icon: Leaf,
    label: { en: "The Six Tea Types", vi: "Sáu Loại Trà Cơ Bản" },
    subtitle: { en: "What separates green from black, white from dark", vi: "Điều gì phân biệt trà xanh, trà đen, bạch trà, hắc trà" },
  },
  {
    id: "vietnam",
    icon: Mountain,
    label: { en: "Vietnamese Tea Culture", vi: "Văn Hoá Trà Việt" },
    subtitle: { en: "A tradition older than most realize", vi: "Một truyền thống lâu đời hơn nhiều người nghĩ" },
  },
  {
    id: "brewing",
    icon: BookMarked,
    label: { en: "Brewing Science", vi: "Khoa Học Pha Trà" },
    subtitle: { en: "Temperature, time, and how to describe what you taste", vi: "Nhiệt độ, thời gian, và cách mô tả hương vị" },
  },
  {
    id: "wellbeing",
    icon: ShieldCheck,
    label: { en: "Tea & Wellbeing", vi: "Trà & Sức Khoẻ" },
    subtitle: { en: "What's actually in the leaf", vi: "Thực sự có gì trong búp trà" },
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

// Rough brewing yield per kg of dry leaf, based on common Vietnamese HORECA steeping ratios
// (light iced tea ~1:80–100, standard ~1:50–60, concentrated milk-tea/cold-brew base ~1:25–35).
// General guideline only — actual yield depends on steeping method and recipe.
export const YIELD_GUIDE = [
  { key: "light", minL: 60, maxL: 100 },
  { key: "standard", minL: 40, maxL: 60 },
  { key: "concentrate", minL: 25, maxL: 35 },
];
export const CUP_ML_MIN = 200;
export const CUP_ML_MAX = 350;

// Total stock across both warehouses. Returns undefined (= unlimited) if neither warehouse has a set quantity.
export function getStockTotal(p) {
  if ((p.stockHaGiang === undefined || p.stockHaGiang === null) && (p.stockSocSon === undefined || p.stockSocSon === null)) return undefined;
  return (p.stockHaGiang || 0) + (p.stockSocSon || 0);
}

// For products with size variants: lowest listed price across variants (for "from X" display).
export function getVariantMinPrice(p) {
  if (!p.variants || p.variants.length === 0) return undefined;
  const prices = p.variants.map((v) => v.price).filter((x) => typeof x === "number");
  return prices.length > 0 ? Math.min(...prices) : undefined;
}
// For products with size variants: combined stock across all variants + both warehouses.
export function getVariantStockTotal(p) {
  if (!p.variants || p.variants.length === 0) return undefined;
  const totals = p.variants.map((v) => getStockTotal(v)).filter((x) => typeof x === "number");
  return totals.length > 0 ? totals.reduce((a, b) => a + b, 0) : undefined;
}
