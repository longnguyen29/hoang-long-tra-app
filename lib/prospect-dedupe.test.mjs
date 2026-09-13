import test from 'node:test';
import assert from 'node:assert/strict';
import {businessHost,possibleDuplicates,matchesQueue} from './prospect-dedupe.js';
test('same owned host is a signal but shared platforms and distinct shops are not merged',()=>{
 assert.equal(businessHost('https://www.cafe.vn/menu'),'cafe.vn');
 for(const url of ['https://facebook.com/a','https://a.wixsite.com/b','https://zalo.me/1'])assert.equal(businessHost(url),'');
 const rows=[{id:'a',source_url:'https://cafe.vn/contact'},{id:'b',source_url:'https://other.vn'}];
 assert.deepEqual(possibleDuplicates({id:'c',source_url:'https://cafe.vn/menu'},rows),[rows[0]]);
 assert.equal(rows.length,2);
});
test('review queue excludes suppressed prospects from preparation and saved drafts',()=>{
 const p={status:'qualified',evidence_kind:'page_review'};
 assert.ok(matchesQueue(p,{contact_count:1},'prepare'));
 assert.ok(matchesQueue(p,{has_draft:true},'draft'));
 assert.ok(!matchesQueue({...p,status:'do_not_contact'},{has_draft:true},'draft'));
 assert.ok(matchesQueue(p,{contact_count:0},'missing_contact'));
});
