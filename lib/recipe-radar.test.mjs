import test from "node:test";
import assert from "node:assert/strict";
import {
  buildGoogleNewsUrl, conceptKey, dedupeSignals, deriveConceptName, feasibilityScore, parseRssItems, scoreConcept, toSignalRecord,
} from "./recipe-radar.js";

test("dedupes overlapping query matches before database upsert", () => {
  const first = { id: "radar-signal-same", title: "First query match" };
  const duplicate = { id: "radar-signal-same", title: "Second query match" };
  const other = { id: "radar-signal-other", title: "Another article" };
  assert.deepEqual(dedupeSignals([first, duplicate, other]), [first, other]);
});

test("parses a Google News style RSS item", () => {
  const items = parseRssItems(`<rss><channel><item><title><![CDATA[Pistachio matcha moves into cafés - Menu Watch]]></title><link>https://example.com/a</link><pubDate>Thu, 27 Aug 2026 10:00:00 GMT</pubDate><source>Menu Watch</source></item></channel></rss>`);
  assert.equal(items.length, 1);
  assert.equal(items[0].publisher, "Menu Watch");
  assert.equal(items[0].url, "https://example.com/a");
});

test("extracts a stable menu concept from editorial titles", () => {
  assert.equal(deriveConceptName("Starbucks launches a new Pistachio Matcha for spring - Food News"), "Pistachio Matcha");
  assert.equal(conceptKey("Pistachio Matcha recipe"), "pistachio-matcha");
});

test("scores fresh international evidence higher when Vietnam is absent", () => {
  const now = new Date("2026-08-30T00:00:00Z");
  const base = { title: "Pistachio Matcha", source: "google-news", tea_fit: 95, feasibility: 82, published_at: "2026-08-29T00:00:00Z", metrics: {} };
  const international = scoreConcept([{ ...base, region: "US" }, { ...base, source: "youtube", region: "JP" }], now);
  const alreadyLocal = scoreConcept([{ ...base, region: "US" }, { ...base, source: "youtube", region: "VN" }], now);
  assert.ok(international.total > alreadyLocal.total);
  assert.equal(international.vietnamGap, 92);
  assert.equal(international.marketCount, 2);
});

test("builds localized news feeds and normalized signal records", () => {
  assert.match(buildGoogleNewsUrl('"tea menu" cafe', "JP"), /gl=JP/);
  const record = toSignalRecord({ title: "Hojicha Latte reaches new menus", url: "https://example.com/h", publishedAt: "2026-08-28" }, { query: { id: "tea-latte", label: "Tea latte" }, region: "JP" });
  assert.equal(record.concept_key, "hojicha-latte");
  assert.equal(record.region, "JP");
  assert.equal(record.category, "tea-latte");
});

test("demotes generic cafe news below concrete drink concepts", () => {
  assert.ok(feasibilityScore("Pistachio matcha latte", "tea-latte") > feasibilityScore("Cool new cafes this September", "menu-launch"));
  assert.equal(feasibilityScore("Cool new cafes this September", "menu-launch"), 32);
});
