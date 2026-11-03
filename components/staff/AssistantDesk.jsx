"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, ClipboardList, Sparkles } from "lucide-react";
import { dashboardTextError, PLAN_TITLE_LIMIT } from "@/lib/dashboard-task-input";
import styles from "./AssistantDesk.module.css";

const ERRORS = {
  not_authenticated: "Phiên đăng nhập đã hết hoặc tài khoản không có quyền quản lý. Hãy đăng nhập lại.",
  openai_not_configured: "Chưa cấu hình kết nối AI cho ứng dụng. Bạn vẫn có thể mở đơn và thêm việc thủ công.",
  invalid_input: "Vui lòng nhập nội dung hợp lệ và không vượt quá giới hạn.",
  rate_limited: "Đã đạt giới hạn xử lý tạm thời. Hãy thử lại sau.",
  openai_unreachable: "Không kết nối được AI. Vui lòng thử lại.",
  openai_failed: "AI chưa xử lý được nội dung. Vui lòng thử lại.",
  invalid_ai_response: "Không đọc được kết quả an toàn từ AI. Hãy thử lại.",
  rate_limit_unavailable: "Chưa kiểm tra được giới hạn sử dụng AI. Hãy thử lại sau.",
  auth_unavailable: "Chưa kiểm tra được quyền truy cập. Hãy thử lại sau.",
  ai_refused: "AI chưa thể xử lý yêu cầu này. Vui lòng kiểm tra và thử lại.",
};
const empty = value => typeof value === "string" || typeof value === "number" ? String(value) : "";
const validDate = value => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
};
const textLimit = 12000;

export default function AssistantDesk({ supabase, userId }) {
  const [text, setText] = useState("");
  const [source, setSource] = useState("");
  const [draft, setDraft] = useState(null);
  const [orderNote, setOrderNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [savingKey, setSavingKey] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const extract = async event => {
    event.preventDefault();
    if (!text.trim() || busy) return;
    setBusy(true); setError(""); setNotice(""); setDraft(null); setSource(""); setOrderNote("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("not_authenticated");
      const response = await fetch("/api/staff/assistant/extract", {
        method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session.access_token}` },
        body: JSON.stringify({ text: text.trim() }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.draft) throw new Error(body.error || "openai_failed");
      const result = body.draft;
      const invalidDates = (Array.isArray(result.tasks) ? result.tasks : []).some(task => task.due_date && !validDate(task.due_date));
      setSource(text.trim());
      setDraft({
        ...result,
        customer: { name: empty(result.customer?.name), phone: empty(result.customer?.phone), address: empty(result.customer?.address) },
        items: Array.isArray(result.items) ? result.items.map(item => ({ product: empty(item.product), quantity: empty(item.quantity), unit: empty(item.unit), price: empty(item.price) })) : [],
        tasks: Array.isArray(result.tasks) ? result.tasks.map(task => ({ title: empty(task.title), due_date: validDate(task.due_date) ? task.due_date : "", key: `assistant-${crypto.randomUUID()}`, saved: false })) : [],
        evidence: Array.isArray(result.evidence) ? result.evidence.filter(e => e?.quote && text.includes(e.quote)) : [],
        missing: Array.isArray(result.missing) ? result.missing : [], warnings: [...(Array.isArray(result.warnings) ? result.warnings : []), ...(invalidDates ? ["Có ngày AI đề xuất không hợp lệ; hãy tự chọn lại trước khi lưu việc."] : [])],
      });
    } catch (err) { setError(ERRORS[err.message] || "Chưa xử lý được nội dung. Vui lòng thử lại."); }
    finally { setBusy(false); }
  };

  const updateCustomer = (key, value) => setDraft(current => ({ ...current, customer: { ...current.customer, [key]: value } }));
  const updateItem = (index, key, value) => setDraft(current => ({ ...current, items: current.items.map((item, i) => i === index ? { ...item, [key]: value } : item) }));
  const updateTask = (index, key, value) => setDraft(current => ({ ...current, tasks: current.tasks.map((task, i) => i === index ? { ...task, [key]: value } : task) }));
  const saveTask = async (task, index) => {
    const validation = dashboardTextError(task.title, PLAN_TITLE_LIMIT, "Việc cần làm", true);
    if (validation) { setError(validation); return; }
    if (task.due_date && !validDate(task.due_date)) { setError("Ngày dự kiến không hợp lệ. Hãy chọn lại ngày trước khi lưu."); return; }
    setSavingKey(task.key); setError(""); setNotice("");
    try {
      const { error: saveError } = await supabase.from("dashboard_plans").upsert({
        user_id: userId, seed_key: task.key, kind: "task", title: task.title.trim(), notes: "", event_on: task.due_date || null,
        notify_telegram: false, remind_days: 1, status: "pending",
      }, { onConflict: "user_id,seed_key", ignoreDuplicates: true });
      if (saveError) throw saveError;
      const { data: saved, error: readError } = await supabase.from("dashboard_plans")
        .select("title,event_on").eq("user_id", userId).eq("seed_key", task.key).maybeSingle();
      if (readError || !saved) throw new Error("verify_failed");
      if (saved.title !== task.title.trim() || (saved.event_on || "") !== (task.due_date || "")) {
        setError("Việc đã được lưu với nội dung khác sau lần thử trước. Hãy mở Đang chờ trên bảng điều khiển để kiểm tra và sửa.");
        return;
      }
      updateTask(index, "saved", true);
      setNotice("Đã lưu việc vào mục Đang chờ trên bảng điều khiển.");
    } catch { setError("Chưa xác nhận được việc đã lưu. Có thể bấm lưu lại ở đây; hệ thống sẽ tránh tạo trùng trong lần thử này."); }
    finally { setSavingKey(""); }
  };
  const openOrder = () => {
    try {
      const itemsNote = draft.items.map(item => [item.product, [item.quantity, item.unit].filter(Boolean).join(" "), item.price ? `giá ${item.price}` : ""].filter(Boolean).join(" · ")).filter(Boolean).join("; ");
      const combinedNote = [itemsNote ? `Thông tin tham khảo từ chat, cần xác nhận: ${itemsNote}` : "", orderNote.trim()].filter(Boolean).join("\n");
      if (combinedNote.length > 2000) { setError("Ghi chú và thông tin trà vượt 2.000 ký tự. Hãy rút gọn trước khi mở đơn."); return; }
      window.sessionStorage.setItem("hl-assistant-order-draft-v1", JSON.stringify({
        customerName: draft.customer.name.trim(), contact: draft.customer.phone.trim(), address: draft.customer.address.trim(), note: combinedNote,
      }));
      window.location.assign("/admin/orders?assistantDraft=1#orders");
    } catch { setError("Không chuyển được thông tin sang đơn hàng. Hãy mở Đơn hàng và nhập thủ công."); }
  };

  return <main className={styles.page}>
    <header className={styles.bar}><Link href="/admin"><ArrowLeft size={18}/> Bảng điều khiển</Link><span>HOUSE OF HOÀNG LONG</span></header>
    <div className={styles.wrap}>
      <div className={styles.intro}><p className={styles.eyebrow}>TRỢ LÝ VẬN HÀNH</p><h1>Một cuộc trao đổi.<br/><em>Những việc rõ ràng.</em></h1><p>Dán tin nhắn hoặc ghi chú. Trợ lý giúp bạn tóm tắt và chuẩn bị việc cần làm, trước khi bạn quyết định lưu.</p></div>
      <div className={styles.layout}>
        <form className={styles.inputPanel} onSubmit={extract}>
          <div className={styles.sectionHead}><span>01</span><div><h2>Nội dung cần xử lý</h2><p>Dán tin nhắn hoặc gõ yêu cầu bằng tiếng Việt.</p></div></div>
          <label htmlFor="assistant-chat">Nội dung trao đổi</label>
          <textarea id="assistant-chat" value={text} maxLength={textLimit} disabled={busy || Boolean(savingKey)} onChange={event => {setText(event.target.value); if (draft) {setDraft(null); setSource(""); setNotice("");}}} placeholder="Ví dụ: Chị Mai muốn thử hồng trà mật. Nhắc chuẩn bị mẫu và theo dõi sau khi gửi…"/>
          <div className={styles.count}>{text.length.toLocaleString("vi-VN")} / {textLimit.toLocaleString("vi-VN")}</div>
          <p className={styles.privacy}>Khi bấm phân tích, nội dung này (kể cả thông tin khách nếu có) được gửi tới OpenAI. App không tự lưu đoạn chat; chỉ nhập thông tin cần thiết và kiểm tra kết quả trước khi lưu.</p>
          <button className={styles.primary} disabled={busy || !text.trim()}><Sparkles size={18}/>{busy ? "Đang đọc nội dung…" : "Phân tích nội dung"}</button>
        </form>
        <section className={styles.result} aria-live="polite">
          <div className={styles.sectionHead}><span>02</span><div><h2>Kết quả để bạn xem lại</h2><p>Chưa tạo đơn, gửi tin nhắn hay lưu việc tự động.</p></div></div>
          {error && <p className={styles.error} role="alert">{error}</p>}
          {notice && <p className={styles.notice} role="status"><Check size={17}/>{notice}</p>}
          {!draft && <div className={styles.empty}><ClipboardList size={26}/><h3>Khi bạn sẵn sàng</h3><p>Kết quả sẽ hiện ở đây. Bạn có thể sửa từng thông tin trước khi sử dụng.</p></div>}
          {draft && <div className={styles.sections}>
            <section className={styles.block}><div className={styles.blockHead}><h3>Tóm tắt</h3><span>AI đề xuất</span></div><p>{draft.summary || "Chưa có nội dung tóm tắt."}</p></section>
            {(draft.missing.length > 0 || draft.warnings.length > 0) && <section className={styles.attention}><h3>Cần kiểm tra</h3><ul>{[...draft.missing, ...draft.warnings].map((item, i) => <li key={i}>{item}</li>)}</ul></section>}
            <section className={styles.block}><div className={styles.blockHead}><h3>Khách hàng</h3><span>Chỉnh được</span></div><p className={styles.subtle}>Chưa tự kiểm tra khách hay đơn trùng. Hãy đối chiếu trong hệ thống trước khi tạo mới.</p><div className={styles.fields}>
              <label>Tên khách hàng<input value={draft.customer.name} onChange={e => updateCustomer("name", e.target.value)} placeholder="Chưa rõ"/></label>
              <label>Số điện thoại<input type="tel" value={draft.customer.phone} onChange={e => updateCustomer("phone", e.target.value)} placeholder="Chưa rõ"/></label>
              <label className={styles.wide}>Địa chỉ<input value={draft.customer.address} onChange={e => updateCustomer("address", e.target.value)} placeholder="Chưa rõ"/></label>
            </div></section>
            <section className={styles.block}><div className={styles.blockHead}><h3>Trà & số lượng được nhắc tới</h3><span>Chưa phải đơn hàng</span></div>
              {draft.items.length ? draft.items.map((item, index) => <div key={index} className={styles.itemFields}>
                <label>Sản phẩm<input value={item.product} onChange={e => updateItem(index, "product", e.target.value)} placeholder="Chưa rõ"/></label>
                <label>Số lượng<input inputMode="decimal" value={item.quantity} onChange={e => updateItem(index, "quantity", e.target.value)} placeholder="—"/></label>
                <label>Đơn vị<input value={item.unit} onChange={e => updateItem(index, "unit", e.target.value)} placeholder="—"/></label>
                <label>Giá nhắc tới<input value={item.price} onChange={e => updateItem(index, "price", e.target.value)} placeholder="—"/></label>
              </div>) : <p>Không thấy sản phẩm được nêu rõ.</p>}
              <p className={styles.subtle}>Khi mở đơn, thông tin trà này được đưa vào ghi chú tham khảo. Bạn vẫn cần chọn sản phẩm, loại đơn và xác nhận giá trong hệ thống.</p>
            </section>
            <section className={styles.block}><div className={styles.blockHead}><h3>Việc cần làm</h3><span>Lưu từng việc</span></div>
              {draft.tasks.length ? draft.tasks.map((task, index) => <div className={styles.task} key={task.key}>
                <label>Việc<input value={task.title} maxLength={PLAN_TITLE_LIMIT} disabled={task.saved || Boolean(savingKey)} onChange={e => updateTask(index, "title", e.target.value)}/></label>
                <label>Ngày dự kiến<input type="date" value={task.due_date} disabled={task.saved || Boolean(savingKey)} onChange={e => updateTask(index, "due_date", e.target.value)}/></label>
                <button type="button" disabled={task.saved || Boolean(savingKey) || !task.title.trim()} onClick={() => saveTask(task,index)}>{task.saved ? "Đã lưu" : savingKey === task.key ? "Đang lưu…" : "Lưu việc"}</button>
              </div>) : <p>Chưa tìm thấy việc cần lưu.</p>}
              <p className={styles.subtle}>Việc được lưu vào Đang chờ của bạn; chưa tự gửi thông báo Telegram.</p>
            </section>
            {draft.evidence.length > 0 && <details className={styles.evidence}><summary>Xem đoạn gốc liên quan</summary>{draft.evidence.map((e,index) => <blockquote key={index}><strong>{empty(e.field)}</strong><p>“{e.quote}”</p></blockquote>)}</details>}
            <section className={styles.order}><div><h3>Cần tạo đơn?</h3><p>Tên, số điện thoại và địa chỉ sẽ chuyển sang biểu mẫu. Thông tin trà phía trên sẽ được thêm vào ghi chú tham khảo cùng ghi chú bên dưới. Bạn tự chọn sản phẩm trước khi lưu đơn.</p></div><label>Ghi chú cho đơn<textarea value={orderNote} onChange={e => setOrderNote(e.target.value)} maxLength={2000} placeholder="Ghi chú bạn muốn đưa vào đơn (không bắt buộc)"/></label><button type="button" disabled={Boolean(savingKey)} onClick={openOrder}>Mở biểu mẫu tạo đơn <ArrowRight size={17}/></button></section>
            <details className={styles.source}><summary>Xem lại nội dung đã gửi để phân tích</summary><p>{source}</p></details>
          </div>}
        </section>
      </div>
    </div>
  </main>;
}
