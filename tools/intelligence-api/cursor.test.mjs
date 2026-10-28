import test from 'node:test';
import assert from 'node:assert/strict';
import {makeJobCursor,validateJobQuery,listJobs} from './core.mjs';
const id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const flags={research:true};
for(const stamp of ['2026-10-28T12:00:00+00:00','2026-10-28T19:00:00.123456+07:00',
  '2026-10-28T06:30:00.123456-05:30','2024-02-29T00:00:00.123456Z','2026-10-28T12:00:00Z']){
 test(`cursor keeps exact database timestamp ${stamp}`,()=>{
   const row={id,created_at:stamp};
   assert.deepEqual(validateJobQuery({cursor:makeJobCursor(row)}).checkpoint,row);
 });
}
test('second page receives the original microsecond timestamp and id',async()=>{
 const first={id,created_at:'2026-10-28T19:00:00.123456+07:00'};
 let checkpoint;
 const ctx={flags,role:'manager',userId:'11111111-1111-4111-8111-111111111111',scopedRPC:async()=>{},
  listManagerJobs:async opts=>{if(opts.checkpoint){checkpoint=opts.checkpoint;return [];} return [first,{...first,id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'}];}};
 const page=await listJobs(ctx,{limit:'1'});
 await listJobs(ctx,{limit:'1',cursor:page.body.next_cursor});
 assert.deepEqual(checkpoint,first);
});
for(const stamp of ['2026-02-29T00:00:00Z','2024-04-31T00:00:00Z','2026-01-01T24:00:00Z',
 '2026-01-01T00:00:00.1234567Z','2026-01-01T00:00:00+14:01',
 '2026-01-01T00:00:00+23:00','2026-01-01T00:00:00Z) OR TRUE--','0000-01-01T00:00:00Z']){
 test(`invalid or unsafe timestamp rejected ${stamp}`,()=>{
   assert.throws(()=>makeJobCursor({id,created_at:stamp}),/invalid_job_cursor/);
   const input=Buffer.from(JSON.stringify([stamp,id])).toString('base64url');
   assert.throws(()=>validateJobQuery({cursor:input}),e=>e.status===400&&e.code==='invalid_cursor');
 });
}
