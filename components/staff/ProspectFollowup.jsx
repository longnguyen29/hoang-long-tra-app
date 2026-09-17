"use client";
import {useEffect,useRef,useState} from 'react';
import styles from './ProspectDiscovery.module.css';
const kinds={note:'Ghi chú',call:'Cuộc gọi',email:'Email',message:'Tin nhắn',meeting:'Gặp mặt',sample:'Mẫu thử',feedback:'Phản hồi'};

export default function ProspectFollowup({prospect,supabase,preview,onUpdated,previewActivities=[],onPreviewActivities}) {
 const [activities,setActivities]=useState(previewActivities),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const retry=useRef(null);
 useEffect(()=>{if(!preview)supabase.from('discovery_activities').select('*').eq('prospect_id',prospect.id).order('occurred_at',{ascending:false}).limit(100).then(({data,error})=>{if(error)setMessage('Chưa tải được lịch sử. Thử mở lại hồ sơ.');else setActivities(data||[]);});},[prospect.id,supabase,preview]);
 async function saveFollowup(event){
  event.preventDefault();const form=new FormData(event.currentTarget);setBusy(true);setMessage('');
  const patch={priority:form.get('priority')||null,relevance:String(form.get('relevance')).trim(),next_action:String(form.get('next_action')).trim(),next_action_on:form.get('next_action_on')||null};
  try{
   if(patch.next_action_on&&!patch.next_action)throw new Error('Nhập việc cần làm khi đặt ngày hẹn.');
   let updated;
   if(preview)updated={...prospect,...patch,version:prospect.version+1};
   else {const {data,error}=await supabase.rpc('update_discovery_followup',{p_id:prospect.id,p_version:prospect.version,p_priority:patch.priority,p_relevance:patch.relevance,p_next_action:patch.next_action,p_next_action_on:patch.next_action_on});if(error)throw new Error(error.message.includes('stale_prospect')?'Hồ sơ đã thay đổi. Giữ nội dung đang nhập rồi tải lại danh sách để đối chiếu.':'Chưa lưu được việc tiếp theo. Nội dung đang nhập được giữ lại.');updated=data;}
   onUpdated(updated);setMessage('Đã lưu ưu tiên và việc tiếp theo.');
  }catch(error){setMessage(error.message);}finally{setBusy(false);}
 }
 async function append(event){
  event.preventDefault();const element=event.currentTarget,form=new FormData(element);setBusy(true);setMessage('');
  const body=String(form.get('body')).trim(),kind=form.get('kind');
  if(!retry.current||retry.current.body!==body||retry.current.kind!==kind)retry.current={id:crypto.randomUUID(),body,kind,occurred_at:new Date().toISOString()};
  const item={...retry.current,prospect_id:prospect.id};
  try{
   let saved=item;
   if(!preview){const {data,error}=await supabase.rpc('append_discovery_activity',{p_id:prospect.id,p_activity_id:item.id,p_kind:item.kind,p_body:item.body,p_occurred_at:item.occurred_at});if(error)throw new Error('Chưa lưu được lịch sử. Thử lại không tạo bản trùng.');saved=data;}
   const next=[saved,...activities.filter(a=>a.id!==saved.id)];setActivities(next);if(preview)onPreviewActivities(next);retry.current=null;element.reset();setMessage('Đã ghi nhận. Không có tin nhắn nào được gửi.');
  }catch(error){setMessage(error.message);}finally{setBusy(false);}
 }
 return <section>
  <form className={styles.review} onSubmit={saveFollowup}><h3>Ưu tiên & việc tiếp theo</h3>
   <label>Ưu tiên<select name="priority" defaultValue={prospect.priority||''}><option value="">Chưa đánh giá</option><option value="A">A · Ưu tiên xử lý</option><option value="B">B · Tiếp tục tìm hiểu</option><option value="C">C · Theo dõi sau</option></select></label>
   <label>Vì sao khách hàng này phù hợp?<textarea name="relevance" defaultValue={prospect.relevance||''} maxLength={1500} placeholder="Ghi căn cứ bạn đã thấy; để trống nếu chưa biết."/></label>
   <label>Việc tiếp theo<input name="next_action" defaultValue={prospect.next_action||''} maxLength={300} placeholder="Ví dụ: hỏi phản hồi mẫu đã gửi"/></label>
   <label>Ngày thực hiện<input type="date" name="next_action_on" defaultValue={prospect.next_action_on||''}/></label>
   {prospect.status==='do_not_contact'&&<p>Không liên hệ. Chỉ ghi nhận công việc nội bộ và lịch sử.</p>}
   <button className={styles.primary} disabled={busy}>Lưu việc tiếp theo</button>
  </form>
  <form className={styles.review} onSubmit={append}><h3>Ghi lại trao đổi</h3><p>Ghi việc đã xảy ra. Ứng dụng không gọi điện hoặc gửi tin thay bạn.</p>
   <label>Loại ghi nhận<select name="kind">{Object.entries(kinds).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
   <label>Nội dung trao đổi<textarea name="body" required maxLength={4000} placeholder="Đã trao đổi gì, khách phản hồi thế nào, điều gì còn chưa biết?"/></label>
   <button className={styles.primary} disabled={busy}>Ghi vào lịch sử</button>
  </form>
  <p role="status">{message}</p><h3>Lịch sử gần đây</h3>
  {activities.map(item=><article className={styles.contact} key={item.id}><strong>{kinds[item.kind]||item.kind}</strong><small>{new Date(item.occurred_at).toLocaleString('vi-VN')}</small><p style={{whiteSpace:'pre-wrap'}}>{item.body}</p></article>)}
  {!activities.length&&<p>Chưa có trao đổi được ghi nhận.</p>}
 </section>;
}
