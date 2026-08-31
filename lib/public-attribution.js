const clean = (value, max = 80) => String(value || "").trim().toLowerCase().replace(/[^a-z0-9._-]/g, "-").slice(0, max);

export function attributionFromLocation(search = "", referrer = "") {
  const params = new URLSearchParams(search);
  let source = clean(params.get("utm_source"));
  if (!source && referrer) {
    try {
      const host = new URL(referrer).hostname.replace(/^www\./, "");
      source = host.endsWith("hoanglongtra.com") ? "website"
        : host.includes("threads.net") ? "threads"
        : host.includes("tiktok.com") ? "tiktok"
        : host.includes("facebook.com") || host.includes("instagram.com") ? "facebook-instagram"
        : clean(host);
    } catch {
      source = "";
    }
  }
  return {
    source: source || "direct",
    medium: clean(params.get("utm_medium")),
    campaign: clean(params.get("utm_campaign")),
    content: clean(params.get("utm_content")),
  };
}

export function visitorSession(storage, makeId) {
  try {
    const current = storage.getItem("hl-visitor-session");
    if (current) return current;
    const created = makeId();
    storage.setItem("hl-visitor-session", created);
    return created;
  } catch {
    return makeId();
  }
}

export function safeReferrer(value = "") {
  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname}`.slice(0, 200);
  } catch {
    return "";
  }
}

export async function recordPublicConversion(supabase, eventName, { pack = "", placement = "", once = false } = {}) {
  if (typeof window === "undefined") return { skipped: true };
  const session = visitorSession(window.localStorage, () => crypto.randomUUID());
  const onceKey = `hl-conversion:${eventName}:${placement || window.location.pathname}`;
  if (once) {
    try {
      if (window.sessionStorage.getItem(onceKey)) return { skipped: true };
    } catch {
      // Attribution must never block the customer path.
    }
  }
  const attribution = attributionFromLocation(window.location.search, document.referrer);
  const referrer = safeReferrer(document.referrer);
  const result = await supabase.rpc("record_public_conversion_event", {
    p_event_name: eventName,
    p_session: session,
    p_path: window.location.pathname,
    p_referrer: referrer,
    p_source: attribution.source,
    p_medium: attribution.medium,
    p_campaign: attribution.campaign,
    p_content: attribution.content,
    p_metadata: { pack, placement },
  });
  if (once && !result.error) {
    try { window.sessionStorage.setItem(onceKey, "1"); } catch { /* non-blocking */ }
  }
  return result;
}
