const MAX_FIELD_LENGTH = 1200;
const MAX_PROMPT_LENGTH = 12000;

const clean = (value, max = MAX_FIELD_LENGTH) => String(value || "").trim().slice(0, max);

const BRIEF_FIELDS = [
  "title", "audience", "customerProblem", "angle", "proof", "offer", "cta", "hypothesis",
];

export function normalizeGrowthAiInput(body = {}) {
  const brief = Object.fromEntries(BRIEF_FIELDS.map((key) => [key, clean(body.brief?.[key])]));
  const prompt = clean(body.prompt, MAX_PROMPT_LENGTH);
  if (!brief.title || !brief.audience || !brief.customerProblem || !brief.offer || !brief.cta || !prompt) {
    throw new Error("invalid_brief");
  }
  return { brief, prompt };
}

export function buildGrowthAiRequest({ prompt, model = "gpt-5.4-mini", safetyIdentifier = "" }) {
  return {
    model,
    store: false,
    max_output_tokens: 2200,
    reasoning: { effort: "low" },
    safety_identifier: safetyIdentifier,
    instructions: [
      "Bạn là biên tập viên tăng trưởng B2B của Nhà làm Trà Hoàng Long.",
      "Viết tiếng Việt tự nhiên, điềm tĩnh và cụ thể cho chủ quán hoặc người phát triển menu đồ uống.",
      "Mục tiêu là khiến đúng khách hàng bấm vào trang sample để thử trà trong công thức, không phải câu tương tác rỗng.",
      "Chỉ dùng bằng chứng có trong brief. Không bịa số liệu, chứng nhận, khách hàng, kết quả hoặc cam kết.",
      "Không dùng giọng giật tít, từ tuyệt đối, quá nhiều emoji hoặc dấu chấm than.",
      "Ba phiên bản phải giữ cùng offer và CTA, chỉ thay đổi cách mở bài để phép thử còn có ý nghĩa.",
      "Mỗi bài dài khoảng 280–450 ký tự, xuống dòng tự nhiên và kết thúc bằng đúng token [LINK_SAMPLE].",
      "Rationale giải thích ngắn điều duy nhất đang được thử ở phần mở bài; không lặp lại toàn bài.",
    ].join("\n"),
    input: prompt,
    text: {
      verbosity: "low",
      format: {
        type: "json_schema",
        name: "growth_variants",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            variants: {
              type: "array",
              minItems: 3,
              maxItems: 3,
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  label: { type: "string", minLength: 1, maxLength: 80 },
                  text: { type: "string", minLength: 80, maxLength: 1200 },
                  rationale: { type: "string", minLength: 1, maxLength: 300 },
                },
                required: ["label", "text", "rationale"],
              },
            },
          },
          required: ["variants"],
        },
      },
    },
  };
}

export function parseGrowthAiResponse(payload = {}) {
  if (!payload.output_text) throw new Error("empty_ai_response");
  let parsed;
  try {
    parsed = JSON.parse(payload.output_text);
  } catch {
    throw new Error("invalid_ai_response");
  }
  if (!Array.isArray(parsed.variants) || parsed.variants.length !== 3) throw new Error("invalid_ai_variants");
  const variants = parsed.variants.map((variant, index) => {
    const text = clean(variant.text, 1200);
    if (text.length < 80) throw new Error("invalid_ai_variant_text");
    return {
      label: clean(variant.label, 80) || `${String.fromCharCode(65 + index)} · Cách mở ${index + 1}`,
      text: text.includes("[LINK_SAMPLE]") ? text : `${text}\n\n[LINK_SAMPLE]`,
      rationale: clean(variant.rationale, 300),
    };
  });
  return {
    variants,
    usage: {
      inputTokens: Number(payload.usage?.input_tokens || 0),
      outputTokens: Number(payload.usage?.output_tokens || 0),
    },
  };
}
