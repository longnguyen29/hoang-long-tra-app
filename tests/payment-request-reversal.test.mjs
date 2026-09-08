import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
// Run with PGLITE_MODULE pointing to an installed @electric-sql/pglite module.
const {PGlite}=await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
test('actual SQL: cancel unpaid, preserve history, edit and reissue; reject paid and stale cancellation',async()=>{
 const db=new PGlite();
 try{
 await db.exec(`create role anon; create role authenticated;
 create schema auth; create function auth.uid() returns uuid language sql as $$select '00000000-0000-0000-0000-000000000001'::uuid$$;
 create table staff_roles(user_id uuid, role text);
 insert into staff_roles values(auth.uid(),'admin');
 create function is_staff() returns boolean language sql as $$select exists(select 1 from staff_roles where user_id=auth.uid())$$;
 create table wholesale_accounts(id text primary key);
 create table orders(id text primary key, estimated_total numeric, partner_account_id text);
 create table order_events(id bigserial primary key,order_id text,kind text,message text,actor text);
 `);
 const original=await readFile(new URL('../supabase/migrations/0035_b2b_operating_loop.sql',import.meta.url),'utf8');
 await db.exec(original.slice(original.indexOf('create table if not exists receivables ('),original.indexOf('create index if not exists receivables_due_idx')));
 await db.exec(original.slice(original.indexOf('create or replace function record_receivable_payment('),original.indexOf('revoke all on function record_receivable_payment')));
 await db.exec(await readFile(new URL('../supabase/migrations/0056_reverse_unpaid_payment_request.sql',import.meta.url),'utf8'));
 await db.exec("insert into orders values('test-order',1000000,null)");
 const issue=()=>db.query("select issue_receivable('test-order','TT-test',current_date,null,'','')");
 const row=async()=>(await db.query("select *,updated_at::text as version from receivables")).rows[0];
 const cancel=version=>db.query("select void_unpaid_receivable('test-order','recv-test-order',$1::timestamptz)",[version]);
 await issue();const first=await row();
 await assert.rejects(issue(),/receivable_exists/);
 await db.exec("update staff_roles set role='worker'");
 await assert.rejects(cancel(first.version),/not_authorised/);
 await db.exec("update staff_roles set role='admin'");
 await cancel(first.version);
 assert.equal((await row()).status,'void');
 assert.equal((await db.query("select * from order_events where kind='payment_request_voided'")).rows.length,1);
 await cancel(first.version); // Retry after lost response is harmless while void.
 await db.exec("update orders set estimated_total=900000 where id='test-order'");
 await issue();
 assert.equal(Number((await row()).total),900000);
 assert.equal((await row()).status,'open');
 await assert.rejects(cancel(first.version),/receivable_changed/);
 await db.exec("select record_receivable_payment('recv-test-order',100000,'cash','','','test')");
 await assert.rejects(cancel((await row()).version),/receivable_has_payments/);
 assert.equal(Number((await row()).paid),100000);
 assert.equal((await row()).status,'partial');
 assert.equal((await db.query('select * from receivable_payments')).rows.length,1);
 // Even inconsistent paid totals cannot erase the payment ledger.
 await db.exec("update receivables set paid=0,status='open'");
 await assert.rejects(cancel((await row()).version),/receivable_has_payments/);
 }finally{await db.close()}
});
