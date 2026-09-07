import test from 'node:test';
import assert from 'node:assert/strict';
import {deleteMistakenOrder} from './delete-mistaken-order.js';
function fixture({stage='new_order',linked,readFailure,archiveFailure,missing=false}={}){
 const calls=[];
 const admin={from(table){const q={select(){return q},eq(){return q},maybeSingle:async()=>({data:missing?null:{id:'O-1',stage,status:'pending',customer_name:'Test'},error:readFailure&&table==='orders'?{}:null}),limit:async()=>({data:table===linked?[{id:'linked'}]:[],error:table===readFailure?{}:null})};return q}};
 return {calls,args:{admin,id:'O-1',confirmation:'O-1',actor:'staff',archive:async args=>{calls.push(args);return {data:123,error:archiveFailure?{}:null}}}};
}
test('requires exact order confirmation before reading or deleting',async()=>{const f=fixture();assert.equal((await deleteMistakenOrder({...f.args,confirmation:'other'})).status,400);assert.equal(f.calls.length,0)});
test('archives mistaken order using existing recycle bin',async()=>{const f=fixture();assert.equal((await deleteMistakenOrder(f.args)).ok,true);assert.deepEqual(f.calls[0],{p_table:'orders',p_id:'O-1',p_label:'Test · O-1',p_by:'staff'})});
for(const linked of ['receivables','order_costs','order_batch_allocations','inventory_reservations','trade_quotes','referral_rewards'])test(`blocks deletion with ${linked}`,async()=>{const f=fixture({linked});assert.equal((await deleteMistakenOrder(f.args)).error,'linked_records');assert.equal(f.calls.length,0)});
test('blocks production/shipped orders',async()=>{for(const stage of ['production','shipping','completed']){const f=fixture({stage});assert.equal((await deleteMistakenOrder(f.args)).status,409);assert.equal(f.calls.length,0)}});
test('fails closed if dependency lookup fails',async()=>{const f=fixture({readFailure:'receivables'});assert.equal((await deleteMistakenOrder(f.args)).error,'read_failed');assert.equal(f.calls.length,0)});
test('never claims success if archiving fails',async()=>{const f=fixture({archiveFailure:true});assert.equal((await deleteMistakenOrder(f.args)).error,'archive_failed')});
test('missing order is not treated as successful deletion',async()=>{const f=fixture({missing:true});assert.equal((await deleteMistakenOrder(f.args)).status,404);assert.equal(f.calls.length,0)});
