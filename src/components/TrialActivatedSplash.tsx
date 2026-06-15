"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"

const SIGNAL_GREEN = "#32D074"
const FOUND_BLACK = "#080A09"

export default function TrialActivatedSplash({ companyName }: { companyName: string }) {
  const [visible, setVisible] = useState(false)
  const [fading, setFading] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const params = new URLSearchParams(window.location.search)
    if (params.get("activated") !== "true") return

    // Remove param so refresh doesn't replay
    const url = new URL(window.location.href)
    url.searchParams.delete("activated")
    window.history.replaceState({}, "", url.toString())

    setVisible(true)
    const t1 = setTimeout(() => setFading(true), 2500)
    const t2 = setTimeout(() => setVisible(false), 3100)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  if (!mounted || !visible) return null

  return createPortal(
    <div style={{
      position: "fixed", inset: 0, zIndex: 99999,
      backgroundColor: FOUND_BLACK,
      display: "flex", alignItems: "center", justifyContent: "center",
      opacity: fading ? 0 : 1,
      transition: fading ? "opacity 600ms ease-out" : "none",
      pointerEvents: fading ? "none" : "auto",
    }}>
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        pointerEvents: "none",
      }}>
        <div style={{
          width: 480, height: 480,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(50,208,116,0.32) 0%, rgba(50,208,116,0.1) 50%, transparent 70%)",
          animation: "cinematic-breathe 2s ease-in-out infinite",
        }} />
      </div>

      <div style={{
        position: "relative", zIndex: 1,
        display: "flex", flexDirection: "column", alignItems: "center",
        gap: "clamp(0.8rem, 2.5vw, 1.2rem)",
        textAlign: "center",
        padding: "0 24px",
      }}>
        <span style={{
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          fontSize: "clamp(2rem, 8vw, 3.5rem)",
          fontWeight: 300,
          letterSpacing: "0.28em",
          paddingLeft: "0.28em",
          textTransform: "uppercase",
          color: "white",
          display: "block",
          animation: "cinematic-word-in 500ms ease-out 200ms both",
        }}>
          {companyName}
        </span>
        <span style={{
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          fontSize: "clamp(1rem, 3.5vw, 1.5rem)",
          fontWeight: 400,
          letterSpacing: "0.22em",
          paddingLeft: "0.22em",
          textTransform: "uppercase",
          color: SIGNAL_GREEN,
          display: "block",
          animation: "cinematic-word-in 500ms ease-out 1200ms both",
        }}>
          You are live
        </span>
      </div>
    </div>,
    document.body
  )
}
