"use client"

import React, { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

const GREEN = "#32D074"
const BLACK = "#080A09"

export default function SetPasswordPage() {
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState("")
  const [email, setEmail] = useState("")
  const [companyCount, setCompanyCount] = useState(0)
  const [hasPassword, setHasPassword] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()

  useEffect(() => {
    async function check() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace("/login"); return }

      setEmail(user.email ?? "")

      const { data: companies } = await supabase
        .from("companies")
        .select("id")
        .eq("user_id", user.id)
      setCompanyCount(companies?.length ?? 0)

      // If they have more than 1 company they've been through this before
      const alreadyMember = (companies?.length ?? 0) > 1
      setHasPassword(alreadyMember)
      setChecking(false)
    }
    check()
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) { setError("Password must be at least 8 characters"); return }
    if (password !== confirm) { setError("Passwords don't match"); return }
    setLoading(true)
    setError("")
    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) { setError(updateError.message); setLoading(false); return }
    await new Promise(r => setTimeout(r, 500))
    router.replace("/select")
  }

  if (checking) {
    return (
      <div style={{ minHeight: "100dvh", backgroundColor: BLACK, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: GREEN, boxShadow: `0 0 12px ${GREEN}` }}/>
      </div>
    )
  }

  if (hasPassword) {
    return (
      <div style={{ minHeight: "100dvh", backgroundColor: BLACK, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 28px" }}>
        <svg viewBox="0 0 340 56" style={{ height: 20, color: "white", marginBottom: 48 }}>
          <text x="0" y="44" fill="currentColor" fontFamily="Arial,sans-serif" fontSize="46" fontWeight="300" letterSpacing="20">FOUND</text>
        </svg>
        <p style={{ margin: "0 0 8px", fontSize: 10, fontWeight: 900, color: GREEN, letterSpacing: "0.22em", textTransform: "uppercase" }}>
          Welcome back
        </p>
        <h1 style={{ margin: "0 0 16px", fontSize: 34, fontWeight: 300, color: "white", letterSpacing: "-0.04em", lineHeight: 0.95 }}>
          You&apos;re already<br/>a Found member.
        </h1>
        <p style={{ margin: "0 0 36px", fontSize: 15, color: "rgba(255,255,255,0.4)", lineHeight: 1.7 }}>
          {companyCount > 1
            ? <>{companyCount} businesses on Found. Use the same password.</>
            : <>You already do business with Found. Your password is set.</>
          }
        </p>
        <button onClick={() => router.replace("/select")} style={{
          width: "100%", padding: "17px 0", borderRadius: 100, border: "none",
          backgroundColor: GREEN, color: BLACK,
          fontSize: 11, fontWeight: 900, letterSpacing: "0.18em", textTransform: "uppercase",
          cursor: "pointer", boxShadow: `0 0 28px rgba(50,208,116,0.22)`,
        }}>
          Go to My Dashboard
        </button>
      </div>
    )
  }

  return (
    <div style={{ minHeight: "100dvh", backgroundColor: BLACK, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 28px" }}>
      <svg viewBox="0 0 340 56" style={{ height: 20, color: "white", marginBottom: 48 }}>
        <text x="0" y="44" fill="currentColor" fontFamily="Arial,sans-serif" fontSize="46" fontWeight="300" letterSpacing="20">FOUND</text>
      </svg>
      <p style={{ margin: "0 0 8px", fontSize: 10, fontWeight: 900, color: GREEN, letterSpacing: "0.22em", textTransform: "uppercase" }}>
        One last thing
      </p>
      <h1 style={{ margin: "0 0 8px", fontSize: 34, fontWeight: 300, color: "white", letterSpacing: "-0.04em", lineHeight: 0.95 }}>
        Set a password.
      </h1>
      <p style={{ margin: "0 0 32px", fontSize: 14, color: "rgba(255,255,255,0.35)", lineHeight: 1.7 }}>
        So you can open Found anytime — no email needed. Your phone will save it automatically.
      </p>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 900, color: "rgba(255,255,255,0.2)", letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 8 }}>Your email</div>
          <input type="email" value={email} disabled style={{ width: "100%", padding: "16px 18px", borderRadius: 16, backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.3)", fontSize: 16, boxSizing: "border-box" as const }} />
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 900, color: "rgba(255,255,255,0.3)", letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 8 }}>New password</div>
          <div style={{ position: "relative" }}>
            <input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" autoFocus autoComplete="new-password"
              style={{ width: "100%", padding: "16px 48px 16px 18px", borderRadius: 16, backgroundColor: "rgba(255,255,255,0.06)", border: `1px solid ${password.length >= 8 ? GREEN + "44" : "rgba(255,255,255,0.1)"}`, color: "white", fontSize: 16, outline: "none", boxSizing: "border-box" as const }} />
            <button type="button" onClick={() => setShowPassword(v => !v)} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.25)", padding: 4 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 10, fontWeight: 900, color: "rgba(255,255,255,0.3)", letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 8 }}>Confirm password</div>
          <input type={showPassword ? "text" : "password"} value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Same password again" autoComplete="new-password"
            style={{ width: "100%", padding: "16px 18px", borderRadius: 16, backgroundColor: "rgba(255,255,255,0.06)", border: `1px solid ${confirm && confirm === password ? GREEN + "44" : "rgba(255,255,255,0.1)"}`, color: "white", fontSize: 16, outline: "none", boxSizing: "border-box" as const }} />
        </div>

        {error && (
          <div style={{ marginBottom: 16, padding: "12px 16px", borderRadius: 12, backgroundColor: "rgba(255,70,70,0.1)", border: "1px solid rgba(255,70,70,0.2)" }}>
            <p style={{ margin: 0, fontSize: 13, color: "rgba(255,120,120,0.9)" }}>{error}</p>
          </div>
        )}

        <button type="submit" disabled={loading || password.length < 8 || password !== confirm} style={{
          width: "100%", padding: "17px 0", borderRadius: 100, border: "none",
          backgroundColor: password.length >= 8 && password === confirm ? GREEN : "rgba(255,255,255,0.08)",
          color: password.length >= 8 && password === confirm ? BLACK : "rgba(255,255,255,0.2)",
          fontSize: 11, fontWeight: 900, letterSpacing: "0.18em", textTransform: "uppercase",
          cursor: loading ? "default" : "pointer",
          boxShadow: password.length >= 8 && password === confirm ? `0 0 28px rgba(50,208,116,0.22)` : "none",
        }}>
          {loading ? "Saving…" : "Set My Password"}
        </button>
      </form>

      <button onClick={() => router.replace("/select")} style={{ marginTop: 20, background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "rgba(255,255,255,0.2)", width: "100%", textAlign: "center" }}>
        Skip for now
      </button>
    </div>
  )
}
