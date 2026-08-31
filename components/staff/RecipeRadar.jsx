"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, ArrowUpRight, Beaker, Check, ChevronRight, CircleGauge, Clock3, EyeOff,
  Globe2, Link2, ListFilter, Plus, Radar, RefreshCw, Save, Search, Sparkles, X,
} from "lucide-react";
import { recommendHouseTea } from "@/lib/house-recipes";
import { RADAR_MARKETS, RADAR_STAGES, safeExternalUrl } from "@/lib/recipe-radar";
import { uid } from "@/lib/recipe-lab";
import styles from "./RecipeRadar.module.css";

const SOURCE_LABELS = { "google-news": "Tin & menu", youtube: "YouTube", reddit: "Reddit", manual: "Đã lưu tay" };
const CATEGORY_LABELS = {
  "menu-launch": "Menu mới", "tea-latte": "Tea latte", sparkling: "Sparkling",
  "fruit-tea": "Trà trái cây", "tea-mixology": "Tea mixology", "texture-dessert": "Foam & tráng miệng",
};
const SCORE_ROWS = [
  ["score_velocity", "Tốc độ tăng", "20%"],
  ["score_cross_market", "Lan qua thị trường", "20%"],
  ["score_vietnam_gap", "Khoảng trống Việt Nam", "15%"],
  ["score_tea_fit", "Hợp trà Hoàng Long", "30%"],
  ["score_feasibility", "Khả năng làm", "15%"],
];

const stageLabel = (value) => RADAR_STAGES.find((item) => item.id === value)?.label || value;
const shortDate = (value) => value ? new Intl.DateTimeFormat("vi-VN", { day: "numeric", month: "numeric", year: "2-digit" }).format(new Date(value)) : "—";
const timeAgo = (value) => {
  if (!value) return "Chưa quét";
  const hours = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 3600000));
  if (hours < 1) return "Vừa xong";
  if (hours < 24) return `${hours} giờ trước`;
  return `${Math.round(hours / 24)} ngày trước`;
};
const blankSignal = () => ({ url: "", title: "", conceptName: "", region: "US", category: "menu-launch", excerpt: "", notes: "", publishedAt: new Date().toISOString().slice(0, 10) });
const blankQuery = () => ({ id: uid("radar-query"), label: "", category: "menu-launch", internationalTerm: "", vietnamTerm: "", active: true });

export default function RecipeRadar({ supabase, email }) {
  const [concepts, setConcepts] = useState([]);
  const [signals, setSignals] = useState([]);
  const [queries, setQueries] = useState([]);
  const [runs, setRuns] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [stageFilter, setStageFilter] = useState("active");
  const [search, setSearch] = useState("");
  const [signalDraft, setSignalDraft] = useState(null);
  const [queryDraft, setQueryDraft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const flash = (message) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2600);
  };

  const load = useCallback(async ({ keepSelection = true } = {}) => {
    setLoading(true);
    setError("");
    const since = new Date(Date.now() - 120 * 86400000).toISOString();
    const [conceptResult, signalResult, queryResult, runResult, productResult] = await Promise.all([
      supabase.from("recipe_radar_concepts").select("*").order("score_total", { ascending: false }).limit(300),
      supabase.from("recipe_radar_signals").select("*").gte("published_at", since).order("published_at", { ascending: false }).limit(1500),
      supabase.from("recipe_radar_queries").select("*").order("created_at"),
      supabase.from("recipe_radar_runs").select("*").order("started_at", { ascending: false }).limit(12),
      supabase.from("catalog_products").select("id,name,kind,line,available,price").eq("kind", "tea").eq("available", true),
    ]);
    if (conceptResult.error || signalResult.error || queryResult.error || runResult.error) {
      setError("Radar chưa có bảng dữ liệu. Cần áp dụng migration 0049 và 0050 trước khi quét.");
      setLoading(false);
      return;
    }
    const nextConcepts = conceptResult.data || [];
    setConcepts(nextConcepts);
    setSignals(signalResult.data || []);
    setQueries(queryResult.data || []);
    setRuns(runResult.data || []);
    if (!productResult.error) setProducts((productResult.data || []).filter((item) => item.line !== "sample"));
    if (!keepSelection || !nextConcepts.some((item) => item.id === selectedId)) setSelectedId(nextConcepts[0]?.id || "");
    setLoading(false);
  }, [selectedId, supabase]);

  useEffect(() => { load({ keepSelection: false }); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const selected = concepts.find((item) => item.id === selectedId) || null;
  const selectedSignals = selected ? signals.filter((item) => item.concept_key === selected.canonical_key) : [];
  const selectedTea = selected ? recommendHouseTea(selected, products) : null;
  const lastRun = runs[0] || null;
  const filtered = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase("vi");
    return concepts.filter((item) => {
      if (stageFilter === "active" && item.stage === "dismissed") return false;
      if (stageFilter !== "active" && stageFilter !== "all" && item.stage !== stageFilter) return false;
      return !needle || `${item.name} ${item.summary} ${item.category}`.toLocaleLowerCase("vi").includes(needle);
    });
  }, [concepts, search, stageFilter]);

  const staffRequest = async (body) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error("not_authenticated");
    const response = await fetch("/api/staff/recipe-radar/run", {
      method: "POST", headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.ok) throw new Error(payload.error || "request_failed");
    return payload;
  };

  const runScan = async () => {
    setWorking(true); setError("");
    try {
      const result = await staffRequest({ action: "scan" });
      await load({ keepSelection: true });
      flash(`Đã đọc ${result.signalCount} tín hiệu; có ${result.newSignalCount} tín hiệu mới`);
    } catch (scanError) {
      setError(scanError.message === "scan_failed" ? "Lần quét chưa chạy xong. Kiểm tra migration hoặc nguồn dữ liệu rồi thử lại." : "Phiên đăng nhập đã hết hạn. Mở lại trang và thử lại.");
    } finally { setWorking(false); }
  };

  const saveSignal = async (event) => {
    event.preventDefault();
    if (!safeExternalUrl(signalDraft.url) || !signalDraft.title.trim()) return;
    setWorking(true); setError("");
    try {
      const result = await staffRequest({ action: "save-signal", signal: signalDraft });
      setSignalDraft(null);
      await load({ keepSelection: false });
      if (result.concept?.id) setSelectedId(result.concept.id);
      flash("Đã lưu tín hiệu và chấm lại Radar");
    } catch { setError("Chưa lưu được tín hiệu. Kiểm tra đường dẫn và thử lại."); }
    finally { setWorking(false); }
  };

  const saveQuery = async (event) => {
    event.preventDefault();
    const row = {
      id: queryDraft.id, label: queryDraft.label.trim(), category: queryDraft.category,
      search_terms: { en: queryDraft.internationalTerm.trim(), vi: queryDraft.vietnamTerm.trim() || queryDraft.internationalTerm.trim() },
      markets: ["US", "JP", "KR", "TH", "SG", "TW", "VN"], active: true,
      created_by: email, updated_at: new Date().toISOString(),
    };
    const { error: saveError } = await supabase.from("recipe_radar_queries").upsert(row);
    if (saveError) { setError("Chưa lưu được chủ đề theo dõi."); return; }
    setQueryDraft(null);
    await load();
    flash("Đã thêm chủ đề vào lần quét tiếp theo");
  };

  const toggleQuery = async (query) => {
    const { error: updateError } = await supabase.from("recipe_radar_queries").update({ active: !query.active, updated_at: new Date().toISOString() }).eq("id", query.id);
    if (updateError) { setError("Chưa đổi được trạng thái theo dõi."); return; }
    await load();
  };

  const updateStage = async (stage) => {
    if (!selected) return;
    const { error: updateError } = await supabase.from("recipe_radar_concepts").update({ stage, updated_at: new Date().toISOString() }).eq("id", selected.id);
    if (updateError) { setError("Chưa cập nhật được quyết định."); return; }
    await load();
    flash(stage === "dismissed" ? "Đã đưa khỏi danh sách đang xem" : `Đã chuyển sang ${stageLabel(stage).toLocaleLowerCase("vi")}`);
  };

  const promoteToRecipe = async () => {
    if (!selected) return;
    setWorking(true); setError("");
    try {
      const result = await staffRequest({ action: "promote-concept", conceptId: selected.id });
      window.location.assign(`/admin/recipes?view=lab&recipe=${encodeURIComponent(result.recipeId)}`);
    } catch {
      setWorking(false);
      setError("Chưa chuyển được thành công thức V1. Kiểm tra danh mục trà rồi thử lại.");
    }
  };

  if (loading) return <main className={styles.state}><RefreshCw/><p>Đang mở Radar…</p></main>;

  return <main className={styles.page}>
    <header className={styles.top}>
      <Link href="/admin"><ArrowLeft/>Bảng điều khiển</Link>
      <nav aria-label="Khu vực Phòng công thức"><Link data-active href="/admin/recipes?view=radar"><Radar/>Radar</Link><Link href="/admin/recipes?view=lab"><Beaker/>Công thức</Link></nav>
      <button onClick={() => load()} aria-label="Làm mới dữ liệu"><RefreshCw/></button>
    </header>

    <section className={styles.heading}>
      <div><p>Global menu intelligence</p><h1>Thấy trước khi quen mắt.</h1><span>Radar đọc tín hiệu menu ở nhiều thị trường, so với Việt Nam và chỉ đưa những ý tưởng có bằng chứng vào hàng chờ thử.</span></div>
      <div><button className={styles.secondary} onClick={() => setSignalDraft(blankSignal())}><Link2/>Lưu một đường dẫn</button><button className={styles.primary} disabled={working} onClick={runScan}>{working ? <RefreshCw className={styles.spinning}/> : <Radar/>}{working ? "Đang quét…" : "Quét ngay"}</button></div>
    </section>

    {error && <p className={styles.toast} data-error><span>{error}</span><button onClick={() => setError("")}>×</button></p>}
    {notice && <p className={styles.toast}><Check/>{notice}</p>}

    <section className={styles.pulse} aria-label="Trạng thái Radar">
      <div><Clock3/><span><small>Lần quét gần nhất</small><b>{timeAgo(lastRun?.completed_at || lastRun?.started_at)}</b></span></div>
      <div><Sparkles/><span><small>Tín hiệu mới</small><b>{lastRun?.new_signal_count ?? 0}</b></span></div>
      <div><CircleGauge/><span><small>Đáng thử</small><b>{concepts.filter((item) => item.stage === "candidate").length}</b></span></div>
      <div><Globe2/><span><small>Thị trường đang đọc</small><b>{new Set(queries.flatMap((item) => item.markets || [])).size || 0}</b></span></div>
    </section>

    <div className={styles.radarDesk}>
      <aside className={styles.watchPanel}>
        <header><div><span>Phạm vi quét</span><b>{queries.filter((item) => item.active).length} chủ đề đang bật</b></div><button onClick={() => setQueryDraft(blankQuery())} aria-label="Thêm chủ đề"><Plus/></button></header>
        <div className={styles.sources}>
          <span>Nguồn tín hiệu</span>
          <div><i data-ready="true"/><b>Google News</b><small>Tự động</small></div>
          <div><i data-ready={lastRun?.source_summary?.youtube ? "true" : "false"}/><b>YouTube</b><small>{lastRun?.source_summary?.youtube ? "Đã nối" : "Cần API key"}</small></div>
          <div><i data-ready="true"/><b>Đường dẫn lưu tay</b><small>TikTok · Threads · Instagram</small></div>
        </div>
        <div className={styles.queryList}><span>Chủ đề theo dõi</span>{queries.map((query) => <button key={query.id} data-active={query.active} onClick={() => toggleQuery(query)}><i/><span><b>{query.label}</b><small>{CATEGORY_LABELS[query.category] || query.category}</small></span><em>{query.active ? "Đang quét" : "Đã dừng"}</em></button>)}</div>
        <footer><Clock3/><span>Quét tự động mỗi ngày lúc <b>06:30</b> giờ Việt Nam.</span></footer>
      </aside>

      <section className={styles.signalIndex}>
        <header><div><span>Hàng chờ quyết định</span><b>{filtered.length} ý tưởng</b></div><ListFilter/></header>
        <label className={styles.search}><Search/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm món hoặc nhóm…"/></label>
        <select value={stageFilter} onChange={(event) => setStageFilter(event.target.value)}><option value="active">Đang hoạt động</option><option value="all">Tất cả</option>{RADAR_STAGES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select>
        <div className={styles.conceptList}>{filtered.map((concept) => <button key={concept.id} data-active={selectedId === concept.id} onClick={() => setSelectedId(concept.id)}><span><i data-stage={concept.stage}/>{stageLabel(concept.stage)}<em>{concept.score_total}</em></span><b>{concept.name}</b><p>{concept.summary}</p><footer><small>{concept.market_count} thị trường · {concept.signal_count} tín hiệu</small><ChevronRight/></footer></button>)}
          {!filtered.length && <div className={styles.emptyList}><Radar/><b>Chưa có tín hiệu phù hợp.</b><p>Bấm “Quét ngay” để tạo hàng chờ đầu tiên, hoặc lưu một đường dẫn bạn vừa thấy.</p></div>}
        </div>
      </section>

      <section className={styles.passport}>
        {selected ? <>
          <header><div><span>Evidence passport · {selected.canonical_key}</span><h2>{selected.name}</h2><p>{selected.summary}</p></div><strong data-score={selected.score_total >= 70 ? "high" : selected.score_total >= 52 ? "mid" : "low"}><b>{selected.score_total}</b><small>/ 100</small></strong></header>
          <div className={styles.marketLine}><span>Đã thấy tại</span><div>{(selected.regions || []).map((region) => <b key={region} data-vietnam={region === "VN"}>{RADAR_MARKETS[region]?.label || region}</b>)}</div></div>
          {selectedTea?.id && <section className={styles.teaMatch}><span>Trà nên thử trước</span><div><b>{selectedTea.name}</b><em>{selectedTea.match}</em></div><p>{selectedTea.reason}</p></section>}
          <section className={styles.scoreLedger}><header><span>Vì sao có điểm này</span><small>Trọng số</small></header>{SCORE_ROWS.map(([key, label, weight]) => <div key={key}><span>{label}</span><i><b style={{ width: `${selected[key]}%` }}/></i><strong>{selected[key]}</strong><small>{weight}</small></div>)}</section>
          <section className={styles.evidence}><header><span>Bằng chứng gần nhất</span><b>{selectedSignals.length} nguồn</b></header>{selectedSignals.slice(0, 8).map((signal) => <a href={signal.url} target="_blank" rel="noreferrer" key={signal.id}><div><span>{SOURCE_LABELS[signal.source] || signal.source} · {RADAR_MARKETS[signal.region]?.label || signal.region}</span><b>{signal.title}</b><small>{signal.publisher || "Nguồn đã lưu"} · {shortDate(signal.published_at)}</small></div><ArrowUpRight/></a>)}{!selectedSignals.length && <p>Chưa tải được bằng chứng cho ý tưởng này.</p>}</section>
          <footer><button className={styles.dismiss} onClick={() => updateStage(selected.stage === "dismissed" ? "watch" : "dismissed")}><EyeOff/>{selected.stage === "dismissed" ? "Đưa lại Radar" : "Bỏ qua"}</button>{selected.stage !== "candidate" && selected.stage !== "testing" && <button className={styles.secondary} onClick={() => updateStage("candidate")}><Check/>Đánh dấu đáng thử</button>}<button className={styles.primary} disabled={working} onClick={promoteToRecipe}><Beaker/>{selected.promoted_recipe_id ? "Mở công thức đang thử" : "Đưa vào thử công thức"}</button></footer>
        </> : <div className={styles.emptyPassport}><Globe2/><h2>Radar cần một lần quét đầu tiên.</h2><p>Nó sẽ đọc các chủ đề đang bật, giữ nguồn bằng chứng và xếp thứ tự để bạn không phải tự lướt từng nền tảng.</p><button className={styles.primary} disabled={working} onClick={runScan}><Radar/>Quét ngay</button></div>}
      </section>
    </div>

    {signalDraft && <div className={styles.overlay} onMouseDown={(event) => { if (event.target === event.currentTarget) setSignalDraft(null); }}><form className={styles.drawer} onSubmit={saveSignal}><header><div><span>Signal inbox</span><h2>Lưu điều bạn vừa thấy</h2><p>Dùng cho TikTok, Threads, Instagram hoặc bất kỳ nguồn nào Radar chưa tự đọc được.</p></div><button type="button" onClick={() => setSignalDraft(null)} aria-label="Đóng"><X/></button></header><div className={styles.formGrid}>
      <label className={styles.wide}>Đường dẫn<input autoFocus required type="url" value={signalDraft.url} onChange={(event) => setSignalDraft({ ...signalDraft, url: event.target.value })} placeholder="https://…"/></label>
      <label className={styles.wide}>Bạn thấy món gì?<input required value={signalDraft.title} onChange={(event) => setSignalDraft({ ...signalDraft, title: event.target.value })} placeholder="Ví dụ: Pistachio matcha xuất hiện ở ba quán tại Seoul"/></label>
      <label>Tên ý tưởng để gom nhóm<input value={signalDraft.conceptName} onChange={(event) => setSignalDraft({ ...signalDraft, conceptName: event.target.value })} placeholder="Pistachio Matcha"/></label>
      <label>Thị trường<select value={signalDraft.region} onChange={(event) => setSignalDraft({ ...signalDraft, region: event.target.value })}>{Object.entries(RADAR_MARKETS).map(([code, market]) => <option key={code} value={code}>{market.label}</option>)}</select></label>
      <label>Nhóm món<select value={signalDraft.category} onChange={(event) => setSignalDraft({ ...signalDraft, category: event.target.value })}>{Object.entries(CATEGORY_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
      <label>Ngày thấy<input type="date" value={signalDraft.publishedAt} onChange={(event) => setSignalDraft({ ...signalDraft, publishedAt: event.target.value })}/></label>
      <label className={styles.wide}>Ghi chú<textarea value={signalDraft.notes} onChange={(event) => setSignalDraft({ ...signalDraft, notes: event.target.value })} placeholder="Vì sao đáng chú ý, lượt xem, quán nào đang dùng…"/></label>
    </div><button className={styles.save} disabled={working || !signalDraft.title.trim() || !safeExternalUrl(signalDraft.url)}><Save/>{working ? "Đang lưu…" : "Lưu vào Radar"}</button></form></div>}

    {queryDraft && <div className={styles.overlay} onMouseDown={(event) => { if (event.target === event.currentTarget) setQueryDraft(null); }}><form className={styles.drawer} onSubmit={saveQuery}><header><div><span>Watch topic</span><h2>Thêm chủ đề theo dõi</h2><p>Radar dùng từ khóa quốc tế để tìm tín hiệu và từ khóa Việt Nam để đo khoảng trống.</p></div><button type="button" onClick={() => setQueryDraft(null)} aria-label="Đóng"><X/></button></header><div className={styles.formGrid}>
      <label className={styles.wide}>Tên chủ đề<input autoFocus required value={queryDraft.label} onChange={(event) => setQueryDraft({ ...queryDraft, label: event.target.value })} placeholder="Ví dụ: Trà và nguyên liệu lên men"/></label>
      <label>Nhóm món<select value={queryDraft.category} onChange={(event) => setQueryDraft({ ...queryDraft, category: event.target.value })}>{Object.entries(CATEGORY_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
      <label className={styles.wide}>Từ khóa quốc tế<input required value={queryDraft.internationalTerm} onChange={(event) => setQueryDraft({ ...queryDraft, internationalTerm: event.target.value })} placeholder={'"fermented tea" OR tea fermentation cafe'}/></label>
      <label className={styles.wide}>Từ khóa Việt Nam<input value={queryDraft.vietnamTerm} onChange={(event) => setQueryDraft({ ...queryDraft, vietnamTerm: event.target.value })} placeholder="trà lên men quán cà phê"/></label>
    </div><button className={styles.save} disabled={!queryDraft.label.trim() || !queryDraft.internationalTerm.trim()}><Save/>Theo dõi chủ đề này</button></form></div>}
  </main>;
}
