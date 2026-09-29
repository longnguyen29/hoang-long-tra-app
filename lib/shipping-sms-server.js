import { logOrderEvent } from '@/lib/ops-events';
import { readSmsGatewayConfig, sendSmsGatewayMessage } from '@/lib/sms-gateway';
import { shippingSmsEligibility, shippingSmsId, shippingSmsProviderId } from '@/lib/shipping-sms';

const SMS_FIELDS = 'id,shipping_carrier,tracking_code,status,attempts,queued_at';
const RETRY_STATUSES = ['pending', 'failed', 'needs_phone', 'sending'];
const MAX_ATTEMPTS = 3;

export async function readShippingSms(admin, orderId) {
  const { data, error } = await admin.from('sms_tracking_updates')
    .select(SMS_FIELDS).eq('order_id', orderId)
    .order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  return data;
}

async function updateRecord(admin, id, patch) {
  const { error } = await admin.from('sms_tracking_updates')
    .update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

async function processRecord(admin, record, order, { sendMessage, config, now }) {
  if (!RETRY_STATUSES.includes(record.status)) return { status: record.status };
  if (record.status === 'sending' && new Date(record.claimed_at).getTime() > new Date(now).getTime() - 10 * 60_000) {
    return { status: 'already_processing' };
  }
  const eligibility = shippingSmsEligibility(order, record);
  if (!eligibility.eligible) {
    const status = eligibility.reason === 'invalid_phone' ? 'needs_phone' :
      eligibility.reason === 'not_shipping' || eligibility.reason === 'waybill_changed' ? 'skipped' : 'failed';
    if (record.status !== status) await updateRecord(admin, record.id, { status, last_error: eligibility.reason });
    return { status, reason: eligibility.reason };
  }
  if (!config.ready && sendMessage === sendSmsGatewayMessage) {
    await updateRecord(admin, record.id, { status: 'failed', last_error: 'sms_gateway_not_configured' });
    return { status: 'failed', reason: 'sms_gateway_not_configured' };
  }
  if (record.attempts >= MAX_ATTEMPTS) return { status: 'failed_limit' };

  let claim = admin.from('sms_tracking_updates').update({
    status: 'sending', attempts: record.attempts + 1,
    claimed_at: new Date(now).toISOString(), last_error: '', updated_at: new Date(now).toISOString(),
  }).eq('id', record.id).eq('status', record.status).eq('attempts', record.attempts);
  // A crashed request can be reclaimed only after a short lease; concurrent saves cannot both send.
  if (record.status === 'sending') claim = claim.lt('claimed_at', new Date(new Date(now).getTime() - 10 * 60_000).toISOString());
  const { data: claimed, error: claimError } = await claim.select('id').maybeSingle();
  if (claimError) throw claimError;
  if (!claimed) return { status: 'already_processing' };

  try {
    const providerId = shippingSmsProviderId(order);
    const result = await sendMessage({ id: providerId, phone: eligibility.phone, text: eligibility.text, config });
    await updateRecord(admin, record.id, {
      status: 'queued', queued_at: new Date().toISOString(),
      provider_message_id: String(result?.id || providerId),
      provider_state: String(result?.state || 'Pending'),
    });
    await logOrderEvent(admin, {
      orderId: order.id, kind: 'customer_notification',
      message: `SMS mã vận đơn ${order.tracking_code} (${order.shipping_carrier}) đã được đưa tới điện thoại để gửi cho khách.`,
      actor: 'SMS tự động', externalRef: `sms:${record.id}`,
    });
    return { status: 'queued' };
  } catch (error) {
    await updateRecord(admin, record.id, { status: 'failed', last_error: String(error?.message || error).slice(0, 500) });
    return { status: 'failed', reason: 'gateway_error' };
  }
}

export async function maybeSendShippingSms(admin, order, {
  now = new Date(), sendMessage = sendSmsGatewayMessage, config = readSmsGatewayConfig(),
} = {}) {
  if (order?.stage !== 'shipping' || order?.status !== 'shipped' || !order?.shipping_carrier || !order?.tracking_code) {
    return { status: 'not_ready' };
  }
  const id = shippingSmsId(order);
  const { error } = await admin.from('sms_tracking_updates').insert({
    id, order_id: order.id, shipping_carrier: order.shipping_carrier,
    tracking_code: order.tracking_code,
  });
  if (error && error.code !== '23505') throw error;
  const { data: record, error: readError } = await admin.from('sms_tracking_updates')
    .select('*').eq('id', id).single();
  if (readError) throw readError;
  return processRecord(admin, record, order, { now, sendMessage, config });
}

export async function retryShippingSms(admin, {
  now = new Date(), limit = 25, sendMessage = sendSmsGatewayMessage, config = readSmsGatewayConfig(),
} = {}) {
  if (!config.ready && sendMessage === sendSmsGatewayMessage) return { status: 'not_configured', scanned: 0 };
  const { data: records, error } = await admin.from('sms_tracking_updates').select('*')
    .in('status', RETRY_STATUSES).lt('attempts', MAX_ATTEMPTS)
    .order('created_at', { ascending: true }).limit(Math.max(1, Math.min(100, Number(limit) || 25)));
  if (error) throw error;
  const results = [];
  for (const record of records || []) {
    const { data: order, error: orderError } = await admin.from('orders').select('*').eq('id', record.order_id).maybeSingle();
    if (orderError) throw orderError;
    results.push({ id: record.id, ...await processRecord(admin, record, order, { now, sendMessage, config }) });
  }
  return { status: 'completed', scanned: records?.length || 0, results };
}
