export const RETAIL_VOLUME_POLICY = Object.freeze({
  version: 'retail-tea-volume-2026-10-14-v1', freeShippingGrams: 5000,
  tiers: Object.freeze([{ grams: 20000, percent: 3 }, { grams: 50000, percent: 5 }, { grams: 100000, percent: 7 }]),
});

const plain = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const number = '(\\d+(?:[.,]\\d{1,3})?)';
const mass = new RegExp(`^${number}\\s*(kg|g)$`);
const single = new RegExp(`^(?:1\\s*)?(?:vien|banh|goi|hop|piece|cake|pack)s?\\s*\\(\\s*${number}\\s*(kg|g)\\s*\\)$`);
const multiple = new RegExp(`^(\\d+)\\s*[x×]\\s*${number}\\s*(kg|g)$`);

// Uses only an unambiguous net mass or the catalogue's actual kg sale basis.
// "20 viên" and "100g / 500g" remain unknown, never 20kg or a guessed pack.
export function retailOptionGrams(option) {
  if (!option?.product || option.product.kind === 'goods' || option.product.line === 'sample') return 0;
  if (option.unit === 'kg') return 1000;
  if (option.unit === 'g') return 1;
  const spec = plain(option.weight || option.product.packSize);
  let parts = spec.match(mass) || spec.match(single);
  let count = 1;
  if (!parts) {
    const multi = spec.match(multiple);
    if (!multi) return null;
    count = Number(multi[1]);
    parts = [multi[0], multi[2], multi[3]];
  }
  const grams = Number(parts[1].replace(',', '.')) * (parts[2] === 'kg' ? 1000 : 1) * count;
  return Number.isFinite(grams) && grams > 0 && grams <= 1000000000 ? grams : null;
}

export function retailVolumeBenefits(lines = []) {
  let teaGrams = 0, subtotal = 0, eligibleSubtotal = 0, unknownTeaWeight = false;
  for (const line of lines) {
    const qty = Number(line.qty), price = Number(line.price);
    if (!Number.isInteger(qty) || qty < 1 || !Number.isFinite(price) || price < 0) throw new Error('invalid_checkout');
    const gross = qty * price, grams = retailOptionGrams(line);
    subtotal += gross;
    const tea = line.product.kind !== 'goods' && line.product.line !== 'sample';
    if (tea && grams === null) unknownTeaWeight = true;
    if (tea && grams > 0) { teaGrams += grams * qty; eligibleSubtotal += gross; }
  }
  teaGrams = Math.round(teaGrams * 1000) / 1000;
  const percent = RETAIL_VOLUME_POLICY.tiers.reduce((rate, tier) => teaGrams >= tier.grams ? tier.percent : rate, 0);
  const discount = Math.round(eligibleSubtotal * percent / 100);
  const nextTier = RETAIL_VOLUME_POLICY.tiers.find(tier => tier.grams > teaGrams) || null;
  return { version: RETAIL_VOLUME_POLICY.version, teaGrams, teaKg: teaGrams / 1000, subtotal,
    eligibleSubtotal, percent, discount, total: Math.round((subtotal - discount) * 100) / 100,
    freeShippingEligible: teaGrams >= RETAIL_VOLUME_POLICY.freeShippingGrams,
    toFreeShippingKg: Math.max(0, RETAIL_VOLUME_POLICY.freeShippingGrams - teaGrams) / 1000,
    nextTier, unknownTeaWeight };
}
