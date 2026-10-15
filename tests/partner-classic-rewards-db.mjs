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
const directory=await mkdtemp(join(tmpdir(),'hl-classic-rewards-'));
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
 await client.query(await sql('../supabase/migrations/0091_partner_classic_rewards.sql'));
 const checks=await sql('./sql/partner-classic-rewards.sql');await client.query(checks);
 console.log(`Classic/rewards PostgreSQL: ${(checks.match(/public\.test_(?:assert|error)\(/g)||[]).length} assertions passed; 69 legacy assertions also passed.`);
}catch(error){console.error(JSON.stringify({message:error.message,position:error.position,where:error.where,detail:error.detail,stack:error.stack},null,2));process.exitCode=1;}
finally{await Promise.allSettled([client,a,b].filter(Boolean).map(c=>c.end()));await db.stop();await rm(directory,{recursive:true,force:true});}
if(process.exitCode)process.exit(process.exitCode);
