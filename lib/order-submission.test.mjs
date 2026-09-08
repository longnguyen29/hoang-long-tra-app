import test from 'node:test';
import assert from 'node:assert/strict';
import {createOrderSubmission} from './order-submission.js';
test('read failure retries the original ID without another create',async()=>{let creates=0,reads=0;const ids=[];const runner=createOrderSubmission();const args={create:async()=>({id:`order-${++creates}`}),read:async id=>{ids.push(id);return ++reads===1?{error:{}}:{data:{id}}}};assert.equal((await runner.run(args)).state,'read_failed');assert.equal((await runner.run(args)).state,'created');assert.equal(creates,1);assert.deepEqual(ids,['order-1','order-1']);assert.equal((await runner.run(args)).state,'complete')});
test('double submit shares one in-flight create',async()=>{let resolve;const runner=createOrderSubmission();let calls=0;const args={create:()=>{calls++;return new Promise(done=>resolve=done)},read:async id=>({data:{id}})};const first=runner.run(args);assert.equal((await runner.run(args)).state,'busy');resolve({id:'one'});assert.equal((await first).state,'created');assert.equal(calls,1)});
test('ambiguous create failure blocks automatic resubmission',async()=>{const runner=createOrderSubmission();let calls=0;const args={create:async()=>{calls++;throw Error('network')},read:async()=>{throw Error('should not read')}};assert.equal((await runner.run(args)).state,'uncertain');assert.equal((await runner.run(args)).state,'uncertain');assert.equal(calls,1)});
test('missing server ID is uncertain, never replaced by an invented ID',async()=>{const runner=createOrderSubmission();assert.equal((await runner.run({create:async()=>({}),read:async()=>({data:{}})})).state,'uncertain')});
test('definite rejection permits corrected submission',async()=>{const runner=createOrderSubmission();let calls=0;const args={create:async()=>++calls===1?{status:400,error:{message:'out_of_stock'}}:{id:'fixed'},read:async id=>({data:{id}})};assert.equal((await runner.run(args)).state,'rejected');assert.equal((await runner.run(args)).state,'created')});
test('thrown reads retain the ID for recovery',async()=>{const runner=createOrderSubmission();let calls=0;const args={create:async()=>({id:'saved'}),read:async id=>{if(!calls++)throw Error('offline');return {data:{id}}}};assert.equal((await runner.run(args)).state,'read_failed');assert.equal((await runner.run(args)).id,'saved')});

for (const status of [0, 408, 500, 502, 504, undefined]) {
  test(`returned transport/server failure (${status}) prevents a second insert`, async () => {
    const runner = createOrderSubmission();
    let calls = 0;
    const args = {
      create: async () => { calls++; return {status, error:{message:'request failed'}}; },
      read: async () => { throw Error('must not read without an ID'); },
    };
    assert.equal((await runner.run(args)).state, 'uncertain');
    assert.equal((await runner.run(args)).state, 'uncertain');
    assert.equal(calls, 1);
  });
}
test('missing response blocks another insert', async () => {
  const runner = createOrderSubmission();
  let calls = 0;
  const args = {create:async()=>{calls++; return null;},read:async()=>({})};
  assert.equal((await runner.run(args)).state,'uncertain');
  assert.equal((await runner.run(args)).state,'uncertain');
  assert.equal(calls,1);
});
