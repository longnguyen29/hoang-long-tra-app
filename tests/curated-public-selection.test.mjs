import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCuratedSelections } from '../components/public/curatedSelection.js';

const verified = { product_id: 'tea-one', batch_code: 'B-42', producer_name: 'Nhà trà A', supplier_name: 'Đối tác A', tasted_on: '2026-10-30', public_note: 'Hương hoa nhẹ' };

test('a complete public approval maps the exact reference batch and tasting date', () => {
  assert.deepEqual(normalizeCuratedSelections([verified]), [{ productId: 'tea-one', batchCode: 'B-42', producerName: 'Nhà trà A', supplierName: 'Đối tác A', tastedOn: '2026-10-30', publicNote: 'Hương hoa nhẹ' }]);
});

test('missing data, malformed RPC responses, and ambiguous products never yield a badge', () => {
  assert.deepEqual(normalizeCuratedSelections(null), []);
  assert.deepEqual(normalizeCuratedSelections([{...verified, tasted_on: ''}, {...verified, producer_name: ''}]), []);
  assert.deepEqual(normalizeCuratedSelections([verified, {...verified, batch_code: 'B-43'}]), []);
});

test('malformed tasting dates never receive a badge', () => {
  for (const tasted_on of ['2026-02-30', '2026-13-01', '2026-10-30extra']) {
    assert.deepEqual(normalizeCuratedSelections([{ ...verified, tasted_on }]), []);
  }
});
