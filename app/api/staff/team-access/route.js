import { authenticateStaffRequest } from "@/lib/staff-api-auth";
import { validWorkspaceSelection } from "@/lib/staff-workspace";

const failure = (error, status) => Response.json({ error }, { status });

export async function GET(request) {
  const staff = await authenticateStaffRequest(request);
  if (staff?.role !== "admin") return failure("not_authorised", 403);

  const [roles, profiles] = await Promise.all([
    staff.admin.from("staff_roles").select("user_id,role,workspace_modules").order("created_at").order("user_id"),
    staff.admin.from("staff_profiles").select("user_id,display_name,active"),
  ]);
  if (roles.error || profiles.error) return failure("read_failed", 500);

  const profilesById = new Map(profiles.data.map(profile => [profile.user_id, profile]));
  const members = roles.data.map(role => {
    const profile = profilesById.get(role.user_id);
    return { ...role, display_name: profile?.display_name || role.user_id, active: profile?.active ?? true };
  });
  return Response.json({ members }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request) {
  const staff = await authenticateStaffRequest(request);
  if (staff?.role !== "admin") return failure("not_authorised", 403);

  const body = await request.json().catch(() => null);
  const userId = body?.userId;
  const modules = body?.modules;
  const previous = body?.previous;
  const { role, previousRole } = body || {};
  const memberRoles = ["employee", "manager"];
  if (typeof userId !== "string" || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(userId) ||
      !memberRoles.includes(role) || !memberRoles.includes(previousRole) ||
      !validWorkspaceSelection(modules) || !validWorkspaceSelection(previous) ||
      (role === "employee" && modules !== null)) {
    return failure("invalid_selection", 400);
  }

  const update = staff.admin.from("staff_roles").update({ role, workspace_modules: modules })
    .eq("user_id", userId).eq("role", previousRole);
  const guardedUpdate = previous === null
    ? update.is("workspace_modules", null)
    : update.eq("workspace_modules", `{${previous.join(",")}}`);
  const { data, error } = await guardedUpdate.select("user_id,role,workspace_modules").maybeSingle();
  if (error) return failure("save_failed", 500);
  if (!data) return failure("member_changed", 409);
  return Response.json({ member: data });
}
