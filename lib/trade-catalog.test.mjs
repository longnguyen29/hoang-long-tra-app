import test from "node:test";
import assert from "node:assert/strict";
import { isTradeTea, selectedTradeTea, tradeEnquiryHref, catalogText, matchesTradeSearch } from "./trade-catalog.js";

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

test("catalogue search matches both languages, Vietnamese accents and all requested terms", () => {
  const product = {
    ...tea,
    name: { vi: "Hồng trà đậm", en: "Rich black tea" },
    notes: { vi: "Hương trà rõ", en: "A clear tea aroma" },
    flavors: { vi: ["Mật ong"], en: ["Honey"] },
    brew: { vi: "Ủ 3 phút", en: "Steep for 3 minutes" },
  };
  assert.equal(matchesTradeSearch(product, "  hong tra dam  "), true);
  assert.equal(matchesTradeSearch(product, "black honey"), true);
  assert.equal(matchesTradeSearch(product, "Honey steep"), true);
  assert.equal(matchesTradeSearch(product, "black jasmine"), false);
  assert.equal(matchesTradeSearch(product, "  "), true);
  assert.equal(matchesTradeSearch({ ...tea, notes: null, flavors: null }, "honey"), false);
  assert.equal(matchesTradeSearch({ ...tea, name: { vi: "Phổ Nhĩ viên" } }, "pu-erh", ["Pu-erh Tea Pieces"]), true);
});

test("enquiry language follows the chosen locale or one valid incoming language", () => {
  const language = (search, locale) => new URL(tradeEnquiryHref(tea.id, "quote", search, locale), "https://example.test").searchParams.get("lang");
  assert.equal(language("?lang=vi&utm_source=trade", "en"), "en");
  assert.equal(language("?lang=en", "vi"), "vi");
  assert.equal(language("?lang=en"), "en");
  assert.equal(language("?lang=vi"), "vi");
  for (const search of ["?lang=fr", "?lang=en&lang=vi", "?lang=en&lang=en", "?lang=", ""]) {
    assert.equal(language(search), null);
  }
  assert.equal(language("?lang=en", "unsupported"), null);
});
