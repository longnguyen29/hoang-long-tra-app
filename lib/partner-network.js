// Shared public labels and input validation. Authorization and financial decisions live in SQL.
export const PARTNER_TYPES = [
  { id: "consultant", label: "Tư vấn đồ uống" },
  { id: "supplier", label: "Nhà cung cấp cho quán" },
  { id: "sales_rep", label: "Đại diện bán hàng độc lập" },
  { id: "distributor", label: "Nhà phân phối" },
];
export const PARTNER_STATUS = { pending: "Chờ duyệt", approved: "Đã duyệt", rejected: "Chưa phù hợp", disabled: "Tạm ngưng" };
export const REFERRAL_STATUS = { pending: "Chờ kiểm tra", accepted: "Đã tiếp nhận", rejected: "Không tiếp nhận" };
export const COMMISSION_STATUS = { draft: "Chờ đối soát", review: "Cần kiểm tra", approved: "Đã duyệt", paid: "Đã ghi nhận chi trả", void: "Không đủ điều kiện" };
const STAGES = { pending: "Chờ kiểm tra", qualified: "Đã xác nhận nhu cầu", lead: "Đang xác nhận nhu cầu", sample_requested: "Đang chuẩn bị mẫu", sample_sent: "Đã gửi mẫu", feedback: "Đang thử trà", quoted: "Đã báo giá", won: "Đã có đơn", active: "Khách mua định kỳ", lost: "Tạm dừng", paid: "Đã thu tiền", rejected: "Không tiếp nhận" };
export const partnerStageLabel = value => STAGES[value] || "Đang xử lý";
export const partnerRegistrationAllowed = (allowRegistration, registrationUserId, user) => allowRegistration === true
  && (!registrationUserId || Boolean(user?.id === registrationUserId && user.email && user.email_confirmed_at));
export const formatPartnerMoney = value => value === null || value === undefined || value === "" ? "Chưa xác định" : `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(Number(value))} ₫`;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HIDDEN = /[\u0000-\u001f\u007f-\u009f\u061c\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/gu;
const EMAIL = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i;
function field(input, name, max, errors, required = true) {
  const raw = input[name];
  if (!required && (raw === undefined || raw === null || raw === "")) return "";
  if (typeof raw !== "string" || raw.length > max) { errors[name] = `Nhập tối đa ${max} ký tự.`; return ""; }
  const text = raw.normalize("NFC").replace(HIDDEN, "").replace(/\s+/gu, " ").trim();
  if (required && !text) errors[name] = "Vui lòng điền thông tin này.";
  return text;
}
function validPhone(value) {
  return /^\+?[0-9 ().-]+$/.test(value) && value.replace(/\D/g, "").length >= 8 && value.replace(/\D/g, "").length <= 15;
}
function objectInput(input) { return input && typeof input === "object" && !Array.isArray(input); }
function identityErrors(input, errors) {
  if (["user_id", "partner_id", "code", "status", "default_rate_percent", "rate_percent", "approved_by"].some(key => Object.hasOwn(input, key))) errors._form = "Hồ sơ chỉ được chứa thông tin đăng ký.";
}
export function normalizePartnerApplication(input) {
  const errors = {}, data = {};
  if (!objectInput(input)) return { data: null, errors: { _form: "Thông tin chưa hợp lệ." } };
  identityErrors(input, errors);
  for (const [key, max] of [["business_name", 160], ["contact_name", 100], ["phone", 40], ["region", 160]]) data[key] = field(input, key, max, errors);
  data.notes = field(input, "notes", 1500, errors, false);
  data.partner_type = input.partner_type;
  if (!PARTNER_TYPES.some(type => type.id === data.partner_type)) errors.partner_type = "Chọn loại đối tác.";
  if (!validPhone(data.phone)) errors.phone = "Nhập số điện thoại hợp lệ.";
  data.consent = input.consent === true;
  if (!data.consent) errors.consent = "Cần đồng ý để Hoàng Long xem xét và liên hệ về hồ sơ.";
  return { data: Object.keys(errors).length ? null : data, errors };
}
export function normalizePartnerLead(input) {
  const errors = {}, data = {};
  if (!objectInput(input)) return { data: null, errors: { _form: "Thông tin chưa hợp lệ." } };
  identityErrors(input, errors);
  for (const [key, max] of [["business_name", 160], ["contact_name", 100], ["contact", 160], ["location", 240], ["product_interest", 500]]) data[key] = field(input, key, max, errors);
  data.channel = input.channel === undefined ? "b2b" : input.channel;
  if (!["b2b", "b2c"].includes(data.channel)) errors.channel = "Chọn B2B hoặc B2C.";
  data.notes = field(input, "notes", 1500, errors, false);
  if (!validPhone(data.contact) && !EMAIL.test(data.contact)) errors.contact = "Nhập số điện thoại hoặc email được phép liên hệ.";
  if (data.contact.includes("@")) data.contact = data.contact.toLowerCase();
  data.request_id = typeof input.request_id === "string" ? input.request_id.toLowerCase() : "";
  if (!UUID.test(data.request_id)) errors._form = "Phiên gửi chưa hợp lệ. Vui lòng tải lại trang.";
  const volume = input.expected_volume_kg;
  data.expected_volume_kg = volume === "" || volume === null || volume === undefined ? null : Number(volume);
  if (data.expected_volume_kg !== null && (!['number', 'string'].includes(typeof volume) || !/^\d+(?:\.\d{1,2})?$/.test(String(volume)) || !Number.isFinite(data.expected_volume_kg) || data.expected_volume_kg < 0 || data.expected_volume_kg > 10000000)) errors.expected_volume_kg = "Nhập lượng dự kiến từ 0 đến 10.000.000 kg, hoặc để trống.";
  data.contact_authorized = input.contact_authorized === true;
  if (!data.contact_authorized) errors.contact_authorized = "Chỉ gửi thông tin khi bạn được phép chia sẻ để Hoàng Long liên hệ.";
  return { data: Object.keys(errors).length ? null : data, errors };
}

// Conservative V1 reconciliation: deduct the whole reviewed exclusion first, including on partial payments.
// Use integer cents internally, but settle commissions in whole VND, never fractional dong.
export const commissionBasisLabel = basis => basis === "profit" ? "Lãi sau toàn bộ chi phí, trước hoa hồng" : "Doanh thu thực thu đủ điều kiện";
export function calculatePartnerCommission({ collected, vatAmount, billedShippingAmount, refundedAmount, ratePercent, cancelled = false, adjustmentAmount = 0, internalCostTotal = null, minimumRetainedProfit = null, basis = "revenue" }) {
  function cents(value, signed = false) {
    if (!['number', 'string'].includes(typeof value) || !new RegExp(signed ? "^-?\\d+(?:\\.\\d{1,2})?$" : "^\\d+(?:\\.\\d{1,2})?$").test(String(value))) throw new Error("invalid_amount");
    const number = Number(value);
    if (!Number.isFinite(number) || Math.abs(number) > 999999999999.99) throw new Error("invalid_amount");
    return BigInt(Math.round(number * 100));
  }
  if (!["revenue", "profit"].includes(basis)) throw new Error("invalid_commission_basis");
  if (!['number', 'string'].includes(typeof ratePercent) || !/^\d+(?:\.\d{1,4})?$/.test(String(ratePercent)) || !Number.isFinite(Number(ratePercent)) || Number(ratePercent) > 100) throw new Error("invalid_rate");
  const rate = BigInt(Math.round(Number(ratePercent) * 10000));
  const gross = cents(collected), exclusions = cents(vatAmount) + cents(billedShippingAmount) + cents(refundedAmount);
  const base = cancelled || gross <= exclusions ? 0n : gross - exclusions;
  const optionalAmount = value => value === null || value === undefined || value === "" ? null : cents(value);
  const cost = optionalAmount(internalCostTotal), minimum = optionalAmount(minimumRetainedProfit);
  const profit = cost === null ? null : base - cost;
  const commissionBase = basis === "revenue" ? base : profit === null ? null : profit > 0n ? profit : 0n;
  const rounded = commissionBase === null ? null : ((commissionBase * rate + 50000000n) / 100000000n) * 100n;
  const wholeBase = commissionBase === null ? null : (commissionBase / 100n) * 100n;
  const amount = rounded === null ? null : rounded > wholeBase ? wholeBase : rounded;
  const adjustment = cents(adjustmentAmount, true);
  if (adjustment % 100n !== 0n) throw new Error("invalid_adjustment");
  const adjusted = amount === null ? null : cancelled ? 0n : amount + adjustment;
  const adjustmentLimit = basis === "profit" ? commissionBase : base;
  if (adjusted !== null && (adjusted < 0n || adjusted > adjustmentLimit)) throw new Error("invalid_adjustment");
  const remaining = cost !== null && minimum !== null ? base - cost - minimum : null;
  const cap = remaining === null ? null : remaining > 0n ? remaining : 0n;
  const amountNumber = value => value === null ? null : Number(value) / 100;
  return { basis, base: Number(base) / 100, revenueBase: Number(base) / 100, commissionBase: amountNumber(commissionBase), profitBeforeCommission: amountNumber(profit), calculated: amountNumber(amount), eligible: amountNumber(adjusted),
    commissionCap: cap === null ? null : Number(cap) / 100,
    withinCap: cap === null || adjusted === null ? null : adjusted <= cap };
}

const ERRORS = {
  invalid_revenue_reward_rule: "Kiểm tra chu kỳ, ngày hiệu lực và các bậc doanh thu/tiền thưởng tăng dần. Không dùng số lượng đơn.",
  invalid_reward_period: "Chọn tháng hợp lệ, hoặc năm bắt đầu từ ngày 01/01.",
  reward_rule_changed: "Bảng thưởng đã có phiên bản mới. Tải lại trước khi lưu.",
  reward_cadence_switch_next_year: "Đổi giữa thưởng tháng và năm từ ngày 01/01 năm sau để tránh thưởng trùng doanh thu.",
  reward_period_overlaps: "Khoảng này đã có khoản thưởng tháng/năm. Kiểm tra hoặc hủy đề nghị chưa trả trước khi lập lại.",
  revenue_reward_policy_required: "Kỳ này chưa có bảng thưởng doanh thu được duyệt đúng chu kỳ.",
  revenue_reward_review_required: "Cần đối soát VAT, phí vận chuyển thu hộ và hoàn tiền của các đơn đã thu tiền trước khi chốt thưởng.",
  legacy_reward_review_required: "Khoản thưởng theo số đơn cũ chỉ giữ để đối chiếu. Hủy đề nghị chưa trả và lập lại theo chính sách doanh thu.",
  reward_period_not_closed: "Kỳ tháng/năm chưa kết thúc. Chỉ xem hoặc lập dự kiến, chưa duyệt/ghi trả.",
  reward_stale_recreate_required: "Dữ liệu doanh thu hoặc điều kiện đã thay đổi. Hủy đề nghị chưa trả và đối soát lại.",

  classic_tier_not_eligible: "Chưa đạt điều kiện của hạng hoặc hạng chưa được mở. Kiểm tra thâm niên và doanh thu được đối soát.",
  classic_agreement_changed: "Chính sách đã thay đổi ở nơi khác. Tải lại trước khi áp dụng phiên bản mới.",
  classic_requires_profit_basis: "Classic tính trên lãi sau toàn bộ chi phí, trước hoa hồng. Hãy chọn đúng cơ sở.",
  reward_stale: "Doanh thu hoặc điều kiện thưởng đã thay đổi. Tạo lại đề xuất để đối soát.",
  reward_month_not_closed: "Tháng chưa kết thúc. Hiện chỉ xem dự kiến; chưa duyệt thưởng tháng.",
  price_difference_no_percentage_stacking: "Đơn hưởng chênh giá không cộng thêm hoa hồng phần trăm. Để trống tỷ lệ riêng.",
  reward_month_open: "Tháng chưa kết thúc. Hiện chỉ xem dự kiến; chưa duyệt thưởng tháng.",
  verified_retail_source_required: "Đơn bán lẻ cần đúng nguồn giới thiệu đã xác nhận, liên hệ phù hợp, ngày tạo từ khi giới thiệu và lý do ít nhất 10 ký tự.",
  partner_quote_below_floor: "Giá sau chiết khấu thấp hơn giá Hoàng Long duyệt. Cần cấp điều kiện giá mới.",
  partner_quote_changed: "Báo giá đã thay đổi. Tải lại rồi kiểm tra phiên bản mới.",
  price_difference_terms_invalid: "Đơn chưa khớp điều kiện hưởng chênh giá đã duyệt. Kiểm tra báo giá và các dòng hàng.",
  sales_page_changed: "Trang đã thay đổi ở nơi khác. Tải lại dữ liệu, kiểm tra nội dung rồi lưu lại.",
  sales_page_slug_locked: "Đường dẫn đã mở được giữ cố định để bảo vệ link và mã QR đã gửi. Bạn vẫn sửa được tên, điện thoại và dòng trà.",
  invalid_sales_page: "Kiểm tra tên đường dẫn, liên hệ công khai, khu vực và dòng trà của trang.",
  sales_page_content_review_required: "Cần xác nhận tên và số điện thoại được phép công khai trước khi mở trang.",
  invalid_partner_order_update: "Kiểm tra ngày, số tiền dự kiến và ghi chú giải thích trước khi cập nhật.",
  authentication_required: "Hãy đăng nhập để tiếp tục.", verified_email_required: "Xác nhận email đăng nhập trước khi gửi hồ sơ.",
  partner_not_approved: "Hồ sơ chưa được duyệt hoặc đang tạm ngưng. Bạn chưa thể gửi khách mới.",
  partner_network_application_exists: "Bạn đã gửi hồ sơ. Hãy mở bàn đối tác để xem trạng thái.",
  manager_required: "Chức năng này dành cho quản lý.", duplicate_resolution_required: "Có thông tin trùng. Hãy chọn hồ sơ phù hợp và ghi lý do xử lý.",
  referral_already_attributed: "Khách này đã có đối tác giới thiệu. Cần xử lý trùng trước khi tiếp tục.",
  order_already_attributed: "Đơn này đã được gắn với một lượt giới thiệu.",
  commission_rate_required: "Chưa có tỷ lệ hoa hồng được thoả thuận. Hãy xác nhận trước khi đối soát.",
  commission_basis_reason_required: "Đổi hoặc xác nhận lại điều kiện hoa hồng cần có lý do / tham chiếu thỏa thuận (ít nhất 10 ký tự).",
  commission_stale: "Số tiền hoặc dữ liệu đơn đã thay đổi. Hãy đối soát lại trước khi duyệt hoặc ghi chi trả.",
  commission_not_approved: "Chỉ ghi chi trả sau khi hoa hồng đã được duyệt.",
  commission_costs_required: "Cần xác nhận đủ chi phí và lợi nhuận muốn giữ trước khi duyệt hoa hồng.",
  commission_cap_exceeded: "Hoa hồng vượt ngân sách giữ lợi nhuận. Hãy điều chỉnh hoặc xin quản trị viên duyệt ngoại lệ có lý do.",
  commission_repeat_limit: "Đơn này ngoài số lần tái mua được hưởng. Cần thoả thuận riêng trước khi đối soát.",
  commission_paid_locked: "Lịch sử đã chi trả được giữ nguyên. Kiểm tra khoản chênh lệch trong lần đối soát tiếp theo.",
  customer_payment_incomplete: "V1 ghi nhận trả hoa hồng một lần sau khi khách đã thanh toán đủ đơn. Hãy xác nhận thu tiền trước khi ghi chi trả.",
  application_exists: "Bạn đã gửi hồ sơ. Hãy mở bàn đối tác để xem trạng thái.",
  referral_retry_conflict: "Lượt gửi đã được nhận với thông tin khác. Tải lại dữ liệu trước khi gửi tiếp.",
  referral_daily_limit: "Bạn đã đạt giới hạn 30 lượt gửi trong ngày. Hãy đợi rồi thử lại.",
  opportunity_already_attributed: "Khách này đã được gắn với một đối tác giới thiệu. Cần xử lý trùng trước khi tiếp tục.",
  select_existing_opportunity: "Đã có hồ sơ bán hàng với liên hệ này. Hãy chọn hồ sơ hiện có và ghi lý do tiếp nhận.",
  order_referral_link_required: "Gắn đơn với khách giới thiệu đã được tiếp nhận trước khi đối soát.",
  profit_review_required: "Cần xác nhận chi phí và lợi nhuận muốn giữ trước khi duyệt hoa hồng.",
  profit_guardrail_admin_exception_required: "Hoa hồng vượt ngân sách giữ lợi nhuận. Chỉ admin được duyệt ngoại lệ có lý do.",
  paid_commission_immutable: "Khoản đã chi trả được giữ nguyên. Dùng rà soát lại để ghi nhận thay đổi của đơn.",
  commission_stale_reconcile_required: "Dữ liệu đơn hoặc khoản thu đã thay đổi. Đối soát lại trước khi duyệt hoặc ghi nhận chi trả.",
  commission_approval_required: "Cần duyệt kết quả đối soát trước khi ghi nhận chi trả.",
  invalid_commission_payment: "V1 chỉ ghi nhận một lần trả đủ khoản đã duyệt và còn đủ điều kiện.",
  whole_vnd_adjustment_required: "Nhập số tiền điều chỉnh theo nguyên đồng VND.",
  financial_review_required: "Xác nhận các khoản VAT, phí vận chuyển, tiền hoàn và ghi chú đối soát, kể cả khi bằng 0.",
  rate_adjustment_reason_required: "Ghi rõ lý do hoặc thoả thuận khi dùng tỷ lệ riêng cho đơn này.",
  distributor_rate_agreement_required: "Nhà phân phối cần có thoả thuận riêng theo đơn; không tự cộng hoa hồng vào chiết khấu sỉ.",
  invalid_adjustment: "Mức điều chỉnh phải nằm trong cơ sở đủ điều kiện đã chọn (doanh thu hoặc lãi) và cần lý do.",
  request_conflict: "Lượt gửi này đã được nhận với thông tin khác. Hãy tải lại dữ liệu trước khi gửi tiếp.",
  order_not_linked: "Đơn chưa được gắn với khách giới thiệu đã tiếp nhận.",
  reason_required: "Ghi rõ lý do trước khi thực hiện.",
  partner_network_rate_limited: "Bạn đã gửi nhiều lượt. Hãy đợi rồi thử lại.",
};
export function partnerErrorMessage(error) {
  const raw = String(error?.message || error || "");
  const key = Object.keys(ERRORS).find(code => raw.includes(code));
  if (key) return ERRORS[key];
  if (/schema cache|does not exist|PGRST202|PGRST205/i.test(raw)) return "Phần đối tác chưa được thiết lập trong cơ sở dữ liệu này. Hãy liên hệ quản lý.";
  if (/invalid_|required|not_found|not_eligible|cannot_|already_|locked/i.test(raw)) return "Thông tin hoặc trạng thái chưa phù hợp. Kiểm tra lại dữ liệu trước khi lưu.";
  return "Chưa thực hiện được. Hãy thử lại; nếu vẫn lỗi, liên hệ quản lý.";
}
