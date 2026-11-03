// Transfer only editable, non-transactional fields into the existing order form.
// Product, price, payment and order type must be chosen there by the operator.
export const ASSISTANT_ORDER_DRAFT_KEY = 'hl-assistant-order-draft-v1';

export function normalizeAssistantOrderDraft(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const text = (key, max) => typeof value[key] === 'string' ? value[key].trim().slice(0, max) : '';
  return {
    customerName: text('customerName', 200),
    contact: text('contact', 200),
    address: text('address', 500),
    note: text('note', 3000),
  };
}
