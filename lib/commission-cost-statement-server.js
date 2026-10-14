import "server-only";
import { createClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { readEventEnquiryBody } from "@/lib/event-enquiry";
import { allowedPartnerInviteOrigin } from "@/lib/partner-invites-server";

export const COST_STATEMENT_BUCKET = "partner-cost-statements";
export const COST_STATEMENT_FILE_LIMIT = 5 * 1024 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MIME = new Set(["application/pdf", "image/jpeg", "image/png"]);
const SNAPSHOT_FIELDS = ["commission_basis", "eligible_base", "internal_cost_total", "commission_base", "rate_percent", "calculated_amount"];
const reply = (body, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
const fail = (error, status) => reply({ ok: false, error }, status);
const text = (value, max) => typeof value === "string" && value.length <= max
  ? value.normalize("NFC").replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u206f]/gu, "").trim() : null;
const allowedKeys = (body, keys) => body && typeof body === "object" && !Array.isArray(body) && Object.keys(body).every(key => keys.includes(key));
const reviewedSnapshot = value => allowedKeys(value, SNAPSHOT_FIELDS) && Object.keys(value).length === SNAPSHOT_FIELDS.length
  && ["revenue", "profit"].includes(value.commission_basis)
  && SNAPSHOT_FIELDS.slice(1).every(key => typeof value[key] === "number" && Number.isFinite(value[key]) && value[key] >= 0 && value[key] <= 1000000000000)
  && value.rate_percent <= 100 && Number.isInteger(value.calculated_amount);

async function defaultUserClient(request) {
  const header = request.headers.get("authorization") || "";
  if (!header.startsWith("Bearer ") || header.length > 20000) return null;
  const token = header.slice(7).trim();
  if (!token) return null;
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data?.user?.id || !data.user.email || !data.user.email_confirmed_at || data.user.is_anonymous) return null;
  return { client, user: data.user };
}

// All DB RPCs use the verified caller's JWT, retaining SQL ownership/staleness
// checks. Only the already-authorized file operation uses server storage access.
export async function handleCommissionCostStatement(request, commissionId, { authenticate = defaultUserClient, storageClient = createAdminClient } = {}) {
  if (!UUID.test(commissionId || "")) return fail("not_found", 404);
  if (request.method === "POST" && !allowedPartnerInviteOrigin(request)) return fail("not_authorised", 403);
  let auth;
  try { auth = await authenticate(request); } catch { return fail("unavailable", 503); }
  if (!auth?.user?.id || !auth.user.email || !auth.user.email_confirmed_at || auth.user.is_anonymous) return fail("not_authenticated", 401);
  const { client } = auth;
  let manager = false;
  try {
    const result = await client.from("staff_roles").select("role").eq("user_id", auth.user.id).maybeSingle();
    if (result.error) return fail("unavailable", 503);
    manager = ["admin", "manager"].includes(result.data?.role);
  } catch { return fail("unavailable", 503); }
  if (request.method === "POST" && !manager) return fail("not_authorised", 403);
  let view;
  try {
    const result = await client.rpc("partner_network_cost_statement_view", { p_commission_id: commissionId });
    if (result.error || !result.data?.order_id) return fail("not_found", 404);
    view = result.data;
    if (!manager && (view.available === false || view.published !== true || view.stale === true)) return fail("not_found", 404);
  } catch { return fail("unavailable", 503); }

  try {
    if (request.method === "GET") {
      const evidenceId = new URL(request.url).searchParams.get("evidence");
      if (evidenceId) {
        if (!UUID.test(evidenceId)) return fail("not_found", 404);
        const { data: file, error } = await client.rpc("partner_network_cost_evidence_access", { p_id: evidenceId });
        if (error || !file?.storage_path || file.id !== evidenceId || file.order_id !== view.order_id) return fail("not_found", 404);
        const { data: signed, error: signedError } = await storageClient().storage.from(COST_STATEMENT_BUCKET)
          .createSignedUrl(file.storage_path, 60, { download: file.file_name });
        if (signedError || !signed?.signedUrl) return fail("file_unavailable", 503);
        return reply({ ok: true, url: signed.signedUrl });
      }
      // Never serialize the raw RPC object: paths/actor IDs are server details.
      const file = value => value && UUID.test(value.id || "") ? { id: value.id, file_name: value.file_name, content_type: value.content_type } : null;
      const snapshot = value => value && typeof value === "object" && !Array.isArray(value) ? Object.fromEntries(SNAPSHOT_FIELDS.map(key => [key, value[key] ?? null])) : null;
      const draft = manager ? file(view.draft_evidence) : null;
      return reply({ ok: true, statement: {
        published: view.published === true, stale: view.stale === true, summary: view.summary || "",
        snapshot: snapshot(view.snapshot), published_at: view.published_at || null,
        evidence: file(view.evidence), ...(manager ? { draft_evidence: draft ? { ...draft, status: view.draft_evidence.status === "ready" ? "ready" : "pending" } : null,
          preview_snapshot: snapshot(view.preview_snapshot) } : {}),
      } });
    }
    if (request.method !== "POST") return fail("not_authorised", 405);
    const body = await readEventEnquiryBody(request).catch(() => null);
    if (!body) return fail("invalid_request", 400);
    if (body.action === "prepare") {
      if (!allowedKeys(body, ["action", "fileName", "contentType", "size"]) || !MIME.has(body.contentType)
        || !Number.isInteger(body.size) || body.size < 1 || body.size > COST_STATEMENT_FILE_LIMIT) return fail("invalid_file", 400);
      const filename = text(body.fileName, 160)?.replace(/[<>:"/\\|?*]/g, "_");
      if (!filename) return fail("invalid_file", 400);
      const { data: file, error } = await client.rpc("partner_network_prepare_cost_evidence", {
        p_order_id: view.order_id, p_file_name: filename, p_content_type: body.contentType, p_expected_size: body.size,
      });
      if (error || !file?.storage_path || !UUID.test(file.id || "")) return fail("upload_failed", 409);
      const { data: signed, error: signedError } = await storageClient().storage.from(COST_STATEMENT_BUCKET).createSignedUploadUrl(file.storage_path);
      if (signedError || !signed?.token) return fail("upload_failed", 503);
      return reply({ ok: true, evidenceId: file.id, path: file.storage_path, token: signed.token });
    }
    if (body.action === "finalize") {
      if (!allowedKeys(body, ["action", "evidenceId"]) || !UUID.test(body.evidenceId || "")) return fail("invalid_file", 400);
      const { data: file, error } = await client.rpc("partner_network_cost_evidence_access", { p_id: body.evidenceId });
      if (error || !file?.storage_path || file.id !== body.evidenceId || file.order_id !== view.order_id) return fail("not_found", 404);
      const { data: info, error: infoError } = await storageClient().storage.from(COST_STATEMENT_BUCKET).info(file.storage_path);
      if (infoError || !info || !Number.isInteger(Number(info.size)) || Number(info.size) < 1
        || Number(info.size) > COST_STATEMENT_FILE_LIMIT || Number(info.size) !== Number(file.expected_size)
        || info.mimetype !== file.content_type || !MIME.has(info.mimetype)) return fail("file_mismatch", 409);
      const result = await client.rpc("partner_network_finalize_cost_evidence", { p_id: body.evidenceId, p_actual_size: Number(info.size) });
      if (result.error) return fail("file_mismatch", 409);
      return reply({ ok: true, evidence: { id: file.id, file_name: file.file_name, content_type: file.content_type } });
    }
    if (body.action === "publish") {
      const summary = text(body.summary, 2000);
      if (!allowedKeys(body, ["action", "summary", "evidenceId", "contentReviewed", "expectedSnapshot"]) || !summary || body.contentReviewed !== true || !reviewedSnapshot(body.expectedSnapshot)
        || (body.evidenceId !== null && body.evidenceId !== undefined && !UUID.test(body.evidenceId))) return fail("review_required", 400);
      const result = await client.rpc("partner_network_cost_statement", { p_order_id: view.order_id, p_action: "publish",
        p_input: { summary, evidence_id: body.evidenceId || null, content_reviewed: true, expected_snapshot: body.expectedSnapshot } });
      if (result.error) return fail("statement_changed", 409);
      return reply({ ok: true });
    }
    if (body.action === "withdraw") {
      const reason = text(body.reason, 1000);
      if (!allowedKeys(body, ["action", "reason"]) || !reason || reason.length < 10) return fail("reason_required", 400);
      const result = await client.rpc("partner_network_cost_statement", { p_order_id: view.order_id, p_action: "withdraw", p_input: { reason } });
      if (result.error) return fail("statement_changed", 409);
      return reply({ ok: true });
    }
    return fail("invalid_request", 400);
  } catch { return fail("unavailable", 503); }
}
