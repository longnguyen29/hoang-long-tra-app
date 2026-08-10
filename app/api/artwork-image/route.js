// Streams a museum image through our own origin.
//
// Why this exists: the idle screen's particle reveal reads the painting's real pixels with
// getImageData, which the browser forbids on a cross-origin image unless its host sends
// Access-Control-Allow-Origin on the actual GET.
//
// Neither museum does, so every artwork comes through here:
//   - openaccess-cdn.clevelandart.org sends no CORS header at all.
//   - images.metmuseum.org sends "Access-Control-Allow-Origin: *" on a HEAD request but
//     omits it on GET. Verified in the browser: <img crossOrigin="anonymous"> fails to load
//     and fetch(mode:"cors") throws, while a plain <img> with no crossOrigin loads fine.
//     Checking this with `curl -I` alone is misleading — it must be tested with GET.
//
// Nothing is stored. Each request fetches from the museum and pipes the bytes straight back,
// so they remain the source of truth and we hold no copy of their image.
//
// The allowlist is the security boundary and is not optional: a route that fetched any URL a
// caller handed it would be an open proxy, usable to probe machines on our network or to
// launder traffic through our domain. Only these exact hosts are ever fetched.

const ALLOWED_HOSTS = new Set([
  "openaccess-cdn.clevelandart.org",
  "openaccess-api.clevelandart.org",
  "images.metmuseum.org",
]);

export async function GET(request) {
  const src = new URL(request.url).searchParams.get("src");
  if (!src) return new Response("missing src", { status: 400 });

  let target;
  try {
    target = new URL(src);
  } catch {
    return new Response("bad src", { status: 400 });
  }

  if (target.protocol !== "https:" || !ALLOWED_HOSTS.has(target.hostname)) {
    return new Response("host not allowed", { status: 403 });
  }

  let upstream;
  try {
    upstream = await fetch(target.toString(), {
      headers: { Accept: "image/*" },
      // The museum's own cache headers are generous; a day here keeps the kiosk from
      // re-fetching the same painting all day while still picking up changes eventually.
      next: { revalidate: 86400 },
    });
  } catch (e) {
    console.error("Artwork fetch failed:", e?.message);
    return new Response("upstream unreachable", { status: 502 });
  }

  if (!upstream.ok) {
    return new Response("upstream error", { status: 502 });
  }

  const type = upstream.headers.get("content-type") || "";
  // Only ever hand back an image, whatever the upstream claims to be.
  if (!type.startsWith("image/")) {
    return new Response("not an image", { status: 502 });
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": type,
      "Cache-Control": "public, max-age=86400, immutable",
      // Same-origin from the browser's point of view, so the canvas stays readable.
      "Access-Control-Allow-Origin": "*",
    },
  });
}
