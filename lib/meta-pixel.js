export const META_PIXEL_ID = "299447179710901";
export const META_CONSENT_KEY = "hl-meta-consent-v1";
const publicPaths = new Set(["/", "/shop", "/story", "/gallery", "/wholesale", "/sample", "/sample/menu-lab", "/cho-quan", "/chon-tra-theo-vi", "/hanh-trinh-la-tra", "/mau-thu-doanh-nghiep", "/sessions", "/privacy"]);

export function canShowCookiePreferences(location) {
  return ["hoanglongtra.com", "www.hoanglongtra.com"].includes(location.hostname) && publicPaths.has(location.pathname);
}

export function canTrackMeta(location) {
  return ["hoanglongtra.com", "www.hoanglongtra.com"].includes(location.hostname)
    && publicPaths.has(location.pathname)
    && !location.hash
    && [...new URLSearchParams(location.search).keys()].every(key => /^(utm_(source|medium|campaign|content|term)|fbclid)$/.test(key));
}

export function hasMetaConsent() {
  try { return window.localStorage.getItem(META_CONSENT_KEY) === "granted"; }
  catch { return false; }
}

export function trackMetaLead(kind) {
  try {
    if (!hasMetaConsent() || !canTrackMeta(window.location) || !window.fbq) return;
    if (!["sample_request", "wholesale_enquiry"].includes(kind)) return;
    window.fbq("trackSingle", META_PIXEL_ID, "Lead", { content_name: kind });
  } catch { /* Advertising must never interrupt a successful enquiry. */ }
}
