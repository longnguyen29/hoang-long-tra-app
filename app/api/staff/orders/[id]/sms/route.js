import { authenticateManagerRequest } from '@/lib/staff-api-auth';
import { readShippingSms, sendShippingSmsManually } from '@/lib/shipping-sms-server';
import { readOrderSmsHistory } from '@/lib/order-sms-history-server';
import { refreshOrderSmsStatuses } from '@/lib/order-sms-status-server';

export const maxDuration = 60;

export async function POST(request, { params }) {
  const staff = await authenticateManagerRequest(request);
  if (!staff) return Response.json({ ok: false }, { status: 401 });
  const { id } = await params;
  let body;
  try { body = await request.json(); } catch { return Response.json({ ok: false, error: 'invalid_body' }, { status: 400 }); }
  if (!body || Array.isArray(body) || typeof body !== 'object'
    || Object.keys(body).some(key => !['action', 'expectedCarrier', 'expectedTrackingCode', 'expectedPhone', 'reason', 'acknowledgeDuplicate'].includes(key))
    || !['refresh', 'send', 'retry', 'resend'].includes(body.action)
    || body.reason !== undefined && (typeof body.reason !== 'string' || body.reason.trim().length > 1000)
    || body.acknowledgeDuplicate !== undefined && typeof body.acknowledgeDuplicate !== 'boolean') {
    return Response.json({ ok: false, error: 'invalid_sms_action' }, { status: 400 });
  }
  const { data: order, error } = await staff.admin.from('orders').select('*').eq('id', id).maybeSingle();
  if (error) return Response.json({ ok: false, error: 'sms_order_read_failed' }, { status: 500 });
  if (!order) return Response.json({ ok: false, error: 'order_not_found' }, { status: 404 });
  if (body.action !== 'refresh' && (typeof body.expectedCarrier !== 'string' || typeof body.expectedTrackingCode !== 'string'
    || !body.expectedCarrier || !body.expectedTrackingCode)) {
    return Response.json({ ok: false, error: 'sms_waybill_required' }, { status: 400 });
  }
  if (body.action !== 'refresh' && (typeof body.expectedPhone !== 'string' || !/^\+84\d{9}$/.test(body.expectedPhone))) {
    return Response.json({ ok: false, error: 'sms_recipient_required' }, { status: 400 });
  }
  if (body.action !== 'refresh' && (body.expectedCarrier !== order.shipping_carrier || body.expectedTrackingCode !== order.tracking_code)) {
    return Response.json({ ok: false, error: 'sms_waybill_changed' }, { status: 409 });
  }
  if (body.action === 'resend' && (body.acknowledgeDuplicate !== true || (body.reason || '').trim().length < 10)) {
    return Response.json({ ok: false, error: 'sms_resend_confirmation_required' }, { status: 400 });
  }
  try {
    const result = body.action === 'refresh'
      ? await refreshOrderSmsStatuses(staff.admin, { orderId: id, limit: 3 })
      : await sendShippingSmsManually(staff.admin, order, { action: body.action, reason: (body.reason || '').trim(),
        acknowledgeDuplicate: body.acknowledgeDuplicate === true, expectedPhone: body.expectedPhone, actor: staff.user.email || staff.user.id });
    const [trackingSms, smsHistory] = await Promise.all([readShippingSms(staff.admin, id), readOrderSmsHistory(staff.admin, id)]);
    const { data: events } = await staff.admin.from('order_events').select('*').eq('order_id', id).order('created_at', { ascending: false });
    const failure = ['not_ready', 'needs_phone', 'reason_required', 'confirmation_required', 'status_unavailable', 'check_required', 'not_configured', 'recipient_changed'].includes(result.status);
    return Response.json({ ok: !failure, ...(failure ? { error: `sms_${result.status}` } : {}), result, trackingSms, smsHistory, events: events || [] },
      { status: result.status === 'not_configured' ? 503 : failure ? 409 : 200 });
  } catch (error) {
    console.error('Order SMS action failed', { orderId: id, code: String(error.message || '').split(':')[0] });
    return Response.json({ ok: false, error: 'sms_action_failed' }, { status: 500 });
  }
}
