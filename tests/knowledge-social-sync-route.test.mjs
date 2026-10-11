import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const authUrl = 'data:text/javascript,' + encodeURIComponent('let staff=null;export function setStaff(value){staff=value}export async function authenticateManagerRequest(){return staff}');
registerHooks({ resolve(specifier, context, next) {
  if (specifier === '@/lib/staff-api-auth') return { url: authUrl, shortCircuit: true };
  if (specifier.startsWith('@/')) return next(pathToFileURL(path.resolve(specifier.slice(2) + '.js')).href, context);
  return next(specifier, context);
} });
const { setStaff } = await import(authUrl);
const { GET, POST } = await import('../app/api/staff/knowledge/social-sync/route.js');
const previousKey = process.env.BUFFER_API_KEY, previousOrg = process.env.BUFFER_ORGANIZATION_ID, realFetch = globalThis.fetch;
test.after(() => {
  if (previousKey === undefined) delete process.env.BUFFER_API_KEY; else process.env.BUFFER_API_KEY = previousKey;
  if (previousOrg === undefined) delete process.env.BUFFER_ORGANIZATION_ID; else process.env.BUFFER_ORGANIZATION_ID = previousOrg;
  globalThis.fetch = realFetch;
});
function fixture({ latest = null, readError = null, rpcError = null, configured = true } = {}) {
  if (configured) { process.env.BUFFER_API_KEY = 'TEST_PRIVATE_KEY'; process.env.BUFFER_ORGANIZATION_ID = 'org1'; }
  else { delete process.env.BUFFER_API_KEY; delete process.env.BUFFER_ORGANIZATION_ID; }
  const rpcCalls = [], network = [];
  const admin = {
    from(table) { assert.equal(table, 'knowledge_social_posts'); const chain = { select(){return chain},eq(){return chain},order(){return chain},limit(){return chain},maybeSingle:async()=>({data:latest,error:readError}) }; return chain; },
    async rpc(name,args){rpcCalls.push({name,args});return {data:{imported:1,updated:0,unchanged:0},error:rpcError}},
  };
  setStaff({admin,user:{id:'manager1'},role:'manager'});
  globalThis.fetch = async (url, init) => {
    network.push({url,init});
    const query = JSON.parse(init.body).query;
    return Response.json({ data: query.includes('KnowledgeChannels') ? {channels:[{id:'account1',service:'threads',organizationId:'org1',name:'Tea brand'}]}
      : {posts:{edges:[{node:{id:'post1',channelId:'account1',channelService:'threads',status:'sent',text:'Tea',sentAt:'2026-01-01T00:00:00Z',metricsUpdatedAt:null,metrics:[],assets:[],externalLink:'https://www.threads.com/@tea/post/1'}}],pageInfo:{hasNextPage:true}}} });
  };
  return {rpcCalls,network};
}
const request = body => new Request('http://localhost/api/staff/knowledge/social-sync',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
test('manager authentication protects both configuration and sync', async () => {
  const f=fixture();setStaff(null);assert.equal((await GET(request({}))).status,401);assert.equal((await POST(request({}))).status,401);assert.equal(f.network.length,0);
});
test('configuration response reveals only availability, never server credentials', async () => {
  fixture();const response=await GET(request({}));assert.deepEqual(await response.json(),{configured:true});assert.equal(response.headers.get('cache-control'),'no-store');
  fixture({configured:false});assert.deepEqual(await (await GET(request({}))).json(),{configured:false});
});
test('client cannot supply imported rows, credentials, organization or publish actions', async () => {
  const f=fixture();for(const body of [{posts:[]},{apiKey:'clientkey'},{organizationId:'other'},{action:'publish'},null,[]]) assert.equal((await POST(request(body))).status,400);
  assert.equal(f.network.length,0);assert.equal(f.rpcCalls.length,0);
});
test('missing credentials and failed cooldown reads fail closed before provider calls', async () => {
  let f=fixture({configured:false});assert.equal((await POST(request({}))).status,503);assert.equal(f.network.length,0);
  f=fixture({readError:{message:'private details'}});assert.deepEqual(await (await POST(request({}))).json(),{ok:false,error:'social_sync_read_failed'});assert.equal(f.network.length,0);
});
test('recent sync cooldown prevents another provider read', async () => {
  const f=fixture({latest:{fetched_at:new Date().toISOString()}});const response=await POST(request({action:'sync'}));
  assert.equal(response.status,429);const result=await response.json();assert.equal(result.error,'social_sync_cooldown');assert.ok(result.retryAfterSeconds>0&&result.retryAfterSeconds<=60);assert.equal(f.network.length,0);
});
test('authorized sync imports only trusted server source and reports bounded scope', async () => {
  const f=fixture();const response=await POST(request({action:'sync'}));assert.equal(response.status,200);
  const result=await response.json();assert.equal(result.imported,1);assert.equal(result.limit,20);assert.equal(result.hasMore,true);
  assert.equal(f.rpcCalls.length,1);assert.equal(f.rpcCalls[0].name,'ingest_knowledge_social_posts');
  assert.equal(f.rpcCalls[0].args.p_posts[0].organization_id,'org1');assert.deepEqual(f.rpcCalls[0].args.p_posts[0].metrics,{});
  assert.equal(JSON.stringify(result).includes('TEST_PRIVATE_KEY'),false);
});
test('database failure does not return successful import or backend details', async () => {
  fixture({rpcError:{message:'private db details'}});const response=await POST(request({}));assert.equal(response.status,500);
  assert.deepEqual(await response.json(),{ok:false,error:'social_sync_save_failed'});
});
