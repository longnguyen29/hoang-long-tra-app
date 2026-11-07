"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { flushSync } from "react-dom";
import Link from "next/link";
import { ArrowLeft, Check, ClipboardCopy, FileText, Minus, Plus, Printer, Search, X } from "lucide-react";
import { TEA_SENSORY_WHEELS, TEA_SENSORY_ENTRIES, SENSORY_REFERENCE_RULES } from "@/lib/tea-sensory-reference";
import styles from "./Sensory.module.css";

const WHEELS = ["aroma", "palate", "defects", "shan"];
const PALETTE = ["#899e90", "#bfaa79", "#9bb3a3", "#d4b997", "#9d9eae", "#c98f83", "#8dadaf", "#baa69e", "#a1b48d", "#c4ac76", "#9c96a8", "#c8b6a1"];
const fold = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[đĐ]/g, "d").toLowerCase();
const pair = (value) => {
  const sep = value.indexOf(" / ");
  return sep < 0 ? [value, ""] : [value.slice(0, sep), value.slice(sep + 3)];
};
const short = (value, n = 19) => value.length > n ? value.slice(0, n - 1) + "…" : value;

function point(angle, radius) {
  const rad = (angle * Math.PI) / 180;
  return [900 + radius * Math.cos(rad), 900 + radius * Math.sin(rad)];
}
function sector(first, last, inner, outer) {
  const a = point(first, outer), b = point(last, outer);
  const c = point(last, inner), d = point(first, inner);
  const large = last - first > 180 ? 1 : 0;
  return "M" + a.join(" ") + " A" + outer + " " + outer + " 0 " + large + " 1 " + b.join(" ") +
    " L" + c.join(" ") + " A" + inner + " " + inner + " 0 " + large + " 0 " + d.join(" ") + " Z";
}

function SensoryWheel({ entries, groups, activeCategory, chosen, onCategory, onDescriptor }) {
  const step = 360 / entries.length;
  const positions = new Map(groups.map((group, index) => [group.name, { index, color: PALETTE[index % PALETTE.length] }]));
  return <svg className={styles.wheelSvg} viewBox="0 0 1800 1800" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Bilingual wheel with all English and Vietnamese descriptor names shown in their sectors">
    <circle cx="900" cy="900" r="858" fill="#faf7f0" stroke="#ded6c6" strokeWidth="4"/>
    {entries.map((entry, index) => {
      const angle = -90 + index * step;
      const key = entry.category;
      const style = positions.get(key);
      const active = chosen.includes(entry.n);
      const dim = activeCategory !== "all" && activeCategory !== key;
      const flip = Math.cos(((angle + step / 2) * Math.PI) / 180) < 0;
      const center = angle + step / 2;
      return <g key={entry.n} opacity={dim ? 0.25 : 1}>
        <path d={sector(angle, angle + step, 434, 850)} fill={style.color} fillOpacity={active ? 0.85 : index % 2 ? 0.35 : 0.53} stroke="#faf7f0" strokeWidth="1.3" className={styles.slice} onClick={() => onDescriptor(entry.n)}>
          <title>{entry.en} / {entry.vi}</title>
        </path>
        <g transform={"translate(900 900) rotate(" + center + ") translate(640 0) rotate(" + (flip ? 180 : 0) + ")"} pointerEvents="none">
          <text textAnchor="middle" y="-6" fontSize={entry.en.length > 29 ? 10 : 12.5} fontWeight="700" fill="#1c2b24">{entry.en}</text>
          <text textAnchor="middle" y="10" fontSize={entry.vi.length > 29 ? 9.5 : 11.8} fill="#33493e">{entry.vi}</text>
        </g>
      </g>;
    })}
    {groups.map((group, index) => {
      const start = entries.findIndex(row => row.category === group.name);
      const first = -90 + start * step;
      const last = first + group.rows.length * step;
      const angle = (first + last) / 2;
      const [x, y] = point(angle, 320);
      const [en, vi] = pair(group.name);
      return <g key={group.name} onClick={() => onCategory(group.name === activeCategory ? "all" : group.name)}
        className={styles.categoryArc} role="button" tabIndex={0}
        onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onCategory(group.name === activeCategory ? "all" : group.name); } }}>
        <path d={sector(first, last, 190, 429)} fill={PALETTE[index % PALETTE.length]} fillOpacity={activeCategory === group.name ? 0.95 : 0.73} stroke="#faf7f0" strokeWidth="3"/>
        <text x={x} y={y - 5} textAnchor="middle" fontSize={en.length > 20 ? 14 : 19} fontWeight="700" fill="#17291f">{en}</text>
        <text x={x} y={y + 18} textAnchor="middle" fontSize={vi.length > 22 ? 12 : 16} fill="#17291f">{vi}</text>
      </g>;
    })}
    <circle cx="900" cy="900" r="183" fill="#f7f3ea" stroke="#b08d57" strokeWidth="4"/>
    <text x="900" y="848" textAnchor="middle" fontSize="42" fill="#1c2b24" fontWeight="700">HOÀNG LONG</text>
    <text x="900" y="897" textAnchor="middle" fontSize="29" fill="#1c2b24">TEA SENSORY</text>
    <text x="900" y="941" textAnchor="middle" fontSize="26" fill="#4a6052">CẢM QUAN TRÀ</text>
    <text x="900" y="992" textAnchor="middle" fontSize="19" fill="#856b45">{entries.length} descriptors • EN / VI</text>
  </svg>;
}

export default function SensoryPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [access, setAccess] = useState("checking");
  const [wheel, setWheel] = useState("aroma");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [selected, setSelected] = useState({});
  const [zoom, setZoom] = useState(1);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let live = true;
    const check = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (!live) return;
        if (error || !user) { router.replace("/admin/login"); return; }
        const role = await supabase.from("staff_roles").select("role").eq("user_id", user.id).maybeSingle();
        if (!live) return;
        setAccess(role.error ? "error" : ["admin", "manager"].includes(role.data?.role) ? "allowed" : "denied");
      } catch { if (live) setAccess("error"); }
    };
    check();
    return () => { live = false; };
  }, [router, supabase]);

  const entries = useMemo(() => TEA_SENSORY_ENTRIES.filter(row => row.wheel === wheel), [wheel]);
  const groups = useMemo(() => {
    const map = new Map();
    for (const entry of entries) {
      if (!map.has(entry.category)) map.set(entry.category, { name: entry.category, rows: [] });
      map.get(entry.category).rows.push(entry);
    }
    return [...map.values()];
  }, [entries]);
  const shown = useMemo(() => entries.filter(entry =>
    (category === "all" || category === entry.category) &&
    (!query.trim() || fold([entry.en, entry.vi, entry.group, entry.category].join(" ")).includes(fold(query)))
  ), [entries, category, query]);
  const chosen = selected[wheel] || [];
  function toggleDescriptor(id) {
    setSelected(prev => {
      const current = prev[wheel] || [];
      return { ...prev, [wheel]: current.includes(id) ? current.filter(x => x !== id) : [...current, id] };
    });
  }
  function printWheel() {
    flushSync(() => { setQuery(""); setCategory("all"); });
    window.print();
  }
  async function copyNotes() {
    const text = entries.filter(row => chosen.includes(row.n)).map(row => row.en + " — " + row.vi).join("\n");
    if (!text) return;
    try { await navigator.clipboard.writeText(text); setCopied(true); } catch { setCopied(false); }
  }
  if (access === "checking") return <main className="hl-admin-state"><p>Đang mở thư viện cảm quan…</p></main>;
  if (access === "error") return <main className="hl-admin-state" role="alert"><p>Không kiểm tra được quyền. Hãy tải lại.</p></main>;
  if (access === "denied") return <main className="hl-admin-state hl-admin-state--denied"><h1>Cần quyền quản lý hoặc admin để mở thư viện cảm quan.</h1></main>;

  return <main className={styles.page} data-no-translate>
    <div className={styles.eyebrow}>HOUSE OF HOÀNG LONG · MANUFACTURING & LAB</div>
    <header className={styles.header}>
      <div><h1>Thư viện cảm quan trà</h1><p>Tea Sensory Library · 357 English–Vietnamese descriptors, shown in full on four wheels.</p></div>
      <div className={styles.headerLinks}><Link href="/admin/sensory/forms" className={styles.back}><FileText size={17}/>Phiếu thử nếm A4</Link><Link href="/admin/product-development" className={styles.back}><ArrowLeft size={17}/>Phát triển sản phẩm</Link></div>
    </header>
    <div className={styles.toolbar} aria-label="Chọn bánh xe cảm quan">
      {WHEELS.map(id => <button type="button" key={id} className={wheel === id ? styles.tabActive : ""} aria-pressed={wheel === id}
        onClick={() => { setWheel(id); setQuery(""); setCategory("all"); setZoom(1); setCopied(false); }}>
        <strong>{TEA_SENSORY_WHEELS[id].title}</strong><span>{TEA_SENSORY_WHEELS[id].vi} · {TEA_SENSORY_ENTRIES.filter(row => row.wheel === id).length}</span>
      </button>)}
    </div>
    <div className={styles.intro}>
      <div><h2>{TEA_SENSORY_WHEELS[wheel].title}</h2><p>{TEA_SENSORY_WHEELS[wheel].desc}</p></div>
      <div className={styles.utilities}>
        <button type="button" onClick={() => setZoom(z => Math.max(1, z - 0.5))} disabled={zoom === 1} aria-label="Thu nhỏ"><Minus size={17}/></button>
        <span>{Math.round(zoom * 100)}%</span>
        <button type="button" onClick={() => setZoom(z => Math.min(3, z + 0.5))} disabled={zoom === 3} aria-label="Phóng to"><Plus size={17}/></button>
        <button type="button" className={styles.printButton} onClick={printWheel}><Printer size={17}/>In / Save PDF</button>
      </div>
    </div>
    <div className={styles.workspace}>
      <section className={styles.wheelArea} aria-label="Bánh xe đầy đủ thuật ngữ">
        <p className={styles.wheelHint}>Chạm vào từng cung để chọn thuật ngữ. Phóng to để đọc trên điện thoại; bản in có toàn bộ chữ.</p>
        <div className={styles.scrollArea}>
          <div className={styles.wheelFrame} style={{ width: (850 * zoom) + "px" }}>
            <SensoryWheel entries={entries} groups={groups} chosen={chosen} activeCategory={category} onDescriptor={toggleDescriptor} onCategory={setCategory}/>
          </div>
        </div>
      </section>
      <aside className={styles.dictionary}>
        <div className={styles.searchBar}><Search size={18}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Tìm hương / Search flavors..." aria-label="Tìm thuật ngữ EN hoặc VI"/>{query && <button type="button" onClick={() => setQuery("")} aria-label="Xóa tìm kiếm"><X size={16}/></button>}</div>
        <div className={styles.categories}><button type="button" onClick={() => setCategory("all")} aria-pressed={category === "all"}>Tất cả</button>
          {groups.map(group => <button type="button" key={group.name} onClick={() => setCategory(group.name === category ? "all" : group.name)} aria-pressed={group.name === category}>{pair(group.name)[1] || group.name}</button>)}
        </div>
        <div className={styles.dictionaryHeading}><h3>English / Tiếng Việt</h3><span>{shown.length} / {entries.length}</span></div>
        <div className={styles.wordList}>
          {groups.map(group => {
            const filtered = shown.filter(row => row.category === group.name);
            if (!filtered.length) return null;
            return <section className={styles.wordGroup} key={group.name}>
              <h4>{pair(group.name)[0]} <span>{pair(group.name)[1]}</span></h4>
              {filtered.map(row => <button type="button" className={chosen.includes(row.n) ? styles.selected : ""} key={row.n}
                onClick={() => toggleDescriptor(row.n)} aria-pressed={chosen.includes(row.n)}
                title={row.group}>
                <span className={styles.english}>{row.en}</span><span className={styles.vietnamese}>{row.vi}</span>{chosen.includes(row.n) && <Check size={15}/>}
              </button>)}
            </section>;
          })}
          {!shown.length && <p className={styles.noResults}>Không có từ phù hợp. Thử từ khóa khác.</p>}
        </div>
      </aside>
    </div>
    <section className={styles.selection}>
      <div><h3>Từ đã chọn / Selected descriptors</h3><p>{chosen.length ? entries.filter(row => chosen.includes(row.n)).map(row => row.en + " · " + row.vi).join(" · ") : "Chạm vào các từ phù hợp với mẫu thử. Chưa lưu vào hồ sơ lô."}</p></div>
      <button type="button" disabled={!chosen.length} onClick={copyNotes}><ClipboardCopy size={17}/>{copied ? "Đã sao chép" : "Sao chép từ đã chọn"}</button>
    </section>
    <footer className={styles.disclaimer}>
      <h3>Hướng dẫn đánh giá / Tasting guidance</h3>
      <ul>{SENSORY_REFERENCE_RULES.map(line => <li key={line}>{line}</li>)}</ul>
      <p>Reference only • Not an official sensory standard • Not a certificate or automatic QC decision. Use <Link href="/admin/operations">Vận hành → Lô & chất lượng</Link> to record batch-specific assessments.</p>
    </footer>
  </main>;
}
