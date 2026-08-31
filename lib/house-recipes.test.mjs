import test from "node:test";
import assert from "node:assert/strict";
import { buildStarterRecords, recommendHouseTea } from "./house-recipes.js";

const products = [
  { id: "hong-tra-shan-khoi", available: true, price: 365000 },
  { id: "hong-tra-shan-mat", available: true, price: 335000 },
  { id: "luc-tra-shan-moc", available: true, price: 225000 },
  { id: "luc-tra-ngoc-lan", available: true, price: 250000 },
  { id: "luc-tra-lai-tieu-chuan", available: true, price: 650000 },
  { id: "bach-mau-don", available: true, price: null },
];

test("maps close global tea styles onto the Hoàng Long catalog", () => {
  assert.equal(recommendHouseTea({ name: "Pistachio Matcha" }, products).id, "luc-tra-shan-moc");
  assert.equal(recommendHouseTea({ name: "Hojicha black sesame latte" }, products).id, "hong-tra-shan-khoi");
  assert.equal(recommendHouseTea({ name: "Peach oolong", category: "fruit-tea" }, products).id, "hong-tra-shan-mat");
});

test("builds six repeat-safe V1 recipes with formulas and cost estimates", () => {
  const records = buildStarterRecords(products, "test@hoanglongtra.com");
  assert.equal(records.length, 6);
  assert.ok(records.every((item) => item.version.ingredients.length >= 5));
  assert.ok(records.every((item) => item.version.steps.length >= 4));
  assert.ok(records.every((item) => item.version.cost_per_serving > 0));
  assert.ok(records.every((item) => item.recipe.status === "testing"));
});
