import test from "node:test";
import assert from "node:assert/strict";
import { recipeEconomics, sensoryAverage, versionSeed } from "./recipe-lab.js";

test("calculates tea and additions cost per serving", () => {
  const result = recipeEconomics({
    teaDoseG: 16,
    teaCostPerKg: 320000,
    ingredients: [{ cost: 4500 }, { cost: 2300 }],
    sellPrice: 42000,
  });
  assert.equal(result.teaCost, 5120);
  assert.equal(result.additionsCost, 6800);
  assert.equal(result.cost, 11920);
  assert.equal(result.grossProfit, 30080);
  assert.equal(result.marginPercent, 71.6);
});

test("averages only valid sensory scores", () => {
  assert.equal(sensoryAverage({ teaClarity: 8, aroma: 7, balance: 9, texture: 6, repeatability: 10 }), 8);
  assert.equal(sensoryAverage({ teaClarity: 11, aroma: "bad" }), null);
});

test("starts a new version from the latest reproducible formula", () => {
  const seed = versionSeed(
    { product_id: "tea-a", target_serving_ml: 500 },
    { tea_dose_g: 14, ingredients: [{ name: "Sữa", amount: 120, unit: "ml", cost: 4000 }], steps: ["Ủ trà"] },
  );
  assert.equal(seed.product_id, "tea-a");
  assert.equal(seed.tea_dose_g, 14);
  assert.equal(seed.serving_ml, 500);
  assert.deepEqual(seed.steps, ["Ủ trà"]);
  assert.notEqual(seed.ingredients[0].id, undefined);
});
