// Local, in-memory PostgreSQL integration checks. No production database or
// network is used. Run with PGLITE_MODULE pointing at an installed PGlite ESM
// entry point, e.g. /path/to/@electric-sql/pglite/dist/index.js.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
const migrationsUrl = new URL('../supabase/migrations/', import.meta.url);
const omittedSchedules = new Set(['0072_shipping_sms_retry_schedule.sql', '0079_sample_followup_schedule.sql']);
const fixtures = process.argv.slice(2);
if (!fixtures.length) fixtures.push('sample-followups.sql', 'remove-order-line.sql');

async function snapshot() {
  const { rows: tables } = await db.query(`select schemaname,tablename from pg_tables
    where schemaname in ('public','auth','storage') order by schemaname,tablename`);
  const result = [];
  for (const table of tables) {
    const qualified = [table.schemaname,table.tablename].map(value => `"${value.replaceAll('"','""')}"`).join('.');
    const { rows: [state] } = await db.query(`select count(*)::integer as rows,
      md5(coalesce(string_agg(row_to_json(t)::text,E'\\n' order by row_to_json(t)::text),'')) as digest
      from ${qualified} t`);
    result.push({ table: qualified, ...state });
  }
  return result;
}

try {
  // Supabase-owned schemas/roles are absent in a standalone PostgreSQL build.
  // Stubs retain the JWT settings, FK targets and access grants needed by the
  // real application migrations; delivery schedulers are deliberately omitted.
  await db.exec(`
    create role anon;
    create role authenticated;
    create role service_role bypassrls;
    create schema auth;
    create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb not null default '{}');
    create function auth.uid() returns uuid language sql stable as $$
      select coalesce(nullif(current_setting('request.jwt.claim.sub',true),''),
        nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid
    $$;
    create function auth.role() returns text language sql stable as $$
      select coalesce(nullif(current_setting('request.jwt.claim.role',true),''),
        nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'role')
    $$;
    grant usage on schema auth to anon,authenticated,service_role;
    grant execute on function auth.uid(),auth.role() to anon,authenticated,service_role;
    create schema storage;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,owner uuid,metadata jsonb);
    grant usage on schema public to anon,authenticated,service_role;
    alter default privileges in schema public grant all on tables to anon,authenticated,service_role;
    alter default privileges in schema public grant all on sequences to anon,authenticated,service_role;
  `);

  const names = (await fs.readdir(migrationsUrl)).filter(name => /^\d+.*\.sql$/.test(name)).sort();
  let applied = 0;
  for (const name of names) {
    if (Number(name.slice(0, 4)) > 80 || omittedSchedules.has(name)) continue;
    let sql = await fs.readFile(new URL(name, migrationsUrl), 'utf8');
    // PGlite provides PostgreSQL's built-in gen_random_uuid; pgcrypto is only
    // requested by 0003 and is not called by either fixture.
    sql = sql.replace(/^create extension if not exists pgcrypto;\s*$/m, '');
    try { await db.exec(sql); }
    catch (error) { throw new Error(`Migration ${name}: ${error.message}`, { cause: error }); }
    applied += 1;
  }
  console.log(`PASS: applied ${applied} application migrations with actual BOM and Procedure Run triggers; delivery schedules omitted`);

  for (const fixture of fixtures) {
    const before = await snapshot();
    const sql = await fs.readFile(new URL(`sql/${fixture}`, import.meta.url), 'utf8');
    try { await db.exec(sql); }
    catch (error) { throw new Error(`Fixture ${fixture}: ${error.message}`, { cause: error }); }
    const after = await snapshot();
    assert.deepEqual(after, before, `${fixture} must roll back every synthetic source and event`);
    console.log(`PASS: ${fixture}; all ${after.length} table contents restored by rollback`);
  }
} catch (error) {
  console.error(error.message);
  if (error.cause?.position) console.error(`SQL position ${error.cause.position}: ${error.cause.query?.slice(Math.max(0,Number(error.cause.position)-120),Number(error.cause.position)+120)}`);
  if (error.cause?.where) console.error(error.cause.where);
  if (error.cause?.internalQuery) console.error(error.cause.internalQuery);
  process.exitCode = 1;
} finally {
  await db.close();
}
