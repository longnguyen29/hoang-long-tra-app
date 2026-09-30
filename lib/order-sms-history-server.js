import { orderSmsHistory } from '@/lib/order-sms-history';

export async function readOrderSmsHistory(admin, orderId) {
  const [shipping, payments] = await Promise.all([
    admin.from('sms_tracking_updates')
      .select('id,shipping_carrier,tracking_code,status,attempts,queued_at,provider_state,last_error,created_at,updated_at')
      .eq('order_id', orderId).order('created_at', { ascending: false }).limit(30),
    admin.from('sms_payment_reminders')
      .select('id,amount_due,status,attempts,queued_at,sent_at,provider_state,last_error,skip_reason,created_at,updated_at')
      .eq('order_id', orderId).order('created_at', { ascending: false }).limit(30),
  ]);
  if (shipping.error || payments.error) return { items: [], unavailable: true };
  return { items: orderSmsHistory(shipping.data || [], payments.data || []), unavailable: false };
}
