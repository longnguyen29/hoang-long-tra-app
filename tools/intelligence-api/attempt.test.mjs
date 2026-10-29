import test from 'node:test';
import assert from 'node:assert/strict';
import {getOrCreateAttempt,clearAttempt} from './attempt.mjs';
const actorId='11111111-1111-4111-8111-111111111111';
const prospectId='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const attempt={actorId,prospectId,version:1};
const storage=()=>{const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k), m};};
test('same attempt persists through reload and uncertain retry until explicitly cleared',()=>{
 const s=storage(); let count=0; const random=()=>`seed-${++count}`;
 const first=getOrCreateAttempt(s,attempt,random);
 assert.match(first,/^[a-f0-9]{64}$/);
 assert.equal(getOrCreateAttempt(s,attempt,random),first);
 assert.equal(count,1);
 clearAttempt(s,attempt);
 assert.notEqual(getOrCreateAttempt(s,attempt,random),first);
});
test('actor, prospect, and version produce distinct slots; no contacts or token stored',()=>{
 const s=storage();let count=0;const random=()=>`seed-${++count}`;
 const keys=[attempt,{...attempt,version:2},{...attempt,actorId:'22222222-2222-4222-8222-222222222222'},
  {...attempt,prospectId:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'}].map(x=>getOrCreateAttempt(s,x,random));
 assert.equal(new Set(keys).size,4);
 assert.ok([...s.m.values()].every(x=>/^[a-f0-9]{64}$/.test(x)));
});
test('storage error fails closed instead of silently returning an unpersisted key',()=>{
 assert.throws(()=>getOrCreateAttempt({getItem:()=>null,setItem:()=>{throw new Error('quota')}},attempt),/quota/);
 assert.throws(()=>getOrCreateAttempt(storage(),{...attempt,version:0}),/invalid_attempt/);
});
