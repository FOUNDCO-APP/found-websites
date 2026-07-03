"use client"

import React, { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import FoundWordmark from "@/components/FoundWordmark"

const GREEN = "#32D074"
const BLACK = "#080A09"

type Mode = "password" | "magic"

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const [mode, setMode] = useState<Mode>("password")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const searchParams = useSearchParams()

  useEffect(() => {
    const e = searchParams.get("error")
    if (e === "link_expired") setError("That login link has expired. Enter your email to get a new one.")
    else if (e === "no_company") setError("No business found for this account.")
    else if (e === "auth_failed") setError("Sign-in failed. Please try again.")
  }, [searchParams])

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password.trim()) return
    setLoading(true)
    setError("")

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), password }),
    })
    const data = await res.json()

    if (data.error) {
      setError(data.error)
      setLoading(false)
    } else {
      window.location.href = "/select"
    }
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError("")

    const res = await fetch("/api/send-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim() }),
    })
    const data = await res.json()

    if (data.error) {
      setError(data.error)
      setLoading(false)
    } else {
      setSent(true)
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: "100dvh",
      backgroundColor: BLACK,
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      padding: "0 28px",
    }}>

      {/* Found wordmark */}
      <div style={{ marginBottom: 48 }}>
        <FoundWordmark height={20} color="white" />
      </div>

      {sent ? (
        // Magic link sent state
        <div>
          <div style={{
            width: 48, height: 48, borderRadius: "50%",
            backgroundColor: `${GREEN}18`,
            border: `1px solid ${GREEN}33`,
            display: "flex", alignItems: "center", justifyContent: "center",
            marginBottom: 20,
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
          </div>
          <h1 style={{ margin: "0 0 8px", fontSize: 28, fontWeight: 300, color: "white", letterSpacing: "-0.03em" }}>
            Check your email.
          </h1>
          <p style={{ margin: "0 0 32px", fontSize: 15, color: "rgba(255,255,255,0.4)", lineHeight: 1.7 }}>
            We sent a link to <strong style={{ color: "rgba(255,255,255,0.7)" }}>{email}</strong>.<br/>
            Tap it to open your dashboard.
          </p>
          <button onClick={() => { setSent(false); setMode("password") }} style={{
            background: "none", border: "none", cursor: "pointer",
            fontSize: 13, fontWeight: 900, color: "rgba(255,255,255,0.3)",
            letterSpacing: "0.1em", textTransform: "uppercase", padding: 0,
          }}>
            ← Back
          </button>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: 32 }}>
            <p style={{ margin: "0 0 6px", fontSize: 10, fontWeight: 900, color: GREEN, letterSpacing: "0.22em", textTransform: "uppercase" }}>
              Welcome back
            </p>
            <h1 style={{ margin: 0, fontSize: 34, fontWeight: 300, color: "white", letterSpacing: "-0.04em", lineHeight: 0.95 }}>
              {mode === "password" ? "Sign in." : "Get a link."}
            </h1>
          </div>

          <form onSubmit={mode === "password" ? handlePasswordLogin : handleMagicLink}>
            {/* Email */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 900, color: "rgba(255,255,255,0.3)", letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 8 }}>
                Email
              </div>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                autoCapitalize="none"
                required
                style={{
                  width: "100%", padding: "16px 18px", borderRadius: 16,
                  backgroundColor: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "white", fontSize: 16, outline: "none",
                  boxSizing: "border-box",
                  WebkitAppearance: "none",
                }}
              />
            </div>

            {/* Password — only in password mode */}
            {mode === "password" && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ fontSize: 10, fontWeight: 900, color: "rgba(255,255,255,0.3)", letterSpacing: "0.18em", textTransform: "uppercase" }}>
                    Password
                  </div>
                  <button
                    type="button"
                    onClick={() => { setEmail(email); setMode("magic") }}
                    style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "rgba(255,255,255,0.25)", fontWeight: 700, padding: 0 }}
                  >
                    Forgot password?
                  </button>
                </div>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                    style={{
                      width: "100%", padding: "16px 48px 16px 18px", borderRadius: 16,
                      backgroundColor: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "white", fontSize: 16, outline: "none",
                      boxSizing: "border-box",
                      WebkitAppearance: "none",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    style={{
                      position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
                      background: "none", border: "none", cursor: "pointer",
                      color: "rgba(255,255,255,0.25)", padding: 4,
                    }}
                  >
                    {showPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    )}
                  </button>
                </div>
              </div>
            )}

            {mode === "magic" && (
              <div style={{ marginBottom: 20 }}/>
            )}

            {error && (
              <div style={{ marginBottom: 16, padding: "12px 16px", borderRadius: 12, backgroundColor: "rgba(255,70,70,0.1)", border: "1px solid rgba(255,70,70,0.2)" }}>
                <p style={{ margin: 0, fontSize: 13, color: "rgba(255,120,120,0.9)" }}>{error}</p>
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading || !email.trim() || (mode === "password" && !password.trim())}
              style={{
                width: "100%", padding: "17px 0", borderRadius: 100, border: "none",
                backgroundColor: (email.trim() && (mode === "magic" || password.trim())) ? GREEN : "rgba(255,255,255,0.08)",
                color: (email.trim() && (mode === "magic" || password.trim())) ? BLACK : "rgba(255,255,255,0.2)",
                fontSize: 11, fontWeight: 900,
                letterSpacing: "0.18em", textTransform: "uppercase",
                cursor: loading ? "default" : "pointer",
                boxShadow: email.trim() ? `0 0 28px rgba(50,208,116,0.2)` : "none",
                transition: "all 0.15s ease",
              }}
            >
              {loading ? "Signing in…" : mode === "password" ? "Sign In" : "Send Login Link"}
            </button>
          </form>

          {/* Mode toggle */}
          <div style={{ marginTop: 24, textAlign: "center" }}>
            {mode === "password" ? (
              <button
                onClick={() => { setMode("magic"); setError("") }}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "rgba(255,255,255,0.25)", padding: 0 }}
              >
                Sign in with a link instead
              </button>
            ) : (
              <button
                onClick={() => { setMode("password"); setError("") }}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "rgba(255,255,255,0.25)", padding: 0 }}
              >
                ← Back to password
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
