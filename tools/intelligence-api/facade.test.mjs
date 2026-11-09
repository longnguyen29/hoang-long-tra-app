import test from 'node:test';
import assert from 'node:assert/strict';
import {createManagerApi} from './facade.mjs';

// These are explicit mock authorization and RLS behaviours, not proof that
// the deployed Supabase roles or JWT-scoped client have been tested.
const userA='11111111-1111-4111-8111-111111111111';
const userB='22222222-2222-4222-8222-222222222222';
const prospect='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const job='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const observation='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const key='a'.repeat(64);
const auth='Bearer mock-manager-token';
const requestBody={prospect_id:prospect,expected_version:1,idempotency_key:key};

function fixture({flags={research:true,review:true},role='manager',identity=userA,clientOverride}={}) {
  const seen=[]; const calls=[];
  const client=clientOverride ?? {
    async rpc(name,args) {
      calls.push({name,args});
      if(name==='request_hl_intel_research') return {data:[{job_id:job,job_status:'pending',reused:false,claim_token:'SECRET',idempotency_key:key}]};
      if(name==='cancel_hl_intel_research') return {data:[{job_id:job,job_status:'canceled',canceled:true,claim_token:'SECRET'}]};
      if(name==='review_hl_intel_observation') return {data:{id:observation,prospect_id:prospect,decision:'approved',version:2,claim_token:'SECRET',private_note:'SECRET'}};
      throw Error('internal database message SECRET');
    },
    async listJobs(options) {calls.push({name:'jobs',options}); return [{id:job,prospect_id:prospect,status:'pending',created_at:'2026-10-28T12:00:00Z',claim_token:'SECRET',idempotency_key:key,claimed_by:'worker',lease_until:'private'}];},
    async listObservations(options) {calls.push({name:'observations',options});return [{id:observation,prospect_id:prospect,source_url:'https://example.org',excerpt:'tea',observed_at:'2026-10-28T12:00:00Z',decision:'pending',version:1,claim_token:'SECRET',private_note:'SECRET'}];},
  };
  const api=createManagerApi({flags,authenticate:async token=>{seen.push(['auth',token]);return token==='mock-manager-token'?{user:{id:identity},role}:null;},
    createScopedClient:async token=>{seen.push(['scoped',token]);return client;}});
  return {api,seen,calls,client};
}

for (const action of ['request','cancel','review','observations','jobs']) {
  test(`disabled ${action} fails closed without any auth or database I/O`,async()=>{
    const {api,seen,calls}=fixture({flags:{research:false,review:false}});
    const out=await api({action,authorization:auth,body:requestBody,params:{job_id:job,observation_id:observation,prospect_id:prospect}});
    assert.deepEqual(out,{status:503,body:{error:'feature_disabled'}});
    assert.deepEqual(seen,[]);assert.deepEqual(calls,[]);
  });
}

test('missing or malformed bearer is rejected without client access',async()=>{
  for(const authorization of [undefined,'','Basic a','Bearer ','bearer mock-manager-token']) {
    const {api,seen,calls}=fixture();const out=await api({action:'request',authorization,body:requestBody});
    assert.equal(out.status,401); assert.deepEqual(seen,[]);assert.deepEqual(calls,[]);
  }
});
test('invalid token or non-manager role never constructs a scoped client',async()=>{
  let f=fixture();let out=await f.api({action:'request',authorization:'Bearer invalid',body:requestBody});
  assert.equal(out.status,401);assert.deepEqual(f.seen,[['auth','invalid']]);assert.equal(f.calls.length,0);
  f=fixture({role:'employee'});out=await f.api({action:'request',authorization:auth,body:requestBody});
  assert.equal(out.status,403);assert.deepEqual(f.seen,[['auth','mock-manager-token']]);assert.equal(f.calls.length,0);
});
test('verified manager uses same user JWT for scoped data client; request projects only safe receipt',async()=>{
  const {api,seen,calls}=fixture();const out=await api({action:'request',authorization:auth,body:requestBody});
  assert.deepEqual(seen,[['auth','mock-manager-token'],['scoped','mock-manager-token']]);
  assert.equal(calls[0].name,'request_hl_intel_research');
  assert.deepEqual(out,{status:202,body:{job_id:job,status:'pending',reused:false}});
  assert.doesNotMatch(JSON.stringify(out),/SECRET|claim_token|idempotency_key/);
});
for(const bad of [null,{},[],{...requestBody,source_url:'https://example.com'},{...requestBody,expected_version:0},{...requestBody,prospect_id:'bad'},{...requestBody,idempotency_key:'bad'}]) {
  test(`request rejects invalid input ${JSON.stringify(bad)}`,async()=>{
    const {api,calls}=fixture();const out=await api({action:'request',authorization:auth,body:bad});
    assert.equal(out.status,400);assert.equal(calls.length,0);
  });
}

test('cancel and review use manager RPC and project safe response',async()=>{
  const {api,calls}=fixture();
  const canceled=await api({action:'cancel',authorization:auth,params:{job_id:job}});
  assert.deepEqual(canceled,{status:200,body:{job_id:job,status:'canceled',canceled:true}});
  const reviewed=await api({action:'review',authorization:auth,params:{observation_id:observation},body:{expected_version:1,decision:'approved',note:'ok'}});
  assert.equal(reviewed.status,200);assert.equal(reviewed.body.observation.decision,'approved');
  assert.doesNotMatch(JSON.stringify(reviewed),/SECRET|claim_token|private_note/);
  assert.deepEqual(calls.map(c=>c.name),['cancel_hl_intel_research','review_hl_intel_observation']);
});

test('observation list is bounded and does not leak hidden fields',async()=>{
  const {api,calls}=fixture();const out=await api({action:'observations',authorization:auth,params:{prospect_id:prospect,limit:10}});
  assert.equal(out.status,200);assert.equal(out.body.observations.length,1);
  assert.deepEqual(calls[0].options,{prospectId:prospect,limit:10});
  assert.doesNotMatch(JSON.stringify(out),/SECRET|claim_token|private_note/);
  const invalid=await api({action:'observations',authorization:auth,params:{prospect_id:prospect,limit:51}});
  assert.equal(invalid.status,400);assert.equal(calls.length,1);
});

test('job list projects safe columns and does not expose worker claims',async()=>{
  const {api}=fixture();const out=await api({action:'jobs',authorization:auth,params:{limit:10}});
  assert.equal(out.status,200);assert.equal(out.body.jobs.length,1);
  assert.doesNotMatch(JSON.stringify(out),/SECRET|claim_token|idempotency_key|claimed_by|lease_until/);
});

test('mock RLS enforces owner-only cancel; this does not test real Supabase RLS',async()=>{
  const makeClient=owner=>({async rpc(name){assert.equal(name,'cancel_hl_intel_research');return owner===userA?{data:[{job_id:job,job_status:'canceled',canceled:true}]}:{error:{message:'job_not_found'}};}});
  for(const [identity,expected] of [[userA,200],[userB,404]]) {
    const {api}=fixture({identity,clientOverride:makeClient(identity)});
    const out=await api({action:'cancel',authorization:auth,params:{job_id:job}});assert.equal(out.status,expected);
  }
});

test('retry submits same idempotency key, receiving one mock job',async()=>{
  const seenKeys=[];const jobs=new Map();
  const {api}=fixture({clientOverride:{async rpc(name,args){seenKeys.push(args.p_idempotency_key);const reused=jobs.has(args.p_idempotency_key);jobs.set(args.p_idempotency_key,job);return{data:[{job_id:job,job_status:'pending',reused}]};}}});
  const one=await api({action:'request',authorization:auth,body:requestBody});
  const two=await api({action:'request',authorization:auth,body:requestBody});
  assert.deepEqual(seenKeys,[key,key]);assert.equal(jobs.size,1);assert.equal(one.body.reused,false);assert.equal(two.body.reused,true);
});

test('database failures are bounded and do not expose raw error details',async()=>{
  const {api}=fixture({clientOverride:{async rpc(){throw Error('internal database message SECRET')}}});
  const out=await api({action:'request',authorization:auth,body:requestBody});
  assert.equal(out.status,503);assert.doesNotMatch(JSON.stringify(out),/SECRET|database message/);
});

test('observation adapter results fail closed on excess or wrong prospect',async()=>{
  for(const rows of [
    [{id:observation,prospect_id:prospect},{id:observation,prospect_id:prospect}],
    [{id:observation,prospect_id:'dddddddd-dddd-4ddd-8ddd-dddddddddddd'}],
  ]) {
    const {api}=fixture({clientOverride:{async rpc(){},async listObservations(){return rows}}});
    const out=await api({action:'observations',authorization:auth,params:{prospect_id:prospect,limit:1}});
    assert.equal(out.status,503);assert.equal(out.body.error,'service_unavailable');
  }
});

test('bad review and cancel parameters never reach RPC',async()=>{
  const {api,calls}=fixture();
  const a=await api({action:'review',authorization:auth,params:{observation_id:observation},body:{expected_version:1,decision:'pending'}});
  const b=await api({action:'cancel',authorization:auth,params:{job_id:'not-uuid'}});
  assert.equal(a.status,400);assert.equal(b.status,400);assert.equal(calls.length,0);
});

test('failed authentication and scoped-client errors never expose internals',async()=>{
  const api=createManagerApi({flags:{research:true,review:true},authenticate:async()=>{throw Error('SECRET auth')},createScopedClient:async()=>{throw Error('SECRET client')}});
  const out=await api({action:'jobs',authorization:auth,params:{limit:1}});
  assert.equal(out.status,401);assert.doesNotMatch(JSON.stringify(out),/SECRET/);
  const api2=createManagerApi({flags:{research:true,review:true},authenticate:async()=>({role:'manager',user:{id:userA}}),createScopedClient:async()=>{throw Error('SECRET client')}});
  const out2=await api2({action:'jobs',authorization:auth,params:{limit:1}});
  assert.equal(out2.status,503);assert.doesNotMatch(JSON.stringify(out2),/SECRET/);
});
