import { normalizeContact } from './trade-pipeline.js';
export function contactCandidates(customer, orders = [], links = []) {
  if (!customer) return [];
  const linkedIds = new Set(links.filter(link => link.opportunity_id === customer.id).map(link => link.order_id));
  const candidates = [customer.contact, ...(Array.isArray(customer.additional_contacts) ? customer.additional_contacts : []), customer.preferred_contact,
    ...orders.filter(order => linkedIds.has(order.id)).map(order => order.contact)];
  const seen = new Set();
  return candidates.map(value => String(value || '').trim()).filter(value => {
    const key = normalizeContact(value); if (!key || seen.has(key)) return false; seen.add(key); return true;
  });
}
export function searchCustomer(customer, query, orders = [], links = []) {
  const haystack = [customer.business_name, customer.owner, customer.product_interest, ...contactCandidates(customer, orders, links)].join(' ').toLowerCase();
  const term = String(query || '').trim().toLowerCase();
  const digits = term.replace(/\D/g,'');
  return haystack.includes(term) || (digits.length >= 5 && contactCandidates(customer, orders, links).some(value => value.replace(/\D/g,'').includes(digits)));
}
