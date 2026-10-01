import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {pathToFileURL} from 'node:url';
import path from 'node:path';

const serverUrl='data:text/javascript,'+encodeURIComponent(`
let fixture;
export function setFixture(value){fixture=value}
export async function procedureStaff(){return fixture.staff}
export async function readProcedure(){return fixture.data}
export function mayRead(){return true}
export function mayWork(){return true}
export function manager(staff){return ['admin','manager'].includes(staff.role)}
export function fail(error,status=400){return Response.json({ok:false,error},{status})}
export async function recordEvent(...args){fixture.events.push(args)}
export function short(value,max=2000){return String(value??'').trim().slice(0,max)}
export function finiteBudget(){return null}
`);
const templatesUrl='data:text/javascript,'+encodeURIComponent('export function isFinished(){return false} export function preDispatchProblems(){return {stop:[],critical:[]}}');
registerHooks({resolve(specifier,context,next){
  if(specifier==='@/lib/procedure-server') return {url:serverUrl,shortCircuit:true};
  if(specifier==='@/lib/procedure-templates') return {url:templatesUrl,shortCircuit:true};
  if(specifier.startsWith('@/')) return next(pathToFileURL(path.resolve(specifier.slice(2)+'.js')).href,context);
  return next(specifier,context);
}});
const {setFixture}=await import(serverUrl);
const {PATCH}=await import('../app/api/staff/procedures/[id]/route.js');

function fixture({role='manager',status='active',stop=false}={}) {
  const writes=[],events=[];
  const admin={from(table){
    assert.equal(table,'procedure_runs');
    const chain={update(value){writes.push(value);return chain},eq(){return chain},select(){return chain},maybeSingle:async()=>({data:{id:'RUN-1'},error:null})};
    return chain;
  }};
  const value={staff:{admin,user:{id:'STAFF-1'},role},data:{run:{id:'RUN-1',order_id:'ORDER-1',status},blockers:stop?[{stop_work:true,status:'open'}]:[]},events};
  setFixture(value);
  return {writes,events};
}
const send=body=>PATCH(new Request('http://localhost/api/staff/procedures/RUN-1',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),{params:Promise.resolve({id:'RUN-1'})});

test('manager waives only one run with a reason and audit event',async()=>{
  const f=fixture();
  assert.equal((await send({action:'waive',reason:'Đơn nhỏ gửi bưu điện, không cần quy trình kho B2B.'})).status,200);
  assert.equal(f.writes[0].status,'waived');
  assert.equal(f.writes[0].waived_by,'STAFF-1');
  assert.equal(f.events[0][3],'waived');
});
test('worker, empty reason and open STOP cannot waive',async()=>{
  let f=fixture({role:'employee'});
  assert.equal((await send({action:'waive',reason:'Đơn nhỏ gửi bưu điện.'})).status,403);
  assert.equal(f.writes.length,0);
  f=fixture();
  assert.equal((await send({action:'waive',reason:'ngắn'})).status,400);
  f=fixture({stop:true});
  assert.equal((await send({action:'waive',reason:'Đơn nhỏ gửi bưu điện.'})).status,409);
  assert.equal(f.writes.length,0);
});
test('manager can resume a waived run without erasing prior history',async()=>{
  const f=fixture({status:'waived'});
  assert.equal((await send({action:'resume'})).status,200);
  assert.deepEqual(Object.keys(f.writes[0]).sort(),['status','updated_at']);
  assert.equal(f.writes[0].status,'active');
  assert.equal(f.events[0][3],'resumed');
});
