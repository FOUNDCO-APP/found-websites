"use client"

import { useState } from "react"

export default function AcceptButton({ estimateId, color }: { estimateId: string; color: string }) {
  const [accepted, setAccepted] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleAccept() {
    if (loading || accepted) return
    setLoading(true)
    try {
      await fetch(`/api/accept-estimate/${estimateId}`, { method: "POST" })
      setAccepted(true)
    } catch {
      setLoading(false)
    }
  }

  if (accepted) {
    return (
      <div style={{ borderRadius: 20, backgroundColor: `${color}12`, border: `1px solid ${color}30`, padding: "24px 22px", textAlign: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 28, marginBottom: 8 }}>✓</div>
        <div style={{ color, fontSize: 17, fontWeight: 700, marginBottom: 4 }}>Estimate Accepted</div>
        <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>Thank you! We&apos;ll be in touch shortly.</div>
      </div>
    )
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <button
        onClick={handleAccept}
        disabled={loading}
        style={{
          width: "100%",
          padding: "18px 0",
          borderRadius: 18,
          border: "none",
          backgroundColor: color,
          color: "white",
          fontSize: 17,
          fontWeight: 800,
          cursor: loading ? "default" : "pointer",
          letterSpacing: "-0.01em",
          opacity: loading ? 0.7 : 1,
          transition: "opacity 0.15s",
        }}
      >
        {loading ? "Confirming…" : "Accept This Estimate"}
      </button>
      <p style={{ margin: "10px 0 0", textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 13 }}>
        By accepting, you agree to proceed with the work as described above.
      </p>
    </div>
  )
}
