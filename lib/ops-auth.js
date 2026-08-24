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

// Shared by proxy.js (page requests, reads the cookie via NextRequest) and the /api/ops/*
// route handlers (reads it via next/headers' cookies() instead, since Route Handlers get a
// plain Request, not a NextRequest). No OPS_PIN configured means this always fails closed.
export async function isOpsAuthedToken(cookieValue) {
  const opsPin = process.env.OPS_PIN;
  if (!opsPin) return false;
  return !!cookieValue && cookieValue === (await opsAuthToken(opsPin));
}
