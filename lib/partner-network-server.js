import "server-only";

// Server-only, opt-in. Omitted on production, Phase 1 cannot replace the existing buyer portal.
export function partnerNetworkEnabled() {
  return process.env.PARTNER_NETWORK_ENABLED === "true";
}

export function partnerNetworkPublicRegistrationEnabled() {
  return partnerNetworkEnabled() && process.env.PARTNER_NETWORK_PUBLIC_REGISTRATION === "true";
}

// Opening the manager module must not also launch public intake. Internal review
// permission belongs to the verified staff identity, not to anyone using that tab.
export async function partnerRegistrationAccess(user, supabase) {
  if (!partnerNetworkEnabled()) return { allowRegistration: false, publicRegistration: false, registrationUserId: null };
  if (partnerNetworkPublicRegistrationEnabled()) return { allowRegistration: true, publicRegistration: true, registrationUserId: null };
  if (!user?.id || !user.email || !user.email_confirmed_at) return { allowRegistration: false, publicRegistration: false, registrationUserId: null };
  try {
    const { data, error } = await supabase.rpc("is_staff_manager");
    if (!error && data === true) return { allowRegistration: true, publicRegistration: false, registrationUserId: user.id };
  } catch { /* A failed permission lookup cannot open intake. */ }
  return { allowRegistration: false, publicRegistration: false, registrationUserId: null };
}

export function partnerAuthDestination(next) {
  return next === "/partners/account" ? "/partners/account" : "/partners/network";
}
