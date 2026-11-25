"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays, X } from "lucide-react";
import { houseDateKey } from "@/lib/dashboard-calendar";
import { followupDayAfter, followupPatch } from "@/lib/customer-followup-entry";
import styles from "./CustomerFollowupSheet.module.css";

export default function CustomerFollowupSheet({ customer, onClose, onSave, onSaved }) {
  const dialog = useRef(null);
  const pending = useRef(false);
  const attempt = useRef(null);
  const [base, setBase] = useState(customer);
  const [result, setResult] = useState("");
  const [action, setAction] = useState("");
  const [day, setDay] = useState("");
  const [reschedule, setReschedule] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const today = houseDateKey();
  useEffect(() => {
    const element = dialog.current;
    element.showModal();
    return () => element.close();
  }, []);

  async function submit(event) {
    event.preventDefault();
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      const draft = { result, action, day, reschedule };
      const key = JSON.stringify([base.updated_at, draft]);
      if (attempt.current?.key !== key) attempt.current = { key, patch: followupPatch(base, draft) };
      const response = await onSave(base, attempt.current.patch);
      if (response.conflict) {
        setBase(response.conflict);
        setConflict(true);
        attempt.current = null;
      } else {
        onSaved(response.saved);
      }
    } catch (cause) {
      setError(cause.message || "Chưa lưu được kết quả. Vui lòng thử lại.");
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  return <dialog ref={dialog} className={styles.sheet} aria-labelledby="followup-title" onCancel={e => { e.preventDefault(); if (!pending.current) onClose(); }}>
    <form onSubmit={submit}>
      <header><div><small>{customer.business_name}</small><h2 id="followup-title">Ghi kết quả chăm sóc</h2></div>
        <button type="button" aria-label="Đóng" disabled={busy} onClick={onClose}><X size={20}/></button></header>
      <fieldset disabled={busy}>
        {conflict && <section className={styles.conflict} role="alert"><strong>Hồ sơ vừa được cập nhật</strong><p>Đọc ghi chú mới nhất rồi bấm lưu để thêm kết quả của bạn.</p><p>{base.notes || "Chưa có ghi chú."}</p></section>}
        <div className={styles.current}><CalendarDays size={18}/><div><small>Lịch hiện tại</small><strong>{base.next_action || "Chưa đặt bước tiếp theo"}</strong>
          {base.next_action_at && <span>{new Intl.DateTimeFormat("vi-VN", {dateStyle:"medium", timeZone:"Asia/Ho_Chi_Minh"}).format(new Date(base.next_action_at))}</span>}</div></div>
        <label>Kết quả trao đổi<textarea autoFocus required rows={3} maxLength={1000} value={result} onChange={e => setResult(e.target.value)} placeholder="Ví dụ: Khách thích hương Shan Mật, muốn thử pha với sữa yến mạch."/></label>
        <label className={styles.toggle}><input type="checkbox" checked={reschedule} onChange={e => setReschedule(e.target.checked)}/>Đặt lịch chăm sóc tiếp theo</label>
        {reschedule && <div className={styles.schedule}><label>Bước tiếp theo<input required maxLength={250} value={action} onChange={e => setAction(e.target.value)} placeholder="Gửi báo giá 10 kg Shan Mật"/></label>
          <label>Ngày hẹn<input type="date" required min={today} value={day} onChange={e => setDay(e.target.value)}/></label>
          <div className={styles.days}>{[[1,"Ngày mai"], [3,"Sau 3 ngày"], [7,"Sau 1 tuần"]].map(([days,label]) => {
            const value = followupDayAfter(today, days);
            return <button key={days} type="button" aria-pressed={day === value} onClick={() => setDay(value)}>{label}</button>;
          })}</div></div>}
      </fieldset>
      {error && <p role="alert">{error}</p>}
      <footer><button type="submit" disabled={busy}>{busy ? "Đang lưu…" : conflict ? "Lưu sau khi đối chiếu" : reschedule ? "Lưu kết quả và lịch hẹn" : "Lưu kết quả"}</button></footer>
    </form>
  </dialog>;
}
