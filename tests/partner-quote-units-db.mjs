// Disposable PostgreSQL-compatible execution; no real data or Supabase access.
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
if (!process.env.PGLITE_MODULE) throw new Error('Set PGLITE_MODULE to an isolated PGlite installation.');
const { PGlite } = await import(pathToFileURL(process.env.PGLITE_MODULE).href);
const db = new PGlite();
try {
  await db.exec(await readFile(new URL('./sql/partner-quote-units-fixture.sql', import.meta.url), 'utf8'));
  await db.exec(await readFile(new URL('../supabase/migrations/0085_partner_quote_units.sql', import.meta.url), 'utf8'));
  const assertions = await readFile(new URL('./sql/partner-quote-units.sql', import.meta.url), 'utf8');
  await db.exec(assertions);
  console.log(`Partner quote units SQL: ${(assertions.match(/test_(?:assert|error)\(/g) || []).length} assertions passed.`);
} catch (error) {
  console.error(JSON.stringify({ message: error.message, detail: error.detail, where: error.where }, null, 2));
  process.exitCode = 1;
} finally { await db.close(); }
