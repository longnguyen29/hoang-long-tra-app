import {trackingSmsPreview} from '@/lib/tracking-sms-preview';
import styles from './StaffWorkbench.module.css';
export default function TrackingSmsPreview({order,trackingSms}) {
 const preview=trackingSmsPreview(order);
 const current=trackingSms?.shipping_carrier===order.shippingCarrier&&trackingSms?.tracking_code===order.trackingCode?trackingSms:null;
 const status=current?.status==='queued'?'Đã đưa SMS vào hàng đợi gửi trên điện thoại.':current?.status==='needs_phone'?'Chưa gửi: số điện thoại chưa rõ ràng.':current?.status==='failed'?(current.attempts>=3?'Chưa gửi được sau 3 lần; cần kiểm tra dịch vụ SMS.':'Chưa gửi được; hệ thống sẽ tự thử lại.'):current?.status==='sending'?'Đang gửi SMS…':current?.status==='pending'?'Đang chờ gửi SMS…':order.stage==='shipping'?'Sẽ tự gửi khi đã lưu đủ hãng và mã vận đơn hợp lệ.':'Sẽ gửi khi đơn đến bước Giao hàng và đã có hãng, mã vận đơn.';
 return <section id="tracking-sms-preview" className={styles.messageSection} aria-label="Xem trước SMS tự động">
  <h3>SMS cập nhật vận đơn</h3>
  <p role="status">{status}</p>
  <dl className={styles.orderSummary}>
   <div><dt>Khách hàng</dt><dd>{order.customerName||'Chưa có tên'}</dd></div>
   <div><dt>Số nhận dự kiến</dt><dd>{preview.phone||'Chưa xác định'}</dd></div>
   <div><dt>Liên hệ gốc</dt><dd>{preview.contact||'Chưa có'}</dd></div>
   <div><dt>Mã đã lưu</dt><dd>{preview.code||'Chưa có'} · {preview.carrier}</dd></div>
  </dl>
  {preview.issues.length>0&&<ul role="status">{preview.issues.map(issue=><li key={issue}>{issue}</li>)}</ul>}
  <article className={styles.messagePreview}><header>Nội dung gửi cho khách</header><textarea readOnly aria-label="Nội dung SMS tự động" value={preview.text} placeholder="Lưu hãng và mã vận đơn để xem nội dung."/><footer>{preview.text.length} ký tự · {current?.status==='queued'?'Đã xếp hàng gửi':'Xem trước'}</footer></article>
 </section>;
}
