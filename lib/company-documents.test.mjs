import test from 'node:test';
import assert from 'node:assert/strict';
import { EVENT_CONTACT } from './event-contact.js';
import { DOCUMENT_FIELDS, DOCUMENT_SCHEMA, DOCUMENT_DEFAULTS, DOCUMENT_TEMPLATES, createDocumentDraft, normalizeDocumentDraft, prefillPartner, validateDocument, buildDocument } from './company-documents.js';

const identities = {
  document_ref: 'TEST-ONLY-01', document_date: '2026-10-14', signing_place: 'Nơi kiểm thử',
  company_legal_name: 'Pháp nhân kiểm thử A', company_tax_id: 'TEST-MST-A', company_registered_address: 'Địa chỉ pháp nhân kiểm thử A',
  company_representative: 'Người ký kiểm thử A', company_representative_title: 'Được ủy quyền trong dữ liệu kiểm thử',
  partner_legal_name: 'Pháp nhân kiểm thử B', partner_address: 'Địa chỉ kiểm thử B', partner_representative: 'Người ký kiểm thử B', partner_representative_title: 'Đại diện kiểm thử B',
};
const agreement = {
  ...identities, partner_role: 'Giới thiệu khách', product_scope: 'Hồng trà kiểm thử', referral_scope: 'Khách có nhu cầu và đồng ý chia sẻ liên hệ', lead_ownership_terms: 'Chỉ tiếp nhận sau đối chiếu trùng và xác nhận',
  first_order_rate_percent: 3, repeat_order_limit: 0, approved_expense_budget: 0, effective_date: '2026-10-14',
  settlement_terms: 'Đối soát rồi xác nhận kỳ chi trả bằng văn bản', tax_terms: 'Hai bên xác nhận thuế và chứng từ theo tư cách thực tế', termination_terms: 'Thông báo và đối chiếu hồ sơ đang thực hiện', dispute_terms: 'Thương lượng; cơ chế tiếp theo được xác nhận trước khi ký',
};
const minutes = {
  ...identities, commission_basis: 'revenue', period_start: '2026-09-01', period_end: '2026-09-30', agreement_reference: 'TEST-AGREEMENT', order_references: 'TEST-ORDER-1 và bảng kê kiểm thử',
  collected_amount: 1000000, vat_amount: 80000, billed_shipping_amount: 20000, refunded_amount: 50000, cancelled_amount: 50000,
  commission_rate_percent: 3, adjustment_amount: 0, settlement_terms: 'Số liệu đề xuất chờ hai bên đối chiếu', tax_terms: 'Thuế và chứng từ cần xác nhận',
};

test('defaults keep legal identity, dates, percentages and amounts unknown while reusing only public contact', () => {
  for (const name of ['company_legal_name', 'company_tax_id', 'company_registered_address', 'company_representative', 'company_representative_title', 'document_date']) assert.equal(DOCUMENT_DEFAULTS[name], '');
  for (const name of ['first_order_rate_percent', 'repeat_rate_percent', 'repeat_order_limit', 'approved_expense_budget', 'collected_amount', 'adjustment_amount']) assert.equal(DOCUMENT_DEFAULTS[name], null);
  assert.equal(DOCUMENT_DEFAULTS.company_contact_phone, EVENT_CONTACT.phoneLabel);
  const a = createDocumentDraft(), b = createDocumentDraft(); a.company_legal_name = 'Changed';
  assert.equal(b.company_legal_name, '');
  assert.throws(() => createDocumentDraft('unknown'), /document_template_invalid/);
  assert.equal(new Set(DOCUMENT_FIELDS.map(field => field.name)).size, DOCUMENT_FIELDS.length);
  for (const template of DOCUMENT_TEMPLATES) for (const name of [...template.fields, ...template.required]) assert.ok(DOCUMENT_SCHEMA[name], name);
});

test('partner prefill preserves unknown and zero rates without assuming legal or signatory identity', () => {
  const data = prefillPartner({ business_name: 'Thương hiệu đối tác', contact_name: 'Người trao đổi', email: 'test@example.test', phone: '0900000000', region: 'Hà Nội', code: 'HL-P-TEST', first_order_rate_percent: null, default_rate_percent: 3, repeat_rate_percent: null, repeat_order_limit: 0, notes: 'PRIVATE-REVIEW', bank_account: 'PRIVATE-BANK', internal_cost_total: 900000, margin: 0.4 });
  assert.equal(data.partner_trade_name, 'Thương hiệu đối tác'); assert.equal(data.partner_contact_name, 'Người trao đổi');
  assert.equal(data.first_order_rate_percent, 3); assert.equal(data.repeat_rate_percent, null); assert.equal(data.repeat_order_limit, 0);
  for (const key of ['partner_legal_name', 'partner_representative', 'partner_address', 'notes', 'bank_account', 'internal_cost_total', 'margin']) assert.equal(Object.hasOwn(data, key), false);
  assert.equal(prefillPartner({ first_order_rate_percent: 0, default_rate_percent: 5 }).first_order_rate_percent, 0);
  assert.equal(prefillPartner({ rate_percent: 2.5 }).first_order_rate_percent, 2.5);
  assert.equal(prefillPartner({}).first_order_rate_percent, null);
  assert.deepEqual(prefillPartner(null), {});
});

test('normalization whitelists resumable JSON and strips controls without exporting unapproved source fields', () => {
  const source = { ...createDocumentDraft('mutual_nda'), partner_trade_name: '  Hoàng\u200b Long\u202e  ', other_terms: 'Dòng một\r\n\r\nDòng hai', service_role_key: 'SECRET', bank_account: 'SECRET-BANK', internal_notes: 'SECRET-NOTE', internal_cost_total: 1200000 };
  const { data, errors } = normalizeDocumentDraft(JSON.parse(JSON.stringify(source)));
  assert.deepEqual(errors, {}); assert.equal(data.partner_trade_name, 'Hoàng Long'); assert.equal(data.other_terms, 'Dòng một\n\nDòng hai');
  assert.equal(JSON.stringify(data).includes('SECRET'), false);
  const output = buildDocument('mutual_nda', source);
  assert.equal(output.plainText.includes('SECRET'), false); assert.equal(output.plainText.includes('1200000'), false);
  assert.ok(normalizeDocumentDraft([]).errors._form); assert.ok(normalizeDocumentDraft({ template_id: 'forged' }).errors.template_id);
  assert.ok(normalizeDocumentDraft({ company_legal_name: 'x'.repeat(241) }).errors.company_legal_name);
  assert.equal(normalizeDocumentDraft({ company_legal_name: 'x'.repeat(241) }).data.company_legal_name.length, 240);
});

test('amounts, percentages and counts reject coercion, non-finite, negative and excessive inputs', () => {
  for (const value of [true, {}, [], Infinity, NaN, -1, 100.0001, '1e2', '3.12345']) assert.ok(normalizeDocumentDraft({ first_order_rate_percent: value }).errors.first_order_rate_percent, String(value));
  for (const value of [-1, Infinity, true, '1e6', 1000000000000]) assert.ok(normalizeDocumentDraft({ approved_expense_budget: value }).errors.approved_expense_budget, String(value));
  for (const value of [0.5, 31, -1]) assert.ok(normalizeDocumentDraft({ repeat_order_limit: value }).errors.repeat_order_limit);
  assert.equal(normalizeDocumentDraft({ first_order_rate_percent: '0', approved_expense_budget: '0', repeat_order_limit: '0' }).data.first_order_rate_percent, 0);
  assert.equal(normalizeDocumentDraft({ first_order_rate_percent: '', approved_expense_budget: null }).data.first_order_rate_percent, null);
  assert.equal(normalizeDocumentDraft({ first_order_rate_percent: '8.3333' }).data.first_order_rate_percent, 8.3333);
  assert.ok(normalizeDocumentDraft({ adjustment_amount: 0.5 }).errors.adjustment_amount);
});

test('real dates and chronological periods are checked without inventing current dates', () => {
  assert.ok(normalizeDocumentDraft({ document_date: '2025-02-29' }).errors.document_date);
  assert.ok(normalizeDocumentDraft({ document_date: '2026-04-31' }).errors.document_date);
  assert.equal(normalizeDocumentDraft({ document_date: '2028-02-29' }).data.document_date, '2028-02-29');
  assert.ok(validateDocument('commission_minutes', { ...minutes, period_end: '2026-08-31' }, { forExport: true }).errors.period_end);
  assert.ok(validateDocument('partner_agreement', { ...agreement, end_date: '2026-10-13' }, { forExport: true }).errors.end_date);
});

test('preview tolerates missing essentials as marked draft placeholders, while print validation blocks them', () => {
  const preview = buildDocument('partner_agreement', {});
  assert.equal(preview.draft, true); assert.equal(preview.validation.valid, false); assert.ok(preview.validation.missing.includes('company_legal_name'));
  assert.match(preview.plainText, /BẢN NHÁP NỘI BỘ/); assert.match(preview.plainText, /\[Chưa điền: Tên pháp nhân/);
  assert.ok(validateDocument('partner_agreement', {}, { forExport: true }).errors.company_legal_name);
  assert.equal(validateDocument('partner_agreement', agreement, { forExport: true }).valid, true);
  assert.throws(() => buildDocument('unknown', {}), /document_template_invalid/);
});

test('repeat limit zero explicitly excludes repeat commission; positive limits require an agreed rate', () => {
  const output = buildDocument('partner_agreement', { ...agreement, repeat_order_limit: 0, repeat_rate_percent: 4 });
  assert.match(output.plainText, /Không áp dụng hoa hồng cho đơn tái mua/);
  assert.equal(output.plainText.includes('tỷ lệ 4%'), false);
  assert.ok(validateDocument('partner_agreement', { ...agreement, repeat_order_limit: 3, repeat_rate_percent: null }, { forExport: true }).errors.repeat_rate_percent);
  const repeat = buildDocument('partner_agreement', { ...agreement, repeat_order_limit: 3, repeat_rate_percent: 1 });
  assert.match(repeat.plainText, /Tối đa 3 đơn tái mua/); assert.match(repeat.plainText, /tỷ lệ 1%/);
  assert.match(output.plainText, /loại trừ VAT, phí vận chuyển thu của khách, tiền hoàn và doanh thu đơn hủy/);
});

test('reconciliation uses explicit cash exclusions, whole VND rounding and does not confirm a payout', () => {
  const output = buildDocument('commission_minutes', minutes);
  assert.equal(output.validation.valid, true);
  assert.equal(output.validation.amounts.eligibleBase, 800000);
  assert.equal(output.validation.amounts.commissionBase, 800000);
  assert.equal(output.validation.amounts.calculatedCommission, 24000);
  assert.equal(output.validation.amounts.proposedCommission, 24000);
  assert.match(output.plainText, /không phải thông báo đã chuyển hoặc đã nhận tiền/);
  assert.match(output.plainText, /chưa xác nhận số dư công nợ cuối cùng, đã thanh toán/);
  assert.equal(Object.hasOwn(output.validation.data, 'paid_amount'), false);
  assert.equal(buildDocument('commission_minutes', { ...minutes, collected_amount: 987654, vat_amount: 0, billed_shipping_amount: 0, refunded_amount: 0, cancelled_amount: 0 }).validation.amounts.calculatedCommission, 29630);
  assert.equal(buildDocument('commission_minutes', { ...minutes, refunded_amount: 1000000 }).validation.amounts.proposedCommission, 0);
});

test('unknown exclusions never become zero; signed adjustments require a reason and stay within eligible cash', () => {
  const unknown = buildDocument('commission_minutes', { ...minutes, vat_amount: null });
  assert.equal(unknown.validation.amounts.eligibleBase, null); assert.match(unknown.plainText, /Chưa đủ số liệu hợp lệ để tính/);
  assert.ok(validateDocument('commission_minutes', { ...minutes, adjustment_amount: 1000 }, { forExport: true }).errors.adjustment_reason);
  assert.ok(validateDocument('commission_minutes', { ...minutes, adjustment_amount: -24001, adjustment_reason: 'Test reason' }, { forExport: true }).errors.adjustment_amount);
  assert.ok(validateDocument('commission_minutes', { ...minutes, adjustment_amount: 900000, adjustment_reason: 'Test reason' }, { forExport: true }).errors.adjustment_amount);
  assert.equal(validateDocument('commission_minutes', { ...minutes, adjustment_amount: -1000, adjustment_reason: 'Test reason' }, { forExport: true }).amounts.proposedCommission, 23000);
});

test('mutual NDA stays bilateral, duration is explicit and signature dates remain unsigned blanks', () => {
  const data = { ...identities, nda_purpose: 'Trao đổi mẫu và cơ hội hợp tác kiểm thử', confidentiality_scope: 'Tài liệu được hai bên xác định', permitted_recipients: 'Đầu mối được chỉ định', confidentiality_duration_months: 12, effective_date: '2026-10-14', return_delete_terms: 'Hoàn trả/xóa theo yêu cầu, trừ hồ sơ phải lưu hợp pháp', dispute_terms: 'Cách xử lý do hai bên xác nhận' };
  const output = buildDocument('mutual_nda', data);
  assert.equal(output.validation.valid, true); assert.match(output.plainText, /Mỗi bên có thể là bên cung cấp hoặc bên nhận/);
  assert.match(output.plainText, /12 tháng/); assert.match(output.plainText, /Ngày ký: ____ \/ ____ \/ ______/);
  assert.equal(output.signatureBlocks.length, 2); assert.equal(output.signatureBlocks[0].name, identities.company_representative);
  assert.ok(validateDocument('mutual_nda', { ...data, confidentiality_duration_months: null }, { forExport: true }).errors.confidentiality_duration_months);
});

test('editable boilerplate reduces blank form work but does not invent commercial facts or leak inactive fields', () => {
  for (const name of ['referral_scope', 'lead_ownership_terms', 'settlement_terms', 'tax_terms', 'termination_terms', 'dispute_terms', 'nda_purpose', 'confidentiality_scope', 'permitted_recipients', 'return_delete_terms']) assert.ok(DOCUMENT_DEFAULTS[name].length > 30, name);
  assert.equal(DOCUMENT_DEFAULTS.product_scope, ''); assert.equal(DOCUMENT_DEFAULTS.partner_role, '');
  assert.equal(DOCUMENT_DEFAULTS.confidentiality_duration_months, null);
  const nda = validateDocument('mutual_nda', { ...identities, effective_date: '2026-10-14', confidentiality_duration_months: 12, first_order_rate_percent: 'invalid' }, { forExport: true });
  assert.equal(nda.valid, true); assert.equal(nda.errors.first_order_rate_percent, undefined);
  const custom = createDocumentDraft('partner_agreement', { settlement_terms: 'Điều khoản do người lập chỉnh sửa' });
  assert.equal(custom.settlement_terms, 'Điều khoản do người lập chỉnh sửa');
});

test('profit drafts calculate after confirmed costs and before the commission itself', () => {
  const draft = { ...minutes, commission_basis: 'profit', collected_amount: 100000000, vat_amount: 0, billed_shipping_amount: 0, refunded_amount: 0, cancelled_amount: 0, internal_cost_total: 85000000 };
  const result = buildDocument('commission_minutes', draft);
  assert.equal(result.validation.valid, true);
  assert.equal(result.validation.amounts.revenueBase, 100000000);
  assert.equal(result.validation.amounts.commissionBase, 15000000);
  assert.equal(result.validation.amounts.proposedCommission, 450000);
  assert.equal(buildDocument('commission_minutes', { ...draft, commission_rate_percent: 5 }).validation.amounts.proposedCommission, 750000);
  assert.match(result.plainText, /Chi phí trước hoa hồng/);
  assert.match(buildDocument('partner_agreement', agreement).plainText, /trước khi trừ chính hoa hồng/);
  assert.equal(createDocumentDraft().commission_basis, 'profit');
  assert.equal(prefillPartner({}).commission_basis, 'revenue');
  assert.equal(prefillPartner({ commission_basis: 'profit' }).commission_basis, 'profit');
  assert.ok(normalizeDocumentDraft({ commission_basis: 'forged' }).errors.commission_basis);
});

test('unknown costs block profit export, explicit zero is valid, and loss yields no commission', () => {
  const draft = { ...minutes, commission_basis: 'profit', collected_amount: 100000000, vat_amount: 0, billed_shipping_amount: 0, refunded_amount: 0, cancelled_amount: 0 };
  const unknown = validateDocument('commission_minutes', draft, { forExport: true });
  assert.equal(unknown.valid, false);
  assert.ok(unknown.errors.internal_cost_total);
  assert.equal(unknown.amounts.commissionBase, null);
  assert.equal(unknown.amounts.proposedCommission, null);
  assert.equal(validateDocument('commission_minutes', { ...draft, internal_cost_total: 0 }, { forExport: true }).amounts.proposedCommission, 3000000);
  const loss = validateDocument('commission_minutes', { ...draft, internal_cost_total: 120000000 }, { forExport: true });
  assert.equal(loss.valid, true); assert.equal(loss.amounts.proposedCommission, 0);
  assert.ok(validateDocument('commission_minutes', { ...draft, internal_cost_total: 120000000, adjustment_amount: 1, adjustment_reason: 'Test' }, { forExport: true }).errors.adjustment_amount);
});
