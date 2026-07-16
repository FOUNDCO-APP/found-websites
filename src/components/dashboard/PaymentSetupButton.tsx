"use client"

import { useState } from "react"

type PaymentSetupButtonProps = {
  children?: React.ReactNode
  returnTo?: string
  variant?: "green" | "amber" | "dark" | "subtle"
  compact?: boolean
  handoffNote?: string | null
  businessName?: string | null
}

const COLORS = {
  green: { bg: "#30D158", fg: "#080A09", border: "#30D158" },
  amber: { bg: "rgba(255,159,10,0.16)", fg: "#FFB340", border: "rgba(255,159,10,0.34)" },
  dark: { bg: "#080A09", fg: "#ffffff", border: "#080A09" },
  subtle: { bg: "rgba(255,255,255,0.045)", fg: "#30D158", border: "rgba(255,255,255,0.09)" },
}

export default function PaymentSetupButton({
  children = "Continue secure setup",
  returnTo = "/more?payments=connected",
  variant = "green",
  compact = false,
  handoffNote = "You will leave Found briefly for secure payment setup, then return here.",
  businessName = null,
}: PaymentSetupButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showHandoff, setShowHandoff] = useState(false)
  const color = COLORS[variant]
  const payoutOwner = businessName?.trim() || "your business"

  async function startSetup() {
    if (loading) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/payments/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnTo }),
      })
      const raw = await res.text()
      let data: { url?: string; error?: string; code?: string } = {}
      try {
        data = raw ? JSON.parse(raw) : {}
      } catch {}

      if (!res.ok || !data.url) {
        const detail = data.error || "Payment setup could not start. Please try again in a minute or contact Found support."
        throw new Error(detail)
      }

      window.location.href = data.url
    } catch (err) {
      console.error("[PaymentSetupButton] setup failed", err)
      setError(err instanceof Error ? err.message : "Payment setup could not start.")
      setLoading(false)
    }
  }

  function openHandoff() {
    if (loading) return
    setError(null)
    setShowHandoff(true)
  }

  return (
    <div>
      <button
        type="button"
        onClick={openHandoff}
        disabled={loading}
        style={{
          width: "100%",
          minHeight: compact ? 42 : 50,
          borderRadius: compact ? 12 : 999,
          border: `1px solid ${color.border}`,
          backgroundColor: color.bg,
          color: color.fg,
          fontSize: compact ? 13 : 15,
          fontWeight: 850,
          cursor: loading ? "default" : "pointer",
          opacity: loading ? 0.72 : 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        }}
      >
        {loading ? "Opening secure setup..." : children}
      </button>
      {handoffNote && !compact && (
        <p style={{ margin: "8px 0 0", color: "rgba(255,255,255,0.46)", fontSize: 12, lineHeight: 1.45, textAlign: "center" }}>
          {handoffNote}
        </p>
      )}
      {error && (
        <p style={{ margin: "8px 0 0", color: "#FF453A", fontSize: 12, lineHeight: 1.4 }}>
          {error}
        </p>
      )}
      {showHandoff && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="payment-handoff-title"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            backgroundColor: "rgba(0,0,0,0.58)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            padding: "16px 14px calc(18px + env(safe-area-inset-bottom))",
          }}
          onClick={() => {
            if (!loading) setShowHandoff(false)
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 430,
              borderRadius: 28,
              border: "1px solid rgba(255,255,255,0.1)",
              background: "linear-gradient(180deg, #101413 0%, #080A09 100%)",
              boxShadow: "0 30px 90px rgba(0,0,0,0.45)",
              padding: "22px 20px 18px",
              color: "white",
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 15,
                backgroundColor: "rgba(48,209,88,0.13)",
                border: "1px solid rgba(48,209,88,0.22)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#30D158" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="M3 10h18" />
                <path d="M7 15h3" />
              </svg>
            </div>
            <p
              id="payment-handoff-title"
              style={{
                margin: "0 0 8px",
                fontSize: 26,
                lineHeight: 1.08,
                letterSpacing: 0,
                fontWeight: 780,
              }}
            >
              Set up payouts with Stripe
            </p>
            <p style={{ margin: "0 0 12px", color: "rgba(255,255,255,0.72)", fontSize: 16, lineHeight: 1.45, fontWeight: 520 }}>
              Stripe securely handles payout setup for Found.
            </p>
            <p style={{ margin: "0 0 18px", color: "rgba(255,255,255,0.54)", fontSize: 14, lineHeight: 1.5, fontWeight: 480 }}>
              You may see Payments by Found because Found powers your payment tools. Payouts still belong to {payoutOwner}.
            </p>
            <button
              type="button"
              onClick={startSetup}
              disabled={loading}
              style={{
                width: "100%",
                minHeight: 52,
                borderRadius: 999,
                border: "1px solid #30D158",
                backgroundColor: "#30D158",
                color: "#080A09",
                fontSize: 16,
                fontWeight: 850,
                cursor: loading ? "default" : "pointer",
                opacity: loading ? 0.72 : 1,
              }}
            >
              {loading ? "Opening Stripe..." : "Continue to Stripe"}
            </button>
            <button
              type="button"
              onClick={() => setShowHandoff(false)}
              disabled={loading}
              style={{
                width: "100%",
                minHeight: 44,
                marginTop: 8,
                borderRadius: 999,
                border: "none",
                backgroundColor: "transparent",
                color: "rgba(255,255,255,0.52)",
                fontSize: 14,
                fontWeight: 760,
                cursor: loading ? "default" : "pointer",
              }}
            >
              Not now
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
