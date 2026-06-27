"use client"

import { useState, useEffect } from "react"

type Platform = "ios" | "android" | "desktop" | null

function getPlatform(): Platform {
  if (typeof navigator === "undefined") return null
  const ua = navigator.userAgent
  if (/android/i.test(ua)) return "android"
  if (/iPad|iPhone|iPod/.test(ua)) return "ios"
  return "desktop"
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in window.navigator && (window.navigator as { standalone?: boolean }).standalone === true)
  )
}

function FoundIcon() {
  return (
    <div style={{
      width: 72, height: 72, borderRadius: 18,
      background: "linear-gradient(145deg, #111 0%, #080A09 100%)",
      border: "1px solid rgba(255,255,255,0.1)",
      display: "flex", alignItems: "center", justifyContent: "center",
      boxShadow: "0 8px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)",
      flexShrink: 0,
    }}>
      <svg viewBox="0 0 420 72" style={{ height: 14, width: 76, color: "white" }} aria-label="Found">
        <text x="0" y="56" fill="currentColor" fontFamily="Arial,sans-serif" fontSize="58" fontWeight="300" letterSpacing="25">FOUND</text>
      </svg>
    </div>
  )
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 18 }}>
      <div style={{
        width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
        backgroundColor: "rgba(48,209,88,0.12)", border: "1px solid rgba(48,209,88,0.3)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 13, fontWeight: 800, color: "#30D158",
      }}>{n}</div>
      <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 15, lineHeight: 1.55, paddingTop: 4 }}>{children}</div>
    </div>
  )
}

// Share icon (iOS)
function ShareIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#30D158" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle", margin: "0 3px -2px" }}>
      <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
    </svg>
  )
}

// Three-dot menu icon (Android)
function MenuIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="#30D158" style={{ display: "inline-block", verticalAlign: "middle", margin: "0 3px -2px" }}>
      <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
    </svg>
  )
}

export default function InstallPrompt({ trigger }: { trigger?: "auto" | "manual" }) {
  const [open, setOpen] = useState(false)
  const [platform, setPlatform] = useState<Platform>(null)

  useEffect(() => {
    setPlatform(getPlatform())
    if (trigger === "manual") {
      setOpen(true)
      return
    }
    // Auto: show once if not already installed and not dismissed
    if (isStandalone()) return
    const dismissed = localStorage.getItem("found_install_dismissed")
    if (dismissed) return
    const t = setTimeout(() => setOpen(true), 2500)
    return () => clearTimeout(t)
  }, [trigger])

  function dismiss() {
    setOpen(false)
    if (trigger !== "manual") localStorage.setItem("found_install_dismissed", "1")
  }

  if (!open || !platform || platform === "desktop") return null

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "flex-end" }}>
      <div onClick={dismiss} style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.7)" }} />
      <div style={{
        position: "relative", zIndex: 1, width: "100%",
        backgroundColor: "#0C0E0D",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "28px 28px 0 0",
        padding: `20px 24px max(env(safe-area-inset-bottom, 0px), 36px)`,
        maxHeight: "90dvh", overflowY: "auto",
      }}>
        {/* Handle */}
        <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.12)", margin: "0 auto 24px" }} />

        {/* App identity */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28 }}>
          <FoundIcon />
          <div>
            <div style={{ color: "white", fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 3 }}>Found Studio</div>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>Your business, always on.</div>
          </div>
        </div>

        {/* Headline */}
        <h2 style={{ margin: "0 0 6px", color: "white", fontSize: "1.375rem", fontWeight: 700, letterSpacing: "-0.02em" }}>
          Add to your home screen
        </h2>
        <p style={{ margin: "0 0 24px", color: "rgba(255,255,255,0.45)", fontSize: 15, lineHeight: 1.55 }}>
          Found Studio works like a native app — instant launch, full screen, no browser chrome. Takes 10 seconds.
        </p>

        {/* Steps */}
        {platform === "ios" && (
          <>
            <Step n={1}>
              Tap the <ShareIcon /> <strong style={{ color: "white" }}>Share</strong> button at the bottom of your Safari browser.
            </Step>
            <Step n={2}>
              Scroll down and tap <strong style={{ color: "white" }}>"Add to Home Screen."</strong>
            </Step>
            <Step n={3}>
              Tap <strong style={{ color: "white" }}>Add</strong> in the top right. Found Studio will appear on your home screen.
            </Step>
          </>
        )}

        {platform === "android" && (
          <>
            <Step n={1}>
              Tap the <MenuIcon /> <strong style={{ color: "white" }}>menu</strong> (three dots) in the top right of Chrome.
            </Step>
            <Step n={2}>
              Tap <strong style={{ color: "white" }}>"Add to Home screen"</strong> or <strong style={{ color: "white" }}>"Install app."</strong>
            </Step>
            <Step n={3}>
              Tap <strong style={{ color: "white" }}>Install.</strong> Found Studio will appear on your home screen.
            </Step>
          </>
        )}

        {/* iOS note */}
        {platform === "ios" && (
          <div style={{ padding: "12px 16px", borderRadius: 14, backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", marginBottom: 22 }}>
            <p style={{ margin: 0, color: "rgba(255,255,255,0.35)", fontSize: 13, lineHeight: 1.55 }}>
              Must be opened in <strong style={{ color: "rgba(255,255,255,0.55)" }}>Safari</strong>. If you&apos;re in Chrome or another browser, copy the URL and open it in Safari first.
            </p>
          </div>
        )}

        <button
          onClick={dismiss}
          style={{
            width: "100%", padding: "17px 0", borderRadius: 18, border: "none",
            backgroundColor: "#30D158", color: "#000",
            fontSize: 17, fontWeight: 800, cursor: "pointer", letterSpacing: "-0.01em",
          }}
        >
          Got it
        </button>

        {trigger !== "manual" && (
          <button
            onClick={() => { localStorage.setItem("found_install_dismissed", "1"); setOpen(false) }}
            style={{ width: "100%", marginTop: 12, padding: "14px 0", borderRadius: 14, border: "none", backgroundColor: "transparent", color: "rgba(255,255,255,0.25)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
          >
            Don&apos;t show again
          </button>
        )}
      </div>
    </div>
  )
}
