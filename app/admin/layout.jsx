import StaffShell from "@/components/staff/StaffShell";
import { partnerNetworkEnabled } from "@/lib/partner-network-server";
import { createClient } from "@/lib/supabase/server";
import { workspaceModules } from "@/lib/staff-workspace";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: staff } = user
    ? await supabase.from("staff_roles").select().eq("user_id", user.id).maybeSingle()
    : { data: null };

  return <StaffShell
    partnerNetworkEnabled={partnerNetworkEnabled()}
    allowedModules={workspaceModules(staff)}
    canManageAccess={staff?.role === "admin"}
  >{children}</StaffShell>;
}
