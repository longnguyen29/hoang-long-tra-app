import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

const mocks='data:text/javascript,'+encodeURIComponent(`let staff=null;let calls=[];let result={status:'queued'};export function setup(s,r){staff=s;calls=[];result=r||{status:'queued'}}export function history(){return calls}export async function authenticateManagerRequest(){return staff}export async function readShippingSms(){return {status:'queued',provider_state:'Sent'}}export async function readOrderSmsHistory(){return {items:[]}}export async function sendShippingSmsManually(a,o,options){calls.push(options);return result}export async function refreshOrderSmsStatuses(){calls.push('refresh');return {status:'refreshed',checked:0}}`);
registerHooks({resolve(specifier,context,next){if(['@/lib/staff-api-auth','@/lib/shipping-sms-server','@/lib/order-sms-history-server','@/lib/order-sms-status-server'].includes(specifier))return {url:mocks,shortCircuit:true};return next(specifier,context)}});
const {setup,history}=await import(mocks);const {POST}=await import('../app/api/staff/orders/[id]/sms/route.js');
const order={id:'TEST',shipping_carrier:'vietnam_post',tracking_code:'CODE'};
const staff={user:{id:'manager',email:'manager@example.test'},admin:{from(){const chain={select(){return chain},eq(){return chain},order(){return chain},async maybeSingle(){return {data:order,error:null}},then(resolve){return Promise.resolve({data:[],error:null}).then(resolve)}};return chain}}};
const send=body=>POST(new Request('https://example.test',{method:'POST',body:JSON.stringify(body)}),{params:Promise.resolve({id:'TEST'})});
test('SMS route requires manager authentication before backend access',async()=>{setup(null);assert.equal((await send({action:'send'})).status,401)});
test('SMS route rejects mixed/invalid actions and changed waybill before sending',async()=>{
  setup(staff);for(const body of [{action:'unknown'},{action:'send',stage:'shipping'},{action:'send'},{action:'retry',expectedCarrier:'vietnam_post',expectedTrackingCode:'OLD'}])assert.ok((await send(body)).status>=400);
  assert.equal(history().length,0);
});
test('explicit resend requires acknowledgement and meaningful reason',async()=>{
  setup(staff);const base={action:'resend',expectedCarrier:'vietnam_post',expectedTrackingCode:'CODE',expectedPhone:'+84900000000'};
  assert.equal((await send({...base,reason:'Customer requested repeat'})).status,400);
  assert.equal((await send({...base,reason:'short',acknowledgeDuplicate:true})).status,400);
  assert.equal(history().length,0);
});
test('manual send passes authenticated actor and returns current history/provider state',async()=>{
  setup(staff);const response=await send({action:'send',expectedCarrier:'vietnam_post',expectedTrackingCode:'CODE',expectedPhone:'+84900000000',reason:'  Approved dispatch update  '});
  assert.equal(response.status,200);const body=await response.json();assert.equal(body.trackingSms.provider_state,'Sent');
  assert.deepEqual(history(),[{action:'send',reason:'Approved dispatch update',acknowledgeDuplicate:false,expectedPhone:'+84900000000',actor:'manager@example.test'}]);
});
test('refresh route only reads status and worker refusals are visible',async()=>{
  setup(staff);assert.equal((await send({action:'refresh'})).status,200);assert.deepEqual(history(),['refresh']);
  setup(staff,{status:'reason_required'});const response=await send({action:'retry',expectedCarrier:'vietnam_post',expectedTrackingCode:'CODE',expectedPhone:'+84900000000'});
  assert.equal(response.status,409);assert.equal((await response.json()).error,'sms_reason_required');
});
