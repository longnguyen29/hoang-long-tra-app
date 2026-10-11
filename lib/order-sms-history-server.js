import { orderSmsHistory } from '@/lib/order-sms-history';

export async function readOrderSmsHistory(admin, orderId) {
  const providerFields = 'provider_checked_at,provider_sent_at,provider_delivered_at,provider_states,provider_check_error';
  const [shipping, payments, samples] = await Promise.all([
    admin.from('sms_tracking_updates')
      .select(`id,shipping_carrier,tracking_code,status,attempts,queued_at,provider_state,last_error,created_at,updated_at,${providerFields}`)
      .eq('order_id', orderId).order('created_at', { ascending: false }).limit(30),
    admin.from('sms_payment_reminders')
      .select(`id,amount_due,status,attempts,queued_at,sent_at,provider_state,last_error,skip_reason,created_at,updated_at,${providerFields}`)
      .eq('order_id', orderId).order('created_at', { ascending: false }).limit(30),
    admin.from('sample_followups')
      .select(`id,status,attempts,sms_queued_at,due_at,provider_state,last_error,created_at,updated_at,${providerFields}`)
      .eq('order_id', orderId).eq('channel', 'sms').order('created_at', { ascending: false }).limit(30),
  ]);
  if (shipping.error || payments.error || samples.error) return { items: [], unavailable: true };
  return { items: orderSmsHistory(shipping.data || [], payments.data || [], samples.data || []), unavailable: false };
}
