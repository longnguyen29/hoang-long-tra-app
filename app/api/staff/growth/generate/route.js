import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { authenticateManagerRequest } from "@/lib/staff-api-auth";
import { buildGrowthAiRequest, normalizeGrowthAiInput, parseGrowthAiResponse } from "@/lib/growth-ai";

const RATE_WINDOW_MINUTES = 60;
const RATE_LIMIT = 20;

export async function POST(request) {
  const auth = await authenticateManagerRequest(request);
  if (!auth) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return NextResponse.json({ error: "openai_not_configured" }, { status: 503 });

  let input;
  try {
    input = normalizeGrowthAiInput(await request.json());
  } catch {
    return NextResponse.json({ error: "invalid_brief" }, { status: 400 });
  }

  const since = new Date(Date.now() - RATE_WINDOW_MINUTES * 60 * 1000).toISOString();
  const { count } = await auth.admin.from("growth_ai_runs").select("id", { count: "exact", head: true })
    .eq("user_id", auth.user.id).gte("created_at", since);
  if (Number(count || 0) >= RATE_LIMIT) {
    return NextResponse.json({ error: "rate_limited", retry_after_minutes: RATE_WINDOW_MINUTES }, { status: 429 });
  }

  const model = process.env.OPENAI_GROWTH_MODEL?.trim() || "gpt-5.4-mini";
  const safetyIdentifier = createHash("sha256").update(auth.user.id).digest("hex");
  let openAiResponse;
  try {
    openAiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(buildGrowthAiRequest({ prompt: input.prompt, model, safetyIdentifier })),
      signal: AbortSignal.timeout(45000),
    });
  } catch {
    return NextResponse.json({ error: "openai_unreachable" }, { status: 502 });
  }

  const payload = await openAiResponse.json().catch(() => ({}));
  if (!openAiResponse.ok) {
    const errorCode = payload.error?.code || payload.error?.type || "openai_failed";
    console.error("Growth AI request failed", { status: openAiResponse.status, errorCode });
    return NextResponse.json({ error: "openai_failed", code: errorCode }, { status: 502 });
  }

  let result;
  try {
    result = parseGrowthAiResponse(payload);
  } catch (parseError) {
    console.error("Growth AI response rejected", { error: parseError.message });
    return NextResponse.json({ error: "invalid_ai_response" }, { status: 502 });
  }

  await auth.admin.from("growth_ai_runs").insert({
    user_id: auth.user.id,
    action: "generate_variants",
    model,
    input_tokens: result.usage.inputTokens,
    output_tokens: result.usage.outputTokens,
  });

  return NextResponse.json({ model, variants: result.variants, usage: result.usage });
}
