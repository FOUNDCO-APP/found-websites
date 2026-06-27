"use client"

import { useState } from "react"
import InstallPrompt from "./InstallPrompt"

export default function InstallButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 14,
          padding: "16px 20px", borderRadius: 18,
          backgroundColor: "rgba(48,209,88,0.08)", border: "1px solid rgba(48,209,88,0.2)",
          cursor: "pointer", textAlign: "left",
        }}
      >
        <div style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: "rgba(48,209,88,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#30D158" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v13m0 0l-4-4m4 4l4-4"/><path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2"/>
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ color: "#30D158", fontSize: 15, fontWeight: 700, marginBottom: 2 }}>Add Found Studio to Home Screen</div>
          <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 13 }}>Launch instantly like a native app</div>
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(48,209,88,0.4)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </button>

      {open && <InstallPrompt trigger="manual" />}
    </>
  )
}
