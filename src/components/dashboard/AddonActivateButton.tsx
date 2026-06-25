"use client"

import { useState } from "react"
import { createPortal } from "react-dom"
import { purchaseAddon } from "@/app/dashboard/(app)/more/actions"
import { GREEN, BLACK } from "@/lib/dashboard/typography"

export default function AddonActivateButton({
  companyId,
  addonSlug,
  addonLabel,
  addonPrice,
  size = "compact",
}: {
  companyId: string
  addonSlug: string
  addonLabel: string
  addonPrice: number
  size?: "compact" | "regular"
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const isCompact = size === "compact"

  async function handleConfirm() {
    setLoading(true)
    setError(null)
    const result = await purchaseAddon(companyId, addonSlug)
    setLoading(false)
    if (result.success) {
      setSuccess(true)
      setTimeout(() => {
        setOpen(false)
        window.location.reload()
      }, 1400)
    } else {
      setError(result.error ?? "Something went wrong — please try again.")
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => { setError(null); setSuccess(false); setOpen(true) }}
        style={{
          minHeight: isCompact ? 34 : 52,
          borderRadius: 999,
          padding: isCompact ? "0 15px" : "0 18px",
          fontSize: isCompact ? 12 : 14,
          fontWeight: 900,
          backgroundColor: `${GREEN}18`,
          color: GREEN,
          border: `1px solid ${GREEN}35`,
          cursor: "pointer",
          boxShadow: `0 0 18px ${GREEN}10`,
          letterSpacing: "0.01em",
        }}
      >
        Add
      </button>

      {open && createPortal(
        <div
          style={{ position: "fixed", inset: 0, zIndex: 99999, backgroundColor: "rgba(8,10,9,0.86)", display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "0 0 32px" }}
          onClick={(e) => { if (e.target === e.currentTarget && !loading) setOpen(false) }}
        >
          <div style={{
            width: "100%",
            maxWidth: 448,
            borderRadius: 24,
            backgroundColor: "#161616",
            border: "1px solid rgba(255,255,255,0.07)",
            overflow: "hidden",
            animation: "cinematic-word-in 300ms ease-out both",
          }}>
            <div style={{ height: 1, backgroundColor: GREEN }} />
            <div style={{ padding: "24px 28px 28px" }}>

              <div style={{ marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: GREEN, boxShadow: `0 0 6px ${GREEN}`, flexShrink: 0 }} />
                  <span style={{ fontSize: 10, fontWeight: 900, textTransform: "uppercase" as const, letterSpacing: "0.22em", color: GREEN }}>
                    Add feature
                  </span>
                </div>
                {!loading && !success && (
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: 20, lineHeight: 1, padding: 4 }}
                  >
                    ×
                  </button>
                )}
              </div>

              {success ? (
                <div style={{ textAlign: "center", padding: "20px 0 8px" }}>
                  <div style={{ width: 48, height: 48, borderRadius: "50%", backgroundColor: `${GREEN}18`, border: `1px solid ${GREEN}35`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <p style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 300, color: "white" }}>{addonLabel} activated</p>
                  <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.35)" }}>Added to your plan for ${addonPrice}/month.</p>
                </div>
              ) : (
                <>
                  <p style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 300, lineHeight: 1.2, letterSpacing: "-0.02em", color: "white" }}>
                    {addonLabel}
                  </p>
                  <p style={{ margin: "0 0 28px", fontSize: 14, color: "rgba(255,255,255,0.35)" }}>
                    +${addonPrice}/month added to your Found plan. Cancel anytime.
                  </p>

                  <div style={{ marginBottom: 20, padding: "16px 18px", borderRadius: 14, backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <p style={{ margin: "0 0 4px", fontSize: 10, fontWeight: 800, textTransform: "uppercase" as const, letterSpacing: "0.18em", color: "rgba(255,255,255,0.35)" }}>Billed to</p>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: "white" }}>Your card on file</p>
                    <p style={{ margin: "2px 0 0", fontSize: 12, color: "rgba(255,255,255,0.35)" }}>Same card used for your Found plan</p>
                  </div>

                  {error && (
                    <p style={{ margin: "0 0 14px", fontSize: 12, fontWeight: 700, color: "#F43F5E" }}>{error}</p>
                  )}

                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleConfirm}
                    style={{
                      width: "100%",
                      borderRadius: 12,
                      padding: "16px 0",
                      fontSize: 12,
                      fontWeight: 900,
                      textTransform: "uppercase" as const,
                      letterSpacing: "0.18em",
                      backgroundColor: GREEN,
                      color: BLACK,
                      border: "none",
                      cursor: loading ? "default" : "pointer",
                      opacity: loading ? 0.5 : 1,
                      transition: "opacity 150ms",
                    }}
                  >
                    {loading ? "One moment..." : `Activate ${addonLabel} →`}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
