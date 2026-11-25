import { createAdminClient } from "@/lib/supabase/admin";
import { canCallStaffApi } from "@/lib/staff-workspace";

export async function authenticateStaffRequest(request) {
  const authorization = request.headers.get("authorization") || "";
  if (!authorization.startsWith("Bearer ")) return null;

  const token = authorization.slice(7).trim();
  if (!token) return null;

  const admin = createAdminClient();
  const { data: { user }, error: userError } = await admin.auth.getUser(token);
  if (userError || !user) return null;

  const { data: staff, error: staffError } = await admin
    .from("staff_roles")
    .select()
    .eq("user_id", user.id)
    .maybeSingle();

  if (staffError || !staff || !canCallStaffApi(staff, new URL(request.url).pathname)) return null;
  return { admin, user, role: staff.role, staff };
}

export async function authenticateManagerRequest(request) {
  const staff = await authenticateStaffRequest(request);
  return staff && ["admin", "manager"].includes(staff.role) ? staff : null;
}
