const text = value => String(value ?? '').trim();
const finite = (value, min = 0, max = 1e12) => value !== '' && value != null && Number.isFinite(Number(value)) && Number(value) >= min && Number(value) <= max;
export const PARTNER_QUOTE_STATUSES = { released: 'Đã cấp giá', submitted: 'Chờ duyệt', approved: 'Đã duyệt báo giá', rejected: 'Chưa được duyệt', revoked: 'Đã thay phiên bản' };
export const partnerQuoteKey = line => `${line.product_id ?? line.productId}__${line.variant_weight ?? line.weight ?? ''}`;
export function normalizePartnerQuoteProposal(terms, input) {
  if (!terms || !['released', 'submitted'].includes(terms.status) || !Array.isArray(input.lines) || input.lines.length !== terms.base_lines.length) throw new Error('invalid_partner_quote');
  const discount = Number(input.discount_percent || 0);
  if (!finite(discount, 0, 100) || text(input.note).length > 1500) throw new Error('invalid_partner_quote');
  const lines = terms.base_lines.map(base => {
    const matches = input.lines.filter(line => partnerQuoteKey(line) === partnerQuoteKey(base) && line.unit === base.unit);
    if (matches.length !== 1) throw new Error('invalid_partner_quote_line');
    const line = matches[0], qty = Number(line.qty), price = Number(line.price);
    if (!finite(line.qty, Number(base.min_qty), Number(base.max_qty)) || !finite(line.price, 0, 999999999) || Math.abs(qty * 1000 - Math.round(qty * 1000)) > .000001 || (!['kg', 'g', 't', 'ton', 'tons'].includes(base.unit) && !Number.isInteger(qty))) throw new Error('invalid_partner_quote_line');
    if (price * (1 - discount / 100) < Number(base.base_price)) throw new Error('partner_quote_below_floor');
    return { product_id: base.product_id, variant_weight: base.variant_weight || '', unit: base.unit, qty, price };
  });
  return { expected_revision: terms.revision, lines, discount_percent: discount, note: text(input.note) };
}
export function partnerQuoteEstimate(terms, input) {
  try {
    const value = normalizePartnerQuoteProposal(terms, input);
    const subtotal = value.lines.reduce((sum, line) => sum + line.qty * line.price, 0);
    const total = Math.round(subtotal * (1 - value.discount_percent / 100));
    const base = value.lines.reduce((sum, line) => sum + line.qty * Number(terms.base_lines.find(b => partnerQuoteKey(b) === partnerQuoteKey(line)).base_price), 0);
    return { total, difference: terms.remuneration_mode === 'price_difference' ? Math.max(0, total - base) : null };
  } catch { return null; }
}
// Customer print/export uses this allowlist. Never serialize the private terms.
export function partnerCustomerQuote(terms) {
  if (terms?.status !== 'approved' || !terms.quote_id) return null;
  return {
    id: terms.quote_id, customer_name: text(terms.customer_name), valid_until: terms.valid_until,
    terms: text(terms.commercial_terms), discount_percent: Number(terms.discount_percent || 0), total: Number(terms.total),
    lines: (terms.proposed_lines || []).map(line => ({ name: typeof line.name === 'object' ? text(line.name.vi || line.name.en) : text(line.name), qty: Number(line.qty), unit: text(line.unit), price: Number(line.price) })),
  };
}
