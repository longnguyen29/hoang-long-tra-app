import test from "node:test";
import assert from "node:assert/strict";
import { growthActual, growthFunnel, suggestedGrowthTargets, validateGrowthValues } from "./business-growth-plan.js";

test("unknown finances stay blank even when orders have prices", () => {
  const actual = growthActual({ bookedValue: 2400000, knownOrderValues: 2, orders: 3, financialInputs: null });
  assert.equal(actual.netRevenue,null);
  assert.equal(actual.ebitda,null);
  assert.equal(actual.averageOrderValue,1200000);
});

test("growth suggestions use the median and leave unsupported targets empty", () => {
  const financialInputs = { netRevenue: 100000, costOfGoodsSold: 65000 };
  const targets = suggestedGrowthTargets([12, 60, 10].map(prospects => ({ prospects, financialInputs })), 10);
  assert.equal(targets.prospects,13);
  assert.equal(targets.grossMargin,35);
  assert.equal(targets.ebitda,undefined);
  assert.deepEqual(suggestedGrowthTargets([{ prospects: 50 }]),{});
});

test("funnel rounds upstream workload up at every stage", () => {
  const assumptions = { budget: 300000, firstOrderValue: 1000000, leadToSample: 60, sampleToFirst: 40, firstToRepeat: 50, daysInMonth: 30 };
  assert.deepEqual(growthFunnel(3, assumptions),{
    buyers:3,samples:8,prospects:14,weeklyProspects:14*7/30,repeats:1.5,firstOrderValue:3000000,budgetPerBuyer:100000,
  });
  assert.equal(growthFunnel(3,{ sampleToFirst: 0 }).prospects,null);
  assert.equal(growthFunnel(3,{ budget: 0 }).budgetPerBuyer,0);
});

test("saving rejects unknown keys, negative counts and ratios over 100", () => {
  assert.deepEqual(validateGrowthValues({ wholesaleKg: 7.5, ebitda: -100 }, "targets"), { wholesaleKg: 7.5, ebitda: -100 });
  assert.equal(validateGrowthValues({ prospects: -1 }, "targets"),null);
  assert.equal(validateGrowthValues({ firstPaidBuyers: 1.5 }, "targets"),null);
  assert.equal(validateGrowthValues({ sampleToFirst: 101 }, "assumptions"),null);
  assert.equal(validateGrowthValues({ invented: 10 }, "targets"),null);
});
