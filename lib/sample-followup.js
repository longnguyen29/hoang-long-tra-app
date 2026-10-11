// Shared, public-safe copy/formatting. Sending and queue claims stay server-side.
export const SAMPLE_FOLLOWUP_DAYS = 7;
export const SAMPLE_FOLLOWUP_RETRY_MS = 3 * 60 * 60_000;

export function sampleFollowupPhone(value) {
  const compact = String(value || '').trim().replace(/[\s().-]/g, '').replace(/^0084/, '84');
  if (/^0[35789]\d{8}$/.test(compact)) return `+84${compact.slice(1)}`;
  if (/^\+?84[35789]\d{8}$/.test(compact)) return `+${compact.replace(/^\+/, '')}`;
  return '';
}

export function buildSampleFollowupMessage() {
  return 'Hoàng Long hỏi thăm bộ mẫu: anh/chị đã thử trà chưa, hương vị có hợp công thức quán không? Cần hỗ trợ hoặc chưa nhận mẫu, trả lời SMS này hoặc nhắn Zalo zalo.me/0903333841.';
}

export function sampleFollowupSendWindow(now = new Date()) {
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', hourCycle: 'h23' }).format(new Date(now)));
  return hour >= 9 && hour < 18;
}

export function sampleFollowupTelegramText(record) {
  const customer = String(record.customer_name || 'Khách nhận mẫu').replace(/[\r\n]/g, ' ').slice(0, 100);
  const receipt = record.last_error === 'receipt_unconfirmed' || record.last_error === 'submission_uncertain'
    ? 'Chưa xác nhận kết quả — kiểm tra điện thoại gửi trước khi liên hệ lại.'
    : record.channel === 'telegram' ? 'Đến hạn hỏi phản hồi. Chế độ nhắc nội bộ, chưa gửi SMS.'
    : record.status === 'queued' ? 'SMS đã chuyển cho điện thoại gửi; chưa xác nhận khách đã nhận.'
    : record.status === 'failed' ? `SMS chưa gửi được (lần ${record.attempts || 0}/3). Kiểm tra cấu hình hoặc số điện thoại.`
    : 'Đến hạn hỏi phản hồi; SMS đang chờ xử lý.';
  return `🍃 Follow-up mẫu sau 7 ngày\n${customer}\nMã: ${String(record.source_id || '').slice(0, 100)}\n${receipt}\nMở: https://www.hoanglongtra.com/admin/orders#sample-followups`;
}
