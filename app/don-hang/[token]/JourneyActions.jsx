'use client';

import { useState } from 'react';
import { Copy, MessageCircle } from 'lucide-react';
import styles from './page.module.css';

export function CopyTrackingCode({ code }) {
  const [message, setMessage] = useState('');
  return <div className={styles.copyControl}>
    <button type="button" onClick={async () => {
      try { await navigator.clipboard.writeText(code); setMessage('Đã sao chép mã vận đơn'); }
      catch { setMessage('Chọn mã vận đơn phía trên để sao chép thủ công.'); }
    }}><Copy aria-hidden="true"/>Sao chép mã</button>
    <span role="status">{message}</span>
  </div>;
}

export function ReorderRequest({ reference, lines }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const text = `Tôi muốn đặt lại đơn ${reference}:\n${lines.map(line => `${line.name}: ${line.qty} ${line.unit === 'pcs' ? 'gói' : line.unit}`).join('\n')}\nNhờ Hoàng Long xác nhận giá và lịch giao mới. Tôi sẽ bổ sung số lượng cần thay đổi.`;
  return <section className={styles.reorder} aria-label="Đặt lại trà">
    <p className={styles.label}>Hẹn lần trà tiếp theo</p>
    <h2>Cần đặt thêm trà?</h2>
    <p>Dùng lại danh sách trà của đơn này, rồi chốt số lượng, giá và lịch giao với Nhà.</p>
    <button type="button" aria-expanded={open} onClick={() => setOpen(!open)}>Đặt lại đơn này</button>
    {open && <div className={styles.reorderDraft}>
      <label htmlFor="reorder-request">Nội dung yêu cầu đặt lại</label>
      <textarea id="reorder-request" readOnly value={text} rows={5}/>
      <button type="button" onClick={async () => {
        try { await navigator.clipboard.writeText(text); setMessage('Đã sao chép. Mở Zalo và dán nội dung để gửi cho Nhà.'); }
        catch { setMessage('Bạn có thể chọn và sao chép nội dung phía trên.'); }
      }}><Copy aria-hidden="true"/>Sao chép yêu cầu</button>
      <a href="https://zalo.me/0903333841" target="_blank" rel="noreferrer"><MessageCircle aria-hidden="true"/>Gửi yêu cầu qua Zalo</a>
      <p role="status">{message}</p>
      <small>Chưa tạo đơn mới hay yêu cầu thanh toán. Nhà sẽ xác nhận với bạn trước.</small>
    </div>}
  </section>;
}
