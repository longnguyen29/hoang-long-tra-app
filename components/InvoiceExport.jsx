"use client";

import { useId, useState } from 'react';
import { Printer } from 'lucide-react';
import { buildOrderInvoiceHtml } from '@/lib/order-invoice';
import styles from './InvoiceExport.module.css';

export default function InvoiceExport({ order, locale = 'vi', disabled = false }) {
  const [showOriginalPrice, setShowOriginalPrice] = useState(false);
  const [error, setError] = useState('');
  const helpId = useId();
  const en = locale === 'en';
  const print = () => {
    if (disabled || !order) return;
    setError('');
    const win = window.open('', '_blank', 'width=850,height=950');
    if (!win) {
      setError(en ? 'Allow pop-ups for this website, then try again.' : 'Cho phép cửa sổ bật lên cho website rồi thử lại.');
      return;
    }
    win.opener = null;
    win.document.write(buildOrderInvoiceHtml(order, { showOriginalPrice, locale }));
    win.document.close();
    win.focus();
    setTimeout(() => { if (!win.closed) win.print(); }, 350);
  };
  return <details className={styles.export}>
    <summary><Printer size={16} aria-hidden="true"/>{en ? 'Export invoice' : 'Xuất hóa đơn'}</summary>
    <div className={styles.options}>
      <label><input type="checkbox" checked={showOriginalPrice} disabled={disabled} aria-describedby={helpId} onChange={event => setShowOriginalPrice(event.target.checked)}/><span>{en ? 'Show original price' : 'Hiện giá gốc'}</span></label>
      <p id={helpId}>{en ? 'The pre-discount sale price saved with the order. Missing originals display “—”. The payable total stays unchanged.' : 'Giá bán trước giảm giá đã lưu trong đơn. Chưa lưu sẽ hiện “—”. Tổng thanh toán giữ nguyên.'}</p>
      <button type="button" disabled={disabled || !order} onClick={print}><Printer size={16} aria-hidden="true"/>{en ? 'Print / save PDF' : 'In / lưu PDF'}</button>
      {error && <p className={styles.error} role="alert">{error}</p>}
    </div>
  </details>;
}
