import test from 'node:test';
import assert from 'node:assert/strict';
import { loadMapIndex, loadMapStory } from './system-map.js';

function database(seed) {
  const queried = [];
  const from = table => {
    queried.push(table);
    let result = seed[table] || [];
    const filter = predicate => { result = result.filter(predicate); return query; };
    const query = {
      select: () => query, order: () => query,
      eq: (key, value) => filter(row => row[key] === value),
      in: (key, values) => filter(row => values.includes(row[key])),
      is: (key, value) => filter(row => row[key] === value),
      neq: (key, value) => filter(row => row[key] !== value),
      limit: count => { result = result.slice(0, count); return query; },
      then: resolve => Promise.resolve({ data: result }).then(resolve),
    };
    return query;
  };
  return { from, queried };
}

const all = { sales: true, operations: true, procedures: true };
test('linked order joins quote, actual allocations, procedure and payments by saved IDs', async () => {
  const db = database({
    orders: [{ id: 'o', quote_id: 'quote', contact: 'contact' }, { id: 'later', reorder_of_order_id: 'o' }],
    trade_opportunities: [{ id: 'customer', contact: 'contact' }],
    trade_quotes: [{ id: 'quote', opportunity_id: 'customer', converted_order_id: 'o' }],
    sample_requests: [{ id: 's', opportunity_id: 'customer' }, { id: 'other', opportunity_id: 'another' }],
    order_batch_allocations: [{ id: 'a', order_id: 'o', tea_batches: { code: 'B1' } }],
    procedure_runs: [{ id: 'run', order_id: 'o' }],
    receivables: [{ id: 'r', order_id: 'o' }],
    receivable_payments: [{ id: 'p', receivable_id: 'r' }, { id: 'outside', receivable_id: 'other' }],
  });
  const story = await loadMapStory(db, 'order', 'o', all);
  assert.equal(story.sales.suggested, false);
  assert.deepEqual(story.sales.samples.map(item => item.id), ['s']);
  assert.equal(story.allocations[0].tea_batches.code, 'B1');
  assert.equal(story.procedure.id, 'run');
  assert.deepEqual(story.payments.map(item => item.id), ['p']);
  assert.deepEqual(story.laterOrders.map(item => item.id), ['later']);
});

test('contact-only match is tentative, ambiguous matches stay unlinked, and access restrictions skip reads', async () => {
  const orders = [{ id: 'o', contact: 'same' }];
  const customer = { id: 'customer', contact: 'same' };
  const single = await loadMapStory(database({ orders, trade_opportunities: [customer] }), 'order', 'o', all);
  assert.equal(single.sales.suggested, true);
  const ambiguous = await loadMapStory(database({ orders, trade_opportunities: [customer, { ...customer, id: 'second' }] }), 'order', 'o', all);
  assert.equal(ambiguous.sales.customer, null);
  const limited = database({ orders });
  await loadMapStory(limited, 'order', 'o', {});
  assert.deepEqual([...new Set(limited.queried)], ['orders']);
});

test('active quote list excludes deals linked on either side, and staff assignments override inferred ownership', async () => {
  const db = database({
    orders: [{ id: 'o', quote_id: 'linked' }],
    trade_opportunities: [{ id: 'customer' }],
    trade_quotes: [
      { id: 'linked', opportunity_id: 'customer', status: 'accepted', converted_order_id: null },
      { id: 'done', opportunity_id: 'customer', status: 'accepted', converted_order_id: 'o' },
      { id: 'pending', opportunity_id: 'customer', status: 'accepted', converted_order_id: null },
    ],
    customer_directory_order_links: [{ order_id: 'o', opportunity_id: 'different' }],
  });
  const index = await loadMapIndex(db, true);
  assert.deepEqual(index.acceptedQuotes.map(item => item.id), ['pending']);
  const story = await loadMapStory(db, 'customer', 'customer', all);
  assert.equal(story.orders.length, 0);
});
