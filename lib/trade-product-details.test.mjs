import test from "node:test";
import assert from "node:assert/strict";
import { tradeProductFacts } from "./trade-product-details.js";

test("sampling guidance never supplies missing sensory or specification data", () => {
  const facts = tradeProductFacts({ id: "hong-tra-shan-mat", name: { vi: "Hồng Trà Shan Mật" } });
  assert.equal(facts.groupId, "black");
  assert.equal(facts.note, "");
  assert.deepEqual(facts.flavors, []);
  assert.equal(facts.brew, "");
  assert.equal(facts.packing, "");
  assert.ok(facts.summary.includes("Thử") || facts.summary.includes("mẫu"));
  assert.equal(facts.moq, undefined);
  assert.equal(facts.shelfLife, undefined);
});

test("English catalogue translates known names and piece packing without a weight conversion", () => {
  const facts = tradeProductFacts({ id: "pho-nhi-vien-mv2k5p6r", name: { vi: "Phổ Nhĩ Viên", en: "" }, pack_size: " Viên " }, "en");
  assert.equal(facts.name, "Pu-erh Tea Pieces");
  assert.equal(facts.packing, "Pieces");
  assert.equal(facts.groupId, "pressed");
  assert.ok(facts.summary.includes("do not convert to kilograms"));
});

test("actual localized notes, brewing instructions and flavor tags are preserved", () => {
  const facts = tradeProductFacts({ id: "hong-tra-shan-khoi", notes: { vi: "Ghi chú thật", en: "Actual note" }, brew: { en: "95-100°C · 3-5 min" }, flavors: { en: ["Smoky", "", null, "  Roasted  "] }, pack_size: "200g, 500g, 20kg" }, "en");
  assert.equal(facts.note, "Actual note");
  assert.equal(facts.brew, "95-100°C · 3-5 min");
  assert.deepEqual(facts.flavors, ["Smoky", "Roasted"]);
  assert.equal(facts.packing, "200g, 500g, 20kg");
});

test("new unknown teas receive no inferred technical classification or untranslated tasting paragraph", () => {
  const facts = tradeProductFacts({ id: "future-tea", name: { vi: "Dòng mới" }, notes: { vi: "Hương mới" }, flavors: { vi: ["Sen"] }, brew: { vi: "Cách pha mới" } }, "en");
  assert.equal(facts.groupId, "other");
  assert.equal(facts.name, "Dòng mới");
  assert.equal(facts.note, "");
  assert.deepEqual(facts.flavors, []);
  assert.equal(facts.brew, "");
});
