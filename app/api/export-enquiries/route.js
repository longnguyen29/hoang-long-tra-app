import { POST as submitContactEnquiry } from "../event-enquiries/route.js";
import { allowedEventEnquiryOrigin, readEventEnquiryBody } from "@/lib/event-enquiry";
import { exportEventInput } from "@/lib/export-enquiry";

export const runtime = "nodejs";
const fail = (error, status = 400) => Response.json({ ok: false, error }, {
  status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
});

export async function POST(request) {
  if (!allowedEventEnquiryOrigin(request)) return fail("invalid_request", 403);
  let input;
  try { input = exportEventInput(await readEventEnquiryBody(request)); }
  catch (error) {
    const codes = ["consent_required", "authorization_required", "tea_required", "contact_detail_required", "invalid_quantity", "invalid_date", "note_too_long", "invalid_submitter_role", "connector_name_required", "invalid_connector_contact"];
    return fail(codes.includes(error.message) ? error.message : "invalid_request");
  }
  const headers = new Headers(request.headers);
  headers.delete("content-length");
  // Keep the existing server-only transaction, contact validation, trusted IP
  // throttles, idempotent retries and private response boundary in one place.
  return submitContactEnquiry(new Request(request.url, { method: "POST", headers, body: JSON.stringify(input) }));
}
