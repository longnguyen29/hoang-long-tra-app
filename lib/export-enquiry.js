// The export brief is stored through the existing private contact intake and
// Pipeline transaction. These display IDs are not catalogue SKUs or ownership.
import { EXPORT_TEAS } from "./export-teas.js";
export const EXPORT_ENQUIRY_NOTE_LIMIT = 200;
const TEA_IDS = new Set(EXPORT_TEAS.map((tea) => tea.id));
const INTENTS = new Set(["sample", "quote", "factory_visit"]);
const CONTACT_METHODS = new Set(["email", "phone", "line", "zalo", "whatsapp"]);
const TRACKING = ["source", "medium", "campaign", "content"];
const HIDDEN = /[\u0000-\u001f\u007f-\u009f\u061c\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/gu;

function invalid(code = "invalid_request") { throw new Error(code); }
function text(value, limit, required = false) {
  if (value === undefined && !required) return "";
  if (typeof value !== "string" || value.length > limit) invalid();
  const clean = value.normalize("NFC").replace(HIDDEN, "").replace(/\s+/gu, " ").trim();
  if ((required && !clean) || clean.length > limit) invalid();
  return clean;
}

// Only bounded campaign labels survive; arbitrary query parameters such as
// contact details and partner IDs are not copied. No label assigns a partner.
export function exportAttribution(search = "") {
  const params = new URLSearchParams(search);
  const attribution = {};
  for (const field of TRACKING) {
    const values = params.getAll(`utm_${field}`);
    const value = values.length === 1 ? values[0] : "";
    attribution[field] = /^[a-z0-9._-]{1,32}$/i.test(value) ? value.toLowerCase() : "";
  }
  return { ...attribution, source: attribution.source || "website", medium: attribution.medium || "owned", campaign: attribution.campaign || "taiwan_exw_v1" };
}

export function exportLink(path, search = "", locale = "zh-TW") {
  // Only local, known buyer resources receive the preserved campaign labels.
  if (!["/company", "/catalog", "/partners/network", "/wholesale", "/export/taiwan"].includes(path)) invalid();
  const params = new URLSearchParams();
  for (const [field, value] of Object.entries(exportAttribution(search))) if (value) params.set(`utm_${field}`, value);
  const language = ["vi", "en", "zh-TW"].includes(locale) ? locale : "zh-TW";
  params.set("lang", path === "/export/taiwan" ? language : language === "vi" ? "vi" : "en");
  return `${path}?${params}`;
}

export function exportEventInput(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) invalid();
  if (input.consent !== true) invalid("consent_required");
  if (input.authorized !== true) invalid("authorization_required");
  if (!Array.isArray(input.teaIds) || input.teaIds.length < 1 || input.teaIds.length > 4
      || new Set(input.teaIds).size !== input.teaIds.length || input.teaIds.some((id) => !TEA_IDS.has(id))) invalid("tea_required");
  if (!INTENTS.has(input.intent)) invalid();
  if (!CONTACT_METHODS.has(input.contactMethod)) invalid();
  const currency = input.currency === undefined ? "USD" : input.currency;
  if (!["VND", "USD", "TWD", "CNY"].includes(currency)) invalid();
  const business = text(input.business, 120, true);
  const name = text(input.name, 80, true);
  const contactDetail = text(input.contactDetail, 60);
  if (["line", "zalo", "whatsapp"].includes(input.contactMethod) && !contactDetail) invalid("contact_detail_required");
  const quantityText = text(input.quantityKg, 14);
  let quantity = "Not yet specified";
  if (quantityText) {
    if (!/^(?:\d{1,8})(?:\.\d{1,3})?$/.test(quantityText) || Number(quantityText) <= 0 || Number(quantityText) > 10000000) invalid("invalid_quantity");
    quantity = `${Number(quantityText)} kg`;
  }
  const desiredDate = text(input.desiredDate, 10);
  if (desiredDate && (!/^\d{4}-\d{2}-\d{2}$/.test(desiredDate)
      || !Number.isFinite(new Date(`${desiredDate}T00:00:00Z`).getTime())
      || new Date(`${desiredDate}T00:00:00Z`).toISOString().slice(0, 10) !== desiredDate)) invalid("invalid_date");
  const requirements = text(input.requirements, EXPORT_ENQUIRY_NOTE_LIMIT);
  const connectorName = text(input.connectorName, 40);
  const connectorContact = text(input.connectorContact, 60);
  const attribution = input.attribution;
  if (!attribution || typeof attribution !== "object" || Array.isArray(attribution)) invalid();
  const tags = TRACKING.map((field) => {
    const value = attribution[field];
    if (typeof value !== "string" || (value && !/^[a-z0-9._-]{1,32}$/i.test(value))) invalid();
    return value ? `${field}=${value.toLowerCase()}` : "";
  }).filter(Boolean).join(";");
  // Stable sorting makes a retry independent of the order of checkbox clicks.
  const teaNames = EXPORT_TEAS.filter((tea) => input.teaIds.includes(tea.id)).map((tea) => tea.name.vi).join(", ");
  const purpose = { sample: "Samples", quote: "EXW quotation", factory_visit: "Factory visit" }[input.intent];
  const note = [
    "[Taiwan export / EXW]", `Purpose: ${purpose}`, `Tea: ${teaNames}`, `Volume: ${quantity}`,
    desiredDate && `Desired date: ${desiredDate}`, `Contact: ${input.contactMethod}${contactDetail ? ` / ${contactDetail}` : ""}`, `Quote currency: ${currency}`,
    (connectorName || connectorContact) && `Introducer (buyer-provided): ${[connectorName, connectorContact].filter(Boolean).join(" / ")}`,
    requirements && `Requirements: ${requirements}`, tags && `UTM: ${tags}`, "Buyer/authorized contact consented.",
  ].filter(Boolean).join(" | ");
  if (note.length > 700) invalid("note_too_long");
  return {
    requestId: input.requestId, name, business, contact: input.contact,
    intent: input.intent === "factory_visit" ? "cooperation" : input.intent,
    note, consent: true, website: input.website,
    // The shared transaction currently has a versioned contact campaign
    // constraint. Preserve export campaign metadata in the structured note.
    attribution: { source: "website", medium: attribution.medium === "referral" ? "referral" : "owned", campaign: "event_contact_v1" },
  };
}

export function exportRequirementsLimit(form, attribution) {
  try {
    const preview = exportEventInput({ ...form, name: "Preview", business: "Preview", consent: true, authorized: true, requirements: "", attribution });
    return Math.max(0, Math.min(EXPORT_ENQUIRY_NOTE_LIMIT, 700 - preview.note.length - " | Requirements: ".length));
  } catch { return EXPORT_ENQUIRY_NOTE_LIMIT; }
}
