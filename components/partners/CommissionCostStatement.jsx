"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatPartnerMoney } from "@/lib/partner-network";
import styles from "./CommissionCostStatement.module.css";

const BUCKET = "partner-cost-statements";
const TYPES = new Set(["application/pdf", "image/jpeg", "image/png"]);
const errors = {
  not_authenticated: "Hãy đăng nhập lại để mở bảng đối soát.", not_authorised: "Bạn chưa có quyền thực hiện thao tác này.",
  not_found: "Chưa có bảng đối soát được chia sẻ, hoặc quyền xem / dữ liệu đơn đã thay đổi.",
  invalid_file: "Chọn một PDF, JPEG hoặc PNG từ 1 byte đến 5 MB.", file_mismatch: "Tệp tải lên chưa khớp. Chọn lại tài liệu và thử lại.",
  review_required: "Điền nội dung và xác nhận đã kiểm tra trước khi chia sẻ.", reason_required: "Ghi lý do rút lại từ 10 ký tự.",
  statement_changed: "Dữ liệu đối soát đã thay đổi hoặc chưa đủ điều kiện công bố. Đối soát lại đơn rồi thử lại.",
};

export default function CommissionCostStatement({ commissionId, mode = "partner", supabase: suppliedSupabase, onChange }) {
  const supabase = useMemo(() => suppliedSupabase || createClient(), [suppliedSupabase]);
  const manager = mode === "manager";
  const [statement, setStatement] = useState(null);
  const [summary, setSummary] = useState("");
  const [evidence, setEvidence] = useState(null);
  const [reviewed, setReviewed] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [download, setDownload] = useState(null);
  const active = useRef(true), version = useRef(0), actorId = useRef(null), controllers = useRef(new Set()), details = useRef(null), timer = useRef(null);
  const endpoint = `/api/partners/commissions/${encodeURIComponent(commissionId)}/statement`;
  useEffect(() => {
    active.current = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextId = session?.user?.id || "";
      if (actorId.current === null) { actorId.current = nextId; return; }
      if (actorId.current === nextId) return;
      actorId.current = nextId;
      version.current++; controllers.current.forEach(item => item.abort());
      setStatement(null); setSummary(""); setEvidence(null); setReviewed(false); setDownload(null); setNotice(""); setError(""); setBusy(false);
      if (details.current) details.current.open = false;
    });
    return () => { active.current = false; version.current++; controllers.current.forEach(item => item.abort()); clearTimeout(timer.current); subscription.unsubscribe(); };
  }, [supabase]);

  async function request(body, query = "") {
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session?.access_token) throw new Error("not_authenticated");
    if (actorId.current !== null && actorId.current !== session.user?.id) throw new Error("not_authenticated");
    actorId.current = session.user.id;
    const controller = new AbortController(); controllers.current.add(controller);
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(endpoint + query, { method: body ? "POST" : "GET", cache: "no-store",
        headers: { Authorization: `Bearer ${session.access_token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}), signal: controller.signal });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "unavailable");
      return result;
    } finally { clearTimeout(timeout); controllers.current.delete(controller); }
  }
  async function run(operation) {
    if (busy) return;
    const current = version.current;
    setBusy(true); setError(""); setNotice(""); setDownload(null);
    try { await operation(() => active.current && current === version.current); }
    catch (failure) { if (active.current && current === version.current) setError(errors[failure.message] || "Chưa hoàn tất. Kiểm tra kết quả rồi thử lại."); }
    finally { if (active.current && current === version.current) setBusy(false); }
  }
  async function refresh(valid) {
    const result = await request();
    if (!valid()) return;
    setStatement(result.statement);
    if (manager) {
      const publishedEvidence = result.statement.published ? result.statement.evidence : null;
      const readyDraft = result.statement.draft_evidence?.status === "ready" ? result.statement.draft_evidence : null;
      setSummary(result.statement.summary || ""); setEvidence(publishedEvidence || readyDraft || result.statement.evidence || null); setReviewed(false);
    }
  }
  async function upload(file) {
    if (!file) return;
    await run(async valid => {
      if (!TYPES.has(file.type) || file.size < 1 || file.size > 5 * 1024 * 1024) throw new Error("invalid_file");
      const prepared = await request({ action: "prepare", fileName: file.name, contentType: file.type, size: file.size });
      if (!valid()) return;
      const { error: uploadError } = await supabase.storage.from(BUCKET).uploadToSignedUrl(prepared.path, prepared.token, file, { contentType: file.type });
      if (uploadError) throw new Error("upload_failed");
      if (!valid()) return;
      const completed = await request({ action: "finalize", evidenceId: prepared.evidenceId });
      if (valid()) { setEvidence(completed.evidence); setReviewed(false); setNotice("Tài liệu đã lưu riêng tư. Chưa chia sẻ với đối tác."); }
    });
  }
  async function fileLink(file) {
    await run(async valid => {
      const result = await request(null, `?evidence=${encodeURIComponent(file.id)}`);
      if (valid()) {
        setDownload({ url: result.url, name: file.file_name });
        clearTimeout(timer.current); timer.current = setTimeout(() => { if (active.current) setDownload(null); }, 60000);
      }
    });
  }
  const snapshot = manager ? statement?.preview_snapshot || statement?.snapshot : statement?.snapshot;
  return <details ref={details} className={styles.panel} onToggle={event => { if (event.currentTarget.open && !statement && !busy) run(refresh); }}>
    <summary>{manager ? "Bảng chi phí chia sẻ riêng" : "Bảng đối soát & tài liệu được chia sẻ"}</summary>
    <div className={styles.body}>
      {busy && <p role="status">Đang xử lý…</p>}
      {error && <p className={styles.error} role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      <button type="button" disabled={busy} onClick={() => run(refresh)}>Tải lại bảng đối soát</button>
      {statement && <>
        <p>{statement.stale ? "Bản cũ: dữ liệu đơn / đối soát đã đổi. Cần rà soát và công bố lại." : statement.published ? "Đã công bố riêng cho đối tác của đơn này." : "Chưa công bố cho đối tác."}</p>
        {snapshot && <p className={styles.note}>{manager ? "Số liệu sẽ công bố: " : "Cơ sở đã công bố: "}{snapshot.commission_basis === "profit" ? "lợi nhuận sau chi phí đơn" : "doanh thu thuần đã thu"}{snapshot.rate_percent !== null && snapshot.rate_percent !== undefined ? ` · ${snapshot.rate_percent}%` : ""}.</p>}
        {snapshot && <dl className={styles.totals}>{[
          ["Doanh thu thuần đã thu", snapshot.eligible_base], ["Chi phí đơn đã xác nhận", snapshot.internal_cost_total],
          ["Cơ sở chia hoa hồng", snapshot.commission_base], ["Hoa hồng đối soát", snapshot.calculated_amount],
        ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{formatPartnerMoney(value)}</dd></div>)}</dl>}
        {!manager && statement.summary && <p className={styles.summaryText}>{statement.summary}</p>}
        {statement.published_at && <p className={styles.note}>Công bố: {new Date(statement.published_at).toLocaleString("vi-VN")}</p>}
      </>}
      {manager && statement && <form onSubmit={event => { event.preventDefault(); run(async valid => {
        await request({ action: "publish", summary, evidenceId: evidence?.id || null, contentReviewed: reviewed, expectedSnapshot: snapshot });
        await refresh(valid); if (valid()) { setNotice("Đã công bố riêng cho đúng đối tác của đơn này."); await onChange?.(); }
      }); }}>
        <p className={styles.note}>Mặc định riêng tư. Bảng này chỉ dành cho đối tác giới thiệu đơn đang mở; không tự chia sẻ hóa đơn có sẵn.</p>
        <label>Nội dung giải thích cho đối tác<textarea required maxLength={2000} rows={4} value={summary} onChange={event => { setSummary(event.target.value); setReviewed(false); }}/></label>
        <label>Tài liệu chọn riêng <small>Không bắt buộc · một PDF / JPEG / PNG ≤ 5 MB</small><input type="file" accept="application/pdf,image/jpeg,image/png" disabled={busy} onChange={event => { upload(event.target.files?.[0]); event.target.value = ""; }}/></label>
        {evidence && <div className={styles.file}><span>{evidence.file_name}</span><button type="button" disabled={busy} onClick={() => fileLink(evidence)}>Kiểm tra tài liệu</button><button type="button" disabled={busy} onClick={() => { setEvidence(null); setReviewed(false); setDownload(null); }}>Không kèm tài liệu</button></div>}
        <label className={styles.consent}><input type="checkbox" required checked={reviewed} onChange={event => setReviewed(event.target.checked)}/><span>Tôi đã kiểm tra số liệu, nội dung và tài liệu; được phép chia sẻ cho đúng đối tác này. Không chứa dữ liệu khách / đơn khác hoặc thông tin ngân hàng không cần thiết.</span></label>
        <button type="submit" disabled={busy || !reviewed || !snapshot}>Công bố riêng cho đối tác</button>
      </form>}
      {!manager && statement?.evidence && <div className={styles.file}><span>{statement.evidence.file_name}</span><button type="button" disabled={busy} onClick={() => fileLink(statement.evidence)}>Mở tài liệu được chia sẻ</button></div>}
      {download && <a href={download.url} target="_blank" rel="noopener noreferrer" className={styles.download}>Tải {download.name} · liên kết có hiệu lực 60 giây</a>}
      {manager && statement?.published && <form onSubmit={event => { event.preventDefault(); run(async valid => {
        await request({ action: "withdraw", reason }); await refresh(valid); if (valid()) { setReason(""); setNotice("Đã rút quyền xem. Liên kết tải đã cấp trước đó hết hạn trong tối đa 60 giây."); await onChange?.(); }
      }); }}><label>Lý do rút lại<input required minLength={10} maxLength={1000} value={reason} onChange={event => setReason(event.target.value)}/></label><button type="submit" disabled={busy}>Rút quyền xem bảng / tài liệu</button></form>}
    </div>
  </details>;
}
