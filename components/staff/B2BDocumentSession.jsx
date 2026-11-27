"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Check, Download, FilePlus2, Upload } from "lucide-react";
import CompanyDocuments from "./CompanyDocuments";
import styles from "./CompanyDocuments.module.css";
import { createClient } from "@/lib/supabase/client";
import { B2B_DOCUMENT_TEMPLATES, b2bDocumentPricing, prefillB2BDocument } from "@/lib/b2b-document-drafts";

const endpoint = "/api/staff/b2b-workflow";
const types = {
  pdf: "application/pdf", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};
const stateErrors = {
  forbidden: "Tài khoản hiện tại không có quyền thao tác với tài liệu này.",
  document_changed: "Hồ sơ đã thay đổi trên thiết bị khác. Tải lại trang trước khi tiếp tục.",
  invalid_document: "Kiểm tra hồ sơ, ngày hiệu lực hoặc thông tin hóa đơn.",
  invalid_file: "Chọn file đúng định dạng, dung lượng tối đa 10 MB.",
  uploaded_file_mismatch: "Chưa xác minh được file tải lên. Chọn lại file và thử lại.",
  framework_dates_required: "Kiểm tra ngày bắt đầu và ngày hết hiệu lực của hợp đồng nguyên tắc.",
  issued_invoice_required: "Nhập số và ngày phát hành từ hóa đơn đã phát hành.",
  vat_required: "Chọn thuế suất VAT trong hồ sơ đơn trước khi lưu hóa đơn.",
};
const closedOrders = new Set(["cancelled", "canceled", "deleted", "rejected", "void"]);
const formatMoney = value => value === null ? "—" : `${new Intl.NumberFormat("vi-VN").format(value)} đ`;
const formatDate = value => value ? value.slice(0, 10).split("-").reverse().join("/") : "";

async function request(method, body, suffix = "") {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Phiên đăng nhập đã hết hạn. Đăng nhập lại rồi thử lại.");
  const response = await fetch(`${endpoint}${suffix}`, {
    method,
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data) throw new Error(stateErrors[data?.error] || "Chưa lưu hoặc tải được hồ sơ. Vui lòng thử lại.");
  return data;
}

export default function B2BDocumentSession({ context, kind, requestedSeller }) {
  const { customer, order, workflow, sellers, frameworkDocument, documents = [], frameworks = [] } = context;
  const framework = kind === "framework";
  const invoice = kind === "vat_invoice";
  const [records, setRecords] = useState(framework ? frameworks : documents.filter(item => item.kind === kind));
  const [sellerId, setSellerId] = useState(workflow?.seller_id || (framework ? requestedSeller || frameworks[0]?.seller_id || sellers[0]?.id || "" : ""));
  const currentDocuments = records.filter(item => item.seller_id === sellerId);
  const savedDraft = currentDocuments.find(item => item.status === "draft");
  const completed = currentDocuments.filter(item => item.status === "complete");
  const [newDraft, setNewDraft] = useState(false);
  const [initialDraft, setInitialDraft] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [working, setWorking] = useState(false);
  const running = useRef(false);
  const fileInput = useRef(null);
  const pending = useRef(null);
  const seller = sellers.find(entity => entity.id === sellerId);
  const isClosed = closedOrders.has(order?.status) || closedOrders.has(order?.stage);
  const offerEditor = Boolean(seller && (framework ? customer?.is_b2b : workflow && !isClosed));
  const evidenceAllowed = offerEditor && Boolean(customer?.is_b2b);
  const editing = offerEditor && (newDraft || Boolean(savedDraft) || !completed.length);
  const prefill = prefillB2BDocument(kind, { customer, order, workflow, seller, frameworkDocument, frameworks, documents });
  const currentFields = {
    ...prefill, ...(initialDraft?.[sellerId] || savedDraft?.draft),
    b2b_vat_percent: workflow?.vat_percent ?? null,
  };
  const returnHref = order ? `/admin/orders?order=${encodeURIComponent(order.id)}`
    : `/admin/pipeline?opportunity=${encodeURIComponent(customer.id)}`;
  const scope = { kind, sellerId, ...(framework ? { customerId: customer.id } : { orderId: order.id }) };
  const pricing = invoice || kind === "sales_contract" ? b2bDocumentPricing(order) : null;

  function acceptDocument(document) {
    setRecords(previous => [document, ...previous.filter(item => item.id !== document.id)]);
  }

  async function save(draft) {
    if (running.current) throw new Error("Đang xử lý tài liệu. Vui lòng chờ.");
    running.current = true;
    setWorking(true);
    try {
      const { document } = await request("PATCH", {
        ...scope, action: "save_draft", draft, draftId: savedDraft?.id, updatedAt: savedDraft?.updated_at,
      });
      acceptDocument(document);
    } finally {
      running.current = false;
      setWorking(false);
    }
  }

  async function upload(event) {
    event.preventDefault();
    if (!evidenceAllowed || running.current) return;
    const fields = new FormData(event.currentTarget);
    const file = fileInput.current?.files?.[0];
    const extension = file?.name?.split(".").pop().toLowerCase();
    const contentType = Object.hasOwn(types, extension) ? types[extension] : undefined;
    if (!contentType || (invoice && extension === "docx") || !file.size || file.size > 10 * 1024 * 1024) {
      setError(stateErrors.invalid_file);
      return;
    }
    const validFrom = fields.get("validFrom"), validUntil = fields.get("validUntil");
    if (framework && (!validFrom || (validUntil && validUntil < validFrom))) {
      setError("Ngày hết hiệu lực phải từ ngày bắt đầu hiệu lực.");
      return;
    }
    if (invoice && (!fields.get("invoiceNumber")?.trim() || !fields.get("invoiceDate"))) {
      setError("Cần số và ngày phát hành trên hóa đơn đã phát hành.");
      return;
    }
    running.current = true;
    setWorking(true);
    setError("");
    setNotice("");
    const input = { ...scope, fileName: file.name, contentType, size: file.size };
    try {
      if (!pending.current || pending.current.file !== file || pending.current.sellerId !== sellerId) {
        const prepared = await request("POST", { ...input, action: "prepare" });
        const { error: uploadError } = await createClient().storage.from(prepared.bucket)
          .uploadToSignedUrl(prepared.path, prepared.token, file.slice(0, file.size, contentType), { contentType });
        if (uploadError) throw new Error("File chưa tải lên được. Kiểm tra kết nối và thử lại.");
        pending.current = { file, sellerId, path: prepared.path, documentId: prepared.documentId };
      }
      const { document } = await request("POST", {
        ...input, action: "finalize", path: pending.current.path, documentId: pending.current.documentId,
        validFrom, validUntil, invoiceDate: fields.get("invoiceDate"), invoiceNumber: fields.get("invoiceNumber"),
        documentRef: fields.get("documentRef") || savedDraft?.draft?.document_ref || null,
      });
      acceptDocument(document);
      pending.current = null;
      setNewDraft(false);
      setNotice(invoice ? "Đã lưu hóa đơn phát hành." : "Đã lưu bản đã ký và hoàn tất bước này.");
      if (fileInput.current) fileInput.current.value = "";
    } catch (failure) {
      setError(failure.message);
    } finally {
      running.current = false;
      setWorking(false);
    }
  }

  async function download(id) {
    if (running.current) return;
    running.current = true;
    setWorking(true);
    setError("");
    try {
      const { url } = await request("GET", null, `?document=${encodeURIComponent(id)}`);
      const link = document.createElement("a");
      link.href = url;
      link.rel = "noreferrer";
      document.body.append(link);
      link.click();
      link.remove();
    } catch (failure) {
      setError(failure.message);
    } finally {
      running.current = false;
      setWorking(false);
    }
  }

  const panel = (
    <div className={styles.workflowPanel}>
      <div className={styles.workflowTop}>
        {framework && !workflow?.seller_id ? <label htmlFor="b2b-doc-seller">Pháp nhân bán
          <select id="b2b-doc-seller" value={sellerId} disabled={working} onChange={event => {
            if (editing && !window.confirm("Chuyển pháp nhân bán? Hãy lưu bản nháp trước nếu cần giữ thay đổi.")) return;
            setSellerId(event.target.value);
            setNewDraft(false);
            setNotice("");
            setError("");
          }}>
            {sellers.map(entity => <option key={entity.id} value={entity.id}>{entity.label}</option>)}
          </select>
        </label> : <div><small>Pháp nhân bán</small><strong>{seller?.label || "Chưa chọn"}</strong></div>}
        <Link href="/admin/documents?b2b=entities">Thông tin pháp nhân bán</Link>
        {seller && kind!=="vat_invoice" && <Link href={`/admin/documents?sign=1&seller=${seller.id}${order?`&order=${encodeURIComponent(order.id)}`:""}`}>Ký &amp; đóng dấu</Link>}
      </div>
      {!offerEditor && <p className={styles.pricingHint}>{!seller ? "Mở hồ sơ đơn để chọn pháp nhân bán." : "Hồ sơ này chỉ mở để tra cứu tài liệu đã lưu."}</p>}
      {pricing?.needsConfirmation && editing && <p className={styles.pricingHint}>
        Cộng theo đơn giá × số lượng {formatMoney(pricing.subtotal)}. Tổng ghi trong đơn {formatMoney(pricing.recorded)}. Xác nhận tiền hàng chưa VAT ở mục Giá trị đơn hàng.
      </p>}
      {pricing && editing && <p className={styles.pricingHint}>{workflow?.vat_percent == null
        ? "Chọn thuế suất VAT trong hồ sơ đơn trước khi in bản nháp." : `Thuế suất của đơn ${Number(workflow.vat_percent).toLocaleString("vi-VN")}%.`} <Link href={returnHref}>Mở hồ sơ đơn</Link></p>}
      {notice && <p className={styles.notice} role="status">{notice}</p>}
      {error && <p className={styles.error} role="alert">{error}</p>}
      {records.some(item => item.status === "complete") && <details className={styles.archive} open={!editing}>
        <summary><Check size={16} aria-hidden="true" />{invoice ? "Hóa đơn đã phát hành" : "Bản đã ký"}<span>{records.filter(item => item.status === "complete").length}</span></summary>
        <ul>{records.filter(item => item.status === "complete").map(item => <li key={item.id}>
          <div><strong>{item.invoice_number || item.document_ref || item.file_name}</strong>
            <small>{sellers.find(entity => entity.id === item.seller_id)?.label}
              {" · "}{invoice ? `Phát hành ${formatDate(item.invoice_date)}` : framework ? `Hiệu lực ${formatDate(item.valid_from)}${item.valid_until ? ` – ${formatDate(item.valid_until)}` : ""}` : `Lưu ${formatDate(item.completed_at)}`}
            </small></div>
          <button type="button" disabled={working} onClick={() => download(item.id)}><Download size={16} aria-hidden="true" />Tải file</button>
          {offerEditor && !editing && item.seller_id === sellerId && Object.keys(item.draft || {}).length > 0 &&
            <button type="button" disabled={working} onClick={() => {
              setInitialDraft(previous => ({ ...previous, [sellerId]: item.draft }));
              setNewDraft(true);
            }}>Soạn từ bản nháp này</button>}
        </li>)}</ul>
      </details>}
      {editing && !evidenceAllowed && <p className={styles.pricingHint}>Để hoàn tất tài liệu, hãy nối đơn với một hồ sơ Khách doanh nghiệp. <Link href={returnHref}>Mở hồ sơ đơn</Link></p>}
      {offerEditor && (editing ? evidenceAllowed && <details className={styles.archive}>
        <summary><Upload size={16} aria-hidden="true" />{invoice ? "Lưu hóa đơn đã phát hành" : "Lưu bản đã ký"}</summary>
        <form className={styles.uploadForm} onSubmit={upload} key={sellerId}>
          {framework && <><label>Ngày bắt đầu hiệu lực<input name="validFrom" type="date" required defaultValue={currentFields.effective_date || ""} /></label>
            <label>Ngày hết hiệu lực (nếu có)<input name="validUntil" type="date" defaultValue={currentFields.end_date || ""} /></label></>}
          {invoice ? <><label>Số hóa đơn<input name="invoiceNumber" required maxLength={100} /></label>
            <label>Ngày phát hành<input name="invoiceDate" type="date" required /></label></> :
            <label>Mã văn bản đã ký<input name="documentRef" maxLength={140} defaultValue={savedDraft?.draft?.document_ref || ""} /></label>}
          <label>File {invoice ? "hóa đơn đã phát hành" : "đã ký"}<input ref={fileInput} type="file" name="file" accept={invoice ? ".pdf,.jpg,.jpeg,.png" : ".pdf,.jpg,.jpeg,.png,.docx"} required /></label>
          <label className={styles.uploadConfirm}><input type="checkbox" required />{invoice ? "Tôi xác nhận đây là hóa đơn đã phát hành." : "Tôi xác nhận đây là bản đã ký."}</label>
          <button type="submit" disabled={working}>{working ? "Đang xử lý…" : "Lưu và hoàn tất"}</button>
        </form>
      </details> : <button type="button" className={styles.newDraft} disabled={working} onClick={() => {
        setInitialDraft(null);
        setNewDraft(true);
      }}><FilePlus2 size={16} aria-hidden="true" />{invoice ? "Thêm hóa đơn / bản đối chiếu" : "Soạn văn bản mới"}</button>)}
    </div>
  );

  return <CompanyDocuments key={`${kind}:${sellerId}:${editing ? "draft" : "archive"}`}
    initialTemplate={B2B_DOCUMENT_TEMPLATES[kind]} orderFields={currentFields}
    b2b={{
      description: [customer?.business_name || order?.customer_name, order?.id].filter(Boolean).join(" · "),
      returnHref, editing, panel, save, busy: working, sellerLabel: seller?.label,
    }} />;
}

const sellerFields = [
  ["legalName", "Tên pháp nhân"], ["taxId", "Mã số thuế"], ["address", "Địa chỉ đăng ký"],
  ["representative", "Người đại diện"], ["title", "Chức danh / căn cứ ủy quyền"],
  ["contact", "Điện thoại hoặc email"], ["bankAccount", "Số tài khoản"], ["bankHolder", "Chủ tài khoản"], ["bankName", "Ngân hàng / chi nhánh"],
];

function SellerProfile({ seller }) {
  const [status, setStatus] = useState(null);
  const [working, setWorking] = useState(false);
  async function save(event) {
    event.preventDefault();
    if (working) return;
    const fields = new FormData(event.currentTarget);
    const details = Object.fromEntries(sellerFields.map(([key]) => [key, String(fields.get(key) || "")]));
    setWorking(true);
    setStatus(null);
    try {
      await request("PATCH", { action: "save_seller", sellerId: seller.id, details });
      setStatus({ ok: true, message: "Đã lưu thông tin pháp nhân." });
    } catch (failure) {
      setStatus({ ok: false, message: failure.message });
    } finally {
      setWorking(false);
    }
  }

  return <details className={styles.group} id={seller.id}>
    <summary>{seller.label}</summary>
    <form className={styles.fields} onSubmit={save}>
      {sellerFields.map(([key, label]) => <label key={key}><span>{label}</span>
        <input name={key} defaultValue={seller.details?.[key] || ""} maxLength={key === "address" ? 500 : 240} />
      </label>)}
      <div className={styles.actions}><button type="submit" disabled={working}>{working ? "Đang lưu…" : "Lưu pháp nhân"}</button></div>
      {status && <p className={status.ok ? styles.notice : styles.error} role={status.ok ? "status" : "alert"}>{status.message}</p>}
    </form>
  </details>;
}

export function B2BSellingEntities({ sellers }) {
  return <main className={styles.page}>
    <header className={styles.header}><div><h1>Pháp nhân bán B2B</h1><p>Thông tin được điền vào các bản nháp mới theo pháp nhân bán của đơn.</p></div><Link href="/admin/pipeline">Về khách hàng</Link></header>
    {sellers.map(seller => <SellerProfile key={seller.id} seller={seller} />)}
  </main>;
}
