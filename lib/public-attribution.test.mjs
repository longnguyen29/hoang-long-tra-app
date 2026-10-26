import test from "node:test";
import assert from "node:assert/strict";
import { attributionFromLocation, campaignAttributionNote, safeReferrer, visitorSession } from "./public-attribution.js";

test("keeps explicit UTM attribution", () => {
  assert.deepEqual(attributionFromLocation("?utm_source=Threads&utm_medium=Organic&utm_campaign=Sample_Lab", ""), {
    source: "threads", medium: "organic", campaign: "sample_lab", content: "",
  });
});

test("sample CRM notes retain campaign and ad variant labels without click IDs or private URL fields",()=>{
 assert.equal(campaignAttributionNote("?utm_source=Facebook&utm_medium=paid_social&utm_campaign=sample_4x50&utm_content=ad_b&utm_term=shops&fbclid=opaque&phone=0901234567&email=private%40example.com"),"UTM: source=facebook; medium=paid_social; campaign=sample_4x50; content=ad_b; term=shops");
 assert.equal(campaignAttributionNote("?fbclid=opaque&phone=0901234567"),"");
 assert.equal(campaignAttributionNote("?utm_content=one&utm_content=two"),"");
 const value=campaignAttributionNote(`?utm_content=${"a".repeat(200)}`);
 assert.equal(value,"UTM: content="+"a".repeat(80));
});

test("recognises an internal website referral without storing its full URL", () => {
  assert.equal(attributionFromLocation("", "https://www.hoanglongtra.com/wholesale").source, "website");
});

test("reuses one anonymous visitor id", () => {
  const values = new Map();
  const storage = { getItem: (key) => values.get(key), setItem: (key, value) => values.set(key, value) };
  assert.equal(visitorSession(storage, () => "first"), "first");
  assert.equal(visitorSession(storage, () => "second"), "first");
});

test("keeps only the referrer origin, excluding private paths, queries and fragments", () => {
  assert.equal(safeReferrer("https://example.com/path?phone=0903333841#private"), "https://example.com");
  assert.equal(safeReferrer("not a url"), "");
  assert.equal(safeReferrer("https://user:secret@example.com/track/private-token"), "https://example.com");
  assert.equal(safeReferrer("file:///private/report"), "");
});
