"use client"

import { useState } from "react"

type PaymentSetupButtonProps = {
  children?: React.ReactNode
  returnTo?: string
  variant?: "green" | "amber" | "dark" | "subtle"
  compact?: boolean
  handoffNote?: string | null
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
}: PaymentSetupButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const color = COLORS[variant]

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

  return (
    <div>
      <button
        type="button"
        onClick={startSetup}
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
    </div>
  )
}
