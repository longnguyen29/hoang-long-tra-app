import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { pathToFileURL } from "node:url";
import path from "node:path";
registerHooks({ resolve(specifier, context, next) {
  if (specifier === "server-only") return { url: "data:text/javascript,export{}", shortCircuit: true };
  if (specifier.startsWith("@/")) return next(pathToFileURL(path.resolve(specifier.slice(2) + ".js")).href, context);
  return next(specifier, context);
} });
const { handleCommissionCostStatement, COST_STATEMENT_FILE_LIMIT } = await import("../lib/commission-cost-statement-server.js");
const commissionId = "8d679c79-c886-4b6e-abf4-5fa67aa65e9f";
const evidenceId = "a860ac19-7b0c-4163-97a4-c5ddad9db343";
const origin = "https://www.hoanglongtra.com";
const request = (body, query = "", originHeader = origin) => new Request(`${origin}/api/partners/commissions/${commissionId}/statement${query}`, {
  method: body ? "POST" : "GET", headers: { origin: originHeader, ...(body ? { "content-type": "application/json" } : {}) },
  ...(body ? { body: JSON.stringify(body) } : {}),
});
const user = { id: "verified-user", email: "user@example.test", email_confirmed_at: "2026-10-14" };
const snapshot = { commission_basis: "profit", eligible_base: 1000000, internal_cost_total: 800000, commission_base: 200000, rate_percent: 5, calculated_amount: 10000 };
function fixture({ role = "manager", authUser = user, view = { order_id: "order-1", published: true, stale: false, summary: "Đối soát đơn này", snapshot },
  file = { id: evidenceId, order_id: "order-1", storage_path: `partner/${evidenceId}`, file_name: "proof.pdf", content_type: "application/pdf", expected_size: 20 },
  info = { size: 20, mimetype: "application/pdf" }, rpcError = "" } = {}) {
  const calls = [];
  const client = {
    from(table) { assert.equal(table, "staff_roles"); return { select(value) { assert.equal(value, "role"); return this; }, eq(key, id) { assert.equal(key, "user_id"); assert.equal(id, authUser.id); return this; }, async maybeSingle() { return { data: role ? { role } : null, error: null }; } }; },
    async rpc(name, args) {
      calls.push([name, args]);
      if (rpcError === name) return { data: null, error: { message: "private provider detail" } };
      const data = name === "partner_network_cost_statement_view" ? view
        : ["partner_network_cost_evidence_access", "partner_network_prepare_cost_evidence"].includes(name) ? file : { private_value: "must not be returned" };
      return { data, error: null };
    },
  };
  const dependencies = {
    async authenticate() { return authUser ? { client, user: authUser } : null; },
    storageClient() { calls.push(["storageClient"]); return { storage: { from(bucket) {
      assert.equal(bucket, "partner-cost-statements"); return {
        async createSignedUrl(...args) { calls.push(["signedDownload", ...args]); return { data: { signedUrl: "https://storage.example.test/short-private-link" }, error: null }; },
        async createSignedUploadUrl(...args) { calls.push(["signedUpload", ...args]); return { data: { token: "stub-only-upload-token" }, error: null }; },
        async info(...args) { calls.push(["info", ...args]); return { data: info, error: null }; },
      }; } } }; },
  };
  return { calls, dependencies, async handle(req) { return handleCommissionCostStatement(req, commissionId, dependencies); } };
}

test("missing/unverified identity, nonmanager mutations and foreign POST origins never reach files", async () => {
  for (const [options, status] of [[{ authUser: null }, 401], [{ authUser: { ...user, email_confirmed_at: null } }, 401], [{ role: null }, 403]]) {
    const f = fixture(options); assert.equal((await f.handle(request({ action: "prepare" }))).status, status); assert.deepEqual(f.calls, []);
  }
  const f = fixture(); assert.equal((await f.handle(request({ action: "publish" }, "", "https://other.example"))).status, 403); assert.deepEqual(f.calls, []);
});

test("partner private, stale and unavailable statements return no financial data", async () => {
  for (const view of [null, { available: false }, { order_id: "order-1", published: false, snapshot }, { order_id: "order-1", published: true, stale: true, snapshot }]) {
    const f = fixture({ role: null, view }); const response = await f.handle(request());
    assert.equal(response.status, 404); assert.deepEqual(await response.json(), { ok: false, error: "not_found" });
    assert.equal(f.calls.some(call => call[0] === "storageClient"), false);
  }
});

test("read DTO includes only released safe keys; manager preview never goes to partner", async () => {
  const view = { order_id: "order-1", published: true, summary: "Own order", snapshot: { ...snapshot, bank_data: "private", other_customer: "private" },
    preview_snapshot: snapshot, storage_path: "private", published_by: "private", evidence: { id: evidenceId, file_name: "proof.pdf", content_type: "application/pdf", storage_path: "private" },
    draft_evidence: { id: evidenceId, file_name: "proof.pdf", content_type: "application/pdf", status: "ready", storage_path: "private", uploaded_by: "private" } };
  for (const role of ["manager", null]) {
    const response = await fixture({ role, view }).handle(request()); const result = await response.json();
    assert.equal(response.status, 200); assert.deepEqual(result.statement.snapshot, snapshot);
    assert.equal(Object.hasOwn(result.statement, "preview_snapshot"), role === "manager");
    assert.equal(Object.hasOwn(result.statement, "draft_evidence"), role === "manager");
    if (role === "manager") assert.deepEqual(result.statement.draft_evidence, { id: evidenceId, file_name: "proof.pdf", content_type: "application/pdf", status: "ready" });
    assert.equal(JSON.stringify(result).includes("private"), false);
    assert.equal(response.headers.get("cache-control"), "no-store");
  }
  for (const status of ["pending", "unexpected"]) {
    const response = await fixture({ view: { ...view, draft_evidence: { ...view.draft_evidence, status } } }).handle(request());
    assert.equal((await response.json()).statement.draft_evidence.status, "pending");
  }
});

test("file links require same-order authorized evidence and expire after 60 seconds", async () => {
  for (const options of [{ file: { id: evidenceId, storage_path: "private", order_id: "another-order" } }, { rpcError: "partner_network_cost_evidence_access" }]) {
    const f = fixture({ role: null, ...options }); assert.equal((await f.handle(request(null, `?evidence=${evidenceId}`))).status, 404);
    assert.equal(f.calls.some(call => call[0] === "storageClient"), false);
  }
  const f = fixture({ role: null }); const response = await f.handle(request(null, `?evidence=${evidenceId}`));
  assert.equal(response.status, 200); assert.deepEqual(f.calls.at(-1), ["signedDownload", `partner/${evidenceId}`, 60, { download: "proof.pdf" }]);
});

test("upload prepare limits type/size/privilege fields and never publishes a file", async () => {
  for (const change of [{ size: COST_STATEMENT_FILE_LIMIT + 1 }, { contentType: "image/svg+xml" }, { size: 0 }, { order_id: "another-order" }]) {
    const f = fixture(); assert.equal((await f.handle(request({ action: "prepare", fileName: "proof.pdf", contentType: "application/pdf", size: 20, ...change }))).status, 400);
    assert.equal(f.calls.some(call => call[0] === "signedUpload"), false);
  }
  const f = fixture(); const response = await f.handle(request({ action: "prepare", fileName: "proof.pdf", contentType: "application/pdf", size: 20 }));
  assert.equal(response.status, 200);
  assert.deepEqual(f.calls[1], ["partner_network_prepare_cost_evidence", { p_order_id: "order-1", p_file_name: "proof.pdf", p_content_type: "application/pdf", p_expected_size: 20 }]);
  assert.equal(f.calls.some(call => call[0] === "partner_network_cost_statement"), false);
});

test("finalize checks stored MIME and exact size before declaring a private upload ready", async () => {
  for (const info of [{ size: 21, mimetype: "application/pdf" }, { size: 20, mimetype: "image/png" }, null]) {
    const f = fixture({ info }); assert.equal((await f.handle(request({ action: "finalize", evidenceId }))).status, 409);
    assert.equal(f.calls.some(call => call[0] === "partner_network_finalize_cost_evidence"), false);
  }
  const f = fixture(); assert.equal((await f.handle(request({ action: "finalize", evidenceId }))).status, 200);
  assert.deepEqual(f.calls.at(-1), ["partner_network_finalize_cost_evidence", { p_id: evidenceId, p_actual_size: 20 }]);
});

test("publication requires explicit content review, bounded own-order input and safe conflict response", async () => {
  for (const change of [{ contentReviewed: false }, { summary: "" }, { order_id: "forged" }, { summary: "x".repeat(9000) },
    { expectedSnapshot: null }, { expectedSnapshot: { ...snapshot, private_data: "unexpected" } }, { expectedSnapshot: { ...snapshot, internal_cost_total: null } }]) {
    const f = fixture(); assert.equal((await f.handle(request({ action: "publish", summary: "Đã kiểm tra riêng cho đơn này", evidenceId: null, contentReviewed: true, expectedSnapshot: snapshot, ...change }))).status, 400);
    assert.equal(f.calls.some(call => call[0] === "partner_network_cost_statement"), false);
  }
  const f = fixture(); const response = await f.handle(request({ action: "publish", summary: "Đã kiểm tra riêng cho đơn này", evidenceId, contentReviewed: true, expectedSnapshot: snapshot }));
  assert.deepEqual(await response.json(), { ok: true });
  assert.deepEqual(f.calls.at(-1), ["partner_network_cost_statement", { p_order_id: "order-1", p_action: "publish", p_input: { summary: "Đã kiểm tra riêng cho đơn này", evidence_id: evidenceId, content_reviewed: true, expected_snapshot: snapshot } }]);
  const conflict = fixture({ rpcError: "partner_network_cost_statement" }); const failure = await conflict.handle(request({ action: "withdraw", reason: "Tài liệu cần cập nhật lại" }));
  assert.equal(failure.status, 409); assert.deepEqual(await failure.json(), { ok: false, error: "statement_changed" });
});
