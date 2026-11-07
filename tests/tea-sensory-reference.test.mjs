import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../lib/tea-sensory-reference.js", import.meta.url), "utf8");
const match = source.match(/export const TEA_SENSORY_ENTRIES = (\[[\s\S]*?\]);\n\nexport const SENSORY_REFERENCE_RULES/);
assert.ok(match, "Expected self-contained lexicon");
const rows = JSON.parse(match[1]);
const expected = { aroma: 173, palate: 86, defects: 40, shan: 58 };

test("the full edition-02 vocabulary has 357 bilingual descriptors", () => {
  assert.equal(rows.length, 357);
  for (const [wheel, length] of Object.entries(expected)) {
    const items = rows.filter(row => row.wheel === wheel);
    assert.equal(items.length, length, wheel + " descriptor count");
    assert.deepEqual(items.map(row => row.n), Array.from({length}, (_, index) => index + 1));
  }
});

test("every term has complete, clean EN and VI names and its category", () => {
  for (const row of rows) {
    assert.ok(row.en && row.vi && row.category && row.group, JSON.stringify(row));
    assert.equal(row.en, row.en.trim());
    assert.equal(row.vi, row.vi.trim());
    assert.ok(!/[�]/.test(row.en + row.vi), "No replacement characters");
  }
});

test("wheels preserve contiguous groups for sector boundaries", () => {
  for (const wheel of Object.keys(expected)) {
    const seen = new Set();
    let prior = "";
    for (const row of rows.filter(x => x.wheel === wheel)) {
      if (row.category !== prior) {
        assert.ok(!seen.has(row.category), "Noncontiguous category " + wheel + ": " + row.category);
        seen.add(row.category);
        prior = row.category;
      }
    }
  }
});

test("printable app wheel never abbreviates descriptor labels", () => {
  const page = readFileSync(new URL("../app/admin/sensory/page.jsx", import.meta.url), "utf8");
  assert.ok(page.includes(">{entry.en}</text>"));
  assert.ok(page.includes(">{entry.vi}</text>"));
  assert.ok(!page.includes("short(entry."));
  assert.ok(page.includes("flushSync"), "Printing resets temporary filters");
  assert.ok(page.includes("window.print()"));
});

test("staff navigation and batch QC link to the sensory library", () => {
  const nav = readFileSync(new URL("../components/staff/staff-navigation.js", import.meta.url), "utf8");
  const qc = readFileSync(new URL("../components/staff/BatchQualityReviews.jsx", import.meta.url), "utf8");
  assert.ok(nav.includes('href: "/admin/sensory"'));
  assert.ok(qc.includes('href="/admin/sensory"'));
  assert.ok(qc.includes("Thư viện không tự thay đổi"));
});
