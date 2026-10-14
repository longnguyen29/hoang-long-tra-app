import test from 'node:test';
import assert from 'node:assert/strict';
import { PARTNER_COMMISSION_TIERS, getCommissionTier, applyCommissionTier, getMatchingCommissionTier, companyDocumentTierPatch } from './partner-commission-tiers.js';

test('tier suggestions have explicit first and limited repeat rates without inventing an expiry or bonus', () => {
  assert.deepEqual(applyCommissionTier('referral'), { commission_basis: 'profit', first_order_rate_percent: 3, repeat_rate_percent: 1, repeat_order_limit: 3 });
  assert.deepEqual(applyCommissionTier('assisted'), { commission_basis: 'profit', first_order_rate_percent: 5, repeat_rate_percent: 2, repeat_order_limit: 3 });
  assert.equal(getCommissionTier('referral').label, 'Giới thiệu khách');
  assert.equal(getCommissionTier('missing'), null);
  assert.throws(() => applyCommissionTier('missing'), /unknown_commission_tier/);
  assert.equal(JSON.stringify(PARTNER_COMMISSION_TIERS).includes('expiry'), false);
  assert.equal(JSON.stringify(PARTNER_COMMISSION_TIERS).includes('bonus'), false);
});

test('negotiated bulk terms clear both rates as unknown instead of granting a zero or default fee', () => {
  const current = { first_order_rate_percent: 5, repeat_rate_percent: 2, repeat_order_limit: 3, fee_per_kg: 5000 };
  assert.deepEqual(applyCommissionTier('negotiated', current), { commission_basis: 'profit', first_order_rate_percent: null, repeat_rate_percent: null, repeat_order_limit: 0 });
  assert.equal(current.first_order_rate_percent, 5);
  assert.equal(Object.hasOwn(applyCommissionTier('negotiated', current), 'fee_per_kg'), false);
});

test('custom retains existing editable numbers, unknowns, blanks and explicit zero without source identity leakage', () => {
  const values = { first_order_rate_percent: '', repeat_rate_percent: 0, repeat_order_limit: '0', partner_id: 'PRIVATE', terms: 'PRIVATE-TERMS', internal_notes: 'PRIVATE-NOTES', approved_amount: 100, margin: 0.3 };
  assert.deepEqual(applyCommissionTier('custom', values), { commission_basis: 'revenue', first_order_rate_percent: '', repeat_rate_percent: 0, repeat_order_limit: '0' });
  assert.deepEqual(applyCommissionTier('custom', {}), { commission_basis: 'revenue', first_order_rate_percent: null, repeat_rate_percent: null, repeat_order_limit: null });
  assert.equal(applyCommissionTier('custom', { first_order_rate_percent: 0, default_rate_percent: 9 }).first_order_rate_percent, 0);
  assert.equal(applyCommissionTier('custom', { first_order_rate_percent: null, default_rate_percent: 3 }).first_order_rate_percent, 3);
  assert.equal(applyCommissionTier('custom', { first_order_rate_percent: 'bad-input' }).first_order_rate_percent, 'bad-input'); // Leave invalid draft input visible for correction.
  assert.equal(applyCommissionTier('custom', { first_order_rate_percent: { bank: 'PRIVATE' } }).first_order_rate_percent, null);
  assert.equal(applyCommissionTier('custom', { repeat_rate_percent: Infinity }).repeat_rate_percent, null);
});

test('matching rates distinguishes missing values from zero and rejects invalid financial shapes', () => {
  assert.equal(getMatchingCommissionTier({ commission_basis: 'profit', first_order_rate_percent: '3.00', repeat_rate_percent: '1', repeat_order_limit: '3' }), 'referral');
  assert.equal(getMatchingCommissionTier({ commission_basis: 'profit', default_rate_percent: 5, repeat_rate_percent: 2, repeat_order_limit: 3 }), 'assisted');
  assert.equal(getMatchingCommissionTier({ commission_basis: 'profit', first_order_rate_percent: null, repeat_rate_percent: '', repeat_order_limit: 0 }), 'negotiated');
  assert.equal(getMatchingCommissionTier({ commission_basis: 'profit', first_order_rate_percent: 0, repeat_rate_percent: 0, repeat_order_limit: 0 }), 'custom');
  assert.equal(getMatchingCommissionTier({}), 'custom');
  assert.equal(getMatchingCommissionTier({ commission_basis: 'profit', first_order_rate_percent: Infinity, repeat_rate_percent: null, repeat_order_limit: 0 }), 'custom');
  for (const first_order_rate_percent of [true, Infinity, NaN, -1, 101, '3e0', {}, []]) assert.equal(getMatchingCommissionTier({ commission_basis: 'profit', first_order_rate_percent, repeat_rate_percent: 1, repeat_order_limit: 3 }), 'custom');
  assert.equal(getMatchingCommissionTier({ commission_basis: 'profit', first_order_rate_percent: 3, repeat_rate_percent: 1, repeat_order_limit: 3.5 }), 'custom');
});

test('applying a new tier explicitly chooses profit; custom and rate matching cannot migrate an old revenue agreement', () => {
  const legacy = { commission_basis: 'revenue', first_order_rate_percent: 3, repeat_rate_percent: 1, repeat_order_limit: 3 };
  assert.equal(getMatchingCommissionTier(legacy), 'custom');
  assert.deepEqual(applyCommissionTier('custom', legacy), legacy);
  assert.equal(applyCommissionTier('referral', legacy).commission_basis, 'profit');
  assert.equal(legacy.commission_basis, 'revenue');
  assert.equal(getMatchingCommissionTier({ ...legacy, commission_basis: 'profit' }), 'referral');
  assert.equal(applyCommissionTier('custom', { ...legacy, commission_basis: 'profit' }).commission_basis, 'profit');
  assert.equal(applyCommissionTier('custom', { ...legacy, commission_basis: { private: 'PRIVATE' } }).commission_basis, null);
  assert.match(getCommissionTier('assisted').description, /lãi sau toàn bộ chi phí/);
  assert.match(getCommissionTier('assisted').description, /trước hoa hồng/);
});

test('each application returns an independent patch and cannot mutate a template or another partner', () => {
  const a = applyCommissionTier('referral'), b = applyCommissionTier('referral');
  a.first_order_rate_percent = 99;
  assert.equal(b.first_order_rate_percent, 3);
  assert.equal(getCommissionTier('referral').values.first_order_rate_percent, 3);
  assert.ok(Object.isFrozen(PARTNER_COMMISSION_TIERS)); assert.ok(Object.isFrozen(getCommissionTier('referral').values));
});

test('company-document patches add a plain commercial role only, preserving custom clauses elsewhere', () => {
  const document = { first_order_rate_percent: 8, repeat_rate_percent: null, repeat_order_limit: 0, partner_role: 'Vai trò riêng', company_legal_name: 'LEGAL', settlement_terms: 'KEEP', internal_cost_total: 100 };
  assert.deepEqual(companyDocumentTierPatch('custom', document), { commission_basis: 'revenue', first_order_rate_percent: 8, repeat_rate_percent: null, repeat_order_limit: 0, partner_role: 'Vai trò riêng' });
  assert.deepEqual(companyDocumentTierPatch('assisted', document), { commission_basis: 'profit', first_order_rate_percent: 5, repeat_rate_percent: 2, repeat_order_limit: 3, partner_role: 'Hỗ trợ chốt đơn' });
  assert.deepEqual(companyDocumentTierPatch('negotiated', document), { commission_basis: 'profit', first_order_rate_percent: null, repeat_rate_percent: null, repeat_order_limit: 0, partner_role: 'Bulk / xuất khẩu · thỏa thuận riêng' });
  assert.deepEqual({ ...document, ...companyDocumentTierPatch('referral', document) }.settlement_terms, 'KEEP');
  assert.equal(Object.hasOwn(companyDocumentTierPatch('referral', document), 'internal_cost_total'), false);
  assert.equal(Object.hasOwn(companyDocumentTierPatch('referral', document), 'company_legal_name'), false);
  assert.equal(companyDocumentTierPatch('custom', { partner_role: { private: 'PRIVATE' } }).partner_role, '');
});
