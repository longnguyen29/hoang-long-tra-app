import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { normalizeContact } from "./trade-pipeline.js";

export const EVENT_ENQUIRY_BODY_LIMIT = 8192;
export const EVENT_ENQUIRY_CAMPAIGN = "event_contact_v1";
export const EVENT_ENQUIRY_CONSENT_VERSION = "event_contact_v2";
const SOURCES = new Set(["teashow", "event", "website", "zalo"]);
const MEDIUMS = new Set(["qr", "referral", "owned"]);
const INTENTS = new Set(["sample", "quote", "cooperation"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HIDDEN = /[\u0000-\u001f\u007f-\u009f\u061c\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/gu;
const PUBLIC_ORIGINS = new Set(["https://www.hoanglongtra.com", "https://hoanglongtra.com"]);

function invalid(code = "invalid_request") { throw new Error(code); }
function textField(value, limit, required = false) {
  if (value === undefined && !required) return "";
  if (typeof value !== "string" || value.length > limit) invalid();
  const clean = value.normalize("NFC").replace(HIDDEN, "").replace(/\s+/gu, " ").trim();
  if (clean.length > limit || (required && !clean)) invalid();
  return clean;
}
function contactField(value) {
  let contact;
  try { contact = textField(value, 120, true); } catch { invalid("invalid_contact"); }
  if (contact.includes("@")) {
    if (!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i.test(contact)) invalid("invalid_contact");
    return contact.toLowerCase();
  }
  const digits = contact.replace(/\D/g, "");
  if (!/^\+?[0-9 ().-]+$/.test(contact) || digits.length < 8 || digits.length > 15
      || (contact.startsWith("+") && digits.startsWith("0"))) invalid("invalid_contact");
  return contact;
}

export function normalizeEventEnquiry(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) invalid();
  if (input.consent !== true) invalid("consent_required");
  if (input.website !== undefined && (typeof input.website !== "string" || input.website.trim())) invalid();
  const requestId = typeof input.requestId === "string" ? input.requestId.trim().toLowerCase() : "";
  if (!UUID.test(requestId)) invalid();
  const name = textField(input.name, 80, true);
  const business = textField(input.business, 120);
  const contact = contactField(input.contact);
  const contactKey = normalizeContact(contact);
  if (!contact.includes("@") && contactKey.length < 8) invalid("invalid_contact");
  if (!INTENTS.has(input.intent)) invalid();
  const note = textField(input.note, 700);
  const attribution = input.attribution;
  if (!attribution || typeof attribution !== "object" || Array.isArray(attribution)
      || !SOURCES.has(attribution.source) || !MEDIUMS.has(attribution.medium)
      || attribution.campaign !== EVENT_ENQUIRY_CAMPAIGN) invalid();
  return { requestId, name, business, contact, contactKey, intent: input.intent, note,
    source: attribution.source, medium: attribution.medium, campaign: EVENT_ENQUIRY_CAMPAIGN };
}

export function eventEnquiryReference(requestId) {
  return `HL-E-${requestId.slice(0, 8).toUpperCase()}`;
}

export function allowedEventEnquiryOrigin(request, production = process.env.NODE_ENV === "production") {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  if (PUBLIC_ORIGINS.has(origin)) return true;
  if (production) return false;
  try {
    const target = new URL(request.url);
    const sender = new URL(origin);
    const loopback = ["localhost", "127.0.0.1", "[::1]"];
    // Next dev may reconstruct the URL as localhost when visited at 127.0.0.1.
    return loopback.includes(target.hostname) && loopback.includes(sender.hostname)
      && ["http:", "https:"].includes(target.protocol)
      && sender.protocol === target.protocol && sender.port === target.port
      && sender.origin === origin;
  } catch { return false; }
}

// Vercel overwrites its forwarding header. Production never trusts the caller's
// ordinary x-forwarded-for; a missing validated address shares an unknown bucket.
function forwardedIp(headers, production) {
  const forwarded = headers.get("x-vercel-forwarded-for")
    || (!production && headers.get("x-forwarded-for")) || "";
  const candidate = forwarded.split(",", 1)[0].trim();
  return isIP(candidate) ? candidate.toLowerCase() : "unknown";
}
export function eventEnquiryThrottleKeys(headers, secret, now = new Date(), production = process.env.NODE_ENV === "production") {
  if (typeof secret !== "string" || !secret.trim()) invalid("unavailable");
  const ip = forwardedIp(headers, production);
  const day = now.toISOString().slice(0, 10);
  const previousDay = new Date(now.getTime() - 86400000).toISOString().slice(0, 10);
  const hash = (date) => createHmac("sha256", secret)
    .update(`hl:event-enquiry:ip:v1\0${date}\0${ip}`).digest("hex");
  return { key: hash(day), previousKey: hash(previousDay) };
}

export async function readEventEnquiryBody(request) {
  if ((request.headers.get("content-type") || "").split(";", 1)[0].trim().toLowerCase() !== "application/json") invalid();
  const declared = request.headers.get("content-length");
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > EVENT_ENQUIRY_BODY_LIMIT)) invalid();
  if (!request.body) invalid();
  const reader = request.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let size = 0, raw = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > EVENT_ENQUIRY_BODY_LIMIT) { await reader.cancel(); invalid(); }
      raw += decoder.decode(value, { stream: true });
    }
    raw += decoder.decode();
    return JSON.parse(raw);
  } catch { invalid(); }
  finally { reader.releaseLock(); }
}
