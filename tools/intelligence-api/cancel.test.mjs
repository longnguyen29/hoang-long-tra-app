import test from 'node:test';
import assert from 'node:assert/strict';
import {cancelResearch} from './core.mjs';
const id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const base=()=>({role:'manager',userId:'11111111-1111-4111-8111-111111111111',flags:{research:true},scopedRPC:async(name,args)=>{
 assert.equal(name,'cancel_hl_intel_research');assert.deepEqual(args,{p_job_id:id});
 return {data:{job_id:id,job_status:'canceled',canceled:true,idempotency_key:'private',claim_token:'SECRET'}};
}});
test('cancellation returns strictly projected data',async()=>{
 const out=await cancelResearch(base(),id);
 assert.deepEqual(out,{status:200,body:{job_id:id,status:'canceled',canceled:true}});
 assert.equal(JSON.stringify(out).includes('SECRET'),false);
});
test('idempotent second cancellation reports canceled=false',async()=>{
 const ctx=base();ctx.scopedRPC=async()=>({data:[{job_id:id,job_status:'canceled',canceled:false}]});
 assert.deepEqual((await cancelResearch(ctx,id)).body,{job_id:id,status:'canceled',canceled:false});
});
test('bad identifiers and role rejected',async()=>{
 await assert.rejects(()=>cancelResearch(base(),'xxx'),e=>e.status===400);
 await assert.rejects(()=>cancelResearch({...base(),role:'employee'},id),e=>e.status===403);
});
test('claimed jobs remain un-cancelable',async()=>{
 const ctx=base();ctx.scopedRPC=async()=>({error:{message:'job_already_claimed'}});
 await assert.rejects(()=>cancelResearch(ctx,id),e=>e.status===409&&e.code==='job_not_cancelable');
});
test('other owners are not revealed',async()=>{
 const ctx=base();ctx.scopedRPC=async()=>({error:{message:'job_not_found'}});
 await assert.rejects(()=>cancelResearch(ctx,id),e=>e.status===404&&e.code==='job_not_found');
});
test('disabled action remains disabled even for managers',async()=>{
 await assert.rejects(()=>cancelResearch({...base(),flags:{research:false}},id),e=>e.status===503&&e.code==='feature_disabled');
});
test('server cannot return a claimed record as canceled',async()=>{
 const ctx=base();ctx.scopedRPC=async()=>({data:{job_id:id,job_status:'claimed',canceled:false}});
 await assert.rejects(()=>cancelResearch(ctx,id),e=>e.status===503);
});
