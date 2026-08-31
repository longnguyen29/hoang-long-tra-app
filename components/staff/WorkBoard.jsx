"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle, ArrowLeft, CalendarClock, Check, CheckCircle2, ChevronRight,
  CirclePause, Clock3, LogOut, MailPlus, Play, Plus, RefreshCw, Repeat2,
  Share2, UserRound, UsersRound, X,
} from "lucide-react";
import styles from "./WorkBoard.module.css";

const OPEN_STATUSES = new Set(["assigned", "in_progress", "blocked"]);
const STATUS = {
  assigned: ["Chờ nhận", Clock3],
  in_progress: ["Đang làm", Play],
  blocked: ["Đang vướng", AlertTriangle],
  completed: ["Đã xong", CheckCircle2],
  cancelled: ["Đã hủy", X],
};
const REPEAT = {
  daily: "Mỗi ngày",
  weekdays: "Thứ Hai–Thứ Sáu",
  weekly: "Mỗi tuần",
  monthly: "Mỗi tháng",
};

const pad = (value) => String(value).padStart(2, "0");
const dateKey = (date = new Date()) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const nowDraft = () => {
  const due = new Date();
  due.setHours(17, 0, 0, 0);
  return {
    title: "", instructions: "", checklist: "", assignedTo: "", dueDate: dateKey(due),
    dueTime: "17:00", recurrence: "once", priority: "normal", referenceText: "",
  };
};
const dueLabel = (value) => new Intl.DateTimeFormat("vi-VN", {
  weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  timeZone: "Asia/Ho_Chi_Minh",
}).format(new Date(value));
const timeLabel = (value) => new Intl.DateTimeFormat("vi-VN", {
  hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh",
}).format(new Date(value));
const sameDay = (value, comparison = new Date()) => value && dateKey(new Date(value)) === dateKey(comparison);

export default function WorkBoard({ supabase, userId, email, role, onLogout }) {
  const canAssign = role === "admin" || role === "manager";
  const [tasks, setTasks] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [view, setView] = useState("today");
  const [drawer, setDrawer] = useState("");
  const [draft, setDraft] = useState(nowDraft);
  const [invite, setInvite] = useState({ displayName: "", email: "", phone: "" });
  const [blockingId, setBlockingId] = useState("");
  const [blockNote, setBlockNote] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    if (canAssign) await supabase.rpc("generate_due_work_tasks");
    const [taskResult, profileResult, templateResult] = await Promise.all([
      supabase.from("work_tasks").select("*").order("due_at", { ascending: true }),
      supabase.from("staff_profiles").select("*").eq("active", true).order("display_name"),
      canAssign
        ? supabase.from("work_templates").select("*").order("created_at", { ascending: false })
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (taskResult.error || profileResult.error || templateResult.error) {
      setError("Chưa tải được sổ công việc. Cần áp dụng migration 0043.");
    }
    setTasks(taskResult.data || []);
    setProfiles(profileResult.data || []);
    setTemplates(templateResult.data || []);
    setDraft((current) => ({ ...current, assignedTo: current.assignedTo || profileResult.data?.[0]?.user_id || userId }));
    setLoading(false);
  }, [canAssign, supabase, userId]);

  useEffect(() => { load(); }, [load]);

  const profileById = useMemo(() => Object.fromEntries(profiles.map((profile) => [profile.user_id, profile])), [profiles]);
  const now = new Date();
  const endToday = new Date(); endToday.setHours(23, 59, 59, 999);
  const openTasks = tasks.filter((task) => OPEN_STATUSES.has(task.status));
  const overdue = openTasks.filter((task) => new Date(task.due_at) < now);
  const todayTasks = openTasks.filter((task) => new Date(task.due_at) <= endToday);
  const upcoming = openTasks.filter((task) => new Date(task.due_at) > endToday);
  const completedToday = tasks.filter((task) => task.status === "completed" && sameDay(task.completed_at));
  const visibleTasks = view === "today" ? todayTasks : view === "upcoming" ? upcoming : completedToday;

  const flash = (message) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2400);
  };

  const changeStatus = async (task, status, note = "") => {
    setSaving(true); setError("");
    const { error: statusError } = await supabase.rpc("set_work_task_status", { p_id: task.id, p_status: status, p_note: note });
    setSaving(false);
    if (statusError) {
      setError(statusError.message?.includes("checklist_incomplete")
        ? "Hãy đánh dấu đủ danh sách kiểm tra trước khi báo hoàn tất."
        : "Chưa cập nhật được phiếu việc. Hãy thử lại.");
      return;
    }
    setBlockingId(""); setBlockNote("");
    flash(status === "completed" ? "Đã ghi nhận hoàn tất" : status === "blocked" ? "Đã báo vướng cho quản lý" : "Đã cập nhật công việc");
    await load();
  };

  const toggleChecklist = async (task, index, checked) => {
    setSaving(true); setError("");
    const { data, error: checklistError } = await supabase.rpc("set_work_task_checklist", {
      p_id: task.id,
      p_index: index,
      p_checked: checked,
    });
    setSaving(false);
    if (checklistError) { setError("Chưa lưu được bước kiểm tra. Hãy thử lại."); return; }
    setTasks((current) => current.map((item) => item.id === task.id ? { ...item, checklist_done: data || [] } : item));
  };

  const shareTask = async (task) => {
    const assignee = profileById[task.assigned_to]?.display_name || "nhân viên";
    const checklist = (task.checklist || []).map((item) => `• ${item}`).join("\n");
    const taskUrl = `https://www.hoanglongtra.com/admin/work#task-${task.id}`;
    const text = [
      `Hoàng Long giao việc cho ${assignee}: ${task.title}`,
      `Hạn: ${dueLabel(task.due_at)}`,
      task.instructions,
      checklist ? `Cần kiểm tra:\n${checklist}` : "",
      task.reference_text ? `Liên quan: ${task.reference_text}` : "",
    ].filter(Boolean).join("\n\n");
    try {
      if (navigator.share) await navigator.share({ title: task.title, text, url: taskUrl });
      else {
        await navigator.clipboard.writeText(`${text}\n\nMở đúng phiếu việc: ${taskUrl}`);
        flash("Đã sao chép phiếu việc để gửi");
      }
    } catch (shareError) {
      if (shareError?.name !== "AbortError") setError("Chưa mở được menu gửi. Hãy thử lại.");
    }
  };

  const createInstruction = async (event) => {
    event.preventDefault();
    if (!draft.title.trim() || !draft.assignedTo) return;
    setSaving(true); setError("");
    const dueAt = draft.recurrence === "once"
      ? new Date(`${draft.dueDate}T${draft.dueTime}:00`).toISOString()
      : null;
    const checklist = draft.checklist.split("\n").map((item) => item.trim()).filter(Boolean);
    const { error: saveError } = await supabase.rpc("save_work_instruction", {
      p_title: draft.title.trim(),
      p_instructions: draft.instructions.trim(),
      p_checklist: checklist,
      p_assigned_to: draft.assignedTo,
      p_due_at: dueAt,
      p_recurrence: draft.recurrence,
      p_start_on: draft.dueDate,
      p_due_time: draft.dueTime,
      p_priority: draft.priority,
      p_reference_text: draft.referenceText.trim(),
    });
    setSaving(false);
    if (saveError) { setError("Chưa giao được việc. Kiểm tra người nhận và thời hạn."); return; }
    setDraft({ ...nowDraft(), assignedTo: draft.assignedTo });
    setDrawer("");
    flash(draft.recurrence === "once" ? "Đã giao việc" : "Đã tạo lịch việc lặp lại");
    await load();
  };

  const inviteWorker = async (event) => {
    event.preventDefault();
    if (!invite.displayName.trim() || !invite.email.trim()) return;
    setSaving(true); setError("");
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch("/api/staff/workers/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token || ""}` },
      body: JSON.stringify(invite),
    });
    const result = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok) { setError(result.detail || "Chưa gửi được lời mời. Email có thể đã được sử dụng."); return; }
    setInvite({ displayName: "", email: "", phone: "" });
    setDrawer("");
    flash("Đã gửi email mời nhân viên");
    await load();
  };

  const toggleTemplate = async (template) => {
    setSaving(true);
    const { error: toggleError } = await supabase.rpc("set_work_template_active", { p_id: template.id, p_active: !template.active });
    setSaving(false);
    if (toggleError) { setError("Chưa thay đổi được lịch lặp."); return; }
    await load();
  };

  return <main className={styles.shell} data-no-translate>
    <header className={styles.topbar}>
      <div className={styles.brand}><span aria-hidden="true">皇龍</span><b>Hoàng Long</b></div>
      <nav aria-label="Công việc"><Link href={canAssign ? "/admin" : "/admin/work"}><ArrowLeft/> {canAssign ? "Bảng điều khiển" : "Việc của tôi"}</Link></nav>
      <div className={styles.identity}><span><b>{profileById[userId]?.display_name || email}</b><small>{canAssign ? "Quản lý" : "Nhân viên"}</small></span><button onClick={load} disabled={loading} aria-label="Làm mới"><RefreshCw className={loading ? styles.spin : ""}/></button><button onClick={onLogout} aria-label="Đăng xuất"><LogOut/></button></div>
    </header>

    <section className={styles.hero}>
      <div><p>{canAssign ? "Bàn giao việc" : "Phiếu việc của bạn"}</p><h1>{canAssign ? "Một việc. Một người. Một hạn." : "Việc cần làm hôm nay."}</h1><span>{canAssign ? "Giao rõ từ đầu để người làm không phải hỏi lại." : "Mở từng phiếu, làm theo hướng dẫn và báo ngay nếu bị vướng."}</span></div>
      {canAssign && <div className={styles.heroActions}><button onClick={() => setDrawer("task")}><Plus/>Giao việc</button><button onClick={() => setDrawer("worker")}><MailPlus/>Thêm người</button></div>}
    </section>

    {error && <p className={styles.error} role="alert"><AlertTriangle/>{error}<button onClick={() => setError("")}>×</button></p>}
    {notice && <p className={styles.notice}><Check/>{notice}</p>}

    <section className={styles.metrics} aria-label="Tình hình công việc">
      <article data-alert={overdue.length > 0}><span>Quá hạn</span><b>{overdue.length}</b><small>cần chạm ngay</small></article>
      <article><span>Hôm nay</span><b>{todayTasks.length}</b><small>chưa hoàn tất</small></article>
      <article><span>Đang vướng</span><b>{openTasks.filter((task) => task.status === "blocked").length}</b><small>cần hỗ trợ</small></article>
      <article><span>Đã xong</span><b>{completedToday.length}</b><small>trong hôm nay</small></article>
    </section>

    <section className={styles.workArea}>
      <section className={styles.ledger}>
        <header><div><p>Sổ việc</p><h2>{view === "today" ? "Cần làm trước khi hết ngày" : view === "upcoming" ? "Việc sắp tới" : "Đã hoàn tất hôm nay"}</h2></div><div className={styles.views} role="tablist" aria-label="Chọn nhóm công việc">{[["today","Hôm nay",todayTasks.length],["upcoming","Sắp tới",upcoming.length],["done","Đã xong",completedToday.length]].map(([id,label,count])=><button key={id} role="tab" aria-selected={view===id} onClick={()=>setView(id)}>{label}<b>{count}</b></button>)}</div></header>
        <div className={styles.taskList}>{loading ? <div className={styles.loading}><i/><i/><i/></div> : visibleTasks.length ? visibleTasks.map((task) => <TaskSlip key={task.id} task={task} assignee={profileById[task.assigned_to]} canAssign={canAssign} saving={saving} blockingId={blockingId} blockNote={blockNote} setBlockNote={setBlockNote} setBlockingId={setBlockingId} onStatus={changeStatus} onChecklist={toggleChecklist} onShare={shareTask}/>) : <div className={styles.clear}><CheckCircle2/><h3>{view === "done" ? "Chưa có việc nào hoàn tất hôm nay." : "Nhóm này đang trống."}</h3><p>{view === "today" ? "Không có phiếu việc nào đang chờ trong hôm nay." : "Công việc mới sẽ xuất hiện ở đây."}</p></div>}</div>
      </section>

      <aside className={styles.context}>
        {canAssign ? <>
          <section><header><div><p>Người trong Nhà</p><h2>Ai đang giữ việc</h2></div><UsersRound/></header><div className={styles.people}>{profiles.map((profile)=><article key={profile.user_id}><span><UserRound/><b>{profile.display_name}</b></span><small>{openTasks.filter((task)=>task.assigned_to===profile.user_id).length} việc mở</small></article>)}</div><button className={styles.textAction} onClick={()=>setDrawer("worker")}><Plus/>Mời nhân viên</button></section>
          <section><header><div><p>Nhịp lặp</p><h2>Việc tự xuất hiện</h2></div><Repeat2/></header>{templates.length ? <div className={styles.templates}>{templates.map((template)=><article key={template.id} data-active={template.active}><span><b>{template.title}</b><small>{REPEAT[template.recurrence]} · {template.due_time.slice(0,5)} · {profileById[template.assigned_to]?.display_name||"Chưa rõ người"}</small></span><button disabled={saving} onClick={()=>toggleTemplate(template)}>{template.active?"Tạm dừng":"Bật lại"}</button></article>)}</div> : <p className={styles.emptyContext}>Chưa có lịch lặp. Khi giao việc, chọn “Lặp lại” để tạo.</p>}</section>
        </> : <section className={styles.workerGuide}><header><div><p>Cách dùng</p><h2>Chỉ ba bước</h2></div><ChevronRight/></header><ol><li><b>1</b><span><strong>Mở phiếu</strong><small>Đọc việc và hạn cần xong.</small></span></li><li><b>2</b><span><strong>Bấm “Bắt đầu”</strong><small>Quản lý sẽ biết bạn đã nhận việc.</small></span></li><li><b>3</b><span><strong>Hoàn tất hoặc báo vướng</strong><small>Không cần gọi lại để báo miệng.</small></span></li></ol></section>}
      </aside>
    </section>

    {drawer === "task" && <div className={styles.overlay} onMouseDown={(event)=>{if(event.target===event.currentTarget)setDrawer("")}}><form className={styles.drawer} onSubmit={createInstruction}><header><div><p>Phiếu giao việc</p><h2>Giao rõ ngay từ đầu</h2></div><button type="button" onClick={()=>setDrawer("")} aria-label="Đóng">×</button></header><label>Việc cần làm<input value={draft.title} onChange={(event)=>setDraft({...draft,title:event.target.value})} placeholder="Ví dụ: Kiểm tra tồn túi 500 g" autoFocus/></label><label>Hướng dẫn<textarea value={draft.instructions} onChange={(event)=>setDraft({...draft,instructions:event.target.value})} placeholder="Nói rõ kết quả cần có, vị trí đồ dùng và điều cần tránh."/></label><div className={styles.formGrid}><label>Giao cho<select value={draft.assignedTo} onChange={(event)=>setDraft({...draft,assignedTo:event.target.value})}>{profiles.map((profile)=><option value={profile.user_id} key={profile.user_id}>{profile.display_name}</option>)}</select></label><label>Mức độ<select value={draft.priority} onChange={(event)=>setDraft({...draft,priority:event.target.value})}><option value="normal">Bình thường</option><option value="urgent">Cần làm trước</option></select></label><label>Lặp lại<select value={draft.recurrence} onChange={(event)=>setDraft({...draft,recurrence:event.target.value})}><option value="once">Không lặp</option><option value="daily">Mỗi ngày</option><option value="weekdays">Thứ Hai–Thứ Sáu</option><option value="weekly">Mỗi tuần</option><option value="monthly">Mỗi tháng</option></select></label><label>{draft.recurrence === "once" ? "Ngày phải xong" : "Bắt đầu từ ngày"}<input type="date" value={draft.dueDate} onChange={(event)=>setDraft({...draft,dueDate:event.target.value})}/></label><label>Giờ phải xong<input type="time" value={draft.dueTime} onChange={(event)=>setDraft({...draft,dueTime:event.target.value})}/></label><label>Liên quan · không bắt buộc<input value={draft.referenceText} onChange={(event)=>setDraft({...draft,referenceText:event.target.value})} placeholder="Mã đơn, mẻ trà hoặc khu vực"/></label></div><label>Danh sách kiểm tra · mỗi dòng một việc<textarea value={draft.checklist} onChange={(event)=>setDraft({...draft,checklist:event.target.value})} placeholder={"Đếm số lượng\nChụp lại kết quả\nBáo nếu thiếu"}/></label><button className={styles.primary} disabled={saving||!draft.title.trim()||!draft.assignedTo}>{saving?"Đang giao…":draft.recurrence==="once"?"Giao việc":"Tạo lịch lặp"}</button></form></div>}

    {drawer === "worker" && <div className={styles.overlay} onMouseDown={(event)=>{if(event.target===event.currentTarget)setDrawer("")}}><form className={`${styles.drawer} ${styles.inviteDrawer}`} onSubmit={inviteWorker}><header><div><p>Người trong Nhà</p><h2>Mời nhân viên</h2></div><button type="button" onClick={()=>setDrawer("")} aria-label="Đóng">×</button></header><p className={styles.formNote}>Hệ thống sẽ gửi email mời. Sau khi mở link, nhân viên vào thẳng trang “Việc của tôi”.</p><label>Tên gọi<input value={invite.displayName} onChange={(event)=>setInvite({...invite,displayName:event.target.value})} placeholder="Tên nhân viên" autoFocus/></label><label>Email nhận lời mời<input type="email" value={invite.email} onChange={(event)=>setInvite({...invite,email:event.target.value})} placeholder="ten@congty.com"/></label><label>Số điện thoại · không bắt buộc<input value={invite.phone} onChange={(event)=>setInvite({...invite,phone:event.target.value})} inputMode="tel"/></label><button className={styles.primary} disabled={saving||!invite.displayName.trim()||!invite.email.trim()}>{saving?"Đang gửi…":"Gửi lời mời"}</button></form></div>}
  </main>;
}

function TaskSlip({ task, assignee, canAssign, saving, blockingId, blockNote, setBlockNote, setBlockingId, onStatus, onChecklist, onShare }) {
  const [statusLabel, StatusIcon] = STATUS[task.status] || STATUS.assigned;
  const late = OPEN_STATUSES.has(task.status) && new Date(task.due_at) < new Date();
  const done = new Set((task.checklist_done || []).map(Number));
  const checklistComplete = !task.checklist?.length || task.checklist.every((_, index) => done.has(index));
  return <article id={`task-${task.id}`} className={styles.slip} data-status={task.status} data-priority={task.priority}>
    <div className={styles.slipEdge}><span>{late ? "QUÁ HẠN" : task.priority === "urgent" ? "LÀM TRƯỚC" : timeLabel(task.due_at)}</span></div>
    <div className={styles.slipBody}><header><span className={styles.state}><StatusIcon/>{statusLabel}</span><time>{dueLabel(task.due_at)}</time></header><h3>{task.title}</h3>{task.instructions&&<p>{task.instructions}</p>}<div className={styles.meta}><span><UserRound/>{assignee?.display_name||"Chưa rõ người"}</span>{task.reference_text&&<span><b>Liên quan</b>{task.reference_text}</span>}</div>{task.checklist?.length>0&&<section className={styles.checklist}><header><b>Danh sách kiểm tra</b><span>{done.size}/{task.checklist.length}</span></header><ul>{task.checklist.map((item,index)=><li key={`${task.id}-${index}`} data-checked={done.has(index)}><button type="button" aria-pressed={done.has(index)} disabled={saving||!["assigned","in_progress","blocked"].includes(task.status)} onClick={()=>onChecklist(task,index,!done.has(index))}><i>{done.has(index)&&<Check/>}</i><span>{item}</span></button></li>)}</ul></section>}{task.status==="blocked"&&<div className={styles.blocked}><AlertTriangle/><span><b>Đang vướng</b><small>{task.blocked_note||"Chưa ghi lý do."}</small></span></div>}
      {blockingId===task.id&&<div className={styles.blockForm}><label>Đang vướng ở đâu?<textarea value={blockNote} onChange={(event)=>setBlockNote(event.target.value)} placeholder="Nói ngắn gọn điều đang chặn công việc." autoFocus/></label><div><button onClick={()=>{setBlockingId("");setBlockNote("")}}>Bỏ qua</button><button disabled={!blockNote.trim()||saving} onClick={()=>onStatus(task,"blocked",blockNote)}>Gửi cho quản lý</button></div></div>}
      <footer>{task.status==="assigned"&&<button className={styles.start} disabled={saving} onClick={()=>onStatus(task,"in_progress")}><Play/>Bắt đầu</button>}{task.status==="in_progress"&&<button className={styles.complete} disabled={saving||!checklistComplete} title={checklistComplete?"Ghi nhận việc đã hoàn tất.":"Đánh dấu đủ danh sách kiểm tra trước khi hoàn tất."} onClick={()=>onStatus(task,"completed")}><Check/>Hoàn tất</button>}{task.status==="blocked"&&<button className={styles.start} disabled={saving} onClick={()=>onStatus(task,"in_progress")}><Play/>Làm tiếp</button>}{OPEN_STATUSES.has(task.status)&&blockingId!==task.id&&<button className={styles.problem} disabled={saving} onClick={()=>setBlockingId(task.id)}><AlertTriangle/>Báo vướng</button>}{canAssign&&OPEN_STATUSES.has(task.status)&&<button className={styles.share} disabled={saving} onClick={()=>onShare(task)} title="Mở menu chia sẻ của điện thoại để gửi phiếu qua Zalo, SMS hoặc ứng dụng khác."><Share2/>Gửi nhắc</button>}{canAssign&&OPEN_STATUSES.has(task.status)&&<button className={styles.cancel} disabled={saving} onClick={()=>onStatus(task,"cancelled")}>Hủy việc</button>}</footer>
    </div>
  </article>;
}
