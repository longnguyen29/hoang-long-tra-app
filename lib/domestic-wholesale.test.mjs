import test from 'node:test';
import assert from 'node:assert/strict';
import { DOMESTIC_TEAS,domesticAttribution,domesticEnquiryInput,domesticNoteLimit } from './domestic-wholesale.js';
import { normalizeEventEnquiry } from './event-enquiry.js';
const fixture=()=>({requestId:'12345678-1234-4123-8123-123456789abc',teaIds:DOMESTIC_TEAS.map(x=>x.id),intent:'sample',businessType:'chain',name:'Người thử',business:'Chuỗi thử',phone:'0901234567',quantityKg:'2000',packingKg:'30',destination:'Hà Nội',note:'Cần thử hai loại',consent:true,website:'',attribution:domesticAttribution('?utm_source=chatgpt&utm_medium=cpc&utm_campaign=shan-b2b&utm_content=mat-khoi&utm_term=tea')});
test('domestic request maps both real SKUs and ad UTMs into existing private CRM intake',()=>{
 const raw=fixture(),input=domesticEnquiryInput(raw),checked=normalizeEventEnquiry(input);
 assert.equal(checked.contact,'0901234567');assert.equal(checked.campaign,'event_contact_v1');
 for(const value of ['hong-tra-ban-si','hong-tra-shan-mat','hong-tra-shan-khoi','2000 kg','30 kg','source=chatgpt','campaign=shan-b2b'])assert.ok(checked.note.includes(value));
 assert.deepEqual(domesticEnquiryInput({...raw,teaIds:[...raw.teaIds].reverse()}),input);
 assert.ok(!Object.hasOwn(input,'partnerId'));assert.ok(!Object.hasOwn(input,'price'));
});
test('invalid selection, consent, contacts, quantities, packing and spam fail before persistence',()=>{
 for(const patch of [{teaIds:[]},{teaIds:['black-op1']},{teaIds:[DOMESTIC_TEAS[0].id,DOMESTIC_TEAS[0].id]},{consent:false},{phone:'x'},{phone:'person@example.com'},{quantityKg:'-1'},{quantityKg:'1e6'},{quantityKg:'NaN'},{quantityKg:'0'},{packingKg:'25'},{website:'spam'},{note:'x'.repeat(241)}])assert.throws(()=>domesticEnquiryInput({...fixture(),...patch}));
 assert.doesNotThrow(()=>normalizeEventEnquiry(domesticEnquiryInput({...fixture(),quantityKg:'',packingKg:''})));
});
test('campaign parsing drops duplicates, unknown/private query fields and oversized labels',()=>{
 assert.deepEqual(domesticAttribution('?utm_source=ads&utm_source=other&email=private%40example.com&fbclid=token&utm_campaign='+ 'a'.repeat(49)),{source:'',medium:'',campaign:'',content:'',term:''});
 assert.throws(()=>domesticEnquiryInput({...fixture(),attribution:{...fixture().attribution,source:'https://private.test?phone=123'}}));
});
test('maximum form limits retain entered notes and attribution within shared 700-character budget',()=>{
 const raw={...fixture(),destination:'Đ'.repeat(60),quantityKg:'10000000',attribution:{source:'s'.repeat(32),medium:'m'.repeat(24),campaign:'c'.repeat(48),content:'x'.repeat(32),term:'t'.repeat(24)}};
 const limit=domesticNoteLimit(raw,raw.attribution);raw.note='n'.repeat(limit);
 const result=normalizeEventEnquiry(domesticEnquiryInput(raw));assert.ok(limit>0);assert.ok(result.note.length<=700);assert.ok(result.note.endsWith(raw.note));assert.ok(result.note.includes('campaign='+raw.attribution.campaign));
});
