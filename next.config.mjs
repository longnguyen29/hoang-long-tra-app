/** @type {import('next').NextConfig} */
const nextConfig = {
  // Legacy Shopify namespaces use the existing homepage fallback. Map individual product
  // URLs to their current equivalents when a verified old-to-new mapping is available.
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
  // Internal ops console (Order Flow tracker) — a self-contained static file, not yet a real
  // React route (see public/ops/index.html for why). Reachable two ways on purpose: as a path
  // on the main domain for quick access before the subdomain's DNS/domain is attached in
  // Vercel, and — once it is — via proxy.js rewriting the ops.hoanglongtra.com host to
  // this same file. Both point at one file, so there's only ever one copy to keep in sync.
  async rewrites() {
    return [
      { source: "/ops", destination: "/ops/index.html" },
      { source: "/ops/", destination: "/ops/index.html" },
    ];
  },
};

export default nextConfig;
