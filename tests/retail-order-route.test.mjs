import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { retailOptions } from '../lib/retail-catalog.js';

// Run the actual public route and validation helpers. Catalogue/database access
// is isolated so these tests cannot place orders or contact a real backend.
const backendUrl = 'data:text/javascript,' + encodeURIComponent(`
  let config, state;
  export function fixture(value) { config = value; state = { clients: 0, loads: [], calls: [] }; return state; }
  export function retailPublicClient() {
    state.clients++;
    return { async rpc(name, args) {
      state.calls.push({ name, args });
      if (config.rpcThrow) throw new Error(config.rpcThrow);
      return { data: config.data === undefined ? (name === 'partner_network_retail_receipt' ? config.receipt || null : { orderId: 'test-order', total: 50000 }) : config.data, error: config.error || null };
    } };
  }
  export const createAdminClient = retailPublicClient;
  export const partnerNetworkEnabled = () => true;
  export async function loadRetailProducts(client, ids) {
    state.loads.push(ids);
    if (config.loadError) throw new Error(config.loadError);
    return config.products || [];
  }
`);
registerHooks({ resolve(specifier, context, next) {
  if (specifier === '@/lib/retail-catalog-server' || specifier === '@/lib/supabase/admin' || specifier === '@/lib/partner-network-server') return { url: backendUrl, shortCircuit: true };
  if (specifier.startsWith('@/')) return next(pathToFileURL(path.resolve(specifier.slice(2) + '.js')).href, context);
  return next(specifier, context);
} });
const { fixture } = await import(backendUrl);
const { POST } = await import('../app/api/retail-order/route.js');

const product = { id: 'tea-a', available: true, line: 'everyday', name: { vi: 'Trà thử', en: 'Test tea' }, variants: [{ weight: '1 viên (8g)', price: 25000, stockSocSon: 4 }] };
const snapshots = products => products.flatMap(retailOptions).map(option => ({ key: option.key, price: option.price, unit: option.unit, weight: option.weight, packing: option.product.packSize || '' }));
const input = () => ({ requestId: '00000000-0000-4000-8000-000000000901', cart: { 'tea-a__1 viên (8g)': 2 }, expectedTotal: 50000, expectedLines: snapshots([product]), customer: { name: 'Test buyer', contact: 'buyer@example.test', address: 'Test address', consent: true, payment: 'qr' } });
const send = (payload, headers = {}) => POST(new Request('http://localhost/api/retail-order', { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: typeof payload === 'string' ? payload : JSON.stringify(payload) }));

test('invalid checkout or foreign origin never touches catalogue or order RPC', async () => {
  const state = fixture({ products: [product] });
  const invalid = input(); invalid.customer.consent = false;
  assert.equal((await send(invalid)).status, 400);
  assert.equal((await send('{broken')).status, 400);
  assert.equal((await send('x'.repeat(20001))).status, 400);
  assert.equal((await send(input(), { Origin: 'https://other.example.test' })).status, 403);
  assert.equal(state.clients, 0);
  assert.deepEqual(state.calls, []);
});

test('public route submits fresh catalogue lines, whole package quantities and recomputed totals', async () => {
  const state = fixture({ products: [product] });
  const payload = { ...input(), lines: [{ name: 'fake', price: 1, qty: 999, unit: 'kg' }], estimatedTotal: 1 };
  const response = await send(payload, { Origin: 'http://localhost' });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { orderId: 'test-order', total: 50000 });
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.equal(state.loads.length, 1);
  assert.equal(state.calls.length, 2);
  assert.equal(state.calls[0].name, 'partner_network_retail_receipt');
  assert.equal(state.calls[1].name, 'submit_partner_retail_order');
  const args = state.calls[1].args.p_input;
  assert.equal(args.lines[0].price, 25000);
  assert.equal(args.lines[0].unit, 'viên');
  assert.equal(args.lines[0].qty, 2);
  assert.equal(args.total, 50000);
  assert.equal(args.total_items, 2);
  assert.equal(Object.hasOwn(args,'p_promo'), false);
});

test('stale expected total or current stock refuses an order before database mutation', async () => {
  let state = fixture({ products: [product] });
  const stale = input(); stale.expectedTotal = 40000;
  let response = await send(stale);
  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), { error: 'price_changed' });
  assert.equal(state.calls.filter(call=>call.name==='submit_partner_retail_order').length, 0);
  state = fixture({ products: [{ ...product, variants: [{ ...product.variants[0], stockSocSon: 1 }] }] });
  response = await send(input());
  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), { error: 'cart_changed' });
  assert.equal(state.calls.filter(call=>call.name==='submit_partner_retail_order').length, 0);
});

test('transactional stock race returns a safe conflict code without database details', async () => {
  fixture({ products: [product], error: { message: 'out_of_stock:secret internal product information' } });
  const response = await send(input());
  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), { error: 'out_of_stock' });
});

test('same-total unit and packaging changes are blocked before an order write', async () => {
  const loose = { id: 'loose', available: true, line: 'everyday', price: 25000, name: { vi: 'Trà rời' } };
  const payload = { ...input(), cart: { loose: 2 }, expectedLines: snapshots([loose]) };
  for (const current of [{ ...loose, line: 'reserve' }, { ...loose, packSize: '1kg, 5kg' }]) {
    const state = fixture({ products: [current] });
    const response = await send(payload);
    assert.equal(response.status, 409);
    assert.deepEqual(await response.json(), { error: 'cart_changed' });
    assert.equal(state.calls.filter(call=>call.name==='submit_partner_retail_order').length, 0);
  }
});

test('offsetting line price changes are blocked despite an unchanged order total', async () => {
  const first = { id: 'first', available: true, line: 'everyday', price: 20000, packSize: 'Viên', name: { vi: 'Trà một' } };
  const second = { ...first, id: 'second', price: 30000, name: { vi: 'Trà hai' } };
  const state = fixture({ products: [{ ...first, price: 25000 }, { ...second, price: 25000 }] });
  const payload = { ...input(), cart: { first: 1, second: 1 }, expectedLines: snapshots([first, second]) };
  const response = await send(payload);
  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), { error: 'price_changed' });
  assert.equal(state.calls.filter(call=>call.name==='submit_partner_retail_order').length, 0);
});

test('backend errors and missing result stay generic and do not reflect private details', async () => {
  for (const fields of [{ error: { message: 'secret backend credential' } }, { loadError: 'secret backend credential' }, { rpcThrow: 'secret backend credential' }, { data: [] }]) {
    fixture({ products: [product], ...fields });
    const response = await send(input());
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: 'order_unavailable' });
  }
});


test('durable receipt recovers a lost response before catalogue stock can reject retry', async () => {
 const state=fixture({products:[],loadError:'catalogue unavailable',receipt:{orderId:'existing-order',total:50000}});
 const response=await send(input());assert.equal(response.status,200);
 assert.deepEqual(await response.json(),{orderId:'existing-order',total:50000});
 assert.equal(state.loads.length,0);assert.equal(state.calls.length,1);
});
test('partner checkout sends only explicit named consent and rejects identity tampering', async () => {
 const state=fixture({products:[product]});const payload={...input(),partner:{slug:'retail-partner-a',revision:2,consent:true}};
 assert.equal((await send(payload)).status,200);
 assert.deepEqual(state.calls.at(-1).args.p_partner,payload.partner);
 assert.match(state.calls[0].args.p_fingerprint,/^[0-9a-f]{64}$/);
 for(const bad of [{...payload,partner:{...payload.partner,consent:false}},{...payload,partner:{...payload.partner,partner_id:'forged'}},{...payload,partnerId:'forged'}]){
  const status=(await send(bad)).status;assert.equal(status,400);
 }
});
test('unavailable partner fails explicitly and never creates a direct fallback order', async () => {
 const state=fixture({products:[product],error:{message:'retail_partner_unavailable: private details'}});
 const response=await send({...input(),partner:{slug:'retail-partner-a',revision:1,consent:true}});
 assert.equal(response.status,409);assert.deepEqual(await response.json(),{error:'retail_partner_unavailable'});
 assert.equal(state.calls.length,1);
});
