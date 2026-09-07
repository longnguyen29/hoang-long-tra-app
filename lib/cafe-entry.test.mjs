import test from "node:test";
import assert from "node:assert/strict";
import { CAFE_DRINKS, cafeSampleHref, availableCafePrice, cafeShareHref } from "./cafe-entry.js";
import { recommendMenuLab } from "./menu-lab.js";

test("each drink handoff reproduces the same recipe in the existing Menu Lab", () => {
  for (const drink of CAFE_DRINKS) {
    const url = new URL(cafeSampleHref(drink.id), "https://www.hoanglongtra.com");
    const before = recommendMenuLab({ useCase: drink.id, character: drink.character });
    const after = recommendMenuLab({ useCase: url.searchParams.get("use"), character: url.searchParams.get("character") });
    assert.equal(url.pathname, "/sample/menu-lab");
    assert.equal(after.starterId, before.starterId);
    assert.equal(after.teaDoseG, before.teaDoseG);
  }
});

test("retains incoming campaign attribution rather than overwriting it with website", () => {
  const url = new URL(cafeSampleHref("fruit", "?utm_source=facebook&utm_medium=paid_social&utm_campaign=cafe_2026&utm_content=photo_a&phone=private&note=secret&redirect=https://bad.example"), "https://www.hoanglongtra.com");
  assert.equal(url.searchParams.get("utm_source"), "facebook");
  assert.equal(url.searchParams.get("utm_content"), "photo_a");
  assert.equal(url.searchParams.get("utm_campaign"), "cafe_2026");
  for (const key of ["phone", "note", "redirect"]) assert.equal(url.searchParams.has(key), false);
});

test("invalid drink falls back and long campaign fields are bounded", () => {
  const url = new URL(cafeSampleHref("<script>", `?utm_source=${"a".repeat(200)}`), "https://www.hoanglongtra.com");
  assert.equal(url.searchParams.get("use"), "milk");
  assert.equal(url.searchParams.get("utm_source").length, 80);
});

test("never presents unavailable, missing or invalid catalogue prices as a quote", () => {
  const result = { productId: "tea-a", teaDoseG: 9 };
  assert.equal(availableCafePrice(result, []), null);
  for (const price of [0, -1, "bad", Infinity]) {
    assert.equal(availableCafePrice(result, [{ id: "tea-a", available: true, kind: "tea", price }]), null);
  }
  assert.equal(availableCafePrice(result, [{ id: "tea-a", available: false, kind: "tea", price: 365000 }]), null);
  assert.equal(availableCafePrice(result, [{ id: "tea-a", available: true, kind: "tea", price: 365000 }]), 3285);
});

test("shared links restore a drink without copying campaign or customer data", () => {
 for (const drink of CAFE_DRINKS) {
  const share = new URL(cafeShareHref(drink.id), "https://www.hoanglongtra.com");
  assert.equal(share.searchParams.get("drink"), drink.id);
  assert.deepEqual([...share.searchParams.keys()], ["drink"]);
  const handoff = new URL(cafeSampleHref(drink.id), share.origin);
  assert.equal(handoff.searchParams.get("entry"), "cafe");
 }
});
