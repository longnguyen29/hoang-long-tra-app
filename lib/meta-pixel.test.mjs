import test from "node:test";
import assert from "node:assert/strict";
import { canTrackMeta, canShowCookiePreferences, trackMetaLead, META_PIXEL_ID } from "./meta-pixel.js";

test("tracks only public production pages without private URL parameters", () => {
  for (const url of ["https://www.hoanglongtra.com/", "https://hoanglongtra.com/sample?utm_source=facebook&fbclid=abc"]) assert.equal(canTrackMeta(new URL(url)), true);
  for (const url of ["https://ops.hoanglongtra.com/", "https://preview.vercel.app/shop", "http://localhost:3000/", "https://www.hoanglongtra.com/admin", "https://www.hoanglongtra.com/don-hang/private-token", "https://www.hoanglongtra.com/partners", "https://www.hoanglongtra.com/sample?phone=123", "https://www.hoanglongtra.com/shop#token"]) assert.equal(canTrackMeta(new URL(url)), false, url);
});

test("lead events require consent and a public page and contain only the form type", () => {
  const calls = [];
  let consent = "denied";
  global.window = { location: new URL("https://www.hoanglongtra.com/sample"), localStorage: { getItem: () => consent }, fbq: (...args) => calls.push(args) };
  try {
    trackMetaLead("sample_request");
    assert.equal(calls.length, 0);
    consent = "granted";
    trackMetaLead("sample_request");
    assert.deepEqual(calls, [["trackSingle", META_PIXEL_ID, "Lead", {content_name: "sample_request"}]]);
    trackMetaLead("private form content");
    window.location = new URL("https://www.hoanglongtra.com/admin");
    trackMetaLead("wholesale_enquiry");
    assert.equal(calls.length, 1);
    window.localStorage.getItem = () => { throw new Error("storage blocked"); };
    assert.doesNotThrow(() => trackMetaLead("sample_request"));
  } finally { delete global.window; }
});

test("cookie preferences remain available on sample handoff without allowing pixel tracking",()=>{
 const url=new URL("https://www.hoanglongtra.com/sample/menu-lab?entry=cafe&use=milk");
 assert.equal(canShowCookiePreferences(url),true);
 assert.equal(canTrackMeta(url),false);
 assert.equal(canShowCookiePreferences(new URL("https://www.hoanglongtra.com/don-hang/private")),false);
});
