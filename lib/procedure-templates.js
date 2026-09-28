export const PROCEDURE_STAGES = [
  ['customer_onboarding','Khách hàng'],
  ['order_confirmation','Xác nhận đơn'],
  ['stock_production','Hàng & QC'],
  ['logistics','Vận chuyển'],
  ['documents_checked','Documents checked'],
  ['vehicle_inspection','Kiểm xe / container'],
  ['loading_dispatch','Xếp hàng & xuất'],
  ['delivery_pod','Giao hàng / POD'],
  ['closeout','Khép đơn & đặt lại'],
];

// Snapshotted into procedure_items when a run starts, so future template edits
// never rewrite an order's historical checklist.
const common = [
  ['customer_onboarding','customer_details','Xác nhận tên công ty, người liên hệ, điện thoại và địa chỉ','Đối chiếu hồ sơ khách; chỉ ghi phần còn thiếu trong ghi chú.'],
  ['customer_onboarding','billing_delivery','Xác nhận thông tin xuất hóa đơn và nơi nhận','Kiểm mã số thuế nếu khách cần hóa đơn; xác nhận người nhận hàng.'],
  ['customer_onboarding','requirements','Ghi nhu cầu trà và điều khoản thương mại','Loại trà, công thức, bao bì, lịch sử và yêu cầu riêng.'],
  ['order_confirmation','product_quantity','Đối chiếu trà, quy cách, số lượng và đơn giá','So với đơn / báo giá. Ghi rõ kg, tấn, gói; dừng nếu lệch.',{critical:true}],
  ['order_confirmation','po_terms','Xác nhận PO / hợp đồng, thanh toán và ngày giao','Gắn PO nếu có; ghi Incoterm ở đơn xuất khẩu.',{critical:true,evidence:true,verify:true}],
  ['stock_production','stock_batch','Xác nhận tồn kho hoặc kế hoạch sản xuất và lô trà','Ghi lô, số lượng sẵn và ngày hoàn thành dự kiến.'],
  ['stock_production','packaging_label','Đối chiếu bao bì, nhãn và quy cách đóng gói','Kiểm nhãn theo đúng yêu cầu khách.'],
  ['stock_production','qc_ready','QC và số lượng đã sẵn sàng','Có bằng chứng QC / ảnh hàng và số lượng thực sẵn.',{critical:true,evidence:true,verify:true}],
  ['logistics','booking','Chốt phương thức, hãng/xe và lịch lấy hàng','Ghi booking, tài xế, biển số và giờ xếp hàng nếu có.'],
  ['logistics','destination','Xác nhận điểm đến, người nhận và hạn giao','Kiểm địa chỉ, người nhận; lưu cut-off nếu có.',{critical:true}],
  ['documents_checked','contract_po','PO / hợp đồng','Đúng khách, mã đơn và điều khoản.',{document:true,critical:true}],
  ['documents_checked','invoice','Hóa đơn thương mại / hóa đơn bán hàng','Đúng giá, số lượng, thông tin người mua.',{document:true,critical:true}],
  ['documents_checked','packing_list','Packing list / bảng kê kiện','Khớp số kiện, trọng lượng và nhãn.',{document:true,critical:true}],
  ['documents_checked','delivery_note','Phiếu giao hàng','Đúng nơi giao và số lượng.',{document:true,critical:true}],
  ['vehicle_inspection','vehicle_id','Đúng biển số / số container','Chụp ảnh và đối chiếu với booking.',{critical:true,evidence:true,verify:true}],
  ['vehicle_inspection','exterior','Vỏ ngoài, sàn, vách không hỏng / thủng / rò','Kiểm trực quan trước khi xếp.',{critical:true,evidence:true,verify:true}],
  ['vehicle_inspection','interior','Kiểm bên trong, sàn và vách không rò / nhiễm bẩn','Chụp ảnh khoang hàng trống; nếu không đạt thì STOP.',{critical:true,evidence:true,verify:true}],
  ['vehicle_inspection','clean_dry','Bên trong sạch, khô, không mùi lạ / nhiễm bẩn','Nếu ướt, bẩn, mùi lạ: STOP; không xếp hàng.',{critical:true,evidence:true,verify:true}],
  ['vehicle_inspection','seal_before','Ghi seal nếu áp dụng','Chụp số seal hoặc chọn không cần.',{evidence:true}],
  ['loading_dispatch','loaded_quantity','Đối chiếu lượng xếp, số kiện và trọng lượng','Ghi số thực tế; chụp ảnh hàng xếp.',{critical:true,evidence:true,verify:true}],
  ['loading_dispatch','driver_documents','Tài xế nhận hàng và bộ chứng từ','Ghi nhận người bàn giao / nhận; ảnh biên bản.',{critical:true,evidence:true,verify:true}],
  ['loading_dispatch','dispatch_time','Ghi giờ xe rời kho, seal và mã vận đơn','Chỉ thực hiện khi không còn STOP và chứng từ đã kiểm.',{critical:true,evidence:true,verify:true}],
  ['delivery_pod','delivered_quantity','Xác nhận giao đủ, giờ giao và người nhận','Ghi chênh lệch / hư hại nếu có.',{critical:true}],
  ['delivery_pod','pod','Lưu POD / ảnh ký nhận','Bằng chứng giao hàng phải còn truy cập được.',{critical:true,evidence:true,verify:true}],
  ['closeout','issues_payment','Ghi vấn đề và việc theo dõi thanh toán','Gắn người phụ trách nếu còn công nợ.'],
  ['closeout','feedback_reorder','Phản hồi khách, ngày liên hệ lại / đặt lại','Một hành động kế tiếp rõ ràng cho khách này.'],
];

const exportOnly = [
  ['logistics','port_cutoff','Xác nhận cảng / depot, booking và hạn cut-off','Không để lỡ thời hạn xe / tàu.',{critical:true}],
  ['documents_checked','transport_document','Vận đơn / chứng từ vận tải','Đối chiếu booking, người nhận và cảng.',{document:true,critical:true}],
  ['documents_checked','customs_export','Bộ chứng từ hải quan / xuất khẩu','Kiểm chứng từ yêu cầu theo lô hàng.',{document:true,critical:true}],
  ['documents_checked','certificates','Chứng thư / giấy tờ khách yêu cầu','Chọn không cần nếu hợp đồng không yêu cầu.',{document:true}],
];

const escalation = {
  customer_onboarding:'Kinh doanh / quản lý', order_confirmation:'Kinh doanh / quản lý',
  stock_production:'Phụ trách sản xuất / QC', logistics:'Phụ trách vận chuyển',
  documents_checked:'Kinh doanh / hành chính', vehicle_inspection:'Phụ trách vận chuyển',
  loading_dispatch:'Phụ trách kho / vận chuyển', delivery_pod:'Phụ trách vận chuyển',
  closeout:'Kinh doanh / kế toán',
};

export function procedureTemplate(key) {
  if (!['domestic_b2b','export_b2b'].includes(key)) throw new Error('invalid_template');
  const rows = key === 'export_b2b' ? [...common,...exportOnly] : common;
  const order = new Map(PROCEDURE_STAGES.map(([stage],index)=>[stage,index]));
  return rows.map(([stage_key,item_key,title,guidance,options={ }])=>({
    stage_key,item_key,title,guidance,required:true,critical:!!options.critical,
    evidence_required:!!(options.evidence||options.document),
    verification_required:!!(options.verify||options.document||options.critical),
    document_state:options.document?'missing':null,
    escalation_contact:escalation[stage_key],
  })).sort((a,b)=>order.get(a.stage_key)-order.get(b.stage_key)).map((item,position)=>({...item,position}));
}

export const isFinished = item => item.status === 'verified' || item.status === 'not_required' || (item.status === 'done' && !item.verification_required);

export function procedureProgress(items) {
  const required = items.filter(item=>item.required && item.status!=='not_required');
  const done = required.filter(isFinished).length;
  return {done,total:required.length,percent:required.length?Math.round(done/required.length*100):100};
}

export function preDispatchProblems(items,blockers) {
  const stop = blockers.filter(blocker=>blocker.stop_work && ['open','resolved'].includes(blocker.status));
  const critical = items.filter(item=>item.required && item.critical &&
    ['order_confirmation','stock_production','logistics','documents_checked','vehicle_inspection','loading_dispatch'].includes(item.stage_key) && !isFinished(item));
  return {stop,critical};
}
