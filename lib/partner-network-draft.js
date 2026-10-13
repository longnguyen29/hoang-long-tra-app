// Email-link callbacks commonly open a new tab. Keep a short-lived application
// draft across tabs, bound to the requested email; never store an auth token or lead.
export const PARTNER_DRAFT_KEY = "hl-partner-network-application-v1";
const TTL = 24 * 60 * 60 * 1000;
const FIELDS = ["business_name", "contact_name", "phone", "region", "partner_type", "notes", "consent"];
export function clearPartnerDraft(storage) { storage.removeItem(PARTNER_DRAFT_KEY); }
export function savePartnerDraft(storage, input, email, now = Date.now()) {
  const clean = Object.fromEntries(FIELDS.map(key => [key, input[key]]));
  storage.setItem(PARTNER_DRAFT_KEY, JSON.stringify({ input: clean, email: String(email).trim().toLowerCase(), saved_at: now }));
}
export function readPartnerDraft(storage, verifiedEmail, now = Date.now()) {
  if (!verifiedEmail) return null;
  let saved;
  try { saved = JSON.parse(storage.getItem(PARTNER_DRAFT_KEY) || "null"); } catch { clearPartnerDraft(storage); return null; }
  if (!saved || typeof saved.saved_at !== "number" || !Number.isFinite(saved.saved_at) || saved.saved_at > now || now - saved.saved_at >= TTL || saved.email !== String(verifiedEmail).trim().toLowerCase()) {
    clearPartnerDraft(storage); return null;
  }
  if (!saved.input || typeof saved.input !== "object" || Array.isArray(saved.input)) { clearPartnerDraft(storage); return null; }
  const input = {};
  for (const key of FIELDS) {
    if (key === "consent") input[key] = saved.input[key] === true;
    else if (typeof saved.input[key] === "string") input[key] = saved.input[key];
  }
  return input;
}
