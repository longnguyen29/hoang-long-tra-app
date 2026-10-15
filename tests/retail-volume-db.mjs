// Disposable local PostgreSQL only. No production database URL is accepted.
// EMBEDDED_POSTGRES_MODULE=/private/tmp/hl-partner-pg/node_modules/embedded-postgres/dist/index.js node tests/retail-volume-db.mjs
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createServer} from 'node:net';
const modulePath=process.env.EMBEDDED_POSTGRES_MODULE;
if(!modulePath)throw new Error('Set EMBEDDED_POSTGRES_MODULE to an external test-only runtime; no existing database is used.');
const {default:EmbeddedPostgres}=await import(pathToFileURL(modulePath).href);
const directory=await mkdtemp(join(tmpdir(),'hl-retail-volume-'));
const port=await new Promise((resolve,reject)=>{const server=createServer();server.on('error',reject);server.listen(0,'127.0.0.1',()=>{const answer=server.address().port;server.close(error=>error?reject(error):resolve(answer));});});
const db=new EmbeddedPostgres({databaseDir:join(directory,'data'),port,user:'postgres',password:'disposable-test-only',persistent:false,authMethod:'scram-sha-256',createPostgresUser:false,initdbFlags:['--encoding=UTF8','--locale=C'],postgresFlags:['-c','listen_addresses=127.0.0.1','-c',`unix_socket_directories=${directory}`],onLog:()=>{},onError:()=>{}});
let client;
const sql=async path=>readFile(new URL(path,import.meta.url),'utf8');
try{
 await db.initialise();await db.start();client=db.getPgClient('postgres','127.0.0.1');await client.connect();
 await client.query(await sql('./sql/retail-volume-fixture.sql'));
 const legacy=await sql('../supabase/migrations/0021_v3_analytics_referral_functions.sql');
 await client.query(legacy.slice(legacy.indexOf('-- Identical to 0014')));
 const units=await sql('../supabase/migrations/0085_partner_quote_units.sql');
 await client.query(units.slice(units.indexOf('create function public.trade_catalog_sale_unit'),units.indexOf('create function public.trade_quote_assert_stock_units')));
 await client.query(await sql('../supabase/migrations/0090_retail_volume_policy.sql'));
 const checks=await sql('./sql/retail-volume.sql');await client.query(checks);
 console.log(`Retail volume PostgreSQL: ${(checks.match(/public\.test_(?:assert|error)\(/g)||[]).length} focused assertions passed.`);
}catch(error){console.error(JSON.stringify({message:error.message,position:error.position,where:error.where,detail:error.detail,stack:error.stack},null,2));process.exitCode=1;}
finally{if(client)await client.end();await db.stop();await rm(directory,{recursive:true,force:true});}
if(process.exitCode)process.exit(process.exitCode);
