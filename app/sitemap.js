// Only canonical pages intended for search. Sample forms and internal routes stay out.
export default function sitemap() {
  const base = "https://www.hoanglongtra.com";
  return [
    { url: base, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/cho-quan`, changeFrequency: "weekly", priority: 0.9 },
    ...["/wholesale", "/shop", "/story", "/terms", "/shipping", "/returns"].map(path => ({url: `${base}${path}`, changeFrequency: "monthly", priority: 0.7})),
    { url: `${base}/privacy`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
