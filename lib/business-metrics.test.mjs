import test from "node:test";
import assert from "node:assert/strict";
import { MAX_METRIC_AMOUNT, emptyMetricInputs, normalizeMetricInputs, calculateBusinessMetrics, calculateOrderIndicators } from "./business-metrics.js";

const zeros = () => Object.fromEntries(Object.keys(emptyMetricInputs()).map((key) => [key, 0]));

test("blank is unknown, while explicit zero is a known amount", () => {
  const blank = calculateBusinessMetrics(emptyMetricInputs());
  assert.equal(blank.ebitda, null);
  assert.equal(blank.netIncome, null);
  assert.equal(blank.missing.length, 8);
  const zero = calculateBusinessMetrics(zeros());
  assert.equal(zero.ebitda, 0);
  assert.equal(zero.netIncome, 0);
  assert.deepEqual(zero.missing, []);
  assert.deepEqual(normalizeMetricInputs({ netRevenue: "  ", costOfGoodsSold: null }).errors, {});
});

test("each metric requires only its own inputs and never silently assumes costs are zero", () => {
  const partial = calculateBusinessMetrics({ netRevenue: "1000000", costOfGoodsSold: "600000", operatingExpenses: "100000", otherIncome: 0 });
  assert.equal(partial.grossProfit, 400000);
  assert.equal(partial.operatingBeforeDA, 300000);
  assert.equal(partial.ebitda, null);
  assert.deepEqual(partial.missingByMetric.ebitda, ["otherExpenses"]);
  assert.equal(partial.grossMargin, 40);
  assert.equal(partial.ebitdaMargin, null);
});

test("EBITDA includes other income/expense, with D&A, interest and tax subtracted once", () => {
  const metrics = calculateBusinessMetrics({ netRevenue: 10000000, costOfGoodsSold: 6000000, operatingExpenses: 1000000, otherIncome: 400000, otherExpenses: 100000, depreciationAmortization: 200000, interestExpense: 100000, incomeTax: 500000 });
  assert.equal(metrics.grossProfit, 4000000);
  assert.equal(metrics.operatingBeforeDA, 3000000);
  assert.equal(metrics.ebitda, 3300000);
  assert.equal(metrics.ebit, 3100000);
  assert.equal(metrics.profitBeforeTax, 3000000);
  assert.equal(metrics.netIncome, 2500000);
  assert.equal(metrics.ebitdaMargin, 33);
  assert.equal(metrics.netMargin, 25);
});

test("negative profits remain negative, rather than being clamped to zero", () => {
  const metrics = calculateBusinessMetrics({ ...zeros(), netRevenue: 100, costOfGoodsSold: 150, operatingExpenses: 20, otherExpenses: 10 });
  assert.equal(metrics.grossProfit, -50);
  assert.equal(metrics.ebitda, -80);
  assert.equal(metrics.netIncome, -80);
  assert.equal(metrics.grossMargin, -50);
});

test("invalid, negative and unsafe amounts cannot become believable financial metrics", () => {
  const { values, errors } = normalizeMetricInputs({ netRevenue: Infinity, costOfGoodsSold: -1, operatingExpenses: NaN, otherIncome: "not a number", otherExpenses: MAX_METRIC_AMOUNT + 1, depreciationAmortization: {}, interestExpense: true, incomeTax: "0x10" });
  assert.equal(Object.keys(errors).length, 8);
  assert.ok(Object.values(values).every((value) => value === null));
  assert.equal(normalizeMetricInputs({ netRevenue: MAX_METRIC_AMOUNT }).values.netRevenue, MAX_METRIC_AMOUNT);
});

test("zero or unknown revenue never produces a percentage margin", () => {
  const zeroRevenue = calculateBusinessMetrics({ ...zeros(), otherIncome: 500 });
  assert.equal(zeroRevenue.ebitda, 500);
  assert.equal(zeroRevenue.grossMargin, null);
  assert.equal(zeroRevenue.ebitdaMargin, null);
  assert.equal(zeroRevenue.netMargin, null);
  assert.equal(calculateBusinessMetrics({ ...zeros(), netRevenue: "" }).netMargin, null);
});

test("order indicators use Vietnam creation month and reconcile legacy completed status", () => {
  const indicators = calculateOrderIndicators([
    { ts: "2026-09-30T17:00:00Z", stage: "shipping", status: "completed", estimated_total: "1000000", total_kg: "10" },
    { ts: "2026-10-31T16:59:59Z", stage: "new_order", estimated_total: null, total_kg: null, lines: [{ qty: 500, unit: "g" }, { qty: 1, unit: "ton" }] },
    { ts: "2026-10-01T01:00:00Z", status: "pending", estimated_total: 0, total_kg: 0 },
    { ts: "2026-09-30T16:59:59Z", estimated_total: 2000000, total_kg: 20 },
    { ts: "2026-10-31T17:00:00Z", estimated_total: 3000000, total_kg: 30 },
    { ts: "not a date", estimated_total: 4000000 },
  ], "2026-10");
  assert.equal(indicators.count, 3);
  assert.equal(indicators.completedCount, 1);
  assert.equal(indicators.openCount, 2);
  assert.equal(indicators.bookedValue, 1000000);
  assert.equal(indicators.countMissingValue, 1);
  assert.equal(indicators.averageKnownOrderValue, 500000);
  assert.equal(indicators.completedValue, 1000000);
  assert.equal(indicators.knownKg, 1010.5);
  assert.equal(indicators.countMissingKg, 0);
  assert.equal("accountingRevenue" in indicators, false);
});

test("missing order amounts/weights are counted and empty sums remain unknown", () => {
  const indicators = calculateOrderIndicators([
    { ts: "2026-10-01T00:00:00Z", status: "completed", estimated_total: "", total_kg: null, lines: [{ qty: 2, unit: "pcs" }] },
    { ts: "2026-10-02T00:00:00Z", status: "pending", estimated_total: -1, total_kg: null, lines: [{ qty: "bad", unit: "kg" }] },
  ], "2026-10");
  assert.equal(indicators.bookedValue, null);
  assert.equal(indicators.completedValue, null);
  assert.equal(indicators.knownKg, null);
  assert.equal(indicators.countMissingValue, 2);
  assert.equal(indicators.completedCountMissingValue, 1);
  assert.equal(indicators.countMissingKg, 2);
  assert.equal(indicators.averageKnownOrderValue, null);
  assert.equal(calculateOrderIndicators([], "2026-13").invalidMonth, true);
});

test("order indicators support mapped rows and preserve explicit raw null/zero", () => {
  const indicators = calculateOrderIndicators([
    { ts: "2026-10-01T00:00:00Z", stage: "completed", estimatedTotal: 1500000, totalKg: 12 },
    { ts: "2026-10-02T00:00:00Z", estimated_total: 0, estimatedTotal: 9000000, total_kg: 0, totalKg: 50 },
    { ts: "2026-10-03T00:00:00Z", estimated_total: null, estimatedTotal: 9000000, total_kg: null, totalKg: 50 },
  ], "2026-10");
  assert.equal(indicators.bookedValue, 1500000);
  assert.equal(indicators.completedValue, 1500000);
  assert.equal(indicators.countMissingValue, 1);
  assert.equal(indicators.knownKg, 12);
  assert.equal(indicators.countMissingKg, 1);
});
