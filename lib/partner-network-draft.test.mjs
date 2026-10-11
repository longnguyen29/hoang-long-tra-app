import test from "node:test";
import assert from "node:assert/strict";
import { PARTNER_DRAFT_KEY, readPartnerDraft, savePartnerDraft, clearPartnerDraft } from "./partner-network-draft.js";
const storage = () => { const data = new Map(); return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) }; };
const input = { business_name: "Test", contact_name: "Test contact", phone: "0900000000", region: "Hà Nội", partner_type: "consultant", notes: "", consent: true };
test("new-tab email callbacks can read the shared draft only for the matching verified email", () => {
  const store = storage(); savePartnerDraft(store, input, " TEST@example.test ", 1000);
  assert.equal(readPartnerDraft(store, null, 2000), null);
  assert.deepEqual(readPartnerDraft(store, "test@EXAMPLE.test", 2000), input);
  assert.equal(readPartnerDraft(store, "other@example.test", 2000), null);
  assert.equal(store.getItem(PARTNER_DRAFT_KEY), null);
});
test("expired, invalid and future draft timestamps are cleared", () => {
  for (const saved_at of ["1000", null, 999999999, 0]) {
    const store = storage(); store.setItem(PARTNER_DRAFT_KEY, JSON.stringify({ input, email: "test@example.test", saved_at }));
    assert.equal(readPartnerDraft(store, "test@example.test", 86401000), null);
    assert.equal(store.getItem(PARTNER_DRAFT_KEY), null);
  }
  const store = storage(); store.setItem(PARTNER_DRAFT_KEY, "{bad"); assert.equal(readPartnerDraft(store, "test@example.test"), null);
});
test("draft persistence strips tokens, identity and approval data before storage", () => {
  const store = storage(); savePartnerDraft(store, { ...input, access_token: "secret", partner_id: "forged", status: "approved" }, "test@example.test", 1000);
  const raw = store.getItem(PARTNER_DRAFT_KEY);
  assert.equal(raw.includes("secret"), false); assert.equal(raw.includes("forged"), false); assert.equal(raw.includes("approved"), false);
  assert.deepEqual(readPartnerDraft(store, "test@example.test", 2000), input);
});
test("success/signout cleanup removes the pending draft", () => {
  const store = storage(); savePartnerDraft(store, input, "test@example.test", 1000); clearPartnerDraft(store);
  assert.equal(readPartnerDraft(store, "test@example.test", 2000), null);
});
