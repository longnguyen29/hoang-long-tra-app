// Reviewed classification, separate from search criteria and commercial qualification.
export const ACCOUNT_TYPES = {
  shop: "Quán café / quán trà", chain: "Chuỗi cửa hàng",
  distributor_wholesaler: "Nhà phân phối / bán sỉ", importer: "Nhà nhập khẩu",
  exporter_trader: "Nhà xuất khẩu / thương mại", horeca: "Khách sạn / nhà hàng / catering",
  manufacturer_oem: "Nhà sản xuất / OEM", specialty_retail: "Bán lẻ chuyên biệt", other: "Khác",
};
export const VERTICAL_TAGS = {
  coffee: "Café", milk_tea: "Trà sữa", fruit_tea: "Trà trái cây", tea_house: "Quán trà",
  tea_retail: "Bán lẻ trà", restaurant: "Nhà hàng", hotel: "Khách sạn", catering: "Tiệc / catering",
  beverage_ingredients: "Nguyên liệu đồ uống", foodservice: "Dịch vụ ăn uống", rtd: "Đồ uống pha sẵn",
  bottled_drink: "Đồ uống đóng chai", private_label: "Nhãn hàng riêng", tea_import: "Nhập khẩu trà",
  tea_export: "Xuất khẩu trà", wholesale: "Bán sỉ", premium_hospitality: "Lưu trú cao cấp",
  ecommerce: "Thương mại điện tử", multi_branch: "Nhiều chi nhánh",
};
export function accountMetadata(input = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Thông tin phân loại không hợp lệ.");
  const { account_type = "shop", country_code = "VN", vertical_tags = [], is_watchlisted = false } = input;
  if (typeof account_type !== "string" || !Object.hasOwn(ACCOUNT_TYPES, account_type)) throw new Error("Loại khách hàng không hợp lệ.");
  if (typeof country_code !== "string" || !/^[A-Z]{2,3}$/.test(country_code.trim().toUpperCase())) throw new Error("Mã quốc gia cần 2–3 chữ cái.");
  if (!Array.isArray(vertical_tags) || vertical_tags.length > 30 || vertical_tags.some(t => typeof t !== "string" || !Object.hasOwn(VERTICAL_TAGS, t))) throw new Error("Nhãn lĩnh vực không hợp lệ.");
  if (typeof is_watchlisted !== "boolean") throw new Error("Theo dõi phải là giá trị có hoặc không.");
  return { account_type, country_code: country_code.trim().toUpperCase(), vertical_tags: [...new Set(vertical_tags)], is_watchlisted };
}
export function validateDiscoverySearch(input) {
  const metadata = accountMetadata(input);
  if (metadata.account_type !== "shop" || metadata.country_code !== "VN" || metadata.vertical_tags.length || metadata.is_watchlisted) throw new Error("Tìm tự động hiện chỉ hỗ trợ quán tại Việt Nam. Nhóm khác có thể thêm từ đường dẫn.");
  if (input.segment !== undefined && !["all", "milk", "fruit"].includes(input.segment)) throw new Error("Nhóm quán không hợp lệ.");
  return metadata;
}
