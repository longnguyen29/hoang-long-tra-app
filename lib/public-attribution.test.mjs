import test from "node:test";
import assert from "node:assert/strict";
import { attributionFromLocation, visitorSession } from "./public-attribution.js";

test("keeps explicit UTM attribution", () => {
  assert.deepEqual(attributionFromLocation("?utm_source=Threads&utm_medium=Organic&utm_campaign=Sample_Lab", ""), {
    source: "threads", medium: "organic", campaign: "sample_lab", content: "",
  });
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
