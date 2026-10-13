// Genuine, disposable PostgreSQL concurrency test. It never accepts a database URL.
// Install outside this repository: npm install --prefix /private/tmp/hl-partner-pg --no-save embedded-postgres@17.10.0-beta.17 pg@8
// EMBEDDED_POSTGRES_MODULE=/private/tmp/hl-partner-pg/node_modules/embedded-postgres/dist/index.js node tests/partner-network-postgres.mjs
// Package documentation: https://github.com/leinelissen/embedded-postgres
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, appendFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createServer } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import { createHash } from 'node:crypto';

const modulePath = process.env.EMBEDDED_POSTGRES_MODULE;
if (!modulePath) throw new Error('Set EMBEDDED_POSTGRES_MODULE to a separately installed embedded-postgres module. No existing database is used.');
const { default: EmbeddedPostgres } = await import(pathToFileURL(modulePath).href);
const directory = await mkdtemp(join(tmpdir(), 'hl-partner-postgres-'));
const logFile = join(directory, 'server.log');
const port = await new Promise((resolve, reject) => {
  const server = createServer();
  server.once('error', reject);
  server.listen(0, '127.0.0.1', () => {
    const selected = server.address().port;
    server.close(error => error ? reject(error) : resolve(selected));
  });
});
// This password belongs only to a new loopback-only, automatically deleted cluster.
const cluster = new EmbeddedPostgres({
  databaseDir: join(directory, 'data'), user: 'postgres', password: 'disposable-test-only',
  port, persistent: false, createPostgresUser: false, authMethod: 'scram-sha-256',
  initdbFlags: ['--encoding=UTF8', '--locale=C'],
  postgresFlags: ['-c', 'listen_addresses=127.0.0.1', '-c', `unix_socket_directories=${directory}`],
  onLog: value => { void appendFile(logFile, String(value)).catch(() => {}); },
  onError: value => { void appendFile(logFile, String(value)).catch(() => {}); },
});
const clients = [];
const uid = number => `00000000-0000-4000-8000-${String(number).padStart(12, '0')}`;
let concurrencyCases = 0;
let owner;
async function client(principal) {
  const connection = cluster.getPgClient('postgres', '127.0.0.1');
  clients.push(connection);
  await connection.connect();
  await connection.query("set statement_timeout='8s'; set lock_timeout='6s'");
  if (principal) {
    await connection.query('set role authenticated');
    await connection.query("select set_config('request.jwt.claim.role','authenticated',false), set_config('request.jwt.claim.sub',$1,false)", [uid(principal)]);
  }
  return connection;
}
async function scalar(connection, sql, parameters = []) {
  const { rows } = await connection.query(sql, parameters);
  return Object.values(rows[0])[0];
}
async function rpc(connection, name, parameters) {
  return scalar(connection, `select public.${name}(${parameters.map((_, i) => `$${i + 1}`).join(',')})`, parameters);
}
async function expectBlocked(waitingPid, holdingPid, outcome) {
  const end = Date.now() + 3000;
  while (Date.now() < end) {
    const pids = await scalar(owner, 'select pg_blocking_pids($1)', [waitingPid]);
    if (pids.includes(holdingPid)) return;
    if (outcome.finished) throw new Error(`Second connection did not wait for the first transaction: ${outcome.result?.error?.message || 'completed without serialization'}`);
    await delay(20);
  }
  throw new Error('No PostgreSQL lock wait observed across independent connections');
}
// The first real connection holds its transaction open. PostgreSQL must report
// the other backend waiting on it before we commit and examine the result.
async function race(label, a, b, first, second, check, beforeCommit = async () => {}) {
  const [aPid, bPid] = await Promise.all([scalar(a, 'select pg_backend_pid()'), scalar(b, 'select pg_backend_pid()')]);
  assert.notEqual(aPid, bPid, 'race requires separate PostgreSQL backends');
  await a.query('begin');
  await b.query('begin');
  try {
    const firstResult = await first(a);
    const outcome = { finished: false };
    const pending = second(b).then(value => ({ value }), error => ({ error })).then(result => {
      outcome.finished = true;
      outcome.result = result;
      return result;
    });
    await expectBlocked(bPid, aPid, outcome);
    await beforeCommit(a);
    await a.query('commit');
    const secondResult = await pending;
    await b.query(secondResult.error ? 'rollback' : 'commit');
    await check(firstResult, secondResult);
    concurrencyCases += 1;
    console.log(`PASS concurrent ${label} (two backend connections; lock wait observed)`);
  } catch (error) {
    await Promise.allSettled([a.query('rollback'), b.query('rollback')]);
    throw error;
  }
}
const lead = (number, contact = `090300${String(number).padStart(4, '0')}`) => ({
  request_id: uid(number), business_name: `Isolated café ${number}`, contact_name: 'Test owner',
  contact, location: 'Test location', product_interest: 'Hồng trà', contact_authorized: true,
});
const review = note => ({ vat_amount: 0, billed_shipping_amount: 0, refunded_amount: 0,
  internal_cost_total: 500000, minimum_retained_profit: 100000, rate_percent: 3,
  adjustment_reason: 'Order-specific test rate explicitly reviewed', review_note: note });
async function seedOrder(id, referralId) {
  await owner.query("insert into public.orders(id,ts,type,status,customer_name,contact,address) values($1,now(),'wholesale','confirmed','Isolated customer','0903900000','Test address')", [id]);
  await owner.query("insert into public.receivables values($1,$2,1000000,1000000,'paid')", [`recv-${id}`, id]);
  await owner.query('insert into public.receivable_payments(id,receivable_id,amount) values($1,$2,1000000)', [`cash-${id}`, `recv-${id}`]);
  await rpc(adminA, 'partner_network_link_order', [referralId, id, 'Isolated race fixture attribution']);
}
let adminA, adminB;
try {
  await cluster.initialise();
  await cluster.start();
  owner = await client();
  const version = await scalar(owner, 'show server_version');
  const fixture = await readFile(new URL('./sql/partner-network-fixture.sql', import.meta.url), 'utf8');
  const migration = await readFile(new URL('../supabase/migrations/0084_b2b_partner_network.sql', import.meta.url), 'utf8');
  const assertions = await readFile(new URL('./sql/partner-network.sql', import.meta.url), 'utf8');
  await owner.query(fixture);
  await owner.query(migration);
  await owner.query(assertions);
  const sqlCount = (assertions.match(/public\.test_(?:assert|error)\(/g) || []).length;
  console.log(`PostgreSQL ${version}: ${sqlCount} existing SQL authorization/finance assertions passed.`);
  console.log(`Migration 0084 SHA256: ${createHash('sha256').update(migration).digest('hex')}`);
  await owner.query('reset role');
  await owner.query("insert into auth.users values($1,'concurrent@example.test',now())", [uid(7)]);
  [adminA, adminB] = await Promise.all([client(1), client(1)]);
  const [partnerA1, partnerA2, partnerB, newPartnerA, newPartnerB, financialWriter] = await Promise.all([
    client(3), client(3), client(4), client(7), client(7), client(),
  ]);
  await financialWriter.query("select set_config('request.jwt.claim.sub',$1,false)", [uid(1)]);

  const application = { business_name: 'Concurrent test partner', contact_name: 'Test worker', phone: '0901000007', region: 'Test region', partner_type: 'consultant', consent: true };
  await race('duplicate application prevention', newPartnerA, newPartnerB,
    c => rpc(c, 'partner_network_apply', [application]), c => rpc(c, 'partner_network_apply', [application]),
    async (first, second) => {
      assert.ok(first); assert.match(second.error?.message || '', /application_exists/);
      assert.equal(await scalar(owner, 'select count(*)::int from public.partner_network_partners where user_id=$1', [uid(7)]), 1);
    });

  await race('same lead retry', partnerA1, partnerA2,
    c => rpc(c, 'partner_network_submit_lead', [lead(201)]), c => rpc(c, 'partner_network_submit_lead', [lead(201)]),
    async (first, second) => {
      assert.ifError(second.error); assert.equal(second.value, first);
      assert.equal(await scalar(owner, 'select count(*)::int from public.partner_network_referrals where id=$1', [uid(201)]), 1);
    });
  await rpc(partnerB, 'partner_network_submit_lead', [lead(202, '+84903000201')]);
  await race('duplicate-contact acceptance', adminA, adminB,
    c => rpc(c, 'partner_network_resolve_lead', [uid(201), 'accept', { reason: 'First-origin evidence explicitly reviewed' }]),
    c => rpc(c, 'partner_network_resolve_lead', [uid(202), 'accept', { reason: 'Second-origin evidence explicitly reviewed' }]),
    async (_, second) => {
      assert.match(second.error?.message || '', /select_existing_opportunity/);
      assert.equal(await scalar(owner, "select count(*)::int from public.trade_opportunities where contact_key='0903000201'"), 1);
      assert.equal(await scalar(owner, "select count(*)::int from public.partner_network_referrals where contact_key='0903000201' and status='accepted'"), 1);
    });

  await rpc(partnerA1, 'partner_network_submit_lead', [lead(203)]);
  await rpc(partnerB, 'partner_network_submit_lead', [lead(204)]);
  await owner.query("insert into public.trade_opportunities(id,contact_key,business_name,contact,stage) values('race-existing-opp','0903000999','Existing test café','0903000999','lead')");
  await race('explicit opportunity attribution', adminA, adminB,
    c => rpc(c, 'partner_network_resolve_lead', [uid(203), 'accept', { opportunity_id: 'race-existing-opp', reason: 'Existing opportunity ownership reviewed' }]),
    c => rpc(c, 'partner_network_resolve_lead', [uid(204), 'accept', { opportunity_id: 'race-existing-opp', reason: 'Existing opportunity ownership reviewed' }]),
    async (_, second) => {
      assert.match(second.error?.message || '', /opportunity_already_attributed/);
      assert.equal(await scalar(owner, "select count(*)::int from public.partner_network_referrals where opportunity_id='race-existing-opp' and status='accepted'"), 1);
    });

  await owner.query("insert into public.orders(id,type,status) values('race-manual-link','wholesale','confirmed')");
  await race('order attribution', adminA, adminB,
    c => rpc(c, 'partner_network_link_order', [uid(201), 'race-manual-link', 'First verified origin']),
    c => rpc(c, 'partner_network_link_order', [uid(203), 'race-manual-link', 'Second verified origin']),
    async (_, second) => {
      assert.match(second.error?.message || '', /order_already_attributed/);
      assert.equal(await scalar(owner, "select count(*)::int from public.partner_network_order_links where order_id='race-manual-link'"), 1);
    });

  await seedOrder('race-reconcile', uid(201));
  await race('same-order reconciliation', adminA, adminB,
    c => rpc(c, 'partner_network_reconcile', ['race-reconcile', review('First independent review')]),
    c => rpc(c, 'partner_network_reconcile', ['race-reconcile', review('Second independent review')]),
    async (_, second) => {
      assert.ifError(second.error);
      assert.equal(await scalar(owner, "select count(*)::int from public.partner_network_commissions where order_id='race-reconcile'"), 1);
      assert.equal(await scalar(owner, "select review_note from public.partner_network_commissions where order_id='race-reconcile'"), 'Second independent review');
    });

  const paidCandidate = await rpc(adminA, 'partner_network_reconcile', ['race-reconcile', review('Final verified review')]);
  await rpc(adminA, 'partner_network_commission_action', [paidCandidate.id, 'approve', {}]);
  const payout = { amount: 30000, reference: 'isolated-recorded-payment', paid_at: new Date().toISOString() };
  await race('commission payment exactly once', adminA, adminB,
    c => rpc(c, 'partner_network_commission_action', [paidCandidate.id, 'pay', payout]),
    c => rpc(c, 'partner_network_commission_action', [paidCandidate.id, 'pay', payout]),
    async (_, second) => {
      assert.match(second.error?.message || '', /paid_commission_immutable/);
      assert.equal(await scalar(owner, "select paid_amount::numeric from public.partner_network_commissions where id=$1", [paidCandidate.id]), '30000.00');
      assert.equal(await scalar(owner, "select count(*)::int from public.partner_network_audit where entity='partner_network_commissions' and entity_id=$1 and after_data->>'status'='paid'", [paidCandidate.id]), 1);
    });

  await seedOrder('race-link-payout', uid(201));
  const linkPayout = await rpc(adminA, 'partner_network_reconcile', ['race-link-payout', review('Reviewed for link/payment lock-order regression')]);
  await rpc(adminA, 'partner_network_commission_action', [linkPayout.id, 'approve', {}]);
  await race('manual-link retry versus payment lock order', financialWriter, adminB,
    async c => {
      // Test fixture owns rows so it can arrange the precise interleaving;
      // the actual payout RPC still runs under the authenticated role.
      await c.query("select 1 from public.orders where id='race-link-payout' for update");
      await c.query('set local role authenticated');
    },
    c => rpc(c, 'partner_network_link_order', [uid(201), 'race-link-payout', 'Retry previously verified origin']),
    async (_, second) => {
      assert.ifError(second.error);
      assert.equal(second.value.referral_id, uid(201));
      assert.equal(await scalar(owner, 'select status from public.partner_network_commissions where id=$1', [linkPayout.id]), 'paid');
    },
    c => rpc(c, 'partner_network_commission_action', [linkPayout.id, 'pay', payout]));

  await seedOrder('race-cash-change', uid(201));
  const staleCandidate = await rpc(adminA, 'partner_network_reconcile', ['race-cash-change', review('Verified before payment reversal')]);
  await rpc(adminA, 'partner_network_commission_action', [staleCandidate.id, 'approve', {}]);
  await race('cash reversal invalidates payout', financialWriter, adminB,
    async c => {
      await c.query("select 1 from public.receivables where id='recv-race-cash-change' for update");
      await c.query("delete from public.receivable_payments where id='cash-race-cash-change'");
      await c.query("update public.receivables set paid=0,status='open' where id='recv-race-cash-change'");
    },
    c => rpc(c, 'partner_network_commission_action', [staleCandidate.id, 'pay', payout]),
    async (_, second) => {
      assert.match(second.error?.message || '', /commission_stale_reconcile_required/);
      assert.equal(await scalar(owner, 'select paid_amount::numeric from public.partner_network_commissions where id=$1', [staleCandidate.id]), null);
      assert.equal(await scalar(owner, 'select status from public.partner_network_commissions where id=$1', [staleCandidate.id]), 'approved');
    });

  const eventMigration = await readFile(new URL('../supabase/migrations/0086_partner_order_link_events.sql', import.meta.url), 'utf8');
  const eventAssertions = await readFile(new URL('./sql/partner-order-link-events.sql', import.meta.url), 'utf8');
  await owner.query(eventMigration);
  await owner.query(eventAssertions);
  const eventSqlCount = (eventAssertions.match(/public\.test_(?:assert|error)\(/g) || []).length;
  console.log(`Order-link events: ${eventSqlCount} SQL assertions passed.`);
  console.log(`Migration 0086 SHA256: ${createHash('sha256').update(eventMigration).digest('hex')}`);

  const quoteWriter = await client();
  await quoteWriter.query("select set_config('request.jwt.claim.sub',$1,false)", [uid(1)]);
  await owner.query("insert into public.orders(id,ts,type,status) values('race-auto-manual-link',now(),'wholesale','confirmed')");
  await owner.query("insert into public.trade_quotes(id,opportunity_id) values('race-delayed-quote','race-existing-opp')");
  await race('automatic quote link versus manual order attribution', financialWriter, quoteWriter,
    async c => {
      await c.query("select 1 from public.orders where id='race-auto-manual-link' for update");
      await c.query('set local role authenticated');
    },
    c => c.query("update public.trade_quotes set converted_order_id='race-auto-manual-link' where id='race-delayed-quote'"),
    async (_, second) => {
      assert.ifError(second.error);
      assert.equal(await scalar(owner, "select referral_id::text from public.partner_network_order_links where order_id='race-auto-manual-link'"), uid(201));
      assert.equal(await scalar(owner, "select source from public.partner_network_order_links where order_id='race-auto-manual-link'"), 'manual');
      assert.equal(await scalar(owner, "select count(*)::int from public.partner_network_order_links where order_id='race-auto-manual-link'"), 1);
    },
    c => rpc(c, 'partner_network_link_order', [uid(201), 'race-auto-manual-link', 'Explicit origin confirmed while quote event waits']));

  // A batch must lock all target orders before creating the first link. Otherwise
  // its first link's referral FK lock can invert against a manual link on order B.
  await owner.query("insert into public.wholesale_accounts(id,business_name) values('race-batch-account','Synthetic batch customer')");
  await owner.query("insert into public.orders(id,ts,type,status,partner_account_id) values('race-batch-a',now(),'wholesale','confirmed','race-batch-account'),('race-batch-b',now(),'wholesale','confirmed','race-batch-account')");
  await race('multi-order account event versus manual link', financialWriter, quoteWriter,
    async c => {
      await c.query("select 1 from public.orders where id='race-batch-b' for update");
      await c.query('set local role authenticated');
    },
    c => c.query("update public.wholesale_accounts set opportunity_id='opp-referral-00000000-0000-4000-8000-000000000201' where id='race-batch-account'"),
    async (_, second) => {
      assert.ifError(second.error);
      assert.equal(await scalar(owner, "select source from public.partner_network_order_links where order_id='race-batch-a'"), 'account');
      assert.equal(await scalar(owner, "select source from public.partner_network_order_links where order_id='race-batch-b'"), 'manual');
      assert.equal(await scalar(owner, "select count(*)::int from public.partner_network_order_links where order_id in ('race-batch-a','race-batch-b') and referral_id=$1", [uid(201)]), 2);
    },
    c => rpc(c, 'partner_network_link_order', [uid(201), 'race-batch-b', 'Explicit second-order origin during account batch']));

  // Trusted fixture seeding creates legacy structurally related, unlinked orders;
  // triggers are immediately restored before any real concurrent operation.
  await owner.query("insert into public.wholesale_accounts(id,business_name,opportunity_id) values('race-refresh-account','Synthetic legacy customer','opp-referral-00000000-0000-4000-8000-000000000201')");
  await owner.query('alter table public.orders disable trigger partner_network_order_link_event');
  try {
    await owner.query("insert into public.orders(id,ts,type,status,partner_account_id) values('race-refresh-a',now(),'wholesale','confirmed','race-refresh-account'),('race-refresh-b',now(),'wholesale','confirmed','race-refresh-account')");
  } finally {
    await owner.query('alter table public.orders enable trigger partner_network_order_link_event');
  }
  await race('manager structural refresh versus manual link', financialWriter, adminB,
    async c => {
      await c.query("select 1 from public.orders where id='race-refresh-b' for update");
      await c.query('set local role authenticated');
    },
    c => rpc(c, 'partner_network_admin_snapshot', []),
    async (_, second) => {
      assert.ifError(second.error);
      assert.equal(await scalar(owner, "select source from public.partner_network_order_links where order_id='race-refresh-a'"), 'account');
      assert.equal(await scalar(owner, "select source from public.partner_network_order_links where order_id='race-refresh-b'"), 'manual');
      assert.equal(await scalar(owner, "select count(*)::int from public.partner_network_order_links where order_id in ('race-refresh-a','race-refresh-b') and referral_id=$1", [uid(201)]), 2);
    },
    c => rpc(c, 'partner_network_link_order', [uid(201), 'race-refresh-b', 'Explicit second-order origin during manager refresh']));

  console.log(`Partner Network genuine PostgreSQL: ${sqlCount} core SQL assertions, ${eventSqlCount} event SQL assertions and ${concurrencyCases} independent-connection concurrency cases passed. No production database used.`);
} catch (error) {
  console.error(JSON.stringify({ message: error.message, detail: error.detail, hint: error.hint, where: error.where, stack: error.stack }, null, 2));
  process.exitCode = 1;
} finally {
  await Promise.allSettled(clients.map(connection => connection.end()));
  await cluster.stop();
  await rm(directory, { recursive: true, force: true });
}
// The embedded package has an asynchronous beforeExit hook which defaults to 0;
// explicitly preserve a failed assertion's exit code after stopping our cluster.
if (process.exitCode) process.exit(process.exitCode);
