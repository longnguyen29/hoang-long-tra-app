import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { pathToFileURL } from "node:url";
import path from "node:path";

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
const { partnerNetworkEnabled, partnerAuthDestination } = await import("../lib/partner-network-server.js");
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
