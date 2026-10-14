// Editable suggestions only. Applying a preset does not approve an agreement,
// grant a staff role, change existing commissions or record any payment.
const rateFields = ['first_order_rate_percent', 'repeat_rate_percent', 'repeat_order_limit'];
export const PARTNER_COMMISSION_TIERS = Object.freeze([
  { id: 'custom', label: 'Tự nhập / giữ điều kiện hiện có', description: 'Giữ các giá trị đang nhập; kiểm tra và thống nhất riêng.', values: null, partnerRole: null },
  { id: 'referral', label: 'Giới thiệu khách', description: 'Gợi ý 3% lãi sau toàn bộ chi phí cho đơn đầu; 1% cho tối đa 3 đơn tái mua. Lãi được tính trước hoa hồng.', values: { commission_basis: 'profit', first_order_rate_percent: 3, repeat_rate_percent: 1, repeat_order_limit: 3 }, partnerRole: 'Giới thiệu khách' },
  { id: 'assisted', label: 'Hỗ trợ chốt đơn', description: 'Gợi ý 5% lãi sau toàn bộ chi phí cho đơn đầu; 2% cho tối đa 3 đơn tái mua. Lãi được tính trước hoa hồng.', values: { commission_basis: 'profit', first_order_rate_percent: 5, repeat_rate_percent: 2, repeat_order_limit: 3 }, partnerRole: 'Hỗ trợ chốt đơn' },
  { id: 'negotiated', label: 'Bulk / xuất khẩu · thỏa thuận riêng', description: 'Cơ sở là lãi sau toàn bộ chi phí, nhưng chưa đặt tỷ lệ. Không cấp quyền hưởng tái mua; cần nhập điều kiện đã thỏa thuận.', values: { commission_basis: 'profit', first_order_rate_percent: null, repeat_rate_percent: null, repeat_order_limit: 0 }, partnerRole: 'Bulk / xuất khẩu · thỏa thuận riêng' },
].map(tier => Object.freeze({ ...tier, values: tier.values ? Object.freeze(tier.values) : null })));

export const getCommissionTier = id => PARTNER_COMMISSION_TIERS.find(tier => tier.id === id) || null;
const object = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const editableValue = value => typeof value === 'string' || (typeof value === 'number' && Number.isFinite(value)) ? value : null;

function currentRates(input, sanitize = true) {
  const values = object(input);
  const keep = value => sanitize ? editableValue(value) : value;
  return {
    commission_basis: values.commission_basis === undefined || values.commission_basis === null ? 'revenue' : sanitize ? typeof values.commission_basis === 'string' ? values.commission_basis : null : values.commission_basis,
    first_order_rate_percent: keep(values.first_order_rate_percent ?? values.default_rate_percent ?? null),
    repeat_rate_percent: keep(values.repeat_rate_percent ?? null),
    repeat_order_limit: keep(values.repeat_order_limit ?? null),
  };
}

// A patch deliberately contains only editable rates and the agreed basis, never
// partner identity, private notes, banking, terms, margin or approval state.
export function applyCommissionTier(id, input = {}) {
  const tier = getCommissionTier(id);
  if (!tier) throw new RangeError('unknown_commission_tier');
  return tier.values ? { ...tier.values } : currentRates(input);
}

function comparable(value, count = false) {
  if (value === null || value === undefined || (typeof value === 'string' && !value.trim())) return null;
  if (!['number', 'string'].includes(typeof value)) return undefined;
  const raw = typeof value === 'string' ? value.trim() : String(value);
  if (!/^\d+(?:\.\d{1,4})?$/.test(raw)) return undefined;
  const numeric = Number(raw);
  if (!Number.isFinite(numeric) || numeric < 0 || numeric > (count ? 30 : 100) || (count && !Number.isInteger(numeric))) return undefined;
  return numeric;
}

// Rate-shape matching is a UI hint, not evidence of an agreed commercial role.
export function getMatchingCommissionTier(input = {}) {
  const values = currentRates(input, false);
  const match = PARTNER_COMMISSION_TIERS.find(tier => tier.values && values.commission_basis === tier.values.commission_basis && rateFields.every(key => comparable(values[key], key === 'repeat_order_limit') === tier.values[key]));
  return match?.id || 'custom';
}

export function companyDocumentTierPatch(id, input = {}) {
  const tier = getCommissionTier(id);
  if (!tier) throw new RangeError('unknown_commission_tier');
  const patch = applyCommissionTier(id, input);
  if (tier.partnerRole) patch.partner_role = tier.partnerRole;
  else if (Object.hasOwn(object(input), 'partner_role')) patch.partner_role = typeof input.partner_role === 'string' ? input.partner_role : '';
  return patch;
}
