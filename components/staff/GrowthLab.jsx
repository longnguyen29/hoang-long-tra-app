"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, ArrowRight, BarChart3, Beaker, Check, ChevronRight, Clipboard,
  ExternalLink, FlaskConical, Lightbulb, Link2, LoaderCircle, PencilLine,
  Plus, RefreshCw, Save, Send, Sparkles, Target, TrendingUp,
} from "lucide-react";
import {
  DEFAULT_GROWTH_RUBRIC, buildGrowthPrompt, judgeThreadsDraft, starterVariants, trackingUrl,
} from "@/lib/growth-judge";
import styles from "./GrowthLab.module.css";

const EMPTY_BRIEF = {
  title: "", audience: "Chủ quán và người phát triển menu đồ uống",
  customerProblem: "Chưa biết nền trà nào giữ được vị trong công thức thực tế",
  angle: "Thử trực tiếp trong công thức trước khi quyết định nhập sỉ",
  proof: "Bốn mẫu từ những mẻ Shan Tuyết cổ thụ Hà Giang đang có",
  offer: "Bộ bốn mẫu trà dành cho quán",
  cta: "Bấm link để gửi nhu cầu và nhận bộ mẫu phù hợp",
  hypothesis: "Thông điệp thử tại quầy tạo nhiều yêu cầu mẫu đủ điều kiện hơn nội dung chỉ kể về nguồn gốc",
};

const STATUS_LABEL = { draft: "Đang soạn", running: "Đang chạy", review: "Chờ đọc kết quả", complete: "Đã kết luận" };
const VARIANT_STATUS = { draft: "Bản nháp", ready: "Sẵn sàng đăng", published: "Đã đăng", paused: "Tạm dừng", reviewed: "Đã đọc kết quả" };
const METRIC_FIELDS = [
  ["views", "Lượt xem Threads"], ["likes", "Thích"], ["replies", "Phản hồi"],
  ["reposts", "Đăng lại"], ["quotes", "Trích dẫn"],
];

const briefFromRow = (row) => ({
  audience: row.audience, customerProblem: row.customer_problem, angle: row.angle,
  proof: row.proof, offer: row.offer, cta: row.cta, hypothesis: row.hypothesis,
});

const compactNumber = (value) => new Intl.NumberFormat("vi-VN", { notation: Number(value) > 9999 ? "compact" : "standard" }).format(Number(value || 0));
const percent = (part, whole) => whole ? `${Math.round((Number(part) / Number(whole)) * 100)}%` : "—";

function Funnel({ variant }) {
  const manual = variant.manual_metrics || {};
  const outcomes = variant.outcomes || {};
  const stages = [
    ["Threads", manual.views || 0], ["Vào trang mẫu", outcomes.visitors || 0],
    ["Yêu cầu mẫu", outcomes.qualified_requests || 0], ["Đã gửi mẫu", outcomes.samples_sent || 0],
    ["Đơn đầu tiên", outcomes.first_orders || 0],
  ];
  const max = Math.max(1, ...stages.map(([, value]) => Number(value || 0)));
  return <div className={styles.funnel} aria-label="Đường chuyển đổi từ bài Threads tới đơn sỉ">
    {stages.map(([label, value], index) => <div key={label}>
      <span><b>{label}</b><strong>{compactNumber(value)}</strong></span>
      <i style={{ "--fill": `${Math.max(value ? 8 : 0, (Number(value || 0) / max) * 100)}%` }}/>
      {index < stages.length - 1 && <small>{percent(stages[index + 1][1], value)}</small>}
    </div>)}
  </div>;
}

function ScoreStrip({ result }) {
  return <div className={styles.scoreStrip}>
    <div className={styles.overall} data-score={result.overall >= 75 ? "good" : result.overall >= 55 ? "mid" : "low"}>
      <strong>{result.overall}</strong><span>/100<small>Dự đoán trước khi đăng</small></span>
    </div>
    <div className={styles.scoreGrid}>{DEFAULT_GROWTH_RUBRIC.map((item) => <span key={item.key} title={item.hint}>
      <i style={{ "--score": `${result.scores[item.key]}%` }}/><small>{item.label}</small><b>{result.scores[item.key]}</b>
    </span>)}</div>
  </div>;
}

export default function GrowthLab({ supabase, email, role }) {
  const [snapshot, setSnapshot] = useState({ active_prompt: {}, experiments: [] });
  const [tab, setTab] = useState("experiments");
  const [selectedId, setSelectedId] = useState("");
  const [brief, setBrief] = useState(EMPTY_BRIEF);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editingVariant, setEditingVariant] = useState("");
  const [draftText, setDraftText] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    const { data, error: loadError } = await supabase.rpc("growth_lab_snapshot");
    if (loadError) setError("Phòng tăng trưởng chưa đọc được dữ liệu. Cần áp dụng migration 0045_growth_content_lab rồi làm mới.");
    else {
      setSnapshot(data || { active_prompt: {}, experiments: [] });
      setSelectedId((current) => current || data?.experiments?.[0]?.id || "");
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(""), 3200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const experiments = snapshot.experiments || [];
  const selected = experiments.find((item) => item.id === selectedId) || experiments[0];
  const activePrompt = snapshot.active_prompt || {};
  const variants = selected?.variants || [];
  const published = experiments.flatMap((item) => item.variants || []).filter((item) => item.status === "published").length;
  const requests = experiments.flatMap((item) => item.variants || []).reduce((sum, item) => sum + Number(item.outcomes?.qualified_requests || 0), 0);
  const orders = experiments.flatMap((item) => item.variants || []).reduce((sum, item) => sum + Number(item.outcomes?.first_orders || 0), 0);

  const createExperiment = async (event) => {
    event.preventDefault();
    if (!brief.title.trim()) { setError("Đặt tên thử nghiệm theo điều bạn muốn học, không theo tên bài đăng."); return; }
    setSaving(true); setError("");
    const generatedPrompt = buildGrowthPrompt(brief);
    const { data: experiment, error: experimentError } = await supabase.from("growth_experiments").insert({
      title: brief.title.trim(), audience: brief.audience.trim(), customer_problem: brief.customerProblem.trim(),
      angle: brief.angle.trim(), proof: brief.proof.trim(), offer: brief.offer.trim(), cta: brief.cta.trim(),
      hypothesis: brief.hypothesis.trim(), prompt_version_id: activePrompt.id || null,
      generated_prompt: generatedPrompt, review_on: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    }).select().single();
    if (experimentError) { setError("Chưa tạo được thử nghiệm. Kiểm tra dữ liệu và thử lại."); setSaving(false); return; }
    const stamp = Date.now().toString(36).slice(-7);
    const rows = starterVariants(brief).map((variant, index) => {
      const result = judgeThreadsDraft(variant.text, brief);
      return {
        experiment_id: experiment.id, label: variant.label, tracking_code: `hl-${stamp}-${String.fromCharCode(97 + index)}`,
        post_text: variant.text, judge_scores: { overall: result.overall, ...result.scores }, judge_notes: result.notes,
      };
    });
    const { error: variantsError } = await supabase.from("growth_variants").insert(rows);
    setSaving(false);
    if (variantsError) { setError("Đã tạo brief nhưng chưa tạo được ba bản nháp."); return; }
    setBrief(EMPTY_BRIEF); setSelectedId(experiment.id); setTab("experiments");
    setNotice("Đã tạo thử nghiệm và ba cách mở bài."); await load();
  };

  const patchVariant = async (variant, changes, message) => {
    setSaving(true); setError("");
    const { error: saveError } = await supabase.from("growth_variants").update({ ...changes, updated_at: new Date().toISOString() }).eq("id", variant.id);
    setSaving(false);
    if (saveError) { setError("Chưa lưu được bản nháp. Làm mới rồi thử lại."); return false; }
    if (message) setNotice(message);
    await load(); return true;
  };

  const saveDraft = async (variant) => {
    const result = judgeThreadsDraft(draftText, briefFromRow(selected));
    const saved = await patchVariant(variant, {
      post_text: draftText, judge_scores: { overall: result.overall, ...result.scores }, judge_notes: result.notes,
    }, "Đã lưu và chấm lại bản nháp.");
    if (saved) setEditingVariant("");
  };

  const copyText = async (variant) => {
    const text = variant.post_text.replaceAll("[LINK_SAMPLE]", trackingUrl(variant.tracking_code));
    await navigator.clipboard.writeText(text); setNotice("Đã sao chép bài kèm link theo dõi riêng.");
  };

  const copyPrompt = async () => {
    await navigator.clipboard.writeText(selected.generated_prompt); setNotice("Đã sao chép prompt để tạo thêm phương án.");
  };

  const setExperimentStatus = async (status) => {
    setSaving(true);
    const { error: saveError } = await supabase.from("growth_experiments").update({ status, updated_at: new Date().toISOString() }).eq("id", selected.id);
    setSaving(false);
    if (saveError) setError("Chưa đổi được trạng thái thử nghiệm.");
    else { setNotice(status === "running" ? "Thử nghiệm đã bắt đầu." : "Đã chuyển sang đọc kết quả."); await load(); }
  };

  const learningRows = useMemo(() => experiments.map((experiment) => {
    const candidates = (experiment.variants || []).filter((variant) => Number(variant.outcomes?.visitors || 0) > 0);
    const best = [...candidates].sort((a, b) => {
      const aRate = Number(a.outcomes?.qualified_requests || 0) / Math.max(1, Number(a.outcomes?.visitors || 0));
      const bRate = Number(b.outcomes?.qualified_requests || 0) / Math.max(1, Number(b.outcomes?.visitors || 0));
      return bRate - aRate;
    })[0];
    return { experiment, best, enough: candidates.reduce((sum, variant) => sum + Number(variant.outcomes?.visitors || 0), 0) >= 20 };
  }), [experiments]);

  return <main className={styles.shell}>
    <header className={styles.topbar}>
      <div><Link href="/admin"><ArrowLeft/>Bàn ngày</Link><span>Growth lab · prompt v{activePrompt.version || "—"}</span></div>
      <div><span><b>{email}</b><small>{role}</small></span><button onClick={load} disabled={loading} title="Đọc lại kết quả mới nhất từ sample và đơn hàng"><RefreshCw className={loading ? styles.spin : ""}/></button></div>
    </header>

    <section className={styles.hero}>
      <div><p>Phòng tăng trưởng</p><h1>Biến một bài viết thành một điều có thể học.</h1><span>Không hỏi bài nào nhiều like nhất. Hỏi cách mở bài nào đưa đúng quán tới một lần thử thật.</span></div>
      <div className={styles.heroPath} aria-label="Mục tiêu của phòng tăng trưởng">
        <span><Send/>Bài Threads</span><i/><span><Link2/>Trang sample</span><i/><span><Beaker/>Thử tại quán</span><i/><span><TrendingUp/>Đơn sỉ</span>
      </div>
    </section>

    {error && <p className={styles.error} role="alert">{error}<button onClick={() => setError("")}>×</button></p>}
    {notice && <p className={styles.notice} role="status"><Check/>{notice}</p>}

    <section className={styles.metrics} aria-label="Kết quả phòng tăng trưởng">
      <article><span>Thử nghiệm</span><b>{experiments.length}</b><small>{published} bài đang đo</small></article>
      <article><span>Yêu cầu đúng đối tượng</span><b>{requests}</b><small>từ link thử nghiệm</small></article>
      <article><span>Đơn đầu tiên</span><b>{orders}</b><small>đối chiếu theo số điện thoại</small></article>
      <article><span>Nguyên tắc</span><b>Người duyệt</b><small>máy chỉ đề xuất thay đổi</small></article>
    </section>

    <nav className={styles.tabs} aria-label="Phòng tăng trưởng">
      <button data-active={tab === "experiments"} onClick={() => setTab("experiments")}><FlaskConical/>Thử nghiệm</button>
      <button data-active={tab === "new"} onClick={() => setTab("new")}><Plus/>Tạo phép thử</button>
      <button data-active={tab === "learnings"} onClick={() => setTab("learnings")}><Lightbulb/>Bài học</button>
    </nav>

    {tab === "new" && <section className={styles.newExperiment}>
      <header><div><p>Brief có kiểm soát</p><h2>Chỉ thay một điều mỗi lần.</h2></div><span>Đầu ra: 3 cách mở bài · cùng offer · cùng CTA</span></header>
      <form onSubmit={createExperiment}>
        <label className={styles.wide}><span>Tên điều muốn học</span><input required maxLength={180} value={brief.title} onChange={(event) => setBrief({ ...brief, title: event.target.value })} placeholder="Ví dụ: Mở bằng nỗi khó công thức hay lời mời thử?"/></label>
        <label><span>Người đọc</span><textarea rows="3" value={brief.audience} onChange={(event) => setBrief({ ...brief, audience: event.target.value })}/></label>
        <label><span>Vấn đề đang gặp</span><textarea rows="3" value={brief.customerProblem} onChange={(event) => setBrief({ ...brief, customerProblem: event.target.value })}/></label>
        <label><span>Góc tiếp cận</span><textarea rows="3" value={brief.angle} onChange={(event) => setBrief({ ...brief, angle: event.target.value })}/></label>
        <label><span>Bằng chứng được phép dùng</span><textarea rows="3" value={brief.proof} onChange={(event) => setBrief({ ...brief, proof: event.target.value })}/></label>
        <label><span>Đề nghị</span><textarea rows="3" value={brief.offer} onChange={(event) => setBrief({ ...brief, offer: event.target.value })}/></label>
        <label><span>Hành động mong muốn</span><textarea rows="3" value={brief.cta} onChange={(event) => setBrief({ ...brief, cta: event.target.value })}/></label>
        <label className={styles.wide}><span>Giả thuyết</span><textarea rows="3" value={brief.hypothesis} onChange={(event) => setBrief({ ...brief, hypothesis: event.target.value })}/></label>
        <aside><Target/><div><b>Máy sẽ chấm điều gì?</b><p>{DEFAULT_GROWTH_RUBRIC.map((item) => item.label).join(" · ")}</p></div></aside>
        <button className={styles.primary} disabled={saving || !brief.title.trim()}>{saving ? <LoaderCircle className={styles.spin}/> : <Sparkles/>}Tạo ba bản nháp</button>
      </form>
    </section>}

    {tab === "experiments" && <div className={styles.experimentLayout}>
      <aside className={styles.experimentList}>
        <header><p>Sổ thử nghiệm</p><button onClick={() => setTab("new")}><Plus/><span>Tạo mới</span></button></header>
        {experiments.length ? experiments.map((item) => <button key={item.id} data-active={item.id === selected?.id} onClick={() => setSelectedId(item.id)}>
          <span><small>{STATUS_LABEL[item.status]}</small><b>{item.title}</b><em>{new Date(item.created_at).toLocaleDateString("vi-VN")}</em></span><ChevronRight/>
        </button>) : <div className={styles.empty}><FlaskConical/><b>Chưa có phép thử.</b><p>Tạo một brief để có ba cách mở bài đầu tiên.</p></div>}
      </aside>

      {selected && <section className={styles.experimentDetail}>
        <header className={styles.experimentHead}>
          <div><p>{STATUS_LABEL[selected.status]} · đọc kết quả {selected.review_on ? new Date(selected.review_on).toLocaleDateString("vi-VN") : "sau 7 ngày"}</p><h2>{selected.title}</h2><span>{selected.hypothesis}</span></div>
          <div>{selected.status === "draft" && <button onClick={() => setExperimentStatus("running")} disabled={saving}><Send/>Bắt đầu thử</button>}{selected.status === "running" && <button onClick={() => setExperimentStatus("review")} disabled={saving}><BarChart3/>Đọc kết quả</button>}</div>
        </header>

        <details className={styles.promptBox}>
          <summary><span><Sparkles/><b>Prompt đang dùng</b><small>Phiên bản {activePrompt.version || 1} · mở để xem và sao chép</small></span><ChevronRight/></summary>
          <pre>{selected.generated_prompt}</pre><button onClick={copyPrompt}><Clipboard/>Sao chép prompt</button>
        </details>

        <div className={styles.variantStack}>{variants.map((variant) => {
          const result = judgeThreadsDraft(editingVariant === variant.id ? draftText : variant.post_text, briefFromRow(selected));
          const link = trackingUrl(variant.tracking_code);
          return <article className={styles.variant} key={variant.id}>
            <header><div><small>{VARIANT_STATUS[variant.status]}</small><h3>{variant.label}</h3></div><code>{variant.tracking_code}</code></header>
            <ScoreStrip result={result}/>
            {editingVariant === variant.id ? <div className={styles.draftEditor}><textarea rows="9" value={draftText} onChange={(event) => setDraftText(event.target.value)}/><div><span>{result.characterCount} ký tự</span><button onClick={() => setEditingVariant("")}>Hủy</button><button onClick={() => saveDraft(variant)} disabled={saving}><Save/>Lưu & chấm lại</button></div></div> : <div className={styles.postText}>{variant.post_text.split("\n").map((line, index) => <p key={index}>{line || " "}</p>)}</div>}
            {result.notes.length > 0 && <div className={styles.judgeNotes}><b>Máy đề nghị sửa trước khi đăng</b>{result.notes.slice(0, 3).map((note) => <p key={note}>{note}</p>)}</div>}
            <div className={styles.trackingLink}><Link2/><span><small>Link riêng của bản này</small><code>{link}</code></span><button onClick={() => navigator.clipboard.writeText(link).then(() => setNotice("Đã sao chép link theo dõi."))}><Clipboard/></button></div>
            <div className={styles.variantActions}>
              <button onClick={() => { setEditingVariant(variant.id); setDraftText(variant.post_text); }}><PencilLine/>Sửa bài</button>
              <button onClick={() => copyText(variant)}><Clipboard/>Sao chép để đăng</button>
              {variant.status === "draft" && <button onClick={() => patchVariant(variant, { status: "ready" }, "Bản nháp đã sẵn sàng đăng.")}><Check/>Chốt bản</button>}
            </div>
            <details className={styles.publishPanel} open={variant.status === "published"}>
              <summary><span><Send/><b>{variant.status === "published" ? "Bài đang được đo" : "Sau khi đăng Threads"}</b></span><ChevronRight/></summary>
              <label>URL bài Threads<input defaultValue={variant.threads_post_url} placeholder="https://www.threads.net/@.../post/..." onBlur={(event) => {
                const url = event.target.value.trim(); if (url !== variant.threads_post_url) patchVariant(variant, { threads_post_url: url, status: url ? "published" : variant.status, published_at: url && !variant.published_at ? new Date().toISOString() : variant.published_at }, url ? "Đã nối bài Threads với đường chuyển đổi." : "Đã lưu.");
              }}/></label>
              <div className={styles.manualMetrics}>{METRIC_FIELDS.map(([key, label]) => <label key={key}><span>{label}</span><input type="number" min="0" defaultValue={variant.manual_metrics?.[key] || ""} onBlur={(event) => {
                const value = Math.max(0, Number(event.target.value) || 0); if (value !== Number(variant.manual_metrics?.[key] || 0)) patchVariant(variant, { manual_metrics: { ...(variant.manual_metrics || {}), [key]: value } }, "Đã cập nhật insight từ Threads.");
              }}/></label>)}</div>
            </details>
            <Funnel variant={variant}/>
            {variant.threads_post_url && <a className={styles.external} href={variant.threads_post_url} target="_blank" rel="noreferrer">Mở bài trên Threads<ExternalLink/></a>}
          </article>;
        })}</div>
      </section>}
    </div>}

    {tab === "learnings" && <section className={styles.learnings}>
      <header><div><p>Vòng lặp có người duyệt</p><h2>Bằng chứng trước, sửa prompt sau.</h2></div><span>Không rút kết luận từ một bài viral.</span></header>
      <div className={styles.learningGrid}>
        <article className={styles.promptVersion}><span>Prompt đang hoạt động</span><b>v{activePrompt.version || 1} · {activePrompt.name || "Bài Threads dẫn tới bộ mẫu"}</b><p>{activePrompt.instruction}</p><small>{activePrompt.change_reason}</small></article>
        {learningRows.map(({ experiment, best, enough }) => <article key={experiment.id} data-ready={enough}>
          <header><span>{STATUS_LABEL[experiment.status]}</span><b>{experiment.title}</b></header>
          {!best ? <p>Chưa có lượt vào trang sample từ link thử nghiệm. Tiếp tục chạy trước khi thay prompt.</p> : !enough ? <p><strong>{best.label}</strong> đang dẫn đầu, nhưng tổng mẫu quan sát còn ít. Giữ nguyên prompt và thu thêm dữ liệu.</p> : <p><strong>{best.label}</strong> đang tạo tỷ lệ yêu cầu mẫu tốt nhất: {percent(best.outcomes?.qualified_requests, best.outcomes?.visitors)}. Đề xuất dùng cách mở này làm giả thuyết cho phép thử tiếp theo—chưa tự thay prompt gốc.</p>}
          <footer><span>{best?.outcomes?.visitors || 0} khách vào trang</span><span>{best?.outcomes?.qualified_requests || 0} yêu cầu phù hợp</span></footer>
        </article>)}
      </div>
    </section>}

    <footer className={styles.footer}><span>Hoàng Long · Phòng tăng trưởng</span><p>Điểm chấm là dự đoán. Sample và đơn hàng mới là kết quả.</p><Link href="/sample" target="_blank">Mở trang sample<ArrowRight/></Link></footer>
  </main>;
}
