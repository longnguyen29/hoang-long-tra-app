"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import RecipeLab from "@/components/staff/RecipeLab";
import RecipeRadar from "@/components/staff/RecipeRadar";

export default function RecipeLabPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [status, setStatus] = useState("checking");
  const [email, setEmail] = useState("");
  const [view, setView] = useState("checking");

  useEffect(() => {
    let live = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/admin/login"); return; }
      const { data: staff } = await supabase.from("staff_roles").select("role").eq("user_id", user.id).maybeSingle();
      if (!live) return;
      setEmail(user.email || "");
      setView(new URLSearchParams(window.location.search).get("view") === "lab" ? "lab" : "radar");
      setStatus(staff ? "staff" : "denied");
    })();
    return () => { live = false; };
  }, [router, supabase]);

  if (status === "checking" || view === "checking") return <main className="hl-admin-state" aria-live="polite"><span className="hl-admin-state__pulse"/><p>Đang mở phòng công thức…</p></main>;
  if (status === "denied") return <main className="hl-admin-state hl-admin-state--denied"><section><span className="hl-auth__seal">皇龍</span><h1>Tài khoản không có quyền nhân viên.</h1></section></main>;
  return view === "lab" ? <RecipeLab supabase={supabase} email={email}/> : <RecipeRadar supabase={supabase} email={email}/>;
}
