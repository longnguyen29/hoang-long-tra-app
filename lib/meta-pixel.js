export const META_PIXEL_ID = "299447179710901";
export const META_CONSENT_KEY = "hl-meta-consent-v1";
const publicPaths = new Set(["/", "/shop", "/story", "/gallery", "/wholesale", "/hong-tra-ban-si", "/sample", "/sample/menu-lab", "/cho-quan", "/chon-tra-theo-vi", "/hanh-trinh-la-tra", "/mau-thu-doanh-nghiep", "/sessions", "/privacy"]);
const publicAnchors = {
  "/hong-tra-ban-si": new Set(["dau-trang", "san-pham", "quy-cach", "mau-bao-gia"]),
  "/wholesale": new Set(["trade-brief"]),
};
const menuLabValues = {
  entry: new Set(["cafe"]),
  use: new Set(["milk", "fruit", "sparkling", "cold"]),
  character: new Set(["strong", "floral", "honey", "smoky", "light"]),
};
const trackedLeadIds = new Set();

export function canShowCookiePreferences(location) {
  return ["hoanglongtra.com", "www.hoanglongtra.com"].includes(location.hostname) && publicPaths.has(location.pathname);
}

export function canTrackMeta(location) {
  if (!["hoanglongtra.com", "www.hoanglongtra.com"].includes(location.hostname) || !publicPaths.has(location.pathname)) return false;
  // These anchors and enum values are public navigation, not private link tokens.
  if (location.hash && !publicAnchors[location.pathname]?.has(location.hash.slice(1))) return false;
  const params = new URLSearchParams(location.search);
  return [...params.keys()].every(key => {
    if (/^(utm_(source|medium|campaign|content|term)|fbclid)$/.test(key)) return true;
    if (params.getAll(key).length !== 1) return false;
    const value = params.get(key);
    if (key === "lang") return ["vi", "en"].includes(value);
    if (location.pathname === "/cho-quan" && key === "drink") return menuLabValues.use.has(value);
    return location.pathname === "/sample/menu-lab" && Object.hasOwn(menuLabValues, key) && menuLabValues[key].has(value);
  });
}

export function hasMetaConsent() {
  try { return window.localStorage.getItem(META_CONSENT_KEY) === "granted"; }
  catch { return false; }
}

export function trackMetaLead(kind, requestId = "") {
  try {
    if (!hasMetaConsent() || !canTrackMeta(window.location) || !window.fbq) return;
    if (!["sample_request", "wholesale_enquiry"].includes(kind)) return;
    // The server receipt is used only in memory to avoid counting the same saved
    // request twice. It and the customer's form fields are never sent to Meta.
    const key = typeof requestId === "string" && requestId ? `${kind}:${requestId}` : "";
    if (key && trackedLeadIds.has(key)) return;
    window.fbq("trackSingle", META_PIXEL_ID, "Lead", { content_name: kind });
    if (key) {
      if (trackedLeadIds.size >= 256) trackedLeadIds.delete(trackedLeadIds.values().next().value);
      trackedLeadIds.add(key);
    }
  } catch { /* Advertising must never interrupt a successful enquiry. */ }
}
