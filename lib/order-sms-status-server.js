import { readSmsGatewayConfig, readSmsGatewayMessage } from './sms-gateway.js';

export const SMS_PROVIDER_FIELDS = 'provider_message_id,provider_state,provider_checked_at,provider_sent_at,provider_delivered_at,provider_states,provider_check_error';
const TABLES = ['sms_tracking_updates', 'sms_payment_reminders', 'sample_followups'];
const at = value => value && Number.isFinite(new Date(value).getTime()) ? new Date(value).toISOString() : null;
function matchReceiptSnapshot(query, record) {
  query = query.eq('provider_state', record.provider_state || '');
  return record.provider_checked_at ? query.eq('provider_checked_at', record.provider_checked_at)
    : query.is('provider_checked_at', null);
}

export function providerWasSent(record) {
  return Boolean(record.provider_sent_at || record.provider_delivered_at
    || Object.hasOwn(record.provider_states || {}, 'Sent') || Object.hasOwn(record.provider_states || {}, 'Delivered')
    || ['Sent', 'Delivered'].includes(record.provider_state));
}

export function providerReceiptPatch(receipt, now = new Date(), previous = {}) {
  const states = { ...(previous.provider_states || {}) };
  for (const [state, date] of Object.entries(receipt.states || {})) {
    if (['Pending', 'Processed', 'Sent', 'Delivered', 'Failed', 'Cancelling', 'Cancelled'].includes(state) && at(date)) states[state] = at(date);
  }
  // A provider may omit exact timestamps; the state itself still confirms a
  // send. Retain that proof without inventing a send time.
  for (const state of [previous.provider_state, receipt.state]) {
    if (['Sent', 'Delivered'].includes(state) && !Object.hasOwn(states, state)) states[state] = null;
  }
  return { provider_state: receipt.state, provider_states: states,
    provider_checked_at: new Date(now).toISOString(), provider_check_error: '',
    ...(states.Sent ? { provider_sent_at: states.Sent } : {}),
    ...(states.Delivered ? { provider_delivered_at: states.Delivered } : {}) };
}

export async function refreshSmsRecord(admin, table, record, {
  now = new Date(), config = readSmsGatewayConfig(), readStatus = readSmsGatewayMessage, lookupId = record?.provider_message_id,
} = {}) {
  if (!TABLES.includes(table)) throw new Error('invalid_sms_ledger');
  if (!lookupId) return { status: 'unsubmitted', record };
  let receipt;
  try { receipt = await readStatus({ id: lookupId, config }); }
  catch (error) {
    const missing = error.httpStatus === 404 || error.message === 'sms_gateway_status_404';
    // Preserve known delivery evidence when a status API is unavailable or an
    // older relay record has expired. Do not turn a read failure into a resend.
    let update = admin.from(table).update({
      provider_checked_at: new Date(now).toISOString(),
      provider_check_error: missing ? 'provider_record_not_found' : String(error.message || 'provider_status_unavailable').slice(0, 150),
    }).eq('id', record.id).eq('provider_message_id', record.provider_message_id || '');
    if (table === 'sms_tracking_updates') {
      update = update.eq('retry_generation', Number(record.retry_generation || 0));
      update = record.submission_token ? update.eq('submission_token', record.submission_token) : update.is('submission_token', null);
    }
    const { error: writeError } = await matchReceiptSnapshot(update, record);
    if (writeError) throw writeError;
    return { status: missing ? 'not_found' : 'unavailable', record, receipt: null };
  }
  const patch = providerReceiptPatch(receipt, now, record);
  if (receipt.state === 'Failed') {
    const reasons = [receipt.reason, ...(receipt.recipients || []).map(recipient => recipient.error)]
      .filter(value => typeof value === 'string' && value.trim()).map(value => value.trim());
    patch.last_error = `provider_reported_failed${reasons.length ? `: ${[...new Set(reasons)].join('; ')}` : ''}`.slice(0, 500);
  }
  if (!record.provider_message_id) patch.provider_message_id = lookupId;
  if (table === 'sms_tracking_updates') {
    // Recovery from a lost submission receipt: a provider record proves that
    // acceptance occurred, even if the original POST response was lost.
    patch.status = receipt.state === 'Failed' && !providerWasSent({ ...record, ...patch }) ? 'failed' : 'queued';
    patch.queued_at = record.queued_at || patch.provider_states.Pending || new Date(now).toISOString();
    if (receipt.state !== 'Failed' && (['submission_uncertain', 'receipt_unconfirmed'].includes(record.last_error)
      || String(record.last_error || '').startsWith('provider_reported_failed'))) patch.last_error = '';
  }
  let update = admin.from(table).update(patch).eq('id', record.id).eq('provider_message_id', record.provider_message_id || '');
  if (table === 'sms_tracking_updates') {
    update = update.eq('retry_generation', Number(record.retry_generation || 0));
    update = record.submission_token ? update.eq('submission_token', record.submission_token) : update.is('submission_token', null);
  }
  const { data, error } = await matchReceiptSnapshot(update, record).select('*').maybeSingle();
  if (error) throw error;
  return { status: data ? receipt.state : 'changed', record: data || record, receipt };
}

async function candidates(admin, { orderId, limit, automatic, now }) {
  const results = [];
  for (const table of TABLES) {
    let query = admin.from(table).select('*').neq('provider_message_id', '');
    if (orderId) query = query.eq('order_id', orderId);
    if (automatic) query = query.in('status', table === 'sms_tracking_updates' ? ['queued', 'uncertain']
      : table === 'sample_followups' ? ['queued'] : ['queued', 'sent'])
      .not('provider_state', 'in', '(Delivered,Failed,Cancelled)')
      .gte('updated_at', new Date(new Date(now).getTime() - 7 * 86400_000).toISOString());
    if (automatic && table === 'sample_followups') query = query.eq('channel', 'sms');
    const { data, error } = await query.order('provider_checked_at', { ascending: true, nullsFirst: true }).limit(limit);
    if (error) throw error;
    for (const record of data || []) {
      if (!automatic || !record.provider_checked_at || new Date(record.provider_checked_at).getTime() <= new Date(now).getTime() - 10 * 60_000) results.push({ table, record });
    }
  }
  return results.sort((a, b) => new Date(a.record.provider_checked_at || 0).getTime() - new Date(b.record.provider_checked_at || 0).getTime()).slice(0, limit);
}

export async function refreshOrderSmsStatuses(admin, { orderId, limit = 3, automatic = false,
  now = new Date(), ...options } = {}) {
  const rows = await candidates(admin, { orderId, limit: Math.max(1, Math.min(3, Number(limit) || 3)), automatic, now });
  const results = [];
  for (const { table, record } of rows) results.push({ table, id: record.id, ...await refreshSmsRecord(admin, table, record, { now, ...options }) });
  return { status: 'refreshed', checked: results.length,
    results: results.map(({ table, id, status }) => ({ table, id, status })) };
}
