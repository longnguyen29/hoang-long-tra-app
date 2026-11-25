"use client";

import { useMemo, useState } from "react";
import { ArrowUpRight, CalendarDays, Copy } from "lucide-react";
import { agendaLabels, groupCustomerAgenda } from "@/lib/customer-agenda";
import { houseDateKey } from "@/lib/dashboard-calendar";
import { stageLabel } from "@/lib/trade-pipeline";
import styles from "./CustomerAgenda.module.css";

function displayDay(day) {
  return day ? day.split("-").reverse().join("/") : "Chưa hẹn ngày";
}

export default function CustomerAgenda({ customers, loading, onOpen }) {
  const [chosen, setChosen] = useState(null);
  const [limit, setLimit] = useState(8);
  const [copyStatus, setCopyStatus] = useState("");
  const [fallback, setFallback] = useState("");
  const today = houseDateKey();
  const groups = useMemo(() => groupCustomerAgenda(customers, today), [customers, today]);
  const bucket = chosen || Object.keys(groups).find(key => groups[key].length) || "today";
  const rows = groups[bucket];
  async function copyBrief() {
    const lines = rows.map(({ customer, day }) => [customer.business_name, customer.next_action || "Đặt bước tiếp theo", displayDay(day), customer.owner || "Chưa phân công"].join(" · "));
    const brief = [`Bàn giao khách hàng · ${displayDay(today)} · ${agendaLabels[bucket]}`, ...lines].join("\n");
    try {
      await navigator.clipboard.writeText(brief);
      setCopyStatus("Đã sao chép bản bàn giao.");
    } catch {
      setFallback(brief);
    }
  }

  return <section className={styles.agenda} aria-label="Lịch chăm sóc khách hàng">
    <header><div><CalendarDays aria-hidden="true"/><h2>Lịch chăm sóc</h2></div>
      <button type="button" onClick={copyBrief} disabled={loading || !rows.length}><Copy size={16}/>Sao chép bàn giao</button>
    </header>
    <div className={styles.tiles} role="group" aria-label="Lọc theo lịch hẹn">
      {Object.entries(agendaLabels).map(([key, label]) => <button key={key} type="button" data-kind={key} aria-pressed={bucket === key}
        onClick={() => { setChosen(key); setLimit(8); setCopyStatus(""); setFallback(""); }}>
        <strong>{loading ? "—" : groups[key].length}</strong><span>{label}</span>
      </button>)}
    </div>
    {copyStatus && <p role="status">{copyStatus}</p>}
    {fallback && <label className={styles.manual}>Chọn và sao chép bản bàn giao<textarea readOnly value={fallback} onFocus={e => e.target.select()}/></label>}
    {loading ? <p role="status">Đang tải lịch chăm sóc…</p> : rows.length ? <ul>
      {rows.slice(0,limit).map(({customer, day}) => <li key={customer.id}><button type="button" onClick={() => onOpen(customer)}>
        <span><b>{customer.business_name}</b><small>{stageLabel(customer.stage)} · {customer.owner || "Chưa phân công"}</small></span>
        <span>{customer.next_action || "Đặt bước tiếp theo"}<small>{displayDay(day)}</small></span>
        <ArrowUpRight size={18} aria-hidden="true"/>
      </button></li>)}
    </ul> : <p>Không có khách trong nhóm này.</p>}
    {!loading && rows.length > limit && <button className={styles.more} type="button" onClick={() => setLimit(limit + 8)}>Xem thêm {Math.min(8, rows.length-limit)} khách</button>}
  </section>;
}
