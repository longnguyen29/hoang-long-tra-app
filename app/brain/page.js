"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import BrainConsole from "@/components/BrainConsole";
import styles from "@/components/BrainConsole.module.css";
import { brainDemoData } from "@/lib/demo/brain";

export default function BrainPage() {
  const router = useRouter();
  const demoMode = process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_BRAIN_DEMO_MODE === "true";
  const [supabase] = useState(() => createClient());
  const [state, setState] = useState({ status: "checking", email: "", data: null, error: "" });

  useEffect(() => {
    if (demoMode) {
      setState({ status: "ready", email: "local-preview@hoanglong", data: brainDemoData, error: "" });
      return;
    }
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/admin/login"); return; }
      const { data: staff } = await supabase.from("staff_roles").select("role").eq("user_id", user.id).maybeSingle();
      if (!staff) { setState({ status: "denied", email: user.email || "", data: null, error: "" }); return; }
      const results = await Promise.all([
        supabase.from("orders").select("*").order("ts", { ascending: false }).limit(100),
        supabase.from("leads").select("*").order("ts", { ascending: false }).limit(100),
        supabase.from("sample_requests").select("*").order("ts", { ascending: false }).limit(100),
        supabase.from("support_threads").select("*").order("created_at", { ascending: false }).limit(100),
        supabase.from("customer_notes").select("*").order("updated_at", { ascending: false }).limit(100),
        supabase.from("catalog_products").select("*").order("id"),
        supabase.from("vendors").select("*").order("name"),
        supabase.from("tea_sessions").select("*").order("session_date", { ascending: false }).limit(100),
      ]);
      if (cancelled) return;
      const firstError = results.find(result => result.error)?.error;
      setState({ status: "ready", email: user.email || "", error: firstError?.message || "", data: {
        orders: results[0].data || [], leads: results[1].data || [], samples: results[2].data || [],
        threads: results[3].data || [], notes: results[4].data || [], products: results[5].data || [],
        vendors: results[6].data || [], sessions: results[7].data || [],
      }});
    })();
    return () => { cancelled = true; };
  }, [demoMode, router, supabase]);

  if (state.status === "checking") return <div className={styles.gate}>Reading the house records…</div>;
  if (state.status === "denied") return <div className={styles.gate}>This room is for House staff.<br/><small>{state.email}</small></div>;
  return <BrainConsole initialData={state.data} staffEmail={state.email} loadWarning={state.error}/>;
}
