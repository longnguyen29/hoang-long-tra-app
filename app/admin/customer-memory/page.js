"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Bell, BookOpen, Check, ClipboardCopy, Clock3, MessageSquareText, Plus, RefreshCw, Send, Sparkles, KeyRound, ShieldAlert } from "lucide-react";
import ZaloHistoryImport from "./ZaloHistoryImport";
import { deleteSelectedConversations } from "@/lib/customer-memory-bulk-delete";
import styles from "./page.module.css";

const CHANNEL={manual:"Ghi chú",zalo_personal:"Zalo cá nhân",zalo_oa:"Zalo OA",facebook:"Messenger"};
const FACT={preference:"Khẩu vị",quoted_price:"Giá đã báo",feedback:"Phản hồi",quantity:"Sản lượng",promise:"Cam kết",relationship:"Quan hệ"};
const STATUS={open:"Đang theo dõi",waiting_us:"Cần mình trả lời",waiting_customer:"Chờ khách",done:"Đã xong"};
const displayDate=value=>value?new Intl.DateTimeFormat("vi-VN",{timeZone:"Asia/Ho_Chi_Minh",day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}).format(new Date(value)):"";
const errLabel={not_authenticated:"Bạn cần đăng nhập quyền quản lý.",memory_unavailable:"Chưa truy cập được kho dữ liệu. Có thể migration chưa được áp dụng.",thread_not_found:"Không tìm thấy hội thoại này.",openai_not_configured:"Chưa đặt OPENAI_API_KEY trên máy chủ.",ai_unavailable:"AI chưa tạo được bản nháp. Hội thoại đã lưu an toàn.",stale_draft:"Bản nháp đã thay đổi, tải lại để tiếp tục.",invalid_input:"Nội dung chưa hợp lệ.",action_not_allowed:"Không thể thực hiện với trạng thái hiện tại."};

function appendUniqueRows(rows, additionalRows) {
  const ids = new Set(rows.map(row => row.id));
  return [...rows, ...additionalRows.filter(row => !ids.has(row.id))];
}

export default function CustomerMemoryPage() {
  const router=useRouter();
  const supabase=useMemo(()=>createClient(),[]);
  const [threads,setThreads]=useState([]);
  const [selectionMode,setSelectionMode]=useState(false);
  const [selectedThreads,setSelectedThreads]=useState([]);
  const [selected,setSelected]=useState("");
  const [thread,setThread]=useState(null);
  const [messages,setMessages]=useState([]);
  const [drafts,setDrafts]=useState([]);
  const [canImportHistory,setCanImportHistory]=useState(false);
  const [nextThreadCursor,setNextThreadCursor]=useState(null);
  const [nextMessageCursor,setNextMessageCursor]=useState(null);
  const [loadingThreads,setLoadingThreads]=useState(false);
  const [loadingMessages,setLoadingMessages]=useState(false);
  const requestVersion=useRef(0);
  const selectedId=useRef("");
  const messageList=useRef(null);
  const messageScrollAnchor=useRef(null);
  const [query,setQuery]=useState("");
  const [intake,setIntake]=useState({channel:"zalo_personal",name:"",text:""});
  const [attach,setAttach]=useState(false);
  const [openCapture,setOpenCapture]=useState(false);
  const [editing,setEditing]=useState("");
  const [busy,setBusy]=useState("");
  const [loading,setLoading]=useState(true);
  const [notice,setNotice]=useState("");
  const [aiCheck,setAiCheck]=useState("");
  const [pairOpen,setPairOpen]=useState(false);
  const [bridges,setBridges]=useState([]);
  const [pairLabel,setPairLabel]=useState("Mac mini — Zalo cá nhân");
  const [pairToken,setPairToken]=useState("");
  const [pairBusy,setPairBusy]=useState(false);
  const [pairError,setPairError]=useState("");
  const [error,setError]=useState("");

  const api=useCallback(async (method,payload,params={})=>{
    const {data:{session}}=await supabase.auth.getSession();
    if(!session?.access_token) throw new Error("not_authenticated");
    const search=new URLSearchParams(params).toString();
    const res=await fetch("/api/staff/customer-memory"+(search?"?"+search:""),{
      method,headers:{"Authorization":"Bearer "+session.access_token,...(method!=="GET"?{"Content-Type":"application/json"}:{})},
      ...(payload?{body:JSON.stringify(payload)}:{}),cache:"no-store"
    });
    const data=await res.json().catch(()=>({}));
    if(!res.ok) throw new Error(data.error || "memory_unavailable");
    return data;
  },[supabase]);

  const showLoadError=useCallback(e=>{
    setError(errLabel[e.message] || errLabel.memory_unavailable);
    if(e.message==="not_authenticated") router.replace("/admin/login");
  },[router]);

  const load=useCallback(async (id,refreshThreads=true)=>{
    const version=++requestVersion.current;
    if(id!==selectedId.current){
      setThread(null);setMessages([]);setDrafts([]);setNextMessageCursor(null);
    }
    selectedId.current=id;
    setSelected(id);setLoading(true);setError("");
    setLoadingThreads(false);setLoadingMessages(false);
    messageScrollAnchor.current=null;
    try{
      let data=await api("GET",null,id?{thread:id}:{});
      if(version!==requestVersion.current) return;
      setCanImportHistory(data.canImportHistory===true);
      if(refreshThreads){
        setThreads(data.threads||[]);
        setNextThreadCursor(data.nextThreadCursor||null);
      }
      if(!id && data.threads?.length){
        id=data.threads[0].id;
        selectedId.current=id;
        setSelected(id);
        data=await api("GET",null,{thread:id});
        if(version!==requestVersion.current) return;
      }
      if(id && !data.thread) setError(errLabel.thread_not_found);
      setThread(data.thread||null);
      setMessages(data.messages||[]);
      setDrafts(data.drafts||[]);
      setNextMessageCursor(data.nextMessageCursor||null);
    }catch(e){
      if(version===requestVersion.current) showLoadError(e);
    }finally{
      if(version===requestVersion.current) setLoading(false);
    }
  },[api,showLoadError]);

  useEffect(()=>{
    const params=new URLSearchParams(window.location.search);
    load(params.get("thread")||"");
    return ()=>{requestVersion.current++;};
  },[load]);

  async function loadMoreThreads(){
    if(loading || loadingThreads || !nextThreadCursor) return;
    const version=requestVersion.current;
    setLoadingThreads(true);setError("");
    try{
      const data=await api("GET",null,{threadBefore:nextThreadCursor});
      if(version!==requestVersion.current) return;
      setThreads(rows=>appendUniqueRows(rows,data.threads||[]));
      setNextThreadCursor(data.nextThreadCursor||null);
    }catch(e){
      if(version===requestVersion.current) showLoadError(e);
    }finally{
      if(version===requestVersion.current) setLoadingThreads(false);
    }
  }

  async function loadMoreMessages(){
    if(loading || loadingMessages || !thread || !nextMessageCursor) return;
    const version=requestVersion.current;
    setLoadingMessages(true);setError("");
    try{
      const data=await api("GET",null,{thread:thread.id,messageBefore:nextMessageCursor});
      if(version!==requestVersion.current) return;
      const list=messageList.current;
      if(list) messageScrollAnchor.current={height:list.scrollHeight,top:list.scrollTop};
      setMessages(rows=>appendUniqueRows(data.messages||[],rows));
      setNextMessageCursor(data.nextMessageCursor||null);
    }catch(e){
      if(version===requestVersion.current) showLoadError(e);
    }finally{
      if(version===requestVersion.current) setLoadingMessages(false);
    }
  }

  useLayoutEffect(()=>{
    const anchor=messageScrollAnchor.current;
    const list=messageList.current;
    if(anchor && list) list.scrollTop=anchor.top+list.scrollHeight-anchor.height;
    messageScrollAnchor.current=null;
  },[messages]);


  const bridgeApi=useCallback(async (method,payload)=>{
    const {data:{session}}=await supabase.auth.getSession();
    if(!session?.access_token) throw new Error("not_authenticated");
    const response=await fetch("/api/staff/customer-memory/bridge",{
      method,headers:{Authorization:"Bearer "+session.access_token,...(method!=="GET"?{"Content-Type":"application/json"}:{})},
      ...(payload?{body:JSON.stringify(payload)}:{}),cache:"no-store"
    });
    const result=await response.json().catch(()=>({}));
    if(!response.ok) throw new Error(result.error || "bridge_unavailable");
    return result;
  },[supabase]);
  async function checkAi(){
    setAiCheck("Đang kiểm tra…");
    try {
      const {data:{session}}=await supabase.auth.getSession();
      if(!session?.access_token) throw new Error("not_authenticated");
      const response=await fetch("/api/staff/customer-memory/diagnostics",{
        method:"POST",headers:{Authorization:"Bearer "+session.access_token},cache:"no-store"
      });
      const result=await response.json();
      if(!response.ok) throw new Error(result.error);
      setAiCheck(result.status==="ok"?"AI đã trả lời dữ liệu thử nghiệm.":
        result.status==="provider_error"?(
          result.code==="insufficient_quota"?"Tài khoản API đã hết hạn mức hoặc chưa có thanh toán.":
          result.code==="rate_limit_exceeded"?"Dịch vụ AI đang giới hạn số yêu cầu, hãy thử lại sau.":
          `Dịch vụ AI trả mã ${result.http_status}.`):
        result.status==="invalid_response"?`AI chưa trả lời đầy đủ (${result.incomplete_reason || result.response_status}).`:
        result.status==="not_configured"?"Chưa cấu hình kết nối AI.":"Chưa kết nối hoặc nhận được câu trả lời AI.");
    }catch{setAiCheck("Chưa kiểm tra được AI. Cần đăng nhập bằng tài khoản admin.");}
  }

  async function openBridgePairing(){
    setPairOpen(v=>!v);setPairError("");setPairToken("");
    try {
      const result=await bridgeApi("GET");
      setBridges(result.bridges || []);
    }catch(e){
      setPairError(e.message==="admin_required"?"Chỉ tài khoản admin mới được quản lý kết nối.":"Chưa đọc được trạng thái kết nối; kiểm tra migration 0104.");
    }
  }
  async function createBridge(){
    setPairBusy(true);setPairError("");setPairToken("");
    try {
      const result=await bridgeApi("POST",{label:pairLabel});
      setPairToken(result.token);
      const list=await bridgeApi("GET");setBridges(list.bridges||[]);
    }catch(e){setPairError(e.message==="admin_required"?"Cần quyền admin.":"Không tạo được mã kết nối. Vui lòng thử lại.");}
    finally{setPairBusy(false);}
  }
  async function revokeBridge(id){
    if(!window.confirm("Thu hồi mã kết nối Mac này? Bridge sẽ ngừng gửi dữ liệu ngay."))return;
    setPairBusy(true);setPairError("");
    try {await bridgeApi("DELETE",{id});const list=await bridgeApi("GET");setBridges(list.bridges||[]);setPairToken("");}
    catch{setPairError("Không thu hồi được mã kết nối.");}
    finally{setPairBusy(false);}
  }

  const latest=drafts[0];
  const hasImportedHistory=messages.some(message=>message.historical);
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

  async function renameThread(){
    if(!thread || busy) return;
    const name=window.prompt("Tên hiển thị của hội thoại",thread.display_name || "");
    if(name===null) return;
    if(!name.trim() || name.trim().length>160){setError(errLabel.invalid_input);return;}
    setBusy("rename");setError("");setNotice("");
    try {
      await api("PATCH",{action:"rename_thread",threadId:thread.id,name:name.trim()});
      await load(selectedId.current);
      setNotice("Đã cập nhật tên hội thoại.");
    }catch(e){setError(errLabel[e.message] || errLabel.memory_unavailable);}
    finally{setBusy("");}
  }

  function toggleThreadSelection(id){
    setSelectedThreads(ids=>ids.includes(id)?ids.filter(item=>item!==id):[...ids,id]);
  }

  function toggleVisibleSelection(){
    const visibleIds=filtered.map(item=>item.id);
    const allSelected=visibleIds.every(id=>selectedThreads.includes(id));
    setSelectedThreads(ids=>allSelected
      ?ids.filter(id=>!visibleIds.includes(id))
      :[...new Set([...ids,...visibleIds])]);
  }

  async function deleteSelectedThreads(){
    if(!selectedThreads.length || busy) return;
    const ids=[...selectedThreads];
    if(!window.confirm(`Xóa vĩnh viễn ${ids.length} hội thoại đã chọn cùng tin nhắn, bản nháp và dữ kiện trong Customer Memory? Hội thoại gốc trên Zalo và các kênh khác vẫn giữ nguyên.`)) return;
    setBusy("bulkDelete");setError("");setNotice("");
    const {removed,failed}=await deleteSelectedConversations(ids,
      id=>api("DELETE",{threadId:id,confirmation:"delete"}));
    setSelectedThreads(failed);
    if(!failed.length) setSelectionMode(false);
    const currentDeleted=removed.includes(selectedId.current);
    if(currentDeleted) history.replaceState(null,"",window.location.pathname);
    await load(currentDeleted?"":selectedId.current);
    setNotice(`Đã xóa ${removed.length} hội thoại.`+(failed.length?` Chưa xóa được ${failed.length} hội thoại, vẫn đang được chọn để thử lại.`:""));
    setBusy("");
  }

  async function deleteThread(){
    if(!thread || busy) return;
    if(!window.confirm(`Xóa vĩnh viễn hội thoại “${thread.display_name}” cùng tin nhắn, bản nháp và dữ kiện đã lưu? Tin nhắn mới từ cùng người có thể tạo lại hội thoại.`)) return;
    setBusy("delete");setError("");setNotice("");
    try {
      await api("DELETE",{threadId:thread.id,confirmation:"delete"});
      setSelectedThreads(ids=>ids.filter(id=>id!==thread.id));
      const deletingSelected=selectedId.current===thread.id;
      if(deletingSelected) history.replaceState(null,"",window.location.pathname);
      await load(deletingSelected?"":selectedId.current);
      setNotice("Đã xóa hội thoại và dữ liệu liên quan khỏi Trí nhớ khách hàng.");
    }catch(e){setError(errLabel[e.message] || "Chưa xóa được hội thoại. Hãy tải lại và thử lại.");}
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
      await load(selectedId.current);
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
    <section className={styles.capture} aria-label="Kết nối Zalo cá nhân thử nghiệm">
      <div className={styles.captureHead}>
        <h2><KeyRound size={17} style={{verticalAlign:"middle",marginRight:8}}/>Kết nối Zalo cá nhân — thử nghiệm</h2>
        <button type="button" onClick={openBridgePairing}>{pairOpen?"Đóng":"Thiết lập"}</button>
      </div>
      <p><ShieldAlert size={14} style={{verticalAlign:"middle",marginRight:6}}/>
        Không chính thức: có nguy cơ tài khoản Zalo bị khóa. Không cần nâng cấp Zalo cá nhân.
        Cài bridge trên Mac, chỉ đọc các hội thoại B2B được bạn cho phép; không tự động gửi khách.</p>
      {pairOpen && <>
        {pairError && <div className={styles.error} role="alert">{pairError}</div>}
        <div className={styles.formRow}>
          <label>Tên Mac / kết nối
            <input value={pairLabel} maxLength={100} onChange={e=>setPairLabel(e.target.value)}/>
          </label>
          <div style={{alignSelf:"end"}}>
            <button type="button" className={styles.primary} disabled={pairBusy||!pairLabel.trim()} onClick={createBridge}>
              Tạo mã kết nối một lần
            </button>
          </div>
        </div>
        {pairToken && <div className={styles.nextAction}>
          <strong>Mã kết nối (chỉ hiển thị lần này)</strong>
          <p style={{overflowWrap:"anywhere",fontFamily:"monospace"}}>{pairToken}</p>
          <button type="button" onClick={()=>navigator.clipboard?.writeText(pairToken)}><ClipboardCopy size={14}/> Sao chép</button>
          <p>Chỉ lưu mã vào file .env trên Mac. Đừng gửi trong chat, Zalo hoặc đưa lên GitHub.</p>
        </div>}
        {bridges.map(b=><div className={styles.fact} key={b.id} style={{marginTop:12}}>
          <strong>{b.label} · {b.active?"Đang cấp quyền":"Đã thu hồi"}</strong>
          <small>Hoạt động gần nhất: {b.last_used_at?displayDate(b.last_used_at):"Chưa nhận dữ liệu"}</small>
          {b.active && <button type="button" disabled={pairBusy} onClick={()=>revokeBridge(b.id)}>Thu hồi kết nối</button>}
        </div>)}
        <p>Hướng dẫn trên Mac: <a href="https://github.com/longnguyen29/hoang-long-tra-app/tree/main/tools/zalo-personal-bridge"
         target="_blank" rel="noopener noreferrer">Local Zalo Bridge</a>. Cần cài, quét QR và chọn ID khách trước khi có tin nhắn.</p>
      </>}
    </section>
    {canImportHistory && <ZaloHistoryImport supabase={supabase} onImported={()=>load(selectedId.current)}/>}
    <button type="button" onClick={checkAi}>Kiểm tra AI</button>
    {aiCheck && <p role="status">{aiCheck}</p>}
    {error && <div className={styles.error} role="alert">{error}</div>}
    {notice && <div className={styles.notice} role="status">{notice}</div>}
    <section className={styles.kpis} aria-label="Tổng quan các hồ sơ đã tải">
      <div><MessageSquareText size={18}/><strong>{threads.length}</strong><span>Hồ sơ đã tải</span></div>
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
        <input className={styles.search} value={query} aria-label="Tìm trong các hồ sơ đã tải" placeholder="Tìm trong hồ sơ đã tải…" onChange={e=>setQuery(e.target.value)}/>
        <div className={styles.bulkActions}>
          {!selectionMode ? <button type="button" disabled={!!busy||!threads.length} onClick={()=>setSelectionMode(true)}>Chọn nhiều</button> : <>
            <button type="button" disabled={!!busy||!filtered.length} onClick={toggleVisibleSelection}>
              {filtered.length>0 && filtered.every(t=>selectedThreads.includes(t.id))?"Bỏ chọn hồ sơ hiển thị":"Chọn hồ sơ hiển thị"}
            </button>
            <button type="button" disabled={!!busy||!selectedThreads.length} onClick={deleteSelectedThreads}>
              {busy==="bulkDelete"?"Đang xóa…":`Xóa đã chọn (${selectedThreads.length})`}
            </button>
            <button type="button" disabled={!!busy} onClick={()=>{setSelectionMode(false);setSelectedThreads([]);}}>Hủy</button>
          </>}
        </div>
        <div className={styles.threadList}>
          {filtered.length===0 && <p className={styles.muted}>{loading?"Đang tải hồ sơ…":query?"Chưa thấy kết quả trong các hồ sơ đã tải.":"Chưa có hồ sơ. Nhấn “Ghi hội thoại” để bắt đầu bằng Zalo cá nhân."}</p>}
          {filtered.map(t=><div className={styles.threadEntry} key={t.id}>
            {selectionMode && <label className={styles.threadSelect}>
              <input type="checkbox" checked={selectedThreads.includes(t.id)} disabled={!!busy}
                onChange={()=>toggleThreadSelection(t.id)} aria-label={`Chọn ${t.display_name||"hội thoại"}`}/>
            </label>}
            <button type="button" className={selected===t.id?styles.activeThread:styles.thread} disabled={busy==="bulkDelete"}
              onClick={()=>{load(t.id,false);history.replaceState(null,"","?thread="+t.id);}}>
              <div><strong>{t.display_name||"Chưa có tên"}</strong><small>{displayDate(t.last_message_at)}</small></div>
              <span>{CHANNEL[t.channel]} · {STATUS[t.status]||t.status}</span>
              <p>{t.summary||t.next_action||"Chưa có tóm tắt"}</p>
            </button>
          </div>)}
        </div>
        {nextThreadCursor && <div className={styles.pageThreads}>
          <button className={styles.pageButton} type="button" onClick={loadMoreThreads} disabled={loading||loadingThreads||busy==="bulkDelete"}>
            {loadingThreads?"Đang tải…":"Tải hồ sơ cũ hơn"}
          </button>
        </div>}
      </aside>
      <section className={styles.conversation}>
        {!thread ? loading ? <div className={styles.empty} role="status">Đang tải hội thoại…</div> : <div className={styles.empty}><BookOpen size={30}/><h2>Trí nhớ bắt đầu từ một hội thoại</h2>
          <p>Chọn một khách hoặc thêm tin nhắn mới để AI lưu lại thông tin quan trọng.</p></div> : <>
          <div className={styles.convoHeader}><div><strong>{thread.display_name}</strong><span>{CHANNEL[thread.channel]} · {STATUS[thread.status]}</span></div>
            <div><button type="button" disabled={!!busy} onClick={renameThread}>Đổi tên</button> <button type="button" onClick={()=>{setAttach(true);setOpenCapture(true);window.scrollTo({top:0,behavior:"smooth"});}}><Plus size={15}/> Thêm tin</button> <button type="button" disabled={!!busy} onClick={deleteThread}>Xóa hội thoại</button></div></div>
          {nextMessageCursor && <div className={styles.pageMessages}>
            <button className={styles.pageButton} type="button" onClick={loadMoreMessages} disabled={loading||loadingMessages}>
              {loadingMessages?"Đang tải…":"Tải tin nhắn cũ hơn"}
            </button>
          </div>}
          <div className={styles.messages} ref={messageList}>
            {messages.map(m=><article className={m.direction==="inbound"?styles.inbound:styles.outbound} key={m.id}>
              <span>{m.direction==="inbound"?(m.sender_name||"Khách / Hội thoại"):"Mình"} · {displayDate(m.occurred_at)}</span>
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
            </>:<p className={styles.muted}>{!latest && hasImportedHistory?"Lịch sử Zalo đã lưu. Bạn có thể dùng “Thêm tin” để ghi nội dung mới và tạo bản nháp.":"Chưa có đề xuất. AI sẽ dùng lịch sử khách và dữ kiện có chứng cứ để soạn."}</p>}
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
