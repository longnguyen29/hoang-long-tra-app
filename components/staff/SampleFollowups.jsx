"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CheckCheck, Copy, ExternalLink, MessageCircle, Pause, Play, RefreshCw, Save, Square } from "lucide-react";
import { buildSampleFollowupMessage, sampleFollowupPhone } from "@/lib/sample-followup.js";
import styles from "./SampleFollowups.module.css";

const FIELDS = "id,source_kind,source_id,sample_request_id,order_id,opportunity_id,sent_at,due_at,channel,status,customer_name,phone,attempts,claimed_at,last_error,sms_queued_at,telegram_notified_at,telegram_error,notes,created_at,resolved_at";
const RESOLVED = new Set(["replied", "contacted", "cancelled"]);
const HISTORY = new Set(["queued", "replied", "contacted", "cancelled"]);
const STATUS_LABELS = {
  pending: "Chờ hỏi thăm", sending: "Đang xử lý", queued: "Điện thoại gửi đã nhận",
  failed: "Cần kiểm tra", replied: "Khách đã phản hồi", contacted: "Đã liên hệ", cancelled: "Đã dừng",
};
const UNCERTAIN = new Set(["receipt_unconfirmed", "submission_uncertain"]);
const STOP_REASONS = {
  sample_converted: "Khách đã chuyển sang mua hàng.",
  sample_declined: "Yêu cầu mẫu đã được từ chối.",
  relationship_progressed: "Cơ hội đã chuyển sang giai đoạn tiếp theo.",
  feedback_received: "Đã ghi nhận phản hồi về mẫu.",
  commercial_order_received: "Khách đã có đơn mua hàng.",
  duplicate_active_contact: "Đã có lịch hỏi thăm khác cho liên hệ này.",
  do_not_contact: "Khách đã được đánh dấu không liên hệ.",
  delivery_problem: "Mẫu đang có vấn đề giao nhận cần xử lý.",
  source_removed: "Đơn hoặc yêu cầu mẫu đã được xóa.",
  invalid_phone: "Chưa có số điện thoại hợp lệ.",
  sample_not_sent: "Yêu cầu mẫu chưa ở trạng thái đã gửi.",
  shipment_not_sent: "Đơn chưa ở trạng thái đã gửi mẫu.",
  order_not_pure_sample: "Đơn có sản phẩm mua hàng; cần theo dõi qua đơn.",
};
const dateTime = (value) => value && !Number.isNaN(new Date(value).getTime())
  ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(value)) : "—";
const unavailable = (error) => ["42P01", "PGRST202", "PGRST205"].includes(error?.code);

function FollowupRow({ row, busy, onAction }) {
  const [note, setNote] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const noteId = useId();
  useEffect(() => { setNote(""); }, [row.notes]);
  const resolved = RESOLVED.has(row.status);
  const sending = row.status === "sending";
  const uncertain = UNCERTAIN.has(row.last_error);
  const activeSending = sending && (!uncertain || !row.claimed_at || Date.now() - new Date(row.claimed_at).getTime() < 20 * 60000);
  const disabled = busy || activeSending;
  const recipient = sampleFollowupPhone(row.phone).replace(/^\+84/, "0");
  const draft = buildSampleFollowupMessage(row);
  const sourceId = row.order_id || row.sample_request_id || row.source_id;
  const isOrder = row.source_kind === "order" || Boolean(row.order_id);

  async function copyDraft() {
    try {
      await navigator.clipboard.writeText(draft);
      setCopyMessage("Đã sao chép bản nháp.");
    } catch {
      setCopyMessage("Chọn nội dung bản nháp để sao chép.");
    }
  }

  return <article className={styles.row}>
    <div className={styles.rowHeader}>
      <div className={styles.identity}>
        <h3>{row.customer_name || "Khách nhận mẫu"}</h3>
        <p>{isOrder ? "Đơn mẫu" : "Yêu cầu mẫu"} {sourceId || ""}{recipient ? ` · •••• ${recipient.slice(-4)}` : " · Chưa có số di động hợp lệ"}</p>
      </div>
      <span className={styles.status} data-status={row.status}>{row.channel === "telegram" && row.telegram_notified_at && !resolved ? "Cần tự liên hệ" : row.channel === "telegram" && row.status === "queued" ? "Đã nhắc nội bộ" : STATUS_LABELS[row.status] || "Cần kiểm tra"}</span>
    </div>
    <div className={styles.rowMeta}>
      <span>Đã gửi mẫu <time dateTime={row.sent_at || undefined}>{dateTime(row.sent_at)}</time></span>
      <span>Hỏi thăm <time dateTime={row.due_at || undefined}>{dateTime(row.due_at)}</time></span>
      <span>{row.channel === "telegram" ? "Telegram nội bộ · tự liên hệ khách" : "SMS tự động"}</span>
    </div>
    {row.sms_queued_at && <p className={styles.receipt}>Điện thoại gửi đã nhận SMS lúc {dateTime(row.sms_queued_at)}; chưa xác nhận tin đã đến khách.</p>}
    {row.telegram_notified_at
      ? <p className={styles.receipt}>Telegram đã nhận thông báo · {dateTime(row.telegram_notified_at)}</p>
      : row.telegram_error
        ? <p className={styles.rowError}>Chưa gửi được thông báo Telegram. Kiểm tra kênh nội bộ.</p>
        : (row.status === "queued" || sending || row.status === "failed") && <p className={styles.receipt}>Telegram chưa có xác nhận thông báo.</p>}
    {(uncertain || row.status === "failed") && !activeSending && <p className={styles.rowError}>{uncertain
      ? "Chưa xác nhận kết quả, cần kiểm tra điện thoại gửi. Hệ thống không tự gửi lại mục này."
      : "Chưa xử lý được lần hỏi thăm này. Kiểm tra số điện thoại và kênh gửi trước khi liên hệ."}</p>}
    {row.status === "cancelled" && row.last_error && <p className={styles.receipt}>{STOP_REASONS[row.last_error] || "Hệ thống đã dừng lịch theo tình trạng hiện tại của khách và mẫu."}</p>}
    {!resolved && <div className={styles.actions}>
      <button type="button" disabled={disabled} onClick={() => onAction(row, "replied", note)}><MessageCircle aria-hidden="true"/>Khách đã phản hồi</button>
      <button type="button" disabled={disabled} onClick={() => onAction(row, "contacted", note)}><CheckCheck aria-hidden="true"/>Đã liên hệ</button>
      <button type="button" className={styles.stop} disabled={disabled} onClick={() => onAction(row, "cancelled", note)}><Square aria-hidden="true"/>Dừng</button>
    </div>}
    <details className={styles.details}>
      <summary>Bản nháp & ghi chú</summary>
      <div className={styles.draft}>
        <p>{draft}</p>
        <div className={styles.actions}>
          <button type="button" onClick={copyDraft} disabled={!draft}><Copy aria-hidden="true"/>Sao chép bản nháp</button>
          {recipient && <a href={`https://zalo.me/${recipient}`} target="_blank" rel="noopener noreferrer"><ExternalLink aria-hidden="true"/>Mở Zalo để tự gửi</a>}
          {row.opportunity_id && <Link href={`/admin/pipeline?opportunity=${encodeURIComponent(row.opportunity_id)}`}>Mở cơ hội <ExternalLink aria-hidden="true"/></Link>}
        </div>
        <small>Kiểm tra đúng khách trong Zalo rồi tự gửi. Khi đã liên hệ, đánh dấu phía trên để kết thúc lịch hỏi thăm.</small>
        {copyMessage && <p className={styles.copyMessage} role="status">{copyMessage}</p>}
      </div>
      <div className={styles.note}>
        {row.notes && <p className={styles.noteHistory}>{row.notes}</p>}
        <label htmlFor={noteId}>Thêm ghi chú nội bộ</label>
        <textarea id={noteId} value={note} maxLength={1000} rows={2} disabled={disabled} onChange={(event) => setNote(event.target.value)} placeholder="Phản hồi về mẫu / bước tiếp theo…"/>
        <button type="button" disabled={disabled || !note.trim()} onClick={() => onAction(row, "note", note)}><Save aria-hidden="true"/>Lưu ghi chú</button>
      </div>
      {!resolved && !sending && !row.sms_queued_at && ["pending", "failed"].includes(row.status) && <div className={styles.channel}>
        <span>{row.channel === "telegram" ? "Chỉ nhắc đội ngũ qua Telegram; nhân viên tự liên hệ khách." : "Đến lịch, gửi SMS và báo kết quả qua Telegram."}</span>
        <button type="button" disabled={busy} onClick={() => onAction(row, "channel", note, row.channel === "telegram" ? "sms" : "telegram")}>{row.channel === "telegram" ? "Đổi sang SMS tự động" : "Chuyển sang Telegram nội bộ"}</button>
      </div>}
      {row.resolved_at && <p className={styles.receipt}>Kết thúc lịch {dateTime(row.resolved_at)}</p>}
      {row.status === "failed" && !uncertain && !row.sms_queued_at && Number(row.attempts) >= 3 && <div className={styles.channel}>
        <span>Đã dùng 3 lần thử. Sau khi kiểm tra và khắc phục, ghi chú lý do rồi cho phép hệ thống thử lại theo lịch.</span>
        <button type="button" disabled={busy || !note.trim()} onClick={() => onAction(row, "retry", note)}>Cho phép thử lại theo lịch</button>
      </div>}
    </details>
  </article>;
}

export default function SampleFollowups({ supabase, role }) {
  const [rows, setRows] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const [view, setView] = useState("due");
  const [visible, setVisible] = useState(6);
  const [busyId, setBusyId] = useState("");
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [now, setNow] = useState(Date.now());
  const actionInFlight = useRef(false);
  const loadInFlight = useRef(null);
  const canManage = ["admin", "manager"].includes(role);

  const load = useCallback(async (quiet = false) => {
    if (loadInFlight.current) return loadInFlight.current;
    if (!quiet) setLoading(true);
    const request = (async () => {
    try {
      const [queueResult, settingsResult] = await Promise.all([
        supabase.from("sample_followups").select(FIELDS).order("due_at", { ascending: true }),
        supabase.from("sample_followup_settings").select("id,enabled,starts_at,default_channel").eq("id", 1).maybeSingle(),
      ]);
      const error = queueResult.error || settingsResult.error;
      if (error) {
        setLoadError(unavailable(error) ? "Chức năng hỏi thăm mẫu chưa sẵn sàng trên hệ thống. Các mục khác vẫn dùng bình thường." : "Chưa tải được lịch hỏi thăm mẫu. Thử tải lại khi kết nối ổn định.");
        return;
      }
      if (!settingsResult.data) {
        setLoadError("Chức năng hỏi thăm mẫu chưa có thiết lập. Các mục khác vẫn dùng bình thường.");
        return;
      }
      setRows(queueResult.data || []);
      setSettings(settingsResult.data);
      setNow(Date.now());
      setLoadError("");
    } catch {
      setLoadError("Chưa tải được lịch hỏi thăm mẫu. Thử tải lại khi kết nối ổn định.");
    } finally {
      setLoading(false);
    }
    })();
    loadInFlight.current = request;
    try { await request; }
    finally { loadInFlight.current = null; }
  }, [supabase]);

  useEffect(() => {
    load();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible" && !actionInFlight.current) load(true);
    }, 60000);
    return () => window.clearInterval(timer);
  }, [load]);

  const groups = useMemo(() => {
    const result = { due: [], waiting: [], history: [] };
    rows.forEach((row) => {
      if (HISTORY.has(row.status)) result.history.push(row);
      else if (row.status !== "sending" && row.status !== "failed" && new Date(row.due_at).getTime() > now) result.waiting.push(row);
      else result.due.push(row);
    });
    result.history.sort((a, b) => new Date(b.resolved_at || b.sms_queued_at || b.due_at) - new Date(a.resolved_at || a.sms_queued_at || a.due_at));
    return result;
  }, [rows, now]);
  const tabs = [["due", "Đến hạn"], ["waiting", "Chờ đến lịch"], ["history", "Lịch sử"]];

  async function act(row, action, note, channel = null) {
    if (actionInFlight.current || loadError) return;
    actionInFlight.current = true;
    setBusyId(row.id);
    setActionError("");
    setNotice("");
    try {
      const { error } = await supabase.rpc("update_sample_followup", { p_id: row.id, p_action: action, p_note: note.trim(), p_channel: channel });
      if (error) throw error;
      setNotice(action === "note" ? "Đã lưu ghi chú." : action === "channel" ? "Đã cập nhật kênh hỏi thăm." : action === "retry" ? "Đã cho phép thử lại theo lịch tự động." : "Đã cập nhật lịch hỏi thăm.");
      if (loadInFlight.current) await loadInFlight.current;
      await load(true);
    } catch {
      setActionError("Chưa xác nhận được thay đổi. Tải lại lịch để kiểm tra trước khi thao tác tiếp.");
    } finally {
      actionInFlight.current = false;
      setBusyId("");
    }
  }

  async function toggleEnabled() {
    if (!canManage || !settings || actionInFlight.current || loadError) return;
    actionInFlight.current = true;
    setSettingsBusy(true);
    setActionError("");
    setNotice("");
    try {
      const { error } = await supabase.rpc("update_sample_followup_settings", { p_enabled: !settings.enabled, p_default_channel: null });
      if (error) throw error;
      setNotice(settings.enabled ? "Đã tạm dừng hỏi thăm tự động. Các lịch đang chờ được giữ lại." : "Đã bật lại hỏi thăm tự động cho các lịch còn chờ.");
      if (loadInFlight.current) await loadInFlight.current;
      await load(true);
    } catch {
      setActionError("Chưa xác nhận được thiết lập. Tải lại lịch để kiểm tra.");
    } finally {
      actionInFlight.current = false;
      setSettingsBusy(false);
    }
  }

  return <section id="sample-followups" className={styles.panel} aria-labelledby="sample-followups-title">
    <header className={styles.header}>
      <div><p className={styles.eyebrow}>Sau khi gửi mẫu</p><h2 id="sample-followups-title">Hỏi thăm mẫu thử</h2><p>Sau 7 ngày kể từ khi thực tế gửi mẫu, hệ thống xử lý SMS trong khung 09–18 giờ Việt Nam và báo kết quả về Telegram.</p></div>
      <div className={styles.headerActions}>
        <button type="button" disabled={loading || Boolean(busyId) || settingsBusy} onClick={() => load()} aria-label="Tải lại lịch hỏi thăm mẫu"><RefreshCw aria-hidden="true"/><span>Tải lại</span></button>
        {canManage && settings && !loadError && <button type="button" disabled={loading || settingsBusy || Boolean(busyId)} onClick={toggleEnabled}>{settings.enabled ? <Pause aria-hidden="true"/> : <Play aria-hidden="true"/>}{settingsBusy ? "Đang lưu…" : settings.enabled ? "Tạm dừng tự động" : "Bật lại tự động"}</button>}
      </div>
    </header>
    <p className={styles.scope}>Chỉ áp dụng cho mẫu từ đơn và yêu cầu mới tạo kể từ khi bật tính năng{settings?.starts_at ? ` (${dateTime(settings.starts_at)})` : ""}.</p>
    <p className={styles.retryHint}>Khi gửi lỗi, hệ thống thử tối đa 3 lần, cách nhau ít nhất 3 giờ. Kết quả chưa xác nhận cần kiểm tra điện thoại gửi trước khi xử lý tiếp.</p>
    {settings && !loadError && <p className={styles.automation} data-paused={!settings.enabled}>{settings.enabled ? "Đang bật tự động" : "Đang tạm dừng tự động · các lịch chờ vẫn được giữ"} · Kênh mặc định: {settings.default_channel === "telegram" ? "Telegram nội bộ" : "SMS"}</p>}
    {loadError ? <p className={styles.error} role="alert">{loadError}</p> : <>
      <div className={styles.tabs} role="group" aria-label="Lọc lịch hỏi thăm mẫu">{tabs.map(([key, label]) => <button key={key} type="button" aria-pressed={view === key} onClick={() => { setView(key); setVisible(6); }}>{label}<span>{loading ? "—" : groups[key].length}</span></button>)}</div>
      {actionError && <p className={styles.error} role="alert">{actionError}</p>}
      {notice && <p className={styles.notice} role="status">{notice}</p>}
      <div className={styles.rows} aria-busy={loading}>
        {loading ? <p className={styles.empty} role="status">Đang tải lịch hỏi thăm…</p>
          : groups[view].length ? groups[view].slice(0, visible).map((row) => <FollowupRow key={row.id} row={row} busy={Boolean(busyId) || settingsBusy} onAction={act}/>)
            : <p className={styles.empty}>{view === "due" ? "Chưa có mẫu đến hạn hỏi thăm." : view === "waiting" ? "Chưa có lịch đang chờ. Khi gửi mẫu từ một đơn mới, lịch hỏi thăm sẽ xuất hiện ở đây." : "Chưa có lịch sử hỏi thăm mẫu."}</p>}
      </div>
      {!loading && groups[view].length > visible && <div className={styles.more}><button type="button" onClick={() => setVisible((value) => value + 6)}>Xem thêm {Math.min(6, groups[view].length - visible)} mục</button><span>Đang hiện {Math.min(visible, groups[view].length)} / {groups[view].length}</span></div>}
    </>}
  </section>;
}
