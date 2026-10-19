"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ChevronDown, CircleAlert, LayoutGrid, List, LockKeyhole, Plus, RefreshCw, Search } from "lucide-react";
import { DEVELOPMENT_CATEGORIES, DEVELOPMENT_DIVISIONS, DEVELOPMENT_WORKSTREAMS, DEVELOPMENT_BUDGET_ALLOWANCES, DEVELOPMENT_BUDGET_NOTE } from "@/lib/product-development-seed";
import styles from "./ProductDevelopmentDesk.module.css";

const STAGES = { idea: "Ý tưởng", research: "Nghiên cứu", supplier_sourcing: "Tìm nhà cung cấp", sampling: "Thử mẫu", testing: "Đánh giá / kiểm nghiệm", costing: "Tính giá thành", on_hold: "Tạm dừng", rejected: "Không tiếp tục", discontinued: "Ngừng phát triển" };
const FUTURE_STAGES = { approved_for_production: "Đã duyệt sản xuất", production: "Sản xuất", ready_for_sale: "Sẵn sàng bán", live: "Đang bán" };
const PROCESS_ROUTES = { undecided: "Chưa xác định", internal: "Hoàng Long thực hiện", outsourced: "Thuê gia công", hybrid: "Kết hợp nội bộ và gia công" };
const BUDGET_SOURCES = { internal_estimate: "Ước tính nội bộ", scenario_assumption: "Giả định theo kịch bản" };
const SUPPLIER_STATES = { lead: "Đầu mối chưa xác minh", contacted: "Đã liên hệ", responded: "Đã phản hồi", sample_requested: "Đã yêu cầu mẫu", sample_received: "Đã nhận mẫu", quoted: "Đã báo giá", qualified: "Đã thẩm định", approved: "Đã duyệt", rejected: "Không phù hợp", inactive: "Tạm ngừng" };
const EDITABLE_SUPPLIER_STATES = ["lead", "contacted", "responded", "inactive", "rejected"];
const PRIORITIES = { high: "Cao", medium: "Vừa", low: "Thấp", later: "Để sau" };
const KINDS = { concept: "Ý tưởng sản phẩm", catalog_audit: "Rà soát trà hiện có", format: "Quy cách đóng gói", formulation: "Công thức", material_research: "Nghiên cứu nguyên liệu", category_research: "Nghiên cứu nhóm", service: "Dịch vụ" };
const CATEGORY_STATES = { active: "Đang vận hành", development: "Phát triển", research: "Nghiên cứu", research_only: "Chỉ nghiên cứu", partial: "Phạm vi giới hạn" };
const HISTORY_ACTIONS = { created: "Tạo hồ sơ", updated: "Cập nhật hồ sơ", project_created: "Tạo dự án", project_updated: "Cập nhật dự án", supplier_created: "Thêm đầu mối", supplier_updated: "Cập nhật nhà cung cấp", supplier_linked: "Liên kết nhà cung cấp", catalog_linked: "Liên kết trà hiện có", resource_linked: "Liên kết nguồn lực", note_added: "Thêm ghi chú", note: "Ghi chú tiến độ", supplier_identity: "Cập nhật thông tin liên hệ", "product_development_projects:insert": "Tạo dự án", "product_development_projects:update": "Cập nhật dự án", "supplier_profiles:insert": "Thêm hồ sơ nhà cung cấp", "supplier_profiles:update": "Cập nhật hồ sơ nhà cung cấp", "product_development_catalog_links:insert": "Liên kết trà hiện có", "product_development_catalog_links:update": "Cập nhật liên kết trà hiện có", "product_development_suppliers:insert": "Liên kết nhà cung cấp", "product_development_suppliers:update": "Cập nhật liên kết nhà cung cấp", "product_development_resources:insert": "Liên kết nguồn lực", "product_development_resources:update": "Cập nhật liên kết nguồn lực", seed: "Khởi tạo từ brief" };
const EMPTY = { projects: [], suppliers: [], project_suppliers: [], catalog: [], catalog_links: [], materials: [], batches: [], resource_links: [], history: [], staff: [] };
const fold = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[đĐ]/g, "d").toLowerCase();
const localName = value => typeof value === "object" && value !== null ? value.vi || value.en || "Chưa ghi tên" : value || "Chưa ghi tên";
const number = value => value == null || value === "" ? "Chưa ghi nhận" : new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(value);
const money = value => value == null || value === "" ? "Chưa ước tính" : `${number(value)} đ`;
const date = value => { if (!value) return "Chưa hẹn"; const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? "Chưa hẹn" : new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeZone: "Asia/Ho_Chi_Minh" }).format(parsed); };
const stageLabel = value => STAGES[value] || FUTURE_STAGES[value] || value || "Chưa ghi";
const ownTea = value => value === true ? "Có nhận trà khách cung cấp · theo hồ sơ" : value === false ? "Không nhận trà khách cung cấp · theo hồ sơ" : "Chưa xác minh việc nhận trà Hoàng Long";
const listText = value => Array.isArray(value) ? value.join("\n") : "";
const lines = value => [...new Set(String(value || "").split(/\n/).map(item => item.trim()).filter(Boolean))];
const safeWebsite = value => { try { const parsed = new URL(value); return ["https:", "http:"].includes(parsed.protocol) ? parsed.href : ""; } catch { return ""; } };
const DRAFT_LABELS = { code: "Mã dự án", name: "Tên", category_code: "Nhóm sản phẩm", division_id: "Bộ phận", kind: "Loại hồ sơ", lifecycle_stage: "Giai đoạn", priority: "Ưu tiên", description: "Phạm vi", specification: "Yêu cầu kỹ thuật", format_spec: "Quy cách", owner_id: "Người phụ trách", next_task: "Việc tiếp theo", due_date: "Ngày hẹn", blocker: "Điểm vướng", budget_estimate_min: "Dự toán tối thiểu", budget_estimate_max: "Dự toán tối đa", budget_source: "Nguồn dự toán", budget_note: "Giả định dự toán", process_route: "Tuyến công đoạn", reason: "Lý do thay đổi", region: "Khu vực", phone: "Điện thoại", website: "Website", contact_person: "Người liên hệ", email: "Email", status: "Trạng thái", accepts_customer_tea: "Nhận trà khách cung cấp", service_capabilities: "Dịch vụ dự kiến", supported_formats: "Quy cách dự kiến", notes: "Ghi chú", last_contact_on: "Ngày liên hệ", next_followup_on: "Hẹn theo dõi" };
const draftSummary = draft => Object.entries(draft).map(([key, value]) => `${DRAFT_LABELS[key] || key}: ${key === "lifecycle_stage" ? stageLabel(value) : key === "status" ? SUPPLIER_STATES[value] || value : key === "priority" ? PRIORITIES[value] || value : key === "process_route" ? PROCESS_ROUTES[value] || value : key === "budget_source" ? BUDGET_SOURCES[value] || "Chưa ghi" : key === "accepts_customer_tea" ? ownTea(value === "unknown" ? null : value === "true") : key === "kind" ? KINDS[value] || value : value === "" || value == null ? "Chưa ghi" : value}`).join("\n\n");
const rowFromRpc = value => Array.isArray(value) ? value[0] : value;
const normalize = value => Object.fromEntries(Object.keys(EMPTY).map(key => [key, Array.isArray(value?.[key]) ? value[key] : []]));
const projectDraft = row => ({ code: row?.code || "", name: row?.name || "", category_code: row?.category_code || "C", division_id: row?.division_id || "manufacturing_lab", kind: row?.kind || "concept", lifecycle_stage: row?.lifecycle_stage || "idea", priority: row?.priority || "medium", description: row?.description || "", specification: row?.specification || "", format_spec: row?.format_spec || "", owner_id: row?.owner_id || "", next_task: row?.next_task || "", due_date: row?.due_date?.slice(0, 10) || "", blocker: row?.blocker || "", budget_estimate_min: row?.budget_estimate_min ?? "", budget_estimate_max: row?.budget_estimate_max ?? "", budget_source: row?.budget_source || "", budget_note: row?.budget_note || "", process_route: row?.process_route || "undecided", reason: "" });
const supplierDraft = row => ({ name: row?.name || "", region: row?.region || "", phone: row?.phone || "", website: row?.website || "", contact_person: row?.contact_person || "", email: row?.email || "", status: row?.status || "lead", accepts_customer_tea: row?.accepts_customer_tea == null ? "unknown" : String(row.accepts_customer_tea), service_capabilities: listText(row?.service_capabilities), supported_formats: listText(row?.supported_formats), notes: row?.notes || "", next_task: row?.next_task || "", last_contact_on: row?.last_contact_on?.slice(0, 10) || "", next_followup_on: row?.next_followup_on?.slice(0, 10) || "", reason: "" });

function errorMessage(failure, loading = false) {
  const message = `${failure?.code || ""} ${failure?.message || ""}`;
  if (/conflict|version|stale|40001|P0002/i.test(message)) return "Hồ sơ đã được người khác cập nhật. Nội dung bạn đang nhập vẫn được giữ. Bấm Tải lại dữ liệu, rồi chọn Tải bản mới trong hồ sơ để đối chiếu trước khi lưu.";
  if (/permission|not.authorized|forbidden|42501|manager|admin/i.test(message)) return "Tài khoản hiện tại chưa có quyền quản lý hồ sơ này. Hãy kiểm tra lại phiên đăng nhập.";
  if (/last_contact|contact_date|contact.*required/i.test(message)) return "Cần ghi ngày liên hệ để chuyển sang Đã liên hệ hoặc Đã phản hồi.";
  if (/responded|response.*note|supplier_response_required/i.test(message)) return "Trạng thái Đã phản hồi cần ghi ngày liên hệ và nội dung phản hồi ít nhất 10 ký tự.";
  if (/research_only/i.test(message)) return "Nhóm D, H và K hiện chỉ lưu nghiên cứu. Hãy chọn Ý tưởng, Nghiên cứu, Tạm dừng hoặc Không tiếp tục.";
  if (/launch_gates|supplier_evidence/i.test(message)) return "Giai đoạn này cần quy trình duyệt kèm bằng chứng và chưa mở trong giai đoạn 1.";
  if (/reason/i.test(message)) return "Hãy ghi lý do thay đổi ít nhất 10 ký tự trước khi lưu.";
  if (/budget|estimate|range/i.test(message)) return "Kiểm tra khoảng dự toán: số tiền không âm, mức tối đa phải bằng hoặc lớn hơn mức tối thiểu.";
  if (/duplicate|23505|code.*exist/i.test(message)) return "Mã này đã được sử dụng. Kiểm tra hồ sơ hiện có hoặc chọn mã khác; nội dung đang nhập vẫn được giữ.";
  if (/function.*not.*exist|schema cache|PGRST202|42P01/i.test(message)) return "Phân hệ phát triển sản phẩm chưa sẵn sàng trong cơ sở dữ liệu. Cần cập nhật phân hệ rồi tải lại; nội dung đang nhập vẫn được giữ.";
  if (/23514|22023|invalid|validation|required|constraint/i.test(message)) return "Một số thông tin chưa hợp lệ. Kiểm tra mã, tên, trạng thái, ngày liên hệ và lý do thay đổi rồi thử lại; nội dung đang nhập vẫn được giữ.";
  return loading ? "Chưa tải được dữ liệu phát triển sản phẩm. Hãy thử tải lại; nội dung đang nhập vẫn được giữ." : "Chưa lưu được thay đổi. Kiểm tra kết nối rồi thử lại; nội dung đang nhập vẫn được giữ.";
}

function Field({ label, hint, wide, children }) {
  return <label className={wide ? styles.wideField : styles.field}><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>;
}

function Chip({ value, children }) {
  return <span className={styles.chip} data-status={value}>{children}</span>;
}

function SectionTabs({ active, onChange, items, busy }) {
  return <nav className={styles.sectionTabs} aria-label="Các phần hồ sơ">{items.map(([key, title]) => <button type="button" key={key} disabled={busy} aria-current={active === key ? "page" : undefined} onClick={() => onChange(key)}>{title}</button>)}</nav>;
}

function Conflict({ stale, recovery, onReload, awaitingReload, busy }) {
  return <>{(stale || awaitingReload) && <div className={styles.warning} role="alert"><strong>{awaitingReload ? "Đã lưu; cần tải dữ liệu mới trước lần sửa tiếp theo." : "Bản lưu đã thay đổi trong lúc bạn nhập."}</strong><p>Tải lại dữ liệu ở đầu trang để nhận bản mới. Khi chọn “Tải bản mới”, nội dung đang nhập được giữ bên dưới để bạn đối chiếu và ghép lại.</p>{stale && <button type="button" disabled={busy} onClick={onReload}>Tải bản mới</button>}</div>}{recovery && <details className={styles.recovery}><summary>Nội dung trước khi tải bản mới <ChevronDown/></summary><textarea readOnly rows={7} value={recovery} aria-label="Nội dung đã nhập trước khi tải bản mới"/></details>}</>;
}

function History({ items }) {
  return items.length ? <ol className={styles.history}>{[...items].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))).map((item, index) => <li key={item.id || `${item.created_at}-${index}`}><time dateTime={item.created_at}>{date(item.created_at)}</time><div><strong>{HISTORY_ACTIONS[item.action] || "Thay đổi hồ sơ"}</strong>{item.note && <p>{item.note}</p>}</div></li>)}</ol> : <p className={styles.empty}>Chưa có lịch sử cho hồ sơ này.</p>;
}

function CatalogRecord({ product, note }) {
  return <article className={styles.catalogRecord}><div><strong>{localName(product.name)}</strong><small>{product.id} · {product.pack_size || "Chưa ghi quy cách"}</small></div><Chip value={product.available === true ? "available" : "hidden"}>{product.available === true ? "Catalog: đang mở bán" : "Catalog: chưa mở bán"}</Chip><dl className={styles.facts}><div><dt>Giá theo catalog</dt><dd>{money(product.price)}</dd></div><div><dt>Tồn Hà Giang / Sóc Sơn</dt><dd>{number(product.stock_ha_giang)} / {number(product.stock_soc_son)}</dd></div></dl>{Array.isArray(product.variants) && product.variants.length > 0 && <p className={styles.hint}>Quy cách hiện có: {product.variants.map(item => typeof item === "string" ? item : `${item.weight || item.pack_size || item.name || "Quy cách"}${item.price != null ? ` · ${money(item.price)}` : ""}`).join("; ")}</p>}{note && <p className={styles.note}>{note}</p>}</article>;
}

function LinkForm({ title, options, onSubmit, busy, placeholder = "Chọn hồ sơ…", hint }) {
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  async function submit(event) {
    event.preventDefault();
    if (!value) return;
    const result = await onSubmit(value, note.trim());
    if (result?.ok) { setValue(""); setNote(""); }
  }
  return <form className={styles.linkForm} onSubmit={submit}><fieldset className={styles.linkFields} disabled={busy}><h4>{title}</h4>{hint && <p className={styles.hint}>{hint}</p>}<Field label={title}><select required value={value} onChange={event => setValue(event.target.value)} disabled={busy || !options.length}><option value="">{placeholder}</option>{options.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></Field><Field label="Ghi chú liên kết"><input value={note} maxLength={2000} onChange={event => setNote(event.target.value)}/></Field><button type="submit" disabled={busy || !value}>Lưu liên kết</button>{!options.length && <p className={styles.hint}>Chưa có hồ sơ khác để liên kết.</p>}</fieldset></form>;
}

function ProjectLinks({ project, snapshot, busy, run, onSupplier }) {
  const [resourceType, setResourceType] = useState("batch");
  const supplierLinks = snapshot.project_suppliers.filter(item => item.project_id === project.id);
  const catalogLinks = snapshot.catalog_links.filter(item => item.project_id === project.id);
  const resourceLinks = snapshot.resource_links.filter(item => item.project_id === project.id);
  const suppliers = supplierLinks.map(link => ({ ...link, supplier: snapshot.suppliers.find(item => item.vendor_id === link.vendor_id) })).filter(item => item.supplier);
  const products = catalogLinks.map(link => ({ ...link, product: snapshot.catalog.find(item => item.id === link.product_id) })).filter(item => item.product);
  const resources = resourceLinks.map(link => ({ ...link, resource: snapshot[link.resource_type === "batch" ? "batches" : "materials"].find(item => String(item.id) === String(link.resource_id)) }));
  return <div className={styles.linkSections}>
    <section><h3>Nhà cung cấp ứng viên</h3><p className={styles.hint}>Liên kết thể hiện đầu mối đang xem xét; chưa xác nhận năng lực, báo giá hay phê duyệt.</p>{suppliers.length ? suppliers.map(item => <article className={styles.linkedRecord} key={item.vendor_id}><button type="button" disabled={busy} onClick={() => onSupplier(item.vendor_id)}>{item.supplier.name} <ArrowUpRight/></button><span>{SUPPLIER_STATES[item.supplier.status] || item.supplier.status}</span><p>{ownTea(item.supplier.accepts_customer_tea)}</p>{item.note && <p className={styles.note}>{item.note}</p>}</article>) : <p className={styles.hint}>Chưa gắn đầu mối cho dự án.</p>}<LinkForm title="Gắn nhà cung cấp ứng viên" busy={busy} options={snapshot.suppliers.filter(item => !supplierLinks.some(link => link.vendor_id === item.vendor_id)).map(item => ({ id: item.vendor_id, label: item.name }))} onSubmit={(vendorId, note) => run("product_development_link_supplier", { p_project_id: project.id, p_vendor_id: vendorId, p_note: note }, "Đã liên kết nhà cung cấp ứng viên.")}/></section>
    <section><h3>Trà và quy cách trong catalog hiện có</h3><p className={styles.hint}>Đây là bản ghi thương mại hiện có, hiển thị để đối chiếu. Trạng thái mở bán của catalog được giữ riêng với giai đoạn phát triển.</p>{products.map(item => <CatalogRecord key={item.product_id} product={item.product} note={item.note}/>)}<LinkForm title="Gắn trà hiện có" busy={busy} options={snapshot.catalog.filter(item => !catalogLinks.some(link => link.product_id === item.id)).map(item => ({ id: item.id, label: `${localName(item.name)} · ${item.id}` }))} onSubmit={(productId, note) => run("product_development_link_catalog", { p_project_id: project.id, p_product_id: productId, p_note: note }, "Đã liên kết bản ghi catalog hiện có.")}/><Link className={styles.textLink} href="/admin/house">Mở catalog tại Nhà <ArrowUpRight/></Link></section>
    <section><h3>Lô trà và vật tư tham chiếu</h3><p className={styles.hint}>Liên kết chỉ để lập kế hoạch. Không giữ chỗ, xuất kho, ghi chi phí hay thay đổi lượng tồn. Tồn lô ghi nhận có thể gồm lượng đang giữ hoặc chờ kiểm tra; cần đối chiếu trạng thái và mục đích được duyệt tại Vận hành.</p>{resources.map((item, index) => <article className={styles.linkedRecord} key={`${item.resource_type}-${item.resource_id}-${index}`}><strong>{item.resource_type === "batch" ? "Lô trà" : "Vật tư"} · {item.resource?.code || item.resource_id}{item.resource?.name ? ` · ${localName(item.resource.name)}` : ""}</strong>{item.resource && (item.resource_type === "batch" ? <p>Tồn lô ghi nhận: {number(item.resource.available_kg)} kg · Đã giữ: {number(item.resource.reserved_kg)} kg · Trạng thái: {item.resource.status || "Chưa ghi"}</p> : <p>Tồn: {number(item.resource.stock_on_hand)} {item.resource.unit || ""} · Đơn giá hiện có: {money(item.resource.unit_cost)}</p>)}{item.note && <p className={styles.note}>{item.note}</p>}</article>)}<Field label="Loại nguồn lực"><select value={resourceType} disabled={busy} onChange={event => setResourceType(event.target.value)}><option value="batch">Lô trà hiện có</option><option value="material">Vật tư hiện có</option></select></Field><LinkForm key={resourceType} title={resourceType === "batch" ? "Gắn lô trà tham chiếu" : "Gắn vật tư tham chiếu"} busy={busy} options={snapshot[resourceType === "batch" ? "batches" : "materials"].filter(item => !resourceLinks.some(link => link.resource_type === resourceType && String(link.resource_id) === String(item.id))).map(item => ({ id: item.id, label: `${item.code || item.id}${item.name ? ` · ${localName(item.name)}` : ""} · ${resourceType === "batch" ? `${number(item.available_kg)} kg tồn lô · ${number(item.reserved_kg)} kg đã giữ` : `${number(item.stock_on_hand)} ${item.unit || ""}`}` }))} onSubmit={(resourceId, note) => run("product_development_link_resource", { p_project_id: project.id, p_resource_type: resourceType, p_resource_id: resourceId, p_note: note }, "Đã gắn nguồn lực tham chiếu; lượng tồn giữ nguyên.")}/><div className={styles.relatedLinks}><Link href="/admin/operations">Mở vận hành <ArrowUpRight/></Link><Link href="/admin/recipes">Mở công thức <ArrowUpRight/></Link></div></section>
  </div>;
}

function ProjectDetail({ project, snapshot, busy, run, onSaved, onSupplier }) {
  const [draft, setDraft] = useState(() => projectDraft(project));
  const [expectedVersion, setExpectedVersion] = useState(project?.version || 0);
  const [section, setSection] = useState("overview");
  const [recovery, setRecovery] = useState("");
  const [awaitingReload, setAwaitingReload] = useState(false);
  const [note, setNote] = useState("");
  const [formError, setFormError] = useState("");
  const stale = project && Number(project.version) !== Number(expectedVersion);
  const change = (key, value) => setDraft(current => ({ ...current, [key]: value }));
  const reload = () => { setRecovery(draftSummary(draft)); setDraft(projectDraft(project)); setExpectedVersion(project.version); setAwaitingReload(false); };
  async function submit(event) {
    event.preventDefault();
    if (stale || awaitingReload || busy) return;
    if (!/^[A-Z0-9][A-Z0-9_.:-]{1,99}$/.test(draft.code.trim()) || !draft.name.trim()) {
      setSection("overview"); setFormError("Cần ghi tên và mã dự án gồm ít nhất 2 ký tự in hoa, số hoặc dấu _ . : -."); return;
    }
    if (["D", "H", "K"].includes(draft.category_code) && !["idea", "research", "on_hold", "rejected", "discontinued"].includes(draft.lifecycle_stage)) {
      setSection("plan"); setFormError("Nhóm D, H và K hiện chỉ lưu nghiên cứu. Chọn Ý tưởng, Nghiên cứu, Tạm dừng hoặc Không tiếp tục."); return;
    }
    if ((draft.budget_estimate_min !== "" || draft.budget_estimate_max !== "") && (!draft.budget_source || draft.budget_note.trim().length < 10)) {
      setSection("budget"); setFormError("Dự toán cần chọn nguồn và ghi giả định ít nhất 10 ký tự."); return;
    }
    if (draft.budget_estimate_min !== "" && draft.budget_estimate_max !== "" && Number(draft.budget_estimate_min) > Number(draft.budget_estimate_max)) {
      setSection("budget"); setFormError("Dự toán tối đa cần bằng hoặc lớn hơn dự toán tối thiểu."); return;
    }
    if (draft.reason.trim().length < 10) { setFormError("Ghi lý do thay đổi ít nhất 10 ký tự."); return; }
    setFormError("");
    const input = Object.fromEntries(Object.entries(draft).map(([key, value]) => [key, typeof value === "string" ? value.trim() : value]));
    input.owner_id = input.owner_id || null;
    input.due_date = input.due_date || null;
    input.budget_source = input.budget_source || null;
    input.budget_estimate_min = input.budget_estimate_min === "" ? null : Number(input.budget_estimate_min);
    input.budget_estimate_max = input.budget_estimate_max === "" ? null : Number(input.budget_estimate_max);
    const result = await run("product_development_save_project", { p_id: project?.id || null, p_expected_version: expectedVersion, p_input: input }, "Đã lưu hồ sơ phát triển nội bộ.");
    if (!result?.ok) return;
    const returned = rowFromRpc(result.data);
    const savedId = returned?.id || project?.id;
    const saved = result.snapshot?.projects.find(item => savedId ? item.id === savedId : !project && item.code === input.code);
    if (saved) { setDraft(projectDraft(saved)); setExpectedVersion(saved.version); setAwaitingReload(false); onSaved(saved.id); }
    else setAwaitingReload(true);
  }
  async function addNote(event) {
    event.preventDefault();
    const result = await run("product_development_add_note", { p_project_id: project.id, p_note: note.trim() }, "Đã lưu ghi chú tiến độ.");
    if (result?.ok) setNote("");
  }
  const editable = ["overview", "plan", "spec", "budget"].includes(section);
  return <section className={styles.detail} aria-label={project ? `Hồ sơ ${project.name}` : "Dự án mới"}>
    <header className={styles.detailHeader}><div><span className={styles.eyebrow}>{project?.code || "Dự án mới"}</span><h2>{project?.name || "Thêm hồ sơ phát triển"}</h2></div><Chip value="hidden"><LockKeyhole/>Ẩn khỏi cửa hàng</Chip></header>
    <SectionTabs active={section} onChange={setSection} busy={busy} items={[["overview", "Thông tin"], ["plan", "Tiến độ"], ["spec", "Yêu cầu"], ["budget", "Dự toán"], ...(project ? [["links", "Liên kết"], ["history", "Nhật ký"]] : [])]}/>
    <div className={styles.detailBody}><Conflict stale={stale} recovery={recovery} awaitingReload={awaitingReload} onReload={reload} busy={busy}/>{formError && <p className={styles.warning} role="alert">{formError}</p>}
      {editable && <form onSubmit={submit} className={styles.form}><fieldset className={styles.formFields} disabled={busy}>
        {section === "overview" && <><div className={styles.formGrid}><Field label="Mã dự án" hint="Mã nội bộ duy nhất, ví dụ C008."><input required maxLength={40} value={draft.code} onChange={event => change("code", event.target.value)}/></Field><Field label="Loại hồ sơ"><select value={draft.kind} onChange={event => change("kind", event.target.value)}>{Object.entries(KINDS).map(([key, title]) => <option key={key} value={key}>{title}</option>)}</select></Field><Field label="Tên dự án" wide><input required maxLength={240} value={draft.name} onChange={event => change("name", event.target.value)}/></Field><Field label="Nhóm sản phẩm"><select value={draft.category_code} onChange={event => change("category_code", event.target.value)}>{DEVELOPMENT_CATEGORIES.map(item => <option key={item.code} value={item.code}>{item.code} · {item.name}</option>)}</select></Field><Field label="Bộ phận thương mại"><select value={draft.division_id} onChange={event => change("division_id", event.target.value)}>{DEVELOPMENT_DIVISIONS.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><Field label="Mô tả phạm vi" wide><textarea rows={4} maxLength={6000} value={draft.description} onChange={event => change("description", event.target.value)}/></Field></div><p className={styles.hint}>Các bộ phận thương mại là cách tổ chức nội bộ của Hoàng Long. Ý tưởng và quy cách phát triển chưa phải SKU đang bán.</p></>}
        {section === "plan" && <><div className={styles.formGrid}><Field label="Giai đoạn phát triển"><select value={draft.lifecycle_stage} onChange={event => change("lifecycle_stage", event.target.value)}>{!STAGES[draft.lifecycle_stage] && <option value={draft.lifecycle_stage} disabled>{stageLabel(draft.lifecycle_stage)} · chỉ xem</option>}{Object.entries(STAGES).map(([key, title]) => <option key={key} value={key}>{title}</option>)}</select></Field><Field label="Ưu tiên"><select value={draft.priority} onChange={event => change("priority", event.target.value)}>{Object.entries(PRIORITIES).map(([key, title]) => <option key={key} value={key}>{title}</option>)}</select></Field><Field label="Người phụ trách"><select value={draft.owner_id} onChange={event => change("owner_id", event.target.value)}><option value="">Chưa phân công</option>{draft.owner_id && !snapshot.staff.some(item => item.user_id === draft.owner_id) && <option value={draft.owner_id}>Người phụ trách đã lưu</option>}{snapshot.staff.map(item => <option key={item.user_id} value={item.user_id}>{item.display_name || String(item.user_id).slice(0, 8)}</option>)}</select></Field><Field label="Ngày hẹn"><input type="date" value={draft.due_date} onChange={event => change("due_date", event.target.value)}/></Field><Field label="Việc tiếp theo" wide><textarea rows={3} maxLength={3000} value={draft.next_task} onChange={event => change("next_task", event.target.value)}/></Field><Field label="Điểm đang vướng" wide><textarea rows={3} maxLength={3000} value={draft.blocker} onChange={event => change("blocker", event.target.value)}/></Field></div><div className={styles.futureGate}><LockKeyhole/><div><strong>Các bước sau cần quy trình phê duyệt riêng</strong><p>Sản xuất thử → duyệt chất lượng và giá thành → sẵn sàng sản xuất → đưa vào catalog. Các bước này chỉ hiển thị lộ trình, chưa mở trong giai đoạn 1.</p></div></div></>}
        {section === "spec" && <><Field label="Yêu cầu kỹ thuật và tiêu chí mẫu"><textarea rows={7} maxLength={10000} value={draft.specification} onChange={event => change("specification", event.target.value)} placeholder="Trà đầu vào, cảm quan, chỉ tiêu cần kiểm tra, điều kiện bảo quản…"/></Field><Field label="Quy cách dự kiến"><textarea rows={4} maxLength={2000} value={draft.format_spec} onChange={event => change("format_spec", event.target.value)} placeholder="Khối lượng, dạng túi, bao bì, số gói…"/></Field><Field label="Tuyến công đoạn dự kiến" hint="Ghi chi tiết công đoạn và điểm chưa xác minh trong yêu cầu kỹ thuật."><select value={draft.process_route} onChange={event => change("process_route", event.target.value)}>{Object.entries(PROCESS_ROUTES).map(([key, title]) => <option key={key} value={key}>{title}</option>)}</select></Field></>}
        {section === "budget" && <><p className={styles.note}>Dự toán nghiên cứu nội bộ. Ô trống là chưa ước tính. Chưa có số liệu phê duyệt, chi thực tế hay báo giá được ghi nhận tại đây.</p><div className={styles.formGrid}><Field label="Dự toán tối thiểu (đ)"><input type="number" min="0" step="1000" value={draft.budget_estimate_min} onChange={event => change("budget_estimate_min", event.target.value)}/></Field><Field label="Dự toán tối đa (đ)"><input type="number" min={draft.budget_estimate_min || 0} step="1000" value={draft.budget_estimate_max} onChange={event => change("budget_estimate_max", event.target.value)}/></Field><Field label="Nguồn dự toán" wide><select required={draft.budget_estimate_min !== "" || draft.budget_estimate_max !== ""} value={draft.budget_source} onChange={event => change("budget_source", event.target.value)}><option value="">Chưa có nguồn dự toán</option>{Object.entries(BUDGET_SOURCES).map(([key, title]) => <option key={key} value={key}>{title}</option>)}</select></Field><Field label="Giả định / phần chưa bao gồm" wide><textarea rows={4} maxLength={3000} required={draft.budget_estimate_min !== "" || draft.budget_estimate_max !== ""} minLength={draft.budget_estimate_min !== "" || draft.budget_estimate_max !== "" ? 10 : undefined} value={draft.budget_note} onChange={event => change("budget_note", event.target.value)}/></Field></div><p className={styles.hint}>Brief 19/10/2026 ghi tổng 12–35 triệu đồng; cộng các khoản thành phần là 12–37 triệu đồng. Cần đối chiếu trước khi duyệt.</p><Link className={styles.textLink} href="/admin/operations/budget">Mở quản lý ngân sách <ArrowUpRight/></Link></>}
        <Field label="Lý do thay đổi" hint="Ít nhất 10 ký tự; lưu cùng lịch sử hồ sơ."><textarea required minLength={10} maxLength={2000} rows={2} value={draft.reason} onChange={event => change("reason", event.target.value)}/></Field>
        <footer className={styles.formFooter}><span>Nội dung đang nhập được giữ nếu lưu chưa thành công.</span><button className={styles.primary} disabled={busy || stale || awaitingReload} type="submit">{busy ? "Đang lưu…" : "Lưu hồ sơ"}</button></footer>
      </fieldset></form>}
      {section === "links" && project && <ProjectLinks project={project} snapshot={snapshot} busy={busy} run={run} onSupplier={onSupplier}/>}
      {section === "history" && project && <><form className={styles.form} onSubmit={addNote}><fieldset className={styles.formFields} disabled={busy}><Field label="Ghi chú tiến độ / kết quả trao đổi"><textarea required minLength={10} maxLength={6000} rows={3} value={note} onChange={event => setNote(event.target.value)}/></Field><button type="submit" disabled={busy || note.trim().length < 10}>Thêm ghi chú</button></fieldset></form><History items={snapshot.history.filter(item => item.project_id === project.id)}/></>}
    </div>
  </section>;
}

function SupplierDetail({ supplier, snapshot, busy, run, onSaved, onProject }) {
  const [draft, setDraft] = useState(() => supplierDraft(supplier));
  const [expectedVersion, setExpectedVersion] = useState(supplier?.version || 0);
  const [section, setSection] = useState("identity");
  const [recovery, setRecovery] = useState("");
  const [awaitingReload, setAwaitingReload] = useState(false);
  const [formError, setFormError] = useState("");
  const stale = supplier && Number(supplier.version) !== Number(expectedVersion);
  const change = (key, value) => setDraft(current => ({ ...current, [key]: value }));
  const reload = () => { setRecovery(draftSummary(draft)); setDraft(supplierDraft(supplier)); setExpectedVersion(supplier.version); setAwaitingReload(false); };
  const projectLinks = supplier ? snapshot.project_suppliers.filter(item => item.vendor_id === supplier.vendor_id) : [];
  async function submit(event) {
    event.preventDefault();
    if (stale || awaitingReload || busy) return;
    if (!draft.name.trim()) { setSection("identity"); setFormError("Cần ghi tên nhà cung cấp."); return; }
    if (draft.website && !/^https:\/\/[^\s<>]+$/.test(draft.website.trim())) { setSection("identity"); setFormError("Website cần là đường dẫn https hợp lệ, không có khoảng trắng."); return; }
    if (["contacted", "responded"].includes(draft.status) && !draft.last_contact_on) { setSection("followup"); setFormError("Cần ghi ngày liên hệ để lưu trạng thái này."); return; }
    if (draft.status === "responded" && draft.notes.trim().length < 10) { setSection("followup"); setFormError("Đã phản hồi cần ghi nội dung phản hồi ít nhất 10 ký tự."); return; }
    if ([draft.service_capabilities, draft.supported_formats].some(value => lines(value).length > 30 || lines(value).some(item => item.length > 500))) { setSection("capabilities"); setFormError("Mỗi danh sách tối đa 30 dòng, mỗi dòng tối đa 500 ký tự."); return; }
    if (draft.reason.trim().length < 10) { setFormError("Ghi lý do thay đổi ít nhất 10 ký tự."); return; }
    setFormError("");
    const input = Object.fromEntries(Object.entries(draft).map(([key, value]) => [key, typeof value === "string" ? value.trim() : value]));
    input.accepts_customer_tea = draft.accepts_customer_tea === "unknown" ? null : draft.accepts_customer_tea === "true";
    input.service_capabilities = lines(draft.service_capabilities);
    input.supported_formats = lines(draft.supported_formats);
    input.last_contact_on = input.last_contact_on || null;
    input.next_followup_on = input.next_followup_on || null;
    const result = await run("product_development_save_supplier", { p_vendor_id: supplier?.vendor_id || null, p_expected_version: expectedVersion, p_input: input }, "Đã lưu hồ sơ nhà cung cấp.");
    if (!result?.ok) return;
    const returned = rowFromRpc(result.data);
    const savedId = returned?.vendor_id || supplier?.vendor_id;
    const saved = result.snapshot?.suppliers.find(item => savedId ? item.vendor_id === savedId : !supplier && item.name === input.name);
    if (saved) { setDraft(supplierDraft(saved)); setExpectedVersion(saved.version); setAwaitingReload(false); onSaved(saved.vendor_id); }
    else setAwaitingReload(true);
  }
  const website = safeWebsite(supplier?.website);
  return <section className={styles.detail} aria-label={supplier ? `Nhà cung cấp ${supplier.name}` : "Nhà cung cấp mới"}>
    <header className={styles.detailHeader}><div><span className={styles.eyebrow}>Hồ sơ đầu mối nội bộ</span><h2>{supplier?.name || "Thêm nhà cung cấp"}</h2></div><Chip value={supplier?.status || "lead"}>{SUPPLIER_STATES[supplier?.status || "lead"]}</Chip></header>
    <SectionTabs active={section} onChange={setSection} busy={busy} items={[["identity", "Liên hệ"], ["capabilities", "Năng lực dự kiến"], ["followup", "Theo dõi"], ...(supplier ? [["projects", "Dự án liên kết"], ["history", "Nhật ký"]] : [])]}/>
    <div className={styles.detailBody}><Conflict stale={stale} recovery={recovery} awaitingReload={awaitingReload} onReload={reload} busy={busy}/>{formError && <p className={styles.warning} role="alert">{formError}</p>}
      {["identity", "capabilities", "followup"].includes(section) && <form className={styles.form} onSubmit={submit}><fieldset className={styles.formFields} disabled={busy}>
        {section === "identity" && <><div className={styles.formGrid}><Field label="Tên nhà cung cấp" wide><input required maxLength={200} value={draft.name} onChange={event => change("name", event.target.value)}/></Field><Field label="Khu vực"><input maxLength={200} value={draft.region} onChange={event => change("region", event.target.value)}/></Field><Field label="Người liên hệ"><input maxLength={160} value={draft.contact_person} onChange={event => change("contact_person", event.target.value)}/></Field><Field label="Điện thoại"><input type="tel" maxLength={60} value={draft.phone} onChange={event => change("phone", event.target.value)}/></Field><Field label="Email"><input type="email" maxLength={240} value={draft.email} onChange={event => change("email", event.target.value)}/></Field><Field label="Website" wide hint="Đường dẫn theo hồ sơ; cần xác minh đúng đơn vị và phạm vi dịch vụ."><input type="url" pattern={"https://[^\\s<>]+"} maxLength={2048} value={draft.website} onChange={event => change("website", event.target.value)} placeholder="https://…"/></Field></div>{website && <a className={styles.textLink} href={website} target="_blank" rel="noopener noreferrer">Mở website trong hồ sơ <ArrowUpRight/></a>}<p className={styles.hint}>Các đầu mối khởi tạo từ brief chưa được xác minh pháp nhân, website, năng lực hoặc chứng nhận.</p></>}
        {section === "capabilities" && <><Field label="Nhận trà do Hoàng Long cung cấp?" hint="Giữ “Chưa xác minh” đến khi có thông tin trực tiếp từ đúng đầu mối."><select value={draft.accepts_customer_tea} onChange={event => change("accepts_customer_tea", event.target.value)}><option value="unknown">Chưa xác minh</option><option value="true">Có · theo thông tin đã ghi nhận</option><option value="false">Không · theo thông tin đã ghi nhận</option></select></Field><Field label="Công đoạn / dịch vụ dự kiến" hint="Mỗi dòng một dịch vụ. Ghi rõ phần còn cần xác minh."><textarea rows={5} maxLength={6000} value={draft.service_capabilities} onChange={event => change("service_capabilities", event.target.value)}/></Field><Field label="Dạng túi / quy cách dự kiến" hint="Mỗi dòng một quy cách; cần xác minh thông số trước khi yêu cầu mẫu."><textarea rows={4} maxLength={6000} value={draft.supported_formats} onChange={event => change("supported_formats", event.target.value)}/></Field><p className={styles.note}>Chưa có quy trình nhập báo giá, MOQ, chứng nhận và bằng chứng thẩm định trong giai đoạn này. Các dữ liệu đó chưa được coi là đã xác nhận.</p></>}
        {section === "followup" && <><div className={styles.formGrid}><Field label="Trạng thái đầu mối"><select value={draft.status} onChange={event => change("status", event.target.value)}>{!EDITABLE_SUPPLIER_STATES.includes(draft.status) && <option value={draft.status} disabled>{SUPPLIER_STATES[draft.status] || draft.status} · chỉ xem</option>}{EDITABLE_SUPPLIER_STATES.map(key => <option key={key} value={key}>{SUPPLIER_STATES[key]}</option>)}</select></Field><Field label="Lần liên hệ gần nhất" hint="Bắt buộc khi ghi Đã liên hệ hoặc Đã phản hồi."><input type="date" required={["contacted", "responded"].includes(draft.status)} value={draft.last_contact_on} onChange={event => change("last_contact_on", event.target.value)}/></Field><Field label="Hẹn theo dõi tiếp"><input type="date" value={draft.next_followup_on} onChange={event => change("next_followup_on", event.target.value)}/></Field><Field label="Việc tiếp theo" wide><textarea rows={3} maxLength={3000} value={draft.next_task} onChange={event => change("next_task", event.target.value)}/></Field><Field label="Ghi chú / nội dung phản hồi" wide hint="Đã phản hồi cần nội dung ít nhất 10 ký tự; ghi nguồn và ngày trao đổi."><textarea rows={5} required={draft.status === "responded"} minLength={draft.status === "responded" ? 10 : undefined} maxLength={10000} value={draft.notes} onChange={event => change("notes", event.target.value)}/></Field></div><div className={styles.futureGate}><LockKeyhole/><p>Nhận mẫu, báo giá, thẩm định và duyệt đối tác sẽ mở khi có quy trình kèm bằng chứng. Hồ sơ hiện tại chỉ theo dõi liên hệ.</p></div></>}
        <Field label="Lý do thay đổi" hint="Ít nhất 10 ký tự; giữ dấu vết cập nhật hồ sơ."><textarea required minLength={10} rows={2} maxLength={2000} value={draft.reason} onChange={event => change("reason", event.target.value)}/></Field><footer className={styles.formFooter}><span>Nội dung đang nhập được giữ nếu lưu chưa thành công.</span><button className={styles.primary} type="submit" disabled={busy || stale || awaitingReload}>{busy ? "Đang lưu…" : "Lưu nhà cung cấp"}</button></footer>
      </fieldset></form>}
      {section === "projects" && <>{projectLinks.map(link => { const project = snapshot.projects.find(item => item.id === link.project_id); return project ? <article key={project.id} className={styles.linkedRecord}><button type="button" disabled={busy} onClick={() => onProject(project.id)}>{project.code} · {project.name} <ArrowUpRight/></button><span>{stageLabel(project.lifecycle_stage)}</span>{link.note && <p className={styles.note}>{link.note}</p>}</article> : null; })}{!projectLinks.length && <p className={styles.empty}>Chưa liên kết dự án. Mở một dự án và chọn phần Liên kết để gắn đầu mối này.</p>}</>}
      {section === "history" && <History items={snapshot.history.filter(item => item.vendor_id === supplier.vendor_id)}/>}
    </div>
  </section>;
}

function PlanningScope() {
  return <details className={styles.planning}><summary><div><span className={styles.eyebrow}>Phạm vi giai đoạn 1</span><strong>Nhóm sản phẩm, 8 luồng công việc và dự toán ban đầu</strong></div><ChevronDown/></summary><div className={styles.planningBody}>
    <section><h3>Phạm vi phát triển</h3><div className={styles.categoryGrid}>{DEVELOPMENT_CATEGORIES.map(item => <article key={item.code}><span>{item.code}</span><div><strong>{item.name}</strong><small>{CATEGORY_STATES[item.status] || item.status}</small><p>{item.note}</p></div></article>)}</div></section>
    <section><h3>Bộ phận thương mại nội bộ</h3><div className={styles.divisionGrid}>{DEVELOPMENT_DIVISIONS.map(item => <article key={item.id}><strong>{item.name}</strong><p>{item.position}</p><small>{item.note}</small></article>)}</div></section>
    <section><h3>8 luồng công việc</h3><ol className={styles.workstreams}>{DEVELOPMENT_WORKSTREAMS.map(item => <li key={item.code}><b>{item.code}</b><div><strong>{item.name}</strong><p>{item.next_task}</p></div><Chip value={item.status}>{item.status === "later" ? "Giai đoạn sau" : item.status === "research_only" ? "Chỉ nghiên cứu" : "Kế hoạch ban đầu"}</Chip></li>)}</ol></section>
    <section><h3>Dự toán thử nghiệm từ brief</h3><p className={styles.hint}>Nguồn: brief 19/10/2026. Các khoản dưới đây là ước tính nội bộ, chưa phải báo giá, ngân sách được duyệt hoặc chi thực tế.</p><div className={styles.tableScroll}><table className={styles.budgetTable}><thead><tr><th scope="col">Khoản dự kiến</th><th scope="col">Tối thiểu</th><th scope="col">Tối đa</th></tr></thead><tbody>{DEVELOPMENT_BUDGET_ALLOWANCES.map(item => <tr key={item.code}><th scope="row">{item.name}</th><td>{money(item.min_vnd)}</td><td>{money(item.max_vnd)}</td></tr>)}</tbody><tfoot><tr><th scope="row">Cộng thành phần</th><td>12.000.000 đ</td><td>37.000.000 đ</td></tr></tfoot></table></div><p className={styles.warning}><CircleAlert/>{DEVELOPMENT_BUDGET_NOTE}</p><Link className={styles.textLink} href="/admin/operations/budget">Xem quản lý ngân sách hiện có <ArrowUpRight/></Link></section>
  </div></details>;
}

export default function ProductDevelopmentDesk({ supabase, email, role, initialView = "projects" }) {
  const [snapshot, setSnapshot] = useState(EMPTY);
  const [view, setView] = useState(initialView);
  const [layout, setLayout] = useState("table");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [stage, setStage] = useState("all");
  const [supplierStatus, setSupplierStatus] = useState("all");
  const [projectId, setProjectId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const request = useRef(0);
  const detailRef = useRef(null);
  const busyRef = useRef(false);
  const canEdit = ["admin", "manager"].includes(role);

  const load = useCallback(async () => {
    const current = ++request.current;
    setLoading(true); setError("");
    try {
      const { data, error: failure } = await supabase.rpc("product_development_snapshot");
      if (current !== request.current) return null;
      if (failure) throw failure;
      const next = normalize(rowFromRpc(data));
      setSnapshot(next); setLoaded(true);
      return next;
    } catch (failure) {
      if (current === request.current) setError(errorMessage(failure, true));
      return null;
    } finally { if (current === request.current) setLoading(false); }
  }, [supabase]);

  useEffect(() => { load(); return () => { request.current += 1; }; }, [load]);

  async function run(rpc, args, success) {
    if (busyRef.current || !canEdit || !loaded) return null;
    busyRef.current = true; setBusy(true); setError(""); setNotice("");
    try {
      const { data, error: failure } = await supabase.rpc(rpc, args);
      if (failure) throw failure;
      const next = await load();
      setNotice(next ? success : `${success} Chưa đọc lại được bản mới; hãy tải lại dữ liệu trước khi sửa tiếp.`);
      return { ok: true, data, snapshot: next };
    } catch (failure) { setError(errorMessage(failure)); return { ok: false }; }
    finally { busyRef.current = false; setBusy(false); }
  }

  const projects = useMemo(() => snapshot.projects.filter(item => (category === "all" || item.category_code === category) && (stage === "all" || item.lifecycle_stage === stage) && (!query || fold([item.code, item.name, item.description, item.next_task, item.blocker].join(" ")).includes(fold(query)))), [snapshot.projects, category, stage, query]);
  const suppliers = useMemo(() => snapshot.suppliers.filter(item => (supplierStatus === "all" || item.status === supplierStatus) && (!query || fold([item.name, item.region, item.contact_person, item.notes, ...(item.service_capabilities || []), ...(item.supported_formats || [])].join(" ")).includes(fold(query)))), [snapshot.suppliers, supplierStatus, query]);
  const selectedProject = snapshot.projects.find(item => item.id === projectId);
  const selectedSupplier = snapshot.suppliers.find(item => item.vendor_id === supplierId);
  const owner = id => snapshot.staff.find(item => item.user_id === id)?.display_name || "Chưa phân công";
  const focusDetail = () => { if (typeof window !== "undefined" && window.matchMedia("(max-width: 74.99rem)").matches) window.requestAnimationFrame(() => { detailRef.current?.scrollIntoView({ block: "start" }); detailRef.current?.focus({ preventScroll: true }); }); };
  const openProject = id => { if (busy || loading) return; setProjectId(id); setView("projects"); focusDetail(); };
  const openSupplier = id => { if (busy || loading) return; setSupplierId(id); setView("suppliers"); focusDetail(); };
  const changeView = next => { if (busy || loading) return; setView(next); setQuery(""); setError(""); setNotice(""); };
  const future = [...new Set(snapshot.projects.map(item => item.lifecycle_stage).filter(value => !STAGES[value]))];

  return <main className={styles.page}>
    <header className={styles.header}><div><p className={styles.eyebrow}>Hoàng Long · Manufacturing & Lab</p><h1>{view === "suppliers" ? "Nhà cung cấp & gia công" : "Phát triển sản phẩm"}</h1><p className={styles.subtitle}>Từ trà gốc và nguồn lực hiện có đến yêu cầu mẫu, đầu mối gia công và bước phát triển tiếp theo.</p></div><div className={styles.headerActions}><small>{email}</small><button type="button" disabled={loading || busy} onClick={load}><RefreshCw className={loading ? styles.spin : undefined}/>{loading ? "Đang tải…" : "Tải lại dữ liệu"}</button></div></header>
    <p className={styles.internalNotice}><LockKeyhole/>Hồ sơ phát triển chỉ dùng nội bộ và luôn ẩn khỏi cửa hàng. Catalog đang bán được đối chiếu riêng từ dữ liệu hiện có.</p>
    {error && <div className={styles.error} role="alert"><p>{error}</p><button type="button" disabled={loading || busy} onClick={load}>Tải lại dữ liệu, giữ nội dung đang nhập</button></div>}
    {notice && <p className={styles.notice} role="status">{notice}</p>}
    <div className={styles.counts}><div><span>Hồ sơ phát triển nội bộ</span><strong>{loaded ? number(snapshot.projects.length) : "—"}</strong></div><div><span>Đang tìm nhà cung cấp</span><strong>{loaded ? number(snapshot.projects.filter(item => item.lifecycle_stage === "supplier_sourcing").length) : "—"}</strong></div><div><span>Dự án có điểm vướng</span><strong>{loaded ? number(snapshot.projects.filter(item => item.blocker?.trim()).length) : "—"}</strong></div><div><span>Catalog hiện có đang mở bán</span><strong>{loaded ? number(snapshot.catalog.filter(item => item.available === true).length) : "—"}</strong></div></div>
    <nav className={styles.tabs} aria-label="Phân hệ phát triển sản phẩm"><button type="button" disabled={busy || loading} aria-current={view === "projects" ? "page" : undefined} onClick={() => changeView("projects")}>Dự án phát triển</button><button type="button" disabled={busy || loading} aria-current={view === "suppliers" ? "page" : undefined} onClick={() => changeView("suppliers")}>Sổ nhà cung cấp <span>{loaded ? snapshot.suppliers.length : "—"}</span></button></nav>
    <div className={styles.workspace}>
      <PlanningScope/>
      {!loaded && loading && <p className={styles.empty} role="status">Đang đọc hồ sơ phát triển và dữ liệu hiện có…</p>}
      {loaded && <>
        <div className={styles.toolbar}><label className={styles.search}><Search/><span className={styles.srOnly}>Tìm {view === "projects" ? "dự án" : "nhà cung cấp"}</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder={view === "projects" ? "Tìm mã, tên, việc tiếp theo, điểm vướng…" : "Tìm nhà cung cấp, khu vực, công đoạn…"}/></label>{view === "projects" ? <><Field label="Nhóm"><select value={category} onChange={event => setCategory(event.target.value)}><option value="all">Tất cả nhóm</option>{DEVELOPMENT_CATEGORIES.map(item => <option key={item.code} value={item.code}>{item.code} · {item.name}</option>)}</select></Field><Field label="Giai đoạn"><select value={stage} onChange={event => setStage(event.target.value)}><option value="all">Tất cả giai đoạn</option>{Object.entries(STAGES).map(([key, title]) => <option key={key} value={key}>{title}</option>)}{future.map(key => <option key={key} value={key}>{stageLabel(key)} · chỉ xem</option>)}</select></Field></> : <Field label="Trạng thái"><select value={supplierStatus} onChange={event => setSupplierStatus(event.target.value)}><option value="all">Tất cả đầu mối</option>{Object.entries(SUPPLIER_STATES).map(([key, title]) => <option key={key} value={key}>{title}</option>)}</select></Field>}<button className={styles.primary} type="button" disabled={busy || !canEdit} onClick={() => view === "projects" ? openProject("new") : openSupplier("new")}><Plus/>{view === "projects" ? "Thêm dự án" : "Thêm đầu mối"}</button></div>
        {view === "projects" && <div className={styles.listHeader}><span>{projects.length} hồ sơ{category !== "all" ? ` · nhóm ${category}` : ""}</span><div aria-label="Cách xem dự án"><button type="button" aria-pressed={layout === "table"} onClick={() => setLayout("table")}><List/>Bảng</button><button type="button" aria-pressed={layout === "board"} onClick={() => setLayout("board")}><LayoutGrid/>Theo giai đoạn</button></div></div>}
        <div className={styles.desk} data-detail={view === "projects" ? Boolean(selectedProject || projectId === "new") : Boolean(selectedSupplier || supplierId === "new")}>
          <section className={styles.explorer} aria-label={view === "projects" ? "Danh sách dự án" : "Danh sách nhà cung cấp"}>
            {view === "projects" && (projects.length ? layout === "table" ? <div className={styles.tableScroll}><table className={styles.projectTable}><thead><tr><th scope="col">Dự án</th><th scope="col">Giai đoạn / ưu tiên</th><th scope="col">Việc tiếp theo</th><th scope="col">Người phụ trách / hạn</th></tr></thead><tbody>{projects.map(item => <tr key={item.id} data-selected={item.id === projectId}><td><button type="button" className={styles.recordButton} disabled={busy || loading} aria-pressed={item.id === projectId} onClick={() => openProject(item.id)}><small>{item.code} · nhóm {item.category_code}</small><strong>{item.name}</strong></button></td><td><Chip value={item.lifecycle_stage}>{stageLabel(item.lifecycle_stage)}</Chip><small className={styles.cellNote}>Ưu tiên {PRIORITIES[item.priority]?.toLowerCase() || item.priority}</small></td><td><p className={styles.nextTask}>{item.next_task || "Chưa ghi việc tiếp theo"}</p>{item.blocker && <span className={styles.blocker}><CircleAlert/>{item.blocker}</span>}</td><td><span>{owner(item.owner_id)}</span><small className={styles.cellNote}>{date(item.due_date)}</small></td></tr>)}</tbody></table></div> : <div className={styles.board}>{[...Object.keys(STAGES), ...future].map(key => { const group = projects.filter(item => item.lifecycle_stage === key); return <section key={key} className={styles.boardColumn}><header><h3>{stageLabel(key)}</h3><span>{group.length}</span></header>{group.map(item => <button key={item.id} className={styles.boardCard} type="button" disabled={busy || loading} aria-pressed={item.id === projectId} onClick={() => openProject(item.id)}><small>{item.code} · {PRIORITIES[item.priority]}</small><strong>{item.name}</strong><p>{item.next_task || "Chưa ghi việc tiếp theo"}</p>{item.blocker && <span className={styles.blocker}><CircleAlert/>Có điểm vướng</span>}<small>{owner(item.owner_id)} · {date(item.due_date)}</small></button>)}{!group.length && <p className={styles.boardEmpty}>Chưa có hồ sơ</p>}</section>; })}</div> : <p className={styles.empty}>Không có dự án khớp bộ lọc. Thử đổi nhóm, giai đoạn hoặc từ khóa.</p>)}
            {view === "suppliers" && <><p className={styles.directoryNote}>Đầu mối từ brief đang chờ xác minh. Khả năng nhận trà Hoàng Long được giữ ở “Chưa xác minh” đến khi có trao đổi trực tiếp; chưa có báo giá, MOQ hay đối tác được duyệt trong giai đoạn này.</p><div className={styles.supplierList}>{suppliers.map(item => <button type="button" key={item.vendor_id} className={styles.supplierCard} disabled={busy || loading} aria-pressed={item.vendor_id === supplierId} onClick={() => openSupplier(item.vendor_id)}><div><strong>{item.name}</strong><Chip value={item.status}>{SUPPLIER_STATES[item.status] || item.status}</Chip></div><span>{item.region || "Chưa ghi khu vực"}</span><p>{(item.service_capabilities || []).join(" · ") || "Chưa ghi công đoạn"}</p><small className={item.accepts_customer_tea == null ? styles.unknown : undefined}>{ownTea(item.accepts_customer_tea)}</small><p className={styles.nextTask}>{item.next_task || "Chưa ghi việc tiếp theo"}</p><footer><span>{snapshot.project_suppliers.filter(link => link.vendor_id === item.vendor_id).length} dự án liên kết</span><span>Theo dõi: {date(item.next_followup_on)}</span></footer></button>)}</div>{!suppliers.length && <p className={styles.empty}>Không có nhà cung cấp khớp từ khóa hoặc trạng thái đã chọn.</p>}</>}
          </section>
          <div className={styles.detailSlot} ref={detailRef} tabIndex={-1}>
            {view === "projects" ? (selectedProject || projectId === "new") ? <ProjectDetail key={projectId} project={selectedProject} snapshot={snapshot} busy={busy || loading || !canEdit} run={run} onSaved={setProjectId} onSupplier={openSupplier}/> : <div className={styles.detailEmpty}><span className={styles.eyebrow}>Hồ sơ phát triển</span><h2>Chọn một dự án để tiếp tục</h2><p>Xem yêu cầu mẫu, người phụ trách, điểm vướng và các đầu mối đang xem xét.</p><LockKeyhole/><p>Mỗi dự án luôn ẩn khỏi cửa hàng trong giai đoạn 1.</p></div> : (selectedSupplier || supplierId === "new") ? <SupplierDetail key={supplierId} supplier={selectedSupplier} snapshot={snapshot} busy={busy || loading || !canEdit} run={run} onSaved={setSupplierId} onProject={openProject}/> : <div className={styles.detailEmpty}><span className={styles.eyebrow}>Sổ nhà cung cấp</span><h2>Chọn đầu mối để xem hồ sơ</h2><p>Ghi liên hệ, công đoạn dự kiến, việc nhận trà khách cung cấp và lịch theo dõi.</p><p>Liên kết dự án giúp theo dõi ứng viên; chưa xác nhận năng lực hoặc phê duyệt hợp tác.</p></div>}
          </div>
        </div>
        <details className={styles.catalog}><summary><div><span className={styles.eyebrow}>Dữ liệu thương mại hiện có · chỉ đọc</span><strong>Đối chiếu catalog ({snapshot.catalog.length})</strong></div><ChevronDown/></summary><div className={styles.catalogBody}><p className={styles.hint}>Sản phẩm dưới đây lấy từ catalog hiện tại. Hồ sơ nghiên cứu không thay đổi giá, lượng tồn, quy cách hoặc trạng thái bán của các sản phẩm này.</p><div className={styles.catalogGrid}>{snapshot.catalog.map(product => <CatalogRecord key={product.id} product={product}/>)}</div>{!snapshot.catalog.length && <p className={styles.empty}>Chưa có bản ghi catalog để đối chiếu.</p>}<div className={styles.relatedLinks}><Link href="/admin/house">Quản lý catalog tại Nhà <ArrowUpRight/></Link><Link href="/admin/operations">Lô trà và vật tư <ArrowUpRight/></Link><Link href="/admin/recipes">Công thức hiện có <ArrowUpRight/></Link></div></div></details>
      </>}
    </div>
  </main>;
}
