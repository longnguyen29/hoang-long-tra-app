import test from "node:test";
import assert from "node:assert/strict";
import { formatMassKg } from "./format-mass.js";

test("metric mass switches at 1000 kg without losing boundary precision", () => {
  assert.equal(formatMassKg(999.999, "en"), "999.999 kg");
  assert.equal(formatMassKg(1000, "en"), "1 tonne");
  assert.equal(formatMassKg(1000.001, "en"), "1.000001 tonnes");
  assert.equal(formatMassKg(1250, "en"), "1.25 tonnes");
  assert.equal(formatMassKg(1000000, "vi"), "1.000 tấn");
  assert.equal(formatMassKg("1250", "vi"), "1,25 tấn");
  assert.equal(formatMassKg(0), "0 kg");
});

test("unknown and invalid mass does not become a fabricated zero", () => {
  for (const value of [null, undefined, "", " ", "unknown", NaN, Infinity, -1, false, []]) {
    assert.equal(formatMassKg(value), "—");
  }
});
