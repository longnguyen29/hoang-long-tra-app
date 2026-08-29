"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ExpenseInbox from "@/components/staff/ExpenseInbox";

export default function ExpenseInboxPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [session, setSession] = useState({ status: "checking", email: "", role: "" });

  useEffect(() => {
    let live = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/admin/login"); return; }
      const { data: staff } = await supabase.from("staff_roles").select("role").eq("user_id", user.id).maybeSingle();
      if (!live) return;
      setSession({ status: staff ? "staff" : "denied", email: user.email || "", role: staff?.role || "" });
    })();
    return () => { live = false; };
  }, [router, supabase]);

  const logout = async () => {
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  };

  if (session.status === "checking") return <main className="hl-admin-state" aria-live="polite"><span className="hl-admin-state__pulse"/><p>Đang mở hộp khoản chi…</p></main>;
  if (session.status === "denied") return <main className="hl-admin-state hl-admin-state--denied"><section><span className="hl-auth__seal">皇龍</span><h1>Tài khoản không có quyền nhân viên.</h1></section></main>;
  return <ExpenseInbox supabase={supabase} {...session} onLogout={logout}/>;
}
