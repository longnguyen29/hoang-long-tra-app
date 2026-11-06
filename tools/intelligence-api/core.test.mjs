import test from 'node:test';import assert from 'node:assert/strict';
import * as api from './core.mjs';
const UUID='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const key='c'.repeat(64);
const ctx=(args={})=>({role:'manager',userId:'11111111-1111-4111-8111-111111111111',
 flags:{research:true,review:true,watches:true},scopedRPC:async (name)=>{
  if(name==='request_hl_intel_research')return{data:[{job_id:UUID,job_status:'pending',reused:false,claim_token:'secret'}]};
  if(name==='review_hl_intel_observation')return{data:{id:UUID,decision:'approved',claim_token:'secret'}};
  if(name==='propose_hl_intel_watch')return{data:{id:UUID,enabled:false,prospect_id:UUID,source_url:'https://example.com',reason:'Public update',claim_token:'secret'}};
 },...args});
const request={prospect_id:UUID,expected_version:1,idempotency_key:key};
const rejected=async (f,status,code)=>assert.rejects(f,e=>e.status===status&&e.code===code);
test('request: strict input accepted and safe output projected',async()=>{
 const result=await api.requestResearch(ctx(),request);
 assert.deepEqual(result,{status:202,body:{job_id:UUID,status:'pending',reused:false}});
 assert.equal(JSON.stringify(result).includes('claim_token'),false);
});
for(const bad of [null,{},[],{...request,prospect_id:'notuuid'},
 {...request,idempotency_key:'x'}, {...request,expected_version:0}, {...request,extra:true}]){
 test('request rejects bad input '+JSON.stringify(bad),()=>rejected(()=>api.requestResearch(ctx(),bad),400,'invalid_input'));
}
for(const role of ['employee','visitor',undefined]){
 test('request rejects unauthorized role '+role,()=>rejected(()=>api.requestResearch(ctx({role}),request),403,'forbidden'));
}
test('request fails closed when flag off',()=>rejected(()=>api.requestResearch(ctx({flags:{research:false}}),request),503,'feature_disabled'));
test('request requires scoped RPC (not service admin)',()=>rejected(()=>api.requestResearch(ctx({scopedRPC:null}),request),503,'service_unavailable'));
test('request maps quota and stale data',async()=>{
 for(const [reason,status,code] of [['intel_daily_limit',429,'daily_limit'],['stale_prospect',409,'conflict'],['prospect_suppressed',409,'prospect_suppressed'],['sensitive internal stack',503,'service_unavailable']]){
  await rejected(()=>api.requestResearch(ctx({scopedRPC:async()=>({error:new Error(reason)})}),request),status,code);
 }
});
test('review safe output and no prospect mutation',async()=>{
 let name;const a=ctx({scopedRPC:async(k)=>{name=k;return{data:{id:UUID,decision:'approved',version:2,claim_token:'secret',private_note:'x'}}}});
 const result=await api.reviewObservation(a,UUID,{expected_version:1,decision:'approved',note:'ok'});
 assert.equal(name,'review_hl_intel_observation');assert.equal(result.body.observation.decision,'approved');
 assert.equal('claim_token' in result.body.observation,false);
});
for(const bad of [null,{},[],{decision:'pending',expected_version:1},{decision:'approved',expected_version:0},{decision:'rejected',expected_version:1,note:'x'.repeat(1201)},{decision:'approved',expected_version:1,unexpected:true}]){
 test('review rejects invalid input',()=>rejected(()=>api.reviewObservation(ctx(),UUID,bad),400,'invalid_input'));
}
test('watch only accepts disabled response',async()=>{
 const result=await api.proposeWatch(ctx(),{prospect_id:UUID,reason:'Public update'});
 assert.equal(result.status,201);assert.equal(result.body.watch.enabled,false);
 await rejected(()=>api.proposeWatch(ctx({scopedRPC:async()=>({data:{id:UUID,enabled:true}})}),{prospect_id:UUID,reason:'Public update'}),503,'service_unavailable');
});
test('job projection hides server-only columns',()=>{
 const got=api.safeJob({id:UUID,status:'claimed',created_at:'2026-10-28T01:00:00Z',claim_token:'SECRET',claimed_by:'worker',idempotency_key:key,lease_until:'soon'});
 for(const field of ['claim_token','claimed_by','idempotency_key','lease_until'])assert.ok(!(field in got));
});
test('cursor roundtrip, pagination bound and strict status',()=>{
 const row={id:UUID,created_at:'2026-10-28T12:00:00Z'};
 assert.deepEqual(api.validateJobQuery({cursor:api.makeJobCursor(row)}).checkpoint,row);
 assert.equal(api.validateJobQuery({limit:'50',status:'pending'}).limit,50);
 for(const query of [{limit:'0'},{limit:'51'},{status:'x'},{cursor:'notbase64'},{cursor:'Z30'}]){
   assert.throws(()=>api.validateJobQuery(query),e=>e.status===400);
 }
});
test('one fresh client key per click',()=>{
 const a=api.newResearchKey(),b=api.newResearchKey();assert.match(a,/^[a-f0-9]{64}$/);assert.notEqual(a,b);
});
test('job list uses bounded query and no hidden credentials',async()=>{
 let asked;const row={id:UUID,created_at:'2026-10-28T12:00:00Z',claim_token:'SECRET',status:'pending'};
 const c=ctx({listManagerJobs:async opts=>{asked=opts;return [row,row,row]}});
 const result=await api.listJobs(c,{limit:'2'});
 assert.equal(asked.fetchLimit,3);assert.equal(result.body.jobs.length,2);
 assert.ok(result.body.next_cursor);assert.equal(JSON.stringify(result).includes('SECRET'),false);
});
test('job list fails closed for oversized provider output',async()=>{
 await rejected(()=>api.listJobs(ctx({listManagerJobs:async()=>Array.from({length:24},()=>({id:UUID}))}),{limit:'20'}),503,'service_unavailable');
});
test('summary only includes allowable count keys',async()=>{
 const count={pending:1,claimed:0,succeeded:5,failed:1,canceled:0,dead_letter:0,observations_pending:2,private_email:'SECRET'};
 const result=await api.getSummary(ctx({getManagerSummary:async()=>count}));
 assert.equal(JSON.stringify(result).includes('SECRET'),false);assert.deepEqual(Object.keys(result.body.counts),Object.keys(count).slice(0,7));
 await rejected(()=>api.getSummary(ctx({getManagerSummary:async()=>({...count,pending:-1})})),503,'service_unavailable');
});
