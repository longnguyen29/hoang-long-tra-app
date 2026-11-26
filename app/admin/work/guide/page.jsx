import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canOpenStaffPage } from "@/lib/staff-workspace";
import { guideReferences, workflows } from "@/lib/company-guide";
import { houseDateKey } from "@/lib/dashboard-calendar";
import CompanyGuide from "@/components/staff/CompanyGuide";

export const dynamic = "force-dynamic";

export default async function CompanyGuidePage() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/admin/login");
  const role = await db.from("staff_roles").select("role,workspace_modules").eq("user_id", user.id).maybeSingle();
  if (role.error) redirect("/admin/workspace-unavailable");
  if (!role.data || !canOpenStaffPage(role.data, "/admin/work/guide")) redirect("/admin");
  const allowed = path => canOpenStaffPage(role.data, path.split("?")[0].split("#")[0]);
  const readablePaths = [...new Set(workflows.flatMap(flow => flow.sources.map(source => source[2])))].filter(allowed);
  const canRead = allowed("/admin/knowledge") && ["admin","manager"].includes(role.data.role);
  let refs = [], incomplete = false;
  if (canRead) {
    const [memory, topics] = await Promise.all([
      db.from("company_memory_items").select("id,kind,title,body,status,approved_at,review_on").eq("status", "approved").order("approved_at", { ascending:false, nullsFirst:false }).limit(30),
      db.from("knowledge_topics").select("id,title,body,status,memory_item_id,reviewed_at").eq("status", "reviewed").is("memory_item_id",null).order("reviewed_at", { ascending:false, nullsFirst:false }).limit(30),
    ]);
    incomplete = Boolean(memory.error || topics.error);
    refs = guideReferences(memory.data || [], topics.data || []);
  }
  return <CompanyGuide flows={workflows} readablePaths={readablePaths} references={refs} canRead={canRead} incomplete={incomplete}
    canReview={canRead && allowed("/admin")} asOf={houseDateKey()}/>;
}
