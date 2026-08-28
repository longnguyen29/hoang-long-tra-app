import assert from "node:assert/strict";
import test from "node:test";
import { calculatePricing, packGramsFromLabel } from "./pricing.js";

test("parses common package labels", () => {
  assert.equal(packGramsFromLabel("Túi 100g"), 100);
  assert.equal(packGramsFromLabel("1 kg"), 1000);
  assert.equal(packGramsFromLabel("250G"), 250);
});

test("builds a complete price ladder from cost inputs", () => {
  const result = calculatePricing({
    teaCostPerKg: 240000,
    usableYieldPercent: 90,
    processingPerKg: 30000,
    labourPerKg: 20000,
    packagingPerPack: 7000,
    labelPerPack: 2000,
    packGrams: 100,
    deliveryPerOrder: 200000,
    orderKg: 10,
    overheadPercent: 8,
    vatPercent: 8,
    b2bMarginPercent: 30,
    retailMarginPercent: 50,
    partnerDiscountPercent: 5,
  });

  assert.ok(result.trueCostPerKg > 400000);
  assert.ok(result.minimumSafePricePerKg > result.trueCostPerKg);
  assert.ok(result.b2bListPricePerKg > result.minimumSafePricePerKg);
  assert.ok(result.retailPricePerKg > result.b2bListPricePerKg);
  assert.ok(result.b2bPartnerPricePerPack > result.trueCostPerPack);
  assert.ok(result.profitPerOrder > 0);
  assert.deepEqual(result.warnings, []);
});

test("warns when a live price is below the cost floor", () => {
  const result = calculatePricing({
    teaCostPerKg: 500000,
    packGrams: 100,
    packagingPerPack: 10000,
    currentPrice: 20000,
    currentPriceUnit: "pack",
  });
  assert.ok(result.warnings.includes("current_price_below_floor"));
});

test("break-even packs cover delivery and its overhead allocation", () => {
  const result = calculatePricing({
    teaCostPerKg: 200_000,
    usableYieldPercent: 100,
    packGrams: 100,
    deliveryPerOrder: 100_000,
    orderKg: 10,
    overheadPercent: 20,
    b2bMarginPercent: 30,
    vatPercent: 0,
  });

  assert.ok(result.breakEvenPacks > 0);
  assert.equal(Number.isInteger(result.breakEvenPacks), true);
});

test("compares live catalogue prices in their stored kg or pack unit", () => {
  const shared = { teaCostPerKg: 300_000, usableYieldPercent: 100, packGrams: 100, vatPercent: 0 };
  const perKg = calculatePricing({ ...shared, currentPrice: 1_000_000, currentPriceUnit: "kg" });
  const perPack = calculatePricing({ ...shared, currentPrice: 100_000, currentPriceUnit: "pack" });

  assert.equal(perKg.currentMarginPercent, perPack.currentMarginPercent);
});
