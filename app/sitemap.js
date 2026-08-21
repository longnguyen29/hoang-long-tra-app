// Only the pages actually meant to be found. /sample and /mau-thu-doanh-nghiep carry their own
// robots: { index: false } — listing a noindex page in the sitemap is a contradiction Search
// Console flags as an error, so they're deliberately left out here rather than forgotten.
//
// www, not the bare apex: checked against the live site (not assumed) — hoanglongtra.com
// itself 308s to www.hoanglongtra.com, a redirect that predates this file. Listing the apex
// here would make every single sitemap entry cost Google an extra redirect hop for no reason.
export default function sitemap() {
  const base = "https://www.hoanglongtra.com";
  const now = new Date();
  return [
    { url: base, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];
}
