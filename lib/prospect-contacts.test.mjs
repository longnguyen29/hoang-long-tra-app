import test from 'node:test';
import assert from 'node:assert/strict';
import { extractContacts, normalizePhone, dedupeContacts } from './prospect-contacts.js';
test('extracts published links with provenance and no implied buyer role or consent', () => {
  const {contacts,contact_pages} = extractContacts('<a href="mailto:hello@cafe.vn?subject=Hi">Email</a><a href="tel:0903333841">Gọi</a><a href="https://zalo.me/0903333841">Zalo</a><a href="/lien-he">Liên hệ</a>', 'https://cafe.vn/menu');
  assert.equal(contacts.length,3); assert.equal(contacts[1].normalized,'+84903333841');
  assert.equal(contacts[0].source_url,'https://cafe.vn/menu'); assert.equal(contacts[0].role,'unknown'); assert.equal(contacts[0].consent,'unknown');
  assert.deepEqual(contact_pages,['https://cafe.vn/lien-he']);
});
test('does not invent contacts from prices, scripts, image filenames or share buttons', () => {
  const {contacts} = extractContacts('<script>hidden@cafe.vn</script> 0903333841 1.000.000đ logo@2x.png <a href="https://facebook.com/sharer.php?u=x">Share</a>', 'https://cafe.vn');
  assert.deepEqual(contacts,[]);
});
test('deduplicates email and Vietnamese numbers across shops without discarding provenance', () => {
  assert.equal(normalizePhone('+84 903 333 841'),' +84903333841'.trim());
  const result=dedupeContacts([{kind:'phone',value:'0903333841',prospect_id:'a',source_url:'https://a.vn'},{kind:'phone',value:'+84903333841',prospect_id:'b',source_url:'https://b.vn'}]);
  assert.equal(result.length,1); assert.equal(result[0].sources.length,2); assert.deepEqual(result[0].prospect_ids,['a','b']);
});
test('different Facebook profile IDs are not merged',()=>{
 const result=dedupeContacts([{kind:'facebook',value:'https://facebook.com/profile.php?id=1'},{kind:'facebook',value:'https://facebook.com/profile.php?id=2'}]);
 assert.equal(result.length,2);
});
