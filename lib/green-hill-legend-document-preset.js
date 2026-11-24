// The confirmed commercial facts from the 24/11/2026 Green Hill – Legend Tea
// contract and handover document. This is an opt-in transaction preset, NOT
// a default Hoang Long legal identity or a database record.
export const GREEN_HILL_LEGEND_TEA = Object.freeze({
  seller: {
    name: 'CÔNG TY TNHH MỘT THÀNH VIÊN SẢN XUẤT TRÀ GREEN HILL',
    taxId: '5100322063',
    address: 'Thôn Thạch Bàn, xã Hùng An, tỉnh Tuyên Quang, Việt Nam',
    phone: '0912 48 55 91',
    representative: 'Trần Thị Nhi',
    title: 'Giám đốc',
    bankAccount: '110636872222',
    bankName: 'VietinBank – PGD Bắc Thăng Long',
  },
  buyer: {
    name: 'CÔNG TY TNHH LEGEND TEA',
    taxId: '4601664387',
    address: 'Xóm 8, xã Đồng Hỷ, tỉnh Thái Nguyên, Việt Nam',
    phone: '0853 344 586',
    representative: 'Nguyễn Kim Công',
    title: 'Giám đốc',
  },
  reference: '018-GRH',
  items: Object.freeze([
    Object.freeze({ invoiceName: 'Trà đen OP1', internalName: 'Hồng trà Mật', quantityKg: 130.56, pricePerKg: 75000 }),
    Object.freeze({ invoiceName: 'Trà đen OP', internalName: 'Hồng trà Khói', quantityKg: 125, pricePerKg: 80000 }),
    Object.freeze({ invoiceName: 'Trà Nhài', internalName: 'Trà Nhài', quantityKg: 125, pricePerKg: 200000 }),
  ]),
  vatRatePercent: 8,
});

const format = value => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(value);
const money = amount => format(amount) + ' VNĐ';
const lineAmount = item => item.quantityKg * item.pricePerKg;
const beforeTax = GREEN_HILL_LEGEND_TEA.items.reduce((sum, item) => sum + lineAmount(item), 0);
const vatAmount = beforeTax * GREEN_HILL_LEGEND_TEA.vatRatePercent / 100;
const payable = beforeTax + vatAmount;
const kgTotal = GREEN_HILL_LEGEND_TEA.items.reduce((sum, item) => sum + item.quantityKg, 0);
const seller = GREEN_HILL_LEGEND_TEA.seller;
const buyer = GREEN_HILL_LEGEND_TEA.buyer;

const commercialLines = GREEN_HILL_LEGEND_TEA.items.map((item, index) =>
  (index + 1) + '. ' + item.invoiceName + ' (' + item.internalName + '): ' +
  format(item.quantityKg) + ' kg × ' + money(item.pricePerKg) + '/kg = ' + money(lineAmount(item))
).join('\n');

const baseFields = {
  // The number, date, place, packaging and delivery schedule have intentionally
  // not been agreed. Keep them blank / explicitly awaiting completion.
  document_ref: '',
  document_date: '',
  signing_place: '',
  company_legal_name: seller.name,
  company_tax_id: seller.taxId,
  company_registered_address: seller.address,
  company_representative: seller.representative,
  company_representative_title: seller.title,
  company_contact_phone: seller.phone,
  partner_legal_name: buyer.name,
  partner_tax_id: buyer.taxId,
  partner_address: buyer.address,
  partner_representative: buyer.representative,
  partner_representative_title: buyer.title,
  partner_contact_phone: buyer.phone,
};

export function greenHillLegendDocumentFields(templateId) {
  if (!['tea_trade_agreement', 'tea_order_confirmation', 'tea_lot_receipt'].includes(templateId)) return null;
  if (templateId === 'tea_trade_agreement') return {
    ...baseFields,
    tea_trade_roles: 'Bên A (bên bán): ' + seller.name + '. Bên B (bên mua): ' + buyer.name + '.',
    tea_trade_orders: 'Hợp đồng mua bán cho lô trà ghi dưới đây, căn cứ Hợp đồng nguyên tắc số ' +
      GREEN_HILL_LEGEND_TEA.reference + ' nếu văn bản đó đã ký và có hiệu lực. Số hợp đồng và ngày ký: chờ điền.',
    tea_finished_spec: 'Tên dùng trên hóa đơn và khối lượng:\n' + commercialLines +
      '\nTổng khối lượng theo hợp đồng: ' + format(kgTotal) +
      ' kg. Hạn sử dụng và quy cách bao gói: chờ hai bên điền/xác nhận.',
    tea_source_documents: 'Xuất xứ: Việt Nam; nhà sản xuất: ' + seller.name +
      '. Chứng từ giao: hóa đơn hợp lệ, phiếu xuất kho hoặc biên bản bàn giao; COA nếu được thỏa thuận.',
    tea_commercial: commercialLines + '\nTiền hàng chưa VAT: ' + money(beforeTax) +
      '\nVAT ' + GREEN_HILL_LEGEND_TEA.vatRatePercent + '%: ' + money(vatAmount) +
      '\nTổng thanh toán đã VAT: ' + money(payable) +
      '\nBằng chữ: Bốn mươi tám triệu ba trăm bảy mươi lăm nghìn ba trăm sáu mươi đồng.' +
      '\nHình thức: chuyển khoản vào ' + seller.bankAccount + ' – ' + seller.bankName +
      ', chủ tài khoản: ' + seller.name + '. Tiến độ thanh toán: chờ điền.',
    tea_delivery: 'Thời gian giao: ……………; địa điểm giao: ……………; chi phí và phương tiện vận chuyển: ……………. ' +
      'Hai bên lập biên bản ghi số lượng thực giao, số kiện, tình trạng bao bì và chứng từ kèm theo.',
    tea_claims: 'Bên mua kiểm tra và xác nhận số lượng thực nhận; các chênh lệch và cách xử lý được ghi vào ' +
      'biên bản giao nhận hoặc thỏa thuận bổ sung. Các bên ưu tiên thương lượng, hòa giải khi có tranh chấp.',
  };
  if (templateId === 'tea_order_confirmation') return {
    ...baseFields,
    tea_order_roles: 'Bên A bán trà (Green Hill); Bên B mua trà (Legend Tea).',
    tea_order_ref: '',
    tea_order_contract: 'Hợp đồng nguyên tắc ' + GREEN_HILL_LEGEND_TEA.reference + ' (nếu đã ký và có hiệu lực).',
    tea_order_lines: commercialLines,
    tea_order_sample: 'Hạn sử dụng, quy cách đóng gói và mẫu đối chiếu: chờ xác nhận.',
    tea_order_total: 'Tiền hàng: ' + money(beforeTax) + '; VAT 8%: ' + money(vatAmount) +
      '; tổng thanh toán: ' + money(payable) + '.',
    tea_order_shipping: 'Địa điểm giao, ngày giao, người nhận và phí vận chuyển: chờ điền.',
    tea_order_payment: 'Chuyển khoản cho ' + seller.name + ', tài khoản ' +
      seller.bankAccount + ' tại ' + seller.bankName + '. Tiến độ: chờ điền.',
  };
  return {
    ...baseFields,
    tea_order_ref: '',
    tea_order_lines: GREEN_HILL_LEGEND_TEA.items.map((item, index) =>
      (index + 1) + '. ' + item.invoiceName + ' – ' + format(item.quantityKg) + ' kg theo hợp đồng; thực giao: …………'
    ).join('\n'),
    tea_receipt_handoff: 'Căn cứ Hợp đồng mua bán số ………… và Hợp đồng nguyên tắc ' +
      GREEN_HILL_LEGEND_TEA.reference + ' (nếu đã ký). Thời gian, địa điểm, người giao, người nhận, số hóa đơn ' +
      'và số phiếu xuất kho: chờ điền.',
    tea_receipt_lots: GREEN_HILL_LEGEND_TEA.items.map(item =>
      item.invoiceName + ': ' + format(item.quantityKg) + ' kg theo hợp đồng; thực giao: ………… kg; ' +
      'số kiện/mã lô: …………'
    ).join('\n') + '\nTổng khối lượng theo hợp đồng: ' + format(kgTotal) + ' kg; thực giao: ………… kg.',
    tea_receipt_checks: 'Tình trạng bao bì, kiểm đếm và chứng từ kèm theo (hóa đơn/phiếu xuất kho/COA): chờ ghi thực tế.',
    tea_receipt_result: 'Chênh lệch giữa số lượng theo hợp đồng và số lượng thực nhận, hư hại (nếu có): chờ kiểm đếm.',
    tea_receipt_followup: 'Biện pháp xử lý chênh lệch, người phụ trách và hạn xử lý (nếu có): chờ xác nhận.',
  };
}
