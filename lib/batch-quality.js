export const BATCH_SCORE_FIELDS = [
  { key: "aroma_score", label: "Hương", help: "Hương rõ, sạch và phù hợp với loại trà." },
  { key: "taste_score", label: "Vị", help: "Vị cân bằng, hậu vị và khả năng dùng cho món dự kiến." },
  { key: "liquor_score", label: "Màu nước", help: "Màu và độ trong của nước trà sau khi pha thử." },
];

export const BATCH_REVIEW_RESULTS = [
  { value: "pass", label: "Đạt" },
  { value: "hold", label: "Cần kiểm tra thêm" },
  { value: "reject", label: "Không đạt" },
];

export const emptyBatchReview = () => ({ aroma_score: "", taste_score: "", liquor_score: "", result: "hold", notes: "" });

export function batchScore(value) {
  if (typeof value === "string") {
    if (!/^[1-5]$/.test(value.trim())) return null;
    return Number(value.trim());
  }
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 5 ? value : null;
}

export function normalizeBatchReview(draft = {}) {
  const errors = {};
  const values = {};
  for (const field of BATCH_SCORE_FIELDS) {
    const raw = draft[field.key];
    values[field.key] = batchScore(raw);
    const blank = raw == null || (typeof raw === "string" && !raw.trim());
    if (!blank && values[field.key] === null) errors[field.key] = "Chọn điểm nguyên từ 1 đến 5.";
  }
  values.result = draft.result;
  if (!BATCH_REVIEW_RESULTS.some(item => item.value === values.result)) errors.result = "Chọn kết luận đánh giá.";
  values.notes = typeof draft.notes === "string" ? draft.notes.trim() : "";
  if (values.notes.length > 3000) errors.notes = "Ghi chú tối đa 3.000 ký tự.";
  if (values.result === "pass" && BATCH_SCORE_FIELDS.some(field => values[field.key] === null)) {
    errors.scores = "Cần đủ điểm hương, vị và màu nước để ghi kết luận Đạt.";
  }
  if (["hold", "reject"].includes(values.result) && !values.notes) errors.notes = "Ghi rõ lý do và việc cần kiểm tra hoặc xử lý.";
  return { values, errors };
}

export function batchReviewAverage(review = {}) {
  const scores = BATCH_SCORE_FIELDS.map(field => batchScore(review?.[field.key]));
  return scores.every(score => score !== null) ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null;
}

export function batchReviewSummary(reviews = []) {
  const rows = Array.isArray(reviews) ? reviews : [];
  const completedScores = rows.map(batchReviewAverage).filter(value => value !== null);
  const byScore = Object.fromEntries(BATCH_SCORE_FIELDS.map(field => {
    const scores = rows.map(row => batchScore(row?.[field.key])).filter(value => value !== null);
    return [field.key, { count: scores.length, average: scores.length ? scores.reduce((sum, value) => sum + value, 0) / scores.length : null }];
  }));
  return {
    count: rows.length,
    completeScoreCount: completedScores.length,
    incompleteScoreCount: rows.length - completedScores.length,
    overallAverage: completedScores.length ? completedScores.reduce((sum, value) => sum + value, 0) / completedScores.length : null,
    passCount: rows.filter(row => row?.result === "pass").length,
    holdCount: rows.filter(row => row?.result === "hold").length,
    rejectCount: rows.filter(row => row?.result === "reject").length,
    byScore,
  };
}
