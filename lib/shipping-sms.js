import { createHash } from 'node:crypto';
import { trackingSmsPreview } from './tracking-sms-preview.js';

export function shippingSmsId(order) {
  const identity = [order?.id, order?.shipping_carrier, order?.tracking_code].join('|');
  return `sms-shipping-${createHash('sha256').update(identity).digest('hex').slice(0, 32)}`;
}

export function shippingSmsProviderId(order) {
  return `hl_${createHash('sha256').update(shippingSmsId(order)).digest('base64url').slice(0, 18)}`;
}

export function shippingSmsEligibility(order, record) {
  if (!order || !record) return { eligible: false, reason: 'missing_record' };
  if (order.stage !== 'shipping' || order.status !== 'shipped') return { eligible: false, reason: 'not_shipping' };
  if (record.shipping_carrier !== order.shipping_carrier || record.tracking_code !== order.tracking_code) {
    return { eligible: false, reason: 'waybill_changed' };
  }
  const preview = trackingSmsPreview(order);
  if (!preview.phone) return { eligible: false, reason: 'invalid_phone' };
  if (preview.issues.length || !preview.text) return { eligible: false, reason: 'incomplete_tracking' };
  return { eligible: true, reason: 'ready', phone: preview.phone, text: preview.text };
}
