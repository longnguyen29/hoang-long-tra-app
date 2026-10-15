import test from 'node:test';
import assert from 'node:assert/strict';
import {publicRetailPartner,normalizeRetailPartnerCheckout,retailPartnerShareHref} from './retail-partner.js';
const page={slug:'test-partner',display_name:'Test Partner',phone:'0901000001',region:'Test',revision:1};
const requestId='00000000-0000-4000-8000-000000000901';
test('retail public metadata strips private identity and only accepts valid reviewed shape',()=>{
 assert.deepEqual(publicRetailPartner({...page,partner_id:'SECRET',user_id:'SECRET',commission:10}),page);
 assert.equal(publicRetailPartner({...page,slug:'not/a/slug'}),null);
 assert.equal(publicRetailPartner({...page,revision:0}),null);
 assert.equal(publicRetailPartner({...page,phone:'javascript:alert(1)'}),null);
});
test('every checkout has a retry identifier; referral requires explicit named consent',()=>{
 assert.deepEqual(normalizeRetailPartnerCheckout({requestId}),{requestId,partner:null});
 const partner={slug:page.slug,revision:1,consent:true};
 assert.deepEqual(normalizeRetailPartnerCheckout({requestId,partner}),{requestId,partner});
 for(const payload of [{},{requestId,partner:{...partner,consent:false}},{requestId,partner:{...partner,partner_id:'SECRET'}},{requestId,partnerId:'SECRET'}])assert.throws(()=>normalizeRetailPartnerCheckout(payload));
});
test('only published personal pages yield a retail sharing URL',()=>{
 assert.equal(retailPartnerShareHref({...page,published:true}),'/gioi-thieu/test-partner');
 assert.equal(retailPartnerShareHref({...page,published:false}),null);
 assert.equal(retailPartnerShareHref(page),null);
});
