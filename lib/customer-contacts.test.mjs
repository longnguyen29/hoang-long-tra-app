import test from 'node:test';
import assert from 'node:assert/strict';
import {contactCandidates, searchCustomer} from './customer-contacts.js';
const customer={id:'a',business_name:'Quán Trà',contact:'000',additional_contacts:['0901234567','+84 901 234 567'],preferred_contact:'0901234567'};
test('deduplicates equivalent contacts and includes contacts from linked orders only',()=>{
 const contacts=contactCandidates(customer,[{id:'1',contact:'0989200894'},{id:'2',contact:'0999999999'}],[{order_id:'1',opportunity_id:'a'}]);
 assert.deepEqual(contacts,['000','0901234567','0989200894']);
});
test('search finds added and linked phone numbers in alternative formats',()=>{
 assert.equal(searchCustomer(customer,'0901 234 567'),true);
 assert.equal(searchCustomer(customer,'0989200894',[{id:'1',contact:'0989200894'}],[{order_id:'1',opportunity_id:'a'}]),true);
 assert.equal(searchCustomer(customer,'0999999999'),false);
});

test('search finds the recorded product interest',()=>{
 assert.equal(searchCustomer({...customer,product_interest:'Hồng trà mật, Ngọc Lan'},'ngọc lan'),true);
});
