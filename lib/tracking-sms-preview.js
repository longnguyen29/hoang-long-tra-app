import {buildManualOrderMessage} from './manual-order-message.js';
import {SHIPPING_CARRIER_IDS,carrierLabel} from './carrier-tracking.js';

// Preview only: this module has no gateway, network or send operation.
export function trackingSmsPreview(order) {
 const contact=String(order.contact||'').trim();
 const compact=contact.replace(/[\s().-]/g,'');
 const phone=/^0\d{9}$/.test(compact)?`+84${compact.slice(1)}`:/^\+?84\d{9}$/.test(compact)?`+${compact.replace(/^\+/,'')}`:'';
 const code=String(order.trackingCode||'').trim();
 const carrier=order.shippingCarrier;
 const issues=[];
 if(!phone)issues.push('Liên hệ chưa phải một số điện thoại Việt Nam rõ ràng. Kiểm tra lại số nhận.');
 if(!code)issues.push('Chưa lưu mã vận đơn.');
 if(!SHIPPING_CARRIER_IDS.includes(carrier))issues.push('Chưa có hãng vận chuyển hợp lệ.');
 if(!order.publicTrackingToken)issues.push('Đơn chưa có link theo dõi cho khách.');
 return {mode:'preview',phone,contact,code,carrier:carrierLabel(carrier),issues,text:code&&SHIPPING_CARRIER_IDS.includes(carrier)?buildManualOrderMessage({order,kind:'tracking'}):''};
}
