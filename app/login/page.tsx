"use client";

import { FormEvent, useState } from "react";
import { getBrowserClient } from "../../lib/supabase-browser";

export default function LoginPage() {
  const supabase = getBrowserClient();
  const [mode, setMode] = useState<"login" | "signup" | "reset">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError(""); setMessage("");
    try {
      if (mode === "reset") {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth/callback?next=/` });
        if (resetError) throw resetError;
        setMessage("Check your email for a password reset link.");
      } else if (mode === "signup") {
        const { data, error: signupError } = await supabase.auth.signUp({ email, password, options: { data: { display_name: displayName } } });
        if (signupError) throw signupError;
        setMessage(data.session ? "Account created. Redirecting…" : "Account created. Check your email to confirm it.");
        if (data.session) window.location.assign("/");
      } else {
        const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
        if (loginError) throw loginError;
        window.location.assign("/");
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to complete that request.");
    } finally { setBusy(false); }
  }

  return <main className="auth-shell"><section className="auth-card">
    <div className="brand auth-brand"><span className="brand-mark">◇</span><span>Aisu<span className="brand-accent">Vault</span></span></div>
    <p className="eyebrow">PRIVATE KNOWLEDGE, SECURELY STORED</p>
    <h1>{mode === "login" ? "Welcome back" : mode === "signup" ? "Create your vault" : "Reset your password"}</h1>
    <p className="muted">{mode === "reset" ? "We’ll send a secure link to your inbox." : "Sign in to access your private library."}</p>
    <form onSubmit={submit} className="auth-form">
      {mode === "signup" && <label>Display name<input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Aisu Codex" /></label>}
      <label>Email<input required type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" /></label>
      {mode !== "reset" && <label>Password<input required minLength={8} type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete={mode === "signup" ? "new-password" : "current-password"} /></label>}
      {error && <p className="form-error" role="alert">{error}</p>}
      {message && <p className="form-success" role="status">{message}</p>}
      <button className="button primary full" disabled={busy}>{busy ? "Working…" : mode === "login" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"}</button>
    </form>
    <div className="auth-links">
      {mode === "login" && <><button onClick={() => setMode("reset")}>Forgot password?</button><button onClick={() => setMode("signup")}>Create an account</button></>}
      {mode !== "login" && <button onClick={() => setMode("login")}>Back to sign in</button>}
    </div>
  </section></main>;
}
