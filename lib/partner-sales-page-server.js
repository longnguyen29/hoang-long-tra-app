import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { partnerNetworkEnabled } from "@/lib/partner-network-server";
import { parsePublicPartnerSalesPage, isPartnerSalesPageSlug } from "@/lib/partner-sales-page";
import { allowedEventEnquiryOrigin, eventEnquiryReference, eventEnquiryThrottleKeys, normalizeEventEnquiry } from "@/lib/event-enquiry";
import { EXPORT_TEAS } from "@/lib/export-teas";

// Request-scoped memoization only: withdrawing a page never leaves a cached
// public contact or an accepting intake endpoint behind.
export const getPublicPartnerSalesPage = cache(async slug => {
  if (!partnerNetworkEnabled() || !isPartnerSalesPageSlug(slug)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("partner_network_public_sales_page", { p_slug: slug });
  if (error) throw new Error("partner_sales_page_unavailable");
  return parsePublicPartnerSalesPage(data);
});

const reply = (body, status, headers = {}) => Response.json(body, { status, headers: {
  "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...headers,
} });

export async function submitPartnerSalesPageEnquiry(request, raw, exported, {
  enabled = partnerNetworkEnabled, adminClient = createAdminClient,
  secret = () => process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
} = {}) {
  if (!enabled()) return reply({ ok: false, error: "page_unavailable" }, 404);
  if (!allowedEventEnquiryOrigin(request)) return reply({ ok: false, error: "invalid_request" }, 403);
  let normalized;
  const page = raw?.partnerPage;
  try {
    if (!page || typeof page !== "object" || Array.isArray(page)
      || Object.keys(page).some(key => !["slug", "revision"].includes(key))
      || !isPartnerSalesPageSlug(page.slug) || !Number.isInteger(page.revision) || page.revision < 1 || page.revision > 2147483647
      || ["partner_id", "partnerId", "partnerCode", "commission", "approved"].some(key => Object.hasOwn(raw, key))) throw new Error("invalid_request");
    if (raw.partnerConsent !== true) throw new Error("partner_consent_required");
    const location = typeof raw.location === "string" ? raw.location.normalize("NFC").replace(/[\u0000-\u001f\u007f]/g, "").trim() : "";
    if (!location || location.length > 160 || raw.location.length > 160) throw new Error("location_required");
    normalized = { ...normalizeEventEnquiry(exported), location };
  } catch (error) {
    return reply({ ok: false, error: ["partner_consent_required", "location_required", "invalid_contact"].includes(error.message) ? error.message : "invalid_request" }, 400);
  }
  try {
    const key = secret();
    if (!key) return reply({ ok: false, error: "unavailable" }, 503);
    const throttle = eventEnquiryThrottleKeys(request.headers, key);
    const productInterest = EXPORT_TEAS.filter(tea => raw.teaIds.includes(tea.id)).map(tea => tea.name.vi).join(", ");
    const quantity = raw.quantityKg?.trim() ? Number(raw.quantityKg) : null;
    const { data, error } = await adminClient().rpc("partner_network_submit_page_enquiry", {
      p_slug: page.slug, p_revision: page.revision, p_input: {
        request_id: normalized.requestId, name: normalized.name, business: normalized.business,
        contact: normalized.contact, intent: normalized.intent, note: normalized.note,
        source: "website", medium: "referral", campaign: normalized.campaign, consent: true,
        throttle_key: throttle.key, previous_throttle_key: throttle.previousKey,
        location: normalized.location, product_interest: productInterest,
        tea_ids: EXPORT_TEAS.filter(tea => raw.teaIds.includes(tea.id)).map(tea => tea.id),
        requested_quantity_kg: quantity, desired_date: raw.desiredDate?.trim() || null, partner_consent: true,
      },
    });
    if (error) {
      const message = error.message || "";
      if (message.includes("rate_limited")) return reply({ ok: false, error: "rate_limited" }, 429, { "Retry-After": "1800" });
      if (/page.*(unavailable|not_found|revision|changed)|revision.*(changed|mismatch)/i.test(message)) return reply({ ok: false, error: "page_unavailable" }, 409);
      if (/invalid_|retry_conflict|consent_required/.test(message)) return reply({ ok: false, error: "invalid_request" }, 400);
      return reply({ ok: false, error: "unavailable" }, 503);
    }
    if (!data || data.request_id !== normalized.requestId || typeof data.is_new !== "boolean") return reply({ ok: false, error: "unavailable" }, 503);
    // A public receipt proves durable intake, not referral acceptance, an order,
    // commission rights or access to an existing customer's commercial history.
    return reply({ ok: true, reference: eventEnquiryReference(normalized.requestId), requestId: normalized.requestId }, data.is_new ? 201 : 200);
  } catch { return reply({ ok: false, error: "unavailable" }, 503); }
}
