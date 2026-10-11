"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, ExternalLink, Inbox, Link2, RefreshCw, Search } from "lucide-react";
import { safeKnowledgeUrl } from "@/lib/knowledge-centre";
import styles from "./KnowledgeSocialInbox.module.css";

const CHANNELS = { threads: "Threads", facebook: "Facebook", instagram: "Instagram", tiktok: "TikTok", youtube: "YouTube", linkedin: "LinkedIn", other: "Kênh khác" };
const METRICS = [["views", "Lượt xem"], ["likes", "Thích"], ["comments", "Bình luận"], ["shares", "Chia sẻ"], ["clicks", "Lượt bấm"]];
const EMPTY = { posts: [], links: [], last_import_at: null };
const fold = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();
const https = value => { const url = safeKnowledgeUrl(value); return url.startsWith("https://") ? url : ""; };
const number = value => value == null ? "Chưa có" : new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(value);
const date = value => {
  if (!value) return "Chưa có";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "Chưa có" : new Intl.DateTimeFormat("vi-VN", { day: "numeric", month: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh" }).format(parsed);
};
const rowFromRpc = value => Array.isArray(value) ? value[0] : value;
const errorText = failure => {
  const message = String(failure?.message || failure || "");
  if (/social_sync_not_configured|buffer_not_configured/.test(message)) return "Bản nhập thử đã xem được. Để lấy bài mới từ website, cần kết nối Buffer cho website; đồng bộ hằng ngày chưa bật.";
  if (/social_sync_cooldown/.test(message)) return "Vừa lấy dữ liệu mới. Chờ khoảng một phút trước khi đồng bộ tiếp.";
  if (/knowledge_social_url_ambiguous/.test(message)) return "Bài này khớp nhiều liên kết đã có. Cần rà soát các bản trùng trong sổ tri thức trước khi nối nguồn Buffer.";
  if (/unauthorized|session_required|forbidden/.test(message)) return "Phiên đăng nhập chưa sẵn sàng. Đăng nhập lại rồi thử tiếp.";
  if (/conflict/.test(message)) return "Liên kết bài vừa thay đổi. Đã tải bản hiện tại; kiểm tra chủ đề trước khi lưu lại.";
  if (/archived|invalid_topic|invalid_angle|topic_required/.test(message)) return "Chọn chủ đề đang dùng và góc khai thác thuộc chủ đề đó.";
  if (/function|schema cache|relation|does not exist/.test(message)) return "Phần bài đăng đang chờ cập nhật database. Bạn vẫn có thể dùng sổ tri thức phía dưới.";
  if (/buffer_|social_provider_|social_sync_/.test(message)) return "Chưa lấy được bài mới từ Buffer. Bản đã nhập vẫn được giữ; thử lại sau.";
  return "Chưa hoàn thành thao tác. Nội dung đã nhập vẫn được giữ; kiểm tra kết nối và thử lại.";
};

export default function KnowledgeSocialInbox({ supabase, canEdit, snapshot, onChanged, focusRequest }) {
  const [inbox, setInbox] = useState(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [channel, setChannel] = useState("all");
  const [scope, setScope] = useState("new");
  const [limit, setLimit] = useState(8);
  const [drafts, setDrafts] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [configured, setConfigured] = useState(null);
  const requestRef = useRef(0);
  const changedRef = useRef(onChanged);
  changedRef.current = onChanged;

  const load = useCallback(async ({ linked = false } = {}) => {
    const request = ++requestRef.current;
    setLoading(true); setError("");
    try {
      const result = await supabase.rpc("knowledge_social_inbox_snapshot");
      if (request !== requestRef.current) return;
      if (result.error) throw result.error;
      const value = rowFromRpc(result.data) || EMPTY;
      const next = { ...value, posts: Array.isArray(value.posts) ? value.posts : [], links: Array.isArray(value.links) ? value.links : [] };
      setInbox(next); setLoaded(true);
      await changedRef.current?.({ social_posts: next.posts, linked });
    } catch (failure) { if (request === requestRef.current) setError(errorText(failure)); }
    finally { if (request === requestRef.current) setLoading(false); }
  }, [supabase]);

  useEffect(() => { load(); return () => { requestRef.current += 1; }; }, [load]);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    (async () => {
      try {
        const { data, error: authError } = await supabase.auth.getSession();
        if (authError || !data?.session?.access_token) { if (active) setConfigured(false); return; }
        const response = await fetch("/api/staff/knowledge/social-sync", { headers: { Authorization: `Bearer ${data.session.access_token}` }, signal: controller.signal });
        const body = await response.json();
        if (response.ok && active) setConfigured(Boolean(body.configured));
      } catch { /* Inbox data remains usable even when the optional connection check fails. */ }
    })();
    return () => { active = false; controller.abort(); };
  }, [supabase]);

  const topics = useMemo(() => (snapshot.topics || []).filter(item => item.status !== "archived"), [snapshot.topics]);
  const links = useMemo(() => new Map(inbox.links.map(item => [item.social_post_id, item])), [inbox.links]);
  const unclassified = inbox.pending_count ?? inbox.posts.filter(item => !links.has(item.id)).length;
  const visible = useMemo(() => inbox.posts.filter(item => (channel === "all" || item.channel === channel) && (scope === "all" || !links.has(item.id)) && (!query.trim() || fold(`${item.title || ""} ${item.body || ""} ${item.account_name || ""} ${item.url || ""}`).includes(fold(query.trim())))), [inbox.posts, channel, scope, links, query]);
  const editDraft = (id, change) => setDrafts(current => ({ ...current, [id]: { ...(current[id] || {}), ...change } }));

  useEffect(() => {
    if (!focusRequest?.id) return;
    setOpen(true); setChannel("all"); setScope("all"); setQuery(""); setLimit(200);
    const timer = window.setTimeout(() => {
      const element = document.getElementById(`knowledge-social-post-${focusRequest.id}`) || document.getElementById("knowledge-social-inbox");
      element?.scrollIntoView({ block: "start", behavior: "auto" });
      element?.focus({ preventScroll: true });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [focusRequest]);

  const linkPost = async (event, item) => {
    event.preventDefault();
    if (!canEdit || savingId || syncing) return;
    const existing = links.get(item.id);
    const draft = drafts[item.id] || { topic_id: existing?.topic_id || "", angle_id: existing?.angle_id || "" };
    if (!topics.some(topic => topic.id === draft.topic_id)) { setError("Chọn chủ đề đang dùng trước khi lưu liên kết."); return; }
    setSavingId(item.id); setError(""); setNotice("");
    try {
      const result = await supabase.rpc("link_knowledge_social_post", { p_social_post_id: item.id, p_topic_id: draft.topic_id, p_angle_id: draft.angle_id || null, p_expected_version: existing?.version ?? null });
      if (result.error) throw result.error;
      const resultRow = rowFromRpc(result.data);
      const saved = resultRow?.post || resultRow;
      if (!saved?.id) throw new Error("missing_saved_row");
      const title = (snapshot.topics || []).find(topic => topic.id === saved.topic_id)?.title || "chủ đề đã lưu";
      setNotice(resultRow?.preserved_assignment ? `Bài này đã có trong “${title}”. Đã giữ liên kết hiện tại và nối dữ liệu Buffer.` : `Đã nối bài với “${title}”. Lịch sử và kết quả đã cập nhật trong cây chủ đề.`);
      setDrafts(current => { const next = { ...current }; delete next[item.id]; return next; });
      await load({ linked: true });
    } catch (failure) { const message = errorText(failure); if (/conflict/.test(String(failure?.message || ""))) await load(); setError(message); }
    finally { setSavingId(null); }
  };

  const sync = async () => {
    if (!canEdit || syncing || savingId) return;
    setSyncing(true); setError(""); setNotice("");
    try {
      const { data, error: authError } = await supabase.auth.getSession();
      if (authError || !data?.session?.access_token) throw new Error("session_required");
      const response = await fetch("/api/staff/knowledge/social-sync", { method: "POST", headers: { Authorization: `Bearer ${data.session.access_token}`, "Content-Type": "application/json" }, body: JSON.stringify({}) });
      const body = await response.json();
      if (!response.ok) { if (body.error === "social_sync_not_configured") setConfigured(false); throw new Error(body.error || body.code || "buffer_sync_failed"); }
      setConfigured(true);
      setNotice(`Đã nhập ${body.imported || 0} bài mới, cập nhật ${body.updated || 0} bài. Liên kết và ghi chú đã có được giữ.${body.hasMore ? ` Lần này lấy ${body.limit || 20} bài gần nhất; chưa lấy toàn bộ lịch sử.` : ""}`);
      await load({ linked: true });
    } catch (failure) { setError(errorText(failure)); }
    finally { setSyncing(false); }
  };

  return <section id="knowledge-social-inbox" tabIndex={-1} className={styles.inbox} aria-label="Bài đăng mạng xã hội" aria-busy={loading || syncing}>
    <header className={styles.header}>
      <button type="button" className={styles.heading} onClick={() => setOpen(value => !value)} aria-expanded={open} aria-controls="knowledge-social-inbox-content"><Inbox/><span><b>Bài đăng chờ phân loại</b><small>{loaded ? `${unclassified} chưa gắn chủ đề · ${inbox.total_count ?? inbox.posts.length} bài đã nhập` : "Đang đọc bài đăng…"}</small></span><ChevronDown className={!open ? styles.closed : ""}/></button>
      <div className={styles.actions}><button type="button" disabled={loading || syncing || Boolean(savingId)} onClick={() => load()} aria-label="Tải lại bài đã nhập"><RefreshCw className={loading ? styles.spin : ""}/></button>{canEdit && <button type="button" className={styles.primary} disabled={configured !== true || syncing || loading || Boolean(savingId)} onClick={sync}><RefreshCw className={syncing ? styles.spin : ""}/>{syncing ? "Đang đồng bộ…" : configured === true ? "Lấy bài mới" : "Chờ kết nối Buffer"}</button>}</div>
    </header>
    {open && <div id="knowledge-social-inbox-content" className={styles.content}>
      <p className={styles.intro}>Gắn bài vào chủ đề để xem đã khai thác bao nhiêu lần và kết quả. Nội dung mạng xã hội được giữ như bản gốc; chưa phải kiến thức đã rà soát.</p>
      <div className={styles.connection}><span>Nguồn: Buffer · Nhập gần nhất: {date(inbox.last_import_at)}</span><span>{configured === true ? "Kết nối website đã sẵn sàng · Lấy bài mới bằng nút phía trên" : configured === false ? "Bản nhập thử · Kết nối lấy bài mới cho website chưa bật" : "Đang kiểm tra kết nối website"}</span></div>
      {notice && <p className={styles.notice} role="status"><Check/>{notice}</p>}
      {error && <p className={styles.error} role="alert">{error}</p>}
      <div className={styles.filters}><label className={styles.search}><Search/><input type="search" aria-label="Tìm trong bài đã nhập" placeholder="Tìm nội dung hoặc tài khoản…" value={query} onChange={event => { setQuery(event.target.value); setLimit(8); }}/></label><label><span className={styles.srOnly}>Kênh bài đăng</span><select value={channel} onChange={event => { setChannel(event.target.value); setLimit(8); }}><option value="all">Tất cả kênh</option>{[...new Set(inbox.posts.map(item => item.channel))].map(key => <option key={key} value={key}>{CHANNELS[key] || key}</option>)}</select></label><label><span className={styles.srOnly}>Phân loại bài đăng</span><select value={scope} onChange={event => { setScope(event.target.value); setLimit(8); }}><option value="new">Chưa gắn chủ đề</option><option value="all">Tất cả bài đã nhập</option></select></label></div>
      {!loaded && loading ? <p className={styles.empty} role="status">Đang đọc bài đăng đã nhập…</p> : !loaded ? <div className={styles.empty}><p>Chưa đọc được danh sách bài. Dữ liệu trong sổ tri thức vẫn được giữ.</p><button type="button" onClick={() => load()} disabled={loading}>Thử tải lại</button></div> : !visible.length ? <p className={styles.empty}>{inbox.posts.length ? scope === "new" && !query && channel === "all" ? "Các bài đã nhập đều có chủ đề. Chọn Tất cả bài đã nhập để xem hoặc đổi liên kết." : "Chưa có bài phù hợp. Thử từ khóa hoặc bộ lọc khác." : "Chưa có bài đã nhập. Lấy bài mới khi kết nối Buffer cho website sẵn sàng."}</p> : <>
        <div className={styles.cards}>{visible.slice(0, limit).map(item => {
          const existing = links.get(item.id);
          const draft = drafts[item.id] || { topic_id: existing?.topic_id || "", angle_id: existing?.angle_id || "" };
          const angles = (snapshot.angles || []).filter(angle => angle.topic_id === draft.topic_id && angle.status !== "archived");
          const title = item.title || item.body?.slice(0, 100) || "Bài đã đăng";
          const linkedTopic = (snapshot.topics || []).find(topic => topic.id === existing?.topic_id);
          const url = https(item.url);
          return <article key={item.id} id={`knowledge-social-post-${item.id}`} tabIndex={-1} className={styles.card}>
            <div className={styles.cardTop}><span className={styles.channel}>{CHANNELS[item.channel] || item.channel}</span><span className={styles.linkStatus} data-linked={existing?.status === "active"}>{existing?.status === "active" ? "Đã gắn chủ đề" : existing?.status === "archived" ? "Liên kết đã lưu kho" : "Chờ phân loại"}</span></div>
            <h3>{title}</h3><p className={styles.meta}>{item.account_name || "Tài khoản chưa ghi tên"} · Đăng {date(item.published_at)}</p>
            <details className={styles.body}><summary>Xem nội dung gốc <ChevronDown/></summary><p>{item.body || "Buffer chưa trả về nội dung chữ của bài này."}</p>{Array.isArray(item.media) && item.media.length > 0 && <p className={styles.meta}>{item.media.length} tệp hình ảnh / video · xem trên bài gốc</p>}</details>
            {url && <a className={styles.original} href={url} target="_blank" rel="noreferrer">Mở bài gốc <ExternalLink/></a>}
            <dl className={styles.metrics}>{METRICS.map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{number(item.metrics?.[key])}</dd></div>)}</dl>
            <p className={styles.freshness}>{item.metrics_updated_at ? `Số liệu cập nhật ${date(item.metrics_updated_at)}` : "Chưa lấy được số liệu nền tảng"} · Nhập {date(item.fetched_at)}{item.import_method === "connector" ? " qua kết nối chat" : " từ website"}. Ô chưa có không phải 0.</p>
            {Array.isArray(item.raw_metrics) && item.raw_metrics.some(metric => !METRICS.some(([key]) => key === metric.type)) && <details className={styles.extraMetrics}><summary>Chỉ số khác từ Buffer</summary><dl>{item.raw_metrics.filter(metric => !METRICS.some(([key]) => key === metric.type)).map((metric, index) => <div key={`${metric.type}-${index}`}><dt>{metric.name || metric.type}</dt><dd>{number(metric.value)}{metric.unit && metric.unit !== "count" ? ` ${metric.unit}` : ""}</dd></div>)}</dl></details>}
            {existing?.topic_id && <p className={styles.assignment}>Hiện ở: <b>{linkedTopic?.title || "Chủ đề đã lưu"}</b>{existing.angle_id && ` · ${(snapshot.angles || []).find(angle => angle.id === existing.angle_id)?.title || "Góc khai thác đã lưu"}`}</p>}
            {canEdit && <form className={styles.linkForm} onSubmit={event => linkPost(event, item)}><label>Chủ đề<select required value={draft.topic_id} onChange={event => editDraft(item.id, { topic_id: event.target.value, angle_id: "" })}><option value="">Chọn chủ đề…</option>{topics.map(topic => <option key={topic.id} value={topic.id}>{topic.domain === "business" ? "Kinh doanh" : "Trà"} · {topic.title}</option>)}</select></label><label>Góc khai thác (tùy chọn)<select value={draft.angle_id} disabled={!draft.topic_id || !angles.length} onChange={event => editDraft(item.id, { topic_id: draft.topic_id, angle_id: event.target.value })}><option value="">Chưa gắn góc cụ thể</option>{angles.map(angle => <option key={angle.id} value={angle.id}>{angle.title}</option>)}</select></label><button type="submit" className={styles.linkButton} disabled={!draft.topic_id || Boolean(savingId) || syncing || loading}><Link2/>{savingId === item.id ? "Đang lưu…" : existing ? "Lưu liên kết" : "Gắn vào chủ đề"}</button></form>}
          </article>;
        })}</div>
        {visible.length > limit && <button type="button" className={styles.more} onClick={() => setLimit(value => Math.min(value + 8, 200))}>Xem thêm {Math.min(8, visible.length - limit)} bài ({visible.length - limit} còn lại)</button>}
        {inbox.total_count > inbox.posts.length && <p className={styles.freshness}>Đang xem {inbox.posts.length} bài gần nhất trong {inbox.total_count} bài đã nhập.</p>}
      </>}
    </div>}
  </section>;
}
