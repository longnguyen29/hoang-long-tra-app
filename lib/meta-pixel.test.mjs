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

test("known cafe handoffs and public enquiry anchors remain trackable",()=>{
 const url=new URL("https://www.hoanglongtra.com/sample/menu-lab?entry=cafe&use=milk");
 assert.equal(canShowCookiePreferences(url),true);
 assert.equal(canTrackMeta(url),true);
 for (const path of [
   "/cho-quan?drink=fruit&utm_source=facebook&fbclid=IwAbC_123",
   "/sample/menu-lab?entry=cafe&use=milk&character=smoky&lang=vi&utm_content=headline_a&fbclid=IwAbC_123",
   "/hong-tra-ban-si?utm_source=facebook#san-pham",
   "/hong-tra-ban-si?utm_source=facebook#mau-bao-gia",
   "/wholesale?lang=en#trade-brief",
 ]) assert.equal(canTrackMeta(new URL(`https://www.hoanglongtra.com${path}`)),true,path);
 assert.equal(canShowCookiePreferences(new URL("https://www.hoanglongtra.com/hong-tra-ban-si")),true);
 assert.equal(canShowCookiePreferences(new URL("https://www.hoanglongtra.com/don-hang/private")),false);
});

test("new funnel allowances still reject private, unknown and malformed navigation",()=>{
 for (const path of [
   "/sample/menu-lab?entry=cafe&use=milk&phone=0901234567",
   "/sample/menu-lab?entry=private&use=milk",
   "/sample/menu-lab?entry=cafe&use=person%40example.com",
   "/sample/menu-lab?entry=cafe&use=milk&use=fruit",
   "/sample/menu-lab?entry=cafe&character=secret",
   "/sample/menu-lab?constructor=private",
   "/sample/menu-lab?toString=private",
   "/sample?entry=cafe",
   "/cho-quan?drink=private",
   "/hong-tra-ban-si?lang=private",
   "/hong-tra-ban-si#private-token",
 ]) assert.equal(canTrackMeta(new URL(`https://www.hoanglongtra.com${path}`)),false,path);
});

test("a confirmed domestic request counts once, after consent, without sending its receipt",()=>{
 const calls=[];
 let consent="denied";
 global.window={location:new URL("https://www.hoanglongtra.com/hong-tra-ban-si?utm_source=facebook#mau-bao-gia"),localStorage:{getItem:()=>consent},fbq:(...args)=>calls.push(args)};
 try {
   trackMetaLead("wholesale_enquiry","domestic-receipt-1");
   assert.equal(calls.length,0);
   consent="granted";
   trackMetaLead("wholesale_enquiry","domestic-receipt-1");
   trackMetaLead("wholesale_enquiry","domestic-receipt-1");
   assert.deepEqual(calls,[["trackSingle",META_PIXEL_ID,"Lead",{content_name:"wholesale_enquiry"}]]);
   trackMetaLead("wholesale_enquiry","domestic-receipt-2");
   assert.equal(calls.length,2);
 } finally {delete global.window;}
});

test("sample success deduplicates repeated callbacks and failed tracking does not poison a retry",()=>{
 const calls=[];
 global.window={location:new URL("https://www.hoanglongtra.com/sample/menu-lab?entry=cafe&use=milk&character=strong"),localStorage:{getItem:()=>"granted"},fbq:()=>{throw new Error("not ready");}};
 try {
   assert.doesNotThrow(()=>trackMetaLead("sample_request","sample-receipt-1"));
   window.fbq=(...args)=>calls.push(args);
   trackMetaLead("sample_request","sample-receipt-1");
   trackMetaLead("sample_request","sample-receipt-1");
   assert.deepEqual(calls,[["trackSingle",META_PIXEL_ID,"Lead",{content_name:"sample_request"}]]);
 } finally {delete global.window;}
});
