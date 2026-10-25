import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
const adminUrl='data:text/javascript,'+encodeURIComponent('let client;export function setClient(value){client=value}export function createAdminClient(){return client}');
registerHooks({resolve(specifier,context,next){if(specifier==='@/lib/supabase/admin')return{url:adminUrl,shortCircuit:true};if(specifier.startsWith('@/'))return next(pathToFileURL(path.resolve(specifier.slice(2)+'.js')).href,context);return next(specifier,context);}});
const {setClient}=await import(adminUrl);
const {POST}=await import('../app/api/domestic-wholesale-enquiries/route.js');
const raw={requestId:'12345678-1234-4123-8123-123456789abc',teaIds:['hong-tra-shan-mat'],intent:'quote',businessType:'distributor',name:'Test',business:'Test business',phone:'0901234567',quantityKg:'1000',packingKg:'35',destination:'Hà Nội',note:'Test only',consent:true,website:'',attribution:{source:'chatgpt',medium:'cpc',campaign:'shan-b2b',content:'mat',term:''}};
const send=(body,origin='https://www.hoanglongtra.com')=>POST(new Request('https://www.hoanglongtra.com/api/domestic-wholesale-enquiries',{method:'POST',headers:{origin,'content-type':'application/json','x-vercel-forwarded-for':'192.0.2.10'},body:JSON.stringify(body)}));
test('landing wrapper uses shared server-only transaction and returns only idempotent receipts',async()=>{
 process.env.NODE_ENV='production';process.env.SUPABASE_SERVICE_ROLE_KEY='test-only';process.env.NEXT_PUBLIC_SUPABASE_URL='https://database.example.test';
 const calls=[];setClient({async rpc(name,args){calls.push({name,args});return{data:{request_id:args.p_request_id,is_new:calls.length===1,opportunity_id:'private'},error:null};}});
 const first=await send(raw),retry=await send(raw);assert.equal(first.status,201);assert.equal(retry.status,200);
 assert.deepEqual(await first.json(),{ok:true,reference:'HL-E-12345678',requestId:raw.requestId});assert.deepEqual(await retry.json(),{ok:true,reference:'HL-E-12345678',requestId:raw.requestId});
 assert.equal(calls[0].name,'submit_event_enquiry');assert.equal(calls[0].args.p_contact,raw.phone);assert.ok(calls[0].args.p_note.includes('campaign=shan-b2b'));assert.equal(calls[0].args.p_campaign,'event_contact_v1');assert.equal(first.headers.get('cache-control'),'no-store');
});
test('invalid landing requests and untrusted origins never create a CRM enquiry',async()=>{
 const calls=[];setClient({async rpc(...args){calls.push(args);return{};}});
 assert.equal((await send(raw,'https://attacker.test')).status,403);
 for(const patch of [{consent:false},{teaIds:['black-op1']},{phone:'bad'},{requestId:'bad'},{packingKg:'100'},{quantityKg:'-2'},{website:'bot'}])assert.equal((await send({...raw,...patch})).status,400);
 assert.equal(calls.length,0);
});
