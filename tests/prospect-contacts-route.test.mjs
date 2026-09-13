import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=(await readFile(new URL('../app/api/staff/discovery/contacts/route.js',import.meta.url),'utf8'))
 .replace('import { authenticateManagerRequest } from "@/lib/staff-api-auth";','const authenticateManagerRequest=async()=>globalThis.__contactStaff;')
 .replace('import { collectPublicContacts } from "@/lib/prospect-contact-fetch";','const collectPublicContacts=(url)=>globalThis.__contactCollect(url);');
const route=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const id='00000000-0000-0000-0000-000000000001';
const req=(body={prospect_id:id,source_url:'http://127.0.0.1'})=>new Request('https://app.test/api/staff/discovery/contacts',{method:'POST',body:JSON.stringify(body)});
test('manager-only collector uses reserved stored source and merges successful results only',async()=>{
 let calls=[],error=null,fail=false,records=[{kind:'email',value:'hi@cafe.vn',sources:['https://cafe.vn']}];
 globalThis.__contactStaff=null;assert.equal((await route.POST(req())).status,403);
 globalThis.__contactStaff={user:{id},admin:{rpc:async(name,args)=>{calls.push({name,args});return name==='reserve_discovery_contacts'?{data:error?null:'https://cafe.vn',error}:{error:null}}}};
 globalThis.__contactCollect=async url=>{assert.equal(url,'https://cafe.vn');if(fail)throw new Error('timeout');return {contacts:records,pages:[url],errors:[]}};
 try {
  assert.equal((await route.POST(req({prospect_id:'bad'}))).status,400);assert.equal(calls.length,0);
  error={message:'collection_cooldown'};assert.equal((await route.POST(req())).status,429);assert.equal(calls.length,1);
  error=null;calls=[];assert.equal((await route.POST(req())).status,200);assert.deepEqual(calls.map(c=>c.name),['reserve_discovery_contacts','store_discovery_contacts']);assert.deepEqual(calls[1].args.p_contacts,records);
  fail=true;calls=[];assert.equal((await route.POST(req())).status,502);assert.equal(calls.length,1);
  fail=false;records=[];calls=[];assert.equal((await route.POST(req())).status,200);assert.equal(calls.length,1);
 }finally{delete globalThis.__contactStaff;delete globalThis.__contactCollect;}
});
