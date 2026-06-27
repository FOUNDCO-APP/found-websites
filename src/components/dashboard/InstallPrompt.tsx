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
      background: "linear-gradient(160deg, #141614 0%, #080A09 100%)",
      border: "1px solid rgba(255,255,255,0.12)",
      display: "flex", alignItems: "center", justifyContent: "center",
      boxShadow: "0 12px 32px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.08)",
      flexShrink: 0,
    }}>
      <span style={{
        color: "white",
        fontSize: 11,
        fontWeight: 300,
        letterSpacing: "0.28em",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif",
        paddingLeft: "0.28em", // offset trailing letterSpacing so text appears truly centered
      }}>
        FOUND
      </span>
    </div>
  )
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 20 }}>
      <div style={{
        width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
        backgroundColor: "rgba(48,209,88,0.1)", border: "1px solid rgba(48,209,88,0.25)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 13, fontWeight: 800, color: "#30D158",
      }}>{n}</div>
      <div style={{ color: "rgba(255,255,255,0.72)", fontSize: 15, lineHeight: 1.6, paddingTop: 5 }}>{children}</div>
    </div>
  )
}

function ShareIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#30D158" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle", margin: "0 2px -2px" }}>
      <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
    </svg>
  )
}

function DotsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="#30D158" style={{ display: "inline-block", verticalAlign: "middle", margin: "0 2px -2px" }}>
      <circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/>
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
      {/* Strong backdrop with blur for real depth */}
      <div
        onClick={dismiss}
        style={{
          position: "absolute", inset: 0,
          backgroundColor: "rgba(0,0,0,0.88)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
        }}
      />

      {/* Sheet */}
      <div style={{
        position: "relative", zIndex: 1, width: "100%",
        background: "linear-gradient(180deg, #141614 0%, #0C0E0D 100%)",
        borderTop: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "28px 28px 0 0",
        padding: `20px 24px max(env(safe-area-inset-bottom, 0px), 36px)`,
        maxHeight: "90dvh", overflowY: "auto",
        boxShadow: "0 -24px 64px rgba(0,0,0,0.9), 0 -1px 0 rgba(255,255,255,0.07)",
      }}>

        {/* Handle */}
        <div style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.15)", margin: "0 auto 26px" }} />

        {/* App identity */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 26 }}>
          <FoundIcon />
          <div>
            <div style={{ color: "white", fontSize: 19, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 3 }}>Found Studio</div>
            <div style={{ color: "rgba(255,255,255,0.38)", fontSize: 14 }}>Your business, always on.</div>
          </div>
        </div>

        {/* Headline + platform tag */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <h2 style={{ margin: 0, color: "white", fontSize: "1.3rem", fontWeight: 700, letterSpacing: "-0.02em" }}>
            Add to your home screen
          </h2>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: platform === "ios" ? "#30AAFF" : "#30D158", backgroundColor: platform === "ios" ? "rgba(48,170,255,0.1)" : "rgba(48,209,88,0.1)", padding: "3px 8px", borderRadius: 6, flexShrink: 0 }}>
            {platform === "ios" ? "iOS" : "Android"}
          </span>
        </div>
        <p style={{ margin: "0 0 24px", color: "rgba(255,255,255,0.4)", fontSize: 14, lineHeight: 1.6 }}>
          Launches instantly, full screen, no browser bar. Takes about 10 seconds.
        </p>

        {/* iOS steps */}
        {platform === "ios" && (
          <>
            <Step n={1}>
              Open this page in <strong style={{ color: "white" }}>Safari</strong> — Chrome and other browsers don&apos;t support this on iPhone. Then tap the <ShareIcon /> Share button at the bottom.
            </Step>
            <Step n={2}>
              Scroll down the share sheet and tap <strong style={{ color: "white" }}>"Add to Home Screen."</strong>
            </Step>
            <Step n={3}>
              Tap <strong style={{ color: "white" }}>Add</strong> in the top right corner. Found Studio will appear on your home screen like any other app.
            </Step>
          </>
        )}

        {/* Android steps */}
        {platform === "android" && (
          <>
            <Step n={1}>
              In Chrome, tap the <DotsIcon /> menu in the top-right corner of the screen.
            </Step>
            <Step n={2}>
              Tap <strong style={{ color: "white" }}>"Add to Home screen"</strong> — you might also see it as <strong style={{ color: "white" }}>"Install app."</strong>
            </Step>
            <Step n={3}>
              Tap <strong style={{ color: "white" }}>Install.</strong> Found Studio will appear on your home screen and launch full screen.
            </Step>
          </>
        )}

        <div style={{ height: 6 }} />

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
            style={{ width: "100%", marginTop: 12, padding: "14px 0", borderRadius: 14, border: "none", backgroundColor: "transparent", color: "rgba(255,255,255,0.22)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
          >
            Don&apos;t show again
          </button>
        )}
      </div>
    </div>
  )
}
