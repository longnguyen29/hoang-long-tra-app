import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { pathToFileURL } from "node:url";
import path from "node:path";

const adminUrl = "data:text/javascript," + encodeURIComponent("let admin;export function setAdmin(value){admin=value}export function createAdminClient(){return admin}");
registerHooks({ resolve(specifier, context, next) {
  if (specifier === "server-only") return { url: "data:text/javascript,export{}", shortCircuit: true };
  if (specifier === "@/lib/supabase/admin") return { url: adminUrl, shortCircuit: true };
  if (specifier.startsWith("@/")) return next(pathToFileURL(path.resolve(specifier.slice(2) + ".js")).href, context);
  return next(specifier, context);
} });
const { setAdmin } = await import(adminUrl);
const { POST } = await import("../app/api/staff/partners/invite/route.js");
const { normalizePartnerInvite, invitePartnerAccount, PARTNER_INVITE_REDIRECT, allowedPartnerInviteOrigin } = await import("../lib/partner-invites-server.js");
const actor = { id: "manager-id", email: "manager@example.test", email_confirmed_at: "2026-10-13T00:00:00Z" };
const target = (overrides = {}) => ({ id: "target-id", email: "friend@example.test", email_confirmed_at: null, is_anonymous: false, app_metadata: { provider: "email", providers: ["email"], existing_flag: "preserved" }, ...overrides });
function fixture(options = {}) {
  process.env.PARTNER_NETWORK_ENABLED = "true";
  process.env.PARTNER_NETWORK_PUBLIC_REGISTRATION = "false";
  process.env.NODE_ENV = "production";
  const calls = { auth: [], from: [], list: [], invite: [], update: [] };
  const users = options.users || [];
  const admin = {
    auth: {
      async getUser(token) { calls.auth.push(token); return { data: { user: options.signedOut ? null : { ...actor, ...(options.actor || {}) } }, error: null }; },
      admin: {
        async listUsers(args) { calls.list.push(args); return options.listResult ? options.listResult(args) : { data: { users }, error: null }; },
        async inviteUserByEmail(email, args) { calls.invite.push({ email, args }); if (options.inviteFailure) return { data: { user: null }, error: options.inviteFailure }; const user = target(); users.push(user); return { data: { user, PRIVATE_TOKEN: "provider-token" }, error: null }; },
        async updateUserById(id, args) { calls.update.push({ id, args }); if (options.updateFailure) return { data: { user: null }, error: { message: "PRIVATE BACKEND DETAIL" } }; const user = users.find((row) => row.id === id); if (!user) throw new Error("fixture target missing"); user.app_metadata = args.app_metadata; return { data: { user }, error: null }; },
      },
    },
    from(table) { calls.from.push(table); return { select() { return this; }, eq() { return this; }, async maybeSingle() { return { data: { role: options.role || "manager" }, error: null }; } }; },
  };
  setAdmin(admin);
  return { calls, admin, users };
}
function send(body = { email: "FRIEND@example.test", displayName: "Test friend" }, headers = {}, raw) {
  return POST(new Request("https://www.hoanglongtra.com/api/staff/partners/invite", {
    method: "POST", headers: { origin: "https://www.hoanglongtra.com", "content-type": "application/json", authorization: "Bearer verified-manager-token", ...headers }, body: raw ?? JSON.stringify(body),
  }));
}
test("new private invitations keep redirects fixed, preserve app metadata and grant no staff/partner approval", async () => {
  const { calls, users } = fixture();
  const response = await send();
  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), { ok: true, kind: "invited", emailRequested: true });
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(calls.from, ["staff_roles"]);
  assert.equal(calls.invite[0].email, "friend@example.test");
  assert.equal(calls.invite[0].args.redirectTo, PARTNER_INVITE_REDIRECT);
  assert.deepEqual(calls.invite[0].args.data, { full_name: "Test friend" });
  assert.equal(calls.update[0].id, "target-id");
  assert.deepEqual(Object.keys(calls.update[0].args), ["app_metadata"]);
  const metadata = users[0].app_metadata;
  assert.equal(metadata.hl_partner_invited, true);
  assert.equal(metadata.hl_partner_invited_by, actor.id);
  assert.equal(metadata.provider, "email");
  assert.deepEqual(metadata.providers, ["email"]);
  assert.equal(metadata.existing_flag, "preserved");
  for (const name of ["role", "status", "approved", "rate_percent", "partner_id"]) assert.equal(Object.hasOwn(metadata, name), false);
});
test("existing and previously invited accounts reuse exact identity without another email", async () => {
  const { calls, users } = fixture({ users: [target({ email_confirmed_at: "2026-10-12" })] });
  const first = await send();
  assert.deepEqual(await first.json(), { ok: true, kind: "existing", emailRequested: false });
  const retry = await send();
  assert.deepEqual(await retry.json(), { ok: true, kind: "already_invited", emailRequested: false });
  assert.equal(calls.invite.length, 0);
  assert.equal(calls.update.length, 1);
  assert.equal(users[0].app_metadata.hl_partner_invited, true);
  assert.equal(Object.hasOwn(users[0].app_metadata, "hl_partner_invite_email_requested_at"), false);
});
test("after a sent-invite grant failure, a retry grants the retained account without another email", async () => {
  const { calls, admin, users } = fixture({ updateFailure: true });
  const failed = await send();
  assert.equal(failed.status, 500);
  assert.deepEqual(await failed.json(), { ok: false, error: "invite_access_failed", emailRequested: true });
  assert.equal(users.length, 1);
  admin.auth.admin.updateUserById = async (id, args) => { calls.update.push({ id, args }); users[0].app_metadata = args.app_metadata; return { data: { user: users[0] }, error: null }; };
  const retry = await send();
  assert.deepEqual(await retry.json(), { ok: true, kind: "existing", emailRequested: false });
  assert.equal(calls.invite.length, 1);
});
test("existing-account grant errors never claim an email was sent", async () => {
  fixture({ users: [target()], updateFailure: true });
  const response = await send();
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { ok: false, error: "existing_access_failed", emailRequested: false });
});
test("disabled module, untrusted origins and insufficient or unverified staff never touch recipient accounts", async () => {
  for (const options of [{ role: "employee" }, { actor: { email_confirmed_at: null } }, { signedOut: true }]) {
    const { calls } = fixture(options);
    const response = await send();
    assert.equal(response.status, options.signedOut ? 401 : 403);
    assert.equal(calls.list.length, 0); assert.equal(calls.invite.length, 0); assert.equal(calls.update.length, 0);
  }
  const { calls } = fixture();
  for (const origin of ["https://attacker.test", "https://www.hoanglongtra.com/", "https://ops.hoanglongtra.com"]) assert.equal((await send(undefined, { origin })).status, 403);
  assert.equal((await send(undefined, { authorization: "" })).status, 401);
  process.env.PARTNER_NETWORK_ENABLED = "false";
  assert.equal((await send()).status, 404);
  assert.equal(calls.list.length, 0); assert.equal(calls.invite.length, 0);
});
test("bounded input rejects forged privileges, caller redirects and invalid recipient fields", async () => {
  const { calls } = fixture();
  for (const body of [null, [], { email: "wrong" }, { email: "friend@example.test", displayName: "x".repeat(121) },
    { email: "friend@example.test", role: "admin" }, { email: "friend@example.test", app_metadata: { hl_partner_invited: true } },
    { email: "friend@example.test", redirectTo: "https://attacker.test" }]) assert.equal((await send(body)).status, 400);
  assert.equal((await send(null, {}, "{" )).status, 400);
  assert.equal((await send(null, {}, JSON.stringify({ email: "friend@example.test", displayName: "茶".repeat(3000) }))).status, 400);
  assert.equal(calls.list.length, 0); assert.equal(calls.invite.length, 0);
  assert.deepEqual(normalizePartnerInvite({ email: " FRIEND@EXAMPLE.TEST ", displayName: "  Cafe\u0301\u202e friend  " }), { email: "friend@example.test", displayName: "Café friend" });
});
test("recipient lookup is bounded, detects ambiguous accounts and never returns the Auth directory", async () => {
  const { admin, calls } = fixture({ listResult: () => ({ data: { users: Array.from({ length: 100 }, (_, i) => ({ id: `other-${i}`, email: `other-${i}@example.test` })) }, error: null }) });
  await assert.rejects(invitePartnerAccount(admin, actor, { email: "friend@example.test" }), /invite_failed/);
  assert.equal(calls.list.length, 10);
  assert.equal(calls.invite.length, 0);
  fixture({ users: [target(), target({ id: "different-account" })] });
  const response = await send();
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { ok: false, error: "invite_failed", emailRequested: false });
});
test("provider rate limits and errors produce safe responses without details or tokens", async () => {
  fixture({ inviteFailure: { status: 429, message: "SECRET PROVIDER DETAILS" } });
  const limited = await send();
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get("retry-after"), "60");
  assert.deepEqual(await limited.json(), { ok: false, error: "too_many_requests", emailRequested: false });
  fixture({ inviteFailure: { status: 400, message: "PRIVATE KEY OR EMAIL" } });
  assert.deepEqual(await (await send()).json(), { ok: false, error: "invite_failed", emailRequested: false });
});
test("production requires the same known origin; development accepts loopback aliases only at the same port", () => {
  const request = (url, origin) => new Request(url, { headers: { origin } });
  assert.equal(allowedPartnerInviteOrigin(request("https://www.hoanglongtra.com/api/staff/partners/invite", "https://www.hoanglongtra.com"), true), true);
  assert.equal(allowedPartnerInviteOrigin(request("https://www.hoanglongtra.com/api/staff/partners/invite", "https://ops.hoanglongtra.com"), true), false);
  assert.equal(allowedPartnerInviteOrigin(request("http://localhost:3114/api/staff/partners/invite", "http://127.0.0.1:3114"), false), true);
  assert.equal(allowedPartnerInviteOrigin(request("http://localhost:3114/api/staff/partners/invite", "http://127.0.0.1:3115"), false), false);
  assert.equal(allowedPartnerInviteOrigin(request("http://localhost:3114/api/staff/partners/invite", "http://127.0.0.1:3114"), true), false);
});
