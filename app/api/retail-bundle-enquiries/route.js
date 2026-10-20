import { POST as submitContactEnquiry } from "../event-enquiries/route.js";
import { allowedEventEnquiryOrigin, readEventEnquiryBody } from "@/lib/event-enquiry";
import { retailBundleEventInput } from "@/lib/retail-bundle-enquiry";

export const runtime = "nodejs";
const fail = (error, status = 400) => Response.json({ ok: false, error }, {
  status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
});

export async function POST(request) {
  if (!allowedEventEnquiryOrigin(request)) return fail("invalid_request", 403);
  let input;
  try { input = retailBundleEventInput(await readEventEnquiryBody(request)); }
  catch (error) { return fail(error.message === "consent_required" ? error.message : "invalid_request"); }
  const headers = new Headers(request.headers);
  headers.delete("content-length");
  // Preserve one private CRM transaction, trusted rate limits, contact checks
  // and retry contract. No public form values are added to URLs or messages.
  return submitContactEnquiry(new Request(request.url, { method: "POST", headers, body: JSON.stringify(input) }));
}
