"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { STR } from "@/lib/strings";
import TeaConsole from "@/components/TeaConsole";

export default function AdminPage() {
  const router = useRouter();
  const supabase = createClient();
  const t = STR.vi;

  const [status, setStatus] = useState("checking"); // checking | staff | not-staff
  const [email, setEmail] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/admin/login");
        return;
      }
      if (cancelled) return;
      setEmail(user.email || "");
      const { data: staffRow } = await supabase
        .from("staff_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      setStatus(staffRow ? "staff" : "not-staff");
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  };

  if (status === "checking") {
    return (
      <main className="hl-admin-state" aria-live="polite">
        <span className="hl-admin-state__pulse" aria-hidden="true" />
        <p>{t.loading}</p>
      </main>
    );
  }

  if (status === "not-staff") {
    return (
      <main className="hl-admin-state hl-admin-state--denied">
        <section>
          <span className="hl-auth__seal" aria-hidden="true">皇龍</span>
          <h1>{t.loginNotStaff}</h1>
          <p>{email}</p>
          <button className="hl-button hl-button--secondary" onClick={logout}>{t.logout}</button>
        </section>
      </main>
    );
  }

  return <TeaConsole isAdmin={true} staffEmail={email} onLogout={logout} />;
}
