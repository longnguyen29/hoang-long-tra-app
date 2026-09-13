"use client";
import {useEffect,useState} from 'react';
import {outreachDraft} from '@/lib/prospect-discovery';
import styles from './ProspectDiscovery.module.css';
const names={email:'Email',phone:'Điện thoại',facebook:'Facebook',zalo:'Zalo',whatsapp:'WhatsApp'};
export default function ProspectContacts({prospect,supabase,preview,previewDraft,onPreviewDraft,onChanged}) {
 const [contacts,setContacts]=useState([]),[matches,setMatches]=useState([]),[draft,setDraft]=useState(null),[body,setBody]=useState('');
 const [busy,setBusy]=useState(false),[ready,setReady]=useState(preview),[message,setMessage]=useState(''),[pages,setPages]=useState([]);
 const eligible=prospect.status==='qualified' && prospect.evidence_kind==='page_review';
 async function load() {
  if(preview){setDraft(previewDraft || null);setBody(previewDraft?.body || outreachDraft(prospect));setReady(true);return;}
  const [c,d,m]=await Promise.all([
   supabase.from('discovery_contacts').select('*').eq('prospect_id',prospect.id).order('kind').limit(100),
   eligible ? supabase.from('discovery_outreach_drafts').select('*').eq('prospect_id',prospect.id).maybeSingle() : Promise.resolve({data:null}),
   supabase.rpc('discovery_contact_matches',{p_id:prospect.id})
  ]);
  if(c.error || d.error || m.error)throw new Error('Chưa tải được liên hệ và bản nháp. Thử tải lại trước khi chỉnh sửa.');
  setContacts(c.data || []);setMatches(m.data || []);setDraft(d.data);setBody(d.data?.body || outreachDraft(prospect));setReady(true);
 }
 useEffect(()=>{load().catch(e=>{setReady(false);setMessage(e.message);});},[]);
 async function collect(){
  setBusy(true);setMessage('');
  try {
   const {data:{session}}=await supabase.auth.getSession();
   const response=await fetch('/api/staff/discovery/contacts',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session?.access_token || ''}`},body:JSON.stringify({prospect_id:prospect.id})});
   const result=await response.json();if(!response.ok)throw new Error(result.error || 'Chưa lấy được liên hệ.');
   // Refresh contact data without touching an unsaved draft.
   const {data,error}=await supabase.from('discovery_contacts').select('*').eq('prospect_id',prospect.id).order('kind').limit(100);
   if(error)throw new Error('Đã xử lý nhưng chưa tải lại được liên hệ.');setContacts(data || []);
   const matching=await supabase.rpc('discovery_contact_matches',{p_id:prospect.id});if(!matching.error)setMatches(matching.data || []);
   setPages(result.pages || []);onChanged();
   setMessage(`${result.contacts.length ? `Ghi nhận ${result.contacts.length} liên hệ công khai.` : 'Chưa tìm thấy liên hệ trên các trang đọc được.'} ${(result.errors || []).map(e=>e.reason).filter((v,i,a)=>a.indexOf(v)===i).join(' ')}`);
  }catch(e){setMessage(e.message);}finally{setBusy(false);}
 }
 async function save(event){event.preventDefault();setBusy(true);setMessage('');
  try{
   let result;
   if(preview){result={prospect_id:prospect.id,body:body.trim(),version:(draft?.version || 0)+1};onPreviewDraft(result);}
   else {
    const {data,error}=await supabase.rpc('save_discovery_draft',{p_id:prospect.id,p_version:draft?.version || 0,p_body:body});
    if(error)throw new Error(error.message.includes('stale_draft')?'Có người vừa lưu bản nháp khác. Giữ lại nội dung đang sửa rồi bấm tải bản đã lưu để đối chiếu.':'Chưa lưu được bản nháp. Kiểm tra trạng thái quán và thử lại.');result=data;
   }
   setDraft(result);setBody(result.body);onChanged();setMessage(preview?'Đã lưu bản nháp trong phiên xem thử.':'Đã lưu bản nháp. Chưa có tin nhắn nào được gửi.');
  }catch(e){setMessage(e.message);}finally{setBusy(false);}
 }
 return <>
  <section><h3>Liên hệ công khai của quán</h3><p>Đọc tối đa 3 trang trên website đã lưu. Kết quả cần đối chiếu; chưa xác nhận người phụ trách mua hàng hoặc sự đồng ý nhận tin.</p>
   <button type="button" className={styles.primary} disabled={busy || !ready || preview || prospect.status==='do_not_contact'} onClick={collect}>{busy?'Đang xử lý…':'Lấy liên hệ từ website'}</button>
   {preview && <small>Thu thập website thật dùng trong app quản lý sau khi đăng nhập. Bản xem thử không tạo liên hệ giả.</small>}
   {prospect.status==='do_not_contact' && <p>Đã dừng thu thập và ẩn bản nháp cho quán này.</p>}
   {contacts.map(c=><div className={styles.contact} key={c.id}><strong>{names[c.kind]}: {c.value}</strong><p>{c.evidence}</p><small>Ghi nhận {new Date(c.observed_at).toLocaleDateString('vi-VN')} · Chưa xác nhận đồng ý nhận tin</small>{(c.sources?.length?c.sources:[c.source_url]).map(url=><a key={url} href={url} target="_blank" rel="noopener noreferrer">Đối chiếu nguồn ↗</a>)}</div>)}
   {!contacts.length && <small>Chưa có liên hệ được thu thập. Có thể ghi kênh liên hệ bạn đã kiểm tra ở phần hồ sơ.</small>}
   {pages.length>0 && <small>Đã đọc: {pages.join(' · ')}</small>}
   {matches.length>0 && <aside className={styles.notice}><strong>Có thể liên quan đến hồ sơ khác</strong>{matches.map(m=><p key={`${m.prospect_id}-${m.kind}`}>{m.name} — cùng {names[m.kind].toLowerCase()}. Kiểm tra chi nhánh trước khi chuẩn bị liên hệ.</p>)}<small>Không tự gộp hồ sơ.</small></aside>}
  </section>
  {eligible && <section className={styles.draft}><h3>Lời giới thiệu · bản nháp</h3><p>Chỉnh nội dung cho từng quán. Bản nháp không có nghĩa là quán đã đồng ý nhận tin.</p><form onSubmit={save}><textarea aria-label="Bản nháp lời giới thiệu" value={body} onChange={e=>setBody(e.target.value)} maxLength={4000} required rows={7} disabled={!ready}/><button className={styles.primary} disabled={!ready || busy || !body.trim()}>Lưu bản nháp</button><small>{draft?`Bản lưu số ${draft.version}${body!==draft.body?' · Có thay đổi chưa lưu':''}`:'Nội dung gợi ý · Chưa lưu'}</small></form></section>}
  <p role="status" className={styles.message}>{message}</p>
  <button type="button" disabled={busy} onClick={()=>load().then(()=>setMessage('Đã tải bản đã lưu.')).catch(e=>setMessage(e.message))}>Tải bản đã lưu {eligible?'(thay nội dung đang sửa)':''}</button>
 </>;
}
