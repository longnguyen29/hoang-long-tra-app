import test from 'node:test';
import assert from 'node:assert/strict';
import {trackingSmsPreview} from './tracking-sms-preview.js';
const order={id:'test',customerName:'Test',contact:'0903 333 841',trackingCode:'VT123',shippingCarrier:'viettel_post',publicTrackingToken:'test-token'};
test('saved order produces preview only with recipient, code and tracking link',()=>{const p=trackingSmsPreview(order);assert.equal(p.mode,'preview');assert.equal(p.phone,'+84903333841');assert.deepEqual(p.issues,[]);assert.match(p.text,/VT123/);assert.match(p.text,/don-hang\/test-token/)});
test('ambiguous or multiple contacts do not silently select a recipient',()=>{for(const contact of ['0903333841 / 0912345678','zalo:0903333841','abc','090333384111']){const p=trackingSmsPreview({...order,contact});assert.equal(p.phone,'');assert.ok(p.issues.length)}});
test('updated saved code replaces previous code',()=>{const p=trackingSmsPreview({...order,trackingCode:'VT456'});assert.match(p.text,/VT456/);assert.doesNotMatch(p.text,/VT123/)});
test('missing tracking or link raises explicit issues',()=>{const p=trackingSmsPreview({...order,trackingCode:'',publicTrackingToken:''});assert.equal(p.text,'');assert.equal(p.issues.length,2)});
