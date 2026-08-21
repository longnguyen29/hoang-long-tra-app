// /admin and /api are disallowed, but the old Shopify paths (/products, /collections, ...)
// are deliberately NOT disallowed here — they need to stay crawlable so Google's crawler
// actually walks into them, follows the 301 set up in next.config.mjs, and learns the URL
// moved. Blocking a path in robots.txt stops it from being crawled at all, which would leave
// the old URL sitting in the index indefinitely with no way to discover where it went.
export default function robots() {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api/"],
    },
    sitemap: "https://hoanglongtra.com/sitemap.xml",
  };
}
