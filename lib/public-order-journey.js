import { carrierStatusEffect } from './carrier-tracking.js';
import { SUPPORTED_SELLING_UNITS, formatLineQuantities } from './selling-units.js';

const publicSellingUnits = new Set([...SUPPORTED_SELLING_UNITS, 'tons', 'ton']);

export function publicDeliveryState(order, stage) {
  if (order.delivered_at || (order.carrier_status_code && carrierStatusEffect(order.shipping_carrier, order.carrier_status_code) === 'delivered')) {
    return { headline: 'Đơn đã giao thành công.', summary: 'Cảm ơn bạn đã chọn trà Hoàng Long.', label: 'Đã giao hàng' };
  }
  if (stage === 'completed') return { headline: 'Đơn đã hoàn tất.', summary: 'Cần kiểm tra lại hoặc đặt thêm trà? Nhà luôn sẵn sàng hỗ trợ.', label: 'Hoàn tất' };
  if (stage !== 'shipping') return null;
  if (order.carrier_status_name && order.carrier_status_at) {
    return { headline: 'Cập nhật giao hàng của bạn.', summary: order.carrier_status_name, label: order.carrier_status_name };
  }
  return {
    headline: 'Đơn đang ở bước giao hàng.',
    summary: order.tracking_code ? 'Đã lưu mã vận đơn. Nhà đang chờ hãng xác nhận hành trình; bạn có thể tra cứu trực tiếp bên dưới.' : 'Nhà đang chuẩn bị bàn giao. Mã vận đơn sẽ xuất hiện khi được cập nhật.',
    label: order.tracking_code ? 'Chờ cập nhật từ hãng' : 'Chờ mã vận đơn',
  };
}

export function latestOrderUpdate(order, lastEventAt) {
  return [order.ts, order.carrier_status_at, order.delivered_at, lastEventAt]
    .filter(value => value && Number.isFinite(new Date(value).getTime()))
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] || null;
}

export function publicOrderLines(lines) {
  return (Array.isArray(lines) ? lines : []).map(line => ({
    name: typeof line?.name === 'string' ? line.name : line?.name?.vi || line?.name?.en || 'Trà Hoàng Long',
    qty: Number(line?.qty) > 0 ? Number(line.qty) : 0,
    unit: publicSellingUnits.has(line?.unit) ? line.unit : '',
  }));
}

export function orderQuantitySummary(lines) {
  return formatLineQuantities(lines);
}

export function carrierTrackingUrl(carrier) {
  return {
    vietnam_post: 'https://vietnampost.vn/vi/ca-nhan/gui-tai-lieu-hang-hoa/gui-trong-nuoc/tra-cuu-hanh-trinh',
    viettel_post: 'https://en.viettelpost.com.vn/tra-cuu-don-hang',
  }[carrier] || '';
}
