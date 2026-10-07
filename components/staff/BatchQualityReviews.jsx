"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ClipboardCheck, Plus, RefreshCw, Save } from "lucide-react";
import { BATCH_SCORE_FIELDS, BATCH_REVIEW_RESULTS, emptyBatchReview, normalizeBatchReview, batchReviewAverage, batchReviewSummary } from "@/lib/batch-quality";
import styles from "./BatchQualityReviews.module.css";

const PAGE_SIZE = 20;
const scoreText = value => value == null ? "Chưa đủ điểm" : `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(value)} / 5`;
const when = value => {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "short", timeStyle: "short" }) : "Chưa ghi thời gian";
};
const draftIsDirty = draft => BATCH_SCORE_FIELDS.some(field => draft[field.key] !== "") || Boolean(draft.notes) || draft.result !== "hold";

export default function BatchQualityReviews({ supabase, batch, userEmail = "", role }) {
  const batchId = batch?.id || "";
  const activeBatch = useRef(batchId);
  activeBatch.current = batchId;
  const [drafts, setDrafts] = useState({});
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState({ batchId: "", rows: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const [reload, setReload] = useState(0);
  const draft = drafts[batchId] || emptyBatchReview();
  const dirty = draftIsDirty(draft);
  const draftKey = userEmail && batchId ? `hl-batch-quality:${userEmail}:${batchId}` : "";
  const rows = history.batchId === batchId ? history.rows : [];
  const busy = loading || (history.batchId !== batchId && !error);
  const summaryUnknown = busy || Boolean(error && !rows.length);
  const summary = useMemo(() => batchReviewSummary(rows), [rows]);
  const canReview = !role || ["admin", "manager", "employee"].includes(role);

  useEffect(() => {
    if (!batchId) return;
    let restored = emptyBatchReview();
    if (draftKey) {
      try {
        const stored = JSON.parse(window.sessionStorage.getItem(draftKey) || "null");
        if (stored && typeof stored === "object") {
          restored = { ...restored, ...Object.fromEntries([...BATCH_SCORE_FIELDS.map(field => field.key), "result", "notes"].map(key => [key, stored[key] ?? restored[key]])) };
        }
      } catch { /* A draft cache is optional; database history remains authoritative. */ }
    }
    setDrafts(previous => previous[batchId] ? previous : { ...previous, [batchId]: restored });
    setOpen(draftIsDirty(restored)); setFormError(""); setNotice("");
  }, [batchId, draftKey]);

  useEffect(() => {
    if (!draftKey || !drafts[batchId]) return;
    try {
      if (dirty) window.sessionStorage.setItem(draftKey, JSON.stringify(drafts[batchId]));
      else window.sessionStorage.removeItem(draftKey);
    } catch { /* Keep the in-memory draft when browser storage is unavailable. */ }
  }, [batchId, draftKey, drafts, dirty]);

  useEffect(() => {
    if (!dirty) return;
    const protectDraft = event => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", protectDraft);
    return () => window.removeEventListener("beforeunload", protectDraft);
  }, [dirty]);

  useEffect(() => {
    if (!batchId) { setLoading(false); return; }
    let live = true;
    setLoading(true); setError("");
    (async () => {
      try {
        const response = await supabase.from("tea_batch_reviews").select("*", { count: "exact" }).eq("batch_id", batchId)
          .order("reviewed_at", { ascending: false }).order("id", { ascending: false }).range(0, PAGE_SIZE - 1);
        if (!live) return;
        if (response.error) throw response.error;
        setHistory({ batchId, rows: response.data || [], total: response.count ?? response.data?.length ?? 0 });
      } catch {
        if (live) setError("Chưa tải được lịch sử đánh giá. Hãy thử lại; chưa xác nhận lô này có hay chưa có đánh giá.");
      } finally { if (live) setLoading(false); }
    })();
    return () => { live = false; };
  }, [supabase, batchId, reload]);

  function update(key, value) {
    setDrafts(previous => ({ ...previous, [batchId]: { ...(previous[batchId] || emptyBatchReview()), [key]: value } }));
    setFormError(""); setNotice("");
  }

  async function save(event) {
    event.preventDefault();
    const { values, errors } = normalizeBatchReview(draft);
    if (Object.keys(errors).length) { setFormError(Object.values(errors).join(" ")); return; }
    if (!batchId || saving || !canReview) return;
    const requestedBatch = batchId;
    setSaving(true); setFormError(""); setNotice("");
    try {
      const response = await supabase.rpc("create_tea_batch_review", {
        p_batch_id: requestedBatch, p_aroma_score: values.aroma_score, p_taste_score: values.taste_score,
        p_liquor_score: values.liquor_score, p_result: values.result, p_notes: values.notes,
      });
      if (response.error) throw response.error;
      const row = Array.isArray(response.data) ? response.data[0] : response.data;
      if (!row?.id || row.batch_id !== requestedBatch) throw new Error("missing_review");
      setDrafts(previous => ({ ...previous, [requestedBatch]: emptyBatchReview() }));
      if (draftKey) { try { window.sessionStorage.removeItem(draftKey); } catch {} }
      if (activeBatch.current !== requestedBatch) return;
      setOpen(false); setNotice("Đã lưu đánh giá vào lịch sử nội bộ. Trạng thái lô vẫn giữ nguyên.");
      setReload(value => value + 1);
    } catch {
      if (activeBatch.current === requestedBatch) setFormError("Chưa xác nhận lưu được đánh giá. Bản nháp vẫn còn; tải lại lịch sử để kiểm tra trước khi gửi lại.");
    } finally { setSaving(false); }
  }

  async function more() {
    if (loadingMore || busy || rows.length >= history.total) return;
    const requestedBatch = batchId;
    const offset = rows.length;
    setLoadingMore(true); setError("");
    try {
      const response = await supabase.from("tea_batch_reviews").select("*").eq("batch_id", requestedBatch)
        .order("reviewed_at", { ascending: false }).order("id", { ascending: false }).range(offset, offset + PAGE_SIZE - 1);
      if (response.error) throw response.error;
      if (activeBatch.current !== requestedBatch) return;
      setHistory(previous => {
        if (previous.batchId !== requestedBatch) return previous;
        const existing = new Set(previous.rows.map(row => row.id));
        return { ...previous, rows: [...previous.rows, ...(response.data || []).filter(row => !existing.has(row.id))] };
      });
    } catch { if (activeBatch.current === requestedBatch) setError("Chưa tải được các đánh giá trước. Lịch sử đang xem vẫn giữ nguyên."); }
    finally { setLoadingMore(false); }
  }

  if (!batchId) return <section className={styles.panel}><h2>Đánh giá chất lượng lô</h2><p>Chọn một lô trà để xem lịch sử và ghi đánh giá.</p></section>;

  return <section className={styles.panel} aria-label={`Đánh giá chất lượng lô ${batch.code || batchId}`}>
    <header className={styles.header}>
      <div><p>Hồ sơ chất lượng nội bộ</p><h2>{batch.code || batchId} · Đánh giá lô</h2><span>{batch.name?.vi || batch.name?.en || (typeof batch.name === "string" ? batch.name : "")}</span></div>
      <div><button type="button" onClick={() => setReload(value => value + 1)} disabled={loading || saving || loadingMore} aria-label="Tải lại lịch sử đánh giá"><RefreshCw size={17}/></button>{canReview && <button type="button" onClick={() => setOpen(value => !value)} disabled={saving} aria-expanded={open}><Plus size={17}/>{open ? "Thu gọn biểu mẫu" : dirty ? "Tiếp tục bản nháp" : "Ghi đánh giá"}</button>}</div>
    </header>
    <p className={styles.guardrail}>Đánh giá này lưu nhận xét của người thử trà. Kết luận Đạt không tự phát hành lô; Cần kiểm tra thêm / Không đạt cũng không tự đổi trạng thái lô hoặc passport công khai.</p>
    {error && <p className={styles.error} role="alert">{error}</p>}
    {notice && <p className={styles.notice} role="status">{notice}</p>}

    {open && canReview && <form className={styles.form} onSubmit={save}>
      <fieldset disabled={saving}>
        <legend>Đánh giá mới · thang điểm 1–5</legend>
        <p className={styles.help}>1: chưa phù hợp · 3: chấp nhận được · 5: rất tốt. Điểm cảm quan không thay thế kiểm nghiệm hay quyết định QC.</p>
        <div className={styles.scoreInputs}>{BATCH_SCORE_FIELDS.map(field => <label key={field.key}>
          <span>{field.label}</span><select value={draft[field.key]} onChange={event => update(field.key, event.target.value)} aria-describedby={`batch-review-${batchId}-${field.key}`}>
            <option value="">Chưa đánh giá</option>{[1,2,3,4,5].map(score => <option key={score} value={score}>{score} / 5</option>)}
          </select><small id={`batch-review-${batchId}-${field.key}`}>{field.help}</small>
        </label>)}</div>
        <label className={styles.result}>Kết luận<select value={draft.result} onChange={event => update("result", event.target.value)}>{BATCH_REVIEW_RESULTS.map(result => <option key={result.value} value={result.value}>{result.label}</option>)}</select></label>
        <label className={styles.notes}>Ghi chú / cách pha / vấn đề & bước tiếp theo<textarea value={draft.notes} maxLength={3000} rows={4} onChange={event => update("notes", event.target.value)} placeholder="Ví dụ: 5 g trà / 200 ml, 90°C, 3 phút; mùi, vị và điều cần kiểm tra tiếp…"/></label>
      </fieldset>
      {formError && <p className={styles.error} role="alert">{formError}</p>}
      <div className={styles.actions}><button type="submit" disabled={saving || !dirty}><Save size={17}/>{saving ? "Đang lưu…" : "Lưu vào lịch sử"}</button><span>Người đánh giá và thời gian do hệ thống ghi nhận.</span></div>
      {dirty && <p className={styles.help}>Bản nháp chưa lưu{draftKey ? " · giữ tạm trong phiên trình duyệt này" : ""}.</p>}
    </form>}

    <div className={styles.summary} aria-busy={busy}>
      <article><span>Điểm cảm quan trung bình</span><strong>{summaryUnknown ? (busy ? "Đang tải…" : "Chưa xác nhận") : scoreText(summary.overallAverage)}</strong><small>{summaryUnknown ? "Chưa xác nhận được số đánh giá." : `${summary.completeScoreCount} đánh giá đủ 3 điểm trong ${rows.length} đánh giá đang xem.`}</small></article>
      <article><span>Kết luận người đánh giá</span><strong>{summaryUnknown ? "—" : `${summary.passCount} đạt`}</strong><small>{summaryUnknown ? "Chưa xác nhận được kết luận." : `${summary.holdCount} cần kiểm tra thêm · ${summary.rejectCount} không đạt.`}</small></article>
      <article><span>Từng tiêu chí</span>{BATCH_SCORE_FIELDS.map(field => <small key={field.key}>{field.label}: {summaryUnknown ? "Chưa xác nhận" : `${scoreText(summary.byScore[field.key].average)} · ${summary.byScore[field.key].count} điểm đã ghi.`}</small>)}</article>
    </div>
    <section className={styles.history} aria-label="Lịch sử đánh giá lô">
      <header><ClipboardCheck size={19}/><h3>Lịch sử đánh giá</h3><span>{history.batchId === batchId ? `${rows.length} / ${history.total}` : "—"}</span></header>
      {busy && !error ? <p className={styles.help}>Đang tải đánh giá…</p> : !rows.length && !error ? <p className={styles.help}>Chưa có đánh giá đã ghi cho lô này.</p> : <div className={styles.entries}>{rows.map(row => <article key={row.id}>
        <header><div><time dateTime={row.reviewed_at}>{when(row.reviewed_at)}</time><span>{row.reviewer_name || "Nhân viên"}</span></div><b data-result={row.result}>{BATCH_REVIEW_RESULTS.find(result => result.value === row.result)?.label || "Chưa ghi kết luận"}</b></header>
        <div className={styles.entryScores}>{BATCH_SCORE_FIELDS.map(field => <span key={field.key}>{field.label}<b>{row[field.key] == null ? "Chưa chấm" : `${row[field.key]} / 5`}</b></span>)}<span>Trung bình<b>{scoreText(batchReviewAverage(row))}</b></span></div>
        {row.notes && <p>{row.notes}</p>}
      </article>)}</div>}
      {history.batchId === batchId && rows.length < history.total && <button className={styles.more} type="button" onClick={more} disabled={busy || loadingMore}>{loadingMore ? "Đang tải…" : "Xem đánh giá trước"}</button>}
    </section>
  </section>;
}
