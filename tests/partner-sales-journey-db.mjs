// Disposable PostgreSQL; never accepts an existing DB URL or production data.
// EMBEDDED_POSTGRES_MODULE=/private/tmp/hl-partner-pg/node_modules/embedded-postgres/dist/index.js node tests/partner-sales-journey-db.mjs
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createServer} from 'node:net';
import assert from 'node:assert/strict';
import {setTimeout as delay} from 'node:timers/promises';
const modulePath=process.env.EMBEDDED_POSTGRES_MODULE;
if(!modulePath)throw new Error('Set EMBEDDED_POSTGRES_MODULE to an external test-only runtime; no existing database is used.');
const {default:EmbeddedPostgres}=await import(pathToFileURL(modulePath).href);
const directory=await mkdtemp(join(tmpdir(),'hl-sales-journey-'));
const port=await new Promise((resolve,reject)=>{const s=createServer();s.on('error',reject);s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(e=>e?reject(e):resolve(p));});});
const db=new EmbeddedPostgres({databaseDir:join(directory,'data'),port,user:'postgres',password:'disposable-test-only',persistent:false,authMethod:'scram-sha-256',createPostgresUser:false,initdbFlags:['--encoding=UTF8','--locale=C'],postgresFlags:['-c','listen_addresses=127.0.0.1','-c',`unix_socket_directories=${directory}`],onLog:()=>{},onError:()=>{}});
let client,a,b;
const sql=async name=>readFile(new URL(name,import.meta.url),'utf8');
const scalar=async(c,query,params=[])=>Object.values((await c.query(query,params)).rows[0])[0];
try{
 await db.initialise();await db.start();client=db.getPgClient('postgres','127.0.0.1');await client.connect();
 await client.query(await sql('./sql/partner-network-fixture.sql'));
 await client.query(await sql('../supabase/migrations/0077_event_enquiries.sql'));
 await client.query(await sql('../supabase/migrations/0084_b2b_partner_network.sql'));
 await client.query(await sql('./sql/partner-network.sql'));
 await client.query(await sql('../supabase/migrations/0086_partner_order_link_events.sql'));
 await client.query(await sql('./sql/partner-sales-journey-fixture.sql'));
 await client.query(await sql('../supabase/migrations/0087_partner_profit_commissions.sql'));
 await client.query(await sql('../supabase/migrations/0088_partner_sales_journey.sql'));
 const checks=await sql('./sql/partner-sales-journey.sql');await client.query(checks);
 a=db.getPgClient('postgres','127.0.0.1');b=db.getPgClient('postgres','127.0.0.1');
 for(const c of[a,b]){await c.connect();await c.query("set role service_role;set statement_timeout='6s'");await c.query("select set_config('request.jwt.claim.role','service_role',false)");}
 const revision=await scalar(client,"select revision from public.partner_network_sales_pages where slug='test-partner-a'");
 const payload={request_id:'00000000-0000-4000-8000-000000000499',name:'Concurrent visitor',business:'Concurrent test café',contact:'0907000499',intent:'quote',note:'Synthetic input only',source:'website',medium:'referral',campaign:'event_contact_v1',consent:true,partner_consent:true,throttle_key:'a'.repeat(64),previous_throttle_key:'b'.repeat(64),location:'Test region',product_interest:'Hồng trà OP1',tea_ids:['black-op1'],requested_quantity_kg:null,desired_date:null};
 await a.query('begin');await b.query('begin');
 const first=await scalar(a,'select public.partner_network_submit_page_enquiry($1,$2,$3)',['test-partner-a',revision,payload]);
 const aPid=await scalar(a,'select pg_backend_pid()'),bPid=await scalar(b,'select pg_backend_pid()');assert.notEqual(aPid,bPid);
 let finished=false;const pending=scalar(b,'select public.partner_network_submit_page_enquiry($1,$2,$3)',['test-partner-a',revision,payload]).then(value=>({value}),error=>({error})).then(value=>{finished=true;return value;});
 let observed=false;for(let i=0;i<100&&!finished;i++){if((await scalar(client,'select pg_blocking_pids($1)',[bPid])).includes(aPid)){observed=true;break;}await delay(20);}assert.ok(observed,'duplicate intake must wait on request lock');
 await a.query('commit');const second=await pending;assert.ifError(second.error);await b.query('commit');
 assert.equal(first.is_new,true);assert.equal(second.value.is_new,false);
 assert.equal(await scalar(client,"select count(*)::int from public.event_enquiries where id=$1",[payload.request_id]),1);
 assert.equal(await scalar(client,"select count(*)::int from public.partner_network_referrals where id=$1 and opportunity_id is null",[payload.request_id]),1);
 console.log(`Partner sales journey PostgreSQL: ${(checks.match(/public\.test_(?:assert|error)\(/g)||[]).length} focused assertions +1 actual two-backend intake race passed; 69 legacy SQL assertions also passed.`);
}catch(error){console.error(JSON.stringify({message:error.message,position:error.position,where:error.where,detail:error.detail,stack:error.stack},null,2));process.exitCode=1;}
finally{await Promise.allSettled([client,a,b].filter(Boolean).map(c=>c.end()));await db.stop();await rm(directory,{recursive:true,force:true});}
if(process.exitCode)process.exit(process.exitCode);
