import test from 'node:test';
import assert from 'node:assert/strict';
import { publicDeliveryState, latestOrderUpdate, publicOrderLines, orderQuantitySummary, carrierTrackingUrl } from './public-order-journey.js';

test('shipping with only a waybill does not claim the carrier has accepted the parcel', () => {
  const state = publicDeliveryState({ tracking_code: 'TEST123' }, 'shipping');
  assert.equal(state.label, 'Chờ cập nhật từ hãng');
  assert.doesNotMatch(state.headline, /trên đường|đã nhận|đã giao/);
  assert.equal(publicDeliveryState({}, 'shipping').label, 'Chờ mã vận đơn');
});
test('carrier-reported exceptions retain their actual status rather than saying on the way', () => {
  const state = publicDeliveryState({ shipping_carrier: 'vietnam_post', carrier_status_code: '19', carrier_status_name: 'Trả hàng thành công', carrier_status_at: '2026-10-01T08:00:00Z' }, 'shipping');
  assert.equal(state.label, 'Trả hàng thành công'); assert.equal(state.summary, state.label);
});
test('completion without delivery proof does not claim delivery', () => {
  assert.equal(publicDeliveryState({}, 'completed').headline, 'Đơn đã hoàn tất.');
  assert.equal(publicDeliveryState({ delivered_at: '2026-10-01T08:00:00Z' }, 'completed').label, 'Đã giao hàng');
  assert.equal(publicDeliveryState({ shipping_carrier: 'vietnam_post', carrier_status_code: '14' }, 'shipping').label, 'Đã giao hàng');
  assert.equal(publicDeliveryState({}, 'packing'), null);
});
test('last updated uses the latest real event even when an older carrier timestamp exists', () => {
  assert.equal(latestOrderUpdate({ ts: '2026-09-29T10:57:00Z', carrier_status_at: '2026-09-30T08:00:00Z' }, '2026-10-01T07:26:00Z'), '2026-10-01T07:26:00Z');
  assert.equal(latestOrderUpdate({ ts: 'invalid' }, null), null);
});
test('public product data excludes contact details, internal IDs and prices', () => {
  const lines = publicOrderLines([{ name: { vi: 'Hồng Trà Shan Mật' }, qty: 3, unit: 'kg', price: 250000, productId: 'internal', contact: 'private' }, { name: 'Lục Trà Hoa Ngọc Lan', qty: 2, unit: 'kg' }]);
  assert.deepEqual(lines[0], { name: 'Hồng Trà Shan Mật', qty: 3, unit: 'kg' });
  assert.equal(orderQuantitySummary(lines), '5 kg');
  assert.deepEqual(publicOrderLines(null), []);
});
test('quantity summaries do not combine incompatible units', () => {
  assert.equal(orderQuantitySummary([{ qty: 5, unit: 'kg' }, { qty: 2, unit: 'pcs' }]), '5 kg · 2 gói');
  assert.equal(carrierTrackingUrl('unknown'), '');
  assert.match(carrierTrackingUrl('vietnam_post'), /^https:\/\/vietnampost.vn\//);
});
