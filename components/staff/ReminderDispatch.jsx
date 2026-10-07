"use client";

import { useRef, useState } from "react";
import { Send } from "lucide-react";
import styles from "./ReminderDispatch.module.css";

const errors = {
  manager_auth_required: "Cần đăng nhập bằng tài khoản quản lý để gửi nhắc.",
  dashboard_reminder_auth_unavailable: "Chưa kiểm tra được phiên đăng nhập. Thử lại khi kết nối ổn định.",
  dashboard_reminders_not_configured: "Máy chủ chưa có đủ cấu hình để gửi nhắc.",
  telegram_not_configured: "Chưa cấu hình bot hoặc nơi nhận Telegram trên máy chủ.",
  dashboard_reminder_scan_failed: "Chưa hoàn tất kiểm tra nhắc lịch. Có thể một số nhắc đã gửi; cập nhật database hoặc kiểm tra kết nối rồi thử lại.",
};

export default function ReminderDispatch({ supabase, onDispatched }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [hasError, setHasError] = useState(false);
  const inFlight = useRef(false);

  async function dispatch() {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setMessage("");
    setHasError(false);
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session?.access_token) {
        setHasError(true);
        setMessage("Phiên đăng nhập đã hết hạn. Đăng nhập lại để gửi nhắc.");
        return;
      }
      const response = await fetch("/api/staff/dashboard-reminders", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.error || typeof result.sent !== "number" || typeof result.failed !== "number") {
        setHasError(true);
        setMessage(errors[result.error] || "Chưa xác nhận được kết quả gửi nhắc. Kiểm tra Telegram trước khi thử lại.");
        return;
      }
      setHasError(result.failed > 0 || result.receiptFailed > 0);
      setMessage(result.receiptFailed > 0
        ? `Đã gửi ${result.sent} nhắc đến Telegram, nhưng ${result.receiptFailed} mục chưa lưu được lịch sử gửi${result.failed > 0 ? `; ${result.failed} mục gửi lỗi` : ""}. Kiểm tra Telegram trước khi thử lại để tránh gửi trùng.`
        : result.failed > 0
        ? `Đã gửi ${result.sent} nhắc; ${result.failed} nhắc chưa gửi được. Các mục lỗi vẫn giữ để thử lại.`
        : result.sent > 0
          ? `Đã gửi ${result.sent} nhắc đến Telegram nội bộ.`
          : "Không có nhắc mới đủ điều kiện gửi. Các nhắc có thể đã được gửi hoặc đang được xử lý.");
      if (onDispatched) {
        try { await onDispatched(result); }
        catch { setMessage(value => `${value} Làm mới trang để cập nhật lịch.`); }
      }
    } catch {
      setHasError(true);
      setMessage("Kết nối bị gián đoạn, chưa xác nhận được kết quả. Kiểm tra Telegram trước khi thử lại.");
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return <section className={styles.section} aria-label="Gửi nhắc lịch nội bộ">
    <div><strong>Nhắc lịch qua Telegram</strong><p>Gửi các nhắc đang đến hạn bằng bot hiện có. Mục chưa đến khoảng nhắc sẽ chờ đúng lịch.</p></div>
    <button type="button" disabled={busy} onClick={dispatch}><Send size={16}/>{busy ? "Đang kiểm tra & gửi…" : "Gửi nhắc đến hạn"}</button>
    {message && <p className={styles.result} data-error={hasError} role={hasError ? "alert" : "status"}>{message}</p>}
  </section>;
}
