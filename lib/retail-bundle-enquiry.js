import { RETAIL_BUNDLES } from "./retail-bundles.js";

export const RETAIL_BUNDLE_ENQUIRY_NOTE_LIMIT = 300;
export const RETAIL_BUNDLE_ENQUIRY_CAMPAIGN = "retail_bundles_v1";
const PLANNED_IDS = new Set(["find-your-taste", "lotus-discovery", "travel", "cafe-trial", "familiar-and-new"]);
const FIELDS = new Set(["requestId", "bundleId", "name", "contact", "note", "consent"]);
const HIDDEN = /[\u0000-\u001f\u007f-\u009f\u061c\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/gu;

function invalid(code = "invalid_request") { throw new Error(code); }
function noteField(value) {
  if (value === undefined) return "";
  if (typeof value !== "string" || value.length > RETAIL_BUNDLE_ENQUIRY_NOTE_LIMIT) invalid();
  const clean = value.normalize("NFC").replace(HIDDEN, "").replace(/\s+/gu, " ").trim();
  if (clean.length > RETAIL_BUNDLE_ENQUIRY_NOTE_LIMIT) invalid();
  return clean;
}

// Public display IDs are neither SKUs nor promises to supply a future pack.
// All commercial context comes from the server's approved definition.
export function retailBundleEventInput(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)
      || Object.keys(input).some(key => !FIELDS.has(key))) invalid();
  if (input.consent !== true) invalid("consent_required");
  const bundle = PLANNED_IDS.has(input.bundleId)
    && RETAIL_BUNDLES.find(item => item.id === input.bundleId && item.ready === false);
  if (!bundle) invalid();
  const name = typeof bundle.name === "string" ? bundle.name : bundle.name?.vi;
  if (typeof name !== "string" || !name.trim()) invalid();
  const customerNote = noteField(input.note);
  const note = [
    `[Retail bundle: ${bundle.id}]`, `Bộ trà: ${name}`,
    "Đăng ký quan tâm bộ dự kiến; chưa mở bán, chưa chốt giá/quy cách. Không phải đơn hàng.",
    `Campaign: ${RETAIL_BUNDLE_ENQUIRY_CAMPAIGN}`,
    customerNote && `Lời nhắn khách: ${customerNote}`,
  ].filter(Boolean).join(" | ");
  if (note.length > 700) invalid();
  return {
    requestId: input.requestId, name: input.name, business: "", contact: input.contact,
    // The existing durable intake permits sample/quote/cooperation. Quote is
    // its internal category; the saved context clearly records interest only.
    intent: "quote", note, consent: true,
    // Migration 0077 fixes the campaign column. Keep the retail campaign in the
    // saved note rather than bypassing or changing that transaction's schema.
    attribution: { source: "website", medium: "owned", campaign: "event_contact_v1" },
  };
}
