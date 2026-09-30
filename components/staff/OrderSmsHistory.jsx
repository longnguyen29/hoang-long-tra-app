import { carrierLabel } from '@/lib/carrier-tracking';
import styles from './StaffWorkbench.module.css';

const statusLabels = {
  pending: 'Chờ gửi',
  sending: 'Đang xử lý',
  queued: 'Đã chuyển tới điện thoại gửi',
  sent: 'Thiết bị báo đã gửi',
  failed: 'Gửi lỗi',
  needs_phone: 'Thiếu số điện thoại',
  skipped: 'Không gửi',
};
const dateTime = (value) => value && !Number.isNaN(new Date(value).getTime())
  ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
  : '—';
const money = (value) => new Intl.NumberFormat('vi-VN', {
  style: 'currency', currency: 'VND', maximumFractionDigits: 0,
}).format(Number(value) || 0);

export default function OrderSmsHistory({ history, unavailable, loading }) {
  return <section className={styles.smsHistory} aria-label="Lịch sử SMS tự động">
    <div className={styles.detailSectionTitle}>
      <span><b>Lịch sử SMS tự động</b><small>Ghi nhận riêng cho đơn này; không gồm tin bạn tự gửi trong ứng dụng SMS.</small></span>
    </div>
    {loading ? <p className={styles.eventEmpty}>Đang tải lịch sử SMS…</p>
      : unavailable ? <p className={styles.eventEmpty} role="alert">Chưa tải được lịch sử SMS. Hãy đóng và mở lại đơn để thử lại.</p>
      : history.length ? <ol className={styles.smsHistoryList}>{history.map((item) =>
        <li key={item.id}>
          <header><b>{item.kind === 'shipping' ? 'Cập nhật vận đơn' : 'Nhắc thanh toán'}</b><span data-status={item.status}>{statusLabels[item.status] || item.status}</span></header>
          <p>{item.kind === 'shipping'
            ? `${carrierLabel(item.carrier)} · ${item.trackingCode}`
            : `Số dư tại lúc lập nhắc: ${money(item.amountDue)}`}</p>
          <small>Tạo {dateTime(item.createdAt)} · Cập nhật {dateTime(item.updatedAt)} · {item.attempts} lần thử</small>
          {item.queuedAt && <small>Đưa vào hàng đợi: {dateTime(item.queuedAt)}</small>}
          {item.providerState && <small>Trạng thái cổng gửi: {item.providerState}</small>}
          {(item.lastError || item.skipReason) && <small className={styles.smsHistoryError}>Lý do: {item.lastError || item.skipReason}</small>}
        </li>
      )}</ol> : <p className={styles.eventEmpty}>Chưa có SMS tự động nào được ghi nhận cho đơn này.</p>}
    <p className={styles.smsHistoryNote}>“Đã chuyển tới điện thoại gửi” chưa xác nhận SMS đã đến máy khách.</p>
  </section>;
}
