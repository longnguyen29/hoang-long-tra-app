import test from 'node:test';
import assert from 'node:assert/strict';
import { ASSISTANT_INPUT_LIMIT, buildAssistantRequest, normalizeAssistantText, parseAssistantResponse } from '../lib/assistant-extract.js';

const source = 'Chị Mai muốn thử hồng trà mật, 2 kg. SĐT 0900000000. Gửi mẫu thứ hai.';
const draft = () => ({
  summary: 'Khách hỏi mẫu.',
  customer: { name: 'Mai', phone: '0900000000', address: '' },
  items: [{ product: 'hồng trà mật', quantity: '2', unit: 'kg', price: '' }],
  tasks: [{ title: 'Gửi mẫu', due_date: '' }], missing: ['Địa chỉ'], warnings: [],
  evidence: [
    { field: 'customer.name', quote: 'Chị Mai' }, { field: 'customer.phone', quote: '0900000000' },
    { field: 'items.0.product', quote: 'hồng trà mật' }, { field: 'items.0.quantity', quote: '2 kg' },
    { field: 'items.0.unit', quote: '2 kg' }, { field: 'tasks.0.title', quote: 'Gửi mẫu' },
  ],
});
const response = obj => ({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(obj) }] }], usage: { input_tokens: 100, output_tokens: 30 } });

test('input limits reject rather than silently truncating conversations', () => {
  assert.equal(normalizeAssistantText({ text: ' abc ' }), 'abc');
  for (const text of ['', 'ab', 'x'.repeat(ASSISTANT_INPUT_LIMIT + 1)]) assert.throws(() => normalizeAssistantText({ text }), /invalid_input/);
  assert.throws(() => normalizeAssistantText({ text: {} }), /invalid_input/);
});

test('request has strict schema, data-only instruction, no tools and no state storage', () => {
  const req = buildAssistantRequest({ text: source, model: 'gpt-6-luna', safetyIdentifier: 'hash' });
  assert.equal(req.store, false);
  assert.equal(req.text.format.strict, true);
  assert.equal(req.tools, undefined);
  assert.match(req.instructions, /không đáng tin/);
  assert.equal(req.input, source);
});

test('reads actual Responses API output and only preserves quoted facts', () => {
  const result = parseAssistantResponse(response(draft()), source);
  assert.equal(result.draft.customer.phone, '0900000000');
  assert.equal(result.draft.items[0].product, 'hồng trà mật');
  assert.equal(result.draft.tasks[0].title, 'Gửi mẫu');
  assert.deepEqual(result.usage, { inputTokens: 100, outputTokens: 30 });
});

test('removes details with fabricated or missing source quotes', () => {
  const d = draft();
  d.customer.address = 'Số 1 Hà Nội';
  d.evidence.push({ field: 'customer.address', quote: 'Số 1 Hà Nội' });
  d.items[0].price = '100000';
  d.tasks[0].due_date = '2026-11-20';
  d.evidence.push({ field: 'tasks.0.due_date', quote: '20/11/2026' });
  const result = parseAssistantResponse(response(d), source);
  assert.equal(result.draft.customer.address, '');
  assert.equal(result.draft.items[0].price, '');
  assert.equal(result.draft.tasks[0].due_date, '');
  assert.ok(result.draft.warnings.some(w => w.includes('đoạn trích')));
  assert.ok(result.draft.evidence.every(item => source.includes(item.quote)));
});

test('fails closed on incomplete output, refusal and malformed schema', () => {
  assert.throws(() => parseAssistantResponse({ ...response(draft()), status: 'incomplete' }, source), /invalid_ai_response/);
  assert.throws(() => parseAssistantResponse({ status: 'completed', output: [{ content: [{ type: 'refusal', refusal: 'no' }] }] }, source), /ai_refused/);
  assert.throws(() => parseAssistantResponse(response({}), source), /invalid_ai_response/);
});

test('evidence indices remain aligned after unsupported items are removed', () => {
  const d = draft();
  d.items.unshift({ product: 'bịa', quantity: '', unit: '', price: '' });
  d.evidence = d.evidence.map(e => e.field.startsWith('items.0.') ? { ...e, field: e.field.replace('items.0.', 'items.1.') } : e);
  const result = parseAssistantResponse(response(d), source);
  assert.equal(result.draft.items.length, 1);
  assert.equal(result.draft.items[0].product, 'hồng trà mật');
  assert.ok(result.draft.evidence.some(e => e.field === 'items.0.product' && e.quote === 'hồng trà mật'));
});
