import "server-only";

// Server-only, opt-in. Omitted on production, Phase 1 cannot replace the existing buyer portal.
export function partnerNetworkEnabled() {
  return process.env.PARTNER_NETWORK_ENABLED === "true";
}

export function partnerAuthDestination(next) {
  return next === "/partners/account" ? "/partners/account" : "/partners/network";
}
