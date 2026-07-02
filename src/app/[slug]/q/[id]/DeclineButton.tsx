"use client"

import { useState } from "react"

export default function DeclineButton({
  estimateId,
  companyName,
}: {
  estimateId: string
  companyName: string
}) {
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)
  const [declined, setDeclined] = useState(false)

  async function handleDecline() {
    if (loading) return
    setLoading(true)
    try {
      await fetch(`/api/decline-estimate/${estimateId}`, { method: "POST" })
      setDeclined(true)
    } catch {
      setLoading(false)
    }
  }

  if (declined) {
    return (
      <div style={{ borderRadius: 20, backgroundColor: "rgba(255,69,58,0.08)", border: "1px solid rgba(255,69,58,0.2)", padding: "20px 22px", textAlign: "center", marginBottom: 16 }}>
        <div style={{ color: "#FF453A", fontSize: 15, fontWeight: 700 }}>Estimate Declined</div>
        <div style={{ color: "#777772", fontSize: 13, marginTop: 6 }}>We&apos;ve let them know.</div>
      </div>
    )
  }

  if (confirming) {
    return (
      <div style={{ borderRadius: 20, backgroundColor: "white", border: "1px solid #E8E8E2", padding: "22px", textAlign: "center", marginBottom: 16 }}>
        <div style={{ color: "#111", fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Decline this estimate?</div>
        <div style={{ color: "#6B6B66", fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
          This will let {companyName} know you&apos;ve decided not to move forward.
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => setConfirming(false)}
            style={{ flex: 1, padding: "13px 0", borderRadius: 14, border: "1px solid #E8E8E2", backgroundColor: "white", color: "#4A4A46", fontSize: 15, fontWeight: 600, cursor: "pointer" }}
          >
            Go Back
          </button>
          <button
            onClick={handleDecline}
            disabled={loading}
            style={{ flex: 1, padding: "13px 0", borderRadius: 14, border: "none", backgroundColor: "rgba(255,69,58,0.1)", color: "#FF453A", fontSize: 15, fontWeight: 700, cursor: loading ? "default" : "pointer", opacity: loading ? 0.7 : 1 }}
          >
            {loading ? "Declining…" : "Yes, Decline"}
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      style={{ width: "100%", padding: "14px 0", borderRadius: 14, border: "none", backgroundColor: "transparent", color: "#8A8A84", fontSize: 14, fontWeight: 600, cursor: "pointer", marginBottom: 8 }}
    >
      No thanks, I&apos;ll pass
    </button>
  )
}
