"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ProductDevelopmentDesk from "@/components/staff/ProductDevelopmentDesk";

export default function ProductDevelopmentPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [access, setAccess] = useState({ status: "checking", email: "", role: "" });

  useEffect(() => {
    let live = true;
    let revision = 0;
    let currentUserId = null;
    async function checkAccess(knownUser) {
      const current = ++revision;
      setAccess({ status: "checking" });
      try {
        let user = knownUser;
        if (!user) {
          const result = await supabase.auth.getUser();
          if (result.error) throw result.error;
          user = result.data.user;
        }
        if (!live || current !== revision) return;
        if (!user) { router.replace("/admin/login"); return; }
        currentUserId = user.id;
        const result = await supabase.from("staff_roles").select("role").eq("user_id", user.id).maybeSingle();
        if (!live || current !== revision) return;
        if (result.error) { setAccess({ status: "error" }); return; }
        const role = result.data?.role || "";
        setAccess({ status: ["admin", "manager"].includes(role) ? "allowed" : "denied", email: user.email || "", role, userId: user.id });
      } catch { if (live && current === revision) setAccess({ status: "error" }); }
    }
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!live || event === "INITIAL_SESSION") return;
      if (!session?.user) {
        revision += 1;
        currentUserId = null;
        setAccess({ status: "checking" });
        router.replace("/admin/login");
      } else if (session.user.id !== currentUserId) {
        revision += 1;
        setAccess({ status: "checking" });
        // Leave the auth callback before checking the new account's role.
        queueMicrotask(() => { if (live) checkAccess(session.user); });
      }
    });
    checkAccess();
    return () => { live = false; revision += 1; subscription.unsubscribe(); };
  }, [router, supabase]);

  if (access.status === "checking") return <main className="hl-admin-state" aria-live="polite"><span className="hl-admin-state__pulse"/><p>Đang mở phát triển sản phẩm…</p></main>;
  if (access.status === "error") return <main className="hl-admin-state" role="alert"><p>Chưa kiểm tra được quyền truy cập. Hãy tải lại trang.</p><button onClick={() => window.location.reload()}>Tải lại</button></main>;
  if (access.status === "denied") return <main className="hl-admin-state hl-admin-state--denied"><section><span className="hl-auth__seal">皇龍</span><h1>Cần quyền quản lý hoặc admin để mở phát triển sản phẩm.</h1></section></main>;
  return <ProductDevelopmentDesk key={access.userId} supabase={supabase} email={access.email} role={access.role} initialView="projects"/>;
}
