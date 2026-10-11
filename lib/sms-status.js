// Shared receipt presentation; API acceptance is not proof of SMS delivery.
export function smsStatus(row = {}) {
  const state = String(row.provider_state || row.providerState || '').toLowerCase();
  const states = row.provider_states || row.providerStates || {};
  const hasProof = (name) => Object.keys(states).some(key => key.toLowerCase() === name);
  const timestamp = (name) => Object.entries(states).find(([key]) => key.toLowerCase() === name)?.[1] || null;
  const sentAt = row.provider_sent_at || row.providerSentAt || timestamp('sent') || null;
  const deliveredAt = row.provider_delivered_at || row.providerDeliveredAt || timestamp('delivered') || null;
  const checkedAt = row.provider_checked_at || row.providerCheckedAt || null;
  const checkError = row.provider_check_error || row.providerCheckError || '';
  const error = row.last_error || row.lastError || '';
  let key = row.status || 'pending';
  if (deliveredAt || state === 'delivered' || hasProof('delivered')) key = 'delivered';
  else if (sentAt || state === 'sent' || hasProof('sent')) key = 'sent';
  else if (['submission_uncertain', 'receipt_unconfirmed'].includes(error) || key === 'uncertain') key = 'uncertain';
  else if (['failed', 'cancelled', 'canceled'].includes(state)) key = 'failed';
  else if (['processed', 'cancelling', 'canceling'].includes(state)) key = 'processing';
  else if (state === 'pending' || row.sms_queued_at || row.smsQueuedAt) key = 'queued';
  else if (key === 'sending') key = 'processing';
  const labels = {
    pending: 'Chờ gửi', processing: 'Android đang xử lý', queued: 'Đã xếp hàng gửi',
    sent: 'Thiết bị báo đã gửi', delivered: 'Nhà mạng báo đã nhận', failed: 'Gửi lỗi',
    uncertain: 'Chưa xác định kết quả', needs_phone: 'Cần sửa số điện thoại', skipped: 'Không gửi',
  };
  let detail = {
    pending: 'Chưa có xác nhận gửi từ điện thoại.',
    processing: 'Yêu cầu đang được xử lý; chưa xác nhận khách đã nhận.',
    queued: 'Cổng SMS đã nhận yêu cầu; chưa xác nhận điện thoại đã gửi.',
    sent: 'Thiết bị đã báo gửi tới nhà mạng; chưa có xác nhận máy khách nhận.',
    delivered: 'Đã có báo cáo giao SMS từ nhà mạng; không có nghĩa khách đã đọc.',
    failed: 'Cần xem lỗi và kiểm tra lại trạng thái trước khi thử gửi tiếp.',
    uncertain: 'Kết quả chưa rõ. Kiểm tra cổng SMS hoặc điện thoại gửi trước khi gửi lại.',
    needs_phone: 'Đơn chưa có số điện thoại Việt Nam hợp lệ.',
    skipped: 'Tin này không được gửi theo điều kiện hiện tại.',
  }[key] || 'Chưa có xác nhận giao SMS.';
  if (['failed', 'cancelled', 'canceled'].includes(state) && ['sent', 'delivered'].includes(key)) {
    detail += ' Cổng SMS có báo lỗi sau đó; lịch sử xác nhận trước vẫn được giữ.';
  }
  return { key, label: labels[key] || 'Chưa xác định kết quả', detail, sentAt, deliveredAt, checkedAt, checkError };
}
