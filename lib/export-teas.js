// Connector export price brief supplied by Hoàng Long on 13 October 2026.
// These are indicative EXW VND/kg offers, not retail prices or SKU cost data.
// Do not silently map OP1 / steamed green to an existing catalog SKU.
export const EXPORT_PRICE_REVISION = "2026-10-13";
export const EXPORT_TEAS = Object.freeze([
  { id: "steamed-green", priceVndPerKg: 75000, name: { vi: "Trà Xanh Hấp", en: "Steamed Green Tea", "zh-TW": "蒸菁綠茶" } },
  { id: "smoked-black", priceVndPerKg: 85000, name: { vi: "Hồng Trà Khói", en: "Smoked Black Tea", "zh-TW": "煙燻紅茶" } },
  { id: "black-op1", priceVndPerKg: 80000, name: { vi: "Hồng Trà OP1", en: "OP1 Black Tea", "zh-TW": "OP1 紅茶" } },
  { id: "magnolia-green", priceVndPerKg: 100000, name: { vi: "Trà Xanh Hoa Ngọc Lan", en: "Magnolia Green Tea", "zh-TW": "玉蘭花綠茶" } },
]);
export const EXPORT_CURRENCIES = Object.freeze(["TWD", "USD", "CNY", "VND"]);
export const EXPORT_LOCALES = Object.freeze(["zh-TW", "en", "vi"]);
export function exportLocale(value) { return EXPORT_LOCALES.includes(value) ? value : "zh-TW"; }
