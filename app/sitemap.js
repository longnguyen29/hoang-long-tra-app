// Only the pages actually meant to be found. /sample and /mau-thu-doanh-nghiep carry their own
// robots: { index: false } — listing a noindex page in the sitemap is a contradiction Search
// Console flags as an error, so they're deliberately left out here rather than forgotten.
export default function sitemap() {
  const base = "https://hoanglongtra.com";
  const now = new Date();
  return [
    { url: base, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];
}
