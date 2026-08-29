import test from "node:test";
import assert from "node:assert/strict";
import { buildGrowthAiRequest, normalizeGrowthAiInput, parseGrowthAiResponse } from "./growth-ai.js";

const brief = {
  title: "Thử cách mở bài",
  audience: "Chủ quán trà sữa",
  customerProblem: "Trà mất vị khi thêm sữa",
  angle: "Thử tại quầy",
  proof: "Bốn mẫu Shan Tuyết Hà Giang",
  offer: "Bộ bốn mẫu",
  cta: "Bấm link để gửi nhu cầu",
  hypothesis: "Nỗi khó công thức tạo lead phù hợp hơn",
};

test("normalizes a complete brief and rejects incomplete input", () => {
  assert.equal(normalizeGrowthAiInput({ brief, prompt: "Viết ba bản" }).brief.title, brief.title);
  assert.throws(() => normalizeGrowthAiInput({ brief: {}, prompt: "x" }), /invalid_brief/);
});

test("builds a private structured Responses API request", () => {
  const request = buildGrowthAiRequest({ prompt: "Viết ba bản", safetyIdentifier: "hashed-user" });
  assert.equal(request.store, false);
  assert.equal(request.model, "gpt-5.4-mini");
  assert.equal(request.text.format.type, "json_schema");
  assert.equal(request.text.format.schema.properties.variants.minItems, 3);
});

test("parses exactly three variants and restores a missing sample token", () => {
  const payload = {
    output_text: JSON.stringify({ variants: [0, 1, 2].map((index) => ({
      label: `Bản ${index + 1}`,
      text: `Chủ quán đang thử nền trà cho công thức mới. Đây là nội dung đủ dài để được chấp nhận cho bản số ${index + 1}.`,
      rationale: "Thử một cách mở cụ thể.",
    })) }),
    usage: { input_tokens: 100, output_tokens: 200 },
  };
  const result = parseGrowthAiResponse(payload);
  assert.equal(result.variants.length, 3);
  assert.match(result.variants[0].text, /\[LINK_SAMPLE\]$/);
  assert.deepEqual(result.usage, { inputTokens: 100, outputTokens: 200 });
});
