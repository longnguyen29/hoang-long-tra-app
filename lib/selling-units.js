// A selected catalogue variant is one saleable package, not its weight in kg.
// Never convert package counts into mass without a recorded weight conversion.
export const SUPPORTED_SELLING_UNITS = ['kg', 'g', 'pcs', 'pack', 'viên', 'bánh', 'hộp', 'chai', 'cái', 'ton', 'tons', 't'];
export const ORDER_UNIT_CHOICES = ['kg', 'pcs', 'viên', 'bánh', 'hộp', 'chai', 'cái'];

const plain = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
const discreteUnits = { vien: 'viên', banh: 'bánh', hop: 'hộp', chai: 'chai', cai: 'cái', goi: 'pcs', piece: 'viên', cake: 'bánh', box: 'hộp', bottle: 'chai', pack: 'pcs' };

function explicitPackageUnit(spec) {
  // "1 viên (8g)" is a viên; "20 viên" is a package of 20, not 20 sale units.
  const match = plain(spec).match(/^(?:(\d+(?:[.,]\d+)?)\s*)?(vien|banh|hop|chai|cai|goi|piece|cake|box|bottle|pack)s?\b/);
  if (!match) return null;
  return match[1] && Number(match[1].replace(',', '.')) !== 1 ? 'pcs' : discreteUnits[match[2]];
}

export function catalogSellingUnit(product, weight = product?.weight) {
  if (weight) return explicitPackageUnit(weight) || (plain(weight) === 'kg' ? 'kg' : 'pcs');
  const declaredUnit = explicitPackageUnit(product?.packSize ?? product?.pack_size);
  if (declaredUnit) return declaredUnit;
  if (product?.kind === 'goods') return 'cái';
  return product?.line === 'everyday' ? 'kg' : 'pcs';
}

export function sellingUnitLabel(unit, locale = 'vi') {
  const labels = locale === 'en'
    ? { pcs: 'packs', pack: 'packs', 'viên': 'pieces', 'bánh': 'cakes', 'hộp': 'boxes', 'chai': 'bottles', 'cái': 'items', ton: 'tons', tons: 'tons', t: 'tons' }
    : { pcs: 'gói', pack: 'gói', ton: 'tấn', tons: 'tấn', t: 'tấn' };
  return labels[unit] || String(unit || '').trim().slice(0, 40);
}

export function formatLineQuantities(lines, locale = 'vi') {
  const totals = new Map();
  for (const line of Array.isArray(lines) ? lines : []) {
    const qty = Number(line?.qty);
    if (Number.isFinite(qty) && qty > 0 && line?.unit) totals.set(line.unit, (totals.get(line.unit) || 0) + qty);
  }
  const number = new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'vi-VN', { maximumFractionDigits: 3 });
  return [...totals].map(([unit, qty]) => `${number.format(qty)} ${sellingUnitLabel(unit, locale)}`).join(' · ');
}

export function orderLineSellingUnit(line, product, type) {
  // A reorder retains its agreed quantity/price basis until staff explicitly changes it.
  return type === 'wholesale' && SUPPORTED_SELLING_UNITS.includes(line?.sourceUnit)
    ? line.sourceUnit : catalogSellingUnit(product);
}

export function validSaleQuantity(qty, unit, type) {
  const value = Number(qty);
  return Number.isFinite(value) && value > 0
    && (type === 'wholesale' && ['kg', 'g', 't', 'ton', 'tons'].includes(unit) || Number.isInteger(value));
}
