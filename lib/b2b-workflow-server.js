import "server-only";
import { B2B_STEPS, frameworkIsValid, workflowProgress } from "./b2b-customer-workflow.js";

const ORDER_FIELDS = "id,ts,type,stage,status,health,customer_name,contact,address,tax_number,lines,estimated_total,payment_method,promo,retail_pricing";
const CUSTOMER_FIELDS = "id,business_name,is_b2b,b2b_legal,contact,preferred_contact,delivery_address";
const WORKFLOW_FIELDS = "order_id,opportunity_id,seller_id,vat_percent,framework_id";
const DOCUMENT_FIELDS = "id,kind,status,opportunity_id,order_id,seller_id,valid_from,valid_until,invoice_number,invoice_date,document_ref,file_path,file_name,draft,created_at,updated_at,completed_at";
const DOCUMENT_STATUS_FIELDS = DOCUMENT_FIELDS.replace(",draft", "").replace(",file_name", "");
const CLOSED = new Set(["cancelled", "canceled", "deleted", "rejected", "void"]);
const localDate = value => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).format(value);

export const B2B_BUCKET = "b2b-private-documents";
export const validRecordId = id => typeof id === "string" && /^[a-z0-9_.-]{1,160}$/i.test(id);
export const validDocumentId = id => typeof id === "string" && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id);
export const validSeller = id => id === "hoang-long" || id === "green-hill";
export const validKind = value => B2B_STEPS.some(step => step.key === value);
export const isClosedOrder = order => CLOSED.has(order?.status) || CLOSED.has(order?.stage);

export async function b2bData(query) {
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

async function readPages(query) {
  const rows = [];
  for (let start = 0;; start += 500) {
    const page = await b2bData(query().range(start, start + 499));
    rows.push(...page);
    if (page.length < 500) return rows;
  }
}

const docForProgress = document => ({ ...document, file_id: document.file_path });
const by = (rows, key) => Map.groupBy(rows, row => row[key]);
const skip = () => Promise.resolve([]);

function summarizeOrder(order, workflow, customer, documents, frameworks) {
  const today = localDate(new Date());
  const sellerDocuments = documents.filter(document => document.seller_id === workflow?.seller_id);
  const sellerFrameworks = customer && workflow?.seller_id
    ? frameworks.filter(document => document.seller_id === workflow.seller_id) : [];
  const pinned = sellerFrameworks.find(document => document.id === workflow?.framework_id);
  const orderDate = order.ts && !Number.isNaN(Date.parse(order.ts)) ? localDate(new Date(order.ts)) : today;
  const valid = pinned ? [pinned] : sellerFrameworks.filter(document => (
    [today, orderDate].some(date => frameworkIsValid(docForProgress(document), date))
  )).sort((a, b) => b.valid_from.localeCompare(a.valid_from) || String(b.completed_at).localeCompare(String(a.completed_at)));
  // A completed order keeps its signed framework even when that agreement later expires.
  const progress = workflowProgress({
    date: valid[0]?.valid_from || today,
    documents: sellerDocuments.map(docForProgress),
    frameworks: valid.map(docForProgress),
  });
  const attention = !progress.done && (
    !workflow?.seller_id || !customer || (!customer.is_b2b && !valid.length) || order.health === "blocked"
    || ["completed", "shipped", "delivered"].includes(order.status)
    || ["completed", "shipping"].includes(order.stage)
    || (sellerFrameworks.some(document => document.status === "complete") && !valid.length)
  );
  const nextAction = progress.done ? null : !customer ? "Nối hồ sơ khách"
    : !customer.is_b2b && !valid.length ? "Phân loại khách doanh nghiệp"
      : !workflow?.seller_id ? "Chọn pháp nhân bán"
        : progress.next?.key === "vat_invoice" && workflow.vat_percent == null ? "Chọn thuế suất VAT"
          : progress.next?.label;
  return { order, workflow, customer, documents, frameworks, frameworkDocument: valid[0] || null, progress, attention, nextAction };
}

export async function readB2BContext(db, { orderId, customerId, documents: includeDrafts = true } = {}) {
  const sellersQuery = b2bData(db.from("b2b_selling_entities").select(includeDrafts ? "id,label,details" : "id,label").order("label"));
  const documentProjection = includeDrafts ? DOCUMENT_FIELDS : DOCUMENT_STATUS_FIELDS;
  if (orderId) {
    const [order, workflow, documents, sellers] = await Promise.all([
      b2bData(db.from("orders").select(ORDER_FIELDS).eq("id", orderId).maybeSingle()),
      b2bData(db.from("b2b_order_workflows").select(WORKFLOW_FIELDS).eq("order_id", orderId).maybeSingle()),
      b2bData(db.from("b2b_documents").select(documentProjection).eq("order_id", orderId).order("created_at", { ascending: false })),
      sellersQuery,
    ]);
    if (!order) return null;
    const owner = workflow?.opportunity_id;
    const [customer, frameworks, customers] = await Promise.all([
      owner ? b2bData(db.from("trade_opportunities").select(CUSTOMER_FIELDS).eq("id", owner).maybeSingle()) : null,
      owner ? b2bData(db.from("b2b_documents").select(documentProjection).eq("opportunity_id", owner).eq("kind", "framework").order("created_at", { ascending: false })) : [],
      !owner && workflow ? readPages(() => db.from("trade_opportunities").select("id,business_name").eq("is_b2b", true).order("business_name").order("id")) : [],
    ]);
    const scopedDocuments = documents.filter(document => document.status === "complete"
      || document.opportunity_id === (owner || null));
    return { ...summarizeOrder(order, workflow, customer, scopedDocuments, frameworks), sellers, customers };
  }
  if (customerId) {
    const [customer, frameworks, workflows, sellers] = await Promise.all([
      b2bData(db.from("trade_opportunities").select(CUSTOMER_FIELDS).eq("id", customerId).maybeSingle()),
      b2bData(db.from("b2b_documents").select(documentProjection).eq("opportunity_id", customerId).eq("kind", "framework").order("created_at", { ascending: false })),
      readPages(() => db.from("b2b_order_workflows").select(WORKFLOW_FIELDS).eq("opportunity_id", customerId).order("order_id")),
      sellersQuery,
    ]);
    if (!customer) return null;
    return {
      customer, frameworks, sellers, orders: await summarizeWorkflows(db, workflows, { customer, frameworks }),
      progress: workflowProgress({ date: localDate(new Date()), frameworks: frameworks.map(docForProgress) }),
    };
  }
  const workflows = await readPages(() => db.from("b2b_order_workflows").select(WORKFLOW_FIELDS).order("order_id"));
  const [orders, sellers] = await Promise.all([summarizeWorkflows(db, workflows), sellersQuery]);
  return { orders, sellers, counts: {
    active: orders.filter(item => !item.progress.done && !item.attention).length,
    attention: orders.filter(item => item.attention).length,
    done: orders.filter(item => item.progress.done).length,
  }};
}

async function summarizeWorkflows(db, workflows, profile) {
  const batches = [];
  for (let offset = 0; offset < workflows.length; offset += 100) batches.push(workflows.slice(offset, offset + 100));
  const result = [];
  for (const batch of batches) {
    const orders = batch.map(row => row.order_id);
    const owners = [...new Set(batch.map(row => row.opportunity_id).filter(Boolean))];
    const [orderRows, documentRows, customers, frameworks] = await Promise.all([
      b2bData(db.from("orders").select("id,ts,type,stage,status,health,customer_name").in("id", orders)),
      readPages(() => db.from("b2b_documents").select(DOCUMENT_STATUS_FIELDS).in("order_id", orders).order("id")),
      profile ? [profile.customer] : owners.length ? b2bData(db.from("trade_opportunities").select("id,business_name,is_b2b").in("id", owners)) : skip(),
      profile ? profile.frameworks : owners.length ? readPages(() => db.from("b2b_documents").select(DOCUMENT_STATUS_FIELDS).eq("kind", "framework").in("opportunity_id", owners).order("id")) : skip(),
    ]);
    const orderIndex = new Map(orderRows.map(row => [row.id, row]));
    const customerIndex = new Map(customers.map(row => [row.id, row]));
    const documentIndex = by(documentRows, "order_id");
    const frameworkIndex = by(frameworks, "opportunity_id");
    for (const workflow of batch) {
      const order = orderIndex.get(workflow.order_id);
      if (!order || isClosedOrder(order)) continue;
      const customer = customerIndex.get(workflow.opportunity_id) || null;
      const row = summarizeOrder(order, workflow, customer, documentIndex.get(order.id) || [], frameworkIndex.get(customer?.id) || []);
      // A profile/overview only needs progress and routing information.
      result.push({
        order, workflow, customer: customer ? { id: customer.id, business_name: customer.business_name, is_b2b: customer.is_b2b } : null,
        progress: row.progress, attention: row.attention, nextAction: row.nextAction,
      });
    }
  }
  return result.sort((a, b) => Date.parse(b.order.ts) - Date.parse(a.order.ts));
}
