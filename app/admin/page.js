"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Brain } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { TOKENS } from "@/lib/constants";
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
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: TOKENS.paper, fontFamily: "Inter, sans-serif", color: TOKENS.jadeSoft }}>
        {t.loading}
      </div>
    );
  }

  if (status === "not-staff") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: TOKENS.jade, padding: 20, fontFamily: "Inter, sans-serif" }}>
        <div style={{ background: TOKENS.paper, borderRadius: 16, padding: "32px 28px", width: "min(360px, 100%)", textAlign: "center" }}>
          <p style={{ fontSize: 14, color: TOKENS.jade, lineHeight: 1.6, margin: "0 0 8px" }}>{t.loginNotStaff}</p>
          <p style={{ fontSize: 12.5, color: TOKENS.jadeSoft, margin: "0 0 20px" }}>{email}</p>
          <button
            onClick={logout}
            style={{ background: TOKENS.jade, color: TOKENS.paper, border: "none", borderRadius: 8, padding: "10px 16px", fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}
          >
            {t.logout}
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Link
        href="/brain"
        aria-label="Open Institutional Brain"
        style={{
          position: "fixed", right: 18, bottom: 18, zIndex: 80,
          display: "inline-flex", alignItems: "center", gap: 8,
          minHeight: 42, padding: "0 14px", borderRadius: 4,
          background: TOKENS.jade, color: TOKENS.paper,
          border: `1px solid ${TOKENS.brass}`, boxShadow: TOKENS.shadowMd,
          fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 600,
          textDecoration: "none", whiteSpace: "nowrap",
        }}
      >
        <Brain size={15} color={TOKENS.brassOnDark} /> Brain
      </Link>
      <TeaConsole isAdmin={true} staffEmail={email} onLogout={logout} />
    </>
  );
}
