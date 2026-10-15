import { EVENT_CONTACT } from './event-contact.js';

// Staff-editable drafts, not execution, payment confirmation or legal review.
// Reference: Civil Code 91/2015/QH13, especially agreed contract contents (Art.398).
// Official primary reproduction: https://www.wipo.int/wipolex/en/legislation/details/17200
// Commercial entitlement below is an express proposal based on Hoàng Long's
// explicit revenue/profit policy; it is never presented as automatic statutory entitlement.
export const DOCUMENT_DRAFT_WARNING = 'BẢN NHÁP NỘI BỘ — chưa ký, chưa xác nhận hiệu lực pháp lý hoặc thanh toán. Kiểm tra pháp nhân, thẩm quyền ký, điều kiện thương mại và nghĩa vụ thuế trước khi sử dụng.';
const MAX_MONEY = 999999999999.99;
const text = (name, label, section, maxLength = 240, type = 'text') => ({ name, label, section, type, maxLength });
const date = (name, label, section) => ({ name, label, section, type: 'date', maxLength: 10 });
const number = (name, label, section, max = MAX_MONEY, extra = {}) => ({ name, label, section, type: 'number', min: 0, max, step: 0.01, ...extra });
const terms = (name, label, section) => text(name, label, section, 4000, 'textarea');
export const DOCUMENT_FIELDS = Object.freeze([
  text('document_ref', 'Số / mã bản nháp', 'Thông tin văn bản', 100),
  date('document_date', 'Ngày lập', 'Thông tin văn bản'),
  text('signing_place', 'Địa điểm lập / ký', 'Thông tin văn bản'),
  text('company_legal_name', 'Tên pháp nhân Hoàng Long đã xác minh', 'Bên A · Hoàng Long'),
  text('company_tax_id', 'Mã số thuế Bên A', 'Bên A · Hoàng Long', 40),
  text('company_registered_address', 'Địa chỉ đăng ký Bên A', 'Bên A · Hoàng Long', 500),
  text('company_representative', 'Người đại diện / người được ủy quyền Bên A', 'Bên A · Hoàng Long', 120),
  text('company_representative_title', 'Chức danh / căn cứ ủy quyền Bên A', 'Bên A · Hoàng Long', 240),
  text('company_contact_phone', 'Điện thoại liên hệ Bên A', 'Bên A · Hoàng Long', 40),
  text('company_contact_email', 'Email liên hệ Bên A', 'Bên A · Hoàng Long', 254, 'email'),
  text('partner_trade_name', 'Tên hoạt động / thương hiệu đối tác', 'Bên B · Đối tác'),
  text('partner_legal_name', 'Tên tổ chức / cá nhân giao kết Bên B', 'Bên B · Đối tác'),
  text('partner_tax_id', 'Mã số thuế Bên B (khi áp dụng)', 'Bên B · Đối tác', 40),
  text('partner_address', 'Địa chỉ giao kết Bên B', 'Bên B · Đối tác', 500),
  text('partner_representative', 'Người ký Bên B', 'Bên B · Đối tác', 120),
  text('partner_representative_title', 'Tư cách / chức danh / căn cứ ủy quyền Bên B', 'Bên B · Đối tác'),
  text('partner_contact_name', 'Người liên hệ Bên B', 'Bên B · Đối tác', 120),
  text('partner_contact_phone', 'Điện thoại Bên B', 'Bên B · Đối tác', 40),
  text('partner_contact_email', 'Email Bên B', 'Bên B · Đối tác', 254, 'email'),
  text('partner_code', 'Mã đối tác (nếu đã cấp)', 'Bên B · Đối tác', 100),
  text('partner_region', 'Khu vực hoạt động', 'Bên B · Đối tác'),
  text('partner_role', 'Vai trò hợp tác đã thống nhất', 'Phạm vi hợp tác', 240),
  terms('product_scope', 'Sản phẩm / nhóm sản phẩm được áp dụng', 'Phạm vi hợp tác'),
  terms('referral_scope', 'Phạm vi giới thiệu / hỗ trợ bán hàng', 'Phạm vi hợp tác'),
  terms('lead_ownership_terms', 'Điều kiện ghi nhận khách / xử lý trùng', 'Phạm vi hợp tác'),
  { ...text('commission_basis', 'Cơ sở tính hoa hồng', 'Hoa hồng', 20, 'select'), options: [{ value: 'profit', label: '% lãi sau chi phí, trước hoa hồng' }, { value: 'revenue', label: '% doanh thu thực thu · điều kiện cũ' }] },
  { ...text('commission_policy', 'Cách tính đơn đầu / tái mua', 'Hoa hồng', 20, 'select'), options: [{value:'legacy',label:'Thỏa thuận riêng / điều kiện trước Classic'},{value:'classic',label:'Classic / hạng · hai đơn đầu, từ đơn thứ ba'}] },
  terms('commission_policy_notes', 'Hạng, thưởng và phạm vi phiên bản đã thống nhất', 'Hoa hồng'),
  terms('commission_cost_terms', 'Phạm vi chi phí và chứng từ đối chiếu', 'Hoa hồng'),
  number('first_order_rate_percent', 'Hoa hồng đơn đầu (%)', 'Hoa hồng', 100, { step: 0.0001, precision: 4 }),
  number('repeat_rate_percent', 'Hoa hồng đơn tái mua (%)', 'Hoa hồng', 100, { step: 0.0001, precision: 4 }),
  number('repeat_order_limit', 'Số đơn tái mua được hưởng (0 = không áp dụng)', 'Hoa hồng', 30, { step: 1, integer: true }),
  number('approved_expense_budget', 'Ngân sách chi phí giới thiệu được chấp thuận (VND; 0 = không cấp)', 'Hoa hồng'),
  date('effective_date', 'Ngày bắt đầu dự kiến', 'Hiệu lực / thực hiện'),
  date('end_date', 'Ngày kết thúc (nếu có)', 'Hiệu lực / thực hiện'),
  terms('settlement_terms', 'Kỳ đối soát / thời hạn và điều kiện thanh toán dự kiến', 'Hiệu lực / thực hiện'),
  terms('tax_terms', 'Thuế / chứng từ / xử lý nghĩa vụ của các bên', 'Hiệu lực / thực hiện'),
  terms('termination_terms', 'Chấm dứt / xử lý giao dịch đang thực hiện', 'Hiệu lực / thực hiện'),
  terms('nda_purpose', 'Mục đích trao đổi thông tin', 'Bảo mật hai chiều'),
  terms('confidentiality_scope', 'Nhóm thông tin cần bảo mật', 'Bảo mật hai chiều'),
  terms('permitted_recipients', 'Người / nhóm được phép tiếp cận', 'Bảo mật hai chiều'),
  number('confidentiality_duration_months', 'Thời hạn bảo mật sau khi kết thúc trao đổi (tháng)', 'Bảo mật hai chiều', 1200, { min: 1, step: 1, integer: true }),
  terms('return_delete_terms', 'Hoàn trả / xóa / lưu giữ thông tin theo yêu cầu', 'Bảo mật hai chiều'),
  terms('dispute_terms', 'Cách giải quyết bất đồng được đề xuất', 'Điều khoản bổ sung'),
  date('period_start', 'Kỳ đối soát từ ngày', 'Đối soát hoa hồng'),
  date('period_end', 'Kỳ đối soát đến ngày', 'Đối soát hoa hồng'),
  text('agreement_reference', 'Thỏa thuận / phụ lục làm căn cứ', 'Đối soát hoa hồng', 240),
  terms('order_references', 'Mã đơn / bảng kê và chứng từ đối chiếu', 'Đối soát hoa hồng'),
  number('collected_amount', 'Tổng tiền thực thu đối chiếu (VND)', 'Đối soát hoa hồng'),
  number('vat_amount', 'VAT còn lại cần loại trừ (VND)', 'Đối soát hoa hồng'),
  number('billed_shipping_amount', 'Phí vận chuyển thu của khách còn lại cần loại trừ (VND)', 'Đối soát hoa hồng'),
  number('refunded_amount', 'Tiền thực hoàn cho khách (VND)', 'Đối soát hoa hồng'),
  number('cancelled_amount', 'Tiền thu từ đơn hủy cần loại trừ, chưa nằm trong khoản hoàn (VND)', 'Đối soát hoa hồng'),
  number('internal_cost_total', 'Toàn bộ chi phí đơn đã xác nhận, trước hoa hồng (VND)', 'Đối soát hoa hồng'),
  number('commission_rate_percent', 'Tỷ lệ đã đối chiếu cho nhóm đơn này (%)', 'Đối soát hoa hồng', 100, { step: 0.0001, precision: 4 }),
  number('adjustment_amount', 'Điều chỉnh hoa hồng có căn cứ (VND; số âm hoặc dương)', 'Đối soát hoa hồng', MAX_MONEY, { min: -MAX_MONEY, step: 1, integer: true }),
  terms('adjustment_reason', 'Lý do / căn cứ điều chỉnh', 'Đối soát hoa hồng'),
  terms('other_terms', 'Nội dung bổ sung do người lập nhập', 'Điều khoản bổ sung'),
].map(field => Object.freeze(field)));
export const DOCUMENT_SCHEMA = Object.freeze(Object.fromEntries(DOCUMENT_FIELDS.map(field => [field.name, field])));
export const DOCUMENT_DEFAULTS = Object.freeze({
  template_id: 'partner_agreement',
  ...Object.fromEntries(DOCUMENT_FIELDS.map(field => [field.name, field.type === 'number' ? null : ''])),
  company_contact_phone: EVENT_CONTACT.phoneLabel,
  commission_basis: 'profit',
  commission_policy: 'legacy',
  commission_cost_terms: 'Hai bên thống nhất phạm vi chi phí của đơn trước khi chốt giao dịch: sản xuất / giá vốn, bao bì, QC, giao vận do Hoàng Long chịu, chi phí mẫu / bán hàng được chấp thuận và chi phí nhà máy / vận hành phân bổ có căn cứ. Đối soát chi phí thực tế bằng bảng kê, chứng từ và giải trình phát sinh; không tính trùng khoản đã nằm trong giá vốn hoặc khoản đã loại khỏi doanh thu. Không trừ chính hoa hồng khỏi phần lãi làm cơ sở tính. Bản đối soát và chứng từ phù hợp có thể được Hoàng Long chủ động chia sẻ riêng cho đúng đối tác của đơn.',
  referral_scope: 'Bên B giới thiệu khách có nhu cầu mua trà và hỗ trợ trao đổi trong phạm vi hai bên thống nhất. Hoàng Long phụ trách xác nhận nhu cầu, tư vấn sản phẩm, mẫu, báo giá và thực hiện đơn hàng. Bên B không tự cam kết thay Bên A ngoài phạm vi được ủy quyền riêng.',
  lead_ownership_terms: 'Khách chỉ được ghi nhận sau khi Bên B được phép chia sẻ thông tin liên hệ, Hoàng Long đối chiếu khách trùng / khách đã có và xác nhận tiếp nhận trong hồ sơ. Hồ sơ trùng hoặc nguồn giới thiệu chưa rõ phải được đối chiếu và ghi nhận quyết định trước khi tính hoa hồng.',
  settlement_terms: 'Đối soát theo bảng kê đơn hàng và chứng từ tiền thực thu. Chi trả sau khi khách thanh toán đủ đơn và kết quả hoa hồng được kiểm tra, phê duyệt. Hai bên xác nhận bằng văn bản kỳ đối soát, thời hạn chi trả và cách xử lý chênh lệch trước khi thực hiện.',
  tax_terms: 'Hai bên xác nhận tư cách giao dịch, nghĩa vụ thuế, chứng từ và việc khấu trừ khi áp dụng trước khi chi trả. Không mặc định mức khấu trừ, miễn thuế hoặc dùng biên bản đối soát thay hóa đơn / chứng từ phải lập theo quy định.',
  termination_terms: 'Đề nghị chấm dứt được thông báo bằng văn bản. Hai bên xác nhận ngày chấm dứt và đối chiếu các hồ sơ đã tiếp nhận, đơn đang thực hiện, chi phí đã chấp thuận cùng khoản phải xử lý. Chấm dứt không tự xóa lịch sử hoặc các nghĩa vụ bảo mật và nghĩa vụ còn tồn tại đã được thống nhất.',
  dispute_terms: 'Hai bên ưu tiên trao đổi, đối chiếu hồ sơ và thương lượng bằng văn bản. Nếu không giải quyết được, hai bên thống nhất cơ chế phù hợp pháp luật áp dụng. Mức phạt, bồi thường và cơ quan giải quyết, khi cần, phải được rà soát và thỏa thuận riêng.',
  nda_purpose: 'Trao đổi và đánh giá mẫu trà, sản phẩm cùng khả năng hợp tác kinh doanh giữa hai bên. Thông tin chỉ được sử dụng để xem xét và thực hiện phạm vi hợp tác đã thống nhất, không tự sử dụng cho mục đích khác.',
  confidentiality_scope: 'Thông tin chưa công khai mà bên cung cấp xác định là cần bảo mật khi trao đổi, gồm tài liệu sản phẩm, kỹ thuật, mẫu thử, điều kiện thương mại và thông tin khách hàng được phép chia sẻ. Hai bên xác nhận phạm vi cụ thể khi bàn giao; không coi thông tin công khai hợp pháp là bí mật.',
  permitted_recipients: 'Người trực tiếp tham gia công việc được mỗi bên chỉ định / thông báo bằng văn bản, trong phạm vi cần thiết và có nghĩa vụ bảo mật tương ứng. Chia sẻ ngoài nhóm này cần được bên cung cấp chấp thuận hoặc có yêu cầu hợp pháp.',
  return_delete_terms: 'Khi được yêu cầu hoặc kết thúc mục đích trao đổi, hai bên thống nhất thời hạn và cách hoàn trả / xóa thông tin, bản sao và xác nhận xử lý. Hồ sơ phải lưu theo yêu cầu pháp luật được giữ trong phạm vi cần thiết và tiếp tục được bảo vệ; không tự cam kết xóa trái nghĩa vụ lưu giữ.',
});
const partyFields = DOCUMENT_FIELDS.slice(0, 21).map(field => field.name);
const essentials = ['document_ref', 'document_date', 'signing_place', 'company_legal_name', 'company_tax_id', 'company_registered_address', 'company_representative', 'company_representative_title', 'partner_legal_name', 'partner_address', 'partner_representative', 'partner_representative_title'];
export const DOCUMENT_TEMPLATES = Object.freeze([
  { id: 'partner_agreement', title: 'Thỏa thuận giới thiệu khách hàng và hoa hồng', description: 'Bản nháp điều kiện hợp tác; chưa tự cấp quyền đại diện hoặc xác nhận khoản chi.',
    fields: [...partyFields, 'partner_role', 'product_scope', 'referral_scope', 'lead_ownership_terms', 'commission_basis', 'commission_policy', 'commission_policy_notes', 'commission_cost_terms', 'first_order_rate_percent', 'repeat_rate_percent', 'repeat_order_limit', 'approved_expense_budget', 'effective_date', 'end_date', 'settlement_terms', 'tax_terms', 'termination_terms', 'dispute_terms', 'other_terms'],
    required: [...essentials, 'partner_role', 'product_scope', 'referral_scope', 'lead_ownership_terms', 'commission_basis', 'commission_policy', 'commission_cost_terms', 'first_order_rate_percent', 'repeat_order_limit', 'approved_expense_budget', 'effective_date', 'settlement_terms', 'tax_terms', 'termination_terms', 'dispute_terms'] },
  { id: 'mutual_nda', title: 'Thỏa thuận bảo mật thông tin hai chiều', description: 'Bản nháp dùng khi trao đổi thông tin kinh doanh / trà; phạm vi và thời hạn cần xác nhận.',
    fields: [...partyFields, 'nda_purpose', 'confidentiality_scope', 'permitted_recipients', 'confidentiality_duration_months', 'effective_date', 'end_date', 'return_delete_terms', 'dispute_terms', 'other_terms'],
    required: [...essentials, 'nda_purpose', 'confidentiality_scope', 'permitted_recipients', 'confidentiality_duration_months', 'effective_date', 'return_delete_terms', 'dispute_terms'] },
  { id: 'commission_minutes', title: 'Biên bản đối soát hoa hồng', description: 'Bản nháp đối chiếu số liệu; không phải xác nhận đã trả tiền, hóa đơn hoặc chứng từ thu/chi.',
    fields: [...partyFields, 'period_start', 'period_end', 'agreement_reference', 'order_references', 'commission_basis', 'commission_cost_terms', 'collected_amount', 'vat_amount', 'billed_shipping_amount', 'refunded_amount', 'cancelled_amount', 'internal_cost_total', 'commission_rate_percent', 'adjustment_amount', 'adjustment_reason', 'settlement_terms', 'tax_terms', 'other_terms'],
    required: [...essentials, 'period_start', 'period_end', 'agreement_reference', 'order_references', 'commission_basis', 'collected_amount', 'vat_amount', 'billed_shipping_amount', 'refunded_amount', 'cancelled_amount', 'commission_rate_percent', 'adjustment_amount', 'settlement_terms', 'tax_terms'] },
].map(template => Object.freeze({ ...template, fields: Object.freeze(template.fields), required: Object.freeze(template.required) })));
const templateFor = id => DOCUMENT_TEMPLATES.find(template => template.id === id);
const empty = value => value === null || value === undefined || value === '';
const object = value => Boolean(value && typeof value === 'object' && !Array.isArray(value));
const cleanText = value => value.normalize('NFC').replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u061c\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/g, '').replace(/[\t ]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim();
function isoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  return year >= 1 && month >= 1 && month <= 12 && day >= 1 && day <= [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
}

export function normalizeDocumentDraft(input = {}) {
  const data = { ...DOCUMENT_DEFAULTS }, errors = {};
  if (!object(input)) return { data, errors: { _form: 'Bản nháp phải là một đối tượng JSON.' } };
  if (input.template_id !== undefined) {
    if (!templateFor(input.template_id)) errors.template_id = 'Chọn mẫu văn bản hợp lệ.';
    else data.template_id = input.template_id;
  }
  for (const field of DOCUMENT_FIELDS) {
    if (!Object.hasOwn(input, field.name)) continue;
    const value = input[field.name];
    if (field.type === 'number') {
      if (empty(value)) { data[field.name] = null; continue; }
      const raw = typeof value === 'string' ? value.trim() : String(value);
      const precision = field.integer ? 0 : field.precision ?? 2;
      const pattern = new RegExp(`^-?\\d+${precision ? `(?:\\.\\d{1,${precision}})?` : ''}$`);
      const parsed = Number(raw);
      if (!['string', 'number'].includes(typeof value) || !pattern.test(raw) || !Number.isFinite(parsed) || parsed < field.min || parsed > field.max || (field.integer && !Number.isInteger(parsed))) errors[field.name] = `Nhập số hợp lệ từ ${field.min} đến ${field.max}${field.integer ? ' (số nguyên)' : ''}.`;
      else data[field.name] = parsed;
    } else {
      if (value === null) { data[field.name] = ''; continue; }
      if (typeof value !== 'string') { errors[field.name] = 'Thông tin phải là văn bản.'; continue; }
      let cleaned = cleanText(value);
      if (field.type !== 'textarea') cleaned = cleaned.replace(/\s+/g, ' ');
      if (cleaned.length > field.maxLength) { errors[field.name] = `Nhập tối đa ${field.maxLength} ký tự.`; cleaned = cleaned.slice(0, field.maxLength).replace(/[\ud800-\udbff]$/, ''); }
      if (field.type === 'date' && cleaned && !isoDate(cleaned)) { errors[field.name] = 'Nhập ngày có thật theo dạng YYYY-MM-DD.'; continue; }
      if (field.type === 'email' && cleaned && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)) errors[field.name] = 'Nhập email hợp lệ hoặc để trống.';
      if (field.options && !field.options.some(option => option.value === cleaned)) errors[field.name] = 'Chọn cơ sở tính hợp lệ.';
      data[field.name] = cleaned;
    }
  }
  return { data, errors };
}

export function createDocumentDraft(templateId = 'partner_agreement', input = {}) {
  if (!templateFor(templateId)) throw new Error('document_template_invalid');
  return normalizeDocumentDraft({ ...(object(input) ? input : {}), template_id: templateId }).data;
}

// No legal identity is inferred from a trading name, contact person or region.
// Explicit whitelist means bank data, review notes, costs and margins never travel.
export function prefillPartner(partner = {}) {
  if (!object(partner)) return {};
  const values = {
    partner_trade_name: partner.business_name,
    partner_contact_name: partner.contact_name,
    partner_contact_phone: partner.phone,
    partner_contact_email: partner.email,
    partner_code: partner.code,
    partner_region: partner.region,
    commission_basis: partner.commission_basis ?? 'revenue',
    first_order_rate_percent: partner.first_order_rate_percent ?? partner.default_rate_percent ?? partner.rate_percent ?? null,
    repeat_rate_percent: partner.repeat_rate_percent ?? null,
    repeat_order_limit: partner.repeat_order_limit ?? null,
  };
  const classic = object(partner.classic_agreement) ? partner.classic_agreement : null;
  if (classic) Object.assign(values, { commission_policy:'classic', commission_basis:'profit', first_order_rate_percent:classic.first_rate,
    repeat_rate_percent:classic.repeat_rate, repeat_order_limit:null,
    commission_policy_notes:`Classic / hạng, phiên bản ${classic.version}. Chỉ đơn do đối tác mang về và được Hoàng Long xác nhận nguồn. Hệ số thưởng doanh thu theo kỳ ${classic.monthly_bonus_multiplier}; chỉ dùng khi bảng thưởng đã được duyệt. Thưởng cá nhân theo quyết định riêng. Không cộng chồng hoa hồng tỷ lệ với hưởng chênh giá.` });
  const input = Object.fromEntries(Object.entries(values).filter(([, value]) => value !== undefined));
  const normalized = normalizeDocumentDraft(input);
  return Object.fromEntries(Object.keys(input).map(key => [key, normalized.data[key]]));
}

const cash = value => `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(value)} VND`;
const percent = value => `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 4 }).format(value)}%`;
function reconciliationAmounts(data, errors) {
  const keys = ['collected_amount', 'vat_amount', 'billed_shipping_amount', 'refunded_amount', 'cancelled_amount'];
  const amounts = { eligibleBase: null, revenueBase: null, commissionBase: null, profitBase: null, calculatedCommission: null, proposedCommission: null };
  if (keys.some(key => empty(data[key]) || errors[key])) return amounts;
  const cents = value => BigInt(Math.round(value * 100));
  const base = [data.vat_amount, data.billed_shipping_amount, data.refunded_amount, data.cancelled_amount].reduce((sum, value) => sum - cents(value), cents(data.collected_amount));
  amounts.eligibleBase = Number(base > 0n ? base : 0n) / 100;
  amounts.revenueBase = amounts.eligibleBase;
  const revenue = base > 0n ? base : 0n;
  const costsKnown = !empty(data.internal_cost_total) && !errors.internal_cost_total;
  const profit = costsKnown ? revenue - cents(data.internal_cost_total) : null;
  amounts.profitBase = profit === null ? null : Number(profit > 0n ? profit : 0n) / 100;
  if (!['profit', 'revenue'].includes(data.commission_basis) || errors.commission_basis) return amounts;
  if (data.commission_basis === 'profit' && !costsKnown) return amounts;
  const commissionBase = data.commission_basis === 'profit' ? (profit > 0n ? profit : 0n) : revenue;
  amounts.commissionBase = Number(commissionBase) / 100;
  if (empty(data.commission_rate_percent) || errors.commission_rate_percent) return amounts;
  const rate = BigInt(Math.round(data.commission_rate_percent * 10000));
  const calculated = (commissionBase * rate + 50000000n) / 100000000n;
  amounts.calculatedCommission = Math.min(Math.floor(amounts.commissionBase), Number(calculated));
  if (!empty(data.adjustment_amount) && !errors.adjustment_amount) amounts.proposedCommission = amounts.calculatedCommission + data.adjustment_amount;
  return amounts;
}

export function validateDocument(templateId, input = {}, { forExport = false } = {}) {
  const normalized = normalizeDocumentDraft(input), data = { ...normalized.data, template_id: templateId }, errors = { ...normalized.errors };
  const template = templateFor(templateId);
  if (template) for (const key of Object.keys(errors)) if (!template.fields.includes(key) && !['_form', 'template_id'].includes(key)) delete errors[key];
  if (!template) errors.template_id = 'Chọn mẫu văn bản hợp lệ.';
  const required = [...(template?.required || [])];
  if (templateId === 'partner_agreement' && data.commission_policy === 'classic') {
    const limitIndex=required.indexOf('repeat_order_limit'); if(limitIndex>=0)required.splice(limitIndex,1);
    required.push('repeat_rate_percent');
    if(data.commission_basis!=='profit')errors.commission_basis='Classic tính trên lãi sau chi phí, trước hoa hồng.';
  } else if (templateId === 'partner_agreement' && data.repeat_order_limit > 0) required.push('repeat_rate_percent');
  if (templateId === 'commission_minutes' && data.adjustment_amount !== null && data.adjustment_amount !== 0) required.push('adjustment_reason');
  if (templateId === 'commission_minutes' && data.commission_basis === 'profit') required.push('internal_cost_total');
  for (const [start, end] of templateId === 'commission_minutes' ? [['period_start', 'period_end']] : [['effective_date', 'end_date']]) {
    if (data[start] && data[end] && data[start] > data[end]) errors[end] = 'Ngày kết thúc không được trước ngày bắt đầu.';
  }
  const missing = [...new Set(required)].filter(name => empty(data[name]));
  const missingFields = missing.map(name => ({ name, label: DOCUMENT_SCHEMA[name].label }));
  if (forExport) for (const name of missing) errors[name] ||= 'Cần xác nhận thông tin trước khi in / xuất để sử dụng.';
  const amounts = reconciliationAmounts(data, errors);
  if (templateId === 'commission_minutes' && amounts.proposedCommission !== null && (amounts.proposedCommission < 0 || amounts.proposedCommission > amounts.commissionBase)) {
    errors.adjustment_amount = 'Hoa hồng sau điều chỉnh phải nằm trong cơ sở tính đủ điều kiện.';
    amounts.proposedCommission = null;
  }
  const warnings = [DOCUMENT_DRAFT_WARNING];
  if (missing.length) warnings.push(`Còn thiếu ${missing.length} mục cần xác nhận; bản xem trước dùng chỗ trống, chưa đủ để in / xuất sử dụng.`);
  if (Object.keys(errors).length) warnings.push('Có dữ liệu chưa hợp lệ; cần sửa các mục được đánh dấu.');
  if (templateId === 'commission_minutes') warnings.push('Biên bản này chỉ là số liệu đề xuất đối chiếu, không xác nhận đã trả hoa hồng. Không trừ trùng VAT, vận chuyển, tiền hoàn và tiền đơn hủy; nhóm đơn khác tỷ lệ cần tách bảng kê.');
  return { valid: Boolean(template) && !missing.length && !Object.keys(errors).length, data, errors, missing, missingFields, warnings, amounts };
}

export function buildDocument(templateId, input = {}) {
  const template = templateFor(templateId);
  if (!template) throw new Error('document_template_invalid');
  const validation = validateDocument(templateId, input, { forExport: true });
  const data = validation.data;
  const value = key => empty(data[key]) ? `[Chưa điền: ${DOCUMENT_SCHEMA[key].label}]` : DOCUMENT_SCHEMA[key].type === 'date' ? data[key].split('-').reverse().join('/') : String(data[key]);
  const rate = key => empty(data[key]) ? `[Chưa thống nhất: ${DOCUMENT_SCHEMA[key].label}]` : percent(data[key]);
  const money = key => empty(data[key]) ? `[Chưa xác nhận: ${DOCUMENT_SCHEMA[key].label}]` : cash(data[key]);
  const sections = [
    { title: 'Thông tin văn bản', paragraphs: [`Số / mã: ${value('document_ref')}. Ngày lập: ${value('document_date')}. Địa điểm: ${value('signing_place')}.`] },
    { title: 'Các bên giao kết', paragraphs: [
      `BÊN A: ${value('company_legal_name')}. MST: ${value('company_tax_id')}. Địa chỉ đăng ký: ${value('company_registered_address')}. Người ký: ${value('company_representative')}. Tư cách / thẩm quyền: ${value('company_representative_title')}.`,
      `BÊN B: ${value('partner_legal_name')}. ${data.partner_trade_name ? `Tên hoạt động: ${data.partner_trade_name}. ` : ''}${data.partner_tax_id ? `MST: ${data.partner_tax_id}. ` : ''}Địa chỉ: ${value('partner_address')}. Người ký: ${value('partner_representative')}. Tư cách / thẩm quyền: ${value('partner_representative_title')}.`,
      [data.partner_code && `Mã đối tác: ${data.partner_code}`, data.partner_region && `Khu vực: ${data.partner_region}`, data.partner_contact_name && `Người liên hệ Bên B: ${data.partner_contact_name}`].filter(Boolean).join('. '),
    ].filter(Boolean) },
  ];
  if (templateId === 'partner_agreement') sections.push(
    { title: '1. Phạm vi và ghi nhận giới thiệu', paragraphs: [`Vai trò: ${value('partner_role')}. Phạm vi sản phẩm: ${value('product_scope')}.`, value('referral_scope'), value('lead_ownership_terms'), 'Chỉ chuyển thông tin liên hệ được phép chia sẻ. Hoàng Long đối chiếu khách trùng / khách đã có và xác nhận hồ sơ được tiếp nhận. Bên B không tự cam kết giá, công nợ, chất lượng hoặc thay mặt Bên A ký kết nếu chưa được ủy quyền riêng.'] },
    { title: '2. Điều kiện hoa hồng', paragraphs: [
      data.commission_policy === 'classic' ? `Hai đơn đủ điều kiện đầu của cùng khách: ${rate('first_order_rate_percent')}. Từ đơn đủ điều kiện thứ ba: ${rate('repeat_rate_percent')}. Chỉ tính các đơn do Bên B mang về, được xác nhận nguồn; các đơn trước cần hoàn tất, thu đủ tiền và không hoàn tiền để được tính vào số lần mua.` : `Đơn đầu đủ điều kiện: ${rate('first_order_rate_percent')}.`,
      data.commission_policy === 'classic' ? 'Chính sách áp dụng cho đơn phát sinh từ ngày hiệu lực, không tự thay đổi quyền hưởng hoặc lịch sử đã chi trả trước đó. Hoa hồng theo hạng không cộng chồng với tỷ lệ tái mua; thưởng doanh thu chọn một chu kỳ tháng hoặc năm, tách riêng thưởng cá nhân và đối soát theo chính sách đã duyệt.' : data.repeat_order_limit === 0 ? 'Không áp dụng hoa hồng cho đơn tái mua theo phạm vi bản nháp này.' : data.repeat_order_limit === null ? 'Quyền hưởng đơn tái mua: chưa thống nhất số đơn và tỷ lệ.' : `Tối đa ${data.repeat_order_limit} đơn tái mua tiếp theo đủ điều kiện, tỷ lệ ${rate('repeat_rate_percent')}; không mặc định hưởng vô thời hạn.`,
      'Doanh thu thực thu đủ điều kiện loại trừ VAT, phí vận chuyển thu của khách, tiền hoàn và doanh thu đơn hủy. Việc giới thiệu, gửi mẫu, ký báo giá hoặc tạo đơn chưa tự tạo quyền nhận hoa hồng. Mỗi khoản loại trừ chỉ tính một lần.',
      data.commission_basis === 'profit' ? 'Cơ sở tính: phần lãi còn lại sau toàn bộ chi phí của đơn đã được xác nhận, trước khi trừ chính hoa hồng. Hoa hồng = tỷ lệ thỏa thuận × max(0, doanh thu thực thu đủ điều kiện - chi phí đã xác nhận). Lãi bằng 0 hoặc âm thì hoa hồng bằng 0; chưa đủ chi phí thì chưa duyệt chi.' : 'Cơ sở tính theo điều kiện doanh thu: tỷ lệ thỏa thuận × doanh thu thực thu đủ điều kiện. Không tự đổi điều kiện đã ký sang tính trên lãi.',
      ...(data.commission_policy_notes ? [value('commission_policy_notes')] : []),
      value('commission_cost_terms'),
      'Nhà phân phối mua để bán lại không tự được cộng hoa hồng vào chiết khấu mua sỉ; trường hợp áp dụng đồng thời cần thỏa thuận riêng bằng văn bản.',
      `Ngân sách chi phí giới thiệu được chấp thuận: ${money('approved_expense_budget')}. Chỉ phát sinh chi phí do Bên A chịu khi được chấp thuận riêng; căn cứ, hạn mức và chứng từ phải được hai bên xác nhận.`,
    ] },
    { title: '3. Đối soát, thuế và thực hiện', paragraphs: [value('settlement_terms'), 'Thay đổi đơn, hoàn tiền hoặc quyền hưởng phải được đối chiếu lại và thống nhất cách xử lý, giữ nguyên lịch sử chi trả. Văn bản thỏa thuận không thay thế chứng từ chuyển / nhận tiền.', value('tax_terms')] },
    { title: '4. Thời gian, chấm dứt và bất đồng', paragraphs: [`Ngày bắt đầu: ${value('effective_date')}. ${data.end_date ? `Ngày kết thúc: ${value('end_date')}.` : 'Ngày kết thúc chưa ghi; hai bên cần xác nhận phạm vi thời gian trước khi ký.'}`, value('termination_terms'), value('dispute_terms')] },
  );
  if (templateId === 'mutual_nda') sections.push(
    { title: '1. Mục đích và phạm vi hai chiều', paragraphs: [value('nda_purpose'), `Nhóm thông tin: ${value('confidentiality_scope')}.`, 'Mỗi bên có thể là bên cung cấp hoặc bên nhận thông tin. Thông tin chỉ được sử dụng cho mục đích đã thống nhất; không tự chuyển giao quyền sở hữu, công thức, nhãn hiệu hoặc quyền khai thác thương mại.'] },
    { title: '2. Sử dụng và giới hạn tiếp cận', paragraphs: [`Người / nhóm được tiếp cận: ${value('permitted_recipients')}.`, 'Bên nhận quản lý truy cập phù hợp, chỉ chia sẻ trong phạm vi cần thiết với người có nghĩa vụ bảo mật tương ứng. Không cung cấp trái phép thông tin khách hàng hoặc dữ liệu cá nhân; việc chia sẻ phải có căn cứ và phạm vi phù hợp.', 'Không coi là thông tin mật nếu có căn cứ chứng minh thông tin đã công khai hợp pháp, đã được biết hợp pháp trước khi nhận, tự phát triển độc lập hoặc được bên thứ ba cung cấp hợp pháp mà không có nghĩa vụ bảo mật. Khi phải cung cấp theo yêu cầu hợp pháp, chỉ cung cấp trong phạm vi cần thiết và thông báo cho bên cung cấp nếu pháp luật cho phép.'] },
    { title: '3. Thời gian, hoàn trả và sự cố', paragraphs: [`Bắt đầu: ${value('effective_date')}. ${data.end_date ? `Kết thúc trao đổi: ${value('end_date')}. ` : ''}Thời hạn bảo mật sau khi kết thúc trao đổi: ${empty(data.confidentiality_duration_months) ? '[Chưa thống nhất số tháng]' : `${data.confidentiality_duration_months} tháng`}.`, value('return_delete_terms'), 'Khi phát hiện truy cập / tiết lộ ngoài phạm vi, thông báo đầu mối bên kia, phối hợp hạn chế ảnh hưởng và lưu bằng chứng xử lý. Hồ sơ phải lưu theo yêu cầu pháp luật được bảo vệ trong thời gian lưu giữ.'] },
    { title: '4. Xử lý bất đồng', paragraphs: [value('dispute_terms')] },
  );
  if (templateId === 'commission_minutes') {
    const amount = key => validation.amounts[key] === null ? '[Chưa đủ số liệu hợp lệ để tính]' : cash(validation.amounts[key]);
    sections.push(
      { title: '1. Kỳ và căn cứ đối chiếu', paragraphs: [`Từ ${value('period_start')} đến ${value('period_end')}. Căn cứ: ${value('agreement_reference')}.`, value('order_references'), 'Chỉ đối chiếu các đơn thuộc phạm vi đã được tiếp nhận và đủ điều kiện theo thỏa thuận. Khác tỷ lệ hoặc khác cơ sở tính phải tách bảng kê, không tự áp dụng một tỷ lệ cho mọi đơn.'] },
      { title: '2. Số liệu đối chiếu (VND)', paragraphs: [
        `Tiền thực thu: ${money('collected_amount')}. VAT còn lại loại trừ: ${money('vat_amount')}. Vận chuyển thu của khách còn lại loại trừ: ${money('billed_shipping_amount')}.`,
        `Tiền thực hoàn: ${money('refunded_amount')}. Phần thu từ đơn hủy chưa nằm trong khoản hoàn: ${money('cancelled_amount')}. Mỗi khoản chỉ loại trừ một lần; không dùng giá trị báo giá hoặc tổng đơn thay cho tiền đã thu.`,
        `Doanh thu đủ điều kiện: ${amount('revenueBase')}. ${data.commission_basis === 'profit' ? `Chi phí trước hoa hồng: ${money('internal_cost_total')}. Lãi đủ điều kiện: ${amount('profitBase')}.` : 'Tính theo điều kiện doanh thu.'} Cơ sở tính hoa hồng: ${amount('commissionBase')}. Tỷ lệ đối chiếu: ${rate('commission_rate_percent')}. Hoa hồng theo tỷ lệ, làm tròn nguyên đồng: ${amount('calculatedCommission')}.`,
        data.commission_basis === 'profit' ? value('commission_cost_terms') : 'Giữ điều kiện doanh thu đã được thống nhất; không đổi cơ sở tính bằng việc lập biên bản này.',
        `Điều chỉnh có căn cứ: ${money('adjustment_amount')}. ${data.adjustment_amount !== null && data.adjustment_amount !== 0 ? `Lý do: ${value('adjustment_reason')}.` : 'Không suy ra một điều chỉnh chưa được nhập / xác nhận.'}`,
        `Hoa hồng sau điều chỉnh: ${amount('proposedCommission')}. Cần hai bên kiểm tra và phê duyệt; không phải thông báo đã chuyển hoặc đã nhận tiền.`,
      ] },
      { title: '3. Điểm cần xác nhận và bước tiếp theo', paragraphs: [value('settlement_terms'), value('tax_terms'), 'Biên bản dự thảo chưa xác nhận số dư công nợ cuối cùng, đã thanh toán hoặc đã hoàn thành nghĩa vụ. Các khoản hoàn / hủy, thay đổi quyền hưởng đơn đầu / tái mua và chênh lệch cần được đối chiếu riêng với chứng từ; lịch sử chi trả không bị sửa bởi việc lập bản này.'] },
    );
  }
  if (data.other_terms) sections.push({ title: 'Nội dung bổ sung do người lập nhập', paragraphs: [data.other_terms] });
  sections.push({ title: 'Liên hệ và rà soát trước ký', paragraphs: [
    [data.company_contact_phone && `Bên A: ${data.company_contact_phone}`, data.company_contact_email, data.partner_contact_phone && `Bên B: ${data.partner_contact_phone}`, data.partner_contact_email].filter(Boolean).join(' · ') || 'Đầu mối liên hệ: [Chưa điền].',
    `Liên hệ thương hiệu: ${EVENT_CONTACT.name} · ${EVENT_CONTACT.website}. Thông tin thương hiệu / người liên hệ không thay thế pháp nhân và thẩm quyền ký đã xác minh.`,
  ] });
  const signatureBlocks = [
    { title: 'ĐẠI DIỆN BÊN A', name: data.company_representative, titleRole: data.company_representative_title },
    { title: 'ĐẠI DIỆN BÊN B', name: data.partner_representative, titleRole: data.partner_representative_title },
  ];
  const plainText = [DOCUMENT_DRAFT_WARNING, template.title.toLocaleUpperCase('vi-VN'), ...sections.flatMap(section => ['', section.title, ...section.paragraphs]), '', ...signatureBlocks.flatMap(block => [block.title, 'Ký, ghi rõ họ tên / chức danh; đóng dấu khi áp dụng:', '', '________________________________', block.name || '[Họ tên người ký]', block.titleRole || '[Tư cách / thẩm quyền ký]', 'Ngày ký: ____ / ____ / ______', ''])].join('\n');
  return { templateId, title: template.title, sections, signatureBlocks, plainText, validation, warnings: validation.warnings, draft: true };
}
