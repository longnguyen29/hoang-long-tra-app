import test from 'node:test';
import assert from 'node:assert/strict';
import { processDashboardReminders, reminderText } from './dashboard-reminders-server.js';

function fakeAdmin(plans, { claimed = true, claimedRow = null, ensureError = null, receiptError = null } = {}) {
  const calls = [];
  return { calls,
    async rpc(name, args) {
      calls.push({ name, args });
      if (name === 'ensure_government_obligation_calendar') return { error: ensureError };
      return { data: claimed ? [claimedRow || plans.find(plan => plan.id === args.p_id)] : [], error: null };
    },
    from(table) {
      assert.equal(table,'dashboard_plans');
      return {
        select() { return this; },
        eq(key,value) { calls.push({ filter:key,value }); return this; },
        gte(key,value) { calls.push({ filter:key,value,op:'gte' }); return this; },
        async lte(key,value) { calls.push({ filter:key,value,op:'lte' }); return {data:plans,error:null}; },
        update(values) { return { async eq(key,value) {calls.push({update:values,key,value});return {error:values.notified_event_on ? receiptError : null};} }; },
      };
    },
  };
}

async function configured(work) {
  const original = { token:process.env.TELEGRAM_BOT_TOKEN,chat:process.env.TELEGRAM_CHAT_ID };
  process.env.TELEGRAM_BOT_TOKEN = 'test-only-no-network';
  process.env.TELEGRAM_CHAT_ID = 'test-only';
  try { await work(); }
  finally {
    if(original.token===undefined)delete process.env.TELEGRAM_BOT_TOKEN;else process.env.TELEGRAM_BOT_TOKEN=original.token;
    if(original.chat===undefined)delete process.env.TELEGRAM_CHAT_ID;else process.env.TELEGRAM_CHAT_ID=original.chat;
  }
}
const obligation = {id:'obligation-period',kind:'obligation',title:'Hồ sơ nội bộ kiểm thử',status:'pending',notify_telegram:true,event_on:'2026-07-31',reminder_unit:'month',remind_days:30};
const now = new Date('2026-06-30T00:30:00Z');

test('materializes future periods before scanning and sends a 31-day calendar-month notice once', async () => configured(async () => {
  const admin=fakeAdmin([obligation,{...obligation,id:'already-sent',notified_event_on:obligation.event_on},{...obligation,id:'closed',status:'done'}]);
  const sent=[];
  const result=await processDashboardReminders(admin,{now,sendMessage:async text=>sent.push(text)});
  assert.deepEqual(admin.calls[0],{name:'ensure_government_obligation_calendar',args:{p_year:2026}});
  assert.ok(admin.calls.some(call=>call.op==='lte'&&call.value==='2026-07-31'));
  assert.equal(result.sent,1);assert.equal(sent.length,1);
  assert.match(sent[0],/Nhắc trước 1 tháng theo lịch/);
  assert.match(sent[0],/#government-obligations/);
  assert.ok(admin.calls.some(call=>call.update?.notified_event_on==='2026-07-31'));
}));

test('a leased reminder is not sent and failures release the claim for a later retry', async () => configured(async () => {
  const leased=fakeAdmin([obligation],{claimed:false});
  let sends=0;
  const skipped=await processDashboardReminders(leased,{now,sendMessage:async()=>sends++});
  assert.equal(skipped.sent,0);assert.equal(sends,0);
  const failing=fakeAdmin([obligation]);
  const result=await processDashboardReminders(failing,{now,sendMessage:async()=>{throw new Error('test_transport_failed');}});
  assert.equal(result.failed,1);assert.equal(result.sent,0);
  const recorded=failing.calls.find(call=>call.update?.notification_last_error==='test_transport_failed');
  assert.equal(recorded.update.notification_claimed_at,null);
  assert.equal(recorded.update.notified_event_on,undefined);
}));

test('materialization failure stops the scan and ordinary reminder text remains compatible', async () => configured(async () => {
  const admin=fakeAdmin([obligation],{ensureError:new Error('test_calendar_unavailable')});
  await assert.rejects(processDashboardReminders(admin,{now,sendMessage:async()=>assert.fail('must not send')}),/test_calendar_unavailable/);
  assert.equal(admin.calls.length,1);
  const plain=reminderText({title:'Lịch hẹn nội bộ',kind:'event',event_on:'2026-06-30'},'2026-06-30');
  assert.match(plain,/Nhắc lịch Hoàng Long/);assert.match(plain,/hôm nay/);
  assert.doesNotMatch(plain,/1 tháng/);
}));

test('dispatch sends and records the current claimed row rather than a stale scanned version', async () => configured(async () => {
  const current = {...obligation,title:'Hạn đã sửa',event_on:'2026-07-30'};
  const admin=fakeAdmin([obligation],{claimedRow:current});
  const messages=[];
  const result=await processDashboardReminders(admin,{now,sendMessage:async text=>messages.push(text)});
  assert.equal(result.sent,1);assert.equal(result.receiptFailed,0);
  assert.match(messages[0],/Hạn đã sửa/);assert.match(messages[0],/30\/07\/2026/);
  assert.ok(admin.calls.some(call=>call.update?.notified_event_on==='2026-07-30'));
  assert.ok(!admin.calls.some(call=>call.update?.notified_event_on==='2026-07-31'));
}));

test('receipt persistence failure is reported separately without clearing the existing send lease', async () => configured(async () => {
  const admin=fakeAdmin([obligation],{receiptError:new Error('test_receipt_storage_failed')});
  let sends=0;
  const result=await processDashboardReminders(admin,{now,sendMessage:async()=>sends++});
  assert.equal(sends,1);assert.equal(result.sent,1);assert.equal(result.failed,0);assert.equal(result.receiptFailed,1);
  const writes=admin.calls.filter(call=>call.update);
  assert.equal(writes.length,1,'no release/retry update after the failed receipt save');
  assert.equal(writes[0].update.notified_event_on,obligation.event_on);
}));
