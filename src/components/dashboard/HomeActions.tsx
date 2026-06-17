"use client"

import React from "react"
import Link from "next/link"

const SIGNAL_GREEN = "#32D074"
const FOUND_BLACK = "#080A09"

export default function HomeActions({ siteUrl }: { siteUrl: string }) {
  async function handleShare() {
    if (navigator.share) {
      await navigator.share({ title: "My site", url: siteUrl }).catch(() => {})
    } else {
      await navigator.clipboard.writeText(siteUrl).catch(() => {})
    }
  }

  return (
    <div style={{ padding: "20px 24px 0" }}>
      <p style={{
        margin: "0 0 14px",
        fontSize: 11, fontWeight: 700,
        color: "rgba(255,255,255,0.2)",
        letterSpacing: "0.12em",
        textTransform: "uppercase",
      }}>
        Quick Actions
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

        {/* Add Lead — most important action, full width */}
        <Link href="/leads?add=1" style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "20px 22px",
          borderRadius: 20,
          backgroundColor: SIGNAL_GREEN,
          textDecoration: "none",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={FOUND_BLACK} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <line x1="19" y1="8" x2="19" y2="14"/>
              <line x1="22" y1="11" x2="16" y2="11"/>
            </svg>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: FOUND_BLACK }}>Add a lead</div>
              <div style={{ fontSize: 12, color: `${FOUND_BLACK}99`, marginTop: 1 }}>Networking, referral, or walk-in</div>
            </div>
          </div>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={FOUND_BLACK} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </Link>

        {/* Second row — two equal actions */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>

          {/* Add Photo */}
          <Link href="/photos" style={{
            display: "flex", flexDirection: "column",
            alignItems: "flex-start",
            padding: "18px 18px",
            borderRadius: 20,
            backgroundColor: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.08)",
            textDecoration: "none",
            gap: 12,
          }}>
            <div style={{
              width: 38, height: 38, borderRadius: 12,
              backgroundColor: "rgba(255,255,255,0.08)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "white" }}>Add Photo</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>Website · Social</div>
            </div>
          </Link>

          {/* Share Site */}
          <button onClick={handleShare} style={{
            display: "flex", flexDirection: "column",
            alignItems: "flex-start",
            padding: "18px 18px",
            borderRadius: 20,
            backgroundColor: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.08)",
            cursor: "pointer",
            gap: 12,
            textAlign: "left",
          }}>
            <div style={{
              width: 38, height: 38, borderRadius: 12,
              backgroundColor: "rgba(255,255,255,0.08)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3"/>
                <circle cx="6" cy="12" r="3"/>
                <circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "white" }}>Share Site</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>Copy link</div>
            </div>
          </button>

        </div>
      </div>
    </div>
  )
}
