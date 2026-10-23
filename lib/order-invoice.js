import { sellingUnitLabel } from './selling-units.js';

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const amount = value => {
  if (value === null || value === undefined || typeof value === 'boolean' || String(value).trim() === '') return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
};

// Read only the saved customer-facing price snapshot. Never resolve today's
// catalogue, private partner price floors, costs, or stale per-line totals.
export function buildOrderInvoiceHtml(order, { showOriginalPrice = false, locale = 'vi' } = {}) {
  const en = locale === 'en';
  const text = (vi, english) => en ? english : vi;
  const number = new Intl.NumberFormat(en ? 'en-US' : 'vi-VN', { maximumFractionDigits: 3 });
  const currency = new Intl.NumberFormat(en ? 'en-US' : 'vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 2 });
  const money = value => value === null ? '—' : currency.format(value);
  const lines = Array.isArray(order?.lines) ? order.lines : [];
  const resolved = lines.map(line => {
    const price = amount(line?.price), qty = amount(line?.qty);
    const total = price !== null && qty !== null && Number.isFinite(price * qty) ? Math.round(price * qty * 100) / 100 : null;
    return { line, price, qty, total, original: amount(line?.listPrice) };
  });
  const subtotal = resolved.length && resolved.every(item => item.total !== null)
    ? Math.round(resolved.reduce((sum, item) => sum + item.total, 0) * 100) / 100 : null;
  const total = amount(order?.estimatedTotal);
  const adjustment = subtotal !== null && total !== null ? Math.round((total - subtotal) * 100) / 100 : null;
  const columns = showOriginalPrice ? 5 : 4;
  const name = line => typeof line?.name === 'string' ? line.name : line?.name?.[en ? 'en' : 'vi'] || line?.name?.vi || line?.name?.en || text('Sản phẩm', 'Product');
  const rows = resolved.map(({ line, price, qty, total: lineTotal, original }, index) => `<tr data-line-index="${index}">
    <td>${escapeHtml(name(line))}</td>
    <td class="numeric">${qty === null ? '—' : number.format(qty)} ${escapeHtml(sellingUnitLabel(line?.unit, en ? 'en' : 'vi'))}</td>
    ${showOriginalPrice ? `<td class="numeric">${money(original)}</td>` : ''}
    <td class="numeric">${money(price)}</td><td class="numeric">${money(lineTotal)}</td></tr>`).join('');
  const date = order?.ts ? new Date(order.ts) : null;
  const issued = date && Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat(en ? 'en-GB' : 'vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(date) : '—';
  const summaryRow = (label, value, className = '') => `<tr class="${className}"><td colspan="${columns - 1}">${label}</td><td class="numeric">${value}</td></tr>`;
  const delta = adjustment === null || adjustment === 0 ? '' : summaryRow(text('Điều chỉnh theo tổng đơn đã chốt', 'Adjustment to recorded order total'), `${adjustment < 0 ? '−' : '+'}${money(Math.abs(adjustment))}`);
  return `<!DOCTYPE html><html lang="${en ? 'en' : 'vi'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${text('Hóa đơn', 'Invoice')} ${escapeHtml(order?.id)}</title>
    <style>
      *{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#1c2b24;margin:0 auto;padding:32px;max-width:850px;font-size:13px;line-height:1.6}
      .brand{font-family:Georgia,serif;font-size:26px;margin:0}.eyebrow{color:#745421;font-size:12px;text-transform:uppercase;letter-spacing:1px}h1{font-size:20px;margin:24px 0 4px}h2{font-size:14px;margin:24px 0 8px}p{margin:6px 0;overflow-wrap:anywhere}.meta,.note{color:#46574e;font-size:12px}.customer{white-space:pre-wrap}
      table{width:100%;border-collapse:collapse;margin-top:12px;table-layout:fixed}th,td{padding:10px 6px;border-bottom:1px solid #d9d6cc;vertical-align:top;overflow-wrap:anywhere}th{font-size:11px;text-align:left;background:#f3f0e7}th:first-child{width:30%}.numeric{text-align:right;font-variant-numeric:tabular-nums}.total{font-weight:700;font-size:15px}.total td{border-top:2px solid #745421}tfoot td{padding-top:10px}.note{margin-top:18px}hr{border:0;border-top:1px solid #d9d6cc;margin:22px 0}
      @page{size:A4;margin:14mm}@media print{body{padding:0;max-width:none}thead{display:table-header-group}tfoot{display:table-row-group}tr{break-inside:avoid}}
    </style></head><body>
    <p class="eyebrow">House of Hoàng Long</p><p class="brand">Nhà Hoàng Long</p>
    <h1>${text('Hóa đơn tạm tính', 'Preliminary invoice')}</h1><p class="meta">${text('Đơn hàng', 'Order')} ${escapeHtml(order?.id)} · ${escapeHtml(issued)}</p>
    <h2>${text('Khách hàng', 'Customer')}</h2><p class="customer">${escapeHtml(order?.customerName)}<br>${escapeHtml(order?.contact)}${order?.address ? `<br>${escapeHtml(order.address)}` : ''}${order?.taxNumber ? `<br>${text('Mã số thuế', 'Tax number')}: ${escapeHtml(order.taxNumber)}` : ''}</p>
    <table><thead><tr><th>${text('Sản phẩm', 'Product')}</th><th class="numeric">${text('Số lượng', 'Quantity')}</th>${showOriginalPrice ? `<th class="numeric" data-column="original-price">${text('Giá gốc', 'Original price')}</th>` : ''}<th class="numeric">${text('Đơn giá', 'Unit price')}</th><th class="numeric">${text('Thành tiền', 'Amount')}</th></tr></thead><tbody>${rows}</tbody><tfoot>
    ${subtotal === null ? '' : summaryRow(text('Tiền hàng theo đơn giá', 'Items at recorded unit prices'), money(subtotal))}${delta}
    ${summaryRow(text('Tổng đơn đã ghi nhận', 'Recorded order total'), total === null ? text('Chưa báo giá', 'Awaiting quotation') : money(total), 'total')}
    </tfoot></table>
    ${showOriginalPrice ? `<p class="note">${text('Giá gốc là giá bán trước giảm giá được lưu khi đặt hàng, không phải giá vốn. Dấu “—” nghĩa là đơn chưa lưu giá gốc.', 'Original price is the pre-discount sale price recorded with the order, not an internal cost. “—” means no original price was recorded.')}</p>` : ''}
    ${order?.note ? `<h2>${text('Ghi chú', 'Notes')}</h2><p class="customer">${escapeHtml(order.note)}</p>` : ''}
    <hr><p class="meta">${text('Bản tạm tính từ thông tin đã lưu của đơn hàng; không thay thế hóa đơn điện tử.', 'A preliminary statement of the saved order details; not an electronic tax invoice.')}</p>
    </body></html>`;
}
