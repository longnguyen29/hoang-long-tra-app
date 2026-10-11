import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
registerHooks({ resolve(specifier, context, next) {
  if (specifier.startsWith('@/')) return next(pathToFileURL(path.resolve(specifier.slice(2) + '.js')).href, context);
  return next(specifier, context);
} });
const { maybeSendShippingSms, sendShippingSmsManually, retryShippingSms } = await import('../lib/shipping-sms-server.js');
const { refreshSmsRecord, refreshOrderSmsStatuses } = await import('../lib/order-sms-status-server.js');
const { shippingSmsId, shippingSmsProviderId } = await import('../lib/shipping-sms.js');
const { readSmsGatewayMessage } = await import('../lib/sms-gateway.js');

const now = new Date('2026-10-11T09:00:00Z');
const baseOrder = { id: 'test-order', stage: 'shipping', status: 'shipped', contact: '0900000000',
  shipping_carrier: 'vietnam_post', tracking_code: 'TEST123', public_tracking_token: 'test-link' };
function fixture(overrides = {}, orderChanges = {}) {
  const order = { ...baseOrder, ...orderChanges };
  const row = { id: shippingSmsId(order), order_id: order.id, shipping_carrier: order.shipping_carrier,
    tracking_code: order.tracking_code, status: 'failed', attempts: 1, claimed_at: '2026-10-11T06:00:00Z',
    updated_at: '2026-10-11T06:00:00Z', created_at: '2026-10-11T06:00:00Z', provider_message_id: '', provider_state: '',
    provider_checked_at: null, provider_sent_at: null, provider_delivered_at: null, provider_states: {}, provider_check_error: '',
    submission_token: null, retry_generation: 0, last_error: 'sms_gateway_400:invalid device', ...overrides };
  const tables = { orders: [order], sms_tracking_updates: [row], sms_payment_reminders: [], sample_followups: [], order_events: [] };
  const calls = [], lookups = [];
  const admin = { from(table) {
    const filters = []; let patch, inserted, take = Infinity, ordering;
    const chain = {
      select() { return chain; }, update(value) { patch = value; return chain; }, insert(value) { inserted = value; return chain; },
      eq(k,v) { filters.push(row => row[k] === v); return chain; }, neq(k,v) { filters.push(row => row[k] !== v); return chain; },
      is(k,v) { filters.push(row => (row[k] ?? null) === v); return chain; },
      in(k,v) { filters.push(row => v.includes(row[k])); return chain; },
      not(k,op,v) { const values = v.replace(/[()]/g,'').split(','); filters.push(row => !values.includes(row[k])); return chain; },
      lt(k,v) { filters.push(row => row[k] < v); return chain; }, lte(k,v) { filters.push(row => row[k] <= v); return chain; },
      gte(k,v) { filters.push(row => row[k] >= v); return chain; },
      order(k) { ordering=k; return chain; }, limit(n) { take=n; return chain; },
      execute(single = false) {
        if (inserted) {
          if (table === 'sms_tracking_updates') return { error: { code: '23505' }, data: null };
          tables[table].push(inserted); return { error: null, data: inserted };
        }
        let rows = tables[table].filter(row => filters.every(fn => fn(row)));
        if (ordering) rows.sort((a,b) => String(a[ordering] || '').localeCompare(String(b[ordering] || '')));
        rows = rows.slice(0,take);
        if (patch) for (const item of rows) Object.assign(item,patch);
        return { data: single ? rows[0] ? { ...rows[0] } : null : rows.map(row => ({ ...row })), error: null };
      },
      async single() { return chain.execute(true); }, async maybeSingle() { return chain.execute(true); },
      then(resolve,reject) { return Promise.resolve(chain.execute()).then(resolve,reject); },
    }; return chain;
  } };
  const options = { now, config: { ready: true }, expectedPhone: '+84900000000',
    sendMessage: async message => { calls.push(message); return { id: message.id, state: 'Pending', states: { Pending: now.toISOString() } }; },
    readStatus: async ({id}) => { lookups.push(id); const error = new Error('sms_gateway_status_404'); error.httpStatus=404; throw error; } };
  return { admin, row, order, tables, calls, lookups, options };
}
test('definite rejected attempt retries after three hours using its original deterministic ID', async () => {
  const f=fixture(); const result=await maybeSendShippingSms(f.admin,f.order,f.options);
  assert.equal(result.status,'queued');assert.equal(f.calls.length,1);assert.equal(f.row.attempts,2);
  assert.equal(f.calls[0].id,shippingSmsProviderId(f.order));assert.equal(f.row.retry_generation,0);
});
test('timeout is held uncertain and subsequent cron/button taps do not blindly resubmit',async()=>{
  const f=fixture();f.options.sendMessage=async()=>{f.calls.push('attempt');throw new Error('TimeoutError')};
  assert.equal((await maybeSendShippingSms(f.admin,f.order,f.options)).status,'uncertain');
  assert.equal(f.row.status,'uncertain');assert.equal(f.row.last_error,'submission_uncertain');
  assert.equal((await sendShippingSmsManually(f.admin,f.order,{...f.options,action:'retry',reason:'Override cooldown approved'})).status,'already_processing');
  assert.equal(f.calls.length,1);
  f.options.now=new Date('2026-10-11T13:00:00Z');
  assert.equal((await sendShippingSmsManually(f.admin,f.order,{...f.options,action:'retry',reason:'Override cooldown approved'})).status,'check_required');
  assert.equal(f.calls.length,1);
});
test('late provider acceptance is recovered to Sent without another customer message',async()=>{
  const f=fixture({status:'uncertain',provider_message_id:shippingSmsProviderId(baseOrder),last_error:'submission_uncertain'});
  f.options.readStatus=async({id})=>({id,state:'Sent',states:{Pending:'2026-10-11T06:01:00Z',Sent:'2026-10-11T06:02:00Z'}});
  const result=await sendShippingSmsManually(f.admin,f.order,{...f.options,action:'retry'});
  assert.equal(result.status,'already_sent');assert.equal(f.row.provider_sent_at,'2026-10-11T06:02:00.000Z');
  assert.equal(f.row.status,'queued');assert.equal(f.calls.length,0);
});
test('queued/processed provider messages block even an acknowledged resend',async()=>{
  for(const state of ['Pending','Processed','Cancelling']){
    const f=fixture({status:'queued',provider_message_id:shippingSmsProviderId(baseOrder)});
    f.options.readStatus=async({id})=>({id,state,states:{}});
    const result=await sendShippingSmsManually(f.admin,f.order,{...f.options,action:'resend',reason:'Customer requested another SMS',acknowledgeDuplicate:true});
    assert.equal(result.status,'queued');assert.equal(f.calls.length,0);assert.equal(f.row.retry_generation,0);
  }
});
test('explicit resend archives prior delivery evidence and uses a new provider generation',async()=>{
  const oldId=shippingSmsProviderId(baseOrder);const f=fixture({status:'queued',provider_message_id:oldId});
  f.options.readStatus=async({id})=>({id,state:'Delivered',states:{Sent:'2026-10-11T06:01:00Z',Delivered:'2026-10-11T06:02:00Z'}});
  const result=await sendShippingSmsManually(f.admin,f.order,{...f.options,action:'resend',reason:'Customer requested another SMS',acknowledgeDuplicate:true,actor:'manager@example.test'});
  assert.equal(result.status,'queued');assert.equal(f.calls.length,1);assert.equal(f.calls[0].id,`${oldId}_r1`);
  assert.equal(f.row.retry_generation,1);
  const event=f.tables.order_events.find(row=>row.kind==='sms_manual_action');
  assert.equal(event.actor,'manager@example.test');assert.equal(JSON.parse(event.message).previous_receipt.provider_state,'Delivered');
});
test('manual completion-stage send/cooldown needs a reason and cannot bypass invalid phone',async()=>{
  const f=fixture({claimed_at:'2026-10-11T08:59:00Z'},{stage:'completed',status:'completed'});
  assert.equal((await sendShippingSmsManually(f.admin,f.order,{...f.options,action:'send'})).status,'reason_required');
  assert.equal((await sendShippingSmsManually(f.admin,f.order,{...f.options,action:'send',reason:'Approved delivery status update'})).status,'queued');
  assert.match(f.calls[0].text,/cập nhật đơn/);assert.equal(f.order.stage,'completed');
  const bad=fixture({}, {contact:'email@example.test'});
  assert.equal((await sendShippingSmsManually(bad.admin,bad.order,{...bad.options,reason:'Manager approved sending'})).status,'needs_phone');assert.equal(bad.calls.length,0);
});
test('concurrent sends share one claim and stale receipt cannot overwrite the current generation',async()=>{
  const f=fixture();await Promise.all([maybeSendShippingSms(f.admin,f.order,f.options),maybeSendShippingSms(f.admin,f.order,f.options)]);
  assert.equal(f.calls.length,1);
  const stale={...f.row};f.row.retry_generation++;f.row.provider_message_id+='different';
  const result=await refreshSmsRecord(f.admin,'sms_tracking_updates',stale,{...f.options,readStatus:async({id})=>({id,state:'Delivered',states:{}})});
  assert.equal(result.status,'changed');assert.equal(f.row.provider_state,'Pending');
});
test('refresh all three existing ledgers is read-only externally and preserves sample dispatch/workflow',async()=>{
  const f=fixture({status:'queued',provider_message_id:'shipping-provider'});
  f.tables.sms_payment_reminders.push({id:'p',order_id:f.order.id,status:'queued',provider_message_id:'payment-provider',provider_state:'',provider_checked_at:null,sent_at:null});
  f.tables.sample_followups.push({id:'s',order_id:f.order.id,status:'replied',provider_message_id:'sample-provider',provider_state:'',provider_checked_at:null,sent_at:'2026-10-01T00:00:00Z'});
  const result=await refreshOrderSmsStatuses(f.admin,{orderId:f.order.id,...f.options,readStatus:async({id})=>({id,state:'Delivered',states:{Sent:'2026-10-11T06:01:00Z',Delivered:'2026-10-11T06:02:00Z'}})});
  assert.equal(result.checked,3);assert.equal(f.calls.length,0);
  assert.equal(f.tables.sample_followups[0].sent_at,'2026-10-01T00:00:00Z');assert.equal(f.tables.sample_followups[0].status,'replied');
  assert.equal(f.tables.sample_followups[0].provider_delivered_at,'2026-10-11T06:02:00.000Z');
  assert.equal(f.tables.sms_payment_reminders[0].sent_at,null);
});
test('missing provider receipt keeps known delivery proof and cannot automatically authorize resend',async()=>{
  const f=fixture({status:'queued',provider_message_id:'known',provider_state:'Delivered',provider_delivered_at:'2026-10-11T06:02:00Z'});
  const result=await refreshSmsRecord(f.admin,'sms_tracking_updates',{...f.row},f.options);
  assert.equal(result.status,'not_found');assert.equal(f.row.provider_state,'Delivered');assert.equal(f.row.provider_delivered_at,'2026-10-11T06:02:00Z');
  assert.equal(f.row.provider_check_error,'provider_record_not_found');assert.equal(f.calls.length,0);
});
test('existing cron refreshes accepted receipts without submitting more SMS',async()=>{
  const f=fixture({status:'queued',provider_message_id:'accepted'});
  const result=await retryShippingSms(f.admin,{...f.options,readStatus:async({id})=>({id,state:'Delivered',states:{Delivered:now.toISOString()}})});
  assert.equal(result.scanned,0);assert.equal(result.refresh.checked,1);assert.equal(f.calls.length,0);assert.equal(f.row.provider_state,'Delivered');
});
test('gateway GET encodes provider ID, authenticates and validates the response',async()=>{
  let requested;const config={endpoint:'https://gateway.example.test/messages?old=query',accessToken:'test-only'};
  const receipt=await readSmsGatewayMessage({id:'message/id',config,fetchImpl:async(url,options)=>{
    requested={url,options};return Response.json({id:'message/id',state:'Sent',states:{}});
  }});
  assert.equal(receipt.state,'Sent');assert.equal(requested.options.method,'GET');assert.equal(requested.options.headers.Authorization,'Bearer test-only');
  assert.equal(requested.url,'https://gateway.example.test/messages/message%2Fid');
  await assert.rejects(()=>readSmsGatewayMessage({id:'message/id',config,fetchImpl:async()=>Response.json({id:'other',state:'Sent'})}),/invalid_receipt/);
});
test('confirmed Android failure retries after three hours with a new ID and archived failure',async()=>{
  const oldId=shippingSmsProviderId(baseOrder);const f=fixture({status:'queued',provider_message_id:oldId,provider_state:'Pending'});
  f.options.readStatus=async({id})=>({id,state:'Failed',states:{Pending:'2026-10-11T06:01:00Z',Failed:'2026-10-11T06:02:00Z'}});
  assert.equal((await maybeSendShippingSms(f.admin,f.order,f.options)).status,'queued');
  assert.equal(f.calls.length,1);assert.equal(f.calls[0].id,`${oldId}_r1`);
  const audit=JSON.parse(f.tables.order_events.find(row=>row.kind==='sms_manual_action').message);
  assert.equal(audit.action,'automatic_retry');assert.equal(audit.previous_receipt.provider_state,'Failed');
});
test('later failure preserves prior Sent proof and never automatically duplicates',async()=>{
  const f=fixture({status:'failed',provider_message_id:'old-id',provider_state:'Sent',provider_states:{Sent:'2026-10-11T06:01:00Z'}});
  f.options.readStatus=async({id})=>({id,state:'Failed',states:{Failed:'2026-10-11T07:00:00Z'}});
  assert.equal((await maybeSendShippingSms(f.admin,f.order,f.options)).status,'already_sent');
  assert.equal(f.row.provider_states.Sent,'2026-10-11T06:01:00Z');assert.equal(f.calls.length,0);
});
test('legacy unknown failures are held and recipient changes after confirmation cannot be overridden',async()=>{
  const unknown=fixture({last_error:'sms_gateway_500:unknown'});
  assert.equal((await maybeSendShippingSms(unknown.admin,unknown.order,unknown.options)).status,'check_required');assert.equal(unknown.calls.length,0);
  const f=fixture();const originalFrom=f.admin.from;
  f.admin.from=table=>{
    const chain=originalFrom(table);
    if(table==='order_events'){
      const originalInsert=chain.insert;
      chain.insert=value=>{f.order.contact='0911111111';return originalInsert(value)};
    }
    return chain;
  };
  const result=await sendShippingSmsManually(f.admin,f.order,{...f.options,action:'send'});
  assert.equal(result.status,'recipient_changed');assert.equal(f.calls.length,0);
});
test('concurrent fresh Sent receipt wins over stale Failed lookup and prevents automatic resend',async()=>{
  const f=fixture({provider_message_id:'existing'});
  f.options.readStatus=async({id})=>{
    f.row.provider_state='Sent';f.row.provider_states={Sent:'2026-10-11T08:00:00Z'};
    f.row.provider_checked_at=now.toISOString();
    return {id,state:'Failed',states:{Failed:'2026-10-11T07:00:00Z'}};
  };
  assert.equal((await maybeSendShippingSms(f.admin,f.order,f.options)).status,'already_processing');
  assert.equal(f.row.provider_state,'Sent');assert.equal(f.calls.length,0);
});
test('order receipt refresh is bounded to three and automatic sample refresh only selects SMS',async()=>{
  const f=fixture({status:'queued',provider_message_id:'first'});
  for(let n=0;n<4;n++)f.tables.sms_tracking_updates.push({...f.row,id:`extra-${n}`,provider_message_id:`provider-${n}`});
  const options={...f.options,readStatus:async({id})=>({id,state:'Sent',states:{}})};
  assert.equal((await refreshOrderSmsStatuses(f.admin,{orderId:f.order.id,limit:99,...options})).checked,3);
  const sample=fixture();
  sample.tables.sample_followups.push({id:'telegram',order_id:sample.order.id,status:'queued',channel:'telegram',provider_message_id:'historical-sms',provider_state:'Pending',updated_at:now.toISOString(),provider_checked_at:null});
  assert.equal((await refreshOrderSmsStatuses(sample.admin,{automatic:true,...options})).checked,0);
  sample.tables.sample_followups[0].channel='sms';
  assert.equal((await refreshOrderSmsStatuses(sample.admin,{automatic:true,...options})).checked,1);
});
test('concurrent Sent receipt survives stale POST acceptance and POST timeout',async()=>{
  for(const timeout of [false,true]){
    const f=fixture();
    f.options.sendMessage=async(message)=>{
      f.calls.push(message);
      f.row.status='queued';f.row.provider_state='Sent';
      f.row.provider_states={Sent:'2026-10-11T09:00:01Z'};
      f.row.provider_sent_at='2026-10-11T09:00:01Z';
      f.row.provider_checked_at='2026-10-11T09:00:02Z';
      f.row.last_error='';
      if(timeout)throw new Error('TimeoutError');
      return {id:message.id,state:'Pending',states:{Pending:now.toISOString()}};
    };
    const result=await maybeSendShippingSms(f.admin,f.order,f.options);
    assert.equal(result.status,'already_sent');assert.equal(f.calls.length,1);
    assert.equal(f.row.provider_state,'Sent');assert.equal(f.row.provider_states.Sent,'2026-10-11T09:00:01Z');
    assert.equal(f.row.provider_sent_at,'2026-10-11T09:00:01Z');assert.equal(f.row.status,'queued');
    assert.equal(f.row.last_error,'');
  }
});
