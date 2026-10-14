import "server-only";

const PARTNER_FIELDS = [
  "id", "code", "business_name", "contact_name", "email", "phone", "region", "partner_type",
  "first_order_rate_percent", "default_rate_percent", "rate_percent", "repeat_rate_percent", "repeat_order_limit",
];
const empty = (access) => ({ access, partners: [], partnersUnavailable: false, partnersTruncated: false });

// Use the caller's SSR client and manager RLS. The existing admin snapshot also
// synchronizes order links, which a document-only page must never trigger.
export async function getCompanyDocumentsContext(supabase, { partnersEnabled = false } = {}) {
  let user;
  try {
    const result = await supabase.auth.getUser();
    if (result.error) return empty(result.error.name === "AuthSessionMissingError" ? "signed_out" : "error");
    user = result.data?.user;
    if (!user) return empty("signed_out");
  } catch { return empty("error"); }
  if (!user.id || !user.email || !user.email_confirmed_at || user.is_anonymous) return empty("denied");

  try {
    const { data, error } = await supabase.from("staff_roles").select("role").eq("user_id", user.id).maybeSingle();
    if (error) return empty("error");
    if (!["admin", "manager"].includes(data?.role)) return empty("denied");
  } catch { return empty("error"); }

  const context = empty("allowed");
  if (partnersEnabled !== true) return context;
  try {
    const { data, error } = await supabase.from("partner_network_partners")
      .select(PARTNER_FIELDS.join(",")).eq("status", "approved")
      .order("business_name", { ascending: true }).limit(201);
    if (error || !Array.isArray(data) || data.some(row => !row || typeof row !== "object" || Array.isArray(row))) {
      return { ...context, partnersUnavailable: true };
    }
    return {
      ...context,
      partners: data.slice(0, 200).map(row => Object.fromEntries(PARTNER_FIELDS.map(key => [key, row[key] ?? null]))),
      partnersTruncated: data.length > 200,
    };
  } catch { return { ...context, partnersUnavailable: true }; }
}
