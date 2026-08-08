import {
  Home, Feather, Handshake, ShoppingBag, Bell, Library, BookMarked,
  Mountain, Leaf, MapPin, ShieldCheck, Palette, Calendar,
} from "lucide-react";

export const TOKENS = {
  paper: "#F7F3EA",
  paperDeep: "#F4EEE1",
  jade: "#1C2B24",
  jadeSoft: "#2E4A40",
  brass: "#B08D57",
  brassDeep: "#AD8A4E",
  lacquer: "#9C3B2E",
  // Warm-neutral near-black, used only for immersive editorial bands. Jade stays the brand
  // colour for chrome and accents; this exists because a green-tinted dark reads "heritage"
  // while a warm-neutral one reads contemporary, and long photo-led sections want the latter.
  ink: "#191512",
  inkSoft: "#241E19",
  // brass/brassDeep are the locked brand accent — kept as-is for icons, borders, and
  // backgrounds. Neither passes WCAG AA (4.5:1) as small text, so readable brass-family
  // text uses these darker/lighter text-safe variants instead (audit finding, 2026-08).
  brassOnPaper: "#82602D", // ~5.5:1 on paper/paperDeep (comfortable margin over the 4.5:1 floor)
  brassOnDark: "#D9B876", // ~5:1 on jade/jadeSoft
  // Soft/modern surface system: depth comes from wide radii + diffused shadow rather than
  // hard 1px borders. hairline is kept for dividers and inputs, not for card edges.
  hairline: "rgba(173,138,78,0.16)",
  shadowSm: "0 2px 12px rgba(28,43,36,0.05)",
  shadowMd: "0 6px 24px rgba(28,43,36,0.07)",
  shadowLg: "0 16px 44px rgba(28,43,36,0.12)",
  shadowHover: "0 14px 34px rgba(28,43,36,0.13)",
  radiusSm: 20,
  radius: 24,
  radiusLg: 28,
  // Diffused brass halo sat behind the 皇龍 seal wherever it appears.
  sealGlow: "radial-gradient(circle, rgba(176,141,87,0.30) 0%, rgba(176,141,87,0.10) 45%, rgba(176,141,87,0) 70%)",
  // Faint concentric seal rings, tiled behind the page to fill the empty desktop gutters
  // either side of the 860px content column. Deliberately near-invisible — it should read
  // as texture, not decoration, and it never sits under text (the content column is opaque).
  sidePattern:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180' viewBox='0 0 180 180'%3E%3Cg fill='none' stroke='%23B08D57'%3E%3Ccircle cx='90' cy='90' r='30' stroke-width='1' opacity='0.13'/%3E%3Ccircle cx='90' cy='90' r='46' stroke-width='0.75' opacity='0.08'/%3E%3Ccircle cx='0' cy='0' r='30' stroke-width='1' opacity='0.13'/%3E%3Ccircle cx='180' cy='180' r='30' stroke-width='1' opacity='0.13'/%3E%3Ccircle cx='180' cy='0' r='30' stroke-width='1' opacity='0.13'/%3E%3Ccircle cx='0' cy='180' r='30' stroke-width='1' opacity='0.13'/%3E%3C/g%3E%3C/svg%3E\")",
  // Selected sidebar row: faded brass gradient + a thin inner highlight instead of a flat fill.
  navActiveBg: "linear-gradient(100deg, rgba(176,141,87,0.26) 0%, rgba(176,141,87,0.10) 100%)",
  navActiveInset: "inset 0 0 0 1px rgba(217,184,118,0.35)",
};

export const CARD_SURFACE = {
  background: TOKENS.paper,
  borderRadius: TOKENS.radius,
  boxShadow: TOKENS.shadowSm,
};

export const NAV = [
  { id: "home", icon: Home, roles: ["admin", "wholesale", "retail"], label: { en: "The House", vi: "Trang chủ" } },
  { id: "wiki", icon: Feather, roles: ["admin", "wholesale", "retail"], label: { en: "Our Story", vi: "Câu chuyện" } },
  { id: "library", icon: Library, roles: ["admin", "wholesale", "retail"], label: { en: "Gallery", vi: "Thư Viện Ảnh" } },
  { id: "sessions", icon: Calendar, roles: ["admin", "wholesale", "retail"], label: { en: "Book a Session", vi: "Đặt Lịch Trà" } },
  // "retail" is included here (not just "wholesale") so logged-out/unapproved visitors can
  // still find House Partners to sign up or apply — role no longer gates discovery, only
  // wholesaleAccount.wholesaleVerified gates the actual ordering UI inside the page.
  { id: "wholesale", icon: Handshake, roles: ["admin", "wholesale", "retail"], label: { en: "House Partners", vi: "Đối tác sỉ" } },
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
    icon: MapPin,
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
