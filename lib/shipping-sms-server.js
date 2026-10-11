import { randomUUID } from 'node:crypto';
import { logOrderEvent } from '@/lib/ops-events';
import { readSmsGatewayConfig, readSmsGatewayMessage, sendSmsGatewayMessage } from '@/lib/sms-gateway';
import { shippingSmsEligibility, shippingSmsId, shippingSmsProviderId } from '@/lib/shipping-sms';
import { trackingSmsPreview } from './tracking-sms-preview.js';
import { providerReceiptPatch, providerWasSent, refreshOrderSmsStatuses, refreshSmsRecord, SMS_PROVIDER_FIELDS } from './order-sms-status-server.js';

const SMS_FIELDS = `id,shipping_carrier,tracking_code,status,attempts,queued_at,claimed_at,last_error,retry_generation,submission_token,${SMS_PROVIDER_FIELDS}`;
const RETRY_STATUSES = ['pending', 'failed', 'needs_phone', 'sending'];
export const SHIPPING_SMS_RETRY_MS = 3 * 60 * 60_000;
const LEASE_MS = 10 * 60_000;
const iso = now => new Date(now).toISOString();
const generation = row => Number(row.retry_generation || 0);
const hasSent = providerWasSent;
const providerId = (order, round) => `${shippingSmsProviderId(order)}${round ? `_r${round}` : ''}`;
const reasonValid = reason => typeof reason === 'string' && reason.trim().length >= 10 && reason.trim().length <= 1000;
const definiteReject = message => {
  const code = String(message || '').split(':')[0];
  return /^sms_gateway_4\d\d$/.test(code) && !['sms_gateway_408', 'sms_gateway_409'].includes(code);
};

export async function readShippingSms(admin, orderId) {
  const { data, error } = await admin.from('sms_tracking_updates').select(SMS_FIELDS).eq('order_id', orderId)
    .order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  return data;
}

async function saveClaim(admin, record, token, patch, now) {
  let update = admin.from('sms_tracking_updates').update({ ...patch, updated_at: iso(now) })
    .eq('id', record.id).eq('submission_token', token).eq('retry_generation', generation(record))
    .eq('provider_state', record.provider_state || '');
  update = record.provider_checked_at ? update.eq('provider_checked_at', record.provider_checked_at)
    : update.is('provider_checked_at', null);
  const { data, error } = await update.select('*').maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('sms_claim_changed');
  return data;
}

async function refreshedClaimOutcome(admin, record, token) {
  // A GET may confirm sending while POST is still pending/throws a timeout.
  // Report that newer receipt instead of replacing it with a stale POST result.
  const { data, error } = await admin.from('sms_tracking_updates').select('*')
    .eq('id', record.id).eq('submission_token', token).eq('retry_generation', generation(record)).maybeSingle();
  if (error || !data) return { status: 'uncertain' };
  if (hasSent(data)) return { status: 'already_sent', providerState: data.provider_state };
  if (data.status === 'queued' && ['Pending', 'Processed', 'Cancelling'].includes(data.provider_state)) return { status: 'queued', providerState: data.provider_state };
  if (data.status === 'failed' && data.provider_state === 'Failed') return { status: 'failed', providerState: 'Failed' };
  return { status: 'uncertain' };
}

function manualEligibility(order, record) {
  if (!order || record.shipping_carrier !== order.shipping_carrier || record.tracking_code !== order.tracking_code) return { eligible: false, reason: 'waybill_changed' };
  const preview = trackingSmsPreview(order);
  return preview.phone && !preview.issues.length && preview.text
    ? { eligible: true, phone: preview.phone, text: preview.text }
    : { eligible: false, reason: preview.phone ? 'incomplete_tracking' : 'invalid_phone' };
}

async function ensureRecord(admin, order) {
  const id = shippingSmsId(order);
  const { error } = await admin.from('sms_tracking_updates').insert({ id, order_id: order.id,
    shipping_carrier: order.shipping_carrier, tracking_code: order.tracking_code });
  if (error && error.code !== '23505') throw error;
  const { data, error: readError } = await admin.from('sms_tracking_updates').select('*').eq('id', id).single();
  if (readError) throw readError;
  return data;
}

async function processRecord(admin, original, order, {
  sendMessage, readStatus, config, now, action = 'automatic', reason = '', actor = 'SMS tự động', acknowledgeDuplicate = false, expectedPhone,
}) {
  const manual = action !== 'automatic';
  let record = original;
  const timestamp = new Date(now).getTime();
  if (['sending', 'uncertain'].includes(record.status) && new Date(record.claimed_at).getTime() > timestamp - LEASE_MS) return { status: 'already_processing' };
  const eligibility = manual ? manualEligibility(order, record) : shippingSmsEligibility(order, record);
  if (!eligibility.eligible) {
    if (!manual) {
      const { error } = await admin.from('sms_tracking_updates').update({
        status: eligibility.reason === 'invalid_phone' ? 'needs_phone' : 'skipped',
        last_error: eligibility.reason, updated_at: iso(now),
      }).eq('id', record.id).eq('status', record.status).eq('attempts', record.attempts);
      if (error) throw error;
    }
    return { status: eligibility.reason === 'invalid_phone' ? 'needs_phone' : 'not_ready', reason: eligibility.reason };
  }
  if (manual && expectedPhone !== eligibility.phone) return { status: 'recipient_changed' };
  if (manual && (order.stage !== 'shipping' || order.status !== 'shipped') && !reasonValid(reason)) return { status: 'reason_required', reason: 'stage_override_reason_required' };
  if (action === 'resend' && (!reasonValid(reason) || acknowledgeDuplicate !== true)) return { status: 'confirmation_required' };
  const lastAttempt = new Date(record.claimed_at || record.updated_at).getTime();
  const cooling = record.attempts > 0 && Number.isFinite(lastAttempt) && timestamp - lastAttempt < SHIPPING_SMS_RETRY_MS;
  if (cooling && !manual) return { status: 'retry_later', nextRetryAt: iso(lastAttempt + SHIPPING_SMS_RETRY_MS) };
  if (cooling && manual && !reasonValid(reason)) return { status: 'reason_required', reason: 'cooldown_override_reason_required' };
  if (!config.ready && sendMessage === sendSmsGatewayMessage) return { status: 'not_configured' };

  let lookup = null;
  // Old failed rows sometimes lost their provider ID. Query its deterministic
  // ID before retrying, so a timeout accepted by the relay is never a new SMS.
  if (record.attempts > 0 || record.provider_message_id || ['queued', 'uncertain'].includes(record.status)) {
    const lookupId = record.provider_message_id || providerId(order, generation(record));
    lookup = await refreshSmsRecord(admin, 'sms_tracking_updates', record, { now, config, readStatus, lookupId });
    if (lookup.status === 'changed') return { status: 'already_processing' };
    if (lookup.record) record = { ...record, ...lookup.record };
    if (lookup.status === 'unavailable') return { status: 'status_unavailable' };
    if (lookup.receipt) {
      record = { ...record, ...providerReceiptPatch(lookup.receipt, now, record), provider_message_id: lookupId };
      if (['Pending', 'Processed', 'Cancelling'].includes(lookup.receipt.state)) return { status: 'queued', providerState: lookup.receipt.state };
      if (hasSent(record) && action !== 'resend') return { status: 'already_sent', providerState: lookup.receipt.state };
      if (!manual && lookup.receipt.state === 'Cancelled') return { status: 'provider_cancelled' };
    } else if (['queued', 'uncertain', 'sending'].includes(original.status)
      || original.status === 'failed' && !definiteReject(original.last_error)
      || ['submission_uncertain', 'receipt_unconfirmed'].includes(original.last_error) || hasSent(original)) {
      if (action !== 'resend') return { status: 'check_required' };
    }
  }
  if (record.status === 'queued' && !lookup?.receipt && action !== 'resend') return { status: 'queued' };
  if (!manual && !RETRY_STATUSES.includes(record.status)) return { status: record.status };

  // An accepted message owns its ID forever while retained by the provider.
  // Only a fresh terminal failure or acknowledged resend gets a new ID.
  const newGeneration = action === 'resend' || lookup?.receipt && ['Failed', 'Cancelled'].includes(lookup.receipt.state);
  const nextGeneration = generation(original) + (newGeneration ? 1 : 0);
  const nextProviderId = newGeneration ? providerId(order, nextGeneration)
    : original.provider_message_id || providerId(order, nextGeneration);
  if (manual || newGeneration) {
    // Audit first: preserve the prior receipt before resetting the current
    // generation. A database audit failure must prevent any customer send.
    const { error: auditError } = await admin.from('order_events').insert({ order_id: order.id, kind: 'sms_manual_action', actor,
      message: JSON.stringify({ action: manual ? action : 'automatic_retry',
        reason: manual ? reason.trim() : 'Provider xác nhận gửi lỗi; thử lại sau 3 giờ.', acknowledgeDuplicate, carrier: order.shipping_carrier,
        tracking_code: order.tracking_code, previous_receipt: { ...original,
          provider_state: record.provider_state, provider_states: record.provider_states }, next_provider_id: nextProviderId }) });
    if (auditError) throw new Error('manual_audit_failed');
  }
  const token = randomUUID();
  let claim = admin.from('sms_tracking_updates').update({ status: 'sending', attempts: Number(original.attempts || 0) + 1,
    claimed_at: iso(now), updated_at: iso(now), submission_token: token, retry_generation: nextGeneration,
    provider_message_id: nextProviderId, last_error: 'submission_uncertain',
    ...(newGeneration ? { provider_state: '', provider_states: {}, provider_sent_at: null, provider_delivered_at: null,
      provider_checked_at: null, provider_check_error: '', queued_at: null } : {}),
  }).eq('id', original.id).eq('attempts', original.attempts).eq('retry_generation', generation(original))
    .eq('provider_state', record.provider_state || '').eq('provider_message_id', record.provider_message_id || '');
  claim = original.submission_token ? claim.eq('submission_token', original.submission_token) : claim.is('submission_token', null);
  if (original.status === 'sending') claim = claim.lt('claimed_at', iso(timestamp - LEASE_MS));
  claim = claim.in('status', lookup?.receipt ? [original.status, 'queued', 'failed'] : [original.status]);
  const { data: claimed, error: claimError } = await claim.select('*').maybeSingle();
  if (claimError) throw claimError;
  if (!claimed) return { status: 'already_processing' };

  const { data: freshOrder, error: freshError } = await admin.from('orders').select('*').eq('id', order.id).maybeSingle();
  if (freshError) throw freshError;
  const freshEligibility = manual ? manualEligibility(freshOrder, claimed) : shippingSmsEligibility(freshOrder, claimed);
  const recipientChanged = manual && freshEligibility.eligible && expectedPhone !== freshEligibility.phone;
  if (!freshEligibility.eligible || recipientChanged || manual && (freshOrder.stage !== 'shipping' || freshOrder.status !== 'shipped') && !reasonValid(reason)) {
    await saveClaim(admin, claimed, token, { status: 'skipped', last_error: recipientChanged ? 'recipient_changed' : freshEligibility.reason || 'stage_changed' }, now);
    return { status: recipientChanged ? 'recipient_changed' : 'not_ready', reason: freshEligibility.reason || 'stage_changed' };
  }
  let receipt;
  try { receipt = await sendMessage({ id: nextProviderId, phone: freshEligibility.phone, text: freshEligibility.text, config }); }
  catch (error) {
    const code = String(error?.message || error).split(':')[0];
    const rejected = definiteReject(code);
    try {
      await saveClaim(admin, claimed, token, { status: rejected ? 'failed' : 'uncertain',
        last_error: rejected ? String(error.message).slice(0, 500) : 'submission_uncertain' }, now);
    } catch (writeError) {
      if (writeError.message !== 'sms_claim_changed') throw writeError;
      return refreshedClaimOutcome(admin, claimed, token);
    }
    return { status: rejected ? 'failed' : 'uncertain' };
  }
  try {
    await saveClaim(admin, claimed, token, { status: 'queued', queued_at: iso(now), last_error: '',
      provider_message_id: String(receipt?.id || nextProviderId),
      ...providerReceiptPatch({ ...receipt, state: receipt?.state || 'Pending' }, now, newGeneration ? {} : claimed) }, now);
  } catch {
    return refreshedClaimOutcome(admin, claimed, token);
  }
  await logOrderEvent(admin, { orderId: order.id, kind: 'customer_notification',
    message: `SMS mã vận đơn ${order.tracking_code} (${order.shipping_carrier}) đã được gateway tiếp nhận; chờ xác nhận gửi/nhận.`,
    actor, externalRef: `sms:${claimed.id}:${nextGeneration}` });
  return { status: 'queued', providerState: receipt?.state || 'Pending' };
}

export async function maybeSendShippingSms(admin, order, {
  now = new Date(), sendMessage = sendSmsGatewayMessage, readStatus = readSmsGatewayMessage, config = readSmsGatewayConfig(),
} = {}) {
  if (order?.stage !== 'shipping' || order?.status !== 'shipped' || !order.shipping_carrier || !order.tracking_code) return { status: 'not_ready' };
  return processRecord(admin, await ensureRecord(admin, order), order, { now, sendMessage, readStatus, config });
}

export async function sendShippingSmsManually(admin, order, {
  action = 'send', reason = '', actor, acknowledgeDuplicate = false, expectedPhone,
  now = new Date(), sendMessage = sendSmsGatewayMessage, readStatus = readSmsGatewayMessage, config = readSmsGatewayConfig(),
} = {}) {
  if (!order?.shipping_carrier || !order?.tracking_code) return { status: 'not_ready' };
  return processRecord(admin, await ensureRecord(admin, order), order,
    { action, reason, actor, acknowledgeDuplicate, expectedPhone, now, sendMessage, readStatus, config });
}

export async function retryShippingSms(admin, {
  now = new Date(), limit = 2, sendMessage = sendSmsGatewayMessage, readStatus = readSmsGatewayMessage, config = readSmsGatewayConfig(),
} = {}) {
  if (!config.ready && sendMessage === sendSmsGatewayMessage) return { status: 'not_configured', scanned: 0 };
  const { data: records, error } = await admin.from('sms_tracking_updates').select('*').in('status', RETRY_STATUSES)
    .lte('updated_at', iso(new Date(now).getTime() - SHIPPING_SMS_RETRY_MS))
    .order('updated_at', { ascending: true }).limit(Math.max(1, Math.min(2, Number(limit) || 2)));
  if (error) throw error;
  const results = [];
  for (const record of records || []) {
    const { data: order, error: orderError } = await admin.from('orders').select('*').eq('id', record.order_id).maybeSingle();
    if (orderError) throw orderError;
    results.push({ id: record.id, ...await processRecord(admin, record, order, { now, sendMessage, readStatus, config }) });
  }
  // Two (5s receipt lookup + 12s submission) attempts and one 5s receipt refresh
  // leave 21s of the existing 60s cron budget for database/audit calls.
  const refresh = await refreshOrderSmsStatuses(admin, { automatic: true, limit: 1, now, config, readStatus });
  return { status: 'completed', scanned: records?.length || 0, results, refresh };
}
