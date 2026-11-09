"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Bell, BookOpen, Check, ClipboardCopy, Clock3, MessageSquareText, Plus, RefreshCw, Send, Sparkles } from "lucide-react";
import styles from "./page.module.css";

const CHANNEL={manual:"Ghi chú",zalo_personal:"Zalo cá nhân",zalo_oa:"Zalo OA",facebook:"Messenger"};
const FACT={preference:"Khẩu vị",quoted_price:"Giá đã báo",feedback:"Phản hồi",quantity:"Sản lượng",promise:"Cam kết",relationship:"Quan hệ"};
const STATUS={open:"Đang theo dõi",waiting_us:"Cần mình trả lời",waiting_customer:"Chờ khách",done:"Đã xong"};
const displayDate=value=>value?new Intl.DateTimeFormat("vi-VN",{timeZone:"Asia/Ho_Chi_Minh",day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}).format(new Date(value)):"";
const errLabel={not_authenticated:"Bạn cần đăng nhập quyền quản lý.",memory_unavailable:"Chưa truy cập được kho dữ liệu. Có thể migration chưa được áp dụng.",openai_not_configured:"Chưa đặt OPENAI_API_KEY trên máy chủ.",ai_unavailable:"AI chưa tạo được bản nháp. Hội thoại đã lưu an toàn.",stale_draft:"Bản nháp đã thay đổi, tải lại để tiếp tục.",invalid_input:"Nội dung chưa hợp lệ.",action_not_allowed:"Không thể thực hiện với trạng thái hiện tại."};

export default function CustomerMemoryPage() {
  const router=useRouter();
  const supabase=useMemo(()=>createClient(),[]);
  const [threads,setThreads]=useState([]);
  const [selected,setSelected]=useState("");
  const [messages,setMessages]=useState([]);
  const [drafts,setDrafts]=useState([]);
  const [query,setQuery]=useState("");
  const [intake,setIntake]=useState({channel:"zalo_personal",name:"",text:""});
  const [attach,setAttach]=useState(false);
  const [openCapture,setOpenCapture]=useState(false);
  const [editing,setEditing]=useState("");
  const [busy,setBusy]=useState("");
  const [loading,setLoading]=useState(true);
  const [notice,setNotice]=useState("");
  const [error,setError]=useState("");

  const api=useCallback(async (method,payload,threadId="")=>{
    const {data:{session}}=await supabase.auth.getSession();
    if(!session?.access_token) throw new Error("not_authenticated");
    const res=await fetch("/api/staff/customer-memory"+(threadId?"?thread="+encodeURIComponent(threadId):""),{
      method,headers:{"Authorization":"Bearer "+session.access_token,...(method!=="GET"?{"Content-Type":"application/json"}:{})},
      ...(payload?{body:JSON.stringify(payload)}:{}),cache:"no-store"
    });
    const data=await res.json().catch(()=>({}));
    if(!res.ok) throw new Error(data.error || "memory_unavailable");
    return data;
  },[supabase]);

  const load=useCallback(async (id)=>{
    setLoading(true);setError("");
    try{
      const data=await api("GET",null,id);
      setThreads(data.threads||[]);setMessages(data.messages||[]);setDrafts(data.drafts||[]);
      if(id) setSelected(id);
    }catch(e){
      setError(errLabel[e.message] || e.message);
      if(e.message==="not_authenticated") router.replace("/admin/login");
    }finally{setLoading(false);}
  },[api,router]);

  useEffect(()=>{
    const params=new URLSearchParams(window.location.search);
    load(params.get("thread")||"");
  },[load]);
  useEffect(()=>{
    if(!selected && threads.length && !loading) load(threads[0].id);
  },[selected,threads,loading,load]);

  const thread=threads.find(t=>t.id===selected);
  const latest=drafts[0];
  const pending=threads.filter(t=>t.status==="waiting_us").length;
  const due=threads.filter(t=>t.next_action_at && new Date(t.next_action_at)<=new Date() && t.status!=="done").length;
  const filtered=threads.filter(t=>[t.display_name,t.channel,t.summary,(t.facts||[]).map(f=>f.detail).join(" ")].join(" ").toLowerCase().includes(query.toLowerCase()));

  async function capture(e){
    e.preventDefault();setBusy("capture");setError("");setNotice("");
    try{
      const target=attach && thread?thread:null;
      const data=await api("POST",{channel:target?.channel||intake.channel,
        threadId:target?.id||undefined,name:target?.display_name||intake.name,text:intake.text});
      setNotice(data.error==="ai_unavailable"||data.draft_status==="ai_unavailable"?
        "Đã lưu cuộc hội thoại. AI chưa sẵn sàng; có thể tạo lại nháp.":"Đã lưu hội thoại và xử lý đề xuất.");
      setIntake(v=>({...v,text:""}));setOpenCapture(false);
      await load(data.thread_id);
    }catch(e){setError(errLabel[e.message] || e.message);}
    finally{setBusy("");}
  }

  async function act(action){
    if(!latest) return;
    setBusy(action);setError("");setNotice("");
    try{
      const result=await api("PATCH",{draftId:latest.id,action,...(action==="save"?{body:editing}:{})});
      setNotice(action==="approve"?"Đã duyệt nội bộ. CHƯA gửi cho khách. Hãy sao chép hoặc gửi thủ công ở kênh gốc.":
        action==="snooze"?"Đã hẹn nhắc lại sau 24 giờ.":
        action==="regenerate"?"Đã yêu cầu tạo lại bản nháp.":"Đã lưu bản sửa.");
      if(result.error) setNotice(errLabel[result.error]||result.error);
      await load(selected);
    }catch(e){setError(errLabel[e.message] || e.message);}
    finally{setBusy("");}
  }

  useEffect(()=>setEditing(latest?.body||""),[latest?.id,latest?.body]);

  return <main className={styles.main}>
    <header className={styles.header}>
      <div><p className={styles.eyebrow}><Sparkles size={14}/> HOÀNG LONG CUSTOMER INTELLIGENCE</p>
        <h1>Trí nhớ khách hàng</h1><p>Nhớ điều khách nói, điều mình đã hứa, và việc cần làm tiếp theo.</p>
      </div>
      <button className={styles.primary} type="button" onClick={()=>{setAttach(false);setOpenCapture(x=>!x);}}><Plus size={17}/> Ghi hội thoại</button>
    </header>
    {error && <div className={styles.error} role="alert">{error}</div>}
    {notice && <div className={styles.notice} role="status">{notice}</div>}
    <section className={styles.kpis} aria-label="Tổng quan">
      <div><MessageSquareText size={18}/><strong>{threads.length}</strong><span>Hồ sơ đang lưu</span></div>
      <div><Bell size={18}/><strong>{pending}</strong><span>Cần phản hồi</span></div>
      <div><Clock3 size={18}/><strong>{due}</strong><span>Đến hạn nhắc</span></div>
    </section>
    {openCapture && <form className={styles.capture} onSubmit={capture}>
      <div className={styles.captureHead}><h2>Ghi hội thoại vào trí nhớ</h2>
        <button type="button" onClick={()=>setOpenCapture(false)}>Đóng</button></div>
      <p>Dán nội dung Zalo/Messenger hoặc ghi tóm tắt sau cuộc gọi. Hệ thống lưu hồ sơ riêng, trích dẫn thông tin, rồi đề xuất câu trả lời. Chưa tự gửi khách.</p>
      <label className={styles.checkbox}><input type="checkbox" checked={attach} disabled={!thread}
        onChange={e=>setAttach(e.target.checked)}/> Thêm vào hồ sơ khách đang chọn {thread?"("+thread.display_name+")":""}</label>
      {!attach && <div className={styles.formRow}>
        <label>Kênh<select value={intake.channel} onChange={e=>setIntake(v=>({...v,channel:e.target.value}))}>
          {Object.entries(CHANNEL).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
        <label>Khách / quán<input value={intake.name} onChange={e=>setIntake(v=>({...v,name:e.target.value}))}
          placeholder="Ví dụ: Anh Minh · Trà sữa Hà Nội" maxLength={160} required/></label>
      </div>}
      <label className={styles.field}>Nội dung<textarea rows={6} value={intake.text} maxLength={12000}
        onChange={e=>setIntake(v=>({...v,text:e.target.value}))}
        placeholder={"Khách: Mẫu Hồng Trà Khói rất thơm...\nMình: Trước đã báo 85k/kg cho 100kg...\nKhách: Lấy 300kg thì thế nào?"} required/></label>
      <button className={styles.primary} type="submit" disabled={!!busy||!intake.text.trim()}><Sparkles size={17}/> {busy==="capture"?"Đang xử lý...":"Lưu và đề xuất trả lời"}</button>
    </form>}
    <div className={styles.workspace}>
      <aside className={styles.sidebar}>
        <div className={styles.sideTitle}><strong>Hộp thư khách</strong><button aria-label="Tải lại" onClick={()=>load(selected)}><RefreshCw size={15}/></button></div>
        <input className={styles.search} value={query} placeholder="Tìm khách, khẩu vị, giá..." onChange={e=>setQuery(e.target.value)}/>
        <div className={styles.threadList}>
          {filtered.length===0 && <p className={styles.muted}>Chưa có hồ sơ. Nhấn “Ghi hội thoại” để bắt đầu bằng Zalo cá nhân.</p>}
          {filtered.map(t=><button type="button" className={selected===t.id?styles.activeThread:styles.thread}
            key={t.id} onClick={()=>{setSelected(t.id);load(t.id);history.replaceState(null,"","?thread="+t.id);}}>
            <div><strong>{t.display_name||"Chưa có tên"}</strong><small>{displayDate(t.last_message_at)}</small></div>
            <span>{CHANNEL[t.channel]} · {STATUS[t.status]||t.status}</span>
            <p>{t.summary||t.next_action||"Chưa có tóm tắt"}</p>
          </button>)}
        </div>
      </aside>
      <section className={styles.conversation}>
        {!thread ? <div className={styles.empty}><BookOpen size={30}/><h2>Trí nhớ bắt đầu từ một hội thoại</h2>
          <p>Chọn một khách hoặc thêm tin nhắn mới để AI lưu lại thông tin quan trọng.</p></div> : <>
          <div className={styles.convoHeader}><div><strong>{thread.display_name}</strong><span>{CHANNEL[thread.channel]} · {STATUS[thread.status]}</span></div>
            <button type="button" onClick={()=>{setAttach(true);setOpenCapture(true);window.scrollTo({top:0,behavior:"smooth"});}}><Plus size={15}/> Thêm tin</button></div>
          <div className={styles.messages}>
            {messages.map(m=><article className={m.direction==="inbound"?styles.inbound:styles.outbound} key={m.id}>
              <span>{m.direction==="inbound"?"Khách / Hội thoại":"Mình"} · {displayDate(m.occurred_at)}</span>
              <p>{m.body}</p>
            </article>)}
          </div>
          <section className={styles.replyBox}>
            <div className={styles.replyHead}><h2><Sparkles size={17}/> AI gợi ý trả lời</h2><span>{latest?.status==="draft"?"Chờ duyệt":latest?.status==="approved"?"Đã duyệt · chưa gửi":latest?.status==="ai_unavailable"?"AI chưa sẵn sàng":latest?.status==="processing"?"Đang phân tích":"Chưa có bản nháp"}</span></div>
            {latest?.status==="ai_unavailable"||latest?.status==="processing"?
              <button type="button" onClick={()=>act("regenerate")} disabled={!!busy}><RefreshCw size={15}/> Tạo lại gợi ý</button>:null}
            {latest?.body ? <>
              <textarea aria-label="Chỉnh sửa câu trả lời AI" value={editing} onChange={e=>setEditing(e.target.value)}
                rows={6} maxLength={4000} disabled={latest.status!=="draft"}/>
              <div className={styles.replyActions}>
                <button onClick={()=>navigator.clipboard?.writeText(editing)}><ClipboardCopy size={15}/> Sao chép</button>
                {latest.status==="draft" && <>
                  <button disabled={!!busy||!editing.trim()||editing===latest.body} onClick={()=>act("save")}>Lưu chỉnh sửa</button>
                  <button className={styles.primary} disabled={!!busy||editing!==latest.body} onClick={()=>act("approve")}><Check size={15}/> Duyệt bản nháp</button>
                </>}
                <button disabled={!!busy} onClick={()=>act("snooze")}><Clock3 size={15}/> Nhắc mai</button>
              </div>
              <p className={styles.warning}>Không tự gửi Zalo hay Facebook. Duyệt chỉ là xác nhận nội bộ; cần gửi qua kênh gốc.</p>
            </>:<p className={styles.muted}>Chưa có đề xuất. AI sẽ dùng lịch sử khách và dữ kiện có chứng cứ để soạn.</p>}
          </section>
        </>}
      </section>
      <aside className={styles.memory}>
        <div className={styles.memoryHead}><BookOpen size={19}/><h2>AI nhớ gì?</h2></div>
        {thread?<><h3>Hồ sơ</h3><p>{thread.summary||"Chưa có tóm tắt."}</p>
          <h3>Khẩu vị · giá · cam kết</h3>
          {(thread.facts||[]).length ? <div className={styles.facts}>{[...thread.facts].reverse().map((f,i)=><div key={i} className={styles.fact}>
            <small>{FACT[f.category]||f.category} · {displayDate(f.at)}</small><strong>{f.detail}</strong>
            <blockquote>“{f.quote}”</blockquote>
          </div>)}</div>:<p className={styles.muted}>Chưa có dữ kiện được xác thực bằng câu trích từ hội thoại.</p>}
          <h3>Đang chờ</h3><div className={styles.nextAction}>{thread.next_action||"Chưa xác định việc tiếp theo."}
            {thread.next_action_at && <small>Hẹn: {displayDate(thread.next_action_at)}</small>}</div>
          <p className={styles.warning}>Mức giá cũ là lịch sử báo giá, không phải giá áp dụng tự động cho đơn hàng mới.</p>
        </>:<p className={styles.muted}>Chọn một hồ sơ để xem nội dung AI đã lưu cùng nguồn bằng chứng.</p>}
      </aside>
    </div>
    <footer className={styles.footer}><Send size={15}/> Telegram sẽ chỉ thông báo khi bot và chat riêng được cấu hình; bản nháp cần người duyệt.</footer>
  </main>;
}
