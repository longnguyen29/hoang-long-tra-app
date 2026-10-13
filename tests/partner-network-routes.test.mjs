import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { AsyncLocalStorage } from "node:async_hooks";
import { pathToFileURL } from "node:url";
import path from "node:path";
// Next's matcher utilities expect the runtime bootstrap used by its server.
globalThis.AsyncLocalStorage ??= AsyncLocalStorage;

// Only auth exchange is isolated. Exercise the actual route and production feature gate.
const authUrl = "data:text/javascript," + encodeURIComponent("let error=null;let calls=[];export function reset(value=null){error=value;calls=[]}export function readCalls(){return calls}export async function createClient(){return {auth:{exchangeCodeForSession:async code=>{calls.push(code);return {error}}}}}");
registerHooks({ resolve(specifier, context, next) {
  if (specifier === "server-only") return { url: "data:text/javascript,export{}", shortCircuit: true };
  if (specifier === "@/lib/supabase/server") return { url: authUrl, shortCircuit: true };
  if (specifier === "next/server") return next(pathToFileURL(path.resolve("node_modules/next/server.js")).href, context);
  if (specifier.startsWith("@/")) return next(pathToFileURL(path.resolve(specifier.slice(2) + ".js")).href, context);
  return next(specifier, context);
} });
const { reset, readCalls } = await import(authUrl);
const { GET } = await import("../app/partners/auth/callback/route.js");
const { partnerNetworkEnabled, partnerAuthDestination, partnerNetworkPublicRegistrationEnabled, partnerRegistrationAccess } = await import("../lib/partner-network-server.js");
const { config: proxyConfig } = await import("../proxy.js");
const { unstable_doesMiddlewareMatch } = await import("next/dist/experimental/testing/server/middleware-testing-utils.js");
test("the manager module cannot implicitly open public partner intake", async () => {
  const savedModule = process.env.PARTNER_NETWORK_ENABLED;
  const savedIntake = process.env.PARTNER_NETWORK_PUBLIC_REGISTRATION;
  const closed = { allowRegistration: false, publicRegistration: false, registrationUserId: null };
  try {
    process.env.PARTNER_NETWORK_ENABLED = "true";
    for (const value of [undefined, "", "false", "1", "TRUE"]) {
      if (value === undefined) delete process.env.PARTNER_NETWORK_PUBLIC_REGISTRATION; else process.env.PARTNER_NETWORK_PUBLIC_REGISTRATION = value;
      assert.equal(partnerNetworkPublicRegistrationEnabled(), false);
      assert.deepEqual(await partnerRegistrationAccess(null, { rpc() { throw new Error("Must not grant anonymous internal review"); } }), closed);
    }
    process.env.PARTNER_NETWORK_PUBLIC_REGISTRATION = "true";
    assert.equal(partnerNetworkPublicRegistrationEnabled(), true);
    assert.deepEqual(await partnerRegistrationAccess(null, {}), { allowRegistration: true, publicRegistration: true, registrationUserId: null });
    process.env.PARTNER_NETWORK_ENABLED = "false";
    assert.equal(partnerNetworkPublicRegistrationEnabled(), false);
    assert.deepEqual(await partnerRegistrationAccess(null, {}), closed);
  } finally {
    if (savedModule === undefined) delete process.env.PARTNER_NETWORK_ENABLED; else process.env.PARTNER_NETWORK_ENABLED = savedModule;
    if (savedIntake === undefined) delete process.env.PARTNER_NETWORK_PUBLIC_REGISTRATION; else process.env.PARTNER_NETWORK_PUBLIC_REGISTRATION = savedIntake;
  }
});
test("closed public intake allows only a verified server-checked manager to review registration", async () => {
  const savedModule = process.env.PARTNER_NETWORK_ENABLED;
  const savedIntake = process.env.PARTNER_NETWORK_PUBLIC_REGISTRATION;
  const manager = { id: "verified-staff", email: "staff@example.test", email_confirmed_at: "2026-10-12" };
  let calls = 0;
  const staffClient = { async rpc(name) { calls++; assert.equal(name, "is_staff_manager"); return { data: true, error: null }; } };
  try {
    process.env.PARTNER_NETWORK_ENABLED = "true"; delete process.env.PARTNER_NETWORK_PUBLIC_REGISTRATION;
    assert.deepEqual(await partnerRegistrationAccess(manager, staffClient), { allowRegistration: true, publicRegistration: false, registrationUserId: manager.id });
    assert.equal(calls, 1);
    for (const user of [null, { ...manager, email_confirmed_at: null }, { ...manager, email: "" }]) assert.equal((await partnerRegistrationAccess(user, staffClient)).allowRegistration, false);
    assert.equal(calls, 1);
    for (const client of [{ async rpc() { return { data: false, error: null }; } }, { async rpc() { return { data: true, error: { message: "permission check failed" } }; } }, { async rpc() { throw new Error("offline"); } }]) {
      assert.equal((await partnerRegistrationAccess(manager, client)).allowRegistration, false);
    }
  } finally {
    if (savedModule === undefined) delete process.env.PARTNER_NETWORK_ENABLED; else process.env.PARTNER_NETWORK_ENABLED = savedModule;
    if (savedIntake === undefined) delete process.env.PARTNER_NETWORK_PUBLIC_REGISTRATION; else process.env.PARTNER_NETWORK_PUBLIC_REGISTRATION = savedIntake;
  }
});
test("partner buyer and referral routes refresh sessions without extending refresh to the retail catalog", () => {
  for (const pathname of ["/partners", "/partners/account", "/partners/network", "/partners/auth/callback?code=test", "/admin/partner-network"]) {
    assert.equal(unstable_doesMiddlewareMatch({ config: proxyConfig, url: `https://www.hoanglongtra.com${pathname}` }), true, pathname);
  }
  for (const pathname of ["/shop", "/shop/test-tea", "/catalog", "/wholesale", "/partners-other"]) {
    assert.equal(unstable_doesMiddlewareMatch({ config: proxyConfig, url: `https://www.hoanglongtra.com${pathname}` }), false, pathname);
  }
});
test("network routes are opt-in and auth exchange does not run while disabled", async () => {
  const saved = process.env.PARTNER_NETWORK_ENABLED;
  try {
    for (const value of [undefined, "", "false", "1", "TRUE"]) {
      if (value === undefined) delete process.env.PARTNER_NETWORK_ENABLED; else process.env.PARTNER_NETWORK_ENABLED = value;
      reset(); assert.equal(partnerNetworkEnabled(), false);
      assert.equal((await GET(new Request("http://localhost:3110/partners/auth/callback?code=test"))).status, 404);
      assert.deepEqual(readCalls(), []);
    }
  } finally { if (saved === undefined) delete process.env.PARTNER_NETWORK_ENABLED; else process.env.PARTNER_NETWORK_ENABLED = saved; }
});
test("email login callback cannot redirect to external or admin destinations", async () => {
  const saved = process.env.PARTNER_NETWORK_ENABLED;
  process.env.PARTNER_NETWORK_ENABLED = "true";
  try {
    for (const next of ["https://evil.example", "//evil.example", "/admin", "/partners/network?user=other", "javascript:alert(1)"]) {
      reset(); assert.equal(partnerAuthDestination(next), "/partners/network");
      const response = await GET(new Request(`http://localhost:3110/partners/auth/callback?code=test&next=${encodeURIComponent(next)}`));
      assert.equal(response.headers.get("location"), "http://localhost:3110/partners/network");
      assert.deepEqual(readCalls(), ["test"]);
      assert.equal(response.headers.get("cache-control"), "no-store");
    }
    assert.equal(partnerAuthDestination("/partners/account"), "/partners/account");
  } finally { if (saved === undefined) delete process.env.PARTNER_NETWORK_ENABLED; else process.env.PARTNER_NETWORK_ENABLED = saved; }
});
test("missing/failed login code returns only a safe public error marker", async () => {
  const saved = process.env.PARTNER_NETWORK_ENABLED;
  process.env.PARTNER_NETWORK_ENABLED = "true";
  try {
    reset({ message: "private authentication detail" });
    const response = await GET(new Request("http://localhost:3110/partners/auth/callback?code=expired"));
    assert.equal(response.headers.get("location"), "http://localhost:3110/partners/network?auth_error=1");
    reset(); await GET(new Request("http://localhost:3110/partners/auth/callback"));
    assert.deepEqual(readCalls(), []);
  } finally { if (saved === undefined) delete process.env.PARTNER_NETWORK_ENABLED; else process.env.PARTNER_NETWORK_ENABLED = saved; }
});
