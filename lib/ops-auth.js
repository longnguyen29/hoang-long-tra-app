// PIN gate for the internal ops console (see proxy.js and app/api/ops-auth/route.js).
// Uses Web Crypto instead of Node's crypto module so the same code runs in both the
// Edge middleware and the (Node) API route.
export const OPS_AUTH_COOKIE = "ops_auth";

export async function opsAuthToken(pin) {
  const bytes = new TextEncoder().encode(`ops-console:${pin}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
