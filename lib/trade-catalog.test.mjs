import test from "node:test";
import assert from "node:assert/strict";
import { isTradeTea, selectedTradeTea, tradeEnquiryHref, catalogText } from "./trade-catalog.js";

const tea = { id: "tea-1", kind: "tea", line: "reserve", available: true, name: { vi: "Trà" } };
test("catalogue excludes unavailable products, goods and sample packs", () => {
  assert.equal(isTradeTea(tea), true);
  for (const fields of [{ available: false }, { kind: "goods" }, { line: "sample" }]) {
    assert.equal(isTradeTea({ ...tea, ...fields }), false);
  }
});
test("enquiry uses actual eligible product identity and preserves attribution", () => {
  const href = tradeEnquiryHref(tea.id, "sample", "?utm_source=email&utm_campaign=trade&untrusted=bad");
  const url = new URL(href, "https://example.test");
  assert.equal(url.pathname, "/wholesale");
  assert.equal(url.hash, "#trade-brief");
  assert.equal(url.searchParams.get("utm_source"), "email");
  assert.equal(url.searchParams.get("intent"), "sample");
  assert.equal(url.searchParams.has("untrusted"), false);
  assert.equal(selectedTradeTea([tea], url.search), tea);
  assert.equal(selectedTradeTea([tea], "?tea=fabricated&name=Fake"), null);
  assert.equal(selectedTradeTea([{ ...tea, available: false }], url.search), null);
  assert.equal(catalogText(tea.name, "en"), "Trà");
});
