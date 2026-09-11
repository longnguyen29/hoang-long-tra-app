import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceUrl, sourceKey, normalizeProspect, searchCandidates, discoveryQuery, teaSignals, outreachDraft } from './prospect-discovery.js';

test('unsafe URLs and missing identities cannot be saved', () => {
  for (const url of ['javascript:alert(1)', 'file:///tmp/x', 'http://localhost/a', 'http://127.0.0.1/a', 'https://user:pass@cafe.vn']) assert.equal(sourceUrl(url), '');
  assert.throws(() => normalizeProspect({name:'',source_url:'https://cafe.vn'}));
});
test('dedupe strips tracking but preserves different businesses on shared hosts', () => {
  assert.equal(sourceKey('https://www.cafe.vn/menu/?utm_source=x#menu'), sourceKey('http://cafe.vn/menu'));
  assert.notEqual(sourceKey('https://facebook.com/cafe-one'), sourceKey('https://facebook.com/cafe-two'));
  assert.notEqual(sourceKey('https://cafe.vn/?shop=one'), sourceKey('https://cafe.vn/?shop=two'));
});
test('search results remain unverified and location is not inferred from query', () => {
  const rows = searchCandidates({web:{results:[{title:'A',url:'https://cafe.vn',description:'<b>Trà sữa</b>'},{title:'A',url:'https://www.cafe.vn/?utm_source=x'},{title:'Bad',url:'javascript:alert(1)'}]}},'Hà Nội');
  assert.equal(rows.length,1); assert.equal(rows[0].region,''); assert.equal(rows[0].status,'research');
  assert.equal(rows[0].evidence_kind,'search_snippet'); assert.equal(rows[0].evidence,'Trà sữa');
  assert.deepEqual(searchCandidates({}),[]);
});
test('nationwide is default and unsupported segments are rejected', () => {
  assert.match(discoveryQuery(), /Việt Nam/); assert.match(discoveryQuery('Huế','fruit'), /Huế/);
  assert.throws(() => discoveryQuery('', 'bad'));
});
test('drafts require reviewed fit; suppression states never produce drafts', () => {
  for (const status of ['research','not_fit','do_not_contact']) assert.equal(outreachDraft({name:'Cafe',status}),'');
  assert.match(outreachDraft({name:'Cafe',status:'qualified'}),/Chào anh\/chị Cafe/);
  assert.equal(teaSignals('Chỉ có cà phê').length,0);
  assert.equal(teaSignals('TRÀ SỮA và trà trái cây').length,2);
});
