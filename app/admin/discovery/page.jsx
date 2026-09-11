"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ProspectDiscovery from "@/components/staff/ProspectDiscovery";
export default function DiscoveryPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [status, setStatus] = useState("checking");
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!active) return;
        if (!user) { router.push("/admin/login"); return; }
        const { data } = await supabase.from("staff_roles").select("role").eq("user_id", user.id).maybeSingle();
        if (active) setStatus(["admin", "manager"].includes(data?.role) ? "ready" : "denied");
      } catch { if (active) setStatus("error"); }
    })();
    return () => { active = false; };
  }, [supabase, router]);
  if (status !== "ready") return <main className="hl-admin-state"><p role="status">{status === "checking" ? "Đang mở Tìm quán mới…" : status === "denied" ? "Tính năng này dành cho tài khoản quản lý." : "Không kết nối được. Vui lòng tải lại trang."}</p></main>;
  return <ProspectDiscovery supabase={supabase}/>;
}
