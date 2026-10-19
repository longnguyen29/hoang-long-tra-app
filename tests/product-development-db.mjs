// Real PostgreSQL in a fresh loopback-only cluster; accepts no existing database URL.
// EMBEDDED_POSTGRES_MODULE=/tmp/hl-partner-pg/node_modules/embedded-postgres/dist/index.js node tests/product-development-db.mjs
import assert from 'node:assert/strict';
import { appendFile, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createServer } from 'node:net';
import { createHash } from 'node:crypto';

const modulePath = process.env.EMBEDDED_POSTGRES_MODULE;
if (!modulePath) throw new Error('Set EMBEDDED_POSTGRES_MODULE to the separately installed embedded-postgres runtime. No existing database is used.');
const { default: EmbeddedPostgres } = await import(pathToFileURL(modulePath).href);
const directory = await mkdtemp(join(tmpdir(), 'hl-product-development-postgres-'));
const logFile = join(directory, 'server.log');
const port = await new Promise((resolve, reject) => {
  const server = createServer();
  server.once('error', reject);
  server.listen(0, '127.0.0.1', () => {
    const selected = server.address().port;
    server.close(error => error ? reject(error) : resolve(selected));
  });
});
const cluster = new EmbeddedPostgres({
  databaseDir: join(directory, 'data'), user: 'postgres', password: 'disposable-test-only',
  port, persistent: false, createPostgresUser: false, authMethod: 'scram-sha-256',
  initdbFlags: ['--encoding=UTF8', '--locale=C'],
  postgresFlags: ['-c', 'listen_addresses=127.0.0.1', '-c', `unix_socket_directories=${directory}`],
  onLog: value => { void appendFile(logFile, String(value)).catch(() => {}); },
  onError: value => { void appendFile(logFile, String(value)).catch(() => {}); },
});
let connection;
async function snapshot() {
  const { rows } = await connection.query(`select jsonb_build_object(
    'catalog', (select jsonb_agg(to_jsonb(p) order by p.id) from public.catalog_products p),
    'variants', (select jsonb_agg(to_jsonb(v) order by v.product_id, v.weight) from public.catalog_variants v),
    'batches', (select jsonb_agg(to_jsonb(b) order by b.id) from public.tea_batches b),
    'materials', (select jsonb_agg(to_jsonb(s) order by s.id) from public.supply_items s),
    'public_vendors', (select jsonb_agg(to_jsonb(v) order by v.id) from public.list_public_vendors() v)
  ) as state`);
  return rows[0].state;
}
async function developmentSnapshot() {
  const state = {};
  for (const table of ['vendors', 'product_development_projects', 'supplier_profiles',
    'product_development_catalog_links', 'product_development_suppliers',
    'product_development_resources', 'product_development_events']) {
    // Names come exclusively from this fixed internal list.
    const { rows } = await connection.query(`select coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text),'[]'::jsonb) as state from public.${table} r`);
    state[table] = rows[0].state;
  }
  return state;
}
try {
  await cluster.initialise();
  await cluster.start();
  connection = cluster.getPgClient('postgres', '127.0.0.1');
  await connection.connect();
  await connection.query("set statement_timeout='15s'; set lock_timeout='8s'");
  const fixture = await readFile(new URL('./sql/product-development-fixture.sql', import.meta.url), 'utf8');
  const migration = await readFile(new URL('../supabase/migrations/0096_product_development_foundation.sql', import.meta.url), 'utf8');
  const assertions = await readFile(new URL('./sql/product-development.sql', import.meta.url), 'utf8');
  await connection.query(fixture);
  const baseline = await snapshot();
  await connection.query(migration);
  assert.deepEqual(await snapshot(), baseline, 'Foundation migration must preserve catalog prices, saleability, stock, lots, materials and public growers');
  await connection.query(assertions);
  await connection.query('reset role');
  assert.deepEqual(await snapshot(), baseline, 'Development operations must not create commercial SKUs, change inventory or publish supplier leads');
  const developed = await developmentSnapshot();
  await connection.query('select public.product_development_seed()');
  assert.deepEqual(await developmentSnapshot(), developed, 'Repeating the owner-only seed must preserve manager edits, supplier identity, links and audit history without duplicates');
  assert.deepEqual(await snapshot(), baseline, 'Repeating development seeds must preserve the entire commercial and inventory baseline');
  const count = (assertions.match(/public\.test_(?:assert|error)\(/g) || []).length;
  const { rows } = await connection.query('show server_version');
  console.log(`Product development PostgreSQL ${rows[0].server_version}: ${count} SQL assertions, repeat-seed preservation and unchanged commercial/inventory/public-vendor snapshots passed.`);
  console.log(`Migration 0096 SHA256: ${createHash('sha256').update(migration).digest('hex')}. Disposable database only.`);
} catch (error) {
  console.error(JSON.stringify({ message: error.message, detail: error.detail, hint: error.hint, where: error.where, stack: error.stack }, null, 2));
  process.exitCode = 1;
} finally {
  await connection?.end();
  await cluster.stop();
  await rm(directory, { recursive: true, force: true });
}
// embedded-postgres has its own beforeExit hook; preserve failed assertions.
if (process.exitCode) process.exit(process.exitCode);
