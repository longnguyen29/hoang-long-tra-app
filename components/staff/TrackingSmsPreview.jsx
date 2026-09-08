import {trackingSmsPreview} from '@/lib/tracking-sms-preview';
import styles from './StaffWorkbench.module.css';
export default function TrackingSmsPreview({order}) {
 const preview=trackingSmsPreview(order);
 return <section id="tracking-sms-preview" className={styles.messageSection} aria-label="Xem trước SMS tự động">
  <h3>SMS cập nhật vận đơn · Chỉ xem trước</h3>
  <p>Tự tạo từ dữ liệu đã lưu của đơn. Gửi tự động đang tắt; chưa chuyển tin sang dịch vụ SMS.</p>
  <dl className={styles.orderSummary}>
   <div><dt>Khách hàng</dt><dd>{order.customerName||'Chưa có tên'}</dd></div>
   <div><dt>Số nhận dự kiến</dt><dd>{preview.phone||'Chưa xác định'}</dd></div>
   <div><dt>Liên hệ gốc</dt><dd>{preview.contact||'Chưa có'}</dd></div>
   <div><dt>Mã đã lưu</dt><dd>{preview.code||'Chưa có'} · {preview.carrier}</dd></div>
  </dl>
  {preview.issues.length>0&&<ul role="status">{preview.issues.map(issue=><li key={issue}>{issue}</li>)}</ul>}
  <article className={styles.messagePreview}><header>Nội dung dự kiến gửi</header><textarea readOnly aria-label="Nội dung SMS tự động dự kiến" value={preview.text} placeholder="Lưu hãng và mã vận đơn để xem nội dung."/><footer>{preview.text.length} ký tự · Chưa gửi</footer></article>
 </section>;
}
