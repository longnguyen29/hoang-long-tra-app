"use client";

import { useState } from "react";

// Email+password sign up / sign in for customers (wholesale partners today; retail stays
// guest-checkout). Supabase project has mailer_autoconfirm off, so a fresh signUp() never
// returns a session immediately — we always show the "check your email" step for signup.
export default function AuthPanel({ supabase, t, TOKENS }) {
  const [mode, setMode] = useState("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checkEmail, setCheckEmail] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);
    setError("");
    if (mode === "signup") {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { phone: phone.trim() } },
      });
      setLoading(false);
      if (signUpError) { setError(signUpError.message || t.authError); return; }
      if (!data.session) { setCheckEmail(true); return; }
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      setLoading(false);
      if (signInError) { setError(t.loginError); return; }
    }
  };

  if (checkEmail) {
    return (
      <div style={{ textAlign: "center", padding: "16px 4px 4px" }}>
        <h3 style={{ fontFamily: "Lora, Georgia, serif", fontWeight: 500, fontSize: 16, margin: "0 0 8px" }}>
          {t.authCheckEmailTitle}
        </h3>
        <p style={{ fontSize: 13, color: TOKENS.jadeSoft, margin: 0 }}>{t.authCheckEmailHint}</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 8, textAlign: "left", marginTop: 4 }}>
      <input
        type="email"
        autoComplete="username"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={t.authEmailPh}
        style={{ padding: "10px 13px", borderRadius: 8, border: `1px solid ${TOKENS.brassDeep}55`, fontSize: 14 }}
      />
      <input
        type="password"
        autoComplete={mode === "signup" ? "new-password" : "current-password"}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder={t.authPasswordPh}
        style={{ padding: "10px 13px", borderRadius: 8, border: `1px solid ${TOKENS.brassDeep}55`, fontSize: 14 }}
      />
      {mode === "signup" && (
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder={t.authPhonePh}
          style={{ padding: "10px 13px", borderRadius: 8, border: `1px solid ${TOKENS.brassDeep}55`, fontSize: 14 }}
        />
      )}
      {error && <p style={{ fontSize: 12.5, color: TOKENS.lacquer, margin: 0 }}>{error}</p>}
      <button
        type="submit"
        disabled={loading || !email.trim() || !password}
        style={{
          background: TOKENS.jade, color: TOKENS.paper, border: "none", borderRadius: 8, padding: "11px",
          fontSize: 13.5, fontWeight: 600, cursor: "pointer", opacity: loading ? 0.7 : 1,
        }}
      >
        {mode === "signup" ? t.authSignupBtn : t.authLoginBtn}
      </button>
      <button
        type="button"
        onClick={() => { setMode(mode === "signup" ? "login" : "signup"); setError(""); }}
        style={{ background: "none", border: "none", color: TOKENS.brassOnPaper, fontSize: 12.5, cursor: "pointer", textDecoration: "underline", padding: "2px 0" }}
      >
        {mode === "signup" ? t.authSwitchToLogin : t.authSwitchToSignup}
      </button>
    </form>
  );
}
