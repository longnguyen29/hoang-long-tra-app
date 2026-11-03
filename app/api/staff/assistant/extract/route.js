import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { authenticateManagerRequest } from '@/lib/staff-api-auth';
import { buildAssistantRequest, normalizeAssistantText, parseAssistantResponse } from '@/lib/assistant-extract';

export async function POST(request) {
  let auth;
  try { auth = await authenticateManagerRequest(request); } catch { return NextResponse.json({ error: 'auth_unavailable' }, { status: 503 }); }
  if (!auth) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return NextResponse.json({ error: 'openai_not_configured' }, { status: 503 });
  let text;
  try {
    if (Number(request.headers.get('content-length') || 0) > 60000) throw new Error('invalid_input');
    const raw = await request.text();
    if (raw.length > 60000) throw new Error('invalid_input');
    text = normalizeAssistantText(JSON.parse(raw));
  } catch { return NextResponse.json({ error: 'invalid_input' }, { status: 400 }); }

  const model = process.env.OPENAI_ASSISTANT_MODEL?.trim() || 'gpt-6-luna';
  const safetyIdentifier = createHash('sha256').update(auth.user.id).digest('hex');
  let runId;
  try {
    const result = await auth.admin.rpc('reserve_assistant_ai_run', { p_user_id: auth.user.id, p_model: model });
    if (result.error) throw result.error;
    runId = result.data;
  } catch { return NextResponse.json({ error: 'rate_limit_unavailable' }, { status: 503 }); }
  if (!runId) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });

  let response;
  try {
    response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(buildAssistantRequest({ text, model, safetyIdentifier })), signal: AbortSignal.timeout(45000),
    });
  } catch { return NextResponse.json({ error: 'openai_unreachable' }, { status: 502 }); }

  const payload = await response.json().catch(() => null);
  if (!response.ok) return NextResponse.json({ error: 'openai_failed' }, { status: 502 });

  let result;
  try { result = parseAssistantResponse(payload, text); } catch (error) {
    return NextResponse.json({ error: error.message === 'ai_refused' ? 'ai_refused' : 'invalid_ai_response' }, { status: 502 });
  }
  // Retain usage only, never the source conversation, customer data or model output.
  try {
    await auth.admin.from('growth_ai_runs').update({ input_tokens: result.usage.inputTokens, output_tokens: result.usage.outputTokens }).eq('id', runId).eq('user_id', auth.user.id);
  } catch { /* AI output remains usable even if accounting metadata cannot be updated. */ }
  return NextResponse.json({ ...result, model });
}
