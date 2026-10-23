"use client";

import { useId, useState } from 'react';
import { Printer } from 'lucide-react';
import { buildOrderInvoiceHtml } from '@/lib/order-invoice';
import styles from './InvoiceExport.module.css';

export default function InvoiceExport({ order, locale = 'vi', disabled = false, payment, receivable }) {
  const [showOriginalPrice, setShowOriginalPrice] = useState(false);
  const [error, setError] = useState('');
  const [preparing, setPreparing] = useState(false);
  const helpId = useId();
  const en = locale === 'en';
  const print = async () => {
    if (disabled || preparing || !order) return;
    setError('');
    const win = window.open('', '_blank', 'width=850,height=950');
    if (!win) {
      setError(en ? 'Allow pop-ups for this website, then try again.' : 'Cho phép cửa sổ bật lên cho website rồi thử lại.');
      return;
    }
    setPreparing(true);
    win.opener = null;
    try {
      win.document.write(buildOrderInvoiceHtml(order, { showOriginalPrice, locale, payment, receivable }));
      win.document.close();
      const images = Array.from(win.document.images);
      // A fixed short delay can print an empty QR. Wait for the image or show
      // the explicit bank-details fallback, with a bounded network wait.
      await Promise.all(images.map(img => img.complete ? Promise.resolve() : new Promise(resolve => {
        const finish = () => { clearTimeout(timer); img.removeEventListener('load', finish); img.removeEventListener('error', finish); resolve(); };
        const timer = setTimeout(finish, 8000);
        img.addEventListener('load', finish, { once: true });
        img.addEventListener('error', finish, { once: true });
      })));
      if (win.closed) return;
      if (images.some(img => !img.complete || !img.naturalWidth)) {
        images.filter(img => !img.complete || !img.naturalWidth).forEach(img => { img.hidden = true; });
        const fallback = win.document.getElementById('invoice-qr-fallback');
        if (fallback) fallback.hidden = false;
      }
      win.focus();
      win.print();
    } catch {
      setError(en ? 'Could not prepare the invoice. Close the print tab and try again.' : 'Chưa chuẩn bị được hóa đơn. Đóng tab bản in rồi thử lại.');
    } finally {
      setPreparing(false);
    }
  };
  return <details className={styles.export}>
    <summary><Printer size={16} aria-hidden="true"/>{en ? 'Export invoice' : 'Xuất hóa đơn'}</summary>
    <div className={styles.options}>
      <label><input type="checkbox" checked={showOriginalPrice} disabled={disabled} aria-describedby={helpId} onChange={event => setShowOriginalPrice(event.target.checked)}/><span>{en ? 'Show original price' : 'Hiện giá gốc'}</span></label>
      <p id={helpId}>{en ? 'The saved price before a per-order price adjustment. Missing originals display “—”. The payable total stays unchanged.' : 'Giá trước khi sửa giá riêng cho đơn, đã được lưu. Chưa lưu sẽ hiện “—”. Tổng thanh toán giữ nguyên.'}</p>
      <p>{en ? 'The invoice includes a payment QR. Recorded payments are deducted when the order has a payment ledger.' : 'Hóa đơn kèm QR thanh toán; trừ khoản đã ghi nhận nếu đơn có theo dõi thanh toán.'}</p>
      <button type="button" disabled={disabled || preparing || !order} onClick={print}><Printer size={16} aria-hidden="true"/>{preparing ? (en ? 'Preparing QR…' : 'Đang chuẩn bị QR…') : (en ? 'Print / save PDF' : 'In / lưu PDF')}</button>
      {error && <p className={styles.error} role="alert">{error}</p>}
    </div>
  </details>;
}
