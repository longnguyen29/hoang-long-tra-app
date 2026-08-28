"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import PricingControl from "@/components/staff/PricingControl";
import { createClient } from "@/lib/supabase/client";

export default function PricingControlPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [status, setStatus] = useState("checking");
  const [email, setEmail] = useState("");

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
      setStatus(staff ? "staff" : "denied");
    })();
    return () => {
      live = false;
    };
  }, [router, supabase]);

  if (status === "checking") {
    return <main className="hl-admin-state" aria-live="polite"><span className="hl-admin-state__pulse" /><p>Đang mở phòng tính giá…</p></main>;
  }
  if (status === "denied") {
    return <main className="hl-admin-state hl-admin-state--denied"><section><span className="hl-auth__seal">皇龍</span><h1>Tài khoản không có quyền nhân viên.</h1></section></main>;
  }
  return <PricingControl supabase={supabase} email={email} />;
}
