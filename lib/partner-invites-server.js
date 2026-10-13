import "server-only";

export const PARTNER_INVITE_REDIRECT = "https://www.hoanglongtra.com/partners/auth/invite";
const EMAIL = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i;
const HIDDEN = /[\u0000-\u001f\u007f-\u009f\u061c\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/gu;
const PAGE_SIZE = 100;
const MAX_PAGES = 10;
const PRODUCTION_ORIGINS = new Set(["https://www.hoanglongtra.com", "https://hoanglongtra.com", "https://ops.hoanglongtra.com", "https://quanly.hoanglongtra.com"]);

export class PartnerInviteError extends Error {
  constructor(code, status = 503, emailRequested = false) {
    super(code);
    this.status = status;
    this.emailRequested = emailRequested;
  }
}
const fail = (code, status, emailRequested) => { throw new PartnerInviteError(code, status, emailRequested); };

export function normalizePartnerInvite(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)
      || Object.keys(input).some((key) => !["email", "displayName"].includes(key))) fail("invalid_invite", 400);
  if (typeof input.email !== "string" || input.email.length > 254) fail("invalid_invite", 400);
  const email = input.email.trim().toLowerCase();
  if (!EMAIL.test(email)) fail("invalid_invite", 400);
  if (input.displayName !== undefined && (typeof input.displayName !== "string" || input.displayName.length > 120)) fail("invalid_invite", 400);
  const displayName = (input.displayName || "").normalize("NFC").replace(HIDDEN, "").replace(/\s+/gu, " ").trim();
  return { email, displayName };
}

export function allowedPartnerInviteOrigin(request, production = process.env.NODE_ENV === "production") {
  const origin = request.headers.get("origin");
  try {
    const target = new URL(request.url);
    if (!origin) return false;
    const sender = new URL(origin);
    if (sender.origin !== origin) return false;
    if (PRODUCTION_ORIGINS.has(origin) && origin === target.origin) return true;
    // Next dev may reconstruct localhost when a browser visits 127.0.0.1.
    const loopback = ["localhost", "127.0.0.1", "[::1]"];
    return !production && loopback.includes(target.hostname) && loopback.includes(sender.hostname)
      && ["http:", "https:"].includes(target.protocol) && sender.protocol === target.protocol && sender.port === target.port;
  } catch { return false; }
}

// There is no SDK getUserByEmail. This bounded, server-only lookup returns only
// the exact chosen account internally; never send the Auth-user list to a UI.
async function findAuthUser(admin, email) {
  let match = null;
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: PAGE_SIZE });
    if (error || !Array.isArray(data?.users)) fail("invite_failed", 503);
    const matched = data.users.filter((user) => typeof user.email === "string" && user.email.trim().toLowerCase() === email);
    if (matched.length > 1 || (match && matched.length)) fail("invite_failed", 503);
    if (matched.length === 1) match = matched[0];
    if (data.users.length < PAGE_SIZE) return match;
  }
  // Do not guess that the target is new if a larger directory could not be
  // fully checked. A pilot uses at most 1,000 existing Auth accounts.
  fail("invite_failed", 503);
}

function correctUser(user, email) {
  return Boolean(user?.id && typeof user.email === "string" && user.email.trim().toLowerCase() === email && !user.is_anonymous);
}

async function grantRegistration(admin, user, actor, emailRequested, now) {
  if (!correctUser(user, user?.email?.trim().toLowerCase())) fail(emailRequested ? "invite_access_failed" : "existing_access_failed", 500, emailRequested);
  const previous = user.app_metadata && typeof user.app_metadata === "object" && !Array.isArray(user.app_metadata) ? user.app_metadata : {};
  const appMetadata = {
    ...previous,
    hl_partner_invited: true,
    hl_partner_invited_by: previous.hl_partner_invited === true && previous.hl_partner_invited_by ? previous.hl_partner_invited_by : actor.id,
    hl_partner_invited_at: previous.hl_partner_invited === true && previous.hl_partner_invited_at ? previous.hl_partner_invited_at : now.toISOString(),
    ...(emailRequested ? { hl_partner_invite_email_requested_at: now.toISOString() } : {}),
  };
  let result;
  try { result = await admin.auth.admin.updateUserById(user.id, { app_metadata: appMetadata }); }
  catch { fail(emailRequested ? "invite_access_failed" : "existing_access_failed", 500, emailRequested); }
  if (result.error || !correctUser(result.data?.user, user.email.trim().toLowerCase())
      || result.data.user.id !== user.id || result.data.user.app_metadata?.hl_partner_invited !== true) {
    fail(emailRequested ? "invite_access_failed" : "existing_access_failed", 500, emailRequested);
  }
}

export async function invitePartnerAccount(admin, actor, input, { now = new Date() } = {}) {
  const { email, displayName } = normalizePartnerInvite(input);
  let existing = await findAuthUser(admin, email);
  if (existing) {
    if (!correctUser(existing, email)) fail("invite_failed", 503);
    if (existing.app_metadata?.hl_partner_invited === true) return { kind: "already_invited", emailRequested: false };
    await grantRegistration(admin, existing, actor, false, now);
    return { kind: "existing", emailRequested: false };
  }

  let result;
  try {
    result = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: PARTNER_INVITE_REDIRECT,
      ...(displayName ? { data: { full_name: displayName } } : {}),
    });
  } catch { fail("invite_failed", 503); }
  if (result.error) {
    if (result.error.code === "email_exists") {
      // Another request or legitimate signup may have created the target after
      // the lookup. Grant only the re-read exact account; do not send an OTP.
      existing = await findAuthUser(admin, email);
      if (!existing || !correctUser(existing, email)) fail("invite_failed", 503);
      if (existing.app_metadata?.hl_partner_invited === true) return { kind: "already_invited", emailRequested: false };
      await grantRegistration(admin, existing, actor, false, now);
      return { kind: "existing", emailRequested: false };
    }
    if (result.error.status === 429 || ["over_email_send_rate_limit", "over_request_rate_limit"].includes(result.error.code)) fail("too_many_requests", 429);
    fail("invite_failed", 502);
  }
  if (!correctUser(result.data?.user, email)) fail("invite_access_failed", 500, true);
  // Auth has already requested the email. A metadata failure is a partial
  // result: retain the account and let a retry grant it without another email.
  await grantRegistration(admin, result.data.user, actor, true, now);
  return { kind: "invited", emailRequested: true };
}
