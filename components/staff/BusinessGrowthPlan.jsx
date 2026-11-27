"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import FormattedNumberInput from "@/components/FormattedNumberInput";
import {
  growthActual, growthFunnel, growthMetrics, growthPriority, localMonth, planningInputs, suggestedGrowthTargets,
} from "@/lib/business-growth-plan";
import styles from "./BusinessGrowthPlan.module.css";

const decimal = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 });
const integer = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 });
const show = (value, unit) => {
  if (value == null || !Number.isFinite(Number(value))) return "—";
  if (unit === "money") return `${integer.format(value)} ₫`;
  if (unit === "kg") return `${decimal.format(value)} kg`;
  if (unit === "%") return `${decimal.format(value)}%`;
  return decimal.format(value);
};
const highlighted = new Set(["netRevenue", "grossMargin", "firstPaidBuyers", "repeatPaidBuyers"]);
const floorPosition = (actual, target) => {
  if (actual == null || target == null) return null;
  if (actual >= target) return "achieved";
  return "remaining";
};

export default function BusinessGrowthPlan({ supabase, role }) {
  const canManage = ["admin", "manager"].includes(role);
  const [month, setMonth] = useState(localMonth);
  const [result, setResult] = useState(null);
  const [targets, setTargets] = useState({});
  const [assumptions, setAssumptions] = useState({});
  const [focus, setFocus] = useState("");
  const [increase, setIncrease] = useState(10);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (!canManage) return;
    const controller = new AbortController();
    setResult(null); setError(""); setMessage("");
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error();
        const response = await fetch(`/api/staff/business-plan?month=${month}`, {
          headers: { Authorization: `Bearer ${session.access_token}` }, signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok || !Array.isArray(data.months)) throw new Error();
        if (controller.signal.aborted) return;
        setResult(data);
        setTargets(data.plan?.targets ?? {});
        setAssumptions(data.plan?.assumptions ?? {});
        setFocus(data.plan?.focus ?? "");
        setDirty(false);
      } catch {
        if (!controller.signal.aborted) setError("Chưa tải được kế hoạch. Hãy thử tải lại.");
      }
    })();
    return () => controller.abort();
  }, [supabase, month, canManage, reload]);

  const todayMonth = localMonth();
  const actual = useMemo(() => month > todayMonth ? {} : growthActual(result?.months[0]), [result, month, todayMonth]);
  const previous = useMemo(() => {
    const row = result?.months[1];
    return row && row.period.slice(0, 7) < todayMonth ? growthActual(row) : {};
  }, [result, todayMonth]);
  const suggestions = useMemo(() => suggestedGrowthTargets(
    (result?.months ?? []).slice(1).filter(row => row.period.slice(0, 7) < todayMonth), increase,
  ), [result, increase, todayMonth]);
  const numbers = (values) => Object.fromEntries(Object.entries(values).map(([key, value]) => [key, Number(value)]));
  const numericTargets = numbers(targets);
  const [year, monthNumber] = month.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const scenario = growthFunnel(numericTargets.firstPaidBuyers, { ...numbers(assumptions), daysInMonth });
  const priority = growthPriority(actual, numericTargets, month < todayMonth);
  const updating = dirty ? "Bản nháp chưa lưu" : result?.plan ? "Đã lưu kế hoạch tháng" : "Chưa có mục tiêu đã lưu";

  function setValue(setter, key, raw) {
    setter(values => {
      if (raw !== "") return { ...values, [key]: raw };
      const next = { ...values };
      delete next[key];
      return next;
    });
    setDirty(true);
    setMessage("");
  }

  const changeMonth = event => {
    const value = event.target.value;
    if (!/^20\d{2}-(0[1-9]|1[0-2])$/.test(value) || value === month || saving) return;
    if (dirty && !window.confirm("Chuyển tháng và bỏ các chỉnh sửa chưa lưu?")) return;
    setResult(null); setMonth(value);
  };

  async function save(event) {
    event.preventDefault();
    if (!result || saving || !dirty) return;
    setSaving(true); setError(""); setMessage("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error();
      const response = await fetch("/api/staff/business-plan", {
        method: "PUT",
        headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ month, targets: numericTargets, assumptions: numbers(assumptions), focus, version: result.plan?.version ?? null }),
      });
      const data = await response.json();
      if (response.status === 409) { setError("Kế hoạch vừa được cập nhật ở thiết bị khác. Ghi lại phần chỉnh sửa rồi tải lại."); return; }
      if (response.status === 400) { setError("Kiểm tra mục tiêu, tỷ lệ 0–100% và số lượng nguyên trước khi lưu."); return; }
      if (!response.ok || !data.plan) throw new Error();
      setResult(current => ({ ...current, plan: data.plan })); setDirty(false); setMessage("Đã lưu kế hoạch.");
    } catch {
      setError("Chưa lưu được kế hoạch. Bản nháp vẫn ở đây.");
    } finally { setSaving(false); }
  }

  if (!canManage) return <section className={styles.plan}><p>Mục này dành cho tài khoản quản lý.</p></section>;
  return <section className={styles.plan} aria-labelledby="growth-plan-title">
    <header className={styles.header}>
      <div><h2 id="growth-plan-title">Kế hoạch tăng trưởng</h2><p>Xem số thực tế, chọn mục tiêu tháng và tính lượng khách cần để đạt mục tiêu.</p></div>
      <label>Tháng kế hoạch<input type="month" value={month} onChange={changeMonth} disabled={saving}/></label>
    </header>
    {error && <p role="alert" className={styles.error}>{error} <button type="button" disabled={saving} onClick={() => {
      if (!dirty || window.confirm("Tải lại và bỏ bản nháp chưa lưu?")) setReload(i => i + 1);
    }}>Tải lại</button></p>}
    {message && <p role="status">{message}</p>}
    {!result && !error && <p role="status">Đang tải số liệu…</p>}
    {result && <form onSubmit={save}>
      <div className={styles.score}>
        {growthMetrics.flatMap(group => group.metrics).filter(([key]) => highlighted.has(key)).map(([key,label,unit]) =>
          <div key={key}><span>{label}</span><strong>{show(actual[key],unit)}</strong><small>Mục tiêu {show(targets[key],unit)}</small></div>)}
      </div>
      <section className={styles.priority}>
        <div><p>Ưu tiên điều hành</p><h3>{priority.title}</h3><span>{priority.detail}</span></div>
        <Link href={priority.href}>{priority.action} →</Link>
      </section>
      <label className={styles.focus}>Việc trọng tâm tháng này
        <textarea value={focus} onChange={event => { setFocus(event.target.value); setDirty(true); }} maxLength={600} disabled={saving}
          placeholder="Ví dụ: hỏi lại quán sau khi gửi mẫu, ghi rõ trà được chọn và ngày dự kiến đặt đơn."/>
      </label>

      <details className={styles.section} open>
        <summary>Thực tế và mục tiêu</summary>
        <p>{month === todayMonth ? "Số thực tế tính đến hôm nay. Cột tháng trước là cả tháng." : month > todayMonth ? "Tháng kế hoạch chưa bắt đầu." : "Hai cột thực tế dùng số liệu cả tháng."} Dấu — là chưa có dữ liệu hoặc mục tiêu.</p>
        <div className={styles.scenarios}>
          <label>Kịch bản từ dữ liệu 3 tháng trước<select value={increase} onChange={event => setIncrease(Number(event.target.value))}>
            <option value={0}>Giữ nhịp · mức giữa</option>
            <option value={10}>Tăng vừa · +10%</option>
            <option value={20}>Tăng nhanh · +20%</option>
          </select></label>
          <button type="button" disabled={saving || !Object.keys(suggestions).some(key => targets[key] == null)}
            onClick={() => { setTargets({ ...suggestions, ...targets }); setDirty(true); }}>Điền mục tiêu còn trống</button>
        </div>
        <small>Các mức là đề xuất lập kế hoạch. Cần ít nhất hai tháng có số liệu. Biên gộp lấy mức giữa, không tự tăng theo doanh số.</small>
        {growthMetrics.map(group => <section className={styles.metricGroup} key={group.title}>
          <h3>{group.title}</h3>
          <div className={styles.metricHead}><span>Chỉ số</span><span>Tháng trước</span><span>Thực tế</span><span>Mục tiêu</span></div>
          {group.metrics.map(([key,label,unit,source]) =>
            <div key={key} className={styles.metricRow} data-position={floorPosition(actual[key],numericTargets[key])}>
              <div><b>{label}</b><small>{source}</small></div>
              <span><small>Tháng trước</small>{show(previous[key],unit)}</span>
              <strong><small>Thực tế</small>{show(actual[key],unit)}</strong>
              <label><small>Mục tiêu</small>{unit === "%" || unit === "kg" || key === "ebitda" ?
                <input type="number" step="any" aria-label={`Mục tiêu ${label}`} value={targets[key] ?? ""}
                  onChange={event => setValue(setTargets,key,event.target.value)} disabled={saving} placeholder="—"/> :
                <FormattedNumberInput aria-label={`Mục tiêu ${label}`} value={targets[key] ?? ""}
                  onChange={event => setValue(setTargets,key,event.target.value)} disabled={saving} placeholder="—"/>}
              </label>
            </div>)}
        </section>)}
        <p>Tiền thu ghi trong app chỉ gồm các khoản đã được ghi nhận. Số khách mua sỉ dựa trên đơn trả đủ có liên hệ hoặc tài khoản để nhận diện. Khách có thể phát sinh cả đơn đầu và đơn mua lại trong cùng tháng.</p>
      </details>

      <details className={styles.section}>
        <summary>Tính ngược số khách cần tiếp cận</summary>
        <p>Đặt mục tiêu khách sỉ thanh toán lần đầu ở trên, rồi nhập tỷ lệ giả định để tính khối lượng công việc. Các tỷ lệ dưới đây do bạn nhập, có thể sửa sau khi đo trên khách đã nhận mẫu.</p>
        <div className={styles.drivers}>
          {planningInputs.map(([key,label]) => <label key={key}>{label}<FormattedNumberInput value={assumptions[key] ?? ""}
            onChange={event => setValue(setAssumptions,key,event.target.value)} disabled={saving} placeholder="Chưa nhập"
            step={key.startsWith("budget") || key === "firstOrderValue" ? "1" : "0.1"}/></label>)}
        </div>
        <div className={styles.score}>
          {[["Cơ hội cần có",scenario.prospects,"count"],["Mẫu cần gửi",scenario.samples,"count"],["Cơ hội bình quân mỗi tuần",scenario.weeklyProspects,"count"],
            ["Khách mua lại dự kiến trong 90 ngày",scenario.repeats,"count"],
            ["Giá trị dự kiến từ đơn đầu",scenario.firstOrderValue,"money"],
            ["Ngân sách trên mỗi khách mới mục tiêu",scenario.budgetPerBuyer,"money"],
          ].map(([label,value,unit]) => <div key={label}><span>{label}</span><strong>{show(value,unit)}</strong></div>)}
        </div>
      </details>
      <details className={styles.section}>
        <summary>Kế hoạch 90 ngày cho kênh bán sỉ</summary>
        <ol className={styles.roadmap}>
          <li><b>Tháng 1 · Xác định trà dễ bán nhất cho quán</b><p>Dẫn khách từ bài pha chế về yêu cầu mẫu. Ghi nguồn, dòng trà và nhu cầu để biết nội dung nào mang khách phù hợp.</p></li>
          <li><b>Tháng 2 · Chuyển mẫu thành đơn đầu</b><p>Hỏi lại sau 7 ngày. Ghi trà nào đã được thử, lý do chưa đặt và ngày chốt báo giá. Mỗi tuần xem hồ sơ nào đang chờ bước tiếp theo.</p></li>
          <li><b>Tháng 3 · Xây nhịp mua lại</b><p>Hẹn liên hệ theo tốc độ dùng của từng quán. Ưu tiên khách có đơn thứ hai và chỉ tăng ngân sách khi biên gộp và chi phí tìm khách cho phép.</p></li>
        </ol>
      </details>
      <footer className={styles.save}><span>{updating}</span><button type="submit" disabled={!dirty || saving}>{saving ? "Đang lưu…" : "Lưu kế hoạch tháng"}</button></footer>
    </form>}
  </section>;
}
