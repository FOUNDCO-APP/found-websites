"use client"

import { useState } from "react"

type Tab = {
  key: string
  label: string
  sublabel: string
  html: string
}

export default function EmailPreviewTabs({ tabs }: { tabs: Tab[] }) {
  const [active, setActive] = useState(0)

  return (
    <div>
      {/* Tab bar */}
      <div style={{
        display: "flex",
        gap: 2,
        marginBottom: 20,
        backgroundColor: "rgba(255,255,255,0.04)",
        borderRadius: 7,
        padding: 4,
        border: "1px solid rgba(255,255,255,0.06)",
      }}>
        {tabs.map((tab, i) => (
          <button
            key={tab.key}
            onClick={() => setActive(i)}
            style={{
              flex: 1,
              padding: "10px 8px",
              borderRadius: 5,
              border: "none",
              cursor: "pointer",
              backgroundColor: active === i ? "rgba(255,255,255,0.1)" : "transparent",
              transition: "background 0.15s",
              textAlign: "center" as const,
            }}
          >
            <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: active === i ? "#ffffff" : "rgba(255,255,255,0.35)" }}>
              {tab.label}
            </p>
            <p style={{ margin: "2px 0 0", fontSize: 10, color: active === i ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.2)" }}>
              {tab.sublabel}
            </p>
          </button>
        ))}
      </div>

      {/* Preview iframe */}
      <div style={{
        borderRadius: 8,
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.08)",
        backgroundColor: "#f5f5f5",
      }}>
        <iframe
          key={tabs[active].key}
          srcDoc={tabs[active].html}
          style={{
            width: "100%",
            height: 700,
            border: "none",
            display: "block",
          }}
          sandbox="allow-same-origin"
          title={tabs[active].label}
        />
      </div>

      <p style={{ margin: "12px 0 0", fontSize: 11, textAlign: "center", color: "rgba(255,255,255,0.2)" }}>
        Rendered with sample lead data — Maria Santos, (520) 555-0142, maria@example.com
      </p>
    </div>
  )
}
