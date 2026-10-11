// Isolated PostgreSQL-compatible test; never contacts a Supabase project.
// npm install --prefix /private/tmp/hl-partner-db --no-save @electric-sql/pglite
// PGLITE_MODULE=/private/tmp/hl-partner-db/node_modules/@electric-sql/pglite/dist/index.js node tests/partner-network-db.mjs
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
const modulePath = process.env.PGLITE_MODULE;
if (!modulePath) throw new Error('Set PGLITE_MODULE to a separately installed PGlite module; no production database is used.');
const { PGlite } = await import(pathToFileURL(modulePath).href);
const db = new PGlite();
try {
  await db.exec(await readFile(new URL('./sql/partner-network-fixture.sql', import.meta.url),'utf8'));
  await db.exec(await readFile(new URL('../supabase/migrations/0084_b2b_partner_network.sql', import.meta.url),'utf8'));
  const assertions = await readFile(new URL('./sql/partner-network.sql', import.meta.url),'utf8');
  await db.exec(assertions);
  const counts = await db.query('select count(*)::int partners from public.partner_network_partners');
  const assertionCount = (assertions.match(/public\.test_(?:assert|error)\(/g) || []).length;
  console.log(`Partner Network SQL: ${assertionCount} assertions passed (${counts.rows[0].partners} isolated memberships).`);
} catch (error) {
  console.error(JSON.stringify({ message: error.message, detail: error.detail, hint: error.hint, position: error.position, where: error.where }, null, 2));
  process.exitCode = 1;
} finally { await db.close(); }
