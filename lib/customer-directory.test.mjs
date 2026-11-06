import test from 'node:test';
import assert from 'node:assert/strict';
import {customerOrderSummary as summary, customerMatchRank} from './customer-directory.js';
const a={id:'a',contact:'0901234567'}, b={id:'b',contact:'0909999999'};
test('counts uniquely matched and directly linked orders once, skipping canceled',()=>{
 const orders=[{id:'1',contact:'84901234567',ts:'2026-01-01',estimated_total:100},{id:'2',quote_id:'q',contact:'0901234567',ts:'2026-02-01',estimated_total:200},{id:'3',contact:a.contact,status:'canceled',estimated_total:90}];
 const s=summary(a,[a,b],orders,[{id:'q',opportunity_id:'a'}],[]);assert.equal(s.count,2);assert.equal(s.total,300);assert.match(s.lastOrder,/2026-02-01/);
});
test('does not match empty or duplicate contacts and never invents totals',()=>{
 const x={id:'x',contact:''}, y={id:'y',contact:''};assert.equal(summary(x,[x,y],[{contact:''}],[],[]).count,0);
 const s=summary(a,[a,{id:'c',contact:a.contact}],[{contact:a.contact},{partner_account_id:'p'}],[],[{id:'p',opportunity_id:'a'}]);assert.equal(s.count,1);assert.equal(s.total,null);
});

test('an explicit link prevents a conflicting contact being counted for another customer',()=>{
 const order={id:'o',quote_id:'qa',contact:b.contact,estimated_total:10};const quotes=[{id:'qa',opportunity_id:'a'}];
 assert.equal(summary(a,[a,b],[order],quotes,[]).count,1);assert.equal(summary(b,[a,b],[order],quotes,[]).count,0);
});

test('an explicit staff-approved order link overrides contact matching',()=>{
 const order={id:'o1',contact:b.contact,estimated_total:10};const links=[{order_id:'o1',opportunity_id:'a'}];
 assert.equal(summary(a,[a,b],[order],[],[],links).count,1);assert.equal(summary(b,[a,b],[order],[],[],links).count,0);
});

test('similar contact or name only produces a suggestion',()=>{
 assert.equal(customerMatchRank({name:'Quán Trà Mây',contact:''},{business_name:'Quan Tra May',contact:''}),1);
 assert.equal(customerMatchRank({name:'Khác',contact:'84901234567'},a),2);
 assert.equal(customerMatchRank({name:'Quán A',contact:''},{business_name:'Quán B'}),0);
});
