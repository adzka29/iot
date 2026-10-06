"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
// import ThemeToggle from "@/components/theme-toggle";

function UserIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M5.2 19.2c.9-3.2 3.4-4.7 6.8-4.7s5.9 1.5 6.8 4.7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function accountProblem(value: string) {
  const text = value.trim();
  if (!text) return "Email or username is required.";
  if (text.includes("@") && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) return "Invalid email.";
  if (text.length < 2) return "Invalid email.";
  return "";
}

export default function LoginView() {
  const router = useRouter();
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [accountError, setAccountError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [formError, setFormError] = useState("");
  const [pending, setPending] = useState(false);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (pending) return;
    const nextAccountError = accountProblem(account);
    const nextPasswordError = password.trim() ? "" : "Password is required.";
    setAccountError(nextAccountError);
    setPasswordError(nextPasswordError);
    setFormError("");
    if (nextAccountError || nextPasswordError) return;
    setPending(true);
    router.push("/dashboard");
  };

  return (
    <div className="auth-screen">
      <section className="auth-side">
        <div className="auth-brand">
          <img className="auth-mark" src="/images/traxon-login-mark.svg" alt="" aria-hidden="true" />
          <img className="auth-wordmark" src="/images/traxon-wordmark.svg" alt="Traxon" />
        </div>
        <img
          className="auth-hero"
          src="/images/login-hero-dark.png"
          alt=""
        />
        <div className="auth-feature-card">
        <ul className="auth-features">
          <li>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M3 12h4l2-5 4 10 2-5h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>
              <strong>Real-Time Vital Monitoring</strong>
              <small>EKG · Heart Rate · Body Temp</small>
            </span>
          </li>
          <li>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
              <circle cx="12" cy="10" r="2.2" stroke="currentColor" strokeWidth="1.7" />
            </svg>
            <span>
              <strong>Tactical Location Tracking</strong>
              <small>GNSS · LoRa Mesh · Satellite</small>
            </span>
          </li>
          <li>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 3.2 19.2 6v5.4c0 4.3-2.9 7.4-7.2 8.8-4.3-1.4-7.2-4.5-7.2-8.8V6L12 3.2Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
            </svg>
            <span>
              <strong>Secure & Resilient Communication</strong>
              <small>Encrypted · Off-Grid · Mesh</small>
            </span>
          </li>
          <li>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="m12 3 8 4.2-8 4.2L4 7.2 12 3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
              <path d="m4 12 8 4.2 8-4.2M4 16.6 12 20.8l8-4.2" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
            </svg>
            <span>
              <strong>Built for Mission Operations</strong>
              <small>Rugged · Lightweight · Reliable</small>
            </span>
          </li>
        </ul>
        </div>
      </section>

      <section className="auth-pane">
      <div className="auth-tools">
        {/* <ThemeToggle /> */}
      </div>
      <form className="auth-card" onSubmit={onSubmit}>
        <div className="auth-card-brand">
          <img className="auth-logo-sm" src="/images/traxon-login-mark.svg" alt="Traxon" />
        </div>
        <h1>Sign in</h1>

        <div className="auth-block">
          <label htmlFor="account">Email or username</label>
          <span className={accountError ? "auth-field is-error" : "auth-field"}>
            <UserIcon />
            <input
              id="account"
              type="text"
              name="username"
              autoComplete="username"
              placeholder="Email or username"
              value={account}
              disabled={pending}
              aria-invalid={accountError ? true : undefined}
              aria-describedby={accountError ? "account-error" : undefined}
              onChange={(event) => {
                setAccount(event.target.value);
                if (accountError) setAccountError("");
              }}
            />
          </span>
          {accountError && <p id="account-error" className="auth-error">{accountError}</p>}
        </div>

        <div className="auth-block">
          <label htmlFor="password">Password</label>
          <span className={passwordError ? "auth-field is-error" : "auth-field"}>
            <LockIcon />
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              disabled={pending}
              aria-invalid={passwordError ? true : undefined}
              aria-describedby={passwordError ? "password-error" : undefined}
              onChange={(event) => {
                setPassword(event.target.value);
                if (passwordError) setPasswordError("");
              }}
            />
          </span>
          {passwordError && <p id="password-error" className="auth-error">{passwordError}</p>}
        </div>
        {formError && <p className="auth-error">{formError}</p>}

        <button
          className={pending ? "auth-submit is-pending" : "auth-submit"}
          type="submit"
          disabled={pending}
          aria-busy={pending}
        >
          {pending && <span className="auth-spin" />}
          {pending ? "Signing in..." : "Sign in"}
          {!pending && <ArrowIcon />}
        </button>
      </form>
      </section>
    </div>
  );
}
