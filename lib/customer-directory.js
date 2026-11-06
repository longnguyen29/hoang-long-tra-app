import { normalizeContact } from './trade-pipeline.js';

export const CUSTOMER_CATEGORIES = [
  { id: 'milk_tea_shop', label: 'Quán trà sữa', hint: 'Khoảng 5 kg/tháng' },
  { id: 'chain', label: 'Chuỗi cửa hàng', hint: 'Khoảng 20–50 kg/tháng' },
  { id: 'distributor', label: 'Nhà phân phối', hint: 'Khoảng 200–500 kg/tháng' },
  { id: 'partner', label: 'Đối tác lớn', hint: 'Khoảng 1 tấn/tháng' },
  { id: 'other', label: 'Khác', hint: '' },
];

// Only match an order through a unique nonempty contact or explicit CRM relation.
export function customerOrderSummary(opportunity, opportunities, orders, quotes, partners) {
  const key = normalizeContact(opportunity?.contact || '');
  const unique = key && opportunities.filter(x => normalizeContact(x.contact || '') === key).length === 1;
  const quoteIds = new Set(quotes.filter(q => q.opportunity_id === opportunity.id).map(q => q.id));
  const partnerIds = new Set(partners.filter(p => p.opportunity_id === opportunity.id).map(p => p.id));
  const matches = orders.filter(o => !o.deleted_at && !['cancelled','canceled','deleted'].includes(o.status) &&
    ((o.quote_id || o.partner_account_id) ? ((o.quote_id && quoteIds.has(o.quote_id)) || (o.partner_account_id && partnerIds.has(o.partner_account_id))) : (unique && normalizeContact(o.contact || '') === key)));
  const dated = matches.map(o => Date.parse(o.ts)).filter(Number.isFinite).sort((a,b) => b-a);
  const amounts = matches.map(o => o.estimated_total).filter(v => v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v)));
  return { orderIds: matches.map(o => o.id), count: matches.length, lastOrder: dated.length ? new Date(dated[0]).toISOString() : null,
    total: amounts.length === matches.length && matches.length ? amounts.reduce((sum, v) => sum + Number(v), 0) : null };
}
