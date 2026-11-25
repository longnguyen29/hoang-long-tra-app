"use client";

import { useCallback, useEffect, useId, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Check, ChevronRight, ClipboardCheck, FileText, Plus } from "lucide-react";
import { B2B_STEPS, workflowProgress } from "@/lib/b2b-customer-workflow";
import styles from "./B2BCustomerWorkflow.module.css";

const endpoint = "/api/staff/b2b-workflow";
const legalFields = [
  ["legalName", "Tên pháp nhân"],
  ["taxId", "Mã số thuế"],
  ["address", "Địa chỉ đăng ký"],
  ["representative", "Người ký"],
  ["title", "Chức vụ người ký"],
  ["contact", "Liên hệ trên chứng từ"],
];
const localDate = value => new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(value));
const businessDate = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date());

export async function requestB2BWorkflow(query = "", { body, signal } = {}) {
  const response = await fetch(`${endpoint}${query}`, {
    cache: "no-store",
    signal,
    ...(body && { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "workflow_unavailable");
  return result;
}

function useWorkflow(query) {
  const [request, setRequest] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(false);
  const reload = useCallback(() => setRequest(value => value + 1), []);
  useEffect(() => {
    if (query === null) return;
    const controller = new AbortController();
    setError(false);
    requestB2BWorkflow(query, { signal: controller.signal })
      .then(value => { if (!controller.signal.aborted) setResult(value); })
      .catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [query, request]);
  useEffect(() => {
    if (query === null) return;
    const onReturn = event => { if (event.type !== "pageshow" || event.persisted) reload(); };
    window.addEventListener("focus", onReturn);
    window.addEventListener("pageshow", onReturn);
    return () => {
      window.removeEventListener("focus", onReturn);
      window.removeEventListener("pageshow", onReturn);
    };
  }, [query, reload]);
  return { result, error, reload };
}

const documentUrl = ({ step, customerId, orderId, sellerId }) => {
  const search = new URLSearchParams({ b2b: step });
  if (orderId) search.set("order", orderId);
  else if (customerId) search.set("customer", customerId);
  if (sellerId) search.set("seller", sellerId);
  return `/admin/documents?${search}`;
};
const orderUrl = (key, value) => `/admin/orders?${new URLSearchParams({ [key]: value })}`;
const inactiveStatuses = new Set(["cancelled", "canceled", "deleted", "rejected"]);
const inactiveOrder = order => inactiveStatuses.has(order?.status) || inactiveStatuses.has(order?.stage);
const stateMessage = error => ({
  not_authorised: "Tài khoản chưa có quyền cập nhật hồ sơ này.",
  forbidden: "Tài khoản chưa có quyền cập nhật hồ sơ này.",
  seller_locked: "Hồ sơ đã có chứng từ hoàn tất. Pháp nhân bán không thể đổi.",
  customer_locked: "Hồ sơ đã có chứng từ hoàn tất. Không thể đổi khách doanh nghiệp.",
  vat_locked: "Thuế suất của hóa đơn đã phát hành không thể đổi.",
  order_identity_locked: "Hồ sơ đã gắn chứng từ hoàn tất. Không thể đổi khách hoặc pháp nhân bán.",
  issued_invoice_locked: "Thuế suất của hóa đơn đã phát hành không thể đổi.",
  workflow_locked: "Hồ sơ đã có chứng từ hoàn tất. Mở chứng từ để xem dữ liệu đã lưu.",
  invalid_customer: "Không tìm thấy hồ sơ doanh nghiệp đã chọn.",
  customer_unavailable: "Hồ sơ khách chưa được phân loại là doanh nghiệp.",
  customer_not_classified: "Hồ sơ khách chưa được phân loại là doanh nghiệp.",
  ineligible_order: "Đơn này chưa thuộc luồng hồ sơ B2B.",
  invalid_vat: "Nhập thuế suất từ 0 đến 100%.",
})[error.message] || "Chưa lưu được. Vui lòng thử lại.";

function Status({ error, reload }) {
  return error
    ? <p className={styles.message} role="status">Chưa tải được hồ sơ B2B. <button type="button" className={styles.linkButton} onClick={reload}>Thử lại</button></p>
    : <p className={styles.message} role="status">Đang tải hồ sơ B2B…</p>;
}

function BusinessChecklist({ data, customerId, customerClassified, noOrderSeller }) {
  const { order, workflow, documents = [], frameworks = [] } = data;
  const sellerId = order ? workflow?.seller_id : noOrderSeller;
  const frameworkCandidates = sellerId
    ? frameworks.filter(file => file.seller_id === sellerId || file.selling_entity_id === sellerId)
    : [];
  const progress = (order ? data.progress : null) || workflowProgress({
    frameworks: frameworkCandidates.map(file => ({ ...file, file_id: file.file_id || file.file_path })),
    documents: documents.map(file => ({ ...file, file_id: file.file_id || file.file_path })),
    date: businessDate(),
  });
  return <>
    <div className={styles.progress}>
      <span>{progress.done ? "Hồ sơ hoàn tất · 4/4" : `Đã hoàn tất ${progress.completed}/4 chứng từ`}</span>
      <progress aria-label="Tiến độ hồ sơ B2B" value={progress.completed} max={4}>{progress.completed}/4</progress>
    </div>
    <ol className={styles.steps}>
      {B2B_STEPS.map(step => {
        const complete = progress.steps.some(item => item.key === step.key && item.complete);
        const next = progress.next?.key === step.key;
        const blocked = !sellerId || (inactiveOrder(order) && !complete)
          || (step.key === "framework" ? !customerId || (!customerClassified && !complete) : !order);
        const document = (step.key === "framework" ? frameworkCandidates : documents).find(item => step.key === "framework" || item.kind === step.key);
        const label = complete ? "Hoàn tất" : next ? "Bước tiếp theo" : document ? "Đang soạn" : step.key !== "framework" && !order ? "Khi có đơn" : "Chưa làm";
        const contents = <>
          <span className={styles.stepIcon} aria-hidden="true">{complete ? <Check size={15}/> : <FileText size={15}/>}</span>
          <span className={styles.stepName}>{step.label}</span>
          <small>{label}</small>
          {!blocked && <ChevronRight className={styles.chevron} size={14} aria-hidden="true"/>}
        </>;
        return <li key={step.key} data-next={next} data-complete={complete}>
          {blocked ? <div className={styles.step}>{contents}</div>
            : <Link className={styles.step} aria-current={next ? "step" : undefined} href={documentUrl({ step: step.key, customerId, orderId: order?.id, sellerId })}>{contents}</Link>}
        </li>;
      })}
    </ol>
  </>;
}

function CustomerLegalForm({ customer, save, saving }) {
  const [fields, setFields] = useState(customer.b2b_legal || {});
  const [saved, setSaved] = useState(false);
  return <details className={styles.disclosure}>
    <summary>Thông tin xuất chứng từ</summary>
    <form className={styles.form} onSubmit={async event => {
      event.preventDefault();
      setSaved(await save({ customerId: customer.id, legal: fields }));
    }}>
      <div className={styles.fields}>
        {legalFields.map(([key, label]) => <label key={key}>{label}
          <input maxLength={key === "address" ? 500 : 180} autoComplete="off" value={fields[key] || ""}
            placeholder={key === "legalName" ? customer.business_name : undefined}
            onChange={event => { setSaved(false); setFields({ ...fields, [key]: event.target.value }); }}/>
        </label>)}
      </div>
      <div className={styles.actions}>
        <button type="submit" disabled={saving}>Lưu thông tin</button>
        {saved && <small role="status">Đã lưu</small>}
      </div>
    </form>
  </details>;
}

function OrderSettings({ data, save, saving }) {
  const { order, customers = [], customer, sellers = [], workflow } = data;
  const [seller, setSeller] = useState(workflow.seller_id || "");
  const [vat, setVat] = useState(workflow.vat_percent ?? "");
  const [buyer, setBuyer] = useState(customer?.id || "");
  const [saved, setSaved] = useState(false);
  return <details className={styles.disclosure} open={!workflow.seller_id || !customer ? true : undefined}>
    <summary>Pháp nhân bán, thuế và hồ sơ khách</summary>
    <form className={styles.form} onSubmit={async event => {
      event.preventDefault();
      const patch = { orderId: order.id };
      if (seller !== (workflow.seller_id || "")) patch.sellerId = seller;
      if (String(vat) !== String(workflow.vat_percent ?? "")) patch.vatPercent = vat === "" ? null : Number(vat);
      if (buyer && buyer !== customer?.id) patch.customerId = buyer;
      if (Object.keys(patch).length === 1) return;
      setSaved(await save(patch));
    }}>
      <div className={styles.fields}>
        <label>Pháp nhân bán
          <select aria-label="Pháp nhân bán" value={seller} onChange={event => { setSaved(false); setSeller(event.target.value); }}>
            <option value="" disabled>Chọn pháp nhân bán</option>
            {sellers.map(entity => <option key={entity.id} value={entity.id}>{entity.label || entity.name}</option>)}
          </select>
        </label>
        <label>Thuế suất VAT (%)
          <input type="number" min="0" max="100" step="0.01" inputMode="decimal" placeholder="Ví dụ 8" value={vat} required={workflow.vat_percent != null} onChange={event => { setSaved(false); setVat(event.target.value); }}/>
        </label>
        {customer ? <p className={styles.linked}>{customer.is_b2b ? "Khách doanh nghiệp" : "Hồ sơ khách · Chưa phân loại B2B"} <Link href={`/admin/pipeline?opportunity=${encodeURIComponent(customer.id)}`}>{customer.business_name}</Link></p>
          : <label>Hồ sơ khách doanh nghiệp
            <select aria-label="Hồ sơ khách doanh nghiệp" value={buyer} onChange={event => { setSaved(false); setBuyer(event.target.value); }}>
              <option value="">Chọn hồ sơ đã phân loại</option>
              {customers.map(item => <option key={item.id} value={item.id}>{item.business_name}</option>)}
            </select>
          </label>}
      </div>
      <div className={styles.actions}>
        <button type="submit" disabled={saving}>Lưu thiết lập đơn</button>
        {saved && <small role="status">Đã lưu</small>}
        <Link href="/admin/documents?b2b=entities">Thông tin pháp nhân bán</Link>
        {!customer && <Link href="/admin/pipeline">Mở danh sách khách hàng</Link>}
      </div>
    </form>
  </details>;
}

function useWorkflowSave(reload) {
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const save = async body => {
    setSaving(true);
    setSaveError("");
    try {
      await requestB2BWorkflow("", { body });
      reload();
      return true;
    } catch (error) {
      setSaveError(stateMessage(error));
      return false;
    } finally {
      setSaving(false);
    }
  };
  return { save, saving, saveError };
}

export function OrderB2BWorkflow({ orderId, showWhileLoading = false, fallback }) {
  const { result, error, reload } = useWorkflow(`?order=${encodeURIComponent(orderId)}`);
  const { save, saving, saveError } = useWorkflowSave(reload);
  const heading = useId();
  if (!result) return showWhileLoading || error ? <Status error={error} reload={reload}/> : null;
  if (!result.workflow) {
    const order = result.order;
    if (order?.type !== "wholesale" || inactiveOrder(order)) return fallback || null;
    return <section className={styles.panel} aria-labelledby={heading}>
      <h3 id={heading}><ClipboardCheck size={17} aria-hidden="true"/>Hồ sơ đơn B2B</h3>
      <p className={styles.message}>Đơn cũ chưa có checklist chứng từ.</p>
      <div className={styles.actions}><button type="button" disabled={saving} onClick={() => save({ orderId })}>Mở checklist</button></div>
      {saveError && <p className={styles.message} role="alert">{saveError}</p>}
    </section>;
  }
  return <section className={styles.panel} aria-labelledby={heading}>
    <h3 id={heading}><ClipboardCheck size={17} aria-hidden="true"/>Hồ sơ đơn B2B</h3>
    {!inactiveOrder(result.order) && !result.progress?.done && <>
      {!result.customer && <p className={styles.message}>Nối hồ sơ khách doanh nghiệp để dùng hợp đồng nguyên tắc.</p>}
      {result.customer?.is_b2b === false && <p className={styles.message}>Mở hồ sơ khách và bật Khách doanh nghiệp để dùng hợp đồng nguyên tắc.</p>}
      {!result.workflow.seller_id && <p className={styles.message}>Chọn pháp nhân bán để bắt đầu soạn chứng từ.</p>}
    </>}
    <BusinessChecklist data={result} customerId={result.customer?.id || result.workflow.opportunity_id} customerClassified={result.customer?.is_b2b}/>
    {!inactiveOrder(result.order) && <OrderSettings key={`${result.workflow.seller_id}:${result.workflow.vat_percent}:${result.customer?.id}`} data={result} save={save} saving={saving}/>}
    {saveError && <p className={styles.message} role="alert">{saveError}</p>}
    {error && <Status error reload={reload}/>}
  </section>;
}

export function CustomerB2BWorkflow({ customerId, onClassificationChange }) {
  const { result, error, reload } = useWorkflow(`?customer=${encodeURIComponent(customerId)}`);
  const { save, saving, saveError } = useWorkflowSave(reload);
  const [selectedOrder, setSelectedOrder] = useState("");
  const [selectedSeller, setSelectedSeller] = useState("");
  const heading = useId();
  if (!result?.customer) return <Status error={error} reload={reload}/>;
  const { customer, orders = [], sellers = [] } = result;
  const latest = orders.find(entry => !entry.progress?.done) || orders[0];
  const entry = orders.find(item => item.order.id === selectedOrder) || latest;
  const seller = selectedSeller || sellers[0]?.id || "";
  return <section className={`${styles.panel} ${styles.customerPanel}`} aria-labelledby={heading}>
    <div className={styles.heading}>
      <h3 id={heading}><ClipboardCheck size={17} aria-hidden="true"/>Hồ sơ B2B</h3>
      <label className={styles.toggle}>
        <input type="checkbox" checked={customer.is_b2b} disabled={saving} onChange={async event => {
          const enabled = event.target.checked;
          if (await save({ customerId, isB2B: enabled })) onClassificationChange?.();
        }}/>Khách doanh nghiệp
      </label>
    </div>
    {(customer.is_b2b || orders.length > 0) && <>
      <div className={styles.customerTools}>
        {orders.length > 0 ? <label>Đơn hàng
          <select aria-label="Đơn hàng" value={entry.order.id} onChange={event => setSelectedOrder(event.target.value)}>
            {orders.map(item => <option key={item.order.id} value={item.order.id}>
              {item.order.id} · {localDate(item.order.ts)}{item.progress?.done ? " · Hoàn tất" : ""}
            </option>)}
          </select>
        </label> : <label>Pháp nhân bán
          <select aria-label="Pháp nhân bán" value={seller} onChange={event => setSelectedSeller(event.target.value)}>
            {sellers.map(entity => <option key={entity.id} value={entity.id}>{entity.label || entity.name}</option>)}
          </select>
        </label>}
        {customer.is_b2b && <Link className={styles.primary} href={orderUrl("customer", customerId)}><Plus size={16} aria-hidden="true"/>Tạo đơn B2B</Link>}
      </div>
      <BusinessChecklist data={entry || result} customerId={customerId} customerClassified={customer.is_b2b} noOrderSeller={seller}/>
      {entry && !entry.workflow.seller_id && <p className={styles.message}>Chọn pháp nhân bán trong đơn để bắt đầu soạn chứng từ.</p>}
      {entry && <Link className={styles.openOrder} href={orderUrl("order", entry.order.id)}>Mở đơn và thiết lập chứng từ <ArrowUpRight size={15} aria-hidden="true"/></Link>}
      <CustomerLegalForm key={JSON.stringify(customer.b2b_legal || {})} customer={customer} save={save} saving={saving}/>
    </>}
    {saveError && <p className={styles.message} role="alert">{saveError}</p>}
    {error && <Status error reload={reload}/>}
  </section>;
}

export function B2BWorkflowOverview({ revision }) {
  const [open, setOpen] = useState(false);
  return <details className={styles.overview} open={open} onToggle={event => setOpen(event.currentTarget.open)}>
    <summary>Tiến độ hồ sơ B2B</summary>
    {open && <OverviewContent key={revision}/>}
  </details>;
}

function OverviewContent() {
  const { result, error, reload } = useWorkflow("");
  if (!result) return <Status error={error} reload={reload}/>;
  const rows = result.orders || [];
  function status(item) {
    if (item.progress?.done) return "done";
    const needsAttention = item.attention ?? (!item.workflow?.seller_id || !item.customer || item.customer.is_b2b === false || item.order?.stage === "completed");
    return needsAttention ? "attention" : "active";
  }
  const counts = result.counts || rows.reduce((totals, item) => ({ ...totals, [status(item)]: totals[status(item)] + 1 }), { active: 0, attention: 0, done: 0 });
  return <>
    <dl className={styles.counts}>
      <div><dt>Hồ sơ đang xử lý</dt><dd>{counts.active}</dd></div>
      <div><dt>Hồ sơ cần chú ý</dt><dd>{counts.attention}</dd></div>
      <div><dt>Hồ sơ hoàn tất</dt><dd>{counts.done}</dd></div>
    </dl>
    {rows.some(item => status(item) !== "done")
      ? <ul className={styles.overviewList}>{rows.filter(item => status(item) !== "done").map(item =>
        <li key={item.order.id}>
          <Link href={orderUrl("order", item.order.id)}>
            <span><b>{item.customer?.business_name || item.order.customer_name}</b><small>{item.order.id}</small></span>
            <span>{item.nextAction || (!item.customer ? "Nối hồ sơ khách" : item.customer.is_b2b === false ? "Phân loại khách doanh nghiệp" : !item.workflow?.seller_id ? "Chọn pháp nhân bán" : item.progress?.next?.label || "Mở hồ sơ")} <ArrowUpRight size={14} aria-hidden="true"/></span>
          </Link>
        </li>)}</ul>
      : <p className={styles.message}>Không có hồ sơ B2B cần xử lý.</p>}
    {error && <Status error reload={reload}/>}
  </>;
}
