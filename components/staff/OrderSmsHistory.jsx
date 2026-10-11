import { carrierLabel } from '@/lib/carrier-tracking';
import { smsStatus } from '@/lib/sms-status';
import styles from './StaffWorkbench.module.css';

const dateTime = (value) => value && !Number.isNaN(new Date(value).getTime())
  ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
  : '—';
const money = (value) => new Intl.NumberFormat('vi-VN', {
  style: 'currency', currency: 'VND', maximumFractionDigits: 0,
}).format(Number(value) || 0);

export default function OrderSmsHistory({ history, unavailable, loading }) {
  return <section className={styles.smsHistory} aria-label="Lịch sử SMS">
    <div className={styles.detailSectionTitle}>
      <span><b>Lịch sử SMS</b><small>SMS vận đơn, thanh toán và hỏi phản hồi mẫu của đơn này. Không gồm tin gửi trực tiếp ngoài ứng dụng.</small></span>
    </div>
    {loading ? <p className={styles.eventEmpty}>Đang tải lịch sử SMS…</p>
      : unavailable ? <p className={styles.eventEmpty} role="alert">Chưa tải được lịch sử SMS. Hãy đóng và mở lại đơn để thử lại.</p>
      : history.length ? <ol className={styles.smsHistoryList}>{history.map((item) => {
        const status = smsStatus(item);
        return (
        <li key={item.id}>
          <header><b>{item.kind === 'shipping' ? 'Cập nhật vận đơn' : item.kind === 'sample' ? 'Hỏi phản hồi mẫu sau 7 ngày' : 'Nhắc thanh toán'}</b><span data-status={status.key}>{status.label}</span></header>
          <p>{item.kind === 'shipping'
            ? `${carrierLabel(item.carrier)} · ${item.trackingCode}`
            : item.kind === 'sample' ? `Đến hạn: ${dateTime(item.dueAt)}` : `Số dư tại lúc lập nhắc: ${money(item.amountDue)}`}</p>
          <p>{status.detail}</p>
          <small>Tạo {dateTime(item.createdAt)} · Cập nhật {dateTime(item.updatedAt)} · {item.attempts} lần thử</small>
          {item.queuedAt && <small>Đưa vào hàng đợi: {dateTime(item.queuedAt)}</small>}
          {item.providerState && <small>Trạng thái cổng gửi: {item.providerState}</small>}
          {status.sentAt && <small>Thiết bị báo gửi: {dateTime(status.sentAt)}</small>}
          {status.deliveredAt && <small>Báo cáo đã nhận: {dateTime(status.deliveredAt)}</small>}
          {status.checkedAt && <small>Kiểm tra cổng SMS: {dateTime(status.checkedAt)}</small>}
          {status.checkError && <small className={styles.smsHistoryError}>Chưa kiểm tra được trạng thái mới: {status.checkError}</small>}
          {(item.lastError || item.skipReason) && <small className={styles.smsHistoryError}>Lý do: {item.lastError || item.skipReason}</small>}
        </li>
      );})}</ol> : <p className={styles.eventEmpty}>Chưa có SMS nào được ghi nhận cho đơn này.</p>}
    <p className={styles.smsHistoryNote}>“Đã xếp hàng gửi” chưa xác nhận khách đã nhận. “Đã nhận” là báo cáo giao SMS, không phải xác nhận khách đã đọc.</p>
  </section>;
}
