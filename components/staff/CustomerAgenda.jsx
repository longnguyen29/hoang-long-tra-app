"use client";

import { useMemo, useState } from "react";
import { ArrowUpRight, CalendarDays, Copy } from "lucide-react";
import { agendaLabels, groupCustomerAgenda } from "@/lib/customer-agenda";
import { houseDateKey } from "@/lib/dashboard-calendar";
import { stageLabel } from "@/lib/trade-pipeline";
import CustomerFollowupSheet from "./CustomerFollowupSheet";
import styles from "./CustomerAgenda.module.css";

function displayDay(day) {
  return day ? day.split("-").reverse().join("/") : "Chưa hẹn ngày";
}

export default function CustomerAgenda({ customers, loading, onOpen, onSave, onSaved }) {
  const [chosen, setChosen] = useState(null);
  const [limit, setLimit] = useState(8);
  const [copyStatus, setCopyStatus] = useState("");
  const [fallback, setFallback] = useState("");
  const [editor, setEditor] = useState(null);
  const [receipt, setReceipt] = useState("");
  const [owner, setOwner] = useState("*");
  const owners = useMemo(() => [...new Set(customers.filter(customer => customer.stage !== "lost" && !customer.prospect_suppressed)
    .map(customer => customer.owner?.trim() || ""))].sort((a,b) => a.localeCompare(b,"vi")), [customers]);
  const today = houseDateKey();
  const groups = useMemo(() => groupCustomerAgenda(owner === "*" ? customers : customers.filter(customer => (customer.owner?.trim() || "") === owner.slice(1)), today), [customers, owner, today]);
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

  return <><section className={styles.agenda} aria-label="Lịch chăm sóc khách hàng">
    <header><div><CalendarDays aria-hidden="true"/><h2>Lịch chăm sóc</h2></div>
      <button type="button" onClick={copyBrief} disabled={loading || !rows.length}><Copy size={16}/>Sao chép bàn giao</button>
    </header>
    <label className={styles.owner}>Người phụ trách<select value={owner} onChange={event => {
      setOwner(event.target.value); setLimit(8); setChosen(null); setFallback(""); setCopyStatus("");
    }}>
      <option value="*">Tất cả</option>{owners.map(name => <option key={name} value={"="+name}>{name || "Chưa phân công"}</option>)}
    </select></label>
    <div className={styles.tiles} role="group" aria-label="Lọc theo lịch hẹn">
      {Object.entries(agendaLabels).map(([key, label]) => <button key={key} type="button" data-kind={key} aria-pressed={bucket === key}
        onClick={() => { setChosen(key); setLimit(8); setCopyStatus(""); setFallback(""); }}>
        <strong>{loading ? "—" : groups[key].length}</strong><span>{label}</span>
      </button>)}
    </div>
    {receipt && <p role="status">{receipt}</p>}
    {copyStatus && <p role="status">{copyStatus}</p>}
    {fallback && <label className={styles.manual}>Chọn và sao chép bản bàn giao<textarea readOnly value={fallback} onFocus={e => e.target.select()}/></label>}
    {loading ? <p role="status">Đang tải lịch chăm sóc…</p> : rows.length ? <ul>
      {rows.slice(0,limit).map(({customer, day}) => <li key={customer.id}><button className={styles.record} type="button" onClick={() => onOpen(customer)}>
        <span><b>{customer.business_name}</b><small>{stageLabel(customer.stage)} · {customer.owner || "Chưa phân công"}</small></span>
        <span>{customer.next_action || "Đặt bước tiếp theo"}<small>{displayDay(day)}</small></span>
        <ArrowUpRight size={18} aria-hidden="true"/>
      </button><button className={styles.logButton} type="button" aria-label={`Ghi kết quả cho ${customer.business_name}`} onClick={() => {
        setEditor(customer); setReceipt("");
      }}>Ghi kết quả</button></li>)}
    </ul> : <p>Không có khách trong nhóm này.</p>}
    {!loading && rows.length > limit && <button className={styles.more} type="button" onClick={() => setLimit(limit + 8)}>Xem thêm {Math.min(8, rows.length-limit)} khách</button>}
  </section>
    {editor && <CustomerFollowupSheet customer={editor} onClose={() => setEditor(null)} onSave={onSave} onSaved={record => {
      onSaved(record); setReceipt(`Đã ghi kết quả cho ${record.business_name}.`); setEditor(null); setFallback(""); setCopyStatus("");
    }}/>}
  </>;
}
