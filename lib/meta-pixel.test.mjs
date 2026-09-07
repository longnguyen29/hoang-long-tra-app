import test from "node:test";
import assert from "node:assert/strict";
import {
  META_CONSENT_KEY,
  clearMetaQueue,
  flushMetaQueue,
  trackMetaCustom,
} from "./meta-pixel.js";

function storage() {
  const values = new Map();
  return {
    get length() { return values.size; },
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, String(value)),
  };
}

function browser({ consent = "accepted", fbq } = {}) {
  const localStorage = storage();
  const sessionStorage = storage();
  if (consent) localStorage.setItem(META_CONSENT_KEY, consent);
  global.window = { localStorage, sessionStorage, fbq };
  process.env.NEXT_PUBLIC_META_PIXEL_ID = "123456789";
  return global.window;
}

test.afterEach(() => {
  delete global.window;
  delete process.env.NEXT_PUBLIC_META_PIXEL_ID;
});

test("sends only approved, non-personal event parameters", () => {
  const calls = [];
  browser({ fbq: (...args) => calls.push(args) });
  trackMetaCustom("SamplePackSelected", { pack: "50g", phone: "0903333841", nested: { private: true } });
  assert.deepEqual(calls, [["trackCustom", "SamplePackSelected", { pack: "50g" }]]);
});

test("deduplicates a once-only funnel event within the browser session", () => {
  const calls = [];
  browser({ fbq: (...args) => calls.push(args) });
  trackMetaCustom("SampleFunnelViewed", { funnel: "tea_sample" }, { onceKey: "sample-view" });
  trackMetaCustom("SampleFunnelViewed", { funnel: "tea_sample" }, { onceKey: "sample-view" });
  assert.equal(calls.length, 1);
});

test("queues events until the consented pixel is ready", () => {
  const win = browser({ fbq: undefined });
  trackMetaCustom("SampleDetailsStarted", { pack: "100g" });
  const calls = [];
  win.fbq = (...args) => calls.push(args);
  flushMetaQueue();
  assert.deepEqual(calls, [["trackCustom", "SampleDetailsStarted", { pack: "100g" }]]);
});

test("does not queue events after consent is declined", () => {
  const win = browser({ consent: "declined", fbq: undefined });
  trackMetaCustom("SampleFunnelViewed", { funnel: "tea_sample" });
  win.fbq = () => assert.fail("declined event should not be sent");
  flushMetaQueue();
  clearMetaQueue();
});
