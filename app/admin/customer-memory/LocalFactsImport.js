"use client";

import { useRef, useState } from "react";
import styles from "./page.module.css";

export default function LocalFactsImport({supabase,onImported}) {
  const [batches,setBatches]=useState(null);
  const [result,setResult]=useState("");
  const [busy,setBusy]=useState(false);
  const input=useRef(null);

  async function choose(event) {
    setBatches(null);setResult("");
    const file=event.target.files?.[0];
    if(!file) return;
    try {
      if(file.size>4*1024*1024) throw new Error();
      const text=await file.text();
      const rows=text.split("\n").filter(line=>line.trim()).map(line=>JSON.parse(line));
      if(!rows.length || rows.some(row=>typeof row.externalId!=="string" || !Array.isArray(row.facts) ||
        !row.facts.length || row.facts.length>20)) throw new Error();
      setBatches(rows);
    }catch{setResult("Tệp thông tin đã lọc không hợp lệ.");}
  }

  async function save() {
    if(!batches || busy) return;
    setBusy(true);setResult("");
    const counts={saved:0,duplicate:0,unmatched:0,processed:0};
    try {
      for(const batch of batches){
        const {data:{session}}=await supabase.auth.getSession();
        if(!session?.access_token) throw new Error();
        const response=await fetch("/api/staff/customer-memory/local-facts",{
          method:"POST",cache:"no-store",headers:{Authorization:"Bearer "+session.access_token,"Content-Type":"application/json"},
          body:JSON.stringify(batch)
        });
        if(!response.ok) throw new Error();
        const data=await response.json();
        counts.saved+=data.saved;counts.duplicate+=data.duplicate;counts.unmatched+=data.unmatched;counts.processed++;
        setResult(`Đã xử lý ${counts.processed}/${batches.length} phần · Đã lưu ${counts.saved} · Đã có ${counts.duplicate} · Không khớp ${counts.unmatched}`);
      }
      setBatches(null);
      if(input.current) input.current.value="";
    }catch{setResult(previous=>previous+" · Bị gián đoạn, có thể chọn và lưu lại cùng tệp.");}
    finally{setBusy(false);if(counts.processed) await onImported();}
  }

  return <details className={styles.capture}>
    <summary className={styles.historySummary}>Lưu thông tin đã lọc</summary>
    <p>Chọn tệp thông tin đã lọc trên máy để lưu các trích dẫn khớp với hội thoại hiện có.</p>
    <div className={styles.formRow}>
      <label>Tệp thông tin đã lọc
        <input ref={input} type="file" accept=".jsonl,application/x-ndjson" disabled={busy} onChange={choose}/>
      </label>
      <button type="button" className={styles.primary} onClick={save} disabled={!batches||busy}>
        {busy?"Đang lưu…":"Lưu thông tin"}
      </button>
    </div>
    {batches && !busy && <p>{batches.length} phần thông tin sẵn sàng lưu.</p>}
    {result && <p role="status">{result}</p>}
  </details>;
}
