"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Archive, ArrowRight, BookOpen, Check, ChevronDown, ChevronRight, ExternalLink, GitBranch, Leaf, Lightbulb, Link2, List, PencilLine, Plus, RefreshCw, Search, X } from "lucide-react";
import { knowledgePostNodes, normalizeKnowledgeSnapshot, safeKnowledgeUrl, summarizeKnowledge, topicDescendantIds } from "@/lib/knowledge-centre";
import { useDialogFocus } from "./useDialogFocus";
import styles from "./KnowledgeCentre.module.css";

const STATUS = { draft: "Bản nháp", reviewed: "Đã rà soát", archived: "Đã lưu kho", idea: "Ý tưởng", research: "Đang tìm hiểu", drafting: "Đang viết", ready: "Sẵn sàng", active: "Đang theo dõi", published: "Đã đăng", paused: "Tạm dừng" };
const METRICS = [["views", "Lượt xem"], ["likes", "Thích"], ["comments", "Bình luận"], ["shares", "Chia sẻ"], ["clicks", "Lượt bấm"], ["leads", "Lead nhập tay"], ["orders", "Đơn nhập tay"], ["revenue", "Doanh thu (đ)"], ["spend", "Chi phí (đ)"]];
const DOMAINS = { tea: "Trà", business: "Kinh doanh" };
const CHANNELS = { threads: "Threads", facebook: "Facebook", instagram: "Instagram", tiktok: "TikTok", youtube: "YouTube", linkedin: "LinkedIn", other: "Kênh khác" };
const archiveState = item => item?.record_status || item?.status;
const EMPTY = { topics: [], angles: [], posts: [], memory_items: [], growth: { experiments: [] } };
const number = value => value === null || value === undefined ? "Chưa có" : new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(value);
const date = value => { if (!value) return "Chưa ghi ngày"; const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? "Chưa ghi ngày" : new Intl.DateTimeFormat("vi-VN", { day: "numeric", month: "numeric", year: "numeric", timeZone: "Asia/Ho_Chi_Minh" }).format(parsed); };
const https = value => { const url = safeKnowledgeUrl(value); return url.startsWith("https://") ? url : ""; };
const foldText = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();
const metricDraft = metrics => Object.fromEntries(METRICS.map(([key]) => [key, metrics?.[key] == null ? "" : String(metrics[key])]));
const rowFromRpc = data => Array.isArray(data) ? data[0] : data;
const selectedKey = item => item ? `${item.type}:${item.id}` : "";
const description = type => ({ topic: "Chủ đề", angle: "Góc khai thác", post: "Bài & kết quả" })[type];
const editDraft = (kind, row) => kind === "topic" ? { title: row.title, domain: row.domain, parent_id: row.parent_id || "", body: row.body || "", sources: row.sources?.map(item => ({ ...item })) || [], status: row.status, memory_item_id: row.memory_item_id || "", next_action: row.next_action || "" } : kind === "angle" ? { title: row.title, audience: row.audience || "", hook: row.hook || "", notes: row.notes || "", status: row.status, next_action: row.next_action || "" } : { title: row.title, channel: row.channel || "", url: row.url || "", published_at: row.published_at?.slice(0, 10) || "", angle_id: row.angle_id || "", metrics: metricDraft(row.metrics), measurement_note: row.measurement_note || "" };
const draftText = draft => Object.entries(draft).map(([key, value]) => {
  const labels = { title: "Tên", domain: "Lĩnh vực", parent_id: "Chủ đề cha", body: "Nội dung", status: "Trạng thái", memory_item_id: "Ghi nhớ liên kết", next_action: "Bước tiếp theo", audience: "Dành cho ai", hook: "Câu mở", notes: "Ghi chú", channel: "Kênh", url: "Đường dẫn", published_at: "Ngày đăng", angle_id: "Góc liên kết", measurement_note: "Cách đo", sources: "Nguồn", metrics: "Số liệu" };
  const content = key === "sources" ? value.map(source => `${source.label}: ${source.url}`).join("\n") : key === "metrics" ? METRICS.map(([field, label]) => `${label}: ${value[field] === "" ? "Chưa biết" : value[field]}`).join("\n") : key === "status" ? STATUS[value] || value : key === "domain" ? DOMAINS[value] || value : key === "channel" ? CHANNELS[value] || value : value;
  return `${labels[key] || key}\n${content || "Chưa ghi"}`;
}).join("\n\n");

function MetricGroup({ title, metrics, fields, hint }) {
  return <section className={styles.metricGroup}><h4>{title}</h4><div>{fields.map(([key, label]) => {
    const value = metrics?.[key];
    return <article key={key}><span>{label}</span><b>{number(value?.total)}</b><small>{value?.count ? `${value.known}/${value.count} bài có số liệu${value.unknown ? " · cộng phần đã biết" : ""}` : "Chưa có bài để đo"}</small></article>;
  })}</div>{hint && <p>{hint}</p>}</section>;
}

function Results({ summary, compact = false }) {
  return <div className={styles.results}>
    <MetricGroup title="Số liệu nền tảng" metrics={summary.platform} fields={compact ? METRICS.slice(0, 1) : METRICS.slice(0, 5)} hint="Ô trống là chưa biết. Số 0 là kết quả đã được ghi nhận. Tổng lượt xem không phải số người xem duy nhất."/>
    {!compact && <>
      <MetricGroup title="Theo dõi từ Growth Lab" metrics={summary.tracked} fields={[["visitors", "Vào trang mẫu"], ["qualified_requests", "Yêu cầu đủ điều kiện"], ["samples_sent", "Đã gửi mẫu"], ["sample_requests_with_order", "Yêu cầu có đơn về sau"]]} hint="“Yêu cầu có đơn về sau” là đối chiếu liên hệ với đơn hàng; chưa chứng minh bài viết tạo ra đơn."/>
      <MetricGroup title="Kết quả nhập tay" metrics={summary.manualAttribution} fields={METRICS.slice(5)} hint="Giữ riêng với dữ liệu theo dõi. Ghi cách đo và phạm vi để người đọc kiểm tra lại."/>
    </>}
  </div>;
}

function KnowledgeDialog({ modal, setModal, saving, error, snapshot, variants, onClose, onSave }) {
  const ref = useRef(null);
  useDialogFocus(ref, true, () => { if (!saving) onClose(); });
  const { kind, draft } = modal;
  const change = (key, value) => setModal(current => ({ ...current, draft: { ...current.draft, [key]: value } }));
  const currentRow = modal.record?.id ? snapshot[{ topic: "topics", angle: "angles", post: "posts", metrics: "posts" }[kind]]?.find(item => item.id === modal.record.id) : null;
  const stale = currentRow && currentRow.version !== modal.expectedVersion;
  const memory = snapshot.memory_items.filter(item => item.status === "approved");
  const chosenMemory = memory.find(item => item.id === draft.memory_item_id);
  const titles = { topic: modal.record ? "Sửa chủ đề" : "Thêm chủ đề", angle: modal.record ? "Sửa góc khai thác" : "Thêm góc khai thác", post: modal.record ? "Sửa bài ngoài Growth Lab" : "Ghi bài đã đăng", metrics: "Cập nhật số liệu bài", link: "Liên kết bài trong Growth Lab", task: "Thêm bước tiếp theo vào Hôm nay" };
  return <div className={styles.backdrop}><section ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="knowledge-dialog-title" className={styles.dialog}>
    <header><div><span className={styles.eyebrow}>{kind === "task" ? "Việc cá nhân" : "Sổ tri thức"}</span><h2 id="knowledge-dialog-title">{kind === "topic" && modal.record ? "Sửa chủ đề" : titles[kind]}</h2></div><button type="button" className={styles.iconButton} disabled={saving} onClick={onClose} aria-label="Đóng, giữ nội dung đang nhập"><X/></button></header>
    <form onSubmit={onSave}>
      {kind === "topic" && <>
        <label>Tên chủ đề<input required maxLength={180} value={draft.title} onChange={event => change("title", event.target.value)} placeholder="Điều cần hiểu về trà hoặc kinh doanh"/></label>
        <div className={styles.formPair}><label>Lĩnh vực<select value={draft.domain} onChange={event => setModal(current => ({ ...current, draft: { ...current.draft, domain: event.target.value, parent_id: "" } }))}><option value="tea">Trà</option><option value="business">Kinh doanh</option></select></label><label>Trạng thái<select value={draft.status} onChange={event => change("status", event.target.value)}><option value="draft">Bản nháp · cần kiểm chứng</option><option value="reviewed">Đã rà soát nội dung</option><option value="archived">Đã lưu kho</option></select></label></div>
        <label>Chủ đề cha<select value={draft.parent_id || ""} onChange={event => change("parent_id", event.target.value)}><option value="">Chủ đề gốc</option>{snapshot.topics.filter(item => item.domain === draft.domain && item.id !== modal.record?.id && !topicDescendantIds(snapshot.topics, modal.record?.id).includes(item.id)).map(item => <option key={item.id} value={item.id}>{DOMAINS[item.domain]} · {item.title}</option>)}</select></label>
        <label>Ghi nhớ công ty đã duyệt<select value={draft.memory_item_id || ""} onChange={event => change("memory_item_id", event.target.value)}><option value="">Viết nội dung riêng</option>{memory.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
        {draft.memory_item_id ? <div className={styles.memoryPreview}><b>Nội dung từ ghi nhớ đã duyệt</b><p>{chosenMemory?.body || "Ghi nhớ liên kết hiện không có trong danh sách đã duyệt. Chọn lại ghi nhớ để lưu."}</p><small>Nội dung được đọc từ bản gốc khi mở chủ đề. Rà soát chủ đề không duyệt ghi nhớ công ty.</small></div> : <label>Kiến thức / câu hỏi cần tìm hiểu<textarea rows={6} maxLength={12000} value={draft.body} onChange={event => change("body", event.target.value)} placeholder="Ghi điều đã biết, nguồn kiểm chứng, và câu hỏi còn mở. Ý tưởng chưa kiểm chứng vẫn là bản nháp."/></label>}
        <fieldset><legend>Nguồn tham khảo</legend><p className={styles.hint}>Dùng đường dẫn HTTPS, kèm tên để tra lại.</p>{draft.sources.map((source, index) => <div className={styles.sourceForm} key={index}><label>Tên nguồn<input maxLength={180} value={source.label} onChange={event => change("sources", draft.sources.map((item, position) => position === index ? { ...item, label: event.target.value } : item))}/></label><label>Đường dẫn<input type="url" maxLength={2048} placeholder="https://…" value={source.url} onChange={event => change("sources", draft.sources.map((item, position) => position === index ? { ...item, url: event.target.value } : item))}/></label><button className={styles.iconButton} type="button" onClick={() => change("sources", draft.sources.filter((_, position) => position !== index))} aria-label={`Bỏ nguồn ${index + 1}`}><X/></button></div>)}<button type="button" className={styles.secondaryButton} disabled={draft.sources.length >= 10} onClick={() => change("sources", [...draft.sources, { label: "", url: "" }])}><Plus/>Thêm nguồn</button></fieldset>
        <label>Bước tiếp theo<input maxLength={1000} value={draft.next_action} onChange={event => change("next_action", event.target.value)} placeholder="Câu hỏi hoặc việc cụ thể cần làm"/></label>
      </>}
      {kind === "angle" && <>
        <label>Góc khai thác<input required maxLength={180} value={draft.title} onChange={event => change("title", event.target.value)} placeholder="Một cách kể hoặc câu hỏi muốn thử"/></label>
        <label>Dành cho ai<input maxLength={1000} value={draft.audience} onChange={event => change("audience", event.target.value)}/></label>
        <label>Câu mở / hook<textarea rows={3} maxLength={2000} value={draft.hook} onChange={event => change("hook", event.target.value)}/></label>
        <label>Ghi chú và điều cần kiểm chứng<textarea rows={4} maxLength={6000} value={draft.notes} onChange={event => change("notes", event.target.value)}/></label>
        <label>Trạng thái<select value={draft.status} onChange={event => change("status", event.target.value)}>{["idea", "research", "drafting", "ready", "archived"].map(item => <option key={item} value={item}>{STATUS[item]}</option>)}</select></label>
        <label>Bước tiếp theo<input maxLength={1000} value={draft.next_action} onChange={event => change("next_action", event.target.value)}/></label>
      </>}
      {kind === "post" && <>
        <p className={styles.hint}>Ghi bài trên mạng xã hội để nối với chủ đề. Chỉ bài có đường dẫn HTTPS và ngày đăng mới được tính vào lịch sử đã đăng.</p>
        <label>Tên bài<input required maxLength={180} value={draft.title} onChange={event => change("title", event.target.value)}/></label>
        <label>Kênh<select required value={draft.channel} onChange={event => change("channel", event.target.value)}><option value="">Chọn kênh…</option>{Object.entries(CHANNELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        <label>Đường dẫn bài<input type="url" maxLength={2048} value={draft.url} onChange={event => change("url", event.target.value)} placeholder="https://…"/></label>
        <label>Ngày đăng<input type="date" min="1900-01-01" max="2199-12-31" value={draft.published_at} onChange={event => change("published_at", event.target.value)}/></label>
        {modal.topicId && <label>Góc khai thác<select value={draft.angle_id || ""} onChange={event => change("angle_id", event.target.value)}><option value="">Chưa gắn góc cụ thể</option>{snapshot.angles.filter(item => item.topic_id === modal.topicId && item.status !== "archived").map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>}
        <details className={styles.metricsEditor}><summary>Ghi số liệu đã có <ChevronDown/></summary><MetricFields draft={draft} change={change}/></details>
        <label>Cách đo / phạm vi<textarea rows={3} maxLength={3000} value={draft.measurement_note} onChange={event => change("measurement_note", event.target.value)} placeholder="Ngày chụp số liệu, nguồn, cách đối chiếu lead hoặc đơn…"/></label>
      </>}
      {kind === "metrics" && <><p className={styles.hint}>Để trống nếu chưa biết; nhập 0 khi đã kiểm tra và kết quả bằng 0.</p><MetricFields draft={draft} change={change}/><label>Cách đo / phạm vi<textarea rows={3} maxLength={3000} value={draft.measurement_note} onChange={event => change("measurement_note", event.target.value)}/></label></>}
      {kind === "link" && <>
        <p className={styles.hint}>Dùng bài gốc trong Growth Lab. Liên kết giữ nguyên nội dung, ngày đăng và số liệu của bài; không tạo bản sao.</p>
        <label>Bài trong Growth Lab<select required value={draft.growth_variant_id} onChange={event => change("growth_variant_id", event.target.value)}><option value="">Chọn bài…</option>{variants.map(item => <option key={item.id} value={item.id}>{item.experiment_title} · {item.label || item.post_text?.slice(0, 45) || "Bản nội dung"} · {STATUS[item.status] || item.status}</option>)}</select></label>
        <label>Góc khai thác<select value={draft.angle_id || ""} onChange={event => change("angle_id", event.target.value)}><option value="">Chưa gắn góc cụ thể</option>{snapshot.angles.filter(item => item.topic_id === modal.topicId && item.status !== "archived").map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
        {!variants.length && <p>Chưa có bản nội dung nào trong Growth Lab. <Link href={`/admin/growth?topic=${encodeURIComponent(modal.topicId || "")}`}>Tạo brief <ArrowRight size={14}/></Link></p>}
      </>}
      {kind === "task" && <>
        <p className={styles.hint}>Việc này xuất hiện trong danh sách Hôm nay của bạn và dẫn trở lại chủ đề.</p>
        <label>Việc cần làm<input required maxLength={180} value={draft.title} onChange={event => change("title", event.target.value)}/></label>
        <label>Ghi chú<textarea rows={4} maxLength={3000} value={draft.notes} onChange={event => change("notes", event.target.value)}/></label>
        <label>Ngày hẹn (tùy chọn)<input type="date" value={draft.event_on} onChange={event => change("event_on", event.target.value)}/></label>
        <p className={styles.hint}>Nhắc Telegram được quản lý trong Hôm nay khi đã có ngày hẹn.</p>
      </>}
      {stale && <div className={styles.conflict}><b>Bản lưu đã thay đổi trong lúc bạn nhập.</b><p>Tải bản hiện tại để tiếp tục sửa. Nội dung bạn đã nhập được giữ trong một ô riêng để sao chép và ghép lại.</p><button type="button" className={styles.secondaryButton} onClick={() => setModal(current => ({ ...current, recoveryDraft: current.draft, draft: editDraft(kind, currentRow), record: currentRow, topicId: currentRow.topic_id || current.topicId, expectedVersion: currentRow.version }))}>Tải bản mới để sửa</button></div>}
      {modal.recoveryDraft && <details className={styles.recoveredDraft}><summary>Nội dung đã nhập trước khi tải bản mới</summary><p className={styles.hint}>Bản hiện tại đang nằm trong các ô phía trên. Sao chép phần cần giữ từ nội dung dưới đây.</p><textarea readOnly rows={8} aria-label="Nội dung đã nhập trước khi tải bản mới" value={draftText(modal.recoveryDraft)}/></details>}
      {error && <p className={styles.error} role="alert">{error}</p>}
      <footer><span>Nội dung nhập được giữ khi đóng hoặc lưu chưa thành công.</span><button type="button" className={styles.secondaryButton} disabled={saving} onClick={onClose}>Đóng</button><button type="submit" className={styles.primaryButton} disabled={saving || stale || (kind === "link" && !draft.growth_variant_id)}>{saving ? "Đang lưu…" : kind === "task" ? "Thêm vào Hôm nay" : kind === "link" ? "Lưu liên kết" : "Lưu nội dung"}</button></footer>
    </form>
  </section></div>;
}

function MetricFields({ draft, change }) {
  return <div className={styles.metricFields}>{METRICS.map(([key, label]) => <label key={key}>{label}<input type="number" min="0" max="1000000000000000" step={key === "revenue" || key === "spend" ? "any" : "1"} inputMode="decimal" value={draft.metrics[key]} placeholder="Chưa biết" onChange={event => change("metrics", { ...draft.metrics, [key]: event.target.value })}/></label>)}</div>;
}

export default function KnowledgeCentre({ supabase, email, role }) {
  const [snapshot, setSnapshot] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selection, setSelection] = useState(null);
  const selectionRef = useRef(null);
  const detailRef = useRef(null);
  const explorerRef = useRef(null);
  const requestRef = useRef(0);
  const [query, setQuery] = useState("");
  const [domain, setDomain] = useState("all");
  const [status, setStatus] = useState("active");
  const [view, setView] = useState("tree");
  const [collapsed, setCollapsed] = useState(new Set());
  const [modal, setModalState] = useState(null);
  const draftCache = useRef(new Map());
  const [saving, setSaving] = useState(false);
  const [dialogError, setDialogError] = useState("");
  const canEdit = ["admin", "manager"].includes(role);
  const select = useCallback(item => { selectionRef.current = item; setSelection(item); }, []);
  const selectFromUi = item => { select(item); if (window.matchMedia("(max-width: 59.99rem)").matches) window.requestAnimationFrame(() => { detailRef.current?.scrollIntoView({ block: "start", behavior: "auto" }); detailRef.current?.focus({ preventScroll: true }); }); };
  const setModal = update => setModalState(current => {
    const next = typeof update === "function" ? update(current) : update;
    if (next) draftCache.current.set(next.key, next);
    return next;
  });
  const load = useCallback(async () => {
    const request = ++requestRef.current;
    setLoading(true); setError("");
    try {
      const { data, error: failure } = await supabase.rpc("knowledge_centre_snapshot");
      if (request !== requestRef.current) return;
      if (failure) throw failure;
      const next = normalizeKnowledgeSnapshot(data || EMPTY);
      setSnapshot(next); setLoaded(true);
      if (!selectionRef.current && next.topics.length) select({ type: "topic", id: next.topics.find(item => item.status !== "archived")?.id || next.topics[0].id });
    } catch (failure) {
      if (request !== requestRef.current) return;
      const message = String(failure?.message || "");
      setError(/function|schema cache|relation|does not exist/i.test(message) ? "Sổ tri thức chưa sẵn sàng trong database. Cần áp dụng migration Knowledge Centre rồi thử tải lại." : "Chưa đọc được sổ tri thức. Kiểm tra kết nối và thử tải lại; nội dung đang nhập vẫn được giữ.");
    } finally { if (request === requestRef.current) setLoading(false); }
  }, [supabase, select]);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const type = ["post", "angle", "topic"].find(key => params.get(key));
    if (type && !selectionRef.current) select({ type, id: params.get(type) });
    load();
    return () => { requestRef.current += 1; };
  }, [load, select]);
  const nodes = useMemo(() => knowledgePostNodes(snapshot), [snapshot]);
  const explorerNodes = useMemo(() => status === "archived" ? knowledgePostNodes({ ...snapshot, posts: snapshot.posts.filter(item => item.status === "archived") }) : knowledgePostNodes(snapshot, { includeArchived: status === "all" }), [snapshot, status]);
  const variants = useMemo(() => (snapshot.growth?.experiments || []).flatMap(experiment => (experiment.variants || []).map(variant => ({ ...variant, experiment_title: experiment.title }))), [snapshot]);
  const selectedPost = selection?.type === "post" ? nodes.find(item => item.id === selection.id || item.record_ids?.includes(selection.id)) : null;
  const selectedPostRecord = selection?.type === "post" ? snapshot.posts.find(item => item.id === selection.id && (!selection.topicId || item.topic_id === selection.topicId) && (selection.angleId === undefined || (item.angle_id || null) === selection.angleId)) || snapshot.posts.find(item => (!selection.topicId || item.topic_id === selection.topicId) && (selection.angleId === undefined || (item.angle_id || null) === selection.angleId) && selectedPost?.record_ids?.includes(item.id)) : null;
  const topic = selection?.type === "topic" ? snapshot.topics.find(item => item.id === selection.id) : selection?.type === "angle" ? snapshot.topics.find(item => item.id === snapshot.angles.find(angle => angle.id === selection.id)?.topic_id) : snapshot.topics.find(item => item.id === (selection?.topicId || selectedPostRecord?.topic_id || selectedPost?.topic_id));
  const angle = selection?.type === "angle" ? snapshot.angles.find(item => item.id === selection.id) : selection?.type === "post" ? snapshot.angles.find(item => item.id === (selectedPostRecord?.angle_id || selectedPost?.angle_id)) : null;
  const post = selectedPost;
  const chosen = selection?.type === "topic" ? topic : selection?.type === "angle" ? angle : post;
  const relatedPosts = topic ? nodes.filter(item => item.topic_ids?.includes(topic.id) || item.topic_id === topic.id) : [];
  const ownSummary = useMemo(() => summarizeKnowledge(snapshot, { topicId: topic?.id, angleId: selection?.type === "angle" ? angle?.id : undefined, includeDescendants: false }), [snapshot, topic?.id, angle?.id, selection?.type]);
  const branchSummary = useMemo(() => summarizeKnowledge(snapshot, { topicId: topic?.id, includeDescendants: true }), [snapshot, topic?.id]);
  const total = useMemo(() => summarizeKnowledge(snapshot), [snapshot]);
  const approvedMemory = topic?.memory_item_id ? snapshot.memory_items.find(item => item.id === topic.memory_item_id && item.status === "approved") : null;
  const archivedContextIds = new Set([...snapshot.topics.filter(item => item.status === "archived").map(item => item.id), ...snapshot.angles.filter(item => item.status === "archived").map(item => item.topic_id), ...snapshot.posts.filter(item => item.status === "archived").map(item => item.topic_id)]);
  snapshot.topics.forEach(item => { if (topicDescendantIds(snapshot.topics, item.id).some(id => archivedContextIds.has(id))) archivedContextIds.add(item.id); });
  const topicMatches = item => (domain === "all" || item.domain === domain) && (status === "all" || status === "active" && item.status !== "archived" || status === "archived" && archivedContextIds.has(item.id) || item.status === status);
  const visibleTopics = snapshot.topics.filter(topicMatches);
  const visibleIds = new Set(visibleTopics.map(item => item.id));
  const roots = visibleTopics.filter(item => !visibleIds.has(item.parent_id));
  const reached = new Set();
  const mark = item => { if (reached.has(item.id)) return; reached.add(item.id); visibleTopics.filter(child => child.parent_id === item.id).forEach(mark); };
  roots.forEach(mark); visibleTopics.forEach(item => { if (!reached.has(item.id)) { roots.push(item); mark(item); } });
  const nodeEntries = [
    ...visibleTopics.map(item => ({ type: "topic", id: item.id, title: item.title, status: item.status, topic: item, text: `${item.title} ${item.body} ${item.next_action}` })),
    ...snapshot.angles.filter(item => visibleIds.has(item.topic_id) && (status === "all" || status === "archived" ? status === "all" || archiveState(item) === "archived" : archiveState(item) !== "archived")).map(item => ({ type: "angle", id: item.id, title: item.title, status: item.status, topic: snapshot.topics.find(topic => topic.id === item.topic_id), text: `${item.title} ${item.hook} ${item.notes} ${item.audience}` })),
    ...explorerNodes.filter(item => (item.topic_ids || [item.topic_id]).some(id => visibleIds.has(id)) && (status === "all" || status === "archived" ? status === "all" || archiveState(item) === "archived" : archiveState(item) !== "archived")).map(item => ({ type: "post", id: item.id, title: item.title, status: archiveState(item) === "archived" ? "archived" : item.status, topic: snapshot.topics.find(topic => visibleIds.has(topic.id) && item.topic_ids?.includes(topic.id)), text: `${item.title} ${item.body || ""} ${item.channel} ${item.measurement_note}` })),
  ];
  const matches = nodeEntries.filter(item => !query.trim() || foldText(item.text).includes(foldText(query.trim())));
  const open = (kind, record = null, defaults = {}) => {
    if (!canEdit) return;
    setDialogError(""); setNotice("");
    const targetTopic = record?.topic_id || defaults.topicId || topic?.id || "";
    const targetAngle = record ? record.angle_id || "" : defaults.angleId || angle?.id || "";
    const key = `${kind}:${record?.id || `${targetTopic}:${targetAngle}:${defaults.parent_id || "new"}`}`;
    let draft;
    if (kind === "topic") draft = { title: record?.title || "", domain: record?.domain || topic?.domain || "tea", parent_id: record?.parent_id || defaults.parent_id || "", body: record?.body || "", sources: record?.sources?.map(item => ({ ...item })) || [], status: record?.status || "draft", memory_item_id: record?.memory_item_id || "", next_action: record?.next_action || "" };
    if (kind === "angle") draft = { title: record?.title || "", audience: record?.audience || "", hook: record?.hook || "", notes: record?.notes || "", status: record?.status || "idea", next_action: record?.next_action || "" };
    if (kind === "post" || kind === "metrics") draft = { title: record?.title || "", channel: record?.channel || "", url: record?.url || "", published_at: record?.published_at?.slice(0, 10) || "", angle_id: record?.angle_id || targetAngle, metrics: metricDraft(record?.metrics), measurement_note: record?.measurement_note || "" };
    if (kind === "link") draft = { growth_variant_id: "", angle_id: targetAngle };
    if (kind === "task") draft = { title: chosen?.next_action || `Tìm hiểu: ${chosen?.title || topic?.title || "Chủ đề"}`, notes: chosen?.next_action || "", event_on: "" };
    const cached = draftCache.current.get(key);
    setModal(cached || { kind, key, record, topicId: targetTopic, angleId: targetAngle, draft, expectedVersion: record?.version ?? null });
  };
  const save = async event => {
    event.preventDefault(); if (!canEdit || saving || !modal) return;
    setSaving(true); setDialogError("");
    const { kind, draft, record } = modal;
    try {
      if (kind === "task") {
        const seedKey = `knowledge-${selection?.type === "angle" ? "angle" : "topic"}:${selection?.type === "angle" ? angle?.id : topic?.id}`;
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !sessionData?.session?.user?.id) throw new Error("session_required");
        const owner = sessionData.session.user.id;
        const existing = await supabase.from("dashboard_plans").select("id,title,status").eq("user_id", owner).eq("seed_key", seedKey).limit(1);
        if (existing.error) throw existing.error;
        if (existing.data?.length) { setNotice(`Đã có việc “${existing.data[0].title}” trong Hôm nay. Mở Hôm nay để xem hoặc sửa việc đó.`); draftCache.current.delete(modal.key); setModalState(null); return; }
        const result = await supabase.from("dashboard_plans").insert({ user_id: owner, kind: "task", title: draft.title.trim().slice(0, 180), notes: draft.notes.trim().slice(0, 3000), event_on: draft.event_on || null, notify_telegram: false, href: `/admin/knowledge?topic=${encodeURIComponent(topic.id)}`, seed_key: seedKey });
        if (result.error) { if (result.error.code === "23505") { setNotice("Việc này vừa được thêm vào Hôm nay. Mở Hôm nay để xem lại."); } else throw result.error; }
        else setNotice("Đã thêm bước tiếp theo vào Hôm nay.");
      } else {
        let fields;
        let entity = kind;
        if (kind === "topic") {
          const sources = draft.sources.filter(item => item.label.trim() || item.url.trim());
          if (sources.some(item => !item.label.trim() || !https(item.url))) throw new Error("invalid_source");
          if (draft.memory_item_id && !snapshot.memory_items.some(item => item.id === draft.memory_item_id && item.status === "approved")) throw new Error("memory_not_approved");
          fields = { title: draft.title.trim(), domain: draft.domain, parent_id: draft.parent_id || null, body: draft.body.trim(), sources: sources.map(item => ({ label: item.label.trim(), url: https(item.url) })), status: draft.status, memory_item_id: draft.memory_item_id || null, next_action: draft.next_action.trim() };
        } else if (kind === "angle") fields = { topic_id: modal.topicId, title: draft.title.trim(), audience: draft.audience.trim(), hook: draft.hook.trim(), notes: draft.notes.trim(), next_action: draft.next_action.trim(), status: draft.status };
        else if (kind === "link") {
          entity = "post";
          const duplicate = snapshot.posts.find(item => item.growth_variant_id === draft.growth_variant_id);
          if (duplicate) { select({ type: "post", id: duplicate.id }); setNotice("Bài này đã được liên kết trong sổ tri thức. Đã mở liên kết hiện có; bài được giữ ở chủ đề đã chọn trước đó."); draftCache.current.delete(modal.key); setModalState(null); return; }
          fields = { topic_id: modal.topicId, angle_id: draft.angle_id || null, growth_variant_id: draft.growth_variant_id };
        } else {
          entity = "post";
          const metrics = Object.fromEntries(METRICS.map(([key]) => [key, draft.metrics[key] === "" ? null : Number(draft.metrics[key])]));
          if (Object.values(metrics).some(value => value !== null && (!Number.isFinite(value) || value < 0 || value > 1e15))) throw new Error("invalid_metrics");
          if (draft.url.trim() && !https(draft.url)) throw new Error("invalid_url");
          fields = kind === "metrics" ? { metrics, measurement_note: draft.measurement_note.trim() } : { topic_id: modal.topicId, angle_id: draft.angle_id || null, growth_variant_id: null, channel: draft.channel, title: draft.title.trim(), url: https(draft.url), published_at: draft.published_at ? new Date(`${draft.published_at}T12:00:00+07:00`).toISOString() : null, metrics, measurement_note: draft.measurement_note.trim() };
        }
        const { data, error: failure } = await supabase.rpc(`save_knowledge_${entity}`, { p_id: record?.id || null, p_fields: fields, p_expected_version: modal.expectedVersion });
        if (failure) throw failure;
        const saved = rowFromRpc(data);
        if (!saved?.id) throw new Error("missing_saved_row");
        select({ type: entity, id: saved.id });
        setSnapshot(current => ({ ...current, [`${entity}s`]: [...current[`${entity}s`].filter(item => item.id !== saved.id), saved] }));
        await load();
      }
      draftCache.current.delete(modal.key); setModalState(null);
    } catch (failure) {
      const message = String(failure?.message || "");
      if (/knowledge_.*_conflict/.test(message)) { setDialogError("Người khác đã sửa bản này. Tải bản mới để sửa; nội dung nhập trước đó sẽ được giữ để bạn sao chép."); await load(); }
      else setDialogError(({ knowledge_domain_mismatch: "Chủ đề và các nhánh con cần cùng lĩnh vực. Kiểm tra chủ đề cha trước khi đổi lĩnh vực.", knowledge_memory_not_approved: "Ghi nhớ này không còn được duyệt. Chọn ghi nhớ khác hoặc viết nội dung riêng.", knowledge_topic_cycle: "Chủ đề cha không thể nằm trong nhánh con của chính chủ đề này.", invalid_source: "Mỗi nguồn cần tên và đường dẫn HTTPS hợp lệ.", invalid_url: "Dùng đường dẫn HTTPS hợp lệ cho bài đăng.", invalid_metrics: "Số liệu phải là số không âm hoặc để trống khi chưa biết.", memory_not_approved: "Ghi nhớ này không còn trong danh sách đã duyệt. Chọn lại ghi nhớ.", session_required: "Phiên đăng nhập chưa sẵn sàng. Đăng nhập lại rồi thử lưu.", missing_saved_row: "Database chưa trả về bản đã lưu. Hãy tải lại để kiểm tra trước khi thử tiếp." })[message] || "Chưa lưu được nội dung. Bản nhập vẫn được giữ; kiểm tra kết nối và thử lại.");
    } finally { setSaving(false); }
  };
  const archive = async (type, record) => {
    if (!canEdit || saving) return;
    setSaving(true); setError("");
    try {
      const { data, error: failure } = await supabase.rpc(`save_knowledge_${type}`, { p_id: record.id, p_fields: { status: "archived" }, p_expected_version: record.version });
      if (failure) throw failure;
      const saved = rowFromRpc(data); if (!saved?.id) throw new Error("missing_row");
      setSnapshot(current => ({ ...current, [`${type}s`]: current[`${type}s`].map(item => item.id === saved.id ? saved : item) }));
      setNotice("Đã lưu kho. Lịch sử bài đăng và kết quả vẫn được giữ."); await load();
    } catch (failure) { setError(/conflict/.test(failure?.message || "") ? "Bản này vừa thay đổi. Tải lại và kiểm tra trước khi lưu kho." : "Chưa lưu kho được. Thử tải lại rồi thao tác lại."); } finally { setSaving(false); }
  };
  const toggle = key => setCollapsed(current => { const next = new Set(current); next.has(key) ? next.delete(key) : next.add(key); return next; });
  const row = (type, item, children, extra = "", contextTopicId = null, contextAngleId) => {
    const key = `${type}:${item.id}`;
    const isOpen = !collapsed.has(key);
    const isSelected = selection?.type === type && (selection.id === item.id || type === "post" && selectedPost?.id === item.id);
    return <li key={key} className={styles.branch}>
      <div className={styles.treeRow} data-selected={isSelected}>
        {children?.length ? <button type="button" className={styles.fold} onClick={() => toggle(key)} aria-expanded={isOpen} aria-label={`${isOpen ? "Thu" : "Mở"} nhánh ${item.title}`}>{isOpen ? <ChevronDown/> : <ChevronRight/>}</button> : <span className={styles.leafPoint} aria-hidden="true"/>}
        <button type="button" className={styles.nodeButton} onClick={() => selectFromUi({ type, id: item.id, ...(contextTopicId ? { topicId: contextTopicId } : {}), ...(contextAngleId !== undefined ? { angleId: contextAngleId } : {}) })} aria-pressed={isSelected}><span className={styles.nodeType}>{type === "topic" ? <BookOpen/> : type === "angle" ? <Lightbulb/> : <Link2/>}{description(type)}</span><b>{item.title || "Bài chưa đặt tên"}</b><small>{extra || STATUS[item.status] || item.status}</small></button>
      </div>
      {children?.length > 0 && isOpen && <ul className={styles.children}>{children}</ul>}
    </li>;
  };
  const postRow = (item, contextTopicId, contextAngleId) => row("post", item, null, `${CHANNELS[item.channel] || item.channel || "Growth Lab"} · ${item.published ? "Đã đăng" : "Chưa xác nhận đăng"}${archiveState(item) === "archived" ? " · Đã lưu kho" : ""}`, contextTopicId, contextAngleId);
  const showHistory = item => status === "all" || status === "archived" ? status === "all" || archiveState(item) === "archived" : archiveState(item) !== "archived";
  const topicRow = (item, visited = new Set()) => {
    if (visited.has(item.id)) return null;
    const next = new Set(visited); next.add(item.id);
    const angles = snapshot.angles.filter(angle => angle.topic_id === item.id && showHistory(angle));
    const children = [...visibleTopics.filter(child => child.parent_id === item.id).map(child => topicRow(child, next)), ...angles.map(angle => row("angle", angle, explorerNodes.filter(post => (post.angle_ids || [post.angle_id]).includes(angle.id) && showHistory(post)).map(post => postRow(post, item.id, angle.id)))), ...explorerNodes.filter(post => (post.topic_ids || [post.topic_id]).includes(item.id) && !(post.angle_ids || [post.angle_id]).some(id => angles.some(angle => angle.id === id)) && showHistory(post)).map(post => postRow(post, item.id, null))].filter(Boolean);
    const published = summarizeKnowledge(snapshot, { topicId: item.id, includeDescendants: false }).counts.publishedPosts;
    return row("topic", item, children, `${DOMAINS[item.domain]} · ${STATUS[item.status]} · ${published} bài đã đăng`);
  };
  const rawPost = post ? selectedPostRecord || snapshot.posts.find(item => item.id === post.id) || snapshot.posts.find(item => item.growth_variant_id === post.growth_variant_id && item.topic_id === topic?.id) : null;
  const briefHref = topic ? `/admin/growth?topic=${encodeURIComponent(topic.id)}${angle ? `&angle=${encodeURIComponent(angle.id)}` : ""}` : "/admin/growth";

  return <main className={styles.workspace}>
    <header className={styles.pageHeader}><div><span className={styles.eyebrow}>Tri thức công việc</span><h1>Trà & kinh doanh</h1><p>Nối điều đã biết với góc khai thác, bài đăng và điều học được.</p></div><div className={styles.headerActions}><button type="button" className={styles.iconButton} onClick={load} disabled={loading || saving} aria-label="Tải lại sổ tri thức"><RefreshCw className={loading ? styles.spin : ""}/></button>{canEdit && <button type="button" className={styles.primaryButton} disabled={!loaded || saving} onClick={() => open("topic", null, { topicId: "" })}><Plus/>Thêm chủ đề</button>}</div></header>
    {error && <div className={styles.failure} role="alert"><p>{error}</p><button type="button" className={styles.secondaryButton} disabled={loading} onClick={load}>Thử tải lại</button></div>}
    {notice && <p className={styles.notice} role="status">{notice} {notice.includes("Hôm nay") && <Link href="/admin#dashboard-planner">Mở Hôm nay <ArrowRight size={14}/></Link>}<button type="button" className={styles.iconButton} aria-label="Đóng thông báo" onClick={() => setNotice("")}><X/></button></p>}
    <section className={styles.overview} aria-label="Tổng quan sổ tri thức"><article><BookOpen/><span>Chủ đề</span><b>{!loaded ? "—" : snapshot.topics.filter(item => item.status !== "archived").length}</b><small>Trà & kinh doanh đang dùng</small></article><article><Lightbulb/><span>Góc khai thác</span><b>{!loaded ? "—" : snapshot.angles.filter(item => item.status !== "archived").length}</b><small>Ý tưởng, nghiên cứu & bản viết</small></article><article><Link2/><span>Lịch sử đã đăng</span><b>{!loaded ? "—" : total.counts.publishedPosts}</b><small>Bài riêng biệt · {total.counts.archivedPosts} bài lưu kho</small></article><article><GitBranch/><span>Chủ đề đã có bài</span><b>{!loaded ? "—" : snapshot.topics.filter(item => summarizeKnowledge(snapshot, { topicId: item.id, includeDescendants: false }).counts.publishedPosts > 0).length}</b><small>Tính bài gắn trực tiếp vào chủ đề</small></article></section>
    <div className={styles.workbench}>
      <section ref={explorerRef} tabIndex={-1} className={styles.explorer} aria-label="Duyệt chủ đề và bài đăng">
        <div className={styles.explorerHeading}><h2>Chủ đề <ChevronRight/> Góc khai thác <ChevronRight/> Bài & kết quả</h2><div className={styles.viewSwitch} role="group" aria-label="Cách xem"><button type="button" aria-pressed={view === "tree"} aria-label="Xem cây" onClick={() => setView("tree")}><GitBranch/></button><button type="button" aria-pressed={view === "list"} aria-label="Xem danh sách" onClick={() => setView("list")}><List/></button></div></div>
        <div className={styles.filters}><label className={styles.search}><Search/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Tìm chủ đề, góc, bài…" aria-label="Tìm trong sổ tri thức"/>{query && <button type="button" aria-label="Xóa tìm kiếm" onClick={() => setQuery("")}><X/></button>}</label><div><label><span className={styles.srOnly}>Lĩnh vực</span><select value={domain} onChange={event => setDomain(event.target.value)}><option value="all">Trà & kinh doanh</option><option value="tea">Trà</option><option value="business">Kinh doanh</option></select></label><label><span className={styles.srOnly}>Trạng thái chủ đề</span><select value={status} onChange={event => setStatus(event.target.value)}><option value="active">Đang dùng</option><option value="reviewed">Đã rà soát</option><option value="draft">Bản nháp</option><option value="archived">Lưu kho</option><option value="all">Cả lịch sử</option></select></label></div></div>
        {loading && !loaded ? <div className={styles.skeleton} role="status" aria-label="Đang tải sổ tri thức"><i/><i/><i/><span>Đang đọc chủ đề…</span></div> : !loaded ? <div className={styles.empty}><BookOpen/><h3>Chưa đọc được dữ liệu.</h3><p>Thử tải lại để xác nhận sổ tri thức hiện tại.</p></div> : snapshot.topics.length === 0 ? <div className={styles.empty}><Leaf/><h3>Bắt đầu từ một điều muốn hiểu.</h3><p>Tạo chủ đề về trà hoặc kinh doanh, giữ câu hỏi chưa kiểm chứng ở bản nháp.</p>{canEdit && <button className={styles.primaryButton} type="button" onClick={() => open("topic")}><Plus/>Tạo chủ đề đầu tiên</button>}</div> : (query.trim() || view === "list") ? <div className={styles.list}><p className={styles.listCount}>{matches.length} mục{query.trim() ? " phù hợp" : " trong phạm vi chọn"}</p>{matches.map(item => <button key={selectedKey(item)} type="button" data-selected={selectedKey(selection) === selectedKey(item)} onClick={() => selectFromUi({ type: item.type, id: item.id, ...(item.type === "post" ? { topicId: item.topic?.id } : {}) })}><span className={styles.nodeType}>{description(item.type)}</span><b>{item.title}</b><small>{item.topic?.title}{item.type !== "topic" ? " · " : ""}{STATUS[item.status] || item.status}</small><ChevronRight/></button>)}{!matches.length && <div className={styles.empty}><Search/><h3>Không có mục phù hợp.</h3><p>Thử từ khóa khác hoặc chọn Cả lịch sử.</p></div>}</div> : roots.length ? <ul className={styles.tree}>{roots.map(item => topicRow(item))}</ul> : <div className={styles.empty}><BookOpen/><h3>Chưa có chủ đề trong phạm vi này.</h3><p>Chọn lĩnh vực hoặc trạng thái khác.</p></div>}
        <p className={styles.explorerFoot}>Các nhánh nối kiến thức với nội dung đã thử. Bản nháp chưa phải thông tin đã kiểm chứng.</p>
      </section>
      <section ref={detailRef} tabIndex={-1} className={styles.detail} aria-label="Chi tiết mục đã chọn" aria-busy={loading && loaded}>
        {!chosen ? <div className={styles.detailEmpty}><GitBranch/><h2>{selection && loaded ? "Mục này chưa có trong dữ liệu." : "Chọn một nhánh để tiếp tục."}</h2><p>{selection && loaded ? "Tải lại hoặc chọn chủ đề khác trong danh sách." : "Đọc nguồn, thêm góc khai thác, hoặc kiểm tra bài đã đăng từ cùng một nơi."}</p></div> : <>
          <header className={styles.detailHeader}><button type="button" className={styles.mobileBack} onClick={() => { explorerRef.current?.scrollIntoView({ block: "start", behavior: "auto" }); explorerRef.current?.focus({ preventScroll: true }); }}><GitBranch/>Về cây chủ đề</button><span className={styles.eyebrow}>{description(selection.type)} · {topic && DOMAINS[topic.domain]}</span><h2>{chosen.title}</h2><div className={styles.meta}><span className={styles.status} data-status={(selection.type === "post" ? rawPost?.status : archiveState(chosen)) === "archived" ? "archived" : chosen.status}>{(selection.type === "post" ? rawPost?.status : archiveState(chosen)) === "archived" ? "Đã lưu kho" : selection.type === "post" ? chosen.published ? "Đã đăng" : "Chưa xác nhận đăng" : STATUS[chosen.status] || chosen.status}</span>{selection.type !== "topic" && topic && <button type="button" onClick={() => selectFromUi({ type: "topic", id: topic.id })}>{topic.title} <ChevronRight size={14}/></button>}</div></header>
          {canEdit && <section className={styles.commands} aria-label="Lệnh brainstorm cho mục đã chọn"><span>Làm tiếp từ nhánh này</span><div>
            {selection.type === "topic" && <><button type="button" onClick={() => open("topic", null, { parent_id: topic.id })}><GitBranch/>Thêm nhánh con</button><button type="button" onClick={() => open("topic", topic)}><PencilLine/>Sửa kiến thức & nguồn</button><button type="button" onClick={() => open("angle")}><Lightbulb/>Thêm góc khai thác</button></>}
            {selection.type === "angle" && <button type="button" onClick={() => open("angle", angle)}><PencilLine/>Sửa góc khai thác</button>}
            {selection.type !== "post" && <><Link href={briefHref}><ArrowRight/>Tạo brief trong Growth Lab</Link><button type="button" onClick={() => open("link")}><Link2/>Liên kết bài Growth Lab</button><button type="button" onClick={() => open("post")}><Plus/>Ghi bài đã đăng</button><button type="button" onClick={() => open("task")}><Check/>Đưa bước tiếp vào Hôm nay</button></>}
            {selection.type === "post" && post.source === "external" && rawPost && <><button type="button" onClick={() => open("post", rawPost)}><PencilLine/>Sửa thông tin bài</button><button type="button" onClick={() => open("metrics", rawPost)}><List/>Cập nhật số liệu</button></>}
            {selection.type === "post" && post.source === "growth" && <Link href={`/admin/growth?experiment=${encodeURIComponent(post.experiment_id || "")}&variant=${encodeURIComponent(post.growth_variant_id)}`}><PencilLine/>Cập nhật bài & số liệu trong Growth Lab</Link>}
          </div></section>}
          {selection.type === "topic" && <>
            <section className={styles.contentSection}><div className={styles.sectionHeading}><h3>{topic.memory_item_id ? "Ghi nhớ công ty đã duyệt" : "Kiến thức & câu hỏi"}</h3>{topic.memory_item_id && <span>Bản gốc liên kết</span>}</div>{topic.memory_item_id ? approvedMemory ? <><b>{approvedMemory.title}</b><p className={styles.plainText}>{approvedMemory.body}</p><small>Đọc từ ghi nhớ đã duyệt. Chủ đề và ghi nhớ có trạng thái riêng.</small></> : <p className={styles.hint}>Ghi nhớ liên kết hiện không có trong danh sách đã duyệt. Kiểm tra bản gốc trước khi dùng làm căn cứ.</p> : <p className={styles.plainText}>{topic.body || "Chưa ghi nội dung. Thêm điều đã biết hoặc câu hỏi cần tìm hiểu, kèm nguồn kiểm chứng."}</p>}{topic.status === "draft" && <p className={styles.draftNote}>Bản nháp: kiểm tra nguồn trước khi dùng nội dung này như một sự thật.</p>}</section>
            <section className={styles.contentSection}><h3>Nguồn tham khảo</h3>{topic.sources?.length ? <ul className={styles.sources}>{topic.sources.map((source, index) => <li key={`${source.url}-${index}`}>{https(source.url) ? <a href={https(source.url)} target="_blank" rel="noreferrer">{source.label || "Nguồn tham khảo"}<ExternalLink/></a> : <span>{source.label || "Nguồn tham khảo"} · đường dẫn chưa hợp lệ</span>}</li>)}</ul> : <p className={styles.hint}>Chưa có nguồn tham khảo.</p>}</section>
            <section className={styles.coverage}><h3>Phạm vi đã khai thác</h3><div><article><span>Riêng chủ đề</span><b>{ownSummary.counts.publishedPosts} <small>bài đã đăng</small></b></article><article><span>Chủ đề + các nhánh con</span><b>{branchSummary.counts.publishedPosts} <small>bài riêng biệt</small></b></article></div><p>Lịch sử gồm bài đã lưu kho. Một bài liên kết nhiều nhánh chỉ được cộng một lần khi tổng hợp.</p><div className={styles.channelChips}>{[...new Set(branchSummary.posts.map(item => item.channel))].map(channel => <span key={channel}>{CHANNELS[channel] || channel || "Chưa ghi kênh"} · {branchSummary.posts.filter(item => item.channel === channel).length}</span>)}</div></section>
          </>}
          {selection.type === "angle" && <section className={styles.contentSection}><dl className={styles.angleFacts}><div><dt>Dành cho ai</dt><dd>{angle.audience || "Chưa chọn người đọc"}</dd></div><div><dt>Câu mở</dt><dd className={styles.plainText}>{angle.hook || "Chưa viết câu mở"}</dd></div><div><dt>Ghi chú</dt><dd className={styles.plainText}>{angle.notes || "Chưa ghi điều cần tìm hiểu"}</dd></div></dl><p className={styles.draftNote}>Góc khai thác là hướng thử nội dung; kiểm tra bằng nguồn và kết quả thực tế.</p></section>}
          {selection.type !== "post" && <>
            <section className={styles.nextAction}><h3>Bước tiếp theo</h3><p>{chosen.next_action || "Chưa chọn bước tiếp theo. Bắt đầu từ một câu hỏi hoặc một việc có thể làm."}</p></section>
            <section className={styles.contentSection}><div className={styles.sectionHeading}><h3>{selection.type === "topic" ? "Bài gắn vào chủ đề" : "Bài & kết quả"}</h3><span>{ownSummary.counts.publishedPosts} bài đã đăng</span></div><div className={styles.relatedPosts}>{(selection.type === "angle" ? nodes.filter(item => (item.angle_ids || [item.angle_id]).includes(angle.id)) : relatedPosts).map(item => <button key={item.id} type="button" onClick={() => selectFromUi({ type: "post", id: item.id, topicId: topic.id, ...(selection.type === "angle" ? { angleId: angle.id } : {}) })}><span><b>{item.title}</b><small>{CHANNELS[item.channel] || item.channel} · {item.published ? date(item.published_at) : "Chưa xác nhận đăng"}{archiveState(item) === "archived" ? " · Đã lưu kho" : ""}</small></span><ChevronRight/></button>)}</div>{!(selection.type === "angle" ? nodes.some(item => (item.angle_ids || [item.angle_id]).includes(angle.id)) : relatedPosts.length) && <p className={styles.hint}>Chưa có bài gắn trực tiếp vào mục này. Tạo brief, nối bài Growth Lab, hoặc ghi bài trên kênh khác.</p>}</section>
            <details className={styles.resultDetails}><summary>Kết quả {selection.type === "topic" ? "chủ đề + nhánh con" : "góc khai thác"} <ChevronDown/></summary><Results summary={selection.type === "topic" ? branchSummary : ownSummary}/></details>
          </>}
          {selection.type === "post" && <>
            <section className={styles.contentSection}><dl className={styles.angleFacts}><div><dt>Kênh</dt><dd>{CHANNELS[post.channel] || post.channel || "Chưa ghi kênh"}</dd></div><div><dt>Ngày đăng</dt><dd>{post.published ? date(post.published_at) : "Chưa xác nhận đăng"}</dd></div><div><dt>Nguồn bài</dt><dd>{post.source === "growth" ? "Bài gốc trong Growth Lab" : "Bài được ghi từ kênh bên ngoài"}</dd></div></dl>{https(post.url) && <a className={styles.externalPost} href={https(post.url)} target="_blank" rel="noreferrer">Mở bài đã đăng <ExternalLink/></a>}{!post.published && <p className={styles.draftNote}>Bài này chưa có đủ căn cứ xuất bản nên chưa được cộng vào số bài đã đăng.</p>}{post.body && <><h3 className={styles.postBodyHeading}>Nội dung bài gốc</h3><p className={styles.plainText}>{post.body}</p></>}{post.duplicate_note && <p className={styles.draftNote}>{post.duplicate_note}</p>}{post.measurement_note && <><h3 className={styles.postBodyHeading}>Cách đo / phạm vi</h3><p className={styles.plainText}>{post.measurement_note}</p></>}</section>
            <section className={styles.postMetrics}><h3>Số liệu nền tảng & nhập tay</h3><dl>{METRICS.map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{number(post.metrics?.[key])}</dd></div>)}</dl><p className={styles.hint}>“Chưa có” khác 0. Lead, đơn, doanh thu và chi phí nhập tay cần có cách đo để kiểm tra.</p></section>
            {post.source === "growth" && <section className={styles.postMetrics}><h3>Theo dõi từ Growth Lab</h3><dl>{[["visitors", "Vào trang mẫu"], ["qualified_requests", "Yêu cầu đủ điều kiện"], ["samples_sent", "Đã gửi mẫu"], ["sample_requests_with_order", "Yêu cầu có đơn về sau"]].map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{number(post.tracked_metrics?.[key])}</dd></div>)}</dl><p className={styles.hint}>Đối chiếu đơn về sau theo liên hệ là tín hiệu nghiên cứu, chưa phải số đơn được quy cho bài này.</p></section>}
          </>}
          {canEdit && (selection.type === "post" ? rawPost?.status !== "archived" : archiveState(chosen) !== "archived") && <footer className={styles.archiveFooter}><button type="button" className={styles.secondaryButton} disabled={saving || selection.type === "post" && !rawPost} onClick={() => archive(selection.type, selection.type === "post" ? rawPost : chosen)}><Archive/>Lưu kho {selection.type === "post" ? "liên kết bài này" : description(selection.type).toLowerCase()}</button><span>Giữ lại nội dung và lịch sử kết quả.</span></footer>}
        </>}
      </section>
    </div>
    {!canEdit && <p className={styles.readOnly}>Bạn đang xem sổ tri thức. Quản lý có thể thêm kiến thức, góc khai thác và số liệu.</p>}
    {modal && <KnowledgeDialog modal={modal} setModal={setModal} saving={saving} error={dialogError} snapshot={snapshot} variants={variants} onClose={() => setModalState(null)} onSave={save}/>}
  </main>;
}
