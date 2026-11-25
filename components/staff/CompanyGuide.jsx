"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, BookOpen, Copy } from "lucide-react";
import { guideBrief } from "@/lib/company-guide";
import { foldCustomerText } from "@/lib/customer-contacts";
import styles from "./CompanyGuide.module.css";

export default function CompanyGuide({ flows, readablePaths, references, canRead, canReview, incomplete, asOf }) {
  const [flowId,setFlowId] = useState(flows[0]?.id);
  const [task,setTask] = useState("");
  const [query,setQuery] = useState("");
  const [ids,setIds] = useState([]);
  const [message,setMessage] = useState("");
  const [manual,setManual] = useState(false);
  const flow = flows.find(item => item.id === flowId);
  const refs = references.filter(item => ids.includes(item.key));
  const matches = references.filter(item => foldCustomerText(item.title + " " + item.body + " " + item.kind).includes(foldCustomerText(query)));
  if (!flow) return <main className={styles.page}><h1>Sổ tay Hoàng Long</h1><p>Chưa có quy trình phù hợp với quyền của tài khoản.</p></main>;
  const brief = guideBrief(flow,task,refs,asOf);
  function resetCopy() { setMessage(""); setManual(false); }
  async function copy() {
    try { await navigator.clipboard.writeText(brief); setMessage("Đã sao chép bản giao việc."); }
    catch { setManual(true); setMessage("Chọn nội dung bên dưới để sao chép."); }
  }
  return <main className={styles.page}>
    <header><BookOpen aria-hidden="true"/><div><h1>Sổ tay Hoàng Long</h1><p>Chọn việc cần làm để tìm đúng hồ sơ và chuẩn bị thông tin cho đồng nghiệp hoặc trợ lý AI.</p></div></header>
    <div className={styles.layout}><nav aria-label="Chọn công việc">{flows.map(item => <button key={item.id} aria-pressed={item.id === flowId} onClick={() => {
      if (item.id !== flowId) { setFlowId(item.id); setTask(""); setIds([]); setQuery(""); resetCopy(); }
    }}>{item.title}</button>)}</nav>
    <article><h2>{flow.question}</h2><ul className={styles.sources}>{flow.sources.map(([,name,path,reason]) => <li key={path}>{readablePaths.includes(path) ? <Link href={path}><strong>{name}</strong><ArrowUpRight size={17}/></Link> : <div><strong>{name}</strong><small>Liên hệ người phụ trách để tra hồ sơ</small></div>}<p>{reason}</p></li>)}</ul><p className={styles.scope}>{flow.boundary}</p>
      {canRead && <details className={styles.refs}><summary>Đính kèm kiến thức đã duyệt{ids.length ? " · " + ids.length : ""}</summary>
        <p>30 ghi nhớ và 30 chủ đề được duyệt gần nhất. <Link href="/admin/knowledge">Mở trung tâm kiến thức</Link></p>
        {incomplete && <p role="alert">Chưa tải đủ nguồn. <button onClick={() => window.location.reload()}>Tải lại</button></p>}
        <label>Tìm trong tài liệu<input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Ví dụ: báo giá, mẫu thử"/></label>
        <div className={styles.list}>{matches.map(ref => <div key={ref.key}><label><input type="checkbox" checked={ids.includes(ref.key)} onChange={e => {
          setIds(e.target.checked ? [...ids,ref.key] : ids.filter(key => key !== ref.key)); resetCopy();
        }}/><span>{ref.title}<small>{ref.kind}{ref.stamp ? " · " + ref.stamp.slice(0,10) : ""}{ref.reviewOn && ref.reviewOn <= asOf ? " · Đến hạn rà soát" : ""}</small></span></label>
        {ref.body && <details><summary>Đọc nội dung</summary><p>{ref.body}</p></details>}</div>)}</div>
        {!matches.length && <p>{query ? "Không có kết quả phù hợp." : incomplete ? "Chưa xác nhận được danh sách." : "Chưa có nội dung đã duyệt."}</p>}
        {canReview && <Link href="/admin#company-memory">Đề xuất hoặc duyệt ghi nhớ</Link>}
      </details>}
      <label className={styles.task}>Việc cần giao<textarea value={task} onChange={e => { setTask(e.target.value); resetCopy(); }} rows={2} placeholder={flow.question}/></label>
      <button type="button" className={styles.copy} onClick={copy}><Copy size={16}/>Sao chép bản giao việc</button>
      {message && <p role="status">{message}</p>}
      {manual && <textarea aria-label="Nội dung bản giao việc" readOnly rows={8} value={brief} onFocus={e => e.target.select()}/>}
    </article></div>
  </main>;
}
