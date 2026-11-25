import assert from "node:assert/strict";
import test from "node:test";
import { followupPatch, followupDayAfter, persistFollowup } from "./customer-followup-entry.js";

const customer = { id: "a", notes: "Ghi chú cũ", updated_at: "2026-11-22T00:00:00Z" };
const draft = { result: " Đã thử mẫu ", action: " Gửi báo giá ", reschedule: true, day: "2026-11-27" };
const clock = new Date("2026-11-25T17:05:00Z");

test("appends the Vietnam-dated note and sets the 09:00 local appointment together", () => {
  const patch = followupPatch(customer, draft, clock);
  assert.equal(patch.notes, "Ghi chú cũ\n[26/11/2026] Đã thử mẫu");
  assert.equal(patch.next_action_at, "2026-11-27T02:00:00.000Z");
  assert.equal(patch.next_action, "Gửi báo giá");
  assert.equal(followupDayAfter("2026-12-31", 1), "2027-01-01");
});
test("note-only preserves the schedule and invalid drafts fail before writing", () => {
  assert.deepEqual(Object.keys(followupPatch(customer, { ...draft, reschedule:false }, clock)), ["notes","updated_at"]);
  for (const override of [{ result:" " }, { day:"2026-11-25" }, { day:"2026-02-31" }, { action:" " }]) {
    assert.throws(() => followupPatch(customer, { ...draft, ...override }, clock));
  }
});
test("replays recover a completed write and concurrent notes require review", async () => {
  const patch = followupPatch(customer, draft, clock);
  let latest = { ...customer, ...patch };
  const query = { eq(){return this}, neq(){return this}, select(){return this}, maybeSingle:async()=>({data:null}) };
  const table = { update:()=>query, select:()=>({...query, maybeSingle:async()=>({data:latest})}) };
  const db = { from:()=>table };
  assert.deepEqual(await persistFollowup(db,customer,patch), {saved:latest});
  latest = {...latest, notes:"Một nhân viên khác đã lưu"};
  assert.deepEqual(await persistFollowup(db,customer,patch), {conflict:latest});
});
test("suppressed prospects cannot write from the agenda", async () => {
  await assert.rejects(persistFollowup({rpc:async()=>({data:true})}, {...customer, discovery_prospect_id:"p"}, {}), /quyền chăm sóc/);
});
