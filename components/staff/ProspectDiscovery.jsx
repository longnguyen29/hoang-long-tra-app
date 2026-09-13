"use client";

import { useEffect, useState } from "react";
import { PROSPECT_STATES, SEGMENTS, normalizeProspect, sourceKey, teaSignals } from "@/lib/prospect-discovery";
import { DISCOVERY_SEED } from "@/lib/prospect-discovery-seed";
import ProspectContacts from "./ProspectContacts";
import { possibleDuplicates, matchesQueue } from "@/lib/prospect-dedupe";
import styles from "./ProspectDiscovery.module.css";

export default function ProspectDiscovery({ supabase, preview = false }) {
  const [saved, setSaved] = useState([]);
  const [summaries, setSummaries] = useState([]);
  const [previewDrafts, setPreviewDrafts] = useState({});
  const [queue, setQueue] = useState("all");
  const [candidates, setCandidates] = useState(DISCOVERY_SEED);
  const [selected, setSelected] = useState(DISCOVERY_SEED[0]);
  const [region, setRegion] = useState("");
  const [segment, setSegment] = useState("all");
  const [tab, setTab] = useState("research");
  const [filter, setFilter] = useState("all");
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(preview);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [loadError, setLoadError] = useState("");

  async function headers() {
    const { data: { session } } = await supabase.auth.getSession();
    return { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token || ""}` };
  }
  async function loadSummary() {
    if (preview) return;
    const {data,error} = await supabase.rpc("discovery_review_summary");
    if(error) {setMessage("Chưa tải được hàng chờ liên hệ/bản nháp. Thử tải lại danh sách."); return;}
    setSummaries(data || []);
  }
  async function reload() {
    const { data, error } = await supabase.from("discovery_prospects").select("*").order("updated_at", { ascending: false }).limit(500);
    if (error) { setReady(false); setLoadError("Chưa tải được hồ sơ đã lưu. Cần kiểm tra kết nối hoặc hoàn tất thiết lập dữ liệu; chưa thể lưu thay đổi."); return []; }
    await loadSummary();
    setSaved(data || []); setReady(true); setLoadError(""); return data || [];
  }
  useEffect(() => {
    if (preview) return;
    let active = true;
    (async () => {
      try {
        await reload();
        const response = await fetch("/api/staff/discovery", { headers: await headers() });
        const data = await response.json();
        if (active) setEnabled(Boolean(data.enabled));
      } catch { if (active) setLoadError("Không kết nối được. Tải lại trang để thử lại."); }
    })();
    return () => { active = false; };
    // This workspace uses a stable Supabase client supplied by the page.
  }, [supabase, preview]);

  const existing = selected && saved.find(p => p.source_key === sourceKey(selected.source_url));
  const current = existing || selected;
  const duplicates = current ? possibleDuplicates(current, saved) : [];
  const rows = (tab === "saved" ? saved : candidates.map(p => saved.find(s => s.source_key === sourceKey(p.source_url)) || p)).filter(p => (filter === "all" || p.status === filter) && (queue === "duplicates" ? possibleDuplicates(p,saved).length > 0 : matchesQueue(p, preview ? {has_draft:Boolean(previewDrafts[p.id])} : summaries.find(s=>s.prospect_id===p.id), queue)));
  async function runSearch(event) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/staff/discovery", { method: "POST", headers: await headers(), body: JSON.stringify({ region, segment }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Chưa tìm được quán. Thử lại sau.");
      setCandidates(data.candidates); setSelected(data.candidates[0] || null); setTab("research"); setFilter("all");
      setMessage(data.warning || "Đã tìm xong. Mở nguồn để kiểm tra trước khi lưu.");
    } catch (error) { setMessage(error.message); } finally { setBusy(false); }
  }
  async function saveProspect(p) {
    setBusy(true); setMessage("");
    try {
      const clean = normalizeProspect(p);
      if (saved.some(row => row.source_key === clean.source_key)) throw new Error("Nguồn này đã được lưu. Mở hồ sơ đã lưu để tiếp tục.");
      if (preview) {
        const record = { ...clean, id: crypto.randomUUID(), observed_at: p.observed_at || new Date().toISOString(), status: "research", version: 1 };
        setSaved(rows => [record, ...rows]); setSelected(record); setMessage("Đã lưu trong bản xem thử. Tải lại trang sẽ đặt lại dữ liệu.");
      } else {
        const { data, error } = await supabase.from("discovery_prospects").insert({ ...clean, ...(p.observed_at ? { observed_at: p.observed_at } : {}) }).select().single();
        if (error) throw new Error(error.code === "23505" ? "Nguồn này đã được người khác lưu. Tải lại danh sách để mở hồ sơ." : "Chưa lưu được. Dữ liệu trên màn hình vẫn còn; thử lại sau.");
        setSaved(rows => [data, ...rows]); setSelected(data); setMessage("Đã lưu quán vào danh sách cần kiểm tra.");
      }
    } catch (error) { setMessage(error.message); } finally { setBusy(false); }
  }
  async function review(event) {
    event.preventDefault(); if (!existing) return;
    const form = new FormData(event.currentTarget);
    setBusy(true); setMessage("");
    const change = { status: form.get("status"), notes: form.get("notes"), contact: form.get("contact"), name: form.get("name"), region: form.get("region"), evidence: form.get("evidence"), evidence_kind: form.get("page_review") ? "page_review" : "search_snippet" };
    try {
      let updated;
      if (preview) updated = { ...existing, ...change, version: existing.version + 1 };
      else {
        const { data, error } = await supabase.rpc("review_discovery_prospect", { p_id: existing.id, p_version: existing.version, p_status: change.status, p_notes: change.notes, p_contact: change.contact, p_name: change.name, p_region: change.region, p_evidence: change.evidence, p_page_review: change.evidence_kind === "page_review" });
        if (error) throw new Error(error.message.includes("stale_prospect") ? "Có người vừa sửa hồ sơ này. Bấm tải lại danh sách để đọc bản mới trước khi lưu." : "Chưa lưu được thay đổi. Thử lại sau.");
        updated = data;
      }
      setSaved(rows => rows.map(p => p.id === updated.id ? updated : p)); setSelected(updated); loadSummary();
      setMessage(preview ? "Đã cập nhật trong bản xem thử." : "Đã cập nhật hồ sơ.");
    } catch (error) { setMessage(error.message); } finally { setBusy(false); }
  }
  function addManual(event) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    saveProspect({ ...data, evidence_kind: "page_review" });
  }


  return <main className={styles.page}>
    <header className={styles.header}><span>HOÀNG LONG · PHÁT TRIỂN KHÁCH HÀNG</span><h1>Tìm quán mới.</h1><p>Từ menu công khai đến cuộc trao đổi phù hợp. Tìm trên toàn quốc, kiểm tra từng quán và giữ lại những cơ hội đáng theo đuổi.</p></header>
    {preview && <aside className={styles.notice}>Bản xem thử · 4 hồ sơ nghiên cứu từ website công khai. Thao tác chỉ lưu trong phiên này, không thay đổi dữ liệu khách hàng.</aside>}
    <section className={styles.search} aria-labelledby="discovery-search-title"><h2 id="discovery-search-title">Bạn muốn tìm nhóm quán nào?</h2>
      <form onSubmit={runSearch}><label>Tỉnh / thành<input value={region} onChange={e => setRegion(e.target.value)} placeholder="Toàn quốc" maxLength={100}/></label><label>Nhóm quán<select value={segment} onChange={e => setSegment(e.target.value)}>{Object.entries(SEGMENTS).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></label><button className={styles.primary} disabled={busy || !enabled || preview || !ready}>{busy ? "Đang xử lý…" : "Tìm quán trên web"}</button></form>
      <p>{enabled ? "Mỗi lượt tìm lấy tối đa 20 trang kết quả. Hệ thống giới hạn lượt dùng trong ngày; không tự gửi tin." : "Tìm trên web chưa được kích hoạt. Hiện có thể xem hồ sơ nghiên cứu và thêm quán từ nguồn bạn tìm được."}</p>
    </section>
    {loadError && <p role="alert" className={styles.notice}>{loadError}</p>}
    <p role="status" aria-live="polite" className={styles.message}>{message}</p>
    <section className={styles.workspace} aria-label="Hồ sơ tìm khách">
      <div className={styles.list}>
        <nav className={styles.tabs} aria-label="Danh sách quán"><button aria-pressed={tab === "research"} onClick={() => { setTab("research"); setFilter("all"); }}>Nguồn nghiên cứu ({candidates.length})</button><button aria-pressed={tab === "saved"} onClick={() => setTab("saved")}>Đã lưu ({saved.length})</button></nav>
        <div className={styles.filters}><label>Việc cần làm<select value={queue} onChange={e=>{setQueue(e.target.value);setTab("saved");}}><option value="all">Tất cả hồ sơ</option><option value="review">Cần kiểm tra quán</option><option value="missing_contact">Phù hợp · còn thiếu liên hệ</option><option value="prepare">Có liên hệ · cần soạn bản nháp</option><option value="draft">Có bản nháp đã lưu</option><option value="duplicates">Cùng website · cần đối chiếu</option></select></label><label>Lọc trạng thái<select value={filter} onChange={e => setFilter(e.target.value)}><option value="all">Tất cả</option>{Object.entries(PROSPECT_STATES).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></label>{!preview && <button disabled={busy} onClick={async () => { try { await reload(); } catch { setMessage("Chưa tải lại được danh sách."); } }}>Tải lại danh sách</button>}</div>
        {rows.map(p => <button className={styles.row} key={p.id} aria-pressed={sourceKey(current?.source_url) === sourceKey(p.source_url)} onClick={() => setSelected(p)}><strong>{p.name}</strong><span>{p.region || "Chưa xác minh địa điểm"}</span><small>{PROSPECT_STATES[(saved.find(s => s.source_key === sourceKey(p.source_url)) || p).status]} · {p.evidence_kind === "page_review" ? "Đã đọc website" : "Trích đoạn tìm kiếm"}</small></button>)}
        {!rows.length && <p className={styles.empty}>Chưa có quán trong danh sách này. Chọn một nguồn nghiên cứu để lưu, hoặc thêm quán bên dưới.</p>}
        <details className={styles.manual}><summary>Thêm quán từ đường dẫn</summary><form onSubmit={addManual}><label>Tên quán<input name="name" required maxLength={160}/></label><label>Đường dẫn nguồn công khai<input name="source_url" type="url" required placeholder="https://…" maxLength={2000}/></label><label>Tỉnh / thành đã xác minh<input name="region" maxLength={120}/></label><label>Thông tin bạn đã đọc trên nguồn<textarea name="evidence" required maxLength={1500}/></label><button disabled={busy || !ready} className={styles.primary}>Lưu quán để kiểm tra</button></form></details>
        <small className={styles.footnote}>Chống trùng theo đường dẫn nguồn. Một quán có nhiều website hoặc chi nhánh vẫn cần kiểm tra thủ công. Danh sách hiển thị tối đa 500 hồ sơ mới cập nhật.</small>
      </div>
      {current ? <article className={styles.detail} key={`${current.id}-${current.version || 0}`}><header><span className={styles.badge}>{PROSPECT_STATES[current.status]}</span><h2>{current.name}</h2><p>{current.region || "Địa điểm chưa xác minh"}</p><a href={current.source_url} target="_blank" rel="noopener noreferrer">Mở nguồn để kiểm tra ↗</a></header>
        <section><h3>{current.evidence_kind === "page_review" ? "Thông tin đọc được từ website" : "Trích đoạn tìm kiếm — chưa xác minh"}</h3><p>{current.evidence || "Chưa có ghi nhận về menu."}</p><small>Ghi nhận: {new Date(current.observed_at).toLocaleDateString("vi-VN")} · Website có thể đã thay đổi.</small></section>
        {duplicates.length>0 && <aside className={styles.notice}><strong>Cùng website với hồ sơ đã lưu</strong>{duplicates.map(p=><p key={p.id}>{p.name} <button type="button" onClick={()=>setSelected(p)}>Xem hồ sơ</button></p>)}<small>Có thể là một quán hoặc các chi nhánh. Đối chiếu trước khi chuẩn bị liên hệ; app không tự gộp.</small></aside>}
        <section className={styles.fit}><h3>Hướng thử trà có thể phù hợp</h3>{teaSignals(current.evidence).length ? teaSignals(current.evidence).map(signal => <p key={signal.label}><strong>{signal.label}</strong><br/>{signal.suggestion}</p>) : <p>Chưa đủ thông tin để gợi ý nền trà. Đọc menu trước.</p>}<small>Gợi ý dựa trên từ khóa trong nguồn, không phải đánh giá nhu cầu mua hàng.</small></section>
        <section><h3>Còn cần xác nhận</h3><p>Quán còn hoạt động? Ai phụ trách nguyên liệu? Họ có muốn thử trà mới, cần vị trà và mức giá vốn nào? Chưa có dữ liệu về lượng mua hoặc nhà cung cấp hiện tại.</p></section>
        {!existing ? <button className={styles.primary} disabled={busy || !ready} onClick={() => saveProspect(current)}>Lưu quán để kiểm tra</button> : <form className={styles.review} onSubmit={review}><h3>Kết quả bạn kiểm tra</h3><label>Tên quán đã xác minh<input name="name" defaultValue={existing.name} required maxLength={160}/></label><label>Tỉnh / thành đã xác minh<input name="region" defaultValue={existing.region} maxLength={120}/></label><label>Thông tin về menu<textarea name="evidence" defaultValue={existing.evidence} maxLength={1500}/></label><label className={styles.check}><input type="checkbox" name="page_review" defaultChecked={existing.evidence_kind === "page_review"}/>Tôi đã đọc và đối chiếu thông tin trên nguồn</label><label>Trạng thái<select name="status" defaultValue={existing.status}>{Object.entries(PROSPECT_STATES).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></label><label>Kênh liên hệ doanh nghiệp đã xác minh<input name="contact" defaultValue={existing.contact} maxLength={240} placeholder="Để trống nếu chưa biết"/></label><label>Ghi chú và việc cần làm tiếp<textarea name="notes" maxLength={2000} defaultValue={existing.notes}/></label><button disabled={busy || !ready} className={styles.primary}>Lưu kết quả kiểm tra</button></form>}
        {existing && <ProspectContacts key={`${existing.id}-${existing.version}`} prospect={existing} supabase={supabase} preview={preview} previewDraft={previewDrafts[existing.id]} onPreviewDraft={d=>setPreviewDrafts(prev=>({...prev,[existing.id]:d}))} onChanged={loadSummary}/>}

      </article> : <article className={styles.detail}><h2>Chọn một quán để đọc nguồn</h2><p>Kết quả tìm kiếm sẽ xuất hiện ở danh sách bên cạnh.</p></article>}
    </section>
  </main>;
}
