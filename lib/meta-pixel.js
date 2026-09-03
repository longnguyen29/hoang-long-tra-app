export const META_CONSENT_KEY = "hl-meta-consent";

const QUEUE_KEY = "__hlMetaPixelQueue";
const ONCE_PREFIX = "hl-meta-event:";
const ALLOWED_PARAMETER_KEYS = new Set([
  "content_category", "content_name", "currency", "funnel", "pack", "placement", "value", "variant",
]);

function pixelConfigured() {
  return /^\d+$/.test(process.env.NEXT_PUBLIC_META_PIXEL_ID || "");
}

function cleanParameters(parameters = {}) {
  return Object.fromEntries(Object.entries(parameters).flatMap(([key, value]) => {
    // This allowlist prevents a future call site from accidentally sending form fields.
    if (!ALLOWED_PARAMETER_KEYS.has(key)) return [];
    if (typeof value === "string") return [[key, value.trim().slice(0, 100)]];
    if (typeof value === "number" && Number.isFinite(value)) return [[key, value]];
    if (typeof value === "boolean") return [[key, value]];
    return [];
  }));
}

function claimOnce(onceKey) {
  if (!onceKey) return true;
  try {
    const key = `${ONCE_PREFIX}${onceKey}`;
    if (window.sessionStorage.getItem(key)) return false;
    window.sessionStorage.setItem(key, "1");
  } catch {
    // Tracking must never interrupt the customer journey.
  }
  return true;
}

function dispatch(command, eventName, parameters, onceKey) {
  if (typeof window === "undefined" || !pixelConfigured()) return false;
  try {
    if (window.localStorage.getItem(META_CONSENT_KEY) === "declined") return false;
  } catch {
    // An in-memory queue is still safe before the visitor makes a choice.
  }
  if (!claimOnce(onceKey)) return false;

  const call = [command, eventName, cleanParameters(parameters)];
  if (typeof window.fbq === "function") window.fbq(...call);
  else {
    window[QUEUE_KEY] = window[QUEUE_KEY] || [];
    window[QUEUE_KEY].push(call);
  }
  return true;
}

export function trackMetaPageView() {
  return dispatch("track", "PageView", {}, "");
}

export function trackMetaCustom(eventName, parameters = {}, { onceKey = "" } = {}) {
  return dispatch("trackCustom", eventName, parameters, onceKey);
}

export function trackMetaLead(parameters = {}, { onceKey = "" } = {}) {
  return dispatch("track", "Lead", parameters, onceKey);
}

export function flushMetaQueue() {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return;
  const pending = window[QUEUE_KEY] || [];
  window[QUEUE_KEY] = [];
  pending.forEach((call) => window.fbq(...call));
}

export function clearMetaQueue() {
  if (typeof window === "undefined") return;
  window[QUEUE_KEY] = [];
  try {
    for (let index = window.sessionStorage.length - 1; index >= 0; index -= 1) {
      const key = window.sessionStorage.key(index);
      if (key?.startsWith(ONCE_PREFIX)) window.sessionStorage.removeItem(key);
    }
  } catch {
    // Some browsers disable storage; the in-memory queue has still been cleared.
  }
}
