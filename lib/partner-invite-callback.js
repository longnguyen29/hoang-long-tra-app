// Invitation tokens stay in the recipient's browser and are never rendered,
// logged, put into another URL, or sent to application analytics.
export function parsePartnerInviteFragment(hash) {
  if (typeof hash !== "string" || hash.length > 24576 || !hash.startsWith("#")) return null;
  const params = new URLSearchParams(hash.slice(1));
  if (params.has("error") || params.has("error_code") || params.has("error_description") || params.get("type") !== "invite"
      || params.getAll("type").length !== 1 || params.getAll("token_type").length !== 1 || params.get("token_type") !== "bearer") return null;
  const access = params.getAll("access_token");
  const refresh = params.getAll("refresh_token");
  if (access.length !== 1 || refresh.length !== 1
      || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(access[0]) || access[0].length > 16384
      || !/^[A-Za-z0-9._~+/=-]{8,4096}$/.test(refresh[0])) return null;
  return { access_token: access[0], refresh_token: refresh[0] };
}
