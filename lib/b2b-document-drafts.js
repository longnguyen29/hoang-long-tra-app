import { calculateInvoiceTotals, officialTeaName } from './b2b-customer-workflow.js';
import { sellingUnitLabel } from './selling-units.js';

export const B2B_DOCUMENT_TEMPLATES = Object.freeze({
  framework: 'b2b_framework_agreement',
  sales_contract: 'b2b_sales_contract',
  delivery_record: 'b2b_delivery_record',
  vat_invoice: 'b2b_vat_working_sheet',
});

const paymentMethods = { cash: 'Tiền mặt', qr: 'Chuyển khoản', transfer: 'Chuyển khoản', cod: 'Thanh toán khi nhận hàng' };
const amount = value => value !== '' && value != null && Number.isFinite(Number(value)) && Number(value) >= 0;
const money = value => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(value);
const join = (...values) => values.filter(Boolean).join(' · ');
const vietnamDate = (date = new Date()) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }).format(date);

function invoiceProductName(line, commercialName) {
  const name = String(commercialName || '').normalize('NFC').trim();
  const productId = line.productId || line.product_id;
  return officialTeaName(productId, /^trà\s+nhài(?:\s|$)/iu.test(name) ? 'Trà Nhài' : name);
}

function documentOrderLines(order, kind) {
  const showPrice = kind !== 'delivery_record';
  return (Array.isArray(order?.lines) ? order.lines : []).map((line, index) => {
    const commercial = typeof line.name === 'string' ? line.name : line.name?.vi || line.name?.en;
    const official = invoiceProductName(line, commercial);
    const item = kind === 'sales_contract' ? join(official, official !== commercial && commercial)
      : official || commercial;
    const detail = [
      item || 'Chưa ghi tên hàng',
      line.weight,
      line.qty != null && `${line.qty} ${sellingUnitLabel(line.unit)}`.trim(),
      showPrice && (amount(line.price) ? `${money(line.price)} ₫ / ${sellingUnitLabel(line.unit)}` : 'Chưa có đơn giá'),
      showPrice && amount(line.price) && amount(line.qty) && `${money(Number(line.price) * Number(line.qty))} ₫`,
    ];
    return `${index + 1}. ${join(...detail)}`;
  }).join('\n');
}

export function b2bDocumentPricing(order) {
  const subtotal = calculateInvoiceTotals(order?.lines, 0)?.subtotal ?? null;
  const recorded = amount(order?.estimated_total) ? Number(order.estimated_total) : null;
  // An existing total can include a discount, VAT or additional fees.
  const needsConfirmation = order?.type === 'retail' || (recorded !== null && recorded !== subtotal);
  return { subtotal, recorded, needsConfirmation };
}

export function prefillB2BDocument(kind, { customer, order, workflow, seller, frameworkDocument, frameworks = [], documents = [] }, date = new Date()) {
  const legal = customer?.b2b_legal || {};
  const identity = seller?.details || {};
  const contact = legal.contact || customer?.preferred_contact || customer?.contact || order?.contact || '';
  const sellerContact = identity.contact || '';
  const { subtotal, needsConfirmation } = b2bDocumentPricing(order);
  const relatedFramework = frameworks.find(item => item.id === workflow?.framework_id) || frameworkDocument;
  const relatedSale = documents.find(item => item.kind === 'sales_contract' && item.status === 'complete');
  const frameworkRef = relatedFramework?.document_ref || relatedFramework?.draft?.document_ref || '';
  const saleRef = relatedSale?.document_ref || relatedSale?.draft?.document_ref || '';
  const blank = '';
  return {
    ...(kind === 'vat_invoice' && order?.id ? { document_ref: order.id.slice(0, 100) } : {}),
    document_date: vietnamDate(date),
    company_legal_name: identity.legalName || blank,
    company_tax_id: identity.taxId || blank,
    company_registered_address: identity.address || blank,
    company_representative: identity.representative || blank,
    company_representative_title: identity.title || blank,
    company_contact_phone: sellerContact.includes('@') ? blank : sellerContact,
    company_contact_email: sellerContact.includes('@') ? sellerContact : blank,
    b2b_bank_name: identity.bankName || blank,
    b2b_bank_account: identity.bankAccount || blank,
    b2b_bank_holder: identity.bankHolder || blank,
    partner_trade_name: customer?.business_name || order?.customer_name || blank,
    partner_legal_name: legal.legalName || blank,
    partner_tax_id: legal.taxId || order?.tax_number || blank,
    partner_address: legal.address || blank,
    partner_representative: legal.representative || blank,
    partner_representative_title: legal.title || blank,
    partner_contact_phone: contact.includes('@') ? blank : contact,
    partner_contact_email: contact.includes('@') ? contact : blank,
    tea_order_ref: order?.id || blank,
    tea_order_contract: join(saleRef, frameworkRef),
    tea_order_lines: documentOrderLines(order, kind),
    tea_order_shipping: order?.address || customer?.delivery_address || blank,
    tea_order_payment: Object.hasOwn(paymentMethods, order?.payment_method) ? paymentMethods[order.payment_method] : blank,
    b2b_subtotal: needsConfirmation ? null : subtotal,
    b2b_vat_percent: workflow?.vat_percent ?? null,
    b2b_framework_scope: 'Hợp đồng đặt ra điều kiện chung cho giao dịch trà. Hai bên xác nhận từng đơn về sản phẩm, quy cách, số lượng, giá, thuế, giao hàng và hạn thanh toán bằng hợp đồng mua bán hoặc đơn đặt hàng.',
    b2b_framework_delivery: 'Bên bán giao đúng mặt hàng và tiêu chuẩn đã thống nhất. Hai bên ghi nhận lượng thực giao, tình trạng hàng và chứng từ trong biên bản giao nhận; ghi rõ thời hạn tiếp nhận và xử lý sai lệch.',
    b2b_framework_payment: 'Đơn giá, thuế, thời điểm lập chứng từ, phương thức và thời hạn thanh toán áp dụng theo thỏa thuận của từng đơn. Chỉ áp dụng hạn mức công nợ khi hai bên xác nhận bằng văn bản.',
    b2b_responsibilities: 'Bên bán giao hàng đúng thỏa thuận và bàn giao chứng từ. Bên mua cung cấp thông tin điểm nhận, kiểm đếm khi nhận và thanh toán đúng hạn.',
    b2b_disputes: 'Hai bên ưu tiên thương lượng và lập biên bản đối chiếu. Khi cần, các bên giải quyết tại cơ quan có thẩm quyền theo pháp luật áp dụng.',
    b2b_effectiveness: 'Thay đổi và phụ lục được hai bên thống nhất bằng văn bản. Mỗi bên giữ một bản hợp đồng đã ký.',
  };
}
