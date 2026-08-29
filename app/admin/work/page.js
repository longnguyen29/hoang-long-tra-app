"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import WorkBoard from "@/components/staff/WorkBoard";

export default function WorkPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [session, setSession] = useState({ status: "checking", userId: "", email: "", role: "" });

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/admin/login"); return; }
      const { data: staff } = await supabase.from("staff_roles").select("role").eq("user_id", user.id).maybeSingle();
      if (!active) return;
      setSession({
        status: staff ? "staff" : "denied",
        userId: user.id,
        email: user.email || "",
        role: staff?.role || "",
      });
    })();
    return () => { active = false; };
  }, [router, supabase]);

  const logout = async () => {
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  };

  if (session.status === "checking") {
    return <main className="hl-admin-state" aria-live="polite"><span className="hl-admin-state__pulse"/><p>Đang mở việc hôm nay…</p></main>;
  }
  if (session.status === "denied") {
    return <main className="hl-admin-state hl-admin-state--denied"><section><span className="hl-auth__seal">皇龍</span><h1>Tài khoản chưa được giao quyền nhân viên.</h1></section></main>;
  }

  return <WorkBoard supabase={supabase} {...session} onLogout={logout}/>;
}
