"use client";

import { useMemo, useState } from 'react';
import { Trophy, Users } from 'lucide-react';
import { calculateBusinessRankings, formatRankingQuantities } from '@/lib/business-rankings';
import { houseDateKey } from '@/lib/dashboard-calendar';
import styles from './BusinessRankings.module.css';

const money = value => value === null ? 'Chưa ghi giá trị' : new Intl.NumberFormat('vi-VN', {style:'currency',currency:'VND',maximumFractionDigits:0}).format(value);
const dateLabel = value => value ? new Intl.DateTimeFormat('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',dateStyle:'short'}).format(new Date(value)) : '—';

export default function BusinessRankings({orders,loading}) {
  const today = houseDateKey();
  const [period,setPeriod] = useState('all');
  const [month,setMonth] = useState(today.slice(0,7));
  const [year,setYear] = useState(today.slice(0,4));
  const [productSort,setProductSort] = useState('orderCount');
  const [buyerSort,setBuyerSort] = useState('value');
  const result = useMemo(() => calculateBusinessRankings(orders,{month:period==='month'?(month || 'invalid'):undefined,year:period==='year'?Number(year):undefined,productSort,buyerSort,limit:10}),[orders,period,month,year,productSort,buyerSort]);
  return <section className={styles.panel} aria-label="Sản phẩm bán chạy và top người mua">
    <header className={styles.header}><div><p>Xếp hạng bán hàng</p><h2>Khách mua nhiều · Trà bán chạy</h2><span>Top 10 từ đơn hoàn tất, lọc theo ngày tạo đơn ở Việt Nam.</span></div><div className={styles.filters}>
      <label>Khoảng thời gian<select value={period} onChange={event=>setPeriod(event.target.value)}><option value="all">Toàn bộ lịch sử</option><option value="month">Theo tháng</option><option value="year">Theo năm</option></select></label>
      {period==='month'&&<label>Tháng<input type="month" value={month} onChange={event=>setMonth(event.target.value)}/></label>}
      {period==='year'&&<label>Năm<input type="number" min="1900" max="2199" value={year} onChange={event=>setYear(event.target.value)}/></label>}
    </div></header>
    {loading ? <p className={styles.notice} role="status">Đang tải lịch sử đơn…</p> : <>
      <p className={styles.notice}>{result.summary?.orderCount || 0} đơn hoàn tất trong khoảng đã chọn. Giá trị đơn chưa xác nhận tiền đã thu và không thay thế doanh thu kế toán.</p>
      {result.period.invalid && <p className={styles.notice} role="alert">Chọn tháng hoặc năm hợp lệ để xem xếp hạng.</p>}
      {(result.summary.missingIdentityOrderCount > 0 || result.summary.missingLinesOrderCount > 0 || result.summary.excludedInvalidDateOrderCount > 0) && <p className={styles.notice}>{result.summary.missingIdentityOrderCount} đơn thiếu liên hệ để ghép khách · {result.summary.missingLinesOrderCount} đơn thiếu dòng hàng · {result.summary.excludedInvalidDateOrderCount} đơn không có ngày hợp lệ nên không được tính.</p>}
      <div className={styles.columns}>
        <section className={styles.ranking}><header><h3><Trophy size={18} aria-hidden="true"/>Sản phẩm bán chạy</h3><label>Xếp theo<select value={productSort} onChange={event=>setProductSort(event.target.value)}><option value="orderCount">Số đơn mua</option><option value="value">Giá trị trà trong đơn</option></select></label></header>
          {result.products.length ? <ol>{result.products.map((item,index)=><li key={item.key}><span className={styles.rank}>{index+1}</span><div><b>{item.name}</b><small>{item.orderCount} đơn · {formatRankingQuantities(item.quantities)}</small>{item.identityIncomplete&&<small>Chưa có mã sản phẩm · ghép theo tên</small>}{item.missingQuantityCount>0&&<small>{item.missingQuantityCount} dòng chưa rõ số lượng</small>}<span className={styles.value}>{money(item.value)}<small>Giá trị dòng trà đã ghi trước giảm giá/VAT{item.missingValueCount>0?` · ${item.missingValueCount} dòng chưa đủ giá/số lượng`:''}</small></span></div></li>)}</ol> : <p className={styles.empty}>Chưa có dòng trà trong đơn hoàn tất ở khoảng này.</p>}
        </section>
        <section className={styles.ranking}><header><h3><Users size={18} aria-hidden="true"/>Top người mua</h3><label>Xếp theo<select value={buyerSort} onChange={event=>setBuyerSort(event.target.value)}><option value="value">Giá trị đơn hoàn tất</option><option value="orderCount">Số lần mua</option></select></label></header>
          {result.buyers.length ? <ol>{result.buyers.map((item,index)=><li key={item.key}><span className={styles.rank}>{index+1}</span><div><b>{item.name}</b><small>{item.contact || 'Chưa xác định thông tin liên hệ'}</small>{item.identityIncomplete&&<small>Chưa ghép vào hồ sơ khách · giữ riêng đơn này</small>}<small>{item.orderCount} đơn · {formatRankingQuantities(item.quantities)}</small>{item.missingQuantityCount>0&&<small>{item.missingQuantityCount} dòng/đơn chưa rõ số lượng</small>}<span className={styles.value}>{money(item.value)}<small>Giá trị đơn đã ghi{item.missingValueCount>0?` · ${item.missingValueCount} đơn thiếu giá trị`:''}</small></span><small>Ngày tạo đơn hoàn tất gần nhất: {dateLabel(item.lastOrderAt)}</small></div></li>)}</ol> : <p className={styles.empty}>Chưa có người mua trong đơn hoàn tất ở khoảng này.</p>}
        </section>
      </div>
      <p className={styles.basis}>Một loại trà xuất hiện trong nhiều dòng cùng đơn vẫn chỉ tính một đơn mua. Người mua được ghép theo số điện thoại/email hoặc mã khách; đơn thiếu liên hệ được giữ riêng. Kg, gói và cái được trình bày riêng, không cộng chung.</p>
    </>}
  </section>;
}
