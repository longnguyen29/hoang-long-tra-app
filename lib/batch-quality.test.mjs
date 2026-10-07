import test from "node:test";
import assert from "node:assert/strict";
import { batchScore, emptyBatchReview, normalizeBatchReview, batchReviewAverage, batchReviewSummary } from "./batch-quality.js";

test("sensory scores accept only integer 1–5 and preserve missing values", () => {
  for (const value of [null, undefined, "", " ", 0, 6, 2.5, "3.5", true, "0x3", NaN]) assert.equal(batchScore(value), null);
  assert.equal(batchScore(" 4 "), 4);
  assert.equal(batchScore(1), 1);
  assert.equal(batchScore(5), 5);
});

test("pass requires all three sensory scores", () => {
  const incomplete = normalizeBatchReview({ ...emptyBatchReview(), result: "pass", aroma_score: "5" });
  assert.ok(incomplete.errors.scores);
  assert.equal(incomplete.values.taste_score, null);
  const complete = normalizeBatchReview({ result: "pass", aroma_score: "5", taste_score: "4", liquor_score: "3", notes: "  Pha 5 g/200 ml  " });
  assert.deepEqual(complete.errors, {});
  assert.deepEqual(complete.values, { result: "pass", aroma_score: 5, taste_score: 4, liquor_score: 3, notes: "Pha 5 g/200 ml" });
});

test("hold and reject retain partial scores but require a useful explanation", () => {
  assert.ok(normalizeBatchReview({ ...emptyBatchReview(), result: "hold" }).errors.notes);
  assert.ok(normalizeBatchReview({ ...emptyBatchReview(), result: "reject", notes: " " }).errors.notes);
  const partial = normalizeBatchReview({ ...emptyBatchReview(), aroma_score: "2", notes: "Có mùi lạ; cần kiểm tra lại mẫu lưu." });
  assert.deepEqual(partial.errors, {});
  assert.equal(partial.values.liquor_score, null);
});

test("invalid result, scores and oversized notes cannot be saved", () => {
  const invalid = normalizeBatchReview({ aroma_score: "8", taste_score: "2.2", liquor_score: true, result: "released", notes: "x".repeat(3001) });
  for (const field of ["aroma_score", "taste_score", "liquor_score", "result", "notes"]) assert.ok(invalid.errors[field]);
});

test("summary averages only known scores and complete overall assessments", () => {
  const reviews = [
    { aroma_score: 5, taste_score: 4, liquor_score: 3, result: "pass" },
    { aroma_score: 1, taste_score: null, liquor_score: null, result: "hold" },
    { aroma_score: 3, taste_score: 3, liquor_score: 3, result: "pass" },
  ];
  assert.equal(batchReviewAverage(reviews[0]), 4);
  assert.equal(batchReviewAverage(reviews[1]), null);
  const summary = batchReviewSummary(reviews);
  assert.equal(summary.overallAverage, 3.5);
  assert.equal(summary.completeScoreCount, 2);
  assert.equal(summary.incompleteScoreCount, 1);
  assert.deepEqual(summary.byScore.aroma_score, { count: 3, average: 3 });
  assert.deepEqual(summary.byScore.taste_score, { count: 2, average: 3.5 });
  assert.equal(summary.passCount, 2);
  assert.equal(summary.holdCount, 1);
});

test("empty history has unknown means rather than zero", () => {
  const summary = batchReviewSummary();
  assert.equal(summary.count, 0);
  assert.equal(summary.overallAverage, null);
  assert.deepEqual(summary.byScore.liquor_score, { count: 0, average: null });
});
