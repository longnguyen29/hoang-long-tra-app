'use client';
import {useState} from 'react';
import {retailPartnerShareHref} from '@/lib/retail-partner';
import styles from './PartnerSalesKit.module.css';
export default function PartnerRetailShare({salesPage}){
 const href=retailPartnerShareHref(salesPage);const[message,setMessage]=useState('');
 async function copy(){try{await navigator.clipboard.writeText(new URL(href,window.location.origin).href);setMessage('Đã sao chép liên kết bán lẻ.');}catch{setMessage('Mở trang bán lẻ và sao chép địa chỉ trên trình duyệt.');}}
 return <section className={styles.panel}><header className={styles.header}><p className={styles.eyebrow}>B2C · Giới thiệu khách mua trà</p><h2>Danh mục bán lẻ của bạn</h2><p>Chia sẻ trang mang tên và liên hệ của bạn. Khách chọn trà trong danh mục Hoàng Long, đồng ý chia sẻ thông tin; Nhà kiểm tra nguồn trước khi ghi nhận đơn cho bạn.</p></header>
  {href?<><div className={styles.owner}><span>Người giới thiệu</span><strong>{salesPage.display_name}</strong><span>{salesPage.phone}</span></div><div className={styles.actions}><a className={styles.primary} href={href} target="_blank" rel="noopener noreferrer">Mở trang bán lẻ</a><button type="button" onClick={copy}>Sao chép liên kết gửi khách</button></div>{message&&<p className={styles.feedback} role="status">{message}</p>}</>:<p className={styles.warning}>Cần trang đối tác đã được quản trị duyệt và xuất bản. Liên hệ Nhà để hoàn tất trước khi gửi liên kết cho khách.</p>}
  <div className={styles.notice}><p>Đơn B2C dùng giá, tồn kho và ưu đãi hiện có. Liên kết giới thiệu không tự tạo quyền hưởng hoa hồng; đơn hủy, chưa thu đủ tiền hoặc chưa đối soát chi phí chưa phải khoản được nhận.</p></div>
 </section>;
}
