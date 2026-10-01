"use client";

import { useEffect,useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import styles from './ProcedureDesk.module.css';

export default function ProcedureOrderLink({order,role}) {
  const [run,setRun]=useState(null),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[template,setTemplate]=useState('domestic_b2b');
  useEffect(()=>{let active=true;setLoading(true);setRun(null);(async()=>{
    try {
      const {data:{session}}=await createClient().auth.getSession();
      if (!session) throw new Error('no_session');
      const response=await fetch(`/api/staff/procedures?orderId=${encodeURIComponent(order.id)}`,{headers:{Authorization:`Bearer ${session.access_token}`}});
      const result=await response.json().catch(()=>({}));
      if (!response.ok) throw new Error('read_failed');
      if (active) {setRun(result.runs?.[0]||null);setError('');}
    } catch {if(active)setError('Chưa tải được tiến độ. Kiểm tra đăng nhập hoặc cấu hình quy trình.');}
    finally {if(active)setLoading(false)}
  })();return()=>{active=false};},[order.id,order.type]);
  if (order.type!=='wholesale'&&!run) return <section className={styles.orderCard} aria-label="Luồng đơn lẻ"><div><small>ORDER FLOW</small><h3>Đơn lẻ</h3></div><p>Đơn này theo luồng rút gọn: xác nhận → đóng gói → giao hàng; không cần Procedure Run B2B.</p>{loading&&<p>Đang kiểm tra hồ sơ cũ…</p>}{error&&<p role="alert">{error}</p>}</section>;
  const create=async()=>{setBusy(true);setError('');try{
    const {data:{session}}=await createClient().auth.getSession();
    const response=await fetch('/api/staff/procedures',{method:'POST',headers:{Authorization:`Bearer ${session?.access_token}`,'Content-Type':'application/json'},body:JSON.stringify({orderId:order.id,templateKey:template})});
    const result=await response.json();
    if (!response.ok) throw new Error(result.error);
    window.location.href=`/admin/procedures/${result.id}`;
  }catch{setError('Chưa mở được quy trình. Xác nhận đơn sỉ và thử lại.');setBusy(false)}};
  return <section className={styles.orderCard} aria-label="Tiến độ vận hành">
    <div><small>OPERATIONAL PROGRESS</small><h3>Quy trình giao đơn</h3></div>
    {loading?<p>Đang kiểm tra…</p>:run?<>
      {run.status==='waived'?<p><b>Đã bỏ qua cho đơn này.</b> {run.waiver_reason} · Các bước cũ và lịch sử vẫn được giữ. {run.stop&&<strong className={styles.stop}>STOP — vẫn phải xử lý trước khi xuất hàng</strong>}</p>:<>
        <p><b>{run.progress.percent}%</b> hoàn tất · {run.next_action||'Kiểm tra việc kế tiếp'}{run.stop&&<strong className={styles.stop}>STOP — KHÔNG XẾP / XUẤT HÀNG</strong>}</p>
        <div className={styles.miniStages}>{run.stages?.map(stage=><span key={stage.key} data-done={stage.done===stage.total}>{stage.label} {stage.done===stage.total?'✓':`${stage.done}/${stage.total}`}</span>)}</div>
      </>}
      <Link className={styles.primary} href={`/admin/procedures/${run.id}`}>Mở Procedure Run →</Link>
    </>:['admin','manager'].includes(role)?order.stage==='new_order'?<p>Xác nhận đơn trước khi bắt đầu quy trình.</p>:<div className={styles.startRow}><select aria-label="Mẫu quy trình" value={template} onChange={event=>setTemplate(event.target.value)}><option value="domestic_b2b">Giao sỉ trong nước</option><option value="export_b2b">Xuất khẩu B2B</option></select><button className={styles.primary} onClick={create} disabled={busy}>{busy?'Đang tạo…':'Bắt đầu quy trình'}</button></div>:<p>Quản lý sẽ mở quy trình khi đơn được xác nhận.</p>}
    {error&&<p role="alert">{error}</p>}
  </section>;
}
