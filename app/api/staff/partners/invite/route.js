import { authenticateStaffRequest } from "@/lib/staff-api-auth";
import { partnerNetworkEnabled } from "@/lib/partner-network-server";
import { readEventEnquiryBody } from "@/lib/event-enquiry";
import { allowedPartnerInviteOrigin, invitePartnerAccount, normalizePartnerInvite, PartnerInviteError } from "@/lib/partner-invites-server";

export const runtime = "nodejs";
const reply = (body, status, headers = {}) => Response.json(body, {
  status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...headers },
});
const fail = (error, status) => reply({ ok: false, error }, status);

export async function POST(request) {
  if (!partnerNetworkEnabled()) return fail("not_authorised", 404);
  if (!allowedPartnerInviteOrigin(request)) return fail("not_authorised", 403);
  let auth;
  try { auth = await authenticateStaffRequest(request); }
  catch { return fail("invite_failed", 503); }
  if (!auth) return fail("not_authenticated", 401);
  if (!["admin", "manager"].includes(auth.role) || !auth.user?.email || !auth.user.email_confirmed_at) return fail("not_authorised", 403);
  let input;
  try { input = normalizePartnerInvite(await readEventEnquiryBody(request)); }
  catch { return fail("invalid_invite", 400); }
  try {
    const result = await invitePartnerAccount(auth.admin, auth.user, input);
    return reply({ ok: true, ...result }, result.kind === "invited" ? 201 : 200);
  } catch (error) {
    if (error instanceof PartnerInviteError) {
      return reply({ ok: false, error: error.message, emailRequested: error.emailRequested }, error.status,
        error.status === 429 ? { "Retry-After": "60" } : {});
    }
    return fail("invite_failed", 503);
  }
}
