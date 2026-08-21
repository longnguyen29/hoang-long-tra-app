/** @type {import('next').NextConfig} */
const nextConfig = {
  // This repository is often checked out inside a larger workspace that also has a lockfile.
  // Pin Turbopack to this app so dev mode watches the correct route tree instead of walking
  // parent directories (which can produce false 404s and exhaust the file watcher).
  turbopack: { root: process.cwd() },
  // SEO cleanup: hoanglongtra.com used to run a Shopify store, confirmed via the Wayback
  // Machine's archive of this domain (Shopify theme assets, /cdn/shop/, .well-known/shopify/
  // monorail, /checkouts/<id>, real product and collection slugs — dozens of them still
  // showed up in Wayback's index of this exact domain).
  //
  // This app has no per-product or per-collection route at all — "Shop", "Our Story", every
  // section is client-side React state on one page, not a URL. So there is no real "matching
  // new page" for an old /products/<slug> or /collections/<slug> to redirect to; the honest,
  // correct target for all of them is the homepage, which is exactly the documented fallback
  // for "no equivalent page exists". Whole namespaces redirect rather than an exact list of
  // the ~100 old slugs found in the archive, because the archive is necessarily incomplete —
  // any old URL under these paths, found or not, needs the same fallback.
  //
  // Deliberately not redirecting /admin: Shopify's own /admin meant something else, but this
  // app's /admin is real and already correct (the staff login) — redirecting it would break
  // the one path here that doesn't need fixing.
  async redirects() {
    const toHome = (source) => ({ source, destination: "/", permanent: true });
    return [
      toHome("/products/:path*"),
      toHome("/collections/:path*"),
      toHome("/pages/:path*"),
      toHome("/blogs/:path*"),
      toHome("/en/:path*"),
      toHome("/cart/:path*"),
      toHome("/carts"),
      toHome("/checkout/:path*"),
      toHome("/checkouts/:path*"),
      toHome("/account/:path*"),
      // Shopify's numeric shop-id checkout/order paths, e.g. /80245555490/checkouts/<id>.
      { source: "/:shopId(\\d+)/:path*", destination: "/", permanent: true },
    ];
  },
};

export default nextConfig;
