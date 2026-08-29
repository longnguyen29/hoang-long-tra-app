import test from "node:test";
import assert from "node:assert/strict";
import { buildGrowthPrompt, judgeThreadsDraft, starterVariants, trackingUrl } from "./growth-judge.js";

test("a specific B2B sample post scores better than vague hype", () => {
  const useful = judgeThreadsDraft("Chủ quán đang chọn nền trà cho menu? Thử 4 mẫu Shan Tuyết Hà Giang trực tiếp trong công thức tại quầy trước khi nhập sỉ. Nhận bộ mẫu tại: /sample");
  const vague = judgeThreadsDraft("Trà tốt nhất! Hương vị hoàn hảo không thể bỏ lỡ!");
  assert.ok(useful.overall > vague.overall);
  assert.ok(useful.scores.cta >= 70);
});

test("prompt and starters preserve the experiment brief", () => {
  const brief = { audience: "chủ quán trà sữa", customerProblem: "trà mất vị khi thêm sữa", offer: "bộ thử menu" };
  assert.match(buildGrowthPrompt(brief), /chủ quán trà sữa/);
  assert.match(starterVariants(brief)[0].text, /trà mất vị khi thêm sữa/);
  assert.equal(starterVariants(brief).length, 3);
});

test("tracking URL carries one stable experiment code", () => {
  const url = trackingUrl("T8-A");
  assert.match(url, /utm_source=threads/);
  assert.match(url, /exp=T8-A/);
});
