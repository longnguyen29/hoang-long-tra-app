// Disposable local PostgreSQL only; no production URL or data is accepted.
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createServer} from 'node:net';
import assert from 'node:assert/strict';
import {setTimeout as delay} from 'node:timers/promises';
const modulePath=process.env.EMBEDDED_POSTGRES_MODULE;if(!modulePath)throw new Error('Set EMBEDDED_POSTGRES_MODULE; no existing database is used.');
const {default:EmbeddedPostgres}=await import(pathToFileURL(modulePath).href);
const directory=await mkdtemp(join(tmpdir(),'hl-partner-retail-'));
const port=await new Promise((resolve,reject)=>{const s=createServer();s.on('error',reject);s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(e=>e?reject(e):resolve(p));});});
const db=new EmbeddedPostgres({databaseDir:join(directory,'data'),port,user:'postgres',password:'disposable-test-only',persistent:false,authMethod:'scram-sha-256',createPostgresUser:false,initdbFlags:['--encoding=UTF8','--locale=C'],postgresFlags:['-c','listen_addresses=127.0.0.1','-c',`unix_socket_directories=${directory}`],onLog:()=>{},onError:()=>{}});
const sql=async name=>readFile(new URL(name,import.meta.url),'utf8');let client,a,b;const scalar=async(c,q,p=[])=>Object.values((await c.query(q,p)).rows[0])[0];
try{
 await db.initialise();await db.start();client=db.getPgClient('postgres','127.0.0.1');await client.connect();
 for(const file of ['./sql/partner-network-fixture.sql','../supabase/migrations/0077_event_enquiries.sql','../supabase/migrations/0084_b2b_partner_network.sql','../supabase/migrations/0086_partner_order_link_events.sql','./sql/partner-sales-journey-fixture.sql','../supabase/migrations/0087_partner_profit_commissions.sql','../supabase/migrations/0088_partner_sales_journey.sql','./sql/partner-retail-fixture.sql']) await client.query(await sql(file));
 const legacy=await sql('../supabase/migrations/0021_v3_analytics_referral_functions.sql');await client.query(legacy.slice(legacy.indexOf('-- Identical to 0014')));
 for(const file of ['./sql/partner-expansion-fixture.sql','../supabase/migrations/0085_partner_quote_units.sql','../supabase/migrations/0090_retail_volume_policy.sql','../supabase/migrations/0091_partner_classic_rewards.sql','../supabase/migrations/0092_partner_quote_proposals.sql','../supabase/migrations/0093_partner_retail_referrals.sql','../supabase/migrations/0094_partner_network_expansion_snapshots.sql'])await client.query(await sql(file));
 const checks=await sql('./sql/partner-retail.sql');await client.query(checks);
 const integration=await sql('./sql/partner-expansion.sql');await client.query(integration);
 a=db.getPgClient('postgres','127.0.0.1');b=db.getPgClient('postgres','127.0.0.1');
 for(const c of[a,b]){await c.connect();await c.query("set role service_role;set statement_timeout='6s'");await c.query("select set_config('request.jwt.claim.role','service_role',false)");}
 await a.query('begin');await b.query('begin');
 const request='00000000-0000-4000-8000-000000000999';const query="select public.submit_partner_retail_order($1,repeat('f',64),public.retail_test_input('0905550999'),null)";
 const first=await scalar(a,query,[request]);let finished=false;const aPid=await scalar(a,'select pg_backend_pid()'),bPid=await scalar(b,'select pg_backend_pid()');
 const pending=scalar(b,query,[request]).then(value=>({value}),error=>({error})).then(v=>{finished=true;return v;});let blocked=false;
 for(let i=0;i<100&&!finished;i++){if((await scalar(client,'select pg_blocking_pids($1)',[bPid])).includes(aPid)){blocked=true;break;}await delay(20);}assert.ok(blocked,'retry must serialize behind the durable request');
 await a.query('commit');const second=await pending;assert.ifError(second.error);await b.query('commit');assert.equal(first.orderId,second.value.orderId);assert.equal(second.value.isNew,false);
 assert.equal(await scalar(client,'select count(*)::int from public.partner_network_retail_receipts where request_id=$1',[request]),1);
 console.log(`Partner retail PostgreSQL: ${(checks.match(/public\.test_(?:assert|error)\(/g)||[]).length} focused assertions + ${(integration.match(/public\.test_(?:assert|error)\(/g)||[]).length} integration assertions +1 actual concurrent retry passed.`);
}catch(error){console.error(JSON.stringify({message:error.message,where:error.where,detail:error.detail,stack:error.stack},null,2));process.exitCode=1;}
finally{await Promise.allSettled([client,a,b].filter(Boolean).map(c=>c.end()));await db.stop();await rm(directory,{recursive:true,force:true});}
if(process.exitCode)process.exit(process.exitCode);
