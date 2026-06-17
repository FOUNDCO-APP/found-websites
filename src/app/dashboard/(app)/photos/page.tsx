"use client"

import React, { useState } from "react"

const SIGNAL_GREEN = "#32D074"
const FOUND_BLACK = "#080A09"

type PhotoView = "queue" | "website" | "social"

export default function PhotosPage() {
  const [view, setView] = useState<PhotoView>("queue")

  const views: { key: PhotoView; label: string }[] = [
    { key: "queue",   label: "Queue" },
    { key: "website", label: "Website" },
    { key: "social",  label: "Social" },
  ]

  return (
    <main style={{ padding: "28px 20px" }}>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: "0 0 16px", fontSize: 22, fontWeight: 300, color: "white", letterSpacing: "-0.02em" }}>
          Photos
        </h1>
        {/* 3-way segmented control */}
        <div style={{
          display: "flex",
          backgroundColor: "rgba(255,255,255,0.06)",
          borderRadius: 10,
          padding: 3,
          gap: 2,
        }}>
          {views.map(v => (
            <button key={v.key} onClick={() => setView(v.key)} style={{
              flex: 1, padding: "7px 0", borderRadius: 8, border: "none", cursor: "pointer",
              fontSize: 13, fontWeight: 700, letterSpacing: "0.02em",
              backgroundColor: view === v.key ? SIGNAL_GREEN : "transparent",
              color: view === v.key ? FOUND_BLACK : "rgba(255,255,255,0.4)",
              transition: "all 0.15s ease",
            }}>
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* QUEUE VIEW */}
      {view === "queue" && (
        <div>
          <p style={{ margin: "0 0 24px", fontSize: 13, color: "rgba(255,255,255,0.35)", lineHeight: 1.6 }}>
            Photos you&apos;ve taken through Found. Heart for your website, star for social media.
          </p>
          {/* Empty state */}
          <div style={{ paddingTop: 40, textAlign: "center" }}>
            <div style={{
              width: 80, height: 80, borderRadius: 20,
              backgroundColor: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.06)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 20px",
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
                stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            </div>
            <p style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 300, color: "white" }}>
              No photos yet.
            </p>
            <p style={{ margin: "0 0 28px", fontSize: 14, color: "rgba(255,255,255,0.35)", lineHeight: 1.7 }}>
              Tap the camera button to take your first photo.<br/>It stays here — not in your camera roll.
            </p>
            {/* How it works */}
            <div style={{ textAlign: "left", backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 16, padding: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.25)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 14 }}>
                How it works
              </div>
              {[
                { icon: "📸", text: "Take a photo of your work using the camera button below" },
                { icon: "❤️", text: "Heart it to add it to your website gallery" },
                { icon: "⭐", text: "Star it to queue it for social media" },
                { icon: "✨", text: "Found formats it with your branding automatically" },
              ].map(({ icon, text }) => (
                <div key={text} style={{ display: "flex", gap: 12, marginBottom: 12, alignItems: "flex-start" }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>{icon}</span>
                  <span style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.5 }}>{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* WEBSITE VIEW */}
      {view === "website" && (
        <div>
          <p style={{ margin: "0 0 24px", fontSize: 13, color: "rgba(255,255,255,0.35)", lineHeight: 1.6 }}>
            Photos hearted ❤️ for your website. Tap one to assign it to a section.
          </p>
          <div style={{ paddingTop: 40, textAlign: "center" }}>
            <div style={{
              width: 80, height: 80, borderRadius: 20,
              backgroundColor: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.06)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 20px",
            }}>
              <span style={{ fontSize: 32 }}>❤️</span>
            </div>
            <p style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 300, color: "white" }}>
              No website photos yet.
            </p>
            <p style={{ margin: 0, fontSize: 14, color: "rgba(255,255,255,0.35)", lineHeight: 1.7 }}>
              Heart photos in the Queue tab<br/>and they&apos;ll appear here.
            </p>
          </div>
        </div>
      )}

      {/* SOCIAL VIEW */}
      {view === "social" && (
        <div>
          <p style={{ margin: "0 0 24px", fontSize: 13, color: "rgba(255,255,255,0.35)", lineHeight: 1.6 }}>
            Photos starred ⭐ for social. Found formats them with your branding.
          </p>
          <div style={{ paddingTop: 40, textAlign: "center" }}>
            <div style={{
              width: 80, height: 80, borderRadius: 20,
              backgroundColor: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.06)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 20px",
            }}>
              <span style={{ fontSize: 32 }}>⭐</span>
            </div>
            <p style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 300, color: "white" }}>
              No social photos yet.
            </p>
            <p style={{ margin: "0 0 28px", fontSize: 14, color: "rgba(255,255,255,0.35)", lineHeight: 1.7 }}>
              Star photos in the Queue tab and Found<br/>will format them with your brand style.
            </p>
            {/* Before & after teaser */}
            <div style={{
              borderRadius: 16, padding: 20,
              backgroundColor: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
              textAlign: "left",
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "white", marginBottom: 6 }}>
                ✨ Before & After
              </div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>
                Select two photos and Found creates a branded before & after post automatically. No design skills needed.
              </div>
            </div>
          </div>
        </div>
      )}

    </main>
  )
}
