"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
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
    <main className="hl-auth">
      <section className="hl-auth__context" aria-label="House of Hoàng Long">
        <div className="hl-auth__seal" aria-hidden="true">皇龍</div>
        <div>
          <p className="hl-auth__house">House of Hoàng Long</p>
          <p className="hl-auth__principle">Mọi việc phía sau mỗi đơn trà, được giữ rõ trong Nhà.</p>
        </div>
      </section>

      <section className="hl-auth__panel">
        <form className="hl-auth__form" onSubmit={submit} noValidate>
          <div className="hl-auth__intro">
            <Lock size={18} aria-hidden="true" />
            <h1>{t.loginTitle}</h1>
            <p>Khu vực dành cho nhân viên</p>
          </div>

          <div className="hl-field">
            <label htmlFor="staff-email">{t.loginEmailPh}</label>
            <input
              id="staff-email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={error ? "true" : "false"}
              aria-describedby="login-feedback"
            />
          </div>

          <div className="hl-field">
            <label htmlFor="staff-password">{t.loginPasswordPh}</label>
            <input
              id="staff-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={error ? "true" : "false"}
              aria-describedby="login-feedback"
            />
          </div>

          <p id="login-feedback" className={`hl-auth__feedback ${error ? "is-error" : ""}`} role={error ? "alert" : undefined}>
            {error || "Dùng tài khoản do quản lý Hoàng Long cấp."}
          </p>

          <button className="hl-button hl-button--primary" type="submit" disabled={loading || !email.trim() || !password} data-state={loading ? "loading" : "idle"}>
            <span>{loading ? t.loading : t.loginBtn}</span>
            {!loading && <ArrowRight size={16} aria-hidden="true" />}
          </button>
        </form>
      </section>
    </main>
  );
}
