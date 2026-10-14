import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

registerHooks({ resolve(specifier, context, next) {
  if (specifier === "server-only") return { url: "data:text/javascript,export{}", shortCircuit: true };
  return next(specifier, context);
} });
const { getCompanyDocumentsContext } = await import("../lib/company-documents-server.js");
const manager = { id: "manager-id", email: "manager@example.test", email_confirmed_at: "2026-10-14T00:00:00Z" };
const empty = access => ({ access, partners: [], partnersUnavailable: false, partnersTruncated: false });

function fixture({ user = manager, authError = null, role = "manager", staffError = null, rows = [], partnersError = null, failAt = "" } = {}) {
  const calls = [];
  const client = {
    auth: { async getUser() {
      calls.push(["getUser"]);
      if (failAt === "auth") throw new Error("private auth failure");
      return { data: { user }, error: authError };
    } },
    from(table) {
      calls.push(["from", table]);
      if (failAt === table) throw new Error("private query failure");
      const query = {
        select(fields) { calls.push(["select", table, fields]); return query; },
        eq(key, value) { calls.push(["eq", table, key, value]); return query; },
        order(key, options) { calls.push(["order", table, key, options]); return query; },
        async maybeSingle() { return { data: role ? { role } : null, error: staffError }; },
        async limit(value) { calls.push(["limit", table, value]); return { data: rows, error: partnersError }; },
      };
      return query;
    },
    rpc() { assert.fail("Document preparation must not synchronize orders or invoke any RPC"); },
  };
  return { client, calls };
}

test("signed-out and failed authentication never query staff or partner data", async () => {
  for (const [options, expected] of [
    [{ user: null }, "signed_out"],
    [{ user: null, authError: { name: "AuthSessionMissingError" } }, "signed_out"],
    [{ authError: { name: "AuthApiError", message: "private auth detail" } }, "error"],
    [{ failAt: "auth" }, "error"],
  ]) {
    const { client, calls } = fixture(options);
    assert.deepEqual(await getCompanyDocumentsContext(client, { partnersEnabled: true }), empty(expected));
    assert.deepEqual(calls, [["getUser"]]);
  }
});

test("confirmed real email identity is required before the staff-role lookup", async () => {
  for (const change of [{ email_confirmed_at: null }, { email: "" }, { id: "" }, { is_anonymous: true }]) {
    const { client, calls } = fixture({ user: { ...manager, ...change } });
    assert.deepEqual(await getCompanyDocumentsContext(client, { partnersEnabled: true }), empty("denied"));
    assert.deepEqual(calls, [["getUser"]]);
  }
});

test("only manager/admin role permits a draft; unavailable role checks fail closed", async () => {
  for (const [options, expected] of [
    [{ role: "employee" }, "denied"], [{ role: null }, "denied"],
    [{ staffError: { message: "private staff detail" } }, "error"], [{ failAt: "staff_roles" }, "error"],
    [{ role: "manager" }, "allowed"], [{ role: "admin" }, "allowed"],
  ]) {
    const { client, calls } = fixture(options);
    assert.deepEqual(await getCompanyDocumentsContext(client), empty(expected));
    assert.deepEqual(calls.slice(0, 4), [["getUser"], ["from", "staff_roles"], ["select", "staff_roles", "role"], ["eq", "staff_roles", "user_id", manager.id]].slice(0, calls.length));
    assert.equal(calls.some(call => call[1] === "partner_network_partners"), false);
  }
});

test("approved partner lookup uses a safe projection and never exports internal fields", async () => {
  const row = { id: "partner-id", code: "HL-P-TEST", business_name: "Đối tác", contact_name: "Người đại diện", first_order_rate_percent: null,
    repeat_rate_percent: 1, repeat_order_limit: 3, terms: "private internal context", notes: "private notes", internal_cost_total: 123 };
  const { client, calls } = fixture({ rows: [row] });
  const context = await getCompanyDocumentsContext(client, { partnersEnabled: true });
  assert.equal(context.access, "allowed");
  assert.equal(context.partnersUnavailable, false);
  assert.equal(context.partners[0].id, row.id);
  assert.equal(context.partners[0].first_order_rate_percent, null);
  assert.equal(context.partners[0].repeat_order_limit, 3);
  assert.deepEqual(Object.keys(context.partners[0]), ["id", "code", "business_name", "contact_name", "email", "phone", "region", "partner_type", "first_order_rate_percent", "default_rate_percent", "rate_percent", "repeat_rate_percent", "repeat_order_limit"]);
  assert.equal(calls.find(call => call[0] === "select" && call[1] === "partner_network_partners")[2], Object.keys(context.partners[0]).join(","));
  assert.deepEqual(calls.slice(-3), [["eq", "partner_network_partners", "status", "approved"], ["order", "partner_network_partners", "business_name", { ascending: true }], ["limit", "partner_network_partners", 201]]);
  assert.equal(JSON.stringify(context).includes("private"), false);
});

test("partner data failure preserves authorized manual drafting without leaking provider errors", async () => {
  for (const options of [{ partnersError: { message: "secret database details" } }, { failAt: "partner_network_partners" }, { rows: null }, { rows: [null] }]) {
    const { client } = fixture(options);
    assert.deepEqual(await getCompanyDocumentsContext(client, { partnersEnabled: true }), { ...empty("allowed"), partnersUnavailable: true });
  }
});

test("partner selection is bounded to 200 and flags a truncated result", async () => {
  const rows = Array.from({ length: 201 }, (_, index) => ({ id: `partner-${index}`, business_name: `Partner ${index}` }));
  const { client } = fixture({ rows });
  const context = await getCompanyDocumentsContext(client, { partnersEnabled: true });
  assert.equal(context.partners.length, 200);
  assert.equal(context.partnersTruncated, true);
  assert.equal(context.partners.at(-1).id, "partner-199");
});
