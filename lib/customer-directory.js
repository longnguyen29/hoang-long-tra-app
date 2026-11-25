import { normalizeContact } from './trade-pipeline.js';

export const CUSTOMER_CATEGORIES = [
  { id: 'milk_tea_shop', label: 'Quán trà sữa', hint: 'Khoảng 5 kg/tháng' },
  { id: 'chain', label: 'Chuỗi cửa hàng', hint: 'Khoảng 20–50 kg/tháng' },
  { id: 'distributor', label: 'Nhà phân phối', hint: 'Khoảng 200–500 kg/tháng' },
  { id: 'partner', label: 'Đối tác lớn', hint: 'Khoảng 1 tấn/tháng' },
  { id: 'other', label: 'Khác', hint: '' },
];

// Resolve ownership once for the directory, customer detail, and morning queue.
export function customerOrderIndex(opportunities, orders, quotes, partners, links = []) {
  const contacts = new Map();
  for (const customer of opportunities) {
    const key = normalizeContact(customer.contact || '');
    if (key) contacts.set(key, contacts.has(key) ? null : customer.id);
  }
  const quoteOwners = new Map(quotes.map(row => [row.id, row.opportunity_id]));
  const partnerOwners = new Map(partners.map(row => [row.id, row.opportunity_id]));
  const overrides = new Map(links.map(row => [row.order_id, row.opportunity_id]));
  const byCustomer = new Map(opportunities.map(row => [row.id, []]));
  for (const order of orders) {
    if (order.deleted_at || ['cancelled','canceled','deleted'].includes(order.status)) continue;
    let owner;
    if (overrides.has(order.id)) owner = overrides.get(order.id);
    else if (order.quote_id || order.partner_account_id) {
      const quoteOwner = quoteOwners.get(order.quote_id);
      const partnerOwner = partnerOwners.get(order.partner_account_id);
      // Conflicting explicit owners go to the existing manual reconciliation list.
      if (quoteOwner && partnerOwner && quoteOwner !== partnerOwner) continue;
      owner = quoteOwner || partnerOwner;
    } else owner = contacts.get(normalizeContact(order.contact || ''));
    byCustomer.get(owner)?.push(order);
  }
  return { byCustomer, contacts };
}

export function customerOrderSummary(opportunity, opportunities, orders, quotes, partners, links = []) {
  const index = customerOrderIndex(opportunities, orders, quotes, partners, links);
  return summarizeCustomerOrders(index.byCustomer.get(opportunity.id) || []);
}

export function summarizeCustomerOrders(matches) {
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
