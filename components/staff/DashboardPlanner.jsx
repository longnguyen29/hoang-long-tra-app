"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bell, CalendarDays, Check, ChevronLeft, ChevronRight, Circle, PencilLine, Plus, X } from "lucide-react";
import { calendarCells, houseDateKey, subtractCalendarMonth } from "@/lib/dashboard-calendar";
import styles from "./DashboardPlanner.module.css";
import GovernmentObligations from "./GovernmentObligations";

const MONTHS = ["Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6", "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"];
const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const KIND_LABEL = { feature: "Chức năng chờ thử", event: "Lịch hẹn", task: "Việc cần làm", obligation: "Nghĩa vụ nhà nước" };
const dateLabel = (value) => value ? new Intl.DateTimeFormat("vi-VN", { day: "numeric", month: "numeric", year: "numeric" }).format(new Date(`${value}T12:00:00Z`)) : "Chưa hẹn ngày";
const dateKey = (year, month, day) => `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
const taskDate = (dueAt) => houseDateKey(new Date(dueAt));
const emptyDraft = () => ({ title: "", kind: "feature", notes: "", event_on: "", remind_days: 1, notify_telegram: false });

export default function DashboardPlanner({ supabase }) {
  const today = houseDateKey();
  const [year, setYear] = useState(Number(today.slice(0, 4)));
  const [selectedDate, setSelectedDate] = useState(today);
  const [plans, setPlans] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [obligationError, setObligationError] = useState("");
  const [draft, setDraft] = useState(emptyDraft);
  const [editingId, setEditingId] = useState("");
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await supabase.rpc("ensure_government_obligation_occurrences", { p_year: year });
      setObligationError(result.error ? "Chưa cập nhật được các kỳ nghĩa vụ vào lịch. Hãy thử tải lại sau khi cập nhật database." : "");
    } catch { setObligationError("Chưa cập nhật được các kỳ nghĩa vụ vào lịch."); }
    const [plansResult, tasksResult] = await Promise.all([
      supabase.from("dashboard_plans").select("*").order("created_at", { ascending: false }),
      supabase.from("work_tasks").select("id,title,due_at,status").gte("due_at", `${year - 1}-12-30T00:00:00Z`).lt("due_at", `${year + 1}-01-03T00:00:00Z`),
    ]);
    setLoading(false);
    if (plansResult.error || tasksResult.error) {
      setError("Chưa tải được mục chờ hoặc lịch. Thử làm mới trang sau khi cập nhật database.");
      return;
    }
    setError("");
    setPlans(plansResult.data || []);
    setTasks(tasksResult.data || []);
  }, [supabase, year]);

  useEffect(() => { load(); }, [load]);

  const pending = useMemo(() => plans.filter((item) => item.status === "pending").sort((a, b) => {
    if (!a.event_on) return -1;
    if (!b.event_on) return 1;
    return a.event_on.localeCompare(b.event_on);
  }), [plans]);
  const visiblePending = pending.filter(item => item.kind !== "obligation" || item.event_on <= today || subtractCalendarMonth(item.event_on) <= today);
  const done = plans.filter((item) => item.status === "done");
  const dated = useMemo(() => {
    const byDate = new Map();
    const add = (key, item) => byDate.set(key, [...(byDate.get(key) || []), item]);
    pending.filter((item) => item.event_on?.startsWith(String(year))).forEach((item) => add(item.event_on, { ...item, source: "plan" }));
    tasks.filter((item) => !["completed", "cancelled"].includes(item.status)).forEach((item) => {
      const key = taskDate(item.due_at);
      if (key.startsWith(String(year))) add(key, { ...item, source: "work" });
    });
    return byDate;
  }, [pending, tasks, year]);
  const selectedItems = dated.get(selectedDate) || [];

  const startNew = (date = "") => {
    setDraft({ ...emptyDraft(), kind: date ? "event" : "feature", event_on: date, notify_telegram: Boolean(date) });
    setEditingId("");
    setShowForm(true);
  };
  const startEdit = (item) => {
    if (item.kind === "obligation") return;
    setDraft({ title: item.title, kind: item.kind, notes: item.notes, event_on: item.event_on || "", remind_days: item.remind_days, notify_telegram: item.notify_telegram });
    setEditingId(item.id);
    setShowForm(true);
  };
  const save = async (event) => {
    event.preventDefault();
    if (!draft.title.trim()) return;
    if (draft.notify_telegram && !draft.event_on) { setError("Chọn ngày trước khi bật nhắc Telegram."); return; }
    setSaving(true);
    setError("");
    const fields = {
      title: draft.title.trim(), kind: draft.kind, notes: draft.notes.trim(),
      event_on: draft.event_on || null, remind_days: Number(draft.remind_days),
      notify_telegram: Boolean(draft.event_on && draft.notify_telegram), updated_at: new Date().toISOString(),
    };
    const result = editingId
      ? await supabase.from("dashboard_plans").update(fields).eq("id", editingId)
      : await supabase.from("dashboard_plans").insert(fields);
    setSaving(false);
    if (result.error) { setError("Chưa lưu được mục này. Kiểm tra nội dung và thử lại."); return; }
    setShowForm(false);
    setEditingId("");
    await load();
  };
  const setStatus = async (item, status) => {
    setSaving(true);
    const { error: updateError } = await supabase.from("dashboard_plans").update({
      status, completed_at: status === "done" ? new Date().toISOString() : null, updated_at: new Date().toISOString(),
    }).eq("id", item.id);
    setSaving(false);
    if (updateError) { setError("Chưa đổi được trạng thái. Thử lại."); return; }
    await load();
  };

  return <section className={styles.planner} aria-label="Việc đang chờ và lịch năm">
    <div className={styles.header}>
      <div><span className={styles.eyebrow}>Ghi nhớ & sắp tới</span><h2>Đang chờ · Lịch năm</h2><p>Mục chưa xong vẫn ở đây cho đến khi bạn đánh dấu hoàn tất.</p></div>
      <button type="button" className={styles.primaryButton} onClick={() => startNew()}><Plus /> Thêm mục</button>
    </div>
    {error && <p className={styles.error} role="alert">{error}</p>}
    <div id="government-obligations" className={styles.obligationAnchor}><GovernmentObligations supabase={supabase} plans={plans} onChanged={load}/></div>
    {obligationError && <p className={styles.error} role="alert">{obligationError}</p>}
    <div className={styles.columns}>
      <div className={styles.pending}>
        <div className={styles.subhead}><h3>Đang chờ</h3><span>{visiblePending.length}</span></div>
        {loading ? <p className={styles.quiet}>Đang tải…</p> : visiblePending.length === 0 ? <p className={styles.quiet}>Không có mục nào đang chờ.</p> : visiblePending.map((item) => <article className={styles.plan} key={item.id}>
          <button type="button" className={styles.complete} onClick={() => setStatus(item, "done")} disabled={saving} aria-label={`Hoàn tất ${item.title}${item.kind === "obligation" && item.event_on ? `, kỳ ${dateLabel(item.event_on)}` : ""}`}><Circle /></button>
          <div className={styles.planBody}>
            <div className={styles.meta}><span>{KIND_LABEL[item.kind]}</span>{item.event_on && <time dateTime={item.event_on}>{dateLabel(item.event_on)}</time>}</div>
            <b>{item.title}</b>
            {item.notes && <p>{item.notes}</p>}
            {item.notify_telegram && item.event_on && <small className={styles.telegram}><Bell /> Telegram trước {item.reminder_unit === "month" ? "1 tháng theo lịch" : item.remind_days === 0 ? "đúng ngày" : `${item.remind_days} ngày`}{item.notified_event_on === item.event_on ? " · Đã gửi" : ""}</small>}
            {item.notification_last_error && <small className={styles.sendError}>Telegram chưa gửi được; hệ thống sẽ thử lại.</small>}
            <div className={styles.planActions}>{item.href && <Link href={item.kind === "obligation" ? "/admin#government-obligations" : item.href}>Mở công việc <ChevronRight /></Link>}{item.kind !== "obligation" && <button type="button" onClick={() => startEdit(item)}><PencilLine /> Sửa</button>}</div>
          </div>
        </article>)}
        {done.length > 0 && <details className={styles.done}><summary>Đã xong ({done.length})</summary>{done.map((item) => <div key={item.id}><Check /><span>{item.title}{item.kind === "obligation" && item.event_on ? ` · ${dateLabel(item.event_on)}` : ""}</span><button type="button" disabled={saving} onClick={() => setStatus(item, "pending")}>Mở lại</button></div>)}</details>}
      </div>
      <div className={styles.calendar}>
        <div className={styles.yearHead}><div><CalendarDays /><h3>Lịch năm {year}</h3></div><div><button type="button" onClick={() => { setYear(year - 1); setSelectedDate(`${year - 1}-01-01`); }} aria-label="Năm trước"><ChevronLeft /></button><button type="button" onClick={() => { setYear(Number(today.slice(0, 4))); setSelectedDate(today); }}>Hôm nay</button><button type="button" onClick={() => { setYear(year + 1); setSelectedDate(`${year + 1}-01-01`); }} aria-label="Năm sau"><ChevronRight /></button></div></div>
        <div className={styles.months}>{MONTHS.map((month, monthIndex) => <div className={styles.month} key={month}>
          <h4>{month}</h4><div className={styles.days}>{WEEKDAYS.map((day) => <span className={styles.weekday} key={day}>{day}</span>)}{calendarCells(year, monthIndex).map((day, index) => day ? <button type="button" key={index} className={styles.day} data-today={dateKey(year, monthIndex, day) === today} data-selected={dateKey(year, monthIndex, day) === selectedDate} data-has-items={dated.has(dateKey(year, monthIndex, day))} aria-label={`${day} ${month} ${year}${dated.has(dateKey(year, monthIndex, day)) ? `, ${dated.get(dateKey(year, monthIndex, day)).length} việc` : ""}`} onClick={() => setSelectedDate(dateKey(year, monthIndex, day))}>{day}</button> : <i key={index} />)}</div>
        </div>)}</div>
        <div className={styles.agenda}><div className={styles.subhead}><h4>{dateLabel(selectedDate)}</h4><button type="button" onClick={() => startNew(selectedDate)}><Plus /> Thêm lịch</button></div>{selectedItems.length ? selectedItems.map((item) => <div className={styles.agendaItem} key={`${item.source}-${item.id}`}><span>{item.source === "work" ? "Sổ việc" : KIND_LABEL[item.kind]}</span><b>{item.title}</b>{item.source === "work" ? <Link href={`/admin/work#task-${item.id}`}>Mở <ChevronRight /></Link> : item.kind === "obligation" ? <Link href="#government-obligations">Mở nghĩa vụ <ChevronRight /></Link> : <button type="button" onClick={() => startEdit(item)}>Sửa <ChevronRight /></button>}</div>) : <p className={styles.quiet}>Chưa có mục nào trong ngày này.</p>}</div>
      </div>
    </div>
    {showForm && <div className={styles.dialogBackdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowForm(false); }}><form className={styles.form} onSubmit={save} aria-label={editingId ? "Sửa mục đang chờ" : "Thêm mục đang chờ"}>
      <div className={styles.formHead}><h3>{editingId ? "Sửa mục" : "Thêm mục"}</h3><button type="button" onClick={() => setShowForm(false)} aria-label="Đóng"><X /></button></div>
      <label>Tiêu đề<input required maxLength={180} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Việc gì cần nhớ?" /></label>
      <label>Loại<select value={draft.kind} onChange={(event) => setDraft({ ...draft, kind: event.target.value })}><option value="feature">Chức năng chờ thử</option><option value="event">Lịch hẹn</option><option value="task">Việc cần làm</option></select></label>
      <label>Ghi chú<textarea maxLength={3000} rows={3} value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} placeholder="Tình trạng, bước tiếp theo hoặc điều cần kiểm tra" /></label>
      <div className={styles.formRow}><label>Ngày diễn ra<input type="date" value={draft.event_on} onChange={(event) => setDraft({ ...draft, event_on: event.target.value, notify_telegram: event.target.value ? draft.notify_telegram : false })} /></label><label>Nhắc trước (ngày)<input type="number" required min="0" max="30" step="1" value={draft.remind_days} onChange={(event) => setDraft({ ...draft, remind_days: event.target.value })} /></label></div>
      <label className={styles.toggle}><input type="checkbox" checked={draft.notify_telegram} disabled={!draft.event_on} onChange={(event) => setDraft({ ...draft, notify_telegram: event.target.checked })} /> Nhắc vào Telegram Hoàng Long hiện có</label>
      <p className={styles.formHint}>Bot gửi một lần trong khoảng 07:00–08:00 giờ Việt Nam khi đến ngày nhắc; mục vẫn ở “Đang chờ” tới khi hoàn tất.</p>
      <button type="submit" className={styles.primaryButton} disabled={saving || !draft.title.trim()}>{saving ? "Đang lưu…" : "Lưu mục"}</button>
    </form></div>}
  </section>;
}
