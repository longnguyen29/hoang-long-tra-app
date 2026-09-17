import test from 'node:test';
import assert from 'node:assert/strict';
import { publicContact, publicContactHref } from './prospect-contact-actions.js';
const source_url='https://business.example/contact';
test('contact actions use published values and never inject a message or unsafe URL',()=>{
 assert.equal(publicContactHref({kind:'email',value:'sales@example.com',source_url}),'mailto:sales%40example.com');
 assert.equal(publicContactHref({kind:'phone',value:'0903333841',source_url}),'tel:+84903333841');
 assert.equal(publicContactHref({kind:'phone',value:'+442079460123',source_url}),'tel:+442079460123');
 for(const [kind,value] of [['email','a@b.com?body=send'],['email','a@b.com\r\nBcc:x@y.com'],['phone','123'],['facebook','javascript:alert(1)'],['zalo','https://evil.example/123'],['facebook','https://facebook.com/sharer.php'],['whatsapp','https://wa.me/']]) assert.equal(publicContactHref({kind,value,source_url}),'');
 assert.equal(publicContactHref({kind:'facebook',value:'https://www.facebook.com/business',source_url}),'https://www.facebook.com/business');
 assert.throws(()=>publicContact({kind:'email',value:'sales@example.com',source_url:'file:///private'}));
});
