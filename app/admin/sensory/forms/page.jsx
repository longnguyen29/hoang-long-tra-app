"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import styles from "./Forms.module.css";

const SCALE = [1, 2, 3, 4, 5];
const METRICS = [
  ["Aroma intensity", "Cường độ hương"], ["Aroma quality", "Chất lượng hương"],
  ["Sweetness", "Độ ngọt"], ["Bitterness", "Độ đắng"], ["Astringency", "Độ chát"],
  ["Body", "Thân trà"], ["Texture", "Độ mượt"], ["Aftertaste", "Hậu vị"],
  ["Balance", "Cân bằng"], ["Liquor appearance", "Màu nước"]
];
const field = (label, name, value, onChange, placeholder = "") =>
  <label className={styles.field} key={name}><span>{label}</span><input value={value || ""} placeholder={placeholder} onChange={event => onChange(name, event.target.value)}/></label>;

export default function PrintableSensoryForms() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [access, setAccess] = useState("checking");
  const [kind, setKind] = useState("single");
  const [meta, setMeta] = useState({});
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (!live) return;
        if (error || !user) { router.replace("/admin/login"); return; }
        const role = await supabase.from("staff_roles").select("role").eq("user_id", user.id).maybeSingle();
        if (!live) return;
        setAccess(role.error ? "error" : ["admin","manager"].includes(role.data?.role) ? "allowed" : "denied");
      } catch { if (live) setAccess("error"); }
    })();
    return () => { live = false; };
  }, [router, supabase]);
  const update = (name, value) => setMeta(current => ({ ...current, [name]: value }));

  if (access === "checking") return <main className="hl-admin-state">Đang mở mẫu in…</main>;
  if (access === "error") return <main className="hl-admin-state" role="alert">Không kiểm tra được quyền truy cập.</main>;
  if (access === "denied") return <main className="hl-admin-state hl-admin-state--denied">Chỉ tài khoản quản lý hoặc admin.</main>;
  return <main className={styles.page} data-no-translate>
    <div className={styles.controls}><Link href="/admin/sensory"><ArrowLeft size={16}/>Thư viện cảm quan</Link>
      <div role="group" aria-label="Mẫu in"><button type="button" className={kind === "single" ? styles.active : ""} onClick={() => setKind("single")}>Phiếu một mẫu</button><button type="button" className={kind === "comparison" ? styles.active : ""} onClick={() => setKind("comparison")}>So sánh 3 mẫu</button></div>
      <button type="button" onClick={() => window.print()}><Printer size={17}/>In / Save PDF</button>
    </div>
    <section className={styles.paper} aria-label="Print-ready bilingual tasting sheet">
      <header className={styles.header}><div className={styles.mark}>皇龍</div><div><p>HOUSE OF HOÀNG LONG · SENSORY LAB</p><h1>{kind === "single" ? "TEA CUPPING RECORD" : "BLIND TASTING COMPARISON"}</h1><h2>{kind === "single" ? "PHIẾU ĐÁNH GIÁ CẢM QUAN TRÀ" : "PHIẾU SO SÁNH BA MẪU TRÀ"}</h2></div><span>EN / VI<br/>EDITION 02</span></header>
      <div className={styles.metadata}>
        {field("Ngày / Date", "date", meta.date, update, "____ / ____ / ______")}
        {field("Người thử / Taster", "taster", meta.taster, update)}
        {field("Địa điểm / Location", "location", meta.location, update)}
        {field("Mục đích / Purpose", "purpose", meta.purpose, update)}
      </div>
      {kind === "single" ? <>
        <h3>01 / SAMPLE & BREW · MẪU & THÔNG SỐ PHA</h3>
        <div className={styles.metadata}>
          {field("Tên trà / Tea name", "tea", meta.tea, update)}
          {field("Lô / Batch", "batch", meta.batch, update)}
          {field("Lượng trà / Leaf (g)", "leaf", meta.leaf, update)}
          {field("Nước / Water (ml)", "water", meta.water, update)}
          {field("Nhiệt độ / Temp (°C)", "temperature", meta.temperature, update)}
          {field("Thời gian / Time (s)", "time", meta.time, update)}
        </div>
        <h3>02 / SENSORY SCORES · CHẤM ĐIỂM 1–5</h3>
        <p className={styles.legend}>Khoanh số phù hợp. Cường độ và chất lượng là hai đánh giá khác nhau. / Circle a score; intensity and quality are separate.</p>
        <table className={styles.scoreTable}><thead><tr><th>Attribute / Tiêu chí</th>{SCALE.map(n => <th key={n}>{n}</th>)}<th>Notes / Nhận xét</th></tr></thead><tbody>
          {METRICS.map(([en,vi]) => <tr key={en}><th>{en}<small>{vi}</small></th>{SCALE.map(n=><td key={n}><span className={styles.circle}/></td>)}<td className={styles.noteLine}></td></tr>)}
        </tbody></table>
        <div className={styles.noteGrid}>
          <label>Dry leaf / Lá khô<textarea placeholder="Hương và ngoại quan..."/></label>
          <label>Wet leaf / Bã trà<textarea placeholder="Hương sau pha..."/></label>
          <label>Liquor / Nước trà<textarea placeholder="Vị, chát, cấu trúc..."/></label>
          <label>Finish / Hậu vị<textarea placeholder="Hồi cam, sinh tân, độ bền..."/></label>
        </div>
        <div className={styles.bottomFields}>
          <label>Selected descriptors / Thuật ngữ mô tả<div className={styles.ruled}></div></label>
          <label>Decision & next action / Kết luận & bước tiếp theo<div className={styles.ruled}></div></label>
        </div>
      </> : <>
        <h3>01 / SAMPLES · THÔNG TIN MẪU</h3>
        <table className={styles.compareTable}><thead><tr><th></th>{["A","B","C"].map(letter => <th key={letter}>Sample {letter} / Mẫu {letter}</th>)}</tr></thead><tbody>
          {["Batch / Lô","Tea / Trà","Leaf (g) / Lượng trà","Water / Nước","Time & temp / Thời gian & nhiệt độ"].map(row => <tr key={row}><th>{row}</th>{["a","b","c"].map(id=><td key={id}></td>)}</tr>)}
        </tbody></table>
        <h3>02 / BLIND SENSORY COMPARISON · SO SÁNH CẢM QUAN</h3>
        <table className={styles.compareTable}><thead><tr><th>Attribute / Tiêu chí</th><th>A</th><th>B</th><th>C</th></tr></thead><tbody>
          {METRICS.map(([en,vi])=><tr key={en}><th>{en}<small>{vi}</small></th>{["a","b","c"].map(id=><td key={id}>____ / 5</td>)}</tr>)}
        </tbody></table>
        <div className={styles.compareNotes}><label>A — Descriptors / Mô tả<textarea rows={4}/></label><label>B — Descriptors / Mô tả<textarea rows={4}/></label><label>C — Descriptors / Mô tả<textarea rows={4}/></label></div>
        <h3>03 / DECISION · KẾT LUẬN</h3>
        <div className={styles.decision}>Preferred / Mẫu ưu tiên:　□ A　 □ B　 □ C　 □ No preference / Không ưu tiên</div>
        <div className={styles.bottomFields}><label>Reason / Lý do<div className={styles.ruled}/></label><label>Next step / Bước tiếp theo<div className={styles.ruled}/></label></div>
      </>}
      <footer className={styles.footer}>Sensory observation only. Not a laboratory certificate or automatic batch release. / Chỉ là ghi nhận cảm quan, không thay thế kiểm nghiệm hay phê duyệt xuất lô.</footer>
    </section>
  </main>;
}
