// Shared rules for a customer's framework agreement and per-order records.
// An issued VAT invoice is evidence of an external issuance, never a generated draft.
export const B2B_STEPS = Object.freeze([
  { key: 'framework', label: 'Hợp đồng nguyên tắc', scope: 'customer' },
  { key: 'sales_contract', label: 'Hợp đồng mua bán', scope: 'order' },
  { key: 'delivery_record', label: 'Biên bản giao hàng', scope: 'order' },
  { key: 'vat_invoice', label: 'Hóa đơn VAT', scope: 'order' },
]);

export const OFFICIAL_TEA_NAMES = Object.freeze({
  'hong-tra-shan-mat': 'Trà đen OP1',
  'hong-tra-shan-khoi': 'Trà đen OP',
});

export function officialTeaName(productId, fallback = '') {
  return Object.hasOwn(OFFICIAL_TEA_NAMES, productId) ? OFFICIAL_TEA_NAMES[productId] : fallback;
}

const validDate = value => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const time = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(time.getTime()) && time.toISOString().slice(0, 10) === value;
};

export function frameworkIsValid(document, date) {
  return Boolean(document?.status === 'complete' && document?.file_id && validDate(date)
    && validDate(document.valid_from) && document.valid_from <= date
    && (!document.valid_until || (validDate(document.valid_until) && date <= document.valid_until)));
}

export function orderDocumentIsComplete(document, key) {
  if (!document || document.status !== 'complete' || !document.file_id) return false;
  if (key === 'vat_invoice') return Boolean(document.invoice_number?.trim() && validDate(document.invoice_date));
  return true;
}

export function workflowProgress({ frameworks = [], documents = [], date }) {
  const steps = B2B_STEPS.map(step => ({ ...step, complete: step.scope === 'customer'
    ? frameworks.some(document => frameworkIsValid(document, date))
    : documents.some(document => document.kind === step.key && orderDocumentIsComplete(document, step.key)) }));
  const completed = steps.filter(step => step.complete).length;
  return { steps, completed, total: steps.length, next: steps.find(step => !step.complete) || null, done: completed === steps.length };
}

// VAT amounts are rounded to whole đồng; prices are entered exclusive of VAT.
export function calculateInvoiceTotals(lines, vatPercent) {
  if (!Array.isArray(lines) || !lines.length || vatPercent === '' || vatPercent == null) return null;
  const vat = Number(vatPercent);
  if (!Number.isFinite(vat) || vat < 0 || vat > 100) return null;
  let subtotal = 0;
  for (const line of lines) {
    if (line.qty === '' || line.qty == null || line.price === '' || line.price == null) return null;
    const qty = Number(line.qty), price = Number(line.price);
    if (!Number.isFinite(qty) || qty <= 0 || !Number.isFinite(price) || price < 0) return null;
    subtotal += qty * price;
  }
  if (!Number.isSafeInteger(Math.round(subtotal))) return null;
  subtotal = Math.round(subtotal);
  const tax = Math.round(subtotal * vat / 100);
  if (!Number.isSafeInteger(tax) || !Number.isSafeInteger(subtotal + tax)) return null;
  return { subtotal, vatPercent: vat, vatAmount: tax, total: subtotal + tax };
}
