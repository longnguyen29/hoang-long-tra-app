import { sellingUnitLabel } from './selling-units.js';
import { withPaymentBankOverride } from './payment-settings.js';

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const amount = value => {
  if (value === null || value === undefined || typeof value === 'boolean' || String(value).trim() === '') return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
};

export function invoicePaymentDetails(order, { payment, receivable } = {}) {
  const bank = withPaymentBankOverride({
    bin: payment?.bin,
    bankShortName: payment?.bankShortName ?? payment?.bank_short_name,
    accountNumber: payment?.accountNumber ?? payment?.account_number,
    accountName: payment?.accountName ?? payment?.account_name,
  });
  const total = receivable ? amount(receivable.total) : amount(order?.estimatedTotal);
  const paid = receivable ? amount(receivable.paid) : null;
  const reference = String(receivable?.invoice_number || order?.id || '').trim();
  const result = { bank, reference, total, paid, due: null, qrUrl: '', reason: 'unknown' };
  if (receivable?.status === 'void') return { ...result, reason: 'void' };
  if (total === null || (receivable && paid === null)) return result;
  const orderTotal = amount(order?.estimatedTotal);
  if (receivable && (orderTotal === null || Math.abs(total - orderTotal) > 0.01)) return { ...result, reason: 'mismatch' };
  const due = Math.max(0, Math.round((total - (paid || 0)) * 100) / 100);
  if (due === 0 || receivable?.status === 'paid') return { ...result, due: 0, reason: receivable ? 'paid' : 'zero' };
  if (!reference || Math.round(due) <= 0) return { ...result, due };
  const qr = new URL(`https://img.vietqr.io/image/${encodeURIComponent(bank.bin)}-${encodeURIComponent(bank.accountNumber)}-compact2.png`);
  qr.searchParams.set('accountName', bank.accountName);
  qr.searchParams.set('addInfo', reference);
  qr.searchParams.set('amount', String(Math.round(due)));
  return { ...result, due, qrUrl: qr.href, reason: 'ready' };
}

// Read only the saved price before the first tracked manual adjustment. Never
// substitute a catalogue list price, private price floor, or stale line total.
export function buildOrderInvoiceHtml(order, { showOriginalPrice = false, locale = 'vi', payment, receivable } = {}) {
  const en = locale === 'en';
  const text = (vi, english) => en ? english : vi;
  const number = new Intl.NumberFormat(en ? 'en-US' : 'vi-VN', { maximumFractionDigits: 3 });
  const currency = new Intl.NumberFormat(en ? 'en-US' : 'vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 2 });
  const money = value => value === null ? '—' : currency.format(value);
  const lines = Array.isArray(order?.lines) ? order.lines : [];
  const resolved = lines.map(line => {
    const price = amount(line?.price), qty = amount(line?.qty);
    const total = price !== null && qty !== null && Number.isFinite(price * qty) ? Math.round(price * qty * 100) / 100 : null;
    return { line, price, qty, total, original: amount(line?.priceBeforeEdit) };
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
  const pay = invoicePaymentDetails(order, { payment, receivable });
  const paymentSection = `<section class="payment"><h2>${text('Thanh toán', 'Payment')}</h2>${pay.qrUrl ? `
    <p>${receivable ? text('Còn thanh toán', 'Remaining balance') : text('Theo tổng đơn đã ghi nhận', 'At the recorded order total')}: <strong>${money(pay.due)}</strong>${receivable && pay.paid > 0 ? ` · ${text('Đã ghi nhận', 'Recorded paid')}: ${money(pay.paid)}` : ''}</p>
    <div class="payment-details"><img src="${escapeHtml(pay.qrUrl)}" width="210" height="210" referrerpolicy="no-referrer" alt="${text('Mã QR thanh toán', 'Payment QR code')}"><div>
    <p>${text('Ngân hàng', 'Bank')}: <strong>${escapeHtml(pay.bank.bankShortName)}</strong></p>
    <p>${text('Số tài khoản', 'Account number')}: <strong>${escapeHtml(pay.bank.accountNumber)}</strong></p>
    <p>${text('Chủ tài khoản', 'Account holder')}: ${escapeHtml(pay.bank.accountName)}</p>
    <p>${text('Nội dung', 'Reference')}: <strong>${escapeHtml(pay.reference)}</strong></p>
    <p class="meta">${text('Kiểm tra tên người nhận và số tiền trước khi chuyển khoản. Nếu đã chuyển, vui lòng chờ đối chiếu.', 'Check the recipient and amount before transferring. If already transferred, please allow time for reconciliation.')}</p></div></div>
    <p class="meta" id="invoice-qr-fallback" hidden>${text('Chưa tải được mã QR. Có thể chuyển khoản bằng thông tin tài khoản phía trên.', 'The QR code could not load. Use the bank details above to transfer manually.')}</p>`
    : `<p>${pay.reason === 'paid' ? text('Đã ghi nhận thanh toán đủ.', 'Payment recorded in full.') : pay.reason === 'zero' ? text('Không có số tiền cần thanh toán.', 'No payment is due.') : pay.reason === 'void' ? text('Yêu cầu thanh toán đã hủy.', 'The payment request has been voided.') : text('Cần xác nhận lại số tiền thanh toán trước khi tạo mã QR.', 'Confirm the payment amount before generating a QR code.')}</p>`}</section>`;
  return `<!DOCTYPE html><html lang="${en ? 'en' : 'vi'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${text('Hóa đơn', 'Invoice')} ${escapeHtml(order?.id)}</title>
    <style>
      *{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#1c2b24;margin:0 auto;padding:32px;max-width:850px;font-size:13px;line-height:1.6}
      .brand{font-family:Georgia,serif;font-size:26px;margin:0}.eyebrow{color:#745421;font-size:12px;text-transform:uppercase;letter-spacing:1px}h1{font-size:20px;margin:24px 0 4px}h2{font-size:14px;margin:24px 0 8px}p{margin:6px 0;overflow-wrap:anywhere}.meta,.note{color:#46574e;font-size:12px}.customer{white-space:pre-wrap}
      table{width:100%;border-collapse:collapse;margin-top:12px;table-layout:fixed}th,td{padding:10px 6px;border-bottom:1px solid #d9d6cc;vertical-align:top;overflow-wrap:anywhere}th{font-size:11px;text-align:left;background:#f3f0e7}th:first-child{width:30%}.numeric{text-align:right;font-variant-numeric:tabular-nums}.total{font-weight:700;font-size:15px}.total td{border-top:2px solid #745421}tfoot td{padding-top:10px}.note{margin-top:18px}hr{border:0;border-top:1px solid #d9d6cc;margin:22px 0}
      .payment{break-inside:avoid;margin-top:24px;border-top:1px solid #d9d6cc}.payment-details{display:flex;align-items:center;gap:24px;flex-wrap:wrap}.payment-details img{width:210px;height:210px;object-fit:contain}.payment-details>div{flex:1;min-width:200px}
      @page{size:A4;margin:14mm}@media print{body{padding:0;max-width:none}thead{display:table-header-group}tfoot{display:table-row-group}tr{break-inside:avoid}}
    </style></head><body>
    <p class="eyebrow">House of Hoàng Long</p><p class="brand">Nhà Hoàng Long</p>
    <h1>${text('Hóa đơn tạm tính', 'Preliminary invoice')}</h1><p class="meta">${text('Đơn hàng', 'Order')} ${escapeHtml(order?.id)} · ${escapeHtml(issued)}</p>
    <h2>${text('Khách hàng', 'Customer')}</h2><p class="customer">${escapeHtml(order?.customerName)}<br>${escapeHtml(order?.contact)}${order?.address ? `<br>${escapeHtml(order.address)}` : ''}${order?.taxNumber ? `<br>${text('Mã số thuế', 'Tax number')}: ${escapeHtml(order.taxNumber)}` : ''}</p>
    <table><thead><tr><th>${text('Sản phẩm', 'Product')}</th><th class="numeric">${text('Số lượng', 'Quantity')}</th>${showOriginalPrice ? `<th class="numeric" data-column="original-price">${text('Giá gốc', 'Original price')}</th>` : ''}<th class="numeric">${text('Đơn giá', 'Unit price')}</th><th class="numeric">${text('Thành tiền', 'Amount')}</th></tr></thead><tbody>${rows}</tbody><tfoot>
    ${subtotal === null ? '' : summaryRow(text('Tiền hàng theo đơn giá', 'Items at recorded unit prices'), money(subtotal))}${delta}
    ${summaryRow(text('Tổng đơn đã ghi nhận', 'Recorded order total'), total === null ? text('Chưa báo giá', 'Awaiting quotation') : money(total), 'total')}
    </tfoot></table>
    ${showOriginalPrice ? `<p class="note">${text('Giá gốc là giá trước lần sửa giá riêng đầu tiên đã được lưu cho dòng sản phẩm trong đơn, không phải giá niêm yết hay giá vốn. Dấu “—” nghĩa là chưa lưu được giá trước sửa.', 'Original price is the saved price before the first tracked per-order adjustment to that line, not a catalogue list price or internal cost. “—” means no pre-edit price was saved.')}</p>` : ''}
    ${paymentSection}
    ${order?.note ? `<h2>${text('Ghi chú', 'Notes')}</h2><p class="customer">${escapeHtml(order.note)}</p>` : ''}
    <hr><p class="meta">${text('Bản tạm tính từ thông tin đã lưu của đơn hàng; không thay thế hóa đơn điện tử.', 'A preliminary statement of the saved order details; not an electronic tax invoice.')}</p>
    </body></html>`;
}
