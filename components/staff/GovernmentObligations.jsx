"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bell, Landmark, PencilLine, Plus, X } from "lucide-react";
import { houseDateKey, governmentObligationDates, subtractCalendarMonth, calendarMonthEnd } from "@/lib/dashboard-calendar";
import { GOVERNMENT_OBLIGATION_TEMPLATES } from "@/lib/government-obligation-templates";
import { useDialogFocus } from "./useDialogFocus";
import styles from "./GovernmentObligations.module.css";

const dateLabel = value => value ? new Intl.DateTimeFormat("vi-VN",{day:"numeric",month:"numeric",year:"numeric"}).format(new Date(`${value}T12:00:00Z`)) : "Chưa xác nhận hạn";
const frequencies = {0:"Một lần / chưa chọn kỳ lặp",1:"Hằng tháng",3:"Hằng quý",6:"Mỗi 6 tháng",12:"Hằng năm"};
const categories = {tax:"Thuế",annual:"Báo cáo & quyết toán năm",insurance:"BHXH",license:"Giấy phép / hồ sơ",correspondence:"Công văn / kiểm tra",other:"Khác"};
const blank = () => ({id:null,title:"",authority:"",category:"other",notes:"",source_url:"",first_due_on:"",repeat_months:0,due_rule:"day_of_month",deadline_confirmed:false,notify_telegram:true,active:true,version:null});

export default function GovernmentObligations({supabase,plans=[],onChanged}) {
  const [items,setItems]=useState([]);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const [draft,setDraft]=useState(null);
  const dialog=useRef(null);
  const today=houseDateKey();
  const close=()=>{if(!saving)setDraft(null);};
  useDialogFocus(dialog,Boolean(draft),close);
  const load=useCallback(async()=>{
    setLoading(true);
    try {
      const response=await supabase.from("government_obligations").select("*").order("created_at",{ascending:true});
      if(response.error)throw response.error;
      setItems(response.data||[]);setError("");
    } catch {setError("Chưa tải được danh mục nghĩa vụ. Cần cập nhật database rồi tải lại trang.");}
    finally{setLoading(false);}
  },[supabase]);
  useEffect(()=>{load();},[load]);
  const preview=useMemo(()=>{
    if(!draft?.first_due_on)return [];
    const year=Number(draft.first_due_on.slice(0,4));
    const config={...draft,repeat_months:Number(draft.repeat_months),active:true,deadline_confirmed:true};
    return [...governmentObligationDates(config,year),...governmentObligationDates(config,year+1),...governmentObligationDates(config,year+2)].slice(0,3);
  },[draft]);
  const edit=item=>{setError("");setNotice("");setDraft({...blank(),...item,first_due_on:item?.first_due_on||""});};
  async function save(event){
    event.preventDefault();
    if(!draft.title.trim()||saving)return;
    if(draft.deadline_confirmed&&!draft.first_due_on){setError("Nhập hạn kỳ đầu trước khi xác nhận hạn.");return;}
    if(draft.source_url){try{if(new URL(draft.source_url).protocol!=="https:")throw new Error();}catch{setError("Link nguồn cần bắt đầu bằng https://.");return;}}
    setSaving(true);setError("");
    try{
      const result=await supabase.rpc("save_government_obligation",{
        p_id:draft.id,p_title:draft.title.trim(),p_authority:draft.authority.trim(),p_category:draft.category,
        p_notes:draft.notes.trim(),p_source_url:draft.source_url.trim(),p_first_due_on:draft.first_due_on||null,
        p_repeat_months:Number(draft.repeat_months),p_due_rule:draft.due_rule,p_deadline_confirmed:draft.deadline_confirmed,
        p_notify_telegram:draft.notify_telegram,p_active:draft.active,p_expected_version:draft.version,
      });
      if(result.error)throw result.error;
      setDraft(null);await load();await onChanged?.();
      setNotice(draft.deadline_confirmed&&draft.first_due_on&&draft.active ? "Đã lưu. Các kỳ được đưa vào lịch; Telegram nhắc trước 1 tháng nếu bật." : "Đã lưu danh mục. Chưa tạo hạn hoặc gửi nhắc cho mục chưa được xác nhận.");
    }catch(failure){setError(String(failure.message||"").includes("obligation_conflict") ? "Mục này vừa được sửa ở nơi khác. Giữ lại ghi chú, đóng form và tải lại trước khi sửa tiếp." : "Chưa lưu được nghĩa vụ. Nội dung vẫn giữ trong form; kiểm tra kết nối rồi thử lại.");}
    finally{setSaving(false);}
  }
  return <section className={styles.section} aria-label="Nghĩa vụ với cơ quan nhà nước">
    <header className={styles.header}><div><span><Landmark size={18}/> Hồ sơ & hạn cần nhớ</span><h3>Nghĩa vụ với cơ quan nhà nước</h3><p>Danh mục gợi ý cần được xác nhận theo hồ sơ Hoàng Long. Hạn đã xác nhận xuất hiện trong lịch bên dưới.</p></div><button type="button" onClick={()=>edit(blank())}><Plus size={17}/> Thêm nghĩa vụ</button></header>
    {error&&!draft&&<p className={styles.error} role="alert">{error} <button type="button" onClick={load}>Tải lại</button></p>}
    {notice&&<p className={styles.notice} role="status">{notice}</p>}
    {loading?<p className={styles.quiet}>Đang tải danh mục…</p>:items.length?<div className={styles.rows}>{items.map(item=>{
      const open=plans.filter(plan=>plan.obligation_id===item.id&&plan.status==="pending").sort((a,b)=>a.event_on.localeCompare(b.event_on));
      const overdue=open.filter(plan=>plan.event_on<today);
      const upcoming=open.find(plan=>plan.event_on>=today);
      return <article key={item.id}><div className={styles.details}><div className={styles.meta}><span>{categories[item.category]||item.category}</span><strong data-warning={!item.deadline_confirmed||!item.active}>{!item.active?"Tạm dừng kỳ mới":!item.deadline_confirmed||!item.first_due_on?"Cần xác nhận áp dụng / hạn":"Đã xác nhận hạn"}</strong></div><h4>{item.title}</h4><p>{item.authority||"Chưa ghi cơ quan / đầu mối"} · {frequencies[item.repeat_months]}</p>{overdue.length>0&&<p className={styles.overdue}>{overdue.length} kỳ quá hạn chưa đánh dấu xong · sớm nhất {dateLabel(overdue[0].event_on)}</p>}{upcoming&&<p>Sắp tới: <b>{dateLabel(upcoming.event_on)}</b>{item.notify_telegram&&<small><Bell size={14}/> Nhắc từ {dateLabel(subtractCalendarMonth(upcoming.event_on))}</small>}</p>}{item.source_url&&<a href={item.source_url} target="_blank" rel="noopener noreferrer">Xem nguồn / hướng dẫn ↗</a>}</div><button type="button" onClick={()=>edit(item)}><PencilLine size={16}/> {item.deadline_confirmed?"Sửa":"Xác nhận / đặt hạn"}</button></article>;
    })}</div>:<p className={styles.quiet}>Chưa có nghĩa vụ được lưu. Thêm từ danh mục gợi ý hoặc ghi theo hồ sơ thực tế.</p>}
    <details className={styles.templates}><summary>Danh mục gợi ý — chưa phải các hạn áp dụng chính thức</summary><div>{GOVERNMENT_OBLIGATION_TEMPLATES.map(template=><button type="button" key={template.title} onClick={()=>edit({...blank(),...template})}>{template.title}<Plus size={15}/></button>)}</div><p>Chọn mẫu, kiểm tra nghĩa vụ áp dụng và nhập hạn từ hồ sơ/kế toán. Mẫu không tự gửi thông báo.</p></details>
    {draft&&<div className={styles.backdrop} onMouseDown={event=>{if(event.target===event.currentTarget)close();}}><form ref={dialog} role="dialog" aria-modal="true" aria-labelledby="obligation-form-title" className={styles.form} onSubmit={save}>
      <header><h3 id="obligation-form-title">{draft.id?"Sửa nghĩa vụ":"Thêm nghĩa vụ"}</h3><button type="button" onClick={close} disabled={saving} aria-label="Đóng"><X/></button></header>
      {error&&<p className={styles.error} role="alert">{error}</p>}
      <fieldset disabled={saving}>
        <label>Tên nghĩa vụ<input required maxLength={180} value={draft.title} onChange={event=>setDraft({...draft,title:event.target.value})}/></label>
        <div className={styles.pair}><label>Cơ quan / đầu mối<input maxLength={180} value={draft.authority} onChange={event=>setDraft({...draft,authority:event.target.value})}/></label><label>Nhóm<select value={draft.category} onChange={event=>setDraft({...draft,category:event.target.value})}>{Object.entries(categories).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label></div>
        <div className={styles.pair}><label>Hạn kỳ đầu tiên<input type="date" min="1900-01-01" max="2199-12-31" value={draft.first_due_on} onChange={event=>setDraft({...draft,first_due_on:draft.due_rule==="month_end"&&event.target.value?calendarMonthEnd(event.target.value):event.target.value,deadline_confirmed:false})}/></label><label>Lặp lại<select value={draft.repeat_months} onChange={event=>setDraft({...draft,repeat_months:Number(event.target.value),due_rule:Number(event.target.value)===0?"day_of_month":draft.due_rule,deadline_confirmed:false})}>{Object.entries(frequencies).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label></div>
        {Number(draft.repeat_months)>0&&<label>Cách giữ ngày đến hạn<select value={draft.due_rule} onChange={event=>setDraft({...draft,due_rule:event.target.value,first_due_on:event.target.value==="month_end"&&draft.first_due_on?calendarMonthEnd(draft.first_due_on):draft.first_due_on,deadline_confirmed:false})}><option value="day_of_month">Cùng ngày trong tháng (tháng ngắn sẽ lấy ngày cuối)</option><option value="month_end">Luôn là ngày cuối tháng</option></select></label>}
        <label>Ghi chú, người phụ trách & tài liệu cần chuẩn bị<textarea rows={3} maxLength={3000} value={draft.notes} onChange={event=>setDraft({...draft,notes:event.target.value})}/></label>
        <label>Link văn bản / hướng dẫn / hồ sơ<input type="url" maxLength={2048} placeholder="https://…" value={draft.source_url} onChange={event=>setDraft({...draft,source_url:event.target.value})}/></label>
        <label className={styles.check}><input type="checkbox" checked={draft.deadline_confirmed} disabled={!draft.first_due_on} onChange={event=>setDraft({...draft,deadline_confirmed:event.target.checked})}/> Đã xác nhận nghĩa vụ áp dụng và hạn với kế toán/cơ quan phụ trách</label>
        <label className={styles.check}><input type="checkbox" checked={draft.notify_telegram} onChange={event=>setDraft({...draft,notify_telegram:event.target.checked})}/> Gửi Telegram trước 1 tháng theo lịch cho mỗi kỳ</label>
        <label className={styles.check}><input type="checkbox" checked={draft.active} onChange={event=>setDraft({...draft,active:event.target.checked})}/> Tiếp tục tạo các kỳ mới</label>
        {preview.length>0&&<div className={styles.preview}><b>Dự kiến theo mốc bạn nhập</b>{preview.map(date=><p key={date}>Hạn {dateLabel(date)} · nhắc từ {dateLabel(subtractCalendarMonth(date))}</p>)}</div>}
        <p className={styles.quiet}>Kiểm tra ngày nghỉ, thay đổi văn bản và thông báo thực tế trước khi xác nhận. Các kỳ đã quá hạn nhưng chưa xong vẫn nằm trong mục đang chờ; kỳ tiếp theo vẫn có nhắc riêng. Tạm dừng không xóa lịch sử.</p>
      </fieldset>
      <button type="submit" className={styles.save} disabled={saving||!draft.title.trim()}>{saving?"Đang lưu…":"Lưu nghĩa vụ & cập nhật lịch"}</button>
    </form></div>}
  </section>;
}
