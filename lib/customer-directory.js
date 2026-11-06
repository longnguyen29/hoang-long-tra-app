import { normalizeContact } from './trade-pipeline.js';

export const CUSTOMER_CATEGORIES = [
  { id: 'milk_tea_shop', label: 'Quán trà sữa', hint: 'Khoảng 5 kg/tháng' },
  { id: 'chain', label: 'Chuỗi cửa hàng', hint: 'Khoảng 20–50 kg/tháng' },
  { id: 'distributor', label: 'Nhà phân phối', hint: 'Khoảng 200–500 kg/tháng' },
  { id: 'partner', label: 'Đối tác lớn', hint: 'Khoảng 1 tấn/tháng' },
  { id: 'other', label: 'Khác', hint: '' },
];

// Only match an order through a unique nonempty contact or explicit CRM relation.
export function customerOrderSummary(opportunity, opportunities, orders, quotes, partners, links = []) {
  const key = normalizeContact(opportunity?.contact || '');
  const unique = key && opportunities.filter(x => normalizeContact(x.contact || '') === key).length === 1;
  const quoteIds = new Set(quotes.filter(q => q.opportunity_id === opportunity.id).map(q => q.id));
  const partnerIds = new Set(partners.filter(p => p.opportunity_id === opportunity.id).map(p => p.id));
  const linkByOrder = new Map(links.map(link => [link.order_id, link.opportunity_id]));
  const matches = orders.filter(o => !o.deleted_at && !['cancelled','canceled','deleted'].includes(o.status) &&
    (linkByOrder.has(o.id) ? linkByOrder.get(o.id) === opportunity.id : ((o.quote_id || o.partner_account_id) ? ((o.quote_id && quoteIds.has(o.quote_id)) || (o.partner_account_id && partnerIds.has(o.partner_account_id))) : (unique && normalizeContact(o.contact || '') === key))));
  const dated = matches.map(o => Date.parse(o.ts)).filter(Number.isFinite).sort((a,b) => b-a);
  const amounts = matches.map(o => o.estimated_total).filter(v => v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v)));
  return { orderIds: matches.map(o => o.id), count: matches.length, lastOrder: dated.length ? new Date(dated[0]).toISOString() : null,
    total: amounts.length === matches.length && matches.length ? amounts.reduce((sum, v) => sum + Number(v), 0) : null };
}

// A ranking hint only: a person must explicitly choose the record to link.
export function customerMatchRank(group, opportunity) {
  const contact = normalizeContact(group.contact || '');
  if (contact && contact === normalizeContact(opportunity.contact || '')) return 2;
  const words = text => new Set(String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().split(/[^a-z0-9]+/).filter(x => x.length >= 3 && !['quan','shop','cafe','tea','tra','cong','ty','cua','hang'].includes(x)));
  const a = words(group.name), b = words(opportunity.business_name);
  const shared = [...a].filter(word => b.has(word));
  return shared.length >= 2 || (shared.length === 1 && a.size === 1 && b.size === 1) ? 1 : 0;
}
