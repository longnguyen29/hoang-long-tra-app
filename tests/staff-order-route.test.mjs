import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {pathToFileURL} from 'node:url';
import path from 'node:path';

// Load the real route and domain helpers. Only the authenticated backend is replaced.
const authUrl='data:text/javascript,'+encodeURIComponent('let staff=null;export function setStaff(value){staff=value}export async function authenticateManagerRequest(){return staff}');
registerHooks({resolve(specifier,context,next){
 if(specifier==='@/lib/staff-api-auth')return {url:authUrl,shortCircuit:true};
 if(specifier.startsWith('@/'))return next(pathToFileURL(path.resolve(specifier.slice(2)+'.js')).href,context);
 return next(specifier,context);
}});
const {setStaff}=await import(authUrl);
const {PATCH}=await import('../app/api/staff/orders/[id]/route.js');
function fixture({invoice=null,invoiceError=null,updateError=null,rpcError=null,rpcData=null}={}){
 const original={id:'TEST-1',type:'retail',customer_name:'Test café',contact:'test@example.test',address:'Test address',stage:'new_order',status:'pending',lines:[{productId:'tea',qty:2,unit:'pcs',price:100000},{productId:'tea-2',qty:3,unit:'kg',price:200000}],estimated_total:800000};
 const writes=[],events=[],rpcCalls=[];
 const admin={rpc:async(name,args)=>{rpcCalls.push({name,args});return {data:rpcData,error:rpcError}},from(table){let patch;const chain={select(){return chain},eq(){return chain},neq(){return chain},order(){return chain},limit(){return chain},update(value){patch=value;writes.push(value);return chain},insert(value){events.push(value);return Promise.resolve({error:null})},maybeSingle:async()=>table==='receivables'?{data:invoice,error:invoiceError}:{data:patch?{...original,...patch}:rpcCalls.length&&!rpcError&&table==='orders'?{...original,type:'wholesale',stage:rpcCalls.at(-1)?.name==='force_ship_order'?'shipping':'production',status:rpcCalls.at(-1)?.name==='force_ship_order'?'shipped':'confirmed'}:original,error:patch?updateError:null},then(resolve){return Promise.resolve({data:events,error:null}).then(resolve)}};return chain}};
 setStaff({admin,user:{id:'STAFF-1',email:'manager@example.test'},role:'manager'});
 return {original,writes,events,rpcCalls};
}
const send=body=>PATCH(new Request('http://localhost/api/staff/orders/TEST-1',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),{params:Promise.resolve({id:'TEST-1'})});
test('unauthorized request cannot update order',async()=>{setStaff(null);assert.equal((await send({type:'wholesale'})).status,401)});
test('type change preserves lines, units, amount and customer details',async()=>{const f=fixture();const response=await send({type:'wholesale'});assert.equal(response.status,200);const {order}=await response.json();assert.equal(order.type,'wholesale');for(const key of ['lines','estimated_total','contact','address'])assert.deepEqual(order[key],f.original[key]);assert.deepEqual(f.writes,[{type:'wholesale'}]);assert.equal(f.events[0].kind,'type_change')});
test('rejects unsupported order type without a write',async()=>{const f=fixture();assert.equal((await send({type:'bulk'})).status,400);assert.equal(f.writes.length,0)});
test('line prices recalculate total using existing quantities',async()=>{const f=fixture();const response=await send({linePrices:[{index:0,price:150000},{index:1,price:250000}]});assert.equal(response.status,200);const {order}=await response.json();assert.equal(order.estimated_total,1050000);assert.equal(order.lines[0].unit,'pcs');assert.equal(order.lines[1].qty,3);assert.equal(f.events[0].kind,'price_change')});
test('an unquoted line keeps total unknown',async()=>{fixture();const response=await send({linePrices:[{index:0,price:null},{index:1,price:250000}]});assert.equal((await response.json()).order.estimated_total,null)});
test('duplicate indices cannot overwrite another line or change type',async()=>{const f=fixture();assert.equal((await send({type:'wholesale',linePrices:[{index:0,price:100},{index:0,price:200}]})).status,400);assert.equal(f.writes.length,0)});
test('existing receivable blocks price edit and combined type update',async()=>{const f=fixture({invoice:{id:'invoice',total:800000,paid:0,status:'open'}});const response=await send({type:'wholesale',linePrices:[{index:0,price:100},{index:1,price:200}]});assert.equal(response.status,409);assert.equal(f.writes.length,0)});
test('failed invoice read fails closed',async()=>{const f=fixture({invoiceError:{message:'offline'}});assert.equal((await send({linePrices:[]})).status,500);assert.equal(f.writes.length,0)});
test('failed update does not produce a success event',async()=>{const f=fixture({updateError:{message:'offline'}});assert.equal((await send({type:'wholesale'})).status,500);assert.equal(f.events.length,0)});
test('procedure preflight rejection explains the block and links its run',async()=>{const f=fixture({updateError:{message:'procedure_stop_or_preflight_incomplete'}});const response=await send({stage:'shipping'});assert.equal(response.status,409);assert.deepEqual(await response.json(),{ok:false,error:'procedure_preflight_incomplete',procedureRunId:'TEST-1'});assert.equal(f.events.length,0)});
test('force shipping requires a reason and cannot mix other order edits',async()=>{const f=fixture();assert.equal((await send({forceShipReason:'too short'})).status,400);assert.equal((await send({forceShipReason:'Verified exception',stage:'completed'})).status,400);assert.equal(f.rpcCalls.length,0)});
test('force shipping delegates atomic waiver and order transition to manager-only RPC',async()=>{const f=fixture();const response=await send({forceShipReason:'  Manager checked handover  '});assert.equal(response.status,200);assert.equal((await response.json()).order.stage,'shipping');assert.deepEqual(f.rpcCalls,[{name:'force_ship_order',args:{p_order_id:'TEST-1',p_reason:'Manager checked handover',p_actor:'STAFF-1'}}]);assert.equal(f.writes.length,0)});
test('force shipping surfaces a database refusal without order edits',async()=>{const f=fixture({rpcError:{message:'order_not_ready_for_force_shipping'}});const response=await send({forceShipReason:'Manager checked handover'});assert.equal(response.status,409);assert.equal((await response.json()).error,'order_not_ready_for_force_shipping');assert.equal(f.writes.length,0)});
test('force off requires a reason and cannot mix order edits',async()=>{const f=fixture();assert.equal((await send({forceOffReason:'short'})).status,400);assert.equal((await send({forceOffReason:'Manager approved exception',stage:'shipping'})).status,400);assert.equal(f.rpcCalls.length,0)});
test('force off waives the whole Run but keeps an unfinished order at its current stage',async()=>{const f=fixture();const response=await send({forceOffReason:'  Manager approved exception  '});assert.equal(response.status,200);assert.equal((await response.json()).order.stage,'production');assert.deepEqual(f.rpcCalls,[{name:'force_off_procedure_order',args:{p_order_id:'TEST-1',p_reason:'Manager approved exception',p_actor:'STAFF-1'}}]);assert.equal(f.writes.length,0)});
test('force off rejects a completed or non-wholesale order without edits',async()=>{const f=fixture({rpcError:{message:'order_not_ready_for_force_off'}});const response=await send({forceOffReason:'Manager approved exception'});assert.equal(response.status,409);assert.equal((await response.json()).error,'order_not_ready_for_force_off');assert.equal(f.writes.length,0)});

test('line removal delegates snapshot, actor and reason atomically without stage or message edits',async()=>{
 const order={id:'TEST-1',stage:'shipping',status:'shipped',lines:[{productId:'tea-2',qty:3,unit:'kg',price:200000}],estimated_total:600000};
 const receivable={id:'invoice',total:600000,paid:100000,status:'partial'};
 const f=fixture({rpcData:{order,receivable}});
 const response=await send({removeLine:{index:0,expectedLines:f.original.lines,reason:'  Nhập nhầm sản phẩm  '}});
 assert.equal(response.status,200);
 const result=await response.json();assert.deepEqual(result.order,order);assert.deepEqual(result.receivable,receivable);
 assert.deepEqual(f.rpcCalls,[{name:'remove_order_line',args:{p_order_id:'TEST-1',p_line_index:0,p_expected_lines:f.original.lines,p_reason:'Nhập nhầm sản phẩm',p_actor:'STAFF-1'}}]);
 assert.equal(f.writes.length,0);assert.equal(f.events.length,0);assert.equal(Object.hasOwn(result,'trackingSms'),false);
});
test('line removal cannot mix stage/price changes or supply an incomplete snapshot',async()=>{
 const f=fixture();const removeLine={index:0,expectedLines:f.original.lines,reason:'Nhập nhầm sản phẩm'};
 for(const body of [{removeLine,stage:'completed'},{removeLine,linePrices:[]},{removeLine:{...removeLine,index:-1}},{removeLine:{...removeLine,index:2}},{removeLine:{...removeLine,expectedLines:[null,{}]}},{removeLine:{...removeLine,extra:true}},{removeLine:null}]){
  assert.equal((await send(body)).status,400);
 }
 assert.equal(f.rpcCalls.length,0);assert.equal(f.writes.length,0);
});
test('line removal requires a meaningful reason',async()=>{
 const f=fixture();
 for(const reason of ['', '   ', 'abcd', 'x'.repeat(1001), null]){
  const response=await send({removeLine:{index:0,expectedLines:f.original.lines,reason}});
  assert.equal(response.status,400);assert.equal((await response.json()).error,'line_removal_reason_required');
 }
 assert.equal(f.rpcCalls.length,0);
});
test('line removal surfaces stale, last-line and paid-amount conflicts without changes',async()=>{
 for(const code of ['order_lines_changed','last_order_line','line_removal_payment_conflict']){
  const f=fixture({rpcError:{message:code}});
  const response=await send({removeLine:{index:0,expectedLines:f.original.lines,reason:'Nhập nhầm sản phẩm'}});
  assert.equal(response.status,409);assert.equal((await response.json()).error,code);assert.equal(f.writes.length,0);
 }
});
test('line removal restricts manager permissions and hides unknown backend details',async()=>{
 for(const [code,status,expected] of [['manager_required',403,'manager_required'],['order_not_found',404,'order_not_found'],['private database detail',500,'line_removal_failed']]){
  const f=fixture({rpcError:{message:code}});
  const response=await send({removeLine:{index:0,expectedLines:f.original.lines,reason:'Nhập nhầm sản phẩm'}});
  assert.equal(response.status,status);assert.equal((await response.json()).error,expected);assert.equal(f.writes.length,0);
 }
});

test('existing-order unit correction preserves financial and fulfilment fields and sends no message',async()=>{
 const order={id:'TEST-1',type:'wholesale',stage:'completed',status:'completed',
  lines:[{productId:'tea',qty:12,unit:'viên',price:50000,weight:'1 viên'}],
  total_kg:0,total_items:null,estimated_total:600000};
 const invoice={id:'invoice',total:600000,paid:600000,status:'paid'};
 const f=fixture({rpcData:{order},invoice});
 const expectedLines=[{...order.lines[0],unit:'kg'}];
 const response=await send({correctLineUnit:{index:0,expectedLines,unit:'viên',reason:'  Quy cách nhập nhầm kg  '}});
 assert.equal(response.status,200);const result=await response.json();
 assert.deepEqual(result.order,order);assert.deepEqual(result.receivable,invoice);
 assert.deepEqual(f.rpcCalls,[{name:'correct_order_line_unit',args:{p_order_id:'TEST-1',p_line_index:0,
  p_expected_lines:expectedLines,p_unit:'viên',p_reason:'Quy cách nhập nhầm kg',p_actor:'STAFF-1'}}]);
 assert.equal(f.writes.length,0);assert.equal(f.events.length,0);
 assert.equal(Object.hasOwn(result,'trackingSms'),false);assert.equal(Object.hasOwn(result,'smsHistory'),false);
});
test('unit correction cannot combine another edit or omit the complete line snapshot',async()=>{
 const f=fixture();const correctLineUnit={index:0,expectedLines:f.original.lines,unit:'viên',reason:'Sửa quy cách nhập nhầm'};
 for(const body of [{correctLineUnit,stage:'shipping'},{correctLineUnit,removeLine:{}},{correctLineUnit,linePrices:[]},
  {correctLineUnit:{...correctLineUnit,index:-1}},{correctLineUnit:{...correctLineUnit,index:2}},
  {correctLineUnit:{...correctLineUnit,expectedLines:[]}},{correctLineUnit:{...correctLineUnit,expectedLines:[null,{}]}},
  {correctLineUnit:{...correctLineUnit,extra:true}},{correctLineUnit:null}]){
  assert.equal((await send(body)).status,400);
 }
 assert.equal(f.rpcCalls.length,0);assert.equal(f.writes.length,0);
});
test('unit correction validates unit and reason before reaching the database',async()=>{
 const f=fixture();const correction={index:0,expectedLines:f.original.lines,unit:'viên',reason:'Sửa quy cách nhập nhầm'};
 for(const unit of ['',null,'ml','kg per box']){
  const response=await send({correctLineUnit:{...correction,unit}});
  assert.equal(response.status,400);assert.equal((await response.json()).error,'invalid_line_unit');
 }
 for(const reason of ['', '   ', 'abcd', 'x'.repeat(1001), null]){
  const response=await send({correctLineUnit:{...correction,reason}});
  assert.equal(response.status,400);assert.equal((await response.json()).error,'line_unit_reason_required');
 }
 assert.equal(f.rpcCalls.length,0);assert.equal(f.writes.length,0);
});
test('unit correction maps stale snapshots, invalid quantities and manager refusals safely',async()=>{
 for(const [code,status,expected] of [
  ['order_lines_changed',409,'order_lines_changed'],['line_unit_unchanged',409,'line_unit_unchanged'],
  ['invalid_line_quantity',400,'invalid_line_quantity'],['invalid_line_unit',400,'invalid_line_unit'],
  ['invalid_line_index',400,'invalid_line_index'],['invalid_order_lines',400,'invalid_order_lines'],
  ['manager_required',403,'manager_required'],['order_not_found',404,'order_not_found'],
  ['private database detail',500,'line_unit_correction_failed']]){
  const f=fixture({rpcError:{message:code}});
  const response=await send({correctLineUnit:{index:0,expectedLines:f.original.lines,unit:'viên',reason:'Sửa quy cách nhập nhầm'}});
  assert.equal(response.status,status);assert.equal((await response.json()).error,expected);
  assert.equal(f.writes.length,0);assert.equal(f.events.length,0);
 }
});
test('unit correction requires authenticated manager and a committed order result',async()=>{
 setStaff(null);
 assert.equal((await send({correctLineUnit:{index:0,expectedLines:[{qty:1,unit:'kg'}],unit:'viên',reason:'Sửa quy cách nhập nhầm'}})).status,401);
 const f=fixture();
 const response=await send({correctLineUnit:{index:0,expectedLines:f.original.lines,unit:'viên',reason:'Sửa quy cách nhập nhầm'}});
 assert.equal(response.status,500);assert.equal((await response.json()).error,'line_unit_correction_reload_failed');
});
