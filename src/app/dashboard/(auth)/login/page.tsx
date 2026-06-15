"use client"

import { useState } from "react"
import { createBrowserClient } from "@supabase/ssr"

const FOUND_BLACK = "#080A09"
const SIGNAL_GREEN = "#32D074"

export default function DashboardLoginPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "foundco.app"

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.includes("@")) return
    setLoading(true)
    setError(null)

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `https://my.${rootDomain}/auth/callback`,
        shouldCreateUser: true,
      },
    })

    setLoading(false)
    if (otpError) {
      setError("Something went wrong. Please try again or reply to your Found welcome email.")
    } else {
      setSent(true)
    }
  }

  return (
    <main style={{
      minHeight: "100dvh",
      backgroundColor: FOUND_BLACK,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px 20px",
    }}>
      {/* Wordmark */}
      <div style={{ position: "absolute", left: 28, top: 28 }}>
        <svg viewBox="0 0 420 72" style={{ height: 22, width: 120, color: "white" }} aria-label="Found">
          <text x="0" y="56" fill="currentColor" fontFamily="Arial,sans-serif" fontSize="58" fontWeight="300" letterSpacing="25">FOUND</text>
        </svg>
      </div>

      <div style={{ width: "100%", maxWidth: 400, animation: "fade-up 0.5s ease-out both" }}>
        {!sent ? (
          <>
            <h1 style={{ margin: "0 0 8px", fontSize: 28, fontWeight: 300, color: "white", letterSpacing: "-0.02em" }}>
              Welcome back.
            </h1>
            <p style={{ margin: "0 0 32px", fontSize: 15, color: "rgba(255,255,255,0.4)", lineHeight: 1.5 }}>
              Enter your email and we&apos;ll send you a login link.
            </p>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.1)",
                backgroundColor: "#111111",
                overflow: "hidden",
              }}>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@yourbusiness.com"
                  autoFocus
                  required
                  style={{
                    width: "100%",
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    padding: "16px 18px",
                    fontSize: 15,
                    color: "white",
                    fontFamily: "inherit",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {error && (
                <p style={{ fontSize: 13, color: "#F43F5E", margin: 0, lineHeight: 1.5 }}>{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || !email.includes("@")}
                style={{
                  borderRadius: 14,
                  padding: "16px",
                  fontSize: 12,
                  fontWeight: 900,
                  textTransform: "uppercase",
                  letterSpacing: "0.16em",
                  backgroundColor: SIGNAL_GREEN,
                  color: FOUND_BLACK,
                  border: "none",
                  cursor: loading || !email.includes("@") ? "default" : "pointer",
                  opacity: loading || !email.includes("@") ? 0.4 : 1,
                  transition: "opacity 150ms",
                  fontFamily: "inherit",
                }}>
                {loading ? "Sending…" : "Send login link →"}
              </button>
            </form>
          </>
        ) : (
          <div style={{ textAlign: "center" }}>
            <div style={{
              width: 52,
              height: 52,
              borderRadius: "50%",
              backgroundColor: `${SIGNAL_GREEN}18`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 24px",
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={SIGNAL_GREEN} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <h2 style={{ margin: "0 0 12px", fontSize: 24, fontWeight: 300, color: "white", letterSpacing: "-0.02em" }}>
              Check your email.
            </h2>
            <p style={{ margin: 0, fontSize: 15, color: "rgba(255,255,255,0.4)", lineHeight: 1.7 }}>
              We sent a login link to<br />
              <span style={{ color: "white" }}>{email}</span>
            </p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </main>
  )
}
