// Real disposable PostgreSQL only. No existing database URL or production data.
// EMBEDDED_POSTGRES_MODULE=/private/tmp/hl-partner-pg/node_modules/embedded-postgres/dist/index.js node tests/partner-profit-db.mjs
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createServer } from 'node:net';
import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
const modulePath=process.env.EMBEDDED_POSTGRES_MODULE;
if (!modulePath) throw new Error('Set EMBEDDED_POSTGRES_MODULE to an external test runtime. No existing database is used.');
const {default: EmbeddedPostgres}=await import(pathToFileURL(modulePath).href);
const directory=await mkdtemp(join(tmpdir(),'hl-partner-profit-'));
const port=await new Promise((resolve,reject)=>{const s=createServer();s.on('error',reject);s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(e=>e?reject(e):resolve(p));});});
const db=new EmbeddedPostgres({databaseDir:join(directory,'data'),port,user:'postgres',password:'disposable-test-only',persistent:false,authMethod:'scram-sha-256',createPostgresUser:false,initdbFlags:['--encoding=UTF8','--locale=C'],postgresFlags:['-c','listen_addresses=127.0.0.1','-c',`unix_socket_directories=${directory}`],onLog:()=>{},onError:()=>{}});
let client,a,b;
try{
 await db.initialise();await db.start();client=db.getPgClient('postgres','127.0.0.1');await client.connect();
 await client.query(await readFile(new URL('./sql/partner-network-fixture.sql',import.meta.url),'utf8'));
 await client.query(await readFile(new URL('../supabase/migrations/0084_b2b_partner_network.sql',import.meta.url),'utf8'));
 await client.query(await readFile(new URL('./sql/partner-network.sql',import.meta.url),'utf8'));
 await client.query(await readFile(new URL('../supabase/migrations/0086_partner_order_link_events.sql',import.meta.url),'utf8'));
 await client.query(`create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,metadata jsonb);
 create table public.profit_test_paid_before as select id,status,rate_percent,eligible_base,calculated_amount,paid_amount,paid_reference,paid_at,paid_by,fingerprint from public.partner_network_commissions where status='paid';`);
 await client.query(await readFile(new URL('../supabase/migrations/0087_partner_profit_commissions.sql',import.meta.url),'utf8'));
 const assertions=await readFile(new URL('./sql/partner-profit.sql',import.meta.url),'utf8');await client.query(assertions);
 a=db.getPgClient('postgres','127.0.0.1');b=db.getPgClient('postgres','127.0.0.1');
 for(const c of[a,b]){await c.connect();await c.query("set role authenticated; set statement_timeout='6s'");await c.query("select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false)");}
 const scalar=async(c,sql,params=[])=>Object.values((await c.query(sql,params)).rows[0])[0];
 const rpc=(c,name,params)=>scalar(c,`select public.${name}(${params.map((_,i)=>`$${i+1}`).join(',')})`,params);
 const c2=await scalar(client,"select id::text from public.partner_network_commissions where order_id='profit-o2'");
 const partnerId=await scalar(client,"select partner_id::text from public.partner_network_commissions where id=$1",[c2]);
 async function blockedRace(label,first,second,expected){
  await a.query('begin');await b.query('begin');await first();
  const aPid=await scalar(a,'select pg_backend_pid()'),bPid=await scalar(b,'select pg_backend_pid()');assert.notEqual(aPid,bPid);
  let completed=false;const pending=second().then(value=>({value}),error=>({error})).then(value=>{completed=true;return value;});
  let observed=false;for(let i=0;i<100&&!completed;i++){if((await scalar(client,'select pg_blocking_pids($1)',[bPid])).includes(aPid)){observed=true;break;}await delay(20);}
  assert.ok(observed,'separate backend must wait for concurrent writer');await a.query('commit');const result=await pending;await b.query(result.error?'rollback':'commit');
  assert.match(result.error?.message||'',expected);console.log(`PASS concurrent ${label} (separate backends; lock wait observed)`);
 }
 await rpc(a,'partner_network_commission_action',[c2,'approve',{}]);
 await blockedRace('agreement change invalidates payout',
  ()=>rpc(a,'partner_network_manage_partner',[partnerId,'update',{commission_basis:'revenue',reason:'Explicit changed agreement while payout is pending'}]),
  ()=>rpc(b,'partner_network_commission_action',[c2,'pay',{amount:30000,reference:'must-not-record',paid_at:new Date().toISOString()}]),/commission_stale_reconcile_required/);
 assert.equal(await scalar(client,'select paid_amount from public.partner_network_commissions where id=$1',[c2]),null);
 const review={vat_amount:0,billed_shipping_amount:0,refunded_amount:0,internal_cost_total:400000,minimum_retained_profit:100000,commission_basis:'profit',adjustment_reason:'Explicit order-specific profit basis retained after changed partner terms',review_note:'All actual costs reviewed'};
 await rpc(a,'partner_network_reconcile',['profit-o2',review]);
 const seen=(await rpc(a,'partner_network_cost_statement_view',[c2])).preview_snapshot;delete seen.order_id;
 await blockedRace('unseen cost change prevents publication',
  ()=>rpc(a,'partner_network_reconcile',['profit-o2',{...review,internal_cost_total:500000,review_note:'Second manager corrected actual costs'}]),
  ()=>rpc(b,'partner_network_cost_statement',['profit-o2','publish',{summary:'Manager reviewed old visible numbers only',content_reviewed:true,expected_snapshot:seen}]),/cost_statement_preview_changed/);
 assert.equal(await scalar(client,"select count(*)::int from public.partner_network_cost_statements where order_id='profit-o2' and published"),0);
 console.log(`Partner profit PostgreSQL: ${(assertions.match(/public\.test_(?:assert|error)\(/g)||[]).length} focused assertions + 2 concurrency cases passed; 69 baseline legacy SQL assertions also passed.`);
}catch(error){console.error(JSON.stringify({message:error.message,detail:error.detail,position:error.position,internalPosition:error.internalPosition,internalQuery:error.internalQuery,where:error.where,stack:error.stack},null,2));process.exitCode=1;}
finally{await Promise.allSettled([client,a,b].filter(Boolean).map(c=>c.end()));await db.stop();await rm(directory,{recursive:true,force:true});}
if(process.exitCode)process.exit(process.exitCode);
