import { authenticateManagerRequest } from "@/lib/staff-api-auth";
import { canCallStaffApi, workspaceModules } from "@/lib/staff-workspace";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DOCUMENT_TEMPLATES, normalizeDocumentDraft } from "@/lib/company-documents";
import { B2B_DOCUMENT_TEMPLATES } from "@/lib/b2b-document-drafts";
import {
  B2B_BUCKET, b2bData, isClosedOrder, readB2BContext,
  validDocumentId, validKind, validRecordId, validSeller,
} from "@/lib/b2b-workflow-server";

const JSON_LIMIT = 192 * 1024;
const FILE_LIMIT = 10 * 1024 * 1024;
const MIME_EXTENSION = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};
const LEGAL_KEYS = ["legalName", "taxId", "address", "representative", "title", "contact"];
const SELLER_KEYS = [...LEGAL_KEYS, "bankName", "bankAccount", "bankHolder"];
const reply = (body, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
const fail = (error, status = 400) => reply({ ok: false, error }, status);
const own = (value, key) => Object.hasOwn(value, key);
const canManageDocuments = staff => {
  const modules = workspaceModules(staff.staff);
  return modules === null || modules.includes("documents");
};

function knownError(error) {
  const codes = {
    b2b_manager_required: [403, "forbidden"],
    b2b_order_not_found: [404, "order_unavailable"],
    b2b_customer_not_classified: [409, "customer_not_classified"],
    b2b_order_identity_locked: [409, "order_identity_locked"],
    b2b_issued_invoice_locked: [409, "issued_invoice_locked"],
    b2b_document_not_found: [409, "document_changed"],
    b2b_completed_document_immutable: [409, "document_changed"],
    b2b_document_order_mismatch: [409, "document_changed"],
    b2b_document_file_missing: [409, "uploaded_file_mismatch"],
    b2b_framework_dates_required: [422, "framework_dates_required"],
    b2b_issued_invoice_required: [422, "issued_invoice_required"],
    b2b_ineligible_order: [409, "ineligible_order"],
    b2b_invalid_vat: [400, "invalid_vat"],
    b2b_invalid_seller: [400, "invalid_seller"],
    "22008": [422, "invalid_document"],
    "22007": [422, "invalid_document"],
    "23505": [409, "document_changed"],
  };
  const [status, message] = codes[error?.message] || codes[error?.code] || [500, "save_failed"];
  return fail(message, status);
}

async function permitted(request) {
  if (request.headers.has("authorization")) {
    const staff = await authenticateManagerRequest(request);
    return staff?.user.email_confirmed_at && !staff.user.is_anonymous ? staff : null;
  }
  const url = new URL(request.url);
  if (request.method !== "GET" && request.headers.get("origin") !== url.origin) return null;
  const db = await createClient();
  const { data, error } = await db.auth.getUser();
  const user = data?.user;
  if (error || !user?.email_confirmed_at || user.is_anonymous) return null;
  const { data: staff, error: roleError } = await db.from("staff_roles")
    .select("role,workspace_modules").eq("user_id", user.id).maybeSingle();
  if (roleError || !["admin", "manager"].includes(staff?.role) || !canCallStaffApi(staff, url.pathname)) return null;
  return { admin: createAdminClient(), user, staff };
}

async function input(request) {
  const raw = await request.text();
  if (Buffer.byteLength(raw, "utf8") > JSON_LIMIT) return null;
  const data = JSON.parse(raw);
  return data && typeof data === "object" && !Array.isArray(data) ? data : null;
}

function cleanDetails(details, keys) {
  if (!details || typeof details !== "object" || Array.isArray(details)
    || Object.keys(details).some(key => !keys.includes(key))
    || Object.values(details).some(value => typeof value !== "string" || value.length > 500)) return null;
  return Object.fromEntries(Object.entries(details).map(([key, value]) => [key, value.trim()]));
}

function cleanDraft(kind, draft) {
  const templateId = B2B_DOCUMENT_TEMPLATES[kind];
  const template = DOCUMENT_TEMPLATES.find(item => item.id === templateId);
  if (!template || !draft || typeof draft !== "object" || Array.isArray(draft)) return null;
  const fields = Object.fromEntries(template.fields.filter(key => own(draft, key)).map(key => [key, draft[key]]));
  const result = normalizeDocumentDraft({ ...fields, template_id: templateId });
  if (!result.data || Object.keys(result.errors || {}).length) return null;
  return Object.fromEntries(template.fields.map(key => [key, result.data[key]]));
}

async function documentScope(db, body) {
  if (!validKind(body.kind) || !validSeller(body.sellerId)) return null;
  if (body.kind === "framework") {
    if (!validRecordId(body.customerId)) return null;
    const customer = await b2bData(db.from("trade_opportunities").select("id,is_b2b").eq("id", body.customerId).maybeSingle());
    return customer?.is_b2b ? { opportunity_id: customer.id, order_id: null, kind: body.kind, seller_id: body.sellerId } : null;
  }
  if (!validRecordId(body.orderId)) return null;
  const [order, workflow] = await Promise.all([
    b2bData(db.from("orders").select("id,status,stage").eq("id", body.orderId).maybeSingle()),
    b2bData(db.from("b2b_order_workflows").select("order_id,opportunity_id,seller_id").eq("order_id", body.orderId).maybeSingle()),
  ]);
  if (!order || isClosedOrder(order) || !workflow || workflow.seller_id !== body.sellerId) return null;
  return { opportunity_id: workflow.opportunity_id, order_id: order.id, kind: body.kind, seller_id: body.sellerId };
}

function draftQuery(db, scope) {
  let query = db.from("b2b_documents").select("id,draft,updated_at,status")
    .eq("status", "draft").eq("kind", scope.kind).eq("seller_id", scope.seller_id);
  query = scope.opportunity_id ? query.eq("opportunity_id", scope.opportunity_id) : query.is("opportunity_id", null);
  query = scope.order_id ? query.eq("order_id", scope.order_id) : query.is("order_id", null);
  return query.maybeSingle();
}

function inScope(row, scope) {
  return row && row.kind === scope.kind && row.seller_id === scope.seller_id
    && row.order_id === scope.order_id && row.opportunity_id === scope.opportunity_id;
}

export async function GET(request) {
  const staff = await permitted(request);
  if (!staff) return fail("forbidden", 403);
  const params = new URL(request.url).searchParams;
  try {
    if (params.has("document")) {
      if (!canManageDocuments(staff)) return fail("forbidden", 403);
      const id = params.get("document");
      if (!validDocumentId(id)) return fail("invalid_document");
      const evidence = await b2bData(staff.admin.from("b2b_documents").select("file_path,file_name,status").eq("id", id).maybeSingle());
      if (evidence?.status !== "complete" || !evidence.file_path) return fail("document_unavailable", 404);
      const result = await b2bData(staff.admin.storage.from(B2B_BUCKET).createSignedUrl(evidence.file_path, 60, { download: evidence.file_name }));
      return reply({ url: result.signedUrl });
    }
    const orderId = params.get("order"), customerId = params.get("customer");
    if ((orderId && !validRecordId(orderId)) || (customerId && !validRecordId(customerId)) || (orderId && customerId)) return fail("invalid_reference");
    const context = await readB2BContext(staff.admin, { orderId, customerId, documents: false });
    return context ? reply(context) : fail("not_found", 404);
  } catch {
    return fail("read_failed", 500);
  }
}

export async function PATCH(request) {
  const staff = await permitted(request);
  if (!staff) return fail("forbidden", 403);
  const body = await input(request).catch(() => null);
  if (!body) return fail("invalid_request");
  const db = staff.admin;
  try {
    if (body.action === "save_seller") {
      if (!canManageDocuments(staff)) return fail("forbidden", 403);
      const details = cleanDetails(body.details, SELLER_KEYS);
      if (!details || !validSeller(body.sellerId)) return fail("invalid_seller");
      const seller = await b2bData(db.from("b2b_selling_entities").update({ details, updated_at: new Date().toISOString() })
        .eq("id", body.sellerId).select("id,label,details").single());
      return reply({ ok: true, seller });
    }
    if (body.action === "save_draft") {
      if (!canManageDocuments(staff)) return fail("forbidden", 403);
      const scope = await documentScope(db, body);
      const draft = cleanDraft(body.kind, body.draft);
      if (!scope || !draft) return fail("invalid_document", 422);
      const existing = await b2bData(draftQuery(db, scope));
      if ((body.draftId && body.draftId !== existing?.id) || (body.updatedAt && body.updatedAt !== existing?.updated_at)) return fail("document_changed", 409);
      const table = db.from("b2b_documents");
      const saved = existing
        ? table.update({ draft, opportunity_id: scope.opportunity_id, updated_at: new Date().toISOString() }).eq("id", existing.id).eq("status", "draft").eq("updated_at", existing.updated_at)
        : table.insert({ ...scope, draft, created_by: staff.user.id });
      const document = await b2bData(saved.select().maybeSingle());
      return document ? reply({ ok: true, document }) : fail("document_changed", 409);
    }
    if (own(body, "isB2B") || own(body, "legal")) {
      if (!validRecordId(body.customerId)) return fail("invalid_customer");
      const change = {};
      if (own(body, "isB2B")) {
        if (typeof body.isB2B !== "boolean") return fail("invalid_customer");
        change.is_b2b = body.isB2B;
      }
      if (own(body, "legal")) {
        change.b2b_legal = cleanDetails(body.legal, LEGAL_KEYS);
        if (!change.b2b_legal) return fail("invalid_customer");
      }
      const customer = await b2bData(db.from("trade_opportunities").update(change).eq("id", body.customerId)
        .select("id,is_b2b,b2b_legal").maybeSingle());
      return customer ? reply({ ok: true, customer }) : fail("not_found", 404);
    }
    if (!validRecordId(body.orderId) || (own(body, "customerId") && !validRecordId(body.customerId))
      || (own(body, "sellerId") && !validSeller(body.sellerId))) return fail("invalid_order");
    const inputVat = body.vatPercent;
    const vat = inputVat == null || inputVat === "" ? null : Number(inputVat);
    if (vat !== null && (!["number", "string"].includes(typeof inputVat)
      || !Number.isFinite(vat) || vat < 0 || vat > 100 || Math.abs(vat * 100 - Math.round(vat * 100)) > 1e-8)) return fail("invalid_vat");
    const workflow = await b2bData(db.rpc("b2b_update_order_workflow", {
      p_order_id: body.orderId, p_actor: staff.user.id, p_customer_id: body.customerId || null,
      p_seller_id: body.sellerId || null, p_vat_percent: vat,
    }));
    return reply({ ok: true, workflow });
  } catch (error) {
    return knownError(error);
  }
}

export async function POST(request) {
  const staff = await permitted(request);
  if (!staff || !canManageDocuments(staff)) return fail("forbidden", 403);
  const body = await input(request).catch(() => null);
  if (!body || !["prepare", "finalize"].includes(body.action)) return fail("invalid_request");
  const extension = own(MIME_EXTENSION, body.contentType) ? MIME_EXTENSION[body.contentType] : null;
  if (!extension || (body.kind === "vat_invoice" && extension === "docx") || !Number.isInteger(body.size)
    || body.size < 1 || body.size > FILE_LIMIT || typeof body.fileName !== "string") return fail("invalid_file");
  const fileName = body.fileName.trim().replace(/[^\p{L}\p{N} ._-]/gu, "-").slice(0, 150);
  if (!fileName) return fail("invalid_file");
  const db = staff.admin;
  try {
    const scope = await documentScope(db, body);
    if (!scope) return fail("invalid_document", 409);
    if (body.action === "prepare") {
      const existing = await b2bData(draftQuery(db, scope));
      const document = existing || await b2bData(db.from("b2b_documents").insert({ ...scope, created_by: staff.user.id }).select("id").single());
      const path = `${document.id}/${staff.user.id}/${crypto.randomUUID()}.${extension}`;
      const upload = await b2bData(db.storage.from(B2B_BUCKET).createSignedUploadUrl(path, { upsert: false }));
      return reply({ bucket: B2B_BUCKET, documentId: document.id, path, token: upload.token });
    }
    if (!validDocumentId(body.documentId) || typeof body.path !== "string") return fail("invalid_file");
    const parts = body.path.split("/");
    if (parts.length !== 3 || parts[0] !== body.documentId || parts[1] !== staff.user.id
      || !parts[2].endsWith(`.${extension}`) || !validDocumentId(parts[2].split(".")[0]) || parts[2].split(".").length !== 2) return fail("invalid_file");
    const document = await b2bData(db.from("b2b_documents").select("id,kind,seller_id,order_id,opportunity_id").eq("id", body.documentId).maybeSingle());
    if (!inScope(document, scope)) return fail("document_changed", 409);
    const { data: file, error: fileError } = await db.storage.from(B2B_BUCKET).info(body.path);
    if (fileError || !file || Number(file.size) !== body.size || file.mimetype !== body.contentType) return fail("uploaded_file_mismatch", 409);
    const metadata = [
      ["validFrom", 10], ["validUntil", 10], ["invoiceDate", 10], ["invoiceNumber", 100], ["documentRef", 140],
    ];
    if (metadata.some(([key, max]) => body[key] != null && (typeof body[key] !== "string" || body[key].length > max))) return fail("invalid_document");
    for (const key of ["validFrom", "validUntil", "invoiceDate"]) {
      if (body[key] && !/^\d{4}-\d{2}-\d{2}$/.test(body[key])) return fail("invalid_document");
    }
    const completed = await b2bData(db.rpc("b2b_complete_document", {
      p_id: document.id, p_actor: staff.user.id, p_file_path: body.path, p_file_name: fileName,
      p_valid_from: scope.kind === "framework" ? body.validFrom || null : null,
      p_valid_until: scope.kind === "framework" ? body.validUntil || null : null,
      p_invoice_date: scope.kind === "vat_invoice" ? body.invoiceDate || null : null,
      p_invoice_number: scope.kind === "vat_invoice" ? body.invoiceNumber?.trim() || null : null,
      p_document_ref: body.documentRef?.trim() || null,
    }));
    return reply({ ok: true, document: completed });
  } catch (error) {
    return knownError(error);
  }
}
