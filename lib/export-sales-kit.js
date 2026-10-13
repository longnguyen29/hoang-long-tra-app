import { EXPORT_TEAS, EXPORT_CURRENCIES } from "./export-teas.js";

const ALL_TEA_IDS = EXPORT_TEAS.map((tea) => tea.id);
const PARTNER_CODE = /^HL-P-[A-F0-9]{32}$/i;
export const EXPORT_SALES_KIT_PDF = "/downloads/hoang-long-b2b-sales-kit-vi.pdf";

function selectedIds(value) {
  if (!Array.isArray(value) || !value.length || value.length > ALL_TEA_IDS.length
      || new Set(value).size !== value.length || value.some((id) => !ALL_TEA_IDS.includes(id))) return null;
  return ALL_TEA_IDS.filter((id) => value.includes(id));
}

// An absent selection means the complete range. Malformed selections must not
// silently turn a buyer's selected brief into a different assortment.
export function parseExportTeaIds(value) {
  if (value === undefined) return [...ALL_TEA_IDS];
  return typeof value === "string" ? selectedIds(value.split(",")) : null;
}

export function buildExportSalesKitHref({ teaIds = ALL_TEA_IDS, locale = "vi", currency = "VND", partnerCode } = {}) {
  const selected = selectedIds(teaIds);
  if (!selected || locale !== "vi" || !EXPORT_CURRENCIES.includes(currency)) throw new Error("invalid_sales_kit");
  if (partnerCode !== undefined && (typeof partnerCode !== "string" || !PARTNER_CODE.test(partnerCode))) throw new Error("invalid_partner_code");
  const query = new URLSearchParams({
    teas: selected.join(","), lang: "vi", currency,
    utm_source: "partner-network", utm_medium: "referral", utm_campaign: "taiwan_exw_v1",
  });
  // This public code is a review hint, never authenticated ownership or a
  // commission entitlement. No person's name, contact or margin goes in a URL.
  if (partnerCode) query.set("utm_content", partnerCode.toUpperCase());
  return `/export/taiwan?${query}`;
}
