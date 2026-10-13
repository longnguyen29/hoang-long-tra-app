"use client";

import { useEffect, useRef, useState } from "react";
import { Mail } from "lucide-react";
import styles from "../staff/PartnerNetworkDesk.module.css";

const messages = {
  not_authenticated: "Phiên đăng nhập đã hết hạn. Đăng nhập lại trước khi mời đối tác.",
  not_authorised: "Chỉ quản lý hoặc admin đã xác minh email mới được mời đối tác.",
  invalid_invite: "Kiểm tra email và tên người được mời.",
  invite_failed: "Chưa gửi được thư mời. Kiểm tra dịch vụ email rồi thử lại.",
  invite_access_failed: "Thư mời đã được tạo nhưng chưa lưu được quyền hoàn tất hồ sơ. Bấm gửi lại để khôi phục; chưa cần tạo tài khoản khác.",
  existing_access_failed: "Chưa cấp được quyền đăng ký cho tài khoản đã có. Chưa gửi email mới; thử lại.",
  too_many_requests: "Vừa gửi lời mời. Chờ một phút trước khi thử lại.",
};

export default function PartnerInvitePanel({ supabase, managerId, disabled = false }) {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const active = useRef(true);
  const controller = useRef(null);
  useEffect(() => { active.current = true; return () => { active.current = false; controller.current?.abort(); }; }, []);
  async function invite(event) {
    event.preventDefault();
    if (disabled || busy) return;
    setBusy(true); setError(""); setResult(null);
    const requestController = new AbortController();
    controller.current = requestController;
    const timeout = window.setTimeout(() => requestController.abort(), 20000);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token || session.user?.id !== managerId) throw new Error("not_authenticated");
      if (!active.current) return;
      const response = await fetch("/api/staff/partners/invite", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ email: email.trim(), displayName: displayName.trim() }), signal: requestController.signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "invite_failed");
      if (!["invited", "existing", "already_invited"].includes(data.kind)) throw new Error("invite_failed");
      if (active.current) setResult({ kind: data.kind, email: email.trim() });
    } catch (failure) {
      if (active.current) setError(failure.name === "AbortError" ? "Chưa xác nhận được kết quả. Kiểm tra email trước khi bấm gửi lại để tránh thư trùng." : messages[failure.message] || "Chưa hoàn tất lời mời. Thử lại hoặc kiểm tra cấu hình email.");
    } finally {
      window.clearTimeout(timeout);
      if (active.current) setBusy(false);
    }
  }
  return <section className={styles.invitePanel} aria-labelledby="private-partner-invite-title">
    <h2 id="private-partner-invite-title">Mời riêng đối tác</h2><p>Thử với vài người bạn chọn. Họ xác minh email, hoàn tất hồ sơ rồi chờ bạn duyệt; đăng ký công khai vẫn khóa.</p>
    <form className={styles.form} onSubmit={invite}><fieldset disabled={disabled || busy} className={styles.inviteFields}><label className={styles.field}><span>Email người được mời</span><input type="email" required autoComplete="off" maxLength={254} value={email} onChange={e => { setEmail(e.target.value); setResult(null); setError(""); }}/></label><label className={styles.field}><span>Tên người được mời <small>Không bắt buộc</small></span><input maxLength={120} autoComplete="off" value={displayName} onChange={e=>setDisplayName(e.target.value)}/></label><button className={styles.primary} type="submit"><Mail size={17} aria-hidden="true"/>{busy ? "Đang gửi…" : "Gửi lời mời riêng"}</button></fieldset></form>
    {error && <p className={styles.error} role="alert">{error}</p>}
    {result && <div className={styles.notice} role="status"><p>{result.kind === "invited" ? `Hệ thống email đã nhận lệnh gửi thư mời tới ${result.email}. Người được mời mở thư để tiếp tục; kiểm tra thư rác nếu cần.` : result.kind === "existing" ? `Đã cho phép tài khoản ${result.email} hoàn tất hồ sơ. Tài khoản đã có nên không tạo lại hoặc gửi thêm thư mời.` : `Tài khoản ${result.email} đã được mời. Dùng thư mời trước đó hoặc đăng nhập bằng email này.`}</p><p>Với tài khoản đã có, gửi họ đường dẫn: <a href="/partners/network" target="_blank" rel="noopener noreferrer">https://www.hoanglongtra.com/partners/network</a></p><p>Hồ sơ chỉ xuất hiện trong danh sách cần duyệt sau khi đối tác điền và gửi. Lời mời không cấp mã hoặc quyền gửi khách.</p></div>}
  </section>;
}
