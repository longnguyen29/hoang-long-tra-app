import { sellingUnitLabel } from './selling-units.js';

export const TEA_ORDER_DOCUMENTS = ['tea_order_confirmation', 'tea_lot_receipt'];

const money = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 });
const paymentLabels = { cash: 'Tiền mặt', qr: 'Chuyển khoản qua QR', transfer: 'Chuyển khoản', cod: 'Thanh toán khi nhận hàng' };
const isAmount = value => (typeof value === 'number' || (typeof value === 'string' && value.trim() !== '')) && Number.isFinite(Number(value)) && Number(value) >= 0;

export function prefillTeaOrderDocument(templateId, order) {
  if (!order || !TEA_ORDER_DOCUMENTS.includes(templateId)) return {};
  const confirmation = templateId === 'tea_order_confirmation';
  const lines = (Array.isArray(order.lines) ? order.lines : []).map(line => {
    const name = typeof line?.name === 'string' ? line.name : line?.name?.vi || line?.name?.en;
    const details = [name, line?.weight, [line?.qty, sellingUnitLabel(line?.unit)].filter(Boolean).join(' ')];
    if (confirmation) details.push(isAmount(line?.price) ? `${money.format(Number(line.price))} VND / ${sellingUnitLabel(line.unit) || 'đơn vị'}` : 'Chưa chốt đơn giá');
    return details.filter(Boolean).join(' · ');
  }).filter(Boolean).join('\n');
  const fields = { tea_order_ref: order.id, tea_order_lines: lines.length <= 4000 ? lines : '' };
  if (!confirmation) return fields;

  const payment = Object.hasOwn(paymentLabels, order.payment_method) ? paymentLabels[order.payment_method] : '';
  return {
    ...fields,
    tea_order_roles: 'Bên A bán trà. Bên B mua trà.',
    tea_order_total: isAmount(order.estimated_total) ? `Giá trị ghi nhận trong đơn: ${money.format(Number(order.estimated_total))} VND.` : '',
    tea_order_shipping: [order.customer_name, order.address].filter(Boolean).join(' · '),
    tea_order_payment: payment,
  };
}
