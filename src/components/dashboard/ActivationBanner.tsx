"use client"

import React, { useState } from "react"
import Link from "next/link"

const GREEN = "#32D074"
const BLACK = "#080A09"

export default function ActivationBanner({ slug }: { slug: string }) {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null

  return (
    <div style={{
      backgroundColor: `${GREEN}`,
      padding: "0 20px",
    }}>
      <div style={{
        maxWidth: 680,
        margin: "0 auto",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "12px 0",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
          {/* Pulsing dot */}
          <div style={{
            width: 8, height: 8, borderRadius: "50%",
            backgroundColor: BLACK, opacity: 0.5,
            flexShrink: 0,
          }}/>
          <p style={{
            margin: 0,
            fontSize: 12, fontWeight: 900,
            color: BLACK,
            letterSpacing: "0.06em",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            Your site isn&apos;t live yet.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <Link
            href={`https://foundco.app/activate?slug=${slug}`}
            target="_blank"
            style={{
              display: "inline-flex", alignItems: "center",
              padding: "6px 14px", borderRadius: 100,
              backgroundColor: "rgba(0,0,0,0.15)",
              textDecoration: "none",
              fontSize: 10, fontWeight: 900,
              color: BLACK, letterSpacing: "0.12em",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
            }}
          >
            Activate →
          </Link>

          <button
            onClick={() => setDismissed(true)}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: BLACK, opacity: 0.4, padding: 4,
              display: "flex", alignItems: "center",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
