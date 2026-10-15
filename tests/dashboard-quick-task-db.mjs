// Disposable PostgreSQL only. No production URL, credentials or user data.
// EMBEDDED_POSTGRES_MODULE=/private/tmp/hl-partner-pg/node_modules/embedded-postgres/dist/index.js node tests/dashboard-quick-task-db.mjs
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createServer } from 'node:net';
import { dashboardTextError, FOCUS_TITLE_LIMIT, PLAN_TITLE_LIMIT, PLAN_NOTES_LIMIT } from '../lib/dashboard-task-input.js';

if (!process.env.EMBEDDED_POSTGRES_MODULE) throw new Error('Set the external test-only EMBEDDED_POSTGRES_MODULE runtime.');
const { default: EmbeddedPostgres } = await import(pathToFileURL(process.env.EMBEDDED_POSTGRES_MODULE).href);
const directory = await mkdtemp(join(tmpdir(), 'hl-quick-task-'));
const port = await new Promise((resolve, reject) => { const server = createServer(); server.on('error', reject); server.listen(0, '127.0.0.1', () => { const port = server.address().port; server.close(error => error ? reject(error) : resolve(port)); }); });
const db = new EmbeddedPostgres({ databaseDir: join(directory, 'data'), port, user: 'postgres', password: 'disposable-test-only', persistent: false, authMethod: 'scram-sha-256', createPostgresUser: false, initdbFlags: ['--encoding=UTF8', '--locale=C'], postgresFlags: ['-c', 'listen_addresses=127.0.0.1', '-c', `unix_socket_directories=${directory}`], onLog: () => {}, onError: () => {} });
const staff = '00000000-0000-4000-8000-000000000001';
const other = '00000000-0000-4000-8000-000000000002';
let client;
let checks = 0;
const equal = (actual, expected, label) => { assert.equal(actual, expected, label); checks++; };
const rejects = async (sql, values, regex) => { await assert.rejects(client.query(sql, values), regex); checks++; };
try {
  await db.initialise(); await db.start(); client = db.getPgClient('postgres', '127.0.0.1'); await client.connect();
  await client.query(`create role anon; create role authenticated; create role service_role;
    create schema auth; grant usage on schema public,auth to anon,authenticated;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create table public.staff_roles(user_id uuid primary key,role text);
    create function public.is_staff() returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from staff_roles where user_id=auth.uid())$$;
    create function public.is_staff_manager() returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from staff_roles where user_id=auth.uid() and role in ('admin','manager'))$$;`);
  await client.query('insert into auth.users values ($1),($2);', [staff, other]);
  await client.query("insert into staff_roles values ($1,'admin')", [staff]);
  for (const migration of ['0036_morning_desk.sql', '0064_dashboard_plans.sql', '0089_dashboard_quick_task.sql']) {
    await client.query(await readFile(new URL(`../supabase/migrations/${migration}`, import.meta.url), 'utf8'));
  }
  await client.query('grant select,insert,update on public.morning_focus_items,public.dashboard_plans to authenticated;set role authenticated;');
  await client.query("select set_config('request.jwt.claim.sub',$1,false)", [staff]);
  const title = `${'Trà xanh 🌱 '.repeat(60)}\nXác nhận người nhận và ngày giao`;
  equal(dashboardTextError(title, FOCUS_TITLE_LIMIT, 'Ưu tiên', true), '', 'long multiline input passes UI validation');
  const saved = (await client.query('select save_morning_focus(1,$1,$2,$3) as id', [title, 'partnerNetwork', '/admin/partner-network'])).rows[0].id;
  equal((await client.query('select title from morning_focus_items where id=$1', [saved])).rows[0].title, title, 'no truncation');
  const updated = (await client.query("select save_morning_focus(1,repeat('a',1000),'recipes','/admin/recipes') as id")).rows[0].id;
  equal(updated, saved, 'same slot updates same existing record');
  equal((await client.query('select char_length(title) as size from morning_focus_items where id=$1', [saved])).rows[0].size, 1000);
  await rejects("select save_morning_focus(1,repeat('a',1001),'recipes','/admin/recipes')", [], /title_too_long/);
  await rejects("insert into morning_focus_items(position,title,app_key,href) values(2,repeat('a',1001),'orders','/admin/orders')", [], /morning_focus_items_title_check/);
  await rejects("select save_morning_focus(null,'A','orders','/admin/orders')", [], /invalid_position/);
  await rejects("select save_morning_focus(2,'A','not-real','/admin/orders')", [], /invalid_app/);
  for (const app of ['discovery', 'procedures', 'documents', 'recipes', 'partnerNetwork']) {
    equal(Boolean((await client.query('select save_morning_focus(2,$1,$2,$3) as id', [app, app, `/admin/${app}`])).rows[0].id), true, `${app} destination`);
  }
  const plan = (await client.query("insert into dashboard_plans(kind,title,notes) values('task',repeat('a',500),repeat('b',6000)) returning id,char_length(title) as title_length,char_length(notes) as notes_length")).rows[0];
  equal(plan.title_length, PLAN_TITLE_LIMIT); equal(plan.notes_length, PLAN_NOTES_LIMIT);
  await rejects("insert into dashboard_plans(title) values(repeat('a',501))", [], /dashboard_plans_title_check/);
  await rejects("update dashboard_plans set notes=repeat('b',6001) where id=$1", [plan.id], /dashboard_plans_notes_check/);
  equal(Boolean(dashboardTextError('a'.repeat(1001), FOCUS_TITLE_LIMIT, 'Ưu tiên', true)), true, 'UI rejects oversize without slicing');
  await client.query("select set_config('request.jwt.claim.sub',$1,false)", [other]);
  equal((await client.query('select count(*)::int as n from morning_focus_items')).rows[0].n, 0, 'other account cannot read staff priorities');
  equal((await client.query('select count(*)::int as n from dashboard_plans')).rows[0].n, 0, 'other account cannot read staff notes');
  await rejects("select save_morning_focus(1,'A','orders','/admin/orders')", [], /not_authorised/);
  await client.query('reset role;set role anon');
  await rejects("select save_morning_focus(1,'A','orders','/admin/orders')", [], /permission denied/);
  console.log(`Dashboard quick-task PostgreSQL: ${checks} boundary, preservation, destination and authorization assertions passed.`);
} finally {
  if (client) await client.end();
  await db.stop(); await rm(directory, { recursive: true, force: true });
}
