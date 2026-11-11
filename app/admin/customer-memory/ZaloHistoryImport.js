"use client";

import { useRef, useState } from "react";
import { FileUp } from "lucide-react";
import { parseZaloHistoryCsv, ZALO_HISTORY_BATCH_SIZE, ZALO_HISTORY_FILE_LIMIT } from "@/lib/customer-memory-zalo-history";
import styles from "./page.module.css";

const NUMBER = new Intl.NumberFormat("vi-VN");
const uploadErrors = {
  csv_columns:"Các cột chưa khớp với tệp mẫu.",
  csv_empty:"Tệp chưa có tin nhắn.",
  csv_syntax:"Cấu trúc CSV chưa hợp lệ. Kiểm tra dấu ngoặc kép và dấu phẩy.",
  csv_size:"Tệp vượt quá 16 MB. Bạn có thể chia thành nhiều tệp.",
  csv_encoding:"Hãy lưu tệp CSV với mã hóa UTF-8.",
  not_authenticated:"Phiên đăng nhập đã hết hạn. Đăng nhập lại rồi chọn lại tệp.",
  admin_required:"Chỉ quản trị viên được nhập lịch sử.",
  invalid_input:"Máy chủ không chấp nhận lô dữ liệu này.",
};

function downloadTemplate() {
  const time = new Date(Date.now()-60_000).toISOString();
  const template = "\uFEFFconversation_id,conversation_name,sent_at,direction,text,message_id,sender_name\r\n"+
    `local:mau-01,Hội thoại mẫu,${time},inbound,"Đây là dữ liệu minh họa.",,\r\n`;
  const url = URL.createObjectURL(new Blob([template],{type:"text/csv;charset=utf-8"}));
  const link = document.createElement("a");
  link.href = url;
  link.download = "mau-lich-su-zalo.csv";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url),1000);
}

export default function ZaloHistoryImport({supabase,onImported}) {
  const fileInput = useRef(null);
  const [preview,setPreview] = useState(null);
  const [busy,setBusy] = useState(false);
  const [reading,setReading] = useState(false);
  const [error,setError] = useState("");
  const [progress,setProgress] = useState(null);

  async function chooseFile(event) {
    const file = event.target.files?.[0];
    setPreview(null);
    setProgress(null);
    setError("");
    if (!file) return;
    setReading(true);
    try {
      if (file.size > ZALO_HISTORY_FILE_LIMIT) throw new Error("csv_size");
      const bytes = await file.arrayBuffer();
      let text;
      try { text = new TextDecoder("utf-8",{fatal:true}).decode(bytes); }
      catch { throw new Error("csv_encoding"); }
      setPreview(parseZaloHistoryCsv(text));
    } catch (failure) {
      const code = failure.message;
      const row = /^csv_row:(\d+)$/.exec(code);
      setError(row ? `Dòng dữ liệu ${row[1]} chưa hợp lệ. Kiểm tra theo tệp mẫu.` :
        uploadErrors[code] || "Không đọc được tệp CSV.");
    } finally {
      setReading(false);
    }
  }

  async function importFile() {
    if (!preview || busy) return;
    setBusy(true);
    setError("");
    const counts = {processed:0,inserted:0,duplicate:0,excluded:0};
    setProgress(counts);
    try {
      for (const thread of preview.threads) {
        for (let start=0; start<thread.messages.length; start+=ZALO_HISTORY_BATCH_SIZE) {
          const {data:{session}} = await supabase.auth.getSession();
          if (!session?.access_token) throw new Error("not_authenticated");
          const messages = thread.messages.slice(start,start+ZALO_HISTORY_BATCH_SIZE);
          const response = await fetch("/api/staff/customer-memory/zalo-history",{
            method:"POST", cache:"no-store",
            headers:{Authorization:"Bearer "+session.access_token,"Content-Type":"application/json"},
            body:JSON.stringify({id:thread.id,name:thread.name,messages}),
          });
          const result = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(result.error);
          counts.processed += messages.length;
          counts.inserted += result.inserted;
          counts.duplicate += result.duplicate;
          counts.excluded += result.excluded;
          setProgress({...counts});
        }
      }
      setPreview(null);
      if (fileInput.current) fileInput.current.value = "";
    } catch (failure) {
      setError(uploadErrors[failure.message] ||
        "Quá trình nhập bị gián đoạn. Bạn có thể nhập lại cùng tệp, các tin đã lưu sẽ được bỏ qua.");
    } finally {
      setBusy(false);
      if (counts.processed) await onImported();
    }
  }

  return <details className={styles.capture}>
    <summary className={styles.historySummary}><FileUp size={16} aria-hidden="true"/> Nhập lịch sử Zalo cá nhân</summary>
    <p>Chọn tệp CSV theo mẫu. Hệ thống lưu tin nhắn văn bản trong ba tháng gần nhất để xem trong CRM.</p>
    <button type="button" onClick={downloadTemplate}>Tải tệp mẫu</button>
    <div className={styles.formRow}>
      <label>Tệp CSV UTF-8
        <input ref={fileInput} type="file" accept=".csv,text/csv" disabled={busy||reading} onChange={chooseFile}/>
      </label>
      <div>
        <button type="button" className={styles.primary} onClick={importFile} disabled={!preview||busy||reading}>
          {busy ? "Đang nhập…" : "Nhập vào CRM"}
        </button>
      </div>
    </div>
    {reading && <p role="status">Đang kiểm tra tệp trên máy…</p>}
    {preview && <p>{NUMBER.format(preview.threads.length)} hội thoại · {NUMBER.format(preview.messages)} tin nhắn trong tệp</p>}
    {progress && <p role="status">
      Đã kiểm tra {NUMBER.format(progress.processed)} · Đã lưu {NUMBER.format(progress.inserted)} ·
      Đã có {NUMBER.format(progress.duplicate)} · Bỏ qua {NUMBER.format(progress.excluded)}
    </p>}
    {error && <p role="alert" className={styles.error}>{error}</p>}
  </details>;
}
