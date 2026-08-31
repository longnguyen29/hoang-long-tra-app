"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import RecipeLab from "@/components/staff/RecipeLab";
import RecipeRadar from "@/components/staff/RecipeRadar";

function RecipeLabContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);
  const [status, setStatus] = useState("checking");
  const [email, setEmail] = useState("");
  const view = searchParams.get("view") === "lab" ? "lab" : "radar";

  useEffect(() => {
    let live = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/admin/login"); return; }
      const { data: staff } = await supabase.from("staff_roles").select("role").eq("user_id", user.id).maybeSingle();
      if (!live) return;
      setEmail(user.email || "");
      setStatus(staff ? "staff" : "denied");
    })();
    return () => { live = false; };
  }, [router, supabase]);

  if (status === "checking") return <main className="hl-admin-state" aria-live="polite"><span className="hl-admin-state__pulse"/><p>Đang mở phòng công thức…</p></main>;
  if (status === "denied") return <main className="hl-admin-state hl-admin-state--denied"><section><span className="hl-auth__seal">皇龍</span><h1>Tài khoản không có quyền nhân viên.</h1></section></main>;
  return view === "lab" ? <RecipeLab supabase={supabase} email={email}/> : <RecipeRadar supabase={supabase} email={email}/>;
}

export default function RecipeLabPage() {
  return <Suspense fallback={<main className="hl-admin-state" aria-live="polite"><span className="hl-admin-state__pulse"/><p>Đang mở phòng công thức…</p></main>}><RecipeLabContent/></Suspense>;
}
