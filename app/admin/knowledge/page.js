"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import KnowledgeCentre from "@/components/staff/KnowledgeCentre";

export default function KnowledgeCentrePage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [status, setStatus] = useState("checking");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (!live) return;
        if (error || !user) { router.replace("/admin/login"); return; }
        const result = await supabase.from("staff_roles").select("role").eq("user_id", user.id).maybeSingle();
        if (!live) return;
        if (result.error) { setStatus("error"); return; }
        setEmail(user.email || "");
        setRole(result.data?.role || "");
        setStatus(["admin", "manager"].includes(result.data?.role) ? "allowed" : "denied");
      } catch { if (live) setStatus("error"); }
    })();
    return () => { live = false; };
  }, [router, supabase]);
  if (status === "checking") return <main className="hl-admin-state" aria-live="polite"><span className="hl-admin-state__pulse"/><p>Đang mở trung tâm kiến thức…</p></main>;
  if (status === "error") return <main className="hl-admin-state" role="alert"><p>Chưa kiểm tra được quyền truy cập. Hãy tải lại trang.</p><button onClick={() => window.location.reload()}>Tải lại</button></main>;
  if (status === "denied") return <main className="hl-admin-state hl-admin-state--denied"><section><span className="hl-auth__seal">皇龍</span><h1>Cần quyền quản lý hoặc admin để mở trung tâm kiến thức.</h1></section></main>;
  return <KnowledgeCentre supabase={supabase} email={email} role={role}/>;
}
