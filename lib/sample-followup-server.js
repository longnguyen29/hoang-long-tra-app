import crypto from 'node:crypto';
import { readSmsGatewayConfig, sendSmsGatewayMessage } from './sms-gateway.js';
import { buildSampleFollowupMessage, sampleFollowupPhone, sampleFollowupSendWindow, sampleFollowupTelegramText, SAMPLE_FOLLOWUP_RETRY_MS } from './sample-followup.js';

export function sampleFollowupProviderId(id) {
  return `hl_sf_${crypto.createHash('sha256').update(String(id)).digest('hex').slice(0, 32)}`;
}

async function saveClaim(admin, row, patch) {
  const { data, error } = await admin.from('sample_followups').update(patch)
    .eq('id', row.id).eq('claim_token', row.claim_token).eq('status', 'sending').select('id').maybeSingle();
  if (error || !data) throw new Error('receipt_write_failed');
}

async function sendTelegram(text, { token, chatId }) {
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
    signal: AbortSignal.timeout(5000),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.ok) throw new Error('telegram_rejected');
}

async function submitSampleSms(admin, candidate, options) {
  const { now, config, sendMessage } = options;
  const at = new Date(now).toISOString();
  const { data, error } = await admin.rpc('claim_sample_followup', { p_id: candidate.id, p_now: at });
  if (error) throw error;
  const row = data?.[0];
  if (!row) return 'skipped';
  // Fresh source, commercial outcome and suppression checks after acquiring the lease.
  const { data: validated, error: validationError } = await admin.rpc('validate_sample_followup', {
    p_id: row.id, p_claim_token: row.claim_token,
  });
  if (validationError) throw validationError;
  const current = validated?.[0];
  if (!current) return 'skipped';
  const phone = sampleFollowupPhone(current.phone);
  const retryAt = new Date(new Date(now).getTime() + SAMPLE_FOLLOWUP_RETRY_MS).toISOString();
  if (!phone || !config.ready) {
    await saveClaim(admin, row, { status: 'failed', last_error: phone ? 'sms_gateway_not_configured' : 'invalid_phone', retry_at: retryAt, updated_at: at });
    return 'failed';
  }
  const providerId = sampleFollowupProviderId(row.id);
  // Persist the boundary before making the external call. If this process dies
  // after submitting, a later job must not mistake it for a safe failed attempt.
  await saveClaim(admin, row, { last_error: 'submission_uncertain', provider_message_id: providerId, updated_at: at });
  let result;
  try {
    result = await sendMessage({ id: providerId, phone, text: buildSampleFollowupMessage(current), config });
  } catch (error) {
    // A transport timeout may have happened after the provider accepted the SMS.
    // Do not retry that uncertainty automatically and risk a second customer text.
    const code = String(error?.message || 'send_failed').split(':')[0];
    const rejected = /^sms_gateway_4\d\d$/.test(code) && !['sms_gateway_408', 'sms_gateway_409'].includes(code);
    await saveClaim(admin, row, rejected
      ? { status: 'failed', last_error: code, retry_at: retryAt, updated_at: at }
      : { last_error: 'submission_uncertain', retry_at: null, updated_at: at });
    return rejected ? 'failed' : 'uncertain';
  }
  try {
    await saveClaim(admin, row, {
      status: 'queued', sms_queued_at: at, retry_at: null, last_error: '', updated_at: at,
      provider_message_id: String(result?.id || providerId).slice(0, 150),
      provider_state: String(result?.state || 'Pending').slice(0, 100),
    });
    return 'queued';
  } catch {
    // Keep the accepted submission out of automatic retries even if receipt storage fails.
    await admin.from('sample_followups').update({ last_error: 'receipt_unconfirmed', retry_at: null, updated_at: at })
      .eq('id', row.id).eq('claim_token', row.claim_token).eq('status', 'sending');
    return 'uncertain';
  }
}

export async function processSampleFollowups(admin, {
  now = new Date(), limit = 2, config = readSmsGatewayConfig(), sendMessage = sendSmsGatewayMessage,
  sendNotification = sendTelegram,
  telegramConfig = { token: process.env.TELEGRAM_BOT_TOKEN?.trim(), chatId: process.env.TELEGRAM_CHAT_ID?.trim().replace(/^["']|["']$/g, '') },
} = {}) {
  const result = { scanned: 0, queued: 0, failed: 0, uncertain: 0, telegramSent: 0, telegramFailed: 0 };
  if (!sampleFollowupSendWindow(now)) return { ...result, state: 'outside_send_hours' };
  const { data: settings, error: settingsError } = await admin.from('sample_followup_settings').select('*').eq('id', 1).single();
  if (settingsError) throw settingsError;
  if (!settings.enabled) return { ...result, state: 'paused' };
  const at = new Date(now).toISOString();
  const batch = Math.max(1, Math.min(3, Number(limit) || 2));
  const { data: rows, error } = await admin.from('sample_followups').select('*')
    .eq('channel', 'sms').in('status', ['pending', 'failed', 'sending']).lt('attempts', 3)
    .lte('due_at', at).not('last_error', 'in', '(receipt_unconfirmed,submission_uncertain)')
    .or(`retry_at.is.null,retry_at.lte.${at}`).order('updated_at', { ascending: true }).limit(batch);
  if (error) throw error;
  for (const row of rows || []) {
    result.scanned++;
    const status = await submitSampleSms(admin, row, { now, config, sendMessage });
    if (Object.hasOwn(result, status)) result[status]++;
  }
  if (!telegramConfig.token || !telegramConfig.chatId) return { ...result, state: 'telegram_not_configured' };
  const { data: notifications, error: notificationError } = await admin.from('sample_followups').select('*')
    .in('status', ['pending', 'sending', 'queued', 'failed']).lte('due_at', at)
    .is('telegram_notified_at', null).is('telegram_claimed_at', null)
    .or('channel.eq.telegram,status.eq.queued,and(status.eq.failed,attempts.gte.3),last_error.in.(receipt_unconfirmed,submission_uncertain)')
    .order('due_at', { ascending: true }).limit(batch);
  if (notificationError) throw notificationError;
  for (const row of notifications || []) {
    if (row.status === 'sending' && new Date(row.claimed_at).getTime() > new Date(now).getTime() - 20 * 60_000) continue;
    const { data: claimed, error: claimError } = await admin.rpc('claim_sample_followup_telegram', { p_id: row.id, p_now: at });
    if (claimError) throw claimError;
    const current = claimed?.[0];
    if (!current) continue;
    try {
      await sendNotification(sampleFollowupTelegramText(current), telegramConfig);
      const { error: receiptError } = await admin.from('sample_followups').update({ telegram_notified_at: at, telegram_error: '' })
        .eq('id', row.id).eq('telegram_claimed_at', current.telegram_claimed_at);
      if (receiptError) throw new Error('telegram_receipt_unconfirmed');
      result.telegramSent++;
    } catch (error) {
      // Telegram has no idempotency key; retain the claim after uncertain delivery.
      await admin.from('sample_followups').update({ telegram_error: String(error.message || 'telegram_failed').slice(0, 100) })
        .eq('id', row.id).eq('telegram_claimed_at', current.telegram_claimed_at);
      result.telegramFailed++;
    }
  }
  return { ...result, state: 'completed' };
}
