import { createAdminClient } from "@/lib/supabase/admin";
import { allowedEventEnquiryOrigin, eventEnquiryReference, eventEnquiryThrottleKeys,
  normalizeEventEnquiry, readEventEnquiryBody } from "@/lib/event-enquiry";

export const runtime = "nodejs";
const reply = (body, status, headers = {}) => Response.json(body, {
  status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...headers },
});
const fail = (error, status = 400) => reply({ ok: false, error }, status);

export async function POST(request) {
  if (!allowedEventEnquiryOrigin(request)) return fail("invalid_request", 403);
  let input;
  try { input = normalizeEventEnquiry(await readEventEnquiryBody(request)); }
  catch (error) {
    return fail(["invalid_contact", "consent_required"].includes(error.message) ? error.message : "invalid_request");
  }
  try {
    const secret = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    if (!secret || !process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()) return fail("unavailable", 503);
    const throttle = eventEnquiryThrottleKeys(request.headers, secret);
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("submit_event_enquiry", {
      p_request_id: input.requestId, p_name: input.name, p_business: input.business,
      p_contact: input.contact, p_intent: input.intent, p_note: input.note,
      p_source: input.source, p_medium: input.medium, p_campaign: input.campaign,
      p_consent: true, p_throttle_key: throttle.key, p_previous_throttle_key: throttle.previousKey,
    });
    if (error) {
      if (error.message?.includes("event_enquiry_rate_limited")) {
        return reply({ ok: false, error: "rate_limited" }, 429, { "Retry-After": "1800" });
      }
      if (error.message?.includes("event_enquiry_retry_conflict") || error.message?.includes("invalid_event_enquiry")) {
        return fail("invalid_request");
      }
      return fail("unavailable", 503);
    }
    if (!data || data.request_id !== input.requestId || typeof data.is_new !== "boolean") return fail("unavailable", 503);
    return reply({ ok: true, reference: eventEnquiryReference(input.requestId), requestId: input.requestId }, data.is_new ? 201 : 200);
  } catch { return fail("unavailable", 503); }
}
