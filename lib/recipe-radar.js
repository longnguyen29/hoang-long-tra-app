export const RADAR_MARKETS = {
  US: { label: "Mỹ", language: "en", hl: "en-US", gl: "US", ceid: "US:en" },
  JP: { label: "Nhật", language: "ja", hl: "ja", gl: "JP", ceid: "JP:ja" },
  KR: { label: "Hàn", language: "ko", hl: "ko", gl: "KR", ceid: "KR:ko" },
  TH: { label: "Thái", language: "th", hl: "th", gl: "TH", ceid: "TH:th" },
  SG: { label: "Singapore", language: "en", hl: "en-SG", gl: "SG", ceid: "SG:en" },
  TW: { label: "Đài Loan", language: "zh", hl: "zh-TW", gl: "TW", ceid: "TW:zh-Hant" },
  VN: { label: "Việt Nam", language: "vi", hl: "vi", gl: "VN", ceid: "VN:vi" },
};

export const RADAR_STAGES = [
  { id: "watch", label: "Đang quan sát" },
  { id: "rising", label: "Đang tăng" },
  { id: "candidate", label: "Đáng thử" },
  { id: "testing", label: "Đã đưa vào thử" },
  { id: "dismissed", label: "Bỏ qua" },
];

const KNOWN_CONCEPTS = [
  "strawberry matcha", "ube matcha", "banana matcha", "cloud matcha", "dirty matcha",
  "coconut matcha", "mango matcha", "pistachio matcha", "tiramisu matcha",
  "matcha einspänner", "hojicha latte", "genmaicha latte", "black sesame latte",
  "sparkling tea", "tea tonic", "nitro tea", "tea espresso", "cheese foam tea",
  "salted cream tea", "fruit cold brew tea", "kombucha mocktail", "peach oolong",
  "grape oolong", "osmanthus oolong", "tea mocktail", "tea affogato",
];

const STOP_WORDS = new Set([
  "a", "an", "and", "at", "best", "cafe", "café", "drink", "drinks", "for", "from",
  "how", "in", "is", "launch", "launches", "menu", "new", "of", "on", "recipe",
  "recipes", "the", "this", "to", "trend", "trending", "try", "viral", "with", "2025",
  "2026", "starbucks", "introduces", "unveils", "adds", "returns", "seasonal", "limited",
]);

const TEA_WORDS = ["tea", "matcha", "hojicha", "genmaicha", "oolong", "chai", "kombucha", "sencha", "jasmine", "earl grey", "black tea", "green tea", "trà", "ชา", "茶", "티"];

export function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, Number(value) || 0));
}

export function decodeXml(value = "") {
  return String(value)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ").trim();
}

function xmlField(block, tag) {
  const match = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return decodeXml(match?.[1] || "");
}

export function parseRssItems(xml = "") {
  return [...String(xml).matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)].map((match) => ({
    title: xmlField(match[1], "title"),
    url: xmlField(match[1], "link"),
    excerpt: xmlField(match[1], "description"),
    publisher: xmlField(match[1], "source"),
    publishedAt: xmlField(match[1], "pubDate"),
  })).filter((item) => item.title && item.url);
}

export function cleanSignalTitle(value = "") {
  return decodeXml(value)
    .replace(/\s+[-–—]\s+[^-–—]{2,55}$/u, "")
    .replace(/^["“”']+|["“”']+$/g, "")
    .replace(/\s+/g, " ").trim();
}

export function inferCategory(value = "") {
  const text = String(value).toLocaleLowerCase("en");
  if (/matcha|hojicha|genmaicha|latte|milk tea|einspänner/.test(text)) return "tea-latte";
  if (/sparkling|tonic|soda|nitro|fizz/.test(text)) return "sparkling";
  if (/fruit|peach|mango|grape|berry|citrus|yuzu|lemon/.test(text)) return "fruit-tea";
  if (/mocktail|cocktail|kombucha|ferment/.test(text)) return "tea-mixology";
  if (/foam|cream|cheese|affogato|dessert/.test(text)) return "texture-dessert";
  return "menu-launch";
}

export function deriveConceptName(title = "", fallback = "Ý tưởng đồ uống mới") {
  const clean = cleanSignalTitle(title);
  const lower = clean.toLocaleLowerCase("en");
  const known = KNOWN_CONCEPTS.find((concept) => lower.includes(concept));
  if (known) return known.replace(/\b\w/g, (letter) => letter.toUpperCase());

  const tokens = clean
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/)
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token.toLocaleLowerCase("en")));
  const teaIndex = tokens.findIndex((token) => TEA_WORDS.some((word) => token.toLocaleLowerCase("en").includes(word)));
  const start = teaIndex > 1 ? teaIndex - 2 : 0;
  const phrase = tokens.slice(start, start + 6).join(" ").trim();
  return phrase || fallback;
}

export function conceptKey(value = "") {
  return deriveConceptName(value).toLocaleLowerCase("en")
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\p{L}]+/gu, "-").replace(/^-|-$/g, "").slice(0, 96) || "unclassified";
}

export function teaFitScore(value = "") {
  const text = String(value).toLocaleLowerCase("en");
  const matches = TEA_WORDS.filter((word) => text.includes(word)).length;
  if (matches >= 2) return 95;
  if (matches === 1) return 82;
  if (/cafe|beverage|latte|mocktail|foam|fruit/.test(text)) return 55;
  return 30;
}

export function feasibilityScore(value = "") {
  const text = String(value).toLocaleLowerCase("en");
  let score = 75;
  if (/nitro|centrifuge|rotovap|liquid nitrogen|spherification/.test(text)) score -= 28;
  if (/alcohol|vodka|gin|rum|whisky|whiskey/.test(text)) score -= 18;
  if (/latte|fruit|foam|sparkling|mocktail|syrup|cream/.test(text)) score += 8;
  return clamp(score);
}

export function buildGoogleNewsUrl(searchTerm, marketCode) {
  const market = RADAR_MARKETS[marketCode] || RADAR_MARKETS.US;
  const params = new URLSearchParams({ q: searchTerm, hl: market.hl, gl: market.gl, ceid: market.ceid });
  return `https://news.google.com/rss/search?${params.toString()}`;
}

export function signalFingerprint({ source = "web", url = "", title = "", region = "" } = {}) {
  const text = `${source}|${url}|${title}|${region}`;
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `radar-signal-${(hash >>> 0).toString(36)}`;
}

export function scoreConcept(signals = [], now = new Date()) {
  const valid = signals.filter(Boolean);
  const regions = [...new Set(valid.map((item) => item.region).filter(Boolean))];
  const sources = [...new Set(valid.map((item) => item.source).filter(Boolean))];
  const global = valid.filter((item) => item.region !== "VN");
  const vietnam = valid.filter((item) => item.region === "VN");

  const velocity = clamp(Math.max(0, ...valid.map((item) => {
    const published = new Date(item.published_at || item.publishedAt || now).getTime();
    const ageDays = Math.max(0, (now.getTime() - published) / 86400000);
    const recency = clamp(82 - ageDays * 2.2);
    const metrics = item.metrics || {};
    const views = Number(metrics.views || metrics.view_count || 0);
    const shares = Number(metrics.shares || metrics.share_count || 0);
    return clamp(recency + Math.log10(views + 1) * 4 + Math.log10(shares + 1) * 6);
  })));
  const crossMarket = clamp(10 + Math.min(regions.filter((item) => item !== "VN").length, 4) * 19 + Math.min(sources.length, 3) * 8);
  const vietnamGap = global.length === 0 ? 15 : vietnam.length === 0 ? 92 : clamp(78 - (vietnam.length / Math.max(global.length, 1)) * 48);
  const teaFit = clamp(Math.max(30, ...valid.map((item) => Number(item.tea_fit) || teaFitScore(`${item.title} ${item.excerpt || ""}`))));
  const feasibility = clamp(Math.round(valid.reduce((sum, item) => sum + (Number(item.feasibility) || feasibilityScore(item.title)), 0) / Math.max(valid.length, 1)));
  const total = Math.round(velocity * .30 + crossMarket * .25 + vietnamGap * .20 + teaFit * .15 + feasibility * .10);

  return {
    velocity: Math.round(velocity), crossMarket: Math.round(crossMarket), vietnamGap: Math.round(vietnamGap),
    teaFit: Math.round(teaFit), feasibility: Math.round(feasibility), total,
    regions, sources, signalCount: valid.length, marketCount: regions.length,
    suggestedStage: total >= 70 ? "candidate" : total >= 52 ? "rising" : "watch",
  };
}

export function toSignalRecord(item, { query, region, source = "google-news" } = {}) {
  const name = deriveConceptName(item.title, query?.label);
  const url = String(item.url || "").trim();
  return {
    id: signalFingerprint({ source, url, title: item.title, region }),
    query_id: query?.id || null,
    source,
    source_item_id: item.sourceId || "",
    url,
    title: cleanSignalTitle(item.title),
    excerpt: decodeXml(item.excerpt || "").slice(0, 1000),
    publisher: item.publisher || "",
    author: item.author || "",
    published_at: item.publishedAt && !Number.isNaN(new Date(item.publishedAt).getTime()) ? new Date(item.publishedAt).toISOString() : new Date().toISOString(),
    region,
    language: RADAR_MARKETS[region]?.language || "en",
    metrics: item.metrics || {},
    concept_key: conceptKey(name),
    concept_name: name,
    category: inferCategory(`${name} ${item.title}`),
    tea_fit: teaFitScore(`${name} ${item.title}`),
    feasibility: feasibilityScore(`${name} ${item.title}`),
  };
}

export function safeExternalUrl(value = "") {
  try {
    const parsed = new URL(String(value).trim());
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.toString() : "";
  } catch { return ""; }
}
