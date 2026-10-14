"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Check, ChevronDown, Download, FileText, FolderOpen, Printer } from "lucide-react";
import {
  DOCUMENT_FIELDS, DOCUMENT_TEMPLATES, createDocumentDraft,
  normalizeDocumentDraft, prefillPartner, buildDocument, validateDocument,
} from "@/lib/company-documents";
import styles from "./CompanyDocuments.module.css";

const DRAFT_FORMAT = "hoang-long-company-document";
const MAX_DRAFT_BYTES = 512 * 1024;
const fieldByName = new Map(DOCUMENT_FIELDS.map(field => [field.name, field]));
const sectionLabels = {
  document: "Thông tin văn bản", general: "Thông tin văn bản", company: "Bên Hoàng Long",
  partner: "Bên đối tác", agreement: "Điều kiện hợp tác", commission: "Hoa hồng & đối soát",
  nda: "Điều khoản bảo mật", minutes: "Số liệu đối soát", terms: "Điều khoản bổ sung",
};
const fileName = (template, draft) => `hoang-long-${template}-${String(draft.document_ref || "ban-nhap").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9-]/gi, "-").slice(0, 70)}`;
function downloadFile(content, name, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url; link.download = name; document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function CompanyDocuments({ partners = [], initialPartner = "", partnersUnavailable = false, partnersTruncated = false }) {
  const initial = partners.find(partner => partner.id === initialPartner);
  const [templateId, setTemplateId] = useState("partner_agreement");
  const [draft, setDraft] = useState(() => createDocumentDraft("partner_agreement", initial ? prefillPartner(initial) : {}));
  const [selectedPartner, setSelectedPartner] = useState(initial?.id || "");
  const [reviewed, setReviewed] = useState(false);
  const [view, setView] = useState("edit");
  const [showErrors, setShowErrors] = useState(false);
  const [notice, setNotice] = useState("");
  const [fileError, setFileError] = useState("");
  const [dirty, setDirty] = useState(false);
  const fileInput = useRef(null);
  const importVersion = useRef(0);
  const alertRef = useRef(null);
  const template = DOCUMENT_TEMPLATES.find(item => item.id === templateId) || DOCUMENT_TEMPLATES[0];
  const generated = useMemo(() => buildDocument(templateId, draft), [templateId, draft]);
  const validation = useMemo(() => validateDocument(templateId, draft, { forExport: true }), [templateId, draft]);
  const groups = useMemo(() => {
    const result = new Map();
    for (const name of template.fields) {
      const field = fieldByName.get(name);
      if (!field) continue;
      const key = field.section || "document";
      if (!result.has(key)) result.set(key, []);
      result.get(key).push(field);
    }
    return [...result.entries()];
  }, [template]);

  useEffect(() => {
    const beforeUnload = event => { if (dirty) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", beforeUnload);
    return () => { window.removeEventListener("beforeunload", beforeUnload); importVersion.current += 1; };
  }, [dirty]);

  function update(name, value) {
    importVersion.current += 1;
    setDraft(previous => ({ ...previous, [name]: value }));
    setReviewed(false); setDirty(true); setNotice(""); setFileError("");
  }
  function changeTemplate(id) {
    importVersion.current += 1;
    setTemplateId(id); setDraft(previous => ({ ...previous, template_id: id }));
    setReviewed(false); setShowErrors(false); setDirty(true); setNotice("");
  }
  function selectPartner(id) {
    // Keep both parties' legal identities blank: a CRM contact is not necessarily
    // the legal entity or authorised signatory. Never carry these across partners.
    const partner = partners.find(item => item.id === id);
    const patch = prefillPartner(partner || {});
    importVersion.current += 1;
    setDraft(previous => ({ ...previous, ...Object.fromEntries(DOCUMENT_FIELDS.filter(field => field.name.startsWith("partner_")).map(field => [field.name, ""])),
      first_order_rate_percent: "", repeat_rate_percent: "", repeat_order_limit: "", ...patch }));
    setSelectedPartner(id); setReviewed(false); setDirty(true); setNotice(partner ? "Đã điền thông tin liên hệ và tỷ lệ hiện có. Kiểm tra tên pháp lý, địa chỉ và người ký riêng." : "Đã bỏ thông tin đối tác trước. Bạn có thể điền thủ công.");
  }
  function exportDocument(kind) {
    setShowErrors(true); setFileError("");
    if (!validation.valid || !reviewed) {
      setNotice("");
      requestAnimationFrame(() => alertRef.current?.focus());
      return;
    }
    if (kind === "print") { window.print(); return; }
    downloadFile(`\uFEFF${generated.plainText}`, `${fileName(templateId, draft)}.txt`, "text/plain;charset=utf-8");
    setNotice("Đã tải nội dung để chỉnh tiếp bằng trình soạn thảo. Đây là bản chưa ký.");
  }
  function saveDraft() {
    const result = normalizeDocumentDraft({ ...draft, template_id: templateId });
    if (Object.keys(result.errors || {}).length) { setFileError("Có dữ liệu sai định dạng. Kiểm tra các ô đã nhập trước khi tải bản nháp."); setShowErrors(true); return; }
    const content = JSON.stringify({ format: DRAFT_FORMAT, version: 1, template_id: templateId, fields: result.data }, null, 2);
    if (new Blob([content]).size > MAX_DRAFT_BYTES) { setFileError("Bản nháp vượt 512 KB. Rút gọn nội dung trước khi tải xuống."); return; }
    downloadFile(content, `${fileName(templateId, draft)}.json`, "application/json");
    setDirty(false); setNotice("Đã tải bản nháp. Giữ file ở nơi riêng tư và dùng “Mở bản nháp” để sửa tiếp; chưa lưu trên website.");
  }
  async function openDraft(event) {
    const file = event.target.files?.[0]; event.target.value = "";
    if (!file) return;
    const version = ++importVersion.current;
    try {
      if (file.size > MAX_DRAFT_BYTES) throw new Error("size");
      const input = JSON.parse(await file.text());
      if (version !== importVersion.current) return;
      if (input?.format !== DRAFT_FORMAT || input.version !== 1 || !DOCUMENT_TEMPLATES.some(item => item.id === input.template_id)
        || !input.fields || typeof input.fields !== "object" || Array.isArray(input.fields)) throw new Error("format");
      const result = normalizeDocumentDraft({ ...input.fields, template_id: input.template_id });
      if (!result.data || Object.keys(result.errors || {}).length) throw new Error("fields");
      setDraft(result.data); setTemplateId(input.template_id); setSelectedPartner(""); setReviewed(false);
      setShowErrors(false); setFileError(""); setDirty(false); setNotice("Đã mở bản nháp trên thiết bị này. Các số liệu không được ghi ngược vào Partner Network.");
    } catch { if (version === importVersion.current) setFileError("Không mở được file. Chọn bản nháp .json đã tải từ trang này, tối đa 512 KB, có dữ liệu đúng định dạng."); }
  }

  return <main className={styles.page} data-company-documents-page data-no-translate>
    <header className={styles.header}><div><p className={styles.eyebrow}>Hoàng Long · Bàn quản trị</p><h1>Tài liệu công ty</h1><p>Chọn mẫu. Điền thông tin. Xuất bản để hai bên cùng kiểm tra.</p></div><Link href="/admin/partner-network">Mạng lưới đối tác <ArrowUpRight size={16} aria-hidden="true" /></Link></header>
    <nav className={styles.templates} aria-label="Chọn mẫu tài liệu">{DOCUMENT_TEMPLATES.map((item, index) => <button key={item.id} type="button" aria-pressed={item.id === templateId} onClick={() => changeTemplate(item.id)}><span>0{index + 1}</span><div><strong>{item.title}</strong><small>{item.description}</small></div>{item.id === templateId && <Check size={18} aria-hidden="true" />}</button>)}</nav>
    <div className={styles.toolbar}><div><span className={styles.draftChip}>Bản nháp · Chưa ký</span><small>{dirty ? "Có thay đổi chưa tải xuống" : "Soạn riêng trong phiên làm việc này"}</small></div><div className={styles.actions}>
      <button type="button" onClick={saveDraft}><Download size={16} aria-hidden="true" />Tải bản nháp</button>
      <button type="button" onClick={() => fileInput.current?.click()}><FolderOpen size={16} aria-hidden="true" />Mở bản nháp</button>
      <button type="button" className={styles.primary} onClick={() => exportDocument("print")}><Printer size={16} aria-hidden="true" />In / lưu PDF</button>
      <input ref={fileInput} type="file" accept=".json,application/json" hidden onChange={openDraft} aria-label="Chọn file bản nháp" />
    </div></div>
    {notice && <p className={styles.notice} role="status">{notice}</p>}
    {fileError && <p className={styles.error} role="alert">{fileError}</p>}
    {showErrors && (!validation.valid || !reviewed) && <div ref={alertRef} tabIndex={-1} className={styles.error} role="alert"><strong>Kiểm tra trước khi xuất</strong><ul>{Object.entries(validation.errors || {}).map(([name, message]) => <li key={name}>{fieldByName.get(name)?.label || "Thông tin"}: {message}</li>)}{(validation.missing || []).filter(name => !validation.errors?.[name]).map(name => <li key={name}>{fieldByName.get(name)?.label || name}: cần bổ sung.</li>)}{!reviewed && <li>Đánh dấu đã kiểm tra thông tin và điều khoản ở cuối phần điền thông tin.</li>}</ul></div>}
    <nav className={styles.views} aria-label="Chế độ soạn tài liệu"><button type="button" aria-pressed={view === "edit"} onClick={() => setView("edit")}>Điền thông tin</button><button type="button" aria-pressed={view === "preview"} onClick={() => setView("preview")}>Xem trước bản A4</button></nav>
    <div className={styles.workspace} data-view={view}>
      <section className={styles.editor} aria-label="Điền thông tin tài liệu">
        <div className={styles.picker}><label htmlFor="document-partner">Điền từ đối tác đã duyệt</label><select id="document-partner" value={selectedPartner} onChange={event => selectPartner(event.target.value)}><option value="">Điền thủ công</option>{partners.map(partner => <option key={partner.id} value={partner.id}>{partner.business_name} · {partner.code}</option>)}</select><p>Chỉ lấy thông tin liên hệ và tỷ lệ đã thỏa thuận. Thông tin người ký cần xác nhận riêng.</p>{partnersUnavailable && <p className={styles.error}>Chưa tải được danh sách đối tác. Bạn vẫn có thể điền thủ công hoặc tải lại trang.</p>}{partnersTruncated && <p>Đang hiển thị 200 đối tác đầu tiên. Có thể điền thủ công nếu chưa thấy người cần chọn.</p>}</div>
        {groups.map(([section, fields], index) => <details key={`${templateId}-${section}`} className={styles.group} open={index === 0 || (showErrors && fields.some(field => validation.errors?.[field.name] || validation.missing?.includes(field.name)))}><summary><span><small>0{index + 1}</small>{sectionLabels[section] || section}</span><ChevronDown size={18} aria-hidden="true" /></summary><div className={styles.fields}>{fields.map(field => {
          const required = template.required?.includes(field.name);
          const error = showErrors && (validation.errors?.[field.name] || (validation.missing?.includes(field.name) ? "Vui lòng bổ sung trước khi xuất." : ""));
          const common = { id: `doc-${field.name}`, value: draft[field.name] ?? "", onChange: event => update(field.name, event.target.value), "aria-invalid": error ? true : undefined, "aria-describedby": error ? `err-${field.name}` : undefined };
          return <label key={field.name} className={field.type === "textarea" ? styles.wide : ""} htmlFor={common.id}><span>{field.label}{required && <b aria-label="cần điền"> *</b>}</span>{field.options ? <select {...common}><option value="">Chọn…</option>{field.options.map(option => <option key={typeof option === "string" ? option : option.value || option.id} value={typeof option === "string" ? option : option.value || option.id}>{typeof option === "string" ? option : option.label}</option>)}</select> : field.type === "textarea" ? <textarea {...common} rows={3} maxLength={field.maxLength || 3000} /> : <input {...common} type={field.type || "text"} min={field.min} max={field.max} step={field.type === "number" ? field.step || "0.01" : undefined} maxLength={field.maxLength || 240} autoComplete="off" />}{error && <small id={`err-${field.name}`} className={styles.fieldError}>{error}</small>}</label>;
        })}</div></details>)}
        <div className={styles.review}><label><input type="checkbox" checked={reviewed} onChange={event => setReviewed(event.target.checked)} /><span>Tôi đã đối chiếu thông tin hai bên, người ký, tỷ lệ và điều khoản trước khi xuất bản để xem xét.</span></label><p>Mẫu có thể chỉnh sửa. Bản xuất không phải bản đã ký, không tự duyệt đối tác, thay đổi hoa hồng hoặc xác nhận thanh toán.</p><button type="button" onClick={() => exportDocument("text")}><FileText size={16} aria-hidden="true" />Tải nội dung .txt để sửa tiếp</button></div>
      </section>
      <section className={styles.previewPanel} aria-label="Xem trước bản in"><div className={styles.previewHeading}><span>Bản xem trước · A4</span><small>Chọn “Lưu dưới dạng PDF” trong hộp thoại in.</small></div>
        <article className={styles.document} data-company-document><header className={styles.documentHeader}><div><span className={styles.seal} aria-hidden="true">HL</span><div><strong>HOÀNG LONG</strong><small>Tài liệu hợp tác kinh doanh</small></div></div><span>BẢN NHÁP · CHƯA KÝ</span></header><h2>{generated.title}</h2>
          {generated.sections.map((section, index) => <section key={index} className={styles.documentSection}><h3>{section.title}</h3>{section.paragraphs.map((paragraph, number) => <p key={number}>{paragraph}</p>)}</section>)}
          <div className={styles.signatures}>{generated.signatureBlocks.map((signature, index) => <section key={index}><strong>{signature.title}</strong><p>Ký, ghi rõ họ tên; đóng dấu nếu áp dụng</p><div aria-hidden="true" /><b>{signature.name || "………………………………"}</b>{signature.titleRole && <small>{signature.titleRole}</small>}</section>)}</div>
          <footer className={styles.documentFooter}>Hoàng Long · {draft.document_ref || "Chưa có số văn bản"} · Bản soạn thảo chưa ký. Kiểm tra và thống nhất nội dung trước khi sử dụng.</footer>
        </article>
      </section>
    </div>
    <footer className={styles.help}>Chưa có kho lưu hợp đồng đã ký trong bản này. Tải bản nháp để giữ nội dung; lưu PDF sau khi kiểm tra. Thông tin đang nhập không được đưa vào đường dẫn chia sẻ hay tự gửi cho đối tác.</footer>
  </main>;
}
