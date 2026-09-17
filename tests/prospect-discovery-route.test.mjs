import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const source = (await readFile(new URL('../app/api/staff/discovery/route.js',import.meta.url),'utf8'))
 .replace('import { authenticateManagerRequest } from "@/lib/staff-api-auth";', 'const authenticateManagerRequest = async () => globalThis.__discoveryStaff;')
 .replace('"@/lib/prospect-types"',JSON.stringify(new URL('../lib/prospect-types.js',import.meta.url).href))
 .replace('"@/lib/prospect-discovery"',JSON.stringify(new URL('../lib/prospect-discovery.js',import.meta.url).href));
const route = await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const request = () => new Request('https://example.test/api/staff/discovery',{method:'POST',body:JSON.stringify({region:'',segment:'all'})});
test('provider calls fail closed on auth, configuration and budget; errors do not autosave prospects',async () => {
 const originalFetch=globalThis.fetch;
 const savedEnv={...process.env}; let calls=0, reservationError=null, updates=[];
 globalThis.fetch=async()=>{calls++;return Response.json({web:{results:[{title:'Cafe',url:'https://cafe.vn',description:'trà sữa'}]}})};
 try {
  globalThis.__discoveryStaff=null;
  assert.equal((await route.POST(request())).status,403);
  globalThis.__discoveryStaff={user:{id:'manager'},admin:{rpc:async()=>({data:reservationError?null:'run',error:reservationError}),from:(table)=>{
   assert.equal(table,'discovery_search_runs');return {update:(value)=>({eq:async()=>{updates.push(value);return {error:null}}})};
  }}};
  delete process.env.DISCOVERY_SEARCH_ENABLED; delete process.env.BRAVE_SEARCH_API_KEY;
  assert.equal((await route.POST(request())).status,503);assert.equal(calls,0);
  process.env.DISCOVERY_SEARCH_ENABLED='true';process.env.BRAVE_SEARCH_API_KEY='test-only';
  reservationError={message:'daily_limit'};
  assert.equal((await route.POST(request())).status,429);assert.equal(calls,0);
  reservationError={message:'table unavailable'};
  assert.equal((await route.POST(request())).status,503);assert.equal(calls,0);
  reservationError=null;
  const result=await route.POST(request()); assert.equal(result.status,200);
  const body=await result.json(); assert.equal(body.candidates[0].evidence_kind,'search_snippet'); assert.equal(calls,1);
  globalThis.fetch=async()=>{calls++; throw new Error('timeout')};
  assert.equal((await route.POST(request())).status,502);assert.equal(updates.at(-1).status,'failed');
 } finally {globalThis.fetch=originalFetch;delete globalThis.__discoveryStaff;
  for (const key of ['DISCOVERY_SEARCH_ENABLED','BRAVE_SEARCH_API_KEY']) {if(savedEnv[key]===undefined)delete process.env[key];else process.env[key]=savedEnv[key];}
 }
});

test('invalid metadata and unsupported searches never reserve budget or call the provider',async()=>{
 const saved={...process.env}, fetchBefore=globalThis.fetch;let reserved=0,called=0;
 try {
  process.env.DISCOVERY_SEARCH_ENABLED='true';process.env.BRAVE_SEARCH_API_KEY='test-only';
  globalThis.__discoveryStaff={user:{id:'manager'},admin:{rpc:async()=>{reserved++;return {data:'run'};}}};
  globalThis.fetch=async()=>{called++;throw new Error('must not fetch');};
  for(const body of [null,[],{account_type:'watchlist'},{account_type:null},{account_type:'importer'},{country_code:'US'},{country_code:'1'},{vertical_tags:['coffee']},{vertical_tags:['unknown']},{vertical_tags:[1]},{vertical_tags:null},{vertical_tags:Array(31).fill('coffee')},{is_watchlisted:true},{is_watchlisted:'false'},{segment:null},{segment:'hotel'}]) {
   const response=await route.POST(new Request('https://example.test',{method:'POST',body:JSON.stringify(body)}));
   assert.equal(response.status,400,JSON.stringify(body));
  }
  assert.equal(reserved,0);assert.equal(called,0);
 }finally{globalThis.fetch=fetchBefore;delete globalThis.__discoveryStaff;for(const key of ['DISCOVERY_SEARCH_ENABLED','BRAVE_SEARCH_API_KEY']){if(saved[key]===undefined)delete process.env[key];else process.env[key]=saved[key];}}
});
