"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { TOKENS } from "@/lib/constants";
import { STR } from "@/lib/strings";

export default function AdminLoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const t = STR.vi;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);
    setError("");
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (signInError) {
      setError(t.loginError);
      return;
    }
    router.push("/admin");
    router.refresh();
  };

  return (
    <div
      style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        background: TOKENS.jade, padding: 20, fontFamily: "Inter, sans-serif",
      }}
    >
      <form
        onSubmit={submit}
        style={{
          background: TOKENS.paper, borderRadius: TOKENS.radius, padding: "32px 28px", width: "min(360px, 100%)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
        }}
      >
        <div
          style={{
            width: 44, height: 44, borderRadius: "50%", border: `1.5px solid ${TOKENS.brass}`,
            display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16,
            fontFamily: "'Noto Serif SC', serif", fontSize: 18, color: TOKENS.brass,
            boxShadow: "0 0 22px rgba(176,141,87,0.35)",
          }}
        >
          皇龍
        </div>
        <h1
          style={{
            fontFamily: "Fraunces, Georgia, serif", fontWeight: 500, fontSize: 22, margin: "0 0 4px",
            color: TOKENS.jade,
          }}
        >
          {t.loginTitle}
        </h1>
        <p style={{ fontSize: 13, color: TOKENS.jadeSoft, margin: "0 0 22px" }}>House of Hoàng Long</p>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <input
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t.loginEmailPh}
            style={{ padding: "11px 13px", borderRadius: 8, border: `1px solid ${TOKENS.brassDeep}55`, fontSize: 14 }}
          />
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t.loginPasswordPh}
            style={{ padding: "11px 13px", borderRadius: 8, border: `1px solid ${TOKENS.brassDeep}55`, fontSize: 14 }}
          />
        </div>

        {error && <p style={{ fontSize: 12.5, color: TOKENS.lacquer, marginTop: 10 }}>{error}</p>}

        <button
          type="submit"
          disabled={loading || !email.trim() || !password}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 7, width: "100%", marginTop: 18,
            background: TOKENS.jade, color: TOKENS.paper, border: "none", borderRadius: 8, padding: "12px",
            fontSize: 14, fontWeight: 600, cursor: "pointer", opacity: loading ? 0.7 : 1,
          }}
        >
          <Lock size={15} /> {t.loginBtn}
        </button>
      </form>
    </div>
  );
}
