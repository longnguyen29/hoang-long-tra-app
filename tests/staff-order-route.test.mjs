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
function fixture({invoice=null,invoiceError=null,updateError=null}={}){
 const original={id:'TEST-1',type:'retail',customer_name:'Test café',contact:'test@example.test',address:'Test address',stage:'new_order',status:'pending',lines:[{productId:'tea',qty:2,unit:'pcs',price:100000},{productId:'tea-2',qty:3,unit:'kg',price:200000}],estimated_total:800000};
 const writes=[],events=[];
 const admin={from(table){let patch;const chain={select(){return chain},eq(){return chain},neq(){return chain},order(){return chain},update(value){patch=value;writes.push(value);return chain},insert(value){events.push(value);return Promise.resolve({error:null})},maybeSingle:async()=>table==='receivables'?{data:invoice,error:invoiceError}:{data:patch?{...original,...patch}:original,error:patch?updateError:null},then(resolve){return Promise.resolve({data:events,error:null}).then(resolve)}};return chain}};
 setStaff({admin,user:{email:'manager@example.test'},role:'manager'});
 return {original,writes,events};
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
