import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

registerHooks({ resolve(specifier, context, next) {
  if (specifier === "@/lib/supabase/admin") {
    return { url: "data:text/javascript,export const createAdminClient = () => { throw new Error('Use a test database') };", shortCircuit: true };
  }
  if (specifier === "@/lib/customer-memory-core") {
    return next(new URL("../lib/customer-memory-core.js", import.meta.url).href, context);
  }
  return next(specifier, context);
} });

const { generateDraft, readCustomerMemory } = await import("../lib/customer-memory-server.js");

function memoryFixture(tables) {
  return { from(table) {
    const filters = [];
    const ordering = [];
    let rowLimit = Infinity;
    let patch;
    function result() {
      const rows = (tables[table] || []).filter(row => filters.every(match => match(row)));
      rows.sort((a, b) => {
        for (const [key, ascending] of ordering) {
          if (a[key] !== b[key]) return (a[key] < b[key] ? -1 : 1) * (ascending ? 1 : -1);
        }
        return 0;
      });
      if (patch) rows.forEach(row => Object.assign(row, patch));
      return rows.slice(0, rowLimit);
    }
    return {
      select() { return this; },
      eq(key, value) { filters.push(row => row[key] === value); return this; },
      neq(key, value) { filters.push(row => row[key] !== value); return this; },
      lte(key, value) { filters.push(row => row[key] <= value); return this; },
      in(key, values) { filters.push(row => values.includes(row[key])); return this; },
      order(key, { ascending } = {}) { ordering.push([key, ascending]); return this; },
      limit(value) { rowLimit = value; return this; },
      update(value) { patch = value; return this; },
      async insert() { return { error: null }; },
      async single() { const [data] = result(); return { data, error: !data }; },
      async maybeSingle() { const [data] = result(); return { data, error: null }; },
      then(resolve) { return resolve({ data: result(), error: null }); },
    };
  } };
}

test("opens a linked customer thread older than the most recent 100", async () => {
  const threads = Array.from({ length: 101 }, (_, i) => ({ id: String(i), last_message_at: i }));
  const message = { id: "message", thread_id: "0", occurred_at: 1 };
  const db = memoryFixture({ customer_memory_threads: threads, customer_memory_messages: [message] });
  const result = await readCustomerMemory(db, "0");
  assert.equal(result.threads[0].id, "100");
  assert.equal(result.threads.at(-1).id, "0");
  assert.deepEqual(result.messages, [message]);
  await assert.rejects(readCustomerMemory(db, "missing"), /thread_not_found/);
});

test("regenerates for the draft's target even when more than 16 newer messages exist", async t => {
  const originalEnv = process.env;
  process.env = {
    ...originalEnv,
    OPENAI_API_KEY: "test-key",
    TELEGRAM_BOT_TOKEN: "",
    CUSTOMER_MEMORY_TELEGRAM_BOT_TOKEN: "",
  };
  t.after(() => { process.env = originalEnv; });
  const thread = { id: "thread", display_name: "Test" };
  const draft = { id: "draft", thread_id: thread.id, message_id: "target", status: "processing" };
  const messages = Array.from({ length: 41 }, (_, i) => ({
    id: i === 20 ? "target" : String(i), thread_id: thread.id,
    body: "Message " + i, direction: "inbound",
    occurred_at: new Date(Date.UTC(2026, 0, 1, i)).toISOString(),
  }));
  const db = memoryFixture({
    customer_memory_threads: [thread],
    customer_memory_messages: messages,
    customer_memory_drafts: [draft],
  });
  const request = t.mock.method(globalThis, "fetch", async () => Response.json({
    output_text: JSON.stringify({ reply: "Draft for target", summary: "", next_action: "", facts: [] }),
  }));
  assert.equal((await generateDraft(draft.id, db)).draft_status, "draft");
  assert.equal(request.mock.callCount(), 1);
  const [, options] = request.mock.calls[0].arguments;
  const context = JSON.parse(JSON.parse(options.body).input).messages;
  assert.equal(context.length, 16);
  assert.equal(context[0].text, "Message 5");
  assert.equal(context.at(-1).text, "Message 20");
  assert.equal(draft.body, "Draft for target");
});
