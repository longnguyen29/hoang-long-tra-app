"use client";
import {useEffect,useRef,useState} from 'react';
import styles from './TradePipeline.module.css';

export default function PipelineSample({opportunity,supabase,samples,onCreated}) {
 const [suppressed,setSuppressed]=useState(null),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const request=useRef(null);
 const linked=samples.filter(s=>s.opportunity_id===opportunity.id);
 const open=linked.find(s=>['new','sent'].includes(s.status));
 useEffect(()=>{let active=true;supabase.rpc('pipeline_prospect_suppressed',{p_opportunity_id:opportunity.id}).then(({data,error})=>{if(active){setSuppressed(error?null:data);if(error)setMessage('Chưa kiểm tra được trạng thái liên hệ. Tải lại trước khi chuẩn bị mẫu.');}});return()=>{active=false;};},[opportunity.id,supabase]);
 async function save(event){
  event.preventDefault();const form=event.currentTarget;const values=Object.fromEntries(new FormData(form));
  const signature=JSON.stringify(values);if(request.current?.signature!==signature)request.current={signature,id:crypto.randomUUID()};
  setBusy(true);setMessage('');
  try {
   const {data,error}=await supabase.rpc('create_pipeline_sample',{p_opportunity_id:opportunity.id,p_request_id:request.current.id,p_contact_name:values.recipient,p_phone:values.phone,p_address:values.address,p_pack:values.pack,p_note:values.note});
   if(error)throw new Error(error.message.includes('prospect_suppressed')?'Hồ sơ đã được đánh dấu không liên hệ. Không tạo mẫu.':error.message.includes('sample_already_open')?'Đã có yêu cầu mẫu đang xử lý. Tải lại để xem.':'Chưa lưu được yêu cầu mẫu. Kiểm tra thông tin và thử lại.');
   setMessage(`Đã lưu ${data}. Chưa gửi hàng.`);request.current=null;form.reset();await onCreated();
  }catch(error){setMessage(error.message);}finally{setBusy(false);}
 }
 return <section className={styles.notes}>
  <h3>Bộ mẫu</h3>
  {opportunity.discovery_prospect_id&&<a href={`/admin/discovery?prospect=${encodeURIComponent(opportunity.discovery_prospect_id)}`}>Mở hồ sơ & lịch sử trao đổi</a>}
  {suppressed&&<p role="alert">Không liên hệ: dừng chuẩn bị mẫu và liên hệ mới. Lịch sử giao dịch được giữ lại.</p>}
  {open?<p>Yêu cầu {open.id} · {open.pack} · {open.status==='sent'?'Đã gửi':'Chờ chuẩn bị'}. <a href="/admin/orders#relationships">Mở xử lý bộ mẫu</a></p>:<details><summary>Chuẩn bị bộ mẫu</summary>
   <form className={styles.sampleForm} onSubmit={save}>
    <p>Nhập thông tin người nhận đã xác nhận. Lưu yêu cầu không gửi hàng hoặc tin nhắn.</p>
    <label>Người nhận<input name="recipient" required maxLength={150}/></label>
    <label>Điện thoại nhận hàng<input name="phone" type="tel" required maxLength={25}/></label>
    <label>Địa chỉ nhận hàng<textarea name="address" required minLength={5} maxLength={1000}/></label>
    <label>Bộ mẫu / sản phẩm và quy cách<input name="pack" required maxLength={150} placeholder="Ghi rõ loại trà và lượng mẫu đã thống nhất"/></label>
    <label>Ghi chú<textarea name="note" maxLength={4000}/></label>
    <button className={styles.primary} disabled={busy||suppressed!==false}>{busy?'Đang lưu…':'Lưu yêu cầu chuẩn bị mẫu'}</button>
   </form>
  </details>}
  <p role="status">{message}</p>
 </section>;
}
