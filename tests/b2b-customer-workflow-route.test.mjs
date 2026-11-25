import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { pathToFileURL } from "node:url";
import path from "node:path";

const authModule = "data:text/javascript," + encodeURIComponent(
  "let actor;export function setActor(value){actor=value}export async function authenticateManagerRequest(){return actor}",
);
registerHooks({ resolve(specifier, context, next) {
  if (specifier === "@/lib/staff-api-auth") return { url: authModule, shortCircuit: true };
  if (["server-only", "@/lib/supabase/server", "@/lib/supabase/admin"].includes(specifier)) {
    return { url: "data:text/javascript,export function createClient(){throw new Error('unexpected cookie auth')}export function createAdminClient(){throw new Error('unexpected admin client')}", shortCircuit: true };
  }
  if (specifier.startsWith("@/")) return next(pathToFileURL(path.resolve(specifier.slice(2) + ".js")).href, context);
  return next(specifier, context);
}});

const { setActor } = await import(authModule);
const { GET, PATCH, POST } = await import("../app/api/staff/b2b-workflow/route.js");
const url = "https://example.test/api/staff/b2b-workflow";
const user = { id: "01111111-1111-1111-1111-111111111111", email_confirmed_at: "2026-01-01T00:00:00Z" };
const request = (method, body, params = "", authorization = true) => new Request(url + params, {
  method, headers: authorization ? { Authorization: "Bearer test" } : { Origin: "https://third-party.test" },
  body: body === undefined ? undefined : JSON.stringify(body),
});

test("unverified access and cross-origin cookie writes stop before fetching private records", async () => {
  setActor(null);
  assert.equal((await GET(request("GET", undefined, "?order=test"))).status, 403);
  assert.equal((await PATCH(request("PATCH", { orderId: "test" }, "", false))).status, 403);
  setActor({ user: { ...user, is_anonymous: true } });
  assert.equal((await GET(request("GET", undefined, "?order=test"))).status, 403);
});

test("orders-only managers cannot edit a legal seller, prepare uploads, or open signed evidence", async () => {
  setActor({ user, staff: { role: "manager", workspace_modules: ["work", "orders"] } });
  assert.equal((await PATCH(request("PATCH", { action: "save_seller", sellerId: "green-hill" }))).status, 403);
  assert.equal((await POST(request("POST", { action: "prepare" }))).status, 403);
  assert.equal((await GET(request("GET", undefined, "?document=01111111-1111-1111-1111-111111111112"))).status, 403);
});

test("VAT setting updates only the requested values and preserves an existing rate when omitted", async () => {
  const calls = [];
  const admin = { rpc: async (name, args) => {
    calls.push([name, args]); return { data: { order_id: "test", vat_percent: args.p_vat_percent ?? 8 } };
  }};
  setActor({ user, staff: { role: "admin" }, admin });
  assert.equal((await PATCH(request("PATCH", { orderId: "test", sellerId: "green-hill", vatPercent: 8 }))).status, 200);
  assert.equal((await PATCH(request("PATCH", { orderId: "test", customerId: "test-customer" }))).status, 200);
  assert.equal((await PATCH(request("PATCH", { orderId: "test", vatPercent: true }))).status, 400);
  assert.deepEqual(calls.map(([name, args]) => [name, args.p_vat_percent, args.p_actor]), [
    ["b2b_update_order_workflow", 8, user.id], ["b2b_update_order_workflow", null, user.id],
  ]);
});

test("editable Word drafts are not accepted as issued VAT evidence", async () => {
  setActor({ user, staff: { role: "admin" } });
  const result = await POST(request("POST", {
    action: "prepare", kind: "vat_invoice", fileName: "draft.docx", size: 512,
    contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  }));
  assert.equal(result.status, 400);
  assert.equal((await result.json()).error, "invalid_file");
});
