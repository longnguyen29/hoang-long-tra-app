"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AssistantDesk from "@/components/staff/AssistantDesk";

export default function AssistantPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [session, setSession] = useState({ status: "checking" });

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/admin/login"); return; }
      const { data: staff } = await supabase.from("staff_roles").select("role").eq("user_id", user.id).maybeSingle();
      if (active) setSession({ status: ["admin", "manager"].includes(staff?.role) ? "manager" : "denied", userId: user.id });
    })();
    return () => { active = false; };
  }, [router, supabase]);

  if (session.status === "checking") return <main className="hl-admin-state" aria-live="polite"><span className="hl-admin-state__pulse"/><p>Đang mở trợ lý…</p></main>;
  if (session.status === "denied") return <main className="hl-admin-state hl-admin-state--denied"><section><h1>Chỉ quản lý được mở trợ lý.</h1></section></main>;
  return <AssistantDesk supabase={supabase} userId={session.userId}/>;
}
