import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { sampleFollowupPhone, sampleFollowupSendWindow, buildSampleFollowupMessage } from '../lib/sample-followup.js';
const backend='data:text/javascript,'+encodeURIComponent('export function createAdminClient(){throw new Error("unauthorized database access")}');
registerHooks({resolve(specifier,context,next){
 if(specifier==='@/lib/supabase/admin')return {url:backend,shortCircuit:true};
 if(specifier.startsWith('@/'))return next(pathToFileURL(path.resolve(specifier.slice(2)+'.js')).href,context);
 return next(specifier,context);
}});
const { processSampleFollowups, sampleFollowupProviderId }=await import('../lib/sample-followup-server.js');
const { GET }=await import('../app/api/cron/sample-followups/route.js');
const now=new Date('2026-10-10T03:00:00Z');
function fixture(overrides={}) {
 let row={id:'sample-queue',source_id:'sample-1',customer_name:'Test café',phone:'0901234567',channel:'sms',status:'pending',attempts:0,
   due_at:'2026-10-09T03:00:00Z',updated_at:'2026-10-02T03:00:00Z',last_error:'',retry_at:null,telegram_notified_at:null,telegram_claimed_at:null,...overrides};
 const sms=[],telegram=[];let enabled=true,eligible=true,receiptFailure=false;
 const admin={from(table){let patch=null;const filters=[];const chain={
  select(){return chain},eq(k,v){filters.push(r=>r[k]===v);return chain},in(k,v){filters.push(r=>v.includes(r[k]));return chain},
  lt(k,v){filters.push(r=>r[k]<v);return chain},lte(k,v){filters.push(r=>r[k]<=v);return chain},is(k,v){filters.push(r=>r[k]===v);return chain},
  not(k,op,v){filters.push(r=>!v.slice(1,-1).split(',').includes(r[k]));return chain},
  or(value){if(value.startsWith('retry_at'))filters.push(r=>!r.retry_at||r.retry_at<=options.now.toISOString());
   else filters.push(r=>r.channel==='telegram'||r.status==='queued'||r.status==='failed'&&r.attempts>=3||['receipt_unconfirmed','submission_uncertain'].includes(r.last_error));return chain},
  order(){return chain},limit(){return chain},update(p){patch=p;return chain},
  single(){return Promise.resolve({data:table==='sample_followup_settings'?{enabled}:{...row},error:null})},
  maybeSingle(){if(receiptFailure&&patch?.status==='queued')return Promise.resolve({data:null,error:{message:'fixture receipt failure'}});
   const match=filters.every(f=>f(row));if(match&&patch)row={...row,...patch};return Promise.resolve({data:match?{...row}:null,error:null})},
  then(resolve){const matches=filters.every(f=>f(row));if(matches&&patch)row={...row,...patch};return Promise.resolve({data:matches?[{...row}]:[],error:null}).then(resolve)},
 };return chain},
 async rpc(name){
  if(name==='claim_sample_followup'){
   if(!enabled||!eligible||!['pending','failed'].includes(row.status)||row.due_at>options.now.toISOString()||row.attempts>=3||row.retry_at&&row.retry_at>options.now.toISOString())return {data:[]};
   row={...row,status:'sending',claim_token:'test-lease',claimed_at:options.now.toISOString(),attempts:row.attempts+1};return {data:[{...row}]};}
  if(name==='validate_sample_followup'){if(!eligible){row={...row,status:'cancelled'};return {data:[]}}return {data:[{...row}]}}
  if(name==='claim_sample_followup_telegram'){if(!eligible||row.telegram_claimed_at)return {data:[]};row={...row,telegram_claimed_at:now.toISOString()};return {data:[{...row}]}}
  throw new Error(`unexpected RPC ${name}`);
 }};
 const options={now,config:{ready:true},telegramConfig:{token:'fixture-only',chatId:'fixture-only'},
  sendMessage:async value=>{sms.push(value);return{id:value.id,state:'Pending'}},
  sendNotification:async text=>{telegram.push(text)}};
 return{admin,options,sms,telegram,row:()=>row,pause:()=>{enabled=false},suppress:()=>{eligible=false},failReceipt:()=>{receiptFailure=true}};
}
test('phone requires one complete VN mobile; send hours use Vietnam timezone',()=>{
 assert.equal(sampleFollowupPhone('+84 901 234 567'),'+84901234567');assert.equal(sampleFollowupPhone('Name 0901234567'),'');
 assert.equal(sampleFollowupPhone('0901234567 0912345678'),'');assert.equal(sampleFollowupSendWindow('2026-10-10T02:00:00Z'),true);
 assert.equal(sampleFollowupSendWindow('2026-10-10T11:00:00Z'),false);assert.match(buildSampleFollowupMessage(),/chưa nhận mẫu/);
});
test('future due date, paused settings and nighttime submit no SMS',async()=>{
 for(const mode of ['future','paused','night']){const f=fixture(mode==='future'?{due_at:'2026-10-11T03:00:00Z'}:{});
  if(mode==='paused')f.pause();if(mode==='night')f.options.now=new Date('2026-10-10T12:00:00Z');
  await processSampleFollowups(f.admin,f.options);assert.equal(f.sms.length,0);assert.equal(f.telegram.length,0)}
});
test('due submission and concurrent scans send one SMS and one honest Telegram receipt',async()=>{
 const f=fixture();await Promise.all([processSampleFollowups(f.admin,f.options),processSampleFollowups(f.admin,f.options)]);
 assert.equal(f.sms.length,1);assert.equal(f.telegram.length,1);assert.equal(f.row().status,'queued');assert.match(f.telegram[0],/chưa xác nhận khách đã nhận/);
 assert.equal(f.sms[0].id,sampleFollowupProviderId('sample-queue'));await processSampleFollowups(f.admin,f.options);assert.equal(f.sms.length,1);
});
test('fresh suppression and invalid phone cannot reach the gateway',async()=>{
 const f=fixture();f.suppress();await processSampleFollowups(f.admin,f.options);assert.equal(f.sms.length,0);
 const invalid=fixture({phone:'unrelated 0901234567'});await processSampleFollowups(invalid.admin,invalid.options);assert.equal(invalid.sms.length,0);assert.equal(invalid.row().last_error,'invalid_phone');
});
test('definite rejection retries after three hours, with the same provider ID',async()=>{
 const f=fixture();f.options.sendMessage=async value=>{f.sms.push(value);throw new Error('sms_gateway_400:fixture-only')};
 await processSampleFollowups(f.admin,f.options);assert.equal(f.row().status,'failed');assert.equal(f.row().retry_at,'2026-10-10T06:00:00.000Z');
 await processSampleFollowups(f.admin,f.options);assert.equal(f.sms.length,1);
 f.options.now=new Date('2026-10-10T06:00:00Z');await processSampleFollowups(f.admin,f.options);assert.equal(f.sms.length,2);assert.equal(f.sms[0].id,f.sms[1].id);
});
test('accepted receipt failure and timeout require review; never mark them failed/retry',async()=>{
 const receipt=fixture();receipt.failReceipt();await processSampleFollowups(receipt.admin,receipt.options);assert.equal(receipt.row().last_error,'receipt_unconfirmed');
 await processSampleFollowups(receipt.admin,receipt.options);assert.equal(receipt.sms.length,1);
 const timeout=fixture();timeout.options.sendMessage=async value=>{timeout.sms.push(value);throw new Error('TimeoutError')};
 await processSampleFollowups(timeout.admin,timeout.options);assert.equal(timeout.row().last_error,'submission_uncertain');
 await processSampleFollowups(timeout.admin,timeout.options);assert.equal(timeout.sms.length,1);
});
test('Telegram-only mode notifies staff without sending customer SMS',async()=>{
 const f=fixture({channel:'telegram'});await processSampleFollowups(f.admin,f.options);assert.equal(f.sms.length,0);assert.equal(f.telegram.length,1);
});
test('Telegram ambiguity retains claim instead of duplicate retry',async()=>{
 const f=fixture({channel:'telegram'});f.options.sendNotification=async text=>{f.telegram.push(text);throw new Error('timeout')};
 await processSampleFollowups(f.admin,f.options);await processSampleFollowups(f.admin,f.options);assert.equal(f.telegram.length,1);assert.equal(f.row().telegram_error,'timeout');
});
test('scheduler rejects unauthenticated calls before touching the database',async()=>{
 const previous=process.env.SMS_RETRY_CRON_SECRET;try{delete process.env.SMS_RETRY_CRON_SECRET;assert.equal((await GET(new Request('https://test.invalid'))).status,503);
 process.env.SMS_RETRY_CRON_SECRET='fixture-secret';assert.equal((await GET(new Request('https://test.invalid',{headers:{authorization:'Bearer wrong'}}))).status,401);
 }finally{if(previous===undefined)delete process.env.SMS_RETRY_CRON_SECRET;else process.env.SMS_RETRY_CRON_SECRET=previous}
});

test('a second worker does not consume Telegram receipt while the first SMS call is in flight',async()=>{
 const f=fixture();let release;const submitted=new Promise(resolve=>{release=resolve});
 f.options.sendMessage=async value=>{f.sms.push(value);return submitted};
 const first=processSampleFollowups(f.admin,f.options);
 // Wait for the simulated external call, without actual network/time delays.
 while(!f.sms.length) await Promise.resolve();
 await processSampleFollowups(f.admin,f.options);assert.equal(f.telegram.length,0);
 release({id:f.sms[0].id,state:'Pending'});await first;
 assert.equal(f.sms.length,1);assert.equal(f.telegram.length,1);assert.match(f.telegram[0],/SMS đã chuyển/);
});
test('gateway 5xx ambiguity is not retried and alerts only after the lease expires',async()=>{
 const f=fixture();f.options.sendMessage=async value=>{f.sms.push(value);throw new Error('sms_gateway_502:fixture-proxy')};
 await processSampleFollowups(f.admin,f.options);assert.equal(f.row().last_error,'submission_uncertain');assert.equal(f.telegram.length,0);
 f.options.now=new Date('2026-10-10T03:30:00Z');await processSampleFollowups(f.admin,f.options);
 assert.equal(f.sms.length,1);assert.equal(f.telegram.length,1);assert.match(f.telegram[0],/Chưa xác nhận kết quả/);
});
