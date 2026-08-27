"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import BudgetControl from "@/components/staff/BudgetControl";

export default function BudgetControlPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [status, setStatus] = useState("checking");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");

  useEffect(() => {
    let live = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/admin/login");
        return;
      }
      const { data: staff } = await supabase
        .from("staff_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!live) return;
      setEmail(user.email || "");
      setRole(staff?.role || "");
      setStatus(staff ? "staff" : "denied");
    })();
    return () => {
      live = false;
    };
  }, [router, supabase]);

  const logout = async () => {
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  };

  if (status === "checking")
    return <main className="hl-admin-state" aria-live="polite"><span className="hl-admin-state__pulse" /><p>Đang mở sổ ngân sách…</p></main>;
  if (status === "denied")
    return <main className="hl-admin-state hl-admin-state--denied"><section><span className="hl-auth__seal">皇龍</span><h1>Tài khoản không có quyền nhân viên.</h1></section></main>;
  return <BudgetControl supabase={supabase} email={email} role={role} onLogout={logout} />;
}
