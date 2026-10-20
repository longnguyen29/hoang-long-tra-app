import { catalogText } from "./trade-catalog.js";

// Buyer guidance is editorial, not a product specification or a tasting result.
// Classifications below follow the existing catalogue names, not assumed origin,
// cultivar, grade, certification or suitability for industrial recipes.
export const TRADE_GROUPS = [
  { id: "green", label: { vi: "Lục trà", en: "Green tea" }, guidance: { vi: "Thử mẫu để so sánh sắc nước, độ đậm và hậu vị trong cách pha dự kiến. Với nhu cầu trà đá, ghi rõ lượng trà, nước và đá khi trao đổi.", en: "Compare colour, strength and finish using your intended brewing method. For iced tea, share your tea, water and ice quantities." } },
  { id: "black", label: { vi: "Hồng trà", en: "Black tea" }, guidance: { vi: "Đối chiếu mẫu theo độ đậm và hương trong công thức thực tế. Nếu pha cùng sữa hoặc trái cây, thử với đúng nguyên liệu bạn đang dùng.", en: "Compare samples for strength and aroma in your actual recipe. If using milk or fruit, test with your own ingredients." } },
  { id: "white", label: { vi: "Bạch trà", en: "White tea" }, guidance: { vi: "Bắt đầu từ hướng dẫn pha mẫu, rồi điều chỉnh theo mục đích sử dụng. Trao đổi phẩm cấp và quy cách lá cần có trước khi đặt hàng.", en: "Start with the sample brewing guidance, then adjust for your application. Discuss the required grade and leaf specification before ordering." } },
  { id: "oolong", label: { vi: "Oolong", en: "Oolong" }, guidance: { vi: "So sánh hương và độ đậm ở các lần pha. Xác nhận yêu cầu về dòng trà, quy cách và mẫu đối chiếu khi báo giá.", en: "Compare aroma and strength across infusions. Confirm the tea range, packing and reference sample with your quotation." } },
  { id: "scented", label: { vi: "Trà ướp hương", en: "Scented tea" }, guidance: { vi: "Chọn dòng hương sen, lài hoặc ngọc lan, rồi thử độ cân bằng giữa hương và nền trà theo cách pha của bạn.", en: "Select lotus, jasmine or orchid, then evaluate the balance of scent and tea in your brewing method." } },
  { id: "pressed", label: { vi: "Phổ Nhĩ", en: "Pu-erh tea" }, guidance: { vi: "Chọn dạng bánh hoặc viên. Xác nhận trọng lượng từng đơn vị và số bánh/viên khi trao đổi; không quy đổi sang kg khi chưa có trọng lượng xác nhận.", en: "Choose cake or piece format. Confirm the weight per unit and number of cakes/pieces; do not convert to kilograms without an agreed unit weight." } },
  { id: "other", label: { vi: "Dòng trà khác", en: "Other teas" }, guidance: { vi: "Trao đổi mục đích sử dụng, phẩm cấp và quy cách để chọn mẫu phù hợp.", en: "Discuss your application, grade and packing to select a suitable sample." } },
];

const GROUP_BY_ID = {
  "bach-mau-don": "white",
  "daily-green-tea-iced-tea-mu3w9lr0": "green",
  "hong-tra-shan-khoi": "black",
  "hong-tra-shan-mat": "black",
  "hong-tra-shan-tuyen-mti6jlyg": "black",
  "luc-tra-hoa-sen": "scented",
  "luc-tra-lai-tieu-chuan": "scented",
  "luc-tra-ngoc-lan": "scented",
  "luc-tra-shan-moc": "green",
  "luc-tra-shan-mv4nnv9p": "green",
  "oolong-kim-tuyen-nghe-nhan-ai-loan-mti6gt2a": "oolong",
  "pho-nhi-banh-mv2k6syd": "pressed",
  "pho-nhi-vien-mv2k5p6r": "pressed",
  "tra-gao-sen-3-lan": "scented",
  "tra-gao-sen-7-lan": "scented",
};

// Translations only for names currently missing English in the working catalog.
const ENGLISH_NAMES = {
  "hong-tra-shan-tuyen-mti6jlyg": "Selected Shan Black Tea",
  "oolong-kim-tuyen-nghe-nhan-ai-loan-mti6gt2a": "Kim Tuyên Oolong (Taiwanese Artisan)",
  "pho-nhi-banh-mv2k6syd": "Pu-erh Tea Cake",
  "pho-nhi-vien-mv2k5p6r": "Pu-erh Tea Pieces",
};

const localizedField = (value, locale) => typeof value === "string" ? value.trim() : typeof value?.[locale] === "string" ? value[locale].trim() : "";

export function tradeProductFacts(product = {}, locale = "vi") {
  const lang = locale === "en" ? "en" : "vi";
  const groupId = GROUP_BY_ID[product.id] || "other";
  const group = TRADE_GROUPS.find(item => item.id === groupId);
  const rawFlavors = product.flavors?.[lang];
  const flavors = Array.isArray(rawFlavors) ? rawFlavors.filter(value => typeof value === "string" && value.trim()).map(value => value.trim()) : [];
  return {
    name: localizedField(product.name, lang) || (lang === "en" ? ENGLISH_NAMES[product.id] : "") || catalogText(product.name, lang) || product.id || "",
    groupId,
    groupLabel: group.label[lang],
    summary: group.guidance[lang],
    note: localizedField(product.notes, lang),
    flavors,
    brew: localizedField(product.brew, lang),
    packing: typeof product.pack_size === "string" ? (lang === "en" && product.pack_size.trim().toLowerCase() === "viên" ? "Pieces" : product.pack_size.trim()) : "",
  };
}
