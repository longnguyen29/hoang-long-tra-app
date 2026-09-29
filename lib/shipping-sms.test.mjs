import test from 'node:test';
import assert from 'node:assert/strict';
import { shippingSmsEligibility, shippingSmsId, shippingSmsProviderId } from './shipping-sms.js';

const order = {
  id: 'HL-42', stage: 'shipping', status: 'shipped', customer_name: 'Quán Sen',
  contact: '0903 333 841', shipping_carrier: 'viettel_post', tracking_code: 'VT123',
  public_tracking_token: 'link-token',
};
const record = { shipping_carrier: 'viettel_post', tracking_code: 'VT123' };

test('shipping SMS needs shipping stage, current waybill and an unambiguous phone', () => {
  const ready = shippingSmsEligibility(order, record);
  assert.equal(ready.eligible, true);
  assert.equal(ready.phone, '+84903333841');
  assert.match(ready.text, /VT123/);
  assert.match(ready.text, /don-hang\/link-token/);
  assert.equal(shippingSmsEligibility({ ...order, stage: 'packing' }, record).reason, 'not_shipping');
  assert.equal(shippingSmsEligibility(order, { ...record, tracking_code: 'OLD' }).reason, 'waybill_changed');
  assert.equal(shippingSmsEligibility({ ...order, contact: '0903333841 / 0912345678' }, record).reason, 'invalid_phone');
});

test('same waybill keeps provider id; corrected waybill gets a new id', () => {
  assert.equal(shippingSmsId(order), shippingSmsId({ ...order }));
  assert.notEqual(shippingSmsId(order), shippingSmsId({ ...order, tracking_code: 'VT124' }));
  assert.match(shippingSmsProviderId(order), /^hl_[a-zA-Z0-9_-]{18}$/);
  assert.equal(shippingSmsProviderId(order), shippingSmsProviderId({ ...order }));
});
