"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Save, RefreshCw, Calculator } from "lucide-react";
import FormattedNumberInput from "@/components/FormattedNumberInput";
import { METRIC_FIELDS, emptyMetricInputs, normalizeMetricInputs, calculateBusinessMetrics, calculateOrderIndicators } from "@/lib/business-metrics";
import styles from "./BusinessMetrics.module.css";

const money = value => value == null ? "Chưa đủ dữ liệu" : `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(value)} ₫`;
const percent = value => value == null ? "—" : `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(value)}%`;
const currentMonth = () => {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit" }).formatToParts(new Date());
  return `${parts.find(part => part.type === "year").value}-${parts.find(part => part.type === "month").value}`;
};
const editableInputs = row => Object.fromEntries(METRIC_FIELDS.map(field => [field.key, row?.inputs?.[field.key] == null ? "" : String(row.inputs[field.key])]));
const results = [
  ["grossProfit", "Lợi nhuận gộp trước khấu hao", "Doanh thu thuần − giá vốn", "grossMargin"],
  ["operatingBeforeDA", "Kết quả hoạt động trước khấu hao", "Lợi nhuận gộp trước khấu hao − chi phí vận hành"],
  ["ebitda", "EBITDA", "Kết quả hoạt động trước khấu hao + thu nhập khác − chi phí khác", "ebitdaMargin"],
  ["ebit", "EBIT", "EBITDA − khấu hao & phân bổ"],
  ["profitBeforeTax", "Lợi nhuận trước thuế", "EBIT − chi phí lãi vay"],
  ["netIncome", "Lợi nhuận sau thuế", "Lợi nhuận trước thuế − thuế thu nhập", "netMargin"],
];
const groups = [
  ["operations", "Doanh thu & chi phí hoạt động", "Nhập số phát sinh trong tháng, cùng một cơ sở kế toán."],
  ["other", "Thu nhập & chi phí khác", "Không tính lại khoản đã nằm trong doanh thu, giá vốn hoặc chi phí vận hành."],
  ["finance", "Khấu hao, lãi vay & thuế", "Dùng để tính EBIT và lợi nhuận sau thuế."],
];

export default function BusinessMetrics({ supabase, orders = [], role, email, ordersLoading = false, ordersError = false }) {
  const canManage = ["admin", "manager"].includes(role);
  const [month, setMonth] = useState(currentMonth);
  const [inputs, setInputs] = useState(emptyMetricInputs);
  const [notes, setNotes] = useState("");
  const [version, setVersion] = useState(null);
  const [savedAt, setSavedAt] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ready, setReady] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reload, setReload] = useState(0);
  const draftKey = `hl-business-metrics-v1:${email || "current"}:${month}`;
  const discardDraft = () => { try { sessionStorage.removeItem(draftKey); } catch {} };
  const readDraft = () => { try { return JSON.parse(sessionStorage.getItem(draftKey) || "null"); } catch { return null; } };
  const calculated = useMemo(() => calculateBusinessMetrics(inputs), [inputs]);
  const ordersReference = useMemo(() => calculateOrderIndicators(orders, month), [orders, month]);

  useEffect(() => {
    if (!canManage) { setLoading(false); return; }
    let live = true;
    setLoading(true); setReady(false); setError(""); setNotice("");
    (async () => {
      try {
        const [selected, recent] = await Promise.all([
          supabase.from("business_metric_periods").select("*").eq("period", `${month}-01`).maybeSingle(),
          supabase.from("business_metric_periods").select("period,inputs,updated_at,version").order("period", { ascending: false }).limit(12),
        ]);
        if (!live) return;
        if (selected.error || recent.error) throw new Error("load_failed");
        const draft = readDraft();
        if (draft && draft.inputs && (draft.version === null || Number.isInteger(draft.version))) {
          setInputs(editableInputs(draft)); setNotes(String(draft.notes || "").slice(0,3000));
          setVersion(draft.version); setSavedAt(draft.savedAt || null); setDirty(true);
          setNotice("Đã khôi phục bản nháp chưa lưu trên trình duyệt này.");
        } else {
          setInputs(editableInputs(selected.data)); setNotes(selected.data?.notes || "");
          setVersion(selected.data?.version ?? null); setSavedAt(selected.data?.updated_at || null); setDirty(false);
        }
        setHistory(recent.data || []); setReady(true);
      } catch {
        if (live) {
          const draft = readDraft();
          if (draft?.inputs) { setInputs(editableInputs(draft)); setNotes(String(draft.notes || "").slice(0,3000)); setVersion(draft.version ?? null); setDirty(true); }
          setError("Chưa tải được số liệu đã lưu. Bản nháp vẫn tính được; chưa thể lưu vào hệ thống. Hãy thử tải lại.");
        }
      } finally { if (live) setLoading(false); }
    })();
    return () => { live = false; };
  }, [supabase, month, reload, canManage, draftKey]);

  useEffect(() => {
    if (!dirty || !canManage) return;
    try { sessionStorage.setItem(draftKey, JSON.stringify({ inputs, notes, version, savedAt })); } catch {}
  }, [dirty, inputs, notes, version, savedAt, draftKey, canManage]);

  useEffect(() => {
    if (!dirty) return;
    const protectDraft = event => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", protectDraft);
    return () => window.removeEventListener("beforeunload", protectDraft);
  }, [dirty]);

  function changeMonth(next) {
    if (!/^\d{4}-\d{2}$/.test(next) || next === month) return;
    if (dirty && !window.confirm("Bản nháp chưa lưu. Chuyển tháng và bỏ các thay đổi này?")) return;
    discardDraft();
    setInputs(emptyMetricInputs()); setNotes(""); setVersion(null); setSavedAt(null); setDirty(false); setMonth(next);
  }
  function update(key, value) {
    setInputs(previous => ({ ...previous, [key]: value })); setDirty(true); setNotice("");
  }
  async function save(event) {
    event.preventDefault();
    if (!ready || saving || !canManage) return;
    const { values, errors } = normalizeMetricInputs(inputs);
    if (Object.keys(errors).length) { setError("Kiểm tra lại các số tiền đang báo lỗi."); return; }
    setSaving(true); setError(""); setNotice("");
    try {
      const response = await supabase.rpc("save_business_metric_period", {
        p_period: `${month}-01`, p_inputs: values, p_notes: notes.trim(), p_expected_version: version,
      });
      if (response.error) throw response.error;
      const row = Array.isArray(response.data) ? response.data[0] : response.data;
      if (!row) throw new Error("missing_saved_record");
      discardDraft(); setVersion(row.version); setSavedAt(row.updated_at); setDirty(false);
      setHistory(previous => [row, ...previous.filter(item => item.period !== row.period)].sort((a,b) => b.period.localeCompare(a.period)).slice(0,12));
      setNotice("Đã lưu số liệu tháng. Các chỉ số được tính từ dữ liệu bạn đã nhập.");
    } catch (failure) {
      setError(String(failure.message || "").includes("metric_conflict")
        ? "Tháng này vừa được sửa ở nơi khác. Bản nháp vẫn giữ ở đây; xuất CSV để giữ lại, rồi tải lại trước khi lưu."
        : "Chưa lưu được. Bản nháp vẫn giữ ở đây; kiểm tra kết nối rồi thử lại.");
    } finally { setSaving(false); }
  }
  function exportCsv() {
    const rows = [["Tháng", month], ["Trạng thái", dirty ? "Bản nháp chưa lưu · giữ tạm trên trình duyệt này" : savedAt ? "Đã lưu" : "Chưa lưu"], ["Đơn vị", "VND"],
      ...METRIC_FIELDS.map(field => [field.label, calculated.values[field.key] ?? "Chưa nhập"]),
      ...results.map(([key,label]) => [label, calculated[key] ?? "Chưa đủ dữ liệu"]),
      ["Biên gộp trước khấu hao (%)", calculated.grossMargin ?? ""], ["Biên EBITDA (%)", calculated.ebitdaMargin ?? ""], ["Biên lợi nhuận sau thuế (%)", calculated.netMargin ?? ""]];
    const csv = rows.map(row => row.map(value => `"${String(value).replaceAll('"','""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF"+csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `chi-so-hoang-long-${month}.csv`; anchor.click(); URL.revokeObjectURL(url);
  }
  const reloadSaved = useCallback(() => {
    if (dirty && !window.confirm("Tải lại sẽ bỏ bản nháp chưa lưu. Tiếp tục?")) return;
    discardDraft(); setReload(value => value + 1);
  }, [dirty]);

  if (!canManage) return <section className={styles.panel}><h2>Chỉ số kinh doanh</h2><p>Mục này dành cho tài khoản quản lý.</p></section>;
  return <section className={styles.panel} aria-label="Chỉ số kinh doanh">
    <header className={styles.header}>
      <div><p>Sổ chỉ số kinh doanh</p><h2>Từ số liệu đến lợi nhuận</h2><span>Nhập theo tháng · tính ngay · lưu để xem lại</span></div>
      <label>Tháng báo cáo<input type="month" value={month} min="2000-01" max="2100-12" onChange={event => changeMonth(event.target.value)} disabled={saving || loading}/></label>
    </header>
    {error && <div className={styles.alert} role="alert"><p>{error}</p><button type="button" onClick={reloadSaved} disabled={loading || saving}><RefreshCw size={16}/>Tải lại số đã lưu</button></div>}
    {notice && <p className={styles.notice} role="status">{notice}</p>}
    <div className={styles.reference}>
      <h3>Tham khảo từ đơn tạo trong tháng</h3>
      {ordersLoading || ordersError ? <p>{ordersError ? "Chưa tải được dữ liệu đơn hàng." : "Đang tải dữ liệu đơn hàng…"}</p> : <div><span><b>{ordersReference.count}</b> đơn · {ordersReference.completedCount} đã hoàn tất</span><span><b>{money(ordersReference.bookedValue)}</b> tổng giá trị đơn có giá</span><span><b>{ordersReference.countMissingValue}</b> đơn chưa có giá</span><span><b>{money(ordersReference.averageKnownOrderValue)}</b> giá trị TB / đơn có giá</span></div>}
      <p>Đây là giá trị dự tính của đơn theo ngày tạo, không xác nhận doanh thu kế toán hay tiền đã thu. Kiểm tra giảm giá, hàng trả và VAT trước khi nhập doanh thu thuần.</p>
    </div>
    <div className={styles.workspace}>
      <form onSubmit={save} className={styles.form}>
        <header><h3>Số liệu đầu vào <small>VND</small></h3><p>Để trống nếu chưa biết. Nhập 0 hoặc chọn “Không phát sinh” khi đã xác nhận không có khoản đó.</p></header>
        <fieldset disabled={loading || saving}>
          {groups.map(([group,title,help]) => <details key={group} open={group !== "finance"} className={styles.group}>
            <summary>{title}</summary><p>{help}</p>
            {METRIC_FIELDS.filter(field => field.group === group).map(field => <div className={styles.field} key={field.key}>
              <label htmlFor={`metric-${field.key}`}>{field.label}</label>
              <div><FormattedNumberInput id={`metric-${field.key}`} value={inputs[field.key]} onChange={event => update(field.key,event.target.value)} placeholder="Chưa nhập" min={0} max={1e15} aria-describedby={`metric-help-${field.key}`} aria-invalid={Boolean(calculated.errors[field.key])}/><button type="button" onClick={() => update(field.key,"0")} aria-label={`${field.label}: không phát sinh`}>Không phát sinh</button></div>
              <small id={`metric-help-${field.key}`}>{calculated.errors[field.key] || field.help}</small>
            </div>)}
          </details>)}
          <label className={styles.notes}>Ghi chú / nguồn số liệu<textarea value={notes} maxLength={3000} onChange={event => {setNotes(event.target.value);setDirty(true);setNotice("");}} placeholder="Ví dụ: sổ bán hàng, bảng giá vốn và chi phí tháng…" rows={3}/></label>
        </fieldset>
        <div className={styles.actions}><button type="submit" disabled={loading || saving || !ready || !dirty || Object.keys(calculated.errors).length > 0}><Save size={17}/>{saving ? "Đang lưu…" : "Lưu số liệu tháng"}</button><button type="button" onClick={exportCsv} disabled={loading}><Download size={17}/>Xuất CSV</button></div>
        <p className={styles.saved}>{loading ? "Đang tải số liệu…" : dirty ? "Bản nháp chưa lưu" : savedAt ? `Đã lưu: ${new Date(savedAt).toLocaleString("vi-VN",{timeZone:"Asia/Ho_Chi_Minh"})}` : "Tháng này chưa có số liệu đã lưu."}</p>
      </form>
      <section className={styles.calculations} aria-label="Kết quả tính toán" aria-busy={loading}>
        <div className={styles.ebitda}><Calculator size={20}/><span>EBITDA</span><strong>{loading ? "Đang tải…" : money(calculated.ebitda)}</strong><small>{calculated.ebitda == null ? "Nhập đủ doanh thu, giá vốn, chi phí vận hành và các khoản khác." : `Biên EBITDA: ${percent(calculated.ebitdaMargin)}`}</small></div>
        <p className={styles.basis}>Kết quả từ {dirty ? "bản nháp hiện tại" : savedAt ? "số liệu đã lưu" : "số liệu bạn nhập"}. EBITDA là lợi nhuận trước lãi vay, thuế, khấu hao & phân bổ; không phải tiền mặt còn lại.</p>
        <dl className={styles.ledger}>{results.map(([key,label,formula,margin]) => <div key={key} data-negative={calculated[key] != null && calculated[key] < 0}><dt>{label}<small>{formula}</small></dt><dd>{loading ? "—" : money(calculated[key])}{margin && <small>Biên: {percent(calculated[margin])}</small>}</dd></div>)}</dl>
        <p className={styles.basis}>Không đưa mua máy, trả gốc vay hoặc tiền chủ rút vào chi phí vận hành. Khấu hao & phân bổ nhập riêng. Mỗi khoản chi chỉ ghi một lần.</p>
      </section>
    </div>
    <section className={styles.history}><h3>Lịch sử 12 tháng đã lưu gần nhất</h3>{history.length ? <div className={styles.tableWrap}><table><thead><tr><th>Tháng</th><th>Doanh thu thuần</th><th>EBITDA</th><th>Lợi nhuận sau thuế</th></tr></thead><tbody>{history.map(row => {const metric=calculateBusinessMetrics(row.inputs);return <tr key={row.period}><th><button type="button" onClick={() => changeMonth(row.period.slice(0,7))} disabled={saving || loading}>{row.period.slice(0,7)}</button></th><td>{money(metric.values.netRevenue)}</td><td>{money(metric.ebitda)}</td><td>{money(metric.netIncome)}</td></tr>;})}</tbody></table></div> : <p>Lưu tháng đầu tiên để bắt đầu theo dõi.</p>}</section>
  </section>;
}
