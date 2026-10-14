import { EXPORT_CURRENCIES, EXPORT_TEAS } from "./export-teas.js";

const TEA_IDS = EXPORT_TEAS.map(tea => tea.id);
const SLUG = /^[a-z0-9](?:[a-z0-9-]{1,62}[a-z0-9])$/;
const HIDDEN = /[\u0000-\u001f\u007f-\u009f\u061c\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/u;

export const isPartnerSalesPageSlug = value => typeof value === "string" && SLUG.test(value) && !value.includes("--");

function cleanText(value, limit) {
  if (typeof value !== "string" || value.length > limit || HIDDEN.test(value)) return null;
  const result = value.normalize("NFC").replace(/\s+/gu, " ").trim();
  return result && result.length <= limit ? result : null;
}

function teaIds(value) {
  if (!Array.isArray(value) || !value.length || value.length > TEA_IDS.length || new Set(value).size !== value.length || value.some(id => !TEA_IDS.includes(id))) return null;
  return TEA_IDS.filter(id => value.includes(id));
}

function publicPhone(value) {
  const clean = cleanText(value, 40);
  if (!clean || !/^\+?[0-9 ().-]+$/.test(clean)) return null;
  const digits = clean.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15 || (clean.startsWith("+") && digits.startsWith("0"))) return null;
  return clean;
}

// Strip everything except the owner-reviewed public presentation. Application
// email, account identity, terms and commissions never become public props.
export function parsePublicPartnerSalesPage(value) {
  if (!value || typeof value !== "object" || Array.isArray(value) || !isPartnerSalesPageSlug(value.slug)) return null;
  const displayName = cleanText(value.display_name, 100);
  const phone = publicPhone(value.phone);
  const region = cleanText(value.region, 160);
  const ids = teaIds(value.tea_ids);
  if (!displayName || !phone || !region || !ids || !Number.isSafeInteger(value.revision) || value.revision < 1) return null;
  return { slug: value.slug, display_name: displayName, phone, region, tea_ids: ids, revision: value.revision };
}

export function normalizePartnerSalesPageInput(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return { ok: false, error: "Kiểm tra thông tin trang giới thiệu." };
  const expectedRevision = input.expected_revision ?? 0;
  if (!Number.isInteger(expectedRevision) || expectedRevision < 0 || expectedRevision > 2147483647) return { ok: false, error: "Tải lại hồ sơ trang trước khi lưu." };
  if (!isPartnerSalesPageSlug(input.slug)) return { ok: false, error: "Tên đường dẫn gồm 3–64 chữ thường, số và dấu gạch nối; không có dấu hoặc khoảng trắng." };
  const displayName = cleanText(input.display_name, 100);
  const phone = publicPhone(input.phone);
  const region = cleanText(input.region, 160);
  const ids = teaIds(input.tea_ids);
  const reason = cleanText(input.reason, 1000);
  if (!displayName || !phone || !region) return { ok: false, error: "Điền tên hiển thị, số điện thoại và khu vực hợp tác." };
  if (!ids) return { ok: false, error: "Chọn ít nhất một dòng trà có trong danh mục." };
  if (!reason) return { ok: false, error: "Ghi lý do tạo hoặc cập nhật trang để lưu lịch sử." };
  if (typeof input.published !== "boolean") return { ok: false, error: "Chọn trạng thái hiển thị của trang." };
  if (input.published && input.content_reviewed !== true) return { ok: false, error: "Xác nhận đã được phép công khai tên và số điện thoại trước khi mở trang." };
  return { ok: true, data: { expected_revision: expectedRevision, slug: input.slug, display_name: displayName, phone, region, tea_ids: ids, published: input.published, content_reviewed: input.content_reviewed === true, reason } };
}

export function buildPartnerSalesPageHref({ salesPage, teaIds: selected = salesPage?.tea_ids, currency = "VND" } = {}) {
  const page = parsePublicPartnerSalesPage(salesPage);
  const ids = teaIds(selected);
  if (!page || !ids || ids.some(id => !page.tea_ids.includes(id)) || !EXPORT_CURRENCIES.includes(currency)) throw new Error("invalid_partner_sales_page");
  const query = new URLSearchParams({ teas: ids.join(","), currency, lang: "vi" });
  return `/doi-tac/${page.slug}?${query}`;
}

export function partnerSalesPageProfile(value) {
  const page = parsePublicPartnerSalesPage(value);
  if (!page) return null;
  return {
    id: `partner-${page.slug}`, label: page.display_name,
    contact: { name: page.display_name, role: "Đối tác giới thiệu của Hoàng Long", phone: page.phone.replace(/[ ().-]/g, ""), phoneLabel: page.phone },
    pdf: "/downloads/hoang-long-b2b-sales-kit-vi.pdf",
  };
}
