"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import GrowthLab from "@/components/staff/GrowthLab";
import GrowthMissions from "@/components/staff/GrowthMissions";
import { workspaceModules } from "@/lib/staff-workspace";

export default function GrowthLabPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [status, setStatus] = useState("checking");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [userId, setUserId] = useState("");
  const [modules, setModules] = useState([]);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/admin/login"); return; }
      const { data: staff } = await supabase.from("staff_roles").select("role,workspace_modules").eq("user_id", user.id).maybeSingle();
      if (!active) return;
      setEmail(user.email || "");
      setUserId(user.id);
      setModules(workspaceModules(staff));
      setRole(staff?.role || "");
      setStatus(staff && (workspaceModules(staff) === null || workspaceModules(staff).includes("growth")) ? "staff" : "denied");
    })();
    return () => { active = false; };
  }, [router, supabase]);

  if (status === "checking") return <main className="hl-admin-state" aria-live="polite"><span className="hl-admin-state__pulse"/><p>Đang mở Phòng tăng trưởng…</p></main>;
  if (status === "denied") return <main className="hl-admin-state hl-admin-state--denied"><section><span className="hl-auth__seal">皇龍</span><h1>Tài khoản không có quyền nhân viên.</h1></section></main>;
  return <><GrowthMissions userId={userId} supabase={supabase} allowedModules={modules}/><div id="growth-lab-workbench"><GrowthLab supabase={supabase} email={email} role={role}/></div></>;
}
