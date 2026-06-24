"use client"

import React, { useState } from "react"
import dynamic from "next/dynamic"

const ActivateOverlay = dynamic(() => import("@/components/ActivateOverlay"), { ssr: false })

const GREEN = "#32D074"
const BLACK = "#080A09"

export default function ActivationBanner({
  slug,
  companyName,
}: {
  slug: string
  companyName?: string
}) {
  const [dismissed, setDismissed] = useState(false)
  const [activating, setActivating] = useState(false)

  if (dismissed) return null

  return (
    <>
      {/* Banner */}
      <div style={{ backgroundColor: "white", padding: "0 20px" }}>
        <div style={{
          maxWidth: 680, margin: "0 auto",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 12, padding: "12px 0",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: BLACK, opacity: 0.4, flexShrink: 0 }}/>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 900, color: BLACK, letterSpacing: "0.06em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              Your site isn&apos;t live yet.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <button
              onClick={() => setActivating(true)}
              style={{
                display: "inline-flex", alignItems: "center",
                padding: "7px 16px", borderRadius: 100,
                backgroundColor: GREEN,
                border: "none", cursor: "pointer",
                fontSize: 10, fontWeight: 900,
                color: "#080A09", letterSpacing: "0.14em",
                boxShadow: `0 2px 8px rgba(50,208,116,0.3)`,
                textTransform: "uppercase",
                whiteSpace: "nowrap",
              }}
            >
              Activate →
            </button>

            <button
              onClick={() => setDismissed(true)}
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: "#333", opacity: 0.4, padding: 4,
                display: "flex", alignItems: "center",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Activate overlay — same as on the client site */}
      {activating && (
        <ActivateOverlay
          slug={slug}
          companyName={companyName ?? ""}
          onClose={() => setActivating(false)}
        />
      )}
    </>
  )
}
